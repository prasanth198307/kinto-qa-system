import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const GSTR_TYPES = ["GSTR-1","GSTR-3B","GSTR-2B","GSTR-9"] as const;
type GSTRType = typeof GSTR_TYPES[number];

interface GSTRData {
  type: string;
  period: string;
  summary: { taxable_value: number; cgst: number; sgst: number; igst: number; total_tax: number; invoice_count: number };
  b2b_invoices: Array<{ gstin: string; invoice_no: string; invoice_date: string; taxable: number; cgst: number; sgst: number; igst: number }>;
  b2c_invoices: Array<{ state: string; taxable: number; cgst: number; sgst: number; igst: number }>;
  errors: string[];
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </Card>
  );
}

function GSTRTab({ gstrType }: { gstrType: GSTRType }) {
  const { toast } = useToast();
  const [month, setMonth] = useState("6");
  const [year, setYear] = useState("2026");
  const [validated, setValidated] = useState(false);
  const [showFiling, setShowFiling] = useState(false);

  const { data, isFetching, refetch } = useQuery<GSTRData>({
    queryKey: ["gstr-compute", gstrType, month, year],
    queryFn: () => apiRequest("GET", `/api/finance-erp/gstr/compute?type=${gstrType}&month=${month}&year=${year}`),
    enabled: false,
  });

  const handleValidate = () => {
    if (!data) { toast({ title: "Load data first", variant: "destructive" }); return; }
    if (data.errors.length === 0) {
      setValidated(true);
      toast({ title: "Validation Passed", description: "No errors found. Ready to file." });
    } else {
      toast({ title: `${data.errors.length} errors found`, description: data.errors.join(", "), variant: "destructive" });
    }
  };

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gstrType}_${month}_${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON Exported", description: `${gstrType} data downloaded` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
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
                <SelectContent>{["2024","2025","2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Loading..." : "Load Data"}
            </Button>
            <Button variant="outline" onClick={handleValidate} disabled={!data}>Validate</Button>
            <Button variant="outline" onClick={handleExportJSON} disabled={!data}>Export JSON</Button>
            <Button
              disabled={!validated}
              onClick={() => setShowFiling(true)}
            >
              File on GST Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {showFiling && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader><CardTitle className="text-blue-800">Filing Instructions — {gstrType}</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900">
              <li>Export the JSON file using the "Export JSON" button above</li>
              <li>Login to GST Portal: <span className="font-mono">gst.gov.in</span></li>
              <li>Navigate to Returns → File Returns → {gstrType}</li>
              <li>Select period: {MONTHS[parseInt(month)-1]} {year}</li>
              <li>Upload the downloaded JSON file or enter data manually</li>
              <li>Review the summary and check for errors</li>
              <li>Submit using DSC (Digital Signature Certificate) or EVC (Electronic Verification Code)</li>
              <li>Note the ARN (Application Reference Number) for your records</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Taxable Value" value={`₹${data.summary.taxable_value.toLocaleString()}`} />
            <SummaryCard label="Total Tax (CGST+SGST+IGST)" value={`₹${data.summary.total_tax.toLocaleString()}`} />
            <SummaryCard label="Invoice Count" value={String(data.summary.invoice_count)} />
          </div>

          {gstrType === "GSTR-1" && (
            <Card>
              <CardHeader><CardTitle>B2B Invoices</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GSTIN</TableHead>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.b2b_invoices?.map(inv => (
                      <TableRow key={inv.invoice_no}>
                        <TableCell className="font-mono text-xs">{inv.gstin}</TableCell>
                        <TableCell>{inv.invoice_no}</TableCell>
                        <TableCell>{inv.invoice_date}</TableCell>
                        <TableCell>₹{inv.taxable.toLocaleString()}</TableCell>
                        <TableCell>₹{inv.cgst.toLocaleString()}</TableCell>
                        <TableCell>₹{inv.sgst.toLocaleString()}</TableCell>
                        <TableCell>₹{inv.igst.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function GSTRFilingPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">GSTR Direct Filing</h1>
        <p className="text-muted-foreground">Prepare, validate and file GST returns directly from your ERP</p>
      </div>
      <Tabs defaultValue="GSTR-1">
        <TabsList>
          {GSTR_TYPES.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
        </TabsList>
        {GSTR_TYPES.map(t => (
          <TabsContent key={t} value={t}>
            <GSTRTab gstrType={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
