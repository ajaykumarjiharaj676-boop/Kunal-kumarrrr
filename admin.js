/**
 * AffiliateMart - Admin Portal Core Engine
 * Manages Authentication, Product CRUD & Soft-Delete (Archive), Pagination,
 * Click Analytics Logs, Affiliate Sales & Commission Reconciliation,
 * Append-Only Audit Trail, and System Disaster Recovery (Backup/Restore).
 */

import {
  getStoredProducts,
  upsertProduct,
  archiveProductById,
  restoreProductById,
  permanentlyDeleteProductById,
  resetToSampleProducts,
  clearSampleProducts,
  getStoredSettings,
  saveStoredSettings,
  calculateDiscount,
  formatCurrency,
  togglePinProduct,
  getRecordedClicks,
  getSalesRecords,
  importSalesFromCSV,
  updateSaleStatus,
  getAuditLogs,
  authenticateAdmin,
  updateAdminCredentials,
  resetAdminCredentialsToDefault,
  sendAdminPasswordReset,
  isAdminAuthenticated,
  setAdminAuthenticated,
  getCurrentAdminEmail,
  AUTHORIZED_ADMIN_EMAIL,
  getAuthConfig,
  generateCSV,
  triggerFileDownload,
  createSystemBackupJSON,
  restoreSystemFromJSON,
  PLATFORMS,
  CATEGORIES,
  COMMISSION_STATUSES,
} from './shared.js';
import { db, doc, setDoc, auth, onAuthStateChanged } from './firebase.js';

// Application State
const state = {
  products: [],
  settings: {},
  clicks: [],
  sales: [],
  auditLogs: [],
  activeTab: 'overview',
  searchQuery: '',
  filterPlatform: 'All',
  filterCategory: 'All',
  filterStatus: 'All',
  editingProductId: null,
  pendingDeleteId: null,
  pendingDeleteType: 'soft', // 'soft' or 'permanent'
  adminCatalogPage: 1,
  adminCatalogPageSize: 10,
};

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

const PRESET_SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
];

// DOM Elements
const elements = {
  // Auth
  loginView: document.getElementById('admin-login-view'),
  dashboardView: document.getElementById('admin-dashboard-view'),
  loginForm: document.getElementById('admin-login-form'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  autofillCredentialsBtn: document.getElementById('autofill-credentials-btn'),
  resetCredentialsQuickBtn: document.getElementById('reset-credentials-quick-btn'),
  toggleLoginPasswordBtn: document.getElementById('toggle-login-password-btn'),
  logoutBtn: document.getElementById('admin-logout-btn'),

  // Navigation
  sidebar: document.getElementById('admin-sidebar'),
  mobileMenuBtn: document.getElementById('admin-mobile-menu-btn'),
  sidebarCloseBtn: document.getElementById('admin-sidebar-close'),
  tabNavItems: document.querySelectorAll('.admin-nav-item[data-tab]'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  tabTitle: document.getElementById('admin-tab-title'),

  // Overview metrics
  statActiveProducts: document.getElementById('stat-active-products'),
  statTotalClicks: document.getElementById('stat-total-clicks'),
  statConfirmedCommission: document.getElementById('stat-confirmed-commission'),
  statPendingCommission: document.getElementById('stat-pending-commission'),
  platformCountsContainer: document.getElementById('platform-counts-container'),
  overviewRecentClicksTbody: document.getElementById('overview-recent-clicks-tbody'),
  overviewRecentSalesTbody: document.getElementById('overview-recent-sales-tbody'),
  overviewViewClicksBtn: document.getElementById('overview-view-clicks-btn'),
  overviewViewSalesBtn: document.getElementById('overview-view-sales-btn'),

  // Catalog
  searchInput: document.getElementById('admin-search-input'),
  platformFilter: document.getElementById('admin-platform-filter'),
  categoryFilter: document.getElementById('admin-category-filter'),
  statusFilter: document.getElementById('admin-status-filter'),
  productsTbody: document.getElementById('admin-products-tbody'),
  tableEmpty: document.getElementById('admin-table-empty'),
  clearFiltersBtn: document.getElementById('admin-clear-filters-btn'),
  quickAddBtn: document.getElementById('quick-add-prod-btn'),
  adminAddBtn: document.getElementById('admin-add-product-btn'),
  catalogPageInfo: document.getElementById('admin-catalog-page-info'),
  catalogPaginationBtns: document.getElementById('admin-catalog-pagination-btns'),
  exportProductsCsvBtn: document.getElementById('admin-export-products-csv-btn'),

  // Archive (Recycle Bin)
  archiveTbody: document.getElementById('admin-archive-tbody'),
  archiveEmpty: document.getElementById('admin-archive-empty'),

  // Click Tracking
  clicksLogCount: document.getElementById('clicks-log-count'),
  clicksTbody: document.getElementById('clicks-table-tbody'),
  exportClicksCsvBtn: document.getElementById('export-clicks-csv-btn'),

  // Sales Reconciliation
  salesConfirmedVal: document.getElementById('sales-confirmed-val'),
  salesPaidVal: document.getElementById('sales-paid-val'),
  salesPendingVal: document.getElementById('sales-pending-val'),
  salesCancelledVal: document.getElementById('sales-cancelled-val'),
  salesRecordsCount: document.getElementById('sales-records-count'),
  salesTbody: document.getElementById('sales-table-tbody'),
  importSalesCsvBtn: document.getElementById('import-sales-csv-btn'),
  exportSalesCsvBtn: document.getElementById('export-sales-csv-btn'),
  importSalesModal: document.getElementById('import-sales-modal'),
  importSalesCloseBtn: document.getElementById('import-sales-close-btn'),
  importSalesCancelBtn: document.getElementById('import-sales-cancel-btn'),
  importSalesSubmitBtn: document.getElementById('import-sales-submit-btn'),
  salesCsvFileInput: document.getElementById('sales-csv-file-input'),
  salesCsvTextInput: document.getElementById('sales-csv-text-input'),

  // Audit Logs
  auditLogCount: document.getElementById('audit-log-count'),
  auditTbody: document.getElementById('audit-table-tbody'),
  exportAuditCsvBtn: document.getElementById('export-audit-csv-btn'),

  // Settings & Security
  settingsForm: document.getElementById('store-settings-form'),
  settingStoreName: document.getElementById('setting-store-name'),
  settingCurrency: document.getElementById('setting-currency'),
  settingStoreTagline: document.getElementById('setting-store-tagline'),
  settingContactEmail: document.getElementById('setting-contact-email'),
  settingAnnouncementEnabled: document.getElementById('setting-announcement-enabled'),
  settingAnnouncementText: document.getElementById('setting-announcement-text'),
  settingDisclosureText: document.getElementById('setting-disclosure-text'),
  announcementTextGroup: document.getElementById('announcement-text-group'),

  // Festival & Campaign Banner Elements
  settingBannerEnabled: document.getElementById('setting-banner-enabled'),
  bannerControlsGroup: document.getElementById('banner-controls-group'),
  settingFestivalName: document.getElementById('setting-festival-name'),
  settingBannerTheme: document.getElementById('setting-banner-theme'),
  customBannerImageGroup: document.getElementById('custom-banner-image-group'),
  settingCustomBannerImageUrl: document.getElementById('setting-custom-banner-image-url'),
  settingBannerTitle: document.getElementById('setting-banner-title'),
  settingBannerSubtitle: document.getElementById('setting-banner-subtitle'),
  settingDiscountOfferEnabled: document.getElementById('setting-discount-offer-enabled'),
  discountOfferTextGroup: document.getElementById('discount-offer-text-group'),
  settingDiscountOfferText: document.getElementById('setting-discount-offer-text'),
  adminBannerPreview: document.getElementById('admin-banner-preview'),
  previewFestivalName: document.getElementById('preview-festival-name'),
  previewBannerTitle: document.getElementById('preview-banner-title'),
  previewBannerSubtitle: document.getElementById('preview-banner-subtitle'),
  previewOfferCallout: document.getElementById('preview-offer-callout'),
  previewDiscountText: document.getElementById('preview-discount-text'),

  passwordForm: document.getElementById('admin-password-form'),
  authCurrPass: document.getElementById('auth-curr-pass'),
  authNewUsername: document.getElementById('auth-new-username'),
  authNewPass: document.getElementById('auth-new-pass'),
  downloadBackupBtn: document.getElementById('download-backup-json-btn'),
  restoreJsonFileInput: document.getElementById('restore-json-file-input'),
  forceFirebaseSyncBtn: document.getElementById('force-firebase-sync-btn'),
  resetDemoBtn: document.getElementById('admin-reset-demo-btn'),
  clearSamplesBtn: document.getElementById('admin-clear-samples-btn'),

  // Product Form Modal
  productModal: document.getElementById('product-form-modal'),
  productModalTitle: document.getElementById('product-form-modal-title'),
  productModalCloseBtn: document.getElementById('product-form-close-btn'),
  productModalCancelBtn: document.getElementById('product-form-cancel-btn'),
  productForm: document.getElementById('product-form'),
  prodId: document.getElementById('prod-id'),
  prodName: document.getElementById('prod-name'),
  prodPlatform: document.getElementById('prod-platform'),
  prodCategory: document.getElementById('prod-category'),
  prodSellingPrice: document.getElementById('prod-selling-price'),
  prodOriginalPrice: document.getElementById('prod-original-price'),
  prodDiscountPreview: document.getElementById('prod-discount-preview'),
  prodImageUrl: document.getElementById('prod-image-url'),
  prodImagePreview: document.getElementById('form-img-preview'),
  previewImageTrigger: document.getElementById('preview-image-trigger'),
  presetImageSuggest: document.getElementById('preset-image-suggest'),
  prodAffiliateUrl: document.getElementById('prod-affiliate-url'),
  prodDesc: document.getElementById('prod-desc'),
  prodIsPinned: document.getElementById('prod-is-pinned'),
  prodIsFeatured: document.getElementById('prod-is-featured'),
  prodStatus: document.getElementById('prod-status'),

  // Confirm Modal
  confirmModal: document.getElementById('confirm-modal'),
  confirmModalTitle: document.getElementById('confirm-modal-title'),
  confirmModalMessage: document.getElementById('confirm-modal-message'),
  confirmModalClose: document.getElementById('confirm-modal-close'),
  confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
  confirmOkBtn: document.getElementById('confirm-ok-btn'),

  toastContainer: document.getElementById('toast-container'),
};

/**
 * Initialize Admin App
 */
function initAdmin() {
  loadData();
  setupAuth();
  setupNavigation();
  setupFiltersAndSearch();
  setupProductForm();
  setupSettingsForm();
  setupConfirmModal();
  setupSalesReconciliation();
  setupBackupAndRestore();

  if (isAdminAuthenticated()) {
    showDashboardView();
  } else {
    showLoginView();
  }
}

/**
 * Reload all system tables
 */
function loadData() {
  state.products = getStoredProducts(true); // include archived
  state.settings = getStoredSettings();
  state.clicks = getRecordedClicks();
  state.sales = getSalesRecords();
  state.auditLogs = getAuditLogs();
  updateCurrencyLabels();
}

/**
 * Authentication Setup with Firebase Authentication (signInWithEmailAndPassword)
 * Restricted to: anilkumarjiha123@gmail.com
 */
function setupAuth() {
  // Autofill authorized Firebase Admin Email
  elements.autofillCredentialsBtn?.addEventListener('click', () => {
    if (elements.loginUsername) elements.loginUsername.value = AUTHORIZED_ADMIN_EMAIL;
    if (elements.loginPassword) {
      elements.loginPassword.value = '';
      elements.loginPassword.focus();
    }
    showToast(`अधिकृत एडमिन ईमेल भरा गया: ${AUTHORIZED_ADMIN_EMAIL}`, 'info');
  });

  // Send Firebase password reset email
  elements.resetCredentialsQuickBtn?.addEventListener('click', async () => {
    const email = elements.loginUsername?.value.trim() || AUTHORIZED_ADMIN_EMAIL;
    try {
      showToast('Firebase पासवर्ड रीसेट ईमेल भेजा जा रहा है...', 'info');
      await sendAdminPasswordReset(email);
      showToast(`पासवर्ड रीसेट लिंक '${email}' पर भेजा गया है! कृपया अपना ईमेल चेक करें।`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Toggle password visibility
  elements.toggleLoginPasswordBtn?.addEventListener('click', () => {
    if (elements.loginPassword) {
      const isPassword = elements.loginPassword.type === 'password';
      elements.loginPassword.type = isPassword ? 'text' : 'password';
    }
  });

  // Firebase Email/Password Sign-In Handler
  elements.loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.loginUsername?.value.trim();
    const pass = elements.loginPassword?.value;

    const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 8px;">
          <svg style="animation: spin 1s linear infinite;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span>Firebase Authentication...</span>
        </span>
      `;
    }

    try {
      await authenticateAdmin(email, pass);
      showDashboardView();
      showToast(`स्वागत है! Firebase Authentication द्वारा अधिकृत एडमिन सेशन सक्रिय हुआ (${AUTHORIZED_ADMIN_EMAIL})।`, 'success');
    } catch (err) {
      showToast(err.message || 'Firebase लॉगिन असफल रहा', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });

  // Logout Handler
  elements.logoutBtn?.addEventListener('click', () => {
    setAdminAuthenticated(false);
    showLoginView();
    showToast('Signed out of administrative console', 'info');
  });

  // Password update form using Firebase Auth
  elements.passwordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = elements.authNewPass?.value;

    try {
      await updateAdminCredentials(null, null, newPass);
      elements.passwordForm.reset();
      showToast('Firebase Admin password updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Real-time Firebase Auth state change observer
  onAuthStateChanged(auth, (user) => {
    if (user && user.email && user.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      sessionStorage.setItem('affiliate_mart_admin_auth_v2', `fb_token_${user.uid}`);
      sessionStorage.setItem('affiliate_mart_admin_email', user.email);
      showDashboardView();
    } else if (!isAdminAuthenticated()) {
      showLoginView();
    }
  });
}

function showLoginView() {
  if (elements.loginView) elements.loginView.style.display = 'flex';
  if (elements.dashboardView) elements.dashboardView.style.display = 'none';
}

function showDashboardView() {
  if (elements.loginView) elements.loginView.style.display = 'none';
  if (elements.dashboardView) elements.dashboardView.style.display = 'flex';
  renderDashboard();
}

/**
 * Tab Navigation
 */
function setupNavigation() {
  elements.mobileMenuBtn?.addEventListener('click', () => {
    elements.sidebar?.classList.toggle('open');
  });

  elements.sidebarCloseBtn?.addEventListener('click', () => {
    elements.sidebar?.classList.remove('open');
  });

  elements.tabNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;
      switchTab(tabName);
      elements.sidebar?.classList.remove('open');
    });
  });

  elements.overviewViewClicksBtn?.addEventListener('click', () => switchTab('tracking'));
  elements.overviewViewSalesBtn?.addEventListener('click', () => switchTab('sales'));
}

function switchTab(tabName) {
  state.activeTab = tabName;

  elements.tabNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  elements.tabPanes.forEach(pane => {
    pane.style.display = pane.id === `tab-${tabName}` ? 'block' : 'none';
  });

  const titles = {
    overview: 'Executive Overview',
    products: 'Product Catalog Management',
    archive: 'Recycle Bin / Soft-Deleted Items',
    tracking: 'Affiliate Click Analytics & Logs',
    sales: 'Sales & Commission Reconciliation',
    audit: 'Append-Only Audit Trail',
    settings: 'Settings & Disaster Recovery',
  };
  if (elements.tabTitle) elements.tabTitle.textContent = titles[tabName] || 'Dashboard';

  // Render respective tab
  loadData();
  if (tabName === 'overview') renderOverview();
  else if (tabName === 'products') renderProductsTable();
  else if (tabName === 'archive') renderArchiveTable();
  else if (tabName === 'tracking') renderClicksTable();
  else if (tabName === 'sales') renderSalesTable();
  else if (tabName === 'audit') renderAuditTable();
  else if (tabName === 'settings') populateSettingsForm();
}

/**
 * Render complete dashboard
 */
function renderDashboard() {
  loadData();
  renderOverview();
  renderProductsTable();
  renderArchiveTable();
  renderClicksTable();
  renderSalesTable();
  renderAuditTable();
  populateSettingsForm();
}

/**
 * 1. Overview Tab
 */
function renderOverview() {
  const products = state.products.filter(p => !p.isArchived);
  const currency = state.settings.currencySymbol || '₹';

  const activeCount = products.filter(p => p.status === 'active').length;
  const totalClicks = state.clicks.length;

  // Calculate Confirmed Commission earnings
  const confirmedCommissions = state.sales
    .filter(s => s.status === 'Confirmed' || s.status === 'Paid')
    .reduce((acc, s) => acc + (s.commissionEarned || 0), 0);

  const pendingCommissions = state.sales
    .filter(s => s.status === 'Pending')
    .reduce((acc, s) => acc + (s.commissionEarned || 0), 0);

  if (elements.statActiveProducts) elements.statActiveProducts.textContent = activeCount;
  if (elements.statTotalClicks) elements.statTotalClicks.textContent = totalClicks.toLocaleString();
  if (elements.statConfirmedCommission) elements.statConfirmedCommission.textContent = formatCurrency(confirmedCommissions, currency);
  if (elements.statPendingCommission) elements.statPendingCommission.textContent = formatCurrency(pendingCommissions, currency);

  // Platform Breakdown Cards
  if (elements.platformCountsContainer) {
    const platformBreakdown = {};
    PLATFORMS.forEach(plat => {
      platformBreakdown[plat] = products.filter(p => (p.platform || '').toLowerCase() === plat.toLowerCase()).length;
    });

    elements.platformCountsContainer.innerHTML = PLATFORMS.map(plat => {
      const count = platformBreakdown[plat] || 0;
      const clicksCount = state.clicks.filter(c => (c.platform || '').toLowerCase() === plat.toLowerCase()).length;
      return `
        <div class="platform-stat-card">
          <div class="platform-stat-name" style="color: var(--primary);">${escapeHTML(plat)}</div>
          <div class="platform-stat-count">${count} <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">prods</span></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${clicksCount} clicks</div>
        </div>
      `;
    }).join('');
  }

  // Latest 4 clicks
  if (elements.overviewRecentClicksTbody) {
    const recentClicks = state.clicks.slice(0, 4);
    if (recentClicks.length === 0) {
      elements.overviewRecentClicksTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No outbound clicks yet.</td></tr>`;
    } else {
      elements.overviewRecentClicksTbody.innerHTML = recentClicks.map(c => `
        <tr>
          <td style="font-weight: 600; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(c.productName)}</td>
          <td><span class="platform-badge platform-${(c.platform || 'other').toLowerCase()}" style="position: static; font-size: 0.65rem; padding: 2px 5px;">${escapeHTML(c.platform)}</span></td>
          <td style="font-size: 0.75rem; color: var(--text-muted);">${formatTimeAgo(c.timestamp)}</td>
        </tr>
      `).join('');
    }
  }

  // Latest 4 sales
  if (elements.overviewRecentSalesTbody) {
    const recentSales = state.sales.slice(0, 4);
    if (recentSales.length === 0) {
      elements.overviewRecentSalesTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No sales recorded yet.</td></tr>`;
    } else {
      elements.overviewRecentSalesTbody.innerHTML = recentSales.map(s => `
        <tr>
          <td style="font-size: 0.75rem; font-family: monospace;">${escapeHTML(s.externalOrderId)}</td>
          <td>${escapeHTML(s.platform)}</td>
          <td style="font-weight: 700; color: #15803d;">${formatCurrency(s.commissionEarned, currency)}</td>
          <td><span class="badge-soft badge-soft-${(s.status || 'pending').toLowerCase()}">${escapeHTML(s.status)}</span></td>
        </tr>
      `).join('');
    }
  }
}

/**
 * 2. Product Catalog Tab (with Pagination & Soft-Delete)
 */
function setupFiltersAndSearch() {
  elements.searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    state.adminCatalogPage = 1;
    renderProductsTable();
  });

  elements.platformFilter?.addEventListener('change', (e) => {
    state.filterPlatform = e.target.value;
    state.adminCatalogPage = 1;
    renderProductsTable();
  });

  elements.categoryFilter?.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    state.adminCatalogPage = 1;
    renderProductsTable();
  });

  elements.statusFilter?.addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    state.adminCatalogPage = 1;
    renderProductsTable();
  });

  elements.clearFiltersBtn?.addEventListener('click', () => {
    state.searchQuery = '';
    state.filterPlatform = 'All';
    state.filterCategory = 'All';
    state.filterStatus = 'All';
    state.adminCatalogPage = 1;

    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.platformFilter) elements.platformFilter.value = 'All';
    if (elements.categoryFilter) elements.categoryFilter.value = 'All';
    if (elements.statusFilter) elements.statusFilter.value = 'All';

    renderProductsTable();
  });

  // Export Products to CSV
  elements.exportProductsCsvBtn?.addEventListener('click', () => {
    const unarchived = state.products.filter(p => !p.isArchived);
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Product Name' },
      { key: 'platform', label: 'Platform' },
      { key: 'category', label: 'Category' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'originalPrice', label: 'MRP' },
      { key: 'affiliateUrl', label: 'Affiliate URL' },
      { key: 'status', label: 'Status' },
      { key: 'isFeatured', label: 'Featured' },
    ];
    const csv = generateCSV(unarchived, cols);
    triggerFileDownload(csv, `AffiliateMart_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Products catalog exported to CSV', 'success');
  });
}

function getFilteredActiveProducts() {
  return state.products.filter(p => {
    if (p.isArchived) return false;
    if (state.searchQuery && !p.name.toLowerCase().includes(state.searchQuery)) return false;
    if (state.filterPlatform !== 'All' && (p.platform || '').toLowerCase() !== state.filterPlatform.toLowerCase()) return false;
    if (state.filterCategory !== 'All' && p.category !== state.filterCategory) return false;
    if (state.filterStatus !== 'All' && p.status !== state.filterStatus) return false;
    return true;
  });
}

function renderProductsTable() {
  if (!elements.productsTbody) return;

  const filtered = getFilteredActiveProducts();
  const currency = state.settings.currencySymbol || '₹';

  if (filtered.length === 0) {
    elements.productsTbody.innerHTML = '';
    if (elements.tableEmpty) elements.tableEmpty.style.display = 'block';
    if (elements.catalogPageInfo) elements.catalogPageInfo.textContent = 'Showing 0 products';
    if (elements.catalogPaginationBtns) elements.catalogPaginationBtns.innerHTML = '';
    return;
  }

  if (elements.tableEmpty) elements.tableEmpty.style.display = 'none';

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / state.adminCatalogPageSize);
  if (state.adminCatalogPage > totalPages) state.adminCatalogPage = 1;

  const startIdx = (state.adminCatalogPage - 1) * state.adminCatalogPageSize;
  const pageItems = filtered.slice(startIdx, startIdx + state.adminCatalogPageSize);

  elements.productsTbody.innerHTML = pageItems.map(p => createTableRowHTML(p, currency)).join('');

  if (elements.catalogPageInfo) {
    elements.catalogPageInfo.textContent = `Showing ${startIdx + 1} - ${Math.min(startIdx + pageItems.length, filtered.length)} of ${filtered.length} products`;
  }

  renderAdminCatalogPagination(totalPages);
}

function renderAdminCatalogPagination(totalPages) {
  if (!elements.catalogPaginationBtns) return;
  if (totalPages <= 1) {
    elements.catalogPaginationBtns.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    const isAct = i === state.adminCatalogPage;
    html += `
      <button class="admin-page-btn" data-page="${i}" style="padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-weight: 700; ${isAct ? 'background: var(--primary); color: white;' : 'background: white;'}">
        ${i}
      </button>
    `;
  }
  elements.catalogPaginationBtns.innerHTML = html;

  elements.catalogPaginationBtns.querySelectorAll('.admin-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adminCatalogPage = parseInt(btn.dataset.page, 10);
      renderProductsTable();
    });
  });
}

function createTableRowHTML(product, currency) {
  const discount = calculateDiscount(product.sellingPrice, product.originalPrice);
  const statusClass = product.status === 'active' ? 'active' : 'hidden';
  const statusLabel = product.status === 'active' ? 'Active' : 'Hidden';

  return `
    <tr data-id="${product.id}">
      <td>
        <div class="table-prod-info">
          <img 
            src="${escapeHTML(product.imageUrl || PLACEHOLDER_IMAGE)}" 
            alt="${escapeHTML(product.name)}" 
            class="table-prod-img"
            onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'"
          />
          <div>
            <div class="table-prod-name" title="${escapeHTML(product.name)}">${escapeHTML(product.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              ID: ${escapeHTML(product.id.slice(0, 10))} ${product.isSample ? '· <span style="color: #6366f1;">Demo</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span class="platform-badge platform-${(product.platform || 'other').toLowerCase()}" style="position: static; font-size: 0.68rem; padding: 2px 6px;">
          ${escapeHTML(product.platform || 'Store')}
        </span>
      </td>
      <td>${escapeHTML(product.category || 'General')}</td>
      <td style="font-weight: 700;">${formatCurrency(product.sellingPrice, currency)}</td>
      <td>
        ${product.originalPrice ? `
          <div style="text-decoration: line-through; font-size: 0.775rem; color: var(--text-muted);">${formatCurrency(product.originalPrice, currency)}</div>
          <div style="color: #10b981; font-weight: 700; font-size: 0.75rem;">${discount}% OFF</div>
        ` : '—'}
      </td>
      <td>
        <a href="${escapeHTML(product.affiliateUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-size: 0.75rem; text-decoration: underline; max-width: 140px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHTML(product.affiliateUrl)}
        </a>
      </td>
      <td>
        <span class="status-badge ${statusClass}">● ${statusLabel}</span>
      </td>
      <td>
        ${product.isPinned ? `
          <button class="badge-soft toggle-pin-btn" data-id="${product.id}" title="Pinned to Top - Click to unpin" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            <span>📌 Top</span>
          </button>
        ` : `
          <button class="action-icon-btn toggle-pin-btn" data-id="${product.id}" title="Click to Pin to Top" style="font-size: 0.72rem; color: var(--text-muted); border: 1px dashed var(--border-light); padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; width: auto; height: auto;">
            <span>+ Pin</span>
          </button>
        `}
      </td>
      <td>
        ${product.isFeatured ? '<span style="color: #f59e0b; font-weight: 700; font-size: 0.78rem;">★ Yes</span>' : '<span style="color: var(--text-muted); font-size: 0.78rem;">No</span>'}
      </td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end;">
          <button class="action-icon-btn toggle-pin-btn" data-id="${product.id}" title="${product.isPinned ? 'Unpin from Top' : 'Pin to Top (सबसे ऊपर रखें)'}" style="${product.isPinned ? 'color: #b45309; background: #fef3c7;' : ''}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${product.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button class="action-icon-btn edit-btn" data-id="${product.id}" title="Edit Product">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          </button>
          <button class="action-icon-btn toggle-status-btn" data-id="${product.id}" title="${product.status === 'active' ? 'Hide Product' : 'Make Active'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${product.status === 'active' 
                ? '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'
                : '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
              }
            </svg>
          </button>
          <button class="action-icon-btn archive-btn" data-id="${product.id}" title="Archive (Soft Delete)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="21 8 21 21 3 21 3 8"/><rect width="22" height="5" x="1" y="3" rx="1"/><line x1="10" x2="14" y1="12" y2="12"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * 3. Recycle Bin / Archive Tab
 */
function renderArchiveTable() {
  if (!elements.archiveTbody) return;

  const archived = state.products.filter(p => p.isArchived);
  const currency = state.settings.currencySymbol || '₹';

  if (archived.length === 0) {
    elements.archiveTbody.innerHTML = '';
    if (elements.archiveEmpty) elements.archiveEmpty.style.display = 'block';
    return;
  }

  if (elements.archiveEmpty) elements.archiveEmpty.style.display = 'none';

  elements.archiveTbody.innerHTML = archived.map(p => `
    <tr data-id="${p.id}">
      <td>
        <div class="table-prod-info">
          <img src="${escapeHTML(p.imageUrl || PLACEHOLDER_IMAGE)}" class="table-prod-img" onerror="this.src='${PLACEHOLDER_IMAGE}'" />
          <div class="table-prod-name">${escapeHTML(p.name)}</div>
        </div>
      </td>
      <td>${escapeHTML(p.platform)}</td>
      <td>${escapeHTML(p.category)}</td>
      <td style="font-weight: 700;">${formatCurrency(p.sellingPrice, currency)}</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${formatTimeAgo(p.archivedAt)}</td>
      <td style="text-align: right;">
        <div class="actions-cell" style="justify-content: flex-end; gap: 8px;">
          <button class="btn-secondary restore-btn" data-id="${p.id}" style="font-size: 0.75rem; padding: 4px 10px;">
            Restore
          </button>
          <button class="action-icon-btn delete permanent-delete-btn" data-id="${p.id}" title="Permanently Purge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 4. Click Analytics Tab
 */
function renderClicksTable() {
  if (!elements.clicksTbody) return;

  const clicks = state.clicks;
  if (elements.clicksLogCount) elements.clicksLogCount.textContent = clicks.length;

  if (clicks.length === 0) {
    elements.clicksTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No click events recorded yet.</td></tr>`;
    return;
  }

  elements.clicksTbody.innerHTML = clicks.map(c => `
    <tr>
      <td style="font-family: monospace; font-size: 0.75rem;">${escapeHTML(c.id)}</td>
      <td style="font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(c.productName)}</td>
      <td><span class="platform-badge platform-${(c.platform || 'other').toLowerCase()}" style="position: static; font-size: 0.65rem; padding: 2px 6px;">${escapeHTML(c.platform)}</span></td>
      <td style="font-family: monospace; font-size: 0.72rem; color: var(--text-muted);">${escapeHTML(c.sessionId)}</td>
      <td style="font-size: 0.78rem;">${formatTimeAgo(c.timestamp)}</td>
      <td>${c.isRateLimited ? '<span style="color: #ef4444; font-weight: 700;">Rate Limited</span>' : '<span style="color: #10b981; font-weight: 600;">Valid Intent</span>'}</td>
    </tr>
  `).join('');
}

/**
 * 5. Sales & Commission Reconciliation Tab
 */
function setupSalesReconciliation() {
  // Export Sales Ledger to CSV
  elements.exportSalesCsvBtn?.addEventListener('click', () => {
    const cols = [
      { key: 'externalOrderId', label: 'Order ID' },
      { key: 'platform', label: 'Platform' },
      { key: 'productName', label: 'Product Name' },
      { key: 'saleAmount', label: 'Sale Amount' },
      { key: 'commissionRate', label: 'Commission Rate %' },
      { key: 'commissionEarned', label: 'Commission Earned' },
      { key: 'status', label: 'Status' },
      { key: 'orderedAt', label: 'Order Date' },
      { key: 'source', label: 'Data Source' },
    ];
    const csv = generateCSV(state.sales, cols);
    triggerFileDownload(csv, `AffiliateMart_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Sales ledger exported to CSV', 'success');
  });

  // Open CSV Import Modal
  elements.importSalesCsvBtn?.addEventListener('click', () => {
    if (elements.salesCsvFileInput) elements.salesCsvFileInput.value = '';
    if (elements.salesCsvTextInput) elements.salesCsvTextInput.value = '';
    openModal(elements.importSalesModal);
  });

  elements.importSalesCloseBtn?.addEventListener('click', () => closeModal(elements.importSalesModal));
  elements.importSalesCancelBtn?.addEventListener('click', () => closeModal(elements.importSalesModal));

  // Process File Input
  elements.salesCsvFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (elements.salesCsvTextInput) elements.salesCsvTextInput.value = evt.target.result;
      };
      reader.readAsText(file);
    }
  });

  // Submit CSV Import
  elements.importSalesSubmitBtn?.addEventListener('click', () => {
    const text = elements.salesCsvTextInput?.value.trim();
    if (!text) {
      showToast('Please provide CSV content or upload a CSV file.', 'error');
      return;
    }

    try {
      const { importedCount, skippedDuplicates } = importSalesFromCSV(text, 'admin');
      closeModal(elements.importSalesModal);
      loadData();
      renderSalesTable();
      renderOverview();
      showToast(`Imported ${importedCount} verified records. (${skippedDuplicates} duplicates skipped for idempotency)`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function renderSalesTable() {
  if (!elements.salesTbody) return;

  const sales = state.sales;
  const currency = state.settings.currencySymbol || '₹';

  if (elements.salesRecordsCount) elements.salesRecordsCount.textContent = sales.length;

  const confirmedSum = sales.filter(s => s.status === 'Confirmed').reduce((a, s) => a + (s.commissionEarned || 0), 0);
  const paidSum = sales.filter(s => s.status === 'Paid').reduce((a, s) => a + (s.commissionEarned || 0), 0);
  const pendingSum = sales.filter(s => s.status === 'Pending').reduce((a, s) => a + (s.commissionEarned || 0), 0);
  const cancelledSum = sales.filter(s => s.status === 'Cancelled' || s.status === 'Reversed').reduce((a, s) => a + (s.commissionEarned || 0), 0);

  if (elements.salesConfirmedVal) elements.salesConfirmedVal.textContent = formatCurrency(confirmedSum, currency);
  if (elements.salesPaidVal) elements.salesPaidVal.textContent = formatCurrency(paidSum, currency);
  if (elements.salesPendingVal) elements.salesPendingVal.textContent = formatCurrency(pendingSum, currency);
  if (elements.salesCancelledVal) elements.salesCancelledVal.textContent = formatCurrency(cancelledSum, currency);

  if (sales.length === 0) {
    elements.salesTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No verified affiliate orders imported yet.</td></tr>`;
    return;
  }

  elements.salesTbody.innerHTML = sales.map(s => `
    <tr data-sale-id="${s.id}">
      <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${escapeHTML(s.externalOrderId)}</td>
      <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(s.productName)}</td>
      <td>${escapeHTML(s.platform)}</td>
      <td style="font-weight: 600;">${formatCurrency(s.saleAmount, currency)}</td>
      <td style="font-size: 0.8rem;">${s.commissionRate}%</td>
      <td style="font-weight: 800; color: #15803d;">${formatCurrency(s.commissionEarned, currency)}</td>
      <td><span class="badge-soft badge-soft-${(s.status || 'pending').toLowerCase()}">${escapeHTML(s.status)}</span></td>
      <td style="font-size: 0.725rem; color: var(--text-muted);">${escapeHTML(s.source)}</td>
      <td style="text-align: right;">
        <select class="form-control sale-status-select" data-id="${s.id}" style="font-size: 0.75rem; padding: 3px 6px; width: auto; display: inline-block;">
          ${COMMISSION_STATUSES.map(st => `
            <option value="${st}" ${st === s.status ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </td>
    </tr>
  `).join('');

  // Handle status update change
  elements.salesTbody.querySelectorAll('.sale-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const id = sel.dataset.id;
      const newStatus = e.target.value;
      updateSaleStatus(id, newStatus, 'admin');
      loadData();
      renderSalesTable();
      renderOverview();
      showToast(`Order status updated to ${newStatus}`, 'info');
    });
  });
}

/**
 * 6. Audit Trail Logs Tab
 */
function renderAuditTable() {
  if (!elements.auditTbody) return;

  const logs = state.auditLogs;
  if (elements.auditLogCount) elements.auditLogCount.textContent = logs.length;

  if (logs.length === 0) {
    elements.auditTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No audit logs recorded yet.</td></tr>`;
    return;
  }

  elements.auditTbody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-size: 0.75rem; color: var(--text-muted);">${formatTimeAgo(l.timestamp)}</td>
      <td style="font-weight: 700; color: var(--primary);">${escapeHTML(l.actor)}</td>
      <td><code style="font-size: 0.75rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${escapeHTML(l.action)}</code></td>
      <td style="font-size: 0.75rem;">${escapeHTML(l.targetType)}: ${escapeHTML(l.targetId)}</td>
      <td style="font-size: 0.8rem; color: var(--text-body);">${escapeHTML(l.details)}</td>
    </tr>
  `).join('');

  elements.exportAuditCsvBtn?.addEventListener('click', () => {
    const cols = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'actor', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'targetType', label: 'Target Type' },
      { key: 'targetId', label: 'Target ID' },
      { key: 'details', label: 'Details' },
    ];
    const csv = generateCSV(state.auditLogs, cols);
    triggerFileDownload(csv, `AffiliateMart_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Audit trail exported to CSV', 'success');
  });
}

/**
 * 7. Product CRUD & Delegated Actions
 */
function setupProductForm() {
  const openAddModal = () => {
    state.editingProductId = null;
    if (elements.productModalTitle) elements.productModalTitle.textContent = 'Add New Affiliate Deal';
    elements.productForm?.reset();
    if (elements.prodId) elements.prodId.value = '';
    if (elements.prodDiscountPreview) elements.prodDiscountPreview.textContent = '';
    if (elements.prodImagePreview) elements.prodImagePreview.src = PLACEHOLDER_IMAGE;
    if (elements.prodIsPinned) elements.prodIsPinned.checked = false;
    openModal(elements.productModal);
  };

  elements.quickAddBtn?.addEventListener('click', openAddModal);
  elements.adminAddBtn?.addEventListener('click', openAddModal);

  elements.productModalCloseBtn?.addEventListener('click', () => closeModal(elements.productModal));
  elements.productModalCancelBtn?.addEventListener('click', () => closeModal(elements.productModal));

  // Live discount preview
  const updateDiscountCalc = () => {
    const sell = parseFloat(elements.prodSellingPrice?.value);
    const orig = parseFloat(elements.prodOriginalPrice?.value);
    if (!isNaN(sell) && !isNaN(orig) && orig > sell) {
      const disc = calculateDiscount(sell, orig);
      if (elements.prodDiscountPreview) elements.prodDiscountPreview.textContent = `Calculated Discount: ${disc}% OFF`;
    } else {
      if (elements.prodDiscountPreview) elements.prodDiscountPreview.textContent = '';
    }
  };

  elements.prodSellingPrice?.addEventListener('input', updateDiscountCalc);
  elements.prodOriginalPrice?.addEventListener('input', updateDiscountCalc);

  elements.prodImageUrl?.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (elements.prodImagePreview) elements.prodImagePreview.src = url || PLACEHOLDER_IMAGE;
  });

  elements.previewImageTrigger?.addEventListener('click', () => {
    const url = elements.prodImageUrl?.value.trim();
    if (url && elements.prodImagePreview) {
      elements.prodImagePreview.src = url;
      showToast('Loaded image preview', 'info');
    }
  });

  elements.presetImageSuggest?.addEventListener('click', () => {
    const rand = PRESET_SAMPLE_IMAGES[Math.floor(Math.random() * PRESET_SAMPLE_IMAGES.length)];
    if (elements.prodImageUrl) elements.prodImageUrl.value = rand;
    if (elements.prodImagePreview) elements.prodImagePreview.src = rand;
  });

  elements.productForm?.addEventListener('submit', handleProductSubmit);

  // Global Delegated table actions (Edit, Toggle Status, Archive, Restore, Permanent Delete)
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      startEditingProduct(editBtn.dataset.id);
      return;
    }

    const togglePinBtn = e.target.closest('.toggle-pin-btn');
    if (togglePinBtn) {
      const id = togglePinBtn.dataset.id;
      if (id) {
        togglePinProduct(id, 'admin').then((isNowPinned) => {
          loadData();
          renderProductsTable();
          renderOverview();
          const targetP = state.products.find(p => p.id === id);
          const nameSnippet = targetP ? `"${targetP.name.slice(0, 24)}..."` : 'Product';
          showToast(isNowPinned ? `${nameSnippet} pinned to the top of catalog!` : `${nameSnippet} unpinned from top.`, 'success');
        }).catch((err) => {
          showToast('Failed to toggle pin: ' + err.message, 'error');
        });
      }
      return;
    }

    const toggleBtn = e.target.closest('.toggle-status-btn');
    if (toggleBtn) {
      toggleProductStatus(toggleBtn.dataset.id);
      return;
    }

    const archiveBtn = e.target.closest('.archive-btn');
    if (archiveBtn) {
      confirmArchiveProduct(archiveBtn.dataset.id);
      return;
    }

    const restoreBtn = e.target.closest('.restore-btn');
    if (restoreBtn) {
      restoreProductById(restoreBtn.dataset.id, 'admin');
      loadData();
      renderArchiveTable();
      renderProductsTable();
      renderOverview();
      showToast('Product restored to active catalog', 'success');
      return;
    }

    const permDeleteBtn = e.target.closest('.permanent-delete-btn');
    if (permDeleteBtn) {
      confirmPermanentDelete(permDeleteBtn.dataset.id);
      return;
    }
  });
}

function handleProductSubmit(e) {
  e.preventDefault();

  const name = elements.prodName?.value.trim();
  const platform = elements.prodPlatform?.value;
  const category = elements.prodCategory?.value;
  const sellingPrice = parseFloat(elements.prodSellingPrice?.value);
  const originalPrice = elements.prodOriginalPrice?.value ? parseFloat(elements.prodOriginalPrice.value) : null;
  const imageUrl = elements.prodImageUrl?.value.trim();
  const affiliateUrl = elements.prodAffiliateUrl?.value.trim();
  const description = elements.prodDesc?.value.trim();
  const isFeatured = !!elements.prodIsFeatured?.checked;
  const isPinned = !!elements.prodIsPinned?.checked;
  const status = elements.prodStatus?.value || 'active';

  if (!name || name.length < 3) {
    showToast('Product name must be at least 3 characters.', 'error');
    elements.prodName?.focus();
    return;
  }

  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    showToast('Please enter a valid selling price greater than 0.', 'error');
    elements.prodSellingPrice?.focus();
    return;
  }

  if (originalPrice !== null && (isNaN(originalPrice) || originalPrice < sellingPrice)) {
    showToast('Original MRP must be greater than or equal to selling price.', 'error');
    elements.prodOriginalPrice?.focus();
    return;
  }

  if (!imageUrl) {
    showToast('Please provide a valid product image URL.', 'error');
    elements.prodImageUrl?.focus();
    return;
  }

  if (!affiliateUrl) {
    showToast('Please enter the affiliate destination URL.', 'error');
    elements.prodAffiliateUrl?.focus();
    return;
  }

  try {
    const parsed = new URL(affiliateUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch (err) {
    showToast('Affiliate URL must be a valid link starting with http:// or https://', 'error');
    elements.prodAffiliateUrl?.focus();
    return;
  }

  const payload = {
    id: elements.prodId?.value || undefined,
    name,
    platform,
    category,
    sellingPrice,
    originalPrice,
    imageUrl,
    affiliateUrl,
    description,
    isFeatured,
    isPinned,
    status,
  };

  const isEditing = !!payload.id;
  upsertProduct(payload, 'admin');

  closeModal(elements.productModal);
  loadData();
  renderProductsTable();
  renderOverview();

  showToast(isEditing ? 'Product deal updated successfully!' : 'New affiliate deal added to catalog!', 'success');
}

function startEditingProduct(id) {
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  state.editingProductId = id;

  if (elements.productModalTitle) elements.productModalTitle.textContent = 'Edit Affiliate Product';
  if (elements.prodId) elements.prodId.value = prod.id;
  if (elements.prodName) elements.prodName.value = prod.name;
  if (elements.prodPlatform) elements.prodPlatform.value = prod.platform;
  if (elements.prodCategory) elements.prodCategory.value = prod.category;
  if (elements.prodSellingPrice) elements.prodSellingPrice.value = prod.sellingPrice;
  if (elements.prodOriginalPrice) elements.prodOriginalPrice.value = prod.originalPrice || '';
  if (elements.prodImageUrl) elements.prodImageUrl.value = prod.imageUrl || '';
  if (elements.prodImagePreview) elements.prodImagePreview.src = prod.imageUrl || PLACEHOLDER_IMAGE;
  if (elements.prodAffiliateUrl) elements.prodAffiliateUrl.value = prod.affiliateUrl || '';
  if (elements.prodDesc) elements.prodDesc.value = prod.description || '';
  if (elements.prodIsFeatured) elements.prodIsFeatured.checked = !!prod.isFeatured;
  if (elements.prodIsPinned) elements.prodIsPinned.checked = !!prod.isPinned;
  if (elements.prodStatus) elements.prodStatus.value = prod.status || 'active';

  openModal(elements.productModal);
}

function toggleProductStatus(id) {
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  const newStatus = prod.status === 'active' ? 'hidden' : 'active';
  upsertProduct({ ...prod, status: newStatus }, 'admin');
  loadData();
  renderProductsTable();
  renderOverview();

  showToast(`Product is now ${newStatus === 'active' ? 'Active' : 'Hidden'}`, 'info');
}

/**
 * Confirm Modals for Safe Archival & Deletion
 */
function setupConfirmModal() {
  elements.confirmModalClose?.addEventListener('click', () => closeModal(elements.confirmModal));
  elements.confirmCancelBtn?.addEventListener('click', () => closeModal(elements.confirmModal));

  elements.confirmOkBtn?.addEventListener('click', () => {
    if (state.pendingDeleteId) {
      if (state.pendingDeleteType === 'soft') {
        archiveProductById(state.pendingDeleteId, 'admin');
        showToast('Product moved to Recycle Bin (Archived)', 'info');
      } else {
        permanentlyDeleteProductById(state.pendingDeleteId, 'admin');
        showToast('Product permanently purged from database', 'success');
      }
      closeModal(elements.confirmModal);
      state.pendingDeleteId = null;
      loadData();
      renderProductsTable();
      renderArchiveTable();
      renderOverview();
    }
  });
}

function confirmArchiveProduct(id) {
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  state.pendingDeleteId = id;
  state.pendingDeleteType = 'soft';

  if (elements.confirmModalTitle) elements.confirmModalTitle.textContent = 'Move to Recycle Bin?';
  if (elements.confirmModalMessage) {
    elements.confirmModalMessage.innerHTML = `Move <strong>"${escapeHTML(prod.name)}"</strong> to the archive? It will be hidden from the store but can be restored at any time.`;
  }
  if (elements.confirmOkBtn) {
    elements.confirmOkBtn.textContent = 'Move to Archive';
    elements.confirmOkBtn.style.background = '#f59e0b';
  }

  openModal(elements.confirmModal);
}

function confirmPermanentDelete(id) {
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  state.pendingDeleteId = id;
  state.pendingDeleteType = 'permanent';

  if (elements.confirmModalTitle) elements.confirmModalTitle.textContent = 'Permanently Purge?';
  if (elements.confirmModalMessage) {
    elements.confirmModalMessage.innerHTML = `⚠️ This will permanently remove <strong>"${escapeHTML(prod.name)}"</strong> from the database. This action cannot be undone.`;
  }
  if (elements.confirmOkBtn) {
    elements.confirmOkBtn.textContent = 'Permanently Purge';
    elements.confirmOkBtn.style.background = '#ef4444';
  }

  openModal(elements.confirmModal);
}

/**
 * 8. Settings & Disaster Recovery
 */
function setupSettingsForm() {
  elements.settingAnnouncementEnabled?.addEventListener('change', (e) => {
    if (elements.announcementTextGroup) {
      elements.announcementTextGroup.style.display = e.target.checked ? 'block' : 'none';
    }
  });

  // Live real-time updates for Festival & Banner controls
  elements.settingBannerEnabled?.addEventListener('change', updateAdminBannerPreview);
  elements.settingFestivalName?.addEventListener('input', updateAdminBannerPreview);
  elements.settingBannerTitle?.addEventListener('input', updateAdminBannerPreview);
  elements.settingBannerSubtitle?.addEventListener('input', updateAdminBannerPreview);
  elements.settingBannerTheme?.addEventListener('change', updateAdminBannerPreview);
  elements.settingCustomBannerImageUrl?.addEventListener('input', updateAdminBannerPreview);
  elements.settingDiscountOfferEnabled?.addEventListener('change', updateAdminBannerPreview);
  elements.settingDiscountOfferText?.addEventListener('input', updateAdminBannerPreview);

  elements.settingsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newSettings = {
      storeName: elements.settingStoreName?.value.trim() || 'AffiliateMart',
      storeTagline: elements.settingStoreTagline?.value.trim() || '',
      currencySymbol: elements.settingCurrency?.value.trim() || '₹',
      contactEmail: elements.settingContactEmail?.value.trim() || '',
      isAnnouncementEnabled: !!elements.settingAnnouncementEnabled?.checked,
      announcementText: elements.settingAnnouncementText?.value.trim() || '',
      affiliateDisclosureText: elements.settingDisclosureText?.value.trim() || '',

      // Festival & Campaign Banner Settings
      festivalName: elements.settingFestivalName?.value.trim() || 'महा सेल (Maha Sale)',
      bannerTitle: elements.settingBannerTitle?.value.trim() || 'त्योहार महा सेल: अमेज़न, फ्लिपकार्ट और मीशो के बेस्ट ऑफर्स!',
      bannerSubtitle: elements.settingBannerSubtitle?.value.trim() || '',
      isBannerEnabled: !!elements.settingBannerEnabled?.checked,
      discountOfferText: elements.settingDiscountOfferText?.value.trim() || '',
      isDiscountOfferEnabled: !!elements.settingDiscountOfferEnabled?.checked,
      bannerTheme: elements.settingBannerTheme?.value || 'diwali-gold',
      customBannerImageUrl: elements.settingCustomBannerImageUrl?.value.trim() || '',
    };

    saveStoredSettings(newSettings, 'admin');
    loadData();
    updateCurrencyLabels();
    renderOverview();
    updateAdminBannerPreview();
    showToast('Store, festival banner & discount settings saved successfully!', 'success');
  });

  // Demo Reset & Clear
  elements.resetDemoBtn?.addEventListener('click', () => {
    resetToSampleProducts('admin');
    loadData();
    renderDashboard();
    showToast('Reset catalog to sample demo products', 'success');
  });

  elements.clearSamplesBtn?.addEventListener('click', () => {
    clearSampleProducts('admin');
    loadData();
    renderDashboard();
    showToast('Removed demo sample products', 'info');
  });
}

function updateAdminBannerPreview() {
  const festName = elements.settingFestivalName?.value.trim() || 'महा सेल (Maha Sale)';
  const bTitle = elements.settingBannerTitle?.value.trim() || 'त्योहार महा सेल: अमेज़न, फ्लिपकार्ट और मीशो के बेस्ट ऑफर्स!';
  const bSubtitle = elements.settingBannerSubtitle?.value.trim() || 'भारत के सबसे बड़े शॉपिंग प्लेटफॉर्म्स से चुनिंदा डिस्काउंट और कूपन डील्स। सीधे ओरिजिनल स्टोर से खरीदें।';
  const offerText = elements.settingDiscountOfferText?.value.trim() || '💥 सभी कैटेगरीज पर 80% तक की महा छूट + एक्स्ट्रा बैंक ऑफर्स!';
  const isOfferOn = !!elements.settingDiscountOfferEnabled?.checked;
  const isBannerOn = !!elements.settingBannerEnabled?.checked;
  const theme = elements.settingBannerTheme?.value || 'diwali-gold';
  const customImg = elements.settingCustomBannerImageUrl?.value.trim();

  if (elements.previewFestivalName) elements.previewFestivalName.textContent = festName;
  if (elements.previewBannerTitle) elements.previewBannerTitle.textContent = bTitle;
  if (elements.previewBannerSubtitle) elements.previewBannerSubtitle.textContent = bSubtitle;
  if (elements.previewDiscountText) elements.previewDiscountText.textContent = offerText;

  if (elements.previewOfferCallout) {
    elements.previewOfferCallout.style.display = isOfferOn ? 'inline-flex' : 'none';
  }

  if (elements.adminBannerPreview) {
    elements.adminBannerPreview.style.opacity = isBannerOn ? '1' : '0.4';
    elements.adminBannerPreview.className = `hero-banner theme-${theme}`;
    if (theme === 'custom-image' && customImg) {
      elements.adminBannerPreview.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${customImg}')`;
      elements.adminBannerPreview.style.backgroundSize = 'cover';
      elements.adminBannerPreview.style.backgroundPosition = 'center';
    } else {
      elements.adminBannerPreview.style.backgroundImage = '';
    }
  }

  if (elements.customBannerImageGroup) {
    elements.customBannerImageGroup.style.display = theme === 'custom-image' ? 'block' : 'none';
  }

  if (elements.bannerControlsGroup) {
    elements.bannerControlsGroup.style.display = isBannerOn ? 'block' : 'none';
  }
}

function populateSettingsForm() {
  const s = state.settings;
  if (elements.settingStoreName) elements.settingStoreName.value = s.storeName || 'AffiliateMart';
  if (elements.settingCurrency) elements.settingCurrency.value = s.currencySymbol || '₹';
  if (elements.settingStoreTagline) elements.settingStoreTagline.value = s.storeTagline || '';
  if (elements.settingContactEmail) elements.settingContactEmail.value = s.contactEmail || '';
  if (elements.settingAnnouncementEnabled) elements.settingAnnouncementEnabled.checked = !!s.isAnnouncementEnabled;
  if (elements.settingAnnouncementText) elements.settingAnnouncementText.value = s.announcementText || '';
  if (elements.settingDisclosureText) elements.settingDisclosureText.value = s.affiliateDisclosureText || '';

  if (elements.announcementTextGroup) {
    elements.announcementTextGroup.style.display = s.isAnnouncementEnabled ? 'block' : 'none';
  }

  // Festival & Campaign Banner Population
  if (elements.settingFestivalName) elements.settingFestivalName.value = s.festivalName || 'महा सेल (Maha Sale)';
  if (elements.settingBannerTitle) elements.settingBannerTitle.value = s.bannerTitle || 'त्योहार महा सेल: अमेज़न, फ्लिपकार्ट और मीशो के बेस्ट ऑफर्स!';
  if (elements.settingBannerSubtitle) elements.settingBannerSubtitle.value = s.bannerSubtitle !== undefined ? s.bannerSubtitle : 'भारत के सबसे बड़े शॉपिंग प्लेटफॉर्म्स से चुनिंदा डिस्काउंट और कूपन डील्स। सीधे ओरिजिनल स्टोर से खरीदें।';
  if (elements.settingBannerEnabled) elements.settingBannerEnabled.checked = s.isBannerEnabled !== undefined ? !!s.isBannerEnabled : true;
  if (elements.settingDiscountOfferText) elements.settingDiscountOfferText.value = s.discountOfferText || '💥 सभी कैटेगरीज पर 80% तक की महा छूट + एक्स्ट्रा बैंक ऑफर्स!';
  if (elements.settingDiscountOfferEnabled) elements.settingDiscountOfferEnabled.checked = s.isDiscountOfferEnabled !== undefined ? !!s.isDiscountOfferEnabled : true;
  if (elements.settingBannerTheme) elements.settingBannerTheme.value = s.bannerTheme || 'diwali-gold';
  if (elements.settingCustomBannerImageUrl) elements.settingCustomBannerImageUrl.value = s.customBannerImageUrl || '';

  updateAdminBannerPreview();
}

function setupBackupAndRestore() {
  // Download Backup JSON
  elements.downloadBackupBtn?.addEventListener('click', () => {
    const jsonStr = createSystemBackupJSON();
    triggerFileDownload(jsonStr, `AffiliateMart_Backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('Database backup snapshot downloaded!', 'success');
  });

  // Restore from JSON File
  elements.restoreJsonFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const res = restoreSystemFromJSON(evt.target.result, 'admin');
        loadData();
        renderDashboard();
        showToast(`Database restored! (${res.productsCount} products, ${res.salesCount} sales records)`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  // Force push all catalog deals to live Cloud Firestore
  elements.forceFirebaseSyncBtn?.addEventListener('click', async () => {
    try {
      showToast('Pushing deals to Cloud Firestore (kunal-a9793)...', 'info');
      const all = state.products;
      let count = 0;
      for (const p of all) {
        await setDoc(doc(db, 'products', p.id), p, { merge: true });
        count++;
      }
      showToast(`Successfully pushed ${count} products to Cloud Firestore!`, 'success');
    } catch (err) {
      showToast(`Firestore Sync Error: ${err.message}`, 'error');
    }
  });
}

function updateCurrencyLabels() {
  const cur = state.settings.currencySymbol || '₹';
  document.querySelectorAll('.currency-label').forEach(el => {
    el.textContent = cur;
  });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const d = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  document.body.style.overflow = '';
}

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

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Register PWA Service Worker in Admin
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', initAdmin);
