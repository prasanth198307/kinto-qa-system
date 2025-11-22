# KINTO Smart Ops - Database Scripts Index

Complete list of all database scripts for Mac deployment.

## 📁 Files in This Package

### 1. Schema Files

| File | Description | Lines | Purpose |
|------|-------------|-------|---------|
| `01_complete_schema.sql` | Complete database schema | 1080 | Creates all 27 tables with indexes and constraints |

### 2. Data Files

| File | Description | Purpose |
|------|-------------|---------|
| `02_seed_data.sql` | Reference data and default users | Loads roles, permissions, vendor types, UOMs, categories, and admin user |

### 3. Documentation

| File | Description |
|------|-------------|
| `README_MAC.md` | Complete Mac installation guide with troubleshooting |
| `INDEX.md` | This file - overview of all scripts |

### 4. Setup Scripts

| File | Description | Usage |
|------|-------------|-------|
| `setup_mac.sh` | Automated Mac setup script | `bash setup_mac.sh` |

## 🎯 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
cd updated_dbscripts
bash setup_mac.sh
```

### Option 2: Manual Setup
```bash
cd updated_dbscripts

# Set database URL
export DATABASE_URL="postgresql://localhost/kinto_ops"

# Run scripts in order
psql $DATABASE_URL -f 01_complete_schema.sql
psql $DATABASE_URL -f 02_seed_data.sql
```

## 📊 What Gets Installed

### Database Schema (27 Tables)

**Core Operations:**
1. `purchase_orders` + `purchase_order_items` - Purchase order management
2. `invoices` + `invoice_items` - Sales invoice management
3. `gatepasses` + `gatepass_items` - Material dispatch tracking
4. `dispatch_tracking` - 5-stage dispatch workflow
5. `payments` - Payment records with FIFO allocation

**Inventory Management:**
6. `raw_materials` - Raw material master data
7. `raw_material_types` - Material classification
8. `raw_material_entry` - Stock entry records
9. `raw_material_issuance` - Material issuance to production
10. `finished_goods` - Finished product inventory
11. `products` - Product master data
12. `product_bom` - Bill of materials

**Production:**
13. `production_entries` - Daily production records
14. `production_reconciliation` - End-of-day reconciliation
15. `machines` + `machine_types` - Machine management

**Quality & Checklists:**
16. `checklist_templates` - Checklist definitions
17. `checklist_assignments` - Checklist assignments
18. `checklist_submissions` - Completed checklists
19. `whatsapp_checklist_sessions` - WhatsApp integration

**Sales Returns:**
20. `sales_returns` + `sales_return_items` - Return management
21. `credit_notes` + `credit_note_items` - Credit note generation

**Master Data:**
22. `vendors` - Vendor master
23. `vendor_types` - Vendor classification (Kinto, HPPani, Purejal)
24. `vendor_vendor_types` - Many-to-many relationship
25. `product_categories` + `product_types` - Product classification
26. `uom` - Units of measurement
27. `banks` - Bank account details

**System:**
28. `users` - User accounts
29. `roles` - User roles
30. `role_permissions` - Screen-level permissions
31. `sessions` - Express session storage

### Reference Data

**4 User Roles:**
- Admin (full access)
- Manager (management access)
- Operator (limited access)
- Reviewer (quality check access)

**62 Role Permissions:**
Granular access control across 36 system screens

**8 Units of Measurement:**
- PCS (Pieces)
- KG (Kilograms)
- LTR (Liters)
- MTR (Meters)
- BOX, SET, ROLL, BAG

**5 Machine Types:**
- CNC Machine
- Injection Molding
- Assembly Line
- Quality Control
- Packaging Machine

**3 Vendor Types:**
- **KINTO** - Kinto brand products
- **HPPANI** - HPPani brand products
- **PUREJAL** - Purejal brand products

**4 Product Categories:**
- Bottles
- Caps
- Labels
- Packaging

**5 Product Types:**
- 500ML, 1LTR, 2LTR, 5LTR, 20LTR

**Default Admin User:**
- Username: `admin`
- Password: `Admin@123`
- ⚠️ Change after first login!

## 🔄 Script Features

### Idempotency
Both scripts are **IDEMPOTENT** - safe to run multiple times:
- Existing data is updated, not duplicated
- Admin password is preserved if user exists
- Uses `ON CONFLICT` for upsert operations

### Safety Features
- No data deletion
- Preserves existing records
- Updates only when needed
- Comprehensive error handling

## 📖 Documentation

See `README_MAC.md` for:
- Detailed installation steps
- Troubleshooting guide
- Security notes
- Verification commands
- Next steps

## 🆕 Latest Updates (November 2025)

- ✨ Vendor Type System (3 types)
- ✨ Product Categories & Types
- ✨ Raw Material Types
- ✨ Complete Bill of Materials (BOM)
- ✨ Production Reconciliation
- ✨ Sales Returns & Credit Notes
- ✨ Dispatch Tracking Workflow
- ✨ WhatsApp Checklist Integration
- ✨ Payment Write-Off System
- ✨ Comprehensive Search & Filters

## 📞 Support

For issues or questions:
1. Check `README_MAC.md` for troubleshooting
2. Verify PostgreSQL is running: `brew services list`
3. Check DATABASE_URL: `echo $DATABASE_URL`
4. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

---

**Package Version:** November 2025  
**Schema Version:** 1.0.0  
**Total Files:** 4 (2 SQL, 2 documentation)  
**Total Tables:** 27  
**Total Reference Data:** 90+ records
