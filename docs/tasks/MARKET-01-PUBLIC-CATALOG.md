# MARKET-01 — Connect the public FlowvaMarket catalogue

**Goal:** Show real approved Market templates to guests and make every Get action open the exact selected listing.

## Editor files likely needed
- `index.html`, `app.js`, `api/client.js`, `config.js`, relevant homepage CSS.
- `docs/BACKEND_CONTRACT.md` and `docs/FLOWVAMARKET_HANDOFF.md`.

## Market developer must first provide
- Existing public catalogue endpoint and response schema (or implement the small adapter in BACKEND_CONTRACT).
- Canonical product URL pattern.
- Confirmed editor/Market origins and CORS/session requirements.

## Do
1. Reuse existing public Market catalogue; do not create a second catalogue.
2. Map real response fields to existing template cards.
3. Preserve exact `listingId`, `typeCode` and `productUrl` on each card/action.
4. Display Market-supplied price/currency/free status; never calculate or hardcode listing prices.
5. Handle empty, loading, network and malformed-response states.
6. Keep browsing guest-accessible.

## Must not
- Add fake/sample listings to production UI.
- Expose source URLs, buyer data, drafts or private files.
- Implement checkout or purchase ownership in editor.

## Acceptance
- Guest can browse real approved templates.
- Get on listing A opens listing A's canonical product page.
- Search/category filters do not lose listing identity.
- Backend-offline state is clear and local creation still works.

**Suggested commit:** `feat: connect public FlowvaMarket template catalogue`
