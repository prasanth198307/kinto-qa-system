import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserCheck, Clock, IndianRupee } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const statusColor: Record<string, string> = { active: "bg-green-100 text-green-800", inactive: "bg-red-100 text-red-800", suspended: "bg-yellow-100 text-yellow-800" };
const kycColor: Record<string, string> = { completed: "bg-green-100 text-green-800", pending: "bg-yellow-100 text-yellow-800", rejected: "bg-red-100 text-red-800" };

const EMPTY = { member_number: "", name: "", father_name: "", date_of_birth: "", gender: "male", phone: "", alternate_phone: "", email: "", address: "", city: "", state: "", pincode: "", aadhar_number: "", pan_number: "", nominee_name: "", nominee_relation: "", nominee_dob: "", membership_date: "", shares_held: "", share_value: "", introduced_by: "", is_senior_citizen: false };

export default function MembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: stats } = useQuery({ queryKey: ["nidhi-member-stats"], queryFn: () => api("GET", "/api/nidhi-company/members/stats") });
  const { data: members = [] } = useQuery({ queryKey: ["nidhi-members"], queryFn: () => api("GET", "/api/nidhi-company/members") });
  const { data: detail } = useQuery({ queryKey: ["nidhi-member", selectedId], queryFn: () => api("GET", `/api/nidhi-company/members/${selectedId}`), enabled: !!selectedId });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editId ? api("PUT", `/api/nidhi-company/members/${editId}`, data) : api("POST", "/api/nidhi-company/members", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-members"] }); qc.invalidateQueries({ queryKey: ["nidhi-member-stats"] }); setDialogOpen(false); setForm(EMPTY); setEditId(null); },
  });

  const kycMutation = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/nidhi-company/members/${id}/kyc`, { kyc_status: "completed" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-members"] }); qc.invalidateQueries({ queryKey: ["nidhi-member-stats"] }); },
  });

  const filtered = members.filter((m: any) => {
    const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.member_number?.includes(search) || m.phone?.includes(search);
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    const matchKyc = kycFilter === "all" || m.kyc_status === kycFilter;
    return matchSearch && matchStatus && matchKyc;
  });

  function openAdd() { setForm(EMPTY); setEditId(null); setDialogOpen(true); }
  function openEdit(m: any) { setForm({ ...m }); setEditId(m.id); setDialogOpen(true); }
  function field(key: string, label: string, type = "text") {
    return (
      <div>
        <Label>{label}</Label>
        {key === "gender" ? (
          <Select value={form[key]} onValueChange={(v) => setForm((f: any) => ({ ...f, [key]: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
          </Select>
        ) : type === "checkbox" ? (
          <div className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!form[key]} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.checked }))} /><span className="text-sm">Yes</span></div>
        ) : (
          <Input type={type} value={form[key] ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Member Management</h1>
        <Button onClick={openAdd}>+ Add Member</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{ icon: Users, label: "Total Members", val: stats?.total_members }, { icon: UserCheck, label: "Active", val: stats?.active_members }, { icon: Clock, label: "KYC Pending", val: stats?.kyc_pending }, { icon: IndianRupee, label: "Share Capital", val: stats?.total_share_capital ? `₹${Number(stats.total_share_capital).toLocaleString()}` : "—" }].map(({ icon: Icon, label, val }) => (
          <Card key={label}><CardContent className="p-4 flex items-center gap-3"><Icon className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">{label}</p><p className="text-xl font-bold">{val ?? "—"}</p></div></CardContent></Card>
        ))}
      </div>
      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">Members List</TabsTrigger><TabsTrigger value="detail" disabled={!selectedId}>Member Detail</TabsTrigger></TabsList>
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="Search name, number, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select>
            <Select value={kycFilter} onValueChange={setKycFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All KYC</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Member #</TableHead><TableHead>Name</TableHead><TableHead>Father</TableHead><TableHead>Phone</TableHead><TableHead>City</TableHead><TableHead>Joined</TableHead><TableHead>Shares</TableHead><TableHead>Share Amt</TableHead><TableHead>Status</TableHead><TableHead>KYC</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.member_number}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.father_name}</TableCell><TableCell>{m.phone}</TableCell><TableCell>{m.city}</TableCell><TableCell>{m.membership_date?.slice(0, 10)}</TableCell><TableCell>{m.shares_held}</TableCell><TableCell>₹{Number(m.total_share_amount ?? 0).toLocaleString()}</TableCell>
                  <TableCell><Badge className={statusColor[m.status] ?? ""}>{m.status}</Badge></TableCell>
                  <TableCell><Badge className={kycColor[m.kyc_status] ?? ""}>{m.kyc_status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(m.id)}>View</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(m)}>Edit</Button>
                    {m.kyc_status !== "completed" && <Button size="sm" variant="outline" onClick={() => kycMutation.mutate(m.id)}>Mark KYC</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="detail">
          {detail && (
            <div className="space-y-6">
              <Card><CardHeader><CardTitle>Profile — {detail.member?.name}</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3 text-sm">{["member_number","father_name","date_of_birth","gender","phone","email","address","city","state","pincode","aadhar_number","pan_number","nominee_name","nominee_relation","membership_date","shares_held","share_value","introduced_by"].map((k) => <div key={k}><span className="font-medium capitalize">{k.replace(/_/g," ")}: </span>{String(detail.member?.[k] ?? "—")}</div>)}</CardContent></Card>
              <Card><CardHeader><CardTitle>Loans</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Loan #</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{(detail.loans ?? []).map((l: any) => <TableRow key={l.id}><TableCell>{l.loan_number}</TableCell><TableCell>₹{Number(l.loan_amount).toLocaleString()}</TableCell><TableCell>{l.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              <Card><CardHeader><CardTitle>Deposits</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>FD #</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{(detail.deposits ?? []).map((d: any) => <TableRow key={d.id}><TableCell>{d.deposit_number}</TableCell><TableCell>₹{Number(d.deposit_amount).toLocaleString()}</TableCell><TableCell>{d.status}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
              <Card><CardHeader><CardTitle>Recent Collections</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Type</TableHead></TableRow></TableHeader><TableBody>{(detail.collections ?? []).map((c: any, i: number) => <TableRow key={i}><TableCell>{c.collection_date?.slice(0,10)}</TableCell><TableCell>₹{Number(c.amount).toLocaleString()}</TableCell><TableCell>{c.collection_type}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {field("member_number","Member #")}{field("name","Full Name")}{field("father_name","Father Name")}{field("date_of_birth","Date of Birth","date")}{field("gender","Gender")}{field("phone","Phone")}{field("alternate_phone","Alt Phone")}{field("email","Email","email")}{field("address","Address")}{field("city","City")}{field("state","State")}{field("pincode","Pincode")}{field("aadhar_number","Aadhar")}{field("pan_number","PAN")}{field("nominee_name","Nominee Name")}{field("nominee_relation","Nominee Relation")}{field("nominee_dob","Nominee DOB","date")}{field("membership_date","Membership Date","date")}{field("shares_held","Shares Held","number")}{field("share_value","Share Value","number")}{field("introduced_by","Introduced By")}{field("is_senior_citizen","Senior Citizen","checkbox")}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
