/**
 * NeoSales — Botswana commerce domain model.
 *
 * Currency is Botswana Pula (BWP) everywhere, rendered with the "P" symbol
 * (e.g. `P280`) and always formatted with tabular monospace numerals in the UI.
 */

/** Catalog taxonomy exposed through the storefront category tabs. */
export type ProductCategory = 'perfumes' | 'clothes' | 'accessories';

/**
 * Physical fulfilment choices offered at checkout, ordered from cheapest
 * (free Francistown pickup) to most expensive (nationwide courier).
 */
export type DeliveryPreference =
  | 'francistown_pickup'
  | 'local_courier'
  | 'nationwide_courier';

/** Botswana mobile-money / cash rails supported by the seller. */
export type PaymentMethod = 'orange_money' | 'fnb_pay2cell' | 'cash_on_pickup';

/**
 * Lifecycle of an order inside the seller operations dashboard.
 * `cancelled` is terminal and sits outside the four workflow columns: reserved
 * stock is returned to the catalog the moment an order is cancelled.
 */
export type OrderStatus =
  | 'pending_verification'
  | 'payment_confirmed'
  | 'dispatched'
  | 'completed'
  | 'cancelled';

/** A sellable configuration of a product (perfume volume, garment size/colour, etc). */
export interface ProductVariant {
  id: string;
  productId: string;
  /** Human readable stock keeping unit, e.g. `ROUGE-50ML` or `SHIRT-OLIVE-M`. */
  sku: string;
  /** Garment size — `S`, `M`, `L`, `XL` … */
  size?: string;
  /** Colourway or material finish, e.g. `Safari Olive`. */
  color?: string;
  /** Perfume bottle volume in millilitres — `30`, `50`, `100`. */
  volumeMl?: number;
  /** Fragrance notes summary, e.g. `Smoky Oud & Amber`. */
  scentProfile?: string;
  priceBWP: number;
  stockQuantity: number;
  /** Threshold at or below which the UI surfaces a "Only X left" warning. */
  lowStockThreshold: number;
}

/** A catalog item with one or more purchasable variants. */
export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  description: string;
  /** Display price used when no variant-level pricing is more appropriate. */
  basePriceBWP: number;
  isActive: boolean;
  isNewArrival: boolean;
  /** Optional merchandising tag, e.g. `Top Seller`, `Summer Essential`. */
  featuredTag?: string;
  imageUrls: string[];
  variants: ProductVariant[];
}

/** A bag line. `unitPriceBWP` is snapshotted so price edits never mutate a live bag. */
export interface CartItem {
  product: Product;
  variantId: string;
  /** Rendered label, e.g. `50ml · Smoky Oud & Amber` or `M · Natural Cream`. */
  variantLabel: string;
  quantity: number;
  unitPriceBWP: number;
}

/** Guest checkout details captured on the storefront (no account required). */
export interface OrderCustomer {
  name: string;
  /** Botswana MSISDN in international form, e.g. `+26771550200`. */
  phone: string;
  /** Destination town / city, e.g. `Gaborone`. */
  town: string;
  /** Free-text address or pickup / meeting point instructions. */
  address: string;
  deliveryPreference: DeliveryPreference;
}

/** Where the sale came from, so WhatsApp/DM sales reconcile against the website. */
export type SalesChannel = 'website' | 'whatsapp' | 'walk_in';

/** One entry in an order's activity log (who did what, and when). */
export interface OrderEvent {
  id: string;
  at: string;
  /** Short label, e.g. `Payment confirmed`. */
  label: string;
  /** Optional supporting detail, e.g. the transaction reference. */
  detail?: string;
  /** Who recorded the event. */
  actor: 'customer' | 'seller' | 'system';
}

/** Agreed collection window for Francistown pickups. */
export interface PickupSlot {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** One-hour window, e.g. `14:00 – 15:00`. */
  window: string;
  /** One of the seller's pickup points, e.g. `Galo Mall`. */
  point: string;
}

/** Immutable snapshot of a bag line at the moment the order was created. */
export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  variantLabel: string;
  unitPriceBWP: number;
  quantity: number;
  lineTotalBWP: number;
}

/** A confirmed customer order as stored locally and mirrored to Supabase. */
export interface Order {
  id: string;
  /** Human friendly reference, e.g. `ORD-8421`. Also used as the payment reference. */
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotalBWP: number;
  deliveryFeeBWP: number;
  /** Total discount applied at checkout (bundle + promo), in Pula. */
  discountBWP?: number;
  /** Portion of `discountBWP` earned automatically by the extrait bundle rule. */
  bundleDiscountBWP?: number;
  /** Portion of `discountBWP` produced by a promo code. */
  promoDiscountBWP?: number;
  /** Promo code that produced `promoDiscountBWP`. */
  promoCode?: string;
  totalAmountBWP: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  /** Sales channel; defaults to `website` for storefront orders. */
  channel?: SalesChannel;
  /** Agreed pickup window, for Francistown collections. */
  pickupSlot?: PickupSlot;
  /** Append-only activity log rendered on the order card. */
  timeline?: OrderEvent[];
  createdAt: string;
  /** ISO timestamp of seller payment verification, when available. */
  verifiedAt?: string;
  /** Mobile money / Pay2Cell transaction ID quoted by the customer or read off the SMS. */
  paymentReference?: string;
  /** Free-text note from the seller during verification (e.g. wallet reference). */
  verificationNotes?: string;
  /** ISO timestamp recorded when the order was cancelled. */
  cancelledAt?: string;
  /** Why the order was cancelled — drives follow-up and stock decisions. */
  cancelReason?: string;
}

/** A promo code that may be applied at checkout. */
export interface PromoCode {
  id: string;
  /** Uppercase code the customer types, e.g. `SUMMER10`. */
  code: string;
  /** Percentage off the subtotal (1-100). */
  percentOff: number;
  /** Minimum subtotal required, in Pula. */
  minSubtotalBWP: number;
  /** Optional cap on the discount, in Pula. */
  maxDiscountBWP?: number;
  isActive: boolean;
  /** ISO date the code stops working. */
  expiresAt?: string;
  /** Free-text note shown to the customer, e.g. bundle description. */
  description: string;
}

/** Buyer waiting for a sold-out variant to come back in stock. */
export interface StockAlert {
  id: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  /** WhatsApp number to notify. */
  phone: string;
  createdAt: string;
  notifiedAt?: string;
}

/** Verified buyer feedback surfaced in the hero spotlight and product cards. */
export interface CustomerReview {
  id: string;
  productId: string;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  town: string;
  /** ISO date (yyyy-mm-dd) of the review. */
  date: string;
  verified?: boolean;
  /** Order number that unlocked the review, for verified-buyer submissions. */
  orderNumber?: string;
}

/** Static definition of a delivery rail (fee + coverage) used by checkout and SEO. */
export interface DeliveryOption {
  id: DeliveryPreference;
  label: string;
  shortLabel: string;
  feeBWP: number;
  description: string;
  coverage: string[];
}

/** Static definition of a payment rail used by checkout and the payment instructions panel. */
export interface PaymentOption {
  id: PaymentMethod;
  label: string;
  description: string;
  /** When true the rail is only selectable for Francistown pickups. */
  pickupOnly: boolean;
  /** Mobile money / Pay2Cell recipient number. */
  recipientNumber?: string;
  recipientName?: string;
  instructions: string[];
}

/** Public seller contact + payment configuration (env overridable). */
export interface SellerConfig {
  storeName: string;
  tagline: string;
  sellerWhatsApp: string;
  orangeMoneyNumber: string;
  fnbPay2CellNumber: string;
  accountName: string;
  pickupPoints: string[];
}

/** Derived stock/pricing summary for a product, computed in `lib/product.ts`. */
export interface ProductStatusSummary {
  totalStock: number;
  isSoldOut: boolean;
  isLowStock: boolean;
  minPriceBWP: number;
  maxPriceBWP: number;
  hasPriceRange: boolean;
}

/** Aggregated seller KPIs rendered on the admin dashboard. */
export interface StoreMetrics {
  totalRevenueBWP: number;
  totalOrders: number;
  pendingVerificationCount: number;
  dispatchedCount: number;
  cancelledCount: number;
  totalStockUnits: number;
  lowStockVariantCount: number;
  /** Units sold through WhatsApp/DMs rather than the website. */
  offlineOrderCount: number;
  /** Value of cancelled orders, so it can be excluded from takings honestly. */
  cancelledValueBWP: number;
  lowStockVariants: {
    productId: string;
    productTitle: string;
    variantId: string;
    variantLabel: string;
    stockQuantity: number;
  }[];
  bestSellers: { label: string; units: number }[];
}

/**
 * Portable snapshot of everything the seller owns, used by the admin
 * export/restore tools. Bumped whenever the payload shape changes.
 */
export interface StoreBackup {
  app: 'neosales';
  version: number;
  exportedAt: string;
  products: Product[];
  orders: Order[];
  reviews?: CustomerReview[];
  promoCodes?: PromoCode[];
  stockAlerts?: StockAlert[];
}

/** Workflow statuses that appear as kanban columns (cancellations sit outside the board). */
export type WorkflowStatus = Exclude<OrderStatus, 'cancelled'>;

/** Ordered workflow columns rendered by the admin kanban. */
export const ORDER_STATUS_ORDER: WorkflowStatus[] = [
  'pending_verification',
  'payment_confirmed',
  'dispatched',
  'completed',
];
