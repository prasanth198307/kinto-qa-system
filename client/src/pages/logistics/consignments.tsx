import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Navigation } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const empty = { lr_number: "", consignor: "", consignee: "", origin: "", destination: "", weight: "", freight_amount: "", booking_date: "", description: "" };
const statusColor: Record<string, string> = { booked: "secondary", "in-transit": "default", delivered: "outline", cancelled: "destructive" };

export default function ConsignmentsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({ queryKey: ["logistics-consignments"], queryFn: () => api("GET", "/api/logistics/consignments") });
  const consignments: any[] = Array.isArray(data) ? data : [];

  const { data: trackData } = useQuery({ queryKey: ["consignment-track", selected?.id], queryFn: () => api("GET", `/api/logistics/consignments/${selected?.id}/track`), enabled: !!selected?.id && trackOpen });
  const trackHistory: any[] = Array.isArray(trackData?.history) ? trackData.history : [];

  const addConsignment = useMutation({
    mutationFn: (body: any) => api("POST", "/api/logistics/consignments", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["logistics-consignments"] }); setAddOpen(false); setForm(empty); },
  });

  const filtered = consignments.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.lr_number?.toLowerCase().includes(q) || c.consignor?.toLowerCase().includes(q);
  });

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consignment / LR Tracking</h1>
        <Button onClick={() => { setForm(empty); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Consignment</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search LR number or consignor..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
      {isError && <p className="text-center text-destructive py-8">Failed to load consignments.</p>}

      {!isLoading && !isError && (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>LR Number</TableHead><TableHead>Consignor</TableHead><TableHead>Consignee</TableHead><TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead>Weight (kg)</TableHead><TableHead>Freight (₹)</TableHead><TableHead>Status</TableHead><TableHead>Booking Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No consignments found.</TableCell></TableRow>}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.lr_number}</TableCell>
                  <TableCell>{c.consignor}</TableCell>
                  <TableCell>{c.consignee}</TableCell>
                  <TableCell>{c.origin}</TableCell>
                  <TableCell>{c.destination}</TableCell>
                  <TableCell>{c.weight}</TableCell>
                  <TableCell>{c.freight_amount}</TableCell>
                  <TableCell><Badge variant={statusColor[c.status] as any || "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell>{c.booking_date}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(c); setTrackOpen(true); }}><Navigation className="w-3 h-3 mr-1" />Track</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Consignment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">LR Number</label><Input value={form.lr_number} onChange={(e) => set("lr_number", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Booking Date</label><Input type="date" value={form.booking_date} onChange={(e) => set("booking_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Consignor</label><Input value={form.consignor} onChange={(e) => set("consignor", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Consignee</label><Input value={form.consignee} onChange={(e) => set("consignee", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Origin</label><Input value={form.origin} onChange={(e) => set("origin", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Destination</label><Input value={form.destination} onChange={(e) => set("destination", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Weight (kg)</label><Input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></div>
            <div><label className="text-sm font-medium">Freight Amount (₹)</label><Input type="number" value={form.freight_amount} onChange={(e) => set("freight_amount", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addConsignment.mutate(form)} disabled={addConsignment.isPending}>{addConsignment.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Track — {selected?.lr_number}</DialogTitle></DialogHeader>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Current Status:</span> <Badge variant={statusColor[selected?.status] as any || "secondary"}>{selected?.status}</Badge></p>
            <p><span className="font-medium">Route:</span> {selected?.origin} → {selected?.destination}</p>
          </div>
          <div className="mt-4">
            <p className="font-medium text-sm mb-2">Status History</p>
            {trackHistory.length === 0 ? <p className="text-sm text-muted-foreground">No history available.</p> : (
              <ul className="space-y-2">
                {trackHistory.map((h: any, i: number) => (
                  <li key={i} className="text-sm border-l-2 border-primary pl-3">
                    <p className="font-medium">{h.status}</p>
                    <p className="text-muted-foreground">{h.location} — {h.timestamp}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTrackOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
