# MARKET-04 — Show the authenticated user's purchased templates

**Goal:** Display actual Market-confirmed purchases in the editor's Purchased/My templates views.

## Give the AI/developer
- `index.html`, `app.js`, `api/client.js`, relevant styles.
- Market purchases API schema and `docs/BACKEND_CONTRACT.md`.

## Do
1. Reuse existing Market purchases endpoint or a read-only adapter.
2. Request data only for the current authenticated session.
3. Display safe metadata and Market-provided `canEdit`/reason state.
4. Route Edit through MARKET-03 ticket exchange; route unsupported types to download/open-externally guidance.
5. Provide clear guest/auth-required and empty states.

## Must not
- Treat localStorage, a URL parameter or browser cache as proof of ownership.
- Return permanent source URLs in the library response.

## Acceptance
- Signed-in buyer sees only their own Market-confirmed purchases.
- Guest sees sign-in guidance, not fake purchased items.
- Ownership is rechecked when opening source.

**Suggested commit:** `feat: show FlowvaMarket purchased templates`
