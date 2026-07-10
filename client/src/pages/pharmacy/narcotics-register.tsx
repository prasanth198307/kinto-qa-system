import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Printer } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const BLANK = { drug_name: "", schedule: "H", batch: "", opening: "", received: "", dispensed: "", doctor_name: "", patient_name: "", prescription_no: "" };

const MOCK_ENTRIES = [
  { id: 1, date: "2026-06-30", drug_name: "Tramadol 50mg", schedule: "H1", batch: "TRM-0621", opening: 100, received: 0, dispensed: 5, closing: 95, doctor: "Dr. Suresh", patient: "Ravi Kumar", rx_no: "RX-001", discrepancy: false },
  { id: 2, date: "2026-06-30", drug_name: "Alprazolam 0.5mg", schedule: "H", batch: "ALP-0122", opening: 50, received: 100, dispensed: 12, closing: 138, doctor: "Dr. Priya", patient: "Meena Devi", rx_no: "RX-002", discrepancy: false },
  { id: 3, date: "2026-06-29", drug_name: "Morphine 10mg", schedule: "X", batch: "MOR-0321", opening: 20, received: 0, dispensed: 3, closing: 18, doctor: "Dr. Rahul", patient: "Suresh Babu", rx_no: "RX-003", discrepancy: true },
];

export default function NarcoticsRegisterPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [filterDate, setFilterDate] = useState("2026-06-30");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: serverData } = useQuery({
    queryKey: ["narcotics-register", filterDate],
    queryFn: () => api("GET", `/api/pharmacy/narcotics-register?date=${filterDate}`),
  });

  const saveEntry = useMutation({
    mutationFn: () => api("POST", "/api/pharmacy/narcotics-register", form),
    onSuccess: () => {
      const opening = Number(form.opening);
      const received = Number(form.received);
      const dispensed = Number(form.dispensed);
      const closing = opening + received - dispensed;
      const discrepancy = false; // opening + received !== dispensed + closing in real case
      setEntries(prev => [...prev, {
        id: prev.length + 1,
        date: filterDate,
        drug_name: form.drug_name,
        schedule: form.schedule,
        batch: form.batch,
        opening,
        received,
        dispensed,
        closing,
        doctor: form.doctor_name,
        patient: form.patient_name,
        rx_no: form.prescription_no,
        discrepancy,
      }]);
      toast({ title: "Entry recorded in narcotics register" });
      qc.invalidateQueries({ queryKey: ["narcotics-register"] });
      setForm({ ...BLANK });
      setShowDialog(false);
    },
    onError: () => toast({ title: "Failed to save entry", variant: "destructive" }),
  });

  const handlePrint = () => window.print();
  const discrepancies = entries.filter(e => e.discrepancy);
  const today = entries.filter(e => e.date === filterDate);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Narcotics & Psychotropics Register</h1>
          <p className="text-sm text-gray-500">Schedule H / H1 / X Drug Register — Mandatory by Law</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print Register</Button>
          <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      </div>

      {discrepancies.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Balance Discrepancy Detected</p>
            <p className="text-sm text-red-600">{discrepancies.length} record(s) have balance mismatches. Please investigate immediately.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label>Filter by Date:</Label>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />
        <Badge className="bg-blue-100 text-blue-800">{today.length} entries today</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Register Entries</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Drug Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Dispensed</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Rx No.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id} className={e.discrepancy ? "bg-red-50" : ""}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="font-medium">{e.drug_name}</TableCell>
                  <TableCell>
                    <Badge className={e.schedule === "X" ? "bg-red-100 text-red-800" : e.schedule === "H1" ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"}>
                      Sch-{e.schedule}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{e.batch}</TableCell>
                  <TableCell className="text-right">{e.opening}</TableCell>
                  <TableCell className="text-right">{e.received}</TableCell>
                  <TableCell className="text-right">{e.dispensed}</TableCell>
                  <TableCell className="text-right font-semibold">{e.closing}</TableCell>
                  <TableCell>{e.doctor}</TableCell>
                  <TableCell>{e.patient}</TableCell>
                  <TableCell className="font-mono text-sm">{e.rx_no}</TableCell>
                  <TableCell>
                    {e.discrepancy
                      ? <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1 inline" />Mismatch</Badge>
                      : <Badge className="bg-green-100 text-green-800">OK</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Narcotics Register Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Drug Name</Label>
                <Input value={form.drug_name} onChange={e => set("drug_name", e.target.value)} placeholder="e.g. Tramadol 50mg" />
              </div>
              <div>
                <Label>Schedule</Label>
                <Select value={form.schedule} onValueChange={v => set("schedule", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H">Schedule H</SelectItem>
                    <SelectItem value="H1">Schedule H1</SelectItem>
                    <SelectItem value="X">Schedule X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input value={form.batch} onChange={e => set("batch", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Opening Balance</Label>
                <Input type="number" value={form.opening} onChange={e => set("opening", e.target.value)} />
              </div>
              <div>
                <Label>Received</Label>
                <Input type="number" value={form.received} onChange={e => set("received", e.target.value)} />
              </div>
              <div>
                <Label>Dispensed</Label>
                <Input type="number" value={form.dispensed} onChange={e => set("dispensed", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Doctor Name</Label>
                <Input value={form.doctor_name} onChange={e => set("doctor_name", e.target.value)} />
              </div>
              <div>
                <Label>Patient Name</Label>
                <Input value={form.patient_name} onChange={e => set("patient_name", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Prescription Number</Label>
              <Input value={form.prescription_no} onChange={e => set("prescription_no", e.target.value)} />
            </div>
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
              Closing Balance = {(Number(form.opening) || 0) + (Number(form.received) || 0) - (Number(form.dispensed) || 0)}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveEntry.mutate()} disabled={saveEntry.isPending}>
                {saveEntry.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
