# KINTO QA Management System

## Overview
KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance application for manufacturing. It enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system. It supports managing machines, users, checklist templates, spare parts, and includes features like FIFO payment allocation, GST-compliant invoice generation, and robust payment tracking. The system is built as a full-stack TypeScript solution with a React frontend and Express backend, focusing on speed, clarity, and error prevention for industrial QA workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Vite, and Wouter for routing. UI components are built with shadcn/ui (Radix UI) and styled using Tailwind CSS, following a "New York" theme with Material Design principles. TanStack Query manages server state. The design is mobile-first, featuring a custom color palette, typography, spacing, and elevation. Navigation uses a Vertical Sidebar system with role-based dashboards, reusable UI elements, and admin configuration tools. Form validation uses `react-hook-form` and `zod`.

### Backend Architecture
The backend is an Express.js application with TypeScript and Node.js. It features Email/Password Authentication with `scrypt` and `Passport.js`, and a Dynamic Role-Based Access Control (RBAC) system for `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. Neon Serverless PostgreSQL is the database, accessed via Drizzle ORM. The schema includes core tables for users, machines, checklists, inventory, transactions, and GST-compliant invoices. It supports multi-item issuance, a Header-Detail pattern for transactional integrity, automatic inventory management, a comprehensive Vendor Master System, and a Role Management System.

### API Design
The RESTful API under `/api` uses JSON, provides structured error handling, implements comprehensive audit logging, and features multi-layer authorization (`isAuthenticated`, `requireRole`) with fresh database lookups for role validation.

### Build & Deployment
Development uses a Vite dev server with an `tsx`-powered Express backend. Production builds bundle the frontend with Vite and the backend with `esbuild`. Database schema management uses Drizzle Kit.

### Key Features
- **Comprehensive Reporting System:** Printable reports for Raw Material Issuance, Purchase Orders, PM Execution, Gatepass (3-copy), and GST-Compliant Invoices. Reports are print-optimized HTML/CSS for A4, with company branding and signature blocks.
- **Sales Dashboard:** Provides sales analytics including revenue, goods sold, total orders, and average order value, with flexible time period filters (Monthly, Quarterly, Half-Yearly, Yearly) and year selection. Accessible by Admin and Manager roles.
- **Machine Startup Reminder System:** Allows managers to assign machine startup tasks to operators, tracks configurable warmup times per machine, and sends automated multi-channel (WhatsApp, Email via Twilio/SendGrid) reminders before scheduled production. Supports bulk assignment, task status tracking (pending → notified → completed → cancelled), and full CRUD operations. Configuration for notifications is available via Admin settings and environment variables.

## External Dependencies

### Database
- Neon Serverless PostgreSQL

### Authentication
- Replit Auth (via OpenID Connect)
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