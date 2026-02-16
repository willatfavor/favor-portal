# LMS Production Handoff

## What Is Now Implemented
- Secure LMS schema extensions for production in `database/migrations/002_lms_production_upgrade.sql`.
- Advanced LMS feature schema in `database/migrations/003_lms_advanced_features.sql`.
- LMS community + cohorts schema in `database/migrations/004_lms_community_and_cohorts.sql`.
- Role-aware LMS access policies in Postgres RLS (course/module reads are no longer globally readable by any authenticated user).
- `users.is_admin` support for admin-gated LMS authoring.
- Granular RBAC role model via `user_roles` and permission-aware admin UX.
- Admin audit logging via `admin_audit_logs`.
- Course version snapshots via `course_versions` and `POST /api/admin/lms/version`.
- Persistent learner notes via `user_course_notes`.
- Quiz authoring + runtime grading via `course_modules.quiz_payload` and `pass_threshold`.
- Quiz randomization + persisted attempt history via `user_quiz_attempts`.
- Module analytics event stream via `course_module_events`.
- Course certificate issuance on completion via `user_course_certificates`, including:
  - server-generated PDF
  - certificate number
  - verification token + public verification page
- Admin upload endpoints:
  - `POST /api/admin/lms/upload/resource` (Supabase Storage fallback to data URL)
  - `POST /api/admin/lms/upload/cloudflare` (Cloudflare Stream upload)
- Admin analytics endpoint:
  - `GET /api/admin/lms/analytics`
- LMS community APIs:
  - `GET/POST /api/lms/cohorts`
  - `GET/POST /api/lms/discussions/threads`
  - `PATCH /api/lms/discussions/threads/[threadId]`
  - `GET/POST /api/lms/discussions/threads/[threadId]/replies`
- Admin course/module management page (`/admin/courses`) uses Supabase data in live mode and keeps dev bypass fallback.
- Course detail page supports:
  - sequential unlock controlled by `courses.enforce_sequential`
  - persisted notes in live mode
  - in-module randomized quiz UI with persisted attempt history
  - certificate download button after full course completion (PDF)
  - certificate verification URL
  - cohort participation per course
  - discussion threads and instructor-pinned replies
  - Cloudflare Stream embed support when a stream ID + public subdomain are configured
  - downloadable completion summary + notes exports

## Required Deployment Steps
1. Apply DB migrations in order:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_lms_production_upgrade.sql`
   - `database/migrations/003_lms_advanced_features.sql`
   - `database/migrations/004_lms_community_and_cohorts.sql`
2. Refresh generated DB types if your workflow regenerates `types/supabase.ts`.
3. Set env vars:
   - `NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` (client embed)
   - `CLOUDFLARE_ACCOUNT_ID` (admin video upload API)
   - `CLOUDFLARE_API_TOKEN` (admin video upload API)
   - `SUPABASE_LMS_ASSETS_BUCKET` (optional, defaults to `lms-assets`)
   - `SUPABASE_CERTIFICATES_BUCKET` (optional, defaults to `lms-certificates`)
   - existing Cloudflare/Supabase env vars already documented in `.env.local.example`
4. Ensure the Supabase storage bucket for LMS assets exists and is public if using public URLs.
5. Ensure the certificates bucket exists (`lms-certificates` unless overridden).
6. Ensure at least one admin user has `users.is_admin = true`.
7. Assign granular admin roles in `user_roles` as needed (`lms_manager`, `analyst`, etc.).

## SKY Developer Notes
- LMS auth and data permissions now rely on the `users` row tied to the authenticated session user.
- SKY identity mapping must continue resolving users to the same `users.id` model used by Supabase auth.
- Course progress and notes are safe to keep local to Supabase while SKY remains the source of truth for donor/constituent data.
- LMS certificates, quiz attempts, and module analytics are intentionally kept in Supabase and do not require SKY ownership.
- LMS cohorts, memberships, and community threads/replies are intentionally kept in Supabase and do not require SKY ownership.

## Follow-Ups (Optional Enhancements)
- Add certificate cryptographic signing/QR verification if external auditors require tamper evidence.
- Add role-assignment UI in `/admin/users` against `user_roles` for live admin governance.
- Add automated scheduled publish/unpublish jobs if background enforcement beyond query-time checks is required.
