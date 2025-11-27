'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { Payment } from '@/types';

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['all-payments', search, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.payments.list(params);
      return (response.data.results || response.data) as Payment[];
    },
  });

  const statuses = ['all', 'pending', 'succeeded', 'failed', 'refunded'];

  // Calculate totals
  const totalAmount = payments?.reduce((sum, p) =>
    p.status === 'succeeded' ? sum + parseFloat(p.amount) : sum, 0
  ) || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payments</h1>
        <p className="text-gray-600">Track all payment transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Payments</p>
            <p className="text-3xl font-bold">{payments?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Successful Payments</p>
            <p className="text-3xl font-bold text-blue-600">
              {payments?.filter(p => p.status === 'succeeded').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by payment ID or booking..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
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

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments ({payments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading payments...</p>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.stripe_payment_intent_id?.slice(0, 20)}...
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pms/bookings/${payment.booking}`}
                        className="text-blue-600 hover:underline"
                      >
                        View Booking
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.payment_method || 'Card'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/pms/payments/${payment.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {payment.status === 'succeeded' && (
                          <Link href={`/pms/payments/${payment.id}`}>
                            <Button variant="outline" size="sm">
                              Refund
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No payments found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
