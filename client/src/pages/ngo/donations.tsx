import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { IndianRupee, TrendingUp, BarChart2, Plus, FileText } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "-";

const PAYMENT_MODES = ["cash", "cheque", "upi", "neft", "rtgs"];
const BADGE_MAP: Record<string, string> = { cash: "bg-yellow-100 text-yellow-800", cheque: "bg-blue-100 text-blue-800", upi: "bg-purple-100 text-purple-800", neft: "bg-green-100 text-green-800", rtgs: "bg-orange-100 text-orange-800" };

const blank = () => ({ donor_id: "", amount: "", donation_date: new Date().toISOString().slice(0, 10), payment_mode: "upi", reference_number: "", is_80g_eligible: false, purpose: "", project_id: "" });

export default function DonationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: donations = [] } = useQuery({ queryKey: ["ngo-donations"], queryFn: () => api("GET", "/api/ngo/donations") });
  const { data: donors = [] } = useQuery({ queryKey: ["ngo-donors"], queryFn: () => api("GET", "/api/ngo/donors") });

  const save = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/donations", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-donations"] }); setOpen(false); setForm(blank()); },
  });

  const generate80G = useMutation({
    mutationFn: ({ donation_id, financial_year }: any) => api("POST", "/api/ngo/80g/generate", { donation_id, financial_year }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-80g"] }); alert("80G receipt generated successfully"); },
  });

  const currentYear = new Date().getFullYear();
  const fy = `${currentYear - 1}-${String(currentYear).slice(2)}`;

  const list = Array.isArray(donations) ? donations : [];
  const filtered = list.filter((d: any) => {
    const dname = d.donor_name || donors.find((x: any) => x.id === d.donor_id)?.name || "";
    const matchSearch = !search || dname.toLowerCase().includes(search.toLowerCase()) || d.donation_number?.toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === "all" || d.payment_mode === modeFilter;
    const matchFrom = !fromDate || d.donation_date >= fromDate;
    const matchTo = !toDate || d.donation_date <= toDate;
    return matchSearch && matchMode && matchFrom && matchTo;
  });

  const thisYear = new Date().getFullYear();
  const yearDonations = list.filter((d: any) => new Date(d.donation_date).getFullYear() === thisYear);
  const totalAmount = yearDonations.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
  const avgDonation = yearDonations.length ? totalAmount / yearDonations.length : 0;

  function getDonorName(d: any) {
    if (d.donor_name) return d.donor_name;
    return (Array.isArray(donors) ? donors : []).find((x: any) => x.id === d.donor_id)?.name || "-";
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Donations</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />New Donation</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4" />Donations This Year</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{yearDonations.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><IndianRupee className="w-4 h-4" />Total Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{fmt(totalAmount)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><BarChart2 className="w-4 h-4" />Avg Donation</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{fmt(avgDonation)}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search donor / number…" value={search} onChange={e => setSearch(e.target.value)} className="w-52" />
        <Select value={modeFilter} onValueChange={setModeFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Modes</SelectItem>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Donor</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Purpose</TableHead><TableHead>80G</TableHead><TableHead>Reference</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.donation_number}</TableCell>
                <TableCell className="font-medium">{getDonorName(d)}</TableCell>
                <TableCell>₹{fmt(d.amount)}</TableCell>
                <TableCell>{fmtDate(d.donation_date)}</TableCell>
                <TableCell><Badge className={`${BADGE_MAP[d.payment_mode] || ""} capitalize`}>{d.payment_mode}</Badge></TableCell>
                <TableCell className="max-w-32 truncate text-sm">{d.purpose || "-"}</TableCell>
                <TableCell>{d.is_80g_eligible ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.reference_number || "-"}</TableCell>
                <TableCell>
                  {d.is_80g_eligible && (
                    <Button size="sm" variant="outline" onClick={() => generate80G.mutate({ donation_id: d.id, financial_year: fy })} disabled={generate80G.isPending}>
                      <FileText className="w-3 h-3 mr-1" />80G
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No donations found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Donation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Donor</Label>
              <Select value={form.donor_id} onValueChange={v => setForm({ ...form, donor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select donor…" /></SelectTrigger>
                <SelectContent>{(Array.isArray(donors) ? donors : []).map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name} ({d.donor_number})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.donation_date} onChange={e => setForm({ ...form, donation_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Mode</Label>
                <Select value={form.payment_mode} onValueChange={v => setForm({ ...form, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference #</Label><Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
            </div>
            <div><Label>Purpose</Label><Textarea rows={2} value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} /></div>
            <div><Label>Project ID (optional)</Label><Input value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!form.is_80g_eligible} onCheckedChange={v => setForm({ ...form, is_80g_eligible: !!v })} id="don-80g" />
              <Label htmlFor="don-80g">Eligible for 80G</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
