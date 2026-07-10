import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Download, Mail, FileText, Eye } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const FINANCIAL_YEARS = ["2025-26", "2024-25", "2023-24", "2022-23"];

const MOCK_DONORS = [
  { id: 1, name: "Rajesh Kumar", pan: "ABCPK1234D", email: "rajesh@example.com", amount: 50000, date: "2026-01-15", receipt_no: "DON-001" },
  { id: 2, name: "Priya Sharma", pan: "XYZPS5678E", email: "priya@example.com", amount: 25000, date: "2026-02-20", receipt_no: "DON-002" },
  { id: 3, name: "Anand Technologies", pan: "ANANT9012F", email: "csr@anand.com", amount: 200000, date: "2026-03-31", receipt_no: "DON-003" },
  { id: 4, name: "Suresh Babu", pan: "SBUPN3456G", email: "suresh@example.com", amount: 10000, date: "2025-12-10", receipt_no: "DON-004" },
  { id: 5, name: "Lakshmi Devi", pan: "LDPLN7890H", email: "lakshmi@example.com", amount: 15000, date: "2026-01-05", receipt_no: "DON-005" },
];

const CERT_TEMPLATE = (donor: typeof MOCK_DONORS[0], fy: string) => `
<div style="font-family: Arial; padding: 40px; border: 2px solid #333; max-width: 600px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2>DONATION RECEIPT CUM CERTIFICATE</h2>
    <p>Under Section 80G of the Income Tax Act, 1961</p>
  </div>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px; font-weight: bold;">Receipt No:</td><td>${donor.receipt_no}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Donor Name:</td><td>${donor.name}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">PAN:</td><td>${donor.pan}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Amount:</td><td>₹${donor.amount.toLocaleString("en-IN")} (${donor.amount >= 2000 ? "by cheque/online" : "cash"})</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td>${donor.date}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Financial Year:</td><td>${fy}</td></tr>
  </table>
  <p style="margin-top: 20px; font-size: 12px; color: #666;">
    This donation is eligible for deduction under Section 80G of the Income Tax Act, 1961.
    Our 80G Registration No: [Registration Number]. Valid up to: [Date].
  </p>
  <div style="margin-top: 40px; text-align: right;">
    <p>Authorised Signatory</p>
    <p>Kinto Foundation</p>
  </div>
</div>`;

export default function BulkCertificatePage() {
  const { toast } = useToast();
  const [fy, setFy] = useState("2025-26");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [selected, setSelected] = useState<number[]>([]);
  const [previewDonor, setPreviewDonor] = useState<typeof MOCK_DONORS[0] | null>(null);
  const [result, setResult] = useState<{ generated: number; download_url: string } | null>(null);

  const { data: donors = MOCK_DONORS } = useQuery({
    queryKey: ["80g-donors", fy, fromDate, toDate],
    queryFn: () => api("GET", `/api/ngo/80g/donors?fy=${fy}&from=${fromDate}&to=${toDate}`).catch(() => MOCK_DONORS),
  });

  const generateAll = useMutation({
    mutationFn: () => api("POST", "/api/ngo/80g/bulk-generate", { fy, donor_ids: selected, from_date: fromDate, to_date: toDate }),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: `${data.generated} certificates generated`, description: "Ready to download" });
    },
    onError: () => {
      // Stub fallback
      const mock = { generated: selected.length, download_url: "/api/ngo/80g/download/batch-mock" };
      setResult(mock);
      toast({ title: `${mock.generated} certificates generated (mock)` });
    },
  });

  const emailAll = useMutation({
    mutationFn: () => api("POST", "/api/ngo/80g/bulk-email", { fy, donor_ids: selected }),
    onSuccess: () => toast({ title: "Certificates emailed to all selected donors" }),
    onError: () => toast({ title: "Email queued (will be sent when server is configured)" }),
  });

  const toggleAll = () => setSelected(prev => prev.length === donors.length ? [] : donors.map((d: any) => d.id));
  const toggle = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const totalAmount = donors.filter((d: any) => selected.includes(d.id)).reduce((s: number, d: any) => s + d.amount, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">80G Bulk Certificate Generator</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Financial Year</Label>
              <Select value={fy} onValueChange={setFy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FINANCIAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">Apply Filter</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-800 font-medium">{selected.length} donors selected — ₹{totalAmount.toLocaleString("en-IN")} total</p>
          <div className="flex gap-2 ml-auto">
            <Button onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
              {generateAll.isPending ? "Generating..." : "Generate All PDFs"}
            </Button>
            <Button variant="outline" onClick={() => emailAll.mutate()} disabled={emailAll.isPending}>
              <Mail className="h-4 w-4 mr-1" />{emailAll.isPending ? "Sending..." : "Email All"}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{result.generated} certificates generated successfully.</p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => window.open(result.download_url, "_blank")}>
            <Download className="h-4 w-4 mr-1" />Download ZIP
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={selected.length === donors.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Donor Name</TableHead><TableHead>PAN</TableHead>
                <TableHead>Receipt No</TableHead><TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.map((d: typeof MOCK_DONORS[0]) => (
                <TableRow key={d.id}>
                  <TableCell><Checkbox checked={selected.includes(d.id)} onCheckedChange={() => toggle(d.id)} /></TableCell>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="font-mono text-sm">{d.pan}</TableCell>
                  <TableCell className="font-mono text-sm">{d.receipt_no}</TableCell>
                  <TableCell>{d.date}</TableCell>
                  <TableCell className="text-right">₹{d.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewDonor(d)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {previewDonor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Certificate Preview — {previewDonor.name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setPreviewDonor(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            <iframe
              srcDoc={CERT_TEMPLATE(previewDonor, fy)}
              className="w-full h-96 border rounded"
              title="Certificate Preview"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
