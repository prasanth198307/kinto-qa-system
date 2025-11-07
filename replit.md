# KINTO QA Management System

## Overview
KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance application for manufacturing. It enables operators to complete checklists, reviewers to verify submissions, managers to approve, and administrators to configure the entire system, including machines, users, checklist templates, and spare parts. Built as a full-stack TypeScript solution with a React frontend and Express backend, it's designed for industrial QA workflows, focusing on speed, clarity, and error prevention.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses **React 18** with **TypeScript**, **Vite** for building, and **Wouter** for routing. UI components are built with **shadcn/ui** (based on Radix UI) and styled using **Tailwind CSS** following a "New York" theme with Material Design principles. **TanStack Query** manages server state and API calls. The design system is mobile-first, featuring a custom color palette, typography, spacing, and elevation. Components include role-based dashboards, reusable UI elements, and admin configuration tools, with form validation via `react-hook-form` and `zod`.

### Backend Architecture
The backend is an **Express.js** application with **TypeScript** and **Node.js**. It features robust **Email/Password Authentication** with `scrypt` hashing and `Passport.js`. A **Dynamic Role-Based Access Control (RBAC)** system supports `admin`, `manager`, `operator`, and `reviewer` roles with granular, screen-level permissions (`canView`, `canCreate`, `canEdit`, `canDelete`) managed via `roles` and `role_permissions` tables. Role assignments are secure, with admin/manager roles restricted to existing admins, and comprehensive audit logging. Route-level authorization uses `requireRole` middleware, validating against fresh database data. **Neon Serverless PostgreSQL** is the database, accessed via **Drizzle ORM** for type-safe queries. The database schema includes core tables for users, machines, checklists, inventory (spare parts, UOM, products, raw materials, finished goods), and transactions (raw material issuance, gatepasses). Multi-item issuance and gatepass architecture utilizes a Header-Detail pattern with transactional integrity, race condition protection, and automatic inventory management. A comprehensive **Vendor Master System** allows admin/manager users to maintain vendor/customer data, which integrates with gatepasses. A dedicated **Role Management System** empowers administrators with full CRUD capabilities for custom roles and screen-level permission configuration, while protecting default system roles.

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