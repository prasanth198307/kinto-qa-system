import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Download, Edit, Save, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const PURPOSES = ["Education", "Health", "Religious", "Social Welfare", "Cultural", "Economic Development", "Other"];
const COUNTRIES = ["USA", "UK", "Germany", "Canada", "Australia", "UAE", "Singapore", "Japan", "Netherlands", "France"];

const BLANK_RECEIPT = { donor_name: "", donor_country: "", amount: "", currency: "USD", purpose: "Education", date: "", reference: "" };

const MOCK_RECEIPTS = [
  { id: 1, donor: "Global Education Fund", country: "USA", amount: 500000, currency: "USD", purpose: "Education", date: "2026-03-15", reference: "GEF-2026-001" },
  { id: 2, donor: "Health For All Foundation", country: "UK", amount: 250000, currency: "GBP", purpose: "Health", date: "2026-01-20", reference: "HFAF-2026-012" },
  { id: 3, donor: "Deutsche Entwicklung", country: "Germany", amount: 180000, currency: "EUR", purpose: "Social Welfare", date: "2025-11-10", reference: "DE-2025-099" },
];

const MOCK_UTILIZATION = [
  { project: "School Building Fund", sanctioned: 500000, utilized: 450000, balance: 50000 },
  { project: "Rural Health Camp", sanctioned: 250000, utilized: 220000, balance: 30000 },
  { project: "Women Empowerment", sanctioned: 180000, utilized: 95000, balance: 85000 },
];

export default function FCRAPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editReg, setEditReg] = useState(false);
  const [reg, setReg] = useState({ registration_number: "FCRA-2021-12345", validity_date: "2031-03-31", designated_bank: "State Bank of India", account_number: "FCRA-ACC-9876" });
  const [receipts, setReceipts] = useState(MOCK_RECEIPTS);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK_RECEIPT });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: serverData } = useQuery({
    queryKey: ["fcra-data"],
    queryFn: () => api("GET", "/api/ngo/fcra"),
  });

  const saveReceipt = useMutation({
    mutationFn: () => api("POST", "/api/ngo/fcra", form),
    onSuccess: () => {
      setReceipts(prev => [...prev, { id: prev.length + 1, donor: form.donor_name, country: form.donor_country, amount: Number(form.amount), currency: form.currency, purpose: form.purpose, date: form.date, reference: form.reference }]);
      toast({ title: "Foreign receipt recorded" });
      qc.invalidateQueries({ queryKey: ["fcra-data"] });
      setForm({ ...BLANK_RECEIPT });
      setShowDialog(false);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const exportFC4 = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FC4Return>
  <RegistrationNo>${reg.registration_number}</RegistrationNo>
  <DesignatedBank>${reg.designated_bank}</DesignatedBank>
  <AccountNo>${reg.account_number}</AccountNo>
  <TotalForeignReceipt>${receipts.reduce((s, r) => s + r.amount, 0)}</TotalForeignReceipt>
  <PurposeWise>
    ${PURPOSES.map(p => `<Purpose name="${p}">${receipts.filter(r => r.purpose === p).reduce((s, r) => s + r.amount, 0)}</Purpose>`).join("\n    ")}
  </PurposeWise>
  <Receipts>
    ${receipts.map(r => `<Receipt><Donor>${r.donor}</Donor><Country>${r.country}</Country><Amount>${r.amount}</Amount><Currency>${r.currency}</Currency><Purpose>${r.purpose}</Purpose><Date>${r.date}</Date></Receipt>`).join("\n    ")}
  </Receipts>
</FC4Return>`;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "FC-4-Return.xml"; a.click();
    toast({ title: "FC-4 XML exported" });
  };

  const totalFC = receipts.reduce((s, r) => s + r.amount, 0);
  const totalUtilized = MOCK_UTILIZATION.reduce((s, u) => s + u.utilized, 0);
  const utilizationPct = totalFC > 0 ? Math.round((totalUtilized / totalFC) * 100) : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FCRA Compliance Module</h1>
        <Button onClick={exportFC4} variant="outline">
          <Download className="h-4 w-4 mr-1" />Export FC-4 XML
        </Button>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">FCRA Annual Return (FC-4) must be filed by 31st December each year. Utilization must be &gt;85% for educational NGOs.</p>
      </div>

      <Tabs defaultValue="fc-account">
        <TabsList>
          <TabsTrigger value="fc-account">FC Account</TabsTrigger>
          <TabsTrigger value="receipts">Foreign Receipts</TabsTrigger>
          <TabsTrigger value="return">FCRA Return</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>

        <TabsContent value="fc-account" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">FC Designated Bank Account</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setEditReg(!editReg)}>
                {editReg ? <><Save className="h-3 w-3 mr-1" />Save</> : <><Edit className="h-3 w-3 mr-1" />Edit</>}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[["registration_number","FCRA Reg. Number"],["validity_date","Valid Until"],["designated_bank","Designated Bank"],["account_number","Account Number"]].map(([k, l]) => (
                  <div key={k}>
                    <Label className="text-xs text-gray-500">{l}</Label>
                    {editReg
                      ? <Input className="mt-1" type={k === "validity_date" ? "date" : "text"} value={(reg as any)[k]} onChange={e => setReg(p => ({ ...p, [k]: e.target.value }))} />
                      : <p className="text-sm font-semibold mt-1">{(reg as any)[k] || "—"}</p>
                    }
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                All foreign contributions must be received ONLY into this designated bank account as per FCRA 2010.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" />Log Receipt</Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead><TableHead>Country</TableHead>
                    <TableHead>Date</TableHead><TableHead>Currency</TableHead>
                    <TableHead className="text-right">Amount (INR)</TableHead>
                    <TableHead>Purpose</TableHead><TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.donor}</TableCell>
                      <TableCell>{r.country}</TableCell>
                      <TableCell>{r.date}</TableCell>
                      <TableCell><Badge variant="outline">{r.currency}</Badge></TableCell>
                      <TableCell className="text-right">₹{fmt(r.amount)}</TableCell>
                      <TableCell><Badge className="bg-blue-100 text-blue-800">{r.purpose}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">FC-4 Annual Return</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <p className="text-xs text-gray-500">Total Foreign Receipts</p>
                  <p className="text-xl font-bold">₹{fmt(totalFC)}</p>
                </div>
                <div className="p-3 border rounded">
                  <p className="text-xs text-gray-500">Number of Donors</p>
                  <p className="text-xl font-bold">{receipts.length}</p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Purpose-wise Breakdown</p>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Purpose</TableHead><TableHead className="text-right">Amount (₹)</TableHead><TableHead>%</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {PURPOSES.map(p => {
                      const amt = receipts.filter(r => r.purpose === p).reduce((s, r) => s + r.amount, 0);
                      if (!amt) return null;
                      return (
                        <TableRow key={p}>
                          <TableCell>{p}</TableCell>
                          <TableCell className="text-right">₹{fmt(amt)}</TableCell>
                          <TableCell>{totalFC > 0 ? Math.round((amt / totalFC) * 100) : 0}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={exportFC4}>
                <Download className="h-4 w-4 mr-1" />Export FC-4 XML for FCRA Portal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utilization" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Foreign Fund Utilization</CardTitle>
              <Badge className={utilizationPct >= 85 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {utilizationPct}% utilized {utilizationPct >= 85 ? "✓" : "⚠ Below 85%"}
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Sanctioned</TableHead>
                    <TableHead className="text-right">Utilized</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Utilization %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_UTILIZATION.map((u, i) => {
                    const pct = Math.round((u.utilized / u.sanctioned) * 100);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{u.project}</TableCell>
                        <TableCell className="text-right">₹{fmt(u.sanctioned)}</TableCell>
                        <TableCell className="text-right">₹{fmt(u.utilized)}</TableCell>
                        <TableCell className="text-right">₹{fmt(u.balance)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${pct >= 85 ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Foreign Receipt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Donor Name</Label><Input value={form.donor_name} onChange={e => set("donor_name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Donor Country</Label>
                <Select value={form.donor_country} onValueChange={v => set("donor_country", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["USD","GBP","EUR","AUD","CAD","SGD","AED","JPY"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (INR equivalent)</Label><Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} /></div>
              <div><Label>Date Received</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            </div>
            <div>
              <Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={v => set("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference / Transaction ID</Label><Input value={form.reference} onChange={e => set("reference", e.target.value)} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveReceipt.mutate()} disabled={saveReceipt.isPending}>
                {saveReceipt.isPending ? "Saving..." : "Save Receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
