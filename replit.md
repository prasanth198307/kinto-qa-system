# KINTO Operations & QA Management System

## Overview
KINTO Operations & QA is a comprehensive manufacturing operations and quality management system designed to manage production, inventory, purchase orders, invoicing, gatepasses, quality assurance, and preventive maintenance. It supports various user roles (operators, reviewers, managers, administrators) through tasks like checklist completion, verification, approval, and system configuration. Key features include FIFO payment allocation, GST-compliant invoice generation, robust payment tracking, extensive reporting, and two-way WhatsApp integration for machine startup and checklist management. The system is a full-stack TypeScript solution (React and Express) focused on speed and error prevention in industrial settings.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter, `shadcn/ui` (Radix UI), and Tailwind CSS ("New York" theme, Material Design principles). It features a mobile-first approach, custom styling, a Vertical Sidebar for navigation with role-based dashboards, and dedicated detail pages for invoices and dispatch tracking. Form validation is handled by `react-hook-form` and `zod`. A GlobalHeader ensures consistent branding and navigation across all pages, adapting for both sidebar and standalone layouts.

### Technical Implementations
The backend is an Express.js application built with TypeScript and Node.js. It features Email/Password Authentication using `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. The database is Neon Serverless PostgreSQL, managed via Drizzle ORM. The system implements multi-item issuance, a Header-Detail pattern for transactions, automatic inventory management, and comprehensive vendor and role management. The API is RESTful JSON with structured error handling, audit logging, and multi-layer authorization.

### Feature Specifications
- **Comprehensive Reporting System:** Generates printable, branded reports for various operations (Raw Material Issuance, Purchase Orders, PM Execution, Gatepass, GST-Compliant Invoices).
- **Sales & Overview Dashboards:** Provide analytics on revenue, orders, and real-time stock levels.
- **Machine Startup Reminder System:** Manages and tracks machine startup tasks, sending multi-channel reminders (WhatsApp, Email).
- **Missed Checklist Notification System:** Automatically alerts personnel via WhatsApp for overdue checklist assignments.
- **WhatsApp Checklist Completion System:** Allows operators to complete assigned checklists via WhatsApp with incremental task submission, photo uploads for "Not OK" tasks, and optional spare part requests.
- **Invoice-First Gatepass Flow:** Enforces gatepass creation from existing invoices, auto-populating items for data consistency.
- **Invoice & Gatepass Management:** Includes template management, enhanced invoice forms with print preview, and multi-screen printing options.
- **Centralized Reports Module:** A unified page for operational and GST reports with filtering and export options, including GSTR-1 and GSTR-3B.
- **Professional Delete Confirmations:** Consistent UX for all delete operations using `shadcn AlertDialog`.
- **Complete Dispatch Tracking Workflow:** A 5-stage workflow (Invoice Creation to Proof of Delivery) with strict status validation and digital signature for Proof of Delivery.
- **Comprehensive Role Permissions Management:** Granular access control across 26 system screens (View, Create, Edit, Delete).
- **Two-Way WhatsApp Integration:** Production-ready integration using Meta WhatsApp Business Cloud API for outbound reminders, inbound checklist completion, sender verification, atomic status updates, and analytics. Supports photo capture for NOK tasks and spare part requests.

### System Design Choices
- **Authentication:** Users can log in with username or email.
- **Database Schema:** Includes `is_cluster` for mobile integration and status tracking fields for dispatch workflow and WhatsApp responses.
- **Dispatch Workflow:** Invoice-first, tamper-proof state machine with backend validation and digital signature requirement.
- **Inventory Management Logic:** Inventory deduction occurs on gatepass creation (physical dispatch).
- **WhatsApp Integration:** Uses Meta WhatsApp Business Cloud API with sender verification, atomic updates, and state management for incremental checklist completion, including photo uploads and spare part requests.
- **Build & Deployment:** Development uses Vite dev server and `tsx`-powered Express; production builds use Vite for frontend and `esbuild` for backend. Drizzle Kit manages database schema.

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