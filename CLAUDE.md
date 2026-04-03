# CLAUDE.md — kinto-qa-system

## Project Overview
QA and invoice management system for Kinto Water.

## Tech Stack
- Frontend: React + TypeScript in client/src/
- Backend: Node.js + Express in server/
- Database: PostgreSQL
- ORM: Drizzle (schema in shared/schema.ts)
- Package manager: Bun

## Folder Structure
- client/src/components/ — Reusable UI components
- client/src/pages/ — Application pages
- client/src/lib/ — Utilities and helpers
- client/public/ — Static assets
- server/index.ts — Server entry point
- server/routes.ts — API routes
- server/storage.ts — Database operations
- server/auth.ts — Authentication
- server/db.ts — Database connection
- shared/schema.ts — Database schema Drizzle ORM
- db_scripts/ — SQL migrations and seeds
- docs/ — All documentation
- scripts/ — Utility scripts
- dist/ — Production build output never modify

## Rules for Claude
- Always add SQL migration scripts in db_scripts/ folder
- File naming for migrations: YYYY-MM-DD_description.sql
- Never modify .github/workflows/ files
- Never modify dist/ folder
- Always calculate GST on post-discount taxable value
- Use server/auth.ts for all permission checks
- Shared types go in shared/schema.ts
- Keep all components under 300 lines
- If a file exceeds 300 lines split it into smaller components
- Suggest specific file names and responsibilities when splitting

## Key Files
- Invoice form: client/src/components/InvoiceForm.tsx
- Print invoice: client/src/pages/PrintInvoicePage.tsx
- Print gatepass: client/src/pages/PrintInvoiceGatepassPage.tsx
- DB schema: shared/schema.ts
- API routes: server/routes.ts
- Auth: server/auth.ts

## Database Migrations
- Location: db_scripts/
- New migrations format: YYYY-MM-DD_description.sql
- Example: 2026-04-03_add_discount_mode.sql

## Large Files Warning
- client/src/components/InvoiceForm.tsx is very large (~2025 lines)
- Always use Grep to search this file before reading
- Never read InvoiceForm.tsx fully in one go
- Use offset and limit to read specific sections only
- Suggest splitting into smaller components when touching this file

## InvoiceForm Split Components
InvoiceForm.tsx has been partially split. Current structure:
- InvoiceForm.tsx (~2025 lines) — core form logic, state, mutations, layout
- InvoiceItemRow.tsx (~344 lines) — single line-item row (product, qty, price, discount, GST, transport, remove)
- InvoiceTaxSummary.tsx (~64 lines) — tax breakdown card (subtotal, CGST/SGST/IGST, transport, total)

## How to Split Large Files
When a file exceeds 300 lines split it like this:
- Extract self-contained UI sections into their own component files
- Each component should have one clear responsibility
- Keep shared state in parent component
- Use props to pass data down
- Always check for unused imports after extracting a component
