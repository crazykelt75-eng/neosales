import { CURRENCY_SYMBOL } from '@/lib/constants';

/**
 * Formats an amount in Botswana Pula.
 *
 * Whole amounts render without decimals (`P280`) while fractional amounts keep
 * two digits (`P1,240.50`) — this matches how prices are quoted in Botswana
 * retail and keeps catalog cards visually quiet.
 */
export function formatBWP(amount: number, options: { forceDecimals?: boolean } = {}): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.round(safeAmount * 100) % 100 !== 0;
  const decimals = options.forceDecimals || hasFraction ? 2 : 0;

  return `${CURRENCY_SYMBOL}${safeAmount.toLocaleString('en-BW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Compact Pula rendering for tight UI spots such as the header bag button. */
export function formatBWPCompact(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${CURRENCY_SYMBOL}${Math.round(safeAmount).toLocaleString('en-BW')}`;
}

/** Renders an ISO timestamp as `11 Sep 2026, 14:30` for order cards. */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Gaborone',
  });
}

/** Renders an ISO timestamp as a relative age, e.g. `3 h ago`. */
export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} d ago`;

  return formatDateTime(isoDate).split(',')[0];
}
