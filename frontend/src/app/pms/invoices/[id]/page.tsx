'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { Invoice } from '@/types';

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
      alert('Failed to download PDF');
    }
  };

  // Send email
  const sendEmail = useMutation({
    mutationFn: () => api.invoices.sendEmail(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      alert('Invoice email sent successfully');
    },
    onError: () => {
      alert('Failed to send email');
    },
  });

  // Mark as sent
  const markSent = useMutation({
    mutationFn: () => api.invoices.markSent(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });

  // Mark as paid
  const markPaid = useMutation({
    mutationFn: () => api.invoices.markPaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });

  // Cancel invoice
  const cancelInvoice = useMutation({
    mutationFn: () => api.invoices.cancel(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });

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

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
        <p className="text-gray-600 mb-4">The invoice you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/pms/invoices">
          <Button>Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const canSendEmail = invoice.status === 'draft' || invoice.status === 'sent';
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue';
  const canCancel = invoice.status !== 'cancelled' && invoice.status !== 'paid';

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/pms/invoices" className="text-blue-600 hover:text-blue-800">
              ← Back to Invoices
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
          <p className="text-gray-600">Issued on {formatDate(invoice.issued_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(invoice.status)} text-base px-3 py-1`}>
            {invoice.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="text-lg font-semibold">{invoice.invoice_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Issue Date</p>
                <p className="font-semibold">{formatDate(invoice.issued_at)}</p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold">{formatDate(invoice.due_date)}</p>
                </div>
              )}
            </div>
            {invoice.sent_at && (
              <div>
                <p className="text-sm text-gray-600">Sent At</p>
                <p className="font-semibold">{formatDateTime(invoice.sent_at)}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-sm text-gray-600">Paid At</p>
                <p className="font-semibold">{formatDateTime(invoice.paid_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Guest Name</p>
              <p className="text-lg font-semibold">{invoice.guest_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <a href={`mailto:${invoice.guest_email}`} className="text-blue-600 hover:underline">
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Accommodation</span>
              <span className="font-semibold">{formatCurrency(invoice.accommodation_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cleaning Fee</span>
              <span className="font-semibold">{formatCurrency(invoice.cleaning_fee)}</span>
            </div>
            {parseFloat(invoice.extra_guest_fee) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Extra Guest Fee</span>
                <span className="font-semibold">{formatCurrency(invoice.extra_guest_fee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tourist Tax</span>
              <span className="font-semibold">{formatCurrency(invoice.tourist_tax)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
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

            {canMarkPaid && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Mark this invoice as paid?')) {
                    markPaid.mutate();
                  }
                }}
                disabled={markPaid.isPending}
              >
                Mark as Paid
              </Button>
            )}

            {invoice.pdf_url && (
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">View PDF</Button>
              </a>
            )}

            {canCancel && (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => {
                  if (confirm('Cancel this invoice? This action cannot be undone.')) {
                    cancelInvoice.mutate();
                  }
                }}
                disabled={cancelInvoice.isPending}
              >
                Cancel Invoice
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
