import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" } }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = [
  { key: "opd_summary", label: "OPD Summary" },
  { key: "ipd_summary", label: "IPD Summary" },
  { key: "revenue", label: "Revenue & Billing" },
  { key: "doctor_performance", label: "Doctor Performance" },
  { key: "bed_occupancy", label: "Bed Occupancy" },
  { key: "lab_summary", label: "Lab Summary" },
  { key: "insurance_claims", label: "Insurance Claims" },
  { key: "ot_utilization", label: "OT Utilization" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ReportTable({ data, columns }: { data: any[]; columns: { key: string; label: string; fmt?: (v: any) => string }[] }) {
  if (!data || data.length === 0) return <p className="text-center text-gray-400 py-8">No data for the selected period.</p>;
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50">
          {columns.map(c => <th key={c.key} className="text-left p-2 border">{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            {columns.map(c => <td key={c.key} className="p-2">{c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? "—")}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const fmtMoney = (v: number) => v != null ? `${sym}${(v / 100).toLocaleString("en-IN")}` : "—";
const fmtPct = (v: number) => v != null ? `${v.toFixed(1)}%` : "—";

export default function HealthcareReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState("opd_summary");

  const { data: report, isFetching } = useQuery({
    queryKey: ["/api/healthcare/reports", tab, from, to],
    queryFn: () => api("GET", `/api/healthcare/reports/${tab}?from=${from}&to=${to}`),
  });

  const data = Array.isArray(report) ? report : (report?.rows ?? report?.data ?? []);
  const summary = !Array.isArray(report) ? report : null;

  const exportReport = () => window.open(`/api/healthcare/reports/${tab}/export?from=${from}&to=${to}`, "_blank");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" />Healthcare Reports</h1>
        <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>

      <div className="flex items-center gap-4">
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="opd_summary" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Appointments" value={summary.total_appointments ?? 0} />
              <StatCard label="Completed" value={summary.completed ?? 0} />
              <StatCard label="No-Shows" value={summary.no_shows ?? 0} />
              <StatCard label="Revenue" value={fmtMoney(summary.total_revenue ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "date", label: "Date" },
                { key: "doctor_name", label: "Doctor" },
                { key: "appointments", label: "Appointments" },
                { key: "completed", label: "Completed" },
                { key: "revenue", label: "Revenue", fmt: fmtMoney },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ipd_summary" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Admissions" value={summary.total_admissions ?? 0} />
              <StatCard label="Discharged" value={summary.discharged ?? 0} />
              <StatCard label="Avg Length of Stay" value={`${(summary.avg_los ?? 0).toFixed(1)} days`} />
              <StatCard label="Total Revenue" value={fmtMoney(summary.total_revenue ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "admission_date", label: "Date" },
                { key: "patient_name", label: "Patient" },
                { key: "doctor_name", label: "Doctor" },
                { key: "ward_name", label: "Ward" },
                { key: "los_days", label: "LOS (days)" },
                { key: "bill_amount", label: "Bill Amount", fmt: fmtMoney },
                { key: "status", label: "Status" },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Gross Revenue" value={fmtMoney(summary.gross_revenue ?? 0)} />
              <StatCard label="Cash Collections" value={fmtMoney(summary.cash ?? 0)} />
              <StatCard label="Insurance Claims" value={fmtMoney(summary.insurance ?? 0)} />
              <StatCard label="Outstanding" value={fmtMoney(summary.outstanding ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "date", label: "Date" },
                { key: "source", label: "Revenue Source" },
                { key: "amount", label: "Amount", fmt: fmtMoney },
                { key: "payment_mode", label: "Mode" },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="doctor_performance" className="mt-4">
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "doctor_name", label: "Doctor" },
                { key: "specialization", label: "Specialization" },
                { key: "opd_count", label: "OPD Consultations" },
                { key: "ipd_count", label: "IPD Admissions" },
                { key: "ot_count", label: "OT Procedures" },
                { key: "revenue", label: "Revenue Generated", fmt: fmtMoney },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="bed_occupancy" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Beds" value={summary.total_beds ?? 0} />
              <StatCard label="Avg Occupancy" value={fmtPct(summary.avg_occupancy_pct ?? 0)} />
              <StatCard label="Peak Occupancy" value={fmtPct(summary.peak_occupancy_pct ?? 0)} />
              <StatCard label="Bed Days Used" value={summary.bed_days ?? 0} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "ward_name", label: "Ward" },
                { key: "total_beds", label: "Total Beds" },
                { key: "occupied", label: "Occupied" },
                { key: "occupancy_pct", label: "Occupancy %", fmt: fmtPct },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="lab_summary" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Tests" value={summary.total_tests ?? 0} />
              <StatCard label="Completed" value={summary.completed ?? 0} />
              <StatCard label="Pending" value={summary.pending ?? 0} />
              <StatCard label="Revenue" value={fmtMoney(summary.revenue ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "test_name", label: "Test" },
                { key: "category", label: "Category" },
                { key: "orders", label: "Orders" },
                { key: "completed", label: "Completed" },
                { key: "revenue", label: "Revenue", fmt: fmtMoney },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="insurance_claims" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Claims Submitted" value={summary.submitted ?? 0} />
              <StatCard label="Approved" value={summary.approved ?? 0} />
              <StatCard label="Rejected" value={summary.rejected ?? 0} />
              <StatCard label="Total Approved " value={fmtMoney(summary.total_approved ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "tpa_name", label: "TPA / Insurer" },
                { key: "claims_count", label: "Claims" },
                { key: "claim_amount", label: "Claimed", fmt: fmtMoney },
                { key: "approved_amount", label: "Approved", fmt: fmtMoney },
                { key: "settled_count", label: "Settled" },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ot_utilization" className="mt-4 space-y-4">
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="OT Procedures" value={summary.total_procedures ?? 0} />
              <StatCard label="Emergency Cases" value={summary.emergency ?? 0} />
              <StatCard label="Avg Duration" value={`${(summary.avg_duration_min ?? 0).toFixed(0)} min`} />
              <StatCard label="OT Utilization %" value={fmtPct(summary.utilization_pct ?? 0)} />
            </div>
          )}
          <Card><CardContent className="pt-4">
            {isFetching ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
              <ReportTable data={data} columns={[
                { key: "ot_room", label: "OT Room" },
                { key: "procedures", label: "Procedures" },
                { key: "avg_duration_min", label: "Avg Duration (min)" },
                { key: "utilization_pct", label: "Utilization %", fmt: fmtPct },
                { key: "revenue", label: "Revenue", fmt: fmtMoney },
              ]} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
