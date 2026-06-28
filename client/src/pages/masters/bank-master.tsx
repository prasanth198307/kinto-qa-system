import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { bank_name: "", ifsc_prefix: "", branch_name: "", city: "", state: "", micr_code: "" };

export default function MastersBankMasterPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");

  const { data: banks = [] } = useQuery({ queryKey: ["/api/masters/banks"], queryFn: () => api("GET", "/api/masters/banks") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/banks", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/banks"] }); toast({ title: "Bank added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const filtered = Array.isArray(banks) ? banks.filter((b: any) =>
    !search || b.bank_name?.toLowerCase().includes(search.toLowerCase()) || b.ifsc_prefix?.includes(search.toUpperCase())
  ) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bank Master</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Bank</Button>
      </div>
      <Input placeholder="Search by bank name or IFSC" value={search} onChange={e => setSearch(e.target.value)} className="w-80" />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Bank</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {(["bank_name","ifsc_prefix","branch_name","city","state","micr_code"] as const).map(k => (
              <Input key={k} placeholder={k.replace(/_/g," ")} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
            ))}
            <div className="col-span-3 flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Bank Name</TableHead><TableHead>IFSC Prefix</TableHead><TableHead>Branch</TableHead>
              <TableHead>City</TableHead><TableHead>MICR Code</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((b: any) => (
                <TableRow key={b.id || b.ifsc_prefix}>
                  <TableCell>{b.bank_name}</TableCell><TableCell>{b.ifsc_prefix}</TableCell>
                  <TableCell>{b.branch || b.branch_name}</TableCell><TableCell>{b.city}</TableCell>
                  <TableCell>{b.micr_code}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
