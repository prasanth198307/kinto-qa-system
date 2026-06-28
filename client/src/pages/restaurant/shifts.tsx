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
  const [openForm, setOpenForm] = useState({ cashier_name: "", opening_cash: "" });
  const [closeId, setCloseId] = useState<number|null>(null);
  const [closingCash, setClosingCash] = useState("");

  const { data: shifts = [] } = useQuery({ queryKey: ["restaurant-shifts"], queryFn: () => api("GET", "/api/restaurant/shifts/history") });

  const openShift = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/shifts/open", { ...openForm, opening_cash: Number(openForm.opening_cash) }),
    onSuccess: () => { toast({ title: "Shift opened" }); qc.invalidateQueries({ queryKey: ["restaurant-shifts"] }); setOpenForm({ cashier_name: "", opening_cash: "" }); }
  });

  const closeShift = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/shifts/${id}/close`, { closing_cash: Number(closingCash) }),
    onSuccess: () => { toast({ title: "Shift closed" }); qc.invalidateQueries({ queryKey: ["restaurant-shifts"] }); setCloseId(null); setClosingCash(""); }
  });

  const shiftList: any[] = Array.isArray(shifts) ? shifts : (shifts as any)?.shifts || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Shifts and Cash</h1>
      <Card>
        <CardHeader><CardTitle>Open Shift</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Cashier Name" value={openForm.cashier_name} onChange={e => setOpenForm(p => ({ ...p, cashier_name: e.target.value }))} className="w-40" />
            <Input placeholder="Opening Cash" type="number" value={openForm.opening_cash} onChange={e => setOpenForm(p => ({ ...p, opening_cash: e.target.value }))} className="w-36" />
            <Button onClick={() => openShift.mutate()}>Open Shift</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Shift History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Opening Cash</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftList.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.date || new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{s.cashier_name || s.cashier}</TableCell>
                  <TableCell>Rs {fmt(s.opening_cash)}</TableCell>
                  <TableCell>Rs {fmt(s.total_sales)}</TableCell>
                  <TableCell>{s.orders_count || 0}</TableCell>
                  <TableCell><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>
                    {s.status === "open" && (
                      closeId === s.id ? (
                        <div className="flex gap-2">
                          <Input placeholder="Closing Cash" type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="w-28 h-7" />
                          <Button size="sm" onClick={() => closeShift.mutate(s.id)}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => setCloseId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setCloseId(s.id)}>Close Shift</Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
