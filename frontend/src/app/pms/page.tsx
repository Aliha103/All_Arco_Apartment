'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  BedDouble,
  UserCheck,
  UserX,
  Bell,
  Activity,
  BarChart3,
  PieChart,
  CalendarDays,
  Sparkles,
  CreditCard,
  Package,
  RefreshCw,
  AlertTriangle,
  Info,
  Target,
  Zap,
  ClipboardList,
  BellRing,
  Lightbulb,
  Brain,
  CloudRain,
  CloudSun,
  Sun,
  Download,
  ChevronRight,
  Timer,
  Building2,
  Home as HomeIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, subDays, isToday, subMonths, startOfMonth, endOfMonth, formatISO, addMonths } from 'date-fns';

// Professional color palette
const COLORS = {
  primary: '#C4A572',
  primaryDark: '#B39562',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  chart: ['#C4A572', '#B39562', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️ Good Morning';
  if (hour < 18) return '🌤️ Good Afternoon';
  return '🌙 Good Evening';
};

const getWeatherIcon = () => {
  const hour = new Date().getHours();
  if (hour < 6 || hour > 20) return <CloudRain className="w-5 h-5" />;
  if (hour < 12) return <Sun className="w-5 h-5" />;
  return <CloudSun className="w-5 h-5" />;
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  comparisonText?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  delay?: number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'critical';
}

const StatCard = ({
  title,
  value,
  change,
  comparisonText = 'vs last month',
  icon,
  trend = 'neutral',
  color = COLORS.primary,
  delay = 0,
  subtitle,
  status,
  isSensitive = false,
  hideData = false
}: StatCardProps & { isSensitive?: boolean; hideData?: boolean }) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Activity;

  const statusColors = {
    good: 'border-green-200 bg-green-50/30',
    warning: 'border-yellow-200 bg-yellow-50/30',
    critical: 'border-red-200 bg-red-50/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: smoothEase }}
    >
      <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border ${status ? statusColors[status] : 'border-gray-200 hover:border-gray-300'}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between mb-2">
            <div
              className="p-2 rounded-lg shadow-sm"
              style={{
                backgroundColor: `${color}15`,
              }}
            >
              <div style={{ color }} className="w-5 h-5 sm:w-6 sm:h-6">{icon}</div>
            </div>
            {change !== undefined && trend !== 'neutral' && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                  isPositive
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : isNegative
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <TrendIcon className="w-3 h-3" />
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              {title}
            </h3>
            <p className={`text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight transition-all duration-300 ${isSensitive && hideData ? 'blur-lg select-none' : ''}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {subtitle}
              </p>
            )}
            {change !== undefined && (
              <p className="text-xs text-gray-500 font-medium">{comparisonText}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface BookingItemProps {
  booking: any;
  type: 'arrival' | 'departure';
  hideData?: boolean;
}

const BookingItem = ({ booking, type, hideData = false }: BookingItemProps) => {
  const icon = type === 'arrival' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />;
  const bgColor = type === 'arrival' ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-blue-50 to-blue-100';
  const textColor = type === 'arrival' ? 'text-green-800' : 'text-blue-800';
  const borderColor = type === 'arrival' ? 'border-green-300' : 'border-blue-300';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg hover:shadow-md transition-all border ${borderColor} ${bgColor} gap-2 sm:gap-0`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`p-2 rounded-lg shadow-sm ${textColor} flex-shrink-0 bg-white`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`font-bold text-gray-900 text-sm truncate transition-all duration-300 ${hideData ? 'blur-md select-none' : ''}`}>{booking.guest_name}</p>
          <p className="text-xs text-gray-700 font-medium">
            {type === 'arrival' ? 'Check-in' : 'Check-out'}: {formatDate(type === 'arrival' ? booking.check_in_date : booking.check_out_date)}
          </p>
          <p className={`text-xs text-gray-600 transition-all duration-300 ${hideData ? 'blur-sm select-none' : ''}`}>Ref: {booking.reference_code || booking.booking_id}</p>
        </div>
      </div>
      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
        <p className={`font-bold text-base transition-all duration-300 ${hideData ? 'blur-md select-none' : ''}`} style={{ color: COLORS.primary }}>{formatCurrency(booking.total_price)}</p>
        <p className="text-xs text-gray-700 font-medium">{booking.number_of_guests || booking.guests} {(booking.number_of_guests || booking.guests) === 1 ? 'guest' : 'guests'}</p>
      </div>
    </motion.div>
  );
};

// Smart Notification Component
const SmartNotification = ({ type, title, message, time, action }: any) => {
  const icons: any = {
    urgent: <AlertCircle className="w-5 h-5 text-red-700" />,
    info: <Info className="w-5 h-5 text-blue-700" />,
    success: <CheckCircle className="w-5 h-5 text-green-700" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-700" />,
  };

  const colors: any = {
    urgent: 'border-red-300 bg-red-50',
    info: 'border-blue-300 bg-blue-50',
    success: 'border-green-300 bg-green-50',
    warning: 'border-yellow-300 bg-yellow-50',
  };

  const textColors: any = {
    urgent: 'text-red-900',
    info: 'text-blue-900',
    success: 'text-green-900',
    warning: 'text-yellow-900',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border ${colors[type]} mb-2 hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold ${textColors[type]} text-sm mb-1`}>{title}</p>
          <p className="text-xs text-gray-700">{message}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-600">{time}</span>
            {action && (
              <Button variant="ghost" size="sm" className="h-6 text-xs font-semibold">
                {action} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function PMSDashboard() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(true);

  // Load hide sensitive data state from localStorage
  const [hideSensitiveData, setHideSensitiveData] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hideSensitiveData');
      return stored === 'true';
    }
    return false;
  });

  // Persist hide sensitive data state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hideSensitiveData', hideSensitiveData.toString());
    }
  }, [hideSensitiveData]);

  // Fetch dashboard statistics from API
  const { data: dashboardData, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.bookings.statistics();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const twelveMonthStart = startOfMonth(subMonths(new Date(), 11));
  const { data: bookingsLastYear } = useQuery({
    queryKey: ['bookings-last-year'],
    queryFn: async () => {
      const params: any = {
        check_in_date_from: formatISO(twelveMonthStart, { representation: 'date' }),
        check_in_date_to: formatISO(endOfMonth(new Date()), { representation: 'date' }),
        status: 'pending,confirmed,paid,checked_in,checked_out,cancelled,no_show',
      };
      const response = await api.bookings.list(params);
      return response.data.results || response.data || [];
    },
    staleTime: 30000,
  });

  // Generate revenue data for last 30 days (TODO: Replace with real API data)
  const revenueData = useMemo(() => {
    const data = [];
    let baseRevenue = 400;
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      // Create smoother data with trending pattern
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendBoost = isWeekend ? 150 : 0;
      const randomVariation = Math.sin(i / 3) * 80; // Smoother sine wave variation
      baseRevenue += (Math.random() - 0.5) * 30; // Gradual drift
      baseRevenue = Math.max(250, Math.min(800, baseRevenue)); // Keep in range

      data.push({
        date: format(date, 'MMM dd'),
        revenue: Math.floor(baseRevenue + weekendBoost + randomVariation),
        bookings: Math.floor(Math.random() * 6) + 1,
      });
    }
    return data;
  }, []);

  // Booking source data (TODO: Replace with real API data)
  const bookingSourceData = [
    { name: 'Direct Website', value: 45, color: COLORS.chart[0] },
    { name: 'Booking.com', value: 25, color: COLORS.chart[1] },
    { name: 'Airbnb', value: 20, color: COLORS.chart[2] },
    { name: 'Expedia', value: 7, color: COLORS.chart[3] },
    { name: 'Walk-in', value: 3, color: COLORS.chart[4] },
  ];

  // Occupancy trend data (last 6 months)
  const occupancyTrendData = useMemo(() => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    let baseOccupancy = 55;
    let baseRevenue = 3500;
    return months.map((month, index) => {
      // Create smoother trending data
      baseOccupancy += (Math.random() - 0.4) * 8; // Slight upward trend
      baseRevenue += (Math.random() - 0.4) * 400;
      baseOccupancy = Math.max(40, Math.min(85, baseOccupancy));
      baseRevenue = Math.max(2000, Math.min(5500, baseRevenue));

      return {
        month,
        occupancy: Math.floor(baseOccupancy),
        revenue: Math.floor(baseRevenue),
      };
    });
  }, []);

  // Booking status distribution
  const bookingStatusData = useMemo(() => {
    const statusData = dashboardData?.status || {};
    return [
      { name: 'Confirmed', value: statusData.confirmed || 0, color: COLORS.success },
      { name: 'Pending', value: statusData.pending || 0, color: COLORS.warning },
      { name: 'Checked In', value: statusData.checked_in || 0, color: COLORS.info },
      { name: 'Checked Out', value: statusData.checked_out || 0, color: COLORS.purple },
    ].filter(item => item.value > 0);
  }, [dashboardData]);

  // Payment status data
  const paymentStatusData = [
    { name: 'Paid', value: 75, color: COLORS.success },
    { name: 'Pending', value: 15, color: COLORS.warning },
    { name: 'Refunded', value: 10, color: COLORS.error },
  ];

  // Guest count trend (last 12 months)
  const guestTrendData = useMemo(() => {
    const data = [];
    let baseGuests = 15;
    for (let i = 11; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      // Create smoother data with seasonal pattern
      const seasonalFactor = Math.sin((11 - i) * Math.PI / 6) * 8; // Seasonal variation
      baseGuests += (Math.random() - 0.45) * 3; // Slight upward trend
      baseGuests = Math.max(8, Math.min(35, baseGuests));

      data.push({
        month: format(date, 'MMM'),
        guests: Math.floor(baseGuests + seasonalFactor),
      });
    }
    return data;
  }, []);

  // 12-month booking vs cancellation trend (month + year to avoid collisions)
  const bookingCancelTrend = useMemo(() => {
    const months: { key: string; label: string; confirmed: number; cancelled: number }[] = [];
    // Start 7 months back so current month sits near the middle of the 12 slots
    const startMonth = startOfMonth(addMonths(new Date(), -7));
    for (let i = 0; i < 12; i++) {
      const start = startOfMonth(addMonths(startMonth, i));
      const key = format(start, 'yyyy-MM');
      const label = format(start, 'MMM yy');
      months.push({ key, label, confirmed: 0, cancelled: 0 });
    }
    if (Array.isArray(bookingsLastYear)) {
      bookingsLastYear.forEach((b: any) => {
        const checkIn = new Date(b.check_in_date);
        const key = format(startOfMonth(checkIn), 'yyyy-MM');
        const bucket = months.find((m) => m.key === key);
        if (!bucket) return;
        const status = (b.status || '').toLowerCase();
        if (['confirmed', 'paid', 'checked_in'].includes(status)) {
          bucket.confirmed += 1;
        } else if (status === 'cancelled') {
          bucket.cancelled += 1;
        }
      });
    }
    return months;
  }, [bookingsLastYear]);

  // Smart notifications
  const notifications = useMemo(() => {
    const notifs = [];

    if (dashboardData?.today?.arrivals?.length > 0) {
      notifs.push({
        type: 'info',
        title: 'Guest Arriving Today',
        message: `${dashboardData.today.arrivals[0].guest_name} checking in today`,
        time: 'Today',
        action: 'Prepare'
      });
    }

    if (dashboardData?.today?.departures?.length > 0) {
      notifs.push({
        type: 'warning',
        title: 'Checkout Today',
        message: `${dashboardData.today.departures[0].guest_name} checking out today`,
        time: 'Today',
        action: 'Review'
      });
    }

    if (dashboardData?.status?.pending > 0) {
      notifs.push({
        type: 'urgent',
        title: 'Pending Confirmations',
        message: `${dashboardData.status.pending} booking(s) awaiting confirmation`,
        time: 'Now',
        action: 'Review'
      });
    }

    return notifs;
  }, [dashboardData]);

  const handleRefresh = () => {
    refetchStats();
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-200"></div>
            <div className="w-16 h-16 rounded-full border-4 border-t-[#C4A572] border-r-[#C4A572] animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Loading Dashboard</p>
            <p className="text-sm text-gray-500 mt-1">Fetching real-time analytics...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md border-2 border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load Dashboard</h3>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't fetch the dashboard data. Please try again.
            </p>
            <Button onClick={handleRefresh} className="bg-[#C4A572] hover:bg-[#B39562]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {};
  const period = dashboardData?.period || {};
  const todaysOps = dashboardData?.today || { arrivals: [], departures: [], in_house_guests: 0 };
  const apartment = dashboardData?.apartment || { is_occupied: false, guest_count: 0 };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Personalized Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: smoothEase }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#C4A572]/5 via-transparent to-[#C4A572]/5 rounded-xl -z-10"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 sm:p-5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                {getGreeting()}, {user?.first_name}!
              </h1>
              <Zap className="w-5 h-5 text-[#C4A572] animate-pulse flex-shrink-0" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span>Venice, Italy</span>
              <span className="flex items-center gap-1 text-[#C4A572]">
                {getWeatherIcon()}
                23°C
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {period.month_name} {period.year} • Day {period.days_elapsed} of {period.days_in_month}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 font-semibold"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{notifications.length} Alerts</span>
                <span className="sm:hidden">{notifications.length}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={`gap-1 border font-semibold ${hideSensitiveData ? 'border-gray-300 bg-gray-50 text-gray-800' : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
              onClick={() => setHideSensitiveData(!hideSensitiveData)}
              title={hideSensitiveData ? 'Show sensitive data' : 'Hide sensitive data'}
            >
              {hideSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden lg:inline">{hideSensitiveData ? 'Hidden' : 'Visible'}</span>
            </Button>
            {/* Removed Live/Refresh per request */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border border-gray-300 text-gray-900"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.print();
                }
              }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-12 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column - Main Content (8 columns on lg, 9 on xl) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4 sm:space-y-6">
          {/* Key Performance Indicators */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <StatCard
              title="Total Revenue"
              value={formatCurrency(metrics.total_revenue || 0)}
              change={12.4}
              trend="up"
              icon={<DollarSign />}
              color={COLORS.success}
              delay={0}
              subtitle={`${period.month_name} earnings`}
              status="good"
              isSensitive={true}
              hideData={hideSensitiveData}
            />
            <StatCard
              title="Occupancy Rate"
              value={`${metrics.occupancy_rate || 0}%`}
              change={5.2}
              trend="up"
              icon={<BedDouble />}
              color={COLORS.info}
              delay={0.08}
              subtitle={`${metrics.occupied_nights || 0} of ${period.days_in_month} nights`}
              status={metrics.occupancy_rate >= 70 ? 'good' : metrics.occupancy_rate >= 50 ? 'warning' : 'critical'}
            />
            <StatCard
              title="Total Bookings"
              value={metrics.total_bookings || 0}
              change={8.3}
              trend="up"
              icon={<Calendar />}
              color={COLORS.purple}
              delay={0.16}
              subtitle="Confirmed reservations"
            />
            <StatCard
              title="Average Daily Rate"
              value={formatCurrency(metrics.average_daily_rate || 0)}
              change={4.1}
              trend="up"
              icon={<TrendingUp />}
              color={COLORS.warning}
              delay={0.24}
              subtitle="Per night average"
              isSensitive={true}
              hideData={hideSensitiveData}
            />
          </motion.div>

          {/* Today's Timeline - More compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border border-gray-200 shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <Timer className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900">Today's Operations</CardTitle>
                    <CardDescription className="text-xs font-medium text-gray-700">
                      Arrivals & Departures for {format(new Date(), 'MMMM dd')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Arrivals */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        <div className="p-1 rounded bg-green-100">
                          <UserCheck className="w-4 h-4 text-green-700" />
                        </div>
                        Arrivals
                        <Badge className="bg-green-100 text-green-800 border-green-300 border font-bold text-xs">
                          {todaysOps.arrivals?.length || 0}
                        </Badge>
                      </h3>
                      <Link href="/pms/bookings">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold hover:bg-green-50">
                          View All →
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {todaysOps.arrivals && todaysOps.arrivals.length > 0 ? (
                        todaysOps.arrivals.map((booking: any) => (
                          <BookingItem key={booking.id} booking={booking} type="arrival" hideData={hideSensitiveData} />
                        ))
                      ) : (
                        <div className="text-center py-8 px-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                          <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No arrivals scheduled</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Departures */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                        <div className="p-1 rounded bg-blue-100">
                          <UserX className="w-4 h-4 text-blue-700" />
                        </div>
                        Departures
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 border font-bold text-xs">
                          {todaysOps.departures?.length || 0}
                        </Badge>
                      </h3>
                      <Link href="/pms/bookings">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold hover:bg-blue-50">
                          View All →
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {todaysOps.departures && todaysOps.departures.length > 0 ? (
                        todaysOps.departures.map((booking: any) => (
                          <BookingItem key={booking.id} booking={booking} type="departure" hideData={hideSensitiveData} />
                        ))
                      ) : (
                        <div className="text-center py-8 px-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                          <UserX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No departures scheduled</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Grid - Revenue Trend full width */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="w-full max-w-full"
          >
            <Card className="border border-gray-200 shadow w-full overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10 flex-shrink-0">
                    <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base text-gray-900 truncate">Revenue Trend (Last 30 Days)</CardTitle>
                    <CardDescription className="text-xs font-medium text-gray-800 truncate">Daily revenue performance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-hidden">
                <ResponsiveContainer width="100%" height={250} minWidth={0}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeWidth={1} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontWeight: 600
                      }}
                    />
                    <Area
                      type="natural"
                      dataKey="revenue"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Occupancy & Guest Count - Two columns */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full overflow-hidden">
            {/* Occupancy & Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.56 }}
              className="w-full max-w-full"
            >
              <Card className="border border-gray-200 shadow w-full h-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#C4A572]/10 flex-shrink-0">
                      <Activity className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base text-gray-900 truncate">Occupancy & Revenue Trend</CardTitle>
                      <CardDescription className="text-xs font-medium text-gray-800 truncate">Last 6 months performance</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-hidden">
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <LineChart data={occupancyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}
                      />
                      <Legend wrapperStyle={{ fontWeight: 600, fontSize: '12px' }} />
                      <Line
                        yAxisId="left"
                        type="natural"
                        dataKey="occupancy"
                        stroke={COLORS.info}
                        strokeWidth={3}
                        name="Occupancy %"
                        dot={{ r: 4, strokeWidth: 2 }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                      <Line
                        yAxisId="right"
                        type="natural"
                        dataKey="revenue"
                        stroke={COLORS.success}
                        strokeWidth={3}
                        name="Revenue €"
                        dot={{ r: 4, strokeWidth: 2 }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Guest Count Trend */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.64 }}
              className="w-full max-w-full"
            >
              <Card className="border border-gray-200 shadow w-full h-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#C4A572]/10 flex-shrink-0">
                      <Users className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base text-gray-900 truncate">Guest Count Trend</CardTitle>
                      <CardDescription className="text-xs font-medium text-gray-800 truncate">Monthly guest arrivals</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-hidden">
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <AreaChart data={guestTrendData}>
                      <defs>
                        <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E5E7EB',
                          borderRadius: '8px',
                          fontWeight: 600
                        }}
                      />
                      <Area
                        type="natural"
                        dataKey="guests"
                        stroke={COLORS.purple}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorGuests)"
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 12-Month Bookings vs Cancellations */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="w-full"
          >
            <Card className="border border-gray-200 shadow w-full overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10 flex-shrink-0">
                    <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base text-gray-900 truncate">12-Month Bookings vs Cancellations</CardTitle>
                    <CardDescription className="text-xs font-medium text-gray-800 truncate">Confirmed/checked-in vs cancelled</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-hidden">
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <BarChart data={bookingCancelTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} stroke="#6B7280" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="confirmed" name="Bookings" stackId="a" fill={COLORS.primary} radius={[6,6,0,0]} />
                    <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={COLORS.error} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* Right Column - Sidebar (4 columns on lg, 3 on xl) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Smart Notifications - Compact */}
          <AnimatePresence>
            {showNotifications && notifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-gray-200 shadow">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b border-purple-200 py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-purple-100">
                        <BellRing className="w-4 h-4 text-purple-700" />
                      </div>
                      <CardTitle className="text-base text-gray-900">Smart Alerts</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {notifications.map((notif, i) => (
                      <SmartNotification key={i} {...notif} />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Booking Sources - Compact with scrollable legend */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.72 }}
          >
            <Card className="border border-gray-200 shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-[#C4A572]/10">
                    <PieChart className="w-4 h-4" style={{ color: COLORS.primary }} />
                  </div>
                  <CardTitle className="text-base text-gray-900">Booking Sources</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <RePieChart>
                    <Pie
                      data={bookingSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {bookingSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontWeight: 600
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                {/* Scrollable legend for many sources */}
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {bookingSourceData.map((source) => (
                    <div key={source.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: source.color }} />
                        <span className="text-gray-800 font-semibold text-xs">{source.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs">{source.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Status - Compact */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="border border-gray-200 shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-[#C4A572]/10">
                    <CreditCard className="w-4 h-4" style={{ color: COLORS.primary }} />
                  </div>
                  <CardTitle className="text-base text-gray-900">Payment Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <RePieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontWeight: 600
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {paymentStatusData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
                        <span className="text-gray-800 font-semibold text-xs">{status.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 text-xs">{status.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions removed */}

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
