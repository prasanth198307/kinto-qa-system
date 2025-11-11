# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system. It manages production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. The system supports operators, reviewers, managers, and administrators through tasks like checklist completion, verification, approval, and system configuration. Key capabilities include FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup tracking. It is a full-stack TypeScript solution using React and Express, designed for speed and error prevention in industrial settings.

**Production Status:** ✅ READY FOR ON-PREMISES DEPLOYMENT (November 10, 2025)

## Project Organization (Updated: November 10, 2025)

### Documentation Structure
All documentation has been organized into the `docs/` folder:
- **`docs/deployment/`** - Deployment guides (start with ON_PREM_DEPLOYMENT_CHECKLIST.md)
- **`docs/testing/`** - Test documentation and results
- **`docs/guides/`** - User guides and system documentation
  - **MACHINE_STARTUP_REMINDERS.md** - Complete guide for Machine Startup Reminder workflow
  - **WHATSAPP_CHECKLIST_COMPLETION.md** - Complete guide for WhatsApp-based checklist completion

### Scripts Organization
- **`scripts/`** - Active utility scripts (create-test-users, generate-deployment-pdf)
- **`scripts/legacy/`** - Old/archived scripts
- **`database_scripts/`** - Database migrations and seed files

### Root Directory
Root now contains only essential configuration files:
- Config files: package.json, tsconfig.json, vite.config.ts, drizzle.config.ts
- Documentation: README.md (main), replit.md (architecture)
- Core folders: client/, server/, shared/, docs/, scripts/

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
- **WhatsApp Checklist Completion System:** Allows operators to complete assigned checklists directly via WhatsApp messages with incremental task-by-task submission. Operators can submit tasks individually (`CL-ABC123 1:OK`), in batches (`CL-ABC123 1:OK 2:NOK-remarks`), or all at once. When NOK task submitted, system automatically requests photo upload and stores locally (`attached_assets/checklist_photos/`). After photo upload, system offers optional spare parts request with catalog search/linkage. Supports SKIP option if no spare part needed. System tracks progress via `waitingForPhoto` and `waitingForSparePart` state flags, sends confirmation after each submission, and auto-submits when all tasks completed or when operator sends uppercase `DONE` command. Supports mixed-case status (Ok, NOK, na), preserves lowercase "done" in remarks, and validates operator phone numbers.
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
- **Two-Way WhatsApp Integration:** Production-ready integration using Meta WhatsApp Business Cloud API (2.4× cheaper than Twilio) with free service conversations. Features include:
  - Outbound reminders with unique task reference IDs (MST-{timestamp}-{random})
  - Webhook endpoints (GET/POST) for receiving and processing incoming messages
  - Sender phone verification (only assigned operator can complete task)
  - Atomic status updates with race condition protection
  - Response status calculation (on_time, late, early) based on ±15 minute window
  - WhatsApp Analytics admin page with response rates and detailed history
  - Security hardening: Required WHATSAPP_VERIFY_TOKEN, message type guards, and conditional WHERE clauses

### System Design Choices
- **Authentication:** Users can log in with either username or email.
- **Database Schema:** Includes `is_cluster` flag for mobile integration and status tracking fields in `invoices` and `gatepasses` tables for the dispatch workflow. WhatsApp response tracking fields in `machineStartupTasks` table (taskReferenceId, operatorResponse, operatorResponseTime, responseStatus). Photo and spare parts tracking in `partial_task_answers` table (photoUrl, sparePartId, sparePartRequestText, waitingForPhoto, waitingForSparePart).
- **Dispatch Workflow:** Invoice-first approach with a tamper-proof state machine. The backend validates status preconditions before each transition and requires a non-empty digital signature for Proof of Delivery.
- **Inventory Management Logic:** Inventory deduction occurs only when gatepasses are created (physical dispatch), not when invoices are created.
- **WhatsApp Integration:** Meta WhatsApp Business Cloud API with sender verification, atomic updates, and comprehensive error handling. Supports both machine startup tracking and incremental checklist completion via two-way messaging. Checklist system uses `partial_task_answers` table for progress tracking, tempered greedy token regex for robust parsing, and case-sensitive DONE detection. Photo capture for NOK tasks with WhatsApp Media API downloads to local storage (`attached_assets/checklist_photos/`). Spare parts requests linked to catalog via search by name, with fallback to free text. Conversation state managed via `waitingForPhoto` and `waitingForSparePart` flags. Requires three environment variables: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN.
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

### Recent UI/UX Improvements

#### Header Layout Redesign (COMPLETED - November 11, 2025)
- **Issue:** KINTO logo and SmartOps text arranged horizontally caused logout/notification buttons to overlap page action buttons
- **Solution:** 
  - Added vertical layout option to KintoLogo component (logo stacked above text)
  - Created GlobalHeader component combining logo, page title, action buttons, and user controls in unified toolbar
  - Refactored TopRightHeader from fixed positioning to flex container for embedding
  - Updated AdminUserManagement to use new GlobalHeader pattern
- **Components:** 
  - `client/src/components/GlobalHeader.tsx` (new)
  - `client/src/components/branding/KintoLogo.tsx` (added layout prop)
  - `client/src/components/TopRightHeader.tsx` (refactored to non-fixed)
  - `client/src/components/AdminUserManagement.tsx` (migrated to GlobalHeader)
- **Status:** Initial implementation complete, ready for rollout to remaining pages

## Recent Bug Fixes

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

#### ReviewerDashboard Photo & Spare Parts Display (COMPLETED - November 11, 2025)
- **Feature:** ReviewerDashboard now displays photos and spare part requests for NOK tasks
- **Implementation:**
  - Fetches partial task answers via `/api/checklist-assignments/:id/partial-answers` endpoint
  - Displays uploaded photos with proper image rendering from local storage
  - Shows spare part requests (both catalog-linked and free-text)
  - Full integration with existing review workflow
- **Security:**
  - Endpoint requires reviewer/admin/manager roles
  - Verifies assignment belongs to user's submissions
  - Only assigned reviewer can view (unless admin/manager)
  - Audit logging for unauthorized access attempts
- **Files:**
  - `client/src/pages/ReviewerDashboard.tsx`: Enhanced with photo and spare parts display
  - `server/routes.ts`: Added secure partial-answers endpoint
  - `server/storage.ts`: Helper methods for partial task answers
- **Status:** Production-ready with architect approval ✅