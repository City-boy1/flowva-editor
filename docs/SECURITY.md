# Security requirements

This is a requirements checklist, not a claim that the current baseline has passed a security audit.

## File/editor security
- Treat every imported file, filename, layer name, PSD text layer, SVG and project package as untrusted input.
- Enforce file-size and decompression limits before parsing. Validate signatures/magic bytes where practical; do not trust extensions or browser MIME values alone.
- Parse complex formats in Web Workers where supported. Keep the UI responsive and isolate failures.
- Sanitize SVG before preview/rendering; remove scripts, event-handler attributes, foreign content and external resource references unless explicitly supported and safe.
- Prefer `textContent` and DOM node creation. Do not interpolate imported/user-controlled strings into `innerHTML`.

## Marketplace identity and ownership
- FlowvaMarket is the only identity, session, purchase, entitlement, listing and creator-eligibility authority. Do not create a separate editor password/account system.
- Public catalog browsing and guest/local editor use do not require login. Private purchased library, marketplace-hosted source retrieval, checkout and creator publishing require FlowvaMarket authorization.
- Never trust a browser-supplied user ID, purchase flag, ownership claim, listing ID or source URL as proof of entitlement. Verify ownership on the server for every private source request.
- Do not assume editor JavaScript can read marketplace HttpOnly cookies. Silent session reuse is only possible through an explicitly supported same-site session arrangement or a secure hand-off.
- Validate and allowlist redirect/return destinations. Never create an open redirect or put long-lived credentials in query strings.
- Use short-lived, single-use edit tickets bound server-side to the authenticated user, listing and source. Consume atomically; reject replay and expiry. Do not persist tickets in localStorage or logs.
- Use short-lived, read-only signed source URLs or authenticated streaming. Never expose permanent source URLs or storage credentials.
- Editing always occurs on a private working copy. Never overwrite the seller's marketplace original.
- Creator upload hand-offs must be short-lived, scoped to the creator and draft, and must not bypass listing validation or admin moderation.

## Deployment and application security
- Keep secrets out of `config.js` and all client bundles.
- Deploy CSP and security headers as HTTP response headers. A meta CSP is not sufficient for directives such as `frame-ancestors`.
- Remove wildcard external origins and third-party runtime requests; self-host pinned dependencies and fonts.
- Apply CSRF protection to state-changing authenticated requests and ticket creation.
- Use HTTPS and a strict CORS allowlist. Configure cookie SameSite/domain attributes based on the actual deployment topology and test in supported browsers.
- Add automated tests for malformed/oversized files, hostile SVG, ticket replay/expiry, cross-user access, redirect allowlists and unauthorized uploads.

## Current known gaps

The current baseline has not completed SVG sanitization, the full `innerHTML` audit, strict response-header CSP, dependency audit or penetration/security testing. Do not describe it as production-secure until these checks pass.
