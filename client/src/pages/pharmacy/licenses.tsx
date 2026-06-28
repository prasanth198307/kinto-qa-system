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

export default function PharmacyLicensesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ license_type: "Retail", license_no: "", valid_from: "", valid_to: "", issuing_authority: "" });

  const { data: licenses = [] } = useQuery({ queryKey: ["/api/pharmacy/licenses"], queryFn: () => api("GET", "/api/pharmacy/licenses") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/pharmacy/licenses", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }); setShowForm(false); toast({ title: "License added" }); }
  });

  const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drug Licenses</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add License</Button>
      </div>

      {licenses.filter((l: any) => l.valid_to && daysUntil(l.valid_to) < 60).length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="pt-4">
            <p className="text-orange-800 font-medium">{licenses.filter((l: any) => l.valid_to && daysUntil(l.valid_to) < 60).length} license(s) expiring within 60 days — please renew</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card><CardHeader><CardTitle>Add License</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">License Type</label>
              <Select value={form.license_type} onValueChange={v => setForm(p => ({ ...p, license_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Retail">Retail</SelectItem><SelectItem value="Wholesale">Wholesale</SelectItem><SelectItem value="Manufacturing">Manufacturing</SelectItem></SelectContent>
              </Select></div>
            {[["license_no","License No"],["valid_from","Valid From","date"],["valid_to","Valid To","date"],["issuing_authority","Issuing Authority"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>License No</TableHead><TableHead>Valid From</TableHead>
            <TableHead>Valid To</TableHead><TableHead>Issuing Authority</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {licenses.map((l: any) => {
              const days = l.valid_to ? daysUntil(l.valid_to) : 999;
              return (
                <TableRow key={l.id}>
                  <TableCell><Badge variant="outline">{l.license_type}</Badge></TableCell>
                  <TableCell className="font-mono">{l.license_no}</TableCell>
                  <TableCell>{l.valid_from ? new Date(l.valid_from).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{l.valid_to ? new Date(l.valid_to).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{l.issuing_authority}</TableCell>
                  <TableCell><Badge variant={days < 0 ? "destructive" : days < 60 ? "outline" : "secondary"}>{days < 0 ? "Expired" : days < 60 ? "Expiring Soon" : "Active"}</Badge></TableCell>
                </TableRow>
              );
            })}
            {licenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No licenses</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
