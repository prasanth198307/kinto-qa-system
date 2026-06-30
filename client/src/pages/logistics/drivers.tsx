import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { driver_code: "", name: "", phone: "", license_number: "", license_expiry: "", badge_expiry: "", blood_group: "", address: "", status: "active" };

function expiryClass(dateStr: string): string {
  if (!dateStr) return "";
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-red-600 font-semibold";
  if (days < 30) return "text-orange-500 font-semibold";
  return "";
}

export default function DriversPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-drivers"], queryFn: () => api("GET", "/api/logistics/drivers") });
  const drivers: any[] = Array.isArray(data) ? data : [];

  const save = useMutation({
    mutationFn: (body: any) => editing ? api("PUT", `/api/logistics/drivers/${editing.id}`, body) : api("POST", "/api/logistics/drivers", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-drivers"] }); setOpen(false); setEditing(null); setForm(empty); },
  });

  function openAdd() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(d: any) { setEditing(d); setForm({ ...d }); setOpen(true); }
  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Driver Master</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Driver</Button>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load drivers.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License No.</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Badge Expiry</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No drivers found.</TableCell></TableRow>}
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.driver_code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>{d.license_number}</TableCell>
                  <TableCell className={expiryClass(d.license_expiry)}>{d.license_expiry}</TableCell>
                  <TableCell className={expiryClass(d.badge_expiry)}>{d.badge_expiry}</TableCell>
                  <TableCell>{d.blood_group}</TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Driver" : "Add Driver"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Driver Code</label><Input value={form.driver_code} onChange={(e) => set("driver_code", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Name</label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Phone</label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Blood Group</label><Input value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} /></div>
            <div><label className="text-sm font-medium">License Number</label><Input value={form.license_number} onChange={(e) => set("license_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">License Expiry</label><Input type="date" value={form.license_expiry} onChange={(e) => set("license_expiry", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Badge Expiry</label><Input type="date" value={form.badge_expiry} onChange={(e) => set("badge_expiry", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
