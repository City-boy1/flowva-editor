# FlowvaMarket developer hand-off

This is the short integration brief for the developer maintaining the main FlowvaMarket application. It is intentionally limited to the work Market needs to do. The detailed request/response and security contract is in `BACKEND_CONTRACT.md`.

## What we are building

FlowvaEditor is a separate browser editor. It needs to display real FlowvaMarket templates, send users to the exact selected product for checkout, return buyers to edit the exact acquired template when the format is supported, and send creators to Market's existing upload/listing process when they want to publish.

**Please do not build a second marketplace inside the editor.** Reuse the existing Market login, product page, checkout, purchases, storage, creator upload, listing draft and moderation systems.

## Market work requested, in small stages

### Market-01 — Public catalogue feed (first)
Expose or identify an existing public endpoint for approved/published templates. It must work for guests and return, at minimum: `listingId`, `title`, `description`, `previewUrl`, `categoryId`, canonical `typeCode`, Market price/currency/free status and canonical `productUrl`. Do not return source URLs, buyer data, drafts or unapproved listings.

**Acceptance:** Editor can show real Market templates without login. Clicking Get on a card opens that card's exact `productUrl`.

### Market-02 — Exact listing checkout return
Keep the exact `listingId` selected by the buyer through product page, login and checkout. Support a validated, allowlisted return to FlowvaEditor after successful free acquisition/purchase. If automatic return cannot be done safely yet, return to the exact product page and expose a manual **Open in FlowvaEditor** action as an interim step.

**Acceptance:** Test with two different listings. Acquiring listing A must never open listing B or a generic template.

### Market-03 — Secure edit authorization
Reuse Market's existing purchase/entitlement checks. Add only the ticket/edit-session adapter if no existing equivalent exists. Ticket must be single-use, short-lived, bound to the authenticated user + exact listing + source, and return a short-lived read-only source URL/stream. Server rechecks ownership and allowed type.

**Acceptance:** Unowned listing, expired ticket, reused ticket, mismatched listing and unsupported type are all rejected. Valid buyer opens a private copy; seller original remains unchanged.

### Market-04 — Purchased library data
Reuse the existing purchases API or expose a read-only current-user purchases adapter with safe metadata and `canEdit` state. Never return permanent private source URLs.

**Acceptance:** Signed-in buyer sees their actual acquired templates in the editor. Guest sees a sign-in prompt; local browser data is never treated as proof of ownership.

### Market-05 — Creator upload/publish hand-off
First reuse the existing creator upload/listing draft page. Editor should be able to send the creator there with an exported source/preview; manual upload is acceptable for the first working increment. Market keeps creator eligibility, title/description/category/price, validation, draft, moderation and publish steps.

**Acceptance:** Creator reaches the existing Market upload flow. Submission creates a draft, not an automatically approved/published listing. Once approved, it appears in the public catalogue.

## Decisions needed from Market developer

Please reply with the existing route/page names and response shape for each stage before new endpoints are added. Specifically confirm:
- Production Market origin and editor origin.
- Public catalogue route and canonical product URL pattern.
- Checkout's supported safe return mechanism.
- Existing purchase/ownership and private source retrieval services.
- Existing creator upload/listing-draft route.
- Canonical type-code list and which types Market permits buyers to edit.

## Security must-haves

Market remains the authority. Never trust browser `userId`, `isPurchased`, `canEdit`, price, source URL or publish status. Validate return URLs. Protect mutations with CSRF. Use short-lived one-time tickets. Keep source files private and read-only for buyer editing. Never let editor writes modify the creator's original. Do not bypass Market moderation.

See `BACKEND_CONTRACT.md` for exact proposed payloads and failure codes. Each Market stage can be delivered independently; Market-01 does not depend on implementing Market-03 or Market-05.
