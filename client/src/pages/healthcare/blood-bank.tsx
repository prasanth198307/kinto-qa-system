import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, Plus, X, AlertTriangle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENT_TYPES = ["Whole Blood", "Packed RBC", "Fresh Frozen Plasma", "Platelets", "Cryoprecipitate"];

const BG_COLOR: Record<string, string> = {
  "A+": "bg-red-100 text-red-800 border-red-200",
  "A-": "bg-red-50 text-red-700 border-red-100",
  "B+": "bg-orange-100 text-orange-800 border-orange-200",
  "B-": "bg-orange-50 text-orange-700 border-orange-100",
  "AB+": "bg-purple-100 text-purple-800 border-purple-200",
  "AB-": "bg-purple-50 text-purple-700 border-purple-100",
  "O+": "bg-blue-100 text-blue-800 border-blue-200",
  "O-": "bg-blue-50 text-blue-700 border-blue-100",
};

const EMPTY_DONATION = { donor_name: "", donor_id: "", blood_group: "O+", component_type: "Whole Blood", units: "1", collection_date: new Date().toISOString().slice(0, 10), expiry_date: "", bag_no: "" };
const EMPTY_ISSUE = { patient_id: "", blood_group: "O+", component_type: "Packed RBC", units: "1", requested_by: "", cross_match_done: true, notes: "" };

export default function BloodBankPage() {
  const qc = useQueryClient();
  const [showDonation, setShowDonation] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [donationForm, setDonationForm] = useState({ ...EMPTY_DONATION });
  const [issueForm, setIssueForm] = useState({ ...EMPTY_ISSUE });

  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/blood-bank/stock"], queryFn: () => api("GET", "/api/healthcare/blood-bank/stock") });
  const { data: donations = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/blood-bank"], queryFn: () => api("GET", "/api/healthcare/blood-bank") });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });

  const addDonation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/blood-bank", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/blood-bank"] }); qc.invalidateQueries({ queryKey: ["/api/healthcare/blood-bank/stock"] }); setShowDonation(false); setDonationForm({ ...EMPTY_DONATION }); },
  });

  const issueBlood = useMutation({
    mutationFn: (b: any) => api("POST", "/api/healthcare/blood-bank/issue", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/blood-bank/stock"] }); setShowIssue(false); setIssueForm({ ...EMPTY_ISSUE }); },
  });

  const df = (k: string, v: string) => setDonationForm(p => ({ ...p, [k]: v }));
  const isf = (k: string, v: string) => setIssueForm(p => ({ ...p, [k]: v }));

  const stockArr = Array.isArray(stock) ? stock : [];
  const donationsArr = Array.isArray(donations) ? donations : [];
  const totalUnits = stockArr.reduce((s: number, r: any) => s + (r.available_units ?? 0), 0);
  const lowStock = stockArr.filter((r: any) => (r.available_units ?? 0) < 2);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Droplets className="w-6 h-6 text-red-500" />Blood Bank</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDonation(true)}><Plus className="w-4 h-4 mr-1" />Add Donation</Button>
          <Button onClick={() => setShowIssue(true)}>Issue Blood</Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">Low stock alert: {lowStock.map((r: any) => `${r.blood_group} (${r.available_units} units)`).join(", ")}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Units Available</p><p className="text-2xl font-bold text-red-600">{totalUnits}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Blood Groups Stocked</p><p className="text-2xl font-bold">{stockArr.filter((r: any) => r.available_units > 0).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Donations</p><p className="text-2xl font-bold text-green-600">{donationsArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Low Stock Groups</p><p className="text-2xl font-bold text-red-600">{lowStock.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {BLOOD_GROUPS.map(bg => {
          const row = stockArr.find((r: any) => r.blood_group === bg);
          const units = row?.available_units ?? 0;
          return (
            <div key={bg} className={`border-2 rounded-lg p-4 text-center ${BG_COLOR[bg]}`}>
              <p className="text-2xl font-bold">{bg}</p>
              <p className="text-3xl font-bold mt-1">{units}</p>
              <p className="text-xs mt-1">units</p>
              {units < 2 && <Badge className="mt-1 bg-red-600 text-white text-xs">Low</Badge>}
            </div>
          );
        })}
      </div>

      {showDonation && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Add Blood Donation</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowDonation(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Donor Name</Label><Input value={donationForm.donor_name} onChange={e => df("donor_name", e.target.value)} /></div>
            <div><Label>Donor ID (optional)</Label><Input value={donationForm.donor_id} onChange={e => df("donor_id", e.target.value)} /></div>
            <div><Label>Bag No.</Label><Input value={donationForm.bag_no} onChange={e => df("bag_no", e.target.value)} /></div>
            <div><Label>Blood Group</Label>
              <Select value={donationForm.blood_group} onValueChange={v => df("blood_group", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Component</Label>
              <Select value={donationForm.component_type} onValueChange={v => df("component_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Units</Label><Input type="number" value={donationForm.units} onChange={e => df("units", e.target.value)} /></div>
            <div><Label>Collection Date</Label><Input type="date" value={donationForm.collection_date} onChange={e => df("collection_date", e.target.value)} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={donationForm.expiry_date} onChange={e => df("expiry_date", e.target.value)} /></div>
            <div className="flex items-end">
              <Button onClick={() => addDonation.mutate({ ...donationForm, units: parseInt(donationForm.units) })}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showIssue && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Issue Blood to Patient</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowIssue(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Patient</Label>
              <Select value={issueForm.patient_id} onValueChange={v => isf("patient_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Blood Group</Label>
              <Select value={issueForm.blood_group} onValueChange={v => isf("blood_group", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Component</Label>
              <Select value={issueForm.component_type} onValueChange={v => isf("component_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Units</Label><Input type="number" value={issueForm.units} onChange={e => isf("units", e.target.value)} /></div>
            <div><Label>Requested By (Doctor)</Label><Input value={issueForm.requested_by} onChange={e => isf("requested_by", e.target.value)} /></div>
            <div><Label>Notes</Label><Input value={issueForm.notes} onChange={e => isf("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
              <Button onClick={() => issueBlood.mutate({ ...issueForm, patient_id: parseInt(issueForm.patient_id), units: parseInt(issueForm.units) })}>Issue Blood</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Donations</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">{["Donor", "Bag No", "Blood Group", "Component", "Units", "Collection Date", "Expiry"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>
              {donationsArr.slice(0, 20).map((d: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="p-2">{d.donor_name}</td>
                  <td className="p-2 font-mono">{d.bag_no}</td>
                  <td className="p-2"><Badge className={BG_COLOR[d.blood_group] ?? ""}>{d.blood_group}</Badge></td>
                  <td className="p-2">{d.component_type}</td>
                  <td className="p-2">{d.units}</td>
                  <td className="p-2">{d.collection_date?.slice(0, 10)}</td>
                  <td className="p-2">{d.expiry_date?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {donationsArr.length === 0 && <p className="text-center text-gray-400 py-6">No donation records.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
