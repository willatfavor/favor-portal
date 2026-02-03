// Mock data for the portal feed, notifications, and support system

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: 'Impact Story' | 'Update' | 'Event' | 'Resource' | 'Prayer';
  imageUrl?: string;
  date: string;
  readTime: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'gift' | 'course' | 'event' | 'system' | 'report';
  read: boolean;
  date: string;
  link?: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export const NEWS_FEED: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Clean Water Reaches Kigali Community',
    excerpt: 'Thanks to partner generosity, 340 families now have access to safe drinking water through a new well installation.',
    category: 'Impact Story',
    date: '2026-01-28',
    readTime: '4 min',
  },
  {
    id: 'news-2',
    title: 'Spring Leadership Summit Registration Open',
    excerpt: 'Join us March 15–17 in Nashville for our annual partner gathering. Early registration is now available.',
    category: 'Event',
    date: '2026-01-25',
    readTime: '2 min',
  },
  {
    id: 'news-3',
    title: 'Q4 2025 Impact Report Available',
    excerpt: 'Our latest quarterly report is ready. See how your partnership made a difference across 4 countries.',
    category: 'Resource',
    date: '2026-01-20',
    readTime: '8 min',
  },
  {
    id: 'news-4',
    title: 'New Course: Understanding Microfinance',
    excerpt: 'Learn how microfinance initiatives are transforming communities and creating sustainable livelihoods.',
    category: 'Update',
    date: '2026-01-15',
    readTime: '3 min',
  },
  {
    id: 'news-5',
    title: 'Prayer Focus: Eastern Uganda Schools',
    excerpt: 'Join us in praying for the 12 schools we support in Eastern Uganda as the new term begins.',
    category: 'Prayer',
    date: '2026-01-10',
    readTime: '2 min',
  },
  {
    id: 'news-6',
    title: 'Ambassador Program Expansion',
    excerpt: 'We are growing our ambassador network to 15 new cities this year. Learn how you can get involved.',
    category: 'Update',
    date: '2026-01-05',
    readTime: '5 min',
  },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Monthly Gift Processed',
    message: 'Your recurring gift of $100 was processed successfully.',
    type: 'gift',
    read: false,
    date: '2026-02-01',
    link: '/giving',
  },
  {
    id: 'notif-2',
    title: 'New Course Available',
    message: '"Partnership Foundations" is now available in your course catalog.',
    type: 'course',
    read: false,
    date: '2026-01-30',
    link: '/courses',
  },
  {
    id: 'notif-3',
    title: 'Q4 Impact Report Ready',
    message: 'Your quarterly impact report is available for download.',
    type: 'report',
    read: false,
    date: '2026-01-20',
    link: '/giving/history',
  },
  {
    id: 'notif-4',
    title: 'Spring Summit Early Registration',
    message: 'Register by Feb 28 for the discounted partner rate.',
    type: 'event',
    read: true,
    date: '2026-01-15',
  },
  {
    id: 'notif-5',
    title: 'Tax Receipt Available',
    message: 'Your 2025 annual tax receipt is ready to download.',
    type: 'gift',
    read: true,
    date: '2026-01-10',
    link: '/giving/history',
  },
];

export const MODULE_TILES = [
  {
    id: 'giving',
    title: 'Giving',
    description: 'Track gifts, manage recurring donations, and download receipts.',
    icon: 'Heart',
    href: '/giving',
    color: '#2b4d24',
  },
  {
    id: 'courses',
    title: 'Courses',
    description: 'Deepen your understanding through partner learning modules.',
    icon: 'GraduationCap',
    href: '/courses',
    color: '#2b4d24',
  },
  {
    id: 'content',
    title: 'Content Library',
    description: 'Reports, updates, and downloadable resources tailored to you.',
    icon: 'FileText',
    href: '/content',
    color: '#2b4d24',
  },
  {
    id: 'insights',
    title: 'Favor Insights',
    description: 'Personalized recommendations and AI-guided next steps.',
    icon: 'Sparkles',
    href: '/assistant',
    color: '#8b957b',
  },
  {
    id: 'impact',
    title: 'Impact Reports',
    description: 'See how your partnership is changing lives across nations.',
    icon: 'TrendingUp',
    href: '/giving/history',
    color: '#2b4d24',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your personal information and partnership details.',
    icon: 'User',
    href: '/profile',
    color: '#2b4d24',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Communication preferences, notifications, and account options.',
    icon: 'Settings',
    href: '/settings',
    color: '#2b4d24',
  },
  {
    id: 'support',
    title: 'Support',
    description: 'Get help from our partner support team.',
    icon: 'MessageCircle',
    href: '#support',
    color: '#8b957b',
  },
] as const;

// Designations available for giving
export const GIVING_DESIGNATIONS = [
  'General Operations',
  'Education Fund',
  'Clean Water Initiative',
  'Community Health',
  'Microfinance Program',
  'Leadership Development',
  'Where Most Needed',
] as const;
