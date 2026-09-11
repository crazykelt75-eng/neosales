import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderStatus, PaymentMethod, Product } from '@/types';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client used only when both env vars are present. The storefront is
 * fully functional offline (localStorage) so `null` is a supported state.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/** True when live cloud persistence is available for this deployment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

interface ProductRow {
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
  product_variants:
    | {
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
      }[]
    | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_town: string | null;
  customer_address: string | null;
  delivery_preference: Order['customer']['deliveryPreference'];
  delivery_location: string | null;
  payment_method: PaymentMethod;
  subtotal_bwp: number | string;
  delivery_fee_bwp: number | string;
  total_amount_bwp: number | string;
  status: OrderStatus;
  verified_at: string | null;
  payment_reference: string | null;
  verification_notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  order_items:
    | {
        id: string;
        product_id: string | null;
        variant_id: string | null;
        product_title_snapshot: string;
        variant_label_snapshot: string;
        unit_price_bwp: number | string;
        quantity: number;
        line_total_bwp: number | string;
      }[]
    | null;
}

/** Loads the active catalog with its variants, normalised into domain `Product`s. */
export async function fetchLiveProducts(): Promise<Product[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('products')
    .select(
      `id, title, slug, category, description, base_price_bwp, is_active, is_new_arrival,
       image_urls, featured_tag,
       product_variants (
         id, product_id, sku, size, color, volume_ml, scent_profile,
         price_bwp, stock_quantity, low_stock_threshold
       )`
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return null;

  return (data as unknown as ProductRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    description: row.description,
    basePriceBWP: Number(row.base_price_bwp),
    isActive: row.is_active,
    isNewArrival: row.is_new_arrival,
    featuredTag: row.featured_tag ?? undefined,
    imageUrls: (row.image_urls ?? []).map((url) => getOptimizedImageUrl(url)),
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
  }));
}

/** Loads the most recent orders for the seller dashboard. */
export async function fetchLiveOrders(): Promise<Order[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, customer_name, customer_phone, customer_town, customer_address,
       delivery_preference, delivery_location, payment_method, subtotal_bwp,
       delivery_fee_bwp, total_amount_bwp, status, verified_at, payment_reference,
       verification_notes, cancelled_at, cancel_reason, created_at,
       order_items (
         id, product_id, variant_id, product_title_snapshot, variant_label_snapshot,
         unit_price_bwp, quantity, line_total_bwp
       )`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data?.length) return null;

  return (data as unknown as OrderRow[]).map((row) => {
    const [locationTown, ...restAddress] = (row.delivery_location ?? '').split(' - ');

    return {
      id: row.id,
      orderNumber: row.order_number,
      customer: {
        name: row.customer_name,
        phone: row.customer_phone,
        town: row.customer_town || locationTown || 'Francistown',
        address: row.customer_address || restAddress.join(' - ') || row.delivery_location || '',
        deliveryPreference: row.delivery_preference,
      },
      items: (row.order_items ?? []).map((item, index) => ({
        id: item.id || `item-${row.id}-${index}`,
        productId: item.product_id ?? '',
        variantId: item.variant_id ?? '',
        productTitle: item.product_title_snapshot,
        variantLabel: item.variant_label_snapshot,
        unitPriceBWP: Number(item.unit_price_bwp),
        quantity: item.quantity,
        lineTotalBWP: Number(item.line_total_bwp),
      })),
      subtotalBWP: Number(row.subtotal_bwp),
      deliveryFeeBWP: Number(row.delivery_fee_bwp),
      totalAmountBWP: Number(row.total_amount_bwp),
      paymentMethod: row.payment_method,
      status: row.status,
      createdAt: row.created_at,
      verifiedAt: row.verified_at ?? undefined,
      paymentReference: row.payment_reference ?? undefined,
      verificationNotes: row.verification_notes ?? undefined,
      cancelledAt: row.cancelled_at ?? undefined,
      cancelReason: row.cancel_reason ?? undefined,
    };
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Best-effort mirror of a locally created order into Supabase. Never throws. */
export async function persistOrder(order: Order): Promise<void> {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: order.orderNumber,
        customer_name: order.customer.name,
        customer_phone: order.customer.phone,
        customer_town: order.customer.town,
        customer_address: order.customer.address,
        delivery_preference: order.customer.deliveryPreference,
        delivery_location: `${order.customer.town} - ${order.customer.address}`,
        payment_method: order.paymentMethod,
        subtotal_bwp: order.subtotalBWP,
        delivery_fee_bwp: order.deliveryFeeBWP,
        total_amount_bwp: order.totalAmountBWP,
        status: order.status,
        payment_reference: order.paymentReference ?? null,
        cancelled_at: order.cancelledAt ?? null,
        cancel_reason: order.cancelReason ?? null,
      })
      .select('id')
      .single();

    if (error || !data) return;

    await supabase.from('order_items').insert(
      order.items.map((item) => ({
        order_id: data.id,
        product_id: UUID_PATTERN.test(item.productId) ? item.productId : null,
        variant_id: UUID_PATTERN.test(item.variantId) ? item.variantId : null,
        product_title_snapshot: item.productTitle,
        variant_label_snapshot: item.variantLabel,
        unit_price_bwp: item.unitPriceBWP,
        quantity: item.quantity,
        line_total_bwp: item.lineTotalBWP,
      }))
    );
  } catch {
    // Offline-first: local state remains the source of truth.
  }
}

/** Best-effort status/notes sync for an order. Never throws. */
export async function syncOrderStatus(order: Order): Promise<void> {
  if (!supabase) return;

  try {
    await supabase
      .from('orders')
      .update({
        status: order.status,
        verification_notes: order.verificationNotes ?? null,
        verified_at: order.verifiedAt ?? null,
        payment_reference: order.paymentReference ?? null,
        cancelled_at: order.cancelledAt ?? null,
        cancel_reason: order.cancelReason ?? null,
      })
      .eq('order_number', order.orderNumber);
  } catch {
    // Ignored — the dashboard still reflects local state.
  }
}

/** Best-effort stock sync after an order is confirmed or stock is adjusted. */
export async function syncVariantStock(variantId: string, stockQuantity: number): Promise<void> {
  if (!supabase || !UUID_PATTERN.test(variantId)) return;

  try {
    await supabase.from('product_variants').update({ stock_quantity: stockQuantity }).eq('id', variantId);
  } catch {
    // Ignored — local inventory remains authoritative for the session.
  }
}
