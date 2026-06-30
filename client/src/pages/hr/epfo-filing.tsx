import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";

const api = (path: string) => fetch(path).then(r => r.json());

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const ECR_MOCK = [
  { uan: "100123456789", name: "Rahul Sharma", basic: 18000, ee_share: 1800, er_share: 1800, eps: 1250 },
  { uan: "100234567890", name: "Priya Singh", basic: 22000, ee_share: 2200, er_share: 2200, eps: 1250 },
  { uan: "100345678901", name: "Amit Kumar", basic: 15000, ee_share: 1800, er_share: 1800, eps: 1250 },
];

const ESI_MOCK = [
  { ip_no: "1234567890", name: "Rahul Sharma", wages: 18000, ee_contrib: 135, er_contrib: 585 },
  { ip_no: "2345678901", name: "Priya Singh", wages: 21000, ee_contrib: 157.5, er_contrib: 682.5 },
];

const PT_SLABS = [
  { range: "0 – 10,000", tax: 0 },
  { range: "10,001 – 15,000", tax: 110 },
  { range: "15,001 – 20,000", tax: 130 },
  { range: "20,001 – 25,000", tax: 150 },
  { range: "25,001+", tax: 200 },
];

const FILING_HISTORY = [
  { type: "ECR", month: "May 2026", filed_on: "2026-06-12", status: "Filed" },
  { type: "ESI", month: "May 2026", filed_on: "2026-06-13", status: "Filed" },
  { type: "PT", month: "May 2026", filed_on: "2026-06-15", status: "Filed" },
  { type: "ECR", month: "April 2026", filed_on: "2026-05-14", status: "Filed" },
];

export default function EPFOFilingPage() {
  const [month, setMonth] = useState("6");
  const [year] = useState("2026");

  const { data: filings = [] } = useQuery({
    queryKey: ["statutory-filings", month, year],
    queryFn: () => api(`/api/hr/statutory-filings?type=ECR&month=${month}&year=${year}`),
  });

  const downloadECR = () => {
    const lines = ECR_MOCK.map(e => `${e.uan}#${e.name}#0#0#0#0#${e.ee_share}#${e.er_share}#${e.eps}#0#0#0#0#0`);
    const content = `#~#\n${lines.join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ECR_${month}_${year}.txt`; a.click();
  };

  const downloadESI = () => {
    const lines = ESI_MOCK.map(e => `${e.ip_no},${e.name},${e.wages},${e.ee_contrib},${e.er_contrib}`);
    const content = "IP No,Name,Wages,EE Contrib,ER Contrib\n" + lines.join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ESI_Challan_${month}_${year}.csv`; a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EPFO/ESI E-Filing</h1>
          <p className="text-muted-foreground">Generate statutory compliance files for EPF, ESI, PT</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <span className="self-center text-muted-foreground">{year}</span>
        </div>
      </div>

      <Tabs defaultValue="ecr">
        <TabsList>
          <TabsTrigger value="ecr">ECR (EPFO)</TabsTrigger>
          <TabsTrigger value="esi">ESI Challan</TabsTrigger>
          <TabsTrigger value="pt">PT Returns</TabsTrigger>
          <TabsTrigger value="history">Filing History</TabsTrigger>
        </TabsList>

        <TabsContent value="ecr">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ECR — Employee Contribution Register</CardTitle>
                <Button onClick={downloadECR}><Download className="h-4 w-4 mr-2" />Download ECR File</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UAN</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic (₹)</TableHead>
                    <TableHead>EE Share (12%)</TableHead>
                    <TableHead>ER Share (12%)</TableHead>
                    <TableHead>EPS (8.33%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ECR_MOCK.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{e.uan}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>₹{e.basic.toLocaleString()}</TableCell>
                      <TableCell>₹{e.ee_share.toLocaleString()}</TableCell>
                      <TableCell>₹{e.er_share.toLocaleString()}</TableCell>
                      <TableCell>₹{e.eps.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="esi">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ESI Monthly Challan</CardTitle>
                <Button onClick={downloadESI}><Download className="h-4 w-4 mr-2" />Download ESI File</Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">EE: 0.75% | ER: 3.25% of gross wages</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Number</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Wages</TableHead>
                    <TableHead>EE (0.75%)</TableHead>
                    <TableHead>ER (3.25%)</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ESI_MOCK.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{e.ip_no}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>₹{e.wages.toLocaleString()}</TableCell>
                      <TableCell>₹{e.ee_contrib}</TableCell>
                      <TableCell>₹{e.er_contrib}</TableCell>
                      <TableCell>₹{(e.ee_contrib + e.er_contrib).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pt">
          <Card>
            <CardHeader><CardTitle>Professional Tax Slab Table</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monthly Income Range</TableHead>
                    <TableHead>PT Amount (₹/month)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PT_SLABS.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.range}</TableCell>
                      <TableCell>{s.tax === 0 ? "Nil" : `₹${s.tax}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4"><Download className="h-4 w-4 mr-2" />Generate PT Return</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filing Type</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Filed On</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FILING_HISTORY.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{f.type}</Badge></TableCell>
                      <TableCell>{f.month}</TableCell>
                      <TableCell>{f.filed_on}</TableCell>
                      <TableCell><Badge>Filed</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
