# Favor Portal - Project Documentation

## Overview

Favor Portal is a Next.js 16 + Supabase application that serves:

- partner portal experiences (giving, content, LMS, support)
- role-specific portal surfaces by constituent type
- separate admin surfaces for user, content, communications, support, LMS, and analytics workflows

## Constituent Types

- `individual`
- `major_donor`
- `church`
- `foundation`
- `daf`
- `ambassador`
- `volunteer`

## Architecture

- Frontend: Next.js App Router, React 19, Tailwind v4, shadcn/ui
- Backend: Next.js route handlers + Supabase Postgres/Auth
- Authorization:
  - portal route auth gating in `proxy.ts`
  - admin route auth + permission checks in middleware and API guards
- Data access: Supabase for first-party data; SKY for constituent/giving system-of-record integration

## Auth and Access

- Passwordless magic-link auth via:
  - `POST /api/auth/magic-link`
  - `POST /api/auth/verify`
- Admin login is separate (`/admin/login`, `scope=admin`).
- Magic-link and verify routes are rate-limited.
- Missing local users can now be provisioned from SKY mapping on verify when available.

## Data Model Status

### Persisted and Active

- `users`
- `communication_preferences` (including `report_period`)
- `giving_cache`
- `recurring_gifts`
- `user_giving_goals`
- `user_profile_details`
- LMS tables (courses, modules, progress, quiz attempts, cohorts, discussions, certificates)
- Admin/content/support/comms/activity tables from migration 005

### Schema Notes

- `users.onboarding_required` and `users.onboarding_completed_at` exist for onboarding tracking.
- Giving goals are first-party portal data in `user_giving_goals`.
- Profile address details are stored in `user_profile_details`.

## API Inventory (Current)

### Authentication

- `POST /api/auth/magic-link`
- `POST /api/auth/verify`

### Profile, Settings, Goals

- `GET/PATCH /api/profile`
- `GET/POST /api/giving/goals`
- `PATCH/DELETE /api/giving/goals/[id]`

### Giving

- `GET /api/giving/history`
- `POST /api/giving/one-time`
- `GET/POST /api/giving/recurring`
- `PATCH /api/giving/recurring/[id]`
- `POST /api/giving/recurring/[id]/cancel`
- `PATCH /api/giving/recurring/[id]/status`
- `GET /api/giving/receipt/[id]`

### LMS

- `GET /api/courses`
- `GET /api/lms/cohorts`
- `GET/POST /api/lms/discussions/threads`
- `PATCH/DELETE /api/lms/discussions/threads/[threadId]`
- `GET/POST /api/lms/discussions/threads/[threadId]/replies`
- certificate issue/verify routes

### Content and Support

- `GET /api/content`
- `GET/POST /api/support`

### SKY

- `GET /api/blackbaud/constituent`
- `GET /api/blackbaud/gifts`
- `POST /api/blackbaud/update`
- `POST /api/blackbaud/sync`

### Communications and AI

- `POST /api/comms/email`
- `POST /api/comms/sms`
- `POST /api/ai/recommendations`
- `POST /api/ai/chat`

### Admin

- `GET /api/admin/overview`
- `GET /api/admin/users`, `PATCH /api/admin/users/[id]`
- `GET /api/admin/content`, `POST /api/admin/content`, `PATCH/DELETE /api/admin/content/[id]`
- `GET /api/admin/communications`, `POST/PUT /api/admin/communications`, `PATCH/DELETE /api/admin/communications/[id]`
- `GET /api/admin/support`, `PATCH/POST /api/admin/support`
- `GET /api/admin/gifts`
- admin LMS upload/analytics/version endpoints

## External Integrations

### SKY

- Real client implemented in `lib/blackbaud/client.ts`.
- Production does not silently fall back to mock SKY responses.
- Required in production:
  - `BLACKBAUD_API_KEY`
  - `BLACKBAUD_ACCESS_TOKEN`
  - `BLACKBAUD_API_URL`

### Comms

- Email via Resend (`lib/resend/client.ts`)
- SMS via Twilio (`lib/twilio/client.ts`)
- Admin comms test-send now dispatches provider calls and logs send status (`sent`, `queued`, `failed`).

### AI

- OpenRouter integration in `lib/openrouter/client.ts`
- Endpoints available for recommendations and chat.

## Testing and Validation

Current automated validation:

- ESLint: pass
- TypeScript: pass
- Production build: pass
- Playwright E2E: pass (`39` tests)

Coverage includes:

- portal/admin page smoke routes
- content/admin/support/comms data-plane regression
- giving create/update flows
- profile endpoint persistence
- giving goals CRUD
- SKY/comms/AI endpoint smoke

## Remaining Gaps

- Full onboarding UI/flow for `onboarding_required` users is not complete.
- Dark mode is not implemented.
- Production operations still require real provider credentials and environment hardening.
