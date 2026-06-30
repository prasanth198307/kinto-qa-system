import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Flame, ThermometerSun, Snowflake, Plus, CalendarCheck } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const TEMP_COLORS: Record<string, any> = { hot: "destructive", warm: "default", cold: "secondary" };
const emptyForm = { lead_name: "", phone: "", email: "", interested_in: "", budget_range: "", source: "", assigned_to: "" };

export default function CrmPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState<any>(null);
  const [visitOpen, setVisitOpen] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [newStatus, setNewStatus] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitNote, setVisitNote] = useState("");

  const { data, isLoading, isError } = useQuery({ queryKey: ["re-leads"], queryFn: () => api("GET", "/api/real-estate/leads") });
  const leads = Array.isArray(data) ? data : [];

  const hot = leads.filter((l: any) => l.status === "hot").length;
  const warm = leads.filter((l: any) => l.status === "warm").length;
  const cold = leads.filter((l: any) => l.status === "cold").length;

  const addLead = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/real-estate/leads", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-leads"] }); setAddOpen(false); setForm(emptyForm); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/real-estate/leads/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-leads"] }); setStatusOpen(null); },
  });

  const scheduleVisit = useMutation({
    mutationFn: ({ id }: any) => api("POST", `/api/real-estate/leads/${id}/visit`, { visit_date: visitDate, note: visitNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-leads"] }); setVisitOpen(null); setVisitDate(""); setVisitNote(""); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Lead</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: leads.length, icon: Users, color: "" },
          { label: "Hot", value: hot, icon: Flame, color: "text-red-500" },
          { label: "Warm", value: warm, icon: ThermometerSun, color: "text-orange-500" },
          { label: "Cold", value: cold, icon: Snowflake, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load leads.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Interested In</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Last Followup</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No leads found.</TableCell></TableRow>}
                {leads.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.lead_name}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell>{l.email}</TableCell>
                    <TableCell>{l.interested_in}</TableCell>
                    <TableCell>{l.budget_range}</TableCell>
                    <TableCell>{l.source}</TableCell>
                    <TableCell><Badge variant={TEMP_COLORS[l.status] ?? "secondary"}>{l.status}</Badge></TableCell>
                    <TableCell>{l.assigned_to}</TableCell>
                    <TableCell>{l.last_followup || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setStatusOpen(l); setNewStatus(l.status); }}>Status</Button>
                        <Button size="icon" variant="ghost" onClick={() => setVisitOpen(l)}><CalendarCheck className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Lead Name" value={form.lead_name} onChange={(e) => setForm({ ...form, lead_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <Input placeholder="Interested In (Project)" value={form.interested_in} onChange={(e) => setForm({ ...form, interested_in: e.target.value })} />
            <Input placeholder="Budget Range" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <Input placeholder="Assigned To" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addLead.mutate(form)} disabled={addLead.isPending}>{addLead.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusOpen} onOpenChange={() => setStatusOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Lead Status</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{statusOpen?.lead_name}</p>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(null)}>Cancel</Button>
            <Button onClick={() => updateStatus.mutate({ id: statusOpen?.id, status: newStatus })} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!visitOpen} onOpenChange={() => setVisitOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Schedule Site Visit</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{visitOpen?.lead_name}</p>
          <div className="space-y-3">
            <Input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <Input placeholder="Notes" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVisitOpen(null)}>Cancel</Button>
            <Button onClick={() => scheduleVisit.mutate({ id: visitOpen?.id })} disabled={scheduleVisit.isPending}>
              {scheduleVisit.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
