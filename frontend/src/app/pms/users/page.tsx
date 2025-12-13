'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Users as UsersIcon, UserPlus, Mail, Calendar, Eye, Loader2, UserCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const [teamSearch, setTeamSearch] = useState('');
  const [guestSearch, setGuestSearch] = useState('');

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

  // Filter team users
  const filteredTeamUsers = useMemo(() => {
    if (!teamSearch) return teamUsers;
    const search = teamSearch.toLowerCase();
    return teamUsers.filter(user =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.role_name?.toLowerCase().includes(search)
    );
  }, [teamUsers, teamSearch]);

  // Filter guest users and remove duplicates by email
  const filteredGuestUsers = useMemo(() => {
    // First, remove duplicates by email
    const uniqueGuests = guestUsers.reduce((acc, guest) => {
      const existing = acc.find(g => g.email === guest.email);
      if (!existing) {
        acc.push(guest);
      }
      return acc;
    }, [] as GuestUser[]);

    // Then apply search filter
    if (!guestSearch) return uniqueGuests;
    const search = guestSearch.toLowerCase();
    return uniqueGuests.filter(guest =>
      `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(search) ||
      guest.email.toLowerCase().includes(search)
    );
  }, [guestUsers, guestSearch]);

  return (
    <div className="space-y-6 pb-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-slate-600 mt-1">Manage guest profiles</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1">
          <UsersIcon className="w-4 h-4 text-slate-800" />
          <span className="font-semibold text-slate-900">{filteredGuestUsers.length} guests</span>
        </div>
      </div>

      {/* Guests Section */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="border-b bg-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg shadow-inner">
                <UserCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Guest Profiles</CardTitle>
                <p className="text-sm text-slate-600 mt-0.5">
                  {filteredGuestUsers.length} {filteredGuestUsers.length === 1 ? 'guest' : 'guests'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Search */}
          {guestUsers.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search guests by name or email..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Content */}
          {guestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Loading guest profiles...</p>
              </div>
            </div>
          ) : filteredGuestUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <UserCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {guestSearch ? 'No matching guests found' : 'No guests yet'}
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {guestSearch
                  ? 'Try adjusting your search criteria'
                  : 'Guest profiles will appear here once they make bookings'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuestUsers.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-full flex items-center justify-center border border-emerald-200">
                      <UserCircle2 className="w-7 h-7 text-emerald-800" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {guest.first_name} {guest.last_name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-700">{guest.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {guest.total_bookings || 0} {guest.total_bookings === 1 ? 'booking' : 'bookings'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/pms/guests/${guest.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
