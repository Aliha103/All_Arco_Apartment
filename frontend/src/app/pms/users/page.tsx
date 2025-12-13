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
    const uniqueGuests = guestUsers.reduce((acc, guest) => {
      const existing = acc.find(g => g.email === guest.email);
      if (!existing) {
        acc.push(guest);
      }
      return acc;
    }, [] as GuestUser[]);

    if (!guestSearch) return uniqueGuests;
    const search = guestSearch.toLowerCase();
    return uniqueGuests.filter(guest =>
      `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(search) ||
      guest.email.toLowerCase().includes(search)
    );
  }, [guestUsers, guestSearch]);

  const TeamMembersCard = () => (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-xl">Team Members</CardTitle>
              <p className="text-sm text-gray-600 mt-0.5">
                {filteredTeamUsers.length} {filteredTeamUsers.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {teamUsers.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search team members by name, email, or role..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>
        )}

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users</h1>
          <p className="text-gray-600 mt-1">Manage team members and view guest profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UsersIcon className="w-4 h-4" />
            <span className="font-medium">{teamUsers.length} team</span>
            <span className="text-gray-400">•</span>
            <span className="font-medium">{filteredGuestUsers.length} guests</span>
          </div>
        </div>
      </div>

      <TeamMembersCard />

      <GuestProfilesCard />

    </div>
  );
}
