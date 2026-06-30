import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Activity {
  id: number;
  activity_type: string;
  contact_name?: string;
  subject?: string;
  notes?: string;
  activity_date: string;
  status: string;
  assigned_to?: string;
}

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-100 text-blue-800",
  email: "bg-green-100 text-green-800",
  meeting: "bg-purple-100 text-purple-800",
  task: "bg-orange-100 text-orange-800",
};

const EMPTY = { activity_type: "call", contact_name: "", subject: "", notes: "", activity_date: "", assigned_to: "", status: "pending" };

export default function ActivitiesPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["crm-activities"],
    queryFn: () => api("GET", "/api/crm/activities"),
  });

  const addMutation = useMutation({
    mutationFn: (a: typeof EMPTY) => api("POST", "/api/crm/activities", a),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-activities"] }); setDialog(false); setForm(EMPTY); },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api("PATCH", `/api/crm/activities/${id}`, { status: "completed" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-activities"] }),
  });

  const filtered = activities.filter((a) => {
    if (typeFilter !== "all" && a.activity_type !== typeFilter) return false;
    if (assignedFilter && !a.assigned_to?.toLowerCase().includes(assignedFilter.toLowerCase())) return false;
    if (dateFrom && a.activity_date < dateFrom) return false;
    if (dateTo && a.activity_date > dateTo) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activities</h1>
        <Button onClick={() => setDialog(true)}>
          <Plus size={16} className="mr-1" /> Add Activity
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["call", "email", "meeting", "task"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Assigned to..." className="w-40" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} />
        <div className="flex items-center gap-2">
          <Input type="date" className="w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <Input type="date" className="w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {(typeFilter !== "all" || assignedFilter || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setAssignedFilter(""); setDateFrom(""); setDateTo(""); }}>Clear</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-gray-400">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject / Notes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No activities found</TableCell></TableRow>}
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${TYPE_COLORS[a.activity_type] || "bg-gray-100 text-gray-800"}`}>
                        {a.activity_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{a.contact_name || "—"}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{a.subject || a.notes || "—"}</TableCell>
                    <TableCell className="text-sm">{a.activity_date ? new Date(a.activity_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "completed" ? "default" : "secondary"} className="capitalize text-xs">{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.assigned_to || "—"}</TableCell>
                    <TableCell>
                      {a.status !== "completed" && (
                        <Button size="sm" variant="ghost" onClick={() => completeMutation.mutate(a.id)}>
                          <CheckCircle size={14} className="mr-1 text-green-600" /> Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Activity</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Type</label>
              <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["call", "email", "meeting", "task"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["contact_name", "subject", "assigned_to"] as const).map((f) => (
                <div key={f}>
                  <label className="text-xs font-medium capitalize">{f.replace("_", " ")}</label>
                  <Input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium">Date</label>
                <Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <textarea className="w-full border rounded p-2 text-sm min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
