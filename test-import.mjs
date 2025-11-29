import { importVyapaarData } from './server/vyapaar-import.ts';

async function runImport() {
  try {
    console.log('Starting import...');
    const result = await importVyapaarData(
      'attached_assets/PartyReport_1764349430882.xlsx',  // Party report
      'attached_assets/SaleReport_1764396948865.xlsx',    // Sale report
      null,                                               // Item details (embedded in sale report)
      'attached_assets/Payments_1764396948864.xlsx'       // Payments
    );
    console.log('Import result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Import error:', error);
  }
}

runImport();
