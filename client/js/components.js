// PEACE UI Components, Templates & Renderers
const Components = {
  // SVG PEACE Logo
  renderLogo(size = 38) {
    return `
      <svg class="logo-icon-svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="peaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="50%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#f43f5e" />
          </linearGradient>
          <filter id="peaceGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <!-- Interlocking Heart & Dove Origami Wings -->
        <path d="M50 82 C22 62 10 44 10 28 C10 16 19 8 31 8 C40 8 47 13 50 20 C53 13 60 8 69 8 C81 8 90 16 90 28 C90 44 78 62 50 82 Z" 
              fill="url(#peaceGrad)" filter="url(#peaceGlow)" opacity="0.95" />
        <path d="M50 26 L50 78 M32 40 L68 40 M36 58 L64 58" 
              stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.9" />
        <circle cx="50" cy="20" r="4.5" fill="#ffffff" />
      </svg>
    `;
  },

  // Navigation Bar
  renderNavbar(currentUser, activeTab = 'home', unreadCount = 0) {
    const isLoggedIn = !!currentUser;
    const isAdmin = currentUser && currentUser.role === 'admin';

    return `
      <nav class="navbar">
        <div class="nav-brand" onclick="App.navigate('home')">
          ${this.renderLogo(38)}
          <div class="brand-text-wrap">
            <span class="brand-name">PEACE</span>
            <span class="brand-slogan">Find Your Person. Find Your Peace.</span>
          </div>
        </div>

        <ul class="nav-links">
          <li><button class="nav-link-btn ${activeTab === 'home' ? 'active' : ''}" onclick="App.navigate('home')">Home</button></li>
          <li><button class="nav-link-btn ${activeTab === 'discover' ? 'active' : ''}" onclick="App.navigate('discover')">Discover</button></li>
          <li><button class="nav-link-btn" onclick="App.openInfoModal('about')">About</button></li>
          <li><button class="nav-link-btn" onclick="App.openInfoModal('safety')">Safety</button></li>
          <li><button class="nav-link-btn" onclick="App.openInfoModal('contact')">Contact</button></li>
          ${isAdmin ? `<li><button class="nav-link-btn ${activeTab === 'admin' ? 'active' : ''}" onclick="App.navigate('admin')">🛡️ Admin</button></li>` : ''}
        </ul>

        <div class="nav-actions">
          <!-- Quick Demo Switcher -->
          <div class="demo-badge-select" onclick="App.openDemoModal()" title="Switch demo personas for testing">
            <span>🎭 Demo Personas</span>
          </div>

          ${isLoggedIn ? `
            <!-- Notifications Bell -->
            <button class="btn-icon" onclick="App.navigate('notifications')" title="Notifications">
              <span>🔔</span>
              ${unreadCount > 0 ? `<span class="badge-count">${unreadCount}</span>` : ''}
            </button>

            <!-- User Avatar & Dropdown -->
            <div class="nav-user-profile" onclick="App.navigate('profile')">
              <img src="${currentUser.avatar_url || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="user-avatar-sm" alt="Avatar">
              <span class="user-nav-name">${currentUser.full_name ? currentUser.full_name.split(' ')[0] : 'My Profile'}</span>
              ${currentUser.is_verified === 2 ? '<span title="Gold PEACE Verified">🛡️</span>' : ''}
            </div>

            <button class="btn btn-secondary" onclick="App.logout()" style="padding: 0.45rem 1rem; font-size: 0.85rem;">Sign Out</button>
          ` : `
            <button class="btn btn-secondary" onclick="App.openAuthModal('login')">Sign In</button>
            <button class="btn btn-primary" onclick="App.openAuthModal('register')">Create Account</button>
          `}
        </div>
      </nav>
    `;
  },

  // Landing Page Hero
  renderHero() {
    return `
      <section class="hero-section">
        <div class="hero-floating-avatars">
          <div class="floating-pill fp-1">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" alt="Elena">
            <div class="floating-pill-info">
              <span class="floating-pill-name">Elena, 28 🇪🇸</span>
              <span class="floating-pill-meta">Madrid • Architect</span>
            </div>
          </div>
          <div class="floating-pill fp-2">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" alt="Kenji">
            <div class="floating-pill-info">
              <span class="floating-pill-name">Kenji, 31 🇯🇵</span>
              <span class="floating-pill-meta">Tokyo • Photographer</span>
            </div>
          </div>
          <div class="floating-pill fp-3">
            <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150" alt="Amara">
            <div class="floating-pill-info">
              <span class="floating-pill-name">Amara, 29 🇰🇪</span>
              <span class="floating-pill-meta">Nairobi • Biologist</span>
            </div>
          </div>
          <div class="floating-pill fp-4">
            <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150" alt="Liam">
            <div class="floating-pill-info">
              <span class="floating-pill-name">Liam, 32 🇮🇪</span>
              <span class="floating-pill-meta">Dublin • Musician</span>
            </div>
          </div>
        </div>

        <div class="hero-content">
          <div class="hero-pill-badge">
            <span>🕊️ International Adult Dating Platform (18+)</span>
          </div>

          <h1 class="hero-title">Love Has No Borders.</h1>
          <p class="hero-subtitle">
            Meet genuine people from around the world and discover meaningful connections.
            Experience safe, video-verified international dating designed for lasting peace.
          </p>

          <div class="hero-actions">
            <button class="btn btn-primary btn-hero" onclick="App.openAuthModal('register')">
              <span>Get Started Free</span>
              <span>✨</span>
            </button>
            <button class="btn btn-secondary btn-hero" onclick="App.navigate('discover')">
              <span>Explore Global Profiles</span>
              <span>🌍</span>
            </button>
          </div>

          <!-- Hero Search Bar -->
          <div class="hero-match-bar">
            <div class="match-bar-item">
              <span class="match-bar-label">I Am A</span>
              <select id="heroSearchGender" class="match-bar-select">
                <option value="male">Man</option>
                <option value="female" selected>Woman</option>
                <option value="non-binary">Non-Binary</option>
              </select>
            </div>
            <div class="match-bar-item">
              <span class="match-bar-label">Seeking</span>
              <select id="heroSearchSeeking" class="match-bar-select">
                <option value="male" selected>Man</option>
                <option value="female">Woman</option>
                <option value="all">Everyone</option>
              </select>
            </div>
            <div class="match-bar-item">
              <span class="match-bar-label">In Country</span>
              <select id="heroSearchCountry" class="match-bar-select">
                <option value="All" selected>Anywhere in the World 🌐</option>
                <option value="Spain">Spain 🇪🇸</option>
                <option value="Japan">Japan 🇯🇵</option>
                <option value="Kenya">Kenya 🇰🇪</option>
                <option value="Ireland">Ireland 🇮🇪</option>
                <option value="France">France 🇫🇷</option>
                <option value="Brazil">Brazil 🇧🇷</option>
                <option value="Italy">Italy 🇮🇹</option>
                <option value="Taiwan">Taiwan 🇹🇼</option>
              </select>
            </div>
            <div class="match-bar-item" style="justify-content: flex-end;">
              <button class="btn btn-primary" style="height: 42px;" onclick="App.handleHeroSearch()">
                <span>Search</span>
                <span>🔍</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  // How It Works
  renderHowItWorks() {
    return `
      <section class="section">
        <div class="section-header">
          <div class="section-tag">Simple & Safe</div>
          <h2 class="section-title">How PEACE Works</h2>
          <p class="section-desc">Connecting with high-caliber singles across cultures in three transparent steps.</p>
        </div>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">01</div>
            <h3>Verified Registration (18+)</h3>
            <p>Create your personal profile, complete mandatory adult age verification, and confirm authenticity with anti-catfish selfie verification.</p>
          </div>
          <div class="step-card">
            <div class="step-number">02</div>
            <h3>Discover Globally</h3>
            <p>Explore verified members across 140+ countries. Filter by spoken languages, cultural values, lifestyle, and life ambitions.</p>
          </div>
          <div class="step-card">
            <div class="step-number">03</div>
            <h3>Real-Time HD Connection</h3>
            <p>Chat with instant translation, send voice notes, and meet face-to-face via encrypted WebRTC audio and video dates before meeting in person.</p>
          </div>
        </div>
      </section>
    `;
  },

  // Featured Profiles Carousel
  renderFeatured(profiles = []) {
    return `
      <section class="section" style="background: rgba(17, 24, 39, 0.4); border-radius: var(--radius-xl); border: 1px solid var(--border-glass);">
        <div class="section-header">
          <div class="section-tag">Global Community</div>
          <h2 class="section-title">Featured International Profiles</h2>
          <p class="section-desc">Real, verified adults seeking genuine cross-border relationships.</p>
        </div>

        <div class="featured-profiles-grid">
          ${profiles.slice(0, 4).map(p => `
            <div class="profile-card-mini" onclick="App.showPublicProfile(${p.id})">
              <div class="profile-card-image-wrap">
                <img src="${p.avatar || p.avatar_url}" class="profile-card-image" alt="${p.name || p.full_name}">
                <div class="profile-card-overlay">
                  ${p.is_verified === 2 ? '<div class="badge-verified-gold">🛡️ PEACE Gold Verified</div>' : ''}
                  <div class="profile-mini-name">
                    <span>${p.name || p.full_name}, ${p.age}</span>
                  </div>
                  <div class="profile-mini-location">
                    <span>📍 ${p.city}, ${p.country}</span>
                  </div>
                  <div class="profile-mini-passions">
                    ${(p.interests || []).slice(0, 3).map(tag => `<span class="passion-tag">${tag}</span>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center; margin-top: 2.5rem;">
          <button class="btn btn-secondary" onclick="App.navigate('discover')">Browse All Profiles (140+ Countries) →</button>
        </div>
      </section>
    `;
  },

  // Why Choose PEACE
  renderWhyChoose() {
    return `
      <section class="section">
        <div class="section-header">
          <div class="section-tag">Trust & Elegance</div>
          <h2 class="section-title">Why Choose PEACE?</h2>
          <p class="section-desc">Designed from the ground up for intentional singles seeking genuine romance, not endless superficial swiping.</p>
        </div>

        <div class="features-grid">
          <div class="feature-box">
            <div class="feature-icon-wrap">🛡️</div>
            <h3>100% Anti-Catfish Verification</h3>
            <p>Our multi-tier selfie liveness check and optional ID validation ensure the person you speak with is genuinely who they claim to be.</p>
          </div>
          <div class="feature-box">
            <div class="feature-icon-wrap">📹</div>
            <h3>WebRTC HD Audio & Video Dates</h3>
            <p>Hear their accent and feel their presence with crystal clear, low-latency encrypted calls right inside your browser before booking flights.</p>
          </div>
          <div class="feature-box">
            <div class="feature-icon-wrap">🔒</div>
            <h3>Zero Exact GPS Exposure</h3>
            <p>Your privacy and safety are paramount. We display only City and Country to protect your exact home or workplace location.</p>
          </div>
          <div class="feature-box">
            <div class="feature-icon-wrap">🌍</div>
            <h3>Deep Cultural Harmony</h3>
            <p>Filter by native languages, relationship timeline (marriage, long-term, travel partner), and shared lifestyle values.</p>
          </div>
        </div>
      </section>
    `;
  },

  // Testimonials
  renderTestimonials() {
    return `
      <section class="section">
        <div class="section-header">
          <div class="section-tag">Success Stories</div>
          <h2 class="section-title">Love Found Across Oceans</h2>
          <p class="section-desc">Real couples who met on PEACE and built lives together.</p>
        </div>

        <div class="testimonials-grid">
          <div class="story-card">
            <p class="story-quote">"Kenji was in Tokyo and I was in Madrid. We spent our first three months doing video dates on PEACE cooking the same recipes together. Last spring, he moved to Spain and we got engaged!"</p>
            <div class="story-couple">
              <div class="story-couple-avatars">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Elena">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" alt="Kenji">
              </div>
              <div class="story-couple-info">
                <h4>Elena & Kenji</h4>
                <p>Madrid 🇪🇸 & Tokyo 🇯🇵 • Engaged</p>
              </div>
            </div>
          </div>

          <div class="story-card">
            <p class="story-quote">"As a wildlife biologist in Kenya, finding someone who understood my wanderlust felt impossible until I matched with Liam from Dublin. The video calls felt so natural and safe."</p>
            <div class="story-couple">
              <div class="story-couple-avatars">
                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" alt="Amara">
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" alt="Liam">
              </div>
              <div class="story-couple-info">
                <h4>Amara & Liam</h4>
                <p>Nairobi 🇰🇪 & Dublin 🇮🇪 • Together 2 years</p>
              </div>
            </div>
          </div>

          <div class="story-card">
            <p class="story-quote">"The selfie verification gave me total peace of mind. No creepy bots or fake profiles. I met Chloé from Paris, and our cultural conversations turned into the greatest love of my life."</p>
            <div class="story-couple">
              <div class="story-couple-avatars">
                <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100" alt="Mateo">
                <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100" alt="Chloe">
              </div>
              <div class="story-couple-info">
                <h4>Mateo & Chloé</h4>
                <p>Rio de Janeiro 🇧🇷 & Paris 🇫🇷 • Married</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  // Footer
  renderFooter() {
    return `
      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="nav-brand" style="margin-bottom: 0.5rem;">
              ${this.renderLogo(32)}
              <span class="brand-name" style="font-size: 1.4rem;">PEACE</span>
            </div>
            <p>An international social and dating connection platform for adults aged 18 and above. Discover people, communicate safely, and find lasting peace.</p>
            <div style="font-size: 0.8rem; color: #ef4444; font-weight: 600;">🔞 18+ Adults Only Platform</div>
          </div>

          <div class="footer-links-col">
            <h4>Explore</h4>
            <ul>
              <li><a href="#" onclick="App.navigate('discover'); return false;">Discover Members</a></li>
              <li><a href="#" onclick="App.openInfoModal('about'); return false;">About PEACE</a></li>
              <li><a href="#" onclick="App.navigate('home'); return false;">Success Stories</a></li>
              <li><a href="#" onclick="App.openDemoModal(); return false;">Demo Personas</a></li>
            </ul>
          </div>

          <div class="footer-links-col">
            <h4>Safety & Legal</h4>
            <ul>
              <li><a href="#" onclick="App.openInfoModal('safety'); return false;">Safety Guidelines</a></li>
              <li><a href="#" onclick="App.openInfoModal('terms'); return false;">Terms of Service</a></li>
              <li><a href="#" onclick="App.openInfoModal('privacy'); return false;">Privacy Policy</a></li>
              <li><a href="#" onclick="App.openInfoModal('verification'); return false;">Verification Center</a></li>
            </ul>
          </div>

          <div class="footer-links-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#" onclick="App.openInfoModal('contact'); return false;">Contact Support</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noopener">X / Twitter</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} PEACE International Dating Inc. All rights reserved.</span>
          <span>"Find Your Person. Find Your Peace."</span>
        </div>
      </footer>
    `;
  },

  // Sidebar Dashboard Layout
  renderDashboard(currentUser, activeTab = 'discover', contentHtml = '', unreadNotifications = 0, unreadMessages = 0) {
    const isAdmin = currentUser.role === 'admin';

    return `
      <div class="dashboard-layout">
        <aside class="sidebar-nav">
          <button class="sidebar-tab-btn ${activeTab === 'discover' ? 'active' : ''}" onclick="App.navigate('discover')">
            <span>🌍</span>
            <span>Discover</span>
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'matches' ? 'active' : ''}" onclick="App.navigate('matches')">
            <span>❤️</span>
            <span>Matches</span>
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'messages' ? 'active' : ''}" onclick="App.navigate('messages')">
            <span>💬</span>
            <span>Messages</span>
            ${unreadMessages > 0 ? `<span class="sidebar-tab-badge">${unreadMessages}</span>` : ''}
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'calls' ? 'active' : ''}" onclick="App.navigate('calls')">
            <span>📹</span>
            <span>Calls</span>
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'verification' ? 'active' : ''}" onclick="App.navigate('verification')">
            <span>🛡️</span>
            <span>Verification</span>
            ${currentUser.is_verified < 2 ? '<span style="margin-left:auto; font-size: 0.72rem; color: #f59e0b;">Action</span>' : '<span style="margin-left:auto; font-size: 0.72rem; color: #10b981;">Gold ✓</span>'}
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'notifications' ? 'active' : ''}" onclick="App.navigate('notifications')">
            <span>🔔</span>
            <span>Notifications</span>
            ${unreadNotifications > 0 ? `<span class="sidebar-tab-badge">${unreadNotifications}</span>` : ''}
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}" onclick="App.navigate('profile')">
            <span>👤</span>
            <span>My Profile</span>
          </button>
          <button class="sidebar-tab-btn ${activeTab === 'settings' ? 'active' : ''}" onclick="App.navigate('settings')">
            <span>⚙️</span>
            <span>Settings</span>
          </button>

          ${isAdmin ? `
            <div style="margin-top: 1rem; border-top: 1px solid var(--border-glass); padding-top: 0.8rem;">
              <button class="sidebar-tab-btn ${activeTab === 'admin' ? 'active' : ''}" onclick="App.navigate('admin')">
                <span>🛡️</span>
                <span>Admin Panel</span>
              </button>
            </div>
          ` : ''}
        </aside>

        <main class="dashboard-main-content">
          ${contentHtml}
        </main>
      </div>
    `;
  }
};
