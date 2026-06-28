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

const TRIGGER_EVENTS = ["invoice-created","payment-received","order-placed","shipment-dispatched","return-initiated","otp-verification"];
const EMPTY = { template_name: "", message: "", dlt_template_id: "", trigger_event: "", variables_used: "" };

export default function MastersSMSTemplatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: templates = [] } = useQuery({ queryKey: ["/api/masters/sms-templates"], queryFn: () => api("GET", "/api/masters/sms-templates") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/sms-templates", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/sms-templates"] }); toast({ title: "SMS Template saved" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SMS Templates</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Template</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add SMS Template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Template Name" value={form.template_name} onChange={e => set("template_name", e.target.value)} />
              <Input placeholder="DLT Template ID" value={form.dlt_template_id} onChange={e => set("dlt_template_id", e.target.value)} />
              <Select value={form.trigger_event} onValueChange={v => set("trigger_event", v)}>
                <SelectTrigger><SelectValue placeholder="Trigger Event" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Variables Used (e.g. {name},{amount})" value={form.variables_used} onChange={e => set("variables_used", e.target.value)} />
            </div>
            <div>
              <textarea
                className="w-full h-24 p-2 border rounded text-sm"
                placeholder="SMS message text..."
                value={form.message}
                onChange={e => set("message", e.target.value)}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">{form.message.length}/160 characters</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Template Name</TableHead><TableHead>Message</TableHead><TableHead>DLT ID</TableHead>
              <TableHead>Trigger</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(templates) && templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.template_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{t.message}</TableCell>
                  <TableCell>{t.dlt_template_id || t.DLT_template_id}</TableCell>
                  <TableCell>{t.trigger_event}</TableCell>
                  <TableCell><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status || "active"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
