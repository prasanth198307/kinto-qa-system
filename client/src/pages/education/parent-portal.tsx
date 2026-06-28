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

export default function EducationParentPortalPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ target: "all-parents", channel: "SMS", message: "" });

  const { data: logs = [] } = useQuery({ queryKey: ["/api/education/alerts"], queryFn: () => api("GET", "/api/education/alerts/send") });

  const sendMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/alerts/send", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/alerts"] }); setForm(p => ({...p, message: ""})); toast({ title: "Notification sent" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Parent Portal — Notifications</h1>

      <Card>
        <CardHeader><CardTitle>Send Notification</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Target</label>
              <Select value={form.target} onValueChange={v => setForm(p => ({...p, target: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-parents">All Parents</SelectItem>
                  <SelectItem value="class">By Class</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Channel</label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({...p, channel: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="App">App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <label className="text-sm font-medium">Message</label>
              <Input value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} placeholder="Type your message..." />
            </div>
          </div>
          <Button className="mt-4" onClick={() => sendMutation.mutate(form)} disabled={sendMutation.isPending || !form.message}>Send Notification</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notification Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Target</TableHead><TableHead>Channel</TableHead>
                <TableHead>Message</TableHead><TableHead>Sent</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.date}</TableCell>
                  <TableCell>{l.target}</TableCell>
                  <TableCell><Badge variant="secondary">{l.channel}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{l.message_preview}</TableCell>
                  <TableCell>{l.sent_count}</TableCell>
                  <TableCell><Badge variant={l.status === "delivered" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
