'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils';
import { User, Booking } from '@/types';

interface GuestNote {
  id: string;
  note: string;
  created_by_name: string;
  created_at: string;
}

interface GuestDetails extends User {
  total_bookings?: number;
  total_spent?: string;
  total_nights?: number;
  last_booking_date?: string;
  bookings?: Booking[];
}

export default function GuestDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const guestId = params.id as string;

  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Fetch guest details
  const { data: guest, isLoading, error } = useQuery({
    queryKey: ['guest', guestId],
    queryFn: async () => {
      const response = await api.users.guests.get(guestId);
      return response.data as GuestDetails;
    },
  });

  // Fetch guest notes
  const { data: notes } = useQuery({
    queryKey: ['guest-notes', guestId],
    queryFn: async () => {
      const response = await api.users.guests.notes(guestId);
      return (response.data.results || response.data) as GuestNote[];
    },
    enabled: !!guest,
  });

  // Add note mutation
  const addNote = useMutation({
    mutationFn: (note: string) =>
      api.post(`/guests/${guestId}/notes/`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notes', guestId] });
      setIsAddNoteModalOpen(false);
      setNewNote('');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to add note');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest Not Found</h2>
        <p className="text-gray-600 mb-4">The guest you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/pms/guests">
          <Button>Back to Guests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/pms/guests" className="text-blue-600 hover:text-blue-800">
            ← Back to Guests
          </Link>
        </div>
        <h1 className="text-3xl font-bold">
          {guest.first_name} {guest.last_name}
        </h1>
        <p className="text-gray-600">Guest since {formatDate(guest.created_at)}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
            <p className="text-3xl font-bold">{guest.total_bookings || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(guest.total_spent || '0')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Nights Stayed</p>
            <p className="text-3xl font-bold">{guest.total_nights || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Last Booking</p>
            <p className="text-2xl font-bold">
              {guest.last_booking_date ? formatDate(guest.last_booking_date) : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <a href={`mailto:${guest.email}`} className="text-blue-600 hover:underline">
                {guest.email}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              {guest.phone ? (
                <a href={`tel:${guest.phone}`} className="text-blue-600 hover:underline">
                  {guest.phone}
                </a>
              ) : (
                <p className="text-gray-500">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Status</p>
              <Badge className={guest.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {guest.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href={`mailto:${guest.email}`}>
              <Button variant="outline" className="w-full justify-start">
                Send Email
              </Button>
            </a>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setIsAddNoteModalOpen(true)}
            >
              Add Internal Note
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Booking History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {guest.bookings && guest.bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Nights</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guest.bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.booking_id}</TableCell>
                    <TableCell>{formatDate(booking.check_in_date)}</TableCell>
                    <TableCell>{formatDate(booking.check_out_date)}</TableCell>
                    <TableCell>{booking.nights}</TableCell>
                    <TableCell>{booking.guests}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                    <TableCell>
                      <Link href={`/pms/bookings/${booking.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-gray-600">No bookings yet</p>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Internal Notes (Team Only)</CardTitle>
            <Button onClick={() => setIsAddNoteModalOpen(true)}>
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{note.created_by_name}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(note.created_at)}</p>
                  </div>
                  <p className="whitespace-pre-wrap">{note.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-600">No notes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-32"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note about this guest..."
              />
            </div>
            <p className="text-sm text-gray-600">
              This note will only be visible to team members, not the guest.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addNote.mutate(newNote)}
              disabled={addNote.isPending || !newNote.trim()}
            >
              {addNote.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
