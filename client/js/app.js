// PEACE Application Controller & State Engine
const App = {
  currentUser: null,
  activeTab: 'home',
  discoverMode: 'swipe', // 'swipe' or 'grid'
  discoverProfiles: [],
  currentCardIndex: 0,
  matches: [],
  activeChatPeer: null,
  activeChatMessages: [],
  notifications: [],
  unreadNotifications: 0,
  unreadMessages: 0,
  filters: {
    country: 'All',
    minAge: 18,
    maxAge: 65,
    gender: 'all',
    verifiedOnly: false,
    onlineOnly: false,
    search: ''
  },

  async init() {
    WebRTC.init();

    // Check existing auth token
    const token = API.getToken();
    if (token) {
      try {
        this.currentUser = await API.getMe();
        SocketClient.connect(token);
        this.setupSocketListeners();
        this.loadInitialData();
      } catch (err) {
        console.warn('Session expired or invalid, clearing:', err.message);
        API.clearSession();
        this.currentUser = null;
      }
    }

    // Default to home if not logged in, or discover if logged in
    this.activeTab = this.currentUser ? 'discover' : 'home';
    this.render();

    // Global keyboard shortcuts for swipe mode
    window.addEventListener('keydown', (e) => {
      if (this.activeTab === 'discover' && this.discoverMode === 'swipe') {
        if (e.key === 'ArrowLeft') this.swipeLeft();
        if (e.key === 'ArrowRight') this.swipeRight();
        if (e.key === 'ArrowUp') this.swipeSuperlike();
      }
    });
  },

  setupSocketListeners() {
    SocketClient.on('new-match', (msg) => {
      this.showToast(`🎉 New Match with ${msg.matchedUser.name}!`);
      this.showMatchModal(msg.matchedUser);
      this.refreshMatches();
      this.refreshNotifications();
    });

    SocketClient.on('new-like', (msg) => {
      this.showToast(`❤️ Someone from ${msg.fromCountry} liked your profile!`);
      this.refreshNotifications();
    });

    SocketClient.on('chat-received', (msg) => {
      const message = msg.message;
      if (this.activeChatPeer && this.activeChatPeer.id === message.sender_id) {
        this.activeChatMessages.push(message);
        this.appendMessageToChat(message);
        SocketClient.send('read-messages', { senderId: message.sender_id });
      } else {
        this.showToast(`💬 ${message.sender_name}: ${message.type === 'text' ? message.content : 'Media message'}`);
        this.unreadMessages++;
        this.renderNavbar();
      }
      this.refreshMatches();
    });

    SocketClient.on('user-typing', (msg) => {
      if (this.activeChatPeer && this.activeChatPeer.id === msg.senderId) {
        const typingEl = document.getElementById('chatTypingIndicator');
        if (typingEl) {
          typingEl.style.display = msg.isTyping ? 'flex' : 'none';
        }
      }
    });

    SocketClient.on('messages-read', (msg) => {
      // Mark outbound ticks as read
      document.querySelectorAll('.msg-tick').forEach(el => {
        el.textContent = '✓✓';
        el.style.color = '#38bdf8';
      });
    });

    SocketClient.on('presence', (msg) => {
      // Update online dots if applicable
      const dot = document.getElementById(`statusDot_${msg.userId}`);
      if (dot) {
        dot.style.background = msg.isOnline ? '#10b981' : '#64748b';
      }
    });
  },

  async loadInitialData() {
    try {
      const [notifData, matchData] = await Promise.all([
        API.getNotifications(),
        API.getMatches()
      ]);
      this.notifications = notifData.notifications || [];
      this.unreadNotifications = notifData.unreadCount || 0;
      this.matches = matchData.matches || [];
      this.unreadMessages = this.matches.reduce((sum, m) => sum + (m.unread_count || 0), 0);
    } catch (_) {}
  },

  navigate(tab) {
    // Auth guard for private tabs
    const privateTabs = ['matches', 'messages', 'calls', 'verification', 'profile', 'settings', 'admin'];
    if (privateTabs.includes(tab) && !this.currentUser) {
      this.openAuthModal('login');
      return;
    }

    if (tab === 'admin' && (!this.currentUser || this.currentUser.role !== 'admin')) {
      this.showToast('Administrator privileges required');
      return;
    }

    this.activeTab = tab;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tab === 'discover') {
      this.loadDiscoverProfiles();
    } else if (tab === 'matches') {
      this.loadMatchesView();
    } else if (tab === 'messages') {
      this.loadMessagesView();
    } else if (tab === 'calls') {
      this.loadCallsView();
    } else if (tab === 'verification') {
      this.loadVerificationView();
    } else if (tab === 'notifications') {
      this.loadNotificationsView();
    } else if (tab === 'profile') {
      this.loadProfileView();
    } else if (tab === 'settings') {
      this.loadSettingsView();
    } else if (tab === 'admin') {
      this.loadAdminView();
    }
  },

  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    const navHtml = Components.renderNavbar(this.currentUser, this.activeTab, this.unreadNotifications);

    let mainHtml = '';
    if (this.activeTab === 'home') {
      mainHtml = `
        ${Components.renderHero()}
        ${Components.renderHowItWorks()}
        <div id="featuredSectionPlaceholder"></div>
        ${Components.renderWhyChoose()}
        ${Components.renderTestimonials()}
        ${Components.renderFooter()}
      `;
    } else {
      mainHtml = Components.renderDashboard(
        this.currentUser,
        this.activeTab,
        '<div id="dashboardTabContent" style="min-height: 400px; display: flex; align-items: center; justify-content: center;"><span style="color: var(--text-muted);">Loading view...</span></div>',
        this.unreadNotifications,
        this.unreadMessages
      );
    }

    appEl.innerHTML = `
      <div class="bg-mesh"></div>
      ${navHtml}
      <div id="mainContainer">${mainHtml}</div>
      <div id="modalContainer"></div>
      <div id="callOverlayContainer"></div>
      <div id="toastContainer" class="toast-container"></div>
    `;

    // If on home, fetch and inject featured profiles
    if (this.activeTab === 'home') {
      API.getDiscover({ limit: 4 }).then(res => {
        const ph = document.getElementById('featuredSectionPlaceholder');
        if (ph && res.profiles) {
          ph.innerHTML = Components.renderFeatured(res.profiles);
        }
      }).catch(() => {});
    }
  },

  renderNavbar() {
    const navContainer = document.querySelector('.navbar');
    if (navContainer) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = Components.renderNavbar(this.currentUser, this.activeTab, this.unreadNotifications);
      navContainer.replaceWith(tempDiv.firstElementChild);
    }
  },

  // --------------------------------------------------------
  // DISCOVER MODULE (Swipe Deck & Grid)
  // --------------------------------------------------------
  async loadDiscoverProfiles() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    content.innerHTML = '<div style="text-align:center; padding: 3rem;"><span style="color: var(--text-muted);">Discovering international singles... 🕊️</span></div>';

    try {
      const res = await API.getDiscover(this.filters);
      this.discoverProfiles = res.profiles || [];
      this.currentCardIndex = 0;
      this.renderDiscoverView();
    } catch (err) {
      content.innerHTML = `<div style="text-align:center; padding: 2rem; color: #ef4444;">Failed to load profiles: ${err.message}</div>`;
    }
  },

  renderDiscoverView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    content.innerHTML = `
      <div class="discover-container">
        <!-- Controls Bar -->
        <div class="discover-controls-bar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">Discover People</h2>
            <span style="font-size: 0.85rem; color: var(--text-pink); font-weight: 600;">(${this.discoverProfiles.length} verified singles nearby)</span>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="btn btn-secondary" onclick="App.toggleFilterDrawer()" style="padding: 0.45rem 1rem; font-size: 0.85rem;">
              <span>⚡ Filters</span>
            </button>
            <div class="view-mode-toggle">
              <button class="view-mode-btn ${this.discoverMode === 'swipe' ? 'active' : ''}" onclick="App.setDiscoverMode('swipe')">Swipe Deck</button>
              <button class="view-mode-btn ${this.discoverMode === 'grid' ? 'active' : ''}" onclick="App.setDiscoverMode('grid')">Explore Grid</button>
            </div>
          </div>
        </div>

        <!-- Filter Drawer Container -->
        <div id="filterDrawerContainer" style="display: none;">
          ${this.renderFilterDrawer()}
        </div>

        <!-- Mode Content -->
        ${this.discoverMode === 'swipe' ? this.renderSwipeDeck() : this.renderExploreGrid()}
      </div>
    `;

    if (this.discoverMode === 'swipe') {
      this.attachSwipeListeners();
    }
  },

  setDiscoverMode(mode) {
    this.discoverMode = mode;
    this.renderDiscoverView();
  },

  toggleFilterDrawer() {
    const el = document.getElementById('filterDrawerContainer');
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  },

  renderFilterDrawer() {
    return `
      <div class="filter-card">
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Country</label>
          <select id="filterCountry" class="form-input" onchange="App.applyFilters()">
            <option value="All" ${this.filters.country === 'All' ? 'selected' : ''}>All Countries 🌐</option>
            <option value="Spain" ${this.filters.country === 'Spain' ? 'selected' : ''}>Spain 🇪🇸</option>
            <option value="Japan" ${this.filters.country === 'Japan' ? 'selected' : ''}>Japan 🇯🇵</option>
            <option value="Kenya" ${this.filters.country === 'Kenya' ? 'selected' : ''}>Kenya 🇰🇪</option>
            <option value="Ireland" ${this.filters.country === 'Ireland' ? 'selected' : ''}>Ireland 🇮🇪</option>
            <option value="France" ${this.filters.country === 'France' ? 'selected' : ''}>France 🇫🇷</option>
            <option value="Brazil" ${this.filters.country === 'Brazil' ? 'selected' : ''}>Brazil 🇧🇷</option>
            <option value="Italy" ${this.filters.country === 'Italy' ? 'selected' : ''}>Italy 🇮🇹</option>
            <option value="Taiwan" ${this.filters.country === 'Taiwan' ? 'selected' : ''}>Taiwan 🇹🇼</option>
            <option value="Germany" ${this.filters.country === 'Germany' ? 'selected' : ''}>Germany 🇩🇪</option>
            <option value="United Arab Emirates" ${this.filters.country === 'United Arab Emirates' ? 'selected' : ''}>UAE 🇦🇪</option>
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label">Age Range (${this.filters.minAge} - ${this.filters.maxAge})</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input type="number" id="filterMinAge" class="form-input" value="${this.filters.minAge}" min="18" max="70" onchange="App.applyFilters()" style="width: 70px;">
            <span style="color: var(--text-muted);">-</span>
            <input type="number" id="filterMaxAge" class="form-input" value="${this.filters.maxAge}" min="18" max="80" onchange="App.applyFilters()" style="width: 70px;">
          </div>
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label">Gender</label>
          <select id="filterGender" class="form-input" onchange="App.applyFilters()">
            <option value="all" ${this.filters.gender === 'all' ? 'selected' : ''}>Everyone</option>
            <option value="female" ${this.filters.gender === 'female' ? 'selected' : ''}>Women</option>
            <option value="male" ${this.filters.gender === 'male' ? 'selected' : ''}>Men</option>
            <option value="non-binary" ${this.filters.gender === 'non-binary' ? 'selected' : ''}>Non-Binary</option>
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label">Keywords / Passions</label>
          <input type="text" id="filterSearch" class="form-input" placeholder="e.g. salsa, hiking, tea" value="${this.filters.search}" oninput="App.applyFiltersDebounced()">
        </div>
      </div>
    `;
  },

  applyFilters() {
    this.filters.country = document.getElementById('filterCountry').value;
    this.filters.minAge = parseInt(document.getElementById('filterMinAge').value, 10) || 18;
    this.filters.maxAge = parseInt(document.getElementById('filterMaxAge').value, 10) || 70;
    this.filters.gender = document.getElementById('filterGender').value;
    this.filters.search = document.getElementById('filterSearch').value;
    this.loadDiscoverProfiles();
  },

  applyFiltersDebounced() {
    if (this.filterDebounceTimer) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => this.applyFilters(), 350);
  },

  handleHeroSearch() {
    const country = document.getElementById('heroSearchCountry').value;
    const seeking = document.getElementById('heroSearchSeeking').value;
    this.filters.country = country;
    this.filters.gender = seeking;
    this.navigate('discover');
  },

  renderSwipeDeck() {
    if (this.currentCardIndex >= this.discoverProfiles.length) {
      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); padding: 4rem 2rem; text-align: center; max-width: 440px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">🕊️</div>
          <h3 style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">You're All Caught Up!</h3>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 2rem;">There are no more new profiles matching your current filters. Expand your search or check back soon!</p>
          <button class="btn btn-primary" onclick="App.resetFilters()">Reset Filters & Rewind</button>
        </div>
      `;
    }

    const p = this.discoverProfiles[this.currentCardIndex];
    const photos = (p.photos && p.photos.length > 0) ? p.photos : [p.avatar];

    return `
      <div class="swipe-deck-wrap" id="swipeDeckWrap">
        <div class="swipe-card" id="activeSwipeCard">
          <div class="swipe-card-img-wrap">
            <img id="swipeCardImg" src="${photos[0]}" class="swipe-card-img" alt="${p.name}">
            <div class="swipe-gradient-overlay">
              <!-- Photo progress dots -->
              <div class="swipe-photo-dots">
                ${photos.map((_, idx) => `<div class="photo-dot ${idx === 0 ? 'active' : ''}" onclick="App.setSwipeCardPhoto(${idx})"></div>`).join('')}
              </div>

              <!-- Card Details -->
              <div class="swipe-card-details">
                ${p.is_verified === 2 ? '<div class="badge-verified-gold">🛡️ PEACE Gold Verified</div>' : ''}
                <div class="swipe-card-title">
                  <span>${p.name}, ${p.age}</span>
                  ${p.is_online ? '<span title="Online Now" style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block;"></span>' : ''}
                </div>
                <div class="swipe-card-location">
                  <span>📍 ${p.city}, ${p.country}</span>
                  <span>•</span>
                  <span>✈️ ${p.distance_km.toLocaleString()} km away</span>
                </div>
                <p class="swipe-card-bio">${p.bio || 'Living life with curiosity and purpose.'}</p>
                <div class="profile-mini-passions">
                  ${(p.interests || []).slice(0, 4).map(tag => `<span class="passion-tag">${tag}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Swipe Action Buttons Deck -->
      <div class="swipe-actions-bar">
        <button class="swipe-btn swipe-btn-rewind" onclick="App.rewindSwipe()" title="Rewind last profile">↺</button>
        <button class="swipe-btn swipe-btn-dislike" onclick="App.swipeLeft()" title="Skip (Left Arrow)">✕</button>
        <button class="swipe-btn swipe-btn-superlike" onclick="App.swipeSuperlike()" title="Super Like (Up Arrow)">⭐</button>
        <button class="swipe-btn swipe-btn-like" onclick="App.swipeRight()" title="Like (Right Arrow)">❤️</button>
        <button class="swipe-btn swipe-btn-info" onclick="App.showPublicProfile(${p.id})" title="View Full Profile">ℹ️</button>
      </div>

      <div style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: var(--text-muted);">
        Tip: Use keyboard arrows ← Skip | → Like | ↑ Super Like
      </div>
    `;
  },

  setSwipeCardPhoto(index) {
    const p = this.discoverProfiles[this.currentCardIndex];
    if (!p || !p.photos || !p.photos[index]) return;
    const imgEl = document.getElementById('swipeCardImg');
    if (imgEl) imgEl.src = p.photos[index];
    document.querySelectorAll('.photo-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
    });
  },

  attachSwipeListeners() {
    const card = document.getElementById('activeSwipeCard');
    if (!card) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const startDrag = (x) => {
      isDragging = true;
      startX = x;
      card.style.transition = 'none';
    };

    const moveDrag = (x) => {
      if (!isDragging) return;
      currentX = x - startX;
      const rotate = currentX * 0.08;
      card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

      if (currentX > 110) {
        this.swipeRight();
      } else if (currentX < -110) {
        this.swipeLeft();
      } else {
        card.style.transform = 'translateX(0) rotate(0)';
      }
    };

    card.addEventListener('mousedown', (e) => startDrag(e.clientX));
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX));
    window.addEventListener('mouseup', () => endDrag());

    card.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
    window.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX));
    window.addEventListener('touchend', () => endDrag());
  },

  async swipeRight() {
    if (this.currentCardIndex >= this.discoverProfiles.length) return;
    const p = this.discoverProfiles[this.currentCardIndex];
    this.animateCardExit('right');

    try {
      const res = await API.likeProfile(p.id, false);
      if (res.isMatch) {
        this.showMatchModal(res.matchedUser || p);
      }
    } catch (_) {}

    this.currentCardIndex++;
    setTimeout(() => this.renderDiscoverView(), 200);
  },

  async swipeLeft() {
    if (this.currentCardIndex >= this.discoverProfiles.length) return;
    const p = this.discoverProfiles[this.currentCardIndex];
    this.animateCardExit('left');
    try {
      await API.passProfile(p.id);
    } catch (_) {}
    this.currentCardIndex++;
    setTimeout(() => this.renderDiscoverView(), 200);
  },

  async swipeSuperlike() {
    if (this.currentCardIndex >= this.discoverProfiles.length) return;
    const p = this.discoverProfiles[this.currentCardIndex];
    this.animateCardExit('up');
    try {
      const res = await API.likeProfile(p.id, true);
      this.showToast(`⭐ Super Liked ${p.name}!`);
      if (res.isMatch) {
        this.showMatchModal(res.matchedUser || p);
      }
    } catch (_) {}
    this.currentCardIndex++;
    setTimeout(() => this.renderDiscoverView(), 200);
  },

  rewindSwipe() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
      this.renderDiscoverView();
    } else {
      this.showToast('No more cards to rewind');
    }
  },

  animateCardExit(direction) {
    const card = document.getElementById('activeSwipeCard');
    if (!card) return;
    card.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
    if (direction === 'right') {
      card.style.transform = 'translateX(500px) rotate(25deg)';
    } else if (direction === 'left') {
      card.style.transform = 'translateX(-500px) rotate(-25deg)';
    } else if (direction === 'up') {
      card.style.transform = 'translateY(-500px) scale(0.9)';
    }
    card.style.opacity = '0';
  },

  resetFilters() {
    this.filters = { country: 'All', minAge: 18, maxAge: 65, gender: 'all', verifiedOnly: false, onlineOnly: false, search: '' };
    this.loadDiscoverProfiles();
  },

  renderExploreGrid() {
    if (this.discoverProfiles.length === 0) {
      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); padding: 3rem 2rem; text-align: center;">
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No profiles found</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Try adjusting your search filters.</p>
          <button class="btn btn-primary" onclick="App.resetFilters()">Clear Filters</button>
        </div>
      `;
    }

    return `
      <div class="featured-profiles-grid">
        ${this.discoverProfiles.map(p => `
          <div class="profile-card-mini">
            <div class="profile-card-image-wrap" onclick="App.showPublicProfile(${p.id})">
              <img src="${p.avatar || (p.photos && p.photos[0])}" class="profile-card-image" alt="${p.name}">
              <div class="profile-card-overlay">
                ${p.is_verified === 2 ? '<div class="badge-verified-gold">🛡️ PEACE Gold Verified</div>' : ''}
                <div class="profile-mini-name">
                  <span>${p.name}, ${p.age}</span>
                  ${p.is_online ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>' : ''}
                </div>
                <div class="profile-mini-location">
                  <span>📍 ${p.city}, ${p.country}</span>
                </div>
                <div class="profile-mini-passions">
                  ${(p.interests || []).slice(0, 3).map(tag => `<span class="passion-tag">${tag}</span>`).join('')}
                </div>
              </div>
            </div>
            <div style="padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; background: rgba(17, 24, 39, 0.95); border-top: 1px solid var(--border-glass);">
              <button class="btn-icon" onclick="App.quickLike(${p.id})" title="Like" style="color: #10b981;">❤️</button>
              <button class="btn-icon" onclick="App.toggleFav(${p.id})" title="Bookmark" style="color: #f59e0b;">⭐</button>
              <button class="btn btn-primary" onclick="App.showPublicProfile(${p.id})" style="padding: 0.45rem 1rem; font-size: 0.82rem;">View Profile</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async quickLike(targetId) {
    try {
      const res = await API.likeProfile(targetId);
      this.showToast('Profile liked ❤️');
      if (res.isMatch) {
        this.showMatchModal(res.matchedUser);
      }
    } catch (_) {}
  },

  async toggleFav(targetId) {
    try {
      const res = await API.toggleFavourite(targetId);
      this.showToast(res.isFavourited ? 'Added to Favourites ⭐' : 'Removed from Favourites');
    } catch (_) {}
  },

  // --------------------------------------------------------
  // MATCH CELEBRATION MODAL ("It's a Match!")
  // --------------------------------------------------------
  showMatchModal(matchedUser) {
    this.launchConfetti();
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal(event)">
        <div class="modal-content" style="max-width: 440px; text-align: center; padding: 2.5rem 2rem; background: linear-gradient(180deg, #1e1b4b 0%, #111827 100%); border: 2px solid var(--pink-primary); box-shadow: var(--shadow-pink-glow);">
          <div style="font-size: 2.8rem; margin-bottom: 0.5rem; animation: pulse-glow 2s infinite;">🎉 ❤️ 🕊️</div>
          <h2 style="font-size: 2.2rem; font-weight: 900; background: linear-gradient(135deg, #ffffff, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem;">It's a Match!</h2>
          <p style="font-size: 0.95rem; color: #e2e8f0; margin-bottom: 2rem;">You and ${matchedUser.name} liked each other! Cross-border sparks are flying.</p>

          <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 2.5rem;">
            <img src="${this.currentUser.avatar_url || this.currentUser.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--purple-light); box-shadow: var(--shadow-glow);" alt="You">
            <span style="font-size: 1.8rem; color: var(--pink-primary); animation: bounce-subtle 1.5s infinite;">❤️</span>
            <img src="${matchedUser.avatar || matchedUser.avatar_url}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--pink-primary); box-shadow: var(--shadow-pink-glow);" alt="${matchedUser.name}">
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <button class="btn btn-primary" onclick="App.startChatWithMatchedUser(${matchedUser.id})" style="padding: 0.85rem; font-size: 1rem;">
              <span>Say Hello in Chat</span>
              <span>💬</span>
            </button>
            <button class="btn btn-secondary" onclick="App.closeModalDirect()">Keep Swiping</button>
          </div>
        </div>
      </div>
    `;
  },

  startChatWithMatchedUser(userId) {
    this.closeModalDirect();
    this.navigate('messages');
    setTimeout(() => {
      this.selectChatPeer(userId);
    }, 200);
  },

  // --------------------------------------------------------
  // MESSAGES MODULE (Real-Time One-on-One Chat)
  // --------------------------------------------------------
  async loadMessagesView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    try {
      const matchRes = await API.getMatches();
      this.matches = matchRes.matches || [];

      if (this.matches.length === 0) {
        content.innerHTML = `
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); padding: 4rem 2rem; text-align: center; max-width: 500px; margin: 0 auto;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">💌</div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">No Mutual Matches Yet</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 2rem;">When you and another member mutually like each other, your private chat will appear here.</p>
            <button class="btn btn-primary" onclick="App.navigate('discover')">Explore Discover & Like Profiles</button>
          </div>
        `;
        return;
      }

      const defaultPeer = this.activeChatPeer || this.matches[0];
      this.activeChatPeer = defaultPeer;

      content.innerHTML = `
        <div class="chat-container">
          <!-- Matches & Active Chats Sidebar -->
          <div class="chat-matches-sidebar">
            <div class="chat-matches-header">
              <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff;">Matches & Chats</h3>
              <span style="font-size: 0.78rem; color: var(--text-pink); font-weight: 600;">${this.matches.length} Mutual</span>
            </div>
            <div class="chat-matches-list">
              ${this.matches.map(m => `
                <div class="chat-match-item ${this.activeChatPeer && this.activeChatPeer.id === m.id ? 'active' : ''}" onclick="App.selectChatPeer(${m.id})">
                  <div class="avatar-with-status">
                    <img src="${m.avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" alt="${m.name}">
                    <div id="statusDot_${m.id}" class="status-dot-online" style="background: ${m.is_online ? '#10b981' : '#64748b'};"></div>
                  </div>
                  <div class="chat-match-info">
                    <div class="chat-match-name">
                      <span>${m.name}</span>
                      ${m.is_verified === 2 ? '<span style="font-size: 0.72rem;">🛡️</span>' : ''}
                    </div>
                    <div class="chat-match-snippet">
                      ${m.last_message ? m.last_message.content : `Matched from ${m.country} ✈️`}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Active Chat Main Pane -->
          <div class="chat-main-pane">
            <div class="chat-pane-header">
              <div class="chat-peer-info" onclick="App.showPublicProfile(${this.activeChatPeer.id})" style="cursor: pointer;">
                <img src="${this.activeChatPeer.avatar}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover;" alt="${this.activeChatPeer.name}">
                <div>
                  <div class="chat-peer-name">
                    <span>${this.activeChatPeer.name}</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">📍 ${this.activeChatPeer.country}</span>
                    ${this.activeChatPeer.is_verified === 2 ? '<span style="font-size: 0.8rem;">🛡️</span>' : ''}
                  </div>
                  <div class="chat-peer-status">${this.activeChatPeer.is_online ? '● Online Now' : '○ Recently active'}</div>
                </div>
              </div>

              <div class="chat-header-actions">
                <button class="btn-call-trigger" onclick="App.triggerCall('audio')" title="Start Encrypted Audio Call">
                  <span>📞</span>
                </button>
                <button class="btn-call-trigger btn-call-video" onclick="App.triggerCall('video')" title="Start WebRTC HD Video Date">
                  <span>📹</span>
                </button>
                <button class="btn-icon" onclick="App.openSafetyReportModal(${this.activeChatPeer.id})" title="Report or Block User">
                  <span>⚠️</span>
                </button>
              </div>
            </div>

            <!-- Messages Stream -->
            <div id="chatMessagesStream" class="chat-messages-stream">
              <div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading conversation...</div>
            </div>

            <!-- Real-time Typing Indicator -->
            <div id="chatTypingIndicator" class="typing-indicator-bar" style="display: none;">
              <span>✍️</span>
              <span>${this.activeChatPeer.name} is typing...</span>
            </div>

            <!-- Input Bar -->
            <div class="chat-input-bar">
              <button class="btn-icon" onclick="App.toggleEmojiPicker()" title="Insert Emoji">😊</button>
              <button class="btn-icon" onclick="App.triggerImageAttachment()" title="Send Image">📷</button>
              <button class="btn-icon" onclick="App.recordVoiceNote()" title="Send Voice Memo">🎙️</button>
              
              <input type="text" id="chatInputMessage" class="chat-input-field" placeholder="Type a message to ${this.activeChatPeer.name}..." onkeydown="App.handleChatKeyDown(event)" oninput="App.handleChatTyping()">
              
              <button class="btn-chat-send" onclick="App.sendChatMessage()" title="Send">
                <span>➤</span>
              </button>

              <div id="emojiPickerDrawer" class="emoji-picker-drawer" style="display: none;">
                ${['❤️', '💖', '✨', '🌹', '🥂', '✈️', '🥰', '😊', '😍', '🕊️', '🏖️', '☕', '🎨', '🎶', '🌍', '💃'].map(e => `<span class="emoji-btn" onclick="App.insertEmoji('${e}')">${e}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      this.loadMessagesHistory(this.activeChatPeer.id);
    } catch (err) {
      content.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error loading chat: ${err.message}</div>`;
    }
  },

  async selectChatPeer(peerId) {
    const peer = this.matches.find(m => m.id === peerId);
    if (peer) {
      this.activeChatPeer = peer;
      this.loadMessagesView();
    }
  },

  async loadMessagesHistory(peerId) {
    const stream = document.getElementById('chatMessagesStream');
    if (!stream) return;

    try {
      const res = await API.getMessages(peerId);
      this.activeChatMessages = res.messages || [];
      this.renderMessagesStream();
    } catch (_) {
      stream.innerHTML = '<div style="text-align: center; padding: 2rem;">No messages yet. Break the ice! 🕊️</div>';
    }
  },

  renderMessagesStream() {
    const stream = document.getElementById('chatMessagesStream');
    if (!stream) return;

    if (this.activeChatMessages.length === 0) {
      stream.innerHTML = `
        <div style="text-align: center; margin: auto; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🕊️</div>
          <p style="font-weight: 700; color: #fff;">You and ${this.activeChatPeer.name} are connected!</p>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 320px; margin: 0.4rem auto;">Say hello, ask about their culture in ${this.activeChatPeer.country}, or invite them to a video call.</p>
        </div>
      `;
      return;
    }

    stream.innerHTML = this.activeChatMessages.map(m => {
      const isOutbound = m.sender_id === this.currentUser.id;
      return `
        <div class="message-bubble-wrap ${isOutbound ? 'message-outbound' : 'message-inbound'}">
          <div class="message-bubble">
            ${m.type === 'image' && m.media_url ? `<img src="${m.media_url}" style="max-width: 250px; border-radius: 8px; margin-bottom: 0.4rem; display: block;" alt="Photo">` : ''}
            ${m.type === 'audio' ? `
              <div class="voice-note-player">
                <button class="voice-play-btn" onclick="App.playVoiceNoteSimulation()">▶</button>
                <div class="voice-waveform-sim">
                  <div class="waveform-bar" style="height: 40%;"></div>
                  <div class="waveform-bar" style="height: 70%;"></div>
                  <div class="waveform-bar" style="height: 100%;"></div>
                  <div class="waveform-bar" style="height: 50%;"></div>
                  <div class="waveform-bar" style="height: 80%;"></div>
                </div>
                <span style="font-size: 0.75rem; font-family: monospace;">0:14</span>
              </div>
            ` : ''}
            ${m.content ? `<div>${m.content}</div>` : ''}
            <div class="message-meta">
              <span>${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              ${isOutbound ? `<span class="msg-tick" style="color: ${m.is_read ? '#38bdf8' : 'inherit'};">${m.is_read ? '✓✓' : '✓'}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    stream.scrollTop = stream.scrollHeight;
  },

  appendMessageToChat(msg) {
    const stream = document.getElementById('chatMessagesStream');
    if (!stream) return;
    const isOutbound = msg.sender_id === this.currentUser.id;
    const bubble = document.createElement('div');
    bubble.className = `message-bubble-wrap ${isOutbound ? 'message-outbound' : 'message-inbound'}`;
    bubble.innerHTML = `
      <div class="message-bubble">
        ${msg.type === 'image' && msg.media_url ? `<img src="${msg.media_url}" style="max-width: 250px; border-radius: 8px; margin-bottom: 0.4rem; display: block;" alt="Photo">` : ''}
        ${msg.content ? `<div>${msg.content}</div>` : ''}
        <div class="message-meta">
          <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ${isOutbound ? '<span class="msg-tick">✓</span>' : ''}
        </div>
      </div>
    `;
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
  },

  handleChatKeyDown(e) {
    if (e.key === 'Enter') {
      this.sendChatMessage();
    }
  },

  handleChatTyping() {
    if (!this.activeChatPeer) return;
    SocketClient.send('typing', {
      receiverId: this.activeChatPeer.id,
      isTyping: true
    });
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      SocketClient.send('typing', {
        receiverId: this.activeChatPeer.id,
        isTyping: false
      });
    }, 1500);
  },

  sendChatMessage(contentOverride = null, type = 'text', mediaUrl = null) {
    const input = document.getElementById('chatInputMessage');
    const content = contentOverride !== null ? contentOverride : (input ? input.value.trim() : '');

    if (!content && !mediaUrl) return;
    if (!this.activeChatPeer) return;

    if (input && contentOverride === null) input.value = '';

    SocketClient.send('chat-message', {
      receiverId: this.activeChatPeer.id,
      content,
      messageType: type,
      mediaUrl
    });
  },

  toggleEmojiPicker() {
    const el = document.getElementById('emojiPickerDrawer');
    if (el) {
      el.style.display = el.style.display === 'none' ? 'grid' : 'none';
    }
  },

  insertEmoji(emoji) {
    const input = document.getElementById('chatInputMessage');
    if (input) {
      input.value += emoji;
      input.focus();
    }
    this.toggleEmojiPicker();
  },

  triggerImageAttachment() {
    // Quick photo simulation or file input
    const photoUrl = prompt('Enter image URL or press OK to send sample photo:', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600');
    if (photoUrl) {
      this.sendChatMessage('Shared a photo 📸', 'image', photoUrl);
    }
  },

  recordVoiceNote() {
    this.showToast('Recording voice note... (3s simulation)');
    setTimeout(() => {
      this.sendChatMessage('', 'audio', 'voice-note-sample.webm');
      this.showToast('Voice memo sent 🎙️');
    }, 1500);
  },

  playVoiceNoteSimulation() {
    this.showToast('Playing voice memo... 🔊');
  },

  // --------------------------------------------------------
  // WEBRTC CALLING ACTIONS & OVERLAYS
  // --------------------------------------------------------
  triggerCall(callType = 'video') {
    if (!this.activeChatPeer) {
      this.showToast('Please select a contact to call');
      return;
    }
    WebRTC.startCall(this.activeChatPeer, callType);
  },

  showIncomingCallModal(call) {
    const overlay = document.getElementById('callOverlayContainer');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal-backdrop">
        <div class="incoming-call-box">
          <div class="caller-avatar-ring">
            <div class="pulse-ring"></div>
            <img src="${call.peer.avatar}" class="caller-avatar-img" alt="${call.peer.name}">
          </div>
          <div class="incoming-call-title">${call.peer.name}</div>
          <div class="incoming-call-type">
            Incoming ${call.callType === 'video' ? 'HD Video Date' : 'Audio Call'} • ${call.peer.country || 'Global'}
          </div>

          <div class="incoming-call-actions">
            <button class="call-action-btn btn-decline-call" onclick="WebRTC.declineCall()" title="Decline Call">
              ✕
            </button>
            <button class="call-action-btn btn-accept-call" onclick="WebRTC.acceptCall()" title="Accept Call">
              ${call.callType === 'video' ? '📹' : '📞'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  showCallOverlay(call) {
    const overlay = document.getElementById('callOverlayContainer');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="call-modal-overlay">
        <!-- Status Pill -->
        <div class="call-status-pill">
          <img src="${call.peer.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="${call.peer.name}">
          <span style="font-weight: 700; color: #fff;">${call.peer.name}</span>
          <span style="color: var(--text-muted);">|</span>
          <span id="callStatusText" style="color: var(--pink-primary);">${call.isOutgoing ? 'Calling...' : 'Connecting...'}</span>
          <span id="callTimerDisplay" class="call-timer-badge">00:00</span>
        </div>

        <!-- Video Stage -->
        <div class="video-stage">
          ${call.callType === 'video' ? `
            <video id="remoteVideoElem" class="remote-video-elem" autoplay playsinline></video>
            <video id="localPipVideo" class="local-pip-video-elem" autoplay playsinline muted></video>
          ` : `
            <div class="audio-call-visualizer-pane">
              <div class="caller-avatar-ring" style="width: 140px; height: 140px;">
                <div class="pulse-ring"></div>
                <img src="${call.peer.avatar}" class="caller-avatar-img" alt="${call.peer.name}">
              </div>
              <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff; margin-top: 1rem;">${call.peer.name}</h2>
              <p style="color: var(--text-secondary); margin-top: 0.3rem;">Encrypted Audio Call • ${call.peer.country}</p>
              
              <div class="audio-bars-wave">
                <div class="audio-wave-stick" style="animation-delay: 0s;"></div>
                <div class="audio-wave-stick" style="animation-delay: 0.15s;"></div>
                <div class="audio-wave-stick" style="animation-delay: 0.3s;"></div>
                <div class="audio-wave-stick" style="animation-delay: 0.45s;"></div>
                <div class="audio-wave-stick" style="animation-delay: 0.6s;"></div>
              </div>
            </div>
          `}
        </div>

        <!-- Controls Dock -->
        <div class="call-controls-dock">
          <button id="callBtnMute" class="control-dock-btn" onclick="App.toggleCallMute()" title="Mute / Unmute">
            🎤
          </button>
          ${call.callType === 'video' ? `
            <button id="callBtnCamera" class="control-dock-btn" onclick="App.toggleCallCamera()" title="Camera On / Off">
              📹
            </button>
          ` : ''}
          <button class="control-dock-btn" onclick="WebRTC.toggleFullscreen()" title="Fullscreen">
            ⛶
          </button>
          <button class="control-dock-btn control-dock-btn-end" onclick="WebRTC.endCall('Call ended')" title="End Call">
            🔴
          </button>
        </div>
      </div>
    `;
  },

  updateCallStatus(status) {
    const el = document.getElementById('callStatusText');
    if (el) el.textContent = status;
  },

  toggleCallMute() {
    const isMuted = WebRTC.toggleMute();
    const btn = document.getElementById('callBtnMute');
    if (btn) {
      btn.classList.toggle('muted', isMuted);
      btn.textContent = isMuted ? '🔇' : '🎤';
    }
  },

  toggleCallCamera() {
    const isOff = WebRTC.toggleCamera();
    const btn = document.getElementById('callBtnCamera');
    if (btn) {
      btn.classList.toggle('muted', isOff);
      btn.textContent = isOff ? '🚫' : '📹';
    }
  },

  hideCallOverlay() {
    const overlay = document.getElementById('callOverlayContainer');
    if (overlay) overlay.innerHTML = '';
  },

  // --------------------------------------------------------
  // CALL HISTORY VIEW
  // --------------------------------------------------------
  async loadCallsView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    try {
      const res = await API.getCallHistory();
      const calls = res.calls || [];

      content.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">Call History</h2>
            <span style="font-size: 0.85rem; color: var(--text-secondary);">${calls.length} Total Calls</span>
          </div>

          ${calls.length === 0 ? `
            <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); padding: 3rem; text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📹</div>
              <h3 style="color: #fff;">No Call History</h3>
              <p style="color: var(--text-secondary); margin-top: 0.3rem;">Start an HD audio or video call with any mutual match.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${calls.map(c => `
                <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${c.peer.avatar}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" alt="${c.peer.name}">
                    <div>
                      <div style="font-size: 1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                        <span>${c.peer.name}</span>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${c.peer.country}</span>
                      </div>
                      <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
                        <span>${c.type === 'video' ? '📹 Video Call' : '📞 Audio Call'}</span>
                        <span>•</span>
                        <span style="color: ${c.status === 'completed' ? '#10b981' : '#ef4444'};">${c.status}</span>
                        ${c.duration > 0 ? `<span>• ${Math.floor(c.duration / 60)}m ${c.duration % 60}s</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.started_at).toLocaleDateString()}</span>
                    <button class="btn btn-secondary" onclick="WebRTC.startCall({ id: ${c.peer.id}, name: '${c.peer.name}', avatar: '${c.peer.avatar}', country: '${c.peer.country}' }, '${c.type}')" style="padding: 0.45rem 1rem; font-size: 0.82rem;">Call Back</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
    }
  },

  // --------------------------------------------------------
  // VERIFICATION CENTER VIEW
  // --------------------------------------------------------
  loadVerificationView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;
    const u = this.currentUser;

    content.innerHTML = `
      <div style="max-width: 720px; margin: 0 auto;">
        <div style="margin-bottom: 2rem; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛡️</div>
          <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff;">PEACE Trust & Verification Center</h2>
          <p style="color: var(--text-secondary); max-width: 500px; margin: 0.4rem auto;">
            Protecting our international community from catfishing and fraud. Complete all levels to receive the Gold PEACE Verified Shield.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Level 1: Email -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.6rem;">
                <span>✉️ Email Verification (OTP)</span>
                ${u.email_verified ? '<span style="color: #10b981; font-size: 0.85rem;">✓ Verified</span>' : '<span style="color: #f59e0b; font-size: 0.85rem;">Pending</span>'}
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem;">Confirms account ownership at ${u.email}</p>
            </div>
            ${u.email_verified ? '<button class="btn btn-secondary" disabled style="opacity: 0.6;">Done</button>' : `<button class="btn btn-primary" onclick="App.startEmailOtpFlow()">Verify Email</button>`}
          </div>

          <!-- Level 2: Phone -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.6rem;">
                <span>📱 Phone Number Verification (SMS OTP)</span>
                ${u.phone_verified ? '<span style="color: #10b981; font-size: 0.85rem;">✓ Verified</span>' : '<span style="color: #f59e0b; font-size: 0.85rem;">Optional</span>'}
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem;">Ensures real mobile device authenticity</p>
            </div>
            ${u.phone_verified ? '<button class="btn btn-secondary" disabled style="opacity: 0.6;">Done</button>' : `<button class="btn btn-primary" onclick="App.startPhoneOtpFlow()">Verify Phone</button>`}
          </div>

          <!-- Level 3: Selfie Liveness Check -->
          <div style="background: var(--bg-card); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.6rem;">
                <span>🤳 Anti-Catfish Selfie Liveness Check</span>
                ${u.selfie_verified ? '<span style="color: #eab308; font-weight: 700;">🛡️ Gold Verified</span>' : '<span style="color: #f59e0b; font-size: 0.85rem;">Action Needed</span>'}
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.3rem;">3D facial recognition scan matching your profile pictures</p>
            </div>
            ${u.selfie_verified ? '<button class="btn btn-secondary" disabled style="opacity: 0.6;">Shield Active</button>' : `<button class="btn btn-primary" onclick="App.startSelfieScanFlow()" style="background: linear-gradient(135deg, #eab308, #ec4899);">Scan Face Now</button>`}
          </div>
        </div>
      </div>
    `;
  },

  async startEmailOtpFlow() {
    try {
      const res = await API.requestEmailOtp();
      const code = prompt(`Enter the 6-digit code sent to ${this.currentUser.email} (Demo code: ${res.code}):`, res.code);
      if (code) {
        const verifyRes = await API.confirmEmailOtp(code);
        this.currentUser = verifyRes.user;
        this.showToast('Email verified successfully! 🎉');
        this.loadVerificationView();
        this.renderNavbar();
      }
    } catch (e) {
      this.showToast('Verification error: ' + e.message);
    }
  },

  async startPhoneOtpFlow() {
    const phone = prompt('Enter your phone number:', '+1 555-0192');
    if (!phone) return;
    try {
      const res = await API.requestPhoneOtp(phone);
      const code = prompt(`Enter the 6-digit SMS code (Demo code: ${res.code}):`, res.code);
      if (code) {
        const verifyRes = await API.confirmPhoneOtp(phone, code);
        this.currentUser = verifyRes.user;
        this.showToast('Phone verified! 🎉');
        this.loadVerificationView();
        this.renderNavbar();
      }
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  startSelfieScanFlow() {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content" style="max-width: 480px; text-align: center; padding: 2rem;">
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">Biometric Face Scan</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Position your face inside the oval guide and keep steady.</p>

          <div style="width: 240px; height: 300px; border-radius: 50%; border: 3px dashed var(--pink-primary); margin: 0 auto 1.5rem; position: relative; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center;">
            <video id="selfieCameraFeed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
            <div id="selfieScanLaser" style="position: absolute; left: 0; right: 0; height: 3px; background: #ec4899; box-shadow: 0 0 15px #ec4899; animation: scan-move 2s infinite ease-in-out;"></div>
          </div>

          <div id="selfieStatusText" style="font-size: 0.9rem; color: #e2e8f0; margin-bottom: 1.5rem; font-weight: 600;">
            Aligning facial landmarks...
          </div>

          <button class="btn btn-secondary" onclick="App.closeModalDirect()">Cancel</button>
        </div>
      </div>
    `;

    // Try camera feed
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        const vid = document.getElementById('selfieCameraFeed');
        if (vid) vid.srcObject = stream;
      }).catch(() => {});
    }

    // Automated 3-second simulation
    setTimeout(() => {
      const text = document.getElementById('selfieStatusText');
      if (text) text.textContent = 'Blink once... Checking liveness...';
    }, 1200);

    setTimeout(async () => {
      try {
        const res = await API.verifySelfie('data:image/selfie_verified');
        this.currentUser = res.user;
        this.closeModalDirect();
        this.launchConfetti();
        this.showToast('🛡️ Congratulations! PEACE Gold Verification Approved!');
        this.loadVerificationView();
        this.renderNavbar();
      } catch (e) {
        this.showToast('Scan error: ' + e.message);
      }
    }, 2800);
  },

  // --------------------------------------------------------
  // NOTIFICATIONS VIEW
  // --------------------------------------------------------
  async loadNotificationsView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    try {
      const res = await API.getNotifications();
      this.notifications = res.notifications || [];
      this.unreadNotifications = 0;
      this.renderNavbar();

      content.innerHTML = `
        <div style="max-width: 720px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.8rem;">
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff;">Notifications</h2>
            <button class="btn btn-secondary" onclick="App.markAllNotificationsRead()" style="padding: 0.4rem 0.9rem; font-size: 0.82rem;">Mark All as Read</button>
          </div>

          ${this.notifications.length === 0 ? `
            <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); padding: 3rem; text-align: center;">
              <p style="color: var(--text-secondary);">No notifications yet.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${this.notifications.map(n => `
                <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; align-items: flex-start; gap: 1rem;">
                  <span style="font-size: 1.5rem;">${n.type === 'match' ? '🎉' : n.type === 'like' ? '❤️' : n.type === 'call' ? '📞' : '🛡️'}</span>
                  <div style="flex: 1;">
                    <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${n.title}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">${n.content}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.4rem;">${new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
    }
  },

  async markAllNotificationsRead() {
    await API.markNotificationsRead();
    this.unreadNotifications = 0;
    this.renderNavbar();
    this.loadNotificationsView();
  },

  // --------------------------------------------------------
  // USER PROFILE & EDIT PROFILE
  // --------------------------------------------------------
  loadProfileView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;
    const u = this.currentUser;

    content.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-xl); overflow: hidden; margin-bottom: 2rem;">
          <div style="height: 160px; background: var(--gradient-brand); position: relative;"></div>
          <div style="padding: 0 2rem 2rem; position: relative;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-top: -60px; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
              <img src="${u.avatar_url || u.avatar}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #111827; box-shadow: var(--shadow-lg);" alt="Profile">
              <button class="btn btn-primary" onclick="App.openEditProfileModal()">Edit Profile</button>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem;">
              <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff;">${u.full_name}, ${u.age}</h2>
              ${u.is_verified === 2 ? '<div class="badge-verified-gold">🛡️ Gold Verified</div>' : ''}
            </div>
            <div style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.5rem;">
              📍 ${u.city}, ${u.country} • ${u.occupation || 'Member'}
            </div>

            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem;">About Me</h4>
              <p style="color: #e2e8f0; line-height: 1.6;">${u.bio || 'Tell the world about yourself and what peace means to you.'}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
              <div>
                <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem;">Looking For</h4>
                <p style="color: #fff;">${u.relationship_goals || 'Long-term relationship'}</p>
              </div>
              <div>
                <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem;">Languages Spoken</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                  ${(u.languages || []).map(l => `<span class="passion-tag">${l}</span>`).join('')}
                </div>
              </div>
              <div>
                <h4 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.5rem;">Interests & Passions</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                  ${(u.interests || []).map(i => `<span class="passion-tag">${i}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  openEditProfileModal() {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;
    const u = this.currentUser;

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal(event)">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">Edit Your Profile</h3>
            <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="editFullName" class="form-input" value="${u.full_name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Occupation</label>
              <input type="text" id="editOccupation" class="form-input" value="${u.occupation || ''}">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" id="editCity" class="form-input" value="${u.city || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Country</label>
                <input type="text" id="editCountry" class="form-input" value="${u.country || ''}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Biography</label>
              <textarea id="editBio" class="form-input" rows="4">${u.bio || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Relationship Goals</label>
              <select id="editGoals" class="form-input">
                <option value="Long-term relationship" ${u.relationship_goals === 'Long-term relationship' ? 'selected' : ''}>Long-term relationship</option>
                <option value="Marriage & Family" ${u.relationship_goals === 'Marriage & Family' ? 'selected' : ''}>Marriage & Family</option>
                <option value="Friendship & Cultural Exchange" ${u.relationship_goals === 'Friendship & Cultural Exchange' ? 'selected' : ''}>Friendship & Cultural Exchange</option>
                <option value="Travel Companion" ${u.relationship_goals === 'Travel Companion' ? 'selected' : ''}>Travel Companion</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Profile Avatar URL</label>
              <input type="text" id="editAvatar" class="form-input" value="${u.avatar_url || u.avatar || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Passions & Interests (comma separated)</label>
              <input type="text" id="editInterests" class="form-input" value="${(u.interests || []).join(', ')}">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
              <button class="btn btn-secondary" onclick="App.closeModalDirect()">Cancel</button>
              <button class="btn btn-primary" onclick="App.saveProfileChanges()">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveProfileChanges() {
    const full_name = document.getElementById('editFullName').value.trim();
    const occupation = document.getElementById('editOccupation').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const country = document.getElementById('editCountry').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const relationship_goals = document.getElementById('editGoals').value;
    const avatar_url = document.getElementById('editAvatar').value.trim();
    const rawInterests = document.getElementById('editInterests').value;
    const interests = rawInterests.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await API.updateProfile({
        full_name,
        occupation,
        city,
        country,
        bio,
        relationship_goals,
        avatar_url,
        interests
      });
      this.currentUser = res.user;
      this.closeModalDirect();
      this.showToast('Profile saved successfully! ✨');
      this.loadProfileView();
      this.renderNavbar();
    } catch (e) {
      this.showToast('Error saving profile: ' + e.message);
    }
  },

  // --------------------------------------------------------
  // PUBLIC PROFILE VIEW MODAL
  // --------------------------------------------------------
  async showPublicProfile(userId) {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    let p = this.discoverProfiles.find(x => x.id === userId) || this.matches.find(x => x.id === userId);
    if (!p) {
      try {
        const res = await API.getDiscover();
        p = (res.profiles || []).find(x => x.id === userId);
      } catch (_) {}
    }
    if (!p) return;

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal(event)">
        <div class="modal-content" style="max-width: 580px; padding: 0; overflow: hidden;">
          <div style="height: 380px; position: relative;">
            <img src="${p.avatar || (p.photos && p.photos[0])}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.name}">
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(11, 15, 25, 0.95) 100%);"></div>
            <button class="modal-close-btn" onclick="App.closeModalDirect()" style="position: absolute; top: 1rem; right: 1rem; z-index: 10;">✕</button>
            <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; right: 1.5rem;">
              ${p.is_verified === 2 ? '<div class="badge-verified-gold">🛡️ Gold PEACE Verified</div>' : ''}
              <div style="font-size: 1.8rem; font-weight: 800; color: #fff;">${p.name}, ${p.age}</div>
              <div style="font-size: 0.95rem; color: var(--text-secondary); margin-top: 0.2rem;">📍 ${p.city}, ${p.country}</div>
            </div>
          </div>

          <div style="padding: 1.8rem;">
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.4rem;">About</h4>
              <p style="color: #e2e8f0; line-height: 1.6;">${p.bio || 'Passionate about travel, culture, and meaningful human connection.'}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
              <div>
                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.3rem;">Occupation</h4>
                <p style="color: #fff; font-size: 0.95rem;">${p.occupation || 'Professional'}</p>
              </div>
              <div>
                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.3rem;">Relationship Goals</h4>
                <p style="color: #fff; font-size: 0.95rem;">${p.relationship_goals || 'Long-term relationship'}</p>
              </div>
            </div>

            <div style="margin-bottom: 1.8rem;">
              <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 0.4rem;">Passions</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                ${(p.interests || []).map(i => `<span class="passion-tag">${i}</span>`).join('')}
              </div>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button class="btn btn-secondary" onclick="App.openSafetyReportModal(${p.id})" style="color: #ef4444;">⚠️ Report</button>
              <button class="btn btn-primary" onclick="App.quickLike(${p.id}); App.closeModalDirect();" style="flex: 1;">
                <span>Send Like ❤️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------
  // ADMIN DASHBOARD VIEW
  // --------------------------------------------------------
  async loadAdminView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        API.getAdminStats(),
        API.getAdminUsers(),
        API.getAdminReports()
      ]);

      const stats = statsRes.stats;
      const users = usersRes.users || [];
      const reports = reportsRes.reports || [];

      content.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto;">
          <div style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff;">PEACE Trust, Safety & Admin Center</h2>
            <p style="color: var(--text-secondary); margin-top: 0.3rem;">Platform monitoring, real-time analytics, user moderation, and compliance.</p>
          </div>

          <!-- Metrics -->
          <div class="admin-metrics-grid">
            <div class="metric-card">
              <span class="metric-title">Total Registered Adults</span>
              <span class="metric-value">${stats.totalUsers}</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Verified Members</span>
              <span class="metric-value">${stats.verifiedPercentage}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Mutual Matches</span>
              <span class="metric-value">${stats.totalMatches}</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Encrypted Messages</span>
              <span class="metric-value">${stats.totalMessages}</span>
            </div>
            <div class="metric-card">
              <span class="metric-title">Pending Reports</span>
              <span class="metric-value" style="color: ${stats.pendingReports > 0 ? '#ef4444' : '#10b981'};">${stats.pendingReports}</span>
            </div>
          </div>

          <!-- Moderation Queue -->
          <div style="margin-bottom: 3rem;">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">Safety & Abuse Reports (${reports.length})</h3>
            ${reports.length === 0 ? `
              <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-glass); color: var(--text-secondary);">
                No pending user reports. Community behavior is healthy.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                ${reports.map(r => `
                  <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                      <div style="color: #fff; font-weight: 700;">Report against: ${r.reported_name} (${r.reported_email})</div>
                      <div style="color: #fca5a5; font-size: 0.85rem; margin-top: 0.2rem;">Reason: ${r.reason}</div>
                      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.2rem;">Reported by: ${r.reporter_name} • ${new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                      <button class="btn btn-secondary" onclick="App.dismissAdminReport(${r.id})" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">Dismiss</button>
                      <button class="btn btn-primary" onclick="App.toggleBanAdmin(${r.reported_id})" style="background: #ef4444; font-size: 0.8rem; padding: 0.4rem 0.8rem;">Ban User</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- User Management Table -->
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 1rem;">User Directory</h3>
            <div style="overflow-x: auto;">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Country</th>
                    <th>Age</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(u => `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                          <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="Avatar">
                          <div>
                            <div style="font-weight: 700;">${u.full_name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>${u.country}</td>
                      <td>${u.age}</td>
                      <td>
                        <button class="btn btn-secondary" onclick="App.toggleVerifyAdmin(${u.id})" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">
                          ${u.is_verified === 2 ? '🛡️ Gold' : u.is_verified === 1 ? 'Bronze' : 'Unverified'}
                        </button>
                      </td>
                      <td>
                        <span style="color: ${u.is_banned ? '#ef4444' : '#10b981'}; font-weight: 600;">
                          ${u.is_banned ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td>
                        ${u.role !== 'admin' ? `
                          <button class="btn btn-secondary" onclick="App.toggleBanAdmin(${u.id})" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; color: ${u.is_banned ? '#10b981' : '#ef4444'};">
                            ${u.is_banned ? 'Unban' : 'Suspend'}
                          </button>
                        ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">Super Admin</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error: ${err.message}</div>`;
    }
  },

  async toggleVerifyAdmin(userId) {
    try {
      const res = await API.toggleUserVerify(userId);
      this.showToast(res.message);
      this.loadAdminView();
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  async toggleBanAdmin(userId) {
    try {
      const res = await API.toggleUserBan(userId);
      this.showToast(res.message);
      this.loadAdminView();
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  async dismissAdminReport(reportId) {
    try {
      await API.dismissReport(reportId);
      this.showToast('Report dismissed');
      this.loadAdminView();
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  // --------------------------------------------------------
  // SETTINGS & SAFETY
  // --------------------------------------------------------
  loadSettingsView() {
    const content = document.getElementById('dashboardTabContent');
    if (!content) return;

    content.innerHTML = `
      <div style="max-width: 680px; margin: 0 auto;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 2rem;">Account & Privacy Settings</h2>

        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem;">Privacy & Safety Preferences</h3>
          
          <div style="display: flex; flex-direction: column; gap: 1.2rem;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-weight: 600; color: #fff;">Incognito Mode</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">Only show profile to people I have liked</div>
              </div>
              <input type="checkbox" style="width: 18px; height: 18px; accent-color: var(--purple-primary);">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-weight: 600; color: #fff;">Show Online Status</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">Allow mutual matches to see when you are active</div>
              </div>
              <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--purple-primary);">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-weight: 600; color: #fff;">Read Receipts</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">Show double blue ticks when you read messages</div>
              </div>
              <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: var(--purple-primary);">
            </label>
          </div>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 2rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #ef4444; margin-bottom: 0.5rem;">Account Actions</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Sign out or switch between test demo profiles anytime.</p>
          <button class="btn btn-secondary" onclick="App.logout()" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">Sign Out of PEACE</button>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------
  // AUTH MODALS (Login, Register, Forgot Password, Demo)
  // --------------------------------------------------------
  openAuthModal(type = 'login') {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    if (type === 'login') {
      modalEl.innerHTML = `
        <div class="modal-backdrop" onclick="App.closeModal(event)">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Sign In to PEACE</h3>
              <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
            </div>
            <div class="modal-body">
              <!-- One-Click Demo Accounts Grid -->
              <div style="margin-bottom: 1.25rem;">
                <span class="form-label" style="margin-bottom: 0.5rem;">Quick One-Click Demo Switcher:</span>
                <div class="demo-accounts-grid">
                  <div class="demo-account-card" onclick="App.switchDemoAccount('elena@peace.love')">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Elena">
                    <div class="demo-account-info">
                      <span class="demo-acc-name">Elena Ramos 🇪🇸</span>
                      <span class="demo-acc-desc">Madrid • Architect</span>
                    </div>
                  </div>
                  <div class="demo-account-card" onclick="App.switchDemoAccount('kenji@peace.love')">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" alt="Kenji">
                    <div class="demo-account-info">
                      <span class="demo-acc-name">Kenji Sato 🇯🇵</span>
                      <span class="demo-acc-desc">Tokyo • Engineer</span>
                    </div>
                  </div>
                  <div class="demo-account-card" onclick="App.switchDemoAccount('amara@peace.love')">
                    <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" alt="Amara">
                    <div class="demo-account-info">
                      <span class="demo-acc-name">Amara Okafor 🇰🇪</span>
                      <span class="demo-acc-desc">Nairobi • Biologist</span>
                    </div>
                  </div>
                  <div class="demo-account-card" onclick="App.switchDemoAccount('admin@peace.love')">
                    <div style="width: 34px; height: 34px; border-radius: 50%; background: #4c1d95; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">🛡️</div>
                    <div class="demo-account-info">
                      <span class="demo-acc-name">PEACE Admin</span>
                      <span class="demo-acc-desc">Trust & Safety</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style="position: relative; text-align: center; margin: 1.5rem 0;">
                <hr style="border: none; border-top: 1px solid var(--border-glass);">
                <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #111827; padding: 0 0.8rem; font-size: 0.78rem; color: var(--text-muted);">OR SIGN IN WITH EMAIL</span>
              </div>

              <form onsubmit="App.handleLogin(event)">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" id="loginEmail" class="form-input" placeholder="you@domain.com" required value="elena@peace.love">
                </div>
                <div class="form-group">
                  <label class="form-label">Password</label>
                  <div class="input-with-icon">
                    <input type="password" id="loginPassword" class="form-input" placeholder="••••••••" required value="peace2026">
                    <span class="input-password-toggle" onclick="App.togglePasswordVisibility('loginPassword')">👁️</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; font-size: 0.85rem;">
                  <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                    <input type="checkbox" checked style="accent-color: var(--purple-primary);">
                    <span>Remember me</span>
                  </label>
                  <a href="#" onclick="App.openAuthModal('forgot'); return false;" style="color: var(--purple-light);">Forgot password?</a>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem;">Sign In</button>
              </form>

              <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="App.handleGoogleAuth()" style="width: 100%; padding: 0.75rem;">
                  <span style="font-weight: 700;">G</span>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div style="text-align: center; margin-top: 1.5rem; font-size: 0.88rem; color: var(--text-secondary);">
                Don't have an account? <a href="#" onclick="App.openAuthModal('register'); return false;" style="color: var(--pink-primary); font-weight: 600;">Create Account</a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'register') {
      modalEl.innerHTML = `
        <div class="modal-backdrop" onclick="App.closeModal(event)">
          <div class="modal-content" style="max-width: 540px;">
            <div class="modal-header">
              <h3 class="modal-title">Join PEACE (18+ Adults Only)</h3>
              <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
            </div>
            <div class="modal-body">
              <div class="age-restriction-banner">
                <span>🔞</span>
                <span>PEACE is strictly for adults aged 18 and older. Accurate date of birth is legally required.</span>
              </div>

              <form onsubmit="App.handleRegister(event)">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" id="regFullName" class="form-input" placeholder="e.g. Elena Ramos" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" id="regEmail" class="form-input" placeholder="name@domain.com" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Password</label>
                  <div class="input-with-icon">
                    <input type="password" id="regPassword" class="form-input" placeholder="Min. 8 characters" required oninput="App.evaluatePasswordStrength(this.value)">
                    <span class="input-password-toggle" onclick="App.togglePasswordVisibility('regPassword')">👁️</span>
                  </div>
                  <div class="password-meter-wrap">
                    <div class="password-meter-bar">
                      <div id="pwdMeterFill" class="password-meter-fill"></div>
                    </div>
                    <div id="pwdMeterText" class="password-meter-text">Strength: Enter password</div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Date of Birth</label>
                  <input type="date" id="regBirthdate" class="form-input" required onchange="App.checkAgeUnder18(this.value)">
                  <div id="regAgeFeedback" style="font-size: 0.78rem; margin-top: 0.3rem;"></div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select id="regGender" class="form-input" required>
                      <option value="female">Woman</option>
                      <option value="male">Man</option>
                      <option value="non-binary">Non-Binary</option>
                      <option value="other">Prefer not to say</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Country</label>
                    <select id="regCountry" class="form-input" required>
                      <option value="Spain">Spain 🇪🇸</option>
                      <option value="Japan">Japan 🇯🇵</option>
                      <option value="Kenya">Kenya 🇰🇪</option>
                      <option value="Ireland">Ireland 🇮🇪</option>
                      <option value="France">France 🇫🇷</option>
                      <option value="Brazil">Brazil 🇧🇷</option>
                      <option value="Italy">Italy 🇮🇹</option>
                      <option value="Taiwan">Taiwan 🇹🇼</option>
                      <option value="Germany">Germany 🇩🇪</option>
                      <option value="United States">United States 🇺🇸</option>
                      <option value="Canada">Canada 🇨🇦</option>
                      <option value="United Kingdom">United Kingdom 🇬🇧</option>
                      <option value="Australia">Australia 🇦🇺</option>
                    </select>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">City</label>
                    <input type="text" id="regCity" class="form-input" placeholder="e.g. Madrid" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Primary Language</label>
                    <select id="regLanguage" class="form-input">
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Italian">Italian</option>
                      <option value="German">German</option>
                      <option value="Mandarin">Mandarin</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label style="display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer;">
                    <input type="checkbox" id="regTerms" required style="margin-top: 3px; accent-color: var(--purple-primary);">
                    <span>I confirm that I am at least 18 years of age, and I agree to PEACE <a href="#" onclick="App.openInfoModal('terms'); return false;" style="color: var(--purple-light);">Terms of Service</a> and <a href="#" onclick="App.openInfoModal('privacy'); return false;" style="color: var(--purple-light);">Privacy Policy</a>.</span>
                  </label>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem; margin-top: 0.5rem;">Create My Account</button>
              </form>

              <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="App.handleGoogleAuth()" style="width: 100%; padding: 0.75rem;">
                  <span style="font-weight: 700;">G</span>
                  <span>Register with Google</span>
                </button>
              </div>

              <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-secondary);">
                Already have an account? <a href="#" onclick="App.openAuthModal('login'); return false;" style="color: var(--pink-primary); font-weight: 600;">Sign In</a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'forgot') {
      modalEl.innerHTML = `
        <div class="modal-backdrop" onclick="App.closeModal(event)">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Reset Password</h3>
              <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
            </div>
            <div class="modal-body">
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Enter your registered email address to receive a verification OTP code.</p>
              <form onsubmit="App.handleForgotPassword(event)">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" id="forgotEmail" class="form-input" placeholder="name@domain.com" required value="elena@peace.love">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem;">Send Reset Code</button>
              </form>
              <div style="text-align: center; margin-top: 1.5rem;">
                <a href="#" onclick="App.openAuthModal('login'); return false;" style="color: var(--text-secondary); font-size: 0.85rem;">Back to Sign In</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  },

  openDemoModal() {
    this.openAuthModal('login');
  },

  togglePasswordVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
      el.type = el.type === 'password' ? 'text' : 'password';
    }
  },

  evaluatePasswordStrength(pwd) {
    const fill = document.getElementById('pwdMeterFill');
    const text = document.getElementById('pwdMeterText');
    if (!fill || !text) return;

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score === 0) {
      fill.style.width = '0%';
      text.textContent = 'Strength: Too short';
    } else if (score === 1) {
      fill.style.width = '25%';
      fill.style.backgroundColor = '#ef4444';
      text.textContent = 'Strength: Weak';
      text.style.color = '#ef4444';
    } else if (score === 2) {
      fill.style.width = '50%';
      fill.style.backgroundColor = '#f59e0b';
      text.textContent = 'Strength: Fair';
      text.style.color = '#f59e0b';
    } else if (score === 3) {
      fill.style.width = '75%';
      fill.style.backgroundColor = '#8b5cf6';
      text.textContent = 'Strength: Good';
      text.style.color = '#8b5cf6';
    } else {
      fill.style.width = '100%';
      fill.style.backgroundColor = '#10b981';
      text.textContent = 'Strength: Excellent ✨';
      text.style.color = '#10b981';
    }
  },

  checkAgeUnder18(val) {
    const feedback = document.getElementById('regAgeFeedback');
    if (!feedback || !val) return;
    const birth = new Date(val);
    const diff = Date.now() - birth.getTime();
    const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);

    if (age < 18) {
      feedback.style.color = '#ef4444';
      feedback.textContent = `Age: ${age} years old. Under 18 is not permitted on PEACE.`;
    } else {
      feedback.style.color = '#10b981';
      feedback.textContent = `Age: ${age} years old (Verified 18+ eligible ✓)`;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const full_name = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const birthdate = document.getElementById('regBirthdate').value;
    const gender = document.getElementById('regGender').value;
    const country = document.getElementById('regCountry').value;
    const city = document.getElementById('regCity').value.trim();
    const preferred_language = document.getElementById('regLanguage').value;

    try {
      const res = await API.register({
        full_name,
        email,
        password,
        birthdate,
        gender,
        country,
        city,
        preferred_language
      });

      this.currentUser = res.user;
      SocketClient.connect(res.token);
      this.closeModalDirect();
      this.showToast('Account created! Welcome to PEACE 🕊️');
      this.navigate('verification');
    } catch (err) {
      this.showToast('Registration failed: ' + err.message);
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await API.login(email, password);
      this.currentUser = res.user;
      SocketClient.connect(res.token);
      this.setupSocketListeners();
      this.closeModalDirect();
      this.showToast(`Welcome back, ${res.user.full_name}! ✨`);
      this.navigate('discover');
    } catch (err) {
      this.showToast('Login failed: ' + err.message);
    }
  },

  async switchDemoAccount(email) {
    try {
      const res = await API.demoSwitch(email);
      this.currentUser = res.user;
      SocketClient.connect(res.token);
      this.setupSocketListeners();
      this.closeModalDirect();
      this.showToast(`Switched persona to ${res.user.full_name} (${res.user.country}) ✨`);
      this.navigate(res.user.role === 'admin' ? 'admin' : 'discover');
    } catch (e) {
      this.showToast('Demo switch error: ' + e.message);
    }
  },

  async handleGoogleAuth() {
    try {
      const res = await API.googleAuth({
        email: 'global.nomad@peace.love',
        full_name: 'Alex Rivera',
        country: 'Canada',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600'
      });
      this.currentUser = res.user;
      SocketClient.connect(res.token);
      this.setupSocketListeners();
      this.closeModalDirect();
      this.showToast(`Signed in with Google as ${res.user.full_name}!`);
      this.navigate('discover');
    } catch (e) {
      this.showToast('Google login error: ' + e.message);
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    try {
      const res = await API.forgotPassword(email);
      const code = prompt(`${res.message}. Enter the code to proceed:`, res.code);
      if (code) {
        const newPassword = prompt('Enter your new password (min. 8 characters):', 'peace2026');
        if (newPassword) {
          const resetRes = await API.resetPassword(email, code, newPassword);
          this.showToast(resetRes.message);
          this.openAuthModal('login');
        }
      }
    } catch (err) {
      this.showToast('Reset failed: ' + err.message);
    }
  },

  async logout() {
    await API.logout();
    SocketClient.disconnect();
    this.currentUser = null;
    this.showToast('Signed out. Have a peaceful day 🕊️');
    this.navigate('home');
  },

  // --------------------------------------------------------
  // INFO MODALS (About, Safety, Contact, Terms, Privacy)
  // --------------------------------------------------------
  openInfoModal(type) {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    let title = '';
    let bodyHtml = '';

    if (type === 'about') {
      title = 'About PEACE';
      bodyHtml = `
        <div style="line-height: 1.7; color: #e2e8f0;">
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 0.5rem;">Our Mission</h4>
          <p style="margin-bottom: 1rem;">PEACE was founded on a simple truth: <strong>Love has no borders</strong>. In an increasingly globalized world, people should be able to discover genuine companions across countries, cultures, and continents without fear of catfishing, commercial exploitation, or superficial swipe fatigue.</p>
          <h4 style="font-size: 1.2rem; color: #fff; margin-bottom: 0.5rem;">"Find Your Person. Find Your Peace."</h4>
          <p style="margin-bottom: 1rem;">Whether you seek a serious lifelong romantic partner, marriage, travel companion, or deep cross-cultural friendship, PEACE provides the luxury, safety, and HD video dating tools to nurture intentional connections.</p>
          <div style="background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: var(--radius-md); padding: 1rem; margin-top: 1.5rem;">
            <span style="font-weight: 700; color: #fff;">18+ Adult Exclusivity:</span> PEACE operates strictly for consenting adults. Underage registration is rejected by automated DOB checks and biometric identity validation.
          </div>
        </div>
      `;
    } else if (type === 'safety') {
      title = 'Safety & Dating Trust Guidelines';
      bodyHtml = `
        <div style="line-height: 1.7; color: #e2e8f0;">
          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.4rem;">1. Always Video Date Before Meeting in Person</h4>
          <p style="margin-bottom: 1rem; font-size: 0.9rem;">Use our built-in WebRTC encrypted HD audio and video calling to confirm their voice, face, and live authenticity before planning travel.</p>

          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.4rem;">2. Never Send Money or Financial Information</h4>
          <p style="margin-bottom: 1rem; font-size: 0.9rem;">No legitimate PEACE member will ever ask you for wire transfers, gift cards, crypto, or emergency financial aid. Report any such solicitation immediately.</p>

          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.4rem;">3. Zero Exact Location Exposure</h4>
          <p style="margin-bottom: 1rem; font-size: 0.9rem;">PEACE only displays your City and Country. Never share your exact street address or sensitive travel itineraries with people you have just met.</p>

          <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 0.4rem;">4. Instant Block & Report</h4>
          <p style="margin-bottom: 1rem; font-size: 0.9rem;">If anyone behaves inappropriately, violates boundaries, or seems fake, tap the shield or warning icon on their profile to immediately block them and alert our Trust & Safety team.</p>
        </div>
      `;
    } else if (type === 'contact') {
      title = 'Contact PEACE Global Support';
      bodyHtml = `
        <form onsubmit="App.handleContactSubmit(event)">
          <div class="form-group">
            <label class="form-label">Your Name</label>
            <input type="text" id="contactName" class="form-input" required value="${this.currentUser ? this.currentUser.full_name : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="contactEmail" class="form-input" required value="${this.currentUser ? this.currentUser.email : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <select class="form-input">
              <option value="general">General Inquiry</option>
              <option value="safety">Safety & Verification Question</option>
              <option value="partnership">International Partnership</option>
              <option value="press">Press & Media</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea class="form-input" rows="4" placeholder="How can our global support team assist you?" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem;">Send Message</button>
        </form>
      `;
    } else if (type === 'terms') {
      title = 'Terms of Service';
      bodyHtml = `
        <div style="max-height: 350px; overflow-y: auto; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">
          <p><strong>1. Acceptance & Age Restriction:</strong> By creating an account on PEACE, you represent and warrant that you are at least eighteen (18) years of age. Individuals under 18 are strictly prohibited from using the platform.</p>
          <p style="margin-top: 0.8rem;"><strong>2. Code of Conduct:</strong> PEACE fosters respectful, genuine international relationships. Harassment, racism, hate speech, commercial solicitation, fraud, and illicit content will result in immediate permanent account termination.</p>
          <p style="margin-top: 0.8rem;"><strong>3. Verification:</strong> While PEACE employs facial liveness analysis, users remain responsible for exercising sound judgment in all cross-border romantic interactions.</p>
        </div>
      `;
    } else if (type === 'privacy') {
      title = 'Privacy Policy';
      bodyHtml = `
        <div style="max-height: 350px; overflow-y: auto; font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">
          <p><strong>1. Information Collection:</strong> We collect only necessary details to facilitate matching: name, verified birthdate, country, city, profile pictures, and relationship preferences.</p>
          <p style="margin-top: 0.8rem;"><strong>2. Location Obfuscation:</strong> We never share exact GPS coordinates or IP tracking data with other users. Only your self-declared City and Country are visible.</p>
          <p style="margin-top: 0.8rem;"><strong>3. Encrypted Communications:</strong> Messages, voice memos, and WebRTC audio/video call signaling are protected with end-to-end transport encryption.</p>
        </div>
      `;
    }

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal(event)">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
          </div>
          <div class="modal-body">
            ${bodyHtml}
          </div>
        </div>
      </div>
    `;
  },

  handleContactSubmit(e) {
    e.preventDefault();
    this.closeModalDirect();
    this.showToast('Thank you! Your message has been sent to PEACE Support.');
  },

  openSafetyReportModal(targetId) {
    const modalEl = document.getElementById('modalContainer');
    if (!modalEl) return;

    modalEl.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal(event)">
        <div class="modal-content" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Report or Block User</h3>
            <button class="modal-close-btn" onclick="App.closeModalDirect()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Reason for Report</label>
              <select id="reportReason" class="form-input">
                <option value="Fake Profile / Catfish">Fake Profile / Catfish</option>
                <option value="Inappropriate Messages / Harassment">Inappropriate Messages / Harassment</option>
                <option value="Underage Account (Suspected < 18)">Underage Account (Suspected < 18)</option>
                <option value="Scam / Financial Solicitation">Scam / Financial Solicitation</option>
                <option value="Spam / Commercial">Spam / Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Additional Details</label>
              <textarea id="reportDetails" class="form-input" rows="3" placeholder="Please describe what happened..."></textarea>
            </div>

            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
              <button class="btn btn-secondary" onclick="App.blockUserAction(${targetId})" style="color: #ef4444;">Block User</button>
              <button class="btn btn-primary" onclick="App.submitReportAction(${targetId})" style="flex: 1;">Submit Report</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async submitReportAction(targetId) {
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportDetails').value;
    try {
      await API.reportUser(targetId, reason, details);
      this.closeModalDirect();
      this.showToast('Report submitted. Thank you for protecting the PEACE community.');
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  async blockUserAction(targetId) {
    try {
      await API.blockUser(targetId);
      this.closeModalDirect();
      this.showToast('User has been blocked.');
      this.navigate('discover');
    } catch (e) {
      this.showToast('Error: ' + e.message);
    }
  },

  closeModal(e) {
    if (e.target.classList.contains('modal-backdrop')) {
      this.closeModalDirect();
    }
  },

  closeModalDirect() {
    const modalEl = document.getElementById('modalContainer');
    if (modalEl) modalEl.innerHTML = '';
  },

  // --------------------------------------------------------
  // TOAST NOTIFICATIONS & CONFETTI CELEBRATIONS
  // --------------------------------------------------------
  showToast(message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>🕊️</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const colors = ['#7c3aed', '#ec4899', '#f43f5e', '#facc15', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vrot;
        p.opacity -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (frame < 100) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };
    animate();
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
