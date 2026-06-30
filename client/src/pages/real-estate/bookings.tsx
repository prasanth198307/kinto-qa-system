import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, XCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUS_COLORS: Record<string, any> = { booked: "default", registered: "outline", cancelled: "destructive" };
const emptyForm = { customer_name: "", unit_number: "", tower: "", floor: "", area_sqft: "", total_value: "", booking_amount: "", project_id: "" };

export default function BookingsPage() {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [cancelReason, setCancelReason] = useState("");

  const { data: projects } = useQuery({ queryKey: ["re-projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const projectList = Array.isArray(projects) ? projects : [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-bookings", projectFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectFilter !== "all") params.set("project_id", projectFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api("GET", `/api/real-estate/bookings?${params}`);
    },
  });

  const bookings = Array.isArray(data) ? data : [];

  const addBooking = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/real-estate/bookings", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-bookings"] }); setAddOpen(false); setForm(emptyForm); },
  });

  const cancelBooking = useMutation({
    mutationFn: ({ id, reason }: any) => api("PUT", `/api/real-estate/bookings/${id}/cancel`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-bookings"] }); setCancelOpen(null); setCancelReason(""); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Booking</Button>
      </div>

      <div className="flex gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load bookings.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tower</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead className="text-right">Area (sqft)</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Booking Amt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No bookings found.</TableCell></TableRow>}
                {bookings.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.booking_number}</TableCell>
                    <TableCell>{b.customer_name}</TableCell>
                    <TableCell>{b.unit_number}</TableCell>
                    <TableCell>{b.tower}</TableCell>
                    <TableCell>{b.floor}</TableCell>
                    <TableCell className="text-right">{b.area_sqft?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(b.total_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(b.booking_amount || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={STATUS_COLORS[b.status] ?? "secondary"}>{b.status}</Badge></TableCell>
                    <TableCell>
                      {b.status !== "cancelled" && (
                        <Button size="icon" variant="ghost" onClick={() => setCancelOpen(b)}><XCircle className="w-4 h-4 text-destructive" /></Button>
                      )}
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
          <DialogHeader><DialogTitle>Add Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
              <SelectContent>{projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <Input placeholder="Unit Number" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tower" value={form.tower} onChange={(e) => setForm({ ...form, tower: e.target.value })} />
              <Input placeholder="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <Input type="number" placeholder="Area (sqft)" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} />
            <Input type="number" placeholder="Total Value" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} />
            <Input type="number" placeholder="Booking Amount" value={form.booking_amount} onChange={(e) => setForm({ ...form, booking_amount: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addBooking.mutate({ ...form, area_sqft: Number(form.area_sqft), total_value: Number(form.total_value), booking_amount: Number(form.booking_amount), project_id: Number(form.project_id) })} disabled={addBooking.isPending}>
              {addBooking.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelOpen} onOpenChange={() => setCancelOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancel Booking</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Booking: {cancelOpen?.booking_number} — {cancelOpen?.customer_name}</p>
          <Input placeholder="Reason for cancellation" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(null)}>Back</Button>
            <Button variant="destructive" onClick={() => cancelBooking.mutate({ id: cancelOpen?.id, reason: cancelReason })} disabled={cancelBooking.isPending}>
              {cancelBooking.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
