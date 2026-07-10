import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Send, Settings, Loader2, Download, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  cleared: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  simulated: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-700",
};

export default function ZATCAPortalPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [xmlPreview, setXmlPreview] = useState("");
  const [icv, setIcv] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState({ zatca_vat_no: "", zatca_cr_no: "", zatca_seller_name: "", zatca_csid: "", zatca_env: "sandbox" });

  const { data: existingConfig } = useQuery({
    queryKey: ["zatca-config"],
    queryFn: () => fetch("/api/finance-erp/zatca/config").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (d: any) => { if (d && Object.keys(d).length) setConfig(c => ({ ...c, ...d })); },
  } as any);

  const { data: filings = [] } = useQuery<any[]>({
    queryKey: ["zatca-filings"],
    queryFn: () => fetch("/api/finance-erp/zatca/filings").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const saveConfig = useMutation({
    mutationFn: () => api("POST", "/api/finance-erp/zatca/config", config),
    onSuccess: () => { toast({ title: "ZATCA configuration saved" }); qc.invalidateQueries({ queryKey: ["zatca-config"] }); },
  });

  const generateXML = async () => {
    setGenerating(true);
    try {
      const data = await api("POST", "/api/finance-erp/zatca/generate-xml", { invoice_id: Number(invoiceId) || null });
      setXmlPreview(data.xml || "");
      setIcv(data.icv);
      toast({ title: "XML generated", description: `ICV: ${data.icv} · VAT: SAR ${data.vat_amount}` });
    } catch { toast({ title: "Generation failed", variant: "destructive" }); }
    setGenerating(false);
  };

  const submit = useMutation({
    mutationFn: () => api("POST", "/api/finance-erp/zatca/submit", { invoice_id: Number(invoiceId) || null, invoice_no: invoiceNo, xml_payload: xmlPreview, icv }),
    onSuccess: (d) => {
      toast({ title: d.status === "cleared" ? "Cleared by FATOORA ✓" : `Submitted (${d.status})`, description: d.note });
      qc.invalidateQueries({ queryKey: ["zatca-filings"] });
      setXmlPreview("");
      setInvoiceId(""); setInvoiceNo("");
    },
  });

  const downloadXML = () => {
    const blob = new Blob([xmlPreview], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zatca-invoice-${invoiceNo || invoiceId}.xml`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ZATCA FATOORA Portal</h1>
          <p className="text-sm text-muted-foreground">Saudi Arabia e-invoicing Phase 2 · UBL 2.1 XML clearance · FATOORA API integration</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Submitted</p>
          <p className="text-2xl font-bold">{(filings as any[]).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Cleared</p>
          <p className="text-2xl font-bold text-green-600">{(filings as any[]).filter((f: any) => f.status === "cleared").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Environment</p>
          <Badge className="mt-1">{config.zatca_env || "sandbox"}</Badge>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="submit">
        <TabsList>
          <TabsTrigger value="submit">Submit Invoice</TabsTrigger>
          <TabsTrigger value="filings">Filing History</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-3 w-3 mr-1" />Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Step 1 — Generate UBL 2.1 XML</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Invoice ID (from SwachERP billing)</Label><Input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="123" /></div>
                <div><Label>Invoice No (override)</Label><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="INV-2026-001" /></div>
              </div>
              <Button onClick={generateXML} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Generate XML
              </Button>
              {xmlPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated UBL 2.1 XML {icv && <span className="text-xs text-muted-foreground ml-2">ICV: {icv}</span>}</Label>
                    <Button variant="outline" size="sm" onClick={downloadXML}><Download className="h-3 w-3 mr-1" />Download</Button>
                  </div>
                  <Textarea value={xmlPreview} readOnly rows={8} className="font-mono text-xs" />
                </div>
              )}
            </CardContent>
          </Card>

          {xmlPreview && (
            <Card>
              <CardHeader><CardTitle className="text-base">Step 2 — Submit to FATOORA Portal</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                  {config.zatca_csid
                    ? <span><CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />CSID configured — will attempt live FATOORA clearance API ({config.zatca_env})</span>
                    : "No CSID configured — submission will be recorded as simulation. Configure credentials in the Configuration tab."}
                </div>
                <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Submit for Clearance
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">ZATCA Phase 2 (Integration) Requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>All B2B invoices ≥ SAR 1,000 must be cleared via FATOORA before delivery</li>
              <li>B2C invoices must be reported within 24 hours via reporting mode</li>
              <li>XML must be UBL 2.1 compliant with cryptographic stamp (CSID)</li>
              <li>Obtain CSID by completing ZATCA onboarding at <span className="font-mono">zatca.gov.sa</span></li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="filings">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice No</TableHead><TableHead>ICV</TableHead><TableHead>Status</TableHead><TableHead>Submitted At</TableHead><TableHead>QR Code</TableHead></TableRow></TableHeader>
            <TableBody>
              {(filings as any[]).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.invoice_no || `INV-${f.invoice_id}`}</TableCell>
                  <TableCell>{f.icv}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLOR[f.status] || ""}`}>{f.status}</Badge></TableCell>
                  <TableCell className="text-xs">{f.submitted_at ? new Date(f.submitted_at).toLocaleString("en-SA") : "—"}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{f.qr_code || "—"}</TableCell>
                </TableRow>
              ))}
              {(filings as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No ZATCA filings yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle className="text-base">ZATCA Credentials (AES-256 encrypted per tenant)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>VAT Registration No (15 digits)</Label><Input value={config.zatca_vat_no} onChange={e => setConfig(c => ({ ...c, zatca_vat_no: e.target.value }))} placeholder="3001234567890003" /></div>
                <div><Label>CR Number</Label><Input value={config.zatca_cr_no} onChange={e => setConfig(c => ({ ...c, zatca_cr_no: e.target.value }))} placeholder="1010XXXXXX" /></div>
                <div className="col-span-2"><Label>Seller Name (as registered with ZATCA)</Label><Input value={config.zatca_seller_name} onChange={e => setConfig(c => ({ ...c, zatca_seller_name: e.target.value }))} /></div>
                <div className="col-span-2"><Label>CSID (Compliance SECP256K1 Certificate — Base64)</Label><Input value={config.zatca_csid} onChange={e => setConfig(c => ({ ...c, zatca_csid: e.target.value }))} placeholder="Obtained from ZATCA onboarding (csid field)" /></div>
                <div><Label>Environment</Label>
                  <Select value={config.zatca_env} onValueChange={v => setConfig(c => ({ ...c, zatca_env: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sandbox">Sandbox (Simulation)</SelectItem><SelectItem value="production">Production (Live)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                {saveConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
