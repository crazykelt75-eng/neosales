import {
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  SalesChannel,
} from '@/types';
import { BOTSWANA_TIME_ZONE } from '@/lib/constants';

/** Statuses where money has actually landed in the business. */
export const REVENUE_STATUSES: OrderStatus[] = ['payment_confirmed', 'dispatched', 'completed'];

/** Statuses that represent a live, unfulfilled obligation. */
export const OPEN_STATUSES: OrderStatus[] = ['pending_verification', 'payment_confirmed', 'dispatched'];

/** Hours an order may sit in Pending Verification before it needs chasing. */
export const PENDING_CHASE_HOURS = 24;

/** Local calendar date (`YYYY-MM-DD`) in Botswana time, used for daily cash-ups. */
export function toBotswanaDateKey(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'unknown';

  // en-CA yields YYYY-MM-DD, which sorts correctly as a string key.
  return date.toLocaleDateString('en-CA', { timeZone: BOTSWANA_TIME_ZONE });
}

/** Today's date key in Botswana time. */
export function todayDateKey(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: BOTSWANA_TIME_ZONE });
}

/** `12 Sep 2026` from a `YYYY-MM-DD` key, for headings. */
export function formatDateKeyLong(dateKey: string, now: Date = new Date()): string {
  if (dateKey === 'unknown') return 'Undated';

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));

  const today = todayDateKey(now);
  const yesterday = todayDateKey(new Date(now.getTime() - 86_400_000));

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Day-by-day cash-up for the reconciliation view. */
export interface DailyReconciliation {
  dateKey: string;
  orderCount: number;
  /** Takings per payment rail, in Pula. */
  byRail: Record<PaymentMethod, number>;
  /** Value of orders recognised as revenue that day. */
  collectedBWP: number;
  /** Value of orders still awaiting payment that day. */
  pendingBWP: number;
  /**
   * Cash-on-pickup money that has not been handed over yet (order not completed),
   * so it is never mistaken for takings.
   */
  uncollectedCashBWP: number;
}

/**
 * Buckets orders into local (Botswana) days for a cash-up.
 *
 * Revenue is dated by `verifiedAt` when present, otherwise `createdAt`. Orders
 * cancelled are excluded from takings entirely rather than inflating figures.
 */
export function buildDailyReconciliation(orders: Order[], dayCount = 14): DailyReconciliation[] {
  const buckets = new Map<string, DailyReconciliation>();

  const emptyBucket = (dateKey: string): DailyReconciliation => ({
    dateKey,
    orderCount: 0,
    byRail: { orange_money: 0, fnb_pay2cell: 0, cash_on_pickup: 0 },
    collectedBWP: 0,
    pendingBWP: 0,
    uncollectedCashBWP: 0,
  });

  // Seed the last N days so quiet days still show up as zeros.
  for (let index = 0; index < dayCount; index += 1) {
    const key = todayDateKey(new Date(Date.now() - index * 86_400_000));
    buckets.set(key, emptyBucket(key));
  }

  orders.forEach((order) => {
    if (order.status === 'cancelled') return;

    const dateKey = toBotswanaDateKey(order.verifiedAt ?? order.createdAt);
    const bucket = buckets.get(dateKey) ?? emptyBucket(dateKey);

    bucket.orderCount += 1;

    if (REVENUE_STATUSES.includes(order.status)) {
      bucket.collectedBWP += order.totalAmountBWP;
      bucket.byRail[order.paymentMethod] += order.totalAmountBWP;

      if (order.paymentMethod === 'cash_on_pickup' && order.status !== 'completed') {
        bucket.uncollectedCashBWP += order.totalAmountBWP;
      }
    } else {
      bucket.pendingBWP += order.totalAmountBWP;
    }

    buckets.set(dateKey, bucket);
  });

  return Array.from(buckets.values()).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
}

/** Totals across a date range, used for the headline figures. */
export interface ReconciliationTotals {
  collectedBWP: number;
  pendingBWP: number;
  uncollectedCashBWP: number;
  byRail: Record<PaymentMethod, number>;
  orderCount: number;
}

export function sumDailyReconciliation(days: DailyReconciliation[]): ReconciliationTotals {
  return days.reduce<ReconciliationTotals>(
    (totals, day) => ({
      collectedBWP: totals.collectedBWP + day.collectedBWP,
      pendingBWP: totals.pendingBWP + day.pendingBWP,
      uncollectedCashBWP: totals.uncollectedCashBWP + day.uncollectedCashBWP,
      orderCount: totals.orderCount + day.orderCount,
      byRail: {
        orange_money: totals.byRail.orange_money + day.byRail.orange_money,
        fnb_pay2cell: totals.byRail.fnb_pay2cell + day.byRail.fnb_pay2cell,
        cash_on_pickup: totals.byRail.cash_on_pickup + day.byRail.cash_on_pickup,
      },
    }),
    {
      collectedBWP: 0,
      pendingBWP: 0,
      uncollectedCashBWP: 0,
      orderCount: 0,
      byRail: { orange_money: 0, fnb_pay2cell: 0, cash_on_pickup: 0 },
    }
  );
}

/** Orders that need chasing because they have been unpaid for too long. */
export function getOrdersNeedingChase(
  orders: Order[],
  now: Date = new Date(),
  thresholdHours = PENDING_CHASE_HOURS
): Order[] {
  const cutoff = now.getTime() - thresholdHours * 3_600_000;

  return orders
    .filter(
      (order) =>
        order.status === 'pending_verification' && new Date(order.createdAt).getTime() <= cutoff
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Hours an order has been waiting, rounded down. */
export function getAgeInHours(isoDate: string, now: Date = new Date()): number {
  const created = new Date(isoDate).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 3_600_000));
}

/* -------------------------------------------------------------------------- *
 * Search & filtering
 * -------------------------------------------------------------------------- */

export interface OrderFilters {
  query: string;
  status: OrderStatus | 'all' | 'open';
  /** Inclusive `YYYY-MM-DD` bounds; empty strings mean "no bound". */
  fromDate: string;
  toDate: string;
  channel: SalesChannel | 'all';
}

export const EMPTY_ORDER_FILTERS: OrderFilters = {
  query: '',
  status: 'all',
  fromDate: '',
  toDate: '',
  channel: 'all',
};

/** True when any filter would change the result set. */
export function hasActiveOrderFilters(filters: OrderFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.fromDate !== '' ||
    filters.toDate !== '' ||
    filters.channel !== 'all'
  );
}

/**
 * Applies the dashboard's search box and filters. The query matches order
 * number, customer name, phone (ignoring spaces) and payment reference.
 */
export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const needle = filters.query.trim().toLowerCase();
  const needleDigits = needle.replace(/\D/g, '');

  return orders.filter((order) => {
    if (filters.status === 'open' && !OPEN_STATUSES.includes(order.status)) return false;
    if (filters.status !== 'all' && filters.status !== 'open' && order.status !== filters.status) return false;

    if (filters.channel !== 'all') {
      const channel = order.channel ?? 'website';
      if (channel !== filters.channel) return false;
    }

    if (filters.fromDate) {
      if (toBotswanaDateKey(order.createdAt) < filters.fromDate) return false;
    }

    if (filters.toDate) {
      if (toBotswanaDateKey(order.createdAt) > filters.toDate) return false;
    }

    if (!needle) return true;

    if (order.orderNumber.toLowerCase().includes(needle)) return true;
    if (order.customer.name.toLowerCase().includes(needle)) return true;
    if (order.customer.town.toLowerCase().includes(needle)) return true;
    if (order.paymentReference?.toLowerCase().includes(needle)) return true;
    if (needleDigits.length >= 3 && order.customer.phone.replace(/\D/g, '').includes(needleDigits)) return true;
    if (
      order.items.some(
        (item) =>
          item.productTitle.toLowerCase().includes(needle) ||
          item.variantLabel.toLowerCase().includes(needle)
      )
    ) {
      return true;
    }

    return false;
  });
}

/* -------------------------------------------------------------------------- *
 * Inventory intelligence
 * -------------------------------------------------------------------------- */

export interface ReorderSuggestion {
  productId: string;
  productTitle: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  /** Units sold in the trailing window — the basis for the suggestion. */
  unitsSold: number;
  /** Suggested purchase quantity (fast movers get more). */
  suggestedQuantity: number;
}

/**
 * Suggests what to reorder: anything at or below its threshold, ranked by how
 * fast it actually moves, with a suggested quantity derived from real sales.
 */
export function getReorderSuggestions(products: Product[], orders: Order[]): ReorderSuggestion[] {
  const unitsSoldByVariant = new Map<string, number>();

  orders
    .filter((order) => order.status !== 'cancelled')
    .forEach((order) => {
      order.items.forEach((item) => {
        unitsSoldByVariant.set(item.variantId, (unitsSoldByVariant.get(item.variantId) ?? 0) + item.quantity);
      });
    });

  return products
    .flatMap((product) =>
      product.variants
        .filter((variant) => variant.stockQuantity <= variant.lowStockThreshold)
        .map((variant) => {
          const unitsSold = unitsSoldByVariant.get(variant.id) ?? 0;
          const baseline = Math.max(variant.lowStockThreshold * 2, unitsSold, 3);

          return {
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantLabel: [variant.size, variant.color, variant.volumeMl ? `${variant.volumeMl}ml` : null]
              .filter(Boolean)
              .join(' · ') || 'Standard',
            sku: variant.sku,
            stockQuantity: variant.stockQuantity,
            lowStockThreshold: variant.lowStockThreshold,
            unitsSold,
            suggestedQuantity: Math.max(1, baseline - variant.stockQuantity),
          };
        })
    )
    .sort((a, b) => a.stockQuantity - b.stockQuantity || b.unitsSold - a.unitsSold);
}

/* -------------------------------------------------------------------------- *
 * Customer intelligence
 * -------------------------------------------------------------------------- */

export interface CustomerSummary {
  /** Normalised phone number — the customer's identity in this market. */
  phone: string;
  name: string;
  town: string;
  orderCount: number;
  /** Lifetime value across non-cancelled orders. */
  lifetimeValueBWP: number;
  lastOrderAt: string;
  /** Favourite products, most purchased first. */
  favouriteProducts: string[];
}

/**
 * Groups orders by WhatsApp number so the seller can spot repeat buyers and
 * follow up on restocks. Orders from the same number are merged regardless of
 * spelling differences in the name.
 */
export function buildCustomerSummaries(orders: Order[]): CustomerSummary[] {
  const byPhone = new Map<string, CustomerSummary>();
  const productCounts = new Map<string, Map<string, number>>();

  orders
    .filter((order) => order.status !== 'cancelled')
    .forEach((order) => {
      const phone = order.customer.phone.replace(/\s/g, '');
      const existing = byPhone.get(phone);

      const counts = productCounts.get(phone) ?? new Map<string, number>();
      order.items.forEach((item) => {
        counts.set(item.productTitle, (counts.get(item.productTitle) ?? 0) + item.quantity);
      });
      productCounts.set(phone, counts);

      if (!existing) {
        byPhone.set(phone, {
          phone,
          name: order.customer.name,
          town: order.customer.town,
          orderCount: 1,
          lifetimeValueBWP: order.totalAmountBWP,
          lastOrderAt: order.createdAt,
          favouriteProducts: [],
        });
        return;
      }

      existing.orderCount += 1;
      existing.lifetimeValueBWP += order.totalAmountBWP;

      if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
        existing.lastOrderAt = order.createdAt;
        existing.name = order.customer.name;
        existing.town = order.customer.town;
      }
    });

  return Array.from(byPhone.values())
    .map((summary) => ({
      ...summary,
      favouriteProducts: Array.from((productCounts.get(summary.phone) ?? new Map()).entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([title]) => title),
    }))
    .sort((a, b) => b.lifetimeValueBWP - a.lifetimeValueBWP);
}
