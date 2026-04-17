/**
 * Patch: bulk upload duplicate employee detection
 * Run on production server: node db_scripts/fix-bulk-upload-dupes.js
 */
const fs = require('fs');
const file = 'server/hr-routes.ts';
let c = fs.readFileSync(file, 'utf8');
let changed = false;

// Patch 1: pre-load existing emp_codes before the loop
const old1 = `    let created = 0;\n    const errors: { row: number; reason: string }[] = [];`;
const new1 = `    // Pre-load all existing emp_codes to detect duplicates without relying on DB constraints
    const existingCodesRes = await db.execute(sql\`SELECT emp_code FROM hr_employees WHERE tenant_id=\${tid} AND record_status=1\`);
    const existingCodes = new Set(existingCodesRes.rows.map((r) => String(r.emp_code).trim().toLowerCase()));

    let created = 0;\n    const errors: { row: number; reason: string }[] = [];`;

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  changed = true;
  console.log('✅ Patch 1 applied: pre-load existing emp_codes');
} else if (c.includes('existingCodes')) {
  console.log('✅ Patch 1 already applied');
} else {
  console.log('⚠️  Patch 1: pattern not found — check file manually');
}

// Patch 2: duplicate check inside the loop
const old2 = `      if (!joinDate) { errors.push({ row: rowNum, reason: "join_date is required" }); continue; }`;
const new2 = `      if (!joinDate) { errors.push({ row: rowNum, reason: "join_date is required" }); continue; }

      // Duplicate check — against existing DB records AND earlier rows in same upload
      if (existingCodes.has(empCode.toLowerCase())) {
        errors.push({ row: rowNum, reason: \`emp_code "\${empCode}" already exists — skipped\` });
        continue;
      }`;

if (c.includes(old2) && !c.includes('existingCodes.has(empCode')) {
  c = c.replace(old2, new2);
  changed = true;
  console.log('✅ Patch 2 applied: duplicate check in loop');
} else if (c.includes('existingCodes.has(empCode')) {
  console.log('✅ Patch 2 already applied');
} else {
  console.log('⚠️  Patch 2: pattern not found — check file manually');
}

// Patch 3: add newly inserted code to the set
const old3 = `        created++;`;
const new3 = `        existingCodes.add(empCode.toLowerCase()); // prevent same-file duplicates
        created++;`;

if (c.includes(old3) && !c.includes('existingCodes.add(empCode')) {
  c = c.replace(old3, new3);
  changed = true;
  console.log('✅ Patch 3 applied: track newly inserted codes');
} else if (c.includes('existingCodes.add(empCode')) {
  console.log('✅ Patch 3 already applied');
} else {
  console.log('⚠️  Patch 3: pattern not found — check file manually');
}

if (changed) {
  fs.writeFileSync(file, c);
  console.log('\n✅ All patches written. Now run: npm run build && pm2 restart all');
} else {
  console.log('\nNo changes written.');
}
