'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Booking, Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.bookings.get(bookingId);
      return response.data;
    },
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ['invoices', bookingId],
    queryFn: async () => {
      const response = await api.invoices.list({ booking: bookingId });
      return response.data.results || response.data;
    },
    enabled: !!bookingId,
  });

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await api.invoices.downloadPDF(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Booking not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Booking Details</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">ID: {booking.booking_id}</span>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* Stay Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Stay Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-semibold">{formatDate(booking.check_in_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-semibold">{formatDate(booking.check_out_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nights</p>
                  <p className="font-semibold">{booking.nights}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guests</p>
                  <p className="font-semibold">{booking.guests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{booking.guest_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{booking.guest_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{booking.guest_phone}</p>
              </div>
              {booking.special_requests && (
                <div>
                  <p className="text-sm text-gray-600">Special Requests</p>
                  <p className="text-gray-900">{booking.special_requests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(booking.total_price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Payment Status:</span>
                <Badge className={getStatusColor(booking.payment_status)}>
                  {booking.payment_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          {invoices && invoices.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(invoice.issued_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                If you have questions about this booking, please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Support:</span>{' '}
                  <a href="mailto:support@allarcoapartment.com" className="text-blue-600 hover:underline">
                    support@allarcoapartment.com
                  </a>
                </p>
                <p>
                  <span className="font-medium">Check-in:</span>{' '}
                  <a href="mailto:support@allarcoapartment.com" className="text-blue-600 hover:underline">
                    support@allarcoapartment.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
