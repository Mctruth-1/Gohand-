// PEACE Full-Stack Production Server
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { initDB } = require('./db');
const { attachWebSocketServer } = require('./websocket');
const { handleApiRequest } = require('./api');

// Initialize Database & Seeds
initDB();

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // Extract Bearer token
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (query.token) {
    token = query.token;
  }

  // Handle REST API requests
  if (pathname.startsWith('/api/')) {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
      if (rawBody.length > 5 * 1024 * 1024) {
        req.destroy(); // 5MB limit
      }
    });

    req.on('end', () => {
      let body = {};
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          body = {};
        }
      }
      handleApiRequest(req, res, pathname, query, body, token);
    });
    return;
  }

  // Serve static client assets
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(CLIENT_DIR, safePath);

  // If path has no extension and isn't a directory, default to index.html (SPA fallback)
  if (!path.extname(filePath)) {
    filePath = path.join(CLIENT_DIR, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(CLIENT_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

// Attach RFC 6455 WebSocket & WebRTC Signaling
attachWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🕊️  PEACE International Dating Platform Server Running`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: http://127.0.0.1:${PORT}`);
  console.log(`👉 Real-Time WebSocket & WebRTC Ready on /ws`);
  console.log(`=======================================================`);
});
