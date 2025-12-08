/**
 * TypeScript types matching Django backend models
 */

// RBAC types
export interface Permission {
  id: string;
  code: string;
  group: string;
  description: string;
  created_at: string;
}

export interface Role {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  is_super_admin: boolean;
  is_system: boolean;
  permissions?: Permission[];
  permission_codes?: string[];
  member_count?: number;
  can_be_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoleInfo {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  is_super_admin: boolean;
  is_system: boolean;
}

// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  country?: string;
  role_info: RoleInfo;
  permissions: string[];
  is_super_admin: boolean;
  is_team_member: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Legacy User type (for backward compatibility during migration)
export interface LegacyUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'guest' | 'team' | 'admin';
  is_active: boolean;
  date_joined: string;
}

// Booking types
export interface Booking {
  id: string;
  booking_id: string;
  user?: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests: number;
  total_price: string;
  status: 'pending' | 'confirmed' | 'paid' | 'checked_in' | 'checked_out' | 'cancelled';
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

export interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_by?: string;
}

// Payment types
export interface Payment {
  id: string;
  booking: string;
  stripe_payment_intent_id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  payment: string;
  booking: string;
  stripe_refund_id: string;
  amount: string;
  reason: string;
  status: 'pending' | 'succeeded' | 'failed';
  processed_by?: string;
  created_at: string;
}

// Invoice types
export interface Invoice {
  id: string;
  invoice_number: string;
  booking: string;
  booking_id: string;
  payment?: string;
  accommodation_total: string;
  cleaning_fee: string;
  extra_guest_fee: string;
  tourist_tax: string;
  total_amount: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  pdf_url?: string;
  issued_at: string;
  sent_at?: string;
  paid_at?: string;
  due_date?: string;
  notes?: string;
  guest_name: string;
  guest_email: string;
}

// Pricing types
export interface Settings {
  default_nightly_rate: string;
  cleaning_fee: string;
  extra_guest_fee_per_person: string;
  max_guests: number;
  base_guests_included: number;
  tourist_tax_per_person_per_night: string;
  check_in_time: string;
  check_out_time: string;
  minimum_stay_nights: number;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  nightly_rate: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface PriceCalculation {
  accommodation_total: string;
  cleaning_fee: string;
  extra_guest_fee: string;
  tourist_tax: string;
  total: string;
  nightly_rate: string;
  nights: number;
}

// Email types
export interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  booking?: string;
  user?: string;
  status: 'queued' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Form types
export interface BookingFormData {
  check_in_date: Date;
  check_out_date: Date;
  guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Statistics types
export interface BookingStats {
  total_bookings: number;
  confirmed: number;
  checked_in: number;
  checked_out: number;
  cancelled: number;
  total_revenue: string;
  occupancy_rate: number;
}

export interface PaymentStats {
  total_payments: number;
  total_amount: string;
  succeeded: number;
  pending: number;
  failed: number;
}

export interface AvailabilityCheck {
  available: boolean;
  message?: string;
}

// Gallery types
export interface HeroImage {
  id: string;
  title: string;
  alt_text: string;
  image?: string;
  image_url?: string;
  url: string;
  image_type: 'hero' | 'gallery' | 'both';
  image_type_display?: string;
  order: number;
  is_active: boolean;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface HeroImagePublic {
  id: string;
  title: string;
  alt_text: string;
  url: string;
  image_type: 'hero' | 'gallery' | 'both';
  order: number;
}

// Host Profile types
export interface HostProfile {
  id: string;
  display_name: string;
  bio: string;
  languages: string;
  photo_url: string;
  is_superhost: boolean;
  review_count: number;
  updated_at: string;
}
