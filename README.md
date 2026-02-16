# Favor International Portal

A comprehensive partner portal (LMS, user accounts, giving history, admin surfaces) built with Next.js 16 + Supabase.

"Transformed Hearts Transform Nations"

## Project Overview

The **Favor International Partner Portal** is a multi-constituent experience designed to manage donor relationships, giving history, learning management, and resource delivery. It integrates with Blackbaud SKY API as the source of truth for constituent data and utilizes a modern tech stack for a seamless user experience.

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Validation:** [Zod](https://zod.dev/)
- **Date Formatting:** [date-fns](https://date-fns.org/)
- **Icons:** [lucide-react](https://lucide.dev/)
- **AI/LLM:** DeepSeek V3 via [OpenRouter](https://openrouter.ai/)
- **Video Hosting:** [Cloudflare Stream](https://www.cloudflare.com/products/cloudflare-stream/)
- **Email:** [Resend](https://resend.com/)
- **SMS:** [Twilio](https://www.twilio.com/)

---

## Key Features

### 🔐 Authentication & Profile
- **Magic Link Auth:** Passwordless email authentication via Supabase Auth + Resend.
- **Constituent Type Routing:** Dynamic portal experiences tailored to the user's role.
- **Communication Preferences:** Granular control over Email, SMS, and Mail notifications.

### 💰 Giving & Finance
- **Blackbaud Integration:** Bi-directional sync with Blackbaud SKY API for constituent data and giving history.
- **Giving History:** Comprehensive view of all past gifts, designations, and campaigns.
- **Recurring Gifts:** Visibility and management of recurring gift status.
- **Tax Receipts:** Self-service PDF downloads for tax purposes.

### 📚 Learning Management System (LMS)
- **Course Catalog:** Access to mission-focused training and resources.
- **Video Progress Tracking:** Seamless video playback with watch-time tracking via Cloudflare Stream.
- **Sequential Unlocking:** Enforced module completion order.
- **Learner Notes:** Persistent note-taking within course modules.

### 🤝 Multi-Constituent Portals
- **Individual Partner:** Basic portal features and giving management.
- **Major Donor:** Access to 990s, financial reports, and exclusive content ($10k+ lifetime giving).
- **Church/Pastor:** Congregation materials, Mission Sunday toolkits, and bulk ordering.
- **Foundation:** Grant tracking, formal reporting, and board-ready materials.
- **DAF Donor:** DAF-specific documentation and simplified giving interface.
- **Ambassador:** Speaking resources, event calendar, and advocacy tools.

### 🤖 AI Integration
- **Favor Q&A Chatbot:** AI-powered assistance using DeepSeek V3.
- **Smart Recommendations:** Course and content suggestions based on user interests.

---

## User Types (Constituent Types)

| Type | Code | Special Access |
|------|------|----------------|
| **Individual** | `individual` | Standard portal features |
| **Major Donor** | `major_donor` | 990 access, financial reports, exclusive events |
| **Church** | `church` | Church resources, congregation materials, ordering |
| **Foundation** | `foundation` | Grant tracking, formal reporting, grant management |
| **DAF** | `daf` | DAF documentation, simplified giving |
| **Ambassador** | `ambassador` | Speaking resources, event calendar, training |

---

## Architecture & Infrastructure

- **Frontend:** Next.js hosted on Vercel.
- **Database:** Supabase PostgreSQL with **Row Level Security (RLS)**.
- **CRM Source of Truth:** Blackbaud SKY API.
- **Media:** Cloudflare Stream for cost-effective video delivery.
- **Integrations:** API-first design with dedicated routes for Blackbaud, Comms, and AI.

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Local Setup
1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment Variables**
   Create a `.env.local` file based on the [Environment Variables](#environment-variables) section below.
4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Database Migrations
Before deployment or for local development with Supabase, apply the migrations in order:
1. `database/migrations/001_initial_schema.sql` - Core tables (users, giving_cache, etc.)
2. `database/migrations/002_lms_production_upgrade.sql` - LMS extensions and RLS policies.
3. `database/migrations/003_lms_advanced_features.sql` - LMS RBAC, analytics, versioning, and certificate verification.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (e.g., http://localhost:3000) |
| `RESEND_API_KEY` | API Key for Resend email service |
| `BLACKBAUD_API_KEY` | API Key for Blackbaud SKY (Optional in dev) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (Optional) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (Optional) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID (Optional) |
| `OPENROUTER_API_KEY` | API Key for OpenRouter (DeepSeek V3) |

---

## Project Structure

```text
app/
  (auth)/           # Magic link login and verification
  (portal)/          # Protected portal routes (dashboard, giving, LMS)
  api/               # Backend API endpoints
components/
  ui/                # shadcn/ui components
  portal/            # Shared portal components (SectionHeader, ModuleTile, etc.)
  giving/            # Finance-specific components
  courses/           # LMS-specific components
lib/                 # Third-party clients (Supabase, Blackbaud, Resend, etc.)
hooks/               # Custom React hooks (useAuth, etc.)
database/            # SQL migrations and seed data
types/               # TypeScript type definitions
```

---

## Brand & UI Guidelines

### Colors (80/15/5 Rule)
- **Canvas (80%):** Cream (`#FFFEF9`), Warm White (`#FAF9F6`), Soft Beige (`#F5F3EF`)
- **Primary (15%):** Deep Green (`#2b4d24`), Sage (`#8b957b`)
- **Highlight (5%):** Gold (`#e1a730`), Terracotta (`#a36d4c`)

### Typography
- **Headlines:** Cormorant Garamond (Serif)
- **Body/UI:** Montserrat (Sans-serif)

For more details, see `docs/ui-style.md`.

---

## Handoff Documentation

Detailed handoff notes for specific implementation areas:
- **SKY Integration:** `docs/SKY_INTEGRATION_HANDOFF.md`
- **LMS Production:** `docs/LMS_PRODUCTION_HANDOFF.md`

---

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run typecheck` - Run TypeScript compiler checks

---

## Collaboration

- **Branching:** Use focused feature branches.
- **PRs:** Follow the template in `.github/PULL_REQUEST_TEMPLATE.md`.
- **CI:** All PRs must pass lint, typecheck, and build steps.

See `docs/PR_COLLABORATION_NOTES.md` for full details.
