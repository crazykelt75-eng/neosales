export type ProductCategory = 'clothes' | 'perfumes' | 'accessories';

export type OrderStatus =
  | 'pending_verification'
  | 'payment_confirmed'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'orange_money' | 'fnb_pay2cell';

export type DeliveryPreference = 'collection' | 'local_courier' | 'in_person_meetup';

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  // Clothing
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | string;
  color?: string;
  // Perfumes
  volumeMl?: 30 | 50 | 100 | number;
  scentProfile?: string;
  // Price & stock
  priceBWP: number;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  description: string;
  basePriceBWP: number;
  isActive: boolean;
  isNewArrival: boolean;
  imageUrls: string[];
  variants: ProductVariant[];
  featuredTag?: string;
}

export interface CartItem {
  variantId: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  variantLabel: string; // e.g., "50ml - Extrait" or "Size M / Charcoal"
}

export interface CustomerInput {
  fullName: string;
  phone: string;
  deliveryTown: string;
  deliveryAddress: string;
  deliveryPreference: DeliveryPreference;
}

export interface OrderItemRecord {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  variantLabel: string;
  unitPriceBWP: number;
  quantity: number;
  lineTotalBWP: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-1042
  customer: CustomerInput;
  items: OrderItemRecord[];
  subtotalBWP: number;
  deliveryFeeBWP: number;
  totalAmountBWP: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  paymentProofUrl?: string;
  verificationNotes?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface StoreMetrics {
  totalRevenueBWP: number;
  totalOrders: number;
  pendingVerifications: number;
  activeDeliveries: number;
  topScents: { scent: string; count: number }[];
  fastMovingSizes: { size: string; count: number }[];
}

export interface CustomerReview {
  id: string;
  productId: string;
  customerName: string;
  town: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  date: string;
  verified: boolean;
}
