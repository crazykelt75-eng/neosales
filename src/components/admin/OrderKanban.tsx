'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Order, OrderStatus, WorkflowStatus, ORDER_STATUS_ORDER } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CancelOrderDialog } from '@/components/admin/CancelOrderDialog';
import { DELIVERY_OPTIONS_BY_ID, ORDER_STATUS_META, PAYMENT_OPTIONS_BY_ID } from '@/lib/constants';
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

/** Order fulfilment board: one column per workflow status, plus a cancelled ledger. */
export function OrderKanban() {
  const { orders, updateOrderStatus, cancelOrder, reopenOrder, setOrderPaymentReference } = useStore();
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const workflowOrders = useMemo(() => orders.filter((order) => order.status !== 'cancelled'), [orders]);
  const cancelledOrders = useMemo(() => orders.filter((order) => order.status === 'cancelled'), [orders]);

  const columns = useMemo(
    () =>
      ORDER_STATUS_ORDER.map((status) => ({
        status,
        label: ORDER_STATUS_META[status].label,
        description: ORDER_STATUS_META[status].description,
        orders: workflowOrders.filter((order) => order.status === status),
      })),
    [workflowOrders]
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
          All active ({workflowOrders.length})
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

      {workflowOrders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface/70 p-6 text-center text-xs text-neutral-400">
          No active orders right now. Orders placed through the storefront appear here instantly.
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
                    <OrderCard
                      key={order.id}
                      order={order}
                      onTransition={updateOrderStatus}
                      onSaveReference={setOrderPaymentReference}
                      onRequestCancel={setOrderToCancel}
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
              <CancelledOrderRow key={order.id} order={order} onReopen={reopenOrder} />
            ))}
          </ul>
        </details>
      )}

      <CancelOrderDialog
        order={orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={cancelOrder}
      />
    </section>
  );
}

interface OrderCardProps {
  order: Order;
  onTransition: (orderId: string, status: OrderStatus, notes?: string) => void;
  onSaveReference: (orderId: string, reference: string) => void;
  onRequestCancel: (order: Order) => void;
}

function OrderCard({ order, onTransition, onSaveReference, onRequestCancel }: OrderCardProps) {
  const delivery = DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[order.paymentMethod];
  const paymentBadge = PAYMENT_BADGES[order.paymentMethod];
  const workflowStatus = order.status as WorkflowStatus;
  const nextStatus = NEXT_STATUS[workflowStatus];
  const previousStatus = PREVIOUS_STATUS[workflowStatus];

  const [referenceDraft, setReferenceDraft] = useState(order.paymentReference ?? '');
  const [isEditingReference, setIsEditingReference] = useState(false);

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

      <p className="mt-2.5 text-2xs text-neutral-400">
        {payment?.label ?? order.paymentMethod} · {itemsSummary}
      </p>

      {/* Actions */}
      <div className="mt-3 space-y-2">
        <a
          href={buildStatusUpdateLink(order, nextStatus ?? workflowStatus)}
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
}

function CancelledOrderRow({ order, onReopen }: CancelledOrderRowProps) {
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
