/**
 * Cleanup: remove duplicate existingCodesRes/existingCodes declarations
 * caused by patch running on an already-patched file.
 * Run: node db_scripts/fix-bulk-upload-dedup-cleanup.cjs
 */
const fs = require('fs');
const file = 'server/hr-routes.ts';
let c = fs.readFileSync(file, 'utf8');

// The duplicate block that was inserted by the patch script on top of the already-patched Replit version
const duplicate = `    // Pre-load all existing emp_codes to detect duplicates without relying on DB constraints
    const existingCodesRes = await db.execute(sql\`SELECT emp_code FROM hr_employees WHERE tenant_id=\${tid} AND record_status=1\`);
    const existingCodes = new Set(existingCodesRes.rows.map((r) => String(r.emp_code).trim().toLowerCase()));

    let created = 0;
    const errors: { row: number; reason: string }[] = [];`;

const replacement = `    let created = 0;
    const errors: { row: number; reason: string }[] = [];`;

// Count occurrences of existingCodesRes
const count = (c.match(/const existingCodesRes/g) || []).length;
console.log(`Found ${count} declaration(s) of existingCodesRes`);

if (count === 2) {
  // Remove the SECOND (duplicate) block — which is the one without type annotations
  // Strategy: replace the duplicate block (without ": any") with just the let/const lines it prepended
  if (c.includes(duplicate)) {
    c = c.replace(duplicate, replacement);
    fs.writeFileSync(file, c);
    console.log('✅ Duplicate removed. Now run: npm run build && pm2 restart all');
  } else {
    // Try alternate: just remove the second const existingCodesRes block
    const lines = c.split('\n');
    const indices = [];
    lines.forEach((l, i) => { if (l.includes('const existingCodesRes')) indices.push(i); });
    console.log('Duplicate at lines:', indices.map(i => i + 1));
    // Remove lines from second occurrence back to the comment before it
    const secondIdx = indices[1];
    let startRemove = secondIdx;
    // Walk back to find the comment or blank line group start
    while (startRemove > 0 && (lines[startRemove - 1].trim() === '' || lines[startRemove - 1].includes('Pre-load'))) {
      startRemove--;
    }
    // Walk forward to end of the block (existingCodes line)
    let endRemove = secondIdx + 1;
    while (endRemove < lines.length && !lines[endRemove].includes('let created')) {
      endRemove++;
    }
    lines.splice(startRemove, endRemove - startRemove);
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`✅ Removed lines ${startRemove + 1}–${endRemove + 1}. Now run: npm run build && pm2 restart all`);
  }
} else if (count === 1) {
  console.log('✅ Only one declaration found — no duplicate, nothing to fix.');
} else if (count === 0) {
  console.log('⚠️  No existingCodesRes found — bulk upload fix may not be applied at all.');
} else {
  console.log(`⚠️  Found ${count} declarations — manual inspection needed.`);
}
