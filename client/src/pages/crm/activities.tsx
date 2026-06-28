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

export default function CRMActivitiesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ activity_type: "", contact_id: "", subject: "", notes: "", outcome: "", follow_up_date: "" });

  const { data: activities = [] } = useQuery({ queryKey: ["/api/crm/activities"], queryFn: () => api("GET", "/api/crm/activities") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/call-logs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/activities"] }); setShowForm(false); toast({ title: "Activity logged" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayPending = activities.filter((a: any) => a.follow_up_date === today && a.status !== "done");
  const typeColor: Record<string,string> = { call: "default", email: "secondary", meeting: "outline", task: "outline", "follow-up": "secondary" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Activities</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Log Activity</Button>
      </div>

      {todayPending.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader><CardTitle className="text-orange-700">Today's Pending ({todayPending.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayPending.map((a: any) => (
                <div key={a.id} className="flex justify-between items-center text-sm">
                  <span><Badge variant="outline">{a.activity_type || a.type}</Badge> {a.contact_name} — {a.subject}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Log Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Activity Type</label>
                <Select value={form.activity_type} onValueChange={v => setForm(p => ({...p, activity_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{["call","email","meeting","task","follow-up"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["contact_id","subject","notes","outcome","follow_up_date"].map(k => (
                <div key={k} className={["notes","outcome"].includes(k) ? "col-span-2" : ""}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("date") ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Activities</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead>
                <TableHead>Subject</TableHead><TableHead>Outcome</TableHead><TableHead>Next Action</TableHead><TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.date || a.created_at}</TableCell>
                  <TableCell><Badge variant={(typeColor[a.activity_type || a.type] as any) || "secondary"}>{a.activity_type || a.type}</Badge></TableCell>
                  <TableCell>{a.contact_name}</TableCell>
                  <TableCell>{a.subject}</TableCell>
                  <TableCell>{a.outcome}</TableCell>
                  <TableCell>{a.next_action || a.follow_up_date}</TableCell>
                  <TableCell>{a.assigned_to}</TableCell>
                </TableRow>
              ))}
              {activities.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No activities found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
