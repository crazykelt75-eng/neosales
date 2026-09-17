'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CartItem,
  CustomerReview,
  DeliveryPreference,
  Order,
  OrderCustomer,
  OrderEvent,
  OrderStatus,
  PaymentMethod,
  PickupSlot,
  Product,
  ProductVariant,
  PromoCode,
  SalesChannel,
  StockAlert,
  StoreBackup,
  StoreMetrics,
} from '@/types';
import { CUSTOMER_REVIEWS, INITIAL_ORDERS, INITIAL_PRODUCTS } from '@/lib/mockData';
import { DELIVERY_OPTIONS_BY_ID } from '@/lib/constants';
import { STORAGE_KEYS, clearStorefrontCache, readStorage, writeStorage } from '@/lib/storage';
import { generateOrderNumber, isValidBotswanaPhone, normaliseBotswanaPhone } from '@/lib/whatsapp';
import { ORDER_STATUS_META } from '@/lib/constants';
import { DEFAULT_PROMO_CODES, getAutomaticBundleDiscount, validatePromoCode } from '@/lib/promo';
import { findVariant, getCartCount, getCartSubtotal, getVariantLabel } from '@/lib/product';
import {
  createCloudAdminOrder,
  createCloudOrder,
  deleteCloudPromo,
  deleteCloudStockAlert,
  fetchAdminProducts,
  fetchCloudStockAlerts,
  fetchLiveOrders,
  fetchLiveProducts,
  fetchLiveReviews,
  fetchPromoCodes,
  getAdminSession,
  isCurrentUserAdmin,
  isSupabaseConfigured,
  onAdminAuthStateChange,
  persistProduct,
  saveCloudPromo,
  signInAdmin,
  signOutAdmin,
  submitCloudPaymentReference,
  submitCloudReview,
  subscribeCloudStockAlert,
  syncOrderStatus,
  syncProductActive,
  syncVariantStock,
  updateCloudProductDetails,
  updateCloudStockAlert,
} from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/Toast';

interface CheckoutInput {
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  /** Promo code applied in the bag, if the customer used one. */
  promoCode?: string;
  /** Set by the seller when logging a WhatsApp/DM sale rather than a web order. */
  channel?: SalesChannel;
}

interface OfflineSaleLine {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface OfflineSaleInput {
  lines: OfflineSaleLine[];
  customerName: string;
  customerPhone: string;
  town: string;
  address: string;
  channel: Exclude<SalesChannel, 'website'>;
  paymentMethod: PaymentMethod;
  deliveryPreference: DeliveryPreference;
  /** `true` when the goods already changed hands (walk-in, cash on pickup). */
  isFulfilled: boolean;
  note?: string;
}

interface StoreContextValue {
  // Catalog
  products: Product[];
  reviews: CustomerReview[];
  getProductReviews: (productId: string) => CustomerReview[];
  getProductRating: (productId: string) => { average: number; count: number };

  // Bag
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  setCartQuantity: (variantId: string, quantity: number) => void;
  incrementCartItem: (variantId: string) => void;
  decrementCartItem: (variantId: string) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;

  // Checkout & orders
  orders: Order[];
  createOrder: (input: CheckoutInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => void;
  setOrderPaymentReference: (orderId: string, reference: string) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  reopenOrder: (orderId: string) => void;
  addOrderNote: (orderId: string, note: string) => void;
  setOrderPickupSlot: (orderId: string, slot: PickupSlot | null) => void;
  recordOfflineSale: (input: OfflineSaleInput) => Promise<Order>;
  selectedDelivery: DeliveryPreference;
  setSelectedDelivery: (preference: DeliveryPreference) => void;

  // Inventory / catalog management (admin)
  addProduct: (product: Product) => void;
  updateProductDetails: (product: Product) => void;
  setVariantStock: (productId: string, variantId: string, stockQuantity: number) => void;
  adjustVariantStock: (productId: string, variantId: string, delta: number) => void;
  toggleProductActive: (productId: string) => void;
  resetDemoData: () => void;

  // Backup & restore
  importBackup: (backup: StoreBackup) => void;

  // Promo codes
  promoCodes: PromoCode[];
  checkPromoCode: (code: string) => { ok: boolean; message: string; discountBWP: number };
  savePromoCode: (promo: PromoCode) => void;
  deletePromoCode: (promoId: string) => void;

  // Reviews
  addReview: (review: Omit<CustomerReview, 'id' | 'date'>) => boolean;

  // Back-in-stock alerts
  stockAlerts: StockAlert[];
  subscribeStockAlert: (product: Product, variant: ProductVariant, phone: string) => boolean;
  markStockAlertNotified: (alertId: string) => void;
  removeStockAlert: (alertId: string) => void;

  // Saved items & browsing history
  savedProductIds: string[];
  toggleSaved: (productId: string) => void;
  isSaved: (productId: string) => boolean;
  recentlyViewedIds: string[];
  markViewed: (productId: string) => void;

  // Seller authentication
  isAdminUnlocked: boolean;
  isAdminAuthLoading: boolean;
  adminEmail?: string;
  unlockAdmin: (email: string, password: string, captchaToken?: string) => Promise<void>;
  lockAdmin: () => Promise<void>;

  // UI state
  activeProduct: Product | null;
  openProduct: (product: Product) => void;
  closeProduct: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isSavedOpen: boolean;
  openSaved: () => void;
  closeSaved: () => void;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;

  // Diagnostics
  hasHydrated: boolean;
  isCloudSync: boolean;
  metrics: StoreMetrics;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [reviews, setReviews] = useState<CustomerReview[]>(CUSTOMER_REVIEWS);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(DEFAULT_PROMO_CODES);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isCloudSync, setIsCloudSync] = useState(false);

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPreference>(
    'francistown_pickup'
  );

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAdminAuthLoading, setIsAdminAuthLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>();

  // Latest-state mirrors let mutators write to storage without stale closures.
  const productsRef = useRef(products);
  const cartRef = useRef(cart);
  const ordersRef = useRef(orders);
  const reviewsRef = useRef(reviews);
  const promoCodesRef = useRef(promoCodes);
  const stockAlertsRef = useRef(stockAlerts);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);
  useEffect(() => {
    promoCodesRef.current = promoCodes;
  }, [promoCodes]);
  useEffect(() => {
    stockAlertsRef.current = stockAlerts;
  }, [stockAlerts]);

  /* ------------------------------------------------------------------ *
   * Committers — always persist to storage alongside React state.
   * ------------------------------------------------------------------ */

  const commitProducts = useCallback((next: Product[]) => {
    productsRef.current = next;
    setProducts(next);
    writeStorage(STORAGE_KEYS.products, next);
  }, []);

  const commitCart = useCallback((next: CartItem[]) => {
    cartRef.current = next;
    setCart(next);
    writeStorage(STORAGE_KEYS.cart, next);
  }, []);

  const commitOrders = useCallback((next: Order[]) => {
    ordersRef.current = next;
    setOrders(next);
    writeStorage(STORAGE_KEYS.orders, next);
  }, []);

  /* ------------------------------------------------------------------ *
   * Hydration: localStorage first (instant, offline-safe) then Supabase.
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const storedProducts = readStorage<Product[]>(STORAGE_KEYS.products, []);
    const hydratedProducts = storedProducts.length > 0 ? storedProducts : INITIAL_PRODUCTS;
    setProducts(hydratedProducts);
    productsRef.current = hydratedProducts;

    const storedOrders = readStorage<Order[]>(STORAGE_KEYS.orders, []);
    // In live mode this cache only contains orders placed from this device.
    // Demo orders must never leak into a production seller ledger.
    const hydratedOrders = storedOrders.length > 0
      ? storedOrders
      : isSupabaseConfigured()
        ? []
        : INITIAL_ORDERS;
    setOrders(hydratedOrders);
    ordersRef.current = hydratedOrders;

    // Reconcile the persisted bag against live catalog data (prices may have moved).
    const storedCart = readStorage<CartItem[]>(STORAGE_KEYS.cart, []);
    const reconciledCart = storedCart.reduce<CartItem[]>((acc, item) => {
      const product = hydratedProducts.find((candidate) => candidate.id === item.product.id);
      const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
      if (!product || !variant) return acc;

      acc.push({
        ...item,
        product,
        quantity: Math.min(item.quantity, Math.max(variant.stockQuantity, 1)),
      });
      return acc;
    }, []);
    setCart(reconciledCart);
    cartRef.current = reconciledCart;

    // Customer-submitted reviews layer on top of the seeded ones.
    const storedReviews = readStorage<CustomerReview[]>(STORAGE_KEYS.reviews, []);
    if (storedReviews.length > 0) {
      setReviews([...storedReviews, ...CUSTOMER_REVIEWS]);
      reviewsRef.current = [...storedReviews, ...CUSTOMER_REVIEWS];
    }

    const storedPromos = readStorage<PromoCode[]>(STORAGE_KEYS.promoCodes, []);
    if (storedPromos.length > 0) {
      setPromoCodes(storedPromos);
      promoCodesRef.current = storedPromos;
    }

    const storedAlerts = readStorage<StockAlert[]>(STORAGE_KEYS.stockAlerts, []);
    if (storedAlerts.length > 0) {
      setStockAlerts(storedAlerts);
      stockAlertsRef.current = storedAlerts;
    }

    const storedSaved = readStorage<string[]>(STORAGE_KEYS.savedProducts, []);
    if (storedSaved.length > 0) setSavedProductIds(storedSaved);

    const storedViewed = readStorage<string[]>(STORAGE_KEYS.recentlyViewed, []);
    if (storedViewed.length > 0) setRecentlyViewedIds(storedViewed);

    setHasHydrated(true);

    if (!isSupabaseConfigured()) return;

    // Public catalog and offers hydrate after the cached first paint. Orders
    // are fetched only after an authorized seller session is established.
    void Promise.all([fetchLiveProducts(), fetchPromoCodes(), fetchLiveReviews()])
      .then(([liveProducts, livePromos, liveReviews]) => {
        if (liveProducts.length) commitProducts(liveProducts);
        if (livePromos.length) {
          setPromoCodes(livePromos);
          promoCodesRef.current = livePromos;
        }
        if (liveReviews.length) {
          setReviews(liveReviews);
          reviewsRef.current = liveReviews;
        }
        setIsCloudSync(true);
      })
      .catch(() => setIsCloudSync(false));
  }, [commitOrders, commitProducts]);

  /* ------------------------------------------------------------------ *
   * Seller authentication (Supabase Auth + admin_users authorization)
   * ------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    const applySession = async (email?: string) => {
      try {
        const authorized = Boolean(email) && (await isCurrentUserAdmin());
        if (cancelled) return;
        setIsAdminUnlocked(authorized);
        setAdminEmail(authorized ? email : undefined);
        if (authorized) {
          const [liveOrders, allProducts] = await Promise.all([fetchLiveOrders(), fetchAdminProducts()]);
          if (!cancelled) {
            commitOrders(liveOrders);
            commitProducts(allProducts);
            const alerts = await fetchCloudStockAlerts(allProducts);
            if (!cancelled) {
              stockAlertsRef.current = alerts;
              setStockAlerts(alerts);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setIsAdminUnlocked(false);
          setAdminEmail(undefined);
        }
      } finally {
        if (!cancelled) setIsAdminAuthLoading(false);
      }
    };

    void getAdminSession()
      .then((session) => applySession(session?.user.email))
      .catch(() => setIsAdminAuthLoading(false));

    const unsubscribe = onAdminAuthStateChange((_event, session) => {
      void applySession(session?.user.email);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [commitOrders, commitProducts]);

  const unlockAdmin = useCallback(async (email: string, password: string, captchaToken?: string) => {
    setIsAdminAuthLoading(true);
    try {
      await signInAdmin(email.trim(), password, captchaToken);
      setIsAdminUnlocked(true);
      setAdminEmail(email.trim());
      const [liveOrders, allProducts] = await Promise.all([fetchLiveOrders(), fetchAdminProducts()]);
      commitOrders(liveOrders);
      commitProducts(allProducts);
      const alerts = await fetchCloudStockAlerts(allProducts);
      stockAlertsRef.current = alerts;
      setStockAlerts(alerts);
    } finally {
      setIsAdminAuthLoading(false);
    }
  }, [commitOrders, commitProducts]);

  const lockAdmin = useCallback(async () => {
    await signOutAdmin();
    setIsAdminUnlocked(false);
    setAdminEmail(undefined);
    commitOrders([]);
    showToast({ type: 'info', title: 'Seller session signed out' });
  }, [commitOrders, showToast]);

  /* ------------------------------------------------------------------ *
   * Bag operations
   * ------------------------------------------------------------------ */

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      if (variant.stockQuantity <= 0) {
        showToast({
          type: 'error',
          title: 'Sold out',
          description: `${product.title} (${getVariantLabel(variant)}) is out of stock.`,
        });
        return;
      }

      const existing = cartRef.current.find((item) => item.variantId === variant.id);
      const alreadyInBag = existing?.quantity ?? 0;
      const nextQuantity = Math.min(alreadyInBag + quantity, variant.stockQuantity);

      if (nextQuantity === alreadyInBag) {
        showToast({
          type: 'info',
          title: 'Stock limit reached',
          description: `Only ${variant.stockQuantity} available for this option.`,
        });
        return;
      }

      const nextCart = existing
        ? cartRef.current.map((item) =>
            item.variantId === variant.id ? { ...item, quantity: nextQuantity } : item
          )
        : [
            ...cartRef.current,
            {
              product,
              variantId: variant.id,
              variantLabel: getVariantLabel(variant),
              quantity: nextQuantity,
              unitPriceBWP: variant.priceBWP,
            },
          ];

      commitCart(nextCart);
      showToast({
        type: 'success',
        title: 'Product added to bag',
        description: `${product.title} · ${getVariantLabel(variant)}`,
      });
    },
    [commitCart, showToast]
  );

  const setCartQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const item = cartRef.current.find((entry) => entry.variantId === variantId);
      if (!item) return;

      if (quantity <= 0) {
        commitCart(cartRef.current.filter((entry) => entry.variantId !== variantId));
        return;
      }

      const liveVariant = findVariant(item.product, variantId);
      const ceiling = Math.max(liveVariant?.stockQuantity ?? item.quantity, 1);
      const clamped = Math.min(quantity, ceiling);

      if (quantity > ceiling) {
        showToast({
          type: 'info',
          title: 'Stock limit reached',
          description: `Only ${ceiling} available for ${item.variantLabel}.`,
        });
      }

      commitCart(
        cartRef.current.map((entry) =>
          entry.variantId === variantId ? { ...entry, quantity: clamped } : entry
        )
      );
    },
    [commitCart, showToast]
  );

  const incrementCartItem = useCallback(
    (variantId: string) => {
      const item = cartRef.current.find((entry) => entry.variantId === variantId);
      if (item) setCartQuantity(variantId, item.quantity + 1);
    },
    [setCartQuantity]
  );

  const decrementCartItem = useCallback(
    (variantId: string) => {
      const item = cartRef.current.find((entry) => entry.variantId === variantId);
      if (item) setCartQuantity(variantId, item.quantity - 1);
    },
    [setCartQuantity]
  );

  const removeFromCart = useCallback(
    (variantId: string) => {
      const item = cartRef.current.find((entry) => entry.variantId === variantId);
      commitCart(cartRef.current.filter((entry) => entry.variantId !== variantId));
      if (item) {
        showToast({ type: 'info', title: 'Removed from bag', description: item.product.title });
      }
    },
    [commitCart, showToast]
  );

  const clearCart = useCallback(() => commitCart([]), [commitCart]);

  /* ------------------------------------------------------------------ *
   * Order timeline
   * ------------------------------------------------------------------ */

  /** Builds a new activity-log entry with a collision-safe id. */
  const buildEvent = useCallback(
    (label: string, actor: OrderEvent['actor'], detail?: string): OrderEvent => ({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      label,
      actor,
      detail: detail?.trim() ? detail.trim() : undefined,
    }),
    []
  );

  /* ------------------------------------------------------------------ *
   * Inventory helpers
   * ------------------------------------------------------------------ */

  const applyStockDelta = useCallback(
    (updater: (variant: ProductVariant) => ProductVariant | null) => {
      const changedVariants: ProductVariant[] = [];

      const nextProducts = productsRef.current.map((product) => {
        let productChanged = false;
        const variants = product.variants.map((variant) => {
          const updated = updater(variant);
          if (!updated) return variant;
          if (updated.stockQuantity === variant.stockQuantity) return variant;

          productChanged = true;
          changedVariants.push(updated);
          return updated;
        });

        return productChanged ? { ...product, variants } : product;
      });

      if (changedVariants.length === 0) return;
      commitProducts(nextProducts);
      if (isAdminUnlocked && isSupabaseConfigured()) {
        changedVariants.forEach((variant) => {
          void syncVariantStock(variant.id, variant.stockQuantity).catch(() => {
            showToast({ type: 'error', title: 'Inventory update failed', description: 'Refresh and try again.' });
          });
        });
      }
    },
    [commitProducts, isAdminUnlocked, showToast]
  );

  const setVariantStock = useCallback(
    (productId: string, variantId: string, stockQuantity: number) => {
      applyStockDelta((variant) =>
        variant.id === variantId && variant.productId === productId
          ? { ...variant, stockQuantity: Math.max(0, Math.round(stockQuantity)) }
          : null
      );
    },
    [applyStockDelta]
  );

  const adjustVariantStock = useCallback(
    (productId: string, variantId: string, delta: number) => {
      applyStockDelta((variant) =>
        variant.id === variantId && variant.productId === productId
          ? { ...variant, stockQuantity: Math.max(0, variant.stockQuantity + delta) }
          : null
      );
    },
    [applyStockDelta]
  );

  const toggleProductActive = useCallback(
    (productId: string) => {
      const next = productsRef.current.map((product) =>
        product.id === productId ? { ...product, isActive: !product.isActive } : product
      );
      commitProducts(next);

      const product = next.find((candidate) => candidate.id === productId);
      if (product) {
        if (isAdminUnlocked && isSupabaseConfigured()) {
          void syncProductActive(product.id, product.isActive).catch(() => {
            commitProducts(productsRef.current.map((candidate) =>
              candidate.id === product.id ? { ...candidate, isActive: !product.isActive } : candidate
            ));
            showToast({ type: 'error', title: 'Publish change failed', description: 'The previous state was restored.' });
          });
        }
        showToast({
          type: 'info',
          title: product.isActive ? 'Product published' : 'Product hidden',
          description: product.title,
        });
      }
    },
    [commitProducts, isAdminUnlocked, showToast]
  );

  const addProduct = useCallback(
    (product: Product) => {
      commitProducts([product, ...productsRef.current]);
      if (isAdminUnlocked && isSupabaseConfigured()) {
        void persistProduct(product).catch(() => {
          commitProducts(productsRef.current.filter((candidate) => candidate.id !== product.id));
          showToast({ type: 'error', title: 'Product could not be saved', description: 'Check the SKU and try again.' });
        });
      }
      showToast({
        type: 'success',
        title: 'Product created',
        description: `${product.title} is now live in the catalog.`,
      });
    },
    [commitProducts, isAdminUnlocked, showToast]
  );

  const resetDemoData = useCallback(() => {
    clearStorefrontCache();
    productsRef.current = INITIAL_PRODUCTS;
    ordersRef.current = INITIAL_ORDERS;
    cartRef.current = [];
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setCart([]);
    showToast({
      type: 'success',
      title: 'Local store data reset',
      description: 'Catalog, bag and orders restored to the demo defaults.',
    });
  }, [showToast]);

  /* ------------------------------------------------------------------ *
   * Orders
   * ------------------------------------------------------------------ */

  const createOrder = useCallback(
    async ({ customer, paymentMethod, promoCode, channel = 'website' }: CheckoutInput): Promise<Order> => {
      const items = cartRef.current;
      if (items.length === 0) throw new Error('Your bag is empty.');

      if (isSupabaseConfigured() && channel === 'website') {
        const order = await createCloudOrder({ customer, paymentMethod, items, promoCode });
        commitOrders([order, ...ordersRef.current.filter((candidate) => candidate.id !== order.id)]);
        clearCart();
        const liveProducts = await fetchLiveProducts();
        if (liveProducts.length) commitProducts(liveProducts);
        return order;
      }

      const subtotalBWP = getCartSubtotal(items);
      const deliveryFeeBWP = DELIVERY_OPTIONS_BY_ID[customer.deliveryPreference]?.feeBWP ?? 0;
      const now = Date.now();

      // Recompute discounts at order time so the stored totals are authoritative.
      const bundle = getAutomaticBundleDiscount(items);
      const bundleDiscountBWP = bundle?.amountBWP ?? 0;

      const promoResult = promoCode
        ? validatePromoCode(promoCode, subtotalBWP, promoCodesRef.current)
        : null;
      const promoDiscountBWP = promoResult?.ok ? promoResult.discountBWP : 0;

      const discountBWP = bundleDiscountBWP + promoDiscountBWP;

      const order: Order = {
        id: `ord-${now}`,
        orderNumber: generateOrderNumber(),
        customer,
        items: items.map((item, index) => ({
          id: `item-${now}-${index}`,
          productId: item.product.id,
          variantId: item.variantId,
          productTitle: item.product.title,
          variantLabel: item.variantLabel,
          unitPriceBWP: item.unitPriceBWP,
          quantity: item.quantity,
          lineTotalBWP: item.unitPriceBWP * item.quantity,
        })),
        subtotalBWP,
        discountBWP,
        bundleDiscountBWP,
        promoDiscountBWP,
        promoCode: promoResult?.ok ? promoResult.promo.code : undefined,
        deliveryFeeBWP,
        totalAmountBWP: Math.max(0, subtotalBWP - discountBWP + deliveryFeeBWP),
        paymentMethod,
        status: 'pending_verification',
        channel,
        timeline: [buildEvent('Order placed on the website', 'customer')],
        createdAt: new Date().toISOString(),
      };

      commitOrders([order, ...ordersRef.current]);

      // Reserve stock immediately so the storefront never oversells.
      applyStockDelta((variant) => {
        const line = items.find((item) => item.variantId === variant.id);
        if (!line) return null;
        return { ...variant, stockQuantity: Math.max(0, variant.stockQuantity - line.quantity) };
      });

      clearCart();
      return order;
    },
    [applyStockDelta, buildEvent, clearCart, commitOrders, commitProducts]
  );

  const updateProductDetails = useCallback(
    (product: Product) => {
      const previous = productsRef.current.find((candidate) => candidate.id === product.id);
      if (!previous) return;

      commitProducts(productsRef.current.map((candidate) => (candidate.id === product.id ? product : candidate)));
      if (isAdminUnlocked && isSupabaseConfigured()) {
        void updateCloudProductDetails(product).catch(() => {
          commitProducts(productsRef.current.map((candidate) => (candidate.id === product.id ? previous : candidate)));
          showToast({ type: 'error', title: 'Product update failed', description: 'The previous details were restored.' });
        });
      }
      showToast({ type: 'success', title: 'Product updated', description: `${product.title} is live in the catalog.` });
    },
    [commitProducts, isAdminUnlocked, showToast]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus, notes?: string) => {
      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;

        const isVerification = status === 'payment_confirmed' && !order.verifiedAt;
        const event = buildEvent(
          `Status set to ${ORDER_STATUS_META[status].label}`,
          'seller',
          order.paymentReference ? `Reference ${order.paymentReference}` : undefined
        );

        updatedOrder = {
          ...order,
          status,
          verificationNotes: notes?.trim() ? notes.trim() : order.verificationNotes,
          verifiedAt: isVerification ? new Date().toISOString() : order.verifiedAt,
          timeline: [...(order.timeline ?? []), event],
        };

        return updatedOrder;
      });

      if (!updatedOrder) return;

      commitOrders(next);
      if (isSupabaseConfigured()) {
        void syncOrderStatus(updatedOrder).catch(() => {
          showToast({ type: 'error', title: 'Order update failed', description: 'Refresh and try again.' });
        });
      }

      showToast({
        type: 'success',
        title: `Order ${updatedOrder.orderNumber} updated`,
        description: notes?.trim() ? notes.trim() : undefined,
      });
    },
    [buildEvent, commitOrders, showToast]
  );

  /** Attaches the mobile money transaction ID to an order (customer or seller). */
  const setOrderPaymentReference = useCallback(
    (orderId: string, reference: string) => {
      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;

        updatedOrder = {
          ...order,
          paymentReference: reference.trim(),
          timeline: [
            ...(order.timeline ?? []),
            buildEvent(
              reference.trim() ? 'Payment reference captured' : 'Payment reference cleared',
              'seller',
              reference.trim()
            ),
          ],
        };

        return updatedOrder;
      });

      if (!updatedOrder) return;

      commitOrders(next);
      if (isSupabaseConfigured()) {
        if (isAdminUnlocked) {
          void syncOrderStatus(updatedOrder).catch(() => {
            showToast({ type: 'error', title: 'Reference could not be saved', description: 'Please try again.' });
          });
        } else {
          const phoneTail = updatedOrder.customer.phone.replace(/\D/g, '').slice(-4);
          void submitCloudPaymentReference(updatedOrder.orderNumber, phoneTail, reference.trim()).catch(() => {
            showToast({ type: 'error', title: 'Reference could not be saved', description: 'Please try again.' });
          });
        }
      }

      if (reference.trim()) {
        showToast({
          type: 'success',
          title: `Reference saved on ${updatedOrder.orderNumber}`,
          description: reference.trim(),
        });
      }
    },
    [buildEvent, commitOrders, isAdminUnlocked, showToast]
  );

  /**
   * Cancels an order and returns every reserved unit to the catalog, so
   * abandoned or unpaid orders never lock up sellable stock.
   */
  const cancelOrder = useCallback(
    (orderId: string, reason?: string) => {
      const target = ordersRef.current.find((order) => order.id === orderId);
      if (!target) return;

      if (target.status === 'cancelled') {
        showToast({ type: 'info', title: `Order ${target.orderNumber} is already cancelled` });
        return;
      }

      const cancelledOrder: Order = {
        ...target,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: reason?.trim() ? reason.trim() : 'Cancelled by seller',
        timeline: [
          ...(target.timeline ?? []),
          buildEvent('Order cancelled — stock returned', 'seller', reason?.trim() || undefined),
        ],
      };

      commitOrders(ordersRef.current.map((order) => (order.id === orderId ? cancelledOrder : order)));

      // Return the reserved units to the shelf.
      const returnedUnits = target.items.reduce((sum, item) => sum + item.quantity, 0);
      if (isSupabaseConfigured()) {
        void syncOrderStatus(cancelledOrder)
          .then(() => Promise.all([fetchLiveOrders(), fetchAdminProducts()]))
          .then(([liveOrders, liveProducts]) => {
            commitOrders(liveOrders);
            commitProducts(liveProducts);
          })
          .catch(() => {
            commitOrders(ordersRef.current.map((order) => (order.id === orderId ? target : order)));
            showToast({ type: 'error', title: 'Cancellation failed', description: 'No stock was changed.' });
          });
      } else {
        applyStockDelta((variant) => {
          const line = target.items.find((item) => item.variantId === variant.id);
          if (!line) return null;
          return { ...variant, stockQuantity: variant.stockQuantity + line.quantity };
        });
      }

      showToast({
        type: 'info',
        title: `Order ${target.orderNumber} cancelled`,
        description: `${returnedUnits} unit${returnedUnits === 1 ? '' : 's'} returned to stock.`,
      });
    },
    [applyStockDelta, buildEvent, commitOrders, commitProducts, showToast]
  );

  /**
   * Reverses an accidental cancellation: the order re-enters verification and
   * the reserved units are taken off the shelf again.
   */
  const reopenOrder = useCallback(
    (orderId: string) => {
      const target = ordersRef.current.find((order) => order.id === orderId);
      if (!target || target.status !== 'cancelled') return;

      const reopened: Order = {
        ...target,
        status: 'pending_verification',
        cancelledAt: undefined,
        cancelReason: undefined,
        timeline: [...(target.timeline ?? []), buildEvent('Order reopened — stock reserved again', 'seller')],
      };

      commitOrders(ordersRef.current.map((order) => (order.id === orderId ? reopened : order)));

      const shortfalls: string[] = [];
      if (isSupabaseConfigured()) {
        void syncOrderStatus(reopened)
          .then(() => Promise.all([fetchLiveOrders(), fetchAdminProducts()]))
          .then(([liveOrders, liveProducts]) => {
            commitOrders(liveOrders);
            commitProducts(liveProducts);
          })
          .catch((error) => {
            commitOrders(ordersRef.current.map((order) => (order.id === orderId ? target : order)));
            showToast({
              type: 'error',
              title: 'Order could not be reopened',
              description: error instanceof Error ? error.message : 'Check inventory and try again.',
            });
          });
      } else {
        applyStockDelta((variant) => {
          const line = target.items.find((item) => item.variantId === variant.id);
          if (!line) return null;

          if (variant.stockQuantity < line.quantity) {
            shortfalls.push(`${variant.sku} (wanted ${line.quantity}, ${variant.stockQuantity} left)`);
          }

          return { ...variant, stockQuantity: Math.max(0, variant.stockQuantity - line.quantity) };
        });
      }

      showToast({
        type: shortfalls.length > 0 ? 'info' : 'success',
        title: `Order ${target.orderNumber} reopened`,
        description:
          shortfalls.length > 0
            ? `Stock was short for: ${shortfalls.join(', ')}. Adjust inventory before dispatch.`
            : 'Reserved stock taken off the shelf again.',
      });
    },
    [applyStockDelta, buildEvent, commitOrders, commitProducts, showToast]
  );

  /** Free-text activity note ("called, no answer") appended to the order log. */
  const addOrderNote = useCallback(
    (orderId: string, note: string) => {
      if (!note.trim()) return;

      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;
        updatedOrder = {
          ...order,
          timeline: [...(order.timeline ?? []), buildEvent('Seller note', 'seller', note)],
        };
        return updatedOrder;
      });

      if (!updatedOrder) return;
      commitOrders(next);
      showToast({ type: 'success', title: 'Note added to order' });
    },
    [buildEvent, commitOrders, showToast]
  );

  /** Agrees a collection window for a Francistown pickup. */
  const setOrderPickupSlot = useCallback(
    (orderId: string, slot: PickupSlot | null) => {
      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;

        updatedOrder = {
          ...order,
          pickupSlot: slot ?? undefined,
          timeline: [
            ...(order.timeline ?? []),
            buildEvent(
              slot ? 'Pickup slot agreed' : 'Pickup slot cleared',
              'seller',
              slot ? `${slot.date} · ${slot.window} · ${slot.point}` : undefined
            ),
          ],
        };

        return updatedOrder;
      });

      if (!updatedOrder) return;
      commitOrders(next);

      showToast({
        type: slot ? 'success' : 'info',
        title: slot ? `Pickup slot set for ${updatedOrder.orderNumber}` : 'Pickup slot cleared',
        description: slot ? `${slot.window} at ${slot.point}` : undefined,
      });
    },
    [buildEvent, commitOrders, showToast]
  );

  /**
   * Logs a sale that closed on WhatsApp, in a DM or in person so the website's
   * stock stays the single source of truth across every channel.
   */
  const recordOfflineSale = useCallback(
    async (input: OfflineSaleInput): Promise<Order> => {
      const now = Date.now();

      if (isSupabaseConfigured()) {
        const customer: OrderCustomer = {
          name: input.customerName.trim() || 'Walk-in customer',
          phone: input.customerPhone.trim() || '+26700000000',
          town: input.town.trim() || 'Francistown',
          address: input.address.trim() || 'Recorded at the pickup point',
          deliveryPreference: input.deliveryPreference,
        };
        const cloudOrder = await createCloudAdminOrder({
          customer,
          paymentMethod: input.paymentMethod,
          channel: input.channel,
          isFulfilled: input.isFulfilled,
          note: input.note,
          items: input.lines.map((line) => ({
            product: line.product,
            variantId: line.variant.id,
            variantLabel: getVariantLabel(line.variant),
            quantity: line.quantity,
            unitPriceBWP: line.variant.priceBWP,
          })),
        });
        const [liveOrders, liveProducts] = await Promise.all([fetchLiveOrders(), fetchAdminProducts()]);
        commitOrders(liveOrders);
        commitProducts(liveProducts);
        showToast({
          type: 'success',
          title: `Sale recorded · ${cloudOrder.orderNumber}`,
          description: `${cloudOrder.items.reduce((sum, item) => sum + item.quantity, 0)} units taken off stock.`,
        });
        return cloudOrder;
      }

      const items = input.lines.map((line, index) => ({
        id: `item-${now}-${index}`,
        productId: line.product.id,
        variantId: line.variant.id,
        productTitle: line.product.title,
        variantLabel: getVariantLabel(line.variant),
        unitPriceBWP: line.variant.priceBWP,
        quantity: line.quantity,
        lineTotalBWP: line.variant.priceBWP * line.quantity,
      }));

      const subtotalBWP = items.reduce((sum, item) => sum + item.lineTotalBWP, 0);
      const deliveryFeeBWP = DELIVERY_OPTIONS_BY_ID[input.deliveryPreference]?.feeBWP ?? 0;
      const status: OrderStatus = input.isFulfilled ? 'completed' : 'payment_confirmed';

      const order: Order = {
        id: `ord-${now}`,
        orderNumber: generateOrderNumber(),
        customer: {
          name: input.customerName.trim() || 'Walk-in customer',
          phone: input.customerPhone.trim() || '+26700000000',
          town: input.town.trim() || 'Francistown',
          address: input.address.trim() || 'Recorded at the pickup point',
          deliveryPreference: input.deliveryPreference,
        },
        items,
        subtotalBWP,
        discountBWP: 0,
        deliveryFeeBWP,
        totalAmountBWP: subtotalBWP + deliveryFeeBWP,
        paymentMethod: input.paymentMethod,
        status,
        channel: input.channel,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        timeline: [
          buildEvent(
            `Sale recorded manually (${input.channel === 'walk_in' ? 'in person' : 'WhatsApp / DM'})`,
            'seller',
            input.note
          ),
        ],
      };

      commitOrders([order, ...ordersRef.current]);

      // Manual sales take stock off the shelf the same way a web order does.
      applyStockDelta((variant) => {
        const line = input.lines.find((candidate) => candidate.variant.id === variant.id);
        if (!line) return null;
        return { ...variant, stockQuantity: Math.max(0, variant.stockQuantity - line.quantity) };
      });

      showToast({
        type: 'success',
        title: `Sale recorded · ${order.orderNumber}`,
        description: `${items.reduce((sum, item) => sum + item.quantity, 0)} units taken off stock.`,
      });

      return order;
    },
    [applyStockDelta, buildEvent, commitOrders, commitProducts, showToast]
  );

  /* ------------------------------------------------------------------ *
   * Promo codes, reviews, stock alerts, saved items
   * ------------------------------------------------------------------ */

  const commitPromoCodes = useCallback((next: PromoCode[]) => {
    promoCodesRef.current = next;
    setPromoCodes(next);
    writeStorage(STORAGE_KEYS.promoCodes, next);
  }, []);

  const checkPromoCode = useCallback((code: string) => {
    const result = validatePromoCode(code, getCartSubtotal(cartRef.current), promoCodesRef.current);
    return result.ok
      ? { ok: true, message: result.message, discountBWP: result.discountBWP }
      : { ok: false, message: result.message, discountBWP: 0 };
  }, []);

  const savePromoCode = useCallback(
    (promo: PromoCode) => {
      const exists = promoCodesRef.current.some((candidate) => candidate.id === promo.id);
      const next = exists
        ? promoCodesRef.current.map((candidate) => (candidate.id === promo.id ? promo : candidate))
        : [{ ...promo }, ...promoCodesRef.current];

      commitPromoCodes(next);
      if (isAdminUnlocked && isSupabaseConfigured()) {
        void saveCloudPromo(promo).catch(() => {
          showToast({ type: 'error', title: 'Promo could not be saved', description: 'Refresh and try again.' });
        });
      }
      showToast({ type: 'success', title: `Promo ${promo.code} saved` });
    },
    [commitPromoCodes, isAdminUnlocked, showToast]
  );

  const deletePromoCode = useCallback(
    (promoId: string) => {
      const promo = promoCodesRef.current.find((candidate) => candidate.id === promoId);
      commitPromoCodes(promoCodesRef.current.filter((candidate) => candidate.id !== promoId));
      if (isAdminUnlocked && isSupabaseConfigured()) {
        void deleteCloudPromo(promoId).catch(() => {
          if (promo) commitPromoCodes([promo, ...promoCodesRef.current]);
          showToast({ type: 'error', title: 'Promo could not be removed', description: 'The previous state was restored.' });
        });
      }
      showToast({ type: 'info', title: 'Promo removed', description: promo?.code });
    },
    [commitPromoCodes, isAdminUnlocked, showToast]
  );

  /** Adds a buyer review. Verified-buyer submissions arrive with an order number. */
  const addReview = useCallback(
    (review: Omit<CustomerReview, 'id' | 'date'>): boolean => {
      const entry: CustomerReview = {
        ...review,
        id: `rev-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
      };

      const next = [entry, ...reviewsRef.current];
      reviewsRef.current = next;
      setReviews(next);
      writeStorage(STORAGE_KEYS.reviews, next.filter((item) => !CUSTOMER_REVIEWS.some((seed) => seed.id === item.id)));

      if (isSupabaseConfigured()) {
        void submitCloudReview(review)
          .then((saved) => {
            const synced = reviewsRef.current.map((candidate) => candidate.id === entry.id ? saved : candidate);
            reviewsRef.current = synced;
            setReviews(synced);
          })
          .catch(() => {
            const rolledBack = reviewsRef.current.filter((candidate) => candidate.id !== entry.id);
            reviewsRef.current = rolledBack;
            setReviews(rolledBack);
            showToast({ type: 'error', title: 'Review could not be submitted', description: 'Please check the details and try again.' });
          });
      }

      showToast({
        type: 'success',
        title: 'Thank you for the review',
        description: review.verified
          ? 'Published with a verified buyer badge.'
          : isSupabaseConfigured()
            ? 'Submitted for seller approval.'
            : 'Published on the product page.',
      });

      return true;
    },
    [showToast]
  );

  /** Registers a back-in-stock request and returns false when the input is invalid. */
  const subscribeStockAlert = useCallback(
    (product: Product, variant: ProductVariant, phone: string): boolean => {
      if (!isValidBotswanaPhone(phone)) return false;

      const normalised = `+${normaliseBotswanaPhone(phone)}`;
      const alreadyWaiting = stockAlertsRef.current.some(
        (alert) => alert.variantId === variant.id && alert.phone === normalised
      );

      if (alreadyWaiting) {
        showToast({
          type: 'info',
          title: 'You are already on the list',
          description: `We will WhatsApp you when ${product.title} is back.`,
        });
        return true;
      }

      const alert: StockAlert = {
        id: `alert-${Date.now()}`,
        productId: product.id,
        productTitle: product.title,
        variantId: variant.id,
        variantLabel: getVariantLabel(variant),
        phone: normalised,
        createdAt: new Date().toISOString(),
      };

      const next = [alert, ...stockAlertsRef.current];
      stockAlertsRef.current = next;
      setStockAlerts(next);
      writeStorage(STORAGE_KEYS.stockAlerts, next);

      if (isSupabaseConfigured()) {
        void subscribeCloudStockAlert(variant.id, normalised).catch(() => {
          const rolledBack = stockAlertsRef.current.filter((candidate) => candidate.id !== alert.id);
          stockAlertsRef.current = rolledBack;
          setStockAlerts(rolledBack);
          writeStorage(STORAGE_KEYS.stockAlerts, rolledBack);
          showToast({ type: 'error', title: 'Alert signup failed', description: 'Please try again.' });
        });
      }

      showToast({
        type: 'success',
        title: 'We will WhatsApp you',
        description: `${product.title} · ${alert.variantLabel}`,
      });

      return true;
    },
    [showToast]
  );

  const markStockAlertNotified = useCallback((alertId: string) => {
    const notifiedAt = new Date().toISOString();
    const next = stockAlertsRef.current.map((alert) =>
      alert.id === alertId ? { ...alert, notifiedAt } : alert
    );
    stockAlertsRef.current = next;
    setStockAlerts(next);
    writeStorage(STORAGE_KEYS.stockAlerts, next);
    if (isAdminUnlocked && isSupabaseConfigured()) {
      void updateCloudStockAlert(alertId, notifiedAt).catch(() => {
        showToast({ type: 'error', title: 'Alert status could not be saved' });
      });
    }
  }, [isAdminUnlocked, showToast]);

  const removeStockAlert = useCallback((alertId: string) => {
    const next = stockAlertsRef.current.filter((alert) => alert.id !== alertId);
    stockAlertsRef.current = next;
    setStockAlerts(next);
    writeStorage(STORAGE_KEYS.stockAlerts, next);
    if (isAdminUnlocked && isSupabaseConfigured()) {
      void deleteCloudStockAlert(alertId).catch(() => {
        showToast({ type: 'error', title: 'Alert could not be removed' });
      });
    }
  }, [isAdminUnlocked, showToast]);

  const toggleSaved = useCallback(
    (productId: string) => {
      const isCurrentlySaved = savedProductIds.includes(productId);
      const next = isCurrentlySaved
        ? savedProductIds.filter((id) => id !== productId)
        : [productId, ...savedProductIds];

      setSavedProductIds(next);
      writeStorage(STORAGE_KEYS.savedProducts, next);

      const product = productsRef.current.find((candidate) => candidate.id === productId);
      showToast({
        type: 'info',
        title: isCurrentlySaved ? 'Removed from saved' : 'Saved for later',
        description: product?.title,
      });
    },
    [savedProductIds, showToast]
  );

  const isSaved = useCallback(
    (productId: string) => savedProductIds.includes(productId),
    [savedProductIds]
  );

  const markViewed = useCallback((productId: string) => {
    setRecentlyViewedIds((current) => {
      const next = [productId, ...current.filter((id) => id !== productId)].slice(0, 8);
      writeStorage(STORAGE_KEYS.recentlyViewed, next);
      return next;
    });
  }, []);

  /* ------------------------------------------------------------------ *
   * Backup & restore
   * ------------------------------------------------------------------ */

  const importBackup = useCallback(
    (backup: StoreBackup) => {
      commitProducts(backup.products);
      commitOrders(backup.orders);

      // The restored catalog may no longer contain variants sitting in the bag.
      const reconciledCart = cartRef.current.filter((item) =>
        backup.products.some(
          (product) =>
            product.id === item.product.id &&
            product.variants.some((variant) => variant.id === item.variantId)
        )
      );
      if (reconciledCart.length !== cartRef.current.length) commitCart(reconciledCart);

      if (backup.reviews?.length) {
        reviewsRef.current = backup.reviews;
        setReviews(backup.reviews);
        writeStorage(STORAGE_KEYS.reviews, backup.reviews);
      }

      if (backup.promoCodes?.length) {
        promoCodesRef.current = backup.promoCodes;
        setPromoCodes(backup.promoCodes);
        writeStorage(STORAGE_KEYS.promoCodes, backup.promoCodes);
      }

      if (backup.stockAlerts?.length) {
        stockAlertsRef.current = backup.stockAlerts;
        setStockAlerts(backup.stockAlerts);
        writeStorage(STORAGE_KEYS.stockAlerts, backup.stockAlerts);
      }

      showToast({
        type: 'success',
        title: 'Backup restored',
        description: `${backup.products.length} products and ${backup.orders.length} orders loaded.`,
      });
    },
    [commitCart, commitOrders, commitProducts, showToast]
  );

  const getProductReviews = useCallback(
    (productId: string) => reviews.filter((review) => review.productId === productId),
    [reviews]
  );

  const getProductRating = useCallback(
    (productId: string) => {
      const productReviews = reviews.filter((review) => review.productId === productId);
      if (!productReviews.length) return { average: 0, count: 0 };

      const average =
        productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;

      return { average: Math.round(average * 10) / 10, count: productReviews.length };
    },
    [reviews]
  );

  /* ------------------------------------------------------------------ *
   * Derived state
   * ------------------------------------------------------------------ */

  const cartCount = useMemo(() => getCartCount(cart), [cart]);
  const cartSubtotal = useMemo(() => getCartSubtotal(cart), [cart]);

  const metrics = useMemo<StoreMetrics>(() => {
    const revenueStatuses: OrderStatus[] = ['payment_confirmed', 'dispatched', 'completed'];

    const lowStockVariants = products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.stockQuantity > 0 && variant.stockQuantity <= variant.lowStockThreshold)
        .map((variant) => ({
          productId: product.id,
          productTitle: product.title,
          variantId: variant.id,
          variantLabel: getVariantLabel(variant),
          stockQuantity: variant.stockQuantity,
        }))
    );

    const unitsByLabel = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        unitsByLabel.set(item.productTitle, (unitsByLabel.get(item.productTitle) ?? 0) + item.quantity);
      });
    });

    return {
      totalRevenueBWP: orders
        .filter((order) => revenueStatuses.includes(order.status))
        .reduce((sum, order) => sum + order.totalAmountBWP, 0),
      offlineOrderCount: orders.filter(
        (order) => order.status !== 'cancelled' && (order.channel ?? 'website') !== 'website'
      ).length,
      cancelledValueBWP: orders
        .filter((order) => order.status === 'cancelled')
        .reduce((sum, order) => sum + order.totalAmountBWP, 0),
      totalOrders: orders.length,
      pendingVerificationCount: orders.filter((order) => order.status === 'pending_verification').length,
      dispatchedCount: orders.filter((order) => order.status === 'dispatched').length,
      cancelledCount: orders.filter((order) => order.status === 'cancelled').length,
      totalStockUnits: products.reduce(
        (sum, product) => sum + product.variants.reduce((acc, variant) => acc + variant.stockQuantity, 0),
        0
      ),
      lowStockVariantCount: lowStockVariants.length,
      lowStockVariants: lowStockVariants.sort((a, b) => a.stockQuantity - b.stockQuantity),
      bestSellers: Array.from(unitsByLabel.entries())
        .map(([label, units]) => ({ label, units }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 4),
    };
  }, [orders, products]);

  const value = useMemo<StoreContextValue>(
    () => ({
      products,
      reviews,
      getProductReviews,
      getProductRating,

      cart,
      cartCount,
      cartSubtotal,
      addToCart,
      setCartQuantity,
      incrementCartItem,
      decrementCartItem,
      removeFromCart,
      clearCart,

      orders,
      createOrder,
      updateOrderStatus,
      setOrderPaymentReference,
      cancelOrder,
      reopenOrder,
      addOrderNote,
      setOrderPickupSlot,
      recordOfflineSale,
      selectedDelivery,
      setSelectedDelivery,

      promoCodes,
      checkPromoCode,
      savePromoCode,
      deletePromoCode,
      addReview,
      stockAlerts,
      subscribeStockAlert,
      markStockAlertNotified,
      removeStockAlert,
      savedProductIds,
      toggleSaved,
      isSaved,
      recentlyViewedIds,
      markViewed,

      addProduct,
      updateProductDetails,
      setVariantStock,
      adjustVariantStock,
      toggleProductActive,
      resetDemoData,
      importBackup,

      isAdminUnlocked,
      isAdminAuthLoading,
      adminEmail,
      unlockAdmin,
      lockAdmin,

      activeProduct,
      openProduct: setActiveProduct,
      closeProduct: () => setActiveProduct(null),
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      isSavedOpen,
      openSaved: () => {
        setIsCartOpen(false);
        setIsSavedOpen(true);
      },
      closeSaved: () => setIsSavedOpen(false),
      isCheckoutOpen,
      openCheckout: () => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
      },
      closeCheckout: () => setIsCheckoutOpen(false),

      hasHydrated,
      isCloudSync,
      metrics,
    }),
    [
      products,
      reviews,
      getProductReviews,
      getProductRating,
      cart,
      cartCount,
      cartSubtotal,
      addToCart,
      setCartQuantity,
      incrementCartItem,
      decrementCartItem,
      removeFromCart,
      clearCart,
      orders,
      createOrder,
      updateOrderStatus,
      setOrderPaymentReference,
      cancelOrder,
      reopenOrder,
      addOrderNote,
      setOrderPickupSlot,
      recordOfflineSale,
      selectedDelivery,
      promoCodes,
      checkPromoCode,
      savePromoCode,
      deletePromoCode,
      addReview,
      stockAlerts,
      subscribeStockAlert,
      markStockAlertNotified,
      removeStockAlert,
      savedProductIds,
      toggleSaved,
      isSaved,
      recentlyViewedIds,
      markViewed,
      addProduct,
      updateProductDetails,
      setVariantStock,
      adjustVariantStock,
      toggleProductActive,
      resetDemoData,
      importBackup,
      isAdminUnlocked,
      isAdminAuthLoading,
      adminEmail,
      unlockAdmin,
      lockAdmin,
      activeProduct,
      isCartOpen,
      isSavedOpen,
      isCheckoutOpen,
      hasHydrated,
      isCloudSync,
      metrics,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
