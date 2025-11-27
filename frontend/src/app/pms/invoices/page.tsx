'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { Invoice } from '@/types';

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['all-invoices', search, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.invoices.list(params);
      return (response.data.results || response.data) as Invoice[];
    },
  });

  const statuses = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

  // Calculate statistics
  const totalInvoices = invoices?.length || 0;
  const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
  const pendingInvoices = invoices?.filter(i => ['draft', 'sent'].includes(i.status)).length || 0;
  const totalRevenue = invoices?.reduce((sum, i) =>
    i.status === 'paid' ? sum + parseFloat(i.total_amount) : sum, 0
  ) || 0;

  const downloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await api.invoices.downloadPDF(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const sendEmail = useMutation({
    mutationFn: (invoiceId: string) => api.invoices.sendEmail(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-invoices'] });
      alert('Invoice email sent successfully');
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Invoices</h1>
        <p className="text-gray-600">Manage invoices and billing</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
            <p className="text-3xl font-bold">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Paid Invoices</p>
            <p className="text-3xl font-bold text-green-600">{paidInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by invoice number or guest name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({invoices?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading invoices...</p>
          ) : invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/pms/invoices/${invoice.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pms/bookings/${invoice.booking}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.booking_id}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.guest_name}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.issued_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/pms/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPDF(invoice.id, invoice.invoice_number)}
                        >
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendEmail.mutate(invoice.id)}
                          disabled={sendEmail.isPending}
                        >
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No invoices yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
