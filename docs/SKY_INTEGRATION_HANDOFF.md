# SKY Integration Handoff

## Goal
Implement Blackbaud SKY as the data source for authenticated portal users and partner-facing data, without changing current UX contracts unless explicitly required.

## Scope of This Handoff
- This repository is prepared for SKY integration PRs.
- SKY implementation is intentionally deferred to the integration developer.
- Stripe is not used in this project.
- LMS production schema/readiness changes are documented in `docs/LMS_PRODUCTION_HANDOFF.md`.

## Current State (Important)
- Blackbaud client is currently mock-backed: `lib/blackbaud/client.ts`
- Auth and user resolution exist, but identity mapping details still need final SKY/Supabase alignment:
  - `app/api/auth/magic-link/route.ts`
  - `app/api/auth/verify/route.ts`
  - `hooks/use-auth.tsx`
- Partner API routes already exist and are the intended integration seams:
  - `app/api/giving/history/route.ts`
  - `app/api/courses/route.ts`
- LMS is production-ready in Supabase mode:
  - notes persist in `user_course_notes`
  - progress persists in `user_course_progress`
  - completion certificates are issued by `POST /api/certificates/issue` and stored in `user_course_certificates`
  - certificate verification is public via `/certificates/[token]` and `GET /api/certificates/verify/[token]`
  - quiz modules use `course_modules.quiz_payload` with randomized sessions and persisted attempts in `user_quiz_attempts`
  - analytics eventing writes to `course_module_events`
- Admin upload routes are already scaffolded:
  - `POST /api/admin/lms/upload/resource`
  - `POST /api/admin/lms/upload/cloudflare`
- Admin course snapshot and analytics routes are available:
  - `POST /api/admin/lms/version`
  - `GET /api/admin/lms/analytics`
- Admin authorization is now permission-driven:
  - legacy `users.is_admin = true` still grants full admin access
  - granular roles are assigned in `user_roles` and resolved to permissions (for example `lms:manage`, `analytics:view`)

## Required Environment Variables
### Required today
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`

### Required for SKY implementation
- `BLACKBAUD_API_URL`
- `BLACKBAUD_API_KEY` (or replacement if SKY auth strategy differs)
- Any SKY OAuth/client credentials required by your final auth flow
- `NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` (required for LMS video embed UX)
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (required for admin Cloudflare video uploads)
- `SUPABASE_LMS_ASSETS_BUCKET` (optional override, defaults to `lms-assets`)
- `SUPABASE_CERTIFICATES_BUCKET` (optional override, defaults to `lms-certificates`)

## Required Migrations Before SKY Work
- `database/migrations/001_initial_schema.sql`
- `database/migrations/002_lms_production_upgrade.sql`
- `database/migrations/003_lms_advanced_features.sql`

## SKY Developer PR Sequence
1. Define identity mapping between Supabase auth user and SKY constituent.
2. Replace mock reads in `lib/blackbaud/client.ts` with real SKY requests.
3. Update auth magic-link path so verified sessions map to correct portal users in `users`.
4. Implement robust failure handling for SKY outages/timeouts.
5. Add caching/sync strategy for high-traffic reads (giving history, profile data).
6. Add integration tests or contract tests for SKY request/response mapping.

## Existing Contracts to Preserve
### Giving History API
- Route: `GET /api/giving/history`
- Contract shape currently used by UI:
  - `success`
  - `gifts[]` (`id`, `amount`, `date`, `designation`, `type`, `campaign`)
  - `summary` (`totalGiven`, `ytdGiven`, `giftCount`, `yearsActive`)

### Courses API
- Route: `GET /api/courses`
- Must continue returning partner-appropriate course access and progress, including LMS schedule fields (`publishAt`, `unpublishAt`) used by the UI.

## LMS Readiness Notes (for SKY PRs)
- LMS progress writes now assume one row per `user_id + module_id` and depend on conflict-safe upserts.
- Course detail UX now enforces sequential module unlock (module N+1 unlocks after module N is complete).
- Notes persist in live mode via `user_course_notes` upsert.
- Quiz pass/fail grading runs client-side from `quiz_payload`, records per-attempt history in `user_quiz_attempts`, and marks module complete on pass.
- Course completion certificate issuance is server-side via `POST /api/certificates/issue` (PDF generated and stored).
- Upload APIs are permission-gated by `lms:manage` (resolved from `users.is_admin` and/or `user_roles`).

### LMS Follow-Ups for Integration Developer
1. Wire real video watch telemetry (Cloudflare Stream events or player callbacks) into `watch_time_seconds` updates.
2. Decide whether `resource` upload should remain public bucket based or move to signed URL/download tokens.
3. If SKY becomes source-of-truth for user profile names, ensure certificate recipient names still use expected canonical values.
4. Keep SKY-related changes isolated from LMS contracts unless requirements force schema/API changes.

## Known Risks to Address in SKY PRs
1. User identity assumptions between Supabase auth IDs and `users` table IDs.
2. Magic-link token/redirect strategy alignment between frontend, Supabase, and API verification.
3. Proper server-side authorization for privileged routes (`/admin` and protected APIs) while preserving new RBAC behavior.
4. Operational handling for stale SKY data vs. LMS-local progress data.

## Acceptance Criteria for SKY Integration PR
- No mock Blackbaud reads in production path.
- Login with a real partner email resolves correct constituent/user.
- Dashboard + giving history load from SKY-backed data for real users.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- PR includes rollback notes and operational monitoring notes.
