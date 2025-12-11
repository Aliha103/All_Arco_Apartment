'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Download, Mail, Lock } from 'lucide-react';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: 'invoice' | 'receipt';
  booking: string;
  booking_id: string;
  guest_name: string;
  guest_email: string;
  company_name?: string;
  issued_at: string;
  due_date?: string;
  total_amount: string;
  line_items: LineItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
  sent_to_email?: string;
  sent_count?: number;
  last_sent_at?: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

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
      const docType = invoice.type === 'invoice' ? 'Invoice' : 'Receipt';
      document.title = `${docType} ${invoice.invoice_number} - All'Arco Apartment`;
      setEmailAddress(invoice.guest_email || '');
    }
  }, [invoice]);

  // Download PDF
  const downloadPDF = useMutation({
    mutationFn: async () => {
      if (!invoice) return;
      const response = await api.invoices.downloadPDF(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      a.click();
    },
    onError: () => {
      toast.error('Failed to download PDF');
    },
  });

  // Send email
  const sendEmail = useMutation({
    mutationFn: async (email: string) => {
      await api.invoices.sendEmail(invoiceId, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      setIsEmailDialogOpen(false);
      toast.success('Invoice sent successfully from support@allarcoapartment.com');
    },
    onError: () => {
      toast.error('Failed to send email');
    },
  });

  const handleSendEmail = () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    sendEmail.mutate(emailAddress);
  };

  const calculateSubtotal = (items: LineItem[]) => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      return sum + subtotal;
    }, 0);
  };

  const calculateTax = (items: LineItem[]) => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      const tax = subtotal * (item.tax_rate / 100);
      return sum + tax;
    }, 0);
  };

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
          <p className="text-gray-600 mb-4">
            The invoice you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/pms/invoices">
            <Button className="bg-blue-600 hover:bg-blue-700">Back to Invoices</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/pms/invoices"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Invoices
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {invoice.invoice_number}
            </h1>
            <Badge
              className={`text-sm px-3 py-1 capitalize ${
                invoice.type === 'invoice'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {invoice.type}
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Issued on {formatDate(invoice.issued_at)}
          </p>
        </div>
      </div>

      {/* Immutability Notice */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Invoice is Immutable</p>
              <p className="text-sm text-blue-700">
                This {invoice.type} has been generated and cannot be edited. You can download
                the PDF or send it via email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Invoice Information */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              {invoice.type === 'invoice' ? 'Invoice' : 'Receipt'} Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                {invoice.type === 'invoice' ? 'Invoice' : 'Receipt'} Number
              </p>
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
            {invoice.sent_count && invoice.sent_count > 0 && (
              <div>
                <p className="text-sm text-gray-600">Email Status</p>
                <p className="font-semibold text-gray-900">
                  Sent {invoice.sent_count} time{invoice.sent_count > 1 ? 's' : ''}
                  {invoice.last_sent_at && ` (last: ${formatDate(invoice.last_sent_at)})`}
                </p>
                {invoice.sent_to_email && (
                  <p className="text-sm text-gray-600">To: {invoice.sent_to_email}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bill To Information */}
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
              <a
                href={`mailto:${invoice.guest_email}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {invoice.guest_email}
              </a>
            </div>
            {invoice.company_name && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-semibold text-gray-900">{invoice.company_name}</p>
              </div>
            )}
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

      {/* Line Items */}
      <Card className="mb-6 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                    Qty
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                    Tax %
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.line_items && invoice.line_items.length > 0 ? (
                  invoice.line_items.map((item: LineItem, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm text-gray-900">{item.description}</td>
                      <td className="py-3 px-2 text-sm text-gray-900 text-right">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-900 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-900 text-right">
                        {item.tax_rate}%
                      </td>
                      <td className="py-3 px-2 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
              {invoice.line_items && invoice.line_items.length > 0 && (
                <tfoot className="border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-2 text-sm font-semibold text-gray-700 text-right">
                      Subtotal
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(calculateSubtotal(invoice.line_items))}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-3 px-2 text-sm font-semibold text-gray-700 text-right">
                      Tax
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(calculateTax(invoice.line_items))}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="py-4 px-2 text-base font-bold text-gray-900 text-right">
                      Total Amount
                    </td>
                    <td className="py-4 px-2 text-base font-bold text-blue-600 text-right">
                      {formatCurrency(parseFloat(invoice.total_amount))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
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
            <Button onClick={() => downloadPDF.mutate()} disabled={downloadPDF.isPending}>
              <Download className="w-4 h-4 mr-2" />
              {downloadPDF.isPending ? 'Downloading...' : 'Download PDF'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(true)}
              disabled={sendEmail.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {invoice.type === 'invoice' ? 'Invoice' : 'Receipt'} via Email</DialogTitle>
            <DialogDescription>
              Email will be sent from <strong>support@allarcoapartment.com</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Recipient Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmail.isPending || !emailAddress}
              className="bg-blue-600"
            >
              {sendEmail.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
