# Security requirements

This is a requirements checklist, not a claim that the current baseline has passed a security audit.

- Treat every imported file, filename, layer name, PSD text layer, SVG and project package as untrusted input.
- Enforce file-size and decompression limits before parsing. Validate signatures/magic bytes where practical; do not trust extensions or browser MIME values alone.
- Parse complex formats in Web Workers where supported. Keep the UI responsive and isolate failures.
- Sanitize SVG before preview/rendering; remove scripts, event-handler attributes, foreign content and external resource references unless explicitly supported and safe.
- Prefer `textContent` and DOM node creation. Do not interpolate imported/user-controlled strings into `innerHTML`.
- Keep marketplace ownership authoritative on the server. Never trust a user ID, purchase flag, listing ID or source URL supplied by the browser.
- Edit only private copies. Never write to the seller's original object.
- Use short-lived, one-time edit tickets and short-lived read-only signed source URLs. Do not persist them in local storage or logs.
- Keep secrets out of `config.js` and all client bundles.
- Deploy CSP and security headers as HTTP response headers. A meta CSP is not sufficient for directives such as `frame-ancestors`.
- Remove wildcard external origins and third-party runtime requests; self-host pinned dependencies and fonts.
- Apply CSRF protection to state-changing authenticated requests.
- Add automated tests for malformed files, oversized files, hostile SVG, ticket replay, expired tickets and cross-user project access.

## Current known gaps

The current v1.2.8-derived baseline has not completed the SVG sanitization, full `innerHTML` audit, strict response-header CSP, dependency audit or penetration/security testing. Do not describe it as production-secure until these checks pass.
