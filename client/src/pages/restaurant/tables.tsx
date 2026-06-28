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

export default function RestaurantTablesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ table_number: "", seating_capacity: "", section: "" });

  const { data: tables = [] } = useQuery({ queryKey: ["restaurant-tables"], queryFn: () => api("GET", "/api/restaurant/floor-plan") });

  const addTable = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/tables", form),
    onSuccess: () => { toast({ title: "Table added" }); qc.invalidateQueries({ queryKey: ["restaurant-tables"] }); setForm({ table_number: "", seating_capacity: "", section: "" }); }
  });

  const tableList: any[] = Array.isArray(tables) ? tables : (tables as any)?.tables || [];
  const statusBadge = (s: string): "default" | "secondary" | "destructive" => s === "available" ? "default" : s === "occupied" ? "secondary" : "destructive";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tables and Floor Plan</h1>
      <Card>
        <CardHeader><CardTitle>Add Table</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Table Number" value={form.table_number} onChange={e => setForm(p => ({ ...p, table_number: e.target.value }))} className="w-40" />
            <Input placeholder="Seating Capacity" type="number" value={form.seating_capacity} onChange={e => setForm(p => ({ ...p, seating_capacity: e.target.value }))} className="w-40" />
            <Select value={form.section} onValueChange={v => setForm(p => ({ ...p, section: v }))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => addTable.mutate()}>Add Table</Button>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 text-sm font-medium">
        <span className="text-green-600">Green = Available</span>
        <span className="text-yellow-600">Yellow = Occupied</span>
        <span className="text-blue-600">Blue = Reserved</span>
        <span className="text-red-600">Red = Maintenance</span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {tableList.map((t: any) => (
          <div key={t.id} className="border-2 rounded-lg p-3 text-center">
            <div className="font-bold text-lg">T{t.table_number}</div>
            <div className="text-xs text-gray-500">{t.seating_capacity} seats</div>
            <div className="text-xs text-gray-500">{t.section}</div>
            <Badge variant={statusBadge(t.status)} className="mt-1 text-xs">{t.status}</Badge>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>All Tables</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table#</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableList.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.table_number}</TableCell>
                  <TableCell>{t.section}</TableCell>
                  <TableCell>{t.seating_capacity}</TableCell>
                  <TableCell><Badge variant={statusBadge(t.status)}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
