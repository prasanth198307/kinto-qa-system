import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { template_name: "", doc_type: "", paper_size: "A4", orientation: "portrait", header_html: "", footer_html: "" };

export default function MastersPrintTemplatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState<any>(null);

  const { data: templates = [] } = useQuery({ queryKey: ["/api/masters/print-templates"], queryFn: () => api("GET", "/api/masters/print-templates") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/print-templates", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/print-templates"] }); toast({ title: "Template saved" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Print Templates</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Template</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Configure Print Template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Template Name" value={form.template_name} onChange={e => set("template_name", e.target.value)} />
              <Select value={form.doc_type} onValueChange={v => set("doc_type", v)}>
                <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
                <SelectContent>
                  {["Invoice","Gatepass","Payslip","PO","GRN","Quotation","Delivery Challan"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.paper_size} onValueChange={v => set("paper_size", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.orientation} onValueChange={v => set("orientation", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <textarea className="w-full h-20 p-2 border rounded text-sm" placeholder="Header HTML..." value={form.header_html} onChange={e => set("header_html", e.target.value)} />
            <textarea className="w-full h-20 p-2 border rounded text-sm" placeholder="Footer HTML..." value={form.footer_html} onChange={e => set("footer_html", e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {selected && (
        <Card>
          <CardHeader><CardTitle>Preview: {selected.template_name}</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded p-4 bg-white min-h-32 text-sm text-muted-foreground italic">
              [{selected.paper_size} {selected.orientation} — preview placeholder]
            </div>
            <Button variant="outline" className="mt-2" onClick={() => setSelected(null)}>Close</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Template Name</TableHead><TableHead>Doc Type</TableHead><TableHead>Paper Size</TableHead>
              <TableHead>Orientation</TableHead><TableHead>Last Updated</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(templates) && templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.template_name}</TableCell><TableCell>{t.doc_type}</TableCell>
                  <TableCell>{t.paper_size}</TableCell><TableCell>{t.orientation}</TableCell>
                  <TableCell>{t.last_updated?.slice(0,10) || t.updated_at?.slice(0,10)}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(t)}>Preview</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
