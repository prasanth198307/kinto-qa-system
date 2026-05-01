import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, CalendarDays, Bed, Stethoscope, FlaskConical, Pill, Receipt, Pencil, Trash2, X } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  admitted: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  discharged: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  partial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/healthcare/stats"] });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats?.totalPatients ?? 0} icon={User} color="bg-blue-100 text-blue-600" />
        <StatCard title="Today Appointments" value={stats?.todayAppointments ?? 0} icon={CalendarDays} color="bg-green-100 text-green-600" />
        <StatCard title="IPD Admitted" value={stats?.ipdAdmissions ?? 0} icon={Bed} color="bg-orange-100 text-orange-600" />
        <StatCard title="Monthly Revenue" value={`₹${fmt(stats?.monthlyRevenue)}`} icon={Receipt} color="bg-purple-100 text-purple-600" />
      </div>
    </div>
  );
}

// ── Patients Tab ──────────────────────────────────────────────────────────────
function PatientsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/healthcare/patients/${editing.id}`, data)
      : apiRequest("POST", "/api/healthcare/patients", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); setShowForm(false); toast({ title: editing ? "Patient updated" : "Patient registered" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/patients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }),
  });

  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p, dob: p.dob?.split("T")[0] }); setShowForm(true); };

  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew} data-testid="button-add-patient"><Plus className="h-4 w-4 mr-1" />Register Patient</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Code","Name","Age/Gender","Blood Group","Phone","Allergies","Action"].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{p.patient_code}</td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : "—"} {p.gender}</td>
                <td className="px-3 py-2">{p.blood_group || "—"}</td>
                <td className="px-3 py-2">{p.phone || "—"}</td>
                <td className="px-3 py-2 max-w-[150px] truncate">{p.allergies || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No patients found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Patient" : "Register Patient"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Full Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></FieldRow></div>
            <FieldRow label="Date of Birth"><Input type="date" value={form.dob||""} onChange={e=>setForm({...form,dob:e.target.value})} /></FieldRow>
            <FieldRow label="Gender">
              <Select value={form.gender||""} onValueChange={v=>setForm({...form,gender:v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["Male","Female","Other"].map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Blood Group">
              <Select value={form.blood_group||""} onValueChange={v=>setForm({...form,blood_group:v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg=><SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} /></FieldRow>
            <FieldRow label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} /></FieldRow>
            <FieldRow label="Emergency Contact"><Input value={form.emergency_contact||""} onChange={e=>setForm({...form,emergency_contact:e.target.value})} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Address"><Textarea rows={2} value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Allergies"><Input value={form.allergies||""} onChange={e=>setForm({...form,allergies:e.target.value})} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Doctors Tab ───────────────────────────────────────────────────────────────
function DoctorsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/doctors/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/doctors", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }); setShowForm(false); toast({ title: "Saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/doctors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/doctors"] }),
  });

  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ ...d }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Doctor</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map(d => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-sm text-muted-foreground">{d.specialty}</p>
                  <p className="text-xs text-muted-foreground">{d.qualification}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={()=>openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">{d.phone} {d.email ? `· ${d.email}` : ""}</p>
                {d.available_days && <p className="text-xs">Available: {d.available_days}</p>}
                {d.consultation_fee > 0 && <p className="text-xs font-medium">Fee: ₹{fmt(d.consultation_fee)}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!doctors.length && <p className="col-span-3 text-center py-8 text-muted-foreground">No doctors added yet</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></FieldRow></div>
            <FieldRow label="Specialty"><Input value={form.specialty||""} onChange={e=>setForm({...form,specialty:e.target.value})} /></FieldRow>
            <FieldRow label="Qualification"><Input value={form.qualification||""} onChange={e=>setForm({...form,qualification:e.target.value})} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})} /></FieldRow>
            <FieldRow label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} /></FieldRow>
            <FieldRow label="Consultation Fee (₹)"><Input type="number" value={form.consultation_fee||""} onChange={e=>setForm({...form,consultation_fee:e.target.value})} /></FieldRow>
            <FieldRow label="Available Days"><Input placeholder="Mon-Sat" value={form.available_days||""} onChange={e=>setForm({...form,available_days:e.target.value})} /></FieldRow>
            <FieldRow label="From"><Input type="time" value={form.available_from||""} onChange={e=>setForm({...form,available_from:e.target.value})} /></FieldRow>
            <FieldRow label="To"><Input type="time" value={form.available_to||""} onChange={e=>setForm({...form,available_to:e.target.value})} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── OPD (Appointments) ────────────────────────────────────────────────────────
function OPDTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");

  const { data: appointments = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/appointments"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/appointments/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/appointments", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }); setShowForm(false); toast({ title: "Appointment saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/appointments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }),
  });

  const openNew = () => { setEditing(null); setForm({ appointment_date: new Date().toISOString().split("T")[0], type: "OPD", status: "scheduled" }); setShowForm(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ ...a, appointment_date: a.appointment_date?.split("T")[0] }); setShowForm(true); };

  const filtered = appointments.filter(a => a.patient_name?.toLowerCase().includes(search.toLowerCase()) || a.doctor_name?.toLowerCase().includes(search.toLowerCase()));

  const onDoctorChange = (doctorId: string) => {
    const doc = doctors.find((d: any) => String(d.id) === doctorId);
    setForm({ ...form, doctor_id: doctorId, doctor_name: doc?.name || "", specialization: doc?.specialty || "", consultation_fee: doc?.consultation_fee || 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search appointments..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Appointment</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.","Patient","Doctor","Specialty","Date","Time","Type","Fee","Status","Action"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{a.appointment_no}</td>
                <td className="px-3 py-2 font-medium">{a.patient_name}</td>
                <td className="px-3 py-2">{a.doctor_name_ref || a.doctor_name}</td>
                <td className="px-3 py-2">{a.specialty || a.specialization || "—"}</td>
                <td className="px-3 py-2">{a.appointment_date?.split("T")[0]}</td>
                <td className="px-3 py-2">{a.slot_time || "—"}</td>
                <td className="px-3 py-2">{a.type}</td>
                <td className="px-3 py-2">₹{fmt(a.consultation_fee)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[a.status] || ""}>{a.status}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={()=>openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No appointments</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Appointment" : "New Appointment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Patient *">
                <Select value={String(form.patient_id||"")} onValueChange={v=>setForm({...form,patient_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.phone}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Doctor">
                <Select value={String(form.doctor_id||"")} onValueChange={onDoctorChange}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.name} — {d.specialty}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Date *"><Input type="date" value={form.appointment_date||""} onChange={e=>setForm({...form,appointment_date:e.target.value})} /></FieldRow>
            <FieldRow label="Time Slot"><Input type="time" value={form.slot_time||""} onChange={e=>setForm({...form,slot_time:e.target.value})} /></FieldRow>
            <FieldRow label="Type">
              <Select value={form.type||"OPD"} onValueChange={v=>setForm({...form,type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["OPD","Follow-up","Emergency"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Status">
              <Select value={form.status||"scheduled"} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["scheduled","completed","cancelled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2"><FieldRow label="Consultation Fee (₹)"><Input type="number" value={form.consultation_fee||""} onChange={e=>setForm({...form,consultation_fee:e.target.value})} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Diagnosis"><Textarea rows={2} value={form.diagnosis||""} onChange={e=>setForm({...form,diagnosis:e.target.value})} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── IPD Tab ───────────────────────────────────────────────────────────────────
function IPDTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });
  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"] });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/ipd-admissions/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/ipd-admissions", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/ipd-admissions"] }); setShowForm(false); toast({ title: "Saved" }); },
  });

  const openNew = () => { setEditing(null); setForm({ admission_date: new Date().toISOString().split("T")[0], status: "admitted" }); setShowForm(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ ...a, admission_date: a.admission_date?.split("T")[0], discharge_date: a.discharge_date?.split("T")[0] }); setShowForm(true); };

  const onDoctorChange = (id: string) => {
    const doc = doctors.find((d: any) => String(d.id) === id);
    setForm({ ...form, doctor_id: id, doctor_name: doc?.name || "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h3 className="font-medium">IPD Admissions ({admissions.filter((a:any)=>a.status==='admitted').length} currently admitted)</h3>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Admission</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.","Patient","Ward","Bed","Doctor","Admitted","Discharged","Daily Charge","Status","Action"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {admissions.map(a => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{a.admission_no}</td>
                <td className="px-3 py-2 font-medium">{a.patient_name}</td>
                <td className="px-3 py-2">{a.ward_name || "—"}</td>
                <td className="px-3 py-2">{a.bed_no || "—"}</td>
                <td className="px-3 py-2">{a.doctor_name || "—"}</td>
                <td className="px-3 py-2">{a.admission_date?.split("T")[0]}</td>
                <td className="px-3 py-2">{a.discharge_date?.split("T")[0] || "—"}</td>
                <td className="px-3 py-2">₹{fmt(a.daily_charge)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[a.status]||""}>{a.status}</Badge></td>
                <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
            {!admissions.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No admissions</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Admission" : "New IPD Admission"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Patient *">
                <Select value={String(form.patient_id||"")} onValueChange={v=>setForm({...form,patient_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Ward">
              <Select value={String(form.ward_id||"")} onValueChange={v=>setForm({...form,ward_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>{wards.map((w:any)=><SelectItem key={w.id} value={String(w.id)}>{w.ward_name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Bed No."><Input value={form.bed_no||""} onChange={e=>setForm({...form,bed_no:e.target.value})} /></FieldRow>
            <div className="col-span-2">
              <FieldRow label="Doctor">
                <Select value={String(form.doctor_id||"")} onValueChange={onDoctorChange}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Admission Date"><Input type="date" value={form.admission_date||""} onChange={e=>setForm({...form,admission_date:e.target.value})} /></FieldRow>
            <FieldRow label="Discharge Date"><Input type="date" value={form.discharge_date||""} onChange={e=>setForm({...form,discharge_date:e.target.value})} /></FieldRow>
            <FieldRow label="Daily Charge (₹)"><Input type="number" value={form.daily_charge||""} onChange={e=>setForm({...form,daily_charge:e.target.value})} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status||"admitted"} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["admitted","discharged"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2"><FieldRow label="Diagnosis"><Textarea rows={2} value={form.diagnosis||""} onChange={e=>setForm({...form,diagnosis:e.target.value})} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="Treatment"><Textarea rows={2} value={form.treatment||""} onChange={e=>setForm({...form,treatment:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Lab Tests Tab ─────────────────────────────────────────────────────────────
function LabTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");

  const { data: tests = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/lab-tests"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });
  const { data: doctors = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/doctors"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/lab-tests/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/lab-tests", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/lab-tests"] }); setShowForm(false); toast({ title: "Saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/lab-tests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/lab-tests"] }),
  });

  const openNew = () => { setEditing(null); setForm({ ordered_date: new Date().toISOString().split("T")[0], status: "pending" }); setShowForm(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ ...t, ordered_date: t.ordered_date?.split("T")[0], result_date: t.result_date?.split("T")[0] }); setShowForm(true); };
  const filtered = tests.filter(t => t.test_name?.toLowerCase().includes(search.toLowerCase()) || t.patient_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tests..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Order Test</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Code","Test Name","Patient","Ordered By","Date","Result","Status","Charge","Action"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{t.test_code}</td>
                <td className="px-3 py-2 font-medium">{t.test_name}</td>
                <td className="px-3 py-2">{t.patient_name || "—"}</td>
                <td className="px-3 py-2">{t.ordered_by_name || "—"}</td>
                <td className="px-3 py-2">{t.ordered_date?.split("T")[0]}</td>
                <td className="px-3 py-2 max-w-[150px] truncate">{t.result || "—"}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[t.status]||""}>{t.status}</Badge></td>
                <td className="px-3 py-2">₹{fmt(t.amount)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={()=>openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No lab tests found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Test" : "Order Lab Test"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Patient">
                <Select value={String(form.patient_id||"")} onValueChange={v=>setForm({...form,patient_id:v})}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Ordered By (Doctor)">
                <Select value={String(form.ordered_by||"")} onValueChange={v=>setForm({...form,ordered_by:v})}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map((d:any)=><SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <div className="col-span-2"><FieldRow label="Test Name *"><Input value={form.test_name||""} onChange={e=>setForm({...form,test_name:e.target.value})} /></FieldRow></div>
            <FieldRow label="Ordered Date"><Input type="date" value={form.ordered_date||""} onChange={e=>setForm({...form,ordered_date:e.target.value})} /></FieldRow>
            <FieldRow label="Charge (₹)"><Input type="number" value={form.amount||""} onChange={e=>setForm({...form,amount:e.target.value})} /></FieldRow>
            <FieldRow label="Normal Range"><Input value={form.normal_range||""} onChange={e=>setForm({...form,normal_range:e.target.value})} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status||"pending"} onValueChange={v=>setForm({...form,status:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending","processing","completed"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Result Date"><Input type="date" value={form.result_date||""} onChange={e=>setForm({...form,result_date:e.target.value})} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Result"><Textarea rows={3} value={form.result||""} onChange={e=>setForm({...form,result:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Pharmacy (Medicines) Tab ──────────────────────────────────────────────────
function PharmacyTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState("");

  const { data: medicines = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/medicines"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/medicines/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/medicines", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/medicines"] }); setShowForm(false); toast({ title: "Saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/medicines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/medicines"] }),
  });

  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (m: any) => { setEditing(m); setForm({ ...m, expiry_date: m.expiry_date?.split("T")[0] }); setShowForm(true); };
  const filtered = medicines.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()));
  const lowStock = medicines.filter((m: any) => Number(m.stock_qty) <= Number(m.reorder_level));

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
          {lowStock.length} medicine(s) at or below reorder level: {lowStock.map((m:any)=>m.name).join(", ")}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Medicine</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Code","Name","Generic","Category","Unit","Stock","Reorder","Purchase ₹","Selling ₹","Expiry","Action"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const lowS = Number(m.stock_qty) <= Number(m.reorder_level);
              return (
                <tr key={m.id} className={`border-t hover:bg-muted/30 ${lowS ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs">{m.medicine_code}</td>
                  <td className="px-3 py-2 font-medium">{m.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.generic_name || "—"}</td>
                  <td className="px-3 py-2">{m.category || "—"}</td>
                  <td className="px-3 py-2">{m.unit}</td>
                  <td className={`px-3 py-2 font-medium ${lowS ? "text-red-600" : ""}`}>{m.stock_qty}</td>
                  <td className="px-3 py-2">{m.reorder_level}</td>
                  <td className="px-3 py-2">₹{fmt(m.purchase_price)}</td>
                  <td className="px-3 py-2">₹{fmt(m.selling_price)}</td>
                  <td className="px-3 py-2">{m.expiry_date?.split("T")[0] || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={()=>openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">No medicines found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Medicine" : "Add Medicine"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></FieldRow></div>
            <FieldRow label="Generic Name"><Input value={form.generic_name||""} onChange={e=>setForm({...form,generic_name:e.target.value})} /></FieldRow>
            <FieldRow label="Category"><Input placeholder="Tablet, Syrup..." value={form.category||""} onChange={e=>setForm({...form,category:e.target.value})} /></FieldRow>
            <FieldRow label="Unit"><Input placeholder="tablet, ml..." value={form.unit||""} onChange={e=>setForm({...form,unit:e.target.value})} /></FieldRow>
            <FieldRow label="Manufacturer"><Input value={form.manufacturer||""} onChange={e=>setForm({...form,manufacturer:e.target.value})} /></FieldRow>
            <FieldRow label="Stock Qty"><Input type="number" value={form.stock_qty||""} onChange={e=>setForm({...form,stock_qty:e.target.value})} /></FieldRow>
            <FieldRow label="Reorder Level"><Input type="number" value={form.reorder_level||""} onChange={e=>setForm({...form,reorder_level:e.target.value})} /></FieldRow>
            <FieldRow label="Purchase Price (₹)"><Input type="number" value={form.purchase_price||""} onChange={e=>setForm({...form,purchase_price:e.target.value})} /></FieldRow>
            <FieldRow label="Selling Price (₹)"><Input type="number" value={form.selling_price||""} onChange={e=>setForm({...form,selling_price:e.target.value})} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Expiry Date"><Input type="date" value={form.expiry_date||""} onChange={e=>setForm({...form,expiry_date:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Patient Billing Tab ───────────────────────────────────────────────────────
function BillingTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patient-bills"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/patient-bills/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/patient-bills", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/patient-bills"] }); setShowForm(false); toast({ title: "Bill saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/patient-bills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryClient: ["/api/healthcare/patient-bills"] as any }),
  });

  const totalAmt = items.reduce((s, i) => s + (Number(i.quantity||1) * Number(i.rate||0)), 0);

  const openNew = () => {
    setEditing(null);
    setForm({ bill_date: new Date().toISOString().split("T")[0], bill_type: "opd", payment_mode: "cash" });
    setItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
    setShowForm(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ ...b, bill_date: b.bill_date?.split("T")[0] });
    setItems([]);
    setShowForm(true);
  };

  const addItem = () => setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    newItems[i].amount = Number(newItems[i].quantity || 1) * Number(newItems[i].rate || 0);
    setItems(newItems);
  };

  const onPatientChange = (id: string) => {
    const p = patients.find((pt: any) => String(pt.id) === id);
    setForm({ ...form, patient_id: id, patient_name: p?.name || "" });
  };

  const filtered = bills.filter(b => b.patient_name?.toLowerCase().includes(search.toLowerCase()) || b.bill_number?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bills..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Create Bill</Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Bill No.","Patient","Date","Type","Total","Paid","Balance","Status","Action"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{b.bill_number}</td>
                <td className="px-3 py-2 font-medium">{b.patient_name}</td>
                <td className="px-3 py-2">{b.bill_date?.split("T")[0]}</td>
                <td className="px-3 py-2 capitalize">{b.bill_type}</td>
                <td className="px-3 py-2">₹{fmt(b.total_amount)}</td>
                <td className="px-3 py-2">₹{fmt(b.paid_amount)}</td>
                <td className="px-3 py-2">₹{fmt(b.balance_amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[b.status]||""}>{b.status}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={()=>openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No bills found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Bill" : "Create Patient Bill"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Patient">
                <Select value={String(form.patient_id||"")} onValueChange={onPatientChange}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p:any)=><SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Bill Date"><Input type="date" value={form.bill_date||""} onChange={e=>setForm({...form,bill_date:e.target.value})} /></FieldRow>
            <FieldRow label="Bill Type">
              <Select value={form.bill_type||"opd"} onValueChange={v=>setForm({...form,bill_type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["opd","ipd","lab","pharmacy","other"].map(t=><SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
          </div>
          {!editing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Bill Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-2 py-1 text-left">Description</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1">Rate</th><th className="px-2 py-1">Amount</th><th className="px-2 py-1"></th></tr></thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1"><Input className="h-7" value={it.description} onChange={e=>updateItem(i,"description",e.target.value)} /></td>
                        <td className="px-2 py-1"><Input className="h-7 w-16" type="number" value={it.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} /></td>
                        <td className="px-2 py-1"><Input className="h-7 w-24" type="number" value={it.rate} onChange={e=>updateItem(i,"rate",e.target.value)} /></td>
                        <td className="px-2 py-1 font-medium">₹{fmt(it.amount)}</td>
                        <td className="px-2 py-1"><Button size="icon" variant="ghost" onClick={()=>removeItem(i)}><X className="h-3 w-3" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right font-semibold">Total: ₹{fmt(totalAmt)}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Total Amount (₹)"><Input type="number" value={editing ? form.total_amount||"" : totalAmt} onChange={e=>setForm({...form,total_amount:e.target.value})} readOnly={!editing} /></FieldRow>
            <FieldRow label="Discount (₹)"><Input type="number" value={form.discount_amount||""} onChange={e=>setForm({...form,discount_amount:e.target.value})} /></FieldRow>
            <FieldRow label="Paid Amount (₹)"><Input type="number" value={form.paid_amount||""} onChange={e=>setForm({...form,paid_amount:e.target.value})} /></FieldRow>
            <FieldRow label="Payment Mode">
              <Select value={form.payment_mode||"cash"} onValueChange={v=>setForm({...form,payment_mode:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","card","upi","cheque","insurance"].map(m=><SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea rows={2} value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} /></FieldRow></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, total_amount: editing ? form.total_amount : totalAmt, items: editing ? undefined : items })} disabled={saveMutation.isPending}>Save Bill</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Wards Tab ─────────────────────────────────────────────────────────────────
function WardsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/healthcare/wards/${editing.id}`, d) : apiRequest("POST", "/api/healthcare/wards", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/wards"] }); setShowForm(false); toast({ title: "Saved" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/healthcare/wards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/healthcare/wards"] }),
  });

  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (w: any) => { setEditing(w); setForm({ ...w }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Ward</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wards.map(w => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{w.ward_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{w.ward_type}</p>
                  <p className="text-sm mt-1">Total Beds: <strong>{w.total_beds}</strong></p>
                  <p className="text-sm">Charge/Day: <strong>₹{fmt(w.charge_per_day)}</strong></p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={()=>openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={()=>deleteMutation.mutate(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!wards.length && <p className="col-span-3 text-center py-8 text-muted-foreground">No wards configured</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Ward" : "Add Ward"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Ward Name *"><Input value={form.ward_name||""} onChange={e=>setForm({...form,ward_name:e.target.value})} /></FieldRow>
            <FieldRow label="Ward Type">
              <Select value={form.ward_type||""} onValueChange={v=>setForm({...form,ward_type:v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{["general","private","semi-private","icu","emergency","maternity","pediatric"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Total Beds"><Input type="number" value={form.total_beds||""} onChange={e=>setForm({...form,total_beds:e.target.value})} /></FieldRow>
            <FieldRow label="Charge per Day (₹)"><Input type="number" value={form.charge_per_day||""} onChange={e=>setForm({...form,charge_per_day:e.target.value})} /></FieldRow>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button>
            <Button onClick={()=>saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HealthcarePage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Healthcare Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Patients, OPD, IPD, Lab Tests, Pharmacy & Billing</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients"><User className="h-3.5 w-3.5 mr-1" />Patients</TabsTrigger>
          <TabsTrigger value="doctors"><Stethoscope className="h-3.5 w-3.5 mr-1" />Doctors</TabsTrigger>
          <TabsTrigger value="opd"><CalendarDays className="h-3.5 w-3.5 mr-1" />OPD</TabsTrigger>
          <TabsTrigger value="ipd"><Bed className="h-3.5 w-3.5 mr-1" />IPD</TabsTrigger>
          <TabsTrigger value="wards">Wards</TabsTrigger>
          <TabsTrigger value="lab"><FlaskConical className="h-3.5 w-3.5 mr-1" />Lab Tests</TabsTrigger>
          <TabsTrigger value="pharmacy"><Pill className="h-3.5 w-3.5 mr-1" />Pharmacy</TabsTrigger>
          <TabsTrigger value="billing"><Receipt className="h-3.5 w-3.5 mr-1" />Billing</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="patients"><PatientsTab /></TabsContent>
          <TabsContent value="doctors"><DoctorsTab /></TabsContent>
          <TabsContent value="opd"><OPDTab /></TabsContent>
          <TabsContent value="ipd"><IPDTab /></TabsContent>
          <TabsContent value="wards"><WardsTab /></TabsContent>
          <TabsContent value="lab"><LabTab /></TabsContent>
          <TabsContent value="pharmacy"><PharmacyTab /></TabsContent>
          <TabsContent value="billing"><BillingTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
