import { Order } from '@/types';

/**
 * Order-gated review verification.
 *
 * A review earns the verified-purchase badge only when the customer quotes a
 * reference that really is one of our orders *and* that order contains the
 * product being reviewed. Cancelled orders never qualify, and the reference
 * match ignores case, surrounding whitespace and a missing `ORD-` prefix so
 * buyers can copy it however their phone rendered it.
 */
export function normaliseOrderReference(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith('ORD-') ? cleaned : `ORD-${cleaned}`;
}

export function matchVerifiedOrder(
  orders: Order[],
  productId: string,
  claimedReference: string
): Order | undefined {
  const claimed = normaliseOrderReference(claimedReference);
  if (!claimed) return undefined;

  return orders.find(
    (order) =>
      normaliseOrderReference(order.orderNumber) === claimed &&
      order.status !== 'cancelled' &&
      order.items.some((item) => item.productId === productId)
  );
}
