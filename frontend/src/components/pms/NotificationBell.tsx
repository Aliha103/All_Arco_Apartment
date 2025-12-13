'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, CheckCheck, X } from 'lucide-react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { Notification, NotificationCounts } from '@/types/notification';
import Link from 'next/link';

const smoothEase = [0.22, 1, 0.36, 1] as const;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.notifications.unreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.notifications.list({ limit: 50 });
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.notifications.delete(id);
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.notifications.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return '✓';
      case 'booking_cancelled':
        return '✗';
      case 'booking_modified':
        return '✎';
      case 'booking_checked_in':
        return '→';
      case 'booking_checked_out':
        return '←';
      case 'payment_received':
        return '€';
      case 'payment_due':
        return '€';
      case 'date_blocked':
        return '⊗';
      default:
        return 'ℹ';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A572]"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: smoothEase }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-[#C4A572]"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-red-600"
                    title="Clear all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-[#C4A572] rounded-full animate-spin"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      !notification.is_read ? 'bg-blue-50/50' : 'bg-white'
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                            !notification.is_read
                              ? 'bg-gradient-to-br from-[#C4A572] to-[#B39562] text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <Badge variant="default" className="flex-shrink-0 bg-blue-600 text-[10px] px-1.5 py-0">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{formatTime(notification.created_at)}</span>
                            <div className="flex items-center gap-1">
                              {notification.booking_id && (
                                <Link
                                  href={`/pms/bookings?search=${notification.booking_id}`}
                                  className="text-xs text-[#C4A572] hover:text-[#B39562] font-medium"
                                  onClick={() => setIsOpen(false)}
                                >
                                  View
                                </Link>
                              )}
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-[#C4A572] transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notification.id)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
