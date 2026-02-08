// ─── ROLES ───────────────────────────────────────────────────────────────────
export type UserRole = "creator" | "eventee";

// ─── USER ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// ─── EVENT ───────────────────────────────────────────────────────────────────
export type EventStatus = "draft" | "published" | "cancelled";

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  date: Date;
  venue: string;
  ticketPrice: number;
  capacity: number;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventDto {
  title: string;
  description: string;
  date: string; // ISO string from client
  venue: string;
  ticketPrice: number;
  capacity: number;
  reminders?: ReminderInput[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  date?: string;
  venue?: string;
  ticketPrice?: number;
  capacity?: number;
  status?: EventStatus;
}

// ─── TICKET ──────────────────────────────────────────────────────────────────
export type TicketStatus = "pending" | "paid" | "scanned" | "cancelled";

export interface Ticket {
  id: string;
  eventId: string;
  eventeeId: string;
  status: TicketStatus;
  qrToken: string | null;
  purchasedAt: Date;
}

// ─── PAYMENT ─────────────────────────────────────────────────────────────────
export type PaymentStatus = "pending" | "success" | "failed";

export interface Payment {
  id: string;
  ticketId: string;
  paystackRef: string;
  amount: number;
  status: PaymentStatus;
  paidAt: Date | null;
}

// ─── REMINDER ────────────────────────────────────────────────────────────────
export type ReminderUnit = "hour" | "day" | "week";

export interface ReminderInput {
  unit: ReminderUnit;
  value: number;
}

export interface Reminder {
  id: string;
  ticketId: string | null;
  eventId: string | null;
  userId: string;
  unit: ReminderUnit;
  value: number;
  remindAt: Date;
  sent: boolean;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
export interface CreatorAnalytics {
  totalAttendees: number;
  totalTicketsSold: number;
  totalQrScans: number;
  totalRevenue: number;
}

export interface EventAnalytics {
  eventId: string;
  ticketsSold: number;
  qrScans: number;
  revenue: number;
  showUpRate: number; // percentage: (scans / ticketsSold) * 100
}

// ─── SHARING ─────────────────────────────────────────────────────────────────
export interface ShareMeta {
  shareUrl: string;
  ogMeta: {
    title: string;
    description: string;
    url: string;
    type: string;
  };
}

// ─── PAYSTACK WEBHOOK ────────────────────────────────────────────────────────
export interface PaystackWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    metadata?: {
      ticketId?: string;
      eventId?: string;
    };
  };
}