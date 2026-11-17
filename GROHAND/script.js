/**
 * GOHAND - Casual, Modern Farm Chemicals E-Commerce Platform
 * Product Catalog, Farmer Dosage Calculator, Cart & User Account Integration
 */

// ==========================================
// 1. Agrochemicals Catalog Data
// ==========================================
const CHEMICAL_PRODUCTS = [
  {
    id: 'weedstrike-480',
    name: 'GOHAND WeedStrike 480 SL',
    category: 'herbicides',
    categoryLabel: 'Systemic Herbicide',
    activeIngredient: 'Glyphosate 41% w/w SL',
    description: 'Knocks down stubborn perennial grasses, sedges, and broadleaf weeds down to root level in 48 hours.',
    price: 34.99,
    perAcreCost: '$7.00 / Acre',
    packSize: '1 Litre Bottle',
    badgeText: 'Weed Control',
    badgeClass: 'badge-herbicide',
    colorTheme: '#15803d',
    liquidColor: '#166534',
    crops: ['Wheat', 'Paddy', 'Corn', 'Cotton', 'Orchards'],
    dilution: '25 ml in 10L water (2.5L/Ha)',
    rainfast: '2 Hours'
  },
  {
    id: 'pestvanish-505',
    name: 'GOHAND PestVanish 505 EC',
    category: 'insecticides',
    categoryLabel: 'Broad-Spectrum Insecticide',
    activeIngredient: 'Chlorpyrifos 50% + Cypermethrin 5% EC',
    description: 'Dual-action contact and stomach poison. Eliminates stem borers, caterpillars, aphids, and bollworms quickly.',
    price: 42.50,
    perAcreCost: '$8.50 / Acre',
    packSize: '1 Litre Canister',
    badgeText: 'Pest Guard',
    badgeClass: 'badge-insecticide',
    colorTheme: '#d97706',
    liquidColor: '#b45309',
    crops: ['Cotton', 'Paddy', 'Vegetables', 'Corn', 'Fruits'],
    dilution: '30 ml in 15L knapsack tank',
    rainfast: '3 Hours'
  },
  {
    id: 'bioshield-max',
    name: 'GOHAND BioShield Max Fungicide',
    category: 'fungicides',
    categoryLabel: 'Bio-Shield & Disease Defense',
    activeIngredient: 'Trichoderma viride + Bacillus subtilis (2x10^9 CFU/g)',
    description: 'Inoculates roots and leaves against downy mildew, leaf spot, and blight while keeping honeybees safe.',
    price: 38.00,
    perAcreCost: '$7.60 / Acre',
    packSize: '1 Kg / 1L Pack',
    badgeText: 'Pollinator Safe',
    badgeClass: 'badge-fungicide',
    colorTheme: '#0284c7',
    liquidColor: '#0369a1',
    crops: ['Paddy', 'Vegetables', 'Wheat', 'Fruits', 'Tomato'],
    dilution: '20 ml in 10L water',
    rainfast: '1 Hour'
  },
  {
    id: 'nitrogrow-vitalize',
    name: 'GOHAND NitroGrow Vitalize Nano',
    category: 'fertilizers',
    categoryLabel: 'Nano-Fertilizer & Growth Surge',
    activeIngredient: 'Nano Liquid Nitrogen 4% + Chelated Zinc 1.5%',
    description: 'Absorbed through leaf stomata within 30 minutes. Promotes tillering, deep green canopy, and zero soil leaching.',
    price: 28.50,
    perAcreCost: '$5.70 / Acre',
    packSize: '500 ml Nano Bottle',
    badgeText: 'Nano Nitrogen',
    badgeClass: 'badge-fertilizer',
    colorTheme: '#7e22ce',
    liquidColor: '#6b21a8',
    crops: ['Wheat', 'Corn', 'Paddy', 'Vegetables', 'Sugarcane'],
    dilution: '4 ml per Litre of water',
    rainfast: '30 Minutes'
  },
  {
    id: 'rootrevive-gold',
    name: 'GOHAND RootRevive Gold Humic',
    category: 'soil',
    categoryLabel: 'Soil Conditioner & Root Booster',
    activeIngredient: 'Potassium Humate 85% + Seaweed Ascophyllum',
    description: 'Revives degraded, hard soils. Unlocks soil phosphates and enhances root branching and microbial activity.',
    price: 49.00,
    perAcreCost: '$9.80 / Acre',
    packSize: '5 Litres Jug',
    badgeText: 'Soil Restorer',
    badgeClass: 'badge-soil',
    colorTheme: '#9a3412',
    liquidColor: '#7c2d12',
    crops: ['All Crops', 'Orchards', 'Vegetables', 'Field Crops'],
    dilution: '5 Litres per Hectare via drip/drench',
    rainfast: 'Soil Application'
  },
  {
    id: 'bloomboom-foliar',
    name: 'GOHAND BloomBoom Foliar 0-52-34',
    category: 'fertilizers',
    categoryLabel: 'Fruiting & Flowering Spark',
    activeIngredient: 'Mono Potassium Phosphate + Boron 0.5%',
    description: 'Designed for flower initiation and fruit setting. Prevents flower drop and boosts grain weight.',
    price: 36.00,
    perAcreCost: '$7.20 / Acre',
    packSize: '2 Kg Soluble Crystals',
    badgeText: 'Flower Retention',
    badgeClass: 'badge-fertilizer',
    colorTheme: '#be185d',
    liquidColor: '#9d174d',
    crops: ['Tomato', 'Cotton', 'Fruits', 'Vegetables', 'Legumes'],
    dilution: '5g per Litre of spray water',
    rainfast: '2 Hours'
  },
  {
    id: 'droneflow-adjuvant',
    name: 'GOHAND DroneFlow Super Spreader',
    category: 'herbicides',
    categoryLabel: 'Organosilicone Adjuvant',
    activeIngredient: 'Polyether Modified Trisiloxane 100%',
    description: 'Spreads any chemical droplet into a thin film on leaves, reducing drift and cutting required spray volume.',
    price: 22.00,
    perAcreCost: '$2.20 / Acre',
    packSize: '250 ml Bottle',
    badgeText: 'Low Drift',
    badgeClass: 'badge-herbicide',
    colorTheme: '#15803d',
    liquidColor: '#166534',
    crops: ['All Crops (Drone & Knapsack Spray)'],
    dilution: '5 ml per 20 Litre spray tank',
    rainfast: '15 Minutes'
  },
  {
    id: 'snailguard-eco',
    name: 'GOHAND Snail & Slug Guard Bio',
    category: 'insecticides',
    categoryLabel: 'Molluscicide Pellets',
    activeIngredient: 'Ferric Phosphate 1% Bait Matrix',
    description: 'Weatherproof organic pellets that lure and control crop-damaging snails and slugs. Safe for earthworms.',
    price: 29.50,
    perAcreCost: '$5.90 / Acre',
    packSize: '2.5 Kg Bucket',
    badgeText: 'Rainproof Bait',
    badgeClass: 'badge-insecticide',
    colorTheme: '#d97706',
    liquidColor: '#92400e',
    crops: ['Vegetables', 'Strawberries', 'Seedling Nurseries'],
    dilution: 'Scatter 5g per sq. meter around borders',
    rainfast: '100% Rainproof'
  }
];

// ==========================================
// 2. State & User Account
// ==========================================
let cart = [];

function getLoggedInUser() {
  try {
    const raw = localStorage.getItem('gohand_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function updateAuthUI() {
  const user = getLoggedInUser();
  const authContainer = document.getElementById('header-auth-container');
  if (!authContainer) return;

  if (user && user.loggedIn) {
    authContainer.innerHTML = `
      <div class="user-profile-menu">
        <button class="user-account-btn logged-in" onclick="toggleUserDropdown(event)">
          <span>🧑‍🌾 ${user.name}</span>
          <span style="font-size: 0.7rem;">▼</span>
        </button>
        <div class="user-dropdown-panel" id="user-dropdown-panel">
          <div class="dropdown-user-header">
            <div class="dropdown-user-name">${user.name}</div>
            <div class="dropdown-user-farm">${user.farm || 'Family Farm'} • ${user.acres || 40} Acres</div>
          </div>
          <a href="#calculator" class="dropdown-item">📐 Saved Dosage Prescriptions</a>
          <a href="#store" class="dropdown-item">📦 Bulk Reorders</a>
          <a href="login.html" class="dropdown-item">⚙️ Account Settings</a>
          <a href="javascript:void(0)" onclick="handleLogout()" class="dropdown-item logout">Sign Out</a>
        </div>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="user-account-btn">
        <span>👤 Sign In / Register</span>
      </a>
    `;
  }
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const panel = document.getElementById('user-dropdown-panel');
  if (panel) panel.classList.toggle('open');
}

window.addEventListener('click', () => {
  const panel = document.getElementById('user-dropdown-panel');
  if (panel) panel.classList.remove('open');
});

function handleLogout() {
  localStorage.removeItem('gohand_user');
  updateAuthUI();
  alert('You have been signed out.');
}

// ==========================================
// 3. Render Clean Chemical Product Cards
// ==========================================
function getChemicalBottleSvg(product) {
  return `
    <svg class="chem-svg-bottle" viewBox="0 0 80 110" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${product.id}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${product.colorTheme}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${product.liquidColor}" stop-opacity="1" />
        </linearGradient>
      </defs>
      <!-- Cap -->
      <rect x="28" y="4" width="24" height="12" rx="3" fill="#475569" stroke="#334155" stroke-width="1.5"/>
      <!-- Bottle Body -->
      <path d="M30 16 L30 24 L16 38 L16 98 C16 103 20 106 26 106 L54 106 C60 106 64 103 64 98 L64 38 L50 24 L50 16 Z"
            fill="#ffffff" stroke="#94a3b8" stroke-width="1.8"/>
      <!-- Liquid -->
      <path d="M18 52 L62 52 L62 98 C62 101 58 104 54 104 L26 104 C22 104 18 101 18 98 Z"
            fill="url(#grad-${product.id})"/>
      <!-- Label -->
      <rect x="22" y="58" width="36" height="34" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <circle cx="40" cy="70" r="5" fill="${product.colorTheme}" opacity="0.3"/>
      <line x1="26" y1="81" x2="54" y2="81" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="28" y1="86" x2="52" y2="86" stroke="#94a3b8" stroke-width="1" stroke-linecap="round"/>
    </svg>
  `;
}

function renderProducts(items) {
  const container = document.getElementById('products-grid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
        <h4 style="font-size: 1.1rem; color: var(--text-main);">No chemicals found matching your search.</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Try searching for "herbicide", "foliar", or "borer".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(product => {
    return `
      <div class="chem-card" data-id="${product.id}">
        <div class="card-top-bar">
          <span class="card-badge-top ${product.badgeClass}">${product.badgeText}</span>
          <span class="card-pack-badge">${product.packSize}</span>
        </div>

        <div class="bottle-visual-box">
          ${getChemicalBottleSvg(product)}
        </div>

        <div class="card-info">
          <span class="chem-category-sub">${product.categoryLabel}</span>
          <h3 class="chem-title">${product.name}</h3>
          <span class="chem-active-ingredient">🧪 ${product.activeIngredient}</span>
          <p class="chem-description">${product.description}</p>

          <div class="crop-tags-row">
            ${product.crops.slice(0, 3).map(c => `<span class="crop-tag">${c}</span>`).join('')}
            <span class="crop-tag" style="color: var(--primary); font-weight:600;">⏱️ ${product.rainfast} Rainfast</span>
          </div>

          <div class="card-footer-pricing">
            <div class="price-box">
              <span class="price-main">$${product.price.toFixed(2)}</span>
              <span class="price-per-acre">${product.perAcreCost}</span>
            </div>
            <button class="btn-card-add" onclick="handleAddToCart('${product.id}')">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 4. Crop Doctor & Dosage Calculator
// ==========================================
const DOSAGE_DATABASE = {
  weeds: {
    title: 'Perennial & Grass Weed Outbreak',
    product: 'GOHAND WeedStrike 480 SL',
    formula: 'Glyphosate 41% w/w Systemic',
    ratePerAcre: 0.5,
    waterPerAcre: 50,
    unit: 'Liters',
    bundleProductId: 'weedstrike-480',
    extraProduct: 'droneflow-adjuvant',
    notes: 'Apply during active weed growth before flowering. Avoid spraying when wind speed is > 10 km/h.'
  },
  insects: {
    title: 'Caterpillar, Stem Borer & Aphid Guard',
    product: 'GOHAND PestVanish 505 EC',
    formula: 'Chlorpyrifos 50% + Cypermethrin 5% EC',
    ratePerAcre: 0.4,
    waterPerAcre: 60,
    unit: 'Liters',
    bundleProductId: 'pestvanish-505',
    extraProduct: 'droneflow-adjuvant',
    notes: 'Spray in early morning or late afternoon to target active borers and spare daytime pollinators.'
  },
  blight: {
    title: 'Fungal Blight, Mildew & Rust Defense',
    product: 'GOHAND BioShield Max Fungicide',
    formula: 'Trichoderma viride + Bacillus subtilis',
    ratePerAcre: 0.5,
    waterPerAcre: 60,
    unit: 'Liters / Kg',
    bundleProductId: 'bioshield-max',
    extraProduct: 'droneflow-adjuvant',
    notes: 'Safe for organic certification. Apply every 12-14 days or immediately after warm rain.'
  },
  yellowing: {
    title: 'Nitrogen & Zinc Deficiency (Yellow Leaves)',
    product: 'GOHAND NitroGrow Vitalize Nano',
    formula: 'Nano Liquid Nitrogen + Zinc Chelate',
    ratePerAcre: 0.25,
    waterPerAcre: 45,
    unit: 'Liters',
    bundleProductId: 'nitrogrow-vitalize',
    extraProduct: 'bloomboom-foliar',
    notes: 'Direct leaf absorption within 30 minutes. Noticeable dark-green foliage improvement in 48 hours.'
  },
  flowering: {
    title: 'Flower & Pod Abortion Prevention',
    product: 'GOHAND BloomBoom Foliar 0-52-34',
    formula: 'Phosphorus + Potassium + Boron',
    ratePerAcre: 0.5,
    waterPerAcre: 50,
    unit: 'Kg',
    bundleProductId: 'bloomboom-foliar',
    extraProduct: 'droneflow-adjuvant',
    notes: 'Spray at early flower opening. Improves fruit set and strengthens stalk rigidity.'
  },
  soil: {
    title: 'Hard Soil Compaction & Poor Rooting',
    product: 'GOHAND RootRevive Gold Humic',
    formula: 'Potassium Humate 85% + Organic Seaweed',
    ratePerAcre: 1.0,
    waterPerAcre: 100,
    unit: 'Liters',
    bundleProductId: 'rootrevive-gold',
    extraProduct: 'nitrogrow-vitalize',
    notes: 'Drench around base of seedlings or inject via drip irrigation system at first watering.'
  }
};

let currentCrop = 'wheat';
let currentIssue = 'weeds';
let currentAcres = 5;

function updateDosageCalculations() {
  const issueData = DOSAGE_DATABASE[currentIssue];
  if (!issueData) return;

  const totalChemicalQty = (issueData.ratePerAcre * currentAcres).toFixed(1);
  const totalWaterQty = Math.round(issueData.waterPerAcre * currentAcres);
  const knapsackTanks = Math.ceil(totalWaterQty / 15);

  const cropEl = document.getElementById('calc-selected-crop');
  const issueEl = document.getElementById('calc-issue-name');
  const nameEl = document.getElementById('calc-rec-name');
  const formulaEl = document.getElementById('calc-rec-formula');
  const chemQtyEl = document.getElementById('metric-chem-qty');
  const waterQtyEl = document.getElementById('metric-water-qty');
  const knapsackEl = document.getElementById('metric-knapsacks');
  const tipsEl = document.getElementById('calc-tips-text');

  if (cropEl) cropEl.textContent = `${currentCrop.toUpperCase()} PRESCRIPTION`;
  if (issueEl) issueEl.textContent = `Target: ${issueData.title}`;
  if (nameEl) nameEl.textContent = issueData.product;
  if (formulaEl) formulaEl.textContent = '🧪 ' + issueData.formula;
  if (chemQtyEl) chemQtyEl.textContent = `${totalChemicalQty} ${issueData.unit}`;
  if (waterQtyEl) waterQtyEl.textContent = `${totalWaterQty} Litres`;
  if (knapsackEl) knapsackEl.textContent = `${knapsackTanks} Tanks (15L)`;
  if (tipsEl) tipsEl.textContent = issueData.notes;
}

// ==========================================
// 5. Cart & Field Checkout
// ==========================================
function handleAddToCart(productId) {
  const product = CHEMICAL_PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      packSize: product.packSize
    });
  }

  updateCartUI();
  openCartDrawer();
}

function handleAddDosageBundle() {
  const issueData = DOSAGE_DATABASE[currentIssue];
  if (!issueData) return;

  handleAddToCart(issueData.bundleProductId);
  if (issueData.extraProduct) {
    handleAddToCart(issueData.extraProduct);
  }
}

function updateCartUI() {
  const countBubble = document.querySelector('.cart-count-bubble');
  const cartBody = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const grandTotalEl = document.getElementById('cart-grandtotal');

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (countBubble) countBubble.textContent = totalItems;

  if (!cartBody) return;

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty-message">
        <p style="font-weight: 600; color: var(--text-main);">Your cart is empty.</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Browse the catalog or calculate custom farm dosage above.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '$0.00';
    if (grandTotalEl) grandTotalEl.textContent = '$0.00';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery = subtotal > 150 ? 0 : 12.00;
  const grandTotal = subtotal + delivery;

  cartBody.innerHTML = cart.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)} (${item.packSize})</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">-</button>
        <span class="qty-number">${item.quantity}</span>
        <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  const delEl = document.getElementById('cart-delivery');
  if (delEl) delEl.textContent = delivery === 0 ? 'FREE' : `$${delivery.toFixed(2)}`;
  if (grandTotalEl) grandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
}

function changeQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }
  updateCartUI();
}

function openCartDrawer() {
  const backdrop = document.getElementById('modal-backdrop');
  const drawer = document.getElementById('cart-drawer');
  if (backdrop) backdrop.classList.add('open');
  if (drawer) drawer.classList.add('open');
}

function closeModals() {
  const backdrop = document.getElementById('modal-backdrop');
  const drawer = document.getElementById('cart-drawer');
  const chk = document.getElementById('checkout-modal');
  if (backdrop) backdrop.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
  if (chk) chk.classList.remove('open');
}

function openCheckout() {
  if (cart.length === 0) {
    alert('Please add chemicals to your cart before checking out.');
    return;
  }
  const drawer = document.getElementById('cart-drawer');
  const chk = document.getElementById('checkout-modal');
  if (drawer) drawer.classList.remove('open');
  if (chk) chk.classList.add('open');

  // Pre-fill user data if logged in
  const user = getLoggedInUser();
  if (user) {
    const nameField = document.getElementById('chk-farmer-name');
    const locField = document.getElementById('chk-farm-location');
    if (nameField && user.name) nameField.value = `${user.name} (${user.farm || ''})`;
    if (locField && !locField.value) locField.value = `${user.farm || 'Main Field'}, Gate 1`;
  }
}

function submitCheckout(e) {
  e.preventDefault();
  const farmerName = document.getElementById('chk-farmer-name').value || 'Valued Farmer';
  const farmLocation = document.getElementById('chk-farm-location').value || 'Main Farm';

  alert(`Order Confirmed!\n\nThank you ${farmerName}.\nYour agrochemical consignment is being prepared for dispatch to ${farmLocation}.\nTracking: #GH-${Math.floor(100000 + Math.random() * 900000)}`);

  cart = [];
  updateCartUI();
  closeModals();
}

// ==========================================
// 6. Dynamic Background Media (Video + Frame Sequencer Fallback)
// ==========================================
function initBackgroundMedia() {
  const bgVideo = document.getElementById('site-bg-video');
  const bgCanvas = document.getElementById('site-bg-canvas');
  if (!bgCanvas) return;

  const ctx = bgCanvas.getContext('2d');
  let fallbackTriggered = false;

  function triggerCanvasFallback() {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    startFrameSequencer(bgVideo, bgCanvas, ctx);
  }

  if (bgVideo) {
    const playPromise = bgVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        triggerCanvasFallback();
      });
    }

    setTimeout(() => {
      if (bgVideo.paused || bgVideo.currentTime === 0) {
        triggerCanvasFallback();
      }
    }, 1500);

    bgVideo.addEventListener('error', triggerCanvasFallback);
  } else {
    triggerCanvasFallback();
  }
}

function startFrameSequencer(bgVideo, bgCanvas, ctx) {
  if (bgVideo) bgVideo.style.display = 'none';
  bgCanvas.style.display = 'block';

  function resizeCanvas() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const totalFrames = 222;
  let currentFrame = 1;
  const frames = [];

  for (let i = 1; i <= Math.min(25, totalFrames); i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    img.src = `assets/bg-frames/ezgif-frame-${frameNum}.jpg`;
    frames[i] = img;
  }

  let lastTime = 0;
  const fpsInterval = 1000 / 24;

  function animate(now) {
    requestAnimationFrame(animate);
    const elapsed = now - lastTime;
    if (elapsed > fpsInterval) {
      lastTime = now - (elapsed % fpsInterval);

      const frameNum = String(currentFrame).padStart(3, '0');
      let img = frames[currentFrame];
      if (!img) {
        img = new Image();
        img.src = `assets/bg-frames/ezgif-frame-${frameNum}.jpg`;
        frames[currentFrame] = img;
      }

      if (img.complete && img.naturalWidth > 0) {
        const hRatio = bgCanvas.width / img.width;
        const vRatio = bgCanvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (bgCanvas.width - img.width * ratio) / 2;
        const centerShiftY = (bgCanvas.height - img.height * ratio) / 2;
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      }

      currentFrame++;
      if (currentFrame > totalFrames) currentFrame = 1;
    }
  }
  requestAnimationFrame(animate);
}

// ==========================================
// 7. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize dynamic background video / frame sequence
  initBackgroundMedia();

  // Update header Auth UI (Sign in button or user profile)
  updateAuthUI();

  // Render product catalog
  renderProducts(CHEMICAL_PRODUCTS);

  // Filter tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.dataset.filter;
      if (filterVal === 'all') {
        renderProducts(CHEMICAL_PRODUCTS);
      } else {
        const filtered = CHEMICAL_PRODUCTS.filter(p => p.category === filterVal);
        renderProducts(filtered);
      }
    });
  });

  // Search input
  const searchInput = document.getElementById('chemical-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      const matched = CHEMICAL_PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.activeIngredient.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.crops.some(c => c.toLowerCase().includes(q))
      );
      renderProducts(matched);
    });
  }

  // Crop Doctor buttons
  const cropBtns = document.querySelectorAll('.crop-option-btn');
  cropBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      cropBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentCrop = btn.dataset.crop;
      updateDosageCalculations();
    });
  });

  const issueBtns = document.querySelectorAll('.issue-option-btn');
  issueBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      issueBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentIssue = btn.dataset.issue;
      updateDosageCalculations();
    });
  });

  // Acreage slider
  const acreSlider = document.getElementById('acreage-slider');
  const acreDisplay = document.getElementById('acreage-val-display');
  if (acreSlider) {
    acreSlider.addEventListener('input', e => {
      currentAcres = parseFloat(e.target.value);
      if (acreDisplay) acreDisplay.textContent = `${currentAcres} Acres`;
      updateDosageCalculations();
    });
  }

  // Initial calculation and cart render
  updateDosageCalculations();
  updateCartUI();

  // Escape key to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModals();
  });
});
