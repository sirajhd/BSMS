// System Roles
export type Role =
  | 'SUPER_ADMIN'
  | 'SHOP_OWNER'
  | 'MANAGER'
  | 'BARBER'
  | 'CUSTOMER'
  | 'ADMIN';

// Tenant Status
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

// Subscription Status
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED';

// Plan Billing Interval
export type PlanInterval = 'MONTHLY' | 'YEARLY';

// Tenant Configuration & Branding
export interface TenantSettings {
  id: string;
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  bookingNoticeHours: number;
  maxAdvanceBookingDays: number;
  cancellationCutoffHours: number;
  allowWalkIns: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Tenant Entity (Barber Business)
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status: TenantStatus;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  settings?: TenantSettings;
  plan?: {
    name: string;
    slug: string;
    features?: string;
  };
}

// User Membership in a Tenant
export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    logo?: string;
  };
}

// Appointment Status Lifecycle
export type AppointmentStatus =
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LATE'
  | 'NO_SHOW'
  | 'RESCHEDULED';

// Payment Enums
export type PaymentMethod = 'ONLINE' | 'PAY_AT_SHOP';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

// Core User Account
export interface User {
  id: string;
  email: string;
  role: Role; // Effective active role
  platformRole?: Role; // Global platform role
  isActive: boolean;
  activeTenantId?: string;
  memberships?: Membership[];
  createdAt: string;
  updatedAt: string;
}

// Customer Profile
export interface CustomerProfile {
  id: string;
  userId: string;
  tenantId?: string;
  fullName: string;
  phone: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

// Barber Profile
export interface Barber {
  id: string;
  userId: string;
  tenantId?: string;
  fullName: string;
  phone: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  availability?: BarberAvailability[];
}

// Service Definition (Pricing strictly in ETB)
export interface Service {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  price: number; // Stored as ETB
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Weekly Day Indices (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Overall Shop Working Hours
export interface BusinessSchedule {
  id: string;
  tenantId?: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;  // e.g. "08:30" (24h HH:mm)
  closeTime: string; // e.g. "19:00" (24h HH:mm)
}

// Barber Availability Windows (Must fall within BusinessSchedule)
export interface BarberAvailability {
  id: string;
  barberId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
}

// Appointment Data Model
export interface Appointment {
  id: string;
  tenantId?: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  appointmentDate: string; // Format: "YYYY-MM-DD"
  startTime: string;       // Format: "HH:mm"
  endTime: string;         // Calculated by backend via service duration
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Joined presentation fields for UI scannability
  customer?: CustomerProfile;
  barber?: Barber;
  service?: Service;
  payment?: Payment;
}

// Payment Transaction Model
export interface Payment {
  id: string;
  tenantId?: string;
  appointmentId: string;
  amount: number; // ETB
  method: PaymentMethod;
  status: PaymentStatus;
  provider: 'GREY' | 'MANUAL';
  transactionReference?: string;
  createdAt: string;
  updatedAt: string;
}

// In-App Notification
export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'PAYMENT_SUCCESSFUL'
  | 'PAYMENT_FAILED'
  | 'STATUS_CHANGED'
  | 'LATE_STATUS'
  | 'NO_SHOW_STATUS'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: string;
  tenantId?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

// SaaS Plan Definition
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  interval: PlanInterval;
  maxBarbers: number;
  maxMonthlyAppointments: number;
  features?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

// Tenant Subscription
export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  plan?: Plan;
}

// Audit Log Entry
export interface AuditLog {
  id: string;
  tenantId?: string;
  actorUserId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string };
  actorUser?: { id: string; email: string; role: Role };
}

// Platform Overview Statistics
export interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalAppointments: number;
  totalRevenue: number;
  recentTenants: Tenant[];
}

// Standard Standardized API Response Shell
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: Record<string, string[]>;
}

// Slot Search & Selection Model
export interface AvailableTimeSlot {
  time: string; // "09:00"
  available: boolean;
  reason?: string;
}