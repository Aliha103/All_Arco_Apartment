'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckSquare,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Types
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

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};

const statusIcons = {
  pending: Clock,
  assigned: Users,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export default function CleaningPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCleaning, setSelectedCleaning] = useState<CleaningSchedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  // Fetch statistics
  const { data: stats } = useQuery<Statistics>({
    queryKey: ['cleaning-stats'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.statistics();
      return response.data;
    },
  });

  // Fetch calendar data for current month
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['cleaning-calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.cleaning.schedules.calendar(currentYear, currentMonth);
      return response.data;
    },
  });

  // Fetch all cleanings for the list view
  const { data: cleanings } = useQuery<CleaningSchedule[]>({
    queryKey: ['cleaning-schedules'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.list();
      return response.data.results || response.data;
    },
  });

  // Mutation to start cleaning
  const startCleaning = useMutation({
    mutationFn: (id: string) => api.cleaning.schedules.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Cleaning started successfully!');
    },
    onError: () => {
      toast.error('Failed to start cleaning');
    },
  });

  // Mutation to complete cleaning
  const completeCleaning = useMutation({
    mutationFn: (id: string) => api.cleaning.schedules.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Cleaning completed successfully!');
    },
    onError: () => {
      toast.error('Failed to complete cleaning');
    },
  });

  // Mutation to toggle task completion
  const toggleTask = useMutation({
    mutationFn: (taskId: string) => api.cleaning.tasks.toggleComplete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      toast.success('Task updated!');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  // Navigation functions
  const goToPreviousMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get cleanings for a specific date
  const getCleaningsForDate = (date: string) => {
    if (!calendarData?.cleanings) return [];
    return calendarData.cleanings[date] || [];
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 md:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#C4A572] to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-[#C4A572]" />
              Cleaning Management
            </h1>
            <p className="text-gray-600 mt-1">Manage cleaning schedules and tasks efficiently</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#C4A572] hover:bg-[#B39562] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Cleaning
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Today's Cleanings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stats?.today_cleanings || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stats?.week_cleanings || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stats?.upcoming_count || 0}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-l-4 border-l-[#C4A572]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Avg Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.avg_quality_rating ? `${stats.avg_quality_rating.toFixed(1)}/5` : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#C4A572]" />
                  Cleaning Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <span className="text-sm font-medium min-w-[160px] text-center">{monthName}</span>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {calendarLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C4A572]"></div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-gray-600 py-2"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayCleanings = getCleaningsForDate(dateStr);
                    const isToday =
                      new Date().toISOString().split('T')[0] === dateStr;

                    return (
                      <motion.div
                        key={day}
                        whileHover={{ scale: 1.05 }}
                        className={`aspect-square border rounded-lg p-2 cursor-pointer transition-all ${
                          isToday
                            ? 'bg-[#C4A572] text-white border-[#C4A572]'
                            : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => {
                          if (dayCleanings.length > 0) {
                            setSelectedCleaning(dayCleanings[0]);
                          }
                        }}
                      >
                        <div className="text-sm font-medium">{day}</div>
                        {dayCleanings.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {dayCleanings.slice(0, 2).map((cleaning: CleaningSchedule) => {
                              const StatusIcon = statusIcons[cleaning.status];
                              return (
                                <div
                                  key={cleaning.id}
                                  className={`text-xs px-1 py-0.5 rounded flex items-center gap-1 ${
                                    isToday
                                      ? 'bg-white/20 text-white'
                                      : statusColors[cleaning.status]
                                  }`}
                                  title={cleaning.booking?.guest_name || 'Cleaning'}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  <span className="truncate text-[10px]">
                                    {cleaning.scheduled_time}
                                  </span>
                                </div>
                              );
                            })}
                            {dayCleanings.length > 2 && (
                              <div
                                className={`text-[10px] ${
                                  isToday ? 'text-white' : 'text-gray-500'
                                }`}
                              >
                                +{dayCleanings.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cleaning List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#C4A572]" />
                Cleaning Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cleanings?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No cleanings scheduled</p>
                ) : (
                  cleanings?.map((cleaning) => {
                    const StatusIcon = statusIcons[cleaning.status];
                    return (
                      <motion.div
                        key={cleaning.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-3">
                              <StatusIcon className="w-5 h-5 mt-0.5 text-gray-600" />
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                  {cleaning.booking?.guest_name || 'General Cleaning'}
                                </h3>
                                {cleaning.booking && (
                                  <p className="text-sm text-gray-600">
                                    Booking: {cleaning.booking.booking_id}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge className={statusColors[cleaning.status]}>
                                    {cleaning.status}
                                  </Badge>
                                  <Badge className={priorityColors[cleaning.priority]}>
                                    {cleaning.priority} priority
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    {new Date(cleaning.scheduled_date).toLocaleDateString()} at{' '}
                                    {cleaning.scheduled_time}
                                  </span>
                                </div>
                                {cleaning.assigned_to_name && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Assigned to: {cleaning.assigned_to_name}
                                  </p>
                                )}
                                {cleaning.task_completion_rate !== undefined && (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-[#C4A572] h-2 rounded-full transition-all"
                                          style={{ width: `${cleaning.task_completion_rate}%` }}
                                        />
                                      </div>
                                      <span className="text-sm text-gray-600">
                                        {Math.round(cleaning.task_completion_rate)}%
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex lg:flex-col gap-2">
                            {cleaning.status === 'assigned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startCleaning.mutate(cleaning.id)}
                                disabled={startCleaning.isPending}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {cleaning.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => completeCleaning.mutate(cleaning.id)}
                                disabled={completeCleaning.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCleaning(cleaning)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>

                        {/* Task Checklist Preview */}
                        {cleaning.tasks && cleaning.tasks.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Tasks ({cleaning.tasks.filter((t) => t.is_completed).length}/
                              {cleaning.tasks.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {cleaning.tasks.slice(0, 6).map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <button
                                    onClick={() => toggleTask.mutate(task.id)}
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                      task.is_completed
                                        ? 'bg-[#C4A572] border-[#C4A572]'
                                        : 'border-gray-300 hover:border-[#C4A572]'
                                    }`}
                                  >
                                    {task.is_completed && (
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                  <span
                                    className={`flex-1 ${
                                      task.is_completed
                                        ? 'line-through text-gray-500'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {cleaning.tasks.length > 6 && (
                              <p className="text-sm text-gray-500 mt-2">
                                +{cleaning.tasks.length - 6} more tasks
                              </p>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
