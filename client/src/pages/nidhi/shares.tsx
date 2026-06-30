import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, Hash, IndianRupee, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function SharesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [sharesToAdd, setSharesToAdd] = useState("");
  const [shareValue, setShareValue] = useState("");

  const { data: shares = [] } = useQuery({ queryKey: ["nidhi-shares"], queryFn: () => api("GET", "/api/nidhi-company/shares") });
  const { data: members = [] } = useQuery({ queryKey: ["nidhi-members"], queryFn: () => api("GET", "/api/nidhi-company/members") });

  const sorted = [...shares].sort((a: any, b: any) => (b.shares_held * b.share_value) - (a.shares_held * a.share_value));

  const totalShareholders = shares.length;
  const totalSharesIssued = shares.reduce((s: number, m: any) => s + Number(m.shares_held ?? 0), 0);
  const totalShareCapital = shares.reduce((s: number, m: any) => s + Number(m.shares_held ?? 0) * Number(m.share_value ?? 0), 0);

  const issueMutation = useMutation({
    mutationFn: () => api("POST", "/api/nidhi-company/shares/issue", { member_id: Number(memberId), shares_to_add: Number(sharesToAdd), share_value: Number(shareValue) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-shares"] }); setDialogOpen(false); setMemberId(""); setSharesToAdd(""); setShareValue(""); },
  });

  function exportCsv() {
    const header = "Member #,Name,Phone,Shares Held,Share Value,Total Amount,Membership Date\n";
    const rows = sorted.map((m: any) => `${m.member_number},${m.name},${m.phone},${m.shares_held},${m.share_value},${Number(m.shares_held) * Number(m.share_value)},${m.membership_date?.slice(0, 10) ?? ""}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "shares.csv"; a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Share Register</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          <Button onClick={() => setDialogOpen(true)}>+ Issue Shares</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{ icon: Users, label: "Total Shareholders", val: totalShareholders }, { icon: Hash, label: "Total Shares Issued", val: totalSharesIssued.toLocaleString() }, { icon: IndianRupee, label: "Total Share Capital", val: `₹${totalShareCapital.toLocaleString()}` }].map(({ icon: Icon, label, val }) => (
          <Card key={label}><CardContent className="p-4 flex items-center gap-3"><Icon className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">{label}</p><p className="text-xl font-bold">{val}</p></div></CardContent></Card>
        ))}
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Member #</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Shares Held</TableHead><TableHead>Share Value (₹)</TableHead><TableHead>Total Amount (₹)</TableHead><TableHead>Membership Date</TableHead></TableRow></TableHeader>
        <TableBody>
          {sorted.map((m: any) => (
            <TableRow key={m.id}>
              <TableCell>{m.member_number}</TableCell>
              <TableCell>{m.name}</TableCell>
              <TableCell>{m.phone}</TableCell>
              <TableCell>{m.shares_held}</TableCell>
              <TableCell>{Number(m.share_value).toLocaleString()}</TableCell>
              <TableCell>{(Number(m.shares_held) * Number(m.share_value)).toLocaleString()}</TableCell>
              <TableCell>{m.membership_date?.slice(0, 10)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue Shares</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.member_number} — {m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Shares to Add</Label><Input type="number" value={sharesToAdd} onChange={(e) => setSharesToAdd(e.target.value)} /></div>
            <div><Label>Share Value (₹)</Label><Input type="number" value={shareValue} onChange={(e) => setShareValue(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => issueMutation.mutate()} disabled={!memberId || !sharesToAdd || !shareValue || issueMutation.isPending}>{issueMutation.isPending ? "Issuing..." : "Issue"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
