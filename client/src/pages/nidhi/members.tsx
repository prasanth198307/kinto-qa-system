import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Download, Bell } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const KYC_BADGE: Record<string, "default" | "secondary" | "destructive"> = { verified: "default", pending: "secondary", rejected: "destructive" };
const BLANK = { name: "", father_name: "", phone: "", email: "", date_of_birth: "", gender: "", address: "", city: "", state: "Andhra Pradesh", pincode: "", aadhar_number: "", pan_number: "", nominee_name: "", nominee_relation: "", membership_date: new Date().toISOString().slice(0, 10), shares_held: "1", share_value: "10", kyc_status: "pending" };

export default function NidhiMembersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editM, setEditM] = useState<any>(null);
  const [form, setForm] = useState<any>(BLANK);

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["nidhi-members", search],
    queryFn: () => api("GET", `/api/nidhi/members${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/members", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-members"] }); setOpen(false); setForm(BLANK); toast({ title: "Member added" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }: any) => api("PUT", `/api/nidhi/members/${id}`, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-members"] }); setEditM(null); toast({ title: "Updated" }); },
  });
  const reminderMut = useMutation({
    mutationFn: () => api("POST", "/api/nidhi/emi-reminders/send", {}),
    onSuccess: (d: any) => toast({ title: `Sent ${d.reminders_sent} of ${d.total_due} WhatsApp reminders` }),
  });

  const MemberForm = ({ data, onChg, onSave, onCancel, title }: any) => (
    <Dialog open={!!data} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {([ ["name","Full Name"], ["father_name","Father's Name"], ["phone","Mobile"], ["email","Email"], ["date_of_birth","Date of Birth"], ["address","Address"], ["city","City"], ["pincode","Pincode"], ["pan_number","PAN Number"], ["nominee_name","Nominee Name"], ["nominee_relation","Nominee Relation"], ["membership_date","Membership Date"] ] as [string,string][]).map(([k, lbl]) => (
            <div key={k}><Label className="text-xs">{lbl}</Label>
              <Input value={data?.[k] || ""} type={k.includes("date") || k.includes("Date") ? "date" : "text"} onChange={(e) => onChg(k, e.target.value)} className="h-8 text-sm" /></div>
          ))}
          <div><Label className="text-xs">Gender</Label>
            <Select value={data?.gender || ""} onValueChange={(v) => onChg("gender", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">KYC Status</Label>
            <Select value={data?.kyc_status || "pending"} onValueChange={(v) => onChg("kyc_status", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{["pending","verified","rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Aadhaar (last 4 only)</Label><Input maxLength={4} value={data?.aadhar_number || ""} onChange={(e) => onChg("aadhar_number", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Shares Held</Label><Input type="number" value={data?.shares_held || "1"} onChange={(e) => onChg("shares_held", e.target.value)} className="h-8 text-sm" /></div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(data)}>{title.includes("Edit") ? "Update" : "Add Member"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => reminderMut.mutate()} disabled={reminderMut.isPending}>
            <Bell className="w-4 h-4 mr-1" />{reminderMut.isPending ? "Sending..." : "Send EMI Reminders"}
          </Button>
          <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Member</Button>
        </div>
      </div>
      <Card><CardContent className="p-4">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Name / phone / member no." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Member No.</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
            <TableHead>Deposits</TableHead><TableHead>Loans</TableHead><TableHead>KYC</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {members.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.member_number}</TableCell>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.phone}</TableCell>
                <TableCell className="text-sm">{m.active_deposits ?? 0} · ₹{Number(m.total_deposit_balance||0).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-sm">{m.active_loans ?? 0} · ₹{Number(m.total_loan_outstanding||0).toLocaleString("en-IN")}</TableCell>
                <TableCell><Badge variant={KYC_BADGE[m.kyc_status] ?? "secondary"}>{m.kyc_status}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditM({ ...m })}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/api/nidhi/members/${m.id}/passbook-pdf`, "_blank")}>
                    <Download className="w-3 h-3 mr-1" />Passbook
                  </Button>
                </div></TableCell>
              </TableRow>
            ))}
            {!members.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No members found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
      {open && <MemberForm data={form} onChg={(k:string,v:string)=>setForm((p:any)=>({...p,[k]:v}))} title="Add New Member" onSave={(d:any)=>createMut.mutate(d)} onCancel={()=>setOpen(false)} />}
      {editM && <MemberForm data={editM} onChg={(k:string,v:string)=>setEditM((p:any)=>({...p,[k]:v}))} title="Edit Member" onSave={(d:any)=>updateMut.mutate(d)} onCancel={()=>setEditM(null)} />}
    </div>
  );
}
