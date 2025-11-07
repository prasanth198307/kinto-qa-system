# KINTO QA Management System

## Overview

KINTO QA Management System is a mobile-first Quality Assurance and Preventive Maintenance management application for manufacturing environments. The system enables operators to complete daily checklists, reviewers to verify submissions, managers to provide final approvals, and administrators to configure the entire system including machines, users, checklist templates, and spare parts inventory.

The application is built as a full-stack TypeScript solution with a React frontend and Express backend, designed specifically for industrial QA workflows with an emphasis on speed, clarity, and error prevention in manufacturing settings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured for fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing instead of React Router

**UI Component Library**
- **shadcn/ui** components built on Radix UI primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, popover, select, tabs, toast, etc.)
- **Tailwind CSS** for utility-first styling with custom design system
- **New York** style variant from shadcn/ui
- Material Design principles adapted for industrial workflows
- **Inter font** (Google Fonts) for optimal readability at small sizes

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management, caching, and API calls
- Custom query client with unauthorized error handling (`on401: "throw"`)
- Infinite stale time and disabled refetch behaviors for optimal performance
- Session-based authentication state via `/api/auth/user` endpoint

**Design System**
- Mobile-first responsive design with fixed header (h-14)
- Typography hierarchy from text-xs to text-2xl
- Spacing system using Tailwind units (2, 4, 6, 8, 12, 16)
- Custom color system with HSL values for theme consistency
- Elevation system using `hover-elevate` and `active-elevate-2` utilities
- Custom border radius values (sm: 3px, md: 6px, lg: 9px)

**Component Architecture**
- Role-based dashboard components (Admin, Operator, Reviewer, Manager)
- Reusable UI components: MobileHeader, DashboardStats, MachineCard, ChecklistForm, ChecklistHistoryTable, MaintenanceSchedule
- Admin components: UserManagement, MachineConfig, ChecklistBuilder, SparePartsManagement, RoleManagement
- Form validation using react-hook-form with zod resolvers

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript running on Node.js
- ESM module system throughout the codebase
- Custom middleware for request logging and JSON response capture
- Session management with `express-session` and PostgreSQL store

**Authentication & Authorization**
- **Email/Password Authentication** with secure password hashing (scrypt algorithm)
- Passport.js Local Strategy for authentication flows
- **Dynamic Role-Based Access Control (RBAC)** with roles table supporting:
  - admin: System Administrator with full access to all features and user management
  - manager: Manager with inventory management, reporting, and approval permissions
  - operator: Machine Operator who can execute checklists, PM tasks, record transactions, and create finished goods
  - reviewer: Quality Reviewer who can review and approve checklists
- **Role Assignment Security**:
  - Self-assignment restricted to operator/reviewer roles only (via `/api/auth/set-role`)
  - Admin and manager roles can ONLY be assigned by existing admins
  - Role changes prevented after initial assignment (users must contact admin)
  - All role assignments validated against roles table
  - Comprehensive audit logging for all role-related operations
- **Route-Level Authorization**:
  - `requireRole` middleware validates fresh user data from database (no session trust)
  - Admin/Manager routes: machines, checklist templates, spare parts, machine types, purchase orders, maintenance plans
  - Inventory routes: UOM/products/raw materials (admin/manager only), finished goods & transactions (admin/manager/operator for creation)
  - All mutations audit logged with user ID and role information
- Session-based authentication with secure cookies (httpOnly, secure, 7-day TTL)
- PostgreSQL-backed session store using `connect-pg-simple`
- Password reset functionality with time-limited reset tokens
- **No self-registration** - Only admins can create new users

**Default Admin Credentials**
- Username: `admin`
- Password: `Admin@123`
- Email: `admin@kinto.com`
- Role: Administrator

**Database Layer**
- **Neon Serverless PostgreSQL** as the database provider
- **Drizzle ORM** for type-safe database queries and schema management
- WebSocket connection support for Neon serverless architecture
- Schema-first approach with TypeScript types inferred from Drizzle schema

**Database Schema**
Core tables include:
- `sessions` - Session storage for authentication
- `roles` - Role definitions (admin, manager, operator, reviewer, custom roles)
- `role_permissions` - Screen-level permissions for each role (canView, canCreate, canEdit, canDelete)
- `users` - User profiles with role assignment via foreign key to roles table
- `machines` - Equipment/machine registry with status and maintenance tracking
- `checklistTemplates` - Reusable checklist templates linked to machines
- `templateTasks` - Individual tasks within checklist templates
- `sparePartsCatalog` - Inventory management for spare parts
- `uom` - Units of measure for inventory management
- `products` - Product master data
- `rawMaterials` - Raw material inventory with UOM and product relationships
- `rawMaterialTransactions` - Transaction log for raw material usage/receipt
- `finishedGoods` - Finished goods production records
- `rawMaterialIssuance` - Header records for raw material issuances (multi-item support)
- `rawMaterialIssuanceItems` - Line items for each issuance (multiple materials per issuance)
- `gatepasses` - Header records for finished goods dispatch (multi-item support)
- `gatepassItems` - Line items for each gatepass (multiple finished goods per gatepass)

**Multi-Item Issuance & Gatepass Architecture**
- **Header-Detail Pattern**: Separate tables for transaction headers (metadata) and line items (multiple materials/goods per transaction)
- **Transactional Integrity**: All operations wrapped in database transactions using Drizzle's `db.transaction()` for atomicity
- **Race Condition Protection**: Row-level locking with `.for('update')` on inventory lookups prevents concurrent overselling
- **Inventory Management**: Automatic stock deduction with validation (insufficient stock errors before commit)
- **Audit Trail**: Comprehensive transaction logging for all inventory movements
- **API Payload Structure**: `{header: {...}, items: [{...}, {...}]}` with validation at both levels
- **Error Handling**: Descriptive error messages for missing items, insufficient stock, and validation failures
- **Auto-Generated Numbers**: Issuance numbers auto-generated server-side (`ISS-{timestamp}`)

**API Design**
- RESTful API endpoints under `/api` prefix
- Multi-layer authorization:
  - `isAuthenticated` middleware for basic authentication (all routes)
  - `requireRole(...roles)` middleware for role-based authorization (admin/manager routes)
  - Fresh database lookup for role validation (no session trust)
- Structured error handling with HTTP status codes (401 for auth, 403 for authz)
- JSON request/response format
- Comprehensive audit logging for security events
- CRUD operations with role-based access control:
  - Admin/Manager: Full CRUD on machines, templates, spare parts, inventory master data
  - Operator: Create finished goods and raw material transactions
  - All users: Read-only access to most data

**Storage Pattern**
- Repository pattern via `IStorage` interface and `DatabaseStorage` implementation
- Centralized data access layer abstracting Drizzle ORM operations
- Type-safe CRUD operations using Drizzle schema types

**Role Management System**
- **Full CRUD for Roles and Permissions**: Administrators can create, read, update, and delete custom roles
- **Screen-Level Permissions**: Each role can be configured with granular permissions (View, Create, Edit, Delete) for each screen/module in the system
- **Default Role Protection**: System roles (admin, manager, operator, reviewer) cannot be renamed or deleted to maintain system integrity
- **Custom Roles**: Administrators can create custom roles (e.g., supervisor, quality_inspector) with tailored permission sets
- **Batch Permission Updates**: Efficient endpoint for updating multiple permissions at once
- **Available Screens for Permission Configuration**:
  - Dashboard, User Management, Role Management, Machines, Machine Types
  - Checklist Templates, Checklists, Spare Parts, Purchase Orders
  - Maintenance Plans, PM Task Templates, PM Execution
  - Inventory Management, Units of Measure, Products, Raw Materials, Finished Goods, Reports
- **API Endpoints** (all require admin role):
  - `GET /api/roles` - Fetch all roles
  - `POST /api/roles` - Create new role
  - `PATCH /api/roles/:id` - Update role (blocks renaming default roles)
  - `DELETE /api/roles/:id` - Delete role (blocks deleting default roles)
  - `GET /api/role-permissions/:roleId` - Fetch permissions for a role
  - `PUT /api/roles/:roleId/permissions` - Batch update permissions
- **Security Features**:
  - All role management routes protected with `requireRole('admin')`
  - Audit logging for all role creation, modification, and deletion
  - Backend validation prevents renaming or deleting default roles (403 status)
  - Frontend UI disables name field for default roles
  - Unique constraint on role names
- **UI Features**:
  - Role cards showing name, description, and default/custom status
  - Create/Edit dialogs with validation
  - Permission matrix table for easy visual configuration
  - Success/error toast notifications
  - Confirmation dialogs for destructive actions
  - Comprehensive data-testid attributes for automated testing

### Build & Deployment

**Development**
- `npm run dev` - Runs Vite dev server with Express backend using tsx
- Hot module replacement for frontend changes
- Automatic backend restart on file changes

**Production Build**
- `npm run build` - Bundles frontend with Vite and backend with esbuild
- Frontend output to `dist/public`
- Backend bundled as ESM module to `dist/index.js`
- `npm start` - Runs production server from bundled files

**Database Management**
- `npm run db:push` - Pushes schema changes to database using Drizzle Kit
- Migration files stored in `./migrations` directory
- Schema defined in `shared/schema.ts` for type sharing between frontend and backend

## External Dependencies

### Database
- **Neon Serverless PostgreSQL** - Cloud-native PostgreSQL with WebSocket support
- Connection via `@neondatabase/serverless` package
- Requires `DATABASE_URL` environment variable

### Authentication
- **Replit Auth** via OpenID Connect
- Requires `REPL_ID`, `ISSUER_URL`, and `SESSION_SECRET` environment variables
- Uses `openid-client` and `passport` for authentication flows

### UI Libraries
- **Radix UI** - Headless component primitives for accessibility
- **Lucide React** - Icon library
- **date-fns** - Date formatting and manipulation
- **cmdk** - Command menu component
- **vaul** - Drawer component

### Form Management
- **react-hook-form** - Form state management
- **@hookform/resolvers** - Validation resolver integration
- **zod** - Schema validation
- **drizzle-zod** - Drizzle to Zod schema conversion

### Development Tools
- **Vite plugins**: runtime-error-modal, cartographer, dev-banner (Replit-specific)
- **TypeScript** for type safety across the entire stack
- **Tailwind CSS** with PostCSS for styling
- **esbuild** for backend bundling

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **class-variance-authority** - Type-safe variant management
- **tailwind-merge** - Intelligent Tailwind class merging
- **Google Fonts** - Inter font family via CDN