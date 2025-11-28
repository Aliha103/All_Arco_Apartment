'use client';

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Check, Gift, Users, Euro } from 'lucide-react';

interface ReferralStats {
  reference_code: string;
  invited_count: number;
  referral_credits_earned: number;
  referred_by: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface InvitedGuest {
  id: string;
  name: string;
  email: string;
  invited_date: string;
  bookings_count: number;
  total_earned: number;
  pending_credits: number;
}

interface InvitedGuestsData {
  invited_guests: InvitedGuest[];
  total_invited: number;
  total_earned: number;
}

interface ReferralCredit {
  id: string;
  referred_user_name: string;
  referred_user_email: string;
  amount: number;
  nights: number;
  status: string;
  created_at: string;
  earned_at: string | null;
  booking_id: string | null;
}

interface CreditsData {
  credits: ReferralCredit[];
  total_earned: number;
  total_pending: number;
}

export default function ReferralsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const response = await api.referrals.getMyStats();
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch invited guests
  const { data: invitedGuestsData, isLoading: guestsLoading } = useQuery<InvitedGuestsData>({
    queryKey: ['invited-guests'],
    queryFn: async () => {
      const response = await api.referrals.getInvitedGuests();
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch referral credits details
  const { data: creditsData, isLoading: creditsLoading } = useQuery<CreditsData>({
    queryKey: ['referral-credits'],
    queryFn: async () => {
      const response = await api.referrals.getReferralCredits();
      return response.data;
    },
    enabled: !!user,
  });

  const copyReferralCode = async () => {
    if (stats?.reference_code) {
      try {
        await navigator.clipboard.writeText(stats.reference_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const isLoading = statsLoading || guestsLoading || creditsLoading;

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
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <Gift className="inline-block mr-2 w-8 h-8" />
            Referral & Invitations
          </h1>
          <p className="text-gray-600">Invite friends and earn credits for bookings</p>
        </div>

        {/* Your Referral Info */}
        {!statsLoading && stats && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Your Reference Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Your Reference Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Share this code with friends</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-mono font-bold text-lg">
                      {stats.reference_code || 'Loading...'}
                    </code>
                    <Button
                      onClick={copyReferralCode}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Share your ARCO code with friends. When they register using it, you'll both earn rewards!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Invited Count */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  People Invited
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.invited_count}
                  </p>
                  <p className="text-sm text-gray-600">active guests</p>
                </div>
              </CardContent>
            </Card>

            {/* Credits Earned */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Credits Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-green-600">
                    €{stats.referral_credits_earned.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">from referrals</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Referred By Section */}
        {!statsLoading && stats?.referred_by && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">You Were Invited By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900">{stats.referred_by.name}</p>
                  <p className="text-sm text-blue-700">{stats.referred_by.email}</p>
                </div>
                <Badge className="bg-blue-600">Referrer</Badge>
              </div>
              <p className="text-xs text-blue-700 mt-4">
                When you complete your bookings, your referrer will earn €5 per night on checkout!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invited Guests Table */}
        {!guestsLoading && invitedGuestsData && invitedGuestsData.invited_guests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>People You've Invited</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited Date</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitedGuestsData.invited_guests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{guest.email}</TableCell>
                      <TableCell className="text-sm">{formatDate(guest.invited_date)}</TableCell>
                      <TableCell className="text-center font-medium">{guest.bookings_count}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          €{guest.total_earned.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {guest.pending_credits > 0 ? (
                          <Badge variant="secondary">€{guest.pending_credits.toFixed(2)}</Badge>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* No Invited Guests */}
        {!guestsLoading && invitedGuestsData && invitedGuestsData.invited_guests.length === 0 && (
          <Card className="mb-8 border-dashed">
            <CardContent className="py-12 text-center">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">You haven't invited anyone yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Share your reference code with friends. When they register and book with you as their referrer, you'll earn €5 per night!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Referral Credits Detail */}
        {!creditsLoading && creditsData && creditsData.credits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Referral Credits History</CardTitle>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-green-600">€{creditsData.total_earned.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">€{creditsData.total_pending.toFixed(2)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditsData.credits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell className="font-medium">{credit.referred_user_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{credit.referred_user_email}</TableCell>
                      <TableCell className="font-semibold">€{credit.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{credit.nights}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            credit.status === 'earned'
                              ? 'bg-green-100 text-green-800'
                              : credit.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(credit.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <Card className="mt-8 border-l-4 border-l-blue-600 bg-blue-50">
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 list-decimal list-inside text-gray-700">
              <li>
                <span className="font-semibold">Share your code:</span> Give friends your unique reference code (ARK-...)
              </li>
              <li>
                <span className="font-semibold">They register:</span> When they create an account and enter your code during registration
              </li>
              <li>
                <span className="font-semibold">They book:</span> When your invited friend books our apartment
              </li>
              <li>
                <span className="font-semibold">You earn:</span> You get €5 per night credit on their booking checkout
              </li>
              <li>
                <span className="font-semibold">Credits accrue:</span> Accumulated credits can be used toward future bookings
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
