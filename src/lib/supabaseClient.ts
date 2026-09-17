import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CartItem,
  CustomerReview,
  Order,
  OrderCustomer,
  OrderStatus,
  PaymentMethod,
  Product,
  PromoCode,
  SalesChannel,
  StockAlert,
} from '@/types';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

const PRODUCT_IMAGE_BUCKET = 'product-images';
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads a seller-provided product image. Storage policies restrict writes to
 * authenticated entries in public.admin_users; the public bucket only exposes
 * the rendered catalogue image.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file to upload.');
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Image is too large. Keep it under 5 MB.');

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : 'webp';
  const path = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const client = requireSupabase();
  const { error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Online ordering is temporarily unavailable. Please order through WhatsApp.');
  return supabase;
}

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  category: Product['category'];
  description: string;
  base_price_bwp: number | string;
  is_active: boolean;
  is_new_arrival: boolean;
  image_urls: string[] | null;
  featured_tag: string | null;
  product_variants: Array<{
    id: string;
    product_id: string;
    sku: string;
    size: string | null;
    color: string | null;
    volume_ml: number | null;
    scent_profile: string | null;
    price_bwp: number | string;
    stock_quantity: number;
    low_stock_threshold: number;
  }> | null;
};

type CloudOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_town: string;
  customer_address: string;
  delivery_preference: OrderCustomer['deliveryPreference'];
  payment_method: PaymentMethod;
  subtotal_bwp: number | string;
  discount_bwp: number | string | null;
  bundle_discount_bwp: number | string | null;
  promo_code: string | null;
  promo_discount_bwp: number | string | null;
  delivery_fee_bwp: number | string;
  total_amount_bwp: number | string;
  status: OrderStatus;
  channel: Order['channel'] | null;
  payment_reference: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  pickup_date: string | null;
  pickup_window: string | null;
  pickup_point: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string | null;
    variant_id: string | null;
    product_title: string;
    variant_label: string;
    unit_price_bwp: number | string;
    quantity: number;
    line_total_bwp: number | string;
  }>;
  timeline?: Array<{
    id: string;
    at: string;
    label: string;
    detail?: string | null;
    actor: 'customer' | 'seller' | 'system';
  }>;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    description: row.description,
    basePriceBWP: Number(row.base_price_bwp),
    isActive: row.is_active,
    isNewArrival: row.is_new_arrival,
    featuredTag: row.featured_tag ?? undefined,
    imageUrls: (row.image_urls ?? []).map(getOptimizedImageUrl),
    variants: (row.product_variants ?? []).map((variant) => ({
      id: variant.id,
      productId: variant.product_id,
      sku: variant.sku,
      size: variant.size ?? undefined,
      color: variant.color ?? undefined,
      volumeMl: variant.volume_ml ?? undefined,
      scentProfile: variant.scent_profile ?? undefined,
      priceBWP: Number(variant.price_bwp),
      stockQuantity: variant.stock_quantity,
      lowStockThreshold: variant.low_stock_threshold,
    })),
  };
}

export function mapCloudOrder(row: CloudOrder): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      town: row.customer_town,
      address: row.customer_address,
      deliveryPreference: row.delivery_preference,
    },
    items: (row.items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id ?? '',
      variantId: item.variant_id ?? '',
      productTitle: item.product_title,
      variantLabel: item.variant_label,
      unitPriceBWP: Number(item.unit_price_bwp),
      quantity: item.quantity,
      lineTotalBWP: Number(item.line_total_bwp),
    })),
    subtotalBWP: Number(row.subtotal_bwp),
    discountBWP: Number(row.discount_bwp ?? 0),
    bundleDiscountBWP: Number(row.bundle_discount_bwp ?? 0),
    promoCode: row.promo_code ?? undefined,
    promoDiscountBWP: Number(row.promo_discount_bwp ?? 0),
    deliveryFeeBWP: Number(row.delivery_fee_bwp),
    totalAmountBWP: Number(row.total_amount_bwp),
    paymentMethod: row.payment_method,
    status: row.status,
    channel: row.channel ?? 'website',
    createdAt: row.created_at,
    verifiedAt: row.verified_at ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    verificationNotes: row.verification_notes ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    pickupSlot:
      row.pickup_date && row.pickup_window && row.pickup_point
        ? { date: row.pickup_date, window: row.pickup_window, point: row.pickup_point }
        : undefined,
    timeline: (row.timeline ?? []).map((event) => ({
      id: event.id,
      at: event.at,
      label: event.label,
      detail: event.detail ?? undefined,
      actor: event.actor,
    })),
  };
}

const PRODUCT_SELECT = `id,title,slug,category,description,base_price_bwp,is_active,is_new_arrival,image_urls,featured_tag,
  product_variants(id,product_id,sku,size,color,volume_ml,scent_profile,price_bwp,stock_quantity,low_stock_threshold)`;

export async function fetchLiveProducts(): Promise<Product[]> {
  const { data, error } = await requireSupabase()
    .from('products').select(PRODUCT_SELECT).eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const { data, error } = await requireSupabase()
    .from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function createCloudOrder(input: {
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  promoCode?: string;
}): Promise<Order> {
  const { data, error } = await requireSupabase().rpc('create_public_order', {
    p_customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      town: input.customer.town,
      address: input.customer.address,
      delivery_preference: input.customer.deliveryPreference,
    },
    p_payment_method: input.paymentMethod,
    p_items: input.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_promo_code: input.promoCode ?? null,
  });
  if (error) throw new Error(error.message);
  return mapCloudOrder(data as CloudOrder);
}

export async function createCloudAdminOrder(input: {
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  channel: Exclude<SalesChannel, 'website'>;
  isFulfilled: boolean;
  note?: string;
}): Promise<Order> {
  const { data, error } = await requireSupabase().rpc('create_admin_order', {
    p_customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      town: input.customer.town,
      address: input.customer.address,
      delivery_preference: input.customer.deliveryPreference,
    },
    p_payment_method: input.paymentMethod,
    p_items: input.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_channel: input.channel,
    p_is_fulfilled: input.isFulfilled,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  return mapCloudOrder(data as CloudOrder);
}

export async function trackCloudOrder(orderNumber: string, phoneTail: string): Promise<Order | null> {
  const { data, error } = await requireSupabase().rpc('track_order', {
    p_order_number: orderNumber,
    p_phone_tail: phoneTail,
  });
  if (error) throw error;
  return data ? mapCloudOrder(data as CloudOrder) : null;
}

export async function submitCloudPaymentReference(
  orderNumber: string,
  phoneTail: string,
  paymentReference: string
): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('submit_payment_reference', {
    p_order_number: orderNumber,
    p_phone_tail: phoneTail,
    p_payment_reference: paymentReference,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function fetchLiveOrders(): Promise<Order[]> {
  const { data, error } = await requireSupabase()
    .from('orders')
    .select(`*,order_items(id,product_id,variant_id,product_title_snapshot,variant_label_snapshot,unit_price_bwp,quantity,line_total_bwp),order_events(id,created_at,label,detail,actor)`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) =>
    mapCloudOrder({
      ...(row as unknown as CloudOrder),
      items: ((row.order_items as Array<Record<string, unknown>>) ?? []).map((item) => ({
        id: String(item.id),
        product_id: item.product_id ? String(item.product_id) : null,
        variant_id: item.variant_id ? String(item.variant_id) : null,
        product_title: String(item.product_title_snapshot),
        variant_label: String(item.variant_label_snapshot),
        unit_price_bwp: item.unit_price_bwp as number | string,
        quantity: Number(item.quantity),
        line_total_bwp: item.line_total_bwp as number | string,
      })),
      timeline: ((row.order_events as Array<Record<string, unknown>>) ?? []).map((event) => ({
        id: String(event.id),
        at: String(event.created_at),
        label: String(event.label),
        detail: event.detail ? String(event.detail) : null,
        actor: event.actor as 'customer' | 'seller' | 'system',
      })),
    })
  );
}

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await requireSupabase().from('promo_codes').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    percentOff: row.percent_off,
    minSubtotalBWP: Number(row.min_subtotal_bwp),
    maxDiscountBWP: row.max_discount_bwp == null ? undefined : Number(row.max_discount_bwp),
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined,
    description: row.description,
  }));
}

export async function fetchLiveReviews(): Promise<CustomerReview[]> {
  const { data, error } = await requireSupabase()
    .from('customer_reviews')
    // Do not join orders in this public query. Orders intentionally have no
    // anon SELECT privilege because they contain private customer details.
    .select('id,product_id,customer_name,town,rating,comment,is_verified,reviewed_on')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    customerName: row.customer_name,
    town: row.town,
    rating: row.rating as CustomerReview['rating'],
    comment: row.comment,
    verified: row.is_verified,
    date: row.reviewed_on,
  }));
}

export async function submitCloudReview(
  review: Omit<CustomerReview, 'id' | 'date'>
): Promise<CustomerReview> {
  const { data, error } = await requireSupabase().rpc('submit_review', {
    p_product_id: review.productId,
    p_customer_name: review.customerName,
    p_town: review.town,
    p_rating: review.rating,
    p_comment: review.comment,
    p_order_number: review.orderNumber ?? null,
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    productId: data.product_id,
    customerName: data.customer_name,
    town: data.town,
    rating: data.rating,
    comment: data.comment,
    verified: data.is_verified,
    date: data.reviewed_on,
    orderNumber: data.order_number ?? undefined,
  };
}

export async function saveCloudPromo(promo: PromoCode): Promise<void> {
  const { error } = await requireSupabase().from('promo_codes').upsert({
    id: promo.id,
    code: promo.code.toUpperCase(),
    percent_off: promo.percentOff,
    min_subtotal_bwp: promo.minSubtotalBWP,
    max_discount_bwp: promo.maxDiscountBWP ?? null,
    is_active: promo.isActive,
    expires_at: promo.expiresAt ?? null,
    description: promo.description,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteCloudPromo(promoId: string): Promise<void> {
  const { error } = await requireSupabase().from('promo_codes').delete().eq('id', promoId);
  if (error) throw error;
}

export async function fetchCloudStockAlerts(products: Product[]): Promise<StockAlert[]> {
  const { data, error } = await requireSupabase()
    .from('stock_alerts')
    .select('id,product_id,variant_id,customer_phone,created_at,notified_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const product = products.find((candidate) => candidate.id === row.product_id);
    const variant = product?.variants.find((candidate) => candidate.id === row.variant_id);
    return {
      id: row.id,
      productId: row.product_id,
      productTitle: product?.title ?? 'Product',
      variantId: row.variant_id,
      variantLabel: variant?.sku ?? 'Variant',
      phone: row.customer_phone,
      createdAt: row.created_at,
      notifiedAt: row.notified_at ?? undefined,
    };
  });
}

export async function updateCloudStockAlert(alertId: string, notifiedAt: string): Promise<void> {
  const { error } = await requireSupabase().from('stock_alerts')
    .update({ notified_at: notifiedAt }).eq('id', alertId);
  if (error) throw error;
}

export async function deleteCloudStockAlert(alertId: string): Promise<void> {
  const { error } = await requireSupabase().from('stock_alerts').delete().eq('id', alertId);
  if (error) throw error;
}

export async function syncOrderStatus(order: Order): Promise<void> {
  const { error } = await requireSupabase().from('orders').update({
    status: order.status,
    verification_notes: order.verificationNotes ?? null,
    verified_at: order.verifiedAt ?? null,
    payment_reference: order.paymentReference ?? null,
    cancelled_at: order.cancelledAt ?? null,
    cancel_reason: order.cancelReason ?? null,
    pickup_date: order.pickupSlot?.date ?? null,
    pickup_window: order.pickupSlot?.window ?? null,
    pickup_point: order.pickupSlot?.point ?? null,
  }).eq('id', order.id);
  if (error) throw error;
}

export async function syncVariantStock(variantId: string, stockQuantity: number): Promise<void> {
  const { error } = await requireSupabase().from('product_variants')
    .update({ stock_quantity: stockQuantity }).eq('id', variantId);
  if (error) throw error;
}

export async function syncProductActive(productId: string, isActive: boolean): Promise<void> {
  const { error } = await requireSupabase().from('products').update({ is_active: isActive }).eq('id', productId);
  if (error) throw error;
}

/** Updates the storefront-facing fields of an existing seller product. Stock is
 * deliberately managed through the inventory controls, not this editor. */
export async function updateCloudProductDetails(product: Product): Promise<void> {
  const { error } = await requireSupabase()
    .from('products')
    .update({
      title: product.title,
      slug: product.slug,
      category: product.category,
      description: product.description,
      base_price_bwp: product.basePriceBWP,
      image_urls: product.imageUrls,
    })
    .eq('id', product.id);
  if (error) throw error;
}

export async function persistProduct(product: Product): Promise<void> {
  const client = requireSupabase();
  const { error: productError } = await client.from('products').insert({
    id: product.id,
    title: product.title,
    slug: product.slug,
    category: product.category,
    description: product.description,
    base_price_bwp: product.basePriceBWP,
    is_active: product.isActive,
    is_new_arrival: product.isNewArrival,
    featured_tag: product.featuredTag ?? null,
    image_urls: product.imageUrls,
  });
  if (productError) throw productError;
  const { error: variantsError } = await client.from('product_variants').insert(product.variants.map((variant) => ({
    id: variant.id,
    product_id: product.id,
    sku: variant.sku,
    size: variant.size ?? null,
    color: variant.color ?? null,
    volume_ml: variant.volumeMl ?? null,
    scent_profile: variant.scentProfile ?? null,
    price_bwp: variant.priceBWP,
    stock_quantity: variant.stockQuantity,
    low_stock_threshold: variant.lowStockThreshold,
  })));
  if (variantsError) throw variantsError;
}

export async function subscribeCloudStockAlert(variantId: string, phone: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('subscribe_stock_alert', {
    p_variant_id: variantId,
    p_customer_phone: phone,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function signInAdmin(email: string, password: string, captchaToken?: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : undefined,
  });
  if (error) throw error;
  if (!(await isCurrentUserAdmin())) {
    await client.auth.signOut();
    throw new Error('This account does not have seller access.');
  }
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getAdminSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from('admin_users').select('user_id').maybeSingle();
  return !error && Boolean(data);
}

export function onAdminAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export type { Session };
