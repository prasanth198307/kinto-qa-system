
import { importVyapaarData } from './server/vyapaar-import';

const partyPath = path.resolve('attached_assets/PartyReport_1763839485440.xlsx');
const salePath = path.resolve('attached_assets/SaleReport_1763839485440.xlsx');

// For item details, we'll extract from the Sale Report (it contains Item Details sheet)
// The import function will handle reading from Sale Report
const itemPath = path.resolve('attached_assets/SaleReport_1763839485440.xlsx');

console.log('Starting Vyapaar import...');
console.log('Party Report:', partyPath);
console.log('Sale Report:', salePath);

importVyapaarData(partyPath, salePath, salePath)
  .then(result => {
    console.log('
✅ IMPORT SUCCESSFUL!');
    console.log('Results:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('
❌ IMPORT FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
