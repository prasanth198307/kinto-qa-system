const fs = require('fs');
const file = 'server/hr-routes.ts';
let c = fs.readFileSync(file, 'utf8');

const old = `router.put("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  try {
    const r = await db.execute(sql\`
      UPDATE hr_employees SET
        emp_code=\${d.empCode}, first_name=\${d.firstName}, last_name=\${d.lastName ?? null},
        gender=\${d.gender ?? null}, date_of_birth=\${d.dateOfBirth ?? null}, blood_group=\${d.bloodGroup ?? null},
        department_id=\${d.departmentId ?? null}, designation_id=\${d.designationId ?? null},
        shift_id=\${d.shiftId ?? null}, salary_structure_id=\${d.salaryStructureId ?? null},
        basic_salary=\${d.basicSalary ?? 0}, special_allowance=\${d.specialAllowance ?? 0}, ctc=\${d.ctc ?? 0}, join_date=\${d.joinDate},
        exit_date=\${d.exitDate ?? null}, exit_type=\${d.exitType ?? null},
        exit_reason=\${d.exitReason ?? null}, resignation_date=\${d.resignationDate ?? null},
        reporting_manager_id=\${d.reportingManagerId ?? null},
        phone=\${d.phone ?? null}, alternate_phone=\${d.alternatePhone ?? null},
        email=\${d.email ?? null}, address=\${d.address ?? null},
        city=\${d.city ?? null}, state=\${d.state ?? null}, pincode=\${d.pincode ?? null},
        emergency_contact=\${d.emergencyContact ?? null},
        emergency_contact_name=\${d.emergencyContactName ?? null},
        emergency_contact_relation=\${d.emergencyContactRelation ?? null},
        pan=\${d.pan ?? null}, aadhaar=\${d.aadhaar ?? null}, pf_number=\${d.pfNumber ?? null},
        esi_number=\${d.esiNumber ?? null}, uan=\${d.uan ?? null}, bank_account=\${d.bankAccount ?? null},
        ifsc=\${d.ifsc ?? null}, bank_name=\${d.bankName ?? null}, tax_regime=\${d.taxRegime ?? 'new'},
        marital_status=\${d.maritalStatus ?? null}, spouse_name=\${d.spouseName ?? null},
        spouse_dob=\${d.spouseDob ?? null}, spouse_aadhaar=\${d.spouseAadhaar ?? null},
        father_name=\${d.fatherName ?? null}, father_dob=\${d.fatherDob ?? null},
        father_aadhaar=\${d.fatherAadhaar ?? null}, mother_name=\${d.motherName ?? null},
        mother_dob=\${d.motherDob ?? null}, mother_aadhaar=\${d.motherAadhaar ?? null},
        number_of_children=\${d.numberOfChildren ?? 0},
        status=\${d.status ?? 'active'}, employee_type=\${d.employeeType ?? 'permanent'}, updated_at=NOW()
      WHERE id=\${req.params.id} AND tenant_id=\${tid} RETURNING *
    \`);`;

const neu = `router.put("/employees/:id", requireHR, async (req: any, res) => {
  const tid = getTenantId(req);
  const d = req.body;
  const s = (v) => (v === '' || v == null) ? null : v;
  const n = (v, def = 0) => (v === '' || v == null) ? def : Number(v);
  const i = (v) => (v === '' || v == null) ? null : parseInt(v);
  try {
    const r = await db.execute(sql\`
      UPDATE hr_employees SET
        emp_code=\${d.empCode}, first_name=\${d.firstName}, last_name=\${s(d.lastName)},
        gender=\${s(d.gender)}, date_of_birth=\${s(d.dateOfBirth)}, blood_group=\${s(d.bloodGroup)},
        department_id=\${i(d.departmentId)}, designation_id=\${i(d.designationId)},
        shift_id=\${i(d.shiftId)}, salary_structure_id=\${i(d.salaryStructureId)},
        basic_salary=\${n(d.basicSalary)}, special_allowance=\${n(d.specialAllowance)}, ctc=\${n(d.ctc)}, join_date=\${s(d.joinDate)},
        exit_date=\${s(d.exitDate)}, exit_type=\${s(d.exitType)},
        exit_reason=\${s(d.exitReason)}, resignation_date=\${s(d.resignationDate)},
        reporting_manager_id=\${i(d.reportingManagerId)},
        phone=\${s(d.phone)}, alternate_phone=\${s(d.alternatePhone)},
        email=\${s(d.email)}, address=\${s(d.address)},
        city=\${s(d.city)}, state=\${s(d.state)}, pincode=\${s(d.pincode)},
        emergency_contact=\${s(d.emergencyContact)},
        emergency_contact_name=\${s(d.emergencyContactName)},
        emergency_contact_relation=\${s(d.emergencyContactRelation)},
        pan=\${s(d.pan)}, aadhaar=\${s(d.aadhaar)}, pf_number=\${s(d.pfNumber)},
        esi_number=\${s(d.esiNumber)}, uan=\${s(d.uan)}, bank_account=\${s(d.bankAccount)},
        ifsc=\${s(d.ifsc)}, bank_name=\${s(d.bankName)}, tax_regime=\${s(d.taxRegime) || 'new'},
        marital_status=\${s(d.maritalStatus)}, spouse_name=\${s(d.spouseName)},
        spouse_dob=\${s(d.spouseDob)}, spouse_aadhaar=\${s(d.spouseAadhaar)},
        father_name=\${s(d.fatherName)}, father_dob=\${s(d.fatherDob)},
        father_aadhaar=\${s(d.fatherAadhaar)}, mother_name=\${s(d.motherName)},
        mother_dob=\${s(d.motherDob)}, mother_aadhaar=\${s(d.motherAadhaar)},
        number_of_children=\${n(d.numberOfChildren)},
        status=\${s(d.status) || 'active'}, employee_type=\${s(d.employeeType) || 'permanent'}, updated_at=NOW()
      WHERE id=\${req.params.id} AND tenant_id=\${tid} RETURNING *
    \`);`;

if (c.includes(old)) {
  fs.writeFileSync(file, c.replace(old, neu));
  console.log('✅ Patch applied successfully');
} else {
  console.log('⚠️  Pattern not found - file may already be patched or differ from expected');
  // Check if already patched
  if (c.includes('const s = (v)')) {
    console.log('✅ File appears to already have the fix applied');
  }
}
