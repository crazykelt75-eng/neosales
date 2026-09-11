'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Cloud,
  CloudOff,
  DatabaseBackup,
  Lock,
  PackagePlus,
  RotateCcw,
  Store,
  Warehouse,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { SalesMetrics } from '@/components/admin/SalesMetrics';
import { OrderKanban } from '@/components/admin/OrderKanban';
import { InventoryManager } from '@/components/admin/InventoryManager';
import { AddProductModal } from '@/components/admin/AddProductModal';
import { DataBackupPanel } from '@/components/admin/DataBackupPanel';
import { Button } from '@/components/ui/Button';
import { SELLER_CONFIG } from '@/lib/constants';

type DashboardTab = 'orders' | 'inventory' | 'data';

const TAB_LABELS: Record<DashboardTab, string> = {
  orders: 'Order pipeline',
  inventory: 'Live inventory',
  data: 'Data & backup',
};

/** Seller operations shell: KPI strip plus a tabbed orders / inventory workspace. */
export function AdminDashboard() {
  const { lockAdmin, isCloudSync, metrics, orders } = useStore();

  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Dashboard header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-orangeMoney/35 bg-orangeMoney/15 font-black text-orangeMoney">
              NS
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white sm:text-base">
                {SELLER_CONFIG.storeName} operations hub
              </h1>
              <p className="text-2xs text-neutral-400">
                {orders.length} orders · Francistown fulfilment
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-2xs font-bold uppercase tracking-wide ${
                isCloudSync
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                  : 'border-white/12 bg-white/[0.05] text-neutral-300'
              }`}
            >
              {isCloudSync ? <Cloud size={13} aria-hidden="true" /> : <CloudOff size={13} aria-hidden="true" />}
              {isCloudSync ? 'Supabase live' : 'Local mode'}
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddProductOpen(true)}
              leftIcon={<PackagePlus size={15} />}
            >
              Add product
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('data')}
              leftIcon={<DatabaseBackup size={15} />}
            >
              Backup
            </Button>

            <Link
              href="/"
              className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 text-xs font-bold text-neutral-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
            >
              <Store size={15} aria-hidden="true" />
              Storefront
            </Link>

            <Button variant="primary" size="sm" onClick={lockAdmin} leftIcon={<Lock size={15} />}>
              Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <SalesMetrics />

        {/* Workspace tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Operations workspace">
          {(Object.keys(TAB_LABELS) as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`dashboard-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`dashboard-panel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 text-xs font-bold uppercase tracking-wide transition-colors ${
                activeTab === tab
                  ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
              }`}
            >
              {tab === 'orders' && <ClipboardList size={15} aria-hidden="true" />}
              {tab === 'inventory' && <Warehouse size={15} aria-hidden="true" />}
              {tab === 'data' && <DatabaseBackup size={15} aria-hidden="true" />}
              {TAB_LABELS[tab]}
              {tab === 'orders' && metrics.pendingVerificationCount > 0 && (
                <span className="rounded-full bg-amber-400/90 px-1.5 font-mono text-2xs font-black text-neutral-950">
                  {metrics.pendingVerificationCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`dashboard-panel-${activeTab}`}
          aria-labelledby={`dashboard-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'orders' && <OrderKanban />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'data' && <DataBackupPanel />}
        </div>

        {metrics.lowStockVariants.length > 0 && (
          <section
            aria-label="Low stock watchlist"
            className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4"
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
              Reorder watchlist ({metrics.lowStockVariantCount})
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.lowStockVariants.slice(0, 6).map((variant) => (
                <li
                  key={variant.variantId}
                  className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-2xs text-neutral-200"
                >
                  <span className="block truncate font-semibold" title={variant.productTitle}>
                    {variant.productTitle}
                  </span>
                  <span className="mt-0.5 block text-neutral-400">
                    {variant.variantLabel} ·{' '}
                    <strong className="font-mono text-amber-200">{variant.stockQuantity} left</strong>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <AddProductModal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} />
    </div>
  );
}
