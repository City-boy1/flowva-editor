# FlowvaMarket ↔ FlowvaEditor backend contract

**Audience:** FlowvaMarket developer.  
**Goal:** Minimum integration surface. FlowvaMarket keeps its existing authentication, purchase, listing, download, moderation and payment systems. The editor does not require a second marketplace or a new account system.

## Responsibilities

### FlowvaMarket owns
- User authentication and session.
- Purchase verification and download entitlement.
- Listing/product metadata and canonical file type code.
- Original source-file storage and access control.
- Listing submission, moderation, checkout, refunds, escrow and creator payouts.

### FlowvaEditor owns
- Local file selection, parsing, editing and export where supported.
- Private working copies and `.flowva` local project serialization.
- Format capability/fidelity messaging.
- Client-side project recovery and local assets.
- Sending a finished export/package to the marketplace hand-off when a creator chooses to submit work.

## Required minimum endpoints

Routes below are logical names, not a demand to create a new `/api/editor` service. The developer may map them onto existing controllers/routes. Reuse existing auth/session middleware and storage wherever possible.

### 1. Create one-time edit ticket

`POST /<existing-api-prefix>/editor/edit-ticket`

Request:

```json
{ "listingId": "marketplace-listing-id" }
```

Requirements:
- Require the existing authenticated session and CSRF protection.
- Verify that the current account has an eligible completed purchase/download entitlement for this listing.
- Verify the listing's canonical file type is currently eligible for marketplace editing (initially PSD only, once verified).
- Create a cryptographically random, single-use ticket bound server-side to user, listing, source object and expiry (about 60 seconds).
- Do not accept a user ID from the browser as proof of identity.

Response:

```json
{ "ticket": "one-time-opaque-value", "expiresAt": "ISO-8601" }
```

### 2. Exchange ticket for edit session

`POST /<existing-api-prefix>/editor/edit-session`

Request:

```json
{ "ticket": "one-time-opaque-value" }
```

Requirements:
- Atomically consume the ticket; reject reuse and expiry.
- Re-check the user/session binding.
- Return only the source needed for editing, through a short-lived signed URL (about 5 minutes) or a same-origin streaming endpoint.
- Use private/no-store response caching for sensitive source metadata.
- The editor opens a private copy. This endpoint must not grant write access to the seller's original.

Response:

```json
{
  "editSessionId": "opaque-session-id",
  "listingId": "marketplace-listing-id",
  "type": "PSD",
  "title": "Template title",
  "signedSourceUrl": "https://...",
  "expiresAt": "ISO-8601"
}
```

The `type` value must be the marketplace's canonical type code, not a filename-derived guess.

### 3. Optional save/export hand-off

The lowest-burden option is to let the editor download the result to the buyer/creator's device. No marketplace upload endpoint is required for that workflow.

If FlowvaMarket wants a creator to send a finished editable source file directly into its existing listing/upload flow, provide **one** of these:

- A URL/route that opens the existing authenticated upload/listing page with a short-lived, scoped hand-off token; or
- An upload-init endpoint returning a short-lived signed upload URL and an existing listing-draft identifier.

The editor must not create marketplace listings, set prices, calculate commission, process payment or publish listings itself. The existing FlowvaMarket listing workflow remains authoritative.

## Existing project save/load (only if cloud projects are desired)

Cloud project persistence is optional for the first integration. Local `.flowva` save/open and device download can work without it. If FlowvaMarket already has generic user file/project storage, reuse it. Otherwise defer these endpoints rather than creating a large new subsystem.

If implemented, minimum operations are:
- List the current user's editor project records.
- Create a project record.
- Read/update a project owned by the current user.
- Delete a project owned by the current user.

All operations must derive the user from the authenticated session and enforce ownership server-side.

## Local downloaded-file workflow (no backend endpoints)

A buyer who has already downloaded a template can use the editor's local Open/Import control. The browser File API supplies the selected file. The editor checks extension, MIME hint, magic bytes where practical, size limits and parser support, then edits a local copy and downloads the output. This workflow must not call edit-ticket, edit-session, ownership or purchase endpoints. It does not bypass FlowvaMarket's purchase/download controls; it starts after the user has a local file.

## Security and operational requirements

- HTTPS only.
- Existing session cookies should be Secure, HttpOnly and SameSite as appropriate to the deployment topology.
- CSRF protection on mutations; the editor client echoes the agreed CSRF token header/cookie pattern.
- Strict CORS allowlist if editor and marketplace use different origins. Prefer same-site deployment where practical.
- Signed source URLs short-lived, read-only, scoped to one object and not publicly indexable.
- Do not expose storage bucket credentials or permanent source URLs.
- Rate-limit ticket creation and reject replay.
- Return stable error codes: `AUTH_REQUIRED`, `PURCHASE_REQUIRED`, `TYPE_NOT_EDITABLE`, `TICKET_EXPIRED`, `TICKET_USED`, `SOURCE_UNAVAILABLE`.

## Decisions the two developers must confirm

1. Actual existing API prefix and route names (logical routes above can be mapped).
2. Marketplace canonical type-code values for all 31 accepted types.
3. Whether editor and marketplace share an origin/site and session cookie.
4. Whether the first release needs cloud project persistence or only local save/export.
5. Whether the existing listing upload page can accept a hand-off URL/token.

**Keep the integration small:** edit authorization is the only mandatory new marketplace capability for the purchased-file Edit button. Local file editing/export does not depend on marketplace changes.
