# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system enables operators, reviewers, managers, and administrators to perform their respective tasks, including checklist completion, verification, approval, and system configuration. Key features include FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, and comprehensive reporting. Built with a full-stack TypeScript solution using React and Express, it prioritizes speed and error prevention for industrial workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, and Wouter, featuring `shadcn/ui` (Radix UI) and Tailwind CSS with a "New York" theme and Material Design principles. It is mobile-first, using a custom color palette, typography, spacing, and elevation. Navigation is via a Vertical Sidebar with role-based dashboards and reusable UI components. Form validation uses `react-hook-form` and `zod`.

### Technical Implementations
The backend is an Express.js application with TypeScript and Node.js. It includes Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. Neon Serverless PostgreSQL is the database, accessed via Drizzle ORM. The schema supports users, machines, checklists, inventory, transactions, and GST-compliant invoices. It features multi-item issuance, a Header-Detail pattern for transactional integrity, automatic inventory management, and comprehensive vendor and role management systems. API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices) optimized for A4 printing with company branding.
- **Sales Dashboard:** Provides analytics on revenue, goods sold, total orders, and average order value with flexible time filters.
- **Machine Startup Reminder System:** Manages and tracks machine startup tasks, sending multi-channel reminders (WhatsApp, Email) before scheduled production.
- **Missed Checklist Notification System:** Automatically alerts relevant personnel (operator, reviewer, manager, admin) via WhatsApp for overdue checklist assignments.
- **Invoice-First Gatepass Flow:** Ensures gatepasses are created only after an invoice, auto-populating items from the invoice to maintain data consistency.
- **Invoice Template Management System:** Allows admin to create and manage professional invoice templates with customizable seller details, bank information, terms & conditions, and company logo support.
- **Enhanced Invoice Form:** Features a compact single-line item layout, template selection, ship-to address section, complete bank account details, and a print preview.
- **Gatepass Print Functionality:** Provides a print preview for gatepasses, including company branding, details, itemized list, and signature blocks.
- **Centralized Reports Module:** A unified page for various operational and GST reports with a tabbed interface, print preview, smart filtering, and export options (JSON, Excel).
- **GST Reports for Filing:** Supports GSTR-1 and GSTR-3B with auto-classification of invoices, HSN summary, and accurate tax calculations for monthly, quarterly, or annual filing.
- **Professional Delete Confirmations:** Implements `shadcn AlertDialog` for all delete operations for consistent UX.
- **Updated Branding:** Login page and hero content updated to reflect the system's comprehensive "KINTO Operations & QA" capabilities.
- **Complete Dispatch Tracking Workflow:** Bulletproof 5-stage flow with strict status validation:
  1. **Invoice Creation** (status: draft)
  2. **Gate Pass Generation** (invoice→ready_for_gatepass, gatepass→generated)
  3. **Vehicle Exit Recording** (gatepass→vehicle_out, invoice→dispatched) - requires generated status
  4. **Proof of Delivery** (gatepass→delivered, invoice→delivered) - requires vehicle_out status + digital signature
  - Enforces workflow ordering through backend status preconditions (400 errors for invalid transitions)
  - Mobile-ready signature capture using HTML5 canvas with touch/mouse support
  - Multi-layer signature validation: format check, minimum length (100 chars), base64 content verification (50+ chars)
  - Prevents workflow bypass, status regression, and empty signature submissions
  - Tracks vehicle exit/entry times, security verification, cases count, seal numbers, and delivery confirmation

### System Design Choices
- **Authentication:** Users can log in with either username or email.
- **Database Schema:** Includes a `is_cluster` flag in `vendors`, `gatepasses`, and `invoices` tables for mobile integration efficiency. Status tracking fields in both `invoices` (draft→ready_for_gatepass→dispatched→delivered) and `gatepasses` (generated→vehicle_out→delivered→completed) enable complete dispatch workflow tracking.
- **Dispatch Workflow:** Invoice-first approach with tamper-proof state machine. Backend validates status preconditions before each transition:
  - `PATCH /api/gatepasses/:id/vehicle-exit` requires status="generated", updates to "vehicle_out" + invoice to "dispatched"
  - `PATCH /api/gatepasses/:id/pod` requires status="vehicle_out", validates non-empty signature, updates to "delivered" + invoice to "delivered"
  - Prevents skipping stages, status regression, and workflow violations through strict 400 error responses
  - Digital signature required for POD: validates base64 image format, minimum content length, and actual signature data
- **Build & Deployment:** Development uses Vite dev server with `tsx`-powered Express; production builds use Vite for frontend and `esbuild` for backend. Drizzle Kit manages database schema.

## External Dependencies

### Database
- Neon Serverless PostgreSQL

### Authentication
- Replit Auth (OpenID Connect)
- `openid-client`
- `passport`

### UI Libraries
- Radix UI
- Lucide React
- date-fns
- cmdk
- vaul
- shadcn/ui

### Form Management
- react-hook-form
- @hookform/resolvers
- zod
- drizzle-zod

### Development Tools
- TypeScript
- Vite
- esbuild
- Tailwind CSS
- class-variance-authority
- tailwind-merge

### Styling
- Google Fonts

### Notification Services
- SendGrid (Email)
- Twilio (WhatsApp)

### Other
- Wouter (Routing)
- TanStack Query (Server State Management)