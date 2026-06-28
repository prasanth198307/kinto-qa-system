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

export default function RealEstateCustomerPortalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [supportForm, setSupportForm] = useState({ subject: "", description: "" });

  const { data: bookings = [] } = useQuery({ queryKey: ["/api/real-estate/bookings", "my"], queryFn: () => api("GET", "/api/real-estate/bookings?my=true") });
  const { data: collections = [] } = useQuery({ queryKey: ["/api/real-estate/collections", "my"], queryFn: () => api("GET", "/api/real-estate/collections?my=true") });
  const { data: documents = [] } = useQuery({ queryKey: ["/api/real-estate/documents", "my"], queryFn: () => api("GET", "/api/real-estate/documents?my=true") });

  const submitSupport = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/support-requests", d),
    onSuccess: () => { setSupportForm({ subject: "", description: "" }); toast({ title: "Support request submitted" }); }
  });

  const myBooking = bookings[0];

  const paymentStatusColor = (c: any): any => {
    if (Number(c.amount_paid) >= Number(c.amount_due)) return "default";
    if (new Date(c.due_date) < new Date()) return "destructive";
    return "secondary";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Customer Portal</h1>

      {myBooking && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader><CardTitle>My Property</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-sm text-muted-foreground">Customer</div><div className="font-bold">{myBooking.customer_name}</div></div>
              <div><div className="text-sm text-muted-foreground">Project</div><div className="font-bold">{myBooking.project_name}</div></div>
              <div><div className="text-sm text-muted-foreground">Unit</div><div className="font-bold">{myBooking.unit_no}</div></div>
              <div><div className="text-sm text-muted-foreground">Possession Date</div><div className="font-bold">{myBooking.possession_date ? new Date(myBooking.possession_date).toLocaleDateString("en-IN") : "TBD"}</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Payment Schedule</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Milestone</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.milestone_name}</TableCell>
                  <TableCell>{c.due_date ? new Date(c.due_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell>₹{fmt(c.amount_due)}</TableCell>
                  <TableCell>{c.payment_date ? new Date(c.payment_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell><Badge variant={paymentStatusColor(c)}>{Number(c.amount_paid) >= Number(c.amount_due) ? "paid" : new Date(c.due_date) < new Date() ? "overdue" : "pending"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle>My Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((d: any) => (
                <div key={d.id} className="flex justify-between items-center border rounded p-3">
                  <div>
                    <div className="font-medium">{d.doc_name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{d.doc_type}</div>
                  </div>
                  {d.doc_url && <Button size="sm" variant="outline" onClick={() => window.open(d.doc_url, "_blank")}>Download</Button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Support Request</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input placeholder="Subject" value={supportForm.subject} onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })} />
            <textarea className="w-full border rounded p-2 text-sm" rows={4} placeholder="Describe your issue..." value={supportForm.description} onChange={e => setSupportForm({ ...supportForm, description: e.target.value })} />
            <Button onClick={() => submitSupport.mutate(supportForm)}>Submit Request</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
