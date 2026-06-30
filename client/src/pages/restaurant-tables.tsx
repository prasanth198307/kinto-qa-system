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
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

type RestaurantTable = {
  id: number;
  table_number: string;
  section?: string;
  capacity: number;
  shape?: string;
  outlet_id?: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
};
type Outlet = { id: number; outlet_name: string };

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-yellow-400",
  maintenance: "bg-gray-400",
};
const STATUS_BADGE_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  available: "default",
  occupied: "destructive",
  reserved: "secondary",
  maintenance: "outline",
};

const emptyTable = (): Partial<RestaurantTable> => ({
  table_number: "",
  section: "",
  capacity: 4,
  shape: "rectangle",
  outlet_id: undefined,
  status: "available",
  position_x: 0,
  position_y: 0,
  width: 80,
  height: 60,
});

export default function RestaurantTablesPage() {
  const [tab, setTab] = useState<"tables" | "floorplan">("tables");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tables = [] } = useQuery<RestaurantTable[]>({
    queryKey: ["/api/restaurant/tables"],
    queryFn: () => api("GET", "/api/restaurant/tables"),
  });
  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  // ─── TABLE CRUD ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<RestaurantTable>>(emptyTable());
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const saveTable = useMutation({
    mutationFn: (d: Partial<RestaurantTable>) =>
      editId ? api("PUT", `/api/restaurant/tables/${editId}`, d) : api("POST", "/api/restaurant/tables", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      setShowForm(false);
      setForm(emptyTable());
      setEditId(null);
      toast({ title: "Table saved" });
    },
    onError: () => toast({ title: "Error saving table", variant: "destructive" }),
  });
  const deleteTable = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }),
  });
  const closeTable = useMutation({
    mutationFn: (id: number) => api("POST", `/api/restaurant/tables/${id}/close`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }),
  });
  const openTable = useMutation({
    mutationFn: (id: number) => api("POST", `/api/restaurant/tables/${id}/open`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }),
  });
  const markReserved = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/tables/${id}`, { status: "reserved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }),
  });

  // ─── FLOOR PLAN ───────────────────────────────────────────────────────────
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedFloorTable, setSelectedFloorTable] = useState<RestaurantTable | null>(null);
  const [floorPositions, setFloorPositions] = useState<Record<number, { x: number; y: number; w: number; h: number }>>({});

  const saveLayout = useMutation({
    mutationFn: () => {
      const layout = Object.entries(floorPositions).map(([id, pos]) => ({
        id: Number(id),
        position_x: pos.x,
        position_y: pos.y,
        width: pos.w,
        height: pos.h,
      }));
      return api("PUT", "/api/restaurant/floor-plan", { outlet_id: selectedOutlet, layout });
    },
    onSuccess: () => toast({ title: "Floor layout saved" }),
  });

  const getFloorPos = (t: RestaurantTable) =>
    floorPositions[t.id] ?? { x: t.position_x ?? 0, y: t.position_y ?? 0, w: t.width ?? 80, h: t.height ?? 60 };

  const sections = [...new Set(tables.map(t => t.section).filter(Boolean))] as string[];
  const filteredTables = tables.filter(t => {
    if (sectionFilter !== "all" && t.section !== sectionFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });
  const floorTables = selectedOutlet === "all" ? tables : tables.filter(t => String(t.outlet_id) === selectedOutlet);

  // Summary counts
  const counts = {
    total: tables.length,
    available: tables.filter(t => t.status === "available").length,
    occupied: tables.filter(t => t.status === "occupied").length,
    reserved: tables.filter(t => t.status === "reserved").length,
    maintenance: tables.filter(t => t.status === "maintenance").length,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Table Management</h1>
        <div className="flex gap-2">
          <Button variant={tab === "tables" ? "default" : "outline"} size="sm" onClick={() => setTab("tables")}>Tables</Button>
          <Button variant={tab === "floorplan" ? "default" : "outline"} size="sm" onClick={() => setTab("floorplan")}>Floor Plan</Button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Tables", value: counts.total, color: "text-foreground" },
          { label: "Available", value: counts.available, color: "text-green-600" },
          { label: "Occupied", value: counts.occupied, color: "text-red-600" },
          { label: "Reserved", value: counts.reserved, color: "text-yellow-600" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TABLES TAB ── */}
      {tab === "tables" && (
        <div className="space-y-4">
          {/* Visual grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {tables.map(t => (
                  <div
                    key={t.id}
                    className={`${STATUS_COLORS[t.status]} text-white rounded p-2 text-center cursor-pointer transition-opacity hover:opacity-80`}
                    onClick={() => { setForm(t); setEditId(t.id); setShowForm(true); }}
                    title={`${t.section || ""} | Capacity: ${t.capacity} | ${t.status}`}
                  >
                    <div className="font-bold text-sm">{t.table_number}</div>
                    <div className="text-xs opacity-80 capitalize">{t.status.slice(0, 4)}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                {Object.entries(STATUS_COLORS).map(([s, c]) => (
                  <span key={s} className="flex items-center gap-1"><span className={`w-3 h-3 rounded-sm inline-block ${c}`} />{s}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters + Add */}
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Sections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["available", "occupied", "reserved", "maintenance"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="ml-auto" onClick={() => { setForm(emptyTable()); setEditId(null); setShowForm(true); }}>+ Add Table</Button>
          </div>

          {/* Add/Edit form */}
          {showForm && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-2"><CardTitle className="text-base">{editId ? "Edit" : "Add"} Table</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">Table Number *</label>
                  <Input value={form.table_number || ""} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} placeholder="T1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Section</label>
                  <Input value={form.section || ""} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="Indoor, Terrace, Bar..." />
                </div>
                <div>
                  <label className="text-xs font-medium">Capacity</label>
                  <Input type="number" min={1} max={20} value={form.capacity || 4} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Shape</label>
                  <Select value={form.shape || "rectangle"} onValueChange={v => setForm(f => ({ ...f, shape: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["rectangle", "circle", "square", "booth"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Outlet</label>
                  <Select value={String(form.outlet_id || "")} onValueChange={v => setForm(f => ({ ...f, outlet_id: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                    <SelectContent>
                      {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Status</label>
                  <Select value={form.status || "available"} onValueChange={v => setForm(f => ({ ...f, status: v as RestaurantTable["status"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["available", "occupied", "reserved", "maintenance"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={() => saveTable.mutate(form)} disabled={!form.table_number}>Save Table</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table list */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table #</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Shape</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTables.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">{t.table_number}</TableCell>
                      <TableCell>{t.section || "—"}</TableCell>
                      <TableCell>{t.capacity} pax</TableCell>
                      <TableCell className="capitalize">{t.shape || "—"}</TableCell>
                      <TableCell>{outlets.find(o => o.id === t.outlet_id)?.outlet_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[t.status]} className="capitalize">{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => { setForm(t); setEditId(t.id); setShowForm(true); }}>Edit</Button>
                          {t.status !== "available" && (
                            <Button size="sm" variant="outline" className="text-green-700" onClick={() => openTable.mutate(t.id)}>Open</Button>
                          )}
                          {t.status === "available" && (
                            <Button size="sm" variant="outline" className="text-yellow-700" onClick={() => markReserved.mutate(t.id)}>Reserve</Button>
                          )}
                          {t.status === "occupied" && (
                            <Button size="sm" variant="outline" className="text-red-700" onClick={() => closeTable.mutate(t.id)}>Close</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete table ${t.table_number}?`)) deleteTable.mutate(t.id); }}>Del</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTables.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No tables found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FLOOR PLAN TAB ── */}
      {tab === "floorplan" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Outlets" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground flex-1">Click a table to select it, then adjust position and size using the inputs below.</p>
            <Button onClick={() => saveLayout.mutate()}>Save Layout</Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Card>
                <CardContent className="p-2">
                  <div
                    className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded"
                    style={{ width: "100%", height: 600 }}
                  >
                    {floorTables.map(t => {
                      const pos = getFloorPos(t);
                      const isSelected = selectedFloorTable?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`absolute flex flex-col items-center justify-center rounded cursor-pointer transition-all text-white font-bold text-sm select-none
                            ${STATUS_COLORS[t.status]} ${isSelected ? "ring-4 ring-primary ring-offset-1 z-10" : "hover:opacity-80"}`}
                          style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
                          onClick={() => setSelectedFloorTable(t)}
                          title={`${t.section || ""} | Cap: ${t.capacity} | ${t.status}`}
                        >
                          <span>{t.table_number}</span>
                          <span className="text-xs font-normal opacity-80">{t.capacity}p</span>
                        </div>
                      );
                    })}
                    {floorTables.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                        No tables for selected outlet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(STATUS_COLORS).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-2 text-sm">
                      <span className={`w-5 h-5 rounded ${c} inline-block`} />
                      <span className="capitalize">{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {selectedFloorTable && (
                <Card className="border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Table {selectedFloorTable.table_number}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Section: {selectedFloorTable.section || "—"}</div>
                      <div>Capacity: {selectedFloorTable.capacity} pax</div>
                      <div>Status: <span className="capitalize">{selectedFloorTable.status}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["x", "y", "w", "h"] as const).map(k => (
                        <div key={k}>
                          <label className="text-xs font-medium">{k === "x" ? "Left (X)" : k === "y" ? "Top (Y)" : k === "w" ? "Width" : "Height"}</label>
                          <Input
                            type="number"
                            value={getFloorPos(selectedFloorTable)[k]}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setFloorPositions(fp => ({
                                ...fp,
                                [selectedFloorTable.id]: { ...getFloorPos(selectedFloorTable), [k]: val },
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setSelectedFloorTable(null)}>Deselect</Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">All Tables ({floorTables.length})</CardTitle></CardHeader>
                <CardContent className="space-y-1 max-h-64 overflow-y-auto">
                  {floorTables.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedFloorTable(t)}
                      className={`w-full text-left px-2 py-1 rounded text-sm flex items-center justify-between hover:bg-muted transition-colors ${selectedFloorTable?.id === t.id ? "bg-primary/10 font-medium" : ""}`}
                    >
                      <span>{t.table_number} {t.section ? `(${t.section})` : ""}</span>
                      <span className={`w-2 h-2 rounded-full inline-block ${STATUS_COLORS[t.status]}`} />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
