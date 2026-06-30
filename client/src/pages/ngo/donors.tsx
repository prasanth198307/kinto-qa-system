import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Heart, IndianRupee, Plus, Pencil, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "-";

const DONOR_TYPES = ["individual", "corporate", "trust", "government"];
const COMM_PREFS = ["email", "sms", "whatsapp"];

const blank = () => ({ name: "", email: "", phone: "", address: "", city: "", state: "", pan_number: "", aadhar_number: "", donor_type: "individual", is_80g_eligible: false, communication_preference: "email" });

export default function DonorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(blank());
  const [selectedDonor, setSelectedDonor] = useState<any>(null);

  const { data: donors = [] } = useQuery({ queryKey: ["ngo-donors"], queryFn: () => api("GET", "/api/ngo/donors") });
  const { data: donorDonations = [] } = useQuery({
    queryKey: ["ngo-donor-donations", selectedDonor?.id],
    queryFn: () => api("GET", `/api/ngo/donations?donor_id=${selectedDonor?.id}`),
    enabled: !!selectedDonor,
  });

  const save = useMutation({
    mutationFn: (d: any) => editing ? api("PUT", `/api/ngo/donors/${editing.id}`, d) : api("POST", "/api/ngo/donors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-donors"] }); setOpen(false); setEditing(null); setForm(blank()); },
  });

  const filtered = (Array.isArray(donors) ? donors : []).filter((d: any) => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.donor_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.donor_type === typeFilter;
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalDonated = filtered.reduce((s: number, d: any) => s + Number(d.total_donated || 0), 0);
  const active = filtered.filter((d: any) => d.status === "active").length;

  function openAdd() { setForm(blank()); setEditing(null); setOpen(true); }
  function openEdit(d: any) { setForm({ ...d, is_80g_eligible: !!d.is_80g_eligible }); setEditing(d); setOpen(true); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Donors</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Donor</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-4 h-4" />Total Donors</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Heart className="w-4 h-4" />Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{active}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><IndianRupee className="w-4 h-4" />Total Donated</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{fmt(totalDonated)}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search name / number…" value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{DONOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Type</TableHead><TableHead>Total Donated</TableHead><TableHead>Last Donation</TableHead><TableHead>80G</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((d: any) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedDonor(d)}>
                  <TableCell className="font-mono text-xs">{d.donor_number}</TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{d.donor_type}</Badge></TableCell>
                  <TableCell>₹{fmt(d.total_donated)}</TableCell>
                  <TableCell>{fmtDate(d.last_donation_date)}</TableCell>
                  <TableCell>{d.is_80g_eligible ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"} className="capitalize">{d.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(d); }}><Pencil className="w-3 h-3" /></Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No donors found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        {selectedDonor && (
          <div className="w-80 border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{selectedDonor.name}</h3>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDonor(null)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">{selectedDonor.donor_number} · {selectedDonor.donor_type}</p>
            <h4 className="text-sm font-medium mt-2">Donation History</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(Array.isArray(donorDonations) ? donorDonations : []).map((don: any) => (
                <div key={don.id} className="text-xs border rounded p-2 space-y-1">
                  <div className="flex justify-between"><span className="font-medium">₹{fmt(don.amount)}</span><span className="text-muted-foreground">{fmtDate(don.donation_date)}</span></div>
                  <div className="flex justify-between"><Badge variant="outline" className="text-xs">{don.payment_mode}</Badge>{don.purpose && <span className="text-muted-foreground truncate max-w-32">{don.purpose}</span>}</div>
                </div>
              ))}
              {(Array.isArray(donorDonations) ? donorDonations : []).length === 0 && <p className="text-xs text-muted-foreground">No donations yet</p>}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Donor" : "Add Donor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>PAN</Label><Input value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value })} /></div>
            <div><Label>Aadhar</Label><Input value={form.aadhar_number} onChange={e => setForm({ ...form, aadhar_number: e.target.value })} /></div>
            <div>
              <Label>Donor Type</Label>
              <Select value={form.donor_type} onValueChange={v => setForm({ ...form, donor_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DONOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Communication</Label>
              <Select value={form.communication_preference} onValueChange={v => setForm({ ...form, communication_preference: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMM_PREFS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox checked={!!form.is_80g_eligible} onCheckedChange={v => setForm({ ...form, is_80g_eligible: !!v })} id="80g-chk" />
              <Label htmlFor="80g-chk">Eligible for 80G</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
