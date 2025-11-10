# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system supports operators, reviewers, managers, and administrators through tasks like checklist completion, verification, approval, and system configuration. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, and extensive reporting. It is a full-stack TypeScript solution using React and Express, designed for speed and error prevention in industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, and Wouter, incorporating `shadcn/ui` (Radix UI) and Tailwind CSS with a "New York" theme and Material Design principles. It features a mobile-first approach, custom styling, and a Vertical Sidebar for navigation with role-based dashboards. Dedicated detail pages for invoices and dispatch tracking offer comprehensive views and context-specific actions. Form validation is handled by `react-hook-form` and `zod`.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js. It features Email/Password Authentication using `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM, with a schema supporting various operational entities. It implements multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices) optimized for A4 printing with company branding.
- **Sales Dashboard:** Provides analytics on revenue, goods sold, total orders, and average order value with flexible time filters.
- **Enhanced Overview Dashboard:** Displays a 4-card summary showing today's raw material issuances, gatepasses, invoices created, and real-time current stock levels. Stock updates when gatepasses are created.
- **Machine Startup Reminder System:** Manages and tracks machine startup tasks, sending multi-channel reminders (WhatsApp, Email) before scheduled production.
- **Missed Checklist Notification System:** Automatically alerts relevant personnel (operator, reviewer, manager, admin) via WhatsApp for overdue checklist assignments.
- **Invoice-First Gatepass Flow:** Enforces that gatepasses can only be created from existing invoices, auto-populating items from the invoice to maintain data consistency.
- **Invoice Template Management System:** Allows admin to create and manage professional invoice templates with customizable details.
- **Enhanced Invoice Form & Detail Page:** Features a compact single-line item layout, template selection, ship-to address, bank details, print preview, and a dedicated detail page (`/invoice/:id`) with comprehensive information and actions.
- **Gatepass Print Functionality:** Provides a print preview for gatepasses with company branding and details.
- **Multi-Screen Invoice Printing:** Print options are available from Invoice Detail Page, Invoice Table, Gatepass Table, and Dispatch Tracking Dashboard.
- **Centralized Reports Module:** A unified page for operational and GST reports with a tabbed interface, print preview, smart filtering, and export options.
- **GST Reports for Filing:** Supports GSTR-1 and GSTR-3B with auto-classification, HSN summary, and accurate tax calculations.
- **Professional Delete Confirmations:** Implements `shadcn AlertDialog` for all delete operations for consistent UX.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow (Invoice Creation, Gate Pass Generation, Vehicle Exit Recording, Proof of Delivery) with strict status validation and backend preconditions. Requires digital signature for Proof of Delivery.
- **Comprehensive Role Permissions Management:** Updated role permissions screen includes all 26 system screens for granular access control (View, Create, Edit, Delete).
- **Fixed Header Overlap Issue:** Resolved z-index and layout overlap issues in the UI.

### System Design Choices
- **Authentication:** Users can log in with either username or email.
- **Database Schema:** Includes `is_cluster` flag for mobile integration and status tracking fields in `invoices` and `gatepasses` tables for the dispatch workflow.
- **Dispatch Workflow:** Invoice-first approach with a tamper-proof state machine. The backend validates status preconditions before each transition and requires a non-empty digital signature for Proof of Delivery.
- **Inventory Management Logic:** Inventory deduction occurs only when gatepasses are created (physical dispatch), not when invoices are created.
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

## Testing & Quality Assurance

### Test Infrastructure
- **Test Suite:** 55 comprehensive E2E test cases covering all major workflows
- **Original Pass Rate:** 42/55 (76.4%)
- **Current Estimated Pass Rate:** 48-52/55 (87-95%) after bug fixes

### Test Credentials (E2E Testing)
Four test users with known passwords configured for automated testing:
- Admin: `admin` / `Admin@123`
- Manager: `manager_test` / `Test@123`
- Operator: `operator_test` / `Test@123`
- Reviewer: `reviewer_test` / `Test@123`

Documentation: See `TEST_CREDENTIALS.md` and `TEST_STATUS_SUMMARY.md`

### Recent Bug Fixes

#### Bug #7: Delete UX Standardization (FIXED)
- **Issue:** Inconsistent delete confirmation UX across application
- **Solution:** Created reusable `ConfirmDeleteDialog` component using shadcn AlertDialog
- **Files:** Applied to 10 components (AdminUserManagement, AdminMachineConfig, RoleManagement, AdminMachineTypeConfig, BankManagement, PurchaseOrderManagement, AdminSparePartsManagement, AdminPMTaskListTemplates, MobileHeader, TopRightHeader)
- **Impact:** Improved user experience and safety for all delete operations

#### Bug #8: Reviewer Dashboard (FIXED)
- **Issue:** Missing reviewer approval workflow for checklist submissions
- **Solution:** Complete backend API + frontend page with three-tab interface
- **Routes:** GET/PATCH `/api/checklist-submissions` with role-based authorization
- **Files:** 
  - `client/src/pages/ReviewerDashboard.tsx` (new)
  - `server/routes.ts` (added endpoints)
  - `server/storage.ts` (added methods)
- **Features:** Pending Review, Reviewed, and All tabs with approve/reject actions

#### Self-Deletion Prevention (FIXED)
- **Issue:** Users could delete their own accounts causing session errors
- **Solution:** Backend validation in DELETE `/api/users/:id` route
- **Behavior:** Returns 400 error with message "Cannot delete your own account"
- **Location:** `server/routes.ts` (lines 330-333)