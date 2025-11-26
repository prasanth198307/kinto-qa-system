import axios from 'axios';
import { db } from '../server/db';
import { vendors } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function verifyGst(gstin: string) {
  try {
    const response = await axios.get(
      `https://sheet.gstincheck.co.in/check/free/${gstin.toUpperCase()}`,
      { timeout: 15000 }
    );
    
    if (response.data && response.data.flag === true && response.data.data) {
      const gstData = response.data.data;
      let status = 'Unknown';
      if (gstData.sts === 'Active') status = 'Active';
      else if (gstData.sts === 'Cancelled') status = 'Cancelled';
      else if (gstData.sts === 'Suspended') status = 'Suspended';
      else if (gstData.sts === 'Inactive') status = 'Inactive';
      else if (gstData.sts) status = gstData.sts;
      
      return {
        status,
        legalName: gstData.lgnm || null,
        tradeName: gstData.tradeNam || null
      };
    }
    return null;
  } catch (e: any) {
    console.error(`Error verifying ${gstin}: ${e.message}`);
    return null;
  }
}

async function main() {
  // Get unverified vendors
  const allVendors = await db.select().from(vendors).where(eq(vendors.recordStatus, 1));
  const unverified = allVendors.filter(v => 
    v.gstNumber && v.gstNumber.trim() !== '' && 
    (!v.gstStatus || v.gstStatus === '' || v.gstStatus === 'Unknown')
  );
  
  console.log(`Found ${unverified.length} vendors to verify`);
  
  let verified = 0, active = 0, cancelled = 0, suspended = 0, failed = 0;
  
  for (let i = 0; i < unverified.length; i++) {
    const vendor = unverified[i];
    console.log(`[${i+1}/${unverified.length}] Verifying ${vendor.vendorName}...`);
    
    const result = await verifyGst(vendor.gstNumber!);
    
    if (result) {
      await db.update(vendors).set({
        gstStatus: result.status,
        gstLegalName: result.legalName,
        gstTradeName: result.tradeName,
        gstVerifiedAt: new Date().toISOString()
      }).where(eq(vendors.id, vendor.id));
      
      verified++;
      if (result.status === 'Active') active++;
      else if (result.status === 'Cancelled') cancelled++;
      else if (result.status === 'Suspended') suspended++;
      
      console.log(`  -> ${result.status}`);
    } else {
      failed++;
      console.log(`  -> Failed`);
    }
    
    // Rate limit - wait 500ms between requests
    if (i < unverified.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log(`\nComplete! Verified: ${verified}, Active: ${active}, Cancelled: ${cancelled}, Suspended: ${suspended}, Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
