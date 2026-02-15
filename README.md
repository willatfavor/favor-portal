# Favor International Portal

Partner portal (LMS, user accounts, giving history, admin surfaces) built with Next.js 16 + Supabase.

## Current Integration Status
- Blackbaud SKY integration is scaffolded but not implemented end-to-end yet.
- Stripe is intentionally removed from this repo and is not part of the current architecture.
- Resend remains available for transactional email workflows.

## SKY Developer Handoff
Start with:
- `docs/SKY_INTEGRATION_HANDOFF.md`
- `docs/LMS_PRODUCTION_HANDOFF.md`

This document contains:
- required environment variables
- integration sequence
- route-level responsibilities
- acceptance criteria for SKY PRs

## Local Setup
```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`.

## Database Migrations
Before production deploy, apply:
- `database/migrations/001_initial_schema.sql`
- `database/migrations/002_lms_production_upgrade.sql`

## Scripts
```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Environment
Use `.env.local.example` as the template for local env vars.

## Collaboration
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- CI workflow: `.github/workflows/ci.yml`
