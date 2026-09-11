'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant, CartItem, Order, OrderStatus, StoreMetrics, CustomerInput, PaymentMethod } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from '@/lib/mockData';
import { DELIVERY_OPTIONS_LABELS } from '@/lib/whatsapp';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface StoreContextType {
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateVariantStock: (productId: string, variantId: string, newStock: number) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeFromCart: (variantId: string) => void;
  updateCartQuantity: (variantId: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Checkout & Orders
  orders: Order[];
  createOrder: (customer: CustomerInput, paymentMethod: PaymentMethod, proofUrl?: string) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => void;
  verifyPayment: (orderId: string, notes?: string) => void;

  // Business Config
  sellerConfig: {
    storeName: string;
    hubLocation: string;
    sellerWhatsApp: string;
    orangeMoneyNumber: string;
    fnbPay2CellNumber: string;
    fnbAccountName: string;
  };

  // Metrics
  metrics: StoreMetrics;

  // Modals
  selectedProductForModal: Product | null;
  setSelectedProductForModal: (product: Product | null) => void;
  activeOrderForPayment: Order | null;
  setActiveOrderForPayment: (order: Order | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_PRODUCTS_KEY = 'bw_store_products_v1';
const STORAGE_ORDERS_KEY = 'bw_store_orders_v1';
const STORAGE_CART_KEY = 'bw_store_cart_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [activeOrderForPayment, setActiveOrderForPayment] = useState<Order | null>(null);

  // Business Config defaults (can be overridden with env vars)
  const sellerConfig = {
    storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'NeoSales',
    hubLocation: 'Francistown & Tati Siding',
    sellerWhatsApp: process.env.NEXT_PUBLIC_SELLER_WHATSAPP || '+26771550200',
    orangeMoneyNumber: process.env.NEXT_PUBLIC_ORANGE_MONEY_NUMBER || '74453342',
    fnbPay2CellNumber: process.env.NEXT_PUBLIC_FNB_PAY2CELL_NUMBER || '71550200',
    fnbAccountName: process.env.NEXT_PUBLIC_FNB_ACCOUNT_NAME || 'NeoSales Retail',
  };

  // Load from localStorage & Supabase on client mount
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedCart = localStorage.getItem(STORAGE_CART_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch {
      // Graceful fallback to initial mock data
    }

    // Live Supabase integration
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      client
        .from('products')
        .select(`
          id,
          title,
          slug,
          category,
          description,
          base_price_bwp,
          is_active,
          is_new_arrival,
          image_urls,
          featured_tag,
          product_variants (
            id,
            product_id,
            sku,
            size,
            color,
            volume_ml,
            scent_profile,
            price_bwp,
            stock_quantity,
            low_stock_threshold
          )
        `)
        .eq('is_active', true)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mapped: Product[] = (data as any[]).map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              category: p.category,
              description: p.description,
              basePriceBWP: Number(p.base_price_bwp),
              isActive: p.is_active,
              isNewArrival: p.is_new_arrival,
              imageUrls: p.image_urls || [],
              featuredTag: p.featured_tag,
              variants: (p.product_variants || []).map((v: any) => ({
                id: v.id,
                productId: v.product_id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                volumeMl: v.volume_ml,
                scentProfile: v.scent_profile,
                priceBWP: Number(v.price_bwp),
                stockQuantity: v.stock_quantity,
                lowStockThreshold: v.low_stock_threshold,
              })),
            }));
            setProducts(mapped);
            persistProducts(mapped);
          }
        });

      // Fetch live orders
      client
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          delivery_preference,
          delivery_location,
          payment_method,
          subtotal_bwp,
          delivery_fee_bwp,
          total_amount_bwp,
          status,
          payment_proof_url,
          verification_notes,
          verified_at,
          created_at,
          order_items (
            id,
            variant_id,
            product_title_snapshot,
            variant_label_snapshot,
            unit_price_bwp,
            quantity,
            line_total_bwp
          )
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const mappedOrders: Order[] = (data as any[]).map((o) => {
              const locationParts = (o.delivery_location || '').split(' - ');
              return {
                id: o.id,
                orderNumber: o.order_number,
                customer: {
                  fullName: o.customer_name,
                  phone: o.customer_phone,
                  deliveryTown: locationParts[0] || 'Francistown',
                  deliveryAddress: locationParts.slice(1).join(' - ') || o.delivery_location || '',
                  deliveryPreference: o.delivery_preference,
                },
                items: (o.order_items || []).map((it: any) => ({
                  variantId: it.variant_id || 'var-1',
                  productTitle: it.product_title_snapshot,
                  variantLabel: it.variant_label_snapshot,
                  unitPriceBWP: Number(it.unit_price_bwp),
                  quantity: it.quantity,
                  lineTotalBWP: Number(it.line_total_bwp),
                })),
                subtotalBWP: Number(o.subtotal_bwp),
                deliveryFeeBWP: Number(o.delivery_fee_bwp),
                totalAmountBWP: Number(o.total_amount_bwp),
                paymentMethod: o.payment_method,
                status: o.status,
                paymentProofUrl: o.payment_proof_url,
                verificationNotes: o.verification_notes,
                verifiedAt: o.verified_at,
                createdAt: o.created_at,
              };
            });
            setOrders(mappedOrders);
            persistOrders(mappedOrders);
          }
        });
    }
  }, []);

  // Save changes to localStorage
  const persistProducts = (updated: Product[]) => {
    setProducts(updated);
    try {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(updated));
    } catch {
      // Fallback if storage quota is exceeded or unavailable
    }
  };

  const persistOrders = (updated: Order[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // Fallback if storage quota is exceeded or unavailable
    }
  };

  const persistCart = (updated: CartItem[]) => {
    setCart(updated);
    try {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(updated));
    } catch {
      // Fallback if storage quota is exceeded or unavailable
    }
  };

  // Add to cart
  const addToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    let label = '';
    if (variant.size) {
      label = `Size ${variant.size}${variant.color ? ` / ${variant.color}` : ''}`;
    } else if (variant.volumeMl) {
      label = `${variant.volumeMl}ml${variant.scentProfile ? ` (${variant.scentProfile})` : ''}`;
    } else if (variant.color) {
      label = variant.color;
    } else {
      label = 'Standard';
    }

    const existingIndex = cart.findIndex((item) => item.variantId === variant.id);
    let newCart: CartItem[];

    if (existingIndex > -1) {
      newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
    } else {
      newCart = [
        ...cart,
        {
          variantId: variant.id,
          product,
          variant,
          quantity,
          variantLabel: label,
        },
      ];
    }
    persistCart(newCart);
    setIsCartOpen(true);
  };

  const removeFromCart = (variantId: string) => {
    persistCart(cart.filter((item) => item.variantId !== variantId));
  };

  const updateCartQuantity = (variantId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.variantId === variantId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    persistCart(updated);
  };

  const clearCart = () => {
    persistCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + item.variant.priceBWP * item.quantity,
    0
  );

  // Create Order
  const createOrder = (
    customer: CustomerInput,
    paymentMethod: PaymentMethod,
    proofUrl?: string
  ): Order => {
    const deliveryFee = DELIVERY_OPTIONS_LABELS[customer.deliveryPreference].fee;
    const subtotal = cartSubtotal;
    const total = subtotal + deliveryFee;

    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customer,
      items: cart.map((item) => ({
        id: `item-${Date.now()}-${item.variantId}`,
        productId: item.product.id,
        variantId: item.variant.id,
        productTitle: item.product.title,
        variantLabel: item.variantLabel,
        unitPriceBWP: item.variant.priceBWP,
        quantity: item.quantity,
        lineTotalBWP: item.variant.priceBWP * item.quantity,
      })),
      subtotalBWP: subtotal,
      deliveryFeeBWP: deliveryFee,
      totalAmountBWP: total,
      paymentMethod,
      status: 'pending_verification',
      paymentProofUrl: proofUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    persistOrders(updatedOrders);
    clearCart();

    // Async write to Supabase orders & order_items
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      client
        .from('orders')
        .insert({
          order_number: newOrder.orderNumber,
          customer_name: newOrder.customer.fullName,
          customer_phone: newOrder.customer.phone,
          delivery_preference: newOrder.customer.deliveryPreference,
          delivery_location: `${newOrder.customer.deliveryTown} - ${newOrder.customer.deliveryAddress}`,
          payment_method: newOrder.paymentMethod,
          subtotal_bwp: newOrder.subtotalBWP,
          delivery_fee_bwp: newOrder.deliveryFeeBWP,
          total_amount_bwp: newOrder.totalAmountBWP,
          status: newOrder.status,
        })
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const itemsToInsert = newOrder.items.map((it) => ({
              order_id: data.id,
              variant_id: uuidRegex.test(it.variantId) ? it.variantId : null,
              product_title_snapshot: it.productTitle,
              variant_label_snapshot: it.variantLabel,
              unit_price_bwp: it.unitPriceBWP,
              quantity: it.quantity,
              line_total_bwp: it.lineTotalBWP,
            }));
            client.from('order_items').insert(itemsToInsert).then(() => {});
          }
        });
    }

    return newOrder;
  };

  // Update order status
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, notes?: string) => {
    const orderToUpdate = orders.find((o) => o.id === orderId);
    if (!orderToUpdate) return;

    // Handle inventory stock decrement if moving to payment_confirmed
    if (newStatus === 'payment_confirmed' && orderToUpdate.status === 'pending_verification') {
      decrementStockForOrder(orderToUpdate);
    }

    const updatedOrders = orders.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          status: newStatus,
          verificationNotes: notes || order.verificationNotes,
          verifiedAt:
            newStatus === 'payment_confirmed' && !order.verifiedAt
              ? new Date().toISOString()
              : order.verifiedAt,
        };
      }
      return order;
    });

    persistOrders(updatedOrders);

    // Sync status change to Supabase
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      const verifiedAtTimestamp =
        newStatus === 'payment_confirmed' && !orderToUpdate.verifiedAt
          ? new Date().toISOString()
          : orderToUpdate.verifiedAt;

      client
        .from('orders')
        .update({
          status: newStatus,
          verification_notes: notes || orderToUpdate.verificationNotes,
          verified_at: verifiedAtTimestamp,
        })
        .eq('order_number', orderToUpdate.orderNumber)
        .then(() => {});
    }
  };

  // Decrement variant stock
  const decrementStockForOrder = (order: Order) => {
    const updatedProducts = products.map((prod) => {
      const updatedVariants = prod.variants.map((v) => {
        const matchingItem = order.items.find((item) => item.variantId === v.id);
        if (matchingItem) {
          const newStock = Math.max(0, v.stockQuantity - matchingItem.quantity);
          return { ...v, stockQuantity: newStock };
        }
        return v;
      });
      return { ...prod, variants: updatedVariants };
    });
    persistProducts(updatedProducts);
  };

  const verifyPayment = (orderId: string, notes?: string) => {
    updateOrderStatus(orderId, 'payment_confirmed', notes || 'Payment verified against mobile wallet/bank remark.');
  };

  // Add Product from Admin
  const addProduct = (newProdData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
    };
    persistProducts([newProduct, ...products]);
  };

  // Update Variant Stock directly
  const updateVariantStock = (productId: string, variantId: string, newStock: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId ? { ...v, stockQuantity: Math.max(0, newStock) } : v
          ),
        };
      }
      return p;
    });
    persistProducts(updated);
  };

  // Calculate real-time metrics
  const confirmedAndCompleted = orders.filter((o) =>
    ['payment_confirmed', 'ready_for_pickup', 'out_for_delivery', 'completed'].includes(o.status)
  );

  const totalRevenueBWP = confirmedAndCompleted.reduce(
    (sum, order) => sum + order.totalAmountBWP,
    0
  );

  const scentCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.variantLabel.includes('ml')) {
        // Perfume variant
        const key = item.variantLabel;
        scentCounts[key] = (scentCounts[key] || 0) + item.quantity;
      }
      if (item.variantLabel.includes('Size')) {
        // Clothing variant
        const key = item.variantLabel.split('/')[0].trim();
        sizeCounts[key] = (sizeCounts[key] || 0) + item.quantity;
      }
    });
  });

  const topScents = Object.entries(scentCounts)
    .map(([scent, count]) => ({ scent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const fastMovingSizes = Object.entries(sizeCounts)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const metrics: StoreMetrics = {
    totalRevenueBWP,
    totalOrders: orders.length,
    pendingVerifications: orders.filter((o) => o.status === 'pending_verification').length,
    activeDeliveries: orders.filter((o) =>
      ['ready_for_pickup', 'out_for_delivery'].includes(o.status)
    ).length,
    topScents,
    fastMovingSizes,
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        addProduct,
        updateVariantStock,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        orders,
        createOrder,
        updateOrderStatus,
        verifyPayment,
        sellerConfig,
        metrics,
        selectedProductForModal,
        setSelectedProductForModal,
        activeOrderForPayment,
        setActiveOrderForPayment,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
