'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface CalendarDate {
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'check_in' | 'check_out';
  booking?: {
    id: string;
    booking_id: string;
    guest_name: string;
  };
  blocked?: {
    id: string;
    reason: string;
    notes: string;
  };
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: calendarData } = useQuery({
    queryKey: ['calendar', currentYear, currentMonth],
    queryFn: async () => {
      const response = await api.bookings.calendar(currentYear, currentMonth);
      return response.data as CalendarDate[];
    },
  });

  const { data: blockedDates } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: async () => {
      const response = await api.blockedDates.list();
      return response.data;
    },
  });

  const createBlockedDate = useMutation({
    mutationFn: (data: any) => api.blockedDates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      setIsBlockModalOpen(false);
      setSelectedDateRange(null);
      setBlockFormData({ start_date: '', end_date: '', reason: 'maintenance', notes: '' });
      alert('Dates blocked successfully');
    },
  });

  const [blockFormData, setBlockFormData] = useState({
    start_date: '',
    end_date: '',
    reason: 'maintenance',
    notes: '',
  });

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: CalendarDate) => {
    if (date.status === 'booked' && date.booking) {
      window.location.href = `/pms/bookings/${date.booking.id}`;
    } else if (date.status === 'available') {
      setSelectedDateRange({ start: date.date, end: date.date });
      setBlockFormData({
        ...blockFormData,
        start_date: date.date,
        end_date: date.date,
      });
      setIsBlockModalOpen(true);
    }
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBlockedDate.mutate(blockFormData);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const calendarDate = calendarData?.find((d) => d.date === dateStr);
      days.push({
        day,
        date: dateStr,
        calendarDate,
      });
    }

    return days;
  };

  const getDateClassName = (calendarDate?: CalendarDate) => {
    if (!calendarDate) return 'bg-white hover:bg-gray-50';

    switch (calendarDate.status) {
      case 'booked':
        return 'bg-blue-100 hover:bg-blue-200 cursor-pointer border-2 border-blue-300';
      case 'blocked':
        return 'bg-gray-200 hover:bg-gray-300 cursor-not-allowed';
      case 'check_in':
        return 'bg-green-100 hover:bg-green-200 cursor-pointer border-l-4 border-green-500';
      case 'check_out':
        return 'bg-red-100 hover:bg-red-200 cursor-pointer border-r-4 border-red-500';
      default:
        return 'bg-white hover:bg-gray-50 cursor-pointer';
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calendar View</h1>
        <p className="text-gray-600">Manage availability and view bookings</p>
      </div>

      {/* Legend */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span className="text-sm">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <span className="text-sm">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-l-4 border-green-500 rounded"></div>
              <span className="text-sm">Check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border-r-4 border-red-500 rounded"></div>
              <span className="text-sm">Check-out</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{monthName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreviousMonth}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" onClick={handleNextMonth}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayData, index) => (
              <div
                key={index}
                className={`min-h-24 p-2 border rounded-lg transition-colors ${
                  dayData ? getDateClassName(dayData.calendarDate) : 'bg-gray-50'
                }`}
                onClick={() => dayData && dayData.calendarDate && handleDateClick(dayData.calendarDate)}
              >
                {dayData && (
                  <>
                    <div className="text-sm font-semibold mb-1">{dayData.day}</div>
                    {dayData.calendarDate?.booking && (
                      <div className="text-xs">
                        <div className="font-medium truncate">{dayData.calendarDate.booking.guest_name}</div>
                        <div className="text-gray-600">{dayData.calendarDate.booking.booking_id}</div>
                      </div>
                    )}
                    {dayData.calendarDate?.blocked && (
                      <div className="text-xs text-gray-600">
                        <div className="font-medium">Blocked</div>
                        <div className="truncate">{dayData.calendarDate.blocked.reason}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Block Dates Modal */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Dates</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBlockSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={blockFormData.start_date}
                onChange={(e) => setBlockFormData({ ...blockFormData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={blockFormData.end_date}
                onChange={(e) => setBlockFormData({ ...blockFormData, end_date: e.target.value })}
                min={blockFormData.start_date}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={blockFormData.reason}
                onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                required
              >
                <option value="maintenance">Maintenance</option>
                <option value="owner_use">Owner Use</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-20"
                value={blockFormData.notes}
                onChange={(e) => setBlockFormData({ ...blockFormData, notes: e.target.value })}
                placeholder="Internal notes about why these dates are blocked..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBlockModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBlockedDate.isPending}>
                {createBlockedDate.isPending ? 'Blocking...' : 'Block Dates'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
