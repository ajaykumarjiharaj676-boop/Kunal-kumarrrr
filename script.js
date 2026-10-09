/**
 * AffiliateMart - Customer Website Core Script
 * Vanilla JavaScript (ES Module) for rendering deals, search, filters,
 * pagination, wishlist, modals, and rate-limited safe affiliate redirection.
 */

import {
  getStoredProducts,
  getStoredSettings,
  getWishlist,
  toggleWishlist,
  calculateDiscount,
  formatCurrency,
  trackAndOpenAffiliate,
  initFirestoreProductsListener
} from './shared.js';

// Application State
const state = {
  products: [],
  settings: {},
  wishlist: [],
  activeCategory: 'All',
  activePlatform: 'All',
  searchQuery: '',
  sortBy: 'featured',
  currentPage: 1,
  pageSize: 8,
  activeModal: null,
};

// Fallback image in case an external image fails to load
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

// DOM Elements
const elements = {
  announcementBar: document.getElementById('announcement-bar'),
  announcementText: document.getElementById('announcement-text'),
  brandNameDisplay: document.getElementById('brand-name-display'),
  heroBannerSection: document.getElementById('hero-banner-section'),
  heroBannerElement: document.getElementById('hero-banner-element'),
  heroCampaignTag: document.getElementById('hero-campaign-tag'),
  heroFestivalName: document.getElementById('hero-festival-name'),
  heroStoreTitle: document.getElementById('hero-store-title'),
  heroStoreSubtitle: document.getElementById('hero-store-subtitle'),
  heroOfferCallout: document.getElementById('hero-offer-callout'),
  heroDiscountOfferText: document.getElementById('hero-discount-offer-text'),
  footerBrandTitle: document.getElementById('footer-brand-title'),
  footerBrandDesc: document.getElementById('footer-brand-desc'),
  footerCopyBrand: document.getElementById('footer-copy-brand'),
  currentYear: document.getElementById('current-year'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  categoryPills: document.getElementById('category-pills-container'),
  platformFilters: document.getElementById('platform-filters-container'),
  sortSelect: document.getElementById('sort-select'),
  resultsCount: document.getElementById('results-count'),
  activeFiltersBar: document.getElementById('active-filters-bar'),
  activeFilterLabel: document.getElementById('active-filter-label'),
  clearAllFiltersBtn: document.getElementById('clear-all-filters-btn'),
  featuredSection: document.getElementById('featured-section'),
  featuredGrid: document.getElementById('featured-products-grid'),
  mainGrid: document.getElementById('main-products-grid'),
  paginationContainer: document.getElementById('customer-pagination'),
  emptyStateBox: document.getElementById('empty-state-box'),
  emptyStateMsg: document.getElementById('empty-state-message'),
  resetFilterAction: document.getElementById('reset-filter-action'),
  wishlistToggleBtn: document.getElementById('wishlist-toggle-btn'),
  wishlistBadge: document.getElementById('wishlist-badge'),
  bnavWishlistBadge: document.getElementById('bnav-wishlist-badge'),
  bnavWishlistBtn: document.getElementById('bnav-wishlist'),
  quickviewModal: document.getElementById('quickview-modal'),
  quickviewContent: document.getElementById('quickview-modal-content'),
  quickviewCloseBtn: document.getElementById('quickview-close-btn'),
  wishlistModal: document.getElementById('wishlist-modal'),
  wishlistItemsContainer: document.getElementById('wishlist-items-container'),
  wishlistCloseBtn: document.getElementById('wishlist-close-btn'),
  infoModal: document.getElementById('info-modal'),
  infoModalTitle: document.getElementById('info-modal-title'),
  infoModalContent: document.getElementById('info-modal-content'),
  infoModalCloseBtn: document.getElementById('info-modal-close-btn'),
  openFullDisclosureBtn: document.getElementById('open-full-disclosure-btn'),
  toastContainer: document.getElementById('toast-container'),

  // PWA & Install UI elements
  headerPwaInstallBtn: document.getElementById('header-pwa-install-btn'),
  bnavInstall: document.getElementById('bnav-install'),
  pwaInstallBanner: document.getElementById('pwa-install-banner'),
  pwaBannerCloseBtn: document.getElementById('pwa-banner-close-btn'),
  pwaInstallActionBtn: document.getElementById('pwa-install-action-btn'),
  pwaDismissBtn: document.getElementById('pwa-dismiss-btn'),
  pwaIosModal: document.getElementById('pwa-ios-modal'),
  pwaIosCloseBtn: document.getElementById('pwa-ios-close-btn'),
  pwaIosUnderstoodBtn: document.getElementById('pwa-ios-understood-btn'),
  offlineToast: document.getElementById('offline-toast'),
};

/**
 * Initialize Application
 */
function initApp() {
  if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
  }

  reloadAppData();
  setupEventListeners();
  applySettingsToUI();
  renderAll();
  setupPWAIntegration();

  // Connect to live Firebase Firestore real-time updates
  initFirestoreProductsListener((liveProducts) => {
    state.products = liveProducts.filter(p => !p.isArchived);
    renderAll();
  });
}

/**
 * Reload fresh data from storage
 */
function reloadAppData() {
  state.products = getStoredProducts(false); // only unarchived
  state.settings = getStoredSettings();
  state.wishlist = getWishlist();
  state.pageSize = state.settings.itemsPerPageCustomer || 8;
  updateWishlistBadges();
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search Input with Debounce
  let searchTimeout = null;
  elements.searchInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (elements.searchClear) {
      elements.searchClear.style.display = val ? 'block' : 'none';
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val.toLowerCase();
      state.currentPage = 1;
      renderAll();
    }, 200);
  });

  // Clear Search Button
  elements.searchClear?.addEventListener('click', () => {
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.searchClear) elements.searchClear.style.display = 'none';
    state.searchQuery = '';
    state.currentPage = 1;
    renderAll();
    elements.searchInput?.focus();
  });

  // Category Pills
  elements.categoryPills?.addEventListener('click', (e) => {
    const target = e.target.closest('.category-chip');
    if (!target) return;
    const cat = target.dataset.category;
    if (!cat) return;

    elements.categoryPills.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
    target.classList.add('active');

    state.activeCategory = cat;
    state.currentPage = 1;
    renderAll();
  });

  // Platform Filter Buttons
  elements.platformFilters?.addEventListener('click', (e) => {
    const target = e.target.closest('.filter-btn');
    if (!target) return;
    const plat = target.dataset.platform;
    if (!plat) return;

    elements.platformFilters.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
    target.classList.add('active');

    state.activePlatform = plat;
    state.currentPage = 1;
    renderAll();
  });

  // Sort Dropdown
  elements.sortSelect?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.currentPage = 1;
    renderAll();
  });

  // Clear All Filters
  elements.clearAllFiltersBtn?.addEventListener('click', resetFilters);
  elements.resetFilterAction?.addEventListener('click', resetFilters);

  // Footer Category links
  document.querySelectorAll('.footer-cat-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.dataset.cat;
      if (cat) {
        state.activeCategory = cat;
        state.currentPage = 1;
        elements.categoryPills?.querySelectorAll('.category-chip').forEach(el => {
          if (el.dataset.category === cat) el.classList.add('active');
          else el.classList.remove('active');
        });
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Wishlist Modal open/close
  elements.wishlistToggleBtn?.addEventListener('click', openWishlistModal);
  elements.bnavWishlistBtn?.addEventListener('click', openWishlistModal);
  elements.wishlistCloseBtn?.addEventListener('click', () => closeModal(elements.wishlistModal));

  // Quick View Modal close
  elements.quickviewCloseBtn?.addEventListener('click', () => closeModal(elements.quickviewModal));

  // Info Modal close & open handlers
  elements.infoModalCloseBtn?.addEventListener('click', () => closeModal(elements.infoModal));
  elements.openFullDisclosureBtn?.addEventListener('click', () => openInfoModal('disclosure'));

  document.querySelectorAll('.footer-info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.modal;
      if (type) openInfoModal(type);
    });
  });

  // Close modals on overlay backdrop click
  [elements.quickviewModal, elements.wishlistModal, elements.infoModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Escape key to close active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeModal) {
      closeModal(state.activeModal);
    }
  });

  // Real-time synchronization
  window.addEventListener('storage', () => {
    reloadAppData();
    applySettingsToUI();
    renderAll();
  });

  window.addEventListener('affiliate_mart_products_updated', () => {
    reloadAppData();
    renderAll();
  });

  window.addEventListener('affiliate_mart_settings_updated', () => {
    reloadAppData();
    applySettingsToUI();
    renderAll();
  });

  window.addEventListener('affiliate_mart_wishlist_updated', () => {
    state.wishlist = getWishlist();
    updateWishlistBadges();
  });
}

/**
 * Apply customizable site settings to UI
 */
function applySettingsToUI() {
  const settings = state.settings;

  // Announcement Bar
  if (elements.announcementBar) {
    if (settings.isAnnouncementEnabled && settings.announcementText) {
      elements.announcementBar.style.display = 'flex';
      if (elements.announcementText) elements.announcementText.textContent = settings.announcementText;
    } else {
      elements.announcementBar.style.display = 'none';
    }
  }

  // Store Brand Name
  const storeName = settings.storeName || 'AffiliateMart';
  if (elements.brandNameDisplay) {
    elements.brandNameDisplay.innerHTML = `${storeName.slice(0, -4)}<span class="accent">${storeName.slice(-4)}</span>`;
  }
  if (elements.footerBrandTitle) elements.footerBrandTitle.textContent = storeName;
  if (elements.footerCopyBrand) elements.footerCopyBrand.textContent = storeName;
  if (document.title && !document.title.startsWith(storeName)) {
    document.title = `${storeName} - Multi-Affiliate Shopping Portal`;
  }

  // Store Tagline & Banner Subtitle
  if (elements.heroStoreSubtitle) {
    elements.heroStoreSubtitle.textContent = settings.bannerSubtitle || settings.storeTagline || 'Compare trending deals on Amazon, Flipkart, Meesho, and Myntra in one single place.';
  }

  // Hero Promotional Banner Visibility & Content
  if (elements.heroBannerSection) {
    if (settings.isBannerEnabled === false) {
      elements.heroBannerSection.style.display = 'none';
    } else {
      elements.heroBannerSection.style.display = 'block';

      // Banner Heading
      if (elements.heroStoreTitle) {
        elements.heroStoreTitle.textContent = settings.bannerTitle || 'Discover Top Deals Across India\'s Best Platforms';
      }

      // Festival / Campaign Name
      if (elements.heroFestivalName) {
        elements.heroFestivalName.textContent = settings.festivalName || 'महा सेल (Maha Sale)';
      }

      // Special Discount Offer Callout Box
      if (elements.heroOfferCallout) {
        if (settings.isDiscountOfferEnabled !== false && settings.discountOfferText) {
          elements.heroOfferCallout.style.display = 'inline-flex';
          if (elements.heroDiscountOfferText) {
            elements.heroDiscountOfferText.textContent = settings.discountOfferText;
          }
        } else {
          elements.heroOfferCallout.style.display = 'none';
        }
      }

      // Banner Visual Theme & Custom Background Image
      if (elements.heroBannerElement) {
        const theme = settings.bannerTheme || 'diwali-gold';
        elements.heroBannerElement.className = `hero-banner theme-${theme}`;
        if (theme === 'custom-image' && settings.customBannerImageUrl) {
          elements.heroBannerElement.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url('${settings.customBannerImageUrl}')`;
          elements.heroBannerElement.style.backgroundSize = 'cover';
          elements.heroBannerElement.style.backgroundPosition = 'center';
        } else {
          elements.heroBannerElement.style.backgroundImage = '';
        }
      }
    }
  }
}

/**
 * Reset all active search & category & platform filters
 */
function resetFilters() {
  state.activeCategory = 'All';
  state.activePlatform = 'All';
  state.searchQuery = '';
  state.sortBy = 'featured';
  state.currentPage = 1;

  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.searchClear) elements.searchClear.style.display = 'none';
  if (elements.sortSelect) elements.sortSelect.value = 'featured';

  elements.categoryPills?.querySelectorAll('.category-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.category === 'All');
  });

  elements.platformFilters?.querySelectorAll('.filter-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.platform === 'All');
  });

  renderAll();
}

/**
 * Filter & Sort products based on state
 */
function getProcessedProducts() {
  // Only active and unarchived products
  let list = state.products.filter(p => p.status === 'active' && !p.isArchived);

  // Filter by Category
  if (state.activeCategory !== 'All') {
    list = list.filter(p => p.category === state.activeCategory);
  }

  // Filter by Platform
  if (state.activePlatform !== 'All') {
    list = list.filter(p => p.platform?.toLowerCase() === state.activePlatform.toLowerCase());
  }

  // Filter by Search Query
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q) ||
      p.platform.toLowerCase().includes(q)
    );
  }

  // Sort
  list.sort((a, b) => {
    // Priority 1: Pinned to Top products ALWAYS appear first!
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (state.sortBy) {
      case 'discount': {
        const discA = calculateDiscount(a.sellingPrice, a.originalPrice);
        const discB = calculateDiscount(b.sellingPrice, b.originalPrice);
        return discB - discA;
      }
      case 'price-asc':
        return a.sellingPrice - b.sellingPrice;
      case 'price-desc':
        return b.sellingPrice - a.sellingPrice;
      case 'newest':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'featured':
      default:
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  return list;
}

/**
 * Render all product lists and state badges with pagination
 */
function renderAll() {
  const allFilteredProducts = getProcessedProducts();
  const currency = state.settings.currencySymbol || '₹';

  // Update Results Counter
  if (elements.resultsCount) {
    elements.resultsCount.textContent = `Showing ${allFilteredProducts.length} deal${allFilteredProducts.length === 1 ? '' : 's'}`;
  }

  // Active filters banner
  const hasFilter = state.activeCategory !== 'All' || state.activePlatform !== 'All' || !!state.searchQuery;
  if (elements.activeFiltersBar && elements.activeFilterLabel) {
    if (hasFilter) {
      elements.activeFiltersBar.style.display = 'flex';
      const parts = [];
      if (state.activeCategory !== 'All') parts.push(`Category: ${state.activeCategory}`);
      if (state.activePlatform !== 'All') parts.push(`Store: ${state.activePlatform}`);
      if (state.searchQuery) parts.push(`Search: "${state.searchQuery}"`);
      elements.activeFilterLabel.textContent = parts.join(' · ');
    } else {
      elements.activeFiltersBar.style.display = 'none';
    }
  }

  // Featured Section Display
  if (elements.featuredSection) {
    const featuredList = state.products.filter(p => p.status === 'active' && !p.isArchived && p.isFeatured);
    if (!hasFilter && featuredList.length > 0) {
      elements.featuredSection.style.display = 'block';
      if (elements.featuredGrid) {
        elements.featuredGrid.innerHTML = featuredList
          .slice(0, 4)
          .map(prod => createProductCardHTML(prod, currency))
          .join('');
      }
    } else {
      elements.featuredSection.style.display = 'none';
    }
  }

  // Paginated Main Catalog Display
  if (elements.mainGrid) {
    if (allFilteredProducts.length === 0) {
      elements.mainGrid.innerHTML = '';
      if (elements.paginationContainer) elements.paginationContainer.innerHTML = '';
      if (elements.emptyStateBox) {
        elements.emptyStateBox.style.display = 'block';
        if (elements.emptyStateMsg) {
          if (state.searchQuery) {
            elements.emptyStateMsg.textContent = `No products found matching "${state.searchQuery}". Try searching for smartwatches, earbuds, dresses, or cookware.`;
          } else {
            elements.emptyStateMsg.textContent = `No active products available in this category or platform selection.`;
          }
        }
      }
    } else {
      if (elements.emptyStateBox) elements.emptyStateBox.style.display = 'none';

      // Pagination slice
      const totalPages = Math.ceil(allFilteredProducts.length / state.pageSize);
      if (state.currentPage > totalPages) state.currentPage = 1;

      const startIndex = (state.currentPage - 1) * state.pageSize;
      const paginatedList = allFilteredProducts.slice(startIndex, startIndex + state.pageSize);

      elements.mainGrid.innerHTML = paginatedList
        .map(prod => createProductCardHTML(prod, currency))
        .join('');

      renderPaginationControls(totalPages);
    }
  }

  bindCardInteractions();
}

/**
 * Render Pagination Buttons
 */
function renderPaginationControls(totalPages) {
  if (!elements.paginationContainer) return;
  if (totalPages <= 1) {
    elements.paginationContainer.innerHTML = '';
    return;
  }

  let html = `
    <button class="btn-secondary" id="page-prev-btn" ${state.currentPage <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="padding: 6px 14px; font-size: 0.825rem;">
      ← Prev
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === state.currentPage;
    html += `
      <button class="page-num-btn" data-page="${i}" style="width: 34px; height: 34px; border-radius: var(--radius-md); font-weight: 700; font-size: 0.85rem; border: 1px solid var(--border-light); ${isActive ? 'background: var(--primary); color: white; border-color: var(--primary);' : 'background: white; color: var(--text-main);'}">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="btn-secondary" id="page-next-btn" ${state.currentPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="padding: 6px 14px; font-size: 0.825rem;">
      Next →
    </button>
  `;

  elements.paginationContainer.innerHTML = html;

  // Bind pagination clicks
  document.getElementById('page-prev-btn')?.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderAll();
      scrollToCatalog();
    }
  });

  document.getElementById('page-next-btn')?.addEventListener('click', () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderAll();
      scrollToCatalog();
    }
  });

  elements.paginationContainer.querySelectorAll('.page-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page, 10);
      if (p && p !== state.currentPage) {
        state.currentPage = p;
        renderAll();
        scrollToCatalog();
      }
    });
  });
}

function scrollToCatalog() {
  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Generate Product Card HTML template
 */
function createProductCardHTML(product, currency) {
  const discount = calculateDiscount(product.sellingPrice, product.originalPrice);
  const isSaved = state.wishlist.includes(product.id);
  const platformLower = (product.platform || 'other').toLowerCase();
  const platformBadgeClass = `platform-${platformLower}`;

  const rating = product.rating || 4.3;
  const reviews = product.reviewsCount || 120;
  const saveAmount = product.originalPrice && product.originalPrice > product.sellingPrice 
    ? product.originalPrice - product.sellingPrice 
    : 0;

  return `
    <article class="product-card ${product.isPinned ? 'pinned-deal' : ''}" data-id="${product.id}">
      <div class="card-image-box">
        <span class="platform-badge ${platformBadgeClass}">${escapeHTML(product.platform || 'Store')}</span>
        ${product.isPinned ? `
          <span class="pinned-badge" title="Pinned to Top of Deals">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            TOP PICK
          </span>
        ` : ''}
        ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
        <button class="wishlist-btn ${isSaved ? 'active' : ''}" data-action="wishlist" data-id="${product.id}" title="${isSaved ? 'Remove from Saved' : 'Save Deal'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? '#ef4444' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </button>
        <img 
          src="${escapeHTML(product.imageUrl || PLACEHOLDER_IMAGE)}" 
          alt="${escapeHTML(product.name)}" 
          class="card-image"
          loading="lazy"
          onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'"
        />
      </div>

      <div class="card-body">
        <div class="card-category">${escapeHTML(product.category || 'Deals')}</div>
        <h3 class="card-title" data-action="quickview" data-id="${product.id}" title="${escapeHTML(product.name)}">
          ${escapeHTML(product.name)}
        </h3>

        <div class="card-rating">
          <span class="rating-stars">★ ${rating.toFixed(1)}</span>
          <span>(${reviews.toLocaleString()} ratings)</span>
        </div>

        <div class="card-price-row">
          <span class="selling-price">${formatCurrency(product.sellingPrice, currency)}</span>
          ${product.originalPrice && product.originalPrice > product.sellingPrice ? `
            <span class="original-price">${formatCurrency(product.originalPrice, currency)}</span>
            <span class="save-amount">Save ${formatCurrency(saveAmount, currency)}</span>
          ` : ''}
        </div>

        <div class="card-actions">
          <button class="buy-btn" data-action="buy" data-id="${product.id}" title="Buy on official ${escapeHTML(product.platform)} store">
            <span>Buy on ${escapeHTML(product.platform || 'Store')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
          <button class="quick-view-btn" data-action="quickview" data-id="${product.id}" title="View Details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Bind Click Events on Product Cards
 */
function bindCardInteractions() {
  const container = document.body;
  container.removeEventListener('click', handleGlobalCardClicks);
  container.addEventListener('click', handleGlobalCardClicks);
}

function handleGlobalCardClicks(e) {
  const actionBtn = e.target.closest('[data-action]');
  if (!actionBtn) return;

  const action = actionBtn.dataset.action;
  const productId = actionBtn.dataset.id;
  if (!productId) return;

  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (action === 'buy') {
    e.preventDefault();
    executeAffiliateRedirect(product);
  } else if (action === 'quickview') {
    e.preventDefault();
    openQuickViewModal(product);
  } else if (action === 'wishlist') {
    e.preventDefault();
    const isNowSaved = toggleWishlist(product.id);
    state.wishlist = getWishlist();
    updateWishlistBadges();
    
    actionBtn.classList.toggle('active', isNowSaved);
    const svgPath = actionBtn.querySelector('path');
    if (svgPath) {
      actionBtn.querySelector('svg')?.setAttribute('fill', isNowSaved ? '#ef4444' : 'none');
    }

    showToast(isNowSaved ? `Added "${product.name.slice(0, 24)}..." to saved deals` : 'Removed from saved deals', 'info');
    
    if (state.activeModal === elements.wishlistModal) {
      renderWishlistContent();
    }
  }
}

/**
 * Execute Safe Affiliate Redirection with Rate-Limiting & Tracking Log
 */
function executeAffiliateRedirect(product) {
  if (!product.affiliateUrl) {
    showToast('Affiliate link is not configured for this product.', 'error');
    return;
  }

  showToast(`Opening official ${product.platform || 'Partner Store'}... (Affiliate Link)`, 'info');
  trackAndOpenAffiliate(product);
}

/**
 * Open Product Quick View Modal
 */
function openQuickViewModal(product) {
  if (!elements.quickviewModal || !elements.quickviewContent) return;

  const currency = state.settings.currencySymbol || '₹';
  const discount = calculateDiscount(product.sellingPrice, product.originalPrice);
  const saveAmount = product.originalPrice && product.originalPrice > product.sellingPrice 
    ? product.originalPrice - product.sellingPrice 
    : 0;

  elements.quickviewContent.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-image-box">
        <img 
          src="${escapeHTML(product.imageUrl || PLACEHOLDER_IMAGE)}" 
          alt="${escapeHTML(product.name)}" 
          class="quickview-image"
          onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'"
        />
      </div>

      <div class="quickview-info">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span class="platform-badge platform-${(product.platform || 'other').toLowerCase()}" style="position: static;">
            ${escapeHTML(product.platform || 'Partner Store')}
          </span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">
            Category: ${escapeHTML(product.category)}
          </span>
        </div>

        <h2 style="font-size: 1.15rem; font-weight: 700; line-height: 1.4; color: var(--text-main); margin-bottom: 10px;">
          ${escapeHTML(product.name)}
        </h2>

        <div class="card-rating" style="margin-bottom: 12px;">
          <span class="rating-stars">★ ${(product.rating || 4.3).toFixed(1)}</span>
          <span>(${((product.reviewsCount || 100)).toLocaleString()} customer reviews)</span>
        </div>

        <div style="background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 16px;">
          <div style="display: flex; align-items: baseline; gap: 10px;">
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">
              ${formatCurrency(product.sellingPrice, currency)}
            </span>
            ${product.originalPrice && product.originalPrice > product.sellingPrice ? `
              <span style="font-size: 0.95rem; color: var(--text-muted); text-decoration: line-through;">
                ${formatCurrency(product.originalPrice, currency)}
              </span>
              <span style="font-size: 0.825rem; font-weight: 700; color: #ef4444; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">
                ${discount}% OFF
              </span>
            ` : ''}
          </div>
          ${saveAmount > 0 ? `
            <div style="font-size: 0.8rem; color: #059669; font-weight: 600; margin-top: 4px;">
              You save ${formatCurrency(saveAmount, currency)} on this deal!
            </div>
          ` : ''}
        </div>

        <div style="font-size: 0.875rem; color: var(--text-body); line-height: 1.6; margin-bottom: 20px; max-height: 140px; overflow-y: auto;">
          <strong>Description:</strong><br/>
          ${escapeHTML(product.description || 'No detailed description available for this item.')}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: auto;">
          <button class="buy-btn" id="modal-buy-now-btn" style="padding: 12px; font-size: 0.95rem;">
            <span>Buy Now on ${escapeHTML(product.platform || 'Store')}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>

          <button class="btn-secondary" id="modal-copy-link-btn" style="justify-content: center; font-size: 0.85rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>Copy Affiliate Link</span>
          </button>
        </div>

        <div style="margin-top: 14px; font-size: 0.725rem; color: var(--text-muted); text-align: center;">
          ⚡ Clicking "Buy Now" opens the official partner store. Payment and order fulfillment are processed securely by ${escapeHTML(product.platform)}.
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-buy-now-btn')?.addEventListener('click', () => {
    executeAffiliateRedirect(product);
  });

  document.getElementById('modal-copy-link-btn')?.addEventListener('click', () => {
    if (navigator.clipboard && product.affiliateUrl) {
      navigator.clipboard.writeText(product.affiliateUrl)
        .then(() => showToast('Affiliate link copied to clipboard!', 'success'))
        .catch(() => showToast('Could not copy link.', 'error'));
    }
  });

  openModal(elements.quickviewModal);
}

/**
 * Open Wishlist / Saved Deals Modal
 */
function openWishlistModal() {
  renderWishlistContent();
  openModal(elements.wishlistModal);
}

function renderWishlistContent() {
  if (!elements.wishlistItemsContainer) return;

  const savedIds = state.wishlist;
  const savedProducts = state.products.filter(p => savedIds.includes(p.id) && !p.isArchived);
  const currency = state.settings.currencySymbol || '₹';

  if (savedProducts.length === 0) {
    elements.wishlistItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 10px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin: 0 auto 12px;">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px;">No saved deals yet</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
          Click the heart icon on any product to bookmark deals you want to track or buy later.
        </p>
      </div>
    `;
    return;
  }

  elements.wishlistItemsContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
      ${savedProducts.map(prod => `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
          <img 
            src="${escapeHTML(prod.imageUrl || PLACEHOLDER_IMAGE)}" 
            alt="${escapeHTML(prod.name)}" 
            style="width: 54px; height: 54px; border-radius: var(--radius-sm); object-fit: cover; background: #f1f5f9; flex-shrink: 0;"
          />
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">
              ${escapeHTML(prod.platform)}
            </div>
            <div style="font-size: 0.875rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHTML(prod.name)}
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
              ${formatCurrency(prod.sellingPrice, currency)}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <button class="buy-btn" data-action="buy" data-id="${prod.id}" style="padding: 7px 10px; font-size: 0.75rem;">
              Buy
            </button>
            <button class="action-icon-btn delete" data-action="wishlist" data-id="${prod.id}" title="Remove">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Open Information / Legal Modals
 */
function openInfoModal(type) {
  if (!elements.infoModal || !elements.infoModalTitle || !elements.infoModalContent) return;

  const storeName = state.settings.storeName || 'AffiliateMart';
  const email = state.settings.contactEmail || 'support@affiliatemart.example.com';
  const disclosureText = state.settings.affiliateDisclosureText || '';

  const modalsData = {
    about: {
      title: `About ${storeName}`,
      html: `
        <h4 style="font-weight: 700; margin-bottom: 8px;">Welcome to ${escapeHTML(storeName)}</h4>
        <p style="margin-bottom: 12px;">
          ${escapeHTML(storeName)} is an independent multi-affiliate deals curation and price comparison platform. We aggregate trending discounts, promotional sales, and special offers from top e-commerce platforms such as Amazon, Flipkart, Meesho, Myntra, and more into one clean, seamless catalog.
        </p>
        <p style="margin-bottom: 12px;">
          Our mission is to help smart Indian shoppers save time and money by finding verified discount codes and official product deals without having to search across multiple marketplace apps.
        </p>
        <p>
          We do not sell products directly or handle payment processing. All transactions, guarantees, warranties, and deliveries are handled directly by the official seller platforms.
        </p>
      `
    },
    contact: {
      title: 'Contact Support',
      html: `
        <h4 style="font-weight: 700; margin-bottom: 8px;">We are here to help!</h4>
        <p style="margin-bottom: 14px;">
          Have a question about a listed deal, feedback on our portal, or want to suggest an affiliate partnership? Reach out to our team:
        </p>
        <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 14px;">
          <div style="font-weight: 600; margin-bottom: 4px;">Email Support:</div>
          <a href="mailto:${escapeHTML(email)}" style="color: var(--primary); font-weight: 700;">${escapeHTML(email)}</a>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          Note: For order delivery status, refund requests, or return issues, please contact the specific merchant platform (Amazon, Flipkart, etc.) where you completed your purchase.
        </p>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      html: `
        <h4 style="font-weight: 700; margin-bottom: 8px;">Your Privacy is Important</h4>
        <p style="margin-bottom: 12px;">
          ${escapeHTML(storeName)} respects your personal privacy. We do not require visitors to register customer accounts, nor do we collect credit card, debit card, or UPI banking information.
        </p>
        <h5 style="font-weight: 700; margin-bottom: 6px;">Local Storage & Attribution Tracking</h5>
        <p style="margin-bottom: 12px;">
          We use anonymous session identifiers and browser storage solely to remember saved wishlist items, manage anti-spam click frequency, and calculate aggregated anonymous platform referral metrics.
        </p>
      `
    },
    terms: {
      title: 'Terms of Service',
      html: `
        <h4 style="font-weight: 700; margin-bottom: 8px;">Terms of Use</h4>
        <p style="margin-bottom: 12px;">
          By browsing ${escapeHTML(storeName)}, you acknowledge that all deal pricing, discounts, stock availability, and specifications are provided for informational and referral purposes.
        </p>
        <p style="margin-bottom: 12px;">
          Product prices on third-party marketplace websites fluctuate frequently. The final purchase price, shipping fees, warranty, and customer return policies are strictly determined by the destination platform where you finalize checkout.
        </p>
      `
    },
    disclosure: {
      title: 'Affiliate Disclosure & FTC Compliance',
      html: `
        <h4 style="font-weight: 700; margin-bottom: 8px;">Transparency & Advertising Disclosure</h4>
        <p style="margin-bottom: 14px; font-weight: 500;">
          ${escapeHTML(disclosureText)}
        </p>
        <hr style="border: none; border-top: 1px solid var(--border-light); margin: 16px 0;" />
        <h5 style="font-weight: 700; margin-bottom: 6px;">How It Works:</h5>
        <ul style="padding-left: 20px; margin-bottom: 14px;">
          <li>When you click "Buy Now", you are routed via an official affiliate tracking URL to the partner store.</li>
          <li>If you make a purchase, the partner store pays us a small percentage referral commission.</li>
          <li>This does <strong>NOT</strong> increase the price you pay. You pay the exact same price (or lower with available coupons).</li>
          <li>All product payments, billing details, and shipping fulfillment are handled solely on the merchant's secure servers.</li>
        </ul>
      `
    }
  };

  const data = modalsData[type] || modalsData.about;
  elements.infoModalTitle.textContent = data.title;
  elements.infoModalContent.innerHTML = data.html;

  openModal(elements.infoModal);
}

/**
 * Modal Open / Close Helpers
 */
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('active');
  state.activeModal = modalEl;
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  state.activeModal = null;
  document.body.style.overflow = '';
}

/**
 * Update Wishlist Badges Counter
 */
function updateWishlistBadges() {
  const count = state.wishlist.length;
  if (elements.wishlistBadge) {
    elements.wishlistBadge.textContent = count;
    elements.wishlistBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (elements.bnavWishlistBadge) {
    elements.bnavWishlistBadge.textContent = count;
    elements.bnavWishlistBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Utility: HTML Escape
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Progressive Web App (PWA) Integration & In-App Install Prompt
 */
function setupPWAIntegration() {
  // 1. Register Service Worker with relative scope
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] ServiceWorker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] ServiceWorker registration notice:', err);
        });
    });
  }

  // 2. Detect Standalone Display Mode (already installed & running as PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator && window.navigator.standalone === true);

  if (isStandalone) {
    console.log('[PWA] Running in standalone installed app mode.');
    // Suppress all install prompts
    if (elements.headerPwaInstallBtn) elements.headerPwaInstallBtn.style.display = 'none';
    if (elements.bnavInstall) elements.bnavInstall.style.display = 'none';
    if (elements.pwaInstallBanner) elements.pwaInstallBanner.style.display = 'none';
    return;
  }

  // 3. Detect iOS Safari
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;

  let deferredPrompt = null;

  // Open iOS modal helper
  const openIOSGuide = () => {
    if (elements.pwaInstallBanner) elements.pwaInstallBanner.style.display = 'none';
    openModal(elements.pwaIosModal);
  };

  // Close iOS modal helper
  elements.pwaIosCloseBtn?.addEventListener('click', () => closeModal(elements.pwaIosModal));
  elements.pwaIosUnderstoodBtn?.addEventListener('click', () => closeModal(elements.pwaIosModal));

  // Dismiss Banner helper (stores 24h cooldown in localStorage)
  const dismissBanner = () => {
    if (elements.pwaInstallBanner) {
      elements.pwaInstallBanner.style.display = 'none';
    }
    try {
      localStorage.setItem('affiliatemart_pwa_dismissed', Date.now().toString());
    } catch (e) {}
  };

  elements.pwaBannerCloseBtn?.addEventListener('click', dismissBanner);
  elements.pwaDismissBtn?.addEventListener('click', dismissBanner);

  // Trigger Install Action
  const triggerInstallFlow = async () => {
    if (isIOS) {
      openIOSGuide();
      return;
    }

    if (!deferredPrompt) {
      // Fallback instruction for browsers where beforeinstallprompt didn't trigger yet
      showToast('ब्राउज़र मेनू (⋮) खोलें और "Install App" या "Add to Home screen" चुनें।', 'info');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        if (elements.pwaInstallBanner) elements.pwaInstallBanner.style.display = 'none';
        if (elements.headerPwaInstallBtn) elements.headerPwaInstallBtn.style.display = 'none';
        if (elements.bnavInstall) elements.bnavInstall.style.display = 'none';
        showToast('🎉 AffiliateMart ऐप आपके फोन में इंस्टॉल हो गया!', 'success');
      }
      deferredPrompt = null;
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  elements.pwaInstallActionBtn?.addEventListener('click', triggerInstallFlow);
  elements.headerPwaInstallBtn?.addEventListener('click', triggerInstallFlow);
  elements.bnavInstall?.addEventListener('click', triggerInstallFlow);

  // 4. Handle Standard Chromium / Android / Desktop Install Prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar from appearing automatically
    e.preventDefault();
    deferredPrompt = e;

    // Show top header install button and bottom nav button
    if (elements.headerPwaInstallBtn) elements.headerPwaInstallBtn.style.display = 'inline-flex';
    if (elements.bnavInstall) elements.bnavInstall.style.display = 'flex';

    // Check if user dismissed banner recently (within 24 hours)
    let shouldAutoShow = true;
    try {
      const lastDismissed = localStorage.getItem('affiliatemart_pwa_dismissed');
      if (lastDismissed) {
        const passedMs = Date.now() - parseInt(lastDismissed, 10);
        if (passedMs < 24 * 60 * 60 * 1000) {
          shouldAutoShow = false;
        }
      }
    } catch (e) {}

    // Show automatic slide-up card after smooth 1.2s delay
    if (shouldAutoShow && elements.pwaInstallBanner) {
      setTimeout(() => {
        if (!isStandalone && deferredPrompt) {
          elements.pwaInstallBanner.style.display = 'block';
        }
      }, 1200);
    }
  });

  // 5. iOS Safari Flow
  if (isIOS) {
    if (elements.headerPwaInstallBtn) elements.headerPwaInstallBtn.style.display = 'inline-flex';
    if (elements.bnavInstall) elements.bnavInstall.style.display = 'flex';

    let shouldAutoShowIOS = true;
    try {
      const lastDismissed = localStorage.getItem('affiliatemart_pwa_dismissed');
      if (lastDismissed) {
        const passedMs = Date.now() - parseInt(lastDismissed, 10);
        if (passedMs < 24 * 60 * 60 * 1000) {
          shouldAutoShowIOS = false;
        }
      }
    } catch (e) {}

    if (shouldAutoShowIOS && elements.pwaInstallBanner) {
      setTimeout(() => {
        elements.pwaInstallBanner.style.display = 'block';
      }, 1500);
    }
  }

  // 6. Handle App Installed Event
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (elements.pwaInstallBanner) elements.pwaInstallBanner.style.display = 'none';
    if (elements.headerPwaInstallBtn) elements.headerPwaInstallBtn.style.display = 'none';
    if (elements.bnavInstall) elements.bnavInstall.style.display = 'none';
    showToast('🎉 AffiliateMart ऐप सफलतापूर्वक इंस्टॉल हो गया!', 'success');
  });

  // 7. Network Connectivity Listeners (Online / Offline state handling)
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      if (elements.offlineToast) elements.offlineToast.style.display = 'none';
    } else {
      if (elements.offlineToast) elements.offlineToast.style.display = 'flex';
    }
  };

  window.addEventListener('online', () => {
    updateOnlineStatus();
    showToast('🟢 इंटरनेट कनेक्शन वापस आ गया!', 'success');
  });

  window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('📶 ऑफलाइन मोड: कैश्ड डील्स और सेव किए गए प्रोडक्ट्स दिखाए जा रहे हैं।', 'warning');
  });

  updateOnlineStatus();
}

document.addEventListener('DOMContentLoaded', initApp);

