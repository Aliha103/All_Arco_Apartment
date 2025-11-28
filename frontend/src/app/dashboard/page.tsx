'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Booking } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const response = await api.bookings.list();
      return response.data.results || response.data;
    },
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const upcomingBookings = bookings?.filter(
    (b) => new Date(b.check_in_date) > new Date() && b.status !== 'cancelled'
  ) || [];

  const pastBookings = bookings?.filter(
    (b) => new Date(b.check_out_date) < new Date() || b.status === 'cancelled'
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            All'Arco Apartment
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.first_name} {user.last_name}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {user.first_name}!
          </h1>
          <p className="text-gray-600">Manage your bookings and profile</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Upcoming Bookings</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingBookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{bookings?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Account Status</p>
              <Badge variant="success">Active</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.booking_id}</TableCell>
                      <TableCell>{formatDate(booking.check_in_date)}</TableCell>
                      <TableCell>{formatDate(booking.check_out_date)}</TableCell>
                      <TableCell>{booking.guests}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Past Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.booking_id}</TableCell>
                      <TableCell>{formatDate(booking.check_in_date)}</TableCell>
                      <TableCell>{formatDate(booking.check_out_date)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* No Bookings */}
        {bookings?.length === 0 && !bookingsLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">You don't have any bookings yet</p>
              <Link href="/book">
                <Button>Book Your Stay</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex gap-4">
          <Link href="/book">
            <Button>New Booking</Button>
          </Link>
          <Link href="/dashboard/referrals">
            <Button variant="outline">View Referrals & Credits</Button>
          </Link>
          <Link href="/dashboard/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
