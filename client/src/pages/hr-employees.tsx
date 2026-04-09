import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Upload, FileText, Trash2, Camera, Eye, Download, ArrowLeft } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DOCUMENT_TYPES = ["Offer Letter", "Appointment Letter", "ID Proof", "Address Proof", "PAN Card", "Aadhaar", "Educational Certificate", "Experience Letter", "Relieving Letter", "Other"];

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
    ctc: String(editing.ctc || ""),
    joinDate: editing.join_date || "",
    reportingManagerId: String(editing.reporting_manager_id || ""),
    phone: editing.phone || "",
    email: editing.email || "",
    address: editing.address || "",
    emergencyContact: editing.emergency_contact || "",
    pan: editing.pan || "",
    aadhaar: editing.aadhaar || "",
    pfNumber: editing.pf_number || "",
    esiNumber: editing.esi_number || "",
    uan: editing.uan || "",
    bankAccount: editing.bank_account || "",
    ifsc: editing.ifsc || "",
    bankName: editing.bank_name || "",
    taxRegime: editing.tax_regime || "new",
    status: editing.status || "active",
  } : {
    empCode: "", firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "",
    departmentId: "", designationId: "", shiftId: "", salaryStructureId: "",
    basicSalary: "", ctc: "", joinDate: "", reportingManagerId: "", phone: "", email: "",
    address: "", emergencyContact: "", pan: "", aadhaar: "", pfNumber: "", esiNumber: "",
    uan: "", bankAccount: "", ifsc: "", bankName: "", taxRegime: "new", status: "active",
  });

  const f = (key: string) => (e: any) => setForm(p => ({ ...p, [key]: e.target.value }));
  const s = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  const handleSave = () => {
    const payload = {
      ...form,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      designationId: form.designationId ? Number(form.designationId) : null,
      shiftId: form.shiftId ? Number(form.shiftId) : null,
      salaryStructureId: form.salaryStructureId ? Number(form.salaryStructureId) : null,
      basicSalary: form.basicSalary ? Number(form.basicSalary) : 0,
      ctc: form.ctc ? Number(form.ctc) : 0,
      reportingManagerId: form.reportingManagerId ? Number(form.reportingManagerId) : null,
    };
    onSave(payload);
  };

  return (
    <Tabs defaultValue="personal">
      <TabsList className="mb-4">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
        <TabsTrigger value="statutory">Statutory & Bank</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Employee Code *</Label><Input value={form.empCode} onChange={f("empCode")} placeholder="EMP001" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={s("status")}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on_notice">On Notice</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>First Name *</Label><Input value={form.firstName} onChange={f("firstName")} /></div>
          <div><Label>Last Name</Label><Input value={form.lastName} onChange={f("lastName")} /></div>
          <div><Label>Gender</Label>
            <Select value={form.gender} onValueChange={s("gender")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} /></div>
          <div><Label>Blood Group</Label>
            <Select value={form.bloodGroup} onValueChange={s("bloodGroup")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={f("phone")} /></div>
        </div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={f("email")} /></div>
        <div><Label>Address</Label><Textarea value={form.address} onChange={f("address")} rows={2} /></div>
        <div><Label>Emergency Contact</Label><Input value={form.emergencyContact} onChange={f("emergencyContact")} /></div>
      </TabsContent>

      <TabsContent value="employment" className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Join Date *</Label><Input type="date" value={form.joinDate} onChange={f("joinDate")} /></div>
          <div><Label>Department</Label>
            <Select value={form.departmentId} onValueChange={s("departmentId")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Designation</Label>
            <Select value={form.designationId} onValueChange={s("designationId")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{desigs.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Shift</Label>
            <Select value={form.shiftId} onValueChange={s("shiftId")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{shifts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Reporting Manager</Label>
            <Select value={form.reportingManagerId} onValueChange={s("reportingManagerId")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{managers.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tax Regime</Label>
            <Select value={form.taxRegime} onValueChange={s("taxRegime")}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="new">New Regime</SelectItem><SelectItem value="old">Old Regime</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Salary Structure</Label>
          <Select value={form.salaryStructureId} onValueChange={s("salaryStructureId")}><SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
            <SelectContent>{structures.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Basic Salary (₹)</Label><Input type="number" value={form.basicSalary} onChange={f("basicSalary")} /></div>
          <div><Label>CTC (₹/month)</Label><Input type="number" value={form.ctc} onChange={f("ctc")} /></div>
        </div>
      </TabsContent>

      <TabsContent value="statutory" className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>PAN</Label><Input value={form.pan} onChange={f("pan")} placeholder="ABCDE1234F" /></div>
          <div><Label>Aadhaar</Label><Input value={form.aadhaar} onChange={f("aadhaar")} placeholder="XXXX XXXX XXXX" /></div>
          <div><Label>PF Number</Label><Input value={form.pfNumber} onChange={f("pfNumber")} /></div>
          <div><Label>ESI Number</Label><Input value={form.esiNumber} onChange={f("esiNumber")} /></div>
          <div><Label>UAN</Label><Input value={form.uan} onChange={f("uan")} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Bank Account</Label><Input value={form.bankAccount} onChange={f("bankAccount")} /></div>
          <div><Label>IFSC Code</Label><Input value={form.ifsc} onChange={f("ifsc")} placeholder="SBIN0001234" /></div>
          <div className="col-span-2"><Label>Bank Name</Label><Input value={form.bankName} onChange={f("bankName")} /></div>
        </div>
      </TabsContent>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button className="flex-1" onClick={handleSave} disabled={!form.empCode || !form.firstName || !form.joinDate}>Save Employee</Button>
      </div>
    </Tabs>
  );
}

function EmployeeDetail({ emp, onBack }: { emp: any; onBack: () => void }) {
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("Offer Letter");
  const [docNotes, setDocNotes] = useState("");
  const [uploadDocOpen, setUploadDocOpen] = useState(false);

  const { data: payslips = [] } = useQuery({ queryKey: ["/api/hr/employees", emp.id, "payslips"], queryFn: () => fetch(`/api/hr/employees/${emp.id}/payslips`, { credentials: "include" }).then(r => r.json()) });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("photo", file);
      const r = await fetch(`/api/hr/employees/${emp.id}/photo`, { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] }); toast({ title: "Photo updated" }); },
    onError: () => toast({ title: "Error", description: "Photo upload failed", variant: "destructive" }),
  });

  const docMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append("file", file); fd.append("documentType", docType); fd.append("notes", docNotes);
      const r = await fetch(`/api/hr/employees/${emp.id}/documents`, { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/employees", emp.id] }); setUploadDocOpen(false); setDocNotes(""); toast({ title: "Document uploaded" }); },
    onError: () => toast({ title: "Error", description: "Document upload failed", variant: "destructive" }),
  });

  const delDoc = useMutation({
    mutationFn: (docId: number) => apiRequest("DELETE", `/api/hr/employees/${emp.id}/documents/${docId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/employees", emp.id] }),
  });

  const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = (n: number) => n?.toLocaleString("en-IN") ?? "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-lg font-semibold">{emp.first_name} {emp.last_name}</h2>
          <p className="text-sm text-muted-foreground">{emp.emp_code} · {emp.designation_name || "—"} · {emp.department_name || "—"}</p>
        </div>
        <Badge variant={emp.status === "active" ? "default" : "secondary"} className="ml-auto capitalize">{emp.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Photo Card */}
        <Card>
          <CardContent className="pt-4 flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
                <AvatarFallback className="text-2xl">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) photoMutation.mutate(e.target.files[0]); }} />
            <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={photoMutation.isPending} data-testid="btn-upload-photo">
              <Camera className="h-3.5 w-3.5 mr-1" />{photoMutation.isPending ? "Uploading..." : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">JPG, PNG up to 5MB</p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Employee Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Phone", emp.phone], ["Email", emp.email],
                ["Join Date", emp.join_date], ["Blood Group", emp.blood_group],
                ["PAN", emp.pan], ["PF Number", emp.pf_number],
                ["ESI Number", emp.esi_number], ["UAN", emp.uan],
                ["Bank", emp.bank_name], ["Account", emp.bank_account],
                ["IFSC", emp.ifsc], ["Tax Regime", emp.tax_regime === "new" ? "New Regime" : "Old Regime"],
                ["Basic Salary", emp.basic_salary ? `₹${fmt(emp.basic_salary)}` : "—"], ["CTC", emp.ctc ? `₹${fmt(emp.ctc)}/month` : "—"],
              ].map(([k, v]) => v ? (<><dt key={k} className="text-muted-foreground">{k}</dt><dd key={`${k}v`} className="font-medium">{v}</dd></>) : null)}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Documents</CardTitle>
            <Button size="sm" onClick={() => setUploadDocOpen(true)} data-testid="btn-add-document">
              <Upload className="h-3.5 w-3.5 mr-1" />Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!emp.documents || emp.documents.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {emp.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 rounded-md border">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{doc.document_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                    {doc.notes && <p className="text-xs text-muted-foreground">{doc.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" asChild><a href={`/${doc.file_path}`} target="_blank" rel="noopener noreferrer" download><Download className="h-3.5 w-3.5" /></a></Button>
                    <Button size="icon" variant="ghost" onClick={() => delDoc.mutate(doc.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip History */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Payslip History</CardTitle></CardHeader>
        <CardContent>
          {(payslips as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payslips generated yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Month</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Deductions</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net Pay</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(payslips as any[]).map((ps: any) => (
                    <tr key={ps.id} className="border-t">
                      <td className="px-3 py-2">{MONTHS[ps.month]} {ps.year}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(ps.gross_salary)}</td>
                      <td className="px-3 py-2 text-right">₹{fmt(ps.total_deductions)}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(ps.net_salary)}</td>
                      <td className="px-3 py-2 text-center"><Badge variant={ps.status === "locked" ? "default" : "secondary"} className="capitalize">{ps.status}</Badge></td>
                      <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => window.open(`/hr/payslip/${ps.id}`, "_blank")}><Eye className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes (optional)</Label><Input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="e.g. Original copy, 2024-25" /></div>
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={e => { if (e.target.files?.[0]) docMutation.mutate(e.target.files[0]); }} />
            <Button className="w-full" onClick={() => docInputRef.current?.click()} disabled={docMutation.isPending} data-testid="btn-select-file">
              <Upload className="h-4 w-4 mr-2" />{docMutation.isPending ? "Uploading..." : "Select File & Upload"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">PDF, DOC, JPG, PNG up to 20MB</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HREmployeesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewingEmp, setViewingEmp] = useState<any>(null);

  const { data: employees = [], isLoading } = useQuery({ queryKey: ["/api/hr/employees"] });
  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });
  const { data: desigs = [] } = useQuery<any[]>({ queryKey: ["/api/hr/designations"] });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/shifts"] });
  const { data: structures = [] } = useQuery<any[]>({ queryKey: ["/api/hr/salary-structures"] });

  const save = useMutation({
    mutationFn: (d: any) => apiRequest(editing ? "PUT" : "POST", editing ? `/api/hr/employees/${editing.id}` : "/api/hr/employees", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] }); setShowForm(false); setEditing(null); toast({ title: editing ? "Employee updated" : "Employee added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/employees/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] }); toast({ title: "Employee removed" }); },
  });

  // Fetch full employee detail when viewing
  const { data: empDetail } = useQuery({
    queryKey: ["/api/hr/employees", viewingEmp?.id],
    queryFn: () => viewingEmp ? fetch(`/api/hr/employees/${viewingEmp.id}`, { credentials: "include" }).then(r => r.json()) : null,
    enabled: !!viewingEmp,
  });

  const filtered = (employees as any[]).filter((e: any) =>
    `${e.first_name} ${e.last_name} ${e.emp_code} ${e.department_name || ""} ${e.designation_name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  if (viewingEmp && empDetail) {
    return (
      <div className="p-4">
        <EmployeeDetail emp={empDetail} onBack={() => setViewingEmp(null)} />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="p-4 max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditing(null); }}><ArrowLeft className="h-4 w-4" /></Button>
          <h2 className="text-lg font-semibold">{editing ? "Edit Employee" : "Add New Employee"}</h2>
        </div>
        <Card><CardContent className="pt-4">
          <EmployeeForm editing={editing} depts={depts} desigs={desigs} shifts={shifts} structures={structures} managers={employees as any[]}
            onSave={(d: any) => save.mutate(d)}
            onCancel={() => { setShowForm(false); setEditing(null); }} />
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{(employees as any[]).length} total employees</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} data-testid="btn-add-employee"><Plus className="h-4 w-4 mr-1" />Add Employee</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, code, department..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-employees" />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No employees found</p>
          <Button className="mt-3" onClick={() => setShowForm(true)}>Add your first employee</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Designation</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Join Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp: any) => (
                <tr key={emp.id} className="border-t hover-elevate cursor-pointer" onClick={() => setViewingEmp(emp)} data-testid={`row-employee-${emp.id}`}>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-muted-foreground">{emp.department_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{emp.designation_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{emp.join_date || "—"}</td>
                  <td className="px-3 py-2"><Badge variant={emp.status === "active" ? "default" : "secondary"} className="capitalize">{emp.status}</Badge></td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(emp); setShowForm(true); }}><FileText className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(emp.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
