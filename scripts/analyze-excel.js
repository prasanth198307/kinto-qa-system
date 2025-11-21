import XLSX from 'xlsx';

console.log('🔍 Analyzing Vyapaar Excel Files...\n');

// Read Party Report
console.log('=== PARTY REPORT ===');
try {
  const partyWB = XLSX.readFile('attached_assets/PartyReport_1763717077023.xlsx');
  console.log('Sheet Names:', partyWB.SheetNames);
  
  const partySheet = partyWB.Sheets[partyWB.SheetNames[0]];
  const parties = XLSX.utils.sheet_to_json(partySheet);
  
  console.log(`Total Parties: ${parties.length}`);
  
  if (parties.length > 0) {
    console.log('\nColumns:', Object.keys(parties[0]));
    console.log('\nFirst 3 Records:');
    console.log(JSON.stringify(parties.slice(0, 3), null, 2));
  }
} catch(e) {
  console.error('Error reading Party Report:', e.message);
}

console.log('\n\n=== SALE REPORT ===');
try {
  const saleWB = XLSX.readFile('attached_assets/SaleReport_1763717077023.xlsx');
  console.log('Sheet Names:', saleWB.SheetNames);
  
  const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
  const sales = XLSX.utils.sheet_to_json(saleSheet);
  
  console.log(`Total Sales: ${sales.length}`);
  
  if (sales.length > 0) {
    console.log('\nColumns:', Object.keys(sales[0]));
    console.log('\nFirst 3 Records:');
    console.log(JSON.stringify(sales.slice(0, 3), null, 2));
  }
} catch(e) {
  console.error('Error reading Sale Report:', e.message);
}

console.log('\n✅ Analysis Complete');
