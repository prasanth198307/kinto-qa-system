import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Edit, Save } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const now = new Date();
const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
const fyStart = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1);

export default function FCRAPage() {
  const qc = useQueryClient();
  const [editReg, setEditReg] = useState(false);
  const [reg, setReg] = useState({ registration_number: "", validity_date: "", designated_bank: "", account_number: "" });

  const { data: donations = [] } = useQuery({
    queryKey: ["ngo-donations-fcra"],
    queryFn: () => api("GET", "/api/ngo/donations?fcra=true"),
  });

  const fcra = Array.isArray(donations) ? donations.filter((d: any) =>
    (d.notes && d.notes.toLowerCase().includes("fcra")) ||
    (d.payment_mode && ["swift", "foreign_wire"].includes(d.payment_mode.toLowerCase()))
  ) : [];

  const quarterlyFC = fcra
    .filter((d: any) => new Date(d.donation_date || d.created_at) >= qStart)
    .reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

  const annualFC = fcra
    .filter((d: any) => new Date(d.donation_date || d.created_at) >= fyStart)
    .reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

  const purposeBreakdown = fcra.reduce((acc: Record<string, number>, d: any) => {
    const k = d.purpose || "General";
    acc[k] = (acc[k] || 0) + Number(d.amount || 0);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">FCRA Compliance</h1>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">FCRA returns must be filed annually by 31st December. Ensure all foreign contributions are recorded with proper donor details and purpose.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">FCRA Registration Details</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditReg(!editReg)}>{editReg ? <Save className="h-3 w-3 mr-1" /> : <Edit className="h-3 w-3 mr-1" />}{editReg ? "Save" : "Edit"}</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[["registration_number","Registration Number"],["validity_date","Validity Date"],["designated_bank","Designated Bank"],["account_number","Account Number"]].map(([k,l]) => (
              <div key={k}>
                <Label className="text-xs text-muted-foreground">{l}</Label>
                {editReg
                  ? <Input className="mt-1" type={k === "validity_date" ? "date" : "text"} value={(reg as any)[k]} onChange={e => setReg(p => ({ ...p, [k]: e.target.value }))} />
                  : <p className="text-sm font-medium mt-1">{(reg as any)[k] || "—"}</p>
                }
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">FC Records</div><div className="text-2xl font-bold">{fcra.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">This Quarter</div><div className="text-xl font-bold">₹{fmt(quarterlyFC)}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">This Financial Year</div><div className="text-xl font-bold">₹{fmt(annualFC)}</div></CardContent></Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">FC-4 Purpose Breakdown</div>
            {Object.entries(purposeBreakdown).slice(0, 3).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs"><span className="truncate">{k}</span><span className="font-medium ml-2">₹{fmt(v)}</span></div>
            ))}
            {Object.keys(purposeBreakdown).length === 0 && <div className="text-xs text-muted-foreground">No data</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Foreign Contributions Register</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Donor</TableHead><TableHead>Country</TableHead>
                <TableHead>Payment Mode</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Purpose</TableHead><TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fcra.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No foreign contributions found</TableCell></TableRow>
              )}
              {fcra.map((d: any, i: number) => (
                <TableRow key={d.id || i}>
                  <TableCell>{(d.donation_date || d.created_at)?.slice(0, 10)}</TableCell>
                  <TableCell>{d.donor_name || d.donor?.name || "—"}</TableCell>
                  <TableCell>{d.donor?.country || d.country || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{d.payment_mode || "—"}</Badge></TableCell>
                  <TableCell className="text-right font-medium">₹{fmt(d.amount)}</TableCell>
                  <TableCell>{d.purpose || "—"}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">{d.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
