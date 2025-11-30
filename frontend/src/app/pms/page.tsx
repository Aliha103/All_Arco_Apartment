'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  BedDouble,
  UserCheck,
  UserX,
  Bell,
  Activity,
  BarChart3,
  PieChart,
  CalendarDays,
  Sparkles,
  Home,
  CreditCard,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns';

// Professional color palette for hospitality industry
const COLORS = {
  primary: '#C4A572', // Gold
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  chart: ['#C4A572', '#B39562', '#8B7355', '#6B5747', '#4A3F35']
};

// Smooth animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  color?: string;
  delay?: number;
}

const StatCard = ({ title, value, change, icon, trend, color = COLORS.primary, delay = 0 }: StatCardProps) => {
  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
              <div style={{ color }}>{icon}</div>
            </div>
            {change !== undefined && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <TrendIcon className="w-3 h-3" />
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface BookingItemProps {
  booking: any;
  type: 'arrival' | 'departure';
}

const BookingItem = ({ booking, type }: BookingItemProps) => {
  const icon = type === 'arrival' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />;
  const bgColor = type === 'arrival' ? 'bg-green-50' : 'bg-blue-50';
  const textColor = type === 'arrival' ? 'text-green-700' : 'text-blue-700';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor} ${textColor}`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{booking.guest_name}</p>
          <p className="text-xs text-gray-600">
            {type === 'arrival' ? 'Check-in' : 'Check-out'}: {formatDate(type === 'arrival' ? booking.check_in_date : booking.check_out_date)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold" style={{ color: COLORS.primary }}>{formatCurrency(booking.total_price)}</p>
        <p className="text-xs text-gray-600">{booking.guests} guests</p>
      </div>
    </div>
  );
};

export default function PMSDashboard() {
  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['booking-stats'],
    queryFn: async () => {
      const response = await api.bookings.statistics();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch recent bookings
  const { data: recentBookings } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const response = await api.bookings.list({ limit: 20 });
      return response.data.results || response.data;
    },
    refetchInterval: 60000,
  });

  // Process bookings for today's arrivals and departures
  const todaysOperations = useMemo(() => {
    if (!recentBookings) return { arrivals: [], departures: [], inHouse: 0 };

    const today = new Date();
    const arrivals = recentBookings.filter((b: any) =>
      isToday(new Date(b.check_in_date)) && b.status !== 'cancelled'
    );
    const departures = recentBookings.filter((b: any) =>
      isToday(new Date(b.check_out_date)) && b.status !== 'cancelled'
    );

    const inHouse = recentBookings.filter((b: any) => {
      const checkIn = new Date(b.check_in_date);
      const checkOut = new Date(b.check_out_date);
      return checkIn <= today && checkOut >= today && b.status === 'checked_in';
    }).length;

    return { arrivals, departures, inHouse };
  }, [recentBookings]);

  // Generate mock revenue data for last 30 days
  const revenueData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'MMM dd'),
        revenue: Math.floor(Math.random() * 500) + 200,
        bookings: Math.floor(Math.random() * 5) + 1,
      });
    }
    return data;
  }, []);

  // Generate mock booking source data
  const bookingSourceData = [
    { name: 'Direct Website', value: 45, color: COLORS.chart[0] },
    { name: 'Booking.com', value: 25, color: COLORS.chart[1] },
    { name: 'Airbnb', value: 20, color: COLORS.chart[2] },
    { name: 'Expedia', value: 7, color: COLORS.chart[3] },
    { name: 'Walk-in', value: 3, color: COLORS.chart[4] },
  ];

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!stats) return null;

    const occupancyTrend = 5.2; // Mock trend
    const revenueTrend = 12.4;
    const adr = stats.total_revenue / (stats.total_bookings || 1);
    const conversionRate = 68; // Mock

    return {
      occupancyTrend,
      revenueTrend,
      adr,
      conversionRate
    };
  }, [stats]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-[#C4A572]" />
          <p className="text-sm text-gray-600">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Property Management Dashboard</h1>
          <p className="text-gray-600">Real-time insights and operations management for All'Arco Apartment</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-2 text-sm">
            <Activity className="w-4 h-4 mr-2" />
            Live Data
          </Badge>
          <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            3 Alerts
          </Button>
        </div>
      </motion.div>

      {/* Key Performance Indicators */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Revenue"
          value={stats?.total_revenue ? formatCurrency(stats.total_revenue) : '€0.00'}
          change={metrics?.revenueTrend}
          trend="up"
          icon={<DollarSign className="w-6 h-6" />}
          color={COLORS.success}
          delay={0}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancy_rate || 0}%`}
          change={metrics?.occupancyTrend}
          trend="up"
          icon={<BedDouble className="w-6 h-6" />}
          color={COLORS.info}
          delay={0.1}
        />
        <StatCard
          title="Total Bookings"
          value={stats?.total_bookings || 0}
          change={8.3}
          trend="up"
          icon={<Calendar className="w-6 h-6" />}
          color={COLORS.purple}
          delay={0.2}
        />
        <StatCard
          title="Average Daily Rate"
          value={metrics?.adr ? formatCurrency(metrics.adr) : '€0.00'}
          change={4.1}
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
          color={COLORS.warning}
          delay={0.3}
        />
      </motion.div>

      {/* Today's Operations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" style={{ color: COLORS.primary }} />
                  Today's Operations
                </CardTitle>
                <CardDescription>Real-time arrivals, departures, and occupancy</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{todaysOperations.inHouse}</p>
                  <p className="text-xs text-gray-600">In-House Guests</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Arrivals */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    Arrivals Today ({todaysOperations.arrivals.length})
                  </h3>
                  <Link href="/pms/bookings">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  {todaysOperations.arrivals.length > 0 ? (
                    todaysOperations.arrivals.slice(0, 3).map((booking: any) => (
                      <BookingItem key={booking.id} booking={booking} type="arrival" />
                    ))
                  ) : (
                    <p className="text-center py-6 text-gray-500 text-sm">No arrivals today</p>
                  )}
                </div>
              </div>

              {/* Departures */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-blue-600" />
                    Departures Today ({todaysOperations.departures.length})
                  </h3>
                  <Link href="/pms/bookings">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2">
                  {todaysOperations.departures.length > 0 ? (
                    todaysOperations.departures.slice(0, 3).map((booking: any) => (
                      <BookingItem key={booking.id} booking={booking} type="departure" />
                    ))
                  ) : (
                    <p className="text-center py-6 text-gray-500 text-sm">No departures today</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue Analytics & Booking Sources */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                Revenue Trend (Last 30 Days)
              </CardTitle>
              <CardDescription>Daily revenue and booking volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Booking Sources */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" style={{ color: COLORS.primary }} />
                Booking Sources
              </CardTitle>
              <CardDescription>Channel distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={bookingSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {bookingSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {bookingSourceData.map((source) => (
                  <div key={source.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-gray-700">{source.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{source.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: COLORS.primary }} />
              Quick Actions
            </CardTitle>
            <CardDescription>Frequently used operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link href="/pms/bookings">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <Calendar className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">New Booking</span>
                </Button>
              </Link>
              <Link href="/pms/calendar">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <CalendarDays className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">Calendar</span>
                </Button>
              </Link>
              <Link href="/pms/payments">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <CreditCard className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">Payments</span>
                </Button>
              </Link>
              <Link href="/pms/guests">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <Users className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">Guests</span>
                </Button>
              </Link>
              <Link href="/pms/invoices">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <Package className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">Invoices</span>
                </Button>
              </Link>
              <Link href="/pms/reports">
                <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
                  <BarChart3 className="w-6 h-6" style={{ color: COLORS.primary }} />
                  <span className="text-xs font-medium">Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="grid md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Confirmed Bookings</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.confirmed || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Ready for arrival</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending Bookings</p>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.pending || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <Activity className="w-4 h-4" style={{ color: COLORS.primary }} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics?.conversionRate}%</p>
            <p className="text-xs text-gray-600 mt-1">Booking efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">RevPAR</p>
              <DollarSign className="w-4 h-4" style={{ color: COLORS.success }} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics?.adr ? formatCurrency(metrics.adr * ((stats?.occupancy_rate || 0) / 100)) : '€0.00'}
            </p>
            <p className="text-xs text-gray-600 mt-1">Revenue per room</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
