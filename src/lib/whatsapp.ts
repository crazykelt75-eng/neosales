import { Order, CartItem, PaymentMethod, DeliveryPreference } from '@/types';

/**
 * Normalizes phone numbers to standard Botswana international format (+267)
 * Handles "72123456", "26772123456", "+267 72 123 456", etc.
 */
export function formatBotswanaPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('267')) {
    return cleaned;
  }
  if (cleaned.length === 8) {
    return `267${cleaned}`;
  }
  return cleaned;
}

export const DELIVERY_OPTIONS_LABELS: Record<DeliveryPreference, { label: string; fee: number; desc: string }> = {
  collection: {
    label: 'Self-Collection (Pickup Point)',
    fee: 0,
    desc: 'Free pickup in Francistown (Nswazii / Galo Mall) or Tati Siding',
  },
  local_courier: {
    label: 'Nationwide Courier (Sprint / EMS)',
    fee: 45,
    desc: 'Express dispatch to Gaborone, Maun, Kasane & all Botswana towns',
  },
  in_person_meetup: {
    label: 'Safe Public Meetup',
    fee: 20,
    desc: 'Francistown CBD / Diggers Inn / Tati River Mall / Tati Siding',
  },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { name: string; subtitle: string }> = {
  orange_money: {
    name: 'Orange Money',
    subtitle: 'Transfer via USSD (*145#) or Orange Money App',
  },
  fnb_pay2cell: {
    name: 'FNB Pay2Cell',
    subtitle: 'Direct Cellphone Banking / FNB Banking App',
  },
};

/**
 * Generates an instant Click-to-Chat WhatsApp URL for buyer order confirmation
 */
export function generateWhatsAppOrderLink(
  order: Order,
  sellerPhone: string = process.env.NEXT_PUBLIC_SELLER_WHATSAPP || '+26772000000'
): string {
  const normalizedSellerPhone = formatBotswanaPhone(sellerPhone);
  const deliveryInfo = DELIVERY_OPTIONS_LABELS[order.customer.deliveryPreference];
  const paymentInfo = PAYMENT_METHOD_LABELS[order.paymentMethod];

  const itemsText = order.items
    .map(
      (item) =>
        `• *${item.productTitle}* (${item.variantLabel}) x${item.quantity} - P${item.lineTotalBWP.toFixed(2)}`
    )
    .join('\n');

  const proofText = order.paymentProofUrl
    ? '✅ *Proof of Payment:* Uploaded to order system (also attaching screenshot below)'
    : '📎 *Proof of Payment:* Attached as photo / SMS screenshot below';

  const rawMessage = 
`*NEW ORDER: #${order.orderNumber}*
Dumelang NeoSales! I just placed an order on your storefront.

*Customer Details:*
• Name: ${order.customer.fullName}
• Phone: ${order.customer.phone}
• Delivery: ${deliveryInfo.label}
• Location: ${order.customer.deliveryTown} - ${order.customer.deliveryAddress}

*Order Items:*
${itemsText}

-----------------------------
• Subtotal: P${order.subtotalBWP.toFixed(2)}
• Delivery Fee: ${order.deliveryFeeBWP > 0 ? `P${order.deliveryFeeBWP.toFixed(2)}` : 'FREE'}
• *Total Due: P${order.totalAmountBWP.toFixed(2)}*
-----------------------------

*Payment Selected:*
${paymentInfo.name}
Reference: *${order.orderNumber}*

${proofText}

Please confirm order verification when received. Thank you!`;

  return `https://wa.me/${normalizedSellerPhone}?text=${encodeURIComponent(rawMessage)}`;
}

/**
 * Generates automated WhatsApp status update links sent by the SELLER to the CUSTOMER
 */
export function generateSellerStatusPingLink(
  order: Order,
  statusType: 'payment_confirmed' | 'ready_for_pickup' | 'out_for_delivery' | 'completed'
): string {
  const customerNormalizedPhone = formatBotswanaPhone(order.customer.phone);
  let statusMessage = '';

  switch (statusType) {
    case 'payment_confirmed':
      statusMessage = 
`Dumelang ${order.customer.fullName}! 🌸
We have received and verified your payment for Order *#${order.orderNumber}* (P${order.totalAmountBWP.toFixed(2)}).

Your items are now being packaged with care. We will ping you once they are ready for dispatch!

Warm regards,
NeoSales Team`;
      break;

    case 'ready_for_pickup':
      statusMessage = 
`Dumelang ${order.customer.fullName}! 📦
Your parcel for Order *#${order.orderNumber}* is packaged and ready for collection!

📍 *Collection Point:* Francistown Hub (Nswazii Mall / Galo) or Tati Siding Collection Point (Show order ref *#${order.orderNumber}*)
🕒 Available between 09:00 - 17:30.

See you soon!`;
      break;

    case 'out_for_delivery':
      statusMessage = 
`Dumelang ${order.customer.fullName}! 🚚
Your order *#${order.orderNumber}* has been dispatched for delivery to:
${order.customer.deliveryTown} (${order.customer.deliveryAddress}).

Please ensure your phone (${order.customer.phone}) is reachable today. Thank you for shopping local with us! 🇧🇼`;
      break;

    case 'completed':
      statusMessage = 
`Dumelang ${order.customer.fullName}! ✨
Your Order *#${order.orderNumber}* is marked as completed!
We hope you love your new pieces. Tag @NeoSales with your new look! 🙌

Warm regards,
NeoSales Team`;
      break;
  }

  return `https://wa.me/${customerNormalizedPhone}?text=${encodeURIComponent(statusMessage)}`;
}
