import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NidhiMembersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", phone: "", address: "", aadhaar: "", pan: "", nominee_name: "", nominee_relation: "" });

  const { data: members = [] } = useQuery({ queryKey: ["/api/nidhi/members"], queryFn: () => api("GET", "/api/nidhi/members") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/members", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/members"] }); setShowForm(false); toast({ title: "Member added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const active = members.filter((m: any) => m.status === "active").length;
  const totalCapital = members.reduce((s: number, m: any) => s + Number(m.share_value || 0), 0);
  const now = new Date(); const thisMonth = members.filter((m: any) => { const d = new Date(m.join_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Member</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{members.length}</div><div className="text-sm text-muted-foreground">Total Members</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{active}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{thisMonth}</div><div className="text-sm text-muted-foreground">New This Month</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(totalCapital)}</div><div className="text-sm text-muted-foreground">Share Capital</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Member</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["name","dob","phone","address","aadhaar","pan","nominee_name","nominee_relation"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "dob" ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                <TableHead>Shares</TableHead><TableHead>Share Value</TableHead><TableHead>Loans O/S</TableHead>
                <TableHead>Deposits Total</TableHead><TableHead>Join Date</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.member_id || m.id}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>{m.shares}</TableCell>
                  <TableCell>₹{fmt(m.share_value)}</TableCell>
                  <TableCell>₹{fmt(m.loans_outstanding)}</TableCell>
                  <TableCell>₹{fmt(m.deposits_total)}</TableCell>
                  <TableCell>{m.join_date}</TableCell>
                  <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {members.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No members found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
