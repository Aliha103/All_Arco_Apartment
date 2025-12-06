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
import { Booking, Payment } from '@/types';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingId = params.id as string;
  const [isClient, setIsClient] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('guest_cancellation');
  const [cancelNotes, setCancelNotes] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [selectedEmailType, setSelectedEmailType] = useState('confirmation');

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
      alert('Email sent successfully');
    },
    onError: () => {
      alert('Failed to send email');
    },
  });

  // Cancel booking
  const cancelBooking = useMutation({
    mutationFn: () =>
      api.bookings.update(bookingId, {
        status: 'cancelled',
        cancellation_reason: cancelNotes || cancelReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setIsCancelModalOpen(false);
      alert('Booking cancelled successfully');
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

  // Availability check for undo-cancel / undo no-show to avoid overbooking
  const shouldCheckOverlaps = ['cancelled', 'no_show'].includes(booking.status);
  const { data: overlapBlocked = false } = useQuery({
    queryKey: ['booking-overlaps', bookingId],
    queryFn: async () => {
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
    enabled: isClient && shouldCheckOverlaps,
  });

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
                  const link = `/booking/checkin?confirmation=${encodeURIComponent(booking.booking_id || '')}&email=${encodeURIComponent(booking.guest_email || '')}`;
                  toast.error('Please register all guests before check-in.');
                  if (booking.booking_id && booking.guest_email) {
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
                className="w-full px-3 py-2 border rounded-lg"
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
              <Label>Cancellation Reason</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
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
              <Label>Additional Notes (Optional)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-20"
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Enter any additional details..."
              />
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
              onClick={() => cancelBooking.mutate()}
              disabled={cancelBooking.isPending}
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
                className="w-full px-3 py-2 border rounded-lg min-h-32"
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
    </div>
  );
}
