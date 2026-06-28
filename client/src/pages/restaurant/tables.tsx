import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_BADGE: Record<string, string> = { available: "bg-green-100 text-green-700", occupied: "bg-red-100 text-red-700", reserved: "bg-yellow-100 text-yellow-700" };

const emptyForm = { table_number: "", section: "", capacity: "", shape: "rectangle", outlet_id: "" };

export default function RestaurantTablesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"list" | "add">("list");
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: tables = [], isLoading } = useQuery({ queryKey: ["/api/restaurant/tables"], queryFn: () => api("GET", "/api/restaurant/tables") });
  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });

  const addMutation = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/tables", { ...form, capacity: Number(form.capacity), outlet_id: Number(form.outlet_id) }),
    onSuccess: () => { toast({ title: "Table added" }); setForm({ ...emptyForm }); setTab("list"); qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); },
    onError: () => toast({ title: "Failed to add table", variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/tables/${id}`, { ...editForm, capacity: Number(editForm.capacity) }),
    onSuccess: () => { toast({ title: "Table updated" }); setEditId(null); qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/tables/${id}`),
    onSuccess: () => { toast({ title: "Table deleted" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); },
  });

  const sections: Record<string, number> = {};
  tables.forEach((t: any) => { sections[t.section ?? "Default"] = (sections[t.section ?? "Default"] ?? 0) + 1; });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Table Management</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "list" ? "default" : "outline"} onClick={() => setTab("list")}>Table List</Button>
          <Button size="sm" variant={tab === "add" ? "default" : "outline"} onClick={() => setTab("add")}>Add Table</Button>
        </div>
      </div>

      {/* Section summary */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(sections).map(([s, count]) => (
          <Card key={s} className="px-4 py-2 text-center min-w-[100px]">
            <div className="font-bold text-lg">{count}</div>
            <div className="text-xs text-gray-500">{s}</div>
          </Card>
        ))}
      </div>

      {tab === "list" && (
        <Card>
          <CardHeader><CardTitle className="text-base">All Tables ({tables.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="p-4 text-center text-gray-400">Loading...</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table #</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Shape</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((t: any) => (
                    <TableRow key={t.id}>
                      {editId === t.id ? (
                        <>
                          <TableCell><Input className="h-7 w-20" value={editForm.tableNumber ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, tableNumber: e.target.value }))} /></TableCell>
                          <TableCell><Input className="h-7 w-24" value={editForm.section ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, section: e.target.value }))} /></TableCell>
                          <TableCell><Input className="h-7 w-16" type="number" value={editForm.capacity ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, capacity: e.target.value }))} /></TableCell>
                          <TableCell>
                            <Select value={editForm.shape ?? "rectangle"} onValueChange={v => setEditForm((f: any) => ({ ...f, shape: v }))}>
                              <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rectangle">Rectangle</SelectItem>
                                <SelectItem value="circle">Circle</SelectItem>
                                <SelectItem value="square">Square</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs" onClick={() => editMutation.mutate(t.id)}>Save</Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">T{t.tableNumber}</TableCell>
                          <TableCell>{t.section ?? "—"}</TableCell>
                          <TableCell>{t.capacity}</TableCell>
                          <TableCell className="capitalize">{t.shape ?? "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[t.status] ?? "bg-gray-100 text-gray-700"}`}>{t.status}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setEditId(t.id); setEditForm({ tableNumber: t.tableNumber, section: t.section, capacity: t.capacity, shape: t.shape }); }}>Edit</Button>
                              <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => { if (confirm(`Delete table T${t.tableNumber}?`)) deleteMutation.mutate(t.id); }}>Del</Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "add" && (
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-base">Add New Table</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><label className="text-xs font-medium">Table Number</label><Input value={form.table_number} onChange={e => set("table_number", e.target.value)} placeholder="e.g. 1, 2A" /></div>
            <div><label className="text-xs font-medium">Section</label><Input value={form.section} onChange={e => set("section", e.target.value)} placeholder="e.g. Ground Floor, Terrace" /></div>
            <div><label className="text-xs font-medium">Capacity</label><Input type="number" value={form.capacity} onChange={e => set("capacity", e.target.value)} placeholder="4" /></div>
            <div>
              <label className="text-xs font-medium">Shape</label>
              <Select value={form.shape} onValueChange={v => set("shape", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangle">Rectangle</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Outlet</label>
              <Select value={form.outlet_id} onValueChange={v => set("outlet_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => addMutation.mutate()} disabled={!form.table_number || !form.capacity || !form.outlet_id}>Add Table</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
