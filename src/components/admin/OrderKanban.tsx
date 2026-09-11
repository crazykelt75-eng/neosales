'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Order, OrderStatus, ORDER_STATUS_ORDER } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DELIVERY_OPTIONS_BY_ID, ORDER_STATUS_META, PAYMENT_OPTIONS_BY_ID } from '@/lib/constants';
import { formatBWP, formatRelativeTime } from '@/lib/format';
import { buildStatusUpdateLink } from '@/lib/whatsapp';

const COLUMN_ACCENTS: Record<OrderStatus, string> = {
  pending_verification: 'border-amber-500/30',
  payment_confirmed: 'border-emerald-500/30',
  dispatched: 'border-sky-500/30',
  completed: 'border-white/10',
};

const PAYMENT_BADGES: Record<Order['paymentMethod'], { label: string; variant: 'new' | 'info' | 'amber' }> = {
  orange_money: { label: 'Orange Money', variant: 'new' },
  fnb_pay2cell: { label: 'FNB Pay2Cell', variant: 'info' },
  cash_on_pickup: { label: 'Cash on pickup', variant: 'amber' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_verification: 'payment_confirmed',
  payment_confirmed: 'dispatched',
  dispatched: 'completed',
};

const PREVIOUS_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  payment_confirmed: 'pending_verification',
  dispatched: 'payment_confirmed',
  completed: 'dispatched',
};

const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  payment_confirmed: 'Confirm payment',
  dispatched: 'Mark dispatched',
  completed: 'Mark completed',
};

const NEXT_ACTION_ICONS: Partial<Record<OrderStatus, React.ReactNode>> = {
  payment_confirmed: <CheckCircle2 size={15} aria-hidden="true" />,
  dispatched: <Truck size={15} aria-hidden="true" />,
  completed: <CheckCircle2 size={15} aria-hidden="true" />,
};

/** Order fulfilment board: one column per status with inline transitions. */
export function OrderKanban() {
  const { orders, updateOrderStatus } = useStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const columns = useMemo(
    () =>
      ORDER_STATUS_ORDER.map((status) => ({
        status,
        label: ORDER_STATUS_META[status].label,
        description: ORDER_STATUS_META[status].description,
        orders: orders.filter((order) => order.status === status),
      })),
    [orders]
  );

  const visibleColumns = statusFilter === 'all' ? columns : columns.filter((column) => column.status === statusFilter);

  return (
    <section aria-label="Order verification board" className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter orders by status">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
          className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
            statusFilter === 'all'
              ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
              : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
          }`}
        >
          All orders ({orders.length})
        </button>

        {columns.map((column) => (
          <button
            key={column.status}
            type="button"
            onClick={() => setStatusFilter(column.status)}
            aria-pressed={statusFilter === column.status}
            className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
              statusFilter === column.status
                ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
            }`}
          >
            {column.label} ({column.orders.length})
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface/70 p-6 text-center text-xs text-neutral-400">
          No orders yet. Orders placed through the storefront appear here instantly.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {visibleColumns.map((column) => (
            <div
              key={column.status}
              className={`flex flex-col gap-3 rounded-2xl border bg-surface/60 p-3 ${COLUMN_ACCENTS[column.status]}`}
            >
              <header className="border-b border-white/[0.07] pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-white">
                  {column.label}
                  <span className="ml-2 font-mono text-2xs text-neutral-400">{column.orders.length}</span>
                </h3>
                <p className="mt-1 text-2xs leading-relaxed text-neutral-400">{column.description}</p>
              </header>

              {column.orders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-2xs text-neutral-400">
                  Nothing here right now
                </p>
              ) : (
                <ul className="space-y-3">
                  {column.orders.map((order) => (
                    <OrderCard key={order.id} order={order} onTransition={updateOrderStatus} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface OrderCardProps {
  order: Order;
  onTransition: (orderId: string, status: OrderStatus, notes?: string) => void;
}

function OrderCard({ order, onTransition }: OrderCardProps) {
  const delivery = DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[order.paymentMethod];
  const paymentBadge = PAYMENT_BADGES[order.paymentMethod];
  const nextStatus = NEXT_STATUS[order.status];
  const previousStatus = PREVIOUS_STATUS[order.status];

  const itemsSummary =
    order.items.length === 1
      ? `${order.items[0].quantity} × ${order.items[0].productTitle}`
      : `${order.items.length} items · ${order.items.reduce((sum, item) => sum + item.quantity, 0)} units`;

  return (
    <li className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-black text-orangeMoney">{order.orderNumber}</p>
          <p className="mt-0.5 text-xs font-bold text-white">{order.customer.name}</p>
        </div>
        <Badge variant={paymentBadge.variant} icon={null} className="text-[10px]">
          {paymentBadge.label}
        </Badge>
      </div>

      <p className="mt-1.5 text-2xs text-neutral-400">
        {formatRelativeTime(order.createdAt)} · {delivery?.shortLabel ?? 'Delivery'}
      </p>

      <ul className="mt-2.5 space-y-1 border-t border-white/[0.07] pt-2.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-2 text-2xs">
            <span className="min-w-0 text-neutral-200">
              <span className="font-semibold">{item.quantity}×</span> {item.productTitle}
              <span className="block text-neutral-400">{item.variantLabel}</span>
            </span>
            <span className="flex-shrink-0 font-mono text-neutral-100" data-price>
              {formatBWP(item.lineTotalBWP)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-2.5 space-y-1 border-t border-white/[0.07] pt-2.5 text-2xs">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-400">Delivery {delivery?.feeBWP ? '' : '(free)'}</dt>
          <dd className="font-mono text-neutral-200">{delivery?.feeBWP ? formatBWP(delivery.feeBWP) : 'P0'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-bold text-neutral-200">Total</dt>
          <dd className="font-mono text-sm font-black text-white" data-price>
            {formatBWP(order.totalAmountBWP)}
          </dd>
        </div>
      </dl>

      <div className="mt-2.5 space-y-1 text-2xs text-neutral-300">
        <p className="flex items-center gap-1.5">
          <MapPin size={12} className="text-orangeMoney" aria-hidden="true" />
          {order.customer.town} · {order.customer.address}
        </p>
        <p className="flex items-center gap-1.5">
          <Phone size={12} className="text-emerald-300" aria-hidden="true" />
          <a href={`tel:${order.customer.phone}`} className="hover:text-white">
            {order.customer.phone}
          </a>
        </p>
      </div>

      {order.verificationNotes && (
        <p className="mt-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-2xs leading-relaxed text-amber-100">
          {order.verificationNotes}
        </p>
      )}

      <p className="mt-2.5 text-2xs text-neutral-400">
        Payment rail: {payment?.label ?? order.paymentMethod} · reference {order.orderNumber}
      </p>

      {/* Actions */}
      <div className="mt-3 space-y-2">
        <a
          href={buildStatusUpdateLink(order, nextStatus ?? order.status)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-2xs font-bold uppercase tracking-wide text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
        >
          <MessageCircle size={14} aria-hidden="true" />
          WhatsApp {order.customer.name.split(' ')[0]}
        </a>

        {nextStatus ? (
          <Button
            variant={nextStatus === 'payment_confirmed' ? 'primary' : 'secondary'}
            size="sm"
            fullWidth
            onClick={() => onTransition(order.id, nextStatus)}
            leftIcon={NEXT_ACTION_ICONS[nextStatus]}
            rightIcon={<ChevronRight size={14} />}
          >
            {NEXT_ACTION_LABELS[nextStatus]}
          </Button>
        ) : (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-2xs font-bold uppercase tracking-wide text-emerald-200">
            Order closed
          </p>
        )}

        {previousStatus && (
          <button
            type="button"
            onClick={() => onTransition(order.id, previousStatus, 'Reverted by seller review.')}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-2xs font-semibold text-neutral-400 transition-colors hover:border-white/25 hover:text-white"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Move back to {ORDER_STATUS_META[previousStatus].label}
          </button>
        )}
      </div>
    </li>
  );
}
