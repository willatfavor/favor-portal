# LMS Production Handoff

## What Is Now Implemented
- Secure LMS schema extensions for production in `database/migrations/002_lms_production_upgrade.sql`.
- Role-aware LMS access policies in Postgres RLS (course/module reads are no longer globally readable by any authenticated user).
- `users.is_admin` support for admin-gated LMS authoring.
- Persistent learner notes via `user_course_notes`.
- Course certificate storage scaffold via `user_course_certificates`.
- Admin course/module management page (`/admin/courses`) uses Supabase data in live mode and keeps dev bypass fallback.
- Course detail page supports:
  - sequential unlock controlled by `courses.enforce_sequential`
  - persisted notes in live mode
  - Cloudflare Stream embed support when a stream ID + public subdomain are configured
  - downloadable completion summary + notes exports

## Required Deployment Steps
1. Apply DB migration:
   - `database/migrations/002_lms_production_upgrade.sql`
2. Refresh generated DB types if your workflow regenerates `types/supabase.ts`.
3. Set env vars:
   - `NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` (client embed)
   - existing Cloudflare/Supabase env vars already documented in `.env.local.example`
4. Ensure at least one admin user has `users.is_admin = true`.

## SKY Developer Notes
- LMS auth and data permissions now rely on the `users` row tied to the authenticated session user.
- SKY identity mapping must continue resolving users to the same `users.id` model used by Supabase auth.
- Course progress and notes are safe to keep local to Supabase while SKY remains the source of truth for donor/constituent data.

## Follow-Ups (Optional Enhancements)
- Add quiz-attempt table and graded scoring flow from `course_modules.quiz_payload`.
- Add signed/server-generated certificate assets (PDF) and connect to `user_course_certificates.certificate_url`.
- Add learner analytics dashboard using `watch_time_seconds` and notes/course completion trends.
