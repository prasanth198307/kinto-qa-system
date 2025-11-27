import XLSX from 'xlsx';

const saleWB = XLSX.readFile('attached_assets/SaleReport_1764228749066.xlsx');
const saleSheet = saleWB.Sheets[saleWB.SheetNames[0]];
const itemSheet = saleWB.Sheets['Item Details'];

interface SaleData {
  'Generated on Nov 21, 2025 at 2:51 pm': string;
  __EMPTY: string;
  __EMPTY_1: string;
  __EMPTY_2: string;
  __EMPTY_4: string;
  __EMPTY_5: number;
}

interface ItemData {
  __EMPTY: string;
  __EMPTY_2: string;
  __EMPTY_16: string;
}

const sales = XLSX.utils.sheet_to_json<SaleData>(saleSheet);
const items = XLSX.utils.sheet_to_json<ItemData>(itemSheet);

const missing = ['28', '194', '300', '337', '338', '339'];

console.log('📋 Checking missing invoices in Excel:\n');

for (const invoiceNo of missing) {
  const sale = sales.find(s => s.__EMPTY_1?.trim() === invoiceNo);
  const saleItems = items.filter(i => i.__EMPTY?.trim() === invoiceNo);
  
  if (sale) {
    console.log(`Invoice ${invoiceNo}:`);
    console.log(`  Party: ${sale.__EMPTY_2}`);
    console.log(`  Type: ${sale.__EMPTY_4}`);
    console.log(`  Total: ₹${sale.__EMPTY_5}`);
    console.log(`  Items: ${saleItems.length}`);
    if (saleItems.length > 0) {
      console.log(`  Item types: ${[...new Set(saleItems.map(i => i.__EMPTY_16))].join(', ')}`);
    }
  } else {
    console.log(`Invoice ${invoiceNo}: NOT FOUND IN EXCEL`);
  }
  console.log('');
}
