'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  total_bookings?: number;
  total_spent?: string;
  date_joined?: string;
  created_at?: string;
}

export default function GuestsPage() {
  const [search, setSearch] = useState('');

  const { data: guests, isLoading } = useQuery({
    queryKey: ['all-guests', search],
    queryFn: async () => {
      const params = search ? { search } : {};
      const response = await api.users.guests.list(params);
      return (response.data.results || response.data) as Guest[];
    },
  });

  // Calculate statistics
  const totalGuests = guests?.length || 0;
  const totalRevenue = guests?.reduce((sum, g) =>
    sum + parseFloat(g.total_spent || '0'), 0
  ) || 0;
  const repeatGuests = guests?.filter(g => (g.total_bookings || 0) > 1).length || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Guests Database</h1>
        <p className="text-gray-600">Manage guest information and history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Guests</p>
            <p className="text-3xl font-bold">{totalGuests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Repeat Guests</p>
            <p className="text-3xl font-bold text-blue-600">{repeatGuests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Repeat Rate</p>
            <p className="text-3xl font-bold text-purple-600">
              {totalGuests > 0 ? ((repeatGuests / totalGuests) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Search guests by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Guests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Guests ({guests?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">Loading guests...</p>
          ) : guests && guests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/pms/guests/${guest.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {guest.first_name} {guest.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>{guest.phone || 'N/A'}</TableCell>
                    <TableCell>{guest.total_bookings || 0}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(guest.total_spent || '0')}
                    </TableCell>
                    <TableCell>
                      {formatDate(guest.date_joined || guest.created_at || '')}
                    </TableCell>
                    <TableCell>
                      <Link href={`/pms/guests/${guest.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No guests found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
