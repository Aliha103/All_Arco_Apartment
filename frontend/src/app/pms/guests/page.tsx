'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GuestsPage() {
  const [search, setSearch] = useState('');

  const { data: guests } = useQuery({
    queryKey: ['all-guests', search],
    queryFn: async () => {
      const params = search ? { search } : {};
      const response = await api.users.guests.list(params);
      return response.data.results || response.data;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Guests Database</h1>
        <p className="text-gray-600">Manage guest information and history</p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Search guests by name or email..."
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
          {guests && guests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest: any) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>{guest.phone || 'N/A'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      {new Date(guest.date_joined).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
