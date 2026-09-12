'use client';

import React, { useMemo, useState } from 'react';
import {
  AlarmClock,
  Banknote,
  CalendarRange,
  CreditCard,
  MessageCircle,
  Smartphone,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { PaymentMethod } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  buildDailyReconciliation,
  buildCustomerSummaries,
  formatDateKeyLong,
  getAgeInHours,
  getOrdersNeedingChase,
  getReorderSuggestions,
  sumDailyReconciliation,
} from '@/lib/analytics';
import { PAYMENT_OPTIONS } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { buildSupportLink } from '@/lib/whatsapp';

const RAIL_STYLES: Record<PaymentMethod, { label: string; icon: React.ReactNode; bar: string }> = {
  orange_money: {
    label: 'Orange Money',
    icon: <Smartphone size={14} className="text-orangeMoney" aria-hidden="true" />,
    bar: 'bg-orangeMoney',
  },
  fnb_pay2cell: {
    label: 'FNB Pay2Cell',
    icon: <CreditCard size={14} className="text-fnb" aria-hidden="true" />,
    bar: 'bg-fnb',
  },
  cash_on_pickup: {
    label: 'Cash on pickup',
    icon: <Banknote size={14} className="text-amber-300" aria-hidden="true" />,
    bar: 'bg-amber-400',
  },
};

const RAIL_ORDER: PaymentMethod[] = ['orange_money', 'fnb_pay2cell', 'cash_on_pickup'];

/**
 * Daily cash-up: takings per day split by payment rail, money still owed, an
 * aging list of unpaid orders to chase, and restock suggestions.
 */
export function ReconciliationPanel() {
  const { orders, products } = useStore();
  const [dayCount, setDayCount] = useState(7);

  const days = useMemo(() => buildDailyReconciliation(orders, dayCount), [orders, dayCount]);
  const totals = useMemo(() => sumDailyReconciliation(days), [days]);
  const needsChase = useMemo(() => getOrdersNeedingChase(orders), [orders]);
  const reorder = useMemo(() => getReorderSuggestions(products, orders), [products, orders]);
  const customers = useMemo(() => buildCustomerSummaries(orders), [orders]);

  const today = days[0];
  const bestDay = days.reduce(
    (best, day) => (day.collectedBWP > best.collectedBWP ? day : best),
    days[0] ?? { dateKey: 'unknown', collectedBWP: 0 }
  );

  return (
    <section aria-label="Daily reconciliation" className="space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reconciliation period">
        <span className="mr-1 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Period</span>
        {[7, 14, 30].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => setDayCount(count)}
            aria-pressed={dayCount === count}
            className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
              dayCount === count
                ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
            }`}
          >
            Last {count} days
          </button>
        ))}
      </div>

      {/* Headline figures */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-emerald-200">Money in</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white" data-price>
            {formatBWP(totals.collectedBWP)}
          </p>
          <p className="mt-2 text-2xs leading-relaxed text-neutral-300">
            Verified payments over the last {dayCount} days
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-amber-200">Still owed to you</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white" data-price>
            {formatBWP(totals.pendingBWP)}
          </p>
          <p className="mt-2 text-2xs leading-relaxed text-neutral-300">
            Awaiting payment verification
            {totals.uncollectedCashBWP > 0 &&
              ` · ${formatBWP(totals.uncollectedCashBWP)} cash not yet collected`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Today so far</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white" data-price>
            {formatBWP(today?.collectedBWP ?? 0)}
          </p>
          <p className="mt-2 text-2xs leading-relaxed text-neutral-400">
            {today?.orderCount ?? 0} order{(today?.orderCount ?? 0) === 1 ? '' : 's'} · {formatDateKeyLong('today')}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Best day</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white" data-price>
            {formatBWP(bestDay?.collectedBWP ?? 0)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-2xs leading-relaxed text-neutral-400">
            <TrendingUp size={12} className="text-emerald-300" aria-hidden="true" />
            {formatDateKeyLong(bestDay?.dateKey ?? 'unknown')}
          </p>
        </div>
      </div>

      {/* Payment rail split */}
      <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <CreditCard size={16} className="text-orangeMoney" aria-hidden="true" />
          Split by payment rail
        </h3>

        <ul className="mt-4 space-y-3">
          {RAIL_ORDER.map((rail) => {
            const amount = totals.byRail[rail];
            const share = totals.collectedBWP > 0 ? (amount / totals.collectedBWP) * 100 : 0;
            const style = RAIL_STYLES[rail];

            return (
              <li key={rail}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-neutral-100">
                    {style.icon}
                    {style.label}
                  </span>
                  <span className="font-mono font-bold text-white" data-price>
                    {formatBWP(amount)}
                    <span className="ml-2 text-2xs font-semibold text-neutral-400">{share.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Day-by-day table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface/70">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5">
          <CalendarRange size={16} className="text-amber-300" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">Day-by-day cash-up</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <caption className="sr-only">
              Daily takings split by payment rail for the last {dayCount} days
            </caption>
            <thead>
              <tr className="border-b border-white/[0.07] text-2xs uppercase tracking-wide text-neutral-400">
                <th scope="col" className="px-5 py-2.5 font-bold">Day</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">Orders</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">Orange Money</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">FNB</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">Cash</th>
                <th scope="col" className="px-3 py-2.5 text-right font-bold">Money in</th>
                <th scope="col" className="px-5 py-2.5 text-right font-bold">Awaiting</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.dateKey} className="border-b border-white/[0.05] last:border-0">
                  <th scope="row" className="px-5 py-2.5 text-left font-semibold text-neutral-100">
                    {formatDateKeyLong(day.dateKey)}
                  </th>
                  <td className="px-3 py-2.5 text-right font-mono text-neutral-300">{day.orderCount}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-neutral-200" data-price>
                    {day.byRail.orange_money > 0 ? formatBWP(day.byRail.orange_money) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-neutral-200" data-price>
                    {day.byRail.fnb_pay2cell > 0 ? formatBWP(day.byRail.fnb_pay2cell) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-neutral-200" data-price>
                    {day.byRail.cash_on_pickup > 0 ? formatBWP(day.byRail.cash_on_pickup) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-200" data-price>
                    {formatBWP(day.collectedBWP)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-amber-200" data-price>
                    {day.pendingBWP > 0 ? formatBWP(day.pendingBWP) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aging unpaid orders */}
      <div
        className={`rounded-2xl border p-5 ${
          needsChase.length > 0 ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-white/10 bg-surface/70'
        }`}
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <AlarmClock size={16} className="text-amber-300" aria-hidden="true" />
          Waiting on payment {needsChase.length > 0 && `(${needsChase.length})`}
        </h3>

        {needsChase.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            Nothing unpaid for over 24 hours — every order has been verified.
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
              These orders have been waiting more than 24 hours. Send a friendly nudge — most customers simply forgot.
            </p>

            <ul className="mt-3 space-y-2">
              {needsChase.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-100">
                      <span className="font-mono text-orangeMoney">{order.orderNumber}</span>
                      {order.customer.name}
                      <Badge variant="amber" icon={null} className="text-[10px]">
                        {getAgeInHours(order.createdAt)}h old
                      </Badge>
                    </p>
                    <p className="mt-0.5 text-2xs text-neutral-400">
                      {order.customer.town} · {PAYMENT_OPTIONS.find((o) => o.id === order.paymentMethod)?.label} ·{' '}
                      {formatBWP(order.totalAmountBWP)}
                    </p>
                  </div>

                  <a
                    href={buildSupportLink(
                      `Friendly reminder about order #${order.orderNumber} (${formatBWP(
                        order.totalAmountBWP
                      )}). Once payment reflects we will pack it straight away.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[38px] flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-whatsapp/40 bg-whatsapp/10 px-3 text-2xs font-bold uppercase tracking-wide text-whatsapp transition-colors hover:bg-whatsapp/20"
                  >
                    <MessageCircle size={13} aria-hidden="true" />
                    Nudge customer
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Restock suggestions */}
      <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Truck size={16} className="text-sky-300" aria-hidden="true" />
          Suggested reorders ({reorder.length})
        </h3>

        {reorder.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-neutral-400">
            Every variant is above its low-stock threshold.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {reorder.slice(0, 9).map((suggestion) => (
              <li key={suggestion.variantId} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-neutral-100" title={suggestion.productTitle}>
                  {suggestion.productTitle}
                </p>
                <p className="mt-0.5 text-2xs text-neutral-400">
                  {suggestion.variantLabel} · <span className="font-mono">{suggestion.sku}</span>
                </p>
                <p className="mt-1.5 text-2xs font-bold text-amber-200">
                  {suggestion.stockQuantity} left · order about {suggestion.suggestedQuantity} more
                </p>
                <p className="text-2xs text-neutral-400">{suggestion.unitsSold} sold to date</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Repeat customers */}
      <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <TrendingUp size={16} className="text-emerald-300" aria-hidden="true" />
          Customers by lifetime value
        </h3>

        {customers.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">No customer history yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {customers.slice(0, 8).map((customer) => (
              <li
                key={customer.phone}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-100">
                    {customer.name}
                    {customer.orderCount > 1 && (
                      <Badge variant="success" icon={null} className="text-[10px]">
                        {customer.orderCount} orders
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-2xs text-neutral-400">
                    {customer.town} · {customer.phone}
                    {customer.favouriteProducts[0] && ` · loves ${customer.favouriteProducts[0]}`}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-200" data-price>
                    {formatBWP(customer.lifetimeValueBWP)}
                  </span>
                  <a
                    href={buildSupportLink(
                      `Restock news for a past buyer — is there anything you are looking for?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-whatsapp/40 bg-whatsapp/10 px-2.5 text-2xs font-bold uppercase tracking-wide text-whatsapp transition-colors hover:bg-whatsapp/20"
                  >
                    <MessageCircle size={12} aria-hidden="true" />
                    Message
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-2xs leading-relaxed text-neutral-400">
        Takings are dated by the day payment was verified, in Botswana time. Cancelled orders are excluded from money
        in, and cash-on-pickup only counts once the order is completed.
      </p>
    </section>
  );
}
