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

const TRIGGER_EVENTS = ["invoice-created","payment-received","order-placed","shipment-dispatched","return-initiated","low-stock-alert"];
const EMPTY = { template_name: "", subject: "", body: "", trigger_event: "" };

export default function MastersEmailTemplatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState<any>(null);

  const { data: templates = [] } = useQuery({ queryKey: ["/api/masters/email-templates"], queryFn: () => api("GET", "/api/masters/email-templates") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/email-templates", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/email-templates"] }); toast({ title: "Template saved" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Template</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Email Template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Template Name" value={form.template_name} onChange={e => set("template_name", e.target.value)} />
              <Input placeholder="Subject" value={form.subject} onChange={e => set("subject", e.target.value)} />
              <Select value={form.trigger_event} onValueChange={v => set("trigger_event", v)}>
                <SelectTrigger><SelectValue placeholder="Trigger Event" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <textarea
              className="w-full h-40 p-2 border rounded text-sm"
              placeholder="Email body (HTML supported)..."
              value={form.body}
              onChange={e => set("body", e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {preview && (
        <Card>
          <CardHeader><CardTitle>Preview: {preview.template_name}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold mb-2">Subject: {preview.subject}</p>
            <div className="border rounded p-3 bg-white text-sm" dangerouslySetInnerHTML={{ __html: preview.body || "" }} />
            <Button variant="outline" className="mt-2" onClick={() => setPreview(null)}>Close</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Template Name</TableHead><TableHead>Subject</TableHead><TableHead>Trigger Event</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(templates) && templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.template_name}</TableCell><TableCell>{t.subject}</TableCell>
                  <TableCell>{t.trigger_event}</TableCell>
                  <TableCell><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status || "active"}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setPreview(t)}>Preview</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
