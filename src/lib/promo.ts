import { CartItem, PromoCode } from '@/types';
import { todayDateKey } from '@/lib/analytics';

/**
 * Automatic bundle rule: two or more extrait perfumes in the bag earn 10% off
 * the perfume lines. Deliberately automatic — bundles convert best when the
 * customer does not have to find a code first.
 */
export const AUTOMATIC_BUNDLE = {
  minPerfumeUnits: 2,
  percentOff: 10,
  maxDiscountBWP: 200,
  label: 'Extrait bundle (10% off 2+ perfumes)',
} as const;

/** Seeded promotions the seller can switch on and off from the dashboard. */
export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'promo-summer10',
    code: 'SUMMER10',
    percentOff: 10,
    minSubtotalBWP: 300,
    maxDiscountBWP: 150,
    isActive: true,
    description: '10% off orders from P300 — summer campaign',
  },
  {
    id: 'promo-firstorder',
    code: 'FIRSTORDER',
    percentOff: 15,
    minSubtotalBWP: 250,
    maxDiscountBWP: 200,
    isActive: true,
    description: 'Welcome offer for first-time buyers',
  },
  {
    id: 'promo-freetown',
    code: 'FRANCISTOWN',
    percentOff: 5,
    minSubtotalBWP: 0,
    isActive: true,
    description: 'Loyalty nod for customers collecting in Francistown',
  },
];

/* -------------------------------------------------------------------------- *
 * Automatic bundle
 * -------------------------------------------------------------------------- */

export interface DiscountLine {
  label: string;
  amountBWP: number;
}

/**
 * Discount earned automatically by what is in the bag (no code required).
 * Only the perfume lines contribute, so apparel margins stay untouched.
 */
export function getAutomaticBundleDiscount(cart: CartItem[]): DiscountLine | null {
  const perfumeUnits = cart
    .filter((item) => item.product.category === 'perfumes')
    .reduce((sum, item) => sum + item.quantity, 0);

  if (perfumeUnits < AUTOMATIC_BUNDLE.minPerfumeUnits) return null;

  const perfumeSubtotal = cart
    .filter((item) => item.product.category === 'perfumes')
    .reduce((sum, item) => sum + item.unitPriceBWP * item.quantity, 0);

  const amountBWP = Math.min(
    Math.round((perfumeSubtotal * AUTOMATIC_BUNDLE.percentOff) / 100),
    AUTOMATIC_BUNDLE.maxDiscountBWP
  );

  if (amountBWP <= 0) return null;

  return { label: AUTOMATIC_BUNDLE.label, amountBWP };
}

/* -------------------------------------------------------------------------- *
 * Promo codes
 * -------------------------------------------------------------------------- */

export type PromoValidation =
  | { ok: true; promo: PromoCode; discountBWP: number; message: string }
  | { ok: false; message: string };

/** Validates a typed code against the bag subtotal and today's date. */
export function validatePromoCode(
  rawCode: string,
  subtotalBWP: number,
  promoCodes: PromoCode[],
  now: Date = new Date()
): PromoValidation {
  const code = rawCode.trim().toUpperCase();

  if (!code) return { ok: false, message: 'Enter a promo code first.' };

  const promo = promoCodes.find((candidate) => candidate.code.toUpperCase() === code);

  if (!promo) {
    return { ok: false, message: `“${code}” is not a valid code. Check the spelling and try again.` };
  }

  if (!promo.isActive) {
    return { ok: false, message: `“${code}” is no longer running.` };
  }

  if (promo.expiresAt && promo.expiresAt < todayDateKey(now)) {
    return { ok: false, message: `“${code}” expired on ${promo.expiresAt}.` };
  }

  if (subtotalBWP < promo.minSubtotalBWP) {
    return {
      ok: false,
      message: `Spend at least P${promo.minSubtotalBWP} to use “${code}”.`,
    };
  }

  const raw = Math.round((subtotalBWP * promo.percentOff) / 100);
  const discountBWP = Math.max(0, promo.maxDiscountBWP ? Math.min(raw, promo.maxDiscountBWP) : raw);

  if (discountBWP <= 0) {
    return { ok: false, message: `“${code}” would not reduce this order.` };
  }

  return {
    ok: true,
    promo,
    discountBWP,
    message: `${promo.code} applied — ${promo.percentOff}% off (P${discountBWP} saved).`,
  };
}

/** Human readable rule summary for the dashboard list. */
export function describePromo(promo: PromoCode): string {
  const parts = [`${promo.percentOff}% off`];
  if (promo.minSubtotalBWP > 0) parts.push(`min P${promo.minSubtotalBWP}`);
  if (promo.maxDiscountBWP) parts.push(`capped at P${promo.maxDiscountBWP}`);
  if (promo.expiresAt) parts.push(`until ${promo.expiresAt}`);
  return parts.join(' · ');
}
