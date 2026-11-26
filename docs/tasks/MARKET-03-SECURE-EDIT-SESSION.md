# MARKET-03 — Secure purchased-template edit session

**Goal:** Let a verified owner open the exact acquired template as a private working copy.

## Required files/context
- Market entitlement/purchase/source storage services and relevant adapter/controller.
- Editor `api/client.js`, `app.js` or editor launch handler, `editor.js`, `capabilities.js`.
- `docs/BACKEND_CONTRACT.md`, `docs/SECURITY.md`.

## Do
1. Market verifies authenticated user, exact listing ownership/acquisition and server-side format policy.
2. Issue a cryptographically random, single-use, short-lived ticket bound to user + listing + source.
3. Consume ticket atomically; reject expired/reused/mismatched tickets.
4. Return only a short-lived read-only source URL or authenticated stream.
5. Editor verifies returned listing ID and canonical type, checks local capability registry, then opens a private copy.
6. Save/export buyer work separately; never write to seller's original.

## Must not
- Trust browser ownership flags/user IDs/source URLs.
- Store tickets in localStorage or logs.
- Return permanent public source URLs.
- Show Edit for a type the server/editor do not both support.

## Acceptance
- Valid owner can open the exact supported template.
- Guest, non-owner, expired/replayed ticket, mismatched listing and unsupported type are rejected.
- Seller original remains unchanged after buyer edits and saves.

**Suggested commit:** `feat: add secure purchased template editing`
