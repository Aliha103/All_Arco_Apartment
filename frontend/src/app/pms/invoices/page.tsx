'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  const { data: invoices } = useQuery({
    queryKey: ['all-invoices'],
    queryFn: async () => {
      const response = await api.invoices.list();
      return response.data.results || response.data;
    },
  });

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

      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({invoices?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
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
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.booking_id}</TableCell>
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
