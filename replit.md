# KINTO QA Management System

## Overview
KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance application for manufacturing. It enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system, including machines, users, checklist templates, and spare parts. Built as a full-stack TypeScript solution with a React frontend and Express backend, it's designed for industrial QA workflows, focusing on speed, clarity, and error prevention.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)

### GST-Compliant Invoice Generation Feature (COMPLETED)
A complete invoice generation system integrated with gatepasses:

**Components:**
- **InvoiceForm**: Comprehensive invoice entry with automatic GST calculation and edit capability
  - **Create Mode**: Auto-populates buyer details from vendor master, pre-fills items from gatepass
  - **Edit Mode**: Loads existing invoice data with proper unit conversion (paise→rupees, basis points→percentages)
  - **Bank Master Integration**: Dynamic dropdown for bank selection with auto-population of default bank
  - Bank details (name, account number, IFSC code, UPI ID) displayed as read-only fields after selection
  - Automatic tax calculation: CGST+SGST (intrastate) or IGST (interstate) based on seller/buyer state comparison
  - Currency storage in paise (×100), tax rates in basis points (×100 for percentages)
  - Supports both POST (create) and PATCH (update) operations
  
- **PrintableInvoice**: Vyapaar-style PDF generator
  - Three copies: Original for Buyer, Duplicate for Transporter, Triplicate for Seller
  - Complete GST tax breakup with CGST/SGST/IGST/Cess
  - Seller/buyer details, bank account info, UPI ID, QR code placeholder
  - Browser-based print via HTML template (no external PDF library)
  
- **InvoiceTable**: Invoice list with Edit and Delete actions
  - Edit button opens InvoiceForm in edit mode with pre-populated data
  - Print button generates printable invoice PDF
  
- **Integration**: "Generate Invoice" button in GatepassTable pre-fills InvoiceForm with gatepass data

**Workflow**: 
- Create: Gatepass → Generate Invoice → Auto-filled buyer & items → User enters unit prices → Select bank → Save → Print PDF
- Edit: Invoice List → Edit → Modify prices/details → Update → Print PDF

**Production Status**: ✅ Feature complete with Bank Master integration and invoice editing. Pending: End-to-end testing with authenticated user session.

### Payment Tracking System (COMPLETED)
A complete payment tracking system for invoices with support for partial payments, advances, and full payment reconciliation:

**Database Schema:**
- **invoice_payments Table**: Tracks all payments against invoices
  - Payment amount (stored in paise ×100)
  - Payment date, method (cash, cheque, NEFT, RTGS, UPI, other)
  - Payment type (advance, partial, full)
  - Bank selection for payment association
  - Reference number for transaction tracking
  - Remarks for additional notes
  - Soft delete support via recordStatus flag

**Components:**
- **PaymentForm**: Payment recording interface with comprehensive validation
  - Date picker for payment date
  - Amount input with automatic conversion to paise
  - Payment method dropdown
  - Payment type selection (advance/partial/full)
  - Bank selection dropdown (linked to bank master)
  - Reference number and remarks fields
  - Form validation via react-hook-form and zod
  
- **PaymentHistory**: Complete payment history viewer
  - Displays all payments for an invoice in chronological order
  - Shows running balance after each payment
  - Delete functionality for payment corrections
  - Real-time balance updates via TanStack Query
  
- **InvoiceTable**: Updated with payment tracking
  - Outstanding Balance column showing (invoice total - sum of payments)
  - "Record Payment" button to open payment dialog
  - Payment dialog shows PaymentForm and PaymentHistory side-by-side
  
**Backend Implementation:**
- **API Routes**: RESTful endpoints for payment CRUD operations
  - `GET /api/invoices/:id/payments` - Get all payments for an invoice
  - `GET /api/payments` - Get all payments (admin/manager only)
  - `POST /api/invoices/:id/payments` - Record a new payment
  - `DELETE /api/payments/:id` - Soft delete a payment
  - Role-based access control via requireRole middleware
  - Comprehensive audit logging for all payment transactions
  
- **Storage Layer**: Payment methods in IStorage interface
  - `createPayment()` - Insert new payment record
  - `getAllPayments()` - Retrieve all payments
  - `getPayment()` - Get single payment by ID
  - `getPaymentsByInvoice()` - Get payments for specific invoice
  - `deletePayment()` - Soft delete payment record

**Workflow:**
1. User views invoice list with outstanding balances
2. Clicks "Record Payment" button
3. Payment dialog opens showing PaymentForm and PaymentHistory
4. User enters payment details and submits
5. Payment is recorded and invoice table updates with new outstanding balance
6. Payment history shows all payments with running balance

**Technical Details:**
- Outstanding balance calculation: `total - sum(payments where recordStatus = 1)`
- Payment amounts stored in paise (multiply by 100) for precision
- Automatic currency conversion in forms (paise ↔ rupees)
- Soft delete pattern allows payment history audit trail
- Real-time updates via TanStack Query cache invalidation

**Production Status**: ✅ Feature complete. Backend routes, storage methods, and UI components fully implemented. Pending: End-to-end testing with authenticated user session.

## System Architecture

### Frontend Architecture
The frontend uses **React 18** with **TypeScript**, **Vite** for building, and **Wouter** for routing. UI components are built with **shadcn/ui** (based on Radix UI) and styled using **Tailwind CSS** following a "New York" theme with Material Design principles. **TanStack Query** manages server state and API calls. The design system is mobile-first, featuring a custom color palette, typography, spacing, and elevation. 

**Navigation**: The application uses a **Vertical Sidebar Navigation** system with button-style navigation items, collapsible sections, and mobile-responsive design (240px width on desktop, collapsible on mobile). All dashboards (Admin, Manager) utilize a single VerticalNavSidebar component that controls all navigation, including sub-sections for inventory (UOM, Products, Raw Materials, Finished Goods, Vendors) and production (Raw Material Issuance, Gatepasses). InventoryManagement and ProductionManagement are embeddable content panels that accept activeTab props from their parent dashboards, eliminating nested sidebars.

Components include role-based dashboards, reusable UI elements, and admin configuration tools, with form validation via `react-hook-form` and `zod`.

### Backend Architecture
The backend is an **Express.js** application with **TypeScript** and **Node.js**. It features robust **Email/Password Authentication** with `scrypt` hashing (Node.js built-in) and `Passport.js`. A **Dynamic Role-Based Access Control (RBAC)** system supports `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions (`canView`, `canCreate`, `canEdit`, `canDelete`) managed via `roles` and `role_permissions` tables. Role assignments are secure, with admin/manager roles restricted to existing admins, and comprehensive audit logging. Route-level authorization uses `requireRole` middleware, validating against fresh database data. **Neon Serverless PostgreSQL** is the database, accessed via **Drizzle ORM** for type-safe queries. The database schema includes core tables for users, machines, checklists, inventory (spare parts, UOM, products, raw materials, finished goods), transactions (raw material issuance, gatepasses), and **GST-compliant invoices**. Multi-item issuance and gatepass architecture utilizes a Header-Detail pattern with transactional integrity, race condition protection, and automatic inventory management. A comprehensive **Vendor Master System** allows admin/manager users to maintain vendor/customer data, which integrates with gatepasses. A dedicated **Role Management System** empowers administrators with full CRUD capabilities for custom roles and screen-level permission configuration, while protecting default system roles. The **Invoice Management System** provides GST-compliant invoice generation with comprehensive tax breakup (CGST, SGST, IGST, Cess), seller/buyer details, payment information (bank account, UPI ID), and linkage to gatepasses for sales transactions.

### API Design
The RESTful API under `/api` features multi-layer authorization (`isAuthenticated`, `requireRole`) with fresh database lookups for role validation. It uses JSON for requests/responses, provides structured error handling, and implements comprehensive audit logging for security events and all mutations.

### Build & Deployment
Development uses `npm run dev` for a Vite dev server with an `tsx`-powered Express backend, featuring HMR. Production builds (`npm run build`) bundle the frontend with Vite and the backend with `esbuild`. Database schema management (`npm run db:push`) uses Drizzle Kit.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Cloud-native database.

### Authentication
- **Replit Auth**: Via OpenID Connect.
- `openid-client`, `passport`: For authentication flows.

### UI Libraries
- **Radix UI**: Headless component primitives.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation.
- **cmdk**: Command menu.
- **vaul**: Drawer component.

### Form Management
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Validation resolver.
- **zod**: Schema validation.
- **drizzle-zod**: Drizzle to Zod schema conversion.

### Development Tools
- **TypeScript**: For type safety.
- **Vite**: Frontend build tool.
- **esbuild**: Backend bundling.
- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant management.
- **tailwind-merge**: Intelligent Tailwind class merging.

### Styling
- **Google Fonts**: Inter font family.