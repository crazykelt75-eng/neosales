'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  CheckCheck,
  Search,
  FileImage,
  MessageCircle,
  X,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/components/ui/Toast';
import { generateSellerStatusPingLink } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const PIPELINE_COLUMNS: {
  id: OrderStatus;
  title: string;
  badgeVariant: 'warning' | 'success' | 'info' | 'neutral';
  icon: React.ElementType;
}[] = [
  {
    id: 'pending_verification',
    title: 'Pending Verification',
    badgeVariant: 'warning',
    icon: Clock,
  },
  {
    id: 'payment_confirmed',
    title: 'Payment Confirmed',
    badgeVariant: 'success',
    icon: CheckCircle,
  },
  {
    id: 'ready_for_pickup',
    title: 'Ready for Pickup',
    badgeVariant: 'info',
    icon: Package,
  },
  {
    id: 'out_for_delivery',
    title: 'Out for Delivery',
    badgeVariant: 'info',
    icon: Truck,
  },
  {
    id: 'completed',
    title: 'Completed',
    badgeVariant: 'neutral',
    icon: CheckCheck,
  },
];

export function OrderKanban() {
  const { orders, verifyPayment, updateOrderStatus } = useStore();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);

  // Close proof preview on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProofOrder(null);
    };
    if (selectedProofOrder) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProofOrder]);

  const handleVerify = (orderId: string, orderNumber: string) => {
    verifyPayment(orderId);
    showToast({
      type: 'success',
      title: 'Payment Verified',
      description: `Order #${orderNumber} marked as confirmed. Variant inventory automatically decremented.`,
    });
  };

  const handleStatusChange = (orderId: string, orderNumber: string, nextStatus: OrderStatus, label: string) => {
    updateOrderStatus(orderId, nextStatus);
    showToast({
      type: 'info',
      title: 'Status Updated',
      description: `Order #${orderNumber} progressed to: ${label}`,
    });
  };

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.customer.fullName.toLowerCase().includes(q) ||
      order.customer.phone.includes(q) ||
      order.customer.deliveryTown.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-neutral-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by order #, customer, town, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter orders"
            className="w-full pl-10 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900 min-h-[40px]"
          />
        </div>

        <div className="text-xs text-neutral-600 font-semibold self-end sm:self-center">
          Active Pipeline: <strong>{filteredOrders.length}</strong> orders displayed
        </div>
      </div>

      {/* Kanban Board Horizontal Track */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x scrollbar-none">
        {PIPELINE_COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="w-72 sm:w-80 flex-shrink-0 bg-neutral-100/90 rounded-2xl p-3 sm:p-3.5 border border-neutral-200/80 flex flex-col max-h-[78vh] shadow-xs snap-start"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <ColIcon size={16} className="text-neutral-700" aria-hidden="true" />
                  <h3 className="font-extrabold text-xs sm:text-sm text-neutral-900">{col.title}</h3>
                </div>
                <span className="text-xs font-black bg-white text-neutral-800 border border-neutral-200/80 px-2 py-0.5 rounded-full shadow-xs">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {colOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400 bg-white/60 rounded-xl border border-dashed border-neutral-300">
                    No orders currently in this stage
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <article
                      key={order.id}
                      className="bg-white rounded-xl p-3.5 border border-neutral-200/90 shadow-soft hover:shadow-card transition-all space-y-3 text-left"
                    >
                      {/* Top: Order # & Payment Method */}
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs sm:text-sm text-neutral-950 tracking-tight font-mono">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant={order.paymentMethod === 'orange_money' ? 'orangeMoney' : 'fnb'}
                        >
                          {order.paymentMethod === 'orange_money' ? 'Orange Money' : 'FNB Pay2Cell'}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <p className="text-xs font-bold text-neutral-900">{order.customer.fullName}</p>
                        <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
                          {order.customer.phone} • {order.customer.deliveryTown}
                        </p>
                        <p className="text-[10px] text-neutral-400 capitalize mt-0.5">
                          Method: {order.customer.deliveryPreference.replace('_', ' ')}
                        </p>
                      </div>

                      {/* Items Preview */}
                      <div className="bg-neutral-50 p-2.5 rounded-xl space-y-1 border border-neutral-100">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-[11px] text-neutral-700"
                          >
                            <span className="truncate max-w-[170px] font-medium">
                              {item.quantity}x {item.productTitle}
                            </span>
                            <span className="font-bold text-neutral-950">
                              P{item.lineTotalBWP.toFixed(0)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-1.5 border-t border-neutral-200 flex justify-between text-xs font-black text-neutral-950">
                          <span>Total Amount</span>
                          <span>P{order.totalAmountBWP.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Slip Attachment View */}
                      {order.paymentProofUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProofOrder(order)}
                          className="w-full text-xs font-bold text-emerald-800 bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100"
                          leftIcon={<FileImage size={13} />}
                        >
                          View Payment Proof Slip
                        </Button>
                      )}

                      {/* Verification / Workflow Controls */}
                      <div className="pt-1 flex flex-col gap-2">
                        {order.status === 'pending_verification' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleVerify(order.id, order.orderNumber)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
                            leftIcon={<CheckCircle size={14} />}
                          >
                            Verify & Decrement Stock
                          </Button>
                        )}

                        {order.status === 'payment_confirmed' && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleStatusChange(
                                  order.id,
                                  order.orderNumber,
                                  'ready_for_pickup',
                                  'Ready for Collection'
                                )
                              }
                              className="text-[11px] font-bold"
                            >
                              Ready Pickup
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleStatusChange(
                                  order.id,
                                  order.orderNumber,
                                  'out_for_delivery',
                                  'Out for Courier Delivery'
                                )
                              }
                              className="text-[11px] font-bold"
                            >
                              Out Delivery
                            </Button>
                          </div>
                        )}

                        {(order.status === 'ready_for_pickup' ||
                          order.status === 'out_for_delivery') && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              handleStatusChange(
                                order.id,
                                order.orderNumber,
                                'completed',
                                'Completed & Delivered'
                              )
                            }
                            className="w-full font-bold"
                            leftIcon={<CheckCheck size={14} />}
                          >
                            Mark Completed
                          </Button>
                        )}

                        {/* WhatsApp Customer Status Notification Ping */}
                        {order.status !== 'pending_verification' &&
                          order.status !== 'cancelled' && (
                            <a
                              href={generateSellerStatusPingLink(
                                order,
                                order.status as
                                  | 'payment_confirmed'
                                  | 'ready_for_pickup'
                                  | 'out_for_delivery'
                                  | 'completed'
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[38px] w-full py-1.5 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075e54] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#25D366]/30 transition-colors"
                            >
                              <MessageCircle size={14} aria-hidden="true" />
                              <span>Notify Buyer on WhatsApp</span>
                            </a>
                          )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Proof Slip Modal */}
      {selectedProofOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="proof-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 overflow-hidden shadow-elevated relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h4 id="proof-modal-title" className="font-extrabold text-sm sm:text-base text-neutral-900">
                Payment Slip Proof • {selectedProofOrder.orderNumber}
              </h4>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
                aria-label="Close proof preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
              <img
                src={selectedProofOrder.paymentProofUrl}
                alt="Payment Slip Proof"
                className="max-h-[56vh] object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-neutral-600 font-semibold">
                Amount: <strong>P{selectedProofOrder.totalAmountBWP.toFixed(2)}</strong> (
                {selectedProofOrder.paymentMethod})
              </span>
              {selectedProofOrder.status === 'pending_verification' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    handleVerify(selectedProofOrder.id, selectedProofOrder.orderNumber);
                    setSelectedProofOrder(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Verify Payment Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
