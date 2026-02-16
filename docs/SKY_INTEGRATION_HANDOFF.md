# SKY Integration Status

## Summary

SKY integration is now active in code, not deferred.

Implemented:

- Real SKY client in `lib/blackbaud/client.ts`
- Auth provisioning path from SKY email match:
  - `app/api/auth/magic-link/route.ts`
  - `app/api/auth/verify/route.ts`
- SKY API routes:
  - `GET /api/blackbaud/constituent`
  - `GET /api/blackbaud/gifts`
  - `POST /api/blackbaud/update`
  - `POST /api/blackbaud/sync`

## Production Requirements

Set these env vars in production:

- `BLACKBAUD_API_URL`
- `BLACKBAUD_API_KEY`
- `BLACKBAUD_ACCESS_TOKEN`

Production does not silently fall back to mock SKY responses.

## Current Behavior

- Magic-link login:
  - If local `users` row exists, normal login continues.
  - If local row is missing and SKY match exists by email, auth verification provisions local user data from SKY mapping.
  - If no SKY match, user is provisioned with `onboarding_required = true`.
- Preference sync route can write solicit code updates back to SKY and mirror them into `communication_preferences`.

## Remaining SKY Follow-Ups

- Add contract/integration tests against real SKY sandbox responses.
- Harden retry/backoff behavior for transient SKY failures.
- Add explicit operational alerting for SKY outage windows.
- Build complete onboarding UX for `onboarding_required` users.
