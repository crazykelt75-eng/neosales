'use client';

import React from 'react';
import { AlertTriangle, Banknote, Clock, Package, TrendingUp } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatBWP } from '@/lib/format';

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: 'orange' | 'amber' | 'emerald' | 'sky';
}

const TONES: Record<MetricCardProps['tone'], string> = {
  orange: 'border-orangeMoney/30 bg-orangeMoney/10 text-orangeMoney',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
};

function MetricCard({ label, value, hint, icon, tone }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white sm:text-2xl" data-price>
            {value}
          </p>
        </div>
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${TONES[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xs leading-relaxed text-neutral-400">{hint}</p>
    </div>
  );
}

/** KPI strip for the seller dashboard: revenue, pending payments, stock, low stock. */
export function SalesMetrics() {
  const { metrics, products } = useStore();

  const activeProducts = products.filter((product) => product.isActive).length;

  return (
    <section aria-label="Store performance metrics" className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total revenue"
          value={formatBWP(metrics.totalRevenueBWP)}
          hint={`${metrics.totalOrders} orders recorded · verified, dispatched and completed totals`}
          icon={<Banknote size={17} aria-hidden="true" />}
          tone="orange"
        />
        <MetricCard
          label="Pending payment orders"
          value={String(metrics.pendingVerificationCount)}
          hint="Verify the mobile money reference, then confirm payment"
          icon={<Clock size={17} aria-hidden="true" />}
          tone="amber"
        />
        <MetricCard
          label="Total stock on hand"
          value={String(metrics.totalStockUnits)}
          hint={`${activeProducts} active product${activeProducts === 1 ? '' : 's'} in the live catalog`}
          icon={<Package size={17} aria-hidden="true" />}
          tone="sky"
        />
        <MetricCard
          label="Low stock alerts"
          value={String(metrics.lowStockVariantCount)}
          hint="Variants at or below their reorder threshold"
          icon={<AlertTriangle size={17} aria-hidden="true" />}
          tone="emerald"
        />
      </div>

      {metrics.bestSellers.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
            <TrendingUp size={14} className="text-emerald-300" aria-hidden="true" />
            Best sellers
          </h3>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.bestSellers.map((seller) => (
              <li key={seller.label} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-neutral-100" title={seller.label}>
                  {seller.label}
                </p>
                <p className="mt-0.5 font-mono text-2xs font-bold text-amber-200">{seller.units} units sold</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
