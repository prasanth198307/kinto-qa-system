import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Upload, FileText, Trash2, Camera, Eye,
  Download, ArrowLeft, TrendingUp, IndianRupee, Users, X, ExternalLink, KeyRound,
  FileSpreadsheet, CheckCircle, AlertCircle
} from "lucide-react";
import { CustomFieldsSection } from "@/components/custom-fields-section";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DOCUMENT_TYPES = [
  "Offer Letter", "Appointment Letter", "ID Proof", "Address Proof",
  "PAN Card", "Aadhaar", "Educational Certificate", "Experience Letter",
  "Relieving Letter", "Increment Letter", "Promotion Letter", "Other"
];
const EXIT_TYPES = ["Resignation", "Termination", "Retirement", "Absconding", "End of Contract", "Other"];
const MARITAL_STATUS = ["Single", "Married", "Divorced", "Widowed"];
const REVISION_TYPES = ["Increment", "Appraisal", "Promotion", "Correction", "Other"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Chandigarh","Puducherry","Andaman & Nicobar",
  "Dadra & Nagar Haveli","Daman & Diu","Lakshadweep"
];

// ── Employee Form (multi-tab add/edit) ────────────────────────────────────────
function EmployeeForm({ editing, depts, desigs, shifts, structures, managers, onSave, onCancel }: any) {
  const [form, setForm] = useState(editing ? {
    empCode: editing.emp_code || "",
    firstName: editing.first_name || "",
    lastName: editing.last_name || "",
    gender: editing.gender || "",
    dateOfBirth: editing.date_of_birth || "",
    bloodGroup: editing.blood_group || "",
    departmentId: String(editing.department_id || ""),
    designationId: String(editing.designation_id || ""),
    shiftId: String(editing.shift_id || ""),
    salaryStructureId: String(editing.salary_structure_id || ""),
    basicSalary: String(editing.basic_salary || ""),
    specialAllowance: String(editing.special_allowance || ""),
    taAmount: String(editing.ta_amount || ""),
    daAmount: String(editing.da_amount || ""),
    ctc: String(editing.ctc || ""),
    joinDate: editing.join_date || "",
    exitDate: editing.exit_date || "",
    exitType: editing.exit_type || "",
    exitReason: editing.exit_reason || "",
    resignationDate: editing.resignation_date || "",
    reportingManagerId: String(editing.reporting_manager_id || ""),
    phone: editing.phone || "",
    alternatePhone: editing.alternate_phone || "",
    email: editing.email || "",
    address: editing.address || "",
    city: editing.city || "",
    state: editing.state || "",
    pincode: editing.pincode || "",
    emergencyContact: editing.emergency_contact || "",
    emergencyContactName: editing.emergency_contact_name || "",
    emergencyContactRelation: editing.emergency_contact_relation || "",
    pan: editing.pan || "",
    aadhaar: editing.aadhaar || "",
    pfEnabled: editing.pf_enabled !== false,
    esiEnabled: editing.esi_enabled !== false,
    pfNumber: editing.pf_number || "",
    esiNumber: editing.esi_number || "",
    uan: editing.uan || "",
    bankAccount: editing.bank_account || "",
    ifsc: editing.ifsc || "",
    bankName: editing.bank_name || "",
    taxRegime: editing.tax_regime || "new",
    maritalStatus: editing.marital_status || "",
    spouseName: editing.spouse_name || "",
    spouseDob: editing.spouse_dob || "",
    spouseAadhaar: editing.spouse_aadhaar || "",
    fatherName: editing.father_name || "",
    fatherDob: editing.father_dob || "",
    fatherAadhaar: editing.father_aadhaar || "",
    motherName: editing.mother_name || "",
    motherDob: editing.mother_dob || "",
    motherAadhaar: editing.mother_aadhaar || "",
    numberOfChildren: String(editing.number_of_children || "0"),
    status: editing.status || "active",
    employeeType: editing.employee_type || "permanent",
  } : {
    empCode: "", firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "",
    departmentId: "", designationId: "", shiftId: "", salaryStructureId: "",
    basicSalary: "", specialAllowance: "", taAmount: "", daAmount: "", ctc: "", joinDate: "", exitDate: "", exitType: "", exitReason: "",
    resignationDate: "", reportingManagerId: "", phone: "", alternatePhone: "",
    email: "", address: "", city: "", state: "", pincode: "",
    emergencyContact: "", emergencyContactName: "", emergencyContactRelation: "",
    pan: "", aadhaar: "", pfEnabled: true, esiEnabled: true, pfNumber: "", esiNumber: "", uan: "",
    bankAccount: "", ifsc: "", bankName: "", taxRegime: "new",
    maritalStatus: "", spouseName: "", spouseDob: "", spouseAadhaar: "",
    fatherName: "", fatherDob: "", fatherAadhaar: "",
    motherName: "", motherDob: "", motherAadhaar: "",
    numberOfChildren: "0", status: "active", employeeType: "permanent",
  });

  const f = (key: string) => (e: any) => setForm(p => ({ ...p, [key]: e.target.value }));
  const s = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  // ── Auto-calculate salary breakdown from CTC + salary structure ──────────
  const [ctcAutoCalc, setCtcAutoCalc] = useState(false);
  const [calcBreakdown, setCalcBreakdown] = useState<{ name: string; formula: string; amount: number; type: 'earning' | 'deduction' }[]>([]);

  // Fetch statutory settings for PF/ESI/PT estimates in the preview
  const { data: statutory } = useQuery<any>({ queryKey: ['/api/hr/statutory-settings'] });

  // Find selected structure's component array
  const selectedStructure = useMemo(() =>
    (structures || []).find((st: any) => String(st.id) === form.salaryStructureId),
    [structures, form.salaryStructureId]
  );

  useEffect(() => {
    const ctcVal = Number(form.ctc);
    if (!ctcVal || !selectedStructure) { setCtcAutoCalc(false); setCalcBreakdown([]); return; }

    const comps: any[] = typeof selectedStructure.components === 'string'
      ? JSON.parse(selectedStructure.components)
      : (selectedStructure.components || []);

    const earnings = comps.filter((c: any) => c.type === 'earning');

    const monthlyCTC = ctcVal / 12;

    // 1. Calculate BASIC
    const basicComp = earnings.find((c: any) =>
      c.code === 'BASIC' || c.name?.toLowerCase().includes('basic')
    );
    let basic = 0;
    let basicFormula = '';
    if (basicComp) {
      if (basicComp.formula_type === 'fixed') {
        basic = Number(basicComp.formula_value || 0);
        basicFormula = `Fixed ₹${basic.toLocaleString('en-IN')}`;
      } else {
        basic = Math.round(monthlyCTC * Number(basicComp.formula_value || 0) / 100);
        basicFormula = `${basicComp.formula_value}% of Monthly CTC`;
      }
    }

    // 2. Calculate each other earning component (HRA, LTA, etc.)
    const breakdown: { name: string; formula: string; amount: number; type: 'earning' | 'deduction' }[] = [];
    if (basic > 0) {
      breakdown.push({ name: basicComp?.name || 'Basic Salary', formula: basicFormula, amount: basic, type: 'earning' });
    }

    let otherTotal = 0;
    for (const c of earnings) {
      if (c.code === 'BASIC' || c.name?.toLowerCase().includes('basic')) continue;
      if (c.code === 'SPEC' || c.name?.toLowerCase().includes('special allowance')) continue;
      let amt = 0;
      let formula = '';
      if (c.formula_type === 'percent_of_basic') {
        amt = Math.round(basic * Number(c.formula_value || 0) / 100);
        formula = `${c.formula_value}% of Basic`;
      } else if (c.formula_type === 'percentage' || c.formula_type === 'percent_of_ctc') {
        amt = Math.round(monthlyCTC * Number(c.formula_value || 0) / 100);
        formula = `${c.formula_value}% of Monthly CTC`;
      } else {
        amt = Number(c.formula_value || 0);
        formula = `Fixed ₹${amt.toLocaleString('en-IN')}`;
      }
      otherTotal += amt;
      breakdown.push({ name: c.name, formula, amount: amt, type: 'earning' });
    }

    // 3. Special Allowance = residual balancing figure
    const specialAllowance = Math.max(0, Math.round(monthlyCTC - basic - otherTotal));
    breakdown.push({ name: 'Special Allowance', formula: 'Balancing figure (CTC − all others)', amount: specialAllowance, type: 'earning' });

    // 4. Statutory deductions estimated from current settings + employee flags
    const pfEnabled  = statutory?.pf_enabled  !== false && form.pfEnabled  !== false;
    const esiEnabled = statutory?.esi_enabled !== false && form.esiEnabled !== false;
    const ptEnabled  = statutory?.pt_enabled  !== false;

    const pfRate     = Number(statutory?.pf_employee_rate  ?? 12) / 100;
    const pfCeiling  = Number(statutory?.pf_ceiling_basic  ?? 15000);
    const esiRate    = Number(statutory?.esi_employee_rate ?? 0.75) / 100;
    const esiCeiling = Number(statutory?.esi_gross_ceiling ?? 21000);

    const grossEarnings = basic + otherTotal + specialAllowance;

    if (pfEnabled) {
      const pfBase = Math.min(basic, pfCeiling);
      const pf = Math.round(pfBase * pfRate);
      breakdown.push({ name: 'PF (Employee)', formula: `${(pfRate * 100).toFixed(0)}% of Basic (≤ ₹${pfCeiling.toLocaleString('en-IN')})`, amount: pf, type: 'deduction' });
    }
    if (esiEnabled && grossEarnings <= esiCeiling) {
      const esi = Math.round(grossEarnings * esiRate);
      breakdown.push({ name: 'ESI (Employee)', formula: `${(esiRate * 100).toFixed(2)}% of Gross (Gross ≤ ₹${esiCeiling.toLocaleString('en-IN')})`, amount: esi, type: 'deduction' });
    } else if (esiEnabled && grossEarnings > esiCeiling) {
      breakdown.push({ name: 'ESI (Employee)', formula: `Not applicable — Gross > ₹${esiCeiling.toLocaleString('en-IN')}`, amount: 0, type: 'deduction' });
    }
    if (ptEnabled) {
      let pt = 0;
      if (grossEarnings > 15000) pt = 200;
      else if (grossEarnings > 10000) pt = 150;
      else if (grossEarnings > 7500) pt = 100;
      if (pt > 0) breakdown.push({ name: 'Professional Tax (PT)', formula: 'From state slab / fallback estimate', amount: pt, type: 'deduction' });
    }

    setCalcBreakdown(breakdown);
    setForm(p => ({
      ...p,
      basicSalary: basic > 0 ? String(basic) : p.basicSalary,
      specialAllowance: String(specialAllowance),
    }));
    setCtcAutoCalc(true);
  }, [form.ctc, form.salaryStructureId, form.pfEnabled, form.esiEnabled, statutory, selectedStructure]);

  const handleSave = () => {
    const payload = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      designationId: form.designationId ? Number(form.designationId) : null,
      shiftId: form.shiftId ? Number(form.shiftId) : null,
      salaryStructureId: form.salaryStructureId ? Number(form.salaryStructureId) : null,
      basicSalary: form.basicSalary ? Number(form.basicSalary) : 0,
      specialAllowance: form.specialAllowance ? Number(form.specialAllowance) : 0,
      taAmount: form.taAmount ? Number(form.taAmount) : 0,
      daAmount: form.daAmount ? Number(form.daAmount) : 0,
      ctc: form.ctc ? Number(form.ctc) : 0,
      reportingManagerId: form.reportingManagerId ? Number(form.reportingManagerId) : null,
      numberOfChildren: form.numberOfChildren ? Number(form.numberOfChildren) : 0,
      exitDate: form.exitDate || null,
      exitType: form.exitType || null,
      exitReason: form.exitReason || null,
      resignationDate: form.resignationDate || null,
    };
    onSave(payload);
  };

  const inputCls = "h-9";

  return (
    <Tabs defaultValue="personal" className="flex flex-col gap-0">
      <TabsList className="mb-4 flex-wrap h-auto gap-1">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
        <TabsTrigger value="contact">Contact & Address</TabsTrigger>
        <TabsTrigger value="statutory">Statutory & Bank</TabsTrigger>
        <TabsTrigger value="family">Family Details</TabsTrigger>
      </TabsList>

      {/* Tab 1: Personal */}
      <TabsContent value="personal" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Employee Code <span className="text-destructive">*</span></Label>
            <Input className={inputCls} value={form.empCode} onChange={f("empCode")} placeholder="EMP001" data-testid="input-emp-code" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={s("status")}>
              <SelectTrigger className={inputCls} data-testid="select-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_notice">On Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>First Name <span className="text-destructive">*</span></Label>
            <Input className={inputCls} value={form.firstName} onChange={f("firstName")} data-testid="input-first-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name</Label>
            <Input className={inputCls} value={form.lastName} onChange={f("lastName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={s("gender")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input className={inputCls} type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} />
          </div>
          <div className="space-y-1.5">
            <Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={s("bloodGroup")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number <span className="text-destructive">*</span></Label>
            <Input className={inputCls} value={form.phone} onChange={f("phone")} placeholder="9XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Alternate Phone</Label>
            <Input className={inputCls} value={form.alternatePhone} onChange={f("alternatePhone")} placeholder="9XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Email ID</Label>
            <Input className={inputCls} type="email" value={form.email} onChange={f("email")} placeholder="name@email.com" />
          </div>
        </div>
      </TabsContent>

      {/* Tab 2: Employment */}
      <TabsContent value="employment" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.departmentId} onValueChange={s("departmentId")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select dept" /></SelectTrigger>
              <SelectContent>{(depts || []).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Select value={form.designationId} onValueChange={s("designationId")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select designation" /></SelectTrigger>
              <SelectContent>{(desigs || []).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Shift</Label>
            <Select value={form.shiftId} onValueChange={s("shiftId")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>{(shifts || []).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Salary Structure</Label>
            <Select value={form.salaryStructureId} onValueChange={s("salaryStructureId")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select structure" /></SelectTrigger>
              <SelectContent>{(structures || []).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>CTC (Annual ₹)</Label>
              {ctcAutoCalc && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                  Auto-calculating below
                </span>
              )}
            </div>
            <Input
              className={inputCls} type="number" value={form.ctc}
              onChange={e => f("ctc")(e)}
              placeholder="e.g. 600000 for ₹6 LPA"
              data-testid="input-ctc"
            />
            {ctcAutoCalc && calcBreakdown.length > 0 && (() => {
              const earningRows  = calcBreakdown.filter(r => r.type === 'earning');
              const deductRows   = calcBreakdown.filter(r => r.type === 'deduction' && r.amount > 0);
              const grossTotal   = earningRows.reduce((s, r) => s + r.amount, 0);
              const deductTotal  = deductRows.reduce((s, r) => s + r.amount, 0);
              const netSalary    = grossTotal - deductTotal;
              return (
                <div className="mt-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 overflow-hidden text-xs">
                  {/* Earnings */}
                  <div className="px-3 py-1 bg-green-50 dark:bg-green-900/20 border-b border-blue-200 dark:border-blue-800">
                    <span className="font-semibold text-green-700 dark:text-green-400">Earnings — Monthly</span>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {earningRows.map((row, i) => (
                        <tr key={i} className="border-b border-blue-100 dark:border-blue-900">
                          <td className="px-3 py-1 text-foreground">{row.name}</td>
                          <td className="px-3 py-1 text-muted-foreground text-center">{row.formula}</td>
                          <td className="px-3 py-1 text-right font-medium tabular-nums text-green-700 dark:text-green-400">₹{row.amount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      <tr className="bg-green-100 dark:bg-green-900/30 font-semibold">
                        <td className="px-3 py-1.5 text-green-800 dark:text-green-200" colSpan={2}>Gross Monthly Salary</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-green-800 dark:text-green-200">₹{grossTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Deductions */}
                  {deductRows.length > 0 && <>
                    <div className="px-3 py-1 bg-red-50 dark:bg-red-900/20 border-t border-b border-blue-200 dark:border-blue-800">
                      <span className="font-semibold text-red-700 dark:text-red-400">Statutory Deductions (estimated)</span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {deductRows.map((row, i) => (
                          <tr key={i} className="border-b border-blue-100 dark:border-blue-900">
                            <td className="px-3 py-1 text-foreground">{row.name}</td>
                            <td className="px-3 py-1 text-muted-foreground text-center">{row.formula}</td>
                            <td className="px-3 py-1 text-right font-medium tabular-nums text-red-600 dark:text-red-400">−₹{row.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr className="bg-red-50 dark:bg-red-900/20 font-semibold">
                          <td className="px-3 py-1.5 text-red-800 dark:text-red-200" colSpan={2}>Total Deductions</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-red-800 dark:text-red-200">−₹{deductTotal.toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </>}

                  {/* Net */}
                  <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900/40 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center font-bold text-blue-800 dark:text-blue-200">
                    <span>Estimated Net Take-Home / Month</span>
                    <span className="tabular-nums">₹{netSalary.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="px-3 py-1.5 text-muted-foreground italic">
                    HRA, LTA and all other components are auto-calculated at payroll run time. PF/ESI/PT are based on statutory settings and employee flags above.
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>Basic Salary (₹/month)</Label>
              {ctcAutoCalc && form.basicSalary && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">Auto</span>
              )}
            </div>
            <Input
              className={inputCls} type="number" value={form.basicSalary}
              onChange={e => { setCtcAutoCalc(false); f("basicSalary")(e); }}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>Special Allowance (₹/month)</Label>
              {ctcAutoCalc && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">Auto</span>
              )}
            </div>
            <Input
              className={inputCls} type="number" value={form.specialAllowance}
              onChange={e => { setCtcAutoCalc(false); f("specialAllowance")(e); }}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Balancing figure = Monthly CTC − Basic − other structure components</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>TA Daily Rate (₹/day)</Label>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
            </div>
            <Input className={inputCls} type="number" value={form.taAmount} onChange={f("taAmount")} placeholder="0 — leave blank if not applicable" />
            <p className="text-xs text-muted-foreground">Only for employees with travel allowance outside the salary structure. Leave 0 if not applicable.</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label>DA Daily Rate (₹/day)</Label>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
            </div>
            <Input className={inputCls} type="number" value={form.daAmount} onChange={f("daAmount")} placeholder="0 — leave blank if not applicable" />
            <p className="text-xs text-muted-foreground">Only for employees with dearness allowance outside the salary structure. Leave 0 if not applicable.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Reporting Manager</Label>
            <Select
              value={form.reportingManagerId || "__none__"}
              onValueChange={v => s("reportingManagerId")(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(managers || []).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.first_name} {m.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Joining <span className="text-destructive">*</span></Label>
            <Input className={inputCls} type="date" value={form.joinDate} onChange={f("joinDate")} data-testid="input-join-date" />
          </div>
          <div className="space-y-1.5">
            <Label>Employee Type</Label>
            <Select value={form.employeeType} onValueChange={s("employeeType")}>
              <SelectTrigger className={inputCls} data-testid="select-employee-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />
        <p className="text-sm font-medium text-muted-foreground">Exit Details (fill only if applicable)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Resignation Date</Label>
            <Input className={inputCls} type="date" value={form.resignationDate} onChange={f("resignationDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Last Working Date</Label>
            <Input className={inputCls} type="date" value={form.exitDate} onChange={f("exitDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Exit Type</Label>
            <Select value={form.exitType} onValueChange={s("exitType")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{EXIT_TYPES.map(t => <SelectItem key={t} value={t.toLowerCase().replace(/ /g, "_")}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Exit Reason</Label>
            <Textarea value={form.exitReason} onChange={f("exitReason")} placeholder="Reason for leaving..." className="min-h-[60px]" />
          </div>
        </div>
      </TabsContent>

      {/* Tab 3: Contact & Address */}
      <TabsContent value="contact" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={f("address")} placeholder="Street address..." className="min-h-[70px]" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input className={inputCls} value={form.city} onChange={f("city")} placeholder="City" />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={form.state} onValueChange={s("state")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{INDIAN_STATES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pincode</Label>
            <Input className={inputCls} value={form.pincode} onChange={f("pincode")} placeholder="400001" maxLength={6} />
          </div>
        </div>

        <Separator />
        <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Contact Name</Label>
            <Input className={inputCls} value={form.emergencyContactName} onChange={f("emergencyContactName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Relationship</Label>
            <Input className={inputCls} value={form.emergencyContactRelation} onChange={f("emergencyContactRelation")} placeholder="e.g. Spouse, Parent" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input className={inputCls} value={form.emergencyContact} onChange={f("emergencyContact")} placeholder="9XXXXXXXXX" />
          </div>
        </div>
      </TabsContent>

      {/* Tab 4: Statutory & Bank */}
      <TabsContent value="statutory" className="space-y-4 mt-0">
        <p className="text-sm font-medium text-muted-foreground">Identity & Statutory</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>PAN Number</Label>
            <Input className={inputCls} value={form.pan} onChange={f("pan")} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div className="space-y-1.5">
            <Label>Aadhaar Number</Label>
            <Input className={inputCls} value={form.aadhaar} onChange={f("aadhaar")} placeholder="XXXX XXXX XXXX" maxLength={14} />
          </div>
          <div className="space-y-1.5">
            <Label>PF Number</Label>
            <div className="flex items-center gap-2">
              <Input className={`${inputCls} flex-1`} value={form.pfNumber} onChange={f("pfNumber")} disabled={!form.pfEnabled} />
              <button
                type="button"
                data-testid="toggle-pf-enabled"
                onClick={() => setForm(p => ({ ...p, pfEnabled: !p.pfEnabled }))}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.pfEnabled ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.pfEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-muted-foreground w-12">{form.pfEnabled ? "Active" : "Exempt"}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>UAN</Label>
            <Input className={inputCls} value={form.uan} onChange={f("uan")} placeholder="Universal Account Number" />
          </div>
          <div className="space-y-1.5">
            <Label>ESI Number</Label>
            <div className="flex items-center gap-2">
              <Input className={`${inputCls} flex-1`} value={form.esiNumber} onChange={f("esiNumber")} disabled={!form.esiEnabled} />
              <button
                type="button"
                data-testid="toggle-esi-enabled"
                onClick={() => setForm(p => ({ ...p, esiEnabled: !p.esiEnabled }))}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.esiEnabled ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.esiEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-muted-foreground w-12">{form.esiEnabled ? "Active" : "Exempt"}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tax Regime</Label>
            <Select value={form.taxRegime} onValueChange={s("taxRegime")}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Regime</SelectItem>
                <SelectItem value="old">Old Regime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />
        <p className="text-sm font-medium text-muted-foreground">Bank Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Bank Name</Label>
            <Input className={inputCls} value={form.bankName} onChange={f("bankName")} placeholder="State Bank of India" />
          </div>
          <div className="space-y-1.5">
            <Label>Account Number</Label>
            <Input className={inputCls} value={form.bankAccount} onChange={f("bankAccount")} />
          </div>
          <div className="space-y-1.5">
            <Label>IFSC Code</Label>
            <Input className={inputCls} value={form.ifsc} onChange={f("ifsc")} placeholder="SBIN0000001" />
          </div>
        </div>
      </TabsContent>

      {/* Tab 5: Family Details */}
      <TabsContent value="family" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Marital Status</Label>
            <Select value={form.maritalStatus} onValueChange={s("maritalStatus")}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{MARITAL_STATUS.map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Number of Children</Label>
            <Input className={inputCls} type="number" min="0" value={form.numberOfChildren} onChange={f("numberOfChildren")} />
          </div>
        </div>

        {(form.maritalStatus === "married") && (
          <>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Spouse Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Spouse Name</Label>
                <Input className={inputCls} value={form.spouseName} onChange={f("spouseName")} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input className={inputCls} type="date" value={form.spouseDob} onChange={f("spouseDob")} />
              </div>
              <div className="space-y-1.5">
                <Label>Aadhaar Number</Label>
                <Input className={inputCls} value={form.spouseAadhaar} onChange={f("spouseAadhaar")} placeholder="XXXX XXXX XXXX" />
              </div>
            </div>
          </>
        )}

        <Separator />
        <p className="text-sm font-medium text-muted-foreground">Father's Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Father's Name</Label>
            <Input className={inputCls} value={form.fatherName} onChange={f("fatherName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input className={inputCls} type="date" value={form.fatherDob} onChange={f("fatherDob")} />
          </div>
          <div className="space-y-1.5">
            <Label>Aadhaar Number</Label>
            <Input className={inputCls} value={form.fatherAadhaar} onChange={f("fatherAadhaar")} placeholder="XXXX XXXX XXXX" />
          </div>
        </div>

        <Separator />
        <p className="text-sm font-medium text-muted-foreground">Mother's Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Mother's Name</Label>
            <Input className={inputCls} value={form.motherName} onChange={f("motherName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input className={inputCls} type="date" value={form.motherDob} onChange={f("motherDob")} />
          </div>
          <div className="space-y-1.5">
            <Label>Aadhaar Number</Label>
            <Input className={inputCls} value={form.motherAadhaar} onChange={f("motherAadhaar")} placeholder="XXXX XXXX XXXX" />
          </div>
        </div>
      </TabsContent>

      {/* Custom Fields for employee */}
      <CustomFieldsSection
        entityType="employee"
        entityId={editing?.id ?? null}
      />

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} data-testid="btn-save-employee">Save Employee</Button>
      </div>
    </Tabs>
  );
}

// ── Document Upload & Management ──────────────────────────────────────────────
function DocumentsPanel({ emp }: { emp: any }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("Offer Letter");
  const [docNotes, setDocNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/employees", emp.id, "documents"],
    queryFn: async () => {
      const r = await fetch(`/api/hr/employees/${emp.id}`, { credentials: "include" });
      const d = await r.json();
      return d.documents || [];
    }
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", docType);
      fd.append("notes", docNotes);
      const r = await fetch(`/api/hr/employees/${emp.id}/documents`, {
        method: "POST", body: fd, credentials: "include"
      });
      if (!r.ok) throw new Error("Upload failed");
      toast({ title: "Document uploaded" });
      setDocNotes("");
      refetch();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const delDoc = useMutation({
    mutationFn: (docId: number) => apiRequest("DELETE", `/api/hr/employees/${emp.id}/documents/${docId}`),
    onSuccess: () => { refetch(); toast({ title: "Document removed" }); }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Upload Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input className="h-9" value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="Any remarks..." />
            </div>
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ""; }}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="btn-upload-document">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? "Uploading..." : "Choose & Upload File"}
          </Button>
          <p className="text-xs text-muted-foreground">Supports: PDF, JPG, PNG, DOC, DOCX (max 20 MB)</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet</p>
        ) : docs.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30" data-testid={`card-document-${doc.id}`}>
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{doc.document_type}</p>
                <p className="text-xs text-muted-foreground truncate">{doc.file_name} {doc.notes ? `• ${doc.notes}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" title="View" onClick={() => window.open(`/${doc.file_path}`, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" title="Delete" onClick={() => delDoc.mutate(doc.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Salary Revision Panel ─────────────────────────────────────────────────────
function SalaryRevisionPanel({ emp }: { emp: any }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    effectiveDate: "", newBasic: "", newCtc: "", revisionType: "increment", reason: "", approvedBy: ""
  });

  const { data: revisions = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/salary-revisions", emp.id],
    queryFn: async () => {
      const r = await fetch(`/api/hr/salary-revisions?employeeId=${emp.id}`, { credentials: "include" });
      return r.json();
    }
  });

  const addRevision = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/hr/salary-revisions", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-revisions", emp.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Salary revision recorded" });
      setShowAdd(false);
      setForm({ effectiveDate: "", newBasic: "", newCtc: "", revisionType: "increment", reason: "", approvedBy: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const delRevision = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/salary-revisions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/salary-revisions", emp.id] })
  });

  const handleAdd = () => {
    if (!form.effectiveDate || !form.newBasic || !form.newCtc) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    addRevision.mutate({
      employeeId: emp.id,
      effectiveDate: form.effectiveDate,
      oldBasic: emp.basic_salary || 0,
      newBasic: Number(form.newBasic),
      oldCtc: emp.ctc || 0,
      newCtc: Number(form.newCtc),
      revisionType: form.revisionType,
      reason: form.reason,
      approvedBy: form.approvedBy,
    });
  };

  const fmt = (n: any) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
  const pct = (o: any, n: any) => {
    if (!o || !n || Number(o) === 0) return "";
    const diff = ((Number(n) - Number(o)) / Number(o)) * 100;
    return ` (${diff > 0 ? "+" : ""}${diff.toFixed(1)}%)`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Current Basic: <span className="font-medium text-foreground">{fmt(emp.basic_salary)}</span></p>
          <p className="text-sm text-muted-foreground">Current CTC: <span className="font-medium text-foreground">{fmt(emp.ctc)}</span></p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(v => !v)} data-testid="btn-add-revision">
          <Plus className="h-3.5 w-3.5 mr-1.5" />New Revision
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Effective Date <span className="text-destructive">*</span></Label>
                <Input className="h-9" type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Revision Type</Label>
                <Select value={form.revisionType} onValueChange={v => setForm(p => ({ ...p, revisionType: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{REVISION_TYPES.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>New Basic Salary (₹) <span className="text-destructive">*</span></Label>
                <Input className="h-9" type="number" value={form.newBasic} onChange={e => setForm(p => ({ ...p, newBasic: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>New CTC (₹) <span className="text-destructive">*</span></Label>
                <Input className="h-9" type="number" value={form.newCtc} onChange={e => setForm(p => ({ ...p, newCtc: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Approved By</Label>
                <Input className="h-9" value={form.approvedBy} onChange={e => setForm(p => ({ ...p, approvedBy: e.target.value }))} placeholder="Manager name" />
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input className="h-9" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Annual increment, promotion..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={addRevision.isPending}>Save Revision</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No salary revisions recorded</p>
        ) : revisions.map((rev: any) => (
          <div key={rev.id} className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`card-revision-${rev.id}`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{rev.revision_type} — {rev.effective_date}</p>
                <p className="text-xs text-muted-foreground">
                  Basic: {fmt(rev.old_basic)} → {fmt(rev.new_basic)}{pct(rev.old_basic, rev.new_basic)}
                  {" | "}CTC: {fmt(rev.old_ctc)} → {fmt(rev.new_ctc)}{pct(rev.old_ctc, rev.new_ctc)}
                </p>
                {rev.reason && <p className="text-xs text-muted-foreground mt-0.5">{rev.reason}{rev.approved_by ? ` • Approved by: ${rev.approved_by}` : ""}</p>}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => delRevision.mutate(rev.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Employee Detail View ──────────────────────────────────────────────────────
function EmployeeDetail({ emp, onBack, onEdit }: any) {
  const [tab, setTab] = useState("overview");
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    const fd = new FormData(); fd.append("photo", file);
    await fetch(`/api/hr/employees/${emp.id}/photo`, { method: "POST", body: fd, credentials: "include" });
    queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    toast({ title: "Photo updated" });
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex justify-between text-sm py-1.5 border-b last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-right max-w-[60%] break-words">{value}</span>
      </div>
    ) : null;

  const fmt = (n: any) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex items-center gap-3 flex-1">
          <input ref={photoInputRef} type="file" className="hidden" accept="image/*"
            onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); e.target.value = ""; }} />
          <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()} title="Click to upload photo">
            <Avatar className="h-12 w-12">
              <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
              <AvatarFallback className="text-sm">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <p className="font-semibold">{emp.first_name} {emp.last_name}</p>
            <p className="text-sm text-muted-foreground">{emp.emp_code} · {emp.designation_name || "—"} · {emp.department_name || "—"}</p>
            <p className="text-xs text-muted-foreground">Click photo to change</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {emp.employee_type && emp.employee_type !== "permanent" && (
            <Badge variant="outline" className="capitalize">{emp.employee_type}</Badge>
          )}
          <Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize">{emp.status}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="statutory">Statutory</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="salary-history">Salary History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Employment</p>
              <InfoRow label="Join Date" value={emp.join_date} />
              <InfoRow label="Department" value={emp.department_name} />
              <InfoRow label="Designation" value={emp.designation_name} />
              <InfoRow label="Shift" value={emp.shift_name} />
              <InfoRow label="Reporting Manager" value={emp.reporting_manager_name} />
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Compensation</p>
              <InfoRow label="Basic Salary" value={fmt(emp.basic_salary)} />
              {Number(emp.special_allowance) > 0 && <InfoRow label="Special Allowance" value={fmt(emp.special_allowance)} />}
              {Number(emp.ta_amount) > 0 && <InfoRow label="TA Daily Rate" value={`₹${fmt(emp.ta_amount)}/day`} />}
              {Number(emp.da_amount) > 0 && <InfoRow label="DA Daily Rate" value={`₹${fmt(emp.da_amount)}/day`} />}
              <InfoRow label="CTC" value={fmt(emp.ctc)} />
              <InfoRow label="Salary Structure" value={emp.salary_structure_name} />
              <InfoRow label="Tax Regime" value={emp.tax_regime === "new" ? "New Regime" : "Old Regime"} />
            </CardContent></Card>
          </div>
          {(emp.exit_date || emp.exit_type) && (
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Exit Details</p>
              <InfoRow label="Resignation Date" value={emp.resignation_date} />
              <InfoRow label="Last Working Date" value={emp.exit_date} />
              <InfoRow label="Exit Type" value={emp.exit_type} />
              <InfoRow label="Exit Reason" value={emp.exit_reason} />
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Contact</p>
              <InfoRow label="Phone" value={emp.phone} />
              <InfoRow label="Alternate Phone" value={emp.alternate_phone} />
              <InfoRow label="Email" value={emp.email} />
              <InfoRow label="Date of Birth" value={emp.date_of_birth} />
              <InfoRow label="Blood Group" value={emp.blood_group} />
              <InfoRow label="Gender" value={emp.gender} />
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Address</p>
              <InfoRow label="Address" value={emp.address} />
              <InfoRow label="City" value={emp.city} />
              <InfoRow label="State" value={emp.state} />
              <InfoRow label="Pincode" value={emp.pincode} />
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Emergency Contact</p>
              <InfoRow label="Name" value={emp.emergency_contact_name} />
              <InfoRow label="Relationship" value={emp.emergency_contact_relation} />
              <InfoRow label="Phone" value={emp.emergency_contact} />
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="statutory" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identity</p>
              <InfoRow label="PAN Number" value={emp.pan} />
              <InfoRow label="Aadhaar Number" value={emp.aadhaar} />
              <InfoRow label="PF" value={emp.pf_enabled === false ? "Exempt" : `Active${emp.pf_number ? ` — ${emp.pf_number}` : ""}`} />
              <InfoRow label="UAN" value={emp.uan} />
              <InfoRow label="ESI" value={emp.esi_enabled === false ? "Exempt" : `Active${emp.esi_number ? ` — ${emp.esi_number}` : ""}`} />
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bank Details</p>
              <InfoRow label="Bank Name" value={emp.bank_name} />
              <InfoRow label="Account Number" value={emp.bank_account} />
              <InfoRow label="IFSC Code" value={emp.ifsc} />
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="family" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">General</p>
              <InfoRow label="Marital Status" value={emp.marital_status} />
              <InfoRow label="No. of Children" value={emp.number_of_children != null ? String(emp.number_of_children) : null} />
            </CardContent></Card>
            {emp.spouse_name && (
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Spouse</p>
                <InfoRow label="Name" value={emp.spouse_name} />
                <InfoRow label="Date of Birth" value={emp.spouse_dob} />
                <InfoRow label="Aadhaar" value={emp.spouse_aadhaar} />
              </CardContent></Card>
            )}
            {emp.father_name && (
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Father</p>
                <InfoRow label="Name" value={emp.father_name} />
                <InfoRow label="Date of Birth" value={emp.father_dob} />
                <InfoRow label="Aadhaar" value={emp.father_aadhaar} />
              </CardContent></Card>
            )}
            {emp.mother_name && (
              <Card><CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mother</p>
                <InfoRow label="Name" value={emp.mother_name} />
                <InfoRow label="Date of Birth" value={emp.mother_dob} />
                <InfoRow label="Aadhaar" value={emp.mother_aadhaar} />
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel emp={emp} />
        </TabsContent>

        <TabsContent value="salary-history" className="mt-4">
          <SalaryRevisionPanel emp={emp} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HrEmployees() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewingEmp, setViewingEmp] = useState<any>(null);
  const [essPasswordEmp, setEssPasswordEmp] = useState<any>(null);
  const [essPassword, setEssPassword] = useState("");
  const [essPasswordConfirm, setEssPasswordConfirm] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { data: employees = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });
  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });
  const { data: desigs = [] } = useQuery<any[]>({ queryKey: ["/api/hr/designations"] });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/shifts"] });
  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/hr/salary-structures"] });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing
      ? apiRequest("PUT", `/api/hr/employees/${editing.id}`, payload)
      : apiRequest("POST", "/api/hr/employees", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: editing ? "Employee updated" : "Employee added" });
      setShowForm(false); setEditing(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/employees/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] }); toast({ title: "Employee removed" }); }
  });

  const setEssMutation = useMutation({
    mutationFn: ({ employeeId, password }: { employeeId: number; password: string }) =>
      fetch("/api/ess/admin/set-password", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      }).then(r => r.json().then(d => { if (!r.ok) throw new Error(d.message); return d; })),
    onSuccess: () => {
      toast({ title: "ESS password set", description: "Employee can now log into the ESS portal." });
      setEssPasswordEmp(null); setEssPassword(""); setEssPasswordConfirm("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch("/api/hr/employees/bulk-upload", {
        method: "POST", credentials: "include", body: formData,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Upload failed");
      return d as { created: number; errors: { row: number; reason: string }[] };
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  function handleDownloadTemplate() {
    const a = document.createElement("a");
    a.href = "/api/hr/employees/template";
    a.download = "employee_upload_template.xlsx";
    a.click();
  }

  function handleUploadSubmit() {
    if (!uploadFile) return;
    setUploadResult(null);
    bulkUploadMutation.mutate(uploadFile);
  }

  const managers = employees.filter((e: any) => e.status === "active");

  const filtered = employees.filter((e: any) => {
    const matchSearch = !search ||
      `${e.first_name} ${e.last_name} ${e.emp_code}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchDept = deptFilter === "all" || String(e.department_id) === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  // summary stats
  const activeCount = employees.filter((e: any) => e.status === "active").length;
  const inactiveCount = employees.filter((e: any) => e.status !== "active").length;

  if (viewingEmp) {
    return (
      <div className="p-4 md:p-6">
        <EmployeeDetail
          emp={viewingEmp}
          onBack={() => setViewingEmp(null)}
          onEdit={() => { setEditing(viewingEmp); setShowForm(true); setViewingEmp(null); }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{activeCount} active · {inactiveCount} inactive</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadTemplate} data-testid="btn-download-template">
            <Download className="h-4 w-4 mr-1.5" />Template
          </Button>
          <Button variant="outline" onClick={() => { setUploadFile(null); setUploadResult(null); setShowUploadDialog(true); }} data-testid="btn-bulk-upload">
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Bulk Upload
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="btn-add-employee">
            <Plus className="h-4 w-4 mr-1.5" />Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-employee" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_notice">On Notice</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="h-9 w-44" data-testid="select-dept-filter"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading employees...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No employees found</p>
          <Button className="mt-3" onClick={() => setShowForm(true)}>Add your first employee</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Designation</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Join Date</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => (
                <tr key={emp.id} className="border-t hover-elevate cursor-pointer" onClick={() => setViewingEmp(emp)} data-testid={`row-employee-${emp.id}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
                        <AvatarFallback className="text-xs">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.emp_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{emp.department_name || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{emp.designation_name || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{emp.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{emp.join_date || "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {emp.employee_type && emp.employee_type !== "permanent" && (
                        <Badge variant="outline" className="capitalize">{emp.employee_type}</Badge>
                      )}
                      <Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize">{emp.status?.replace("_", " ")}</Badge>
                    </div>
                  </td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setViewingEmp(emp)} data-testid={`btn-view-employee-${emp.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1" />View
                      </Button>
                      <Button size="icon" variant="ghost" title="Edit employee" onClick={() => { setEditing(emp); setShowForm(true); }} data-testid={`btn-edit-employee-${emp.id}`}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Set ESS Password" onClick={() => { setEssPasswordEmp(emp); setEssPassword(""); setEssPasswordConfirm(""); }} data-testid={`btn-ess-password-${emp.id}`}>
                        <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(emp.id)} data-testid={`btn-delete-employee-${emp.id}`}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            editing={editing}
            depts={depts}
            desigs={desigs}
            shifts={shifts}
            structures={structures}
            managers={managers}
            onSave={(p: any) => saveMutation.mutate(p)}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* ESS Password Dialog */}
      <Dialog open={!!essPasswordEmp} onOpenChange={v => { if (!v) { setEssPasswordEmp(null); setEssPassword(""); setEssPasswordConfirm(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set ESS Portal Password</DialogTitle>
          </DialogHeader>
          {essPasswordEmp && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set portal login credentials for <span className="font-medium">{essPasswordEmp.first_name} {essPasswordEmp.last_name}</span> ({essPasswordEmp.emp_code}).
                They will use their employee code + this password to log into the ESS portal.
              </p>
              <div className="space-y-1.5">
                <Label>New Password <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  className="h-9"
                  placeholder="Minimum 6 characters"
                  value={essPassword}
                  onChange={e => setEssPassword(e.target.value)}
                  data-testid="input-ess-set-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Password <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  className="h-9"
                  placeholder="Re-enter password"
                  value={essPasswordConfirm}
                  onChange={e => setEssPasswordConfirm(e.target.value)}
                  data-testid="input-ess-confirm-password"
                />
              </div>
              {essPassword && essPasswordConfirm && essPassword !== essPasswordConfirm && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEssPasswordEmp(null)}>Cancel</Button>
                <Button
                  onClick={() => setEssMutation.mutate({ employeeId: essPasswordEmp.id, password: essPassword })}
                  disabled={setEssMutation.isPending || !essPassword || essPassword.length < 6 || essPassword !== essPasswordConfirm}
                  data-testid="btn-ess-save-password"
                >
                  {setEssMutation.isPending ? "Setting..." : "Set Password & Enable"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={open => { setShowUploadDialog(open); if (!open) { setUploadFile(null); setUploadResult(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Employees</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!uploadResult ? (
              <>
                <div className="rounded-md border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How it works</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Download the template — it includes all column headers, notes, and an example row.</li>
                    <li>Fill your data from <strong className="text-foreground">Row 3</strong> onwards. Rows 1 &amp; 2 are headers/notes.</li>
                    <li><strong className="text-foreground">Dates</strong> (join_date, date_of_birth): type as <code className="bg-muted px-1 rounded text-xs">YYYY-MM-DD</code> or <code className="bg-muted px-1 rounded text-xs">DD/MM/YYYY</code>.</li>
                    <li><strong className="text-foreground">Department &amp; designation names</strong> must match exactly what is in the system.</li>
                    <li>Required fields: emp_code, first_name, join_date. All others are optional.</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label>Select Excel File (.xlsx)</Label>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    data-testid="input-bulk-upload-file"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover-elevate"
                    onClick={() => uploadInputRef.current?.click()}
                    data-testid="dropzone-bulk-upload"
                  >
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <span className="font-medium">{uploadFile.name}</span>
                        <span className="text-muted-foreground">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to select an Excel file</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                  <Button
                    onClick={handleUploadSubmit}
                    disabled={!uploadFile || bulkUploadMutation.isPending}
                    data-testid="btn-bulk-upload-submit"
                  >
                    {bulkUploadMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {uploadResult.created > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="font-medium text-green-800 dark:text-green-400">{uploadResult.created} employee{uploadResult.created !== 1 ? "s" : ""} created successfully</span>
                    </div>
                  )}
                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {uploadResult.errors.length} row{uploadResult.errors.length !== 1 ? "s" : ""} had errors
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm">
                        {uploadResult.errors.map((err, i) => (
                          <div key={i} className="flex gap-3 px-3 py-2">
                            <span className="text-muted-foreground shrink-0">Row {err.row}</span>
                            <span className="text-destructive">{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {uploadResult.created === 0 && uploadResult.errors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No data rows found in the file.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setUploadFile(null); setUploadResult(null); }}>Upload Another</Button>
                  <Button onClick={() => setShowUploadDialog(false)}>Done</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
