# KINTO QA Management System

## Overview
KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance application for manufacturing. It enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system, including machines, users, checklist templates, and spare parts. Built as a full-stack TypeScript solution with a React frontend and Express backend, it's designed for industrial QA workflows, focusing on speed, clarity, and error prevention. The system includes a comprehensive FIFO payment allocation system, a dashboard widget for pending payments, GST-compliant invoice generation, and a robust payment tracking system with support for partial payments and advances.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses **React 18** with **TypeScript**, **Vite** for building, and **Wouter** for routing. UI components are built with **shadcn/ui** (based on Radix UI) and styled using **Tailwind CSS** following a "New York" theme with Material Design principles. **TanStack Query** manages server state and API calls. The design system is mobile-first, featuring a custom color palette, typography, spacing, and elevation. Navigation uses a **Vertical Sidebar Navigation** system with role-based dashboards, reusable UI elements, and admin configuration tools. Form validation is handled via `react-hook-form` and `zod`.

### Backend Architecture
The backend is an **Express.js** application with **TypeScript** and **Node.js**. It features robust **Email/Password Authentication** with `scrypt` hashing and `Passport.js`. A **Dynamic Role-Based Access Control (RBAC)** system supports `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions. **Neon Serverless PostgreSQL** is the database, accessed via **Drizzle ORM**. The database schema includes core tables for users, machines, checklists, inventory, transactions, and **GST-compliant invoices**. Multi-item issuance and gatepass architecture utilizes a Header-Detail pattern with transactional integrity and automatic inventory management. A comprehensive **Vendor Master System** and **Role Management System** are also included. The **Invoice Management System** provides GST-compliant invoice generation with tax breakup and payment information.

### API Design
The RESTful API under `/api` features multi-layer authorization (`isAuthenticated`, `requireRole`) with fresh database lookups for role validation. It uses JSON for requests/responses, provides structured error handling, and implements comprehensive audit logging for security events and all mutations.

### Build & Deployment
Development uses `npm run dev` for a Vite dev server with an `tsx`-powered Express backend. Production builds (`npm run build`) bundle the frontend with Vite and the backend with `esbuild`. Database schema management uses Drizzle Kit.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**

### Authentication
- **Replit Auth** (via OpenID Connect)
- `openid-client`
- `passport`

### UI Libraries
- **Radix UI**
- **Lucide React**
- **date-fns**
- **cmdk**
- **vaul**

### Form Management
- **react-hook-form**
- **@hookform/resolvers**
- **zod**
- **drizzle-zod**

### Development Tools
- **TypeScript**
- **Vite**
- **esbuild**
- **Tailwind CSS**
- **class-variance-authority**
- **tailwind-merge**

### Styling
- **Google Fonts**