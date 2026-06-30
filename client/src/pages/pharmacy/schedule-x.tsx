import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Download, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface RegisterEntry {
  id: number; date: string; drug_name: string; batch_number: string; quantity_received: number; quantity_issued: number;
  balance: number; patient_name: string; prescription_by: string; prescription_number: string; source_of_supply: string; id_proof_patient: string;
}

const blank = {
  date: new Date().toISOString().split("T")[0], drug_name: "", batch_number: "", quantity_received: 0, quantity_issued: 0,
  patient_name: "", prescription_by: "", prescription_number: "", source_of_supply: "", id_proof_patient: "",
};

export default function ScheduleX() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });

  const { data: entries = [], isLoading } = useQuery<RegisterEntry[]>({
    queryKey: ["pharmacy-register-X"],
    queryFn: () => api("GET", "/api/pharmacy/registers/X"),
  });

  const addEntry = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/registers/X", data),
    onSuccess: () => {
      toast({ title: "Entry added to Schedule X register" });
      qc.invalidateQueries({ queryKey: ["pharmacy-register-X"] });
      setOpen(false);
      setForm({ ...blank });
    },
    onError: () => toast({ title: "Failed to add entry", variant: "destructive" }),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const exportCSV = () => {
    const arr = Array.isArray(entries) ? entries : [];
    const headers = ["Date", "Drug Name", "Batch", "Qty Received", "Qty Issued", "Balance", "Patient", "Prescribed By", "Rx No.", "Source", "ID Proof"];
    const rows = arr.map((e) => [e.date, e.drug_name, e.batch_number, e.quantity_received, e.quantity_issued, e.balance, e.patient_name, e.prescription_by, e.prescription_number, e.source_of_supply, e.id_proof_patient]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `schedule-x-register-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const entriesArr = Array.isArray(entries) ? entries : [];
  let runningBalance = 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule X Register</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-300 rounded-md">
        <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <p className="text-sm text-red-800 font-medium">Schedule X drugs — restricted. Narcotic/Psychotropic substances. Inspector may verify this register at any time. Strict compliance with NDPS Act required.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Register Entries ({entriesArr.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Drug Name</TableHead><TableHead>Batch</TableHead>
                  <TableHead>Qty Received</TableHead><TableHead>Qty Issued</TableHead><TableHead className="font-bold">Balance</TableHead>
                  <TableHead>Patient</TableHead><TableHead>Prescribed By</TableHead><TableHead>Rx No.</TableHead>
                  <TableHead>Source of Supply</TableHead><TableHead>ID Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={11} className="text-center">Loading...</TableCell></TableRow>}
                {!isLoading && entriesArr.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
                {entriesArr.map((entry) => {
                  runningBalance = entry.balance !== undefined ? entry.balance : runningBalance + entry.quantity_received - entry.quantity_issued;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{entry.drug_name}</TableCell>
                      <TableCell>{entry.batch_number}</TableCell>
                      <TableCell className="text-green-700">{entry.quantity_received}</TableCell>
                      <TableCell className="text-red-700">{entry.quantity_issued}</TableCell>
                      <TableCell className="font-bold">{entry.balance ?? runningBalance}</TableCell>
                      <TableCell>{entry.patient_name}</TableCell>
                      <TableCell>{entry.prescription_by}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.prescription_number}</TableCell>
                      <TableCell>{entry.source_of_supply}</TableCell>
                      <TableCell>{entry.id_proof_patient}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Schedule X Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={f("date")} /></div>
            <div className="space-y-1"><Label>Drug Name *</Label><Input value={form.drug_name} onChange={f("drug_name")} /></div>
            <div className="space-y-1"><Label>Batch Number</Label><Input value={form.batch_number} onChange={f("batch_number")} /></div>
            <div className="space-y-1"><Label>Qty Received</Label><Input type="number" value={form.quantity_received} onChange={f("quantity_received")} /></div>
            <div className="space-y-1"><Label>Qty Issued</Label><Input type="number" value={form.quantity_issued} onChange={f("quantity_issued")} /></div>
            <div className="space-y-1"><Label>Patient Name *</Label><Input value={form.patient_name} onChange={f("patient_name")} /></div>
            <div className="space-y-1"><Label>Prescribed By *</Label><Input value={form.prescription_by} onChange={f("prescription_by")} /></div>
            <div className="space-y-1"><Label>Prescription No. *</Label><Input value={form.prescription_number} onChange={f("prescription_number")} /></div>
            <div className="space-y-1"><Label>Source of Supply</Label><Input value={form.source_of_supply} onChange={f("source_of_supply")} /></div>
            <div className="space-y-1"><Label>Patient ID Proof</Label><Input value={form.id_proof_patient} onChange={f("id_proof_patient")} placeholder="Aadhaar/PAN/etc." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addEntry.mutate(form)} disabled={addEntry.isPending || !form.drug_name || !form.patient_name || !form.prescription_by || !form.prescription_number}>
              {addEntry.isPending ? "Saving..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
