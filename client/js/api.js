// PEACE API Client & Session Manager
const API = {
  baseUrl: window.location.origin,
  tokenKey: 'peace_auth_token',
  userKey: 'peace_auth_user',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setSession(token, user) {
    if (token) localStorage.setItem(this.tokenKey, token);
    if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  },

  getCachedUser() {
    const raw = localStorage.getItem(this.userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth Endpoints
  async register(userData) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.token && data.user) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token && data.user) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async googleAuth(mockData) {
    const data = await this.request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(mockData)
    });
    if (data.token && data.user) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async demoSwitch(email) {
    const data = await this.request('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (data.token && data.user) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    this.clearSession();
  },

  async getMe() {
    const data = await this.request('/api/auth/me');
    if (data.user) {
      this.setSession(null, data.user);
    }
    return data.user;
  },

  async forgotPassword(email) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(email, code, newPassword) {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    });
  },

  // Verification
  async requestEmailOtp() {
    return this.request('/api/auth/verify/email-request', { method: 'POST' });
  },

  async confirmEmailOtp(code) {
    const data = await this.request('/api/auth/verify/email-confirm', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (data.user) this.setSession(null, data.user);
    return data;
  },

  async requestPhoneOtp(phone) {
    return this.request('/api/auth/verify/phone-request', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  },

  async confirmPhoneOtp(phone, code) {
    const data = await this.request('/api/auth/verify/phone-confirm', {
      method: 'POST',
      body: JSON.stringify({ phone, code })
    });
    if (data.user) this.setSession(null, data.user);
    return data;
  },

  async verifySelfie(photoData) {
    const data = await this.request('/api/auth/verify/selfie', {
      method: 'POST',
      body: JSON.stringify({ photoData })
    });
    if (data.user) this.setSession(null, data.user);
    return data;
  },

  // Discover & Matching
  async getDiscover(filters = {}) {
    const params = new URLSearchParams();
    if (filters.country) params.append('country', filters.country);
    if (filters.minAge) params.append('minAge', filters.minAge);
    if (filters.maxAge) params.append('maxAge', filters.maxAge);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
    if (filters.onlineOnly) params.append('onlineOnly', 'true');
    if (filters.search) params.append('search', filters.search);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/discover${queryStr}`);
  },

  async likeProfile(targetId, isSuperlike = false) {
    return this.request('/api/discover/like', {
      method: 'POST',
      body: JSON.stringify({ targetId, isSuperlike })
    });
  },

  async passProfile(targetId) {
    return this.request('/api/discover/pass', {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
  },

  async getMatches() {
    return this.request('/api/matches');
  },

  async toggleFavourite(targetId) {
    return this.request('/api/favourites/toggle', {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
  },

  async getFavourites() {
    return this.request('/api/favourites');
  },

  // Messaging
  async getMessages(targetUserId) {
    return this.request(`/api/messages/${targetUserId}`);
  },

  // Calls
  async getCallHistory() {
    return this.request('/api/calls/history');
  },

  // Notifications
  async getNotifications() {
    return this.request('/api/notifications');
  },

  async markNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'POST' });
  },

  // Profile Edit
  async updateProfile(profileData) {
    const data = await this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    if (data.user) this.setSession(null, data.user);
    return data;
  },

  // Safety
  async reportUser(targetId, reason, details) {
    return this.request('/api/safety/report', {
      method: 'POST',
      body: JSON.stringify({ targetId, reason, details })
    });
  },

  async blockUser(targetId) {
    return this.request('/api/safety/block', {
      method: 'POST',
      body: JSON.stringify({ targetId })
    });
  },

  // Admin
  async getAdminStats() {
    return this.request('/api/admin/stats');
  },

  async getAdminUsers() {
    return this.request('/api/admin/users');
  },

  async toggleUserBan(userId) {
    return this.request('/api/admin/users/toggle-ban', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  async toggleUserVerify(userId) {
    return this.request('/api/admin/users/toggle-verify', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  async getAdminReports() {
    return this.request('/api/admin/reports');
  },

  async dismissReport(reportId) {
    return this.request('/api/admin/reports/dismiss', {
      method: 'POST',
      body: JSON.stringify({ reportId })
    });
  }
};
