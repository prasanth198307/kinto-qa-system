import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { format } from "date-fns";
import { Calculator, Plus, CheckCircle2, Clock, IndianRupee, Loader2, FileText } from "lucide-react";

type TdsRate = { id: string; section: string; description: string; individualRate: number; companyRate: number; threshold: number; };
type TdsEntry = { id: string; entryDate: string; vendorName: string; section: string; grossAmount: number; tdsRate: number; tdsAmount: number; netAmount: number; depositStatus: string; depositDate?: string; challanNumber?: string; description?: string; };

export default function TDSManagementPage() {
  const tenantConfig = useTenantConfig();
  const { toast } = useToast();
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState<TdsEntry | null>(null);
  const [activeTab, setActiveTab] = useState("entries");
  const [challanNo, setChallanNo] = useState("");
  const [depositDate, setDepositDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: rates = [] } = useQuery<TdsRate[]>({ queryKey: ["/api/tds-rates"] });
  const { data: entries = [], isLoading } = useQuery<TdsEntry[]>({ queryKey: ["/api/tds-entries"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });

  const pending = entries.filter(e => e.depositStatus === "pending");
  const deposited = entries.filter(e => e.depositStatus === "deposited");

  const fmt = (paise: number) => fmtCur(paise / 100, tenantConfig);
  const fmtRate = (bp: number) => `${(bp / 100).toFixed(1)}%`;

  const [form, setForm] = useState({
    entryDate: format(new Date(), "yyyy-MM-dd"),
    vendorId: "", vendorName: "",
    tdsRateId: "", section: "", tdsRate: "",
    grossAmount: "", description: "",
  });

  const calcTds = () => {
    if (!form.grossAmount || !form.tdsRate) return { tds: 0, net: 0 };
    const gross = Math.round(parseFloat(form.grossAmount) * 100);
    const tds = Math.round(gross * parseInt(form.tdsRate) / 10000);
    return { tds, net: gross - tds };
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const gross = Math.round(parseFloat(form.grossAmount) * 100);
      const rate = parseInt(form.tdsRate);
      const tds = Math.round(gross * rate / 10000);
      const res = await apiRequest("POST", "/api/tds-entries", {
        ...form,
        grossAmount: gross,
        tdsRate: rate,
        tdsAmount: tds,
        netAmount: gross - tds,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tds-entries"] });
      toast({ title: "TDS entry recorded" });
      setAddEntryOpen(false);
      setForm({ entryDate: format(new Date(), "yyyy-MM-dd"), vendorId: "", vendorName: "", tdsRateId: "", section: "", tdsRate: "", grossAmount: "", description: "" });
    },
    onError: (e: any) => toast({ title: "Failed to record TDS", description: e.message, variant: "destructive" }),
  });

  const depositMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/tds-entries/${id}/deposit`, { depositDate, challanNumber: challanNo });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tds-entries"] });
      toast({ title: "TDS marked as deposited" });
      setDepositOpen(null);
    },
    onError: (e: any) => toast({ title: "Failed to update", description: e.message, variant: "destructive" }),
  });

  const EntriesTable = ({ rows }: { rows: TdsEntry[] }) => (
    rows.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-sm"><Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No TDS entries found.</p></div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Section</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">TDS</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Challan</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(e => (
            <TableRow key={e.id} data-testid={`row-tds-${e.id}`}>
              <TableCell>{e.entryDate ? format(new Date(e.entryDate), "dd MMM yyyy") : "-"}</TableCell>
              <TableCell className="font-medium">{e.vendorName}</TableCell>
              <TableCell><Badge variant="outline">{e.section}</Badge></TableCell>
              <TableCell className="text-right">{fmt(e.grossAmount)}</TableCell>
              <TableCell className="text-right">{fmtRate(e.tdsRate)}</TableCell>
              <TableCell className="text-right font-medium">{fmt(e.tdsAmount)}</TableCell>
              <TableCell className="text-right">{fmt(e.netAmount)}</TableCell>
              <TableCell>
                <Badge variant={e.depositStatus === "deposited" ? "secondary" : "outline"}>
                  {e.depositStatus === "deposited" ? "Deposited" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{e.challanNumber || "-"}</TableCell>
              <TableCell className="text-right">
                {e.depositStatus === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => { setDepositOpen(e); setChallanNo(""); setDepositDate(format(new Date(), "yyyy-MM-dd")); }} data-testid={`button-deposit-${e.id}`}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Mark Deposited
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  const { tds: calcedTds, net: calcedNet } = calcTds();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" />TDS Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Tax Deducted at Source — track deductions and deposits</p>
        </div>
        <Button onClick={() => setAddEntryOpen(true)} data-testid="button-add-tds"><Plus className="h-4 w-4 mr-2" />Record TDS</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: entries.length, icon: <FileText className="h-5 w-5" /> },
          { label: "Pending Deposit", value: pending.length, icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: "TDS Pending", value: pending.reduce((s, e) => s + (e.tdsAmount ?? 0), 0), isAmount: true, icon: <IndianRupee className="h-5 w-5 text-destructive" /> },
          { label: "TDS Deposited", value: deposited.reduce((s, e) => s + (e.tdsAmount ?? 0), 0), isAmount: true, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.isAmount ? fmt(s.value as number) : s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">All Entries</TabsTrigger>
          <TabsTrigger value="pending">Pending Deposit ({pending.length})</TabsTrigger>
          <TabsTrigger value="rates">TDS Rate Chart</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4"><Card><CardContent className="p-0">{isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : <EntriesTable rows={entries} />}</CardContent></Card></TabsContent>
        <TabsContent value="pending" className="mt-4"><Card><CardContent className="p-0"><EntriesTable rows={pending} /></CardContent></Card></TabsContent>
        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Indian TDS Rate Chart</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Individual Rate</TableHead>
                    <TableHead className="text-right">Company Rate</TableHead>
                    <TableHead className="text-right">Annual Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map(r => (
                    <TableRow key={r.id} data-testid={`row-rate-${r.id}`}>
                      <TableCell><Badge variant="outline">{r.section}</Badge></TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell className="text-right">{fmtRate(r.individualRate)}</TableCell>
                      <TableCell className="text-right">{fmtRate(r.companyRate)}</TableCell>
                      <TableCell className="text-right">{fmt(r.threshold)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add TDS Entry Dialog */}
      <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-tds">
          <DialogHeader><DialogTitle>Record TDS Deduction</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Entry Date *</Label>
                <Input type="date" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} data-testid="input-tds-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Gross Amount *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.grossAmount} onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))} data-testid="input-tds-gross" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor *</Label>
              <Select value={form.vendorId} onValueChange={v => {
                const vnd = vendors.find((vd: any) => vd.id === v);
                setForm(f => ({ ...f, vendorId: v, vendorName: vnd?.vendorName || "" }));
              }}>
                <SelectTrigger data-testid="select-tds-vendor"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>TDS Section *</Label>
              <Select value={form.tdsRateId} onValueChange={v => {
                const rate = rates.find(r => r.id === v);
                setForm(f => ({ ...f, tdsRateId: v, section: rate?.section || "", tdsRate: rate ? String(rate.companyRate) : "" }));
              }}>
                <SelectTrigger data-testid="select-tds-section"><SelectValue placeholder="Select section..." /></SelectTrigger>
                <SelectContent>
                  {rates.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.section} — {r.description} ({fmtRate(r.companyRate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>TDS Rate (basis pts) *</Label>
                <Input type="number" min="0" value={form.tdsRate} onChange={e => setForm(f => ({ ...f, tdsRate: e.target.value }))} data-testid="input-tds-rate" />
                <p className="text-xs text-muted-foreground">100 bp = 1%</p>
              </div>
              <div className="space-y-1.5">
                <Label>Calculated TDS</Label>
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">{form.grossAmount && form.tdsRate ? fmt(calcedTds) : "-"}</div>
                <p className="text-xs text-muted-foreground">Net payable: {form.grossAmount && form.tdsRate ? fmt(calcedNet) : "-"}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Nature of payment..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-tds-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEntryOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.vendorId || !form.section || !form.grossAmount || !form.tdsRate || addMutation.isPending} data-testid="button-save-tds">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record TDS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Deposited Dialog */}
      <Dialog open={!!depositOpen} onOpenChange={open => !open && setDepositOpen(null)}>
        <DialogContent data-testid="dialog-deposit-tds">
          <DialogHeader><DialogTitle>Mark TDS as Deposited</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium">{depositOpen?.vendorName}</p></div>
              <div><span className="text-muted-foreground">Section:</span><p className="font-medium">{depositOpen?.section}</p></div>
              <div><span className="text-muted-foreground">TDS Amount:</span><p className="font-medium text-destructive">{depositOpen ? fmt(depositOpen.tdsAmount) : "-"}</p></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deposit Date *</Label>
                <Input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)} data-testid="input-deposit-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Challan Number</Label>
                <Input placeholder="e.g. ITNS-281-2026" value={challanNo} onChange={e => setChallanNo(e.target.value)} data-testid="input-challan-no" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(null)}>Cancel</Button>
            <Button onClick={() => depositMutation.mutate(depositOpen!.id)} disabled={!depositDate || depositMutation.isPending} data-testid="button-confirm-deposit">
              {depositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Mark Deposited
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
