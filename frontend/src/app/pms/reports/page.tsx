'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Euro, Receipt, Home,
  Calendar, Download, Filter, X, ChevronDown,
  Building2, PieChart, BarChart3, LineChart as LineChartIcon,
  Sparkles, DollarSign, CreditCard, Banknote, Clock
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

// Brand colors
const COLORS = {
  primary: '#C4A572',
  secondary: '#B39562',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
};

const CHART_COLORS = [COLORS.primary, COLORS.info, COLORS.success, COLORS.purple, COLORS.pink, COLORS.warning, COLORS.teal, COLORS.indigo];

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customDateRange, setCustomDateRange] = useState({
    start_date: new Date(currentYear, 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (dateFilter) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'year':
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 11, 31);
        break;
      case 'custom':
        return customDateRange;
      case 'all':
        start = new Date(2020, 0, 1); // Far past date
        end = new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }

    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    };
  }, [dateFilter, selectedYear, customDateRange]);

  // Fetch all bookings
  const { data: allBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['all-bookings-reports', dateRange],
    queryFn: async () => {
      const response = await api.bookings.list();
      const bookings = response.data.results || response.data;
      // Filter by date range
      return bookings.filter((b: any) => {
        const checkIn = new Date(b.check_in_date);
        return checkIn >= new Date(dateRange.start_date) && checkIn <= new Date(dateRange.end_date);
      });
    },
  });

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses-reports', dateRange],
    queryFn: async () => {
      const response = await api.expenses.list({
        date_from: dateRange.start_date,
        date_to: dateRange.end_date,
      });
      return response.data.results || response.data;
    },
  });

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    if (!allBookings || !expenses) return null;

    const paidBookings = allBookings.filter((b: any) => b.payment_status === 'paid');

    // Revenue calculations
    const totalRevenue = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.total_price || 0), 0);
    const cityTaxRevenue = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.tourist_tax || 0), 0);
    const cleaningRevenue = paidBookings.reduce((sum: number, b: any) =>
      sum + parseFloat(b.cleaning_fee || 0) + parseFloat(b.pet_fee || 0), 0);
    const accommodationRevenue = paidBookings.reduce((sum: number, b: any) => {
      const nightlyRate = parseFloat(b.nightly_rate || 0);
      const nights = b.nights || 1;
      return sum + (nightlyRate * nights);
    }, 0);

    // OTA commission calculations
    const otaCommissions = paidBookings.reduce((sum: number, b: any) => sum + parseFloat(b.ota_commission_amount || 0), 0);
    const netRevenue = totalRevenue - otaCommissions;

    // Expense calculations (only approved)
    const approvedExpenses = expenses.filter((e: any) => e.status === 'approved');
    const totalExpenses = approvedExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
    const pendingExpenses = expenses.filter((e: any) => e.status === 'pending')
      .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);

    // Profit calculation
    const totalProfit = netRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // OTA breakdown
    const otaBreakdown: { [key: string]: { revenue: number; commission: number; bookings: number } } = {};
    paidBookings.forEach((b: any) => {
      const platform = b.ota_platform || b.booking_source || 'website';
      if (!otaBreakdown[platform]) {
        otaBreakdown[platform] = { revenue: 0, commission: 0, bookings: 0 };
      }
      otaBreakdown[platform].revenue += parseFloat(b.total_price || 0);
      otaBreakdown[platform].commission += parseFloat(b.ota_commission_amount || 0);
      otaBreakdown[platform].bookings += 1;
    });

    // Category expense breakdown
    const expensesByCategory: { [key: string]: number } = {};
    approvedExpenses.forEach((e: any) => {
      const cat = e.category || 'other';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + parseFloat(e.amount || 0);
    });

    // Monthly trends
    const monthlyData: { [key: string]: { revenue: number; expenses: number; profit: number } } = {};
    paidBookings.forEach((b: any) => {
      const month = b.check_in_date?.substring(0, 7); // YYYY-MM
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
        }
        const revenue = parseFloat(b.total_price || 0);
        const commission = parseFloat(b.ota_commission_amount || 0);
        monthlyData[month].revenue += revenue - commission;
      }
    });

    approvedExpenses.forEach((e: any) => {
      const month = e.expense_date?.substring(0, 7);
      if (month) {
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
        }
        monthlyData[month].expenses += parseFloat(e.amount || 0);
      }
    });

    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
    });

    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round(data.profit * 100) / 100,
      }));

    return {
      totalRevenue,
      netRevenue,
      totalExpenses,
      pendingExpenses,
      totalProfit,
      profitMargin,
      cityTaxRevenue,
      cleaningRevenue,
      accommodationRevenue,
      otaCommissions,
      otaBreakdown,
      expensesByCategory,
      monthlyTrends,
      bookingsCount: paidBookings.length,
      avgBookingValue: paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0,
    };
  }, [allBookings, expenses]);

  const isLoading = bookingsLoading || expensesLoading;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Export to CSV
  const handleExport = () => {
    if (!allBookings || !expenses) {
      toast.info('No data to export');
      return;
    }

    const headers = [
      'Period',
      'Total Revenue',
      'Net Revenue',
      'Total Expenses',
      'Total Profit',
      'Profit Margin %',
      'City Tax',
      'Cleaning Fees',
      'OTA Commissions',
      'Bookings Count'
    ];

    const data = [
      `${dateRange.start_date} to ${dateRange.end_date}`,
      metrics?.totalRevenue.toFixed(2) || '0',
      metrics?.netRevenue.toFixed(2) || '0',
      metrics?.totalExpenses.toFixed(2) || '0',
      metrics?.totalProfit.toFixed(2) || '0',
      metrics?.profitMargin.toFixed(2) || '0',
      metrics?.cityTaxRevenue.toFixed(2) || '0',
      metrics?.cleaningRevenue.toFixed(2) || '0',
      metrics?.otaCommissions.toFixed(2) || '0',
      metrics?.bookingsCount || '0',
    ];

    const csvContent = [
      headers.join(','),
      data.map(cell => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange.start_date}-${dateRange.end_date}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  // Quick filter buttons
  const quickFilters: { label: string; value: DateFilter }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#C4A572] to-[#B39562] shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Analytics</h1>
            <p className="text-gray-600">Comprehensive reports & insights</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6 border-2 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={dateFilter === filter.value ? 'default' : 'outline'}
                    onClick={() => setDateFilter(filter.value)}
                    className={`h-10 min-w-[80px] transition-all ${
                      dateFilter === filter.value
                        ? 'bg-[#C4A572] hover:bg-[#B39562] text-white shadow-md'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-10 gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Advanced
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="h-10 gap-2"
                  disabled={isLoading}
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Year Selector */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Select Year</Label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(parseInt(e.target.value));
                          setDateFilter('year');
                        }}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-[#C4A572] focus:border-[#C4A572] transition-all"
                      >
                        {Array.from({ length: 10 }, (_, i) => currentYear - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Date Range */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">From Date</Label>
                      <Input
                        type="date"
                        value={customDateRange.start_date}
                        onChange={(e) => {
                          setCustomDateRange(prev => ({ ...prev, start_date: e.target.value }));
                          setDateFilter('custom');
                        }}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">To Date</Label>
                      <Input
                        type="date"
                        value={customDateRange.end_date}
                        onChange={(e) => {
                          setCustomDateRange(prev => ({ ...prev, end_date: e.target.value }));
                          setDateFilter('custom');
                        }}
                        className="h-10"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#C4A572] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Loading financial data...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && metrics && (
        <>
          {/* Key Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {/* Total Revenue */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#C4A572]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">{metrics.bookingsCount} bookings</p>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
                {metrics.pendingExpenses > 0 && (
                  <p className="text-sm text-orange-600 mt-1">{formatCurrency(metrics.pendingExpenses)} pending</p>
                )}
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${metrics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.totalProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{metrics.profitMargin.toFixed(1)}% margin</p>
              </CardContent>
            </Card>

            {/* City Tax */}
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  City Tax
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(metrics.cityTaxRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">Tourist tax collected</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Secondary Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {/* Cleaning Revenue */}
            <Card className="border hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Cleaning Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.cleaningRevenue)}</p>
              </CardContent>
            </Card>

            {/* OTA Commissions */}
            <Card className="border hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">OTA Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">-{formatCurrency(metrics.otaCommissions)}</p>
              </CardContent>
            </Card>

            {/* Net Revenue */}
            <Card className="border hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Net Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#C4A572]">{formatCurrency(metrics.netRevenue)}</p>
              </CardContent>
            </Card>

            {/* Avg Booking */}
            <Card className="border hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Avg Booking Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.avgBookingValue)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
          >
            {/* Revenue vs Expenses Trend */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-[#C4A572]" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.monthlyTrends}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke={COLORS.danger} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit Trend */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Profit Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke={COLORS.success}
                      strokeWidth={3}
                      dot={{ fill: COLORS.success, r: 4 }}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
          >
            {/* OTA Earnings Breakdown */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#C4A572]" />
                  Earnings by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(metrics.otaBreakdown).length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie
                          data={Object.entries(metrics.otaBreakdown).map(([platform, data]) => ({
                            name: platform.charAt(0).toUpperCase() + platform.slice(1),
                            value: Math.round(data.revenue),
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(metrics.otaBreakdown).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {Object.entries(metrics.otaBreakdown).map(([platform, data], index) => (
                        <div key={platform} className="flex items-center justify-between text-sm border-b pb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="font-medium capitalize">{platform}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(data.revenue)}</p>
                            <p className="text-xs text-gray-500">
                              {data.bookings} bookings · {formatCurrency(data.commission)} commission
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center py-8 text-gray-500">No OTA data available</p>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#C4A572]" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(metrics.expensesByCategory).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Object.entries(metrics.expensesByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([category, amount]) => ({
                          category: category.replace(/_/g, ' ').charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
                          amount: Math.round(amount),
                        }))
                      }
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={11} width={120} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="amount" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-gray-500">No expense data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-2 shadow-lg bg-gradient-to-br from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C4A572]" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Period</p>
                    <p className="font-semibold">{dateRange.start_date} to {dateRange.end_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                    <p className="font-semibold text-lg">{metrics.bookingsCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Revenue After Commissions</p>
                    <p className="font-semibold text-lg text-[#C4A572]">{formatCurrency(metrics.netRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                    <p className={`font-semibold text-lg ${metrics.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.profitMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
