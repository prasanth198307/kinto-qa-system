import XLSX from 'xlsx';

console.log('🔍 Analyzing Item Details Sheet...\n');

try {
  const saleWB = XLSX.readFile('attached_assets/SaleReport_1763717077023.xlsx');
  
  // Read Item Details sheet
  const itemSheet = saleWB.Sheets['Item Details'];
  const items = XLSX.utils.sheet_to_json(itemSheet);
  
  console.log(`Total Item Records: ${items.length}`);
  
  if (items.length > 0) {
    console.log('\nColumns:', Object.keys(items[0]));
    console.log('\nFirst 5 Records:');
    console.log(JSON.stringify(items.slice(0, 5), null, 2));
  }
} catch(e) {
  console.error('Error:', e.message);
}
