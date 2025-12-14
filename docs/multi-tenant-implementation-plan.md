# KINTO Operations - Multi-Tenant Architecture
## Detailed Implementation Plan

**Document Version:** 2.0  
**Date:** December 14, 2025  
**Prepared For:** KINTO Operations Team

---

## Executive Summary

This document outlines the complete implementation plan for transforming the KINTO Operations & QA Management System from a full-featured **Enterprise Application Platform** - a revolutionary system where customers describe their requirements in plain language and get fully functional, deployed applications.

**Platform Vision:**
```
Customer describes requirements → AI generates application → Auto-deploy to Cloud or On-Prem
```

**Key Capabilities:**
- **Multi-Tenant SaaS:** Complete data isolation with schema-per-tenant approach
- **Low-Code Platform:** Customers create their own screens and business logic (Phase 5)
- **AI Application Generator:** Natural language to working application (Phase 6)
- **Infrastructure Auto-Selector:** Automatic architecture based on scale requirements (Phase 7)
- **Cloud Auto-Deployment:** One-click deployment to AWS/Azure/GCP (Phase 8)
- **On-Prem Packaging:** Docker/Kubernetes/VM images for enterprise customers (Phase 9)
- **Hybrid Deployment:** Mix of cloud management with on-prem data (Phase 10)

**Target Industries:**
- Power & Utilities (AMI, Billing, Customer Portal)
- Banking & Finance (Loan Management, Collections)
- Insurance (Policy Management, Claims)
- Manufacturing (Current KINTO domain)
- Any industry with custom requirements

---

## Table of Contents

1. Architecture Overview
2. Database Design
3. Phase 1: Core Multi-Tenancy Foundation
4. Phase 2: Licensing & Quotas
5. Phase 3: Feature/Module Configuration
6. Phase 4: Screen Templating System
7. **Phase 5: Low-Code Platform Engine** *(Customer Self-Service)*
8. **Phase 6: AI Application Generator** *(Natural Language to App)*
9. **Phase 7: Infrastructure Auto-Selector** *(Scale-Based Architecture)*
10. **Phase 8: Cloud Auto-Deployment** *(One-Click Deploy)*
11. **Phase 9: On-Prem Packaging System** *(Enterprise Deployment)*
12. **Phase 10: Hybrid Deployment Support** *(Cloud + On-Prem)*
13. WhatsApp Integration for Multi-Tenant
14. Migration Strategy
15. Timeline & Milestones
16. Technical Specifications
17. **Infrastructure Specifications** *(Compute, Storage, Network, Security)*

---

## 1. Architecture Overview

### Current State (Single-Tenant)
```
┌─────────────────────────────────────────┐
│           KINTO Application             │
├─────────────────────────────────────────┤
│         PostgreSQL Database             │
│  ┌───────────────────────────────────┐  │
│  │         public schema             │  │
│  │  • users                          │  │
│  │  • machines                       │  │
│  │  • invoices                       │  │
│  │  • inventory                      │  │
│  │  • checklists                     │  │
│  │  • ... (all 50+ tables)          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Target State (Multi-Tenant)
```
┌─────────────────────────────────────────────────────────────┐
│                    KINTO SaaS Platform                      │
├─────────────────────────────────────────────────────────────┤
│                   PostgreSQL Database                       │
│  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  public schema  │  │  org_kinto  │  │   org_acme      │  │
│  │                 │  │             │  │                 │  │
│  │ • organizations │  │ • machines  │  │ • machines      │  │
│  │ • users         │  │ • invoices  │  │ • invoices      │  │
│  │ • plans         │  │ • inventory │  │ • inventory     │  │
│  │ • sessions      │  │ • checklists│  │ • checklists    │  │
│  │ • templates     │  │ • ...       │  │ • ...           │  │
│  └─────────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow
```
User Login
    ↓
Authenticate (public.users)
    ↓
Get organizationId from user record
    ↓
Middleware: SET search_path TO org_{slug}, public
    ↓
All queries automatically use tenant schema
    ↓
Response to user
```

---

## 2. Database Design

### 2.1 Public Schema Tables (Shared Across All Tenants)

#### organizations
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| name | VARCHAR(255) | Organization display name |
| slug | VARCHAR(50) | URL-safe identifier (unique) |
| logo_url | VARCHAR(500) | Organization logo |
| status | VARCHAR(20) | active, trial, suspended, expired |
| plan_id | VARCHAR | Reference to plans table |
| max_users | INTEGER | Maximum allowed users |
| valid_until | TIMESTAMP | License expiry date |
| settings | JSONB | Organization-specific settings |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

#### plans
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| name | VARCHAR(50) | Plan name (Starter, Professional, Enterprise) |
| description | TEXT | Plan description |
| max_users | INTEGER | Default user limit |
| enabled_modules | TEXT[] | Array of module keys |
| price_monthly | INTEGER | Monthly price in paise |
| price_yearly | INTEGER | Yearly price in paise |
| features | JSONB | Feature flags |
| is_active | VARCHAR(10) | Active status |

#### organization_modules
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| organization_id | VARCHAR | Reference to organizations |
| module_key | VARCHAR(50) | Module identifier |
| is_enabled | INTEGER | 0 or 1 |
| settings | JSONB | Module-specific settings |

#### screen_templates
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| organization_id | VARCHAR | Reference to organizations |
| screen_key | VARCHAR(100) | Screen identifier |
| name | VARCHAR(255) | Template name |
| field_config | JSONB | Field visibility/requirements |
| column_config | JSONB | Table column settings |
| layout_config | JSONB | Layout preferences |
| is_default | INTEGER | Default template flag |
| version | INTEGER | Version number |
| created_at | TIMESTAMP | Record creation time |

#### users (Modified)
| Column | Type | Description |
|--------|------|-------------|
| ... | ... | All existing columns |
| organization_id | VARCHAR | NEW: Reference to organizations (nullable initially) |

### 2.2 Tenant Schema Tables

Each tenant schema (e.g., `org_kinto`, `org_acme`) contains identical copies of:

**Core Operations:**
- machines
- machine_types
- products
- product_categories
- product_types
- raw_materials
- material_types
- inventory

**Checklist & Quality:**
- checklist_templates
- template_tasks
- checklist_assignments
- checklist_submissions
- submission_tasks
- partial_task_answers
- whatsapp_conversation_sessions

**Sales & Finance:**
- vendors
- invoices
- invoice_items
- invoice_payments
- credit_notes
- gatepasses
- gatepass_items

**Production:**
- production_entries
- raw_material_issuances
- bom_configurations
- bom_items

**Maintenance:**
- maintenance_plans
- pm_executions
- pm_task_list_templates

**Documents & Expenses:**
- documents
- expenses
- expense_items
- daily_cash_register

---

## 3. Phase 1: Core Multi-Tenancy Foundation

**Duration:** 1-2 Weeks  
**Complexity:** High  
**Production Impact:** Zero (behind feature flag)

### 3.1 Objectives
- Create foundational tables for tenant management
- Build schema creation and management utilities
- Implement tenant-aware database connections
- Add middleware for automatic schema switching
- Prepare migration scripts for existing data

### 3.2 New Files to Create

```
server/
├── multi-tenant/
│   ├── index.ts              # Feature flag & exports
│   ├── tenant-db.ts          # Tenant-aware DB connection
│   ├── tenant-middleware.ts  # Request context middleware
│   ├── schema-manager.ts     # Create/manage tenant schemas
│   ├── onboarding.ts         # New tenant setup workflow
│   └── migration.ts          # Data migration utilities
```

### 3.3 Key Components

#### Tenant Context Middleware
```typescript
export async function tenantMiddleware(req, res, next) {
  if (!MULTI_TENANT_ENABLED) {
    return next(); // Skip if feature disabled
  }
  
  if (req.user?.organizationId) {
    const org = await getOrganization(req.user.organizationId);
    req.organization = org;
    req.tenantSchema = `org_${org.slug}`;
    
    // Set database search path
    await setSearchPath(req.tenantSchema);
  }
  
  next();
}
```

#### Schema Manager
```typescript
export async function createTenantSchema(slug: string) {
  const schemaName = `org_${slug}`;
  
  // Create schema
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  
  // Apply all migrations to new schema
  await pool.query(`SET search_path TO ${schemaName}`);
  await runDrizzleMigrations();
  
  // Seed default data (roles, categories, etc.)
  await seedDefaultData(schemaName);
  
  return schemaName;
}
```

### 3.4 Database Changes

**Add to schema.ts:**
```typescript
// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  logoUrl: varchar("logo_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("active"),
  planId: varchar("plan_id").references(() => plans.id),
  maxUsers: integer("max_users").default(10),
  validUntil: timestamp("valid_until", { mode: "string" }),
  settings: jsonb("settings").default("{}"),
  recordStatus: integer("record_status").default(1).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

// Plans table
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  maxUsers: integer("max_users").default(10),
  enabledModules: text("enabled_modules").array(),
  priceMonthly: integer("price_monthly"),
  priceYearly: integer("price_yearly"),
  features: jsonb("features").default("{}"),
  isActive: varchar("is_active", { length: 10 }).default("true"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

// Add organizationId to users table
// users table modification:
organizationId: varchar("organization_id").references(() => organizations.id),
```

### 3.5 Deliverables
- [ ] Organizations table created
- [ ] Plans table created
- [ ] Users table modified with organizationId
- [ ] Schema manager utility complete
- [ ] Tenant middleware implemented
- [ ] Feature flag system in place
- [ ] Onboarding workflow functional
- [ ] Unit tests for tenant isolation

---

## 4. Phase 2: Licensing & Quotas

**Duration:** 1 Week  
**Complexity:** Medium  
**Production Impact:** Zero

### 4.1 Objectives
- Implement user count limits per organization
- Add license expiry checking
- Build plan tier management
- Create usage tracking system

### 4.2 Database Tables

#### license_history
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| organization_id | VARCHAR | Reference to organizations |
| plan_id | VARCHAR | Plan at time of record |
| action | VARCHAR(50) | activated, renewed, upgraded, expired |
| valid_from | TIMESTAMP | Start date |
| valid_until | TIMESTAMP | End date |
| amount_paid | INTEGER | Payment amount |
| payment_reference | VARCHAR | Payment gateway reference |
| created_at | TIMESTAMP | Record creation time |

#### tenant_usage
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (UUID) | Primary key |
| organization_id | VARCHAR | Reference to organizations |
| active_users | INTEGER | Current active user count |
| total_invoices | INTEGER | Total invoices created |
| total_storage_mb | INTEGER | Storage used |
| last_calculated | TIMESTAMP | Last calculation time |

### 4.3 Enforcement Points

**User Creation:**
```typescript
async function canCreateUser(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  const currentUsers = await countActiveUsers(orgId);
  
  return currentUsers < org.maxUsers;
}
```

**License Expiry:**
```typescript
async function isLicenseValid(orgId: string): Promise<boolean> {
  const org = await getOrganization(orgId);
  
  if (org.status !== 'active') return false;
  if (new Date(org.validUntil) < new Date()) return false;
  
  return true;
}
```

### 4.4 Plan Tiers

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Price** | ₹2,999/mo | ₹7,999/mo | ₹19,999/mo |
| **Users** | 5 | 15 | Unlimited |
| **Modules** | Basic | Most | All |
| **Support** | Email | Priority | Dedicated |
| **Backup** | Daily | Daily | Real-time |
| **API Access** | No | Limited | Full |

### 4.5 Deliverables
- [ ] License enforcement middleware
- [ ] User limit checking on creation
- [ ] Plan management admin UI
- [ ] Usage tracking system
- [ ] Renewal reminder notifications
- [ ] Grace period handling

---

## 5. Phase 3: Feature/Module Configuration

**Duration:** 1 Week  
**Complexity:** Medium  
**Production Impact:** Zero

### 5.1 Objectives
- Enable per-tenant module toggling
- Build module access control
- Create admin UI for module management
- Implement navigation filtering

### 5.2 Module Registry

```typescript
export const MODULES = {
  dashboard: {
    key: "dashboard",
    name: "Dashboard",
    description: "Main dashboard with KPIs",
    screens: ["dashboard"],
    defaultEnabled: true,
  },
  invoicing: {
    key: "invoicing",
    name: "Invoicing & Billing",
    description: "Invoice creation and management",
    screens: ["invoices", "create_invoice", "invoice_detail"],
    defaultEnabled: true,
  },
  inventory: {
    key: "inventory",
    name: "Inventory Management",
    description: "Stock tracking and management",
    screens: ["inventory", "raw_materials", "products"],
    defaultEnabled: false,
  },
  production: {
    key: "production",
    name: "Production & BOM",
    description: "Production entries and bill of materials",
    screens: ["production", "bom", "raw_material_issuance"],
    defaultEnabled: false,
  },
  quality: {
    key: "quality",
    name: "Quality Checklists",
    description: "Machine startup and quality checks",
    screens: ["checklists", "assignments", "submissions"],
    defaultEnabled: false,
  },
  maintenance: {
    key: "maintenance",
    name: "Preventive Maintenance",
    description: "PM schedules and execution",
    screens: ["maintenance_plans", "pm_executions"],
    defaultEnabled: false,
  },
  gatepasses: {
    key: "gatepasses",
    name: "Gatepasses & Dispatch",
    description: "Dispatch tracking and gatepasses",
    screens: ["gatepasses", "dispatch_tracking"],
    defaultEnabled: true,
  },
  reports: {
    key: "reports",
    name: "Reports & Analytics",
    description: "Business reports and analytics",
    screens: ["reports", "gst_reports", "sales_reports"],
    defaultEnabled: true,
  },
  documents: {
    key: "documents",
    name: "Document Management",
    description: "Document storage and tracking",
    screens: ["documents"],
    defaultEnabled: false,
  },
  mis: {
    key: "mis",
    name: "MIS Dashboard",
    description: "Management Information System",
    screens: ["mis_dashboard", "mis_production", "mis_inventory"],
    defaultEnabled: false,
  },
};
```

### 5.3 Frontend Navigation Filtering

```typescript
function useFilteredNavigation() {
  const { organization } = useAuth();
  const enabledModules = organization?.enabledModules || [];
  
  return allNavItems.filter(item => {
    const module = navItemToModule[item.key];
    return enabledModules.includes(module);
  });
}
```

### 5.4 Backend Module Guard

```typescript
export function requireModule(moduleKey: string) {
  return async (req, res, next) => {
    const enabledModules = req.organization?.enabledModules || [];
    
    if (!enabledModules.includes(moduleKey)) {
      return res.status(403).json({
        error: "Module not enabled",
        message: "This feature requires an upgraded plan",
        requiredModule: moduleKey,
      });
    }
    
    next();
  };
}

// Usage in routes:
app.use("/api/production/*", requireModule("production"));
app.use("/api/quality/*", requireModule("quality"));
```

### 5.5 Deliverables
- [ ] Module registry defined
- [ ] Organization modules table populated
- [ ] Module toggle admin UI
- [ ] Navigation filtering on frontend
- [ ] API-level module guards
- [ ] "Upgrade Required" UI components

---

## 6. Phase 4: Screen Templating System

**Duration:** 2 Weeks  
**Complexity:** High  
**Production Impact:** Zero

### 6.1 Objectives
- Allow per-tenant field customization
- Build visual template editor
- Implement template-aware form rendering
- Add table column configuration

### 6.2 Template Structure

```typescript
interface ScreenTemplate {
  id: string;
  organizationId: string;
  screenKey: string;
  name: string;
  
  fieldConfig: {
    [fieldName: string]: {
      visible: boolean;
      required: boolean;
      label?: string;
      placeholder?: string;
      defaultValue?: any;
      order?: number;
    };
  };
  
  columnConfig: {
    [columnName: string]: {
      visible: boolean;
      label?: string;
      width?: number;
      sortable?: boolean;
      order?: number;
    };
  };
  
  layoutConfig: {
    columns?: number;
    sections?: Array<{
      title: string;
      fields: string[];
    }>;
  };
}
```

### 6.3 Example: Invoice Form Template

```json
{
  "screenKey": "invoice_form",
  "fieldConfig": {
    "invoiceNumber": { "visible": true, "required": true, "label": "Invoice #" },
    "invoiceDate": { "visible": true, "required": true },
    "buyerName": { "visible": true, "required": true },
    "buyerGst": { "visible": true, "required": false },
    "transportMode": { "visible": false },
    "vehicleNumber": { "visible": false },
    "poReference": { "visible": false },
    "paymentTerms": { "visible": true, "required": false }
  },
  "columnConfig": {
    "productName": { "visible": true, "width": 200 },
    "quantity": { "visible": true },
    "rate": { "visible": true },
    "amount": { "visible": true },
    "hsnCode": { "visible": false },
    "discount": { "visible": false }
  }
}
```

### 6.4 Template-Aware Components

```tsx
// useScreenTemplate hook
function useScreenTemplate(screenKey: string) {
  const { organization } = useAuth();
  
  const { data: template } = useQuery({
    queryKey: ["/api/screen-templates", organization?.id, screenKey],
    enabled: !!organization?.id,
  });
  
  return {
    fieldConfig: template?.fieldConfig || defaultFieldConfig[screenKey],
    columnConfig: template?.columnConfig || defaultColumnConfig[screenKey],
    isFieldVisible: (field: string) => template?.fieldConfig?.[field]?.visible !== false,
    isFieldRequired: (field: string) => template?.fieldConfig?.[field]?.required === true,
    getFieldLabel: (field: string) => template?.fieldConfig?.[field]?.label,
  };
}

// Template-aware form field
function TemplateField({ name, defaultLabel, children }) {
  const { isFieldVisible, isFieldRequired, getFieldLabel } = useScreenTemplate("invoice_form");
  
  if (!isFieldVisible(name)) return null;
  
  return (
    <FormField
      name={name}
      label={getFieldLabel(name) || defaultLabel}
      required={isFieldRequired(name)}
    >
      {children}
    </FormField>
  );
}
```

### 6.5 Template Builder UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Screen Template Builder                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Screen: [Invoice Form ▼]                                       │
│                                                                 │
│  ┌─────────────────────────┬───────────────────────────────────┐│
│  │  Available Fields       │  Preview                          ││
│  │                         │                                   ││
│  │  ☑ Invoice Number      │  ┌─────────────────────────────┐  ││
│  │  ☑ Invoice Date        │  │ Invoice #: [_______]        │  ││
│  │  ☑ Buyer Name          │  │ Date:      [_______]        │  ││
│  │  ☑ GST Number          │  │ Buyer:     [_______]        │  ││
│  │  ☐ Transport Mode      │  │ GST:       [_______]        │  ││
│  │  ☐ Vehicle Number      │  │                             │  ││
│  │  ☐ PO Reference        │  │ [Transport - Hidden]        │  ││
│  │  ☑ Payment Terms       │  │ [Vehicle - Hidden]          │  ││
│  │                         │  └─────────────────────────────┘  ││
│  │  [Drag to reorder]      │                                   ││
│  └─────────────────────────┴───────────────────────────────────┘│
│                                                                 │
│  [ Reset to Default ]                [ Save Template ]          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.6 Deliverables
- [ ] Screen templates table created
- [ ] Template CRUD API
- [ ] useScreenTemplate hook
- [ ] Template-aware form components
- [ ] Template-aware table components
- [ ] Visual template builder UI
- [ ] Default templates for all screens
- [ ] Template versioning and rollback

---

## 7. Phase 5: Low-Code Platform Engine

**Duration:** 8-12 Weeks  
**Complexity:** Very High  
**Production Impact:** Zero (behind feature flag)

> **This is the key differentiator:** Customers can create their own screens and business logic without developer involvement.

### 7.1 Objectives
- Enable customers to create entirely NEW screens from scratch
- Provide visual business rules engine for custom logic
- Allow creation of custom data entities (tables)
- Build workflow automation for triggered actions
- Self-service platform requiring no developer work

### 7.2 Core Components

#### 7.2.1 Custom Data Entities (Custom Tables)

Customers can create their own data structures:

```typescript
// Database table for storing custom entity definitions
interface CustomEntity {
  id: string;
  organizationId: string;
  name: string;              // "Equipment Maintenance Log"
  slug: string;              // "equipment_maintenance_log"
  description: string;
  
  fields: Array<{
    name: string;            // "equipment_name"
    label: string;           // "Equipment Name"
    type: "text" | "number" | "date" | "select" | "reference" | "file" | "boolean";
    required: boolean;
    defaultValue?: any;
    
    // For select type
    options?: Array<{ label: string; value: string }>;
    
    // For reference type (links to other entities)
    referenceEntity?: string;  // "products" or custom entity slug
    referenceField?: string;   // "id"
    displayField?: string;     // "name"
    
    // Validation
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      customMessage?: string;
    };
  }>;
  
  createdAt: string;
  updatedAt: string;
}

// Actual data stored in a generic structure
interface CustomEntityRecord {
  id: string;
  organizationId: string;
  entitySlug: string;      // Which custom entity this belongs to
  data: Record<string, any>;  // JSONB with actual field values
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

**Example: Customer Creates "Equipment Maintenance Log"**
```json
{
  "name": "Equipment Maintenance Log",
  "slug": "equipment_maintenance_log",
  "fields": [
    { "name": "equipment_name", "label": "Equipment", "type": "reference", "referenceEntity": "machines", "required": true },
    { "name": "maintenance_type", "label": "Type", "type": "select", "options": [
      {"label": "Preventive", "value": "preventive"},
      {"label": "Breakdown", "value": "breakdown"},
      {"label": "Inspection", "value": "inspection"}
    ]},
    { "name": "performed_date", "label": "Date", "type": "date", "required": true },
    { "name": "performed_by", "label": "Technician", "type": "reference", "referenceEntity": "users" },
    { "name": "notes", "label": "Notes", "type": "text" },
    { "name": "cost", "label": "Cost (₹)", "type": "number", "validation": {"min": 0} },
    { "name": "next_due_date", "label": "Next Due Date", "type": "date" }
  ]
}
```

#### 7.2.2 Custom Screen Builder

Visual drag-and-drop screen builder:

```typescript
interface CustomScreen {
  id: string;
  organizationId: string;
  name: string;              // "Equipment Maintenance"
  slug: string;              // "equipment-maintenance"
  icon: string;              // Lucide icon name
  description: string;
  navLocation: "sidebar" | "admin" | "reports";
  
  // Screen type
  screenType: "list" | "form" | "detail" | "dashboard" | "report";
  
  // What data does this screen work with?
  dataSource: {
    type: "custom_entity" | "system_entity";
    entitySlug: string;     // "equipment_maintenance_log" or "invoices"
  };
  
  // Screen configuration based on type
  config: ListScreenConfig | FormScreenConfig | DashboardConfig;
  
  // Access control
  allowedRoles: string[];
  
  createdAt: string;
  updatedAt: string;
}

// List screen configuration
interface ListScreenConfig {
  columns: Array<{
    field: string;
    label: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
  }>;
  
  defaultSort?: { field: string; direction: "asc" | "desc" };
  
  actions: Array<{
    type: "view" | "edit" | "delete" | "custom";
    label: string;
    icon?: string;
    screen?: string;         // Link to another custom screen
    condition?: BusinessRule; // Show only when condition met
  }>;
  
  filters?: Array<{
    field: string;
    type: "text" | "select" | "date_range";
    label: string;
  }>;
  
  bulkActions?: Array<{
    type: "delete" | "export" | "custom";
    label: string;
    workflow?: string;       // Trigger a workflow
  }>;
}

// Form screen configuration  
interface FormScreenConfig {
  sections: Array<{
    title: string;
    columns: 1 | 2 | 3;
    fields: string[];        // Field names from entity
  }>;
  
  submitAction: {
    type: "create" | "update";
    successMessage: string;
    redirectTo?: string;
    triggerWorkflow?: string;
  };
}
```

**Visual Builder UI**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Screen Builder: Equipment Maintenance                            [Save] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌────────────────────────────────────────────────┐│
│  │  Components      │  │  Preview                                       ││
│  │                  │  │                                                ││
│  │  📋 List View    │  │  ┌────────────────────────────────────────────┐││
│  │  📝 Form         │  │  │  Equipment Maintenance              [+Add] │││
│  │  📊 Chart        │  │  ├────────────────────────────────────────────┤││
│  │  🔢 Stat Card    │  │  │ Equipment  │ Type    │ Date   │ Cost      │││
│  │  📅 Calendar     │  │  │ Machine A  │ Prevent │ 12 Dec │ ₹5,000    │││
│  │  📈 Table        │  │  │ Machine B  │ Breakdn │ 10 Dec │ ₹12,500   │││
│  │                  │  │  └────────────────────────────────────────────┘││
│  │  ───────────     │  │                                                ││
│  │                  │  │                                                ││
│  │  Available       │  │                                                ││
│  │  Fields:         │  │                                                ││
│  │  ☑ equipment     │  │                                                ││
│  │  ☑ type          │  │                                                ││
│  │  ☑ date          │  │                                                ││
│  │  ☑ cost          │  │                                                ││
│  │  ☐ technician    │  │                                                ││
│  │  ☐ notes         │  │                                                ││
│  └──────────────────┘  └────────────────────────────────────────────────┘│
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  Business Rules for this Screen                            [+ Add]  ││
│  │                                                                      ││
│  │  📌 When "cost" > 10000 → Highlight row in red                      ││
│  │  📌 When "next_due_date" < today → Show warning badge               ││
│  │  📌 On form submit → Send WhatsApp to Manager                       ││
│  └──────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

#### 7.2.3 Business Rules Engine

Visual rule builder for custom logic:

```typescript
interface BusinessRule {
  id: string;
  organizationId: string;
  name: string;              // "High Cost Alert"
  description: string;
  isActive: boolean;
  
  // When should this rule trigger?
  trigger: {
    type: "on_create" | "on_update" | "on_delete" | "on_field_change" | "scheduled";
    entitySlug: string;      // Which entity to watch
    field?: string;          // For on_field_change
    schedule?: string;       // Cron expression for scheduled
  };
  
  // Conditions to check
  conditions: Array<{
    field: string;
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | 
              "contains" | "is_empty" | "is_not_empty" | "in_list";
    value: any;
    logicalOperator?: "AND" | "OR";
  }>;
  
  // What to do when conditions are met
  actions: Array<{
    type: "set_field" | "send_notification" | "create_record" | 
          "update_record" | "send_email" | "send_whatsapp" | "webhook";
    
    // For set_field
    targetField?: string;
    targetValue?: any;
    
    // For notifications
    notificationType?: "info" | "warning" | "error";
    message?: string;
    recipients?: string[];   // User IDs or roles
    
    // For create_record
    targetEntity?: string;
    recordData?: Record<string, any>;
    
    // For webhook
    webhookUrl?: string;
    webhookMethod?: "GET" | "POST";
    webhookPayload?: Record<string, any>;
  }>;
  
  createdAt: string;
  updatedAt: string;
}
```

**Example Rules Customers Can Create:**

| Rule Name | Trigger | Condition | Action |
|-----------|---------|-----------|--------|
| High Cost Alert | On maintenance log create | cost > ₹10,000 | Send WhatsApp to Manager |
| Overdue Reminder | Daily at 8 AM | next_due_date = today | Send notification to Technician |
| Auto-Status Update | On invoice payment | amount_paid = total_amount | Set status to "Paid" |
| Low Stock Alert | On inventory update | quantity < reorder_level | Create purchase request |
| Quality Fail Action | On checklist submit | any_task_failed = true | Block machine startup |

**Visual Rule Builder UI**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Business Rule: High Cost Maintenance Alert                      [Save] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WHEN this happens:                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  [On Record Create ▼]  in  [Equipment Maintenance Log ▼]            ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  IF these conditions are met:                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  [Cost ▼]  [is greater than ▼]  [10000]                    [+ Add]  ││
│  │                                                                      ││
│  │    AND                                                               ││
│  │                                                                      ││
│  │  [Type ▼]  [equals ▼]  [Breakdown ▼]                       [× Del]  ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  THEN do this:                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │  Action 1: [Send WhatsApp Message ▼]                                ││
│  │                                                                      ││
│  │    To:  [All users with role: Manager ▼]                            ││
│  │                                                                      ││
│  │    Message:                                                         ││
│  │    ┌────────────────────────────────────────────────────────────┐   ││
│  │    │ 🚨 High cost maintenance logged!                           │   ││
│  │    │ Equipment: {{equipment_name}}                              │   ││
│  │    │ Cost: ₹{{cost}}                                            │   ││
│  │    │ Logged by: {{created_by_name}}                             │   ││
│  │    └────────────────────────────────────────────────────────────┘   ││
│  │                                                                      ││
│  │  [+ Add Another Action]                                              ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  [ Test Rule ]                                             [ Save Rule ] │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 7.2.4 Workflow Automation

Multi-step automated processes:

```typescript
interface Workflow {
  id: string;
  organizationId: string;
  name: string;              // "New Order Processing"
  description: string;
  isActive: boolean;
  
  trigger: {
    type: "manual" | "on_event" | "scheduled" | "webhook";
    entitySlug?: string;
    eventType?: "create" | "update" | "delete";
    schedule?: string;
  };
  
  steps: Array<{
    id: string;
    name: string;
    type: "action" | "condition" | "delay" | "approval";
    
    // For action step
    action?: {
      type: "create_record" | "update_record" | "send_notification" | 
            "send_email" | "send_whatsapp" | "call_api";
      config: Record<string, any>;
    };
    
    // For condition step (branching)
    condition?: {
      rules: BusinessRule["conditions"];
      trueNextStep: string;
      falseNextStep: string;
    };
    
    // For delay step
    delay?: {
      duration: number;
      unit: "minutes" | "hours" | "days";
    };
    
    // For approval step
    approval?: {
      approvers: string[];   // User IDs or role names
      message: string;
      timeout?: number;
      onApprove: string;     // Next step ID
      onReject: string;      // Next step ID
    };
    
    nextStep?: string;       // Default next step
  }>;
}
```

### 7.3 Database Tables for Low-Code Engine

```sql
-- Custom entity definitions (what data structures exist)
CREATE TABLE custom_entities (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,      -- Array of field definitions
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Actual data records for custom entities
CREATE TABLE custom_entity_records (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  entity_slug VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,         -- Actual field values
  created_by VARCHAR REFERENCES users(id),
  updated_by VARCHAR REFERENCES users(id),
  record_status INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_custom_records_org_entity ON custom_entity_records(organization_id, entity_slug);

-- Custom screen definitions
CREATE TABLE custom_screens (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  nav_location VARCHAR(20),
  screen_type VARCHAR(20) NOT NULL,
  data_source JSONB NOT NULL,
  config JSONB NOT NULL,
  allowed_roles TEXT[],
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Business rules
CREATE TABLE business_rules (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflows
CREATE TABLE workflows (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow execution logs
CREATE TABLE workflow_executions (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  workflow_id VARCHAR REFERENCES workflows(id),
  trigger_record_id VARCHAR,
  status VARCHAR(20),          -- pending, running, completed, failed
  current_step VARCHAR,
  step_results JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 7.4 Low-Code Runtime Engine

```typescript
// server/low-code/engine.ts

export class LowCodeEngine {
  
  // Execute a business rule
  async executeRule(rule: BusinessRule, record: any): Promise<void> {
    // Check conditions
    const conditionsMet = this.evaluateConditions(rule.conditions, record);
    
    if (conditionsMet) {
      for (const action of rule.actions) {
        await this.executeAction(action, record);
      }
      
      // Update execution count
      await this.updateRuleStats(rule.id);
    }
  }
  
  // Evaluate conditions
  private evaluateConditions(
    conditions: BusinessRule["conditions"], 
    record: any
  ): boolean {
    let result = true;
    
    for (const cond of conditions) {
      const fieldValue = record[cond.field];
      let matches = false;
      
      switch (cond.operator) {
        case "equals": matches = fieldValue === cond.value; break;
        case "not_equals": matches = fieldValue !== cond.value; break;
        case "greater_than": matches = fieldValue > cond.value; break;
        case "less_than": matches = fieldValue < cond.value; break;
        case "contains": matches = String(fieldValue).includes(cond.value); break;
        case "is_empty": matches = !fieldValue; break;
        case "is_not_empty": matches = !!fieldValue; break;
        case "in_list": matches = cond.value.includes(fieldValue); break;
      }
      
      if (cond.logicalOperator === "OR") {
        result = result || matches;
      } else {
        result = result && matches;
      }
    }
    
    return result;
  }
  
  // Execute an action
  private async executeAction(
    action: BusinessRule["actions"][0], 
    record: any
  ): Promise<void> {
    switch (action.type) {
      case "set_field":
        await this.setField(record, action.targetField!, action.targetValue);
        break;
        
      case "send_whatsapp":
        await this.sendWhatsApp(action.recipients!, action.message!, record);
        break;
        
      case "send_email":
        await this.sendEmail(action.recipients!, action.message!, record);
        break;
        
      case "create_record":
        await this.createRecord(action.targetEntity!, action.recordData!, record);
        break;
        
      case "webhook":
        await this.callWebhook(action.webhookUrl!, action.webhookMethod!, 
                               action.webhookPayload!, record);
        break;
    }
  }
  
  // Template variable replacement
  private replaceTemplateVars(template: string, record: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return record[key] ?? match;
    });
  }
}
```

### 7.5 Custom Screen Renderer

```tsx
// client/src/components/low-code/CustomScreenRenderer.tsx

export function CustomScreenRenderer({ screenSlug }: { screenSlug: string }) {
  const { data: screen } = useQuery({
    queryKey: ["/api/custom-screens", screenSlug],
  });
  
  if (!screen) return <LoadingSpinner />;
  
  switch (screen.screenType) {
    case "list":
      return <CustomListScreen screen={screen} />;
    case "form":
      return <CustomFormScreen screen={screen} />;
    case "dashboard":
      return <CustomDashboardScreen screen={screen} />;
    default:
      return <div>Unknown screen type</div>;
  }
}

function CustomListScreen({ screen }: { screen: CustomScreen }) {
  const { data: records } = useQuery({
    queryKey: ["/api/custom-entities", screen.dataSource.entitySlug, "records"],
  });
  
  const config = screen.config as ListScreenConfig;
  
  return (
    <div>
      <PageHeader title={screen.name} description={screen.description}>
        <Button onClick={() => navigate(`/custom/${screen.slug}/new`)}>
          + Add New
        </Button>
      </PageHeader>
      
      {/* Filters */}
      {config.filters && <CustomFilters filters={config.filters} />}
      
      {/* Data Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {config.columns.map(col => (
              <TableHead key={col.field}>{col.label}</TableHead>
            ))}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records?.map(record => (
            <TableRow key={record.id}>
              {config.columns.map(col => (
                <TableCell key={col.field}>
                  <FieldRenderer 
                    field={col.field} 
                    value={record.data[col.field]} 
                    entity={screen.dataSource.entitySlug}
                  />
                </TableCell>
              ))}
              <TableCell>
                <CustomActions actions={config.actions} record={record} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 7.6 Phase 5 Timeline

| Week | Task |
|------|------|
| 1-2 | Custom entity system (database, API, basic UI) |
| 3-4 | Custom screen builder (list, form screen types) |
| 5-6 | Business rules engine (core logic, triggers) |
| 7-8 | Workflow automation (multi-step processes) |
| 9-10 | Rule builder UI, testing, and refinement |
| 11-12 | Integration, documentation, and polish |

### 7.7 Phase 5 Deliverables
- [ ] Custom entity definition system
- [ ] Custom entity CRUD API with dynamic validation
- [ ] Custom screen builder with drag-drop UI
- [ ] List, Form, Dashboard screen types
- [ ] Business rules engine with visual builder
- [ ] Workflow automation system
- [ ] WhatsApp/Email action integration
- [ ] Navigation integration for custom screens
- [ ] Role-based access for custom screens
- [ ] Comprehensive testing and documentation

### 7.8 Low-Code vs Full Development Comparison

| Capability | Low-Code (Phase 5) | Full Development |
|------------|-------------------|------------------|
| Create new screens | ✅ Yes | ✅ Yes |
| Create new data entities | ✅ Yes | ✅ Yes |
| Simple if-then logic | ✅ Yes | ✅ Yes |
| Complex calculations | ⚠️ Limited | ✅ Full |
| Custom API integrations | ✅ Webhooks only | ✅ Full |
| Custom UI components | ❌ No | ✅ Yes |
| Complex workflows | ✅ Yes | ✅ Yes |
| Time to create | Minutes | Hours/Days |
| Technical skill needed | None | Developer |

---

## 8. Phase 6: AI Application Generator

**Duration:** 10 Weeks  
**Complexity:** Very High  
**This is Revolutionary:** Customers describe requirements in natural language, AI generates complete applications.

### 8.1 Vision

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer types:                                                │
│  "I need a billing system for 5 million electricity meters     │
│   with slab-based tariffs, late fees, and WhatsApp reminders"  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                     🤖 AI Processes
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  GENERATES AUTOMATICALLY:                                       │
│  • Database: customers, meters, readings, bills, payments       │
│  • Logic: slab calculations, late fee rules, due dates          │
│  • Screens: Customer portal, Admin dashboard, Bill details      │
│  • Workflows: Bill generation → Notification → Reminder         │
│  • Reports: Collection summary, Outstanding, Revenue analytics  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Core Components

#### Requirement Parser
```typescript
interface ParsedRequirements {
  // Extracted entities
  entities: Array<{
    name: string;           // "meters", "bills", "customers"
    fields: FieldDefinition[];
    relationships: Relationship[];
  }>;
  
  // Business logic
  calculations: Array<{
    name: string;           // "bill_amount"
    formula: string;        // "units * rate + late_fee"
    triggers: string[];     // ["on_reading_create"]
  }>;
  
  // Workflows
  workflows: Array<{
    name: string;           // "billing_cycle"
    steps: WorkflowStep[];
    triggers: string[];
  }>;
  
  // Scale requirements
  scale: {
    recordCount: number;    // 5,000,000 meters
    frequency: string;      // "every 15 minutes"
    analyticsNeeded: boolean;
  };
}
```

#### AI Prompt Engineering
```typescript
const systemPrompt = `
You are an application architect. Given a business requirement, 
extract the following in JSON format:

1. DATA ENTITIES: What data needs to be stored?
   - Entity name, fields (name, type, required, validation)
   - Relationships between entities

2. BUSINESS RULES: What calculations/validations are needed?
   - Formulas, conditions, triggers

3. USER INTERFACES: What screens are needed?
   - List screens, form screens, dashboards
   - Who can access each screen

4. WORKFLOWS: What automated processes are needed?
   - Steps, triggers, notifications

5. SCALE: Volume and performance requirements
   - Record counts, update frequencies, analytics needs
`;

async function parseRequirements(userInput: string): Promise<ParsedRequirements> {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 8.3 Generation Pipeline

```
User Input
    ↓
┌─────────────────────────────────────────┐
│ 1. REQUIREMENT UNDERSTANDING            │
│    • NLP parsing                        │
│    • Entity extraction                  │
│    • Relationship mapping               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. SCHEMA GENERATION                    │
│    • Database tables                    │
│    • Field definitions                  │
│    • Indexes and constraints            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. LOGIC GENERATION                     │
│    • Business rules                     │
│    • Calculation formulas               │
│    • Validation rules                   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. UI GENERATION                        │
│    • Screen layouts                     │
│    • Form configurations                │
│    • Dashboard components               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. WORKFLOW GENERATION                  │
│    • Automated processes                │
│    • Notification templates             │
│    • Integration configs                │
└─────────────────────────────────────────┘
    ↓
Preview & Customer Approval
    ↓
Deploy to Low-Code Engine
```

### 8.4 Example: Power Utility Billing

**Customer Input:**
> "Create a billing system for electricity. We have 50,000 domestic customers with single-phase meters. Billing is monthly based on meter readings. Tariff is ₹3 per unit for first 100 units, ₹5 for 100-200, ₹7 above 200. Late fee is 2% after due date. Send bill via WhatsApp when generated, reminder 5 days before due date."

**AI Generates:**

```yaml
entities:
  - name: customers
    fields:
      - name: customer_id, type: string, pattern: "CUST-XXXXX"
      - name: name, type: string, required: true
      - name: address, type: text
      - name: mobile, type: phone, required: true
      - name: connection_date, type: date
      - name: meter_number, type: string, unique: true
      
  - name: meter_readings
    fields:
      - name: customer_id, type: reference(customers)
      - name: reading_date, type: date
      - name: previous_reading, type: number
      - name: current_reading, type: number
      - name: units_consumed, type: computed(current - previous)
      
  - name: bills
    fields:
      - name: customer_id, type: reference(customers)
      - name: bill_number, type: auto_generate("BILL-YYYYMM-XXXXX")
      - name: bill_date, type: date
      - name: due_date, type: computed(bill_date + 15 days)
      - name: units, type: number
      - name: amount, type: computed(tariff_calculation)
      - name: late_fee, type: computed(2% if overdue)
      - name: status, type: enum(generated, sent, paid, overdue)

calculations:
  - name: tariff_calculation
    formula: |
      if units <= 100: units * 3
      elif units <= 200: 300 + (units - 100) * 5
      else: 300 + 500 + (units - 200) * 7
      
workflows:
  - name: monthly_billing
    trigger: scheduled, 1st of month
    steps:
      1. For each customer, get latest reading
      2. Calculate bill amount
      3. Create bill record
      4. Send WhatsApp with bill details
      
  - name: payment_reminder
    trigger: 5 days before due_date
    steps:
      1. Find unpaid bills
      2. Send WhatsApp reminder
      
screens:
  - name: customer_list
    type: list
    data: customers
    columns: [customer_id, name, mobile, meter_number]
    actions: [view, edit, generate_bill]
    
  - name: billing_dashboard
    type: dashboard
    widgets:
      - total_customers, total_billed, total_collected
      - overdue_amount, collection_percentage
      - monthly_trend_chart
```

### 8.5 Phase 6 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 21-22 | Requirement Parser | NLP extraction, entity recognition, AI prompts |
| 23-24 | Schema Generator | Database schema from entities, relationship handling |
| 25-26 | Logic Generator | Business rules, calculations, validation code |
| 27-28 | UI Generator | Screen configs, form layouts, dashboard components |
| 29-30 | Integration & Testing | End-to-end flow, refinement, documentation |

### 8.6 Phase 6 Deliverables
- [ ] Natural language requirement parser (AI-powered)
- [ ] Database schema generator
- [ ] Business logic code generator
- [ ] UI screen configuration generator
- [ ] Workflow generator
- [ ] Preview and approval interface
- [ ] One-click deployment to Low-Code engine
- [ ] Example templates for common industries

---

## 9. Phase 7: Infrastructure Auto-Selector

**Duration:** 8 Weeks  
**Complexity:** High  
**Purpose:** Automatically select optimal infrastructure based on scale requirements.

### 9.1 Vision

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer requirement:                                          │
│  "5 million AMI meters, readings every 15 minutes,              │
│   analytics at 1-hour and 6-hour intervals"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                     🔢 Load Calculation
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  CALCULATED REQUIREMENTS:                                       │
│  • 480 million writes/day                                       │
│  • 5,500 writes/second peak                                     │
│  • 50 GB storage/day                                            │
│  • Heavy analytics load                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                     🏗️ Architecture Selection
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  SELECTED STACK:                                                │
│  • TimescaleDB (time-series optimized)                          │
│  • Kafka (message buffering)                                    │
│  • ClickHouse (analytics)                                       │
│  • Redis Cluster (caching)                                      │
│  • Kubernetes (container orchestration)                         │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Load Calculator

```typescript
interface LoadProfile {
  // Input parameters
  deviceCount: number;           // 5,000,000
  readingFrequency: string;      // "every 15 minutes"
  analyticsIntervals: string[];  // ["1h", "6h"]
  dataRetention: string;         // "2 years"
  concurrentUsers: number;       // 500
  
  // Calculated metrics
  dailyWrites: number;           // 480,000,000
  peakWritesPerSecond: number;   // 11,111
  storagePerDay: string;         // "48 GB"
  monthlyStorage: string;        // "1.44 TB"
  analyticsComplexity: "low" | "medium" | "high";
}

function calculateLoad(requirements: ParsedRequirements): LoadProfile {
  const frequencyMap = {
    "every 15 minutes": 96,
    "every hour": 24,
    "daily": 1
  };
  
  const readingsPerDay = frequencyMap[requirements.scale.frequency] || 24;
  const dailyWrites = requirements.scale.recordCount * readingsPerDay;
  const peakWritesPerSecond = (dailyWrites / 86400) * 2; // 2x peak factor
  const bytesPerRecord = 100; // Estimated
  const storagePerDay = dailyWrites * bytesPerRecord;
  
  return {
    deviceCount: requirements.scale.recordCount,
    readingFrequency: requirements.scale.frequency,
    dailyWrites,
    peakWritesPerSecond,
    storagePerDay: formatBytes(storagePerDay),
    monthlyStorage: formatBytes(storagePerDay * 30),
    analyticsComplexity: requirements.scale.analyticsNeeded ? "high" : "medium"
  };
}
```

### 9.3 Architecture Selector

| Load Profile | Database | Queue | Analytics | Cache |
|--------------|----------|-------|-----------|-------|
| **Small** (<1M records/day) | PostgreSQL | Redis Queue | Same DB | Redis single |
| **Medium** (1M-100M/day) | TimescaleDB | Redis Streams | PostgreSQL views | Redis |
| **Large** (100M-1B/day) | TimescaleDB cluster | Kafka | ClickHouse | Redis Cluster |
| **Massive** (>1B/day) | Cassandra | Kafka Cluster | ClickHouse Cluster | Redis Cluster |

```typescript
interface ArchitectureRecommendation {
  tier: "small" | "medium" | "large" | "massive";
  
  database: {
    type: "postgresql" | "timescaledb" | "cassandra";
    version: string;
    nodes: number;
    storage: string;
    instanceType: string; // AWS/Azure/GCP instance
  };
  
  queue: {
    type: "none" | "redis-queue" | "kafka";
    brokers?: number;
    partitions?: number;
  };
  
  analytics: {
    type: "same-db" | "postgresql-views" | "clickhouse";
    nodes?: number;
  };
  
  cache: {
    type: "redis" | "redis-cluster";
    nodes: number;
    memoryPerNode: string;
  };
  
  api: {
    replicas: number;
    autoscale: { min: number; max: number };
  };
  
  estimatedCost: {
    monthly: number;
    currency: "INR" | "USD";
  };
}

function selectArchitecture(load: LoadProfile): ArchitectureRecommendation {
  if (load.dailyWrites < 1_000_000) {
    return {
      tier: "small",
      database: {
        type: "postgresql",
        version: "15",
        nodes: 1,
        storage: "100GB",
        instanceType: "db.t3.medium"
      },
      queue: { type: "none" },
      analytics: { type: "same-db" },
      cache: { type: "redis", nodes: 1, memoryPerNode: "1GB" },
      api: { replicas: 2, autoscale: { min: 2, max: 5 } },
      estimatedCost: { monthly: 15000, currency: "INR" }
    };
  }
  
  if (load.dailyWrites < 100_000_000) {
    return {
      tier: "medium",
      database: {
        type: "timescaledb",
        version: "2.11",
        nodes: 2,
        storage: "500GB",
        instanceType: "db.r5.large"
      },
      queue: { type: "redis-queue" },
      analytics: { type: "postgresql-views" },
      cache: { type: "redis", nodes: 1, memoryPerNode: "8GB" },
      api: { replicas: 3, autoscale: { min: 3, max: 10 } },
      estimatedCost: { monthly: 75000, currency: "INR" }
    };
  }
  
  // Large scale
  return {
    tier: "large",
    database: {
      type: "timescaledb",
      version: "2.11",
      nodes: 3,
      storage: "2TB",
      instanceType: "db.r5.2xlarge"
    },
    queue: { type: "kafka", brokers: 3, partitions: 50 },
    analytics: { type: "clickhouse", nodes: 3 },
    cache: { type: "redis-cluster", nodes: 6, memoryPerNode: "32GB" },
    api: { replicas: 10, autoscale: { min: 5, max: 50 } },
    estimatedCost: { monthly: 350000, currency: "INR" }
  };
}
```

### 9.4 Hardware Requirements Generator

For on-prem deployments, generate hardware specifications:

```typescript
interface HardwareRequirements {
  tier: string;
  servers: Array<{
    role: string;           // "database", "api", "analytics"
    count: number;
    specs: {
      cpu: string;          // "16 cores"
      ram: string;          // "64 GB"
      storage: string;      // "2 TB NVMe SSD"
      network: string;      // "10 Gbps"
    };
  }>;
  
  totalCost: {
    hardware: number;
    annual: number;
  };
}

function generateHardwareSpecs(arch: ArchitectureRecommendation): HardwareRequirements {
  // Map cloud instances to hardware specs
  const instanceToHardware = {
    "db.r5.large": { cpu: "2 cores", ram: "16 GB", storage: "500 GB SSD" },
    "db.r5.xlarge": { cpu: "4 cores", ram: "32 GB", storage: "1 TB SSD" },
    "db.r5.2xlarge": { cpu: "8 cores", ram: "64 GB", storage: "2 TB NVMe" },
    // ... more mappings
  };
  
  return {
    tier: arch.tier,
    servers: [
      {
        role: "Database Server",
        count: arch.database.nodes,
        specs: instanceToHardware[arch.database.instanceType]
      },
      // ... other servers
    ]
  };
}
```

### 9.5 Phase 7 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 31-32 | Load Calculator | Metrics extraction, formula engine |
| 33-34 | Architecture Selector | Decision matrix, stack configurations |
| 35-36 | Cost Estimator | Cloud pricing integration, hardware costs |
| 37-38 | UI & Integration | Architecture preview, customer approval |

### 9.6 Phase 7 Deliverables
- [ ] Load calculation engine
- [ ] Architecture decision matrix
- [ ] Cloud instance mapping (AWS/Azure/GCP)
- [ ] Hardware requirements generator
- [ ] Cost estimation engine
- [ ] Architecture preview UI
- [ ] Comparison view (different tiers)

---

## 10. Phase 8: Cloud Auto-Deployment

**Duration:** 6 Weeks  
**Complexity:** High  
**Purpose:** One-click deployment to any major cloud provider.

### 10.1 Deployment Options

```
┌─────────────────────────────────────────────────────────────────┐
│  Customer selects:                                              │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │    ☁️ AWS   │   │   ☁️ Azure  │   │   ☁️ GCP    │           │
│  │             │   │             │   │             │           │
│  │  [Deploy]   │   │  [Deploy]   │   │  [Deploy]   │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                 │
│  Region: [Mumbai ▼]                                            │
│                                                                 │
│  Estimated monthly cost: ₹75,000                               │
│                                                                 │
│                              [🚀 Deploy Now]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Infrastructure as Code Generation

```typescript
// Generate Terraform for selected architecture
function generateTerraform(
  arch: ArchitectureRecommendation,
  cloud: "aws" | "azure" | "gcp",
  config: DeploymentConfig
): string {
  
  const templates = {
    aws: {
      database: awsDatabaseTemplate,
      kubernetes: awsEksTemplate,
      cache: awsElasticacheTemplate,
    },
    azure: {
      database: azureDatabaseTemplate,
      kubernetes: azureAksTemplate,
      cache: azureRedisTemplate,
    },
    gcp: {
      database: gcpDatabaseTemplate,
      kubernetes: gcpGkeTemplate,
      cache: gcpMemorystoreTemplate,
    }
  };
  
  return `
terraform {
  required_providers {
    ${cloud} = {
      source = "hashicorp/${cloud}"
    }
  }
}

provider "${cloud}" {
  region = "${config.region}"
}

${templates[cloud].database(arch.database)}

${templates[cloud].kubernetes(arch.api)}

${templates[cloud].cache(arch.cache)}

${arch.queue.type === "kafka" ? kafkaTemplate(arch.queue) : ""}

${arch.analytics.type === "clickhouse" ? clickhouseTemplate(arch.analytics) : ""}
`;
}
```

### 10.3 Deployment Pipeline

```
Customer clicks "Deploy"
        ↓
┌───────────────────────────────────────────┐
│ 1. VALIDATION                             │
│    • Check cloud credentials              │
│    • Verify quotas available              │
│    • Validate configuration               │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 2. INFRASTRUCTURE PROVISIONING            │
│    • Generate Terraform                   │
│    • Run terraform init                   │
│    • Run terraform apply                  │
│    • ~5-10 minutes                        │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 3. APPLICATION DEPLOYMENT                 │
│    • Build Docker images                  │
│    • Push to container registry           │
│    • Deploy Kubernetes manifests          │
│    • Run database migrations              │
│    • ~3-5 minutes                         │
└───────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────┐
│ 4. POST-DEPLOYMENT                        │
│    • Configure DNS                        │
│    • Issue SSL certificate                │
│    • Set up monitoring                    │
│    • Run health checks                    │
│    • ~2 minutes                           │
└───────────────────────────────────────────┘
        ↓
Application LIVE! 🎉
URL: https://customer-app.kinto.cloud
```

### 10.4 Monitoring & Management

After deployment, provide:
- Real-time metrics dashboard
- Auto-scaling triggers
- Alert configuration
- Cost tracking
- One-click updates

### 10.5 Phase 8 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 39-40 | Terraform Templates | AWS, Azure, GCP templates for all components |
| 41-42 | Deployment Orchestrator | Pipeline execution, status tracking |
| 43-44 | Monitoring Integration | Metrics, alerts, cost tracking |

### 10.6 Phase 8 Deliverables
- [ ] Terraform templates for 3 clouds
- [ ] Kubernetes Helm charts
- [ ] Docker image builder
- [ ] Deployment orchestration engine
- [ ] Real-time deployment status UI
- [ ] Post-deployment health checks
- [ ] Monitoring dashboard integration
- [ ] Cost tracking and alerts

---

## 11. Phase 9: On-Prem Packaging System

**Duration:** 6 Weeks  
**Complexity:** Medium-High  
**Purpose:** Generate deployment packages for customer data centers.

### 11.1 Why On-Prem?

Many enterprise customers require on-premises deployment:
- **Data Sovereignty:** Government mandates data stays in-country
- **Security Policies:** No data in public cloud
- **Compliance:** Banking/Finance regulations
- **Latency:** Real-time systems need local processing
- **Cost:** Large scale may be cheaper on-prem

### 11.2 Deployment Formats

```
┌─────────────────────────────────────────────────────────────────┐
│  On-Prem Deployment Options                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Option A: DOCKER COMPOSE (Small/Medium)                    ││
│  │  • Single command deployment                                ││
│  │  • Best for: < 10 million records/day                       ││
│  │  • Download: docker-compose.yml + .env                      ││
│  │  • Command: docker-compose up -d                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Option B: KUBERNETES HELM (Large Scale)                    ││
│  │  • Enterprise-grade orchestration                           ││
│  │  • Auto-scaling, self-healing                               ││
│  │  • Download: helm-charts.tar.gz                             ││
│  │  • Command: helm install app ./charts                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Option C: VM IMAGES (No Container Experience)              ││
│  │  • Pre-configured virtual machines                          ││
│  │  • Works with VMware, Hyper-V, VirtualBox                   ││
│  │  • Download: application.ova (15 GB)                        ││
│  │  • Just import and start                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Option D: ANSIBLE PLAYBOOKS (Bare Metal)                   ││
│  │  • Direct installation on physical servers                  ││
│  │  • Full automation                                          ││
│  │  • Download: ansible-playbook.tar.gz                        ││
│  │  • Command: ansible-playbook -i inventory site.yml          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Option E: AIR-GAPPED (No Internet)                         ││
│  │  • Complete offline package                                 ││
│  │  • All dependencies included                                ││
│  │  • USB/DVD delivery option                                  ││
│  │  • Download: offline-bundle.tar.gz (25 GB)                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 Package Generator

```typescript
interface OnPremPackage {
  type: "docker-compose" | "kubernetes" | "vm" | "ansible" | "airgapped";
  architecture: ArchitectureRecommendation;
  
  files: Array<{
    path: string;
    content: string;
  }>;
  
  downloadSize: string;
  
  requirements: {
    hardware: HardwareRequirements;
    os: string[];
    prerequisites: string[];
  };
  
  documentation: {
    quickStart: string;
    fullGuide: string;
    troubleshooting: string;
  };
}

async function generateOnPremPackage(
  arch: ArchitectureRecommendation,
  format: OnPremPackage["type"]
): Promise<OnPremPackage> {
  
  switch (format) {
    case "docker-compose":
      return generateDockerCompose(arch);
    
    case "kubernetes":
      return generateKubernetesHelm(arch);
    
    case "vm":
      return generateVMImage(arch);
    
    case "ansible":
      return generateAnsiblePlaybook(arch);
    
    case "airgapped":
      return generateAirgappedBundle(arch);
  }
}
```

### 11.4 Docker Compose Generator

```typescript
function generateDockerCompose(arch: ArchitectureRecommendation): string {
  return `
version: '3.8'

services:
  api:
    image: kinto/api:latest
    ports:
      - "80:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      replicas: ${arch.api.replicas}

  db:
    image: ${arch.database.type === 'timescaledb' ? 'timescale/timescaledb:latest-pg15' : 'postgres:15'}
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

${arch.queue.type === 'kafka' ? `
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
` : ''}

${arch.analytics.type === 'clickhouse' ? `
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    volumes:
      - clickhouse_data:/var/lib/clickhouse
` : ''}

volumes:
  db_data:
  redis_data:
${arch.analytics.type === 'clickhouse' ? '  clickhouse_data:' : ''}
`;
}
```

### 11.5 Hardware Requirements Document

Auto-generated PDF with:
- Minimum hardware specifications
- Recommended hardware specifications
- Network requirements
- Storage requirements
- Backup strategy
- Disaster recovery setup

### 11.6 Phase 9 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 45-46 | Docker Compose Generator | Compose files, environment configs |
| 47-48 | Kubernetes Helm Generator | Charts, values files, manifests |
| 49-50 | VM & Ansible Generators | OVA builder, Ansible playbooks |

### 11.7 Phase 9 Deliverables
- [ ] Docker Compose package generator
- [ ] Kubernetes Helm chart generator
- [ ] VM image builder (OVA format)
- [ ] Ansible playbook generator
- [ ] Air-gapped bundle creator
- [ ] Hardware requirements PDF generator
- [ ] Installation documentation generator
- [ ] Package download portal

---

## 12. Phase 10: Hybrid Deployment Support

**Duration:** 4 Weeks  
**Complexity:** Medium  
**Purpose:** Combine on-prem data storage with cloud management.

### 12.1 Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOMER'S DATA CENTER (On-Prem)                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🔒 ALL DATA STAYS HERE                                     ││
│  │                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          ││
│  │  │ TimescaleDB │  │   Kafka     │  │    Redis    │          ││
│  │  │ (All data)  │  │  (Streams)  │  │   (Cache)   │          ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘          ││
│  │                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐                           ││
│  │  │ API Servers │  │ Analytics   │                           ││
│  │  │ (Local)     │  │ Engine      │                           ││
│  │  └─────────────┘  └─────────────┘                           ││
│  │                                                              ││
│  │                    ↑ Secure VPN ↓                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↕
                       Encrypted Tunnel
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│  YOUR CLOUD (Management Only)                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📊 NO RAW DATA - Only metadata & metrics                   ││
│  │                                                              ││
│  │  • License management                                        ││
│  │  • Software updates                                          ││
│  │  • Monitoring dashboards (aggregated metrics only)           ││
│  │  • Remote support access                                     ││
│  │  • Usage analytics (counts, not data)                        ││
│  │  • Alerting and notifications                                ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 What Stays On-Prem vs Cloud

| Component | On-Prem | Cloud | Why |
|-----------|---------|-------|-----|
| **Customer Data** | ✅ | ❌ | Data sovereignty |
| **Meter Readings** | ✅ | ❌ | Sensitive data |
| **Bills/Invoices** | ✅ | ❌ | Financial data |
| **Application Code** | ✅ | ❌ | Runs locally |
| **License Keys** | ❌ | ✅ | Validation |
| **Monitoring Metrics** | ❌ | ✅ | Centralized view |
| **Software Updates** | ❌ | ✅ | Easy rollout |
| **Support Access** | ❌ | ✅ | Remote help |

### 12.3 Secure Communication

```typescript
interface HybridConnection {
  // On-prem agent configuration
  agent: {
    id: string;
    organizationId: string;
    publicKey: string;           // For encrypted communication
    allowedOperations: string[]; // ["metrics", "updates", "support"]
  };
  
  // What data can flow to cloud
  cloudSync: {
    metrics: boolean;            // CPU, memory, disk usage
    alertsEnabled: boolean;      // Send alerts to cloud
    usageStats: boolean;         // Record counts (not data)
    healthChecks: boolean;       // Service status
  };
  
  // Update settings
  updates: {
    autoUpdate: boolean;
    maintenanceWindow: string;   // "Sunday 2:00 AM"
    requireApproval: boolean;
  };
}
```

### 12.4 Remote Support Access

Secure remote access for support when customer requests:

```
Customer requests support
        ↓
Support agent requests access
        ↓
Customer approves in dashboard
        ↓
Temporary secure tunnel opened
        ↓
Support agent can view (not data, just logs/metrics)
        ↓
Session expires after 2 hours
        ↓
Full audit log recorded
```

### 12.5 Phase 10 Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 51-52 | Agent Development | On-prem agent, secure communication |
| 53-54 | Cloud Management | License validation, update distribution, monitoring |

### 12.6 Phase 10 Deliverables
- [ ] On-prem management agent
- [ ] Secure VPN tunnel setup
- [ ] Cloud management dashboard
- [ ] License validation system
- [ ] Remote update distribution
- [ ] Aggregated metrics collection
- [ ] Remote support access system
- [ ] Audit logging

---

## 13. WhatsApp Integration for Multi-Tenant

### 7.1 Routing Flow

```
WhatsApp Message Received
        ↓
Webhook: /api/whatsapp/webhook
        ↓
Extract phone number from message
        ↓
Look up user in public.users by phone
        ↓
Get user's organizationId
        ↓
SET search_path TO org_{slug}, public
        ↓
Find pending checklist assignment
        ↓
Process response in tenant context
        ↓
Send reply via WhatsApp
```

### 7.2 Key Implementation

```typescript
app.post("/api/whatsapp/webhook", async (req, res) => {
  const phoneNumber = extractPhoneNumber(req.body);
  
  // Find user across all organizations
  const user = await db.select()
    .from(users)
    .where(eq(users.mobileNumber, phoneNumber))
    .limit(1);
  
  if (!user) {
    await sendWhatsAppMessage(phoneNumber, 
      "Your number is not registered. Contact your administrator.");
    return res.sendStatus(200);
  }
  
  // Get organization and switch context
  const org = await getOrganization(user.organizationId);
  await setSearchPath(`org_${org.slug}`);
  
  // Now process in tenant context
  const assignment = await findPendingAssignment(user.id);
  await processChecklistResponse(assignment, req.body);
  
  res.sendStatus(200);
});
```

### 7.3 Phone Number Uniqueness

- Phone numbers are unique across the entire platform
- One phone = One user = One organization
- Prevents routing ambiguity
- Clean user management

---

## 8. Migration Strategy

### 8.1 Pre-Migration Checklist

- [ ] Full database backup completed
- [ ] Identify all current users and data volume
- [ ] Test migration scripts on staging
- [ ] Schedule maintenance window (30 min)
- [ ] Prepare rollback plan

### 8.2 Migration Steps

**Step 1: Add New Tables (No Downtime)**
```sql
-- Create organizations table
CREATE TABLE organizations (...);

-- Create plans table  
CREATE TABLE plans (...);

-- Add nullable column to users
ALTER TABLE users ADD COLUMN organization_id VARCHAR;
```

**Step 2: Create First Tenant (5 min downtime)**
```sql
-- Insert organization record
INSERT INTO organizations (id, name, slug, status)
VALUES ('org_kinto', 'KINTO Industries', 'kinto', 'active');

-- Create tenant schema
CREATE SCHEMA org_kinto;

-- Move all existing tables to tenant schema
ALTER TABLE machines SET SCHEMA org_kinto;
ALTER TABLE products SET SCHEMA org_kinto;
-- ... repeat for all tenant tables

-- Update all users to belong to KINTO
UPDATE users SET organization_id = 'org_kinto';
```

**Step 3: Enable Multi-Tenant Mode**
```typescript
// config.ts
export const MULTI_TENANT_ENABLED = true;
```

### 8.3 Rollback Plan

If issues occur:
```sql
-- Move tables back to public schema
ALTER TABLE org_kinto.machines SET SCHEMA public;
-- ... repeat for all tables

-- Drop the tenant schema
DROP SCHEMA org_kinto;

-- Disable multi-tenant mode
-- MULTI_TENANT_ENABLED = false;
```

---

## 9. Timeline & Milestones

### Week 1-2: Phase 1 - Core Foundation
| Day | Task |
|-----|------|
| 1 | Create organizations and plans tables |
| 2 | Build schema manager utility |
| 3 | Implement tenant middleware |
| 4-5 | Build onboarding workflow |
| 6-7 | Create admin UI for organizations |
| 8 | Testing and bug fixes |
| 9-10 | Documentation and review |

### Week 3: Phase 2 - Licensing
| Day | Task |
|-----|------|
| 1 | Create license tables |
| 2 | Implement enforcement middleware |
| 3 | Build plan management UI |
| 4 | Add usage tracking |
| 5 | Testing and review |

### Week 4: Phase 3 - Module Configuration
| Day | Task |
|-----|------|
| 1 | Define module registry |
| 2 | Build module toggle UI |
| 3 | Implement navigation filtering |
| 4 | Add API guards |
| 5 | Testing and review |

### Week 5-6: Phase 4 - Screen Templating
| Day | Task |
|-----|------|
| 1-2 | Create template tables and API |
| 3-4 | Build template builder UI |
| 5-6 | Update forms to use templates |
| 7-8 | Update tables to use templates |
| 9-10 | Testing, polish, and review |

### Week 7: Go Live (Multi-Tenant Core)
| Day | Task |
|-----|------|
| 1 | Final testing on staging |
| 2 | Backup production database |
| 3 | Run migration (scheduled downtime) |
| 4 | Monitor and fix issues |
| 5 | Confirm stable operation |

---

### Week 8-19: Phase 5 - Low-Code Platform Engine *(Customer Self-Service)*

> **This phase enables customers to create their own screens and business logic without developer involvement.**

| Week | Focus Area | Key Deliverables |
|------|------------|------------------|
| 8-9 | Custom Data Entities | Entity definition system, dynamic field types, CRUD API, basic entity builder UI |
| 10-11 | Custom Screen Builder | List/Form screen types, visual builder UI, drag-drop components, live preview |
| 12-13 | Business Rules Engine | Condition evaluator, action executor, rule builder UI, if-then-else logic |
| 14-15 | Workflow Automation | Multi-step workflows, approval steps, delays, workflow designer UI |
| 16-17 | Integration & Actions | WhatsApp/Email actions, webhook integration, notification templates |
| 18-19 | Polish & Testing | Navigation integration, role-based access, testing, documentation |

### Total Timeline Summary

| Phase | Duration | Weeks | Effort |
|-------|----------|-------|--------|
| Phase 1: Core Multi-Tenancy | 2 weeks | 1-2 | Foundation |
| Phase 2: Licensing & Quotas | 1 week | 3 | Medium |
| Phase 3: Module Configuration | 1 week | 4 | Medium |
| Phase 4: Screen Templating | 2 weeks | 5-6 | High |
| Phase 5: Low-Code Platform | 12 weeks | 8-19 | Very High |
| **Phase 6: AI Application Generator** | **10 weeks** | **21-30** | **Very High** |
| **Phase 7: Infrastructure Auto-Selector** | **8 weeks** | **31-38** | **High** |
| **Phase 8: Cloud Auto-Deployment** | **6 weeks** | **39-44** | **High** |
| **Phase 9: On-Prem Packaging** | **6 weeks** | **45-50** | **Medium-High** |
| **Phase 10: Hybrid Deployment** | **4 weeks** | **51-54** | **Medium** |
| **TOTAL** | **~53 weeks** | - | - |

### Revenue Model by Deployment Type

| Deployment | Revenue Model | Typical Pricing |
|------------|---------------|-----------------|
| **Cloud SaaS** | Monthly subscription | ₹2,999 - ₹19,999/mo |
| **On-Prem License** | One-time + AMC | ₹10-50 Lakhs + 18% AMC |
| **Per-Device** | Monthly per meter/device | ₹5-10/device/month |
| **Hybrid** | License + Cloud fee | Custom pricing |

### Phased Rollout Strategy

**Option A: MVP Launch (Week 7)**
- Phases 1-4 only (Multi-tenant core)
- Get customers on platform quickly
- Revenue starts early

**Option B: Low-Code Launch (Week 19)**
- Phases 1-5 (Include Low-Code)
- Customers can self-serve
- Premium pricing possible

**Option C: AI Platform Launch (Week 30)**
- Phases 1-6 (Include AI Generator)
- Revolutionary "describe and build" feature
- Market differentiator

**Option D: Complete Platform (Week 54)**
- All 10 phases
- Full cloud + on-prem capability
- Enterprise-ready platform

---

## 10. Technical Specifications

### 10.1 Environment Variables

```bash
# Multi-tenant configuration
MULTI_TENANT_ENABLED=false          # Feature flag
DEFAULT_TENANT_SLUG=kinto           # Default for existing users
SCHEMA_PREFIX=org_                   # Prefix for tenant schemas

# Licensing
LICENSE_GRACE_PERIOD_DAYS=7         # Grace period after expiry
LICENSE_WARNING_DAYS=14              # Days before expiry to warn
```

### 10.2 API Endpoints (New)

**Multi-Tenant Core:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/organizations | GET | List all organizations (super admin) |
| /api/organizations | POST | Create new organization |
| /api/organizations/:id | GET | Get organization details |
| /api/organizations/:id | PATCH | Update organization |
| /api/organizations/:id/modules | GET | Get enabled modules |
| /api/organizations/:id/modules | PATCH | Update modules |
| /api/plans | GET | List available plans |
| /api/screen-templates | GET | Get templates for current org |
| /api/screen-templates/:key | GET | Get specific template |
| /api/screen-templates/:key | PUT | Update template |

**Low-Code Platform (Phase 5):**
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/custom-entities | GET | List all custom entities |
| /api/custom-entities | POST | Create new custom entity |
| /api/custom-entities/:slug | GET | Get entity definition |
| /api/custom-entities/:slug | PATCH | Update entity |
| /api/custom-entities/:slug/records | GET | List entity records |
| /api/custom-entities/:slug/records | POST | Create record |
| /api/custom-entities/:slug/records/:id | GET/PATCH/DELETE | Record CRUD |
| /api/custom-screens | GET | List custom screens |
| /api/custom-screens | POST | Create custom screen |
| /api/custom-screens/:slug | GET/PATCH/DELETE | Screen CRUD |
| /api/business-rules | GET | List business rules |
| /api/business-rules | POST | Create rule |
| /api/business-rules/:id | GET/PATCH/DELETE | Rule CRUD |
| /api/business-rules/:id/test | POST | Test rule execution |
| /api/workflows | GET | List workflows |
| /api/workflows | POST | Create workflow |
| /api/workflows/:id | GET/PATCH/DELETE | Workflow CRUD |
| /api/workflows/:id/execute | POST | Manually trigger workflow |

### 10.3 Security Considerations

- **Schema Isolation:** Complete data separation between tenants
- **Search Path Guard:** Middleware ensures correct schema on every request
- **Phone Uniqueness:** Prevents cross-tenant WhatsApp routing issues
- **License Enforcement:** API-level checks prevent unauthorized access
- **Audit Logging:** Track tenant actions for compliance
- **Backup Isolation:** Per-tenant backup capabilities

### 10.4 Performance Considerations

- **Connection Pooling:** Reuse connections, set search_path per request
- **Schema Caching:** Cache organization metadata
- **Module Caching:** Cache enabled modules per organization
- **Template Caching:** Cache screen templates with invalidation

---

## Appendix A: Module List

| Module Key | Screens Included |
|------------|------------------|
| dashboard | Main Dashboard |
| invoicing | Invoices, Create Invoice, Invoice Detail |
| inventory | Inventory, Raw Materials, Products |
| production | Production Entries, BOM, Raw Material Issuance |
| quality | Checklists, Assignments, Submissions |
| maintenance | Maintenance Plans, PM Executions |
| gatepasses | Gatepasses, Dispatch Tracking |
| reports | All Reports, GST Reports |
| documents | Document Management |
| mis | MIS Dashboard, Analytics Screens |
| expenses | Expenses, Cash Register |
| vendors | Vendor Management, Debit Notes |

---

## Appendix B: Screen Template Keys

| Screen Key | Description |
|------------|-------------|
| invoice_form | Invoice creation form |
| invoice_list | Invoice listing table |
| gatepass_form | Gatepass creation form |
| product_form | Product master form |
| vendor_form | Vendor master form |
| checklist_form | Checklist template form |
| production_form | Production entry form |
| raw_material_form | Raw material master form |

---

## 11. Infrastructure Specifications

This section provides detailed infrastructure requirements for deploying the KINTO platform at different scales. These specifications are critical for cloud auto-deployment (Phase 8) and on-prem packaging (Phase 9).

### 11.1 Scale Tier Definitions

| Tier | Records/Day | Devices/Meters | Typical Use Case |
|------|-------------|----------------|------------------|
| **Small** | < 1 Million | Up to 50,000 | Small utilities, SMB manufacturing |
| **Medium** | 1M - 100M | 50K - 1M | Regional utilities, mid-size enterprises |
| **Large** | 100M - 1B | 1M - 5M | State-level utilities, large enterprises |
| **Massive** | > 1 Billion | 5M - 50M+ | National utilities, multi-state operations |

**Example Calculation (5M AMI Meters):**
- 5,000,000 meters × 96 readings/day (15-min interval) = **480 Million records/day**
- Peak load: ~5,500 writes/second
- Storage growth: ~50 GB/day raw data

---

### 11.2 Compute Requirements

#### Small Tier (< 1M records/day)

| Component | Instance Type | CPU | RAM | Quantity | Purpose |
|-----------|---------------|-----|-----|----------|---------|
| **Application Server** | t3.large / D2s_v3 | 2 vCPU | 8 GB | 2 | API + Web servers |
| **Database Server** | r5.large / E4s_v3 | 2 vCPU | 16 GB | 1 | PostgreSQL primary |
| **Cache Server** | t3.medium | 2 vCPU | 4 GB | 1 | Redis cache |
| **Load Balancer** | ALB / App Gateway | - | - | 1 | Traffic distribution |
| **Total** | - | **8 vCPU** | **36 GB** | 5 | - |

**Monthly Estimate:** $400-600 (AWS/Azure)

#### Medium Tier (1M - 100M records/day)

| Component | Instance Type | CPU | RAM | Quantity | Purpose |
|-----------|---------------|-----|-----|----------|---------|
| **Application Server** | c5.xlarge / F4s_v2 | 4 vCPU | 8 GB | 3-4 | API + Web servers |
| **Database Primary** | r5.2xlarge / E8s_v3 | 8 vCPU | 64 GB | 1 | TimescaleDB primary |
| **Database Replica** | r5.xlarge / E4s_v3 | 4 vCPU | 32 GB | 2 | Read replicas |
| **Cache Cluster** | r5.large | 2 vCPU | 16 GB | 2 | Redis Sentinel |
| **Queue Server** | t3.xlarge | 4 vCPU | 16 GB | 1 | Redis Streams |
| **Load Balancer** | ALB / App Gateway | - | - | 1 | Traffic distribution |
| **Total** | - | **38 vCPU** | **200 GB** | 10-11 | - |

**Monthly Estimate:** $2,500-4,000 (AWS/Azure)

#### Large Tier (100M - 1B records/day)

| Component | Instance Type | CPU | RAM | Quantity | Purpose |
|-----------|---------------|-----|-----|----------|---------|
| **Application Server** | c5.2xlarge / F8s_v2 | 8 vCPU | 16 GB | 6-8 | API servers (auto-scaled) |
| **Web Server** | c5.xlarge | 4 vCPU | 8 GB | 4 | Frontend + static assets |
| **TimescaleDB Primary** | r5.4xlarge / E16s_v3 | 16 vCPU | 128 GB | 1 | Time-series data |
| **TimescaleDB Replicas** | r5.2xlarge | 8 vCPU | 64 GB | 3 | Read scaling |
| **ClickHouse Analytics** | r5.2xlarge | 8 vCPU | 64 GB | 3 | Analytics queries |
| **Kafka Brokers** | m5.2xlarge | 8 vCPU | 32 GB | 3 | Message streaming |
| **Redis Cluster** | r5.xlarge | 4 vCPU | 32 GB | 6 | Caching + sessions |
| **Zookeeper** | t3.large | 2 vCPU | 8 GB | 3 | Kafka coordination |
| **Load Balancer** | NLB + ALB | - | - | 2 | L4 + L7 load balancing |
| **Total** | - | **170 vCPU** | **832 GB** | 32-36 | - |

**Monthly Estimate:** $15,000-25,000 (AWS/Azure)

#### Massive Tier (> 1B records/day)

| Component | Instance Type | CPU | RAM | Quantity | Purpose |
|-----------|---------------|-----|-----|----------|---------|
| **Application Server** | c5.4xlarge | 16 vCPU | 32 GB | 12-20 | API servers (auto-scaled) |
| **Web Server** | c5.2xlarge | 8 vCPU | 16 GB | 8 | Frontend cluster |
| **Cassandra Cluster** | i3.2xlarge | 8 vCPU | 61 GB | 9-12 | Primary data store |
| **ClickHouse Cluster** | r5.4xlarge | 16 vCPU | 128 GB | 6-9 | Analytics engine |
| **Kafka Cluster** | m5.4xlarge | 16 vCPU | 64 GB | 6-9 | High-throughput streaming |
| **Redis Cluster** | r5.2xlarge | 8 vCPU | 64 GB | 9 | Distributed cache |
| **Zookeeper** | m5.large | 2 vCPU | 8 GB | 5 | Coordination |
| **Load Balancer** | NLB + ALB | - | - | 4 | Multi-AZ distribution |
| **Kubernetes Control** | m5.xlarge | 4 vCPU | 16 GB | 3 | K8s management |
| **Total** | - | **500+ vCPU** | **2+ TB** | 60-80+ | - |

**Monthly Estimate:** $60,000-120,000 (AWS/Azure)

---

### 11.3 Storage Requirements

#### Storage by Tier

| Tier | Database Storage | Backup Storage | Log Storage | Total (Year 1) |
|------|-----------------|----------------|-------------|----------------|
| **Small** | 500 GB SSD | 1 TB Standard | 100 GB | ~2 TB |
| **Medium** | 5 TB NVMe | 15 TB Standard | 500 GB | ~25 TB |
| **Large** | 50 TB NVMe | 150 TB Cold | 2 TB | ~250 TB |
| **Massive** | 500 TB NVMe | 1.5 PB Cold | 10 TB | ~2.5 PB |

#### Storage Specifications

| Requirement | Small | Medium | Large | Massive |
|-------------|-------|--------|-------|---------|
| **IOPS** | 3,000 | 16,000 | 64,000 | 256,000+ |
| **Throughput** | 125 MB/s | 500 MB/s | 2 GB/s | 10+ GB/s |
| **Disk Type** | gp3/Premium SSD | io2/Ultra SSD | io2/NVMe | NVMe local + distributed |
| **Replication** | Async | Sync (regional) | Sync + Cross-region | Multi-region active-active |
| **Backup Frequency** | Daily | Every 6 hours | Every hour | Continuous |
| **Retention** | 30 days | 90 days | 1 year | 3+ years |
| **Encryption** | AES-256 at rest | AES-256 at rest | AES-256 + in-transit | AES-256 + HSM key management |

#### Data Retention Tiers

```
Hot Data (0-30 days):     NVMe SSD - Fast queries
Warm Data (31-180 days):  Standard SSD - Occasional access
Cold Data (181+ days):    Object Storage (S3/Blob) - Archival
```

---

### 11.4 Network Requirements

#### Bandwidth by Tier

| Tier | Ingress | Egress | Internal | VPN/Direct Connect |
|------|---------|--------|----------|-------------------|
| **Small** | 100 Mbps | 100 Mbps | 1 Gbps | Optional |
| **Medium** | 500 Mbps | 500 Mbps | 10 Gbps | Recommended |
| **Large** | 2 Gbps | 2 Gbps | 25 Gbps | Required |
| **Massive** | 10+ Gbps | 10+ Gbps | 100 Gbps | Required (redundant) |

#### Load Balancer Configuration

| Tier | Load Balancer Type | SSL Termination | Health Checks | Session Persistence |
|------|-------------------|-----------------|---------------|---------------------|
| **Small** | Application LB | At LB | HTTP /health | Cookie-based |
| **Medium** | Application LB | At LB | HTTP + TCP | Sticky sessions |
| **Large** | Network + App LB | At App LB | HTTP + gRPC | Source IP hash |
| **Massive** | Global + Regional LB | Edge + App | Multi-layer | Distributed session store |

#### CDN Requirements

| Tier | CDN | Edge Locations | Cache TTL | Features |
|------|-----|----------------|-----------|----------|
| **Small** | Optional | 5-10 | 1 hour | Static assets only |
| **Medium** | CloudFront/Akamai | 20-50 | 15 min | Static + API cache |
| **Large** | Enterprise CDN | 100+ | 5 min | Full edge computing |
| **Massive** | Multi-CDN | Global | 1 min | Edge compute + WAF |

---

### 11.5 Security Specifications

#### Firewall Rules (Ingress)

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| 0.0.0.0/0 | Load Balancer | 443 | HTTPS | Web traffic |
| 0.0.0.0/0 | Load Balancer | 80 | HTTP | Redirect to HTTPS |
| WhatsApp IPs | API Gateway | 443 | HTTPS | Webhook callbacks |
| Office IPs | Bastion | 22 | SSH | Admin access |
| Monitoring | All instances | Various | HTTPS | Metrics collection |

#### Firewall Rules (Egress)

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| App Servers | 0.0.0.0/0 | 443 | HTTPS | External API calls |
| App Servers | 0.0.0.0/0 | 587/465 | SMTP/SMTPS | Email delivery |
| App Servers | WhatsApp API | 443 | HTTPS | WhatsApp messages |
| DB Servers | Backup storage | 443 | HTTPS | Backup uploads |
| All | NTP servers | 123 | UDP | Time sync |

#### Internal Network Rules

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| App Servers | DB Primary | 5432 | TCP | PostgreSQL |
| App Servers | DB Replicas | 5432 | TCP | Read queries |
| App Servers | Redis | 6379 | TCP | Cache/Sessions |
| App Servers | Kafka | 9092 | TCP | Message streaming |
| Kafka | Zookeeper | 2181 | TCP | Coordination |
| DB Primary | DB Replicas | 5432 | TCP | Replication |

#### SSL/TLS Specifications

| Requirement | Specification |
|-------------|---------------|
| **Minimum TLS Version** | TLS 1.2 (TLS 1.3 preferred) |
| **Certificate Type** | EV SSL for production, Wildcard for subdomains |
| **Certificate Authority** | DigiCert, GlobalSign, or Let's Encrypt |
| **Key Size** | RSA 2048+ or ECDSA P-256+ |
| **Cipher Suites** | ECDHE-RSA-AES256-GCM-SHA384, ECDHE-ECDSA-AES256-GCM-SHA384 |
| **HSTS** | Enabled, max-age=31536000, includeSubDomains |
| **Certificate Rotation** | 90 days (automated with ACME) |
| **mTLS** | Required for service-to-service communication (Large/Massive) |

#### Web Application Firewall (WAF)

| Rule Category | Action | Description |
|---------------|--------|-------------|
| **SQL Injection** | Block | Detect SQLi patterns in parameters |
| **XSS** | Block | Cross-site scripting prevention |
| **CSRF** | Block | Token validation failure |
| **Rate Limiting** | Throttle | 1000 req/min per IP (configurable) |
| **Bot Detection** | Challenge | CAPTCHA for suspicious patterns |
| **Geo-blocking** | Allow/Block | Country-based access control |
| **IP Reputation** | Block | Known malicious IPs |
| **Request Size** | Block | > 10 MB payload |

#### DDoS Protection

| Tier | Protection Level | Features |
|------|-----------------|----------|
| **Small** | Basic (Cloud default) | Volumetric protection |
| **Medium** | Standard DDoS Shield | L3/L4 + L7 mitigation |
| **Large** | Advanced DDoS Shield | 24/7 SOC, SLA guarantee |
| **Massive** | Enterprise DDoS | Multi-layer, instant mitigation, dedicated support |

#### IAM/RBAC Configuration

**Service Accounts Required:**

| Account | Permissions | Purpose |
|---------|-------------|---------|
| `app-service` | Read DB, Write Cache, Publish Queue | Application runtime |
| `backup-service` | Read DB, Write Backup Storage | Automated backups |
| `deploy-service` | Read/Write ECR, Read Secrets | CI/CD deployments |
| `monitoring-service` | Read Metrics, Write Logs | Observability |
| `admin-service` | Full access (emergency) | Break-glass procedures |

**Role Hierarchy:**

```
Super Admin
    ├── Platform Admin
    │       ├── Organization Admin
    │       │       ├── Module Admin
    │       │       └── User Admin
    │       └── Billing Admin
    └── Support Engineer (read-only)
```

---

### 11.6 Monitoring & Observability

#### Metrics Collection

| Category | Metrics | Collection Interval | Retention |
|----------|---------|---------------------|-----------|
| **Infrastructure** | CPU, Memory, Disk, Network | 10 seconds | 15 days high-res, 1 year aggregated |
| **Application** | Request latency, Error rate, Throughput | 1 second | 30 days |
| **Database** | Query time, Connections, Replication lag | 10 seconds | 15 days |
| **Business** | Records processed, Active users, API usage | 1 minute | 2 years |

#### Log Aggregation

| Log Type | Source | Format | Retention |
|----------|--------|--------|-----------|
| **Application Logs** | All app servers | JSON structured | 30 days hot, 1 year archive |
| **Access Logs** | Load balancers | CLF/JSON | 90 days |
| **Audit Logs** | All services | JSON + signature | 7 years (compliance) |
| **Security Logs** | WAF, Firewall | CEF | 1 year |
| **Database Logs** | PostgreSQL | Native | 14 days |

#### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| **CPU Usage** | > 70% (5 min) | > 90% (2 min) | Scale out |
| **Memory Usage** | > 80% | > 95% | Investigate + scale |
| **Disk Usage** | > 70% | > 85% | Expand storage |
| **Error Rate** | > 1% | > 5% | Page on-call |
| **Response Time (P99)** | > 500ms | > 2s | Investigate |
| **DB Replication Lag** | > 5s | > 30s | Failover check |
| **Queue Depth** | > 10,000 | > 100,000 | Scale consumers |
| **Certificate Expiry** | < 30 days | < 7 days | Renew immediately |

#### Observability Stack by Tier

| Component | Small | Medium | Large | Massive |
|-----------|-------|--------|-------|---------|
| **Metrics** | CloudWatch/Azure Monitor | Prometheus + Grafana | Victoria Metrics | Thanos/Cortex |
| **Logs** | CloudWatch Logs | ELK Stack | Loki + Grafana | Splunk Enterprise |
| **Traces** | X-Ray/App Insights | Jaeger | Jaeger + Tempo | Datadog/New Relic |
| **APM** | Basic cloud APM | Elastic APM | Datadog | Custom + multiple |
| **Uptime** | Basic ping | Synthetic tests | Global synthetic | Multi-region probes |

---

### 11.7 High Availability & Disaster Recovery

#### Availability Targets

| Tier | Target SLA | Max Downtime/Year | RTO | RPO |
|------|------------|-------------------|-----|-----|
| **Small** | 99.5% | 43.8 hours | 4 hours | 24 hours |
| **Medium** | 99.9% | 8.76 hours | 1 hour | 1 hour |
| **Large** | 99.95% | 4.38 hours | 15 minutes | 15 minutes |
| **Massive** | 99.99% | 52.6 minutes | 5 minutes | Near-zero |

#### DR Configuration

| Component | Small | Medium | Large | Massive |
|-----------|-------|--------|-------|---------|
| **Regions** | Single AZ | Multi-AZ | Multi-AZ + DR region | Active-Active Multi-Region |
| **DB Failover** | Manual | Automatic (< 60s) | Automatic (< 30s) | Instant (read replicas) |
| **Backup Location** | Same region | Cross-region | Multi-region | Global distribution |
| **DR Testing** | Quarterly | Monthly | Weekly | Continuous chaos engineering |

---

### 11.8 On-Premises Hardware Specifications

For customers deploying on their own infrastructure:

#### Minimum Hardware Requirements

| Tier | Servers | CPU per Server | RAM per Server | Storage per Server |
|------|---------|----------------|----------------|-------------------|
| **Small** | 3 | 4 cores | 16 GB | 500 GB SSD |
| **Medium** | 6 | 8 cores | 64 GB | 2 TB NVMe |
| **Large** | 12 | 16 cores | 128 GB | 4 TB NVMe |
| **Massive** | 24+ | 32 cores | 256 GB | 8 TB NVMe |

#### Network Hardware

| Tier | Switch | Bandwidth | Redundancy |
|------|--------|-----------|------------|
| **Small** | 1 Gbps managed | 1 Gbps per server | Single |
| **Medium** | 10 Gbps managed | 10 Gbps per server | Dual |
| **Large** | 25 Gbps spine-leaf | 25 Gbps per server | Redundant fabric |
| **Massive** | 100 Gbps fabric | 100 Gbps aggregated | Full mesh |

#### Power & Cooling

| Tier | Power (kW) | UPS Backup | Cooling (BTU/hr) |
|------|------------|------------|------------------|
| **Small** | 3-5 kW | 30 min | 15,000 |
| **Medium** | 15-25 kW | 30 min | 75,000 |
| **Large** | 50-80 kW | 30 min | 250,000 |
| **Massive** | 200+ kW | 60 min | 750,000+ |

---

### 11.9 Cost Estimation Summary

#### Monthly Infrastructure Costs (Cloud)

| Tier | Compute | Storage | Network | Total/Month |
|------|---------|---------|---------|-------------|
| **Small** | $300 | $100 | $50 | **$450-600** |
| **Medium** | $2,000 | $500 | $300 | **$2,800-4,000** |
| **Large** | $12,000 | $3,000 | $2,000 | **$17,000-25,000** |
| **Massive** | $60,000 | $15,000 | $10,000 | **$85,000-120,000** |

#### One-Time On-Prem Costs

| Tier | Hardware | Setup | Total |
|------|----------|-------|-------|
| **Small** | ₹5-8 Lakhs | ₹1-2 Lakhs | **₹6-10 Lakhs** |
| **Medium** | ₹25-40 Lakhs | ₹5-8 Lakhs | **₹30-48 Lakhs** |
| **Large** | ₹1-2 Crores | ₹20-30 Lakhs | **₹1.2-2.3 Crores** |
| **Massive** | ₹5-10 Crores | ₹1-2 Crores | **₹6-12 Crores** |

---

**Document End**

*This document outlines the complete multi-tenant architecture implementation plan for KINTO Operations. Implementation should proceed phase by phase with thorough testing at each stage.*
