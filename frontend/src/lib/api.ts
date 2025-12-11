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
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return cookieValue || null;
  } catch (error) {
    // Malformed cookies or inaccessible document.cookie
    console.warn('CSRF token unavailable', error);
    return null;
  }
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

  // Host profile
  host: {
    get: () => apiClient.get('/host-profile/'),
    update: (id: string | number, data: any) => apiClient.patch(`/host-profile/${id}/`, data),
  },

  // Reviews (Public + PMS)
  reviews: {
    // Public endpoints
    list: (params?: any) => apiClient.get('/reviews/', { params }),
    get: (id: string) => apiClient.get(`/reviews/${id}/`),

    // Guest submission (public, no auth)
    submit: (data: any) => apiClient.post('/reviews/submit/', data),
    verifyToken: (token: string, bookingCode: string) =>
      apiClient.get(`/reviews/verify-token/${token}/`, { params: { booking_code: bookingCode } }),

    // Staff management (requires permissions)
    create: (data: any) => apiClient.post('/reviews/', data),
    update: (id: string, data: any) => apiClient.patch(`/reviews/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/reviews/${id}/`),

    // Approval workflow
    approve: (id: string) => apiClient.post(`/reviews/${id}/approve/`),
    reject: (id: string, reason: string) =>
      apiClient.post(`/reviews/${id}/reject/`, { rejection_reason: reason }),

    // Additional actions
    toggleFeatured: (id: string) => apiClient.post(`/reviews/${id}/toggle-featured/`),
    statistics: () => apiClient.get('/reviews/statistics/'),
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
    getBlockedDates: () => apiClient.get('/bookings/blocked-dates-public/'),
    sendEmail: (id: string) => apiClient.post(`/bookings/${id}/send_email/`),
    downloadPDF: (id: string) =>
      apiClient.get(`/bookings/${id}/download-pdf/`, { responseType: 'blob' }),
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
    completeCheckin: (id: string, data: any) =>
      apiClient.post(`/bookings/${id}/complete_checkin/`, data),
    resumeCheckin: (id: string, email: string) =>
      apiClient.post(`/bookings/${id}/resume_checkin/`, { email }),
    // Booking Guests management
    guests: {
      list: (bookingId: string) => apiClient.get(`/bookings/${bookingId}/guests/`),
      create: (bookingId: string, data: any) => apiClient.post(`/bookings/${bookingId}/guests/`, data),
      update: (bookingId: string, guestId: string, data: any) =>
        apiClient.patch(`/bookings/${bookingId}/guests/${guestId}/`, data),
      delete: (bookingId: string, guestId: string) =>
        apiClient.delete(`/bookings/${bookingId}/guests/${guestId}/`),
    },
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
    confirmCheckoutSession: (sessionId: string, bookingId?: string) =>
      apiClient.post('/payments/confirm-session/', { session_id: sessionId, booking_id: bookingId }),
    createCityTaxSession: (bookingId: string) =>
      apiClient.post('/payments/create-city-tax-session/', { booking_id: bookingId }),
    confirmCityTaxSession: (sessionId: string, bookingId?: string) =>
      apiClient.post('/payments/confirm-city-tax-session/', { session_id: sessionId, booking_id: bookingId }),
    createPaymentIntent: (data: any) =>
      apiClient.post('/payments/create-payment-intent/', data),
    refund: (paymentId: string, data: any) =>
      apiClient.post(`/payments/${paymentId}/refund/`, data),
  },

  // Payment Requests
  paymentRequests: {
    list: (params?: any) => apiClient.get('/payments/requests/', { params }),
    get: (id: string) => apiClient.get(`/payments/requests/${id}/`),
    create: (data: any) => apiClient.post('/payments/requests/', data),
    update: (id: string, data: any) => apiClient.patch(`/payments/requests/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/payments/requests/${id}/`),
    sendEmail: (id: string) => apiClient.post(`/payments/requests/${id}/send_email/`),
    markPaid: (id: string) => apiClient.post(`/payments/requests/${id}/mark_paid/`),
    cancelRequest: (id: string) => apiClient.post(`/payments/requests/${id}/cancel_request/`),
    statistics: () => apiClient.get('/payments/requests/statistics/'),
  },

  // Invoices
  invoices: {
    list: (params?: any) => apiClient.get('/invoices/', { params }),
    get: (id: string) => apiClient.get(`/invoices/${id}/`),
    create: (data: any) => apiClient.post('/invoices/', data),
    update: (id: string, data: any) => apiClient.patch(`/invoices/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/invoices/${id}/`),
    generatePDF: (id: string) => apiClient.post(`/invoices/${id}/generate_pdf/`),
    downloadPDF: (id: string) =>
      apiClient.get(`/invoices/${id}/download_pdf/`, { responseType: 'blob' }),
    sendEmail: (id: string, data?: { email?: string }) => apiClient.post(`/invoices/${id}/send_email/`, data),
    markSent: (id: string) => apiClient.post(`/invoices/${id}/mark_sent/`),
    markPaid: (id: string) => apiClient.post(`/invoices/${id}/mark_paid/`),
    cancel: (id: string) => apiClient.post(`/invoices/${id}/cancel/`),
    statistics: () => apiClient.get('/invoices/statistics/'),
  },

  // Companies (for invoices)
  companies: {
    list: () => apiClient.get('/invoices/companies/'),
    create: (data: any) => apiClient.post('/invoices/companies/', data),
    update: (id: string, data: any) => apiClient.patch(`/invoices/companies/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/invoices/companies/${id}/`),
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
    // Promotions
    listPromotions: (params?: any) => apiClient.get('/pricing/promotions/', { params }),
    getPromotion: (id: string) => apiClient.get(`/pricing/promotions/${id}/`),
    createPromotion: (data: any) => apiClient.post('/pricing/promotions/', data),
    updatePromotion: (id: string, data: any) => apiClient.patch(`/pricing/promotions/${id}/`, data),
    deletePromotion: (id: string) => apiClient.delete(`/pricing/promotions/${id}/`),
    getPromotionUsage: (id: string) => apiClient.get(`/pricing/promotions/${id}/usage/`),
    // Vouchers
    listVouchers: (params?: any) => apiClient.get('/pricing/vouchers/', { params }),
    getVoucher: (id: string) => apiClient.get(`/pricing/vouchers/${id}/`),
    createVoucher: (data: any) => apiClient.post('/pricing/vouchers/', data),
    updateVoucher: (id: string, data: any) => apiClient.patch(`/pricing/vouchers/${id}/`, data),
    deleteVoucher: (id: string) => apiClient.delete(`/pricing/vouchers/${id}/`),
    getVoucherUsage: (id: string) => apiClient.get(`/pricing/vouchers/${id}/usage/`),
    // Validation (public endpoint)
    validatePromoCode: (code: string, bookingAmount?: number) =>
      apiClient.post('/pricing/validate-promo/', { code, booking_amount: bookingAmount }),
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

  // Host Profile
  hostProfile: {
    get: () => apiClient.get('/host-profile/'),
    getById: (id: string) => apiClient.get(`/host-profile/${id}/`),
    update: (id: string, data: any) => apiClient.patch(`/host-profile/${id}/`, data),
    updateWithFile: (id: string, formData: FormData) =>
      apiClient.patch(`/host-profile/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  // OTA Bookings
  otaBookings: {
    list: (params?: any) => apiClient.get('/ota/bookings/', { params }),
    get: (id: string) => apiClient.get(`/ota/bookings/${id}/`),
    create: (data: any) => apiClient.post('/ota/bookings/', data),
    update: (id: string, data: any) => apiClient.patch(`/ota/bookings/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/ota/bookings/${id}/`),
    statistics: () => apiClient.get('/ota/bookings/statistics/'),
  },

  // iCal Sources
  icalSources: {
    list: () => apiClient.get('/ota/ical-sources/'),
    get: (id: string) => apiClient.get(`/ota/ical-sources/${id}/`),
    create: (data: any) => apiClient.post('/ota/ical-sources/', data),
    update: (id: string, data: any) => apiClient.patch(`/ota/ical-sources/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/ota/ical-sources/${id}/`),
    sync: (id: string) => apiClient.post(`/ota/ical-sources/${id}/sync/`),
    syncAll: () => apiClient.post('/ota/ical-sources/sync-all/'),
  },

  // Alloggiati (Italian Police Reporting)
  alloggiati: {
    getAccount: () => apiClient.get('/alloggiati/account/'),
    saveCredentials: (data: { username: string; password: string }) =>
      apiClient.post('/alloggiati/account/save_credentials/', data),
    refreshToken: () => apiClient.post('/alloggiati/account/refresh_token/'),
    submitToPolice: (bookingId: string) =>
      apiClient.post(`/alloggiati/submit/${bookingId}/`),
    generatePDF: (bookingId: string) =>
      apiClient.get(`/alloggiati/pdf/${bookingId}/`, { responseType: 'blob' }),
  },

  // Cleaning Management
  cleaning: {
    schedules: {
      list: (params?: any) => apiClient.get('/cleaning/schedules/', { params }),
      get: (id: string) => apiClient.get(`/cleaning/schedules/${id}/`),
      create: (data: any) => apiClient.post('/cleaning/schedules/', data),
      update: (id: string, data: any) => apiClient.patch(`/cleaning/schedules/${id}/`, data),
      delete: (id: string) => apiClient.delete(`/cleaning/schedules/${id}/`),
      assign: (id: string, userId: string) =>
        apiClient.post(`/cleaning/schedules/${id}/assign/`, { user_id: userId }),
      start: (id: string) => apiClient.post(`/cleaning/schedules/${id}/start/`),
      complete: (id: string, data?: any) =>
        apiClient.post(`/cleaning/schedules/${id}/complete/`, data),
      inspect: (id: string, data: { quality_rating: number; inspection_notes?: string }) =>
        apiClient.post(`/cleaning/schedules/${id}/inspect/`, data),
      statistics: () => apiClient.get('/cleaning/schedules/statistics/'),
      calendar: (year: number, month: number) =>
        apiClient.get('/cleaning/schedules/calendar/', { params: { year, month } }),
    },
    tasks: {
      list: (params?: any) => apiClient.get('/cleaning/tasks/', { params }),
      get: (id: string) => apiClient.get(`/cleaning/tasks/${id}/`),
      create: (data: any) => apiClient.post('/cleaning/tasks/', data),
      update: (id: string, data: any) => apiClient.patch(`/cleaning/tasks/${id}/`, data),
      delete: (id: string) => apiClient.delete(`/cleaning/tasks/${id}/`),
      toggleComplete: (id: string) => apiClient.post(`/cleaning/tasks/${id}/toggle_complete/`),
    },
  },

  // Expense Management
  expenses: {
    list: (params?: any) => apiClient.get('/expenses/', { params }),
    get: (id: string) => apiClient.get(`/expenses/${id}/`),
    create: (data: any) => apiClient.post('/expenses/', data),
    update: (id: string, data: any) => apiClient.patch(`/expenses/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/expenses/${id}/`),
    approve: (id: string) => apiClient.post(`/expenses/${id}/approve/`),
    reject: (id: string, reason?: string) =>
      apiClient.post(`/expenses/${id}/reject/`, { reason }),
    statistics: () => apiClient.get('/expenses/statistics/'),
  },
};

export default api;
