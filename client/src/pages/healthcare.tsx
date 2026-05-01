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
import { Plus, Search, User, CalendarDays, Bed, Stethoscope, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  admitted: "bg-orange-100 text-orange-700",
  discharged: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); setShowForm(false); setEditing(null); toast({ title: "Patient saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/healthcare/patients/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/patients"] }); toast({ title: "Patient removed" }); },
  });

  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.patient_code?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search));

  const openForm = (p?: any) => { setEditing(p || null); setForm(p || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-patient-search" />
        </div>
        <Button onClick={() => openForm()} data-testid="button-add-patient"><Plus className="h-4 w-4 mr-1" />Add Patient</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Code</th><th className="text-left p-3">Name</th><th className="text-left p-3">Gender</th><th className="text-left p-3">Phone</th><th className="text-left p-3">Blood Group</th><th className="p-3"></th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover-elevate" data-testid={`row-patient-${p.id}`}>
                  <td className="p-3 font-mono text-xs">{p.patient_code}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.gender || "-"}</td>
                  <td className="p-3">{p.phone || "-"}</td>
                  <td className="p-3">{p.blood_group ? <Badge variant="outline">{p.blood_group}</Badge> : "-"}</td>
                  <td className="p-3 flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openForm(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}><X className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No patients found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Patient" : "Add Patient"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Full Name *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} data-testid="input-patient-name" /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dob || ""} onChange={e => setForm({...form, dob: e.target.value})} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender || ""} onValueChange={v => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Blood Group</Label>
                <Select value={form.blood_group || ""} onValueChange={v => setForm({...form, blood_group: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="col-span-2"><Label>Address</Label><Textarea value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div><Label>Emergency Contact</Label><Input value={form.emergency_contact || ""} onChange={e => setForm({...form, emergency_contact: e.target.value})} /></div>
              <div><Label>Allergies</Label><Input value={form.allergies || ""} onChange={e => setForm({...form, allergies: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-patient">{saveMutation.isPending ? "Saving..." : "Save Patient"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Appointments (OPD) Tab ────────────────────────────────────────────────────
function AppointmentsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: appointments = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/appointments"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/healthcare/appointments/${editing.id}`, data)
      : apiRequest("POST", "/api/healthcare/appointments", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/appointments"] }); setShowForm(false); setEditing(null); toast({ title: "Appointment saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (a?: any) => { setEditing(a || null); setForm(a ? {...a} : { type: "OPD", status: "scheduled" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-appointment"><Plus className="h-4 w-4 mr-1" />New Appointment</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">No.</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Doctor</th><th className="text-left p-3">Date</th><th className="text-left p-3">Type</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} className="border-b hover-elevate" data-testid={`row-appointment-${a.id}`}>
                  <td className="p-3 font-mono text-xs">{a.appointment_no}</td>
                  <td className="p-3 font-medium">{a.patient_name}</td>
                  <td className="p-3">{a.doctor_name}</td>
                  <td className="p-3">{a.appointment_date}</td>
                  <td className="p-3"><Badge variant="outline">{a.type}</Badge></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100"}`}>{a.status}</span></td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(a)}>Edit</Button></td>
                </tr>
              ))}
              {appointments.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No appointments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Appointment" : "New Appointment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Patient *</Label>
                <Select value={form.patient_id || ""} onValueChange={v => setForm({...form, patient_id: v})}>
                  <SelectTrigger data-testid="select-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.patient_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Doctor Name *</Label><Input value={form.doctor_name || ""} onChange={e => setForm({...form, doctor_name: e.target.value})} /></div>
              <div><Label>Specialization</Label><Input value={form.specialization || ""} onChange={e => setForm({...form, specialization: e.target.value})} /></div>
              <div><Label>Date *</Label><Input type="date" value={form.appointment_date || ""} onChange={e => setForm({...form, appointment_date: e.target.value})} /></div>
              <div><Label>Slot Time</Label><Input type="time" value={form.slot_time || ""} onChange={e => setForm({...form, slot_time: e.target.value})} /></div>
              <div><Label>Type</Label>
                <Select value={form.type || "OPD"} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="OPD">OPD</SelectItem><SelectItem value="Emergency">Emergency</SelectItem><SelectItem value="Follow-up">Follow-up</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Consultation Fee (₹)</Label><Input type="number" value={form.consultation_fee || ""} onChange={e => setForm({...form, consultation_fee: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "scheduled"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>}
              <div className="col-span-2"><Label>Diagnosis</Label><Textarea value={form.diagnosis || ""} onChange={e => setForm({...form, diagnosis: e.target.value})} /></div>
              <div className="col-span-2"><Label>Prescription</Label><Textarea value={form.prescription || ""} onChange={e => setForm({...form, prescription: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.patient_id || !form.doctor_name || !form.appointment_date} data-testid="button-save-appointment">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── IPD Tab ──────────────────────────────────────────────────────────────────
function IPDTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"] });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });
  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/healthcare/ipd-admissions/${editing.id}`, data)
      : apiRequest("POST", "/api/healthcare/ipd-admissions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/ipd-admissions"] }); setShowForm(false); setEditing(null); toast({ title: "Admission saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (a?: any) => { setEditing(a || null); setForm(a ? {...a} : { status: "admitted" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-admission"><Plus className="h-4 w-4 mr-1" />New Admission</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">No.</th><th className="text-left p-3">Patient</th><th className="text-left p-3">Ward</th><th className="text-left p-3">Bed</th><th className="text-left p-3">Admitted</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {admissions.map(a => (
                <tr key={a.id} className="border-b hover-elevate" data-testid={`row-admission-${a.id}`}>
                  <td className="p-3 font-mono text-xs">{a.admission_no}</td>
                  <td className="p-3 font-medium">{a.patient_name}</td>
                  <td className="p-3">{a.ward_name || "-"}</td>
                  <td className="p-3">{a.bed_no || "-"}</td>
                  <td className="p-3">{a.admission_date}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status] || "bg-gray-100"}`}>{a.status}</span></td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(a)}>Edit</Button></td>
                </tr>
              ))}
              {admissions.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No admissions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Admission" : "New Admission"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Patient *</Label>
                <Select value={form.patient_id || ""} onValueChange={v => setForm({...form, patient_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ward</Label>
                <Select value={form.ward_id || ""} onValueChange={v => setForm({...form, ward_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                  <SelectContent>{wards.map(w => <SelectItem key={w.id} value={w.id}>{w.ward_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bed No.</Label><Input value={form.bed_no || ""} onChange={e => setForm({...form, bed_no: e.target.value})} /></div>
              <div><Label>Doctor</Label><Input value={form.doctor_name || ""} onChange={e => setForm({...form, doctor_name: e.target.value})} /></div>
              <div><Label>Admission Date *</Label><Input type="date" value={form.admission_date || ""} onChange={e => setForm({...form, admission_date: e.target.value})} /></div>
              <div><Label>Discharge Date</Label><Input type="date" value={form.discharge_date || ""} onChange={e => setForm({...form, discharge_date: e.target.value})} /></div>
              <div><Label>Daily Charge (₹)</Label><Input type="number" value={form.daily_charge || ""} onChange={e => setForm({...form, daily_charge: e.target.value})} /></div>
              {editing && <><div><Label>Total Bill (₹)</Label><Input type="number" value={form.total_bill || ""} onChange={e => setForm({...form, total_bill: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={form.status || "admitted"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admitted">Admitted</SelectItem><SelectItem value="discharged">Discharged</SelectItem></SelectContent>
                </Select>
              </div></>}
              <div className="col-span-2"><Label>Diagnosis</Label><Textarea value={form.diagnosis || ""} onChange={e => setForm({...form, diagnosis: e.target.value})} /></div>
              <div className="col-span-2"><Label>Treatment</Label><Textarea value={form.treatment || ""} onChange={e => setForm({...form, treatment: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.patient_id || !form.admission_date} data-testid="button-save-admission">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Wards Tab ────────────────────────────────────────────────────────────────
function WardsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/healthcare/wards/${editing.id}`, data) : apiRequest("POST", "/api/healthcare/wards", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/healthcare/wards"] }); setShowForm(false); setEditing(null); toast({ title: "Ward saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (w?: any) => { setEditing(w || null); setForm(w || {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-ward"><Plus className="h-4 w-4 mr-1" />Add Ward</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wards.map(w => (
          <Card key={w.id} data-testid={`card-ward-${w.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{w.ward_name}</p>
                  <p className="text-sm text-muted-foreground">{w.ward_type || "General"}</p>
                  <p className="text-sm mt-1">{w.total_beds} beds · ₹{Number(w.charge_per_day || 0).toLocaleString()}/day</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openForm(w)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {wards.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No wards configured</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Ward" : "Add Ward"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Ward Name *</Label><Input value={form.ward_name || ""} onChange={e => setForm({...form, ward_name: e.target.value})} /></div>
            <div><Label>Ward Type</Label><Input value={form.ward_type || ""} placeholder="e.g. General, ICU, Private" onChange={e => setForm({...form, ward_type: e.target.value})} /></div>
            <div><Label>Total Beds</Label><Input type="number" value={form.total_beds || ""} onChange={e => setForm({...form, total_beds: e.target.value})} /></div>
            <div><Label>Charge Per Day (₹)</Label><Input type="number" value={form.charge_per_day || ""} onChange={e => setForm({...form, charge_per_day: e.target.value})} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.ward_name} data-testid="button-save-ward">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function HealthcarePage() {
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"] });
  const { data: appointments = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/appointments"] });
  const { data: admissions = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/ipd-admissions"] });
  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"] });

  const todayAppts = appointments.filter(a => a.appointment_date === new Date().toISOString().split("T")[0]).length;
  const activeAdmissions = admissions.filter(a => a.status === "admitted").length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Healthcare Management</h1>
        <p className="text-muted-foreground mt-1">Manage patients, OPD appointments, and IPD admissions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={patients.length} icon={User} color="bg-blue-100 text-blue-600" />
        <StatCard title="Today's Appointments" value={todayAppts} icon={CalendarDays} color="bg-green-100 text-green-600" />
        <StatCard title="Active Admissions" value={activeAdmissions} icon={Bed} color="bg-orange-100 text-orange-600" />
        <StatCard title="Wards" value={wards.length} icon={Stethoscope} color="bg-purple-100 text-purple-600" />
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="flex-wrap">
          <TabsTrigger value="patients" data-testid="tab-patients">Patients</TabsTrigger>
          <TabsTrigger value="opd" data-testid="tab-opd">OPD Appointments</TabsTrigger>
          <TabsTrigger value="ipd" data-testid="tab-ipd">IPD Admissions</TabsTrigger>
          <TabsTrigger value="wards" data-testid="tab-wards">Wards</TabsTrigger>
        </TabsList>
        <TabsContent value="patients" className="mt-4"><PatientsTab /></TabsContent>
        <TabsContent value="opd" className="mt-4"><AppointmentsTab /></TabsContent>
        <TabsContent value="ipd" className="mt-4"><IPDTab /></TabsContent>
        <TabsContent value="wards" className="mt-4"><WardsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
