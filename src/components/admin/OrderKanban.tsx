'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  History,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  RotateCcw,
  Search,
  Send,
  StickyNote,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Order, OrderStatus, SalesChannel, WorkflowStatus, ORDER_STATUS_ORDER } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CancelOrderDialog } from '@/components/admin/CancelOrderDialog';
import { PackingSlip } from '@/components/admin/PackingSlip';
import {
  DELIVERY_OPTIONS_BY_ID,
  ORDER_STATUS_META,
  PAYMENT_OPTIONS_BY_ID,
  PICKUP_WINDOWS,
  SELLER_CONFIG,
} from '@/lib/constants';
import {
  EMPTY_ORDER_FILTERS,
  OrderFilters,
  filterOrders,
  hasActiveOrderFilters,
  todayDateKey,
} from '@/lib/analytics';
import { formatBWP, formatDateTime, formatRelativeTime } from '@/lib/format';
import { buildStatusUpdateLink } from '@/lib/whatsapp';

const COLUMN_ACCENTS: Record<WorkflowStatus, string> = {
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

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  website: 'Website',
  whatsapp: 'WhatsApp / DM',
  walk_in: 'In person',
};

const NEXT_STATUS: Partial<Record<WorkflowStatus, WorkflowStatus>> = {
  pending_verification: 'payment_confirmed',
  payment_confirmed: 'dispatched',
  dispatched: 'completed',
};

const PREVIOUS_STATUS: Partial<Record<WorkflowStatus, WorkflowStatus>> = {
  payment_confirmed: 'pending_verification',
  dispatched: 'payment_confirmed',
  completed: 'dispatched',
};

const NEXT_ACTION_LABELS: Partial<Record<WorkflowStatus, string>> = {
  payment_confirmed: 'Confirm payment',
  dispatched: 'Mark dispatched',
  completed: 'Mark completed',
};

const NEXT_ACTION_ICONS: Partial<Record<WorkflowStatus, React.ReactNode>> = {
  payment_confirmed: <CheckCircle2 size={15} aria-hidden="true" />,
  dispatched: <Truck size={15} aria-hidden="true" />,
  completed: <CheckCircle2 size={15} aria-hidden="true" />,
};

/** Order fulfilment board with search, filters, pickup slots and activity logs. */
export function OrderKanban() {
  const { orders, updateOrderStatus, cancelOrder, reopenOrder, setOrderPaymentReference } = useStore();

  const [filters, setFilters] = useState<OrderFilters>(EMPTY_ORDER_FILTERS);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

  const workflowOrders = useMemo(() => orders.filter((order) => order.status !== 'cancelled'), [orders]);
  const cancelledOrders = useMemo(() => orders.filter((order) => order.status === 'cancelled'), [orders]);

  const visibleOrders = useMemo(() => filterOrders(workflowOrders, filters), [filters, workflowOrders]);
  const filtersActive = hasActiveOrderFilters(filters);

  const columns = useMemo(
    () =>
      ORDER_STATUS_ORDER.map((status) => ({
        status,
        label: ORDER_STATUS_META[status].label,
        description: ORDER_STATUS_META[status].description,
        orders: visibleOrders.filter((order) => order.status === status),
      })),
    [visibleOrders]
  );

  return (
    <section aria-label="Order verification board" className="space-y-4">
      {/* Search & filters */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-surface/70 p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search order number, customer, phone, town or transaction ID…"
              aria-label="Search orders"
              className="w-full rounded-xl border border-white/12 bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, query: '' }))}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-400 transition-colors hover:text-white"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-from" className="text-2xs font-bold uppercase tracking-wide text-neutral-400">
                From
              </label>
              <input
                id="filter-from"
                type="date"
                value={filters.fromDate}
                max={filters.toDate || todayDateKey()}
                onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                className="rounded-xl border border-white/12 bg-black/30 px-2.5 py-2 text-xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-to" className="text-2xs font-bold uppercase tracking-wide text-neutral-400">
                To
              </label>
              <input
                id="filter-to"
                type="date"
                value={filters.toDate}
                min={filters.fromDate || undefined}
                onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                className="rounded-xl border border-white/12 bg-black/30 px-2.5 py-2 text-xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </div>

            <select
              value={filters.channel}
              onChange={(event) =>
                setFilters((current) => ({ ...current, channel: event.target.value as SalesChannel | 'all' }))
              }
              aria-label="Filter by sales channel"
              className="rounded-xl border border-white/12 bg-black/30 px-2.5 py-2 text-xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            >
              <option value="all">All channels</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp / DM</option>
              <option value="walk_in">In person</option>
            </select>

            {filtersActive && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_ORDER_FILTERS)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-2xs font-bold uppercase tracking-wide text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter orders by status">
          <Filter size={13} className="text-neutral-400" aria-hidden="true" />

          {(
            [
              { id: 'all' as const, label: `All (${workflowOrders.length})` },
              { id: 'open' as const, label: 'Open' },
            ]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, status: option.id }))}
              aria-pressed={filters.status === option.id}
              className={`rounded-xl border px-3 py-1.5 text-2xs font-bold uppercase tracking-wide transition-colors ${
                filters.status === option.id
                  ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}

          {ORDER_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, status }))}
              aria-pressed={filters.status === status}
              className={`rounded-xl border px-3 py-1.5 text-2xs font-bold uppercase tracking-wide transition-colors ${
                filters.status === status
                  ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
              }`}
            >
              {ORDER_STATUS_META[status].label} ({workflowOrders.filter((order) => order.status === status).length})
            </button>
          ))}
        </div>

        {filtersActive && (
          <p aria-live="polite" className="text-2xs text-neutral-400">
            Showing {visibleOrders.length} of {workflowOrders.length} active orders
          </p>
        )}
      </div>

      {visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-surface/70 p-8 text-center">
          <p className="text-sm font-bold text-white">
            {filtersActive ? 'No orders match these filters' : 'No active orders right now'}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-400">
            {filtersActive
              ? 'Try a wider date range or clear the filters to see everything.'
              : 'Orders placed through the storefront, WhatsApp or in person all appear here.'}
          </p>
          {filtersActive && (
            <Button
              variant="secondary"
              size="md"
              className="mt-4"
              onClick={() => setFilters(EMPTY_ORDER_FILTERS)}
              leftIcon={<RotateCcw size={14} />}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
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
                  Nothing here
                </p>
              ) : (
                <ul className="space-y-3">
                  {column.orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onTransition={updateOrderStatus}
                      onSaveReference={setOrderPaymentReference}
                      onRequestCancel={setOrderToCancel}
                      onPrint={setOrderToPrint}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancelled ledger keeps released stock auditable without cluttering the board */}
      {cancelledOrders.length > 0 && (
        <details className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-red-200">
            Cancelled orders ({cancelledOrders.length}) · stock returned
          </summary>

          <ul className="mt-3 space-y-2">
            {cancelledOrders.map((order) => (
              <CancelledOrderRow key={order.id} order={order} onReopen={reopenOrder} onPrint={setOrderToPrint} />
            ))}
          </ul>
        </details>
      )}

      <CancelOrderDialog order={orderToCancel} onClose={() => setOrderToCancel(null)} onConfirm={cancelOrder} />
      <PackingSlip order={orderToPrint} onClose={() => setOrderToPrint(null)} />
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * Order card
 * -------------------------------------------------------------------------- */

interface OrderCardProps {
  order: Order;
  onTransition: (orderId: string, status: OrderStatus, notes?: string) => void;
  onSaveReference: (orderId: string, reference: string) => void;
  onRequestCancel: (order: Order) => void;
  onPrint: (order: Order) => void;
}

function OrderCard({ order, onTransition, onSaveReference, onRequestCancel, onPrint }: OrderCardProps) {
  const { addOrderNote, setOrderPickupSlot } = useStore();

  const [referenceDraft, setReferenceDraft] = useState(order.paymentReference ?? '');
  const [isEditingReference, setIsEditingReference] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isSlotOpen, setIsSlotOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(order.pickupSlot?.date ?? todayDateKey());
  const [slotWindow, setSlotWindow] = useState(order.pickupSlot?.window ?? PICKUP_WINDOWS[0]);
  const [slotPoint, setSlotPoint] = useState(order.pickupSlot?.point ?? SELLER_CONFIG.pickupPoints[0]);

  const delivery = DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[order.paymentMethod];
  const paymentBadge = PAYMENT_BADGES[order.paymentMethod];
  const workflowStatus = order.status as WorkflowStatus;
  const nextStatus = NEXT_STATUS[workflowStatus];
  const previousStatus = PREVIOUS_STATUS[workflowStatus];
  const isPickup = order.customer.deliveryPreference === 'francistown_pickup';
  const channel = order.channel ?? 'website';
  const timeline = order.timeline ?? [];

  const handleSaveSlot = () => {
    setOrderPickupSlot(order.id, { date: slotDate, window: slotWindow, point: slotPoint });
    setIsSlotOpen(false);
  };

  return (
    <li className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-black text-orangeMoney">{order.orderNumber}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-white">{order.customer.name}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <Badge variant={paymentBadge.variant} icon={null} className="text-[10px]">
            {paymentBadge.label}
          </Badge>
          {channel !== 'website' && (
            <Badge variant="neutral" icon={null} className="text-[10px]">
              {CHANNEL_LABELS[channel]}
            </Badge>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-2xs text-neutral-400" title={formatDateTime(order.createdAt)}>
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
        {(order.discountBWP ?? 0) > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-emerald-200">
              Discount{order.promoCode ? ` · ${order.promoCode}` : ''}
            </dt>
            <dd className="font-mono text-emerald-200" data-price>
              -{formatBWP(order.discountBWP ?? 0)}
            </dd>
          </div>
        )}
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

      {/* Pickup slot */}
      {isPickup && (
        <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-neutral-400">
              <CalendarClock size={12} aria-hidden="true" />
              Pickup slot
            </span>
            {order.pickupSlot && !isSlotOpen && (
              <button
                type="button"
                onClick={() => setIsSlotOpen(true)}
                className="text-2xs font-semibold text-neutral-400 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {isSlotOpen ? (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="sr-only" htmlFor={`slot-date-${order.id}`}>
                  Pickup date
                </label>
                <input
                  id={`slot-date-${order.id}`}
                  type="date"
                  value={slotDate}
                  min={todayDateKey()}
                  onChange={(event) => setSlotDate(event.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 text-2xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />

                <label className="sr-only" htmlFor={`slot-window-${order.id}`}>
                  Pickup window
                </label>
                <select
                  id={`slot-window-${order.id}`}
                  value={slotWindow}
                  onChange={(event) => setSlotWindow(event.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 text-2xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                >
                  {PICKUP_WINDOWS.map((window) => (
                    <option key={window} value={window}>
                      {window}
                    </option>
                  ))}
                </select>
              </div>

              <label className="sr-only" htmlFor={`slot-point-${order.id}`}>
                Pickup point
              </label>
              <select
                id={`slot-point-${order.id}`}
                value={slotPoint}
                onChange={(event) => setSlotPoint(event.target.value)}
                className="w-full rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 text-2xs text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              >
                {SELLER_CONFIG.pickupPoints.map((point) => (
                  <option key={point} value={point}>
                    {point}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveSlot}
                  className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-2 text-2xs font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/25"
                >
                  Save slot
                </button>
                {order.pickupSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderPickupSlot(order.id, null);
                      setIsSlotOpen(false);
                    }}
                    className="rounded-lg border border-white/12 px-2.5 py-2 text-2xs font-semibold text-neutral-300 transition-colors hover:text-white"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSlotOpen(false)}
                  className="rounded-lg border border-white/12 px-2.5 py-2 text-2xs font-semibold text-neutral-300 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : order.pickupSlot ? (
            <p className="mt-1.5 text-2xs font-semibold text-emerald-100">
              {order.pickupSlot.date} · {order.pickupSlot.window} · {order.pickupSlot.point}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setIsSlotOpen(true)}
              className="mt-1.5 w-full rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:border-orangeMoney/50 hover:text-white"
            >
              Set collection window
            </button>
          )}
        </div>
      )}

      {/* Payment reference — the audit trail for mobile money reconciliation */}
      <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs font-bold uppercase tracking-wide text-neutral-400">Payment reference</span>
          {order.paymentReference && !isEditingReference && (
            <button
              type="button"
              onClick={() => setIsEditingReference(true)}
              className="text-2xs font-semibold text-neutral-400 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {order.paymentReference && !isEditingReference ? (
          <ReferenceChip reference={order.paymentReference} />
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5">
            <label className="sr-only" htmlFor={`reference-${order.id}`}>
              Payment reference or transaction ID for {order.orderNumber}
            </label>
            <input
              id={`reference-${order.id}`}
              value={referenceDraft}
              onChange={(event) => setReferenceDraft(event.target.value)}
              placeholder="e.g. OM-984102"
              className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 font-mono text-2xs text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
            <button
              type="button"
              onClick={() => {
                onSaveReference(order.id, referenceDraft);
                setIsEditingReference(false);
              }}
              disabled={!referenceDraft.trim()}
              className="flex-shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-2 text-2xs font-bold uppercase tracking-wide text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}

        {!order.paymentReference && !isEditingReference && (
          <p className="mt-1.5 text-2xs text-neutral-400">
            Not captured yet — add the ID from the customer&apos;s SMS before confirming payment.
          </p>
        )}
      </div>

      {order.verificationNotes && (
        <p className="mt-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-2xs leading-relaxed text-amber-100">
          {order.verificationNotes}
        </p>
      )}

      {/* Activity log */}
      {timeline.length > 0 && (
        <details className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2">
          <summary className="flex cursor-pointer items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-neutral-400">
            <History size={12} aria-hidden="true" />
            Activity ({timeline.length})
            <ChevronDown size={12} aria-hidden="true" />
          </summary>

          <ol className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
            {[...timeline].reverse().map((event) => (
              <li key={event.id} className="relative text-2xs leading-relaxed">
                <span
                  aria-hidden="true"
                  className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-orangeMoney"
                />
                <span className="font-semibold text-neutral-200">{event.label}</span>
                <span className="ml-1.5 text-neutral-400">
                  {formatDateTime(event.at)} · {event.actor}
                </span>
                {event.detail && <span className="block text-neutral-400">{event.detail}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* Add note */}
      {isNoteOpen ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`note-${order.id}`}>
            New note for {order.orderNumber}
          </label>
          <input
            id={`note-${order.id}`}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="e.g. Called, no answer"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && noteDraft.trim()) {
                addOrderNote(order.id, noteDraft);
                setNoteDraft('');
                setIsNoteOpen(false);
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 text-2xs text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
          />
          <button
            type="button"
            onClick={() => {
              addOrderNote(order.id, noteDraft);
              setNoteDraft('');
              setIsNoteOpen(false);
            }}
            disabled={!noteDraft.trim()}
            aria-label="Save note"
            className="flex-shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/15 p-2 text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
          >
            <Send size={12} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsNoteOpen(true)}
          className="mt-2.5 inline-flex items-center gap-1.5 text-2xs font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          <StickyNote size={12} aria-hidden="true" />
          Add a note
        </button>
      )}

      {/* Actions */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <a
            href={buildStatusUpdateLink(order, nextStatus ?? workflowStatus)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-2xs font-bold uppercase tracking-wide text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
          >
            <MessageCircle size={14} aria-hidden="true" />
            WhatsApp
          </a>

          <button
            type="button"
            onClick={() => onPrint(order)}
            aria-label={`Print packing slip for ${order.orderNumber}`}
            className="inline-flex min-h-[40px] flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            <Printer size={14} aria-hidden="true" />
            Slip
          </button>
        </div>

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

        <div className="flex items-center gap-2">
          {previousStatus && (
            <button
              type="button"
              onClick={() => onTransition(order.id, previousStatus, 'Reverted by seller review.')}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-2xs font-semibold text-neutral-400 transition-colors hover:border-white/25 hover:text-white"
            >
              <ArrowLeft size={12} aria-hidden="true" />
              Back
            </button>
          )}

          <button
            type="button"
            onClick={() => onRequestCancel(order)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/25 px-3 py-2 text-2xs font-semibold text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10"
          >
            <XCircle size={12} aria-hidden="true" />
            Cancel
          </button>
        </div>
      </div>
    </li>
  );
}

/** Mono reference with one-tap copy, used for mobile money transaction IDs. */
function ReferenceChip({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the reference stays selectable.
    }
  };

  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1.5">
      <span className="truncate font-mono text-2xs font-bold text-emerald-100">{reference}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Payment reference copied' : `Copy payment reference ${reference}`}
        className="flex-shrink-0 rounded-md p-1 text-emerald-200 transition-colors hover:text-white"
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      </button>
    </div>
  );
}

interface CancelledOrderRowProps {
  order: Order;
  onReopen: (orderId: string) => void;
  onPrint: (order: Order) => void;
}

function CancelledOrderRow({ order, onReopen, onPrint }: CancelledOrderRowProps) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-100">
          <span className="font-mono text-orangeMoney">{order.orderNumber}</span>
          {order.customer.name}
          <Badge variant="soldOut" icon={null} className="text-[10px]">
            {units} unit{units === 1 ? '' : 's'} returned
          </Badge>
        </p>
        <p className="mt-0.5 text-2xs text-neutral-400">
          {order.cancelReason ?? 'Cancelled by seller'} ·{' '}
          {order.cancelledAt ? formatDateTime(order.cancelledAt) : 'date unavailable'} ·{' '}
          {formatBWP(order.totalAmountBWP)}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <a
          href={buildStatusUpdateLink(order, 'cancelled')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-whatsapp/40 bg-whatsapp/10 px-2.5 text-2xs font-bold uppercase tracking-wide text-whatsapp transition-colors hover:bg-whatsapp/20"
        >
          <MessageCircle size={12} aria-hidden="true" />
          Notify
        </a>

        <button
          type="button"
          onClick={() => onPrint(order)}
          aria-label={`Print slip for ${order.orderNumber}`}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          <Printer size={12} aria-hidden="true" />
          Slip
        </button>

        <button
          type="button"
          onClick={() => onReopen(order.id)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-2.5 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          <RotateCcw size={12} aria-hidden="true" />
          Reopen
        </button>
      </div>
    </li>
  );
}
