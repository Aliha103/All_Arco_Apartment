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
  User,
  Trash2,
  Edit,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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

// ============================================================================
// Types
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
  assigned_to?: string;
  assigned_to_name?: string;
  special_instructions?: string;
  tasks: CleaningTask[];
  created_at?: string;
  updated_at?: string;
}

interface CleaningTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  is_completed: boolean;
  order: number;
}

interface FormData {
  booking?: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  priority: string;
  assigned_to?: string;
  special_instructions: string;
}

// ============================================================================
// Configuration
// ============================================================================

const STATUS_CONFIG = {
  pending: { label: 'Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: Clock },
  assigned: { label: 'Assigned', color: 'bg-blue-50 text-blue-700 border-blue-300', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-purple-50 text-purple-700 border-purple-300', icon: ClipboardCheck },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-700 border-gray-300', icon: AlertCircle },
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

  // State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<FormData>({
    scheduled_date: '',
    scheduled_time: '10:00',
    status: 'pending',
    priority: 'medium',
    special_instructions: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  // ============================================================================
  // Queries
  // ============================================================================

  const { data: stats } = useQuery({
    queryKey: ['cleaning-stats'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.statistics();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: cleanings, isLoading: loadingCleanings } = useQuery<CleaningSchedule[]>({
    queryKey: ['cleaning-schedules'],
    queryFn: async () => {
      const response = await api.cleaning.schedules.list();
      return response.data.results || response.data;
    },
    refetchInterval: 30000,
  });

  const { data: calendarData, isLoading: loadingCalendar } = useQuery({
    queryKey: ['cleaning-calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.cleaning.schedules.calendar(currentYear, currentMonth);
      return response.data;
    },
  });

  const { data: staffMembers } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const response = await api.users.team.list();
      return response.data.results || response.data;
    },
  });

  const { data: upcomingBookings } = useQuery({
    queryKey: ['upcoming-bookings'],
    queryFn: async () => {
      const response = await api.bookings.list({ status: 'confirmed,paid,checked_in' });
      return response.data.results || response.data;
    },
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
      resetForm();
      setShowModal(false);
      toast.success('Cleaning scheduled successfully');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to schedule cleaning');
    },
  });

  const updateCleaning = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.cleaning.schedules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      resetForm();
      setShowModal(false);
      setEditingId(null);
      toast.success('Cleaning updated successfully');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        setFormErrors(errorData);
      }
      toast.error(errorData?.message || 'Failed to update cleaning');
    },
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

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.cleaning.schedules.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['cleaning-stats'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const toggleTask = useMutation({
    mutationFn: (taskId: string) => api.cleaning.tasks.toggleComplete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
    },
    onError: () => toast.error('Failed to update task'),
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const resetForm = () => {
    setFormData({
      scheduled_date: '',
      scheduled_time: '10:00',
      status: 'pending',
      priority: 'medium',
      special_instructions: '',
    });
    setFormErrors({});
    setEditingId(null);
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.scheduled_date) errors.scheduled_date = 'Date is required';
    if (!formData.scheduled_time) errors.scheduled_time = 'Time is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      updateCleaning.mutate({ id: editingId, data: formData });
    } else {
      createCleaning.mutate(formData);
    }
  };

  const handleEdit = (cleaning: CleaningSchedule) => {
    setFormData({
      booking: cleaning.booking?.id,
      scheduled_date: cleaning.scheduled_date,
      scheduled_time: cleaning.scheduled_time,
      status: cleaning.status,
      priority: cleaning.priority,
      assigned_to: cleaning.assigned_to,
      special_instructions: cleaning.special_instructions || '',
    });
    setEditingId(cleaning.id);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cleaning?')) {
      deleteCleaning.mutate(id);
    }
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

  // ============================================================================
  // Computed
  // ============================================================================

  const filteredCleanings = useMemo(() => {
    if (!cleanings) return [];
    let filtered = [...cleanings];

    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.booking?.guest_name?.toLowerCase().includes(query) ||
          c.booking?.booking_id?.toLowerCase().includes(query) ||
          c.assigned_to_name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [cleanings, filterStatus, searchQuery]);

  const getCleaningsForDate = (date: string) => {
    if (!calendarData?.cleanings) return [];
    return calendarData.cleanings[date] || [];
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cleaning Management</h1>
            <p className="text-gray-600 mt-1">Schedule and track property cleanings</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {showCalendar ? 'Hide' : 'Show'} Calendar
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Cleaning
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.today_cleanings || 0}</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.week_cleanings || 0}</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.upcoming_count || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.status_breakdown?.completed || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        {showCalendar && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <span className="text-sm font-medium min-w-[150px] text-center">
                    {monthName}
                  </span>
                  <Button variant="outline" size="sm" onClick={goToNextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingCalendar ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-bold text-gray-600 py-2"
                    >
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} />;
                    }

                    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayCleanings = getCleaningsForDate(dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                      <div
                        key={day}
                        className={`
                          min-h-[80px] border-2 rounded-lg p-2 cursor-pointer transition-all
                          ${isToday
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        <div className="font-semibold text-sm text-gray-900">{day}</div>
                        {dayCleanings.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {dayCleanings.slice(0, 2).map((cleaning: any) => {
                              const config = STATUS_CONFIG[cleaning.status as keyof typeof STATUS_CONFIG];
                              return (
                                <div
                                  key={cleaning.id}
                                  className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}
                                  title={cleaning.booking?.guest_name || 'Cleaning'}
                                >
                                  {cleaning.scheduled_time}
                                </div>
                              );
                            })}
                            {dayCleanings.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayCleanings.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cleanings List */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Cleaning Schedule</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full sm:w-[200px] text-gray-900 bg-white border-gray-300"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] text-gray-900 bg-white border-gray-300">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
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
            {loadingCleanings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredCleanings.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No cleanings found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Schedule your first cleaning'}
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
                {filteredCleanings.map((cleaning) => {
                  const statusConfig = STATUS_CONFIG[cleaning.status];
                  const priorityConfig = PRIORITY_CONFIG[cleaning.priority];
                  const StatusIcon = statusConfig.icon;
                  const completedTasks = cleaning.tasks?.filter((t) => t.is_completed).length || 0;
                  const totalTasks = cleaning.tasks?.length || 0;

                  return (
                    <div
                      key={cleaning.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">
                                {cleaning.booking?.guest_name || 'General Cleaning'}
                              </h3>
                              {cleaning.booking && (
                                <p className="text-sm text-gray-600">
                                  Booking: {cleaning.booking.booking_id}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(cleaning)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(cleaning.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className={`${statusConfig.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <Badge className={`${priorityConfig.color} border`}>
                              {priorityConfig.label}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {new Date(cleaning.scheduled_date).toLocaleDateString()} at{' '}
                              {cleaning.scheduled_time}
                            </div>
                          </div>

                          {cleaning.assigned_to_name && (
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">Assigned to:</span>
                              {cleaning.assigned_to_name}
                            </p>
                          )}

                          {cleaning.special_instructions && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-amber-900 mb-1">
                                Special Instructions:
                              </p>
                              <p className="text-sm text-amber-800">
                                {cleaning.special_instructions}
                              </p>
                            </div>
                          )}

                          {totalTasks > 0 && (
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium text-gray-700">Tasks</span>
                                <span className="font-bold text-gray-900">
                                  {completedTasks}/{totalTasks}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{
                                    width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cleaning.tasks.map((task) => (
                                  <button
                                    key={task.id}
                                    onClick={() => toggleTask.mutate(task.id)}
                                    className={`
                                      flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left
                                      ${task.is_completed
                                        ? 'bg-emerald-50 border-emerald-300'
                                        : 'bg-white border-gray-300 hover:border-blue-300'
                                      }
                                    `}
                                  >
                                    <div
                                      className={`
                                        w-5 h-5 rounded border-2 flex items-center justify-center
                                        ${task.is_completed
                                          ? 'bg-emerald-500 border-emerald-500'
                                          : 'border-gray-400'
                                        }
                                      `}
                                    >
                                      {task.is_completed && (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      )}
                                    </div>
                                    <span
                                      className={`text-sm font-medium ${
                                        task.is_completed
                                          ? 'line-through text-gray-500'
                                          : 'text-gray-700'
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex lg:flex-col gap-2 lg:min-w-[120px]">
                          {cleaning.status === 'pending' || cleaning.status === 'assigned' ? (
                            <Button
                              onClick={() => updateStatus.mutate({ id: cleaning.id, status: 'in_progress' })}
                              className="flex-1 lg:flex-none bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Start
                            </Button>
                          ) : cleaning.status === 'in_progress' ? (
                            <Button
                              onClick={() => updateStatus.mutate({ id: cleaning.id, status: 'completed' })}
                              className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Complete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Cleaning' : 'Schedule New Cleaning'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update cleaning details' : 'Schedule a new cleaning task'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Booking (Optional)</Label>
              <Select
                value={formData.booking || ''}
                onValueChange={(value) => handleChange('booking', value || undefined)}
              >
                <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                  <SelectValue placeholder="Select booking (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="">No booking (general cleaning)</SelectItem>
                  {upcomingBookings?.map((booking: any) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.guest_name} - {booking.booking_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Date *</Label>
                <Input
                  type="date"
                  className="text-gray-900 bg-white border-gray-300"
                  value={formData.scheduled_date}
                  onChange={(e) => handleChange('scheduled_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {formErrors.scheduled_date && (
                  <p className="text-xs text-red-600">{formErrors.scheduled_date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Time *</Label>
                <Input
                  type="time"
                  className="text-gray-900 bg-white border-gray-300"
                  value={formData.scheduled_time}
                  onChange={(e) => handleChange('scheduled_time', e.target.value)}
                />
                {formErrors.scheduled_time && (
                  <p className="text-xs text-red-600">{formErrors.scheduled_time}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-900 font-medium">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange('priority', value)}
                >
                  <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Scheduled</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Assign to Staff</Label>
              <Select
                value={formData.assigned_to || ''}
                onValueChange={(value) => handleChange('assigned_to', value || undefined)}
              >
                <SelectTrigger className="text-gray-900 bg-white border-gray-300">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {staffMembers?.map((staff: any) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Special Instructions</Label>
              <Textarea
                className="text-gray-900 bg-white border-gray-300"
                value={formData.special_instructions}
                onChange={(e) => handleChange('special_instructions', e.target.value)}
                placeholder="Any special requirements or notes..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={createCleaning.isPending || updateCleaning.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCleaning.isPending || updateCleaning.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createCleaning.isPending || updateCleaning.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingId ? 'Updating...' : 'Scheduling...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Cleaning' : 'Schedule Cleaning'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
