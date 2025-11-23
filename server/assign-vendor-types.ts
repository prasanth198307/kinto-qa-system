import { db } from './db';
import { vendors, vendorTypes, vendorVendorTypes, invoices, invoiceItems, products } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Utility to assign vendor types to vendors based on their actual invoice/product data
 * Run this after Vyapaar import to classify all vendors
 */
export async function assignVendorTypesFromInvoices() {
  console.log('Starting vendor type assignment from invoice data...');
  
  // Get all vendor types
  const allVendorTypes = await db.select().from(vendorTypes);
  const kintoType = allVendorTypes.find(vt => vt.code === 'KINTO');
  const hppaniType = allVendorTypes.find(vt => vt.code === 'HPPANI');
  const purejalType = allVendorTypes.find(vt => vt.code === 'PUREJAL');
  
  if (!kintoType || !hppaniType || !purejalType) {
    throw new Error('Required vendor types (KINTO, HPPANI, PUREJAL) not found in database');
  }
  
  // Get all vendors
  const allVendors = await db.select().from(vendors).where(eq(vendors.recordStatus, 1));
  
  console.log(`Processing ${allVendors.length} vendors...`);
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  for (const vendor of allVendors) {
    // Get all products this vendor has purchased (from invoices)
    const vendorInvoices = await db
      .select({
        itemDescription: invoiceItems.description,
      })
      .from(invoices)
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(
        and(
          eq(invoices.buyerName, vendor.vendorName),
          eq(invoices.recordStatus, 1)
        )
      );
    
    if (vendorInvoices.length === 0) {
      skippedCount++;
      continue;
    }
    
    // Normalize product names
    const productNames = vendorInvoices
      .map(inv => (inv.itemDescription || '').toLowerCase())
      .filter(name => name.length > 0);
    
    if (productNames.length === 0) {
      skippedCount++;
      continue;
    }
    
    // Determine vendor types based on products
    const assignedTypes: { id: string; code: string }[] = [];
    
    const hasKinto = productNames.some(p => 
      p.includes('kinto') || p.includes('blue')
    );
    const hasHPPani = productNames.some(p => 
      p.includes('hp') || p.includes('hppani') || p.includes('red')
    );
    const hasPurejal = productNames.some(p => 
      p.includes('purejal') || p.includes('green')
    );
    
    if (hasKinto) assignedTypes.push({ id: kintoType.id, code: 'KINTO' });
    if (hasHPPani) assignedTypes.push({ id: hppaniType.id, code: 'HPPANI' });
    if (hasPurejal) assignedTypes.push({ id: purejalType.id, code: 'PUREJAL' });
    
    if (assignedTypes.length === 0) {
      skippedCount++;
      continue;
    }
    
    // Remove existing assignments for this vendor
    await db.delete(vendorVendorTypes).where(eq(vendorVendorTypes.vendorId, vendor.id));
    
    // Insert new assignments
    for (let index = 0; index < assignedTypes.length; index++) {
      await db.insert(vendorVendorTypes).values({
        vendorId: vendor.id,
        vendorTypeId: assignedTypes[index].id,
        isPrimary: index === 0 ? 1 : 0,
      });
    }
    
    console.log(`✓ ${vendor.vendorName}: ${assignedTypes.map(t => t.code).join(', ')}`);
    assignedCount++;
  }
  
  console.log('\n=== Vendor Type Assignment Complete ===');
  console.log(`Total vendors processed: ${allVendors.length}`);
  console.log(`Vendors with types assigned: ${assignedCount}`);
  console.log(`Vendors skipped (no invoices or no matching products): ${skippedCount}`);
  
  return {
    total: allVendors.length,
    assigned: assignedCount,
    skipped: skippedCount,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  assignVendorTypesFromInvoices()
    .then((result) => {
      console.log('\nResult:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
