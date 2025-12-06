'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { Invoice } from '@/types';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;

  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await api.invoices.get(invoiceId);
      return response.data as Invoice;
    },
  });

  // Set page title when invoice data is loaded
  useEffect(() => {
    if (invoice) {
      const docType = invoice.invoice_number.startsWith('INV') ? 'Invoice' : 'Receipt';
      document.title = `${docType} ${invoice.invoice_number} - All'Arco Apartment`;
    }
  }, [invoice]);

  // Download PDF
  const downloadPDF = async () => {
    if (!invoice) return;
    try {
      const response = await api.invoices.downloadPDF(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  // Send email
  const sendEmail = useMutation({
    mutationFn: () => api.invoices.sendEmail(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      toast.success('Invoice email sent successfully');
    },
    onError: () => {
      toast.error('Failed to send email');
    },
  });

  // Mark as sent
  const markSent = useMutation({
    mutationFn: () => api.invoices.markSent(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/pms/invoices">
            <Button className="bg-blue-600 hover:bg-blue-700">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canSendEmail = invoice.status === 'draft' || invoice.status === 'sent';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/pms/invoices" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Invoices
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <p className="text-sm sm:text-base text-gray-600">Issued on {formatDate(invoice.issued_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(invoice.status)} text-sm sm:text-base px-3 py-1`}>
            {invoice.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Invoice Information */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Issue Date</p>
                <p className="font-semibold text-gray-900">{formatDate(invoice.issued_at)}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
                </div>
              )}
            </div>
            {invoice.sent_at && (
              <div>
                <p className="text-sm text-gray-600">Sent At</p>
                <p className="font-semibold text-gray-900">{formatDateTime(invoice.sent_at)}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-sm text-gray-600">Paid At</p>
                <p className="font-semibold text-gray-900">{formatDateTime(invoice.paid_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Information */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Guest Name</p>
              <p className="text-lg font-semibold text-gray-900">{invoice.guest_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <a href={`mailto:${invoice.guest_email}`} className="text-blue-600 hover:underline font-medium">
                {invoice.guest_email}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600">Booking Reference</p>
              <Link
                href={`/pms/bookings/${invoice.booking}`}
                className="text-blue-600 hover:underline font-semibold"
              >
                {invoice.booking_id}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Breakdown */}
      <Card className="mb-6 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Accommodation</span>
              <span className="font-semibold text-gray-900">{formatCurrency(invoice.accommodation_total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Cleaning Fee</span>
              <span className="font-semibold text-gray-900">{formatCurrency(invoice.cleaning_fee)}</span>
            </div>
            {parseFloat(invoice.extra_guest_fee) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-600">Extra Guest Fee</span>
                <span className="font-semibold text-gray-900">{formatCurrency(invoice.extra_guest_fee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600">Tourist Tax</span>
              <span className="font-semibold text-gray-900">{formatCurrency(invoice.tourist_tax)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-base sm:text-lg font-bold text-gray-900">Total Amount</span>
              <span className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="mb-6 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadPDF}>
              Download PDF
            </Button>

            {canSendEmail && (
              <Button
                variant="outline"
                onClick={() => sendEmail.mutate()}
                disabled={sendEmail.isPending}
              >
                {sendEmail.isPending ? 'Sending...' : 'Send via Email'}
              </Button>
            )}

            {invoice.status === 'draft' && (
              <Button
                variant="outline"
                onClick={() => markSent.mutate()}
                disabled={markSent.isPending}
              >
                Mark as Sent
              </Button>
            )}

            {invoice.pdf_url && (
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">View PDF</Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
