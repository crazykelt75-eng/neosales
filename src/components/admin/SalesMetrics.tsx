'use client';

import React from 'react';
import { DollarSign, Package, Clock, TrendingUp, Sparkles, Shirt } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export function SalesMetrics() {
  const { metrics } = useStore();

  const maxScentCount = Math.max(...metrics.topScents.map((s) => s.count), 1);
  const maxSizeCount = Math.max(...metrics.fastMovingSizes.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Top High-level Metric Cards */}
      <section aria-label="Executive Sales Overview" className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-soft">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-neutral-600">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-200/60">
              BWP
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight font-mono">
            P{metrics.totalRevenueBWP.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Confirmed & completed payments
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-soft">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-neutral-600">
              Total Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center border border-neutral-200/60">
              <Package size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight font-mono">
            {metrics.totalOrders}
          </div>
          <p className="text-[11px] text-neutral-600 font-semibold mt-1">Across all pipeline stages</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-soft">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-800">
              Pending Check
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
              <Clock size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight font-mono">
            {metrics.pendingVerifications}
          </div>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">Awaiting mobile wallet check</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-soft">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-800">
              Out for Courier
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/60">
              <TrendingUp size={16} aria-hidden="true" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-700 tracking-tight font-mono">
            {metrics.activeDeliveries}
          </div>
          <p className="text-[11px] text-sky-800 font-semibold mt-1">Ready or in transit</p>
        </div>
      </section>

      {/* Breakdown: Top Perfume Scents & Fast-Moving Apparel Sizes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Perfume Scents Breakdown */}
        <section aria-labelledby="top-scents-heading" className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" aria-hidden="true" />
              <h3 id="top-scents-heading" className="font-extrabold text-sm sm:text-base text-neutral-900">
                Top-Selling Fragrance Profiles
              </h3>
            </div>
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Volume Sold</span>
          </div>

          {metrics.topScents.length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center">No perfume sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topScents.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-900 font-bold flex items-center justify-center text-[10px] border border-amber-200/60">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-neutral-800">{item.scent}</span>
                    </div>
                    <span className="font-mono font-black bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-900">
                      {item.count} bottles
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxScentCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fast-Moving Apparel Sizes Breakdown */}
        <section aria-labelledby="apparel-sizes-heading" className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-200/90 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Shirt size={18} className="text-orangeMoney" aria-hidden="true" />
              <h3 id="apparel-sizes-heading" className="font-extrabold text-sm sm:text-base text-neutral-900">
                Fast-Moving Apparel Sizes
              </h3>
            </div>
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Units Sold</span>
          </div>

          {metrics.fastMovingSizes.length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center">No apparel sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.fastMovingSizes.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-50 text-orangeMoney font-bold flex items-center justify-center text-[10px] border border-orange-200/60">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-neutral-800">{item.size}</span>
                    </div>
                    <span className="font-mono font-black bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-900">
                      {item.count} pieces
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orangeMoney h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxSizeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
