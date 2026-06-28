import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function RestaurantShiftsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [closingCash, setClosingCash] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [openForm, setOpenForm] = useState({ shift_name: "", cashier_name: "", terminal_id: "", opening_cash: "", outlet_id: "" });

  const { data: activeShift, isLoading: activeLoading } = useQuery({ queryKey: ["/api/restaurant/shifts/active"], queryFn: () => api("GET", "/api/restaurant/shifts/active") });
  const { data: shifts = [] } = useQuery({ queryKey: ["/api/restaurant/shifts"], queryFn: () => api("GET", "/api/restaurant/shifts") });
  const { data: terminals = [] } = useQuery({ queryKey: ["/api/restaurant/terminals"], queryFn: () => api("GET", "/api/restaurant/terminals") });
  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts"] }); qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts/active"] }); };

  const closeMut = useMutation({
    mutationFn: ({ id, closing_cash }: any) => api("PUT", `/api/restaurant/shifts/${id}/close`, { closing_cash: Number(closing_cash) }),
    onSuccess: () => { invalidate(); setShowCloseForm(false); setClosingCash(""); toast({ title: "Shift closed" }); }
  });

  const openMut = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/shifts/open", { ...d, opening_cash: Number(d.opening_cash) }),
    onSuccess: () => { invalidate(); setOpenForm({ shift_name: "", cashier_name: "", terminal_id: "", opening_cash: "", outlet_id: "" }); toast({ title: "Shift opened" }); }
  });

  const elapsed = (openedAt: string) => {
    const mins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const variance = (o: any) => Number(o.closing_cash || 0) - Number(o.opening_cash || 0) - Number(o.total_sales || 0);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Shifts & Cash Management</h1>

      {!activeLoading && activeShift?.id ? (
        <Card className="border-green-400 bg-green-50">
          <CardHeader><CardTitle className="text-green-800 flex justify-between items-center">
            <span>Active Shift: {activeShift.shift_name}</span>
            <Badge className="bg-green-600 text-white">OPEN</Badge>
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><div className="text-gray-500">Cashier</div><div className="font-semibold">{activeShift.cashier_name}</div></div>
              <div><div className="text-gray-500">Terminal</div><div className="font-semibold">{activeShift.terminal_id}</div></div>
              <div><div className="text-gray-500">Opening Cash</div><div className="font-semibold">₹{fmt(activeShift.opening_cash)}</div></div>
              <div><div className="text-gray-500">Elapsed</div><div className="font-semibold">{elapsed(activeShift.opened_at)}</div></div>
              <div><div className="text-gray-500">Total Sales</div><div className="font-semibold">₹{fmt(activeShift.total_sales)}</div></div>
              <div><div className="text-gray-500">Orders</div><div className="font-semibold">{activeShift.order_count || 0}</div></div>
            </div>
            {showCloseForm ? (
              <div className="flex gap-3 items-center pt-2">
                <label className="text-sm font-medium">Closing Cash (₹):</label>
                <Input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="w-40" placeholder="0.00" />
                <Button variant="destructive" onClick={() => closeMut.mutate({ id: activeShift.id, closing_cash: closingCash })} disabled={closeMut.isPending}>Confirm Close</Button>
                <Button variant="outline" onClick={() => setShowCloseForm(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="destructive" className="mt-2" onClick={() => setShowCloseForm(true)}>Close Shift</Button>
            )}
          </CardContent>
        </Card>
      ) : !activeLoading && (
        <Card><CardHeader><CardTitle>Open New Shift</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[["shift_name", "Shift Name"], ["cashier_name", "Cashier Name"], ["opening_cash", "Opening Cash (₹)"]].map(([k, label]) => (
              <div key={k}><label className="text-sm font-medium">{label}</label>
                <Input type={k === "opening_cash" ? "number" : "text"} value={(openForm as any)[k]} onChange={e => setOpenForm(f => ({ ...f, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Terminal</label>
              <Select value={openForm.terminal_id} onValueChange={v => setOpenForm(f => ({ ...f, terminal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select terminal" /></SelectTrigger>
                <SelectContent>{terminals.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-sm font-medium">Outlet</label>
              <Select value={openForm.outlet_id} onValueChange={v => setOpenForm(f => ({ ...f, outlet_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2"><Button onClick={() => openMut.mutate(openForm)} disabled={openMut.isPending}>Open Shift</Button></div>
          </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle>Shift History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              {["Shift", "Date", "Cashier", "Terminal", "Opening", "Closing", "Variance", "Sales", "Status", "Times"].map(h => <TableHead key={h}>{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {shifts.map((s: any) => {
                const v = variance(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.shift_name}</TableCell>
                    <TableCell>{s.shift_date || s.opened_at?.split("T")[0]}</TableCell>
                    <TableCell>{s.cashier_name}</TableCell>
                    <TableCell>{s.terminal_id}</TableCell>
                    <TableCell>₹{fmt(s.opening_cash)}</TableCell>
                    <TableCell>₹{fmt(s.closing_cash)}</TableCell>
                    <TableCell><span className={v >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>₹{fmt(Math.abs(v))}{v < 0 ? " (short)" : ""}</span></TableCell>
                    <TableCell>₹{fmt(s.total_sales)}</TableCell>
                    <TableCell><Badge className={s.status === "open" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{s.status}</Badge></TableCell>
                    <TableCell className="text-xs text-gray-500">{s.opened_at?.slice(11, 16)} – {s.closed_at?.slice(11, 16) || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {shifts.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-gray-400 py-8">No shifts found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
    </div>
  );
}
