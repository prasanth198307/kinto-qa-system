import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft, Building2 } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Account {
  id: number;
  account_name: string;
  industry?: string;
  website?: string;
  city?: string;
  state?: string;
  contacts_count?: number;
  deal_value?: number;
  phone?: string;
  email?: string;
}

const EMPTY: Partial<Account> = { account_name: "", industry: "", website: "", city: "", state: "", phone: "", email: "" };

export default function AccountsPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editAcc, setEditAcc] = useState<Partial<Account>>(EMPTY);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["crm-accounts"],
    queryFn: () => api("GET", "/api/crm/accounts"),
  });

  const { data: detailContacts = [] } = useQuery({
    queryKey: ["crm-account-contacts", detailId],
    queryFn: () => api("GET", `/api/crm/contacts?account_id=${detailId}`),
    enabled: !!detailId,
  });

  const { data: detailActivities = [] } = useQuery({
    queryKey: ["crm-account-activities", detailId],
    queryFn: () => api("GET", `/api/crm/activities?account_id=${detailId}`),
    enabled: !!detailId,
  });

  const saveMutation = useMutation({
    mutationFn: (a: Partial<Account>) =>
      a.id ? api("PUT", `/api/crm/accounts/${a.id}`, a) : api("POST", "/api/crm/accounts", a),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-accounts"] }); setDialog(false); },
  });

  const detailAccount = accounts.find((a) => a.id === detailId);

  if (detailId && detailAccount) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">{detailAccount.account_name}</h1>
          {detailAccount.industry && <Badge variant="outline">{detailAccount.industry}</Badge>}
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {detailAccount.website && <div><span className="text-gray-500">Website: </span><a href={detailAccount.website} className="text-blue-600 underline" target="_blank" rel="noreferrer">{detailAccount.website}</a></div>}
          {detailAccount.city && <div><span className="text-gray-500">Location: </span>{detailAccount.city}, {detailAccount.state}</div>}
          {detailAccount.phone && <div><span className="text-gray-500">Phone: </span>{detailAccount.phone}</div>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contacts ({detailContacts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {detailContacts.length === 0 && <p className="text-sm text-gray-400">No contacts</p>}
              {detailContacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between border rounded p-2">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.job_title} · {c.email}</p>
                  </div>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Activities ({detailActivities.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {detailActivities.length === 0 && <p className="text-sm text-gray-400">No activities</p>}
              {detailActivities.map((a: any) => (
                <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">{a.activity_type}</Badge>
                    <span className="text-gray-400">{new Date(a.activity_date).toLocaleDateString()}</span>
                  </div>
                  {a.notes && <p className="text-gray-600">{a.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Button onClick={() => { setEditAcc(EMPTY); setDialog(true); }}>
          <Plus size={16} className="mr-1" /> Add Account
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-gray-400">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Deal Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No accounts found</TableCell></TableRow>}
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <button className="flex items-center gap-1 text-blue-600 hover:underline" onClick={() => setDetailId(a.id)}>
                        <Building2 size={14} /> {a.account_name}
                      </button>
                    </TableCell>
                    <TableCell>{a.industry || "—"}</TableCell>
                    <TableCell className="text-sm">{a.website ? <a href={a.website} className="text-blue-500 underline" target="_blank" rel="noreferrer">{a.website}</a> : "—"}</TableCell>
                    <TableCell>{a.city || "—"}</TableCell>
                    <TableCell>{a.state || "—"}</TableCell>
                    <TableCell>{a.contacts_count ?? "—"}</TableCell>
                    <TableCell>{a.deal_value != null ? `₹${a.deal_value.toLocaleString()}` : "—"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => { setEditAcc(a); setDialog(true); }}>Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editAcc.id ? "Edit Account" : "Add Account"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["account_name", "industry", "website", "city", "state", "phone", "email"] as const).map((f) => (
              <div key={f} className={f === "account_name" ? "col-span-2" : ""}>
                <label className="text-xs font-medium capitalize">{f.replace("_", " ")}</label>
                <Input value={(editAcc as any)[f] || ""} onChange={(e) => setEditAcc({ ...editAcc, [f]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(editAcc)} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
