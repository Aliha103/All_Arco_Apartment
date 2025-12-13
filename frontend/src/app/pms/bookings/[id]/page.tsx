'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { toast } from 'sonner';
import { Booking, Payment, PaymentRequest } from '@/types';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params.id as string;
  const [isClient, setIsClient] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isNonRefundableConfirmOpen, setIsNonRefundableConfirmOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('guest_cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [selectedEmailType, setSelectedEmailType] = useState('confirmation');
  const [editFormData, setEditFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
    guests: 1,
    special_requests: '',
  });

  // Only run queries on the client to avoid SSR/CSR mismatch that can render duplicate screens
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch booking details
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.bookings.get(bookingId);
      return response.data as Booking & {
        internal_notes?: string;
        created_by_name?: string;
        user_id?: string;
        nightly_rate?: string;
        cleaning_fee?: string;
        tourist_tax?: string;
        guests?: any[];
        guest_email?: string;
        booking_id?: string;
        guests_count?: number;
      };
    },
    enabled: isClient && !!bookingId,
  });

  // Fetch payments for this booking
  const { data: payments } = useQuery({
    queryKey: ['booking-payments', bookingId],
    queryFn: async () => {
      const response = await api.payments.list({ booking: bookingId });
      return (response.data.results || response.data) as Payment[];
    },
    enabled: isClient && !!booking,
  });

  // Fetch payment requests for this booking
  const { data: paymentRequests } = useQuery({
    queryKey: ['booking-payment-requests', bookingId],
    queryFn: async () => {
      const response = await api.paymentRequests.list({ booking: bookingId });
      return (response.data.results || response.data) as PaymentRequest[];
    },
    enabled: isClient && !!booking,
    refetchInterval: 30000, // Refetch every 30 seconds to catch webhook updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Update booking status
  const updateStatus = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      api.bookings.update(bookingId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
    },
  });

  // Send email
  const sendEmail = useMutation({
    mutationFn: (emailType: string) =>
      api.bookings.sendEmail(bookingId),
    onSuccess: () => {
      setIsEmailModalOpen(false);
      toast.success('Email sent successfully');
    },
    onError: () => {
      toast.error('Failed to send email');
    },
  });

  // Cancel booking
  const cancelBooking = useMutation({
    mutationFn: () =>
      api.bookings.update(bookingId, {
        status: 'cancelled',
        cancellation_reason: cancelNotes || cancelReason,
        issue_refund: issueRefund,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setIsCancelModalOpen(false);
      setIsNonRefundableConfirmOpen(false);
      setCancelReason('guest_cancellation');
      setCancelNotes('');
      setIssueRefund(true);
      toast.success('Booking cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel booking');
    },
  });

  // Add internal note
  const addNote = useMutation({
    mutationFn: (note: string) =>
      api.bookings.update(bookingId, {
        internal_notes: booking?.internal_notes
          ? `${booking.internal_notes}\n\n---\n${new Date().toLocaleString()}\n${note}`
          : `${new Date().toLocaleString()}\n${note}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setIsNoteModalOpen(false);
      setNewNote('');
    },
  });

  // Update booking details
  const updateBooking = useMutation({
    mutationFn: (data: typeof editFormData) =>
      api.bookings.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setIsEditModalOpen(false);
      toast.success('Booking updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update booking');
    },
  });

  // Open edit modal with current booking data
  const handleOpenEditModal = () => {
    if (booking) {
      setEditFormData({
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        check_in_date: booking.check_in_date || '',
        check_out_date: booking.check_out_date || '',
        guests: booking.guests || 1,
        special_requests: booking.special_requests || '',
      });
      setIsEditModalOpen(true);
    }
  };

  // Check if booking is in non-refundable period (within 7 days of check-in or past check-in)
  const isNonRefundablePeriod = () => {
    if (!booking?.check_in_date) return false;
    const checkInDate = new Date(booking.check_in_date);
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilCheckIn <= 7;
  };

  // Handle cancel booking button click
  const handleCancelBooking = () => {
    // Validate "Other" reason requires additional notes
    if (cancelReason === 'other' && !cancelNotes.trim()) {
      toast.error('Please provide a reason for "Other" cancellation');
      return;
    }

    // Check if booking has successful payments
    const hasSuccessfulPayment = payments && payments.some((p) => p.status === 'succeeded');

    // If non-refundable period and has payment, show confirmation
    if (hasSuccessfulPayment && isNonRefundablePeriod()) {
      setIsCancelModalOpen(false);
      setIsNonRefundableConfirmOpen(true);
    } else {
      // Proceed with cancellation
      cancelBooking.mutate();
    }
  };

  // Availability check for undo-cancel / undo no-show to avoid overbooking
  const shouldCheckOverlaps = !!booking && ['cancelled', 'no_show'].includes(booking.status);
  const { data: overlapBlocked = false } = useQuery({
    queryKey: ['booking-overlaps', bookingId],
    queryFn: async () => {
      if (!booking) return false;
      const resp = await api.bookings.list({
        check_in_date_from: booking.check_in_date,
        check_in_date_to: booking.check_out_date,
      });
      const list = resp.data.results || resp.data || [];
      const overlaps = list.filter(
        (b: any) =>
          b.id !== booking.id &&
          ['pending', 'confirmed', 'paid', 'checked_in'].includes((b.status || '').toLowerCase())
      );
      return overlaps.length > 0;
    },
    enabled: isClient && shouldCheckOverlaps && !!booking?.check_in_date && !!booking?.check_out_date,
  });

  if (!isClient || isLoading) {
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

  if (error || !booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
        <p className="text-gray-600 mb-4">The booking you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        <Link href="/pms/bookings">
          <Button>Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  // Derived amounts
  const paidAmount = (payments || [])
    .filter((p) => ['succeeded', 'partially_refunded'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalAmount = Number(booking.total_price || 0);
  const balance = Math.max(0, totalAmount - paidAmount);
  const computedPaymentStatus =
    paidAmount >= totalAmount && totalAmount > 0
      ? 'paid'
      : paidAmount > 0
      ? 'partial'
      : 'unpaid';

  // Actions eligibility
  const hasGuestDetails = Array.isArray((booking as any).guests) && (booking as any).guests.length > 0;
  const canCheckInStatus = ['paid', 'confirmed'].includes(booking.status);
  const canCheckIn = canCheckInStatus && hasGuestDetails;
  const canCheckOut = booking.status === 'checked_in';
  const canUndoCheckIn = booking.status === 'checked_in';
  const canUndoCheckOut = booking.status === 'checked_out';
  const canNoShow = ['confirmed', 'paid'].includes(booking.status);
  const canCancel = !['cancelled', 'checked_out'].includes(booking.status);
  const canUndoCancel = booking.status === 'cancelled' && !overlapBlocked;
  const canUndoNoShow = (booking.status as string) === 'no_show' && !overlapBlocked;

  const handleStatusUpdate = (status: string, confirmationText: string) => {
    if (confirm(confirmationText)) {
      updateStatus.mutate({ status });
    }
  };

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/pms/bookings" className="text-blue-600 hover:text-blue-800">
              ← Back to Bookings
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{booking.booking_id}</h1>
          <p className="text-gray-600">Created on {formatDateTime(booking.created_at)}</p>
        </div>
        <div className="flex gap-3">
          <Badge className={`${getStatusColor(booking.status)} text-base px-3 py-1 bg-white text-gray-900`}>
            {booking.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge className={`${getStatusColor(computedPaymentStatus)} text-base px-3 py-1 bg-white text-gray-900`}>
            {computedPaymentStatus.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold">{booking.guest_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <a href={`mailto:${booking.guest_email}`} className="text-blue-700 hover:underline">
                {booking.guest_email}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <a href={`tel:${booking.guest_phone}`} className="text-blue-700 hover:underline">
                {booking.guest_phone}
              </a>
            </div>
            {booking.user_id && (
              <Link href={`/pms/guests/${booking.user_id}`}>
                <Button variant="outline" size="sm">View Guest Profile</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Check-in</p>
                <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
                <p className="text-sm text-gray-500">15:00</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out</p>
                <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
                <p className="text-sm text-gray-500">11:00</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nights</p>
                <p className="font-semibold">{booking.nights}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guests</p>
                <p className="font-semibold">{booking.guests}</p>
              </div>
            </div>
            {booking.created_by_name && (
              <div>
                <p className="text-sm text-gray-600">Created By</p>
                <p className="font-semibold">{booking.created_by_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pricing Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Accommodation ({booking.nights} nights × {formatCurrency(booking.nightly_rate || '0')})
              </span>
              <span className="font-semibold">
                {formatCurrency(
                  (parseFloat(booking.nightly_rate || '0') * booking.nights).toString()
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cleaning Fee</span>
              <span className="font-semibold">{formatCurrency(booking.cleaning_fee || '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Tourist Tax ({booking.guests} guests × {booking.nights} nights)
              </span>
              <span className="font-semibold">{formatCurrency(booking.tourist_tax || '0')}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">{formatCurrency(booking.total_price)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">{formatDateTime(payment.created_at)}</p>
                    <p className="text-sm text-gray-600">
                      {payment.payment_method || 'Card'} •{' '}
                      <span className="font-mono">{payment.stripe_payment_intent_id.slice(0, 20)}...</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-600">No payments recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Requests */}
      {paymentRequests && paymentRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{request.description}</p>
                      <Badge className={
                        request.status === 'paid' ? 'bg-green-100 text-green-800' :
                        request.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        request.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Due: {formatDate(request.due_date)}
                      {request.paid_at && ` • Paid: ${formatDateTime(request.paid_at)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(request.amount)}</p>
                    {request.stripe_payment_link_url && request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(request.stripe_payment_link_url!);
                          toast.success('Payment link copied to clipboard');
                        }}
                      >
                        Copy Payment Link
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Requests */}
      {booking.special_requests && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Special Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{booking.special_requests}</p>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Internal Notes (Team Only)</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsNoteModalOpen(true)}>
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {booking.internal_notes ? (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
              {booking.internal_notes}
            </pre>
          ) : (
            <p className="text-gray-600">No internal notes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleOpenEditModal}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
            >
              Edit Booking
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsEmailModalOpen(true)}
            >
              Send Email
            </Button>

            {canCheckIn && (
              <Button
                onClick={() => {
                  if (!hasGuestDetails) {
                    const link = `/booking/checkin?confirmation=${encodeURIComponent(booking.booking_id || '')}&email=${encodeURIComponent(booking.guest_email || '')}`;
                    toast.error('Add guest details before checking in.');
                    if (booking.booking_id && booking.guest_email) {
                      window.open(link, '_blank');
                    }
                    return;
                  }
                  handleStatusUpdate('checked_in', 'Mark this booking as checked in?');
                }}
                disabled={updateStatus.isPending}
              >
                Mark as Checked In
              </Button>
            )}
            {!hasGuestDetails && canCheckInStatus && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = `/booking/${encodeURIComponent(booking.booking_id || '')}/check-in`;
                  toast.info('Opening check-in form for guest registration.');
                  if (booking.booking_id) {
                    window.open(link, '_blank');
                  }
                }}
              >
                Add guest details
              </Button>
            )}

            {canCheckOut && (
              <Button
                onClick={() => {
                  handleStatusUpdate('checked_out', 'Mark this booking as checked out?');
                }}
                disabled={updateStatus.isPending}
              >
                Mark as Checked Out
              </Button>
            )}

            {canUndoCheckIn && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('confirmed', 'Undo check-in and revert to confirmed?')}
                disabled={updateStatus.isPending}
              >
                Undo Check-in
              </Button>
            )}

            {canUndoCheckOut && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('checked_in', 'Undo check-out and revert to checked-in?')}
                disabled={updateStatus.isPending}
              >
                Undo Check-out
              </Button>
            )}

            {canNoShow && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('no_show', 'Mark as no-show?')}
                disabled={updateStatus.isPending}
              >
                Mark as No-show
              </Button>
            )}

            {payments && payments.some((p) => p.status === 'succeeded') && (
              <Link href={`/pms/payments/${payments.find((p) => p.status === 'succeeded')?.id}`}>
                <Button variant="outline">View Payment / Issue Refund</Button>
              </Link>
            )}

            {canCancel && (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setIsCancelModalOpen(true)}
              >
                Cancel Booking
              </Button>
            )}

            {canUndoCancel && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('confirmed', 'Undo cancellation and restore booking?')}
                disabled={updateStatus.isPending}
              >
                Undo Cancel
              </Button>
            )}

            {canUndoNoShow && (
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate('confirmed', 'Undo no-show and restore booking?')}
                disabled={updateStatus.isPending}
              >
                Undo No-show
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Type</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                value={selectedEmailType}
                onChange={(e) => setSelectedEmailType(e.target.value)}
              >
                <option value="confirmation">Booking Confirmation</option>
                <option value="checkin">Check-in Instructions</option>
                <option value="receipt">Payment Receipt</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              Email will be sent to: {booking.guest_email}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendEmail.mutate(selectedEmailType)}
              disabled={sendEmail.isPending}
            >
              {sendEmail.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cancellation Reason *</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="guest_cancellation">Guest Cancellation</option>
                <option value="property_issue">Property Issue</option>
                <option value="double_booking">Double Booking</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>
                Additional Notes {cancelReason === 'other' && <span className="text-red-600">*</span>}
                {cancelReason !== 'other' && <span className="text-gray-500">(Optional)</span>}
              </Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-20 text-gray-900"
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder={
                  cancelReason === 'other'
                    ? 'Please provide a reason for cancellation...'
                    : 'Enter any additional details...'
                }
                required={cancelReason === 'other'}
              />
              {cancelReason === 'other' && !cancelNotes.trim() && (
                <p className="text-sm text-red-600">Required when "Other" is selected</p>
              )}
            </div>
            {payments && payments.some((p) => p.status === 'succeeded') && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="issueRefund"
                  checked={issueRefund}
                  onChange={(e) => setIssueRefund(e.target.checked)}
                />
                <Label htmlFor="issueRefund">Issue full refund</Label>
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ This action cannot be undone. The guest will be notified of the cancellation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={cancelBooking.isPending || (cancelReason === 'other' && !cancelNotes.trim())}
            >
              {cancelBooking.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-32 text-gray-900"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note..."
              />
            </div>
            <p className="text-sm text-gray-600">
              This note will only be visible to team members.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addNote.mutate(newNote)}
              disabled={addNote.isPending || !newNote.trim()}
            >
              {addNote.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Booking Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            updateBooking.mutate(editFormData);
          }} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="guest_name" className="text-sm font-semibold text-gray-700">Guest Name *</Label>
                <input
                  id="guest_name"
                  type="text"
                  value={editFormData.guest_name}
                  onChange={(e) => setEditFormData({ ...editFormData, guest_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="guest_email" className="text-sm font-semibold text-gray-700">Guest Email *</Label>
                <input
                  id="guest_email"
                  type="email"
                  value={editFormData.guest_email}
                  onChange={(e) => setEditFormData({ ...editFormData, guest_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="guest_phone" className="text-sm font-semibold text-gray-700">Guest Phone *</Label>
                <input
                  id="guest_phone"
                  type="tel"
                  value={editFormData.guest_phone}
                  onChange={(e) => setEditFormData({ ...editFormData, guest_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div>
                <Label htmlFor="check_in_date" className="text-sm font-semibold text-gray-700">Check-in Date *</Label>
                <input
                  id="check_in_date"
                  type="date"
                  value={editFormData.check_in_date}
                  onChange={(e) => setEditFormData({ ...editFormData, check_in_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div>
                <Label htmlFor="check_out_date" className="text-sm font-semibold text-gray-700">Check-out Date *</Label>
                <input
                  id="check_out_date"
                  type="date"
                  value={editFormData.check_out_date}
                  onChange={(e) => setEditFormData({ ...editFormData, check_out_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="guests" className="text-sm font-semibold text-gray-700">Number of Guests *</Label>
                <input
                  id="guests"
                  type="number"
                  min="1"
                  max="6"
                  value={editFormData.guests}
                  onChange={(e) => setEditFormData({ ...editFormData, guests: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="special_requests" className="text-sm font-semibold text-gray-700">Special Requests</Label>
                <textarea
                  id="special_requests"
                  value={editFormData.special_requests}
                  onChange={(e) => setEditFormData({ ...editFormData, special_requests: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1.5 min-h-24 focus:border-[#C4A572] focus:ring-[#C4A572] text-gray-900"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#C4A572] to-[#B39562] hover:from-[#B39562] hover:to-[#A08552] text-white"
                disabled={updateBooking.isPending}
              >
                {updateBooking.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Non-Refundable Cancellation Confirmation Dialog */}
      <Dialog open={isNonRefundableConfirmOpen} onOpenChange={setIsNonRefundableConfirmOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-700">Non-Refundable Cancellation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ This booking is in the non-refundable period
              </p>
              <p className="text-sm text-red-700">
                The check-in date is within 7 days (or has passed). According to the cancellation policy,
                this booking is non-refundable.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                Do you still want to proceed with the cancellation?
              </p>

              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700">Refund Options:</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refund-option"
                      checked={issueRefund}
                      onChange={() => setIssueRefund(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      Yes, issue refund anyway (override non-refundable policy)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refund-option"
                      checked={!issueRefund}
                      onChange={() => setIssueRefund(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      No, cancel without refund (keep payment)
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Cancellation Reason:</strong> {cancelReason === 'other' ? cancelNotes : cancelReason.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsNonRefundableConfirmOpen(false);
                setIsCancelModalOpen(true);
              }}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelBooking.mutate()}
              disabled={cancelBooking.isPending}
            >
              {cancelBooking.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
