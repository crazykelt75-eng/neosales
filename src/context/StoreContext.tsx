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
  OrderStatus,
  PaymentMethod,
  Product,
  ProductVariant,
  StoreBackup,
  StoreMetrics,
} from '@/types';
import { CUSTOMER_REVIEWS, INITIAL_ORDERS, INITIAL_PRODUCTS } from '@/lib/mockData';
import { DELIVERY_OPTIONS_BY_ID } from '@/lib/constants';
import { STORAGE_KEYS, clearStorefrontCache, readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { generateOrderNumber } from '@/lib/whatsapp';
import { findVariant, getCartCount, getCartSubtotal, getVariantLabel } from '@/lib/product';
import {
  fetchLiveOrders,
  fetchLiveProducts,
  isSupabaseConfigured,
  persistOrder,
  syncOrderStatus,
  syncVariantStock,
} from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/Toast';

/** PIN protecting `/admin`; overridable per deployment. */
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '2670';
const MAX_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 60_000;

interface AdminAttemptState {
  attempts: number;
  lockedUntil: number | null;
}

interface CheckoutInput {
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
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
  createOrder: (input: CheckoutInput) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => void;
  setOrderPaymentReference: (orderId: string, reference: string) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  reopenOrder: (orderId: string) => void;
  selectedDelivery: DeliveryPreference;
  setSelectedDelivery: (preference: DeliveryPreference) => void;

  // Inventory / catalog management (admin)
  addProduct: (product: Product) => void;
  setVariantStock: (productId: string, variantId: string, stockQuantity: number) => void;
  adjustVariantStock: (productId: string, variantId: string, delta: number) => void;
  toggleProductActive: (productId: string) => void;
  resetDemoData: () => void;

  // Backup & restore
  importBackup: (backup: StoreBackup) => void;

  // Admin session
  isAdminUnlocked: boolean;
  adminAttemptsRemaining: number;
  adminLockSecondsRemaining: number;
  unlockAdmin: (pin: string) => { success: boolean; message: string };
  lockAdmin: () => void;

  // UI state
  activeProduct: Product | null;
  openProduct: (product: Product) => void;
  closeProduct: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isCloudSync, setIsCloudSync] = useState(false);

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPreference>(
    'francistown_pickup'
  );

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [attemptState, setAttemptState] = useState<AdminAttemptState>({ attempts: 0, lockedUntil: null });
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);

  // Latest-state mirrors let mutators write to storage without stale closures.
  const productsRef = useRef(products);
  const cartRef = useRef(cart);
  const ordersRef = useRef(orders);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

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
    const hydratedOrders = storedOrders.length > 0 ? storedOrders : INITIAL_ORDERS;
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

    setHasHydrated(true);

    if (!isSupabaseConfigured()) return;

    // Live Supabase hydration runs after the cached first paint.
    setIsCloudSync(true);
    void fetchLiveProducts().then((liveProducts) => {
      if (liveProducts?.length) commitProducts(liveProducts);
    });
    void fetchLiveOrders().then((liveOrders) => {
      if (liveOrders?.length) commitOrders(liveOrders);
    });
  }, [commitOrders, commitProducts]);

  /* ------------------------------------------------------------------ *
   * Admin session (sessionStorage — cleared when the tab closes)
   * ------------------------------------------------------------------ */

  useEffect(() => {
    const session = readStorage<{ unlockedAt: number } | null>(STORAGE_KEYS.adminSession, null, 'session');
    const attempts = readStorage<AdminAttemptState>(STORAGE_KEYS.adminAttempts, { attempts: 0, lockedUntil: null }, 'session');

    if (session) setIsAdminUnlocked(true);
    setAttemptState(attempts);
  }, []);

  useEffect(() => {
    if (!attemptState.lockedUntil) {
      setLockSecondsRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((attemptState.lockedUntil! - Date.now()) / 1000));
      setLockSecondsRemaining(remaining);
      if (remaining === 0) {
        const reset: AdminAttemptState = { attempts: 0, lockedUntil: null };
        setAttemptState(reset);
        writeStorage(STORAGE_KEYS.adminAttempts, reset, 'session');
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attemptState.lockedUntil]);

  const unlockAdmin = useCallback(
    (pin: string): { success: boolean; message: string } => {
      if (attemptState.lockedUntil && attemptState.lockedUntil > Date.now()) {
        const seconds = Math.ceil((attemptState.lockedUntil - Date.now()) / 1000);
        return { success: false, message: `Too many attempts. Try again in ${seconds}s.` };
      }

      if (pin.trim() !== ADMIN_PIN) {
        const attempts = attemptState.attempts + 1;
        const isLockedOut = attempts >= MAX_ADMIN_ATTEMPTS;
        const nextState: AdminAttemptState = {
          attempts: isLockedOut ? 0 : attempts,
          lockedUntil: isLockedOut ? Date.now() + ADMIN_LOCKOUT_MS : null,
        };

        setAttemptState(nextState);
        writeStorage(STORAGE_KEYS.adminAttempts, nextState, 'session');

        return {
          success: false,
          message: isLockedOut
            ? `Too many incorrect attempts. Locked for ${ADMIN_LOCKOUT_MS / 1000}s.`
            : `Incorrect PIN. ${MAX_ADMIN_ATTEMPTS - attempts} attempt${
                MAX_ADMIN_ATTEMPTS - attempts === 1 ? '' : 's'
              } remaining.`,
        };
      }

      const reset: AdminAttemptState = { attempts: 0, lockedUntil: null };
      setAttemptState(reset);
      writeStorage(STORAGE_KEYS.adminAttempts, reset, 'session');
      writeStorage(STORAGE_KEYS.adminSession, { unlockedAt: Date.now() }, 'session');
      setIsAdminUnlocked(true);

      return { success: true, message: 'Dashboard unlocked.' };
    },
    [attemptState.attempts, attemptState.lockedUntil]
  );

  const lockAdmin = useCallback(() => {
    removeStorage(STORAGE_KEYS.adminSession, 'session');
    setIsAdminUnlocked(false);
    showToast({ type: 'info', title: 'Admin session locked' });
  }, [showToast]);

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
      changedVariants.forEach((variant) => void syncVariantStock(variant.id, variant.stockQuantity));
    },
    [commitProducts]
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
        showToast({
          type: 'info',
          title: product.isActive ? 'Product published' : 'Product hidden',
          description: product.title,
        });
      }
    },
    [commitProducts, showToast]
  );

  const addProduct = useCallback(
    (product: Product) => {
      commitProducts([product, ...productsRef.current]);
      showToast({
        type: 'success',
        title: 'Product created',
        description: `${product.title} is now live in the catalog.`,
      });
    },
    [commitProducts, showToast]
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
    ({ customer, paymentMethod }: CheckoutInput): Order => {
      const items = cartRef.current;
      const subtotalBWP = getCartSubtotal(items);
      const deliveryFeeBWP = DELIVERY_OPTIONS_BY_ID[customer.deliveryPreference]?.feeBWP ?? 0;
      const now = Date.now();

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
        deliveryFeeBWP,
        totalAmountBWP: subtotalBWP + deliveryFeeBWP,
        paymentMethod,
        status: 'pending_verification',
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
      void persistOrder(order);

      return order;
    },
    [applyStockDelta, clearCart, commitOrders]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus, notes?: string) => {
      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;

        updatedOrder = {
          ...order,
          status,
          verificationNotes: notes?.trim() ? notes.trim() : order.verificationNotes,
          verifiedAt:
            status === 'payment_confirmed' && !order.verifiedAt ? new Date().toISOString() : order.verifiedAt,
        };

        return updatedOrder;
      });

      if (!updatedOrder) return;

      commitOrders(next);
      void syncOrderStatus(updatedOrder);

      showToast({
        type: 'success',
        title: `Order ${updatedOrder.orderNumber} updated`,
        description: notes?.trim() ? notes.trim() : undefined,
      });
    },
    [commitOrders, showToast]
  );

  /** Attaches the mobile money transaction ID to an order (customer or seller). */
  const setOrderPaymentReference = useCallback(
    (orderId: string, reference: string) => {
      let updatedOrder: Order | undefined;

      const next = ordersRef.current.map((order) => {
        if (order.id !== orderId) return order;
        updatedOrder = { ...order, paymentReference: reference.trim() };
        return updatedOrder;
      });

      if (!updatedOrder) return;

      commitOrders(next);
      void syncOrderStatus(updatedOrder);

      if (reference.trim()) {
        showToast({
          type: 'success',
          title: `Reference saved on ${updatedOrder.orderNumber}`,
          description: reference.trim(),
        });
      }
    },
    [commitOrders, showToast]
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
      };

      commitOrders(ordersRef.current.map((order) => (order.id === orderId ? cancelledOrder : order)));
      void syncOrderStatus(cancelledOrder);

      // Return the reserved units to the shelf.
      const returnedUnits = target.items.reduce((sum, item) => sum + item.quantity, 0);
      applyStockDelta((variant) => {
        const line = target.items.find((item) => item.variantId === variant.id);
        if (!line) return null;
        return { ...variant, stockQuantity: variant.stockQuantity + line.quantity };
      });

      showToast({
        type: 'info',
        title: `Order ${target.orderNumber} cancelled`,
        description: `${returnedUnits} unit${returnedUnits === 1 ? '' : 's'} returned to stock.`,
      });
    },
    [applyStockDelta, commitOrders, showToast]
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
      };

      commitOrders(ordersRef.current.map((order) => (order.id === orderId ? reopened : order)));
      void syncOrderStatus(reopened);

      const shortfalls: string[] = [];
      applyStockDelta((variant) => {
        const line = target.items.find((item) => item.variantId === variant.id);
        if (!line) return null;

        if (variant.stockQuantity < line.quantity) {
          shortfalls.push(`${variant.sku} (wanted ${line.quantity}, ${variant.stockQuantity} left)`);
        }

        return { ...variant, stockQuantity: Math.max(0, variant.stockQuantity - line.quantity) };
      });

      showToast({
        type: shortfalls.length > 0 ? 'info' : 'success',
        title: `Order ${target.orderNumber} reopened`,
        description:
          shortfalls.length > 0
            ? `Stock was short for: ${shortfalls.join(', ')}. Adjust inventory before dispatch.`
            : 'Reserved stock taken off the shelf again.',
      });
    },
    [applyStockDelta, commitOrders, showToast]
  );

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

      showToast({
        type: 'success',
        title: 'Backup restored',
        description: `${backup.products.length} products and ${backup.orders.length} orders loaded.`,
      });
    },
    [commitCart, commitOrders, commitProducts, showToast]
  );

  const reviews = CUSTOMER_REVIEWS;

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
      selectedDelivery,
      setSelectedDelivery,

      addProduct,
      setVariantStock,
      adjustVariantStock,
      toggleProductActive,
      resetDemoData,
      importBackup,

      isAdminUnlocked,
      adminAttemptsRemaining: Math.max(0, MAX_ADMIN_ATTEMPTS - attemptState.attempts),
      adminLockSecondsRemaining: lockSecondsRemaining,
      unlockAdmin,
      lockAdmin,

      activeProduct,
      openProduct: setActiveProduct,
      closeProduct: () => setActiveProduct(null),
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
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
      selectedDelivery,
      addProduct,
      setVariantStock,
      adjustVariantStock,
      toggleProductActive,
      resetDemoData,
      importBackup,
      isAdminUnlocked,
      attemptState.attempts,
      lockSecondsRemaining,
      unlockAdmin,
      lockAdmin,
      activeProduct,
      isCartOpen,
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
