import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldAlert } from "lucide-react";

const api = (path: string) => fetch(path).then(r => r.json());

export default function ScheduleXPage() {
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: register = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/registers/schedule-x", fromDate, toDate], queryFn: () => api(`/api/pharmacy/registers/schedule-x?from=${fromDate}&to=${toDate}`) });

  const arr = Array.isArray(register) ? register : [];
  const missingRx = arr.filter((e: any) => !e.prescription_no).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-500" />Schedule X Register</h1>
        <Button variant="outline" onClick={() => window.open(`/api/pharmacy/registers/schedule-x/export?from=${fromDate}&to=${toDate}`, "_blank")}>
          <Download className="w-4 h-4 mr-1" />Export Register
        </Button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
        Schedule X drugs (psychotropics/narcotic-category): duplicate prescription must be retained by pharmacy for 2 years, sale only against original Rx, separate Schedule X license required. Register entries are auto-logged at billing.
      </div>

      <div className="flex gap-3 items-end">
        <div><Label className="text-xs">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" /></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Entries</p><p className="text-2xl font-bold">{arr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Rx Compliance</p><p className="text-2xl font-bold text-green-600">{arr.length > 0 ? Math.round(((arr.length - missingRx) / arr.length) * 100) : 100}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Missing Rx (violation)</p><p className="text-2xl font-bold text-red-600">{missingRx}</p></CardContent></Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">{["Date", "Drug", "Batch", "Qty", "Patient", "Doctor", "Rx No", "Status"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
          <tbody>
            {arr.map((e: any, i: number) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-2">{e.sale_date?.slice(0, 10)}</td>
                <td className="p-2 font-medium">{e.drug_name}</td>
                <td className="p-2 font-mono text-xs">{e.batch_number ?? "—"}</td>
                <td className="p-2">{e.quantity}</td>
                <td className="p-2">{e.patient_name}</td>
                <td className="p-2">{e.doctor_name ?? "—"}</td>
                <td className="p-2">{e.prescription_no ?? "—"}</td>
                <td className="p-2">{e.prescription_no ? <Badge className="bg-green-100 text-green-800">Compliant</Badge> : <Badge className="bg-red-100 text-red-800">Rx Missing</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {arr.length === 0 && <p className="text-center text-gray-400 py-8">No Schedule X sales in this period.</p>}
      </div>
    </div>
  );
}
