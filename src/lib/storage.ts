/**
 * Defensive wrappers around Web Storage.
 *
 * Safari private mode, disabled cookies and quota errors all throw on access —
 * the storefront must keep working regardless, so every call is guarded.
 */

export const STORAGE_KEYS = {
  products: 'neosales.products.v1',
  orders: 'neosales.orders.v1',
  cart: 'neosales.bag.v1',
  adminSession: 'neosales.admin.session',
  adminAttempts: 'neosales.admin.attempts',
  checkoutDraft: 'neosales.checkout.draft',
  lastBackup: 'neosales.lastBackup',
  reviews: 'neosales.reviews.v1',
  promoCodes: 'neosales.promos.v1',
  stockAlerts: 'neosales.stockAlerts.v1',
  savedProducts: 'neosales.saved.v1',
  recentlyViewed: 'neosales.recentlyViewed.v1',
} as const;

function getStore(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__neosales_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

/** Reads and parses JSON from storage, returning `fallback` on any failure. */
export function readStorage<T>(key: string, fallback: T, kind: 'local' | 'session' = 'local'): T {
  const store = getStore(kind);
  if (!store) return fallback;

  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialises `value` to storage. Silently no-ops when storage is unavailable. */
export function writeStorage<T>(key: string, value: T, kind: 'local' | 'session' = 'local'): void {
  const store = getStore(kind);
  if (!store) return;

  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — local state stays authoritative.
  }
}

/** Removes a single key from storage. */
export function removeStorage(key: string, kind: 'local' | 'session' = 'local'): void {
  const store = getStore(kind);
  if (!store) return;

  try {
    store.removeItem(key);
  } catch {
    // Ignored.
  }
}

/** Clears the locally cached catalog, bag and orders (used by the admin "reset demo data"). */
export function clearStorefrontCache(): void {
  [STORAGE_KEYS.products, STORAGE_KEYS.orders, STORAGE_KEYS.cart, STORAGE_KEYS.checkoutDraft].forEach(
    (key) => removeStorage(key)
  );
}
