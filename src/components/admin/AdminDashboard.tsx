'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Kanban,
  Package,
  BarChart3,
  Store,
  ShieldCheck,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { OrderKanban } from './OrderKanban';
import { InventoryManager } from './InventoryManager';
import { SalesMetrics } from './SalesMetrics';

type AdminTab = 'orders' | 'inventory' | 'metrics';

export function AdminDashboard() {
  const { sellerConfig, metrics } = useStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');

  return (
    <div className="min-h-screen bg-neutral-100/70 pb-20">
      {/* Admin Top Navigation */}
      <header className="bg-neutral-950 text-white sticky top-0 z-30 shadow-elevated border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orangeMoney/20 border border-orangeMoney/40 flex items-center justify-center text-orangeMoney font-black text-sm shadow-xs">
              NS
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>NeoSales Operations Hub</span>
                <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-700">
                  Francistown & Tati Siding Hub
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400 font-normal">
                Orange Money & FNB Pay2Cell Pipeline Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="min-h-[40px] text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-white/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
            >
              <Store size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Live Storefront</span>
              <span className="sm:hidden">Store</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav
          role="tablist"
          aria-label="Admin Navigation Tabs"
          className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-neutral-800/80 overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            className={`py-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'orders'
                ? 'border-orangeMoney text-white bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Kanban size={16} aria-hidden="true" />
            <span>Order Pipeline</span>
            {metrics.pendingVerifications > 0 && (
              <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {metrics.pendingVerifications}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            className={`py-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'inventory'
                ? 'border-orangeMoney text-white bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Package size={16} aria-hidden="true" />
            <span>Inventory & Stock</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'metrics'}
            onClick={() => setActiveTab('metrics')}
            className={`py-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'metrics'
                ? 'border-orangeMoney text-white bg-neutral-900/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 size={16} aria-hidden="true" />
            <span>Sales Analytics</span>
          </button>
        </nav>
      </header>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Active Payment Configuration Pill */}
        <section
          aria-label="Merchant Account Status"
          className="mb-6 bg-white border border-neutral-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-soft"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <span className="font-bold text-neutral-900">
              Active Merchant Receiving Channels:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl text-orange-950 font-bold">
              <Smartphone size={14} className="text-orangeMoney" aria-hidden="true" />
              <span>Orange Money: {sellerConfig.orangeMoneyNumber}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-xl text-cyan-950 font-bold">
              <CreditCard size={14} className="text-fnb" aria-hidden="true" />
              <span>FNB Pay2Cell: {sellerConfig.fnbPay2CellNumber} ({sellerConfig.fnbAccountName})</span>
            </div>
          </div>
        </section>

        {/* Tab Panels */}
        {activeTab === 'orders' && <OrderKanban />}
        {activeTab === 'inventory' && <InventoryManager />}
        {activeTab === 'metrics' && <SalesMetrics />}
      </main>
    </div>
  );
}
