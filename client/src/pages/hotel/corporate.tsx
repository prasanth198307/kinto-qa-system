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

export default function HotelCorporatePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"corporate"|"agents">("corporate");
  const [form, setForm] = useState({ company_name: "", contact_person: "", phone: "", email: "", credit_limit: "", balance: "", discount_pct: "" });

  const { data: accounts = [] } = useQuery({ queryKey: ["hotel-corporate"], queryFn: () => api("GET", "/api/hotel/corporate-accounts") });

  const addAccount = useMutation({
    mutationFn: () => api("POST", "/api/hotel/corporate-accounts", { ...form, credit_limit: Number(form.credit_limit), balance: Number(form.balance), discount_pct: Number(form.discount_pct) }),
    onSuccess: () => { toast({ title: "Account added" }); qc.invalidateQueries({ queryKey: ["hotel-corporate"] }); setForm({ company_name: "", contact_person: "", phone: "", email: "", credit_limit: "", balance: "", discount_pct: "" }); }
  });

  const accountList: any[] = Array.isArray(accounts) ? accounts : (accounts as any)?.accounts || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Corporate and Agents</h1>
      <div className="flex gap-2">
        <Button variant={tab === "corporate" ? "default" : "outline"} onClick={() => setTab("corporate")}>Corporate Accounts</Button>
        <Button variant={tab === "agents" ? "default" : "outline"} onClick={() => setTab("agents")}>Travel Agents</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Add {tab === "corporate" ? "Corporate Account" : "Travel Agent"}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Company Name" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="w-44" />
            <Input placeholder="Contact Person" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} className="w-40" />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-36" />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-44" />
            <Input placeholder="Credit Limit" type="number" value={form.credit_limit} onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value }))} className="w-32" />
            <Input placeholder="Balance" type="number" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} className="w-28" />
            <Input placeholder="Discount %" type="number" value={form.discount_pct} onChange={e => setForm(p => ({ ...p, discount_pct: e.target.value }))} className="w-24" />
            <Button onClick={() => addAccount.mutate()}>Add</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{tab === "corporate" ? "Corporate Accounts" : "Travel Agents"}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Discount%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountList.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.company_name}</TableCell>
                  <TableCell>{a.contact_person}</TableCell>
                  <TableCell>{a.phone}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>Rs {fmt(a.credit_limit)}</TableCell>
                  <TableCell>Rs {fmt(a.balance)}</TableCell>
                  <TableCell>{a.discount_pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
