# SKY Integration Handoff

## Goal
Implement Blackbaud SKY as the data source for authenticated portal users and partner-facing data, without changing current UX contracts unless explicitly required.

## Scope of This Handoff
- This repository is prepared for SKY integration PRs.
- SKY implementation is intentionally deferred to the integration developer.
- Stripe is not used in this project.

## Current State (Important)
- Blackbaud client is currently mock-backed: `lib/blackbaud/client.ts`
- Auth and user resolution exist, but identity mapping details still need final SKY/Supabase alignment:
  - `app/api/auth/magic-link/route.ts`
  - `app/api/auth/verify/route.ts`
  - `hooks/use-auth.tsx`
- Partner API routes already exist and are the intended integration seams:
  - `app/api/giving/history/route.ts`
  - `app/api/courses/route.ts`

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

## SKY Developer PR Sequence
1. Define identity mapping between Supabase auth user and SKY constituent.
2. Replace mock reads in `lib/blackbaud/client.ts` with real SKY requests.
3. Update auth magic-link path so verified sessions map to correct portal users.
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
- Must continue returning partner-appropriate course access and progress.

## Known Risks to Address in SKY PRs
1. User identity assumptions between Supabase auth IDs and `users` table IDs.
2. Magic-link token/redirect strategy alignment between frontend, Supabase, and API verification.
3. Proper server-side authorization for privileged routes (`/admin` and protected APIs).

## Acceptance Criteria for SKY Integration PR
- No mock Blackbaud reads in production path.
- Login with a real partner email resolves correct constituent/user.
- Dashboard + giving history load from SKY-backed data for real users.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- PR includes rollback notes and operational monitoring notes.
