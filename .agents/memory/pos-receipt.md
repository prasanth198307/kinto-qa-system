---
name: POS Thermal Receipt Printing
description: How bill printing works after each sale in the POS terminal
---

## Rule
`PrintReceiptDialog` auto-opens after every successful sale (saleMut.onSuccess sets showPrintDialog=true). Cashier can print or dismiss.

**Why:** Billing counter needs a receipt for every transaction; auto-open ensures cashier never forgets.

**How to apply:**
- `lastSaleTxn` and `lastSaleItems` snapshots are stored in TerminalTab state before cart is cleared
- Print opens a new browser window with `window.open()` and injects `id="thermal-receipt-content"` HTML
- Uses monospace font, 80mm width CSS targeting, dashed dividers — works on any thermal or A4 printer
- Company name/address/GSTIN pulled from `/api/settings/company` query
