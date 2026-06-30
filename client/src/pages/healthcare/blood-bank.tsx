import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Droplets, Plus, AlertTriangle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function BloodBankPage() {
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [donorOpen, setDonorOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ blood_group: "A+", units: "", patient_id: "", cross_match_done: false });
  const [donorForm, setDonorForm] = useState({ name: "", blood_group: "A+", phone: "", donation_date: "", units_donated: "" });

  const { data: stock } = useQuery({ queryKey: ["blood-stock"], queryFn: () => api("GET", "/api/healthcare/blood-bank/stock") });

  const issueBlood = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/blood-bank/issue", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blood-stock"] }); setIssueOpen(false); setIssueForm({ blood_group: "A+", units: "", patient_id: "", cross_match_done: false }); },
  });

  const addDonor = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/blood-bank/donors", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blood-stock"] }); setDonorOpen(false); setDonorForm({ name: "", blood_group: "A+", phone: "", donation_date: "", units_donated: "" }); },
  });

  const stockMap: Record<string, number> = {};
  if (Array.isArray(stock)) stock.forEach((s: any) => { stockMap[s.blood_group] = Number(s.units_available ?? 0); });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold">Blood Bank</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={donorOpen} onOpenChange={setDonorOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1" />Add Donor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register Donor</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name</Label><Input value={donorForm.name} onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })} /></div>
                <div>
                  <Label>Blood Group</Label>
                  <Select value={donorForm.blood_group} onValueChange={(v) => setDonorForm({ ...donorForm, blood_group: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Phone</Label><Input value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} /></div>
                <div><Label>Donation Date</Label><Input type="date" value={donorForm.donation_date} onChange={(e) => setDonorForm({ ...donorForm, donation_date: e.target.value })} /></div>
                <div><Label>Units Donated</Label><Input type="number" value={donorForm.units_donated} onChange={(e) => setDonorForm({ ...donorForm, units_donated: e.target.value })} /></div>
                <Button className="w-full" onClick={() => addDonor.mutate(donorForm)} disabled={addDonor.isPending}>Register</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Issue Blood</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Issue Blood</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Blood Group</Label>
                  <Select value={issueForm.blood_group} onValueChange={(v) => setIssueForm({ ...issueForm, blood_group: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Units</Label><Input type="number" value={issueForm.units} onChange={(e) => setIssueForm({ ...issueForm, units: e.target.value })} /></div>
                <div><Label>Patient ID</Label><Input value={issueForm.patient_id} onChange={(e) => setIssueForm({ ...issueForm, patient_id: e.target.value })} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cross" checked={issueForm.cross_match_done} onChange={(e) => setIssueForm({ ...issueForm, cross_match_done: e.target.checked })} />
                  <Label htmlFor="cross">Cross-match done</Label>
                </div>
                <Button className="w-full" onClick={() => issueBlood.mutate(issueForm)} disabled={issueBlood.isPending}>Issue</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Blood Stock Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units Available</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BLOOD_GROUPS.map((g) => {
                const units = stockMap[g] ?? 0;
                const low = units < 5;
                return (
                  <TableRow key={g} className={low ? "bg-red-50" : ""}>
                    <TableCell className="font-semibold">{g}</TableCell>
                    <TableCell className={low ? "text-red-600 font-bold" : ""}>{units}</TableCell>
                    <TableCell>
                      {low ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
