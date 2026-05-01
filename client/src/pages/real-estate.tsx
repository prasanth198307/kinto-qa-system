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
import { Plus, Building2, Home, BookCheck, IndianRupee, X, ChevronRight } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-700", booked: "bg-orange-100 text-orange-700",
  sold: "bg-blue-100 text-blue-700", cancelled: "bg-red-100 text-red-700",
  planning: "bg-gray-100 text-gray-700", ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

function ProjectsTab({ onSelect }: { onSelect: (p: any) => void }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/real-estate/projects/${editing.id}`, data) : apiRequest("POST", "/api/real-estate/projects", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/projects"] }); setShowForm(false); setEditing(null); toast({ title: "Project saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (p?: any) => { setEditing(p || null); setForm(p || { project_type: "residential", status: "planning" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-project"><Plus className="h-4 w-4 mr-1" />Add Project</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <Card key={p.id} className="cursor-pointer hover-elevate" onClick={() => onSelect(p)} data-testid={`card-project-${p.id}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.location || "—"}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[p.status] || "bg-gray-100"}`}>{p.status}</span>
                    <Badge variant="outline" className="text-xs">{p.project_type}</Badge>
                  </div>
                  <p className="text-sm mt-2">{p.total_units_count || 0} units · {p.available_units || 0} available · {p.booked_units || 0} booked</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openForm(p); }}>Edit</Button>
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-primary gap-1">
                <span>View units</span><ChevronRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No projects yet</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Project Name *</Label><Input value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="col-span-2"><Label>Location</Label><Input value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div><Label>Type</Label>
                <Select value={form.project_type || "residential"} onValueChange={v => setForm({...form, project_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="residential">Residential</SelectItem><SelectItem value="commercial">Commercial</SelectItem><SelectItem value="villa">Villa</SelectItem><SelectItem value="plot">Plot</SelectItem><SelectItem value="mixed">Mixed Use</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status || "planning"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="planning">Planning</SelectItem><SelectItem value="ongoing">Ongoing</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Total Units</Label><Input type="number" value={form.total_units || ""} onChange={e => setForm({...form, total_units: e.target.value})} /></div>
              <div><Label>Total Area (sq.ft)</Label><Input type="number" value={form.total_area_sqft || ""} onChange={e => setForm({...form, total_area_sqft: e.target.value})} /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date || ""} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
              <div><Label>Completion Date</Label><Input type="date" value={form.completion_date || ""} onChange={e => setForm({...form, completion_date: e.target.value})} /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} data-testid="button-save-project">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitsTab({ projectFilter }: { projectFilter?: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"] });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });

  const filtered = projectFilter ? units.filter(u => u.project_id === projectFilter) : units;

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/real-estate/units/${editing.id}`, data) : apiRequest("POST", "/api/real-estate/units", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/units"] }); setShowForm(false); setEditing(null); toast({ title: "Unit saved" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const openForm = (u?: any) => { setEditing(u || null); setForm(u ? {...u} : { status: "available", project_id: projectFilter || "" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()} data-testid="button-add-unit"><Plus className="h-4 w-4 mr-1" />Add Unit</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Unit No.</th><th className="text-left p-3">Project</th><th className="text-left p-3">Type</th><th className="text-left p-3">Floor</th><th className="text-right p-3">Area (sq.ft)</th><th className="text-right p-3">Price (₹)</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b hover-elevate" data-testid={`row-unit-${u.id}`}>
                  <td className="p-3 font-semibold">{u.unit_no}</td>
                  <td className="p-3 text-muted-foreground">{u.project_name}</td>
                  <td className="p-3">{u.unit_type || "-"}</td>
                  <td className="p-3">{u.floor_no != null ? `Floor ${u.floor_no}` : "-"}</td>
                  <td className="p-3 text-right">{u.area_sqft ? Number(u.area_sqft).toLocaleString() : "-"}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(u.current_price || 0).toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[u.status] || "bg-gray-100"}`}>{u.status}</span></td>
                  <td className="p-3"><Button size="sm" variant="outline" onClick={() => openForm(u)}>Edit</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No units found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Unit" : "Add Unit"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project *</Label>
                <Select value={form.project_id || ""} onValueChange={v => setForm({...form, project_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit No. *</Label><Input value={form.unit_no || ""} onChange={e => setForm({...form, unit_no: e.target.value})} placeholder="A-101" /></div>
              <div><Label>Unit Type</Label><Input value={form.unit_type || ""} onChange={e => setForm({...form, unit_type: e.target.value})} placeholder="2BHK, 3BHK, Studio..." /></div>
              <div><Label>Floor No.</Label><Input type="number" value={form.floor_no || ""} onChange={e => setForm({...form, floor_no: e.target.value})} /></div>
              <div><Label>Area (sq.ft)</Label><Input type="number" value={form.area_sqft || ""} onChange={e => setForm({...form, area_sqft: e.target.value})} /></div>
              <div><Label>Facing</Label><Input value={form.facing || ""} onChange={e => setForm({...form, facing: e.target.value})} placeholder="North, East..." /></div>
              <div><Label>Base Price (₹)</Label><Input type="number" value={form.base_price || ""} onChange={e => setForm({...form, base_price: e.target.value})} /></div>
              <div><Label>Current Price (₹)</Label><Input type="number" value={form.current_price || ""} onChange={e => setForm({...form, current_price: e.target.value})} /></div>
              {editing && <div><Label>Status</Label>
                <Select value={form.status || "available"} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="booked">Booked</SelectItem><SelectItem value="sold">Sold</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>}
              <div className="col-span-2"><Label>Features</Label><Input value={form.features || ""} onChange={e => setForm({...form, features: e.target.value})} placeholder="Parking, Garden view..." /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.project_id || !form.unit_no} data-testid="button-save-unit">{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"] });
  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/real-estate/bookings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); queryClient.invalidateQueries({ queryKey: ["/api/real-estate/units"] }); setShowForm(false); toast({ title: "Booking created" }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const availableUnits = units.filter(u => u.status === "available");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ booking_date: new Date().toISOString().split("T")[0] }); setShowForm(true); }} data-testid="button-add-booking"><Plus className="h-4 w-4 mr-1" />New Booking</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Booking No.</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Unit</th><th className="text-left p-3">Project</th><th className="text-right p-3">Total (₹)</th><th className="text-right p-3">Booking Amt</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b hover-elevate" data-testid={`row-booking-${b.id}`}>
                  <td className="p-3 font-mono text-xs">{b.booking_no}</td>
                  <td className="p-3 font-medium">{b.customer_name}</td>
                  <td className="p-3">{b.unit_no}</td>
                  <td className="p-3 text-muted-foreground">{b.project_name}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(b.total_amount || 0).toLocaleString()}</td>
                  <td className="p-3 text-right">₹{Number(b.booking_amount || 0).toLocaleString()}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOR[b.status] || "bg-gray-100"}`}>{b.status}</span></td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No bookings yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Unit *</Label>
                <Select value={form.unit_id || ""} onValueChange={v => { const u = units.find(u => u.id === v); setForm({...form, unit_id: v, total_amount: u?.current_price || ""}); }}>
                  <SelectTrigger><SelectValue placeholder="Select available unit" /></SelectTrigger>
                  <SelectContent>{availableUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_no} – {u.project_name} (₹{Number(u.current_price||0).toLocaleString()})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Customer Name *</Label><Input value={form.customer_name || ""} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={form.customer_phone || ""} onChange={e => setForm({...form, customer_phone: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={form.customer_email || ""} onChange={e => setForm({...form, customer_email: e.target.value})} /></div>
              <div><Label>Booking Date *</Label><Input type="date" value={form.booking_date || ""} onChange={e => setForm({...form, booking_date: e.target.value})} /></div>
              <div><Label>Total Amount (₹)</Label><Input type="number" value={form.total_amount || ""} onChange={e => setForm({...form, total_amount: e.target.value})} /></div>
              <div><Label>Booking Amount (₹)</Label><Input type="number" value={form.booking_amount || ""} onChange={e => setForm({...form, booking_amount: e.target.value})} /></div>
              <div><Label>Loan Amount (₹)</Label><Input type="number" value={form.loan_amount || ""} onChange={e => setForm({...form, loan_amount: e.target.value})} /></div>
              <div><Label>Bank Name</Label><Input value={form.bank_name || ""} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.unit_id || !form.customer_name} data-testid="button-save-booking">{saveMutation.isPending ? "Saving..." : "Create Booking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RealEstatePage() {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"] });
  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"] });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"] });

  const totalValue = units.reduce((s, u) => s + Number(u.current_price || 0), 0);
  const bookedValue = bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Real Estate Management</h1>
        <p className="text-muted-foreground mt-1">Manage projects, units, bookings, and payment schedules</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Projects" value={projects.length} icon={Building2} color="bg-blue-100 text-blue-600" />
        <StatCard title="Total Units" value={units.length} icon={Home} color="bg-purple-100 text-purple-600" />
        <StatCard title="Bookings" value={bookings.length} icon={BookCheck} color="bg-orange-100 text-orange-600" />
        <StatCard title="Booked Value" value={`₹${(bookedValue / 1e7).toFixed(1)}Cr`} icon={IndianRupee} color="bg-green-100 text-green-600" />
      </div>

      <Tabs defaultValue="projects">
        <TabsList className="flex-wrap">
          <TabsTrigger value="projects" data-testid="tab-re-projects">Projects</TabsTrigger>
          <TabsTrigger value="units" data-testid="tab-re-units">Units</TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-re-bookings">Bookings</TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-4"><ProjectsTab onSelect={setSelectedProject} /></TabsContent>
        <TabsContent value="units" className="mt-4"><UnitsTab projectFilter={selectedProject?.id} /></TabsContent>
        <TabsContent value="bookings" className="mt-4"><BookingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
