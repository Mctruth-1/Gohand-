// Real-time WebSocket Client for PEACE Chat & WebRTC Signaling
const SocketClient = {
  ws: null,
  listeners: new Map(),
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectTimer: null,
  isAuthenticated: false,

  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (token && !this.isAuthenticated) {
        this.authenticate(token);
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[PEACE Socket] Connected to server');
        this.reconnectAttempts = 0;
        if (token) {
          this.authenticate(token);
        }
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncoming(msg);
        } catch (e) {
          console.error('[PEACE Socket] Failed to parse message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[PEACE Socket] Disconnected');
        this.isAuthenticated = false;
        this.emit('disconnected', {});
        this.scheduleReconnect(token);
      };

      this.ws.onerror = (err) => {
        console.warn('[PEACE Socket] Error:', err);
      };
    } catch (e) {
      console.error('[PEACE Socket] Connection error:', e);
      this.scheduleReconnect(token);
    }
  },

  authenticate(token) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send('auth', { token });
  },

  scheduleReconnect(token) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectTimer = setTimeout(() => {
      console.log(`[PEACE Socket] Reconnecting attempt ${this.reconnectAttempts}...`);
      this.connect(token || API.getToken());
    }, delay);
  },

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[PEACE Socket] Cannot send, socket not open');
      return false;
    }
    const message = JSON.stringify({ type, ...payload });
    this.ws.send(message);
    return true;
  },

  handleIncoming(msg) {
    if (msg.type === 'auth-success') {
      this.isAuthenticated = true;
      console.log('[PEACE Socket] Auth success for user:', msg.userId);
    }
    this.emit(msg.type, msg);
    this.emit('*', msg);
  },

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  },

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  },

  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      for (const cb of this.listeners.get(eventType)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[PEACE Socket] Listener error on [${eventType}]:`, e);
        }
      }
    }
  },

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
  }
};
