'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TeamUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name?: string;
}

interface GuestUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_bookings?: number;
}

export default function UsersPage() {
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await api.users.team.list();
      return res.data.results || res.data || [];
    },
  });

  const { data: guestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ['guest-users'],
    queryFn: async () => {
      const res = await api.users.guests.list();
      return res.data.results || res.data || [];
    },
  });

  const teamUsers: TeamUser[] = useMemo(() => teamData || [], [teamData]);
  const guestUsers: GuestUser[] = useMemo(() => guestsData || [], [guestsData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
        <p className="text-gray-600">Registered team members and booking guests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({teamUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <p className="text-sm text-gray-600">Loading team...</p>
          ) : teamUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No team users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role_name || 'Team'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guests ({guestUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {guestsLoading ? (
            <p className="text-sm text-gray-600">Loading guests...</p>
          ) : guestUsers.length === 0 ? (
            <p className="text-sm text-gray-600">No guests found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guestUsers.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-semibold">{guest.first_name} {guest.last_name}</TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>{guest.total_bookings || 0}</TableCell>
                    <TableCell>
                      <Link className="text-blue-600 hover:underline" href={`/pms/guests/${guest.id}`}>
                        View guest
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
