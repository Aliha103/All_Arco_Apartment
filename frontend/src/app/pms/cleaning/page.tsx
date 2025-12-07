'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckSquare,
  PlayCircle,
  ListTodo,
  Trophy,
  Target,
  BarChart3,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CleaningSchedule {
  id: string;
  booking?: {
    id: string;
    booking_id: string;
    guest_name: string;
  };
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  assigned_to_name?: string;
  task_completion_rate?: number;
  quality_rating?: number;
  special_instructions?: string;
  tasks: CleaningTask[];
}

interface CleaningTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  is_completed: boolean;
  order: number;
}

interface Statistics {
  total_cleanings: number;
  today_cleanings: number;
  week_cleanings: number;
  avg_quality_rating: number;
  avg_duration_minutes: number;
  status_breakdown: Record<string, number>;
  upcoming_count: number;
}

// ============================================================================
// Configuration & Constants
// ============================================================================

const STATUS_CONFIG = {
  pending: {
    label: 'Scheduled',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-600',
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Target,
    iconColor: 'text-blue-600',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: PlayCircle,
    iconColor: 'text-purple-600',
  },
  completed: {
    label: 'Completed',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: AlertCircle,
    iconColor: 'text-gray-600',
  },
};

const PRIORITY_CONFIG = {
  low: {
    label: 'Low Priority',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  medium: {
    label: 'Medium Priority',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  high: {
    label: 'High Priority',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
  },
};

const STAT_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  }),
};

const CLEANING_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function CleaningPage() {
  const queryClient = useQueryClient();

  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCleaning, setSelectedCleaning] = useState<CleaningSchedule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scheduled_date: '',
    scheduled_time: '10:00',
    priority: 'medium',
    special_instructions: '',
  });

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const { data: stats, isLoading: statsLoading } = useQuery<Statistics>({
    queryKey: ['cleaning-stats'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.statistics();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['cleaning-calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.cleaning.schedules.calendar(currentYear, currentMonth);
      return response.data;
    },
  });

  const { data: cleanings, isLoading: cleaningsLoading } = useQuery<CleaningSchedule[]>({
    queryKey: ['cleaning-schedules'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.list();
      return response.data.results || response.data;
    },
    refetchInterval: 30000,
  });

  // ============================================================================
  // Mutations
  // ============================================================================

  const createCleaning = useMutation({
    mutationFn: (data: any) => api.cleaning.schedules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      setShowCreateModal(false);
      resetForm();
      toast.success('Cleaning scheduled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to schedule cleaning');
    },
  });

  const startCleaning = useMutation({
    mutationFn: (id: string) => api.cleaning.schedules.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Cleaning started');
    },
    onError: () => toast.error('Failed to start cleaning'),
  });

  const completeCleaning = useMutation({
    mutationFn: (id: string) => api.cleaning.schedules.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Cleaning completed');
    },
    onError: () => toast.error('Failed to complete cleaning'),
  });

  const toggleTask = useMutation({
    mutationFn: (taskId: string) => api.cleaning.tasks.toggleComplete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteCleaning = useMutation({
    mutationFn: (id: string) => api.cleaning.schedules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Cleaning deleted');
    },
    onError: () => toast.error('Failed to delete cleaning'),
  });

  // ============================================================================
  // Handlers & Utilities
  // ============================================================================

  const resetForm = () => {
    setFormData({
      scheduled_date: '',
      scheduled_time: '10:00',
      priority: 'medium',
      special_instructions: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCleaning.mutate({
      ...formData,
      status: 'pending',
    });
  };

  const goToPreviousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getCleaningsForDate = (date: string) => {
    if (!calendarData?.cleanings) return [];
    return calendarData.cleanings[date] || [];
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const filteredCleanings = useMemo(() => {
    if (!cleanings) return [];

    let filtered = [...cleanings];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.booking?.guest_name?.toLowerCase().includes(query) ||
          c.booking?.booking_id?.toLowerCase().includes(query) ||
          c.assigned_to_name?.toLowerCase().includes(query)
      );
    }

    // Sort by date (upcoming first)
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [cleanings, filterStatus, searchQuery]);

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#C4A572] to-amber-600 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                  Cleaning Management
                </h1>
                <p className="text-gray-600 mt-0.5">Schedule and track property cleaning tasks</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCalendar(!showCalendar)}
              className="border-gray-300 hover:bg-gray-50"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#C4A572] to-amber-600 hover:from-[#B39562] hover:to-amber-700 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Cleaning
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Today's Cleanings",
              value: stats?.today_cleanings || 0,
              icon: CalendarIcon,
              color: 'from-blue-500 to-blue-600',
              bgColor: 'bg-blue-50',
              textColor: 'text-blue-700',
            },
            {
              title: 'This Week',
              value: stats?.week_cleanings || 0,
              icon: TrendingUp,
              color: 'from-emerald-500 to-emerald-600',
              bgColor: 'bg-emerald-50',
              textColor: 'text-emerald-700',
            },
            {
              title: 'Upcoming',
              value: stats?.upcoming_count || 0,
              icon: AlertCircle,
              color: 'from-amber-500 to-amber-600',
              bgColor: 'bg-amber-50',
              textColor: 'text-amber-700',
            },
            {
              title: 'Quality Score',
              value: stats?.avg_quality_rating ? `${stats.avg_quality_rating.toFixed(1)}/5` : 'N/A',
              icon: Trophy,
              color: 'from-[#C4A572] to-amber-600',
              bgColor: 'bg-amber-50',
              textColor: 'text-amber-700',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={STAT_CARD_VARIANTS}
            >
              <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.03]`} />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                      <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Calendar Section */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-xl font-bold text-gray-900">Calendar View</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                        className="min-w-[80px]"
                      >
                        Today
                      </Button>
                      <span className="text-sm font-semibold min-w-[150px] text-center text-gray-700">
                        {monthName}
                      </span>
                      <Button variant="outline" size="sm" onClick={goToNextMonth}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {calendarLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-3 border-[#C4A572] border-t-transparent" />
                        <p className="text-sm text-gray-500">Loading calendar...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-bold text-gray-600 uppercase tracking-wide py-3"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days */}
                      {calendarDays.map((day, index) => {
                        if (day === null) {
                          return <div key={`empty-${index}`} className="aspect-square" />;
                        }

                        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayCleanings = getCleaningsForDate(dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isPast = new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);

                        return (
                          <motion.div
                            key={day}
                            whileHover={{ scale: 1.02 }}
                            className={`
                              aspect-square border-2 rounded-xl p-2 cursor-pointer transition-all
                              ${isToday
                                ? 'bg-gradient-to-br from-[#C4A572] to-amber-600 text-white border-amber-700 shadow-lg'
                                : isPast
                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                : 'bg-white border-gray-200 hover:border-[#C4A572] hover:shadow-md'
                              }
                            `}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-1">
                                <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-700'}`}>
                                  {day}
                                </span>
                                {dayCleanings.length > 0 && (
                                  <span
                                    className={`
                                      text-[10px] px-2 py-0.5 rounded-full font-bold
                                      ${isToday
                                        ? 'bg-white/30 text-white'
                                        : 'bg-[#C4A572]/20 text-[#8a6a32]'
                                      }
                                    `}
                                  >
                                    {dayCleanings.length}
                                  </span>
                                )}
                              </div>
                              {dayCleanings.length > 0 && (
                                <div className="flex-1 space-y-1 overflow-hidden">
                                  {dayCleanings.slice(0, 2).map((cleaning: any) => {
                                    const status = STATUS_CONFIG[cleaning.status as keyof typeof STATUS_CONFIG];
                                    const StatusIcon = status.icon;
                                    return (
                                      <div
                                        key={cleaning.id}
                                        className={`
                                          text-[10px] px-1.5 py-1 rounded-md flex items-center gap-1 truncate
                                          ${isToday
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700'
                                          }
                                        `}
                                        title={cleaning.booking?.guest_name || 'General Cleaning'}
                                      >
                                        <StatusIcon className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">
                                          {cleaning.booking?.booking_id || 'Cleaning'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {dayCleanings.length > 2 && (
                                    <p className={`text-[9px] pl-1 ${isToday ? 'text-white/80' : 'text-gray-500'}`}>
                                      +{dayCleanings.length - 2} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cleanings List Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C4A572]" />
                <CardTitle className="text-xl font-bold text-gray-900">Cleaning Schedule</CardTitle>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by guest or booking..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-[250px]"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Scheduled</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {cleaningsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-[#C4A572] border-t-transparent" />
                  <p className="text-sm text-gray-500">Loading cleanings...</p>
                </div>
              </div>
            ) : filteredCleanings.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl mb-4">
                  <ListTodo className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No cleanings found</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Cleanings will be automatically created for check-outs and you can manually schedule additional cleanings'}
                </p>
                {(searchQuery || filterStatus !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredCleanings.map((cleaning, index) => {
                    const status = STATUS_CONFIG[cleaning.status];
                    const priority = PRIORITY_CONFIG[cleaning.priority];
                    const StatusIcon = status.icon;
                    const completedTasks = cleaning.tasks?.filter((t) => t.is_completed).length || 0;
                    const totalTasks = cleaning.tasks?.length || 0;
                    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                    return (
                      <motion.div
                        key={cleaning.id}
                        custom={index}
                        variants={CLEANING_CARD_VARIANTS}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="group relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-6 hover:border-[#C4A572] hover:shadow-xl transition-all duration-300"
                      >
                        {/* Priority Indicator */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${priority.color.split(' ')[0]}/5 rounded-bl-[100px] -z-10`} />

                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Left Section - Main Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 ${status.color.split(' ')[0]} rounded-xl`}>
                                <StatusIcon className={`w-6 h-6 ${status.iconColor}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                      {cleaning.booking?.guest_name || 'General Cleaning'}
                                    </h3>
                                    {cleaning.booking && (
                                      <p className="text-sm text-gray-600">
                                        Booking: <span className="font-mono font-medium">{cleaning.booking.booking_id}</span>
                                      </p>
                                    )}
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setSelectedCleaning(cleaning)}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this cleaning?')) {
                                            deleteCleaning.mutate(cleaning.id);
                                          }
                                        }}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <Badge className={`${status.color} border font-medium`}>
                                    {status.label}
                                  </Badge>
                                  <Badge className={`${priority.color} border font-medium`}>
                                    {priority.label}
                                  </Badge>
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {new Date(cleaning.scheduled_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}{' '}
                                      at {cleaning.scheduled_time}
                                    </span>
                                  </div>
                                </div>

                                {cleaning.assigned_to_name && (
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="font-medium">Assigned to:</span>
                                    {cleaning.assigned_to_name}
                                  </p>
                                )}

                                {cleaning.special_instructions && (
                                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-xs font-semibold text-amber-900 mb-1">Special Instructions:</p>
                                    <p className="text-sm text-amber-800">{cleaning.special_instructions}</p>
                                  </div>
                                )}

                                {/* Progress Bar */}
                                {totalTasks > 0 && (
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">
                                        Task Progress
                                      </span>
                                      <span className="text-sm font-bold text-gray-900">
                                        {completedTasks}/{totalTasks} completed
                                      </span>
                                    </div>
                                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercentage}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C4A572] to-amber-600 rounded-full"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Task Checklist */}
                            {cleaning.tasks && cleaning.tasks.length > 0 && (
                              <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm font-semibold text-gray-900 mb-3">
                                  Cleaning Checklist
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {cleaning.tasks.map((task) => (
                                    <motion.button
                                      key={task.id}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => toggleTask.mutate(task.id)}
                                      className={`
                                        flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                                        ${task.is_completed
                                          ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-white border-gray-200 hover:border-[#C4A572]'
                                        }
                                      `}
                                    >
                                      <div
                                        className={`
                                          flex items-center justify-center w-5 h-5 rounded-lg border-2 flex-shrink-0
                                          ${task.is_completed
                                            ? 'bg-emerald-500 border-emerald-500'
                                            : 'border-gray-300'
                                          }
                                        `}
                                      >
                                        {task.is_completed && (
                                          <CheckCircle2 className="w-4 h-4 text-white" />
                                        )}
                                      </div>
                                      <span
                                        className={`
                                          text-sm font-medium
                                          ${task.is_completed
                                            ? 'line-through text-gray-500'
                                            : 'text-gray-700'
                                          }
                                        `}
                                      >
                                        {task.title}
                                      </span>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Section - Action Buttons */}
                          <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                            {cleaning.status === 'pending' || cleaning.status === 'assigned' ? (
                              <Button
                                onClick={() => startCleaning.mutate(cleaning.id)}
                                disabled={startCleaning.isPending}
                                className="flex-1 lg:flex-none bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                              >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start
                              </Button>
                            ) : cleaning.status === 'in_progress' ? (
                              <Button
                                onClick={() => completeCleaning.mutate(cleaning.id)}
                                disabled={completeCleaning.isPending}
                                className="flex-1 lg:flex-none bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Complete
                              </Button>
                            ) : cleaning.status === 'completed' && cleaning.quality_rating ? (
                              <div className="flex-1 lg:flex-none p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                                <div className="flex items-center justify-center gap-1">
                                  <Trophy className="w-4 h-4 text-amber-600" />
                                  <span className="text-sm font-bold text-amber-900">
                                    {cleaning.quality_rating.toFixed(1)}/5
                                  </span>
                                </div>
                                <p className="text-xs text-amber-700 text-center mt-1">Quality</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Cleaning Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Schedule New Cleaning</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-semibold text-gray-700">
                Time *
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-semibold text-gray-700">
                Priority *
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-sm font-semibold text-gray-700">
                Special Instructions
              </Label>
              <Textarea
                id="instructions"
                value={formData.special_instructions}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                placeholder="Any special requirements or notes for the cleaning team..."
                className="min-h-24 resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={createCleaning.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCleaning.isPending}
                className="bg-gradient-to-r from-[#C4A572] to-amber-600 hover:from-[#B39562] hover:to-amber-700 text-white"
              >
                {createCleaning.isPending ? 'Scheduling...' : 'Schedule Cleaning'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
