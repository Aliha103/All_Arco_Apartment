'use client';

import { useMemo, useState } from 'react';
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
  Lock,
  Unlock,
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
import { format, subDays, isToday } from 'date-fns';

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
    good: 'border-green-200 bg-green-50/50',
    warning: 'border-yellow-200 bg-yellow-50/50',
    critical: 'border-red-200 bg-red-50/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: smoothEase }}
    >
      <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 border-2 ${status ? statusColors[status] : 'border-gray-100 hover:border-gray-200'}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2.5 sm:p-3.5 rounded-xl shadow-sm"
              style={{
                backgroundColor: `${color}15`,
                boxShadow: `0 4px 12px ${color}20`
              }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
            {change !== undefined && trend !== 'neutral' && (
              <div
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                  isPositive
                    ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                    : isNegative
                    ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <TrendIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {title}
            </h3>
            <p className={`text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight transition-all duration-300 ${isSensitive && hideData ? 'blur-lg select-none' : ''}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
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
  const textColor = type === 'arrival' ? 'text-green-700' : 'text-blue-700';
  const borderColor = type === 'arrival' ? 'border-green-200' : 'border-blue-200';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl hover:shadow-md transition-all border-2 ${borderColor} ${bgColor} gap-3 sm:gap-0`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 sm:p-2.5 rounded-lg shadow-sm ${textColor} flex-shrink-0`} style={{ backgroundColor: 'white' }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`font-bold text-gray-900 text-sm truncate transition-all duration-300 ${hideData ? 'blur-md select-none' : ''}`}>{booking.guest_name}</p>
          <p className="text-xs text-gray-600 font-medium mt-0.5">
            {type === 'arrival' ? 'Check-in' : 'Check-out'}: {formatDate(type === 'arrival' ? booking.check_in_date : booking.check_out_date)}
          </p>
          <p className={`text-xs text-gray-500 mt-0.5 transition-all duration-300 ${hideData ? 'blur-sm select-none' : ''}`}>Ref: {booking.reference_code || booking.booking_id}</p>
        </div>
      </div>
      <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto">
        <p className={`font-bold text-base sm:text-lg transition-all duration-300 ${hideData ? 'blur-md select-none' : ''}`} style={{ color: COLORS.primary }}>{formatCurrency(booking.total_price)}</p>
        <p className="text-xs text-gray-600 font-medium mt-0.5">{booking.number_of_guests || booking.guests} {(booking.number_of_guests || booking.guests) === 1 ? 'guest' : 'guests'}</p>
      </div>
    </motion.div>
  );
};

// Smart Notification Component
const SmartNotification = ({ type, title, message, time, action }: any) => {
  const icons: any = {
    urgent: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  };

  const colors: any = {
    urgent: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border-2 ${colors[type]} mb-3 hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
          <p className="text-xs text-gray-600">{message}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{time}</span>
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

// Task Item Component
const TaskItem = ({ task, completed, onToggle }: any) => {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
        completed ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          completed ? 'border-green-600 bg-green-600' : 'border-gray-300'
        }`}
      >
        {completed && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
      <p className={`text-sm font-medium flex-1 ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
        {task}
      </p>
    </motion.div>
  );
};

export default function PMSDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([
    { id: 1, task: 'Review pending bookings', completed: false },
    { id: 2, task: 'Confirm VIP arrival preparations', completed: false },
    { id: 3, task: 'Process late checkout requests', completed: false },
    { id: 4, task: 'Update pricing for weekend', completed: true },
    { id: 5, task: 'Review housekeeping schedule', completed: false },
  ]);

  const [showNotifications, setShowNotifications] = useState(true);
  const [hideSensitiveData, setHideSensitiveData] = useState(false);

  // Fetch dashboard statistics from API
  const { data: dashboardData, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.bookings.statistics();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Generate revenue data for last 30 days (TODO: Replace with real API data)
  const revenueData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'MMM dd'),
        revenue: Math.floor(Math.random() * 600) + 250,
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
    return months.map(month => ({
      month,
      occupancy: Math.floor(Math.random() * 40) + 40, // 40-80%
      revenue: Math.floor(Math.random() * 3000) + 2000,
    }));
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
    for (let i = 11; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      data.push({
        month: format(date, 'MMM'),
        guests: Math.floor(Math.random() * 20) + 10,
      });
    }
    return data;
  }, []);

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

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
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
    <div className="space-y-6 pb-8">
      {/* Personalized Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: smoothEase }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#C4A572]/5 via-transparent to-[#C4A572]/5 rounded-2xl -z-10"></div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-6 rounded-2xl border-2 border-gray-100 bg-white/80 backdrop-blur-sm shadow-lg">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 truncate">
                {getGreeting()}, {user?.first_name}!
              </h1>
              <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-[#C4A572] animate-pulse flex-shrink-0" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600 font-medium">
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
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              {period.month_name} {period.year} • Day {period.days_elapsed} of {period.days_in_month}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-2 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold"
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
              className={`gap-2 border-2 font-semibold ${hideSensitiveData ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
              onClick={() => setHideSensitiveData(!hideSensitiveData)}
              title={hideSensitiveData ? 'Show sensitive data' : 'Hide sensitive data'}
            >
              {hideSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden lg:inline">{hideSensitiveData ? 'Hidden' : 'Visible'}</span>
            </Button>
            <Badge variant="outline" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold border-2 border-green-200 bg-green-50 text-green-700">
              <Activity className="w-4 h-4 mr-1 sm:mr-2 animate-pulse" />
              Live
            </Badge>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 border-2 hover:border-[#C4A572] hover:bg-[#C4A572]/5">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column - Main Content (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Performance Indicators */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <StatCard
              title="Total Revenue"
              value={formatCurrency(metrics.total_revenue || 0)}
              change={12.4}
              trend="up"
              icon={<DollarSign className="w-5 sm:w-7 h-5 sm:h-7" />}
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
              icon={<BedDouble className="w-5 sm:w-7 h-5 sm:h-7" />}
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
              icon={<Calendar className="w-5 sm:w-7 h-5 sm:h-7" />}
              color={COLORS.purple}
              delay={0.16}
              subtitle="Confirmed reservations"
            />
            <StatCard
              title="Average Daily Rate"
              value={formatCurrency(metrics.average_daily_rate || 0)}
              change={4.1}
              trend="up"
              icon={<TrendingUp className="w-5 sm:w-7 h-5 sm:h-7" />}
              color={COLORS.warning}
              delay={0.24}
              subtitle="Per night average"
              isSensitive={true}
              hideData={hideSensitiveData}
            />
          </motion.div>

          {/* Apartment Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
          >
            <Card className={`border-2 shadow-lg ${apartment.is_occupied ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
              <CardHeader className="bg-gradient-to-r from-white to-gray-50 border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className={`p-3 rounded-xl ${apartment.is_occupied ? 'bg-red-100' : 'bg-green-100'}`}>
                    {apartment.is_occupied ? (
                      <Lock className="w-6 h-6 text-red-600" />
                    ) : (
                      <Unlock className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                  Apartment Status
                  <Badge className={`ml-auto ${apartment.is_occupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} hover:bg-opacity-80`}>
                    {apartment.is_occupied ? 'OCCUPIED' : 'VACANT'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2 text-base font-medium">
                  All'Arco Apartment - Single Property Management
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {apartment.is_occupied ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2">Current Guests</p>
                      <p className="text-3xl sm:text-4xl font-bold text-gray-900">{apartment.guest_count}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Checkout: {apartment.current_checkout_date ? format(new Date(apartment.current_checkout_date), 'MMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2">Booking</p>
                      <p className="text-base sm:text-lg font-bold" style={{ color: COLORS.primary }}>
                        {todaysOps.current_booking_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Unlock className="w-12 sm:w-16 h-12 sm:h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Apartment Available</p>
                    <p className="text-xs sm:text-sm text-gray-600">Ready for next booking</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-lg bg-[#C4A572]/10">
                        <Timer className="w-6 h-6" style={{ color: COLORS.primary }} />
                      </div>
                      Today's Operations
                    </CardTitle>
                    <CardDescription className="mt-2 text-base font-medium">
                      Arrivals & Departures for {format(new Date(), 'MMMM dd')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Arrivals */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-green-100">
                          <UserCheck className="w-5 h-5 text-green-600" />
                        </div>
                        Arrivals
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-bold">
                          {todaysOps.arrivals?.length || 0}
                        </Badge>
                      </h3>
                      <Link href="/pms/bookings">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold hover:bg-green-50">
                          View All →
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {todaysOps.arrivals && todaysOps.arrivals.length > 0 ? (
                        todaysOps.arrivals.map((booking: any) => (
                          <BookingItem key={booking.id} booking={booking} type="arrival" hideData={hideSensitiveData} />
                        ))
                      ) : (
                        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                          <UserCheck className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm sm:text-base text-gray-500 font-medium">No arrivals scheduled</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Departures */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-100">
                          <UserX className="w-5 h-5 text-blue-600" />
                        </div>
                        Departures
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-bold">
                          {todaysOps.departures?.length || 0}
                        </Badge>
                      </h3>
                      <Link href="/pms/bookings">
                        <Button variant="ghost" size="sm" className="text-xs font-semibold hover:bg-blue-50">
                          View All →
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {todaysOps.departures && todaysOps.departures.length > 0 ? (
                        todaysOps.departures.map((booking: any) => (
                          <BookingItem key={booking.id} booking={booking} type="departure" hideData={hideSensitiveData} />
                        ))
                      ) : (
                        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                          <UserX className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm sm:text-base text-gray-500 font-medium">No departures scheduled</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue Analytics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.48 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  Revenue Trend (Last 30 Days)
                </CardTitle>
                <CardDescription className="font-medium">Daily revenue performance</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeWidth={1.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                        fontWeight: 600
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Occupancy & Revenue Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.56 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <Activity className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  Occupancy & Revenue Trend
                </CardTitle>
                <CardDescription className="font-medium text-sm">Last 6 months performance</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={occupancyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                        fontWeight: 600
                      }}
                    />
                    <Legend wrapperStyle={{ fontWeight: 600, fontSize: '13px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="occupancy" stroke={COLORS.info} strokeWidth={3} name="Occupancy %" dot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={3} name="Revenue €" dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Booking Status Distribution */}
          {bookingStatusData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.64 }}
            >
              <Card className="border-2 border-gray-100 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                  <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                    <div className="p-2 rounded-lg bg-[#C4A572]/10">
                      <BarChart3 className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    Booking Status Distribution
                  </CardTitle>
                  <CardDescription className="font-medium text-sm">Current month breakdown</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bookingStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                      <YAxis tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          fontWeight: 600
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {bookingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Guest Count Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.72 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <Users className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  Guest Count Trend
                </CardTitle>
                <CardDescription className="font-medium text-sm">Monthly guest arrivals</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={guestTrendData}>
                    <defs>
                      <linearGradient id="colorGuests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <YAxis tick={{ fontSize: 12, fontWeight: 600 }} stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="guests"
                      stroke={COLORS.purple}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGuests)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Sidebar (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Smart Notifications */}
          <AnimatePresence>
            {showNotifications && notifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b-2 border-purple-100">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <BellRing className="w-5 h-5 text-purple-600" />
                      </div>
                      Smart Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {notifications.map((notif, i) => (
                      <SmartNotification key={i} {...notif} />
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.56 }}
          >
            <Card className="border-2 border-blue-100 shadow-lg bg-gradient-to-br from-blue-50/50 to-white">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b-2 border-blue-100">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="p-4 rounded-xl border-2 border-blue-200 bg-white">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">Revenue Opportunity</p>
                      <p className="text-xs text-gray-600">
                        Occupancy at {metrics.occupancy_rate || 0}%. Consider adjusting weekend rates for optimal revenue.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border-2 border-green-200 bg-white">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">Performance Trend</p>
                      <p className="text-xs text-gray-600">
                        {metrics.total_bookings || 0} bookings this month. {metrics.occupancy_rate >= 60 ? 'Great performance!' : 'Room for growth.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Task Management */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.64 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-lg bg-[#C4A572]/10">
                      <ClipboardList className="w-5 h-5" style={{ color: COLORS.primary }} />
                    </div>
                    Today's Tasks
                  </CardTitle>
                  <Badge className="bg-gray-100 text-gray-700 font-bold">
                    {tasks.filter(t => !t.completed).length}/{tasks.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task.task}
                    completed={task.completed}
                    onToggle={() => toggleTask(task.id)}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Booking Sources */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.72 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <PieChart className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  Booking Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie
                      data={bookingSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {bookingSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {bookingSourceData.map((source) => (
                    <div key={source.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: source.color }} />
                        <span className="text-gray-700 font-semibold">{source.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{source.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="border-2 border-gray-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-[#C4A572]/10">
                    <CreditCard className="w-5 h-5" style={{ color: COLORS.primary }} />
                  </div>
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={180}>
                  <RePieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {paymentStatusData.map((status) => (
                    <div key={status.name} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: status.color }} />
                        <span className="text-gray-700 font-semibold">{status.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{status.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions Command Center */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card className="border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-100">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-[#C4A572]/10">
                <Sparkles className="w-5 h-5" style={{ color: COLORS.primary }} />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                { href: '/pms/bookings', icon: Calendar, label: 'Booking', color: COLORS.primary },
                { href: '/pms/calendar', icon: CalendarDays, label: 'Calendar', color: COLORS.info },
                { href: '/pms/payments', icon: CreditCard, label: 'Payments', color: COLORS.success },
                { href: '/pms/guests', icon: Users, label: 'Guests', color: COLORS.purple },
                { href: '/pms/invoices', icon: Package, label: 'Invoices', color: COLORS.warning },
                { href: '/pms/reports', icon: BarChart3, label: 'Reports', color: COLORS.error },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}>
                  <motion.div whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="w-full h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 border-2 hover:border-gray-300 hover:shadow-lg">
                      <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
                        <Icon className="w-5 sm:w-6 h-5 sm:h-6" style={{ color }} />
                      </div>
                      <span className="text-xs font-bold text-gray-900">{label}</span>
                    </Button>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
