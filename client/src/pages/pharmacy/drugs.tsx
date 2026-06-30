import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Drug {
  id: number; drug_name: string; generic_name: string; manufacturer: string; schedule_type: string;
  composition: string; pack_size: string; mrp: number; gst_rate: number; reorder_level: number; is_active: boolean;
}

const scheduleColors: Record<string, string> = {
  General: "bg-green-100 text-green-800", OTC: "bg-blue-100 text-blue-800",
  H: "bg-yellow-100 text-yellow-800", H1: "bg-orange-100 text-orange-800", X: "bg-red-100 text-red-800",
};

const blank = { drug_name: "", generic_name: "", manufacturer: "", schedule_type: "General", composition: "", pack_size: "", mrp: 0, gst_rate: 12, reorder_level: 10 };

export default function PharmacyDrugs() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Drug | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data: drugs = [], isLoading } = useQuery<Drug[]>({
    queryKey: ["pharmacy-drugs", search, scheduleFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (scheduleFilter !== "all") params.set("schedule", scheduleFilter);
      return api("GET", `/api/pharmacy/drugs?${params}`);
    },
  });

  const saveDrug = useMutation({
    mutationFn: (data: any) =>
      editing ? api("PUT", `/api/pharmacy/drugs/${editing.id}`, data) : api("POST", "/api/pharmacy/drugs", data),
    onSuccess: () => {
      toast({ title: editing ? "Drug updated" : "Drug added" });
      qc.invalidateQueries({ queryKey: ["pharmacy-drugs"] });
      setOpen(false);
      setEditing(null);
      setForm({ ...blank });
    },
    onError: () => toast({ title: "Failed to save drug", variant: "destructive" }),
  });

  const openAdd = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (d: Drug) => { setEditing(d); setForm({ drug_name: d.drug_name, generic_name: d.generic_name, manufacturer: d.manufacturer, schedule_type: d.schedule_type, composition: d.composition, pack_size: d.pack_size, mrp: d.mrp, gst_rate: d.gst_rate, reorder_level: d.reorder_level }); setOpen(true); };
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drug Master</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Drug</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by drug name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Schedule" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="OTC">OTC</SelectItem>
            <SelectItem value="H">Schedule H</SelectItem>
            <SelectItem value="H1">Schedule H1</SelectItem>
            <SelectItem value="X">Schedule X</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug Name</TableHead><TableHead>Generic Name</TableHead><TableHead>Manufacturer</TableHead>
                <TableHead>Schedule</TableHead><TableHead>MRP</TableHead><TableHead>GST%</TableHead>
                <TableHead>Composition</TableHead><TableHead>Pack</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={10} className="text-center">Loading...</TableCell></TableRow>}
              {!isLoading && Array.isArray(drugs) && drugs.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No drugs found</TableCell></TableRow>}
              {Array.isArray(drugs) && drugs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.drug_name}</TableCell>
                  <TableCell>{d.generic_name}</TableCell>
                  <TableCell>{d.manufacturer}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${scheduleColors[d.schedule_type] || "bg-gray-100 text-gray-800"}`}>{d.schedule_type}</span>
                  </TableCell>
                  <TableCell>₹{d.mrp}</TableCell>
                  <TableCell>{d.gst_rate}%</TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{d.composition}</TableCell>
                  <TableCell>{d.pack_size}</TableCell>
                  <TableCell><Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Drug" : "Add Drug"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1"><Label>Drug Name *</Label><Input value={form.drug_name} onChange={f("drug_name")} /></div>
            <div className="space-y-1"><Label>Generic Name</Label><Input value={form.generic_name} onChange={f("generic_name")} /></div>
            <div className="space-y-1"><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={f("manufacturer")} /></div>
            <div className="space-y-1">
              <Label>Schedule Type</Label>
              <Select value={form.schedule_type} onValueChange={(v) => setForm((p) => ({ ...p, schedule_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="OTC">OTC</SelectItem>
                  <SelectItem value="H">Schedule H</SelectItem>
                  <SelectItem value="H1">Schedule H1</SelectItem>
                  <SelectItem value="X">Schedule X</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Pack Size</Label><Input value={form.pack_size} onChange={f("pack_size")} placeholder="e.g. 10 tablets" /></div>
            <div className="space-y-1"><Label>MRP (₹)</Label><Input type="number" value={form.mrp} onChange={f("mrp")} /></div>
            <div className="space-y-1"><Label>GST Rate (%)</Label><Input type="number" value={form.gst_rate} onChange={f("gst_rate")} /></div>
            <div className="space-y-1"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={f("reorder_level")} /></div>
            <div className="col-span-2 space-y-1"><Label>Composition</Label><Input value={form.composition} onChange={f("composition")} placeholder="Active ingredients" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveDrug.mutate(form)} disabled={saveDrug.isPending || !form.drug_name}>
              {saveDrug.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
