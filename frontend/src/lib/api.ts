/**
 * API client with axios configured for Django session authentication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Use relative URL - nginx proxies /api to Django
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF token management
let csrfToken: string | null = null;

export const getCSRFToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1];

  return cookieValue || null;
};

// Request interceptor to add CSRF token
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token for non-safe methods
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const token = getCSRFToken();
      if (token) {
        config.headers['X-CSRFToken'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  auth: {
    register: (data: any) => apiClient.post('/auth/register/', data),
    login: (credentials: any) => apiClient.post('/auth/login/', credentials),
    logout: () => apiClient.post('/auth/logout/'),
    me: () => apiClient.get('/auth/me/'),
    updateProfile: (data: any) => apiClient.patch('/auth/me/', data),
    passwordReset: (email: string) => apiClient.post('/auth/password-reset/', { email }),
    passwordResetConfirm: (data: { email: string; code: string; new_password: string }) =>
      apiClient.post('/auth/password-reset/confirm/', data),
  },

  // Referral/Invitations
  referrals: {
    getMyStats: () => apiClient.get('/referrals/me/'),
    getInvitedGuests: () => apiClient.get('/referrals/invited-guests/'),
    getReferralCredits: () => apiClient.get('/referrals/credits/'),
    getAdminStats: () => apiClient.get('/referral-stats/'), // Admin view of all referrals
  },

  // Bookings
  bookings: {
    list: (params?: any) => apiClient.get('/bookings/', { params }),
    get: (id: string) => apiClient.get(`/bookings/${id}/`),
    create: (data: any) => apiClient.post('/bookings/', data),
    update: (id: string, data: any) => apiClient.patch(`/bookings/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/bookings/${id}/`),
    checkAvailability: (checkIn: string, checkOut: string) =>
      apiClient.get('/bookings/availability/', { params: { check_in: checkIn, check_out: checkOut } }),
    sendEmail: (id: string) => apiClient.post(`/bookings/${id}/send_email/`),
    calendar: (year: number, month: number) =>
      apiClient.get('/bookings/calendar/month/', { params: { year, month } }),
    statistics: () => apiClient.get('/bookings/statistics/'),
    // Public booking lookup (no auth required)
    lookup: (confirmation: string, email: string) =>
      apiClient.post('/bookings/lookup/', { confirmation, email }),
    lookupUpdate: (confirmation: string, email: string, updates: any) =>
      apiClient.post('/bookings/lookup/update/', { confirmation, email, updates }),
    lookupCheckin: (confirmation: string, email: string, guests: any[]) =>
      apiClient.post('/bookings/lookup/checkin/', { confirmation, email, guests }),
  },

  // Blocked Dates
  blockedDates: {
    list: () => apiClient.get('/bookings/blocked-dates/'),
    create: (data: any) => apiClient.post('/bookings/blocked-dates/', data),
    delete: (id: string) => apiClient.delete(`/bookings/blocked-dates/${id}/`),
  },

  // Payments
  payments: {
    list: (params?: any) => apiClient.get('/payments/', { params }),
    get: (id: string) => apiClient.get(`/payments/${id}/`),
    createCheckoutSession: (bookingId: string) =>
      apiClient.post('/payments/create-checkout-session/', { booking_id: bookingId }),
    createPaymentIntent: (data: any) =>
      apiClient.post('/payments/create-payment-intent/', data),
    refund: (paymentId: string, data: any) =>
      apiClient.post(`/payments/${paymentId}/refund/`, data),
  },

  // Invoices
  invoices: {
    list: (params?: any) => apiClient.get('/invoices/', { params }),
    get: (id: string) => apiClient.get(`/invoices/${id}/`),
    create: (data: any) => apiClient.post('/invoices/', data),
    update: (id: string, data: any) => apiClient.patch(`/invoices/${id}/`, data),
    generatePDF: (id: string) => apiClient.post(`/invoices/${id}/generate_pdf/`),
    downloadPDF: (id: string) =>
      apiClient.get(`/invoices/${id}/download_pdf/`, { responseType: 'blob' }),
    sendEmail: (id: string) => apiClient.post(`/invoices/${id}/send_email/`),
    markSent: (id: string) => apiClient.post(`/invoices/${id}/mark_sent/`),
    markPaid: (id: string) => apiClient.post(`/invoices/${id}/mark_paid/`),
    cancel: (id: string) => apiClient.post(`/invoices/${id}/cancel/`),
    statistics: () => apiClient.get('/invoices/statistics/'),
  },

  // Pricing
  pricing: {
    getSettings: () => apiClient.get('/pricing/settings/'),
    updateSettings: (data: any) => apiClient.patch('/pricing/settings/', data),
    calculatePrice: (checkIn: string, checkOut: string, guests: number) =>
      apiClient.get('/pricing/calculate/', { params: { check_in: checkIn, check_out: checkOut, guests } }),
    listRules: (params?: any) => apiClient.get('/pricing/rules/', { params }),
    createRule: (data: any) => apiClient.post('/pricing/rules/', data),
    updateRule: (id: string, data: any) => apiClient.patch(`/pricing/rules/${id}/`, data),
    deleteRule: (id: string) => apiClient.delete(`/pricing/rules/${id}/`),
  },

  // Users (Team management)
  users: {
    guests: {
      list: (params?: any) => apiClient.get('/guests/', { params }),
      get: (id: string) => apiClient.get(`/guests/${id}/`),
      notes: (id: string) => apiClient.get(`/guests/${id}/notes/`),
      addNote: (id: string, note: string) => apiClient.post(`/guests/${id}/notes/`, { note }),
    },
    team: {
      list: (params?: any) => apiClient.get('/team/', { params }),
      create: (data: any) => apiClient.post('/team/', data),
      update: (id: string, data: any) => apiClient.patch(`/team/${id}/`, data),
      delete: (id: string) => apiClient.delete(`/team/${id}/`),
    },
    roles: {
      list: () => apiClient.get('/users/roles/'),
      get: (id: string) => apiClient.get(`/users/roles/${id}/`),
      create: (data: any) => apiClient.post('/users/roles/', data),
      update: (id: string, data: any) => apiClient.patch(`/users/roles/${id}/`, data),
      delete: (id: string) => apiClient.delete(`/users/roles/${id}/`),
      assignPermissions: (id: string, permissionCodes: string[]) =>
        apiClient.post(`/users/roles/${id}/assign-permissions/`, { permission_codes: permissionCodes }),
    },
    permissions: {
      list: () => apiClient.get('/users/permissions/'),
      byGroup: () => apiClient.get('/users/permissions/by-group/'),
    },
  },

  // Gallery
  gallery: {
    list: (params?: any) => apiClient.get('/gallery/images/', { params }),
    get: (id: string) => apiClient.get(`/gallery/images/${id}/`),
    create: (data: FormData) => apiClient.post('/gallery/images/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id: string, data: FormData | any) => {
      const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
      return apiClient.patch(`/gallery/images/${id}/`, data, { headers });
    },
    delete: (id: string) => apiClient.delete(`/gallery/images/${id}/`),
    reorder: (id: string, order: number) => apiClient.post(`/gallery/images/${id}/reorder/`, { order }),
    toggleActive: (id: string) => apiClient.post(`/gallery/images/${id}/toggle_active/`),
    // Public endpoint (no auth required)
    public: (type?: 'hero' | 'gallery') => apiClient.get('/gallery/images/public/', { params: { type } }),
  },
};

export default api;
