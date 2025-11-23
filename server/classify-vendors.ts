import { db } from './db';
import { vendors, invoices, invoiceItems, products, vendorTypes, vendorVendorTypes } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Post-import script to classify ALL vendors based on products they purchased
 * Run with: npx tsx server/classify-vendors.ts
 * OR call classifyAllVendors() from code
 */

export async function classifyAllVendors() {
  console.log('🔄 Starting vendor classification...');
  
  try {
    // Get all vendor types
    const allVendorTypes = await db.select().from(vendorTypes);
    const kintoType = allVendorTypes.find(vt => vt.name === 'Kinto');
    const hpPaniType = allVendorTypes.find(vt => vt.name === 'HPPani');
    const purejalType = allVendorTypes.find(vt => vt.name === 'Purejal');
    
    if (!kintoType || !hpPaniType || !purejalType) {
      console.error('❌ Required vendor types not found. Please create Kinto, HPPani, and Purejal vendor types first.');
      return;
    }
    
    console.log(`✅ Found vendor types: Kinto (${kintoType.id}), HPPani (${hpPaniType.id}), Purejal (${purejalType.id})`);
    
    // Clear existing vendor type assignments
    await db.delete(vendorVendorTypes);
    console.log('🗑️  Cleared existing vendor type assignments');
    
    // Get all vendors
    const allVendors = await db.select().from(vendors);
    console.log(`📊 Found ${allVendors.length} total vendors`);
    
    let vendorsClassified = 0;
    let vendorsWithNoInvoices = 0;
    let totalAssignments = 0;
    
    // Process each vendor
    for (const vendor of allVendors) {
      // Find all invoices for this vendor (match by buyer_name)
      const vendorInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.buyerName, vendor.vendorName));
      
      if (vendorInvoices.length === 0) {
        vendorsWithNoInvoices++;
        continue;
      }
      
      // Get all invoice items for this vendor's invoices
      const invoiceIds = vendorInvoices.map(inv => inv.id);
      const items = await db
        .select({
          productId: invoiceItems.productId
        })
        .from(invoiceItems)
        .where(inArray(invoiceItems.invoiceId, invoiceIds));
      
      if (items.length === 0) {
        continue;
      }
      
      // Get product details
      const uniqueProductIds = new Set(items.map(item => item.productId));
      const productIds = Array.from(uniqueProductIds);
      const vendorProducts = await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));
      
      // Classify based on product names
      const hasKinto = vendorProducts.some(p => 
        p.productName.toLowerCase().includes('kinto')
      );
      const hasHPPani = vendorProducts.some(p => 
        p.productName.toLowerCase().includes('hp') || 
        p.productName.toLowerCase().includes('pani')
      );
      const hasPurejal = vendorProducts.some(p => 
        p.productName.toLowerCase().includes('purejal')
      );
      
      // Assign vendor types
      const typesToAssign = [];
      if (hasKinto) typesToAssign.push(kintoType.id);
      if (hasHPPani) typesToAssign.push(hpPaniType.id);
      if (hasPurejal) typesToAssign.push(purejalType.id);
      
      if (typesToAssign.length > 0) {
        for (const typeId of typesToAssign) {
          await db.insert(vendorVendorTypes).values({
            vendorId: vendor.id,
            vendorTypeId: typeId
          });
          totalAssignments++;
        }
        vendorsClassified++;
        
        // Log sample vendors
        if (vendorsClassified <= 10) {
          const typeNames = [];
          if (hasKinto) typeNames.push('Kinto');
          if (hasHPPani) typeNames.push('HPPani');
          if (hasPurejal) typeNames.push('Purejal');
          console.log(`  ✓ ${vendor.vendorName}: ${typeNames.join(', ')}`);
        }
      }
    }
    
    console.log('\n📊 Classification Summary:');
    console.log(`  ✅ Total vendors: ${allVendors.length}`);
    console.log(`  ✅ Vendors classified: ${vendorsClassified}`);
    console.log(`  ℹ️  Vendors with no invoices: ${vendorsWithNoInvoices}`);
    console.log(`  ✅ Total type assignments: ${totalAssignments}`);
    console.log('\n✨ Vendor classification completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during classification:', error);
    throw error;
  }
}

// Run the script if executed directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  classifyAllVendors()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
