import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const REPORT_TYPES = [
  { value: "attendance-summary", label: "Attendance Summary" },
  { value: "fee-collection", label: "Fee Collection" },
  { value: "exam-results", label: "Exam Results" },
  { value: "student-strength", label: "Student Strength" },
  { value: "transport", label: "Transport Report" },
  { value: "hostel", label: "Hostel Report" },
];

export default function EducationReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("attendance-summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [enabled, setEnabled] = useState(false);

  const { data: report = [], isFetching } = useQuery({
    queryKey: ["/api/education/reports", reportType, from, to, classFilter],
    queryFn: () => api("GET", `/api/education/reports/${reportType}?from=${from}&to=${to}&class=${classFilter}`),
    enabled,
  });

  const columns = report.length > 0 ? Object.keys(report[0]) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Education Reports</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={v => { setReportType(v); setEnabled(false); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-sm font-medium">Class</label>
              <Input value={classFilter} onChange={e => setClassFilter(e.target.value)} placeholder="All classes" className="w-28" />
            </div>
            <Button onClick={() => setEnabled(true)} disabled={isFetching}>
              {isFetching ? "Loading..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>{REPORT_TYPES.find(r => r.value === reportType)?.label}</CardTitle>
              <Badge>{report.length} records</Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{columns.map(c => <TableHead key={c} className="capitalize">{c.replace(/_/g," ")}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {report.map((row: any, i: number) => (
                  <TableRow key={i}>
                    {columns.map(c => <TableCell key={c}>{row[c] ?? "—"}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {enabled && report.length === 0 && !isFetching && (
        <Card><CardContent className="pt-4 text-center text-muted-foreground">No data found for the selected filters.</CardContent></Card>
      )}
    </div>
  );
}
