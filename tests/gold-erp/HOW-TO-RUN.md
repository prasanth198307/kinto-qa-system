# Gold ERP Test Suite — How to Run

## Login Credentials
- **Tenant slug:** gold-erp-demo
- **Username:** goldadmin
- **Password:** Gold@1234
- **Tenant ID:** 13
- **Plan:** gold_erp_plan

## Test Status (as of 2026-05-09)
| Test | File | Status |
|------|------|--------|
| F01 | f01-production-cycle.md | PASSED |
| F02 | f02-retail-pos.md | PASSED |
| F03 | f03-chit-scheme.md | PASSED |
| F04 | f04-wholesale-jobwork.md | PASSED |
| F05 | f05-bullion-rate-cut.md | PASSED |
| F06 | f06-physical-audit.md | PASSED |
| F07 | f07-karigar-settlement-math.md | PASSED |
| F08 | f08-metal-ledger.md | PASSED |
| F09 | f09-hallmarking.md | PASSED |
| F11 | f11-ecatalog-oms.md | PASSED |
| F12 | f12-repairs.md | PASSED (fixed 2026-05-09) |
| F13 | f13-refining.md | PASSED |
| F14 | f14-multi-stage-production.md | PASSED (fixed 2026-05-09) |
| F15 | f15-crm-full-flow.md | PASSED (fixed 2026-05-09) |
| F16 | f16-multi-branch.md | PASSED (fixed 2026-05-09) |
| F17 | f17-vendor-purchase.md | NOT YET RUN |
| F18 | f18-hrms-payroll.md | NOT YET RUN |
| F19 | f19-ecommerce.md | NOT YET RUN |
| F21 | f21-hrms-exit.md | NOT YET RUN |
| F22 | f22-bank-reconciliation.md | NOT YET RUN |
| F23 | f23-crm-dashboards.md | NOT YET RUN |
| F24 | f24-multi-currency.md | NOT YET RUN |
| F25 | f25-admin-settings.md | NOT YET RUN |
| F26 | f26-standard-erp-gaps.md | NOT YET RUN |
| F27 | f27-security-admin.md | NOT YET RUN |
| SC  | sc-individual-screens.md | NOT YET RUN |

## How to Run a Single Test

Ask the AI agent:

> "Run Gold ERP test F14" 

Or paste this exact prompt into the agent chat:

```
Run the Gold ERP test for f14-multi-stage-production.md.
Credentials: tenant slug=gold-erp-demo, username=goldadmin, password=Gold@1234.
All sections are at /gold-erp?section=<key>.
If it fails, fix the bug and re-run.
```

## How to Run Multiple Tests (one at a time)

**Important:** Run tests one at a time — parallel execution causes "Execution interrupted" errors.

Example prompt for the agent:

```
Run Gold ERP tests F14, F15, F16 one at a time (not in parallel).
Wait for each result before starting the next.
Credentials: tenant slug=gold-erp-demo, username=goldadmin, password=Gold@1234.
All sections at /gold-erp?section=<key>.
Fix any failures before moving to the next test.
Confirm results with me before running the next batch.
```

## How to Run in Code (for agent use)

```javascript
const fs = await import('fs');
const TECH = `Tenant slug: gold-erp-demo | Login: goldadmin / Gold@1234 | tenant_id: 13
Auth: /auth → Company ID "gold-erp-demo" → Username "goldadmin" → Password "Gold@1234" → Sign In
All Gold ERP sections at /gold-erp?section=<key>`;

const plan = fs.readFileSync('/home/runner/workspace/tests/gold-erp/plans/f14-multi-stage-production.md', 'utf-8');
const r = await runTest({ testPlan: plan, relevantTechnicalDocumentation: TECH });
console.log(`[F14] ${r.status.toUpperCase()}`);
console.log(r.testOutput);
```

## Key Technical Notes for Agent
- DB changes: NEVER use `db:push`. Use `psql $DATABASE_URL -c "..."` and save scripts to `db_scripts/`
- All Gold ERP routes: `server/gold-erp-routes.ts` and `server/gold-erp-routes2.ts`
- Gold ERP UI: `client/src/pages/gold-erp.tsx`, `client/src/pages/gold-erp-retail.tsx`, `client/src/pages/gold-erp-gap-screens.tsx`
- role_permissions columns are INTEGER (0/1), not boolean
- Parallel test execution causes "Execution interrupted" — always run one at a time
- Test runner may time out on very large plans (60+ steps) — provide detailed TECH docs to help it navigate faster

## Playwright Session Fix (2026-05-09)
Replit sets session cookies as `SameSite=None; Secure`, which Chromium rejects over plain `http://localhost`.
Two changes were made to fix this permanently:

1. **`server/index.ts`** — middleware that marks direct localhost connections as HTTPS (sets
   `X-Forwarded-Proto: https`) so express-session actually sends the `Set-Cookie` header.
2. **`tests/gold-erp/login-helper.ts`** — reusable login helper that:
   - POSTs to `/api/login` via Playwright's `page.request` (bypasses browser cookie enforcement)
   - Manually injects the `connect.sid` cookie into the browser context via `addCookies()`
   - All future Playwright tests must import and use this helper instead of UI-based login

Every Playwright test in this suite should import from `./login-helper`:
```typescript
import { login, goToSection, selectFirst, fillInput } from "./login-helper";
```

## DB Scripts Added for F12 Fix
- `db_scripts/2026-05-09_f12_counter_bookings_columns.sql` — adds item_weight, gold_rate_today, item_description to jw_counter_bookings
- `db_scripts/2026-05-09_f12_repair_invoices.sql` — creates jw_repair_invoices table
