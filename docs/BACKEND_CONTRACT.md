# FlowvaMarket ↔ FlowvaEditor integration contract

**Purpose:** Small, secure integration between the existing Market application and the standalone editor. This contract describes the required behaviour; endpoint names are proposed adapters, not a demand to replace existing Market routes. The Market developer should reuse existing controllers, auth, checkout, purchase, storage and creator-listing services wherever possible.

## 1. Ownership boundary

**FlowvaMarket owns:** identity/session, creator eligibility, public catalogue/listings, product pages, pricing/currency, checkout/free acquisition, purchase records, ownership/entitlements, source-file storage, listing drafts, validation, moderation, publication, payment and payouts.

**FlowvaEditor owns:** guest browsing presentation, category-aware editor, local creation, local project/assets, supported file parsing/writing, private working copies and preparation of a source/preview for Market hand-off.

No editor account database, payment flow, purchase table, creator payout system or moderation queue should be created.

## 2. Canonical template identity — mandatory

Every catalogue card must retain the exact Market `listingId` and canonical `typeCode`. The title, image, price and category are display metadata, never identifiers. On click/Get/Edit/purchase return, preserve that exact `listingId`; do not re-run a search or select a similar template.

Minimum public listing fields:

```json
{
  "listingId": "stable-listing-id",
  "title": "Template title",
  "description": "Short public description",
  "previewUrl": "https://...",
  "categoryId": "social-media",
  "typeCode": "PSD",
  "price": { "amount": 0, "currency": "GHS", "isFree": true },
  "productUrl": "https://flowvamarket.com/...",
  "editor": { "canEdit": false, "reason": "TYPE_NOT_EDITABLE" }
}
```

The example values are illustrative. Market must return real values and a canonical product URL. Public catalogue response must contain only approved/published public listings. Never expose source-file URLs, private buyer data, draft/unpublished listings or storage credentials.

## 3. Required user journeys

### A. Public discovery (guest access)
1. Editor requests the public approved catalogue (paged/search/category-filtered if existing Market API supports it).
2. Guests can see public preview, title, category, type and Market-supplied price/currency.
3. Get opens `productUrl` for that exact `listingId`.
4. If catalogue is unavailable, editor shows an honest unavailable/empty state; no fake listings.

### B. Exact listing → checkout → editor return
1. Editor stores the selected `listingId` and canonical `typeCode` in a short-lived flow state.
2. Get opens the canonical product page for that exact listing.
3. Market runs its existing login/signup and free acquisition/checkout process.
4. Market preserves a validated editor return destination through login and checkout. Use a signed/opaque state token or server-side state, not an arbitrary untrusted URL.
5. After successful acquisition, Market redirects to the editor return route with a short-lived one-time acquisition/edit ticket, or the editor requests a ticket after return.
6. Editor resolves the ticket for that same listing. If the flow cannot be implemented safely in the first increment, the fallback is a return to the exact product page/library with a clear manual **Open in FlowvaEditor** action. Never silently open another template.

### C. Edit purchased template (secure)
The editor must not fetch private source based only on a listing ID or browser claim. Market verifies session, completed acquisition, listing status, file eligibility and current server policy.

Proposed minimal exchange (reuse existing endpoints if equivalent):

`POST /api/editor/edit-ticket`

Request:
```json
{ "listingId": "stable-listing-id" }
```

Market requirements:
- Authenticated session and CSRF protection.
- Verify current user owns/acquired this exact listing.
- Verify listing is still eligible and server-side format policy allows editing.
- Create random single-use ticket bound server-side to user, listing and source object; short expiry (about 60 seconds).
- Do not accept user ID, ownership boolean or source URL from browser.

Response:
```json
{ "ticket": "opaque-one-time-value", "expiresAt": "ISO-8601" }
```

`POST /api/editor/edit-session`

Request:
```json
{ "ticket": "opaque-one-time-value" }
```

Market requirements:
- Atomically consume ticket; reject expired/replayed tickets.
- Re-check session/user/listing binding and capability policy.
- Return only the required source via short-lived read-only signed URL (about 5 minutes) or authenticated streaming endpoint.
- Never grant write access to seller's original.

Response:
```json
{
  "editSessionId": "opaque-session-id",
  "listingId": "same-listing-id",
  "typeCode": "PSD",
  "title": "Template title",
  "sourceUrl": "https://short-lived-read-only-source",
  "expiresAt": "ISO-8601"
}
```

Editor verifies response `listingId` matches the selected listing, verifies `typeCode` is supported by its own capability registry, fetches source, and opens a new private copy. Save/export creates a buyer-owned project/copy. It must never overwrite the seller source.

### D. Purchased library

Preferred: reuse the current Market purchases endpoint or expose a read-only adapter such as `GET /api/editor/purchases`. Return only the authenticated user's acquired items and safe metadata: listing ID, title, preview, canonical type, product URL, acquisition status and whether editing is currently allowed. Do not return permanent private source URLs. Ownership must be rechecked for every source retrieval.

### E. Creator publish hand-off

**First implementation should use the existing Market creator upload/listing form.** Editor prepares an exported source file and preview, then opens the existing upload route. Creator completes title, description, category, type, price/free choice and other listing fields on Market. Market performs file validation, creator eligibility checks, draft creation, moderation and publication.

Optional later improvement: scoped, expiring upload-init or draft-attachment token that is bound to authenticated creator and draft, limited to attaching the specific source/preview. It must not publish or approve the listing.

After Market approves/publishes the listing, the public catalogue should show it using the same catalogue endpoint. The editor does not maintain a separate marketplace listing database.

## 4. Suggested adapters (only if existing routes cannot serve)

| Capability | Preferred reuse | Small adapter only if needed |
|---|---|---|
| Public templates | Existing public listings/catalogue API | `GET /api/editor/catalog` |
| Exact product/checkout | Existing canonical product page and checkout | validated `returnTo`/state handling |
| Purchased library | Existing authenticated purchases API | `GET /api/editor/purchases` |
| Edit authorization | Existing entitlement + source access service | `POST /api/editor/edit-ticket`, `POST /api/editor/edit-session` |
| Creator publish | Existing creator upload/listing draft form | Optional scoped upload-init/draft attachment |

Do not create a new purchase table, checkout, authentication system, storage service or moderation workflow for the editor.

## 5. Errors and UX states

Use stable machine-readable error codes where possible:
- `AUTH_REQUIRED`
- `PURCHASE_REQUIRED`
- `LISTING_NOT_FOUND`
- `LISTING_UNAVAILABLE`
- `TYPE_NOT_EDITABLE`
- `TICKET_EXPIRED`
- `TICKET_USED`
- `TICKET_INVALID`
- `SOURCE_UNAVAILABLE`
- `UPLOAD_NOT_ALLOWED`

Editor must display a useful message and next action. Never convert a failed entitlement check into a local edit of the private Market source.

## 6. Security requirements

- HTTPS only; strict CORS allowlist if origins differ.
- Reuse existing secure session cookies. Do not assume JS can read HttpOnly cookies.
- CSRF protection on mutations and ticket creation.
- Allowlist editor return origins and paths; prevent open redirects.
- Tickets random, single-use, short-lived, bound server-side and never stored in localStorage/logs.
- Source URLs read-only, object-scoped, short-lived and no-store/private cached.
- Enforce server-side file type, size, ownership and creator permission checks.
- Rate-limit ticket creation and upload hand-offs.
- Creator submission is a draft only; Market validation and moderation remain mandatory.

## 7. Developer coordination checklist

Before wiring production:
1. Confirm production editor and Market origins and cookie/session arrangement.
2. Identify the existing public catalogue endpoint and exact product URL pattern.
3. Confirm canonical `listingId`, `typeCode`, category and price response fields.
4. Agree the secure checkout return-state mechanism.
5. Identify existing purchases/ownership/source-access services.
6. Agree ticket expiry, one-time consumption and source delivery mechanism.
7. Identify the existing creator upload/listing-draft route and required source/preview file types.
8. Confirm the Market-side allowed-edit format list matches the editor capability registry.

Implement in order: public catalogue → exact product/checkout link → safe return → edit ticket/source exchange → purchases library → creator upload hand-off. Each is a separately testable delivery; do not attempt all in one change.
