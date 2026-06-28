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

export default function CRMAccountsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: "", industry: "", website: "", address: "", city: "", account_manager_id: "" });

  const { data: accounts = [] } = useQuery({ queryKey: ["/api/crm/accounts"], queryFn: () => api("GET", "/api/crm/accounts") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/accounts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/accounts"] }); setShowForm(false); toast({ title: "Account added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Account</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Account</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["company_name","industry","website","address","city","account_manager_id"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
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
        <CardHeader><CardTitle>All Accounts ({accounts.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead><TableHead>Industry</TableHead><TableHead>Website</TableHead>
                <TableHead>City</TableHead><TableHead>Contacts</TableHead><TableHead>Deals Value</TableHead>
                <TableHead>Account Manager</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.company_name}</TableCell>
                  <TableCell>{a.industry}</TableCell>
                  <TableCell>{a.website}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell>{a.contacts_count || 0}</TableCell>
                  <TableCell>₹{fmt(a.deals_value)}</TableCell>
                  <TableCell>{a.account_manager}</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status || "active"}</Badge></TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No accounts found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
