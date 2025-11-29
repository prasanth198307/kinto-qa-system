import XLSX from 'xlsx';
import pg from 'pg';

const workbook = XLSX.readFile('attached_assets/Payments_1764396948864.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Get all payments from file with exact amounts
let fileTotal = 0;
const filePayments = [];
for (let i = 3; i < data.length; i++) {
  const row = data[i];
  if (row && row[8]) {
    const amount = Number(row[8]) || 0;
    if (amount > 0) {
      fileTotal += amount;
      filePayments.push({
        row: i + 1,
        date: String(row[0] || ''),
        ref: String(row[1] || ''),
        party: String(row[2] || ''),
        amount: amount
      });
    }
  }
}

// Connect to database
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const result = await client.query(`SELECT SUM(amount)/100.0 as total FROM payment_evidence WHERE record_status = 1`);
const dbTotal = Number(result.rows[0].total);

const gap = fileTotal - dbTotal;

console.log('=== GAP ANALYSIS ===');
console.log(`Payments.xlsx total: ₹${fileTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
console.log(`Database total:      ₹${dbTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
console.log(`GAP:                 ₹${gap.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
console.log('');

// Find which specific payments are missing by checking each file payment
const evidenceResult = await client.query(`
  SELECT pe.amount/100.0 as amount, pe.reference_number, v.vendor_name, pe.received_on
  FROM payment_evidence pe
  LEFT JOIN vendors v ON v.id = pe.vendor_id
  WHERE pe.record_status = 1
`);

// Create a map of evidence amounts with counts
const evidenceAmounts = {};
for (const row of evidenceResult.rows) {
  const key = Math.round(Number(row.amount) * 100);
  evidenceAmounts[key] = (evidenceAmounts[key] || 0) + 1;
}

// Track file amounts
const fileAmountCounts = {};
for (const p of filePayments) {
  const key = Math.round(p.amount * 100);
  fileAmountCounts[key] = (fileAmountCounts[key] || 0) + 1;
}

// Find unmatched file payments
console.log('Records in file but NOT in database (by amount):');
let unmatchedTotal = 0;
const usedCounts = {...evidenceAmounts};

for (const p of filePayments) {
  const key = Math.round(p.amount * 100);
  if (usedCounts[key] && usedCounts[key] > 0) {
    usedCounts[key]--;
  } else {
    console.log(`  Row ${p.row}: ${p.party} | ${p.date} | ₹${p.amount.toLocaleString('en-IN')} | Ref: ${p.ref}`);
    unmatchedTotal += p.amount;
  }
}

console.log(`\nUnmatched file payments total: ₹${unmatchedTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

// Find extra DB records (created by splitting)
console.log('\nExtra records in database (from splitting):');
let extraTotal = 0;
const usedFileCounts = {...fileAmountCounts};

for (const row of evidenceResult.rows) {
  const key = Math.round(Number(row.amount) * 100);
  if (usedFileCounts[key] && usedFileCounts[key] > 0) {
    usedFileCounts[key]--;
  } else {
    console.log(`  ${row.vendor_name} | ₹${Number(row.amount).toLocaleString('en-IN')} | ${row.received_on?.substring(0,10)}`);
    extraTotal += Number(row.amount);
  }
}

console.log(`\nExtra DB records total: ₹${extraTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
console.log(`\nNet gap: ₹${(unmatchedTotal - extraTotal).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

await client.end();
