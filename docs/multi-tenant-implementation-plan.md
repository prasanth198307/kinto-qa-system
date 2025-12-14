# KINTO Operations - Multi-Tenant Architecture
## Detailed Implementation Plan

**Document Version:** 1.0  
**Date:** December 14, 2025  
**Prepared For:** KINTO Operations Team

---

## Executive Summary

This document outlines the complete implementation plan for transforming the KINTO Operations & QA Management System from a single-tenant application to a full-featured multi-tenant SaaS platform. The architecture uses PostgreSQL's schema-per-tenant approach, ensuring complete data isolation while maintaining a unified codebase.

**Key Benefits:**
- Complete data isolation between tenants
- Per-tenant backup and restore capabilities
- Configurable features and modules per organization
- Customizable screen layouts and fields
- Flexible licensing and user management
- Scalable architecture for growth
- **Low-Code Platform:** Customers can create their own screens and business logic without developer involvement (Phase 5)

---

## Table of Contents

1. Architecture Overview
2. Database Design
3. Phase 1: Core Multi-Tenancy Foundation
4. Phase 2: Licensing & Quotas
5. Phase 3: Feature/Module Configuration
6. Phase 4: Screen Templating System
7. **Phase 5: Low-Code Platform Engine** *(NEW - Customer Self-Service)*
8. WhatsApp Integration for Multi-Tenant
9. Migration Strategy
10. Timeline & Milestones
11. Technical Specifications

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

## 8. WhatsApp Integration for Multi-Tenant

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

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Core Multi-Tenancy | 2 weeks | Foundation |
| Phase 2: Licensing & Quotas | 1 week | Medium |
| Phase 3: Module Configuration | 1 week | Medium |
| Phase 4: Screen Templating | 2 weeks | High |
| **Phase 5: Low-Code Platform** | **12 weeks** | **Very High** |
| **Total** | **18-19 weeks** | - |

### Phased Rollout Strategy

**Option A: Full Build (18-19 weeks)**
- Complete all phases before go-live
- Best for: New product launch

**Option B: Incremental Rollout**
- Go live after Phase 4 (Week 7)
- Add Low-Code (Phase 5) as premium feature
- Best for: Faster time-to-market

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

**Document End**

*This document outlines the complete multi-tenant architecture implementation plan for KINTO Operations. Implementation should proceed phase by phase with thorough testing at each stage.*
