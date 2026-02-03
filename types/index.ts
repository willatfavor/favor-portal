export type ConstituentType = 
  | 'individual' 
  | 'major_donor' 
  | 'church' 
  | 'foundation' 
  | 'daf' 
  | 'ambassador' 
  | 'volunteer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  blackbaudConstituentId?: string;
  constituentType: ConstituentType;
  lifetimeGivingTotal: number;
  rddAssignment?: string;
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface Gift {
  id: string;
  userId: string;
  amount: number;
  date: string;
  designation: string;
  blackbaudGiftId?: string;
  isRecurring: boolean;
  receiptSent: boolean;
  source?: 'imported' | 'portal';
}

export interface RecurringGift {
  id: string;
  userId: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual';
  nextChargeDate: string;
  stripeSubscriptionId: string;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
}

export interface CommunicationPreferences {
  id: string;
  userId: string;
  
  // Email preferences
  emailNewsletterWeekly: boolean;
  emailNewsletterMonthly: boolean;
  emailQuarterlyReport: boolean;
  emailAnnualReport: boolean;
  emailEvents: boolean;
  emailPrayer: boolean;
  emailGivingConfirmations: boolean;
  
  // SMS preferences
  smsEnabled: boolean;
  smsGiftConfirmations: boolean;
  smsEventReminders: boolean;
  smsUrgentOnly: boolean;
  
  // Direct mail preferences
  mailEnabled: boolean;
  mailNewsletterQuarterly: boolean;
  mailAnnualReport: boolean;
  mailHolidayCard: boolean;
  mailAppeals: boolean;
  
  blackbaudSolicitCodes: string[];
  lastSyncedAt?: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  accessLevel: 'partner' | 'major_donor' | 'church' | 'foundation' | 'ambassador';
  sortOrder: number;
  createdAt: string;
  moduleCount?: number;
  status?: 'draft' | 'published';
  isLocked?: boolean;
  isPaid?: boolean;
  price?: number;
  tags?: string[];
  coverImage?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  cloudflareVideoId: string;
  sortOrder: number;
  durationSeconds: number;
  type?: 'video' | 'reading' | 'quiz';
  resourceUrl?: string;
  notes?: string;
}

export interface UserCourseProgress {
  id: string;
  userId: string;
  moduleId: string;
  completed: boolean;
  completedAt?: string;
  watchTimeSeconds: number;
  lastWatchedAt?: string;
}

export interface CourseNote {
  id: string;
  userId: string;
  moduleId: string;
  content: string;
  updatedAt: string;
}

export interface FoundationGrant {
  id: string;
  userId: string;
  grantName: string;
  amount: number;
  startDate: string;
  endDate?: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
  nextReportDue?: string;
  notes?: string;
  createdAt: string;
}

export interface OnboardingSurvey {
  id: string;
  userId: string;
  howHeard?: string;
  rddContact?: string;
  interests: string[];
  churchConnection: boolean;
  completedAt: string;
}

export interface SupportMessage {
  id: string;
  sender: 'partner' | 'staff';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  requesterName?: string;
  requesterEmail?: string;
  messages?: SupportMessage[];
}

export interface ActivityEvent {
  id: string;
  type:
    | 'gift_created'
    | 'course_completed'
    | 'course_progress'
    | 'content_viewed'
    | 'support_ticket'
    | 'profile_updated'
    | 'login';
  userId: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface BlackbaudConstituent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  constituentCode: ConstituentType;
  lifetimeGiving: number;
  solicitCodes: string[];
  rddAssignment?: string;
}

export interface BlackbaudGift {
  id: string;
  constituentId: string;
  amount: number;
  date: string;
  designation: string;
  type: 'one_time' | 'recurring';
  campaign?: string;
  appeal?: string;
}

export type ContentType = 'report' | 'update' | 'resource' | 'prayer' | 'story';

export interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  type: ContentType;
  accessLevel: 'all' | 'partner' | 'major_donor' | 'church' | 'foundation' | 'daf' | 'ambassador' | 'volunteer';
  date: string;
  author: string;
  tags: string[];
  coverImage?: string;
  fileUrl?: string;
}

export interface PortalEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  audience: 'partner' | 'church' | 'foundation' | 'daf' | 'ambassador' | 'volunteer';
}

export interface CommunicationTemplate {
  id: string;
  channel: 'email' | 'sms' | 'direct_mail';
  name: string;
  subject?: string;
  content: string;
  status: 'active' | 'draft';
  updatedAt: string;
}
