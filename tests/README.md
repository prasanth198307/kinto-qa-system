# SwachERP 360° QA Test Suite

## Structure

```
tests/
├── seed/
│   └── create-test-tenants.sql     # Seeds 4 test tenants (IN/AE/US/EU)
├── helpers/
│   └── api.ts                      # Typed fetch client with auth
├── api/
│   ├── currency-format.test.ts     # Unit tests — formatCurrency, decimals, Excel numFmt
│   ├── invoice-workflow.test.ts    # Invoice GST/VAT/Tax computation for all 4 regions
│   ├── plan-gating.test.ts         # 403 for locked modules, 200 for permitted ones
│   └── hr-payroll.test.ts          # Payroll run creation + attendance
├── smoke/
│   └── all-routes.spec.ts          # Visits all ~200 routes as each tenant; checks:
│                                   #   - no blank page
│                                   #   - no 'undefined' currency
│                                   #   - no ₹ for non-IN tenants
│                                   #   - no JS console errors
└── workflows/
    ├── restaurant-pos.spec.ts      # POS order → payment → ₹/GST verification
    └── invoice-pdf.spec.ts         # Invoice form + print page currency per tenant
```

## Setup

### 1. Seed test data

```bash
# Against local dev DB:
npm run test:seed

# Or manually:
psql $DATABASE_URL -f tests/seed/create-test-tenants.sql
```

Creates:
- Tenant 9001: India (`qa_admin_in` / `Test@1234`) — restaurant_enterprise plan
- Tenant 9002: UAE (`qa_admin_ae` / `Test@1234`) — hotel_professional plan
- Tenant 9003: USA (`qa_admin_us` / `Test@1234`) — retail_professional plan
- Tenant 9004: EU/Germany (`qa_admin_eu` / `Test@1234`) — manufacturing_enterprise plan

### 2. Start the app

```bash
npm run dev   # starts on http://localhost:5000
```

### 3. Run tests

```bash
# Currency unit tests only (no server needed, instant)
npm run test:unit

# API workflow tests (server must be running)
npm run test:api

# Smoke: all routes, all 4 tenants (server must be running, ~15 min)
npm run test:smoke

# UI workflow tests (Playwright, server must be running)
npm run test:workflows

# All tests in sequence
npm run test:all
```

## Test tenant credentials

| Tenant | Username      | Password  | Currency | Tax    | Plan                    |
|--------|---------------|-----------|----------|--------|-------------------------|
| India  | qa_admin_in   | Test@1234 | ₹ INR    | GST    | restaurant_enterprise   |
| UAE    | qa_admin_ae   | Test@1234 | د.إ AED  | VAT 5% | hotel_professional      |
| USA    | qa_admin_us   | Test@1234 | $ USD    | Sales Tax | retail_professional  |
| EU     | qa_admin_eu   | Test@1234 | € EUR    | VAT 19%| manufacturing_enterprise|

## Key assertions

| Check                          | File                        |
|-------------------------------|-----------------------------|
| `formatCurrency` all currencies| api/currency-format.test.ts |
| GST computed post-discount     | api/invoice-workflow.test.ts|
| VAT 5% (UAE)                  | api/invoice-workflow.test.ts|
| Sales Tax 8% (US)             | api/invoice-workflow.test.ts|
| VAT 19% (EU)                  | api/invoice-workflow.test.ts|
| Plan gates 403 for locked modules | api/plan-gating.test.ts |
| No ₹ for AE/US/EU tenants    | smoke/all-routes.spec.ts    |
| Print invoice currency correct | workflows/invoice-pdf.spec.ts|
| POS shows ₹ for IN tenant    | workflows/restaurant-pos.spec.ts|

## Adding tests for a new vertical

1. Add test users + data rows in `tests/seed/create-test-tenants.sql`
2. Add route entries in `tests/smoke/all-routes.spec.ts` ROUTES array
3. Create `tests/api/<vertical>-workflow.test.ts` covering the golden path
4. Create `tests/workflows/<vertical>-ui.spec.ts` for Playwright UI checks
