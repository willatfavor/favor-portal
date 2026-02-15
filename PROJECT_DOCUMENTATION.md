# Favor International Partner Portal - Complete Project Documentation

## Project Overview
**Favor International Partner Portal** - A comprehensive Next.js application for managing donor relationships, giving history, learning management, and multi-constituent experiences.

**Domain:** portal.favorintl.org  
**Tagline:** "Transformed Hearts Transform Nations"

---

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React version
- **TypeScript 5** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Pre-built accessible components

### Backend & Database
- **Supabase** - PostgreSQL database, authentication, storage
- **Row Level Security (RLS)** - Database-level access control
- **Magic Link Auth** - Passwordless email authentication

### Integrations
- **Blackbaud SKY API** - CRM integration for constituent data and giving history (source of truth)
- **Payment Processor** - Not in scope for current release (no Stripe)
- **Resend** - Transactional and marketing emails
- **Twilio** - SMS notifications
- **Cloudflare Stream** - Video hosting for LMS
- **OpenRouter** - DeepSeek V3 AI for recommendations ($0.14/M input, $0.28/M output)

### Utilities
- **Zod** - Schema validation
- **date-fns** - Date formatting
- **lucide-react** - Icon library

---

## User Types (Constituent Types)

| Type | Code | Features |
|------|------|----------|
| **Individual Partner** | individual | Portal access, giving management, basic courses, tax receipts |
| **Major Donor** | major_donor | $10k+ giving, 990 access, financial reports, direct RDD contact, exclusive events |
| **Church/Pastor** | church | Church resources, congregation materials, bulk ordering, Mission Sunday toolkit |
| **Foundation** | foundation | Grant tracking, formal reporting, board-ready materials, multi-year pledges, site visits |
| **DAF Donor** | daf | DAF-specific documentation, grant tracking, simplified giving interface |
| **Ambassador** | ambassador | Speaking resources, event calendar, training modules, advocacy tools |

---

## Database Schema (Supabase)

### Core Tables

**users**
- id, email, first_name, last_name, phone
- blackbaud_constituent_id (links to Blackbaud)
- constituent_type (individual, major_donor, church, foundation, daf, ambassador, volunteer)
- lifetime_giving_total
- rdd_assignment (Regional Director)
- avatar_url, created_at, last_login

**giving_cache**
- Synced from Blackbaud SKY API
- gift_date, amount, designation, blackbaud_gift_id
- is_recurring, receipt_sent

**recurring_gifts**
- Recurring gift metadata/cache management
- amount, frequency (monthly/quarterly/annual)
- next_charge_date, external_subscription_id (legacy field currently named `stripe_subscription_id`), status

**communication_preferences**
- Email: newsletter_weekly, newsletter_monthly, quarterly_report, annual_report, events, prayer, giving_confirmations
- SMS: enabled, gift_confirmations, event_reminders, urgent_only
- Mail: enabled, newsletter_quarterly, annual_report, holiday_card, appeals
- blackbaud_solicit_codes (synced to Blackbaud)

**courses**
- LMS course catalog
- title, description, thumbnail_url, access_level, sort_order

**course_modules**
- Individual lessons within courses
- cloudflare_video_id for video content
- duration_seconds, sort_order

**user_course_progress**
- Track user completion of modules
- completed, completed_at, watch_time_seconds, last_watched_at

**foundation_grants** (Foundation-specific)
- Grant tracking for foundation partners
- grant_name, amount, start_date, end_date, status
- next_report_due, notes

**onboarding_surveys**
- how_heard, rdd_contact, interests, church_connection

---

## Key Features

### Phase 1: MVP (Completed)
1. ✅ Magic link authentication (passwordless)
2. ✅ Blackbaud integration (read-only, mock data)
3. ✅ Giving history display
4. ✅ Recurring gift management
5. ✅ Tax receipt downloads (PDF)
6. ✅ Communication preferences (all channels)

### Phase 2: LMS (Completed)
1. ✅ Course catalog with 3 initial courses
2. ✅ Video player with progress tracking
3. ✅ Course completion tracking
4. ✅ Access level controls

### Phase 3: Multi-Constituent (Completed)
1. ✅ Foundation portal with grant tracking
2. ✅ Church portal with resources
3. ✅ DAF portal with documentation
4. ✅ Giving-level content gating
5. ✅ Dynamic portal routing based on constituent type

### Phase 4: Advanced Features (Completed)
1. ✅ Communication system (Resend email, Twilio SMS)
2. ✅ AI integration (OpenRouter with DeepSeek V3)
3. ✅ Ambassador portal
4. ✅ Blackbaud write integration (solicit codes, interactions)

---

## Brand Guidelines

### Colors (80/15/5 Rule)
**Canvas (80%)**
- White: `#FFFFFF`
- Cream: `#FFFEF9` (primary background)
- Warm White: `#FAF9F6`
- Soft Beige: `#F5F3EF`

**Primary/Accent (15%)**
- Deep Green: `#2b4d24` (buttons, headers, actions)
- Sage: `#8b957b` (secondary)
- Light Sage: `#c5ccc2` (borders, dividers)

**Highlight (5% - use sparingly)**
- Gold: `#e1a730` (special CTAs only)
- Light Gold: `#e0c081`
- Terracotta: `#a36d4c`

**Text**
- Charcoal: `#1a1a1a` (headlines)
- Dark Gray: `#333333` (body)
- Medium Gray: `#666666` (secondary)
- Light Gray: `#999999` (captions)

### Typography
- **Headlines:** Cormorant Garamond (weights: 400, 500)
- **Body/UI:** Montserrat (weights: 300, 400, 500)

### Logo
URL: `https://storage.googleapis.com/msgsndr/LblL0AiRWSIvV6fFQuRT/media/67bf4d8383ae0d6d7dc507fe.png`

---

## Giving Tiers & Benefits

| Tier | Range | Benefits |
|------|-------|----------|
| **Basic** | $0 - $999 | Portal access, basic courses, giving history, tax receipts |
| **Silver** | $1,000 - $4,999 | Quarterly impact reports, extended video library, priority support |
| **Gold** | $5,000 - $9,999 | Direct RDD contact info, exclusive events, early access to content |
| **Platinum** | $10,000+ | 990 form access, detailed financial reports, board meeting summaries, annual dinner invitation |

---

## Mock Data for Development

| Email | Constituent Type | Lifetime Giving | RDD Assignment |
|-------|-----------------|-----------------|----------------|
| partner@example.com | individual | $3,500 | Florida - Sarah Johnson |
| major@example.com | major_donor | $75,000 | Texas - Michael Chen |
| pastor@gracechurch.org | church | $12,500 | Tennessee - Rebecca Martinez |
| grants@hopefoundation.org | foundation | $250,000 | Northeast - James Wilson |
| donor@fidelity.com | daf | $15,000 | Northeast - James Wilson |
| ambassador@favorintl.org | ambassador | $8,500 | Mountain West - Lisa Park |

---

## API Routes

### Authentication
- `POST /api/auth/magic-link` - Send magic link email
- `POST /api/auth/verify` - Verify magic link token

### Giving
- `GET /api/giving/history` - Fetch giving history
- `GET /api/giving/recurring` - Get recurring gifts
- `PATCH /api/giving/recurring` - Update recurring amount
- `DELETE /api/giving/recurring` - Cancel recurring gift
- `GET /api/giving/tax-receipt/:year` - Download tax receipt PDF

### Courses
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Course details
- `POST /api/courses/:id/progress` - Update progress

### Blackbaud
- `GET /api/blackbaud/constituent` - Get constituent data
- `GET /api/blackbaud/gifts` - Get giving history
- `POST /api/blackbaud/update` - Update constituent
- `POST /api/blackbaud/sync` - Sync preferences

### Communications
- `POST /api/comms/email` - Send email (Resend)
- `POST /api/comms/sms` - Send SMS (Twilio)

### AI
- `POST /api/ai/recommendations` - Get course recommendations
- `POST /api/ai/chat` - Favor Q&A chatbot

---

## Project Structure

```
my-app/
├── app/
│   ├── (auth)/           # Unauthenticated routes
│   │   ├── login/         # Magic link login
│   │   └── verify/        # Token verification
│   ├── (portal)/          # Protected portal routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── giving/        # Giving management
│   │   │   └── history/   # Full giving history
│   │   ├── courses/       # LMS catalog
│   │   ├── content/       # Exclusive content
│   │   ├── profile/       # User profile
│   │   ├── settings/      # Communication prefs
│   │   ├── foundation/    # Foundation portal
│   │   ├── church/        # Church portal
│   │   ├── daf/           # DAF portal
│   │   └── ambassador/    # Ambassador portal
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn components
│   ├── auth/              # Auth components
│   ├── portal/            # Portal components
│   ├── giving/            # Giving components
│   ├── courses/           # LMS components
│   └── ai/                # AI components
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── blackbaud/         # Blackbaud integration
│   ├── cloudflare/        # Video streaming
│   ├── resend/            # Email service
│   ├── twilio/            # SMS service
│   ├── openrouter/        # AI integration
│   ├── utils.ts           # Helper functions
│   └── constants.ts       # App constants
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── database/
│   ├── migrations/        # SQL migrations
│   └── seed/              # Seed data
└── public/                # Static assets
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Blackbaud (optional - mock data enabled)
BLACKBAUD_API_KEY=
BLACKBAUD_API_URL=https://api.sky.blackbaud.com


# Resend Email
RESEND_API_KEY=

# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Cloudflare Stream (optional)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_STREAM_SUBDOMAIN=

# OpenRouter AI (optional)
OPENROUTER_API_KEY=
```

---

## Important Architectural Decisions

1. **Blackbaud SKY API as Source of Truth**
   - All constituent data and giving history pulled from Blackbaud
   - Local Supabase cache for performance
   - Bi-directional sync for updates

2. **Magic Link Authentication**
   - Passwordless login for better UX
   - Resend for email delivery
   - Supabase Auth for session management

3. **Mock Data for Development**
   - Realistic mock Blackbaud data included
   - Easy to switch to real API when ready
   - 6 different constituent types represented

4. **Cost-Optimized Tech Choices**
   - Cloudflare Stream over Mux (10x cheaper)
   - DeepSeek V3 via OpenRouter (cheaper than GPT-4)
   - Supabase free tier sufficient for MVP

5. **Multi-Tenant Portal Design**
   - Single codebase serves all constituent types
   - Dynamic routing and UI based on constituent_type
   - Role-based access control

---

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint

# Database (using Supabase CLI)
supabase db reset    # Reset local database
supabase db push     # Push migrations

# Install dependencies
npm install          # Install all packages
```

---

## Next Steps for Future Development

1. **Set up Supabase project** and run migrations
2. **Configure environment variables** in `.env.local`
3. **Switch from mock to real Blackbaud API** when credentials ready
4. **Upload actual course videos** to Cloudflare Stream
5. **Decide payment processor** if in-app payments are introduced later
6. **Set up Resend** for transactional emails
7. **Deploy to Vercel** with custom domain

---

## Contact & Support

**Favor International, Inc.**  
3433 Lithia Pinecrest Rd #356  
Valrico, FL 33596

**Tagline:** Transformed Hearts Transform Nations
