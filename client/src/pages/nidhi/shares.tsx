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

export default function NidhiSharesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"issue"|"transfer">("issue");
  const [issueForm, setIssueForm] = useState({ member_id: "", number_of_shares: "", face_value: "", payment_mode: "" });
  const [transferForm, setTransferForm] = useState({ from_member_id: "", to_member_id: "", shares_count: "", transfer_date: "" });

  const { data: shares = [] } = useQuery({ queryKey: ["/api/nidhi/shares"], queryFn: () => api("GET", "/api/nidhi/shares") });

  const issueMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/shares", { ...data, action: "issue" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/shares"] }); toast({ title: "Shares issued" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/shares", { ...data, action: "transfer" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/shares"] }); toast({ title: "Shares transferred" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Share Management</h1>

      <div className="flex gap-2">
        <Button variant={tab === "issue" ? "default" : "outline"} onClick={() => setTab("issue")}>Issue Shares</Button>
        <Button variant={tab === "transfer" ? "default" : "outline"} onClick={() => setTab("transfer")}>Transfer Shares</Button>
      </div>

      {tab === "issue" && (
        <Card>
          <CardHeader><CardTitle>Issue Shares</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["member_id","number_of_shares","face_value"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(issueForm as any)[k]} onChange={e => setIssueForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label className="text-sm">Payment Mode</label>
                <Select value={issueForm.payment_mode} onValueChange={v => setIssueForm(p => ({...p, payment_mode: v}))}>
                  <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                  <SelectContent>{["cash","upi","cheque","neft"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="mt-3" onClick={() => issueMutation.mutate(issueForm)}>Issue</Button>
          </CardContent>
        </Card>
      )}

      {tab === "transfer" && (
        <Card>
          <CardHeader><CardTitle>Transfer Shares</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["from_member_id","to_member_id","shares_count","transfer_date"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("date") ? "date" : "text"} value={(transferForm as any)[k]} onChange={e => setTransferForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <Button className="mt-3" onClick={() => transferMutation.mutate(transferForm)}>Transfer</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Share Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead><TableHead>Share No From</TableHead><TableHead>Share No To</TableHead>
                <TableHead>Count</TableHead><TableHead>Face Value</TableHead><TableHead>Total Value</TableHead>
                <TableHead>Issue Date</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.member_name}</TableCell>
                  <TableCell>{s.share_no_from}</TableCell>
                  <TableCell>{s.share_no_to}</TableCell>
                  <TableCell>{s.shares_count}</TableCell>
                  <TableCell>₹{fmt(s.face_value)}</TableCell>
                  <TableCell>₹{fmt(s.total_value)}</TableCell>
                  <TableCell>{s.issue_date}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
              {shares.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No share records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
