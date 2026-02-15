# Favor International Partner Portal - Project Configuration

## Project Name
Favor International Partner Portal

---

## Tech Stack
- **Framework:** Next.js 16 with App Router
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui component library
- **Database:** Supabase (Database + Auth + Storage)
- **Validation:** Zod
- **Date Formatting:** date-fns
- **Icons:** lucide-react

---

## Architecture

### Infrastructure
- **Frontend:** Next.js hosted on Vercel (domain: portal.favorintl.org)
- **Database:** Supabase PostgreSQL with Row Level Security
- **Authentication:** Magic link (passwordless) via Supabase Auth + Resend
- **CRM Integration:** Blackbaud SKY API (bi-directional sync)
- **Payment Processing:** Not in scope for current release (no Stripe)
- **AI/LLM:** DeepSeek V3 via OpenRouter ($0.14/M input, $0.28/M output)
- **Video Hosting:** Cloudflare Stream ($1/1000 min storage/delivered)
- **Email:** Resend for transactional and marketing
- **SMS:** Twilio for notifications

---

## User Types (Constituent Types)

| Type | Description | Special Access |
|------|-------------|----------------|
| **individual** | Basic partner access | Standard portal features |
| **major_donor** | $10k+ lifetime giving | 990 access, financial reports |
| **church** | Church resources | Congregation materials, ordering |
| **foundation** | Grant tracking | Formal reporting, grant management |
| **daf** | DAF-specific | DAF documentation, simplified giving |
| **ambassador** | Speaking resources | Event calendar, speaking materials |

---

## Database Schema (Supabase)

### Core Tables
- **users:** Core profiles with constituent_type
- **giving_cache:** Synced from Blackbaud
- **recurring_gifts:** Recurring gift metadata/cache (no in-app processor)
- **communication_preferences:** Email/SMS/Mail preferences

### LMS Tables
- **courses:** LMS catalog
- **course_modules:** Video content with Cloudflare IDs
- **user_course_progress:** Completion tracking

### Feature-Specific Tables
- **foundation_grants:** Grant management for foundations
- **onboarding_surveys:** User survey data

---

## Key Features

1. Magic link authentication (no passwords)
2. Giving history with Blackbaud sync
3. Recurring gift visibility and status management (processor-agnostic)
4. LMS with 3 initial courses
5. Multi-constituent portal experiences
6. Communication preferences (email, SMS, mail)
7. Tax receipt downloads
8. Course progress tracking
9. Foundation grant tracking
10. Church resource ordering

---

## Brand Guidelines

### Colors
- **Primary:** #2b4d24 (Deep Green)
- **Canvas:** #FFFEF9 (Cream), #FAF9F6, #F5F3EF
- **Highlight:** #e1a730 (Gold - use sparingly)
- **Text:** #1a1a1a (Charcoal), #666666

### Typography
- **Headlines:** Cormorant Garamond
- **Body:** Montserrat

### Philosophy
80% canvas, 15% green, 5% gold

### Logo
https://storage.googleapis.com/msgsndr/LblL0AiRWSIvV6fFQuRT/media/67bf4d8383ae0d6d7dc507fe.png

---

## Giving Tiers

| Tier | Amount | Benefits |
|------|--------|----------|
| **Basic** | $0-999 | Portal access, basic courses |
| **Silver** | $1k-4999 | Quarterly reports, extended library |
| **Gold** | $5k-9999 | RDD contact, exclusive events |
| **Platinum** | $10k+ | 990 access, board summaries, annual dinner |

---

## Mock Data Accounts

| Email | Type | Giving Amount |
|-------|------|---------------|
| partner@example.com | Individual | $3,500 |
| major@example.com | Major Donor | $75,000 |
| pastor@gracechurch.org | Church | $12,500 |
| grants@hopefoundation.org | Foundation | $250,000 |
| donor@fidelity.com | DAF | $15,000 |
| ambassador@favorintl.org | Ambassador | $8,500 |

---

## API Routes

### Authentication
- `POST /api/auth/magic-link` - Send login emails
- `POST /api/auth/verify` - Verify tokens

### Giving
- `GET /api/giving/history` - Fetch giving data

### Courses
- `GET /api/courses` - Course catalog

### Integrations
- `/api/blackbaud/*` - Blackbaud integration
- `/api/comms/*` - Email/SMS
- `/api/ai/*` - AI recommendations

---

## Important Decisions

1. **Using Blackbaud SKY API** for constituent data source of truth
2. **Magic link auth** instead of passwords for better UX
3. **Mock data for development**, ready for real API integration
4. **Cloudflare Stream** chosen over Mux for cost savings
5. **DeepSeek V3 via OpenRouter** for AI (cheaper than alternatives)

---

## File Structure

```
app/
  (auth)/          # Login and verify pages
  (portal)/        # Protected portal routes
  api/             # API endpoints
components/
  ui/              # shadcn components
  portal/          # Portal components
  auth/            # Auth components
lib/               # Utilities and clients
hooks/             # Custom React hooks
types/             # TypeScript types
database/          # SQL schemas and seeds
```

---

## Project Metadata

- **Type:** project-config
- **Scope:** project
- **Created:** 2026-02-02
- **Version:** 1.0
