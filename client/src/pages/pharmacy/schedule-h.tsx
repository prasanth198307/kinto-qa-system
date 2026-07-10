import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldAlert } from "lucide-react";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

export default function ScheduleHPage() {
  const [tab, setTab] = useState<"h" | "h1">("h");
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: registerH = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/registers/schedule-h", fromDate, toDate], queryFn: () => api(`/api/pharmacy/registers/schedule-h?from=${fromDate}&to=${toDate}`), enabled: tab === "h" });
  const { data: registerH1 = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/registers/schedule-h1", fromDate, toDate], queryFn: () => api(`/api/pharmacy/registers/schedule-h1?from=${fromDate}&to=${toDate}`), enabled: tab === "h1" });

  const arr = tab === "h" ? (Array.isArray(registerH) ? registerH : []) : (Array.isArray(registerH1) ? registerH1 : []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-orange-500" />Schedule H / H1 Register</h1>
        <Button variant="outline" onClick={() => window.open(`/api/pharmacy/registers/schedule-${tab}/export?from=${fromDate}&to=${toDate}`, "_blank")}>
          <Download className="w-4 h-4 mr-1" />Export Register
        </Button>
      </div>

      <p className="text-sm text-gray-500">Statutory register of Schedule H and H1 drug sales — prescription mandatory, retained for 3 years per Drugs & Cosmetics Rules 1945.</p>

      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" /></div>
        <div className="flex gap-1">
          <Button variant={tab === "h" ? "default" : "outline"} size="sm" onClick={() => setTab("h")}>Schedule H</Button>
          <Button variant={tab === "h1" ? "default" : "outline"} size="sm" onClick={() => setTab("h1")}>Schedule H1</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Entries in Period</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Distinct Doctors</p><p className="text-2xl font-bold">{new Set(arr.map((e: any) => e.doctor_name)).size}</p></CardContent></Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Date", "Drug", "Batch", "Qty", "Patient", "Phone", "Doctor", "Rx No"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {arr.map((e: any, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-2">{e.sale_date?.slice(0, 10)}</td>
                <td className="p-2 font-medium">{e.drug_name}</td>
                <td className="p-2 font-mono text-xs">{e.batch_number ?? "—"}</td>
                <td className="p-2">{e.quantity}</td>
                <td className="p-2">{e.patient_name}</td>
                <td className="p-2">{e.patient_phone ?? "—"}</td>
                <td className="p-2">{e.doctor_name ?? <Badge className="bg-red-100 text-red-800">Missing</Badge>}</td>
                <td className="p-2">{e.prescription_no ?? <Badge className="bg-red-100 text-red-800">Missing</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No Schedule {tab.toUpperCase()} sales in this period. Entries are auto-logged when a scheduled drug is billed.</p>}
      </div>
    </div>
  );
}
