import XLSX from 'xlsx';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function excelDateToYYYYMMDD(serial: number): string | null {
  if (!serial || typeof serial !== 'number') return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function parseCurrency(val: any): number {
  if (!val || val === 'NIL' || val === '') return 0;
  const str = String(val);
  
  // Handle multi-line expense formats:
  // Format 1: "7720/- CASH\r\n4,840/- TULASI PP\r\n12,560/- TOTAL"
  // Format 2: "3000/- TULASI PP\r\n6,430/- CASH\r\nTOTAL-9,430/-"
  
  // Look for "TOTAL-amount" format (with hyphen before amount)
  const totalHyphenMatch = str.match(/TOTAL\s*[-–]\s*(\d[\d,]*)/i);
  if (totalHyphenMatch) {
    const totalStr = totalHyphenMatch[1].replace(/,/g, '');
    return Math.round(parseFloat(totalStr) * 100);
  }
  
  // Look for "amount TOTAL" format
  const totalAfterMatch = str.match(/(\d[\d,]*)\s*\/?-?\s*TOTAL/i);
  if (totalAfterMatch) {
    const totalStr = totalAfterMatch[1].replace(/,/g, '');
    return Math.round(parseFloat(totalStr) * 100);
  }
  
  // Otherwise just parse first number
  const cleanStr = str.replace(/[₹\/-]/g, '').replace(/,/g, '').replace(/\s+/g, '').trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function parseItemDetails(details: string): { label: string; amount: number; rawText: string }[] {
  if (!details || details === 'NIL' || details === '') return [];
  const items: { label: string; amount: number; rawText: string }[] = [];
  
  // First, handle Indian thousands separator (like 3,500 or 49,500)
  // Pattern: 1-2 digits, comma, 3 digits at end or before /- 
  // This converts "MOTOR-3,500" to "MOTOR-3500" before splitting
  let processedDetails = details.replace(/(\d{1,2}),(\d{3})(?=\s*\/?-?\s*$|\s*\/?-?\s*,)/g, '$1$2');
  
  // Normalize newlines to commas for splitting
  const normalizedDetails = processedDetails.replace(/\r\n/g, ',').replace(/\n/g, ',');
  const parts = normalizedDetails.split(',');
  
  for (const part of parts) {
    let trimmed = part.trim();
    if (!trimmed) continue;
    
    // Remove trailing periods or colons
    trimmed = trimmed.replace(/[.:]+$/, '');
    
    // Remove trailing parenthetical notes like "(4 MEMBERS)" but keep the amount before it
    // Pattern: "ITEM-600(note)" -> "ITEM-600"
    trimmed = trimmed.replace(/\([^)]*\)\s*$/, '').trim();
    
    // Match patterns like "DIESEL-6K", "PETROL-260", "ITEM 500/-", "ITEM-3.5K", "SUDHAKAR-49500", "MOTOR-3,500"
    // Also handle "DIESEL-2500 PP TULASI" or "ITEM-25000 CASH" where text follows amount
    // Allow commas in the amount (Indian format like 3,500 or 49,500)
    
    // First try: amount followed by optional text (PP TULASI, CASH, etc.)
    let match = trimmed.match(/(.+?)[- ]([\d,]+(?:\.\d+)?)\s*([Kk])?\s*(?:PP\s*TULASI|CASH|TULASI)?(?:\/-)?$/i);
    
    // Second try: amount at the very end
    if (!match) {
      match = trimmed.match(/(.+)[- ]([\d,]+(?:\.\d+)?)\s*([Kk])?(?:\/-)?$/);
    }
    
    if (match) {
      // Remove commas from amount string before parsing
      const amountStr = match[2].replace(/,/g, '');
      let amount = parseFloat(amountStr);
      const kSuffix = match[3]; // Capture K/k suffix if present
      
      // Only multiply by 1000 if K/k is at the very end (not part of KG, KM, etc.)
      // Check that K is the suffix and nothing follows it (except /-)
      if (kSuffix && !/[Kk][Gg]|[Kk][Mm]/.test(trimmed.slice(-5))) {
        amount = amount * 1000;
      }
      
      items.push({
        label: match[1].trim().toUpperCase(),
        amount: Math.round(amount * 100), // Convert to paise
        rawText: part.trim() // Keep original for reference
      });
    } else {
      items.push({ label: trimmed.toUpperCase(), amount: 0, rawText: part.trim() });
    }
  }
  return items;
}

async function importData() {
  const client = await pool.connect();
  try {
    const workbook = XLSX.readFile('attached_assets/DAILY EXPENSES FROM SECONDARY SALE AMOUNT (1)_1764052980708.xlsx');
    console.log('Sheets:', workbook.SheetNames);
    
    let daysCreated = 0, txCreated = 0, itemsCreated = 0, vouchersCreated = 0;
    
    // Get or create expense category
    let catResult = await client.query('SELECT id FROM expense_categories LIMIT 1');
    let categoryId: string;
    if (catResult.rows.length > 0) {
      categoryId = catResult.rows[0].id;
    } else {
      const newCat = await client.query(
        "INSERT INTO expense_categories (id, name, description) VALUES (gen_random_uuid(), 'Daily Operations', 'Daily expenses from cash register') RETURNING id"
      );
      categoryId = newCat.rows[0].id;
    }
    console.log('Using category ID:', categoryId);
    
    // Get admin user id
    const adminResult = await client.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
    const adminId = adminResult.rows[0]?.id;
    console.log('Using admin ID:', adminId);
    
    for (const sheetName of workbook.SheetNames) {
      console.log('\nProcessing:', sheetName);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        
        const dateStr = excelDateToYYYYMMDD(row[0]);
        const salesperson = String(row[1] || '').trim().toUpperCase();
        if (['HOLIDAY', 'SUNDAY', 'ALL', 'NIL', ''].includes(salesperson) || !dateStr) continue;
        
        const openingBalance = parseCurrency(row[2]);
        const depositAmount = parseCurrency(row[3]);
        const receivedCash = parseCurrency(row[4]);
        const expenses = parseCurrency(row[5]);
        const itemDetails = String(row[6] || '');
        const parsedItems = parseItemDetails(itemDetails);
        const balanceAmount = parseCurrency(row[7]);
        const sentToTulasi = parseCurrency(row[8]);
        
        // Check for duplicate
        const existing = await client.query(
          'SELECT id FROM cash_register_days WHERE register_date = $1 AND salesperson_name = $2 LIMIT 1',
          [dateStr, salesperson]
        );
        if (existing.rows.length > 0) {
          console.log(`  Skipping duplicate: ${dateStr} - ${salesperson}`);
          continue;
        }
        
        const closingBalance = openingBalance + depositAmount + receivedCash - expenses - sentToTulasi;
        
        // Insert day
        const dayResult = await client.query(
          'INSERT INTO cash_register_days (id, register_date, salesperson_name, opening_balance, closing_balance, total_deposits, total_cash_received, total_expenses, total_transfers, variance_amount, status, notes, imported_from_file, imported_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id',
          [dateStr, salesperson, openingBalance, closingBalance, depositAmount, receivedCash, expenses, sentToTulasi, closingBalance - balanceAmount, 'open', 'Imported from ' + sheetName, sheetName]
        );
        const dayId = dayResult.rows[0].id;
        daysCreated++;
        console.log(`  Created day: ${dateStr} - ${salesperson}`);
        
        // Insert transactions
        if (depositAmount > 0) {
          await client.query('INSERT INTO cash_register_transactions (id, day_id, transaction_type, amount, description) VALUES (gen_random_uuid(), $1, $2, $3, $4)', [dayId, 'deposit', depositAmount, 'Deposit']);
          txCreated++;
        }
        if (receivedCash > 0) {
          await client.query('INSERT INTO cash_register_transactions (id, day_id, transaction_type, amount, description) VALUES (gen_random_uuid(), $1, $2, $3, $4)', [dayId, 'cash_received', receivedCash, 'Cash from sales']);
          txCreated++;
        }
        if (expenses > 0) {
          const txResult = await client.query('INSERT INTO cash_register_transactions (id, day_id, transaction_type, amount, description) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id', [dayId, 'expense', expenses, itemDetails || 'Daily expenses']);
          const txId = txResult.rows[0].id;
          txCreated++;
          
          for (const item of parsedItems) {
            // Items with no amount should be 0, not a share of total
            await client.query('INSERT INTO cash_register_expense_items (id, transaction_id, item_label, amount, raw_text) VALUES (gen_random_uuid(), $1, $2, $3, $4)', [txId, item.label, item.amount, item.rawText]);
            itemsCreated++;
          }
          
          // Create expense voucher
          const voucherNumber = 'EXP-CR-' + dateStr.replace(/-/g, '') + '-' + salesperson.substring(0, 3);
          const voucherExists = await client.query('SELECT id FROM expense_vouchers WHERE voucher_number = $1', [voucherNumber]);
          if (voucherExists.rows.length === 0 && adminId) {
            const voucherResult = await client.query(
              'INSERT INTO expense_vouchers (id, voucher_number, voucher_date, payee_type, payee_name, payment_mode, subtotal, gst_amount, total_amount, status, purpose, prepared_by) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
              [voucherNumber, dateStr, 'employee', salesperson, 'cash', expenses, 0, expenses, 'approved', 'Cash Register - ' + salesperson + ' - ' + dateStr, adminId]
            );
            const voucherId = voucherResult.rows[0].id;
            vouchersCreated++;
            
            for (const item of parsedItems) {
              // Only add items that have an amount
              if (item.amount > 0) {
                await client.query('INSERT INTO expense_items (id, voucher_id, category_id, description, quantity, unit_price, amount, gst_rate, gst_amount) VALUES (gen_random_uuid(), $1, $2, $3, 1, $4, $4, 0, 0)', [voucherId, categoryId, item.label, item.amount]);
              }
            }
            if (parsedItems.length === 0) {
              await client.query('INSERT INTO expense_items (id, voucher_id, category_id, description, quantity, unit_price, amount, gst_rate, gst_amount) VALUES (gen_random_uuid(), $1, $2, $3, 1, $4, $4, 0, 0)', [voucherId, categoryId, 'Daily Expenses', expenses]);
            }
            
            await client.query('UPDATE cash_register_transactions SET converted_to_voucher_id = $1 WHERE id = $2', [voucherId, txId]);
          }
        }
        if (sentToTulasi > 0) {
          await client.query('INSERT INTO cash_register_transactions (id, day_id, transaction_type, amount, description, transfer_to) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)', [dayId, 'transfer', sentToTulasi, 'Sent to Tulasi', 'TULASI']);
          txCreated++;
        }
      }
    }
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log('Days created:', daysCreated);
    console.log('Transactions created:', txCreated);
    console.log('Expense items created:', itemsCreated);
    console.log('Vouchers created:', vouchersCreated);
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(console.error);
