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

export default function CRMContactsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", designation: "", source: "", notes: "" });

  const { data: contacts = [] } = useQuery({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/contacts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/contacts"] }); setShowForm(false); toast({ title: "Contact added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Contact</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["name","company","email","phone","designation","source","notes"].map(k => (
                <div key={k} className={k === "notes" ? "col-span-2" : ""}>
                  <label className="text-sm capitalize">{k}</label>
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
        <CardHeader><CardTitle>All Contacts ({contacts.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Email</TableHead>
                <TableHead>Phone</TableHead><TableHead>Designation</TableHead><TableHead>Source</TableHead>
                <TableHead>Last Activity</TableHead><TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.designation}</TableCell>
                  <TableCell>{c.source}</TableCell>
                  <TableCell>{c.last_activity}</TableCell>
                  <TableCell>{c.tags && <Badge variant="outline">{c.tags}</Badge>}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No contacts found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
