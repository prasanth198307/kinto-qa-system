import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = ["2024","2025","2026"];

interface GSTRSummary {
  b2b_count: number;
  b2b_taxable: number;
  b2c_total: number;
  cdn_count: number;
}

interface GSTRFiling {
  id: number;
  return_type: string;
  period: string;
  status: string;
  filed_date: string;
}

interface GSTR3BSummary {
  outward_taxable: number;
  itc_available: number;
  net_tax_payable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

function fmt(n: number) { return `${sym}${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` ; }

export default function GSTRFilingNewPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [ackDialog, setAckDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [ackNo, setAckNo] = useState("");

  const { data: summary, refetch: fetchSummary, isFetching: fetchingSum } = useQuery<GSTRSummary>({
    queryKey: ["gstr-summary", month, year],
    queryFn: () => api("GET", `/api/finance/gstr/summary?month=${month}&year=${year}`),
    enabled: false,
  });

  const { data: filings = [] } = useQuery<GSTRFiling[]>({
    queryKey: ["gstr-filings"],
    queryFn: () => api("GET", "/api/finance/gstr/filings"),
  });

  const { data: summary3b, refetch: fetchSummary3b, isFetching: fetching3b } = useQuery<GSTR3BSummary>({
    queryKey: ["gstr3b-summary", month, year],
    queryFn: () => api("GET", `/api/finance/gstr-3b/summary?month=${month}&year=${year}`),
    enabled: false,
  });

  const prepareMut = useMutation({
    mutationFn: () => api("POST", "/api/finance/gstr/prepare", { month, year }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gstr-filings"] }); toast({ title: "Draft saved successfully" }); },
    onError: () => toast({ title: "Failed to prepare", variant: "destructive" }),
  });

  const fileMut = useMutation({
    mutationFn: ({ id, ack }: { id: number; ack: string }) => api("POST", `/api/finance/gstr/file/${id}`, { ack_number: ack }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gstr-filings"] }); setAckDialog({ open: false, id: null }); toast({ title: "Marked as filed" }); },
    onError: () => toast({ title: "Filing failed", variant: "destructive" }),
  });

  const handleDownload = async (id: number) => {
    const res = await fetch(`/api/finance/gstr/filings/${id}/download`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gstr_${id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const PeriodSelector = () => (
    <div className="flex items-end gap-4 mb-4">
      <div className="space-y-1">
        <Label>Month</Label>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Year</Label>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">GSTR Filing</h1>

      <Tabs defaultValue="gstr1">
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>GSTR-1 — Outward Supplies</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PeriodSelector />
              <div className="flex gap-2">
                <Button onClick={() => fetchSummary()} disabled={fetchingSum}>{fetchingSum ? "Generating..." : "Generate"}</Button>
                <Button variant="outline" onClick={() => prepareMut.mutate()} disabled={prepareMut.isPending}>Prepare & Save Draft</Button>
              </div>
              {summary && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">B2B Invoices</div>
                    <div className="text-xl font-bold">{summary.b2b_count}</div>
                    <div className="text-sm">{fmt(summary.b2b_taxable)} taxable</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">B2C Total</div>
                    <div className="text-xl font-bold">{fmt(summary.b2c_total)}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">CDN Count</div>
                    <div className="text-xl font-bold">{summary.cdn_count}</div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Saved Filings</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filings.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No filings yet</TableCell></TableRow>
                  )}
                  {filings.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>{f.return_type}</TableCell>
                      <TableCell>{f.period}</TableCell>
                      <TableCell><Badge variant={f.status === "Filed" ? "default" : "secondary"}>{f.status}</Badge></TableCell>
                      <TableCell>{f.filed_date ? new Date(f.filed_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleDownload(f.id)}>
                            <Download className="h-3 w-3 mr-1" /> JSON
                          </Button>
                          {f.status !== "Filed" && (
                            <Button size="sm" variant="outline" onClick={() => { setAckDialog({ open: true, id: f.id }); setAckNo(""); }}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Mark Filed
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gstr3b" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>GSTR-3B — Tax Liability Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PeriodSelector />
              <Button onClick={() => fetchSummary3b()} disabled={fetching3b}>{fetching3b ? "Loading..." : "Load Summary"}</Button>
              {summary3b && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Outward Taxable Supplies</div>
                      <div className="text-xl font-bold">{fmt(summary3b.outward_taxable)}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">ITC Available</div>
                      <div className="text-xl font-bold">{fmt(summary3b.itc_available)}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Net Tax Payable</div>
                      <div className="text-xl font-bold text-red-600">{fmt(summary3b.net_tax_payable)}</div>
                    </Card>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-3"><div className="text-xs text-muted-foreground">CGST</div><div className="font-bold">{fmt(summary3b.cgst)}</div></Card>
                    <Card className="p-3"><div className="text-xs text-muted-foreground">SGST</div><div className="font-bold">{fmt(summary3b.sgst)}</div></Card>
                    <Card className="p-3"><div className="text-xs text-muted-foreground">IGST</div><div className="font-bold">{fmt(summary3b.igst)}</div></Card>
                  </div>
                  <Button onClick={() => { setAckDialog({ open: true, id: 0 }); setAckNo(""); }}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Mark GSTR-3B as Filed
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={ackDialog.open} onOpenChange={o => setAckDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Acknowledgement Number</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>ACK Number</Label>
            <Input value={ackNo} onChange={e => setAckNo(e.target.value)} placeholder="e.g. AA2606261234567" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialog({ open: false, id: null })}>Cancel</Button>
            <Button onClick={() => ackDialog.id !== null && fileMut.mutate({ id: ackDialog.id, ack: ackNo })} disabled={!ackNo || fileMut.isPending}>
              Confirm Filed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
