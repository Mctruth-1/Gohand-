// Pure Node.js RFC 6455 WebSocket Server & WebRTC Signaling Engine
const crypto = require('node:crypto');
const { getSessionUser } = require('./auth');
const { db } = require('./db');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Map of userId -> Set of active client wrappers
const connectedUsers = new Map();

function attachWebSocketServer(httpServer) {
  httpServer.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];

    socket.write(responseHeaders.join('\r\n'));

    setupClient(socket);
  });
}

function setupClient(socket) {
  let client = {
    socket,
    userId: null,
    user: null,
    isAlive: true
  };

  let buffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];

      const fin = (firstByte & 0x80) === 0x80;
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) === 0x80;
      let payloadLength = secondByte & 0x7f;

      let offset = 2;

      if (payloadLength === 126) {
        if (buffer.length < 4) return;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) return;
        // High 32 bits + Low 32 bits
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLength) {
        // Wait for more data
        return;
      }

      let payload = buffer.subarray(offset, offset + payloadLength);
      buffer = buffer.subarray(offset + payloadLength);

      if (isMasked && maskKey) {
        const unmasked = Buffer.alloc(payloadLength);
        for (let i = 0; i < payloadLength; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      handleFrame(client, opcode, payload);
    }
  });

  socket.on('error', err => {
    cleanupClient(client);
  });

  socket.on('close', () => {
    cleanupClient(client);
  });
}

function handleFrame(client, opcode, payload) {
  // 0x8 = close
  if (opcode === 0x8) {
    sendFrame(client.socket, 0x8, Buffer.alloc(0));
    client.socket.end();
    cleanupClient(client);
    return;
  }

  // 0x9 = ping -> send pong 0xA
  if (opcode === 0x9) {
    sendFrame(client.socket, 0xa, payload);
    return;
  }

  // 0x1 = text frame
  if (opcode === 0x1) {
    try {
      const text = payload.toString('utf8');
      const message = JSON.parse(text);
      handleMessage(client, message);
    } catch (e) {
      console.error('[PEACE WS] Parse error:', e.message);
    }
  }
}

function sendFrame(socket, opcode, payload) {
  if (!socket.writable) return;
  const payloadLength = payload.length;
  let header;

  if (payloadLength < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = payloadLength;
  } else if (payloadLength <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function sendToUser(userId, data) {
  const sockets = connectedUsers.get(Number(userId));
  if (!sockets) return false;
  const jsonStr = JSON.stringify(data);
  const buf = Buffer.from(jsonStr, 'utf8');
  for (const client of sockets) {
    sendFrame(client.socket, 0x1, buf);
  }
  return true;
}

function broadcastToAll(data, excludeUserId = null) {
  const jsonStr = JSON.stringify(data);
  const buf = Buffer.from(jsonStr, 'utf8');
  for (const [uid, sockets] of connectedUsers.entries()) {
    if (excludeUserId && uid === Number(excludeUserId)) continue;
    for (const client of sockets) {
      sendFrame(client.socket, 0x1, buf);
    }
  }
}

function handleMessage(client, msg) {
  // 1. Authenticate WebSocket connection
  if (msg.type === 'auth') {
    const user = getSessionUser(msg.token);
    if (!user) {
      sendToClient(client, { type: 'auth-error', message: 'Invalid or expired session' });
      return;
    }
    client.userId = user.id;
    client.user = user;

    if (!connectedUsers.has(user.id)) {
      connectedUsers.set(user.id, new Set());
    }
    connectedUsers.get(user.id).add(client);

    // Update last_active in DB
    try {
      db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(user.id);
    } catch (_) {}

    sendToClient(client, {
      type: 'auth-success',
      userId: user.id,
      user: {
        id: user.id,
        name: user.full_name,
        avatar: user.avatar_url,
        is_verified: user.is_verified
      }
    });

    // Notify others that user is online
    broadcastPresence(user.id, true);
    return;
  }

  // All other events require an authenticated client
  if (!client.userId) {
    sendToClient(client, { type: 'error', message: 'Not authenticated' });
    return;
  }

  // 2. Real-Time Chat Message
  if (msg.type === 'chat-message') {
    const receiverId = Number(msg.receiverId);
    const content = (msg.content || '').trim();
    const messageType = msg.messageType || 'text';
    const mediaUrl = msg.mediaUrl || null;
    const duration = msg.duration || 0;

    if (!receiverId || (!content && !mediaUrl)) return;

    // Check if users are matched
    const isMatched = db.prepare(`
      SELECT id FROM matches 
      WHERE (user1_id = ? AND user2_id = ?) 
         OR (user1_id = ? AND user2_id = ?)
    `).get(client.userId, receiverId, receiverId, client.userId);

    // Allow chat if matched OR admin
    if (!isMatched && client.user.role !== 'admin') {
      sendToClient(client, {
        type: 'error',
        message: 'You can only message users you have mutually matched with'
      });
      return;
    }

    // Save message to SQLite
    const stmt = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, type, media_url, duration, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    const result = stmt.run(client.userId, receiverId, content, messageType, mediaUrl, duration);
    const insertedId = result.lastInsertRowid;

    const messageObj = {
      id: insertedId,
      sender_id: client.userId,
      receiver_id: receiverId,
      content,
      type: messageType,
      media_url: mediaUrl,
      duration,
      is_read: 0,
      created_at: new Date().toISOString(),
      sender_name: client.user.full_name,
      sender_avatar: client.user.avatar_url
    };

    // Send confirmation to sender
    sendToClient(client, {
      type: 'chat-sent',
      message: messageObj
    });

    // Send to receiver if online
    const delivered = sendToUser(receiverId, {
      type: 'chat-received',
      message: messageObj
    });

    // Create notification in DB
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, from_user_id, type, title, content)
        VALUES (?, ?, 'message', ?, ?)
      `).run(
        receiverId,
        client.userId,
        `New message from ${client.user.full_name}`,
        messageType === 'text' ? (content.length > 50 ? content.slice(0, 47) + '...' : content) : `Sent a ${messageType}`
      );

      sendToUser(receiverId, {
        type: 'notification',
        notification: {
          type: 'message',
          title: `New message from ${client.user.full_name}`,
          content: messageType === 'text' ? content : `Sent a ${messageType}`,
          from_user_id: client.userId,
          created_at: new Date().toISOString()
        }
      });
    } catch (_) {}
    return;
  }

  // 3. Typing indicator
  if (msg.type === 'typing') {
    const receiverId = Number(msg.receiverId);
    sendToUser(receiverId, {
      type: 'user-typing',
      senderId: client.userId,
      isTyping: !!msg.isTyping
    });
    return;
  }

  // 4. Read receipts
  if (msg.type === 'read-messages') {
    const senderId = Number(msg.senderId);
    try {
      db.prepare(`
        UPDATE messages 
        SET is_read = 1 
        WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
      `).run(client.userId, senderId);

      sendToUser(senderId, {
        type: 'messages-read',
        readerId: client.userId
      });
    } catch (_) {}
    return;
  }

  // 5. WebRTC Audio & Video Calling Signaling
  // Supported events: call-offer, call-answer, ice-candidate, call-reject, call-end
  if (['call-offer', 'call-answer', 'ice-candidate', 'call-reject', 'call-end'].includes(msg.type)) {
    const targetUserId = Number(msg.targetUserId);
    if (!targetUserId) return;

    // Check mutual connection
    const isMatched = db.prepare(`
      SELECT id FROM matches 
      WHERE (user1_id = ? AND user2_id = ?) 
         OR (user1_id = ? AND user2_id = ?)
    `).get(client.userId, targetUserId, targetUserId, client.userId);

    if (!isMatched && client.user.role !== 'admin') {
      sendToClient(client, {
        type: 'call-error',
        message: 'Audio and Video calls are only permitted between mutual matches'
      });
      return;
    }

    if (msg.type === 'call-offer') {
      // Log call start attempt
      try {
        const callRow = db.prepare(`
          INSERT INTO calls (caller_id, receiver_id, type, status, duration)
          VALUES (?, ?, ?, 'calling', 0)
        `).run(client.userId, targetUserId, msg.callType || 'video');

        client.currentCallId = callRow.lastInsertRowid;
      } catch (_) {}

      const delivered = sendToUser(targetUserId, {
        type: 'incoming-call',
        callId: client.currentCallId,
        callerId: client.userId,
        callerName: client.user.full_name,
        callerAvatar: client.user.avatar_url,
        callerCountry: client.user.country,
        callType: msg.callType || 'video',
        sdp: msg.sdp
      });

      if (!delivered) {
        // Target is offline -> mark as missed
        if (client.currentCallId) {
          try {
            db.prepare("UPDATE calls SET status = 'missed' WHERE id = ?").run(client.currentCallId);
            db.prepare(`
              INSERT INTO notifications (user_id, from_user_id, type, title, content)
              VALUES (?, ?, 'call', 'Missed Call 📞', ?)
            `).run(
              targetUserId,
              client.userId,
              `Missed ${msg.callType || 'video'} call from ${client.user.full_name}`
            );
          } catch (_) {}
        }

        sendToClient(client, {
          type: 'call-unavailable',
          message: 'User is currently offline'
        });
      }
      return;
    }

    if (msg.type === 'call-answer') {
      sendToUser(targetUserId, {
        type: 'call-answered',
        sdp: msg.sdp,
        senderId: client.userId
      });

      if (msg.callId) {
        try {
          db.prepare("UPDATE calls SET status = 'completed' WHERE id = ?").run(msg.callId);
        } catch (_) {}
      }
      return;
    }

    if (msg.type === 'ice-candidate') {
      sendToUser(targetUserId, {
        type: 'ice-candidate',
        candidate: msg.candidate,
        senderId: client.userId
      });
      return;
    }

    if (msg.type === 'call-reject') {
      sendToUser(targetUserId, {
        type: 'call-rejected',
        senderId: client.userId,
        reason: msg.reason || 'Call declined'
      });
      if (msg.callId) {
        try {
          db.prepare("UPDATE calls SET status = 'declined' WHERE id = ?").run(msg.callId);
        } catch (_) {}
      }
      return;
    }

    if (msg.type === 'call-end') {
      sendToUser(targetUserId, {
        type: 'call-ended',
        senderId: client.userId,
        duration: msg.duration || 0
      });
      if (msg.callId) {
        try {
          db.prepare(`
            UPDATE calls 
            SET duration = ?, ended_at = datetime('now')
            WHERE id = ?
          `).run(msg.duration || 0, msg.callId);
        } catch (_) {}
      }
      return;
    }
  }
}

function sendToClient(client, data) {
  if (!client.socket.writable) return;
  const jsonStr = JSON.stringify(data);
  sendFrame(client.socket, 0x1, Buffer.from(jsonStr, 'utf8'));
}

function broadcastPresence(userId, isOnline) {
  broadcastToAll({
    type: 'presence',
    userId,
    isOnline
  }, userId);
}

function cleanupClient(client) {
  if (client.userId && connectedUsers.has(client.userId)) {
    const userSockets = connectedUsers.get(client.userId);
    userSockets.delete(client);
    if (userSockets.size === 0) {
      connectedUsers.delete(client.userId);
      broadcastPresence(client.userId, false);
      try {
        db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(client.userId);
      } catch (_) {}
    }
  }
}

function isUserOnline(userId) {
  const sockets = connectedUsers.get(Number(userId));
  return !!(sockets && sockets.size > 0);
}

module.exports = {
  attachWebSocketServer,
  sendToUser,
  broadcastToAll,
  isUserOnline
};
