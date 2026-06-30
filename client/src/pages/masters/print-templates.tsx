import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Pencil, Trash2, Eye, Copy, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MODULES = [
  { value: "invoice",       label: "Sales Invoice" },
  { value: "purchase",      label: "Purchase Order" },
  { value: "gatepass",      label: "Delivery / Gate Pass" },
  { value: "receipt",       label: "Payment Receipt" },
  { value: "credit_note",   label: "Credit Note" },
  { value: "debit_note",    label: "Debit Note" },
  { value: "payslip",       label: "Salary Payslip" },
  { value: "lr",            label: "Lorry Receipt (LR)" },
  { value: "hotel_folio",   label: "Hotel Folio / Bill" },
  { value: "fee_receipt",   label: "School Fee Receipt" },
  { value: "donation_80g",  label: "80G Donation Certificate" },
  { value: "nidhi_passbook",label: "Nidhi Passbook Page" },
  { value: "pharmacy_label",label: "Pharmacy Drug Label" },
  { value: "kot",           label: "Kitchen Order Ticket (KOT)" },
];

const PAPER_SIZES = ["A4", "A5", "Letter", "Legal", "Thermal 80mm", "Thermal 57mm"];
const ORIENTATIONS = ["portrait", "landscape"];

const DEFAULT_HEADER = `<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:8px;">
  <h2 style="margin:0;">{{company_name}}</h2>
  <p style="margin:2px 0;font-size:12px;">{{company_address}}</p>
  <p style="margin:2px 0;font-size:11px;">GSTIN: {{gstin}} | Ph: {{phone}}</p>
</div>`;

const DEFAULT_BODY = `<table width="100%" border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
  <thead style="background:#f0f0f0;">
    <tr>
      <th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Amount</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{@index_plus_1}}</td>
      <td>{{name}}</td>
      <td>{{hsn_code}}</td>
      <td>{{quantity}} {{unit}}</td>
      <td style="text-align:right;">{{rate}}</td>
      <td style="text-align:right;">{{tax_amount}}</td>
      <td style="text-align:right;">{{line_total}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`;

const DEFAULT_FOOTER = `<div style="margin-top:12px;font-size:11px;">
  <div style="display:flex;justify-content:space-between;">
    <div>
      <p>Amount in words: <strong>{{amount_in_words}}</strong></p>
      <p style="margin-top:8px;">Terms &amp; Conditions apply.</p>
    </div>
    <div style="text-align:right;">
      <table style="font-size:12px;margin-left:auto;">
        <tr><td>Subtotal:</td><td style="text-align:right;">{{subtotal}}</td></tr>
        <tr><td>GST:</td><td style="text-align:right;">{{total_tax}}</td></tr>
        <tr><td><strong>Total:</strong></td><td style="text-align:right;"><strong>{{grand_total}}</strong></td></tr>
      </table>
      <p style="margin-top:30px;">Authorised Signatory</p>
    </div>
  </div>
</div>`;

interface PrintTemplate {
  id?: string;
  template_key: string;
  template_name: string;
  module: string;
  paper_size: string;
  orientation: string;
  header_html: string;
  body_html: string;
  footer_html: string;
  css: string;
  is_default: number;
  is_system: number;
}

export default function PrintTemplatesPage() {
  const [filterModule, setFilterModule] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editing, setEditing] = useState<PrintTemplate | null>(null);
  const [activeSection, setActiveSection] = useState("header");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: templates = [] } = useQuery<PrintTemplate[]>({
    queryKey: ["/api/masters/print-templates"],
    queryFn: () => fetch("/api/masters/print-templates").then(r => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (data: PrintTemplate) =>
      apiRequest(data.id ? "PUT" : "POST", `/api/masters/print-templates${data.id ? `/${data.id}` : ""}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/masters/print-templates"] });
      setEditOpen(false);
      toast({ title: "Template saved" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/masters/print-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/masters/print-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/masters/print-templates/${id}/set-default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/print-templates"] }),
  });

  const openNew = () => {
    setEditing({
      template_key: `tmpl_${Date.now()}`,
      template_name: "",
      module: "invoice",
      paper_size: "A4",
      orientation: "portrait",
      header_html: DEFAULT_HEADER,
      body_html: DEFAULT_BODY,
      footer_html: DEFAULT_FOOTER,
      css: "body { font-family: Arial, sans-serif; font-size: 12px; }",
      is_default: 0,
      is_system: 0,
    });
    setActiveSection("header");
    setEditOpen(true);
  };

  const openEdit = (t: PrintTemplate) => {
    setEditing({ ...t });
    setActiveSection("header");
    setEditOpen(true);
  };

  const duplicate = (t: PrintTemplate) => {
    setEditing({
      ...t,
      id: undefined,
      template_key: `${t.template_key}_copy`,
      template_name: `${t.template_name} (Copy)`,
      is_default: 0,
      is_system: 0,
    });
    setActiveSection("header");
    setEditOpen(true);
  };

  const previewHtml = editing
    ? `<style>${editing.css}</style>${editing.header_html}${editing.body_html}${editing.footer_html}`
    : "";

  const filtered = templates.filter(t => filterModule === "all" || t.module === filterModule);
  const moduleLabel = (m: string) => MODULES.find(x => x.value === m)?.label ?? m;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Customize HTML templates for invoices, receipts, LRs, payslips & more</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Template</Button>
      </div>

      {/* Module filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterModule === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterModule("all")}>All</Button>
        {MODULES.map(m => (
          <Button key={m.value} variant={filterModule === m.value ? "default" : "outline"} size="sm" onClick={() => setFilterModule(m.value)}>
            {m.label}
          </Button>
        ))}
      </div>

      {/* Template cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">Click "New Template" to create your first print template</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.template_name}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{moduleLabel(t.module)}</Badge>
                      <Badge variant="secondary" className="text-xs">{t.paper_size} · {t.orientation}</Badge>
                      {t.is_default === 1 && <Badge className="text-xs bg-yellow-100 text-yellow-700"><Star className="h-2.5 w-2.5 mr-0.5" />Default</Badge>}
                      {t.is_system === 1 && <Badge variant="secondary" className="text-xs">System</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(t)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditing(t); setPreviewOpen(true); }}><Eye className="h-3 w-3 mr-1" />Preview</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => duplicate(t)}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                  {t.is_default !== 1 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => t.id && setDefaultMutation.mutate(t.id)}>
                      <Star className="h-3 w-3 mr-1" />Default
                    </Button>
                  )}
                  {t.is_system !== 1 && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-red-500 hover:text-red-700" onClick={() => t.id && deleteMutation.mutate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Print Template</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Template Name</Label>
                  <Input value={editing.template_name} onChange={e => setEditing({ ...editing, template_name: e.target.value })} placeholder="e.g. Standard GST Invoice" />
                </div>
                <div>
                  <Label className="text-xs">Module</Label>
                  <Select value={editing.module} onValueChange={v => setEditing({ ...editing, module: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Paper Size</Label>
                  <Select value={editing.paper_size} onValueChange={v => setEditing({ ...editing, paper_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAPER_SIZES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Orientation</Label>
                  <Select value={editing.orientation} onValueChange={v => setEditing({ ...editing, orientation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIENTATIONS.map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={editing.is_default === 1} onCheckedChange={v => setEditing({ ...editing, is_default: v ? 1 : 0 })} />
                  <Label className="text-xs">Set as Default</Label>
                </div>
              </div>

              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList>
                  <TabsTrigger value="header">Header HTML</TabsTrigger>
                  <TabsTrigger value="body">Body HTML</TabsTrigger>
                  <TabsTrigger value="footer">Footer HTML</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                </TabsList>
                <TabsContent value="header">
                  <Textarea rows={10} className="font-mono text-xs" value={editing.header_html ?? ""} onChange={e => setEditing({ ...editing, header_html: e.target.value })} />
                </TabsContent>
                <TabsContent value="body">
                  <Textarea rows={14} className="font-mono text-xs" value={editing.body_html ?? ""} onChange={e => setEditing({ ...editing, body_html: e.target.value })} />
                </TabsContent>
                <TabsContent value="footer">
                  <Textarea rows={10} className="font-mono text-xs" value={editing.footer_html ?? ""} onChange={e => setEditing({ ...editing, footer_html: e.target.value })} />
                </TabsContent>
                <TabsContent value="css">
                  <Textarea rows={10} className="font-mono text-xs" value={editing.css ?? ""} onChange={e => setEditing({ ...editing, css: e.target.value })} />
                </TabsContent>
              </Tabs>

              <p className="text-xs text-gray-400">Available variables: {`{{company_name}} {{gstin}} {{invoice_number}} {{date}} {{customer_name}} {{items}} {{subtotal}} {{total_tax}} {{grand_total}} {{amount_in_words}}`}</p>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => { setPreviewOpen(true); }}>
                  <Eye className="h-4 w-4 mr-2" />Preview
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Preview — {editing?.template_name}</DialogTitle></DialogHeader>
          <div className="border rounded bg-white p-4 overflow-auto max-h-[70vh]">
            <iframe
              srcDoc={previewHtml}
              style={{ width: "100%", minHeight: "500px", border: "none" }}
              title="Template Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
