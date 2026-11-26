# MARKET-02 — Preserve exact template through acquisition and return

**Goal:** After a user acquires a specific template on FlowvaMarket, return them to FlowvaEditor with the same listing identity.

## Required files/context
- Market checkout/product/login return handling (main app repository).
- `docs/BACKEND_CONTRACT.md`, `docs/FLOWVAMARKET_HANDOFF.md`.
- Editor return route and `api/client.js` only after Market confirms the return mechanism.

## Do
1. Preserve exact `listingId` through product page, login/signup and checkout/free acquisition.
2. Use signed opaque state or server-side flow state and allowlist the editor return origin/path.
3. Return only after Market confirms successful acquisition.
4. Return to the editor with a short-lived one-time ticket or a safe pending-acquisition reference.
5. If secure automatic return is not yet possible, implement a manual action on the exact product/purchase page as an interim release.

## Must not
- Trust arbitrary `returnTo` URLs.
- Put long-lived credentials or private source URLs in query strings.
- Resolve a different listing by title/search after checkout.

## Acceptance
- Test two listings: acquiring A returns A, acquiring B returns B.
- Cancelled/failed checkout does not start editing.
- Untrusted return destination is rejected.
- No user can change listing ID in the browser and obtain another source.

**Suggested commit:** `feat: preserve template selection through checkout`
