---
name: POS Hardware Terminal Integration
description: How card terminals (Pine Labs, Ingenico, Razorpay POS) are wired into the POS flow
---

## Rule
`pos_terminals` table maps hardware devices to counter names. On card payment, backend routes to the correct API based on `terminal_type`.

**Why:** Different retailers have different card machines; the system must be brand-agnostic and counter-scoped.

**How to apply:**
- Terminal types: `manual` | `razorpay_pos` | `pine_labs` | `ingenico` | `generic_http`
- Pine Labs / Ingenico call local network IP synchronously and return paid/failed immediately
- Razorpay POS stores a pending record in `pos_upi_payments` (reused table) and frontend polls `/api/pos/payments/card-status/:chargeId`
- `pos_transactions` now has `razorpay_payment_id`, `terminal_id`, `card_ref` columns

## Key endpoints
- `GET/POST/PUT/DELETE /api/pos/terminals` — CRUD
- `GET /api/pos/terminals/by-counter/:counter` — used by CardTerminalDialog to auto-load terminal
- `POST /api/pos/payments/initiate-card` — routes to correct terminal API
- `GET /api/pos/payments/card-status/:chargeId` — polling (Razorpay POS only)
