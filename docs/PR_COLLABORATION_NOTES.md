# PR Collaboration Notes

## Branching
- Keep feature work in focused branches.
- Use one PR per concern (auth, SKY client, route integration, data mapping).

## Required Checks
- `npm run typecheck`
- `npm run lint`
- `npm run build`

These are also enforced in CI via `.github/workflows/ci.yml`.

## Review Expectations
- Add file-level notes for behavioral changes.
- Include before/after API shape when touching `/app/api/*` routes.
- Call out migration impacts clearly if touching `database/migrations/*`.

## SKY PRs
- Use the SKY checklist in `.github/PULL_REQUEST_TEMPLATE.md`.
- Link to `docs/SKY_INTEGRATION_HANDOFF.md` in the PR description.
- If touching LMS routes/components, include a short note on module unlock logic and progress-write behavior.
- If touching LMS schema/contracts, link `docs/LMS_PRODUCTION_HANDOFF.md` and call out migration impacts explicitly.
- If touching LMS quiz/certificate/upload behavior, call out any contract changes for:
  - `course_modules.quiz_payload`
  - `user_quiz_attempts`
  - `course_module_events`
  - `user_course_certificates`
  - `/api/certificates/issue`
  - `/api/certificates/verify/[token]`
  - `/api/admin/lms/upload/*`
  - `/api/admin/lms/version`
  - `/api/admin/lms/analytics`

## Migration Notes
- Migrations must be applied in-order:
  - `database/migrations/001_initial_schema.sql`
  - `database/migrations/002_lms_production_upgrade.sql`
  - `database/migrations/003_lms_advanced_features.sql`
- Any PR adding schema changes must include:
  - exact migration filename(s)
  - rollback strategy
  - RLS/policy impact summary
