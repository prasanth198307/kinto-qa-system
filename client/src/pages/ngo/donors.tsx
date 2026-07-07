import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Heart, Search, Send } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const BLANK = { name: "", phone: "", email: "", address: "", pan_number: "", donor_type: "individual", notes: "" };

export default function NGODonorsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [search, setSearch] = useState("");

  const { data: donors = [] } = useQuery<any[]>({ queryKey: ["ngo-donors"], queryFn: () => api("GET", "/api/ngo/donors") });
  const { data: major = [] } = useQuery<any[]>({ queryKey: ["ngo-donors-major"], queryFn: () => api("GET", "/api/ngo/donors/major") });
  const { data: lapsed = [] } = useQuery<any[]>({ queryKey: ["ngo-donors-lapsed"], queryFn: () => api("GET", "/api/ngo/donors/lapsed") });

  const saveMut = useMutation({
    mutationFn: (p: any) => editing ? api("PUT", `/api/ngo/donors/${editing.id}`, p) : api("POST", "/api/ngo/donors", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-donors"] }); setOpen(false); setEditing(null); setForm(BLANK); toast({ title: editing ? "Donor updated" : "Donor added" }); },
  });
  const thankMut = useMutation({
    mutationFn: (id: any) => api("POST", `/api/ngo/donors/${id}/thank-you`, {}),
    onSuccess: () => toast({ title: "Thank-you message sent" }),
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = donors.filter((d: any) => !search || [d.name, d.phone, d.email, d.pan_number].join(" ").toLowerCase().includes(search.toLowerCase()));

  const DonorTable = ({ rows, showLast = false }: { rows: any[]; showLast?: boolean }) => (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Phone</TableHead>
          <TableHead>PAN</TableHead><TableHead>Total Donated</TableHead>{showLast && <TableHead>Last Donation</TableHead>}<TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((d: any) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-sm">{d.donor_code}</TableCell>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs uppercase">{d.donor_type}</Badge></TableCell>
              <TableCell className="text-sm">{d.phone || "—"}</TableCell>
              <TableCell className="font-mono text-sm">{d.pan_number || "—"}</TableCell>
              <TableCell className="font-semibold">{fmt(d.total_donated)}</TableCell>
              {showLast && <TableCell className="text-sm">{d.last_donation_date ? String(d.last_donation_date).slice(0, 10) : "—"}</TableCell>}
              <TableCell>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setForm({ ...BLANK, ...d }); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" title="Send thank-you" onClick={() => thankMut.mutate(d.id)}><Send className="w-3 h-3" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && <TableRow><TableCell colSpan={showLast ? 8 : 7} className="text-center text-muted-foreground py-6">No donors</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Heart className="w-6 h-6 text-red-500" /><h1 className="text-2xl font-bold">Donors</h1></div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Donor</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({donors.length})</TabsTrigger>
          <TabsTrigger value="major">Major Donors ({major.length})</TabsTrigger>
          <TabsTrigger value="lapsed">Lapsed ({lapsed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="relative max-w-sm mb-3">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, PAN..." className="pl-8" />
          </div>
          <DonorTable rows={filtered} />
        </TabsContent>
        <TabsContent value="major"><DonorTable rows={major} /></TabsContent>
        <TabsContent value="lapsed"><DonorTable rows={lapsed} showLast /></TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Donor" : "Add Donor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => f("name", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.donor_type} onValueChange={v => f("donor_type", v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{["individual","corporate","trust","foreign"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">PAN (for 80G)</Label><Input value={form.pan_number || ""} onChange={e => f("pan_number", e.target.value.toUpperCase())} maxLength={10} className="h-8 font-mono" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => f("phone", e.target.value)} className="h-8" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => f("email", e.target.value)} className="h-8" /></div>
            <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => f("address", e.target.value)} className="h-8" /></div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => f("notes", e.target.value)} className="h-8" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name}>{editing ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
