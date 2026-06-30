import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface RegisterEntry { id: number; date: string; drug_name: string; batch_number: string; quantity: number; patient_name: string; prescription_by: string; prescription_number: string; }

const blank = { date: new Date().toISOString().split("T")[0], drug_name: "", batch_number: "", quantity: 0, patient_name: "", prescription_by: "", prescription_number: "" };

export default function ScheduleH() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blank });

  const { data: entries = [], isLoading } = useQuery<RegisterEntry[]>({
    queryKey: ["pharmacy-register-H"],
    queryFn: () => api("GET", "/api/pharmacy/registers/H"),
  });

  const addEntry = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/registers/H", data),
    onSuccess: () => {
      toast({ title: "Entry added to Schedule H register" });
      qc.invalidateQueries({ queryKey: ["pharmacy-register-H"] });
      setOpen(false);
      setForm({ ...blank });
    },
    onError: () => toast({ title: "Failed to add entry", variant: "destructive" }),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const exportCSV = () => {
    const arr = Array.isArray(entries) ? entries : [];
    const headers = ["Date", "Drug Name", "Batch", "Quantity", "Patient Name", "Prescribed By", "Prescription No."];
    const rows = arr.map((e) => [e.date, e.drug_name, e.batch_number, e.quantity, e.patient_name, e.prescription_by, e.prescription_number]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `schedule-h-register-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const entriesArr = Array.isArray(entries) ? entries : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule H Register</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
        <p className="text-sm text-yellow-800">Schedule H drugs require valid prescription. Maintain register as per Drugs &amp; Cosmetics Act. All entries are subject to inspection by the Drug Inspector.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Register Entries ({entriesArr.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Drug Name</TableHead><TableHead>Batch</TableHead>
                <TableHead>Qty</TableHead><TableHead>Patient Name</TableHead><TableHead>Prescribed By</TableHead><TableHead>Rx No.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>}
              {!isLoading && entriesArr.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No entries</TableCell></TableRow>}
              {entriesArr.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{entry.drug_name}</TableCell>
                  <TableCell>{entry.batch_number}</TableCell>
                  <TableCell>{entry.quantity}</TableCell>
                  <TableCell>{entry.patient_name}</TableCell>
                  <TableCell>{entry.prescription_by}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.prescription_number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Schedule H Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={f("date")} /></div>
            <div className="space-y-1"><Label>Drug Name *</Label><Input value={form.drug_name} onChange={f("drug_name")} /></div>
            <div className="space-y-1"><Label>Batch Number</Label><Input value={form.batch_number} onChange={f("batch_number")} /></div>
            <div className="space-y-1"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={f("quantity")} /></div>
            <div className="space-y-1"><Label>Patient Name *</Label><Input value={form.patient_name} onChange={f("patient_name")} /></div>
            <div className="space-y-1"><Label>Prescribed By *</Label><Input value={form.prescription_by} onChange={f("prescription_by")} /></div>
            <div className="col-span-2 space-y-1"><Label>Prescription No. *</Label><Input value={form.prescription_number} onChange={f("prescription_number")} /></div>
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
