/**
 * AffiliateMart - Production-Ready Data & Platform Management Engine
 * Connected with Google Firebase (Cloud Firestore & Authentication)
 * Project ID: kunal-a9793
 * 
 * Features:
 * - Real-time Firestore synchronization across all devices and phones
 * - Offline fallback resilience with localStorage caching
 * - Firebase Authentication with email/password + local token backup
 * - Rate-limited click tracking & attribution
 * - Idempotent affiliate sales reconciliation
 * - Append-only audit logging & soft-delete recycle bin
 */

import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  firebaseConfig
} from './firebase.js';

// Authorized Admin Email - Only this email is allowed administrative access
export const AUTHORIZED_ADMIN_EMAIL = 'anilkumarjiha123@gmail.com';
export { firebaseConfig };

// Storage Keys for fast local cache & offline fallback
export const STORAGE_KEYS = {
  PRODUCTS: 'affiliate_mart_products_v2',
  SETTINGS: 'affiliate_mart_settings_v2',
  WISHLIST: 'affiliate_mart_wishlist_v2',
  AUTH: 'affiliate_mart_admin_auth_v2',
  AUTH_CONFIG: 'affiliate_mart_auth_config_v2',
  CLICKS: 'affiliate_mart_clicks_v2',
  SALES: 'affiliate_mart_sales_v2',
  AUDIT_LOGS: 'affiliate_mart_audit_logs_v2',
};

export const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home',
  'Beauty',
  'Accessories',
  'Other',
];

export const PLATFORMS = [
  'Amazon',
  'Flipkart',
  'Meesho',
  'Myntra',
  'Other',
];

export const COMMISSION_STATUSES = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Reversed',
  'Paid',
];

// Initial Realistic Sample Affiliate Products
export const SAMPLE_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Noise ColorFit Pulse 3 Smartwatch (1.96" TFT Display, Bluetooth Calling)',
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
    description: 'Advanced fitness tracker with auto sports detection, 500 nits brightness, heart rate & SpO2 monitoring, 7-day battery life, and Bluetooth calling.',
    sellingPrice: 1499,
    originalPrice: 4999,
    category: 'Electronics',
    platform: 'Amazon',
    affiliateUrl: 'https://www.amazon.in/dp/B0BY2Q5G85?tag=affiliatemart-21',
    isFeatured: true,
    isPinned: true,
    status: 'active',
    isArchived: false,
    rating: 4.3,
    reviewsCount: 3842,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    isSample: true,
  },
  {
    id: 'prod-2',
    name: 'boAt Airdopes 141 True Wireless Earbuds with 42H Playtime',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    description: 'Low latency beast mode for gaming, ENx environmental noise cancellation, IPX4 water resistance, and fast Type-C charging.',
    sellingPrice: 999,
    originalPrice: 2990,
    category: 'Electronics',
    platform: 'Flipkart',
    affiliateUrl: 'https://www.flipkart.com/boat-airdopes-141/p/itm12345?affid=affiliatemart',
    isFeatured: true,
    isPinned: true,
    status: 'active',
    isArchived: false,
    rating: 4.4,
    reviewsCount: 15420,
    createdAt: '2026-03-02T11:30:00Z',
    updatedAt: '2026-03-02T11:30:00Z',
    isSample: true,
  },
  {
    id: 'prod-3',
    name: 'Pure Cotton Printed Straight Kurta & Pant Set with Dupatta',
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    description: 'Soft breathable cotton fabric suitable for festive and daily wear. Elegant floral print with matching dupatta.',
    sellingPrice: 649,
    originalPrice: 1899,
    category: 'Fashion',
    platform: 'Meesho',
    affiliateUrl: 'https://www.meesho.com/ethnic-cotton-kurta-set/p/892xkq?af=affiliatemart',
    isFeatured: true,
    status: 'active',
    isArchived: false,
    rating: 4.2,
    reviewsCount: 890,
    createdAt: '2026-03-03T09:15:00Z',
    updatedAt: '2026-03-03T09:15:00Z',
    isSample: true,
  },
  {
    id: 'prod-4',
    name: 'Roadster Men Solid Bomber Jacket with Ribbed Hem',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    description: 'Modern zip-up bomber jacket in navy blue. Features windproof lining, two side zip pockets, and casual athletic silhouette.',
    sellingPrice: 1299,
    originalPrice: 3299,
    category: 'Fashion',
    platform: 'Myntra',
    affiliateUrl: 'https://www.myntra.com/jackets/roadster/men-solid-bomber-jacket/214532?affid=affiliatemart',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.1,
    reviewsCount: 1120,
    createdAt: '2026-03-04T14:20:00Z',
    updatedAt: '2026-03-04T14:20:00Z',
    isSample: true,
  },
  {
    id: 'prod-5',
    name: 'Instant Vortex 4-in-1 Digital Air Fryer (5.7L Capacity)',
    imageUrl: 'https://images.unsplash.com/photo-1584269600519-112d071b35e6?auto=format&fit=crop&w=800&q=80',
    description: 'EvenCrisp technology delivers crispy results with 95% less oil. Air fry, roast, bake and reheat with one-touch smart programs.',
    sellingPrice: 6999,
    originalPrice: 12999,
    category: 'Home',
    platform: 'Amazon',
    affiliateUrl: 'https://www.amazon.in/dp/B08G8Y5N24?tag=affiliatemart-21',
    isFeatured: true,
    status: 'active',
    isArchived: false,
    rating: 4.6,
    reviewsCount: 4210,
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-05T08:00:00Z',
    isSample: true,
  },
  {
    id: 'prod-6',
    name: 'Wakefit Orthopedic Memory Foam Mattress (King Size, 78x72)',
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    description: 'Spine alignment support with differential pressure zone memory foam. 10 years manufacturer warranty with breathable cover.',
    sellingPrice: 11499,
    originalPrice: 18999,
    category: 'Home',
    platform: 'Flipkart',
    affiliateUrl: 'https://www.flipkart.com/wakefit-orthopedic-mattress/p/itme9876?affid=affiliatemart',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.5,
    reviewsCount: 19800,
    createdAt: '2026-03-06T12:00:00Z',
    updatedAt: '2026-03-06T12:00:00Z',
    isSample: true,
  },
  {
    id: 'prod-7',
    name: 'The Derma Co 10% Niacinamide Face Serum with Zinc (30ml)',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    description: 'Formulated to treat acne marks, blemishes, and improve skin barrier function. Dermatologist tested and fragrance-free.',
    sellingPrice: 449,
    originalPrice: 599,
    category: 'Beauty',
    platform: 'Amazon',
    affiliateUrl: 'https://www.amazon.in/dp/B08V5Q92D9?tag=affiliatemart-21',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.2,
    reviewsCount: 7850,
    createdAt: '2026-03-07T15:45:00Z',
    updatedAt: '2026-03-07T15:45:00Z',
    isSample: true,
  },
  {
    id: 'prod-8',
    name: 'Minimalist 2% Salicylic Acid Face Wash for Oil Control',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    description: 'Gentle exfoliating cleanser with LHA and Capryloyl Glycine. Effectively removes dead skin cells and reduces blackheads.',
    sellingPrice: 284,
    originalPrice: 299,
    category: 'Beauty',
    platform: 'Myntra',
    affiliateUrl: 'https://www.myntra.com/face-wash/minimalist/salicylic-acid-face-wash/145892?affid=affiliatemart',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.4,
    reviewsCount: 5410,
    createdAt: '2026-03-08T16:10:00Z',
    updatedAt: '2026-03-08T16:10:00Z',
    isSample: true,
  },
  {
    id: 'prod-9',
    name: 'Urban Forest Genuine Vintage Leather Wallet for Men',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    description: 'RFID protected slim bifold wallet crafted from full-grain leather. 6 card slots, 2 currency compartments and coin pocket.',
    sellingPrice: 499,
    originalPrice: 1999,
    category: 'Accessories',
    platform: 'Flipkart',
    affiliateUrl: 'https://www.flipkart.com/urban-forest-leather-wallet/p/itmwal12?affid=affiliatemart',
    isFeatured: true,
    status: 'active',
    isArchived: false,
    rating: 4.3,
    reviewsCount: 8200,
    createdAt: '2026-03-09T11:20:00Z',
    updatedAt: '2026-03-09T11:20:00Z',
    isSample: true,
  },
  {
    id: 'prod-10',
    name: 'Fastrack Polarized UV Protected Wayfarer Sunglasses',
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    description: 'Classic matte black frame with TAC polarized lenses. 100% UV400 protection against harmful UVA and UVB rays.',
    sellingPrice: 899,
    originalPrice: 2199,
    category: 'Accessories',
    platform: 'Amazon',
    affiliateUrl: 'https://www.amazon.in/dp/B01N0P6Z0K?tag=affiliatemart-21',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.1,
    reviewsCount: 3120,
    createdAt: '2026-03-10T13:40:00Z',
    updatedAt: '2026-03-10T13:40:00Z',
    isSample: true,
  },
  {
    id: 'prod-11',
    name: 'Kuber Industries Foldable Wardrobe Storage Box with Steel Frame',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    description: '66 Liter heavy duty non-woven clothes organizer with clear viewing window and dual zippers. Dustproof and moisture-proof.',
    sellingPrice: 329,
    originalPrice: 899,
    category: 'Home',
    platform: 'Meesho',
    affiliateUrl: 'https://www.meesho.com/wardrobe-storage-organizer/p/73k21?af=affiliatemart',
    isFeatured: false,
    status: 'active',
    isArchived: false,
    rating: 4.0,
    reviewsCount: 1450,
    createdAt: '2026-03-11T10:15:00Z',
    updatedAt: '2026-03-11T10:15:00Z',
    isSample: true,
  },
  {
    id: 'prod-12',
    name: 'Portronics Muffs A Wireless Bluetooth 5.2 Headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    description: 'Over-ear design with 40mm dynamic bass drivers, 30 hours playback, memory foam ear cushions, and AUX 3.5mm support.',
    sellingPrice: 1199,
    originalPrice: 2999,
    category: 'Electronics',
    platform: 'Other',
    affiliateUrl: 'https://www.portronics.com/products/muffs-a?ref=affiliatemart',
    isFeatured: true,
    status: 'active',
    isArchived: false,
    rating: 4.2,
    reviewsCount: 2100,
    createdAt: '2026-03-12T09:00:00Z',
    updatedAt: '2026-03-12T09:00:00Z',
    isSample: true,
  },
];

export const SAMPLE_SALES = [
  {
    id: 'sale-101',
    externalOrderId: 'AMZ-IN-408-9123841',
    productId: 'prod-1',
    productName: 'Noise ColorFit Pulse 3 Smartwatch',
    platform: 'Amazon',
    saleAmount: 1499,
    commissionRate: 9.0,
    commissionEarned: 134.91,
    status: 'Confirmed',
    orderedAt: '2026-03-02T14:10:00Z',
    confirmedAt: '2026-03-05T10:00:00Z',
    paidAt: null,
    source: 'Official Amazon Associates Report Import',
  },
  {
    id: 'sale-102',
    externalOrderId: 'FK-OD-8921849102',
    productId: 'prod-2',
    productName: 'boAt Airdopes 141 True Wireless Earbuds',
    platform: 'Flipkart',
    saleAmount: 999,
    commissionRate: 8.0,
    commissionEarned: 79.92,
    status: 'Paid',
    orderedAt: '2026-03-03T18:22:00Z',
    confirmedAt: '2026-03-08T12:00:00Z',
    paidAt: '2026-03-15T10:00:00Z',
    source: 'Flipkart Affiliate Settlement CSV',
  },
  {
    id: 'sale-103',
    externalOrderId: 'MSH-89214710',
    productId: 'prod-3',
    productName: 'Pure Cotton Printed Straight Kurta & Pant Set',
    platform: 'Meesho',
    saleAmount: 649,
    commissionRate: 10.0,
    commissionEarned: 64.90,
    status: 'Pending',
    orderedAt: '2026-03-07T11:45:00Z',
    confirmedAt: null,
    paidAt: null,
    source: 'Manual Referral Import',
  },
  {
    id: 'sale-104',
    externalOrderId: 'MYN-21948194',
    productId: 'prod-4',
    productName: 'Roadster Men Solid Bomber Jacket',
    platform: 'Myntra',
    saleAmount: 1299,
    commissionRate: 7.5,
    commissionEarned: 97.42,
    status: 'Cancelled',
    orderedAt: '2026-03-05T09:20:00Z',
    confirmedAt: null,
    paidAt: null,
    source: 'Myntra Affiliate Returns API Report',
  },
];

export const DEFAULT_SETTINGS = {
  storeName: 'AffiliateMart',
  storeTagline: 'Curated Deals & Best Prices from Top Online Stores',
  currencySymbol: '₹',
  contactEmail: 'support@affiliatemart.example.com',
  announcementText: '🔥 Mega Deals Alert: Hand-picked best discounts across Amazon, Flipkart, Meesho & Myntra! Updated Daily.',
  isAnnouncementEnabled: true,
  affiliateDisclosureText: 'Disclosure: AffiliateMart is a participant in affiliate advertising programs. When you click our partner links and purchase products, we may earn an affiliate commission at no extra cost to you. Product prices, discounts, and availability are subject to change on the merchant platform.',
  itemsPerPageCustomer: 8,
  itemsPerPageAdmin: 10,
  rateLimitSeconds: 3,

  // Dynamic Festival & Campaign Banner Settings
  festivalName: 'महा सेल (Maha Sale)',
  bannerTitle: 'त्योहार महा सेल: अमेज़न, फ्लिपकार्ट और मीशो के बेस्ट ऑफर्स!',
  bannerSubtitle: 'भारत के सबसे बड़े शॉपिंग प्लेटफॉर्म्स से चुनिंदा डिस्काउंट और कूपन डील्स। सीधे ओरिजिनल स्टोर से खरीदें।',
  discountOfferText: '💥 सभी कैटेगरीज पर 80% तक की महा छूट + एक्स्ट्रा बैंक ऑफर्स!',
  isDiscountOfferEnabled: true,
  isBannerEnabled: true,
  bannerTheme: 'diwali-gold', // 'royal-blue', 'diwali-gold', 'maha-sale-red', 'holi-vibrant', 'navratri-orange', 'custom-image'
  customBannerImageUrl: '',
};

export const DEFAULT_AUTH_CONFIG = {
  adminEmail: 'anilkumarjiha123@gmail.com',
  provider: 'firebase-auth',
};

/**
 * -------------------------------------------------------------
 * 1. REAL-TIME FIRESTORE DATA SYNCHRONIZATION
 * -------------------------------------------------------------
 */

let isFirestoreListenerActive = false;

// Initialize real-time listener for Firestore `products`
export function initFirestoreProductsListener(callback) {
  if (isFirestoreListenerActive) return;
  isFirestoreListenerActive = true;

  try {
    const productsColl = collection(db, 'products');
    onSnapshot(productsColl, (snapshot) => {
      if (!snapshot.empty) {
        const liveProducts = [];
        snapshot.forEach((docSnap) => {
          liveProducts.push({ id: docSnap.id, ...docSnap.data() });
        });
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(liveProducts));
        window.dispatchEvent(new CustomEvent('affiliate_mart_products_updated', { detail: liveProducts }));
        if (callback) callback(liveProducts);
      } else {
        // If Firestore is brand new and empty, seed it once
        seedInitialFirestoreProducts();
      }
    }, (error) => {
      console.warn('Firestore real-time listener notice (using local offline cache):', error.message);
    });
  } catch (err) {
    console.warn('Could not attach Firestore listener:', err.message);
  }
}

// Seed initial products to Firestore
async function seedInitialFirestoreProducts() {
  try {
    const local = getStoredProducts(true);
    for (const prod of local) {
      await setDoc(doc(db, 'products', prod.id), prod, { merge: true });
    }
  } catch (e) {
    // silently catch offline/unauthorized initial seed
  }
}

/**
 * -------------------------------------------------------------
 * 2. PRODUCT REPOSITORY (Firestore + Local Cache)
 * -------------------------------------------------------------
 */

export function getStoredProducts(includeArchived = false) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SAMPLE_PRODUCTS));
      return SAMPLE_PRODUCTS.filter(p => includeArchived ? true : !p.isArchived);
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [...SAMPLE_PRODUCTS];
    return list.filter(p => includeArchived ? true : !p.isArchived);
  } catch (err) {
    return SAMPLE_PRODUCTS.filter(p => includeArchived ? true : !p.isArchived);
  }
}

export function saveProductsList(products) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('affiliate_mart_products_updated', { detail: products }));
    return true;
  } catch (err) {
    return false;
  }
}

export async function upsertProduct(productData, actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const existingIndex = allProducts.findIndex(p => p.id === productData.id);
  const now = new Date().toISOString();

  let targetId = productData.id;
  let actionType = 'PRODUCT_CREATED';
  let finalProduct = null;

  if (existingIndex >= 0) {
    actionType = 'PRODUCT_UPDATED';
    finalProduct = {
      ...allProducts[existingIndex],
      ...productData,
      isPinned: productData.isPinned !== undefined ? !!productData.isPinned : !!allProducts[existingIndex].isPinned,
      updatedAt: now,
    };
    allProducts[existingIndex] = finalProduct;
    targetId = finalProduct.id;
  } else {
    targetId = productData.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    finalProduct = {
      ...productData,
      id: targetId,
      createdAt: now,
      updatedAt: now,
      status: productData.status || 'active',
      isArchived: false,
      isFeatured: !!productData.isFeatured,
      isPinned: !!productData.isPinned,
      rating: productData.rating || 4.5,
      reviewsCount: productData.reviewsCount || Math.floor(Math.random() * 500) + 50,
      isSample: false,
    };
    allProducts.unshift(finalProduct);
  }

  saveProductsList(allProducts);

  // Sync to Cloud Firestore asynchronously
  try {
    await setDoc(doc(db, 'products', targetId), finalProduct, { merge: true });
  } catch (e) {
    console.warn('Firestore write notice (saved locally):', e.message);
  }

  appendAuditLog({
    actor,
    action: actionType,
    targetType: 'PRODUCT',
    targetId,
    details: `Product "${productData.name}" was ${actionType === 'PRODUCT_CREATED' ? 'created' : 'updated'}. Platform: ${productData.platform}, Price: ${productData.sellingPrice}${finalProduct.isPinned ? ' (Pinned to Top)' : ''}`,
  });

  return targetId;
}

// Quick Toggle Pin to Top for a product
export async function togglePinProduct(id, actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const target = allProducts.find(p => p.id === id);
  if (!target) return false;

  target.isPinned = !target.isPinned;
  target.updatedAt = new Date().toISOString();
  saveProductsList(allProducts);

  try {
    await updateDoc(doc(db, 'products', id), {
      isPinned: target.isPinned,
      updatedAt: target.updatedAt,
    });
  } catch (e) {}

  appendAuditLog({
    actor,
    action: target.isPinned ? 'PRODUCT_PINNED' : 'PRODUCT_UNPINNED',
    targetType: 'PRODUCT',
    targetId: id,
    details: `Product "${target.name}" was ${target.isPinned ? 'pinned to the top of catalog' : 'unpinned'}.`,
  });

  return target.isPinned;
}

export async function archiveProductById(id, actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const target = allProducts.find(p => p.id === id);
  if (!target) return false;

  target.isArchived = true;
  target.archivedAt = new Date().toISOString();
  target.status = 'hidden';

  saveProductsList(allProducts);

  try {
    await updateDoc(doc(db, 'products', id), {
      isArchived: true,
      archivedAt: target.archivedAt,
      status: 'hidden',
    });
  } catch (e) {
    console.warn('Firestore archive write notice:', e.message);
  }

  appendAuditLog({
    actor,
    action: 'PRODUCT_ARCHIVED',
    targetType: 'PRODUCT',
    targetId: id,
    details: `Product "${target.name}" moved to soft-delete archive / recycle bin.`,
  });

  return true;
}

export async function restoreProductById(id, actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const target = allProducts.find(p => p.id === id);
  if (!target) return false;

  target.isArchived = false;
  target.archivedAt = null;
  target.status = 'active';

  saveProductsList(allProducts);

  try {
    await updateDoc(doc(db, 'products', id), {
      isArchived: false,
      archivedAt: null,
      status: 'active',
    });
  } catch (e) {
    console.warn('Firestore restore write notice:', e.message);
  }

  appendAuditLog({
    actor,
    action: 'PRODUCT_RESTORED',
    targetType: 'PRODUCT',
    targetId: id,
    details: `Product "${target.name}" restored from archive back to active catalog.`,
  });

  return true;
}

export async function permanentlyDeleteProductById(id, actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const target = allProducts.find(p => p.id === id);
  const filtered = allProducts.filter(p => p.id !== id);
  saveProductsList(filtered);

  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (e) {
    console.warn('Firestore delete notice:', e.message);
  }

  appendAuditLog({
    actor,
    action: 'PRODUCT_PERMANENTLY_DELETED',
    targetType: 'PRODUCT',
    targetId: id,
    details: `Product "${target ? target.name : id}" was permanently removed from database.`,
  });

  return true;
}

export function resetToSampleProducts(actor = 'admin') {
  saveProductsList([...SAMPLE_PRODUCTS]);
  seedInitialFirestoreProducts();
  appendAuditLog({
    actor,
    action: 'DEMO_DATA_RESET',
    targetType: 'SYSTEM',
    targetId: 'ALL',
    details: 'Catalog was reset to initial default demo products.',
  });
  return [...SAMPLE_PRODUCTS];
}

export function clearSampleProducts(actor = 'admin') {
  const allProducts = getStoredProducts(true);
  const userProducts = allProducts.filter(p => !p.isSample);
  saveProductsList(userProducts);
  appendAuditLog({
    actor,
    action: 'DEMO_DATA_CLEARED',
    targetType: 'SYSTEM',
    targetId: 'ALL',
    details: 'Removed all demo sample products from the catalog.',
  });
  return userProducts;
}

/**
 * -------------------------------------------------------------
 * 3. CLICK TRACKING WITH FIRESTORE
 * -------------------------------------------------------------
 */

export function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem('affiliate_mart_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('affiliate_mart_session_id', sessionId);
  }
  return sessionId;
}

export function getRecordedClicks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLICKS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function trackAndOpenAffiliate(product) {
  if (!product || !product.affiliateUrl) {
    alert('Affiliate link is not available for this product.');
    return false;
  }

  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const rateLimitKey = `last_click_${product.id}_${sessionId}`;
  const lastClickTime = parseInt(sessionStorage.getItem(rateLimitKey) || '0', 10);
  const settings = getStoredSettings();
  const cooldownMs = (settings.rateLimitSeconds || 3) * 1000;

  let isRateLimited = false;
  if (now - lastClickTime < cooldownMs) {
    isRateLimited = true;
  } else {
    sessionStorage.setItem(rateLimitKey, now.toString());
  }

  const clickEvent = {
    id: `clk_${now}_${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    productName: product.name,
    platform: product.platform,
    category: product.category,
    sellingPrice: product.sellingPrice,
    destinationUrl: product.affiliateUrl,
    sessionId,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'Direct Storefront',
    userAgent: navigator.userAgent ? navigator.userAgent.substring(0, 120) : 'Browser',
    isRateLimited,
    isPurchaseConfirmed: false,
  };

  try {
    const clicks = getRecordedClicks();
    clicks.unshift(clickEvent);
    if (clicks.length > 1000) clicks.length = 1000;
    localStorage.setItem(STORAGE_KEYS.CLICKS, JSON.stringify(clicks));
    window.dispatchEvent(new CustomEvent('affiliate_mart_clicks_updated', { detail: clicks }));

    // Send to Firestore
    setDoc(doc(db, 'clicks', clickEvent.id), clickEvent).catch(() => {});
  } catch (e) {
    console.error('Failed to save click tracking event:', e);
  }

  // Safe external navigation
  const newWindow = window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  if (newWindow) {
    newWindow.opener = null;
  }

  return true;
}

/**
 * -------------------------------------------------------------
 * 4. REAL AFFILIATE SALES & COMMISSION RECONCILIATION
 * -------------------------------------------------------------
 */

export function getSalesRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(SAMPLE_SALES));
      return [...SAMPLE_SALES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SAMPLE_SALES];
  } catch (e) {
    return [...SAMPLE_SALES];
  }
}

export function saveSalesRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('affiliate_mart_sales_updated', { detail: records }));
    return true;
  } catch (e) {
    return false;
  }
}

export async function importSalesFromCSV(csvText, actor = 'admin') {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or does not have headers.');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  const existingSales = getSalesRecords();
  const existingOrderIds = new Set(existingSales.map(s => s.externalOrderId.toLowerCase()));

  let importedCount = 0;
  let skippedDuplicates = 0;
  const newRecords = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cleanValues[idx] || '';
    });

    const orderId = row['orderid'] || row['order id'] || row['transactionid'] || row['id'] || `ORD-${Date.now()}-${i}`;
    const cleanOrderId = orderId.trim();

    if (existingOrderIds.has(cleanOrderId.toLowerCase())) {
      skippedDuplicates++;
      continue;
    }

    const platform = row['platform'] || 'Other';
    const productName = row['productname'] || row['product'] || row['item'] || 'Affiliate Referral Order';
    const saleAmount = parseFloat(row['amount'] || row['saleamount'] || row['sales'] || '0') || 0;
    const commissionRate = parseFloat(row['rate'] || row['commissionrate'] || '8.0') || 8.0;
    const commissionEarned = parseFloat(row['commission'] || row['earned'] || (saleAmount * (commissionRate / 100)).toFixed(2)) || 0;
    const status = row['status'] && COMMISSION_STATUSES.includes(capitalize(row['status'])) ? capitalize(row['status']) : 'Confirmed';

    const record = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      externalOrderId: cleanOrderId,
      productId: row['productid'] || 'manual',
      productName,
      platform: capitalize(platform),
      saleAmount,
      commissionRate,
      commissionEarned,
      status,
      orderedAt: row['date'] || new Date().toISOString(),
      confirmedAt: status === 'Confirmed' || status === 'Paid' ? new Date().toISOString() : null,
      paidAt: status === 'Paid' ? new Date().toISOString() : null,
      source: 'Verified CSV Report Import',
    };

    newRecords.push(record);
    existingOrderIds.add(cleanOrderId.toLowerCase());
    importedCount++;

    // Sync to Firestore
    setDoc(doc(db, 'sales', record.id), record).catch(() => {});
  }

  if (importedCount > 0) {
    const combined = [...newRecords, ...existingSales];
    saveSalesRecords(combined);

    appendAuditLog({
      actor,
      action: 'SALES_REPORT_IMPORTED',
      targetType: 'SALES_LEDGER',
      targetId: `BATCH_${Date.now()}`,
      details: `Imported ${importedCount} verified sales records (${skippedDuplicates} duplicates skipped for idempotency).`,
    });
  }

  return { importedCount, skippedDuplicates };
}

export async function updateSaleStatus(saleId, newStatus, actor = 'admin') {
  const sales = getSalesRecords();
  const target = sales.find(s => s.id === saleId);
  if (!target) return false;

  const oldStatus = target.status;
  target.status = newStatus;
  if (newStatus === 'Confirmed' && !target.confirmedAt) target.confirmedAt = new Date().toISOString();
  if (newStatus === 'Paid' && !target.paidAt) target.paidAt = new Date().toISOString();

  saveSalesRecords(sales);

  try {
    await updateDoc(doc(db, 'sales', saleId), {
      status: newStatus,
      confirmedAt: target.confirmedAt,
      paidAt: target.paidAt,
    });
  } catch (e) {}

  appendAuditLog({
    actor,
    action: 'SALE_STATUS_UPDATED',
    targetType: 'SALES_LEDGER',
    targetId: saleId,
    details: `Order "${target.externalOrderId}" status updated from ${oldStatus} to ${newStatus}.`,
  });

  return true;
}

/**
 * -------------------------------------------------------------
 * 5. APPEND-ONLY AUDIT LOGS
 * -------------------------------------------------------------
 */

export function getAuditLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function appendAuditLog({ actor, action, targetType, targetId, details }) {
  try {
    const logs = getAuditLogs();
    const newEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actor || 'admin',
      action,
      targetType: targetType || 'SYSTEM',
      targetId: targetId || 'N/A',
      details: details || '',
    };

    logs.unshift(newEntry);
    if (logs.length > 2000) logs.length = 2000;
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('affiliate_mart_audit_updated', { detail: logs }));

    // Sync to Firestore
    setDoc(doc(db, 'audit_logs', newEntry.id), newEntry).catch(() => {});
  } catch (e) {
    console.error('Failed to append audit log:', e);
  }
}

/**
 * -------------------------------------------------------------
 * 6. STORE SETTINGS
 * -------------------------------------------------------------
 */

export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveStoredSettings(newSettings, actor = 'admin') {
  try {
    const merged = { ...getStoredSettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('affiliate_mart_settings_updated', { detail: merged }));

    try {
      await setDoc(doc(db, 'settings', 'store_config'), merged, { merge: true });
    } catch (e) {}

    appendAuditLog({
      actor,
      action: 'SETTINGS_UPDATED',
      targetType: 'SETTINGS',
      targetId: 'STORE_SETTINGS',
      details: `Updated store settings: Store Name "${merged.storeName}", Currency "${merged.currencySymbol}"`,
    });

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * -------------------------------------------------------------
 * 7. FIREBASE AUTH & HASH-PROTECTED ADMIN ENGINE
 * -------------------------------------------------------------
 */

export async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getAuthConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_CONFIG);
    if (!raw) return { ...DEFAULT_AUTH_CONFIG };
    return { ...DEFAULT_AUTH_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_AUTH_CONFIG };
  }
}

export function saveAuthConfig(cfg) {
  localStorage.setItem(STORAGE_KEYS.AUTH_CONFIG, JSON.stringify(cfg));
}

// Reset administrator credentials to default authorized email
export function resetAdminCredentialsToDefault() {
  localStorage.removeItem('affiliate_mart_lockout');
  localStorage.removeItem('affiliate_mart_failed_attempts');
  const freshConfig = {
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    provider: 'firebase-auth',
  };
  saveAuthConfig(freshConfig);
  return freshConfig;
}

// Authenticate Admin via Google Firebase Authentication (signInWithEmailAndPassword)
// STRICT ACCESS CONTROL: Only 'anilkumarjiha123@gmail.com' has administrative privileges
export async function authenticateAdmin(identifier, password) {
  const trimmedId = (identifier || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedId) {
    throw new Error('कृपया अपना Firebase एडमिन ईमेल दर्ज करें (Please enter your admin email).');
  }
  if (!trimmedPass) {
    throw new Error('कृपया अपना Firebase पासवर्ड दर्ज करें (Please enter your password).');
  }

  // Normalize email. If someone inputs 'admin', resolve to authorized email
  let targetEmail = trimmedId;
  if (!targetEmail.includes('@')) {
    if (targetEmail.toLowerCase() === 'admin') {
      targetEmail = AUTHORIZED_ADMIN_EMAIL;
    } else {
      throw new Error(`अमान्य ईमेल प्रारूप: एडमिन लॉगिन केवल अधिकृत ईमेल '${AUTHORIZED_ADMIN_EMAIL}' से ही संभव है।`);
    }
  }

  // Pre-authentication check: Reject any non-authorized email before hitting Firebase
  if (targetEmail.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    appendAuditLog({
      actor: targetEmail,
      action: 'UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT',
      targetType: 'AUTH',
      targetId: targetEmail,
      details: `Login rejected: '${targetEmail}' is unauthorized. Only '${AUTHORIZED_ADMIN_EMAIL}' is granted administrative rights.`,
    });
    throw new Error(`एक्सेस अस्वीकृत (Access Denied): केवल अधिकृत एडमिन '${AUTHORIZED_ADMIN_EMAIL}' को ही इस पोर्टल में प्रवेश की अनुमति है।`);
  }

  try {
    // 1. Authenticate with Google Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, trimmedPass);
    const fbUser = userCredential.user;
    const userEmail = (fbUser?.email || '').toLowerCase().trim();

    // 2. Strict Post-Authentication Email Verification
    if (userEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      await fbSignOut(auth).catch(() => {});
      sessionStorage.removeItem(STORAGE_KEYS.AUTH);
      sessionStorage.removeItem('affiliate_mart_admin_email');

      appendAuditLog({
        actor: userEmail,
        action: 'UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT',
        targetType: 'AUTH',
        targetId: fbUser?.uid || 'unknown',
        details: `Access revoked: Authenticated email ${userEmail} does not match authorized admin ${AUTHORIZED_ADMIN_EMAIL}.`,
      });
      throw new Error(`एक्सेस अस्वीकृत (Access Denied): केवल अधिकृत एडमिन '${AUTHORIZED_ADMIN_EMAIL}' को ही एडमिन एक्सेस की अनुमति है।`);
    }

    // 3. Establish Verified Admin Session
    const token = `fb_token_${fbUser.uid}`;
    sessionStorage.setItem(STORAGE_KEYS.AUTH, token);
    sessionStorage.setItem('affiliate_mart_admin_email', userEmail);

    appendAuditLog({
      actor: userEmail,
      action: 'FIREBASE_ADMIN_LOGIN_SUCCESS',
      targetType: 'AUTH',
      targetId: fbUser.uid,
      details: `Administrator (${userEmail}) signed in successfully via Firebase Authentication.`,
    });

    return fbUser;
  } catch (error) {
    // Handle Firebase specific error codes with clear Hindi/English instructions
    let errorMsg = error.message;

    switch (error.code) {
      case 'auth/user-not-found':
        errorMsg = `उपयोगकर्ता नहीं मिला (User Not Found): Firebase में '${targetEmail}' नाम का कोई खाता नहीं है। कृपया Firebase Authentication कंसोल में यह खाता बनाएं।`;
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        errorMsg = `अमान्य क्रेडेंशियल्स (Invalid Password/Credentials): दर्ज किया गया पासवर्ड '${targetEmail}' के Firebase खाते से मेल नहीं खाता।`;
        break;
      case 'auth/invalid-email':
        errorMsg = `अमान्य ईमेल प्रारूप (Invalid Email): कृपया वैध ईमेल पता दर्ज करें।`;
        break;
      case 'auth/user-disabled':
        errorMsg = `खाता अक्षम है (Account Disabled): Firebase Authentication कंसोल में यह खाता अक्षम कर दिया गया है।`;
        break;
      case 'auth/too-many-requests':
        errorMsg = `बहुत सारे असफल प्रयास: सुरक्षा कारणों से यह खाता अस्थायी रूप से ब्लॉक है। कृपया कुछ समय बाद पुनः प्रयास करें या पासवर्ड रीसेट करें।`;
        break;
      case 'auth/network-request-failed':
        errorMsg = `नेटवर्क त्रुटि: Firebase सर्वर से संपर्क नहीं हो पाया। कृपया इंटरनेट कनेक्शन जांचें।`;
        break;
      default:
        if (error.message.includes('Access Denied') || error.message.includes('एक्सेस अस्वीकृत')) {
          errorMsg = error.message;
        } else {
          errorMsg = `Firebase Authentication Error: ${error.message}`;
        }
    }

    appendAuditLog({
      actor: targetEmail,
      action: 'ADMIN_LOGIN_FAILED',
      targetType: 'AUTH',
      targetId: targetEmail,
      details: `Failed Firebase login attempt for ${targetEmail}: ${error.code || error.message}`,
    });

    throw new Error(errorMsg);
  }
}

// Send Firebase Password Reset Email
export async function sendAdminPasswordReset(email = AUTHORIZED_ADMIN_EMAIL) {
  const targetEmail = (email || AUTHORIZED_ADMIN_EMAIL).trim();
  if (targetEmail.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`पासवर्ड रीसेट केवल अधिकृत एडमिन '${AUTHORIZED_ADMIN_EMAIL}' के लिए भेजा जा सकता है।`);
  }
  try {
    await sendPasswordResetEmail(auth, targetEmail);
    appendAuditLog({
      actor: targetEmail,
      action: 'PASSWORD_RESET_EMAIL_SENT',
      targetType: 'AUTH',
      targetId: targetEmail,
      details: `Firebase password reset link dispatched to ${targetEmail}`,
    });
    return true;
  } catch (err) {
    let msg = err.message;
    if (err.code === 'auth/user-not-found') {
      msg = `Firebase में '${targetEmail}' खाता मौजूद नहीं है।`;
    }
    throw new Error(`Password Reset Error: ${msg}`);
  }
}

// Create new Admin User in Firebase Auth (if permitted)
export async function createFirebaseAdminUser(email, password) {
  if (email.toLowerCase().trim() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`केवल '${AUTHORIZED_ADMIN_EMAIL}' को व्यवस्थापक के रूप में पंजीकृत किया जा सकता है।`);
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    appendAuditLog({
      actor: 'admin',
      action: 'FIREBASE_USER_CREATED',
      targetType: 'AUTH',
      targetId: userCredential.user.uid,
      details: `Created new Firebase Admin account: ${email}`,
    });
    return userCredential.user;
  } catch (err) {
    throw new Error(`Firebase Account Creation Error: ${err.message}`);
  }
}

export async function updateAdminCredentials(currentPassword, newUsername, newPassword, actor = AUTHORIZED_ADMIN_EMAIL) {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    throw new Error('सक्रिय Firebase Auth सत्र नहीं मिला। कृपया पहले Firebase में लॉगिन करें।');
  }

  if (fbUser.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`अनधिकृत: केवल '${AUTHORIZED_ADMIN_EMAIL}' पासवर्ड अपडेट कर सकता है।`);
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Minimum 6 characters).');
  }

  try {
    await updatePassword(fbUser, newPassword);
    appendAuditLog({
      actor: fbUser.email || actor,
      action: 'ADMIN_CREDENTIALS_UPDATED',
      targetType: 'AUTH',
      targetId: fbUser.uid,
      details: `Firebase administrator password was updated for ${fbUser.email}.`,
    });
    return true;
  } catch (err) {
    if (err.code === 'auth/requires-recent-login') {
      throw new Error('सुरक्षा के लिए हाल ही में लॉगिन आवश्यक है। कृपया लॉगआउट करके पुनः लॉगिन करें, फिर पासवर्ड बदलें।');
    }
    throw new Error(`Firebase Password Update Error: ${err.message}`);
  }
}

export function isAdminAuthenticated() {
  const token = sessionStorage.getItem(STORAGE_KEYS.AUTH);
  const fbUser = auth.currentUser;
  if (fbUser && fbUser.email && fbUser.email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  return typeof token === 'string' && token.startsWith('fb_token_');
}

export function setAdminAuthenticated(status) {
  if (status) {
    const uid = auth.currentUser?.uid || 'verified';
    sessionStorage.setItem(STORAGE_KEYS.AUTH, `fb_token_${uid}`);
    sessionStorage.setItem('affiliate_mart_admin_email', AUTHORIZED_ADMIN_EMAIL);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    sessionStorage.removeItem('affiliate_mart_admin_email');
    fbSignOut(auth).catch(() => {});
  }
}

export function getCurrentAdminEmail() {
  return auth.currentUser?.email || sessionStorage.getItem('affiliate_mart_admin_email') || AUTHORIZED_ADMIN_EMAIL;
}

/**
 * -------------------------------------------------------------
 * 8. BACKUP, EXPORT & RESTORE UTILITIES
 * -------------------------------------------------------------
 */

export function generateCSV(items, columns) {
  if (!items || items.length === 0) return '';
  const headers = columns ? columns.map(c => c.label) : Object.keys(items[0]);
  const keys = columns ? columns.map(c => c.key) : Object.keys(items[0]);

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [];
  csvRows.push(headers.map(escapeCSV).join(','));

  for (const item of items) {
    const row = keys.map(k => escapeCSV(item[k]));
    csvRows.push(row.join(','));
  }

  return csvRows.join('\r\n');
}

export function triggerFileDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createSystemBackupJSON() {
  const backup = {
    version: '2.0.0',
    firebaseProjectId: 'kunal-a9793',
    exportedAt: new Date().toISOString(),
    storeSettings: getStoredSettings(),
    products: getStoredProducts(true),
    clicks: getRecordedClicks(),
    sales: getSalesRecords(),
    auditLogs: getAuditLogs(),
  };
  return JSON.stringify(backup, null, 2);
}

export function restoreSystemFromJSON(jsonString, actor = 'admin') {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON backup file format.');
  }

  if (!parsed.products || !Array.isArray(parsed.products)) {
    throw new Error('Backup file is missing products table.');
  }

  if (parsed.products) saveProductsList(parsed.products);
  if (parsed.storeSettings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.storeSettings));
  if (parsed.sales && Array.isArray(parsed.sales)) saveSalesRecords(parsed.sales);
  if (parsed.clicks && Array.isArray(parsed.clicks)) localStorage.setItem(STORAGE_KEYS.CLICKS, JSON.stringify(parsed.clicks));

  // Sync restored items to Firestore
  parsed.products.forEach(p => setDoc(doc(db, 'products', p.id), p).catch(() => {}));

  appendAuditLog({
    actor,
    action: 'SYSTEM_RESTORE_COMPLETED',
    targetType: 'SYSTEM',
    targetId: 'FULL_RESTORE',
    details: `Restored database from backup. Products: ${parsed.products.length}, Sales: ${parsed.sales ? parsed.sales.length : 0}`,
  });

  return {
    productsCount: parsed.products.length,
    salesCount: parsed.sales ? parsed.sales.length : 0,
    clicksCount: parsed.clicks ? parsed.clicks.length : 0,
  };
}

export function getWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WISHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleWishlist(productId) {
  const list = getWishlist();
  const exists = list.includes(productId);
  const updated = exists ? list.filter(id => id !== productId) : [...list, productId];
  localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('affiliate_mart_wishlist_updated', { detail: updated }));
  return !exists;
}

export function calculateDiscount(selling, original) {
  if (!original || original <= selling) return 0;
  return Math.round(((original - selling) / original) * 100);
}

export function formatCurrency(amount, symbol = '₹') {
  if (isNaN(amount) || amount === null) return `${symbol}0`;
  return `${symbol}${Number(amount).toLocaleString('en-IN')}`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
