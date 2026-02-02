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
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  cloudflareVideoId: string;
  sortOrder: number;
  durationSeconds: number;
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
