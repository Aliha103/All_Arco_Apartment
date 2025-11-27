'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import BookingFormModal from '@/components/pms/BookingFormModal';

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['all-bookings', search, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.check_in_date_from = dateFrom;
      if (dateTo) params.check_in_date_to = dateTo;
      const response = await api.bookings.list(params);
      return response.data.results || response.data;
    },
  });

  const statuses = ['all', 'pending', 'confirmed', 'paid', 'checked_in', 'checked_out', 'cancelled'];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bookings Management</h1>
        <p className="text-gray-600">Manage all property bookings</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by booking ID, guest name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Check-in From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Check-in To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom}
                    className="w-40"
                  />
                </div>
                {(search || statusFilter !== 'all' || dateFrom || dateTo) && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>
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
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Bookings ({bookings?.length || 0})</CardTitle>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Manual Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading bookings...</p>
          ) : bookings && bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.booking_id}</TableCell>
                    <TableCell>{booking.guest_name}</TableCell>
                    <TableCell>{booking.guest_email}</TableCell>
                    <TableCell>{formatDate(booking.check_in_date)}</TableCell>
                    <TableCell>{formatDate(booking.check_out_date)}</TableCell>
                    <TableCell>{booking.guests}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.payment_status)}>
                        {booking.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/pms/bookings/${booking.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No bookings found</p>
          )}
        </CardContent>
      </Card>

      {/* Create Booking Modal */}
      <BookingFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
