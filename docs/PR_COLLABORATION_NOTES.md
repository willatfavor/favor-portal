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
