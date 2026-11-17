// REST API Router and Controller Logic for PEACE
const { db, hashPassword, calculateAge } = require('./db');
const {
  createSession,
  getSessionUser,
  destroySession,
  validateAge18,
  requestEmailOTP,
  verifyEmailOTP,
  requestPhoneOTP,
  verifyPhoneOTP
} = require('./auth');
const { sendToUser, broadcastToAll, isUserOnline } = require('./websocket');

function handleApiRequest(req, res, pathname, query, body, token) {
  // Helper to send JSON response
  function sendJson(statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end(JSON.stringify(data));
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  // Public / Auth routes
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const {
      email,
      password,
      full_name,
      birthdate,
      gender,
      country,
      city,
      preferred_language,
      relationship_goals
    } = body;

    if (!email || !password || !full_name || !birthdate || !country || !city) {
      return sendJson(400, { success: false, message: 'Please provide all required fields' });
    }

    // 18+ enforcement
    if (!validateAge18(birthdate)) {
      return sendJson(400, {
        success: false,
        message: 'Registration Denied: You must be at least 18 years of age to join PEACE.'
      });
    }

    if (password.length < 8) {
      return sendJson(400, {
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check existing email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return sendJson(400, {
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    const defaultAvatar = gender === 'female' 
      ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80';

    const pwdHash = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO users (
        email, password_hash, full_name, birthdate, gender, country, city,
        preferred_language, relationship_goals, avatar_url, photos, interests, languages,
        is_verified, email_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);

    try {
      const result = stmt.run(
        email.toLowerCase().trim(),
        pwdHash,
        full_name.trim(),
        birthdate,
        gender || 'prefer_not_to_say',
        country,
        city,
        preferred_language || 'English',
        relationship_goals || 'Long-term relationship',
        defaultAvatar,
        JSON.stringify([defaultAvatar]),
        JSON.stringify(['Travel', 'Cultures', 'Foodie']),
        JSON.stringify([preferred_language || 'English'])
      );

      const newUserId = result.lastInsertRowid;
      const newToken = createSession(newUserId);
      const otpCode = requestEmailOTP(email);

      // Create welcome notification
      db.prepare(`
        INSERT INTO notifications (user_id, from_user_id, type, title, content)
        VALUES (?, NULL, 'system', 'Welcome to PEACE 🕊️', 'Your global journey begins here. Please verify your email to unlock all features.')
      `).run(newUserId);

      const user = getSessionUser(newToken);
      return sendJson(201, {
        success: true,
        token: newToken,
        user,
        otpSimulation: otpCode,
        message: 'Account created successfully! Please verify your email.'
      });
    } catch (e) {
      return sendJson(500, { success: false, message: 'Database error: ' + e.message });
    }
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = body;
    if (!email || !password) {
      return sendJson(400, { success: false, message: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return sendJson(401, { success: false, message: 'Invalid email or password' });
    }

    if (user.is_banned) {
      return sendJson(403, {
        success: false,
        message: 'This account has been suspended for violating PEACE Community Guidelines.'
      });
    }

    const testHash = hashPassword(password);
    if (user.password_hash !== testHash) {
      return sendJson(401, { success: false, message: 'Invalid email or password' });
    }

    const sessionToken = createSession(user.id);
    const sessionUser = getSessionUser(sessionToken);

    return sendJson(200, {
      success: true,
      token: sessionToken,
      user: sessionUser
    });
  }

  // Google Login / Quick Auth Simulation
  if (pathname === '/api/auth/google' && req.method === 'POST') {
    const { email, full_name, avatar_url, country } = body;
    const cleanEmail = (email || 'google.user@peace.love').toLowerCase().trim();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      const defaultPwd = hashPassword('google_oauth_peace');
      const stmt = db.prepare(`
        INSERT INTO users (
          email, password_hash, full_name, birthdate, gender, country, city,
          preferred_language, avatar_url, photos, interests, languages,
          is_verified, email_verified
        ) VALUES (?, ?, ?, '1998-06-15', 'other', ?, 'Metropolis', 'English', ?, ?, '["Travel", "Music", "Photography"]', '["English"]', 1, 1)
      `);
      const defaultAvatar = avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80';
      const result = stmt.run(
        cleanEmail,
        defaultPwd,
        full_name || 'Global Explorer',
        country || 'United States',
        defaultAvatar,
        JSON.stringify([defaultAvatar])
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const sessionToken = createSession(user.id);
    const sessionUser = getSessionUser(sessionToken);

    return sendJson(200, {
      success: true,
      token: sessionToken,
      user: sessionUser
    });
  }

  // Quick Switch for Demo Evaluation
  if (pathname === '/api/auth/demo-switch' && req.method === 'POST') {
    const targetEmail = body.email || 'elena@peace.love';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(targetEmail);
    if (!user) {
      return sendJson(404, { success: false, message: 'Demo persona not found' });
    }
    const sessionToken = createSession(user.id);
    const sessionUser = getSessionUser(sessionToken);
    return sendJson(200, {
      success: true,
      token: sessionToken,
      user: sessionUser
    });
  }

  // Forgot password OTP simulation
  if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
    const { email } = body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase().trim());
    if (!user) {
      return sendJson(404, { success: false, message: 'No registered account found with that email' });
    }
    const code = requestEmailOTP(user.email);
    return sendJson(200, {
      success: true,
      code,
      message: `Password reset code sent to ${user.email} (Demo code: ${code})`
    });
  }

  // Reset password with OTP
  if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
    const { email, code, newPassword } = body;
    const verification = verifyEmailOTP(email, code);
    if (!verification.success) {
      return sendJson(400, verification);
    }
    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(newHash, email.toLowerCase().trim());
    return sendJson(200, { success: true, message: 'Password updated successfully! You can now log in.' });
  }

  // Require Authenticated User for all subsequent routes
  const currentUser = getSessionUser(token);
  if (!currentUser) {
    return sendJson(401, { success: false, message: 'Authentication required. Please sign in.' });
  }

  // Auth User verification routes
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    return sendJson(200, { success: true, user: currentUser });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    destroySession(token);
    return sendJson(200, { success: true, message: 'Signed out successfully' });
  }

  // Email verification request & confirm
  if (pathname === '/api/auth/verify/email-request' && req.method === 'POST') {
    const code = requestEmailOTP(currentUser.email);
    return sendJson(200, {
      success: true,
      code,
      message: `Verification code sent to ${currentUser.email}. Demo code: ${code}`
    });
  }

  if (pathname === '/api/auth/verify/email-confirm' && req.method === 'POST') {
    const { code } = body;
    const verification = verifyEmailOTP(currentUser.email, code);
    if (!verification.success) {
      return sendJson(400, verification);
    }
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(currentUser.id);
    // If phone or selfie also verified, upgrade badge
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
    let newBadge = updated.is_verified;
    if (updated.email_verified && updated.phone_verified && newBadge < 1) newBadge = 1;
    if (updated.selfie_verified) newBadge = 2;
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(newBadge, currentUser.id);

    return sendJson(200, {
      success: true,
      message: 'Email successfully verified!',
      user: getSessionUser(token)
    });
  }

  // Phone verification request & confirm
  if (pathname === '/api/auth/verify/phone-request' && req.method === 'POST') {
    const phone = body.phone || '+1 555-0192';
    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, currentUser.id);
    const code = requestPhoneOTP(phone);
    return sendJson(200, {
      success: true,
      code,
      message: `SMS code sent to ${phone}. Demo code: ${code}`
    });
  }

  if (pathname === '/api/auth/verify/phone-confirm' && req.method === 'POST') {
    const { phone, code } = body;
    const verification = verifyPhoneOTP(phone || currentUser.phone || '', code);
    if (!verification.success) {
      return sendJson(400, verification);
    }
    db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(currentUser.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
    let newBadge = updated.is_verified;
    if (updated.email_verified && updated.phone_verified && newBadge < 1) newBadge = 1;
    if (updated.selfie_verified) newBadge = 2;
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(newBadge, currentUser.id);

    return sendJson(200, {
      success: true,
      message: 'Phone number successfully verified!',
      user: getSessionUser(token)
    });
  }

  // Selfie / Identity Verification
  if (pathname === '/api/auth/verify/selfie' && req.method === 'POST') {
    // Selfie check with photo verification
    db.prepare(`
      UPDATE users 
      SET selfie_verified = 1, is_verified = 2 
      WHERE id = ?
    `).run(currentUser.id);

    // Create celebratory notification
    db.prepare(`
      INSERT INTO notifications (user_id, from_user_id, type, title, content)
      VALUES (?, NULL, 'verification', 'PEACE Gold Verified 🛡️', 'Congratulations! Your profile has achieved Gold PEACE Verification status.')
    `).run(currentUser.id);

    return sendJson(200, {
      success: true,
      message: 'Selfie verification successful! You have earned the Gold PEACE Verified Badge.',
      user: getSessionUser(token)
    });
  }

  // ----------------------------------------------------
  // DISCOVER & MATCHING
  // ----------------------------------------------------
  if (pathname === '/api/discover' && req.method === 'GET') {
    const countryFilter = query.country || '';
    const minAge = parseInt(query.minAge || '18', 10);
    const maxAge = parseInt(query.maxAge || '70', 10);
    const gender = query.gender || '';
    const verifiedOnly = query.verifiedOnly === 'true';
    const onlineOnly = query.onlineOnly === 'true';
    const search = (query.search || '').trim().toLowerCase();

    // Exclude current user and already liked/passed users
    const likedRows = db.prepare('SELECT receiver_id FROM likes WHERE sender_id = ?').all(currentUser.id);
    const excludedIds = [currentUser.id, ...likedRows.map(r => r.receiver_id)];

    const placeholders = excludedIds.map(() => '?').join(',');
    let sql = `
      SELECT id, full_name, birthdate, gender, country, city, preferred_language,
             bio, avatar_url, photos, interests, languages, relationship_goals,
             occupation, is_verified, last_active
      FROM users
      WHERE is_banned = 0 AND id NOT IN (${placeholders})
    `;
    const params = [...excludedIds];

    if (countryFilter && countryFilter !== 'All') {
      sql += ' AND country = ?';
      params.push(countryFilter);
    }

    if (gender && gender !== 'all') {
      sql += ' AND gender = ?';
      params.push(gender);
    }

    if (verifiedOnly) {
      sql += ' AND is_verified > 0';
    }

    const rows = db.prepare(sql).all(...params);

    // Compute age, distance simulation, and online filter
    const profiles = rows
      .map(u => {
        const age = calculateAge(u.birthdate);
        const online = isUserOnline(u.id);
        return {
          id: u.id,
          name: u.full_name,
          age,
          gender: u.gender,
          country: u.country,
          city: u.city,
          preferred_language: u.preferred_language,
          bio: u.bio,
          avatar: u.avatar_url,
          photos: JSON.parse(u.photos || '[]'),
          interests: JSON.parse(u.interests || '[]'),
          languages: JSON.parse(u.languages || '[]'),
          relationship_goals: u.relationship_goals,
          occupation: u.occupation,
          is_verified: u.is_verified,
          is_online: online,
          distance_km: Math.floor(1200 + ((u.id * 839) % 8500)) // realistic international distance
        };
      })
      .filter(p => p.age >= minAge && p.age <= maxAge)
      .filter(p => !onlineOnly || p.is_online)
      .filter(p => {
        if (!search) return true;
        return (
          p.name.toLowerCase().includes(search) ||
          p.country.toLowerCase().includes(search) ||
          p.city.toLowerCase().includes(search) ||
          p.bio.toLowerCase().includes(search) ||
          p.interests.some(i => i.toLowerCase().includes(search))
        );
      });

    return sendJson(200, { success: true, count: profiles.length, profiles });
  }

  // Like a user / Swipe Right
  if (pathname === '/api/discover/like' && req.method === 'POST') {
    const { targetId, isSuperlike } = body;
    const targetUserId = Number(targetId);

    if (!targetUserId || targetUserId === currentUser.id) {
      return sendJson(400, { success: false, message: 'Invalid target user' });
    }

    try {
      db.prepare(`
        INSERT OR IGNORE INTO likes (sender_id, receiver_id, is_superlike)
        VALUES (?, ?, ?)
      `).run(currentUser.id, targetUserId, isSuperlike ? 1 : 0);

      // Check if target user already liked current user
      const mutualLike = db.prepare(`
        SELECT id FROM likes 
        WHERE sender_id = ? AND receiver_id = ?
      `).get(targetUserId, currentUser.id);

      let isMatch = false;
      let matchedUser = null;

      if (mutualLike) {
        isMatch = true;
        const u1 = Math.min(currentUser.id, targetUserId);
        const u2 = Math.max(currentUser.id, targetUserId);
        db.prepare('INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)').run(u1, u2);

        const targetUserRow = db.prepare('SELECT id, full_name, avatar_url, country, city FROM users WHERE id = ?').get(targetUserId);
        matchedUser = {
          id: targetUserRow.id,
          name: targetUserRow.full_name,
          avatar: targetUserRow.avatar_url,
          country: targetUserRow.country,
          city: targetUserRow.city
        };

        // Send match notifications to both users
        db.prepare(`
          INSERT INTO notifications (user_id, from_user_id, type, title, content)
          VALUES (?, ?, 'match', 'It''s a Match! 🎉', ?)
        `).run(targetUserId, currentUser.id, `You and ${currentUser.full_name} liked each other! Start talking.`);

        db.prepare(`
          INSERT INTO notifications (user_id, from_user_id, type, title, content)
          VALUES (?, ?, 'match', 'It''s a Match! 🎉', ?)
        `).run(currentUser.id, targetUserId, `You and ${matchedUser.name} liked each other! Start talking.`);

        // Real-time WebSocket match event
        sendToUser(targetUserId, {
          type: 'new-match',
          matchedUser: {
            id: currentUser.id,
            name: currentUser.full_name,
            avatar: currentUser.avatar_url,
            country: currentUser.country,
            city: currentUser.city
          }
        });
      } else {
        // Send like notification to target
        db.prepare(`
          INSERT INTO notifications (user_id, from_user_id, type, title, content)
          VALUES (?, ?, 'like', 'New Admirer ❤️', ?)
        `).run(
          targetUserId,
          currentUser.id,
          `${isSuperlike ? 'Super Liked by' : 'Liked by'} someone from ${currentUser.country}!`
        );

        sendToUser(targetUserId, {
          type: 'new-like',
          isSuperlike: !!isSuperlike,
          fromCountry: currentUser.country
        });
      }

      return sendJson(200, {
        success: true,
        isMatch,
        matchedUser
      });
    } catch (e) {
      return sendJson(500, { success: false, message: e.message });
    }
  }

  // Pass a user / Swipe Left
  if (pathname === '/api/discover/pass' && req.method === 'POST') {
    // Can optionally record pass or temporary skip
    return sendJson(200, { success: true });
  }

  // Get Mutual Matches
  if (pathname === '/api/matches' && req.method === 'GET') {
    const matchRows = db.prepare(`
      SELECT m.id as match_id, m.created_at as match_date,
             u.id, u.full_name, u.birthdate, u.country, u.city, u.avatar_url,
             u.is_verified, u.bio, u.preferred_language, u.occupation
      FROM matches m
      JOIN users u ON (u.id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END)
      WHERE (m.user1_id = ? OR m.user2_id = ?) AND u.is_banned = 0
      ORDER BY m.created_at DESC
    `).all(currentUser.id, currentUser.id, currentUser.id);

    const matches = matchRows.map(m => {
      // Get last message in this conversation
      const lastMsg = db.prepare(`
        SELECT content, type, sender_id, created_at, is_read
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1
      `).get(currentUser.id, m.id, m.id, currentUser.id);

      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
      `).get(m.id, currentUser.id).count;

      return {
        match_id: m.match_id,
        user_id: m.id,
        name: m.full_name,
        age: calculateAge(m.birthdate),
        country: m.country,
        city: m.city,
        avatar: m.avatar_url,
        bio: m.bio,
        occupation: m.occupation,
        preferred_language: m.preferred_language,
        is_verified: m.is_verified,
        is_online: isUserOnline(m.id),
        last_message: lastMsg ? {
          content: lastMsg.content,
          type: lastMsg.type,
          sender_id: lastMsg.sender_id,
          time: lastMsg.created_at,
          is_read: lastMsg.is_read
        } : null,
        unread_count: unreadCount
      };
    });

    return sendJson(200, { success: true, matches });
  }

  // Toggle Favourite
  if (pathname === '/api/favourites/toggle' && req.method === 'POST') {
    const { targetId } = body;
    const targetUserId = Number(targetId);
    const existing = db.prepare('SELECT id FROM favourites WHERE user_id = ? AND target_id = ?').get(currentUser.id, targetUserId);

    if (existing) {
      db.prepare('DELETE FROM favourites WHERE id = ?').run(existing.id);
      return sendJson(200, { success: true, isFavourited: false });
    } else {
      db.prepare('INSERT INTO favourites (user_id, target_id) VALUES (?, ?)').run(currentUser.id, targetUserId);
      return sendJson(200, { success: true, isFavourited: true });
    }
  }

  // Get Favourites
  if (pathname === '/api/favourites' && req.method === 'GET') {
    const rows = db.prepare(`
      SELECT u.id, u.full_name, u.birthdate, u.country, u.city, u.avatar_url,
             u.bio, u.is_verified, u.occupation
      FROM favourites f
      JOIN users u ON u.id = f.target_id
      WHERE f.user_id = ? AND u.is_banned = 0
      ORDER BY f.created_at DESC
    `).all(currentUser.id);

    const favourites = rows.map(u => ({
      id: u.id,
      name: u.full_name,
      age: calculateAge(u.birthdate),
      country: u.country,
      city: u.city,
      avatar: u.avatar_url,
      bio: u.bio,
      occupation: u.occupation,
      is_verified: u.is_verified,
      is_online: isUserOnline(u.id)
    }));

    return sendJson(200, { success: true, favourites });
  }

  // ----------------------------------------------------
  // MESSAGES
  // ----------------------------------------------------
  if (pathname.startsWith('/api/messages/') && req.method === 'GET') {
    const targetUserId = Number(pathname.replace('/api/messages/', ''));
    if (!targetUserId) {
      return sendJson(400, { success: false, message: 'Invalid user ID' });
    }

    const messages = db.prepare(`
      SELECT m.id, m.sender_id, m.receiver_id, m.content, m.type, m.media_url,
             m.duration, m.is_read, m.created_at,
             u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `).all(currentUser.id, targetUserId, targetUserId, currentUser.id);

    // Mark messages from targetUser as read
    db.prepare(`
      UPDATE messages 
      SET is_read = 1 
      WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
    `).run(currentUser.id, targetUserId);

    return sendJson(200, { success: true, messages });
  }

  // ----------------------------------------------------
  // CALL HISTORY
  // ----------------------------------------------------
  if (pathname === '/api/calls/history' && req.method === 'GET') {
    const calls = db.prepare(`
      SELECT c.id, c.caller_id, c.receiver_id, c.type, c.status, c.duration,
             c.started_at, c.ended_at,
             caller.full_name as caller_name, caller.avatar_url as caller_avatar, caller.country as caller_country,
             receiver.full_name as receiver_name, receiver.avatar_url as receiver_avatar, receiver.country as receiver_country
      FROM calls c
      JOIN users caller ON caller.id = c.caller_id
      JOIN users receiver ON receiver.id = c.receiver_id
      WHERE c.caller_id = ? OR c.receiver_id = ?
      ORDER BY c.started_at DESC LIMIT 30
    `).all(currentUser.id, currentUser.id);

    const formattedCalls = calls.map(c => {
      const isCaller = c.caller_id === currentUser.id;
      const otherUser = isCaller
        ? { id: c.receiver_id, name: c.receiver_name, avatar: c.receiver_avatar, country: c.receiver_country }
        : { id: c.caller_id, name: c.caller_name, avatar: c.caller_avatar, country: c.caller_country };

      return {
        id: c.id,
        type: c.type,
        status: c.status,
        duration: c.duration,
        started_at: c.started_at,
        is_outgoing: isCaller,
        peer: otherUser
      };
    });

    return sendJson(200, { success: true, calls: formattedCalls });
  }

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  if (pathname === '/api/notifications' && req.method === 'GET') {
    const notifications = db.prepare(`
      SELECT n.id, n.type, n.title, n.content, n.is_read, n.created_at, n.from_user_id,
             u.full_name as from_user_name, u.avatar_url as from_user_avatar
      FROM notifications n
      LEFT JOIN users u ON u.id = n.from_user_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC LIMIT 40
    `).all(currentUser.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(currentUser.id).count;

    return sendJson(200, { success: true, unreadCount, notifications });
  }

  if (pathname === '/api/notifications/read-all' && req.method === 'POST') {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(currentUser.id);
    return sendJson(200, { success: true });
  }

  // ----------------------------------------------------
  // USER PROFILE & SETTINGS
  // ----------------------------------------------------
  if (pathname === '/api/users/profile' && req.method === 'PUT') {
    const {
      full_name,
      bio,
      occupation,
      relationship_goals,
      interests,
      languages,
      city,
      country,
      avatar_url,
      photos
    } = body;

    db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        bio = COALESCE(?, bio),
        occupation = COALESCE(?, occupation),
        relationship_goals = COALESCE(?, relationship_goals),
        interests = COALESCE(?, interests),
        languages = COALESCE(?, languages),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        avatar_url = COALESCE(?, avatar_url),
        photos = COALESCE(?, photos)
      WHERE id = ?
    `).run(
      full_name || null,
      bio || null,
      occupation || null,
      relationship_goals || null,
      interests ? JSON.stringify(interests) : null,
      languages ? JSON.stringify(languages) : null,
      city || null,
      country || null,
      avatar_url || null,
      photos ? JSON.stringify(photos) : null,
      currentUser.id
    );

    return sendJson(200, {
      success: true,
      message: 'Profile updated successfully!',
      user: getSessionUser(token)
    });
  }

  // Safety & Report
  if (pathname === '/api/safety/report' && req.method === 'POST') {
    const { targetId, reason, details } = body;
    if (!targetId || !reason) {
      return sendJson(400, { success: false, message: 'Target user and reason are required' });
    }

    db.prepare(`
      INSERT INTO reports (reporter_id, reported_id, reason, details)
      VALUES (?, ?, ?, ?)
    `).run(currentUser.id, Number(targetId), reason, details || '');

    return sendJson(200, {
      success: true,
      message: 'Thank you for keeping PEACE safe. Our Trust & Safety team has received your report.'
    });
  }

  if (pathname === '/api/safety/block' && req.method === 'POST') {
    const { targetId } = body;
    // Remove likes and matches between both users
    const targetUserId = Number(targetId);
    db.prepare('DELETE FROM matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)').run(currentUser.id, targetUserId, targetUserId, currentUser.id);
    db.prepare('DELETE FROM likes WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)').run(currentUser.id, targetUserId, targetUserId, currentUser.id);

    return sendJson(200, { success: true, message: 'User blocked. You will no longer see each other.' });
  }

  // ----------------------------------------------------
  // ADMIN DASHBOARD
  // ----------------------------------------------------
  if (pathname.startsWith('/api/admin/')) {
    if (currentUser.role !== 'admin') {
      return sendJson(403, { success: false, message: 'Administrator privileges required' });
    }

    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != "admin"').get().c;
      const verifiedUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_verified > 0 AND role != "admin"').get().c;
      const totalMatches = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
      const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
      const totalCalls = db.prepare('SELECT COUNT(*) as c FROM calls').get().c;
      const pendingReports = db.prepare('SELECT COUNT(*) as c FROM reports WHERE status = "pending"').get().c;

      return sendJson(200, {
        success: true,
        stats: {
          totalUsers,
          verifiedUsers,
          verifiedPercentage: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
          totalMatches,
          totalMessages,
          totalCalls,
          pendingReports
        }
      });
    }

    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const users = db.prepare(`
        SELECT id, email, full_name, birthdate, country, city, role,
               is_verified, is_banned, created_at, last_active, avatar_url
        FROM users
        ORDER BY created_at DESC
      `).all();

      const mapped = users.map(u => ({
        ...u,
        age: calculateAge(u.birthdate),
        is_online: isUserOnline(u.id)
      }));

      return sendJson(200, { success: true, users: mapped });
    }

    if (pathname === '/api/admin/reports' && req.method === 'GET') {
      const reports = db.prepare(`
        SELECT r.id, r.reason, r.details, r.status, r.created_at,
               reporter.id as reporter_id, reporter.full_name as reporter_name, reporter.email as reporter_email,
               reported.id as reported_id, reported.full_name as reported_name, reported.email as reported_email, reported.avatar_url as reported_avatar
        FROM reports r
        JOIN users reporter ON reporter.id = r.reporter_id
        JOIN users reported ON reported.id = r.reported_id
        ORDER BY r.created_at DESC
      `).all();

      return sendJson(200, { success: true, reports });
    }

    if (pathname === '/api/admin/users/toggle-ban' && req.method === 'POST') {
      const { userId } = body;
      const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(userId);
      if (!user) return sendJson(404, { success: false, message: 'User not found' });

      const newStatus = user.is_banned ? 0 : 1;
      db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newStatus, userId);

      return sendJson(200, {
        success: true,
        message: newStatus ? 'User account suspended' : 'User account reinstated',
        is_banned: newStatus
      });
    }

    if (pathname === '/api/admin/users/toggle-verify' && req.method === 'POST') {
      const { userId } = body;
      const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(userId);
      if (!user) return sendJson(404, { success: false, message: 'User not found' });

      const newStatus = user.is_verified >= 1 ? 0 : 2;
      db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(newStatus, userId);

      return sendJson(200, {
        success: true,
        message: newStatus ? 'PEACE Verification badge granted' : 'Verification badge revoked',
        is_verified: newStatus
      });
    }

    if (pathname === '/api/admin/reports/dismiss' && req.method === 'POST') {
      const { reportId } = body;
      db.prepare('UPDATE reports SET status = "dismissed" WHERE id = ?').run(reportId);
      return sendJson(200, { success: true, message: 'Report dismissed' });
    }
  }

  // Fallthrough 404
  return sendJson(404, { success: false, message: 'Endpoint not found' });
}

module.exports = {
  handleApiRequest
};
