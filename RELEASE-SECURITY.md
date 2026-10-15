# Dependency-security maintenance — 2026-10-15

The project-page release includes an owner-authorised, range-compatible lockfile refresh. The previous full npm audit reported six affected package records (four high, two moderate); these were inherited, not introduced by the landing page. Both full and production-filtered final audits report zero findings after a fresh locked install. This is point-in-time dependency evidence, not a security certification.

| Dependency | Before | After |
|---|---|---|
| Vitest and its seven coupled `@vitest/*` packages | 4.1.9 | 4.1.12 |
| nanoid | 3.3.15 | 3.3.20 |
| postcss | 8.5.16 | 8.5.30 |
| source-map-js | 1.2.1 | 1.2.2 |
| undici | 7.28.0 | 7.30.1 |

Only those twelve package records changed. Unnecessary Chai/tinyrainbow refreshes were excluded. Package manifest ranges, framework versions, the estate UI archive and application logic are unchanged. No overrides, audit suppression, force update or major framework migration was used.

## Exposure and advisory evidence

Vite/Tailwind consume PostCSS, NanoID and source-map-js while building; Vitest/mocker and jsdom→Undici are test tooling. This site does not expose those Node APIs as a web service. Malicious build inputs and test resources remain a relevant boundary; an audit finding alone did not demonstrate an exploitable website. In AlignEd, some build packages are classified as production dependencies because Tailwind is declared in `dependencies`; that classification is not proof of browser-runtime reachability.

Primary metadata was checked for ranges, withdrawal status and related follow-up fixes:

- [Vitest redirect-mock path traversal](https://github.com/advisories/GHSA-82fw-gwwq-j7x9): patched in 4.1.11.
- NanoID [negative-size loop](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) and [zero-size loop](https://github.com/advisories/GHSA-2v37-7h3g-55p8): 3.3.18 covers both advisory ranges.
- PostCSS [source-map traversal](https://github.com/advisories/GHSA-r28c-9q8g-f849) and [incomplete-fix follow-up](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp): 8.5.23 covers the follow-up.
- [source-map-js indexed-map denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): patched in 1.2.2.
- Undici's HTTP/cache/cookie, WebSocket and TLS advisory family affects 7.28.0; the checked follow-up fixes require at least 7.29.1. Examples: [TLS connect-option handling](https://github.com/advisories/GHSA-w293-vg96-wgc3), [cache disclosure](https://github.com/advisories/GHSA-4cwx-7wf7-3272) and [WebSocket subprotocol denial of service](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5).

Release acceptance additionally requires the README's native tests, lint/type checks, rebuilt site and landing/browser journeys against the final lockfile. Local results are separate from source publication and live deployment verification.
