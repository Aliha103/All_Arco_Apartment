export interface Notification {
  id: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'booking_modified' | 'booking_checked_in' | 'booking_checked_out' | 'payment_received' | 'payment_due' | 'date_blocked' | 'system';
  title: string;
  message: string;
  booking_id?: string | null;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationCounts {
  unread_count: number;
}
