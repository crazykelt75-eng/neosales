import {
  DeliveryOption,
  OrderStatus,
  PaymentOption,
  ProductCategory,
  SellerConfig,
} from '@/types';

/**
 * Seller configuration. Every value is overridable through public environment
 * variables so the same build can be deployed for a different merchant.
 */
export const SELLER_CONFIG: SellerConfig = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'NeoSales',
  tagline: 'Authentic extrait perfumes & curated summer apparel',
  sellerWhatsApp: process.env.NEXT_PUBLIC_SELLER_WHATSAPP || '+26771550200',
  orangeMoneyNumber: process.env.NEXT_PUBLIC_ORANGE_MONEY_NUMBER || '74453342',
  fnbPay2CellNumber: process.env.NEXT_PUBLIC_FNB_PAY2CELL_NUMBER || '71550200',
  accountName: process.env.NEXT_PUBLIC_FNB_ACCOUNT_NAME || 'NeoSales Retail',
  pickupPoints: ['G-North', 'Galo Mall', 'Nswazwi Mall'],
};

/** Canonical public URL used by metadata, JSON-LD and the sitemap. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://neosales.crazykelt75.workers.dev';

/** Botswana Pula formatting helpers rely on this symbol. */
export const CURRENCY_CODE = 'BWP';
export const CURRENCY_SYMBOL = 'P';

/** Stock at or below this value triggers a storefront warning banner. */
export const LOW_STOCK_WARNING_CEILING = 3;

/**
 * Fulfilment rails, in the exact order presented at checkout.
 * Fees are inclusive of packaging and are expressed in whole Pula.
 */
export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'francistown_pickup',
    label: 'Francistown Free Pickup',
    shortLabel: 'Free Pickup',
    feeBWP: 0,
    description: 'Collect in person around Francistown — pay nothing for delivery.',
    coverage: ['G-North', 'Galo Mall', 'Nswazwi Mall'],
  },
  {
    id: 'local_courier',
    label: 'Local Courier / Cab',
    shortLabel: 'Local Courier',
    feeBWP: 45,
    description: 'Same-day courier or cab drop-off inside Gaborone & Francistown central.',
    coverage: ['Gaborone central', 'Francistown central'],
  },
  {
    id: 'nationwide_courier',
    label: 'Nationwide Sprint Couriers / PostNet',
    shortLabel: 'Nationwide Courier',
    feeBWP: 80,
    description: 'Counter-to-counter or doorstep delivery to every major Botswana town.',
    coverage: ['Maun', 'Kasane', 'Palapye', 'Mahalapye'],
  },
];

/** Convenience lookup for order totals and receipt generation. */
export const DELIVERY_OPTIONS_BY_ID: Record<string, DeliveryOption> = DELIVERY_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.id]: option }),
  {} as Record<string, DeliveryOption>
);

/** Payment rails, ordered by popularity with Botswana shoppers. */
export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'orange_money',
    label: 'Orange Money',
    description: 'Instant wallet transfer — dial *145# or use the Orange Money app.',
    pickupOnly: false,
    recipientNumber: SELLER_CONFIG.orangeMoneyNumber,
    recipientName: SELLER_CONFIG.accountName,
    instructions: [
      `Dial *145# and choose Send Money to ${SELLER_CONFIG.orangeMoneyNumber}.`,
      'Enter the exact total and use your order number as the payment reference.',
      'Screenshot the confirmation SMS and send it to us on WhatsApp.',
    ],
  },
  {
    id: 'fnb_pay2cell',
    label: 'FNB Pay2Cell',
    description: 'Send straight from the FNB app or cellphone banking.',
    pickupOnly: false,
    recipientNumber: SELLER_CONFIG.fnbPay2CellNumber,
    recipientName: SELLER_CONFIG.accountName,
    instructions: [
      `Open the FNB app (or dial *130#) and select Pay2Cell to ${SELLER_CONFIG.fnbPay2CellNumber}.`,
      'Pay the exact total and keep the confirmation SMS.',
      'Forward the confirmation to us on WhatsApp for same-day verification.',
    ],
  },
  {
    id: 'cash_on_pickup',
    label: 'Cash on Pickup',
    description: 'Pay in cash when you collect — available for Francistown pickups only.',
    pickupOnly: true,
    instructions: [
      'We will confirm your pickup point and a 1-hour collection window.',
      'Bring the exact amount in Pula and your order number.',
      'A digital receipt is issued on the spot.',
    ],
  },
];

/** Convenience lookup used by receipts and the admin order cards. */
export const PAYMENT_OPTIONS_BY_ID: Record<string, PaymentOption> = PAYMENT_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.id]: option }),
  {} as Record<string, PaymentOption>
);

/** Ordered kanban columns and their presentation metadata. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; accent: string }
> = {
  pending_verification: {
    label: 'Pending Verification',
    description: 'Awaiting payment confirmation from the customer.',
    accent: 'amber',
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    description: 'Funds received — pack and stage the parcel.',
    accent: 'emerald',
  },
  dispatched: {
    label: 'Dispatched',
    description: 'Handed to the courier or out for local delivery.',
    accent: 'sky',
  },
  completed: {
    label: 'Completed',
    description: 'Delivered or collected. Sale closed.',
    accent: 'neutral',
  },
};

/** Category tabs shown above the catalog grid. */
export const CATEGORY_TABS: { id: ProductCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Items' },
  { id: 'perfumes', label: 'Niche Perfumes' },
  { id: 'clothes', label: 'Summer Apparel' },
  { id: 'accessories', label: 'Accessories' },
];

/** Human readable category names for cards, receipts and structured data. */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  perfumes: 'Niche Perfumes',
  clothes: 'Summer Apparel',
  accessories: 'Accessories',
};

/** Towns offered as one-tap suggestions during checkout. */
export const BOTSWANA_TOWNS = [
  'Francistown',
  'Gaborone',
  'Maun',
  'Kasane',
  'Palapye',
  'Mahalapye',
  'Tonota',
  'Selebi-Phikwe',
  'Serowe',
  'Lobatse',
  'Molepolole',
  'Kanye',
];
