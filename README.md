# Favor International Portal

Partner portal for Favor International (LMS, giving, content, support, and admin surfaces) built with Next.js 16 + Supabase.

Tagline: `Transformed Hearts Transform Nations`

## Current State (February 16, 2026)

- Lint, typecheck, production build, and Playwright E2E suites are passing.
- Portal modules are active for:
  - individual
  - major donor
  - church
  - foundation
  - DAF
  - ambassador
  - volunteer
- Admin authentication is separate (`/admin/login`) and admin authorization is enforced per route permission.
- Portal auth middleware now protects all intended portal surfaces, including:
  - `/content`
  - `/major-donor`
  - `/volunteer`
  - `/assistant`
- Profile, communication settings, and giving goals are now persisted server-side (not browser-local only).

## Implemented Capabilities

### Authentication and User Provisioning

- Magic-link auth via Supabase (`/api/auth/magic-link`, `/api/auth/verify`).
- Admin-scoped login flow with admin permission checks.
- Rate limiting on auth endpoints.
- If a portal user is missing locally but exists in SKY by email, login can provision the local user record from SKY mapping.

### Portal Data Persistence

- Profile read/update API: `/api/profile`
- Communication preferences persistence via `communication_preferences` (including `report_period`)
- Giving goals CRUD APIs:
  - `GET/POST /api/giving/goals`
  - `PATCH/DELETE /api/giving/goals/[id]`

### SKY Integration

- Real SKY client implemented in `lib/blackbaud/client.ts` with request mapping.
- Production no longer uses silent SKY mock fallbacks.
- SKY API routes:
  - `GET /api/blackbaud/constituent`
  - `GET /api/blackbaud/gifts`
  - `POST /api/blackbaud/update`
  - `POST /api/blackbaud/sync`
- Dev bypass can still use mock SKY responses.

### Communications and AI APIs

- Real comms dispatch wiring:
  - Admin template test sends now dispatch through Resend/Twilio when configured and log result status.
  - Direct APIs:
    - `POST /api/comms/email`
    - `POST /api/comms/sms`
- AI APIs:
  - `POST /api/ai/recommendations`
  - `POST /api/ai/chat`

### Existing Portal/Admin APIs

- Giving: one-time, recurring, history, receipt
- Courses + LMS routes (catalog, cohorts, discussions, progress-related flows)
- Content APIs and admin content CRUD
- Support APIs and admin support flows
- Admin users, gifts, overview, communications, LMS analytics/upload/version

## Production Configuration Requirements

These integrations are enforced in production and should be configured before go-live:

- `BLACKBAUD_API_KEY`
- `BLACKBAUD_ACCESS_TOKEN`
- `BLACKBAUD_API_URL`
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `OPENROUTER_API_KEY`

## Database Migrations

Apply migrations in order:

1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_lms_production_upgrade.sql`
3. `database/migrations/003_lms_advanced_features.sql`
4. `database/migrations/004_lms_community_and_cohorts.sql`
5. `database/migrations/005_portal_admin_data_plane.sql`
6. `database/migrations/006_auth_profile_settings_goals_and_sky_readiness.sql`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test:e2e`
- `npm run test:e2e:install`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
- `npm run test:e2e:report`

## Validation Snapshot

- `npm run lint` -> pass
- `npm run typecheck` -> pass
- `npm run build` -> pass
- `npm run test:e2e` -> pass (`39` tests)

## Known Follow-Ups

- Dedicated onboarding UX for users provisioned without SKY match (`onboarding_required = true`) is not fully built yet.
- Dark mode is not implemented.
