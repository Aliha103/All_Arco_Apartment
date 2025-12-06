'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { Payment, Booking, Refund } from '@/types';
import { toast } from 'sonner';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const paymentId = params.id as string;

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('guest_cancellation');
  const [refundNotes, setRefundNotes] = useState('');
  const [isFullRefund, setIsFullRefund] = useState(true);

  // Fetch payment details
  const { data: payment, isLoading, error } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      const response = await api.payments.get(paymentId);
      return response.data as Payment & {
        booking_details?: Booking;
        refunds?: Refund[];
        stripe_fee?: string;
        card_brand?: string;
        card_last4?: string;
      };
    },
  });

  // Process refund
  const processRefund = useMutation({
    mutationFn: (data: { amount: string; reason: string; notes?: string }) =>
      api.payments.refund(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      setIsRefundModalOpen(false);
      setRefundAmount('');
      setRefundNotes('');
      toast.success('Refund processed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    },
  });

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = isFullRefund
      ? parseFloat(payment?.amount || '0').toString()
      : refundAmount;
    processRefund.mutate({
      amount,
      reason: refundReason,
      notes: refundNotes || undefined,
    });
  };

  const openRefundModal = () => {
    if (payment) {
      const availableForRefund = calculateAvailableForRefund();
      setRefundAmount(availableForRefund.toString());
      setIsFullRefund(true);
    }
    setIsRefundModalOpen(true);
  };

  const calculateAvailableForRefund = () => {
    if (!payment) return 0;
    const total = parseFloat(payment.amount);
    const refunded = (payment.refunds || []).reduce(
      (sum, r) => sum + (r.status === 'succeeded' ? parseFloat(r.amount) : 0),
      0
    );
    return Math.max(0, total - refunded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h2>
        <p className="text-gray-600 mb-4">The payment you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/pms/payments">
          <Button>Back to Payments</Button>
        </Link>
      </div>
    );
  }

  const availableForRefund = calculateAvailableForRefund();
  const canRefund = payment.status === 'succeeded' && availableForRefund > 0;
  const totalRefunded = parseFloat(payment.amount) - availableForRefund;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/pms/payments" className="text-blue-600 hover:text-blue-800">
              ← Back to Payments
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Payment Details</h1>
          <p className="text-gray-600 font-mono text-sm mt-1">
            {payment.stripe_payment_intent_id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(payment.status)} text-base px-3 py-1`}>
            {payment.status.toUpperCase()}
          </Badge>
          {canRefund && (
            <Button onClick={openRefundModal}>
              Issue Refund
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Currency</p>
                <p className="font-semibold">{payment.currency.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold">{formatDateTime(payment.created_at)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-semibold">
                {payment.card_brand || 'Card'}{' '}
                {payment.card_last4 && `****${payment.card_last4}`}
              </p>
            </div>
            {payment.stripe_fee && (
              <div>
                <p className="text-sm text-gray-600">Stripe Fee</p>
                <p className="font-semibold text-gray-600">{formatCurrency(payment.stripe_fee)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Booking */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payment.booking_details ? (
              <>
                <div>
                  <p className="text-sm text-gray-600">Booking ID</p>
                  <Link
                    href={`/pms/bookings/${payment.booking}`}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    {payment.booking_details.booking_id}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guest</p>
                  <p className="font-semibold">{payment.booking_details.guest_name}</p>
                  <p className="text-sm text-gray-600">{payment.booking_details.guest_email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="font-semibold">{formatDate(payment.booking_details.check_in_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-out</p>
                    <p className="font-semibold">{formatDate(payment.booking_details.check_out_date)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Booking Status</p>
                  <Badge className={getStatusColor(payment.booking_details.status)}>
                    {payment.booking_details.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <Link href={`/pms/bookings/${payment.booking}`}>
                  <Button variant="outline" size="sm">View Booking</Button>
                </Link>
              </>
            ) : (
              <p className="text-gray-600">Booking ID: {payment.booking}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stripe Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Intent ID</p>
                <p className="font-mono text-sm break-all">{payment.stripe_payment_intent_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
              </div>
            </div>
            <div>
              <a
                href={`https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View in Stripe Dashboard →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund History */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Refund History</CardTitle>
            {totalRefunded > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Refunded</p>
                <p className="font-semibold text-red-600">{formatCurrency(totalRefunded)}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {payment.refunds && payment.refunds.length > 0 ? (
            <div className="space-y-4">
              {payment.refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <p className="font-semibold">{formatCurrency(refund.amount)}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(refund.created_at)} • {refund.reason.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{refund.stripe_refund_id}</p>
                  </div>
                  <Badge className={getStatusColor(refund.status)}>{refund.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-600">No refunds issued</p>
          )}
        </CardContent>
      </Card>

      {/* Refund Summary */}
      {(payment.status === 'succeeded' || payment.status === 'refunded' || payment.status === 'partially_refunded') && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Original Payment</span>
                <span className="font-semibold">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Refunded</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(totalRefunded)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Net Amount</span>
                <span className="font-bold">
                  {formatCurrency(availableForRefund)}
                </span>
              </div>
              {canRefund && (
                <div className="pt-2">
                  <Button onClick={openRefundModal}>
                    Refund Remaining {formatCurrency(availableForRefund)}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refund Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Available for refund: <strong>{formatCurrency(availableForRefund)}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="fullRefund"
                  name="refundType"
                  checked={isFullRefund}
                  onChange={() => setIsFullRefund(true)}
                />
                <Label htmlFor="fullRefund">
                  Full refund ({formatCurrency(availableForRefund)})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="partialRefund"
                  name="refundType"
                  checked={!isFullRefund}
                  onChange={() => setIsFullRefund(false)}
                />
                <Label htmlFor="partialRefund">Partial refund</Label>
              </div>
            </div>

            {!isFullRefund && (
              <div className="space-y-2">
                <Label>Refund Amount (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableForRefund}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              >
                <option value="guest_cancellation">Guest Cancellation</option>
                <option value="property_issue">Property Issue</option>
                <option value="double_booking">Double Booking</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-20"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Additional details about this refund..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Refunds typically take 5-10 business days to appear in the customer&apos;s account.
                The guest will receive an email notification.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRefundModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processRefund.isPending || (!isFullRefund && !refundAmount)}
              >
                {processRefund.isPending
                  ? 'Processing...'
                  : `Refund ${formatCurrency(isFullRefund ? availableForRefund : parseFloat(refundAmount) || 0)}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
