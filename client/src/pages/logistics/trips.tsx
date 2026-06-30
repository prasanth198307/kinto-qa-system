import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, MapPin } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const emptyTrip = { trip_number: "", vehicle_number: "", driver_name: "", origin: "", destination: "", scheduled_date: "", notes: "" };
const statusColor: Record<string, string> = { planned: "secondary", "in-transit": "default", delivered: "outline", cancelled: "destructive" };

export default function TripsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyTrip);
  const [newStatus, setNewStatus] = useState("planned");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-trips"], queryFn: () => api("GET", "/api/logistics/trips") });
  const trips: any[] = Array.isArray(data) ? data : [];

  const { data: waypointData } = useQuery({ queryKey: ["trip-waypoints", selected?.id], queryFn: () => api("GET", `/api/logistics/trips/${selected?.id}/waypoints`), enabled: !!selected?.id && detailOpen });
  const waypoints: any[] = Array.isArray(waypointData) ? waypointData : [];

  const addTrip = useMutation({
    mutationFn: (body: any) => api("POST", "/api/logistics/trips", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-trips"] }); setAddOpen(false); setForm(emptyTrip); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/logistics/trips/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-trips"] }); setStatusOpen(false); },
  });

  const filtered = trips.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (dateFrom && t.scheduled_date < dateFrom) return false;
    if (dateTo && t.scheduled_date > dateTo) return false;
    return true;
  });

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trip Management</h1>
        <Button onClick={() => { setForm(emptyTrip); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Trip</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="planned">Planned</SelectItem><SelectItem value="in-transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
            </Select>
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Button variant="outline" onClick={() => { setFilterStatus("all"); setDateFrom(""); setDateTo(""); }}><RefreshCw className="w-4 h-4 mr-1" />Clear</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load trips.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Trip No.</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No trips found.</TableCell></TableRow>}
              {filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(t); setDetailOpen(true); }}>
                  <TableCell className="font-medium">{t.trip_number}</TableCell>
                  <TableCell>{t.vehicle_number}</TableCell>
                  <TableCell>{t.driver_name}</TableCell>
                  <TableCell>{t.origin}</TableCell>
                  <TableCell>{t.destination}</TableCell>
                  <TableCell>{t.scheduled_date}</TableCell>
                  <TableCell><Badge variant={statusColor[t.status] as any || "secondary"}>{t.status}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(t); setNewStatus(t.status); setStatusOpen(true); }}>Update Status</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Trip</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Trip Number</label><Input value={form.trip_number} onChange={(e) => set("trip_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Vehicle Number</label><Input value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Driver Name</label><Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Scheduled Date</label><Input type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Origin</label><Input value={form.origin} onChange={(e) => set("origin", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Destination</label><Input value={form.destination} onChange={(e) => set("destination", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addTrip.mutate(form)} disabled={addTrip.isPending}>{addTrip.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Status — {selected?.trip_number}</DialogTitle></DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="in-transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button onClick={() => updateStatus.mutate({ id: selected?.id, status: newStatus })} disabled={updateStatus.isPending}>{updateStatus.isPending ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Trip Detail — {selected?.trip_number}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Vehicle:</span> {selected?.vehicle_number}</p>
            <p><span className="font-medium">Driver:</span> {selected?.driver_name}</p>
            <p><span className="font-medium">Route:</span> {selected?.origin} → {selected?.destination}</p>
            <p><span className="font-medium">Scheduled:</span> {selected?.scheduled_date}</p>
            <p><span className="font-medium">Status:</span> <Badge variant={statusColor[selected?.status] as any || "secondary"}>{selected?.status}</Badge></p>
          </div>
          <div className="mt-4">
            <p className="font-medium text-sm mb-2 flex items-center gap-1"><MapPin className="w-4 h-4" />Waypoints</p>
            {waypoints.length === 0 ? <p className="text-sm text-muted-foreground">No waypoints recorded.</p> : (
              <ul className="space-y-1">
                {waypoints.map((w: any, i: number) => <li key={i} className="text-sm flex gap-2"><span className="text-muted-foreground">{w.timestamp}</span><span>{w.location}</span></li>)}
              </ul>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
