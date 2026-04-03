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
- Keep components under 300 lines split if larger
- Always calculate GST on post-discount taxable value
- Use server/auth.ts for all permission checks
- Shared types go in shared/schema.ts

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
