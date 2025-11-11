# KINTO QA Management System - System Design & Architecture

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture](#architecture)
4. [UI/UX Architecture](#uiux-architecture)
5. [Technology Stack](#technology-stack)
6. [Database Design](#database-design)
7. [Security Architecture](#security-architecture)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Module Descriptions](#module-descriptions)
10. [Data Flow](#data-flow)
11. [API Design](#api-design)
12. [Mobile & Progressive Web App](#mobile--progressive-web-app)
13. [Performance Considerations](#performance-considerations)
14. [Scalability](#scalability)

---

## Executive Summary

KINTO QA Management System is a comprehensive quality assurance and preventive maintenance solution designed specifically for manufacturing environments. The system enables systematic quality control, preventive maintenance tracking, spare parts inventory management, and complete production data recording.

### Key Features
- ✅ Email/Password Authentication with role-based access control
- ✅ Dynamic role & permission management
- ✅ Quality Assurance checklist management
- ✅ Preventive Maintenance planning and execution
- ✅ Spare Parts inventory with purchase order management
- ✅ Complete inventory management (UOM, Products, Raw Materials, Finished Goods)
- ✅ Mobile-responsive Progressive Web App (PWA)
- ✅ Soft delete functionality across all modules
- ✅ PDF export capabilities
- ✅ Real-time audit logging

### Design Philosophy
- **Mobile-First**: Optimized for tablet and smartphone usage on the factory floor
- **Offline-Capable**: PWA features enable offline operation
- **Role-Based**: Strict separation of duties between operators, reviewers, managers, and admins
- **Audit Trail**: Complete tracking of all critical operations
- **On-Premise**: Designed for on-premise deployment with full data control

---

## System Overview

### User Personas

#### 1. System Administrator
- Manages all system configuration
- Creates users and assigns roles
- Configures machines, templates, and master data
- Has full access to all features

#### 2. Manager
- Reviews and approves critical operations
- Manages inventory and purchase orders
- Views comprehensive reports
- Approves checklist submissions

#### 3. Quality Reviewer
- Reviews operator checklist submissions
- Provides feedback and approvals
- Escalates issues to management

#### 4. Machine Operator
- Executes daily QA checklists
- Performs preventive maintenance tasks
- Records finished goods production
- Records raw material transactions

### System Boundaries

**In Scope:**
- QA checklist management and execution
- Preventive maintenance planning and tracking
- Spare parts inventory and purchase orders
- Raw material and finished goods tracking
- User and role management
- Audit logging and reporting

**Out of Scope:**
- Financial accounting integration
- ERP system integration (can be added later)
- Real-time machine monitoring (IoT)
- Customer relationship management

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Desktop    │  │    Tablet    │  │  Smartphone  │      │
│  │   Browser    │  │   Browser    │  │   Browser    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                    (Progressive Web App)                     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│                    Application Layer                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Frontend (SPA)                      │  │
│  │  • Vite Build System    • TanStack Query              │  │
│  │  • Wouter Routing       • shadcn/ui Components        │  │
│  │  • Tailwind CSS         • React Hook Form            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Express.js Backend (API Server)             │  │
│  │  • RESTful API          • Session Management          │  │
│  │  • Passport.js Auth     • Role-Based Access Control   │  │
│  │  • Request Validation   • Error Handling              │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Data Layer                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM (Type-Safe ORM)              │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │         PostgreSQL Database (Neon Serverless)         │  │
│  │  • 20+ Tables           • Foreign Key Constraints     │  │
│  │  • Indexes             • Soft Delete Support          │  │
│  │  • ACID Transactions   • Audit Logging               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Three-Tier Architecture

#### 1. Presentation Tier (Frontend)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast builds and HMR
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query for server state
- **UI Library**: shadcn/ui components on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Forms**: React Hook Form with Zod validation

#### 2. Application Tier (Backend)
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with Local Strategy (Email/Password)
- **Authorization**: Role-Based Access Control (RBAC) middleware
- **Session Management**: express-session with PostgreSQL store
- **Validation**: Zod schemas for request validation
- **ORM**: Drizzle ORM for type-safe database queries

#### 3. Data Tier (Database)
- **Database**: PostgreSQL 14+ (Neon Serverless)
- **Connection**: WebSocket-based for serverless architecture
- **Schema Management**: Drizzle Kit for migrations
- **Backup Strategy**: Automated daily backups with point-in-time recovery

---

## UI/UX Architecture

### Layout Components

The application uses a layered layout architecture to provide consistent navigation and branding across all pages while supporting different access patterns (dashboard-embedded vs standalone).

#### GlobalHeader Component
**Purpose**: Unified branding and navigation across all pages

**Responsibilities**:
- Display KINTO logo horizontally with "SmartOps" and "Manufacturing Excellence" branding
- Provide logout and notification access on all screens
- Manage mobile menu trigger (hamburger button) for dashboard pages
- Extend full width across entire screen (left-0 to right-0)

**Layout Properties**:
- **Position**: Fixed top, z-index: 50 (top layer)
- **Height**: 64px (h-16)
- **Mobile**: Shows hamburger menu button (☰) on screens < 1024px (lg breakpoint)
- **Desktop**: Menu button hidden, sidebar always visible

#### DashboardShell Component
**Purpose**: Coordinated layout wrapper for role-based dashboards (Admin, Manager, Reviewer)

**Responsibilities**:
- Render GlobalHeader with mobile menu state management
- Render VerticalNavSidebar with controlled visibility
- Coordinate menu open/close behavior between header and sidebar
- Provide consistent layout structure for dashboard pages

**Layout Coordination**:
- Manages `isMobileMenuOpen` state shared between GlobalHeader and VerticalNavSidebar
- GlobalHeader triggers menu toggle via `onMobileMenuClick` callback
- VerticalNavSidebar receives `isMobileOpen` and `onMobileClose` props
- Content area starts at 64px (pt-16) to accommodate fixed header

#### VerticalNavSidebar Component
**Purpose**: Role-based navigation menu

**Responsibilities**:
- Display navigation items organized by sections (Dashboard, Configuration, Production)
- Highlight active page/view
- Support quick actions (+ buttons) for common operations
- Handle mobile slide-in/out behavior

**Layout Properties**:
- **Position**: Fixed left, z-index: 30 (under header)
- **Width**: 288px (w-72)
- **Top Padding**: 80px (pt-20) to start below GlobalHeader
- **Desktop**: Always visible, sidebar spacer in layout
- **Mobile**: Hidden by default, slides in from left when menu opened
- **Overlay**: Dark backdrop (bg-black/50) on mobile when sidebar open

**Z-Index Layering**:
```
GlobalHeader (z-50)     ← Top layer, always visible
  ↓
VerticalNavSidebar (z-30) ← Under header, navigation items start below
  ↓
Content Area             ← Main page content
```

### Page Access Patterns

The system supports three distinct page access patterns:

| Pattern | Description | Header Behavior | Examples |
|---------|-------------|-----------------|----------|
| **Dashboard-Only** | Pages accessed exclusively via dashboard navigation | Rely on DashboardShell's GlobalHeader | Sales Dashboard, Inventory Management, User Management, Role Permissions |
| **Dual-Access** | Pages with both standalone route AND dashboard embedding | Conditional header via `showHeader` prop | Reports, Dispatch Tracking |
| **Standalone** | Pages with independent routes | Render own GlobalHeader | Login, Checklists, Invoice Detail |

**Conditional Header Implementation**:
```typescript
// Dual-access pages
function ReportsPage({ showHeader = true }) {
  return (
    <>
      {showHeader && <GlobalHeader />}
      <div className={showHeader ? "mt-16" : ""}>
        {/* Page content */}
      </div>
    </>
  );
}

// Dashboard usage
<DashboardShell>
  <ReportsPage showHeader={false} />
</DashboardShell>

// Standalone usage (direct route)
<Route path="/reports" component={ReportsPage} />
```

### Mobile Responsiveness Architecture

**Mobile Menu Flow**:
1. User taps hamburger button (☰) in GlobalHeader
2. DashboardShell updates `isMobileMenuOpen` state
3. VerticalNavSidebar slides in from left with animation
4. Dark overlay appears behind sidebar
5. User taps navigation item OR overlay → sidebar closes automatically

**Responsive Breakpoints**:
- **Mobile/Tablet** (< 1024px): Hamburger menu, collapsible sidebar
- **Desktop** (≥ 1024px): Sidebar always visible, no hamburger menu

**Touch Targets**:
- All interactive elements: minimum 44x44px for touch accessibility
- Navigation items: min-h-11 (44px) for comfortable thumb access

---

## Technology Stack

### Frontend Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | React 18 | Component-based UI |
| Language | TypeScript | Type safety |
| Build Tool | Vite | Fast development builds |
| Routing | Wouter | Lightweight routing |
| State Management | TanStack Query v5 | Server state caching |
| UI Components | shadcn/ui | Reusable components |
| Styling | Tailwind CSS | Utility-first CSS |
| Form Handling | React Hook Form | Form validation |
| Validation | Zod | Schema validation |
| Icons | Lucide React | Icon library |
| Date Handling | date-fns | Date manipulation |

### Backend Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| Runtime | Node.js 20+ | JavaScript runtime |
| Framework | Express.js | Web server framework |
| Language | TypeScript | Type safety |
| ORM | Drizzle ORM | Database queries |
| Authentication | Passport.js | Auth strategies |
| Password Hashing | scrypt | Secure hashing |
| Session Store | connect-pg-simple | PostgreSQL sessions |
| Validation | Zod | Request validation |
| PDF Generation | pdfkit | PDF exports |
| Document Generation | docx | Word documents |

### Database & Infrastructure

| Category | Technology | Purpose |
|----------|-----------|---------|
| Database | PostgreSQL 14+ | Relational database |
| Database Provider | Neon Serverless | Cloud PostgreSQL |
| Connection | @neondatabase/serverless | WebSocket connection |
| Schema Management | Drizzle Kit | Migrations |
| Process Manager | PM2 | Production process management |
| Reverse Proxy | Nginx | Load balancing & SSL |

---

## Database Design

### Entity-Relationship Diagram (ERD)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    Roles     │────<│    Users     │────<│ User Assignments │
└──────────────┘     └──────────────┘     └──────────────────┘
       │                    │
       │                    ├──────────────────────┐
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│Role Permissions    │  Machines    │     │Machine Types │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
       ┌────────────────────┼──────────────────────┤
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│Checklist     │     │Maintenance   │     │PM Task List      │
│Templates     │     │Plans         │     │Templates         │
└──────────────┘     └──────────────┘     └──────────────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│Template      │     │PM Executions │     │PM Template Tasks │
│Tasks         │     └──────────────┘     └──────────────────┘
└──────────────┘            │
       │                    ▼
       │             ┌──────────────────┐
       │             │PM Execution Tasks│
       │             └──────────────────┘
       ▼
┌──────────────┐
│Checklist     │
│Submissions   │
└──────────────┘
       │
       ▼
┌──────────────┐
│Submission    │
│Tasks         │
└──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     UOM      │────<│  Products    │────<│Finished Goods│
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────────────┐
│Raw Materials │────<│Raw Material          │
└──────────────┘     │Transactions          │
                     └──────────────────────┘

┌──────────────────┐     ┌──────────────┐
│Spare Parts       │────<│Purchase      │
│Catalog           │     │Orders        │
└──────────────────┘     └──────────────┘
       │
       ▼
┌──────────────────┐
│Machine Spares    │
│(M:M Relationship)│
└──────────────────┘
```

### Key Database Tables

#### Core Tables (20+)
1. **sessions** - Session management
2. **roles** - Role definitions
3. **role_permissions** - Screen-level permissions
4. **users** - User accounts
5. **machines** - Machine registry
6. **machine_types** - Machine type configuration
7. **checklist_templates** - Checklist templates
8. **template_tasks** - Template task definitions
9. **checklist_submissions** - Completed checklists
10. **submission_tasks** - Individual task results
11. **spare_parts_catalog** - Spare parts inventory
12. **machine_spares** - Machine-spare parts relationships
13. **purchase_orders** - Purchase order management
14. **pm_task_list_templates** - PM task templates
15. **pm_template_tasks** - PM task definitions
16. **maintenance_plans** - Scheduled maintenance
17. **pm_executions** - PM execution history
18. **pm_execution_tasks** - PM task results
19. **uom** - Units of measurement
20. **products** - Product master
21. **raw_materials** - Raw material inventory
22. **raw_material_transactions** - Material transactions
23. **finished_goods** - Finished goods records
24. **user_assignments** - User relationships
25. **maintenance_history** - Historical maintenance data
26. **required_spares** - Required spare parts

### Soft Delete Implementation

All major tables include a `record_status` column:
- `record_status = 1`: Active record
- `record_status = 0`: Soft-deleted record

Benefits:
- Data preservation for audit purposes
- Ability to restore accidentally deleted records
- Historical data integrity
- Compliance with data retention policies

---

## Security Architecture

### Authentication Flow

```
┌─────────┐                  ┌─────────┐                 ┌──────────┐
│ Client  │                  │ Server  │                 │ Database │
└────┬────┘                  └────┬────┘                 └────┬─────┘
     │                            │                           │
     │ POST /api/login            │                           │
     │ {username, password}       │                           │
     ├───────────────────────────>│                           │
     │                            │ Query user by username    │
     │                            ├──────────────────────────>│
     │                            │                           │
     │                            │ User record + role        │
     │                            │<──────────────────────────┤
     │                            │                           │
     │                            │ Verify password (scrypt)  │
     │                            │                           │
     │                            │ Create session            │
     │                            ├──────────────────────────>│
     │                            │                           │
     │ Set-Cookie: session_id     │                           │
     │<───────────────────────────┤                           │
     │                            │                           │
     │ User data (without password)                           │
     │<───────────────────────────┤                           │
     │                            │                           │
```

### Authorization Layers

#### 1. Route-Level Authorization
```javascript
// Admin-only routes
app.get('/api/users', requireRole('admin'), handler);

// Admin or Manager routes
app.post('/api/purchase-orders', requireRole('admin', 'manager'), handler);

// All authenticated users
app.get('/api/machines', isAuthenticated, handler);
```

#### 2. Screen-Level Permissions
Dynamic permission system in `role_permissions` table:
- `canView`: View screen access
- `canCreate`: Create new records
- `canEdit`: Edit existing records
- `canDelete`: Delete/soft-delete records

#### 3. Data-Level Security
- Users can only modify their own submissions (except admins)
- Reviewers can only review assigned submissions
- Managers can approve all submissions
- Role changes audited and logged

### Password Security

**Hashing Algorithm**: scrypt
- **Rounds (N)**: 32768 (2^15)
- **Block size (r)**: 8
- **Parallelization (p)**: 1
- **Memory limit**: 64MB

**Password Policy**:
- Minimum length: 6 characters (recommended: 12+)
- Must be changed on first login for default admin
- Password reset via time-limited tokens

### Session Management

**Configuration**:
- **Session store**: PostgreSQL (connect-pg-simple)
- **Session timeout**: 7 days
- **Cookie settings**: httpOnly, secure (HTTPS), sameSite
- **Session secret**: 32+ character random string

---

## User Roles & Permissions

### Default Roles

| Role | Code | Description | Key Permissions |
|------|------|-------------|-----------------|
| Administrator | `admin` | Full system access | All CRUD operations, user management |
| Manager | `manager` | Inventory & approval management | Inventory CRUD, approvals, reports |
| Operator | `operator` | Checklist execution | Execute checklists, record production |
| Reviewer | `reviewer` | Quality review | Review checklists, provide feedback |

### Custom Role Creation

Administrators can create custom roles with granular permissions across 17 screens:
- Dashboard
- User Management
- Role Management
- Machines
- Machine Types
- Checklist Templates
- Checklists
- Spare Parts
- Purchase Orders
- Maintenance Plans
- PM Task Templates
- PM Execution
- Inventory Management
- Units of Measure
- Products
- Raw Materials
- Finished Goods
- Reports

---

## Module Descriptions

### 1. User & Role Management
**Purpose**: Manage users and define role-based access control

**Features**:
- Create users with email/password authentication
- Assign roles (admin, manager, operator, reviewer, custom)
- Dynamic role creation with screen-level permissions
- Search and filter users
- Soft delete users
- Change user roles (admin only)

**Access**: Admin only

### 2. Machine Management
**Purpose**: Maintain machine/equipment registry

**Features**:
- Add/edit machines with specifications
- Track installation dates and maintenance schedules
- Link machines to spare parts
- Monitor machine status (active, maintenance, inactive)
- Soft delete machines

**Access**: Admin/Manager (create/edit), All (view)

### 3. Checklist Management
**Purpose**: Create and execute quality assurance checklists

**Features**:
- Create reusable checklist templates
- Define tasks with verification criteria
- Assign templates to machines and shifts
- Execute checklists (operators)
- Review submissions (reviewers)
- Manager approval workflow
- Photo upload for verification
- Digital signatures

**Access**:
- Templates: Admin/Manager (create), All (view)
- Execution: Operators
- Review: Reviewers
- Approval: Managers

### 4. Preventive Maintenance
**Purpose**: Plan and track scheduled maintenance

**Features**:
- Create PM task list templates
- Define maintenance plans with frequencies
- Schedule PM tasks
- Execute PM checklists
- Record downtime and spare parts used
- Track PM history
- Automatic next due date calculation

**Access**: Admin/Manager (planning), Operators (execution)

### 5. Spare Parts Management
**Purpose**: Manage spare parts inventory

**Features**:
- Spare parts catalog with part numbers
- Current stock tracking
- Reorder threshold alerts
- Link spare parts to specific machines
- Purchase order generation
- Stock transaction history

**Access**: Admin/Manager (full), Operators (view)

### 6. Purchase Order Management
**Purpose**: Manage spare parts procurement

**Features**:
- Auto-generate PO numbers
- Link to spare parts catalog
- Track urgency levels
- Multi-stage approval workflow
- Supplier management
- Delivery tracking
- Cost estimation

**Access**: Admin/Manager

### 7. Inventory Management
**Purpose**: Complete inventory control system

**Sub-Modules**:

#### 7.1 Units of Measurement (UOM)
- Define measurement units (PCS, KG, L, M, etc.)
- Link to products and materials

#### 7.2 Product Master
- Product catalog management
- Product codes and specifications
- Standard cost tracking

#### 7.3 Raw Materials
- Raw material inventory
- Stock levels and reorder points
- Supplier tracking
- Location management

#### 7.4 Raw Material Transactions
- Day-wise transaction logging
- Receipt, issue, adjustment transactions
- Transaction history

#### 7.5 Finished Goods
- Production records by product
- Batch tracking
- Quality inspection status
- Link to machines and operators
- Production date tracking

**Access**:
- Master Data (UOM, Products): Admin/Manager
- Transactions: Admin/Manager/Operator (create), All (view)

---

## Data Flow

### Checklist Execution Workflow

```
┌─────────────┐
│  Operator   │
│ Selects     │
│ Template    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Operator   │
│ Completes   │
│   Tasks     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Operator   │
│  Submits    │
│ Checklist   │
└──────┬──────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐
│  Reviewer   │       │   Rejects   │
│   Reviews   │──────>│   & Returns │
│             │       └─────────────┘
└──────┬──────┘
       │
       │ Approves
       ▼
┌─────────────┐       ┌─────────────┐
│   Manager   │       │   Rejects   │
│   Reviews   │──────>│   & Returns │
│             │       └─────────────┘
└──────┬──────┘
       │
       │ Approves
       ▼
┌─────────────┐
│  Completed  │
│   Status    │
└─────────────┘
```

### PM Execution Workflow

```
┌──────────────┐
│ Admin/Manager│
│    Creates   │
│ PM Template  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Admin/Manager│
│   Creates    │
│Maintenance   │
│    Plan      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Operator    │
│   Executes   │
│  PM Tasks    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   System     │
│  Calculates  │
│  Next Due    │
│     Date     │
└──────────────┘
```

### Inventory Transaction Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Receipt    │────>│  Raw Material│────>│  Production  │
│              │     │  Transaction │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Update      │
                     │ Current Stock│
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Record     │
                     │  Finished    │
                     │    Goods     │
                     └──────────────┘
```

---

## API Design

### RESTful Endpoints

#### Authentication
```
POST   /api/login              - User login
POST   /api/logout             - User logout
GET    /api/auth/user          - Get current user
POST   /api/auth/set-role      - Set initial role (operator/reviewer)
POST   /api/auth/reset-password- Initiate password reset
```

#### Users
```
GET    /api/users              - List all users (admin)
POST   /api/users              - Create user (admin)
GET    /api/users/:id          - Get user by ID
PATCH  /api/users/:id          - Update user
DELETE /api/users/:id          - Soft delete user (admin)
PATCH  /api/users/:id/role     - Change user role (admin)
```

#### Roles & Permissions
```
GET    /api/roles              - List all roles
POST   /api/roles              - Create custom role (admin)
PATCH  /api/roles/:id          - Update role (admin)
DELETE /api/roles/:id          - Delete role (admin)
GET    /api/role-permissions/:roleId - Get role permissions
PUT    /api/roles/:roleId/permissions - Update permissions (admin)
```

#### Machines
```
GET    /api/machines           - List all machines
POST   /api/machines           - Create machine (admin/manager)
GET    /api/machines/:id       - Get machine by ID
PATCH  /api/machines/:id       - Update machine (admin/manager)
DELETE /api/machines/:id       - Soft delete machine (admin/manager)
```

#### Checklist Templates
```
GET    /api/checklist-templates        - List templates
POST   /api/checklist-templates        - Create template (admin/manager)
GET    /api/checklist-templates/:id    - Get template by ID
PATCH  /api/checklist-templates/:id    - Update template (admin/manager)
DELETE /api/checklist-templates/:id    - Soft delete template
```

#### Checklists (Submissions)
```
GET    /api/checklists         - List submissions
POST   /api/checklists         - Create submission (operator)
GET    /api/checklists/:id     - Get submission by ID
PATCH  /api/checklists/:id     - Update submission
```

#### Spare Parts
```
GET    /api/spare-parts        - List spare parts
POST   /api/spare-parts        - Create spare part (admin/manager)
PATCH  /api/spare-parts/:id    - Update spare part (admin/manager)
DELETE /api/spare-parts/:id    - Soft delete spare part
```

#### Purchase Orders
```
GET    /api/purchase-orders    - List purchase orders
POST   /api/purchase-orders    - Create PO (admin/manager)
PATCH  /api/purchase-orders/:id - Update PO (admin/manager)
DELETE /api/purchase-orders/:id - Soft delete PO (admin/manager)
```

#### Inventory
```
GET    /api/uom                - List UOM
POST   /api/uom                - Create UOM (admin/manager)
DELETE /api/uom/:id            - Soft delete UOM

GET    /api/products           - List products
POST   /api/products           - Create product (admin/manager)
DELETE /api/products/:id       - Soft delete product

GET    /api/raw-materials      - List raw materials
POST   /api/raw-materials      - Create material (admin/manager)
DELETE /api/raw-materials/:id  - Soft delete material

GET    /api/raw-material-transactions - List transactions
POST   /api/raw-material-transactions - Create transaction

GET    /api/finished-goods     - List finished goods
POST   /api/finished-goods     - Create finished good
DELETE /api/finished-goods/:id - Soft delete finished good
```

### API Response Format

**Success Response**:
```json
{
  "id": "uuid",
  "data": { ... },
  "timestamp": "2025-11-04T12:00:00Z"
}
```

**Error Response**:
```json
{
  "message": "Error description",
  "errors": [ ... ],
  "status": 400
}
```

---

## Mobile & Progressive Web App

### PWA Features

#### Service Worker
- **Offline Support**: Cache static assets for offline access
- **Background Sync**: Queue data submissions when offline
- **Push Notifications**: Alert for pending reviews and approvals

#### Manifest Configuration
```json
{
  "name": "KINTO QA Management",
  "short_name": "KINTO QA",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1f2937",
  "background_color": "#ffffff",
  "icons": [...]
}
```

#### Responsive Design
- **Mobile-First**: Optimized for 320px and up
- **Touch-Friendly**: Large touch targets (min 44x44px)
- **Fixed GlobalHeader**: h-16 (64px) full-width header with KINTO branding, notifications, and logout
- **Hamburger Menu**: Mobile menu button (☰) in GlobalHeader for sidebar access on mobile/tablet
- **Slide-in Sidebar**: VerticalNavSidebar slides in from left on mobile with dark overlay backdrop
- **Bottom Navigation**: Easy thumb access on mobile (Operator dashboard)

### Cross-Platform Compatibility

| Platform | Method | Support |
|----------|--------|---------|
| iOS | Safari PWA | ✅ Full support iOS 15.4+ |
| Android | Chrome PWA | ✅ Full support |
| Desktop | Browser | ✅ All modern browsers |
| Tablet | Browser/PWA | ✅ Optimized layout |

---

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Route-based lazy loading
- **Tree Shaking**: Remove unused code
- **Image Optimization**: WebP format with fallbacks
- **CSS Purging**: Remove unused Tailwind classes
- **Minification**: Production build optimization

### Backend Optimization
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Efficient SQL queries via Drizzle ORM
- **Caching**: TanStack Query caching on frontend
- **Compression**: Gzip compression for API responses

### Database Optimization
- **Indexes**: 15+ strategic indexes
- **Foreign Keys**: Referential integrity
- **Prepared Statements**: Query plan caching
- **VACUUM**: Regular database maintenance

---

## Scalability

### Horizontal Scaling

**Application Server**:
- Deploy multiple Node.js instances
- Use PM2 cluster mode
- Load balancing with Nginx

**Database**:
- PostgreSQL replication (primary-replica)
- Read replicas for reporting
- Connection pooling (PgBouncer)

### Vertical Scaling

**Server Upgrades**:
- Increase CPU cores for PM2 clustering
- Add RAM for database cache
- SSD storage for faster I/O

### Future Enhancements

1. **Microservices Architecture**
   - Separate services for QA, PM, Inventory
   - API Gateway pattern
   - Service mesh for inter-service communication

2. **Real-Time Features**
   - WebSocket support for live updates
   - Server-Sent Events for notifications
   - Real-time machine status monitoring

3. **Advanced Analytics**
   - Business intelligence dashboards
   - Predictive maintenance using ML
   - Trend analysis and reporting

4. **Integration Capabilities**
   - ERP system integration (SAP, Oracle)
   - IoT device connectivity
   - Third-party API integrations

---

## Appendix

### Technology Versions
- Node.js: 20.x
- PostgreSQL: 14.x
- React: 18.x
- TypeScript: 5.x
- Express: 4.x
- Drizzle ORM: Latest

### Development Tools
- Vite: Build tool
- ESLint: Code linting
- Prettier: Code formatting
- Drizzle Kit: Database migrations

### Deployment Tools
- PM2: Process management
- Nginx: Reverse proxy
- Certbot: SSL certificates
- Docker: Containerization (optional)

---

**Document Version**: 1.0  
**Last Updated**: November 4, 2025  
**For**: KINTO QA Management System v1.0  
**Authors**: KINTO Development Team
