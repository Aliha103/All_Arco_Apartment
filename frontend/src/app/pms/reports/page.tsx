'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [dateRange, setDateRange] = useState({
    start_date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: bookingStats } = useQuery({
    queryKey: ['booking-stats'],
    queryFn: async () => {
      const response = await api.bookings.statistics();
      return response.data;
    },
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await api.invoices.statistics();
      return response.data;
    },
  });

  const { data: allBookings } = useQuery({
    queryKey: ['all-bookings-for-reports'],
    queryFn: async () => {
      const response = await api.bookings.list();
      return response.data.results || response.data;
    },
  });

  const { data: referralStatsData, isLoading: referralLoading } = useQuery({
    queryKey: ['referral-stats-admin'],
    queryFn: async () => {
      try {
        const response = await api.referrals.getAdminStats();
        return response.data;
      } catch (error) {
        return { referral_stats: [], total_users_with_referrals: 0 };
      }
    },
  });

  // Calculate revenue metrics
  const calculateRevenueMetrics = () => {
    if (!allBookings || allBookings.length === 0) {
      return {
        totalRevenue: 0,
        avgBookingValue: 0,
        accommodationRevenue: 0,
        cleaningFees: 0,
        touristTax: 0,
        monthlyRevenue: [],
      };
    }

    const paidBookings = allBookings.filter((b: any) => b.payment_status === 'paid');

    const totalRevenue = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.total_price || 0), 0);
    const avgBookingValue = paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0;

    // Approximate breakdown (since we don't have exact fields)
    const accommodationRevenue = paidBookings.reduce((sum: number, b: any) => {
      const nightlyRate = parseFloat(b.nightly_rate || 0);
      const nights = b.nights || 1;
      return sum + (nightlyRate * nights);
    }, 0);

    const cleaningFees = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.cleaning_fee || 0), 0);
    const touristTax = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.tourist_tax || 0), 0);

    // Group by month for chart
    const monthlyData: { [key: string]: number } = {};
    paidBookings.forEach((b: any) => {
      const month = b.check_in_date?.substring(0, 7); // YYYY-MM
      if (month) {
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(b.total_price || 0);
      }
    });

    const monthlyRevenue = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, revenue]) => ({ month, revenue }));

    return {
      totalRevenue,
      avgBookingValue,
      accommodationRevenue,
      cleaningFees,
      touristTax,
      monthlyRevenue,
    };
  };

  // Calculate occupancy metrics
  const calculateOccupancyMetrics = () => {
    if (!allBookings || allBookings.length === 0) {
      return {
        occupancyRate: 0,
        totalNightsBooked: 0,
        avgLengthOfStay: 0,
        monthlyOccupancy: [],
      };
    }

    const confirmedBookings = allBookings.filter((b: any) =>
      ['confirmed', 'paid', 'checked_in', 'checked_out'].includes(b.status)
    );

    const totalNightsBooked = confirmedBookings.reduce((sum: number, b: any) => sum + (b.nights || 0), 0);
    const avgLengthOfStay = confirmedBookings.length > 0 ? totalNightsBooked / confirmedBookings.length : 0;

    // Calculate occupancy rate for current month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentMonthBookings = confirmedBookings.filter((b: any) => {
      const checkIn = new Date(b.check_in_date);
      return checkIn.getFullYear() === currentYear && checkIn.getMonth() + 1 === currentMonth;
    });
    const currentMonthNights = currentMonthBookings.reduce((sum: number, b: any) => sum + (b.nights || 0), 0);
    const occupancyRate = (currentMonthNights / daysInMonth) * 100;

    // Monthly occupancy for chart
    const monthlyOccupancyData: { [key: string]: { nights: number, days: number } } = {};
    confirmedBookings.forEach((b: any) => {
      const month = b.check_in_date?.substring(0, 7);
      if (month) {
        if (!monthlyOccupancyData[month]) {
          const [year, monthNum] = month.split('-').map(Number);
          const daysInThisMonth = new Date(year, monthNum, 0).getDate();
          monthlyOccupancyData[month] = { nights: 0, days: daysInThisMonth };
        }
        monthlyOccupancyData[month].nights += b.nights || 0;
      }
    });

    const monthlyOccupancy = Object.entries(monthlyOccupancyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        rate: (data.nights / data.days) * 100,
      }));

    return {
      occupancyRate,
      totalNightsBooked,
      avgLengthOfStay,
      monthlyOccupancy,
    };
  };

  // Calculate guest analytics
  const calculateGuestAnalytics = () => {
    if (!allBookings || allBookings.length === 0) {
      return {
        repeatGuestRate: 0,
        topGuests: [],
      };
    }

    // Count bookings per guest email
    const guestBookings: { [email: string]: { count: number; name: string; revenue: number } } = {};
    allBookings.forEach((b: any) => {
      const email = b.guest_email;
      if (!guestBookings[email]) {
        guestBookings[email] = { count: 0, name: b.guest_name, revenue: 0 };
      }
      guestBookings[email].count += 1;
      if (b.payment_status === 'paid') {
        guestBookings[email].revenue += parseFloat(b.total_price || 0);
      }
    });

    const repeatGuests = Object.values(guestBookings).filter((g) => g.count > 1).length;
    const totalGuests = Object.keys(guestBookings).length;
    const repeatGuestRate = totalGuests > 0 ? (repeatGuests / totalGuests) * 100 : 0;

    const topGuests = Object.entries(guestBookings)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      repeatGuestRate,
      topGuests,
    };
  };

  const revenueMetrics = calculateRevenueMetrics();
  const occupancyMetrics = calculateOccupancyMetrics();
  const guestAnalytics = calculateGuestAnalytics();

  const handleExportCSV = () => {
    if (!allBookings || allBookings.length === 0) {
      toast.info('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Booking ID', 'Guest Name', 'Email', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', 'Payment Status'];
    const rows = allBookings.map((b: any) => [
      b.booking_id,
      b.guest_name,
      b.guest_email,
      b.check_in_date,
      b.check_out_date,
      b.nights,
      b.total_price,
      b.status,
      b.payment_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">Revenue, occupancy, and guest insights</p>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              />
            </div>
            <Button onClick={handleExportCSV}>Export to CSV</Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Overview */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Revenue Reports</h2>
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(revenueMetrics.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Avg Booking Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(revenueMetrics.avgBookingValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{allBookings?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Paid Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {allBookings?.filter((b: any) => b.payment_status === 'paid').length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Accommodation</span>
                <span className="font-semibold">{formatCurrency(revenueMetrics.accommodationRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cleaning Fees</span>
                <span className="font-semibold">{formatCurrency(revenueMetrics.cleaningFees)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tourist Tax</span>
                <span className="font-semibold">{formatCurrency(revenueMetrics.touristTax)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-bold text-lg">{formatCurrency(revenueMetrics.totalRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueMetrics.monthlyRevenue.length > 0 ? (
              <div className="space-y-3">
                {revenueMetrics.monthlyRevenue.map((item) => (
                  <div key={item.month} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24">{item.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                      <div
                        className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3"
                        style={{
                          width: `${Math.min((item.revenue / Math.max(...revenueMetrics.monthlyRevenue.map(m => m.revenue))) * 100, 100)}%`,
                        }}
                      >
                        <span className="text-white text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600">No revenue data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Reports */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Occupancy Reports</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Current Month Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{occupancyMetrics.occupancyRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Total Nights Booked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{occupancyMetrics.totalNightsBooked}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Avg Length of Stay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{occupancyMetrics.avgLengthOfStay.toFixed(1)} nights</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Occupancy by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancyMetrics.monthlyOccupancy.length > 0 ? (
              <div className="space-y-3">
                {occupancyMetrics.monthlyOccupancy.map((item) => (
                  <div key={item.month} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24">{item.month}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                      <div
                        className="bg-green-600 h-8 rounded-full flex items-center justify-end pr-3"
                        style={{
                          width: `${Math.min(item.rate, 100)}%`,
                        }}
                      >
                        <span className="text-white text-sm font-semibold">{item.rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600">No occupancy data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guest Analytics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Guest Analytics</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Repeat Guest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{guestAnalytics.repeatGuestRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-2">
                Guests who booked more than once
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Unique Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{guestAnalytics.topGuests.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Guests */}
        <Card>
          <CardHeader>
            <CardTitle>Top Guests by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {guestAnalytics.topGuests.length > 0 ? (
              <div className="space-y-3">
                {guestAnalytics.topGuests.map((guest, index) => (
                  <div key={guest.email} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-sm text-gray-600">{guest.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(guest.revenue)}</p>
                      <p className="text-sm text-gray-600">{guest.count} bookings</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600">No guest data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Analytics */}
      {referralStatsData?.referral_stats && referralStatsData.referral_stats.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Referral Program Analytics</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600">Users with Active Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{referralStatsData.total_users_with_referrals || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600">Total Referral Credits Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  €{(referralStatsData.referral_stats || [])
                    .reduce((sum: number, r: any) => sum + parseFloat(r.credits_earned || 0), 0)
                    .toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referralStatsData.referral_stats.slice(0, 10).map((referrer: any, index: number) => (
                  <div key={referrer.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{referrer.name}</p>
                        <p className="text-sm text-gray-600">{referrer.email}</p>
                        <p className="text-xs text-gray-500 mt-1">Code: {referrer.reference_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">€{parseFloat(referrer.credits_earned || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{referrer.invited_count} people invited</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
