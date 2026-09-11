import {
  CartItem,
  Order,
  OrderCustomer,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductVariant,
} from '@/types';
import {
  DELIVERY_OPTIONS_BY_ID,
  ORDER_STATUS_META,
  PAYMENT_OPTIONS_BY_ID,
  SELLER_CONFIG,
} from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { getVariantLabel } from '@/lib/product';

/**
 * Normalises any Botswana phone input to the digits-only MSISDN form used by
 * wa.me — `+267 71 550 200`, `26771550200` and `71550200` all become
 * `26771550200`.
 */
export function normaliseBotswanaPhone(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');

  if (!digits) return '';
  if (digits.startsWith('267')) return digits;
  if (digits.length <= 8) return `267${digits}`;

  // Handles numbers entered as `00267…` or with a stray leading zero.
  if (digits.startsWith('00267')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 9) return `267${digits.slice(1)}`;

  return digits;
}

/** Validates a Botswana mobile number (8 local digits, starting 7). */
export function isValidBotswanaPhone(rawPhone: string): boolean {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  const local = digits.startsWith('267') ? digits.slice(3) : digits.replace(/^0/, '');

  return /^7\d{7}$/.test(local);
}

/** Pretty rendering, e.g. `+267 71 550 200`. */
export function formatBotswanaPhone(rawPhone: string): string {
  const normalised = normaliseBotswanaPhone(rawPhone);
  if (normalised.length !== 11) return rawPhone;
  return `+${normalised.slice(0, 3)} ${normalised.slice(3, 5)} ${normalised.slice(5, 8)} ${normalised.slice(8)}`;
}

/** Generates the `ORD-8421` style reference used as the payment reference. */
export function generateOrderNumber(): string {
  const reference = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${reference}`;
}

/** Builds a `wa.me` deep link with a pre-encoded message. */
export function buildWhatsAppLink(recipientPhone: string, message: string): string {
  const recipient = normaliseBotswanaPhone(recipientPhone);
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}

interface ReceiptCartOptions {
  items: CartItem[];
  orderNumber: string;
  customer: OrderCustomer;
  subtotalBWP: number;
  deliveryFeeBWP: number;
  totalAmountBWP: number;
  paymentMethod: PaymentMethod;
}

/**
 * Formats the human readable order receipt pushed to WhatsApp. Written in a
 * plain-text style that stays legible inside WhatsApp on low-end phones.
 */
export function buildOrderReceipt(options: ReceiptCartOptions): string {
  const delivery = DELIVERY_OPTIONS_BY_ID[options.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[options.paymentMethod];

  const itemLines = options.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.product.title}\n   ${item.variantLabel} × ${item.quantity} — ${formatBWP(
          item.unitPriceBWP * item.quantity
        )}`
    )
    .join('\n');

  const deliveryLine =
    options.deliveryFeeBWP > 0
      ? formatBWP(options.deliveryFeeBWP)
      : 'FREE (Francistown pickup)';

  return [
    `*NEW ORDER — ${SELLER_CONFIG.storeName}*`,
    `Reference: *${options.orderNumber}*`,
    '',
    `Dumelang ${options.customer.name}! Here is my order summary:`,
    '',
    '*Items:*',
    itemLines,
    '',
    '*Order Total:*',
    `Subtotal: ${formatBWP(options.subtotalBWP)}`,
    `Delivery (${delivery?.shortLabel ?? 'Delivery'}): ${deliveryLine}`,
    `*Total Due: ${formatBWP(options.totalAmountBWP)}*`,
    '',
    '*Delivery Details:*',
    `Town: ${options.customer.town}`,
    `Address / Pickup point: ${options.customer.address || 'To be confirmed'}`,
    `Preference: ${delivery?.label ?? options.customer.deliveryPreference}`,
    '',
    '*Payment:*',
    `${payment?.label ?? options.paymentMethod}`,
    payment?.recipientNumber
      ? `Recipient: ${payment.recipientNumber} (${payment.recipientName})`
      : 'Cash to be handed over at the pickup point',
    `Payment reference: *${options.orderNumber}*`,
    '',
    'I am sending my payment confirmation screenshot right after this message. Ke a leboga!',
  ].join('\n');
}

/** WhatsApp dispatch link for a freshly created order (the 1-tap checkout CTA). */
export function buildOrderWhatsAppLink(order: Order): string {
  const message = buildOrderReceipt({
    items: order.items.map((item) => ({
      product: { title: item.productTitle } as Product,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPriceBWP: item.unitPriceBWP,
    })),
    orderNumber: order.orderNumber,
    customer: order.customer,
    subtotalBWP: order.subtotalBWP,
    deliveryFeeBWP: order.deliveryFeeBWP,
    totalAmountBWP: order.totalAmountBWP,
    paymentMethod: order.paymentMethod,
  });

  return buildWhatsAppLink(SELLER_CONFIG.sellerWhatsApp, message);
}

/** Status update ping sent by the seller to the customer from the admin kanban. */
export function buildStatusUpdateLink(order: Order, status: OrderStatus): string {
  const firstName = order.customer.name.split(' ')[0] || 'there';

  const bodies: Record<OrderStatus, string> = {
    pending_verification: [
      `Dumelang ${firstName}! 👋`,
      `We have received order *#${order.orderNumber}* (${formatBWP(order.totalAmountBWP)}).`,
      'Once your payment reflects we will verify it and start packing straight away.',
    ].join('\n'),
    payment_confirmed: [
      `Dumelang ${firstName}! ✅`,
      `Your payment for order *#${order.orderNumber}* (${formatBWP(order.totalAmountBWP)}) is confirmed.`,
      'We are packing your items now and will ping you the moment they leave our hands.',
    ].join('\n'),
    dispatched: [
      `Dumelang ${firstName}! 🚚`,
      `Order *#${order.orderNumber}* is on the way to ${order.customer.town}.`,
      `Delivery: ${DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference]?.label ?? 'Courier'}.`,
      'Please keep your phone reachable today.',
    ].join('\n'),
    completed: [
      `Dumelang ${firstName}! 🌸`,
      `Order *#${order.orderNumber}* is complete. Thank you for shopping local with ${SELLER_CONFIG.storeName}!`,
      'If anything is not perfect, reply here within 48 hours and we will sort it out.',
    ].join('\n'),
  };

  return buildWhatsAppLink(order.customer.phone, bodies[status]);
}

/** Generic "ask about this piece" link used on product detail surfaces. */
export function buildProductEnquiryLink(product: Product, variant?: ProductVariant): string {
  const message = [
    `Dumelang ${SELLER_CONFIG.storeName}! I would like to ask about:`,
    `*${product.title}*`,
    variant ? `Option: ${getVariantLabel(variant)} (${formatBWP(variant.priceBWP)})` : '',
    '',
    'Is this available?',
  ]
    .filter(Boolean)
    .join('\n');

  return buildWhatsAppLink(SELLER_CONFIG.sellerWhatsApp, message);
}

/** Store-wide support link used in the header and footer. */
export function buildSupportLink(context?: string): string {
  const parts = [`Dumelang ${SELLER_CONFIG.storeName}!`, context ?? 'I have a question about my order.'];
  return buildWhatsAppLink(SELLER_CONFIG.sellerWhatsApp, parts.join(' '));
}

/** Short label for a status, used on receipts and dashboards. */
export function getStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_META[status]?.label ?? status;
}
