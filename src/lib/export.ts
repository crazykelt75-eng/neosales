import {
  Order,
  Product,
  StoreBackup,
} from '@/types';
import { DELIVERY_OPTIONS_BY_ID, ORDER_STATUS_META, PAYMENT_OPTIONS_BY_ID } from '@/lib/constants';
import { getVariantLabel } from '@/lib/product';

/** Current backup payload revision. Bump when the exported shape changes. */
export const BACKUP_VERSION = 1;

/* -------------------------------------------------------------------------- *
 * File download plumbing
 * -------------------------------------------------------------------------- */

/** Triggers a client-side download for generated text content. */
export function downloadFile(filename: string, contents: string, mimeType: string): void {
  // A UTF-8 BOM keeps Pula symbols and Setswana names intact in Excel.
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Give Safari a beat to start the download before revoking the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** `neosales-orders-2026-09-12` — sortable, human readable file names. */
export function timestampedFilename(prefix: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.${extension}`;
}

/* -------------------------------------------------------------------------- *
 * CSV generation
 * -------------------------------------------------------------------------- */

/** Escapes a value for CSV, quoting only when the content demands it. */
export function toCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsvRow(cells: (string | number | undefined | null)[]): string {
  return cells.map(toCsvCell).join(',');
}

/** Flattens an order's lines into one readable cell. */
function summariseItems(order: Order): string {
  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.productTitle} (${item.variantLabel}) @ P${item.unitPriceBWP.toFixed(2)}`
    )
    .join(' | ');
}

/**
 * Orders ledger for the seller and their accountant: one row per order, with
 * totals in Pula and the payment rail/reference needed for reconciliation.
 */
export function buildOrdersCsv(orders: Order[]): string {
  const header = [
    'Order Number',
    'Created At',
    'Status',
    'Customer Name',
    'Phone',
    'Town',
    'Address / Pickup Point',
    'Delivery Preference',
    'Channel',
    'Payment Method',
    'Payment Reference',
    'Subtotal (BWP)',
    'Bundle Discount (BWP)',
    'Promo Code',
    'Promo Discount (BWP)',
    'Delivery Fee (BWP)',
    'Total (BWP)',
    'Units',
    'Items',
    'Verified At',
    'Cancelled At',
    'Cancel Reason',
    'Seller Notes',
  ];

  const rows = orders.map((order) =>
    toCsvRow([
      order.orderNumber,
      new Date(order.createdAt).toISOString(),
      ORDER_STATUS_META[order.status]?.label ?? order.status,
      order.customer.name,
      order.customer.phone,
      order.customer.town,
      order.customer.address,
      DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference]?.label ?? order.customer.deliveryPreference,
      order.channel ?? 'website',
      PAYMENT_OPTIONS_BY_ID[order.paymentMethod]?.label ?? order.paymentMethod,
      order.paymentReference ?? '',
      order.subtotalBWP.toFixed(2),
      (order.bundleDiscountBWP ?? 0).toFixed(2),
      order.promoCode ?? '',
      (order.promoDiscountBWP ?? 0).toFixed(2),
      order.deliveryFeeBWP.toFixed(2),
      order.totalAmountBWP.toFixed(2),
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      summariseItems(order),
      order.verifiedAt ? new Date(order.verifiedAt).toISOString() : '',
      order.cancelledAt ? new Date(order.cancelledAt).toISOString() : '',
      order.cancelReason ?? '',
      order.verificationNotes ?? '',
    ])
  );

  return [toCsvRow(header), ...rows].join('\r\n');
}

/** Stock sheet for bulk edits in Excel: one row per purchasable variant. */
export function buildCatalogCsv(products: Product[]): string {
  const header = [
    'Product ID',
    'Title',
    'Slug',
    'Category',
    'Published',
    'New Arrival',
    'Base Price (BWP)',
    'Variant ID',
    'SKU',
    'Variant',
    'Price (BWP)',
    'Stock',
    'Low Stock Threshold',
    'Stock Value (BWP)',
  ];

  const rows = products.flatMap((product) =>
    product.variants.map((variant) =>
      toCsvRow([
        product.id,
        product.title,
        product.slug,
        product.category,
        product.isActive ? 'Yes' : 'No',
        product.isNewArrival ? 'Yes' : 'No',
        product.basePriceBWP.toFixed(2),
        variant.id,
        variant.sku,
        getVariantLabel(variant),
        variant.priceBWP.toFixed(2),
        variant.stockQuantity,
        variant.lowStockThreshold,
        (variant.priceBWP * variant.stockQuantity).toFixed(2),
      ])
    )
  );

  return [toCsvRow(header), ...rows].join('\r\n');
}

/* -------------------------------------------------------------------------- *
 * Full backup / restore
 * -------------------------------------------------------------------------- */

/** Builds a restorable snapshot of everything the seller owns. */
export function buildBackup(
  products: Product[],
  orders: Order[],
  extras: Pick<StoreBackup, 'reviews' | 'promoCodes' | 'stockAlerts'> = {}
): StoreBackup {
  return {
    app: 'neosales',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    products,
    orders,
    ...extras,
  };
}

/** Serialises a backup for download. */
export function serialiseBackup(backup: StoreBackup): string {
  return JSON.stringify(backup, null, 2);
}

export type BackupParseResult =
  | { ok: true; backup: StoreBackup; warnings: string[] }
  | { ok: false; error: string };

/**
 * Validates an uploaded backup before it is allowed anywhere near live data.
 * Structural checks are deliberately strict — a half-valid file would corrupt
 * the catalog and every order reference in it.
 */
export function parseBackup(rawText: string): BackupParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'That file is not valid JSON. Pick the .json backup you downloaded from NeoSales.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'That backup file is empty or malformed.' };
  }

  const candidate = parsed as Partial<StoreBackup>;

  if (candidate.app !== 'neosales') {
    return { ok: false, error: 'This is not a NeoSales backup file.' };
  }

  if (typeof candidate.version !== 'number' || candidate.version < 1) {
    return { ok: false, error: 'The backup file is missing its version marker.' };
  }

  if (candidate.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This backup was created by a newer version of the app (v${candidate.version}). Update the storefront before restoring it.`,
    };
  }

  if (!Array.isArray(candidate.products) || !Array.isArray(candidate.orders)) {
    return { ok: false, error: 'The backup is missing its catalog or order list.' };
  }

  const warnings: string[] = [];

  const products = candidate.products.filter((product): product is Product => {
    const valid =
      Boolean(product) &&
      typeof product.id === 'string' &&
      typeof product.title === 'string' &&
      typeof product.basePriceBWP === 'number' &&
      Array.isArray(product.variants);

    return valid;
  });

  const orders = candidate.orders.filter((order): order is Order => {
    const valid =
      Boolean(order) &&
      typeof order.orderNumber === 'string' &&
      typeof order.totalAmountBWP === 'number' &&
      Boolean(order.customer) &&
      Array.isArray(order.items);

    return valid;
  });

  if (products.length !== candidate.products.length) {
    warnings.push(
      `${candidate.products.length - products.length} catalog entr${
        candidate.products.length - products.length === 1 ? 'y was' : 'ies were'
      } skipped because they were incomplete.`
    );
  }

  if (orders.length !== candidate.orders.length) {
    warnings.push(
      `${candidate.orders.length - orders.length} order${
        candidate.orders.length - orders.length === 1 ? ' was' : 's were'
      } skipped because they were incomplete.`
    );
  }

  if (products.length === 0 && orders.length === 0) {
    return { ok: false, error: 'Nothing restorable was found in that backup file.' };
  }

  return {
    ok: true,
    warnings,
    backup: {
      app: 'neosales',
      version: candidate.version,
      exportedAt: candidate.exportedAt ?? new Date().toISOString(),
      products,
      orders,
      reviews: Array.isArray(candidate.reviews) ? candidate.reviews : undefined,
      promoCodes: Array.isArray(candidate.promoCodes) ? candidate.promoCodes : undefined,
      stockAlerts: Array.isArray(candidate.stockAlerts) ? candidate.stockAlerts : undefined,
    },
  };
}
