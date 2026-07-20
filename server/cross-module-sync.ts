/**
 * cross-module-sync.ts
 *
 * Single place for all shared-master → vertical auto-sync logic.
 * Called AFTER the primary INSERT succeeds (fire-and-forget, never blocks the response).
 *
 * Covered syncs:
 *  A. HR Employee created → vertical staff tables (restaurant_staff_profiles, drivers, etc.)
 *  B. CRM Contact created → vertical customer tables (restaurant_customers, hotel_guests, patients, etc.)
 *  C. Vertical customer created → crm_contacts (reverse sync)
 *  D. Vendor/Supplier created → crm_contacts (for 360° view)
 *  E. Masters Branch created → vertical outlet/location tables
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Detect vertical from tenant plan code */
async function getTenantVertical(tenantId: number): Promise<string | null> {
  try {
    const r = await db.execute(sql`SELECT plan FROM tenants WHERE id = ${tenantId} LIMIT 1`);
    const plan: string = (r.rows[0] as any)?.plan ?? '';
    if (plan.startsWith('restaurant'))  return 'restaurant';
    if (plan.startsWith('hotel'))       return 'hotel';
    if (plan.startsWith('healthcare'))  return 'healthcare';
    if (plan.startsWith('pharmacy'))    return 'pharmacy';
    if (plan.startsWith('ngo'))         return 'ngo';
    if (plan.startsWith('nidhi'))       return 'nidhi';
    if (plan.startsWith('crm'))         return 'crm';
    if (plan.startsWith('logistics'))   return 'logistics';
    if (plan.startsWith('real_estate') || plan.startsWith('realestate')) return 'realestate';
    if (plan.startsWith('agriculture')) return 'agriculture';
    if (plan.startsWith('education'))   return 'education';
    if (plan.startsWith('gold'))        return 'gold';
    if (plan.startsWith('retail') || plan.startsWith('pos')) return 'retail';
    if (plan.startsWith('ecommerce'))   return 'ecommerce';
    // manufacturing / finance / hr — use generic modules, no specific vertical customer table
    return null;
  } catch { return null; }
}

// ─── A. HR Employee → Vertical Staff ─────────────────────────────────────────

export async function syncEmployeeToVertical(tenantId: number, employee: {
  id: number;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  department?: string | null;
  designation?: string | null;
  status?: string;
}) {
  const vertical = await getTenantVertical(tenantId);
  if (!vertical) return;

  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');

  try {
    switch (vertical) {
      case 'restaurant':
        // Auto-link as restaurant staff with default role 'server'
        await db.execute(sql`
          INSERT INTO restaurant_staff_profiles
            (tenant_id, employee_id, role, is_active)
          VALUES
            (${tenantId}, ${employee.id}, 'server', 1)
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'hotel':
        // Auto-link as housekeeping staff
        await db.execute(sql`
          INSERT INTO hotel_housekeeping_staff
            (tenant_id, employee_id, name, phone, role, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null}, 'housekeeping', 'active')
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'healthcare':
        // Auto-link as clinical staff (doctor/nurse/staff based on designation)
        await db.execute(sql`
          INSERT INTO clinical_staff
            (tenant_id, employee_id, name, phone, role, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null},
             ${employee.designation ?? 'staff'}, ${employee.status ?? 'active'})
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'pharmacy':
        // Auto-link as pharmacy staff
        await db.execute(sql`
          INSERT INTO pharmacy_staff
            (tenant_id, employee_id, name, phone, role, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null},
             ${employee.designation ?? 'pharmacist'}, 'active')
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'logistics':
        // Auto-link as driver if designation contains 'driver', else as helper
        const driverRole = (employee.designation ?? '').toLowerCase().includes('driver') ? 'driver' : 'helper';
        await db.execute(sql`
          INSERT INTO drivers
            (tenant_id, driver_code, name, phone, status, date_of_joining, salary)
          VALUES
            (${tenantId}, ${'EMP-' + employee.id}, ${fullName}, ${employee.phone ?? null}, 'active', NOW(), 0)
          ON CONFLICT DO NOTHING
        `);
        break;

      case 'education':
        // Auto-link as teacher/staff
        await db.execute(sql`
          INSERT INTO teachers
            (tenant_id, employee_id, name, phone, email, subject, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null},
             ${employee.email ?? null}, ${employee.department ?? 'General'}, 'active')
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'retail':
        // Auto-link as POS cashier/salesperson
        await db.execute(sql`
          INSERT INTO pos_staff
            (tenant_id, employee_id, name, phone, role, is_active)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null}, 'cashier', 1)
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'ngo':
        // Auto-link as program staff/volunteer
        await db.execute(sql`
          INSERT INTO ngo_staff
            (tenant_id, employee_id, name, phone, role, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null}, 'staff', 'active')
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'realestate':
        // Auto-link as sales agent
        await db.execute(sql`
          INSERT INTO realestate_agents
            (tenant_id, employee_id, name, phone, email, status)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null},
             ${employee.email ?? null}, 'active')
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;

      case 'ecommerce':
        // Auto-link as warehouse picker/packer
        await db.execute(sql`
          INSERT INTO warehouse_staff
            (tenant_id, employee_id, name, phone, role, is_active)
          VALUES
            (${tenantId}, ${employee.id}, ${fullName}, ${employee.phone ?? null}, 'picker', 1)
          ON CONFLICT (tenant_id, employee_id) DO NOTHING
        `);
        break;
    }
  } catch (e: any) {
    console.warn(`[cross-module-sync] syncEmployeeToVertical(${vertical}) skipped:`, e.message);
  }
}

// ─── B. CRM Contact → Vertical Customer ──────────────────────────────────────

export async function syncContactToVertical(tenantId: number, contact: {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_type?: string | null;
}) {
  const vertical = await getTenantVertical(tenantId);
  if (!vertical) return;

  try {
    switch (vertical) {
      case 'restaurant':
        await db.execute(sql`
          INSERT INTO restaurant_customers
            (tenant_id, name, phone, email, address, crm_contact_id, loyalty_points)
          VALUES
            (${tenantId}, ${contact.name}, ${contact.phone ?? null}, ${contact.email ?? null},
             ${contact.address ?? null}, ${contact.id}, 0)
          ON CONFLICT (tenant_id, phone) WHERE phone IS NOT NULL
          DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, crm_contact_id = EXCLUDED.crm_contact_id
        `);
        break;

      case 'hotel':
        await db.execute(sql`
          INSERT INTO hotel_guests
            (tenant_id, guest_code, name, phone, email, address, crm_contact_id)
          VALUES
            (${tenantId}, ${'G-' + contact.id}, ${contact.name}, ${contact.phone ?? null},
             ${contact.email ?? null}, ${contact.address ?? null}, ${contact.id})
          ON CONFLICT DO NOTHING
        `);
        break;

      case 'healthcare':
        await db.execute(sql`
          INSERT INTO patients
            (tenant_id, patient_code, name, phone, email, address, crm_contact_id)
          VALUES
            (${tenantId}, ${'P-' + contact.id}, ${contact.name}, ${contact.phone ?? null},
             ${contact.email ?? null}, ${contact.address ?? null}, ${contact.id})
          ON CONFLICT DO NOTHING
        `);
        break;

      case 'pharmacy':
        await db.execute(sql`
          INSERT INTO pharmacy_customers
            (tenant_id, name, phone, email, crm_contact_id)
          VALUES
            (${tenantId}, ${contact.name}, ${contact.phone ?? null}, ${contact.email ?? null}, ${contact.id})
          ON CONFLICT DO NOTHING
        `);
        break;

      case 'education':
        // Parent/guardian as CRM contact — link to students table reference
        await db.execute(sql`
          INSERT INTO student_contacts
            (tenant_id, crm_contact_id, name, phone, email, relationship)
          VALUES
            (${tenantId}, ${contact.id}, ${contact.name}, ${contact.phone ?? null},
             ${contact.email ?? null}, 'parent')
          ON CONFLICT (tenant_id, crm_contact_id) DO NOTHING
        `);
        break;

      case 'retail':
        await db.execute(sql`
          INSERT INTO retail_customers
            (tenant_id, name, phone, email, crm_contact_id, loyalty_points)
          VALUES
            (${tenantId}, ${contact.name}, ${contact.phone ?? null}, ${contact.email ?? null}, ${contact.id}, 0)
          ON CONFLICT DO NOTHING
        `);
        break;

      case 'realestate':
        await db.execute(sql`
          INSERT INTO property_leads
            (tenant_id, crm_contact_id, name, phone, email, status)
          VALUES
            (${tenantId}, ${contact.id}, ${contact.name}, ${contact.phone ?? null},
             ${contact.email ?? null}, 'new')
          ON CONFLICT (tenant_id, crm_contact_id) DO NOTHING
        `);
        break;

      case 'logistics':
        await db.execute(sql`
          INSERT INTO logistics_customers
            (tenant_id, crm_contact_id, name, phone, email, address)
          VALUES
            (${tenantId}, ${contact.id}, ${contact.name}, ${contact.phone ?? null},
             ${contact.email ?? null}, ${contact.address ?? null})
          ON CONFLICT (tenant_id, crm_contact_id) DO NOTHING
        `);
        break;

      case 'ngo':
        await db.execute(sql`
          INSERT INTO ngo_donors
            (tenant_id, crm_contact_id, donor_code, name, phone, email, address, is_80g_eligible)
          VALUES
            (${tenantId}, ${contact.id}, ${'D-' + contact.id}, ${contact.name},
             ${contact.phone ?? null}, ${contact.email ?? null}, ${contact.address ?? null}, true)
          ON CONFLICT (tenant_id, crm_contact_id) DO NOTHING
        `);
        break;
    }
  } catch (e: any) {
    console.warn(`[cross-module-sync] syncContactToVertical(${vertical}) skipped:`, e.message);
  }
}

// ─── C. Vertical Customer → CRM Contact (reverse) ────────────────────────────

export async function syncVerticalCustomerToCRM(tenantId: number, source: string, customer: {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}) {
  if (!customer.name) return;
  try {
    await db.execute(sql`
      INSERT INTO crm_contacts
        (tenant_id, name, phone, email, address, contact_type, source, record_status)
      VALUES
        (${tenantId}, ${customer.name}, ${customer.phone ?? null}, ${customer.email ?? null},
         ${customer.address ?? null}, 'customer', ${source}, 1)
      ON CONFLICT (tenant_id, phone) WHERE phone IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name, email = COALESCE(EXCLUDED.email, crm_contacts.email)
    `);
  } catch (e: any) {
    console.warn(`[cross-module-sync] syncVerticalCustomerToCRM(${source}) skipped:`, e.message);
  }
}

// ─── D. Vendor/Supplier → CRM Contact ────────────────────────────────────────

export async function syncVendorToCRM(tenantId: number, vendor: {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}) {
  if (!vendor.name) return;
  try {
    await db.execute(sql`
      INSERT INTO crm_contacts
        (tenant_id, name, phone, email, address, contact_type, source, record_status)
      VALUES
        (${tenantId}, ${vendor.name}, ${vendor.phone ?? null}, ${vendor.email ?? null},
         ${vendor.address ?? null}, 'vendor', 'vendor_master', 1)
      ON CONFLICT (tenant_id, phone) WHERE phone IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name, contact_type = 'vendor'
    `);
  } catch (e: any) {
    console.warn(`[cross-module-sync] syncVendorToCRM skipped:`, e.message);
  }
}

// ─── E. Branch/Cost Centre → Vertical Outlet ─────────────────────────────────

export async function syncBranchToVerticalOutlet(tenantId: number, branch: {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
}) {
  const vertical = await getTenantVertical(tenantId);
  if (!vertical) return;

  try {
    switch (vertical) {
      case 'restaurant':
        await db.execute(sql`
          INSERT INTO restaurant_outlets
            (tenant_id, outlet_code, outlet_name, address, phone, gstin, branch_id, is_active)
          VALUES
            (${tenantId}, ${'BR-' + branch.id}, ${branch.name}, ${branch.address ?? null},
             ${branch.phone ?? null}, ${branch.gstin ?? null}, ${branch.id}, 1)
          ON CONFLICT (tenant_id, branch_id) DO UPDATE
            SET outlet_name = EXCLUDED.outlet_name, address = EXCLUDED.address
        `);
        break;

      case 'hotel':
        await db.execute(sql`
          INSERT INTO hotel_properties
            (tenant_id, property_name, address, phone, branch_id, is_active)
          VALUES
            (${tenantId}, ${branch.name}, ${branch.address ?? null}, ${branch.phone ?? null}, ${branch.id}, 1)
          ON CONFLICT (tenant_id, branch_id) DO UPDATE
            SET property_name = EXCLUDED.property_name
        `);
        break;

      case 'pharmacy':
        await db.execute(sql`
          INSERT INTO pharmacy_stores
            (tenant_id, store_name, address, phone, gstin, branch_id, is_active)
          VALUES
            (${tenantId}, ${branch.name}, ${branch.address ?? null}, ${branch.phone ?? null},
             ${branch.gstin ?? null}, ${branch.id}, 1)
          ON CONFLICT (tenant_id, branch_id) DO UPDATE
            SET store_name = EXCLUDED.store_name
        `);
        break;

      case 'retail':
        await db.execute(sql`
          INSERT INTO retail_stores
            (tenant_id, store_name, address, phone, gstin, branch_id, is_active)
          VALUES
            (${tenantId}, ${branch.name}, ${branch.address ?? null}, ${branch.phone ?? null},
             ${branch.gstin ?? null}, ${branch.id}, 1)
          ON CONFLICT (tenant_id, branch_id) DO UPDATE
            SET store_name = EXCLUDED.store_name
        `);
        break;

      case 'education':
        await db.execute(sql`
          INSERT INTO campuses
            (tenant_id, campus_name, address, phone, branch_id, is_active)
          VALUES
            (${tenantId}, ${branch.name}, ${branch.address ?? null}, ${branch.phone ?? null}, ${branch.id}, 1)
          ON CONFLICT (tenant_id, branch_id) DO UPDATE
            SET campus_name = EXCLUDED.campus_name
        `);
        break;
    }
  } catch (e: any) {
    console.warn(`[cross-module-sync] syncBranchToVerticalOutlet(${vertical}) skipped:`, e.message);
  }
}
