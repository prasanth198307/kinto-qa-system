import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Phone, MessageSquare } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  account_id?: number;
  job_title?: string;
  source?: string;
  last_contacted?: string;
  tags?: string;
}

interface Activity {
  id: number;
  activity_type: string;
  notes?: string;
  activity_date: string;
  status: string;
}

const EMPTY_CONTACT: Partial<Contact> = { name: "", email: "", phone: "", job_title: "", source: "", tags: "" };
const EMPTY_ACTIVITY = { activity_type: "call", notes: "", next_follow_up: "" };

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [contactDialog, setContactDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [editContact, setEditContact] = useState<Partial<Contact>>(EMPTY_CONTACT);
  const [newActivity, setNewActivity] = useState(EMPTY_ACTIVITY);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["crm-contacts"],
    queryFn: () => api("GET", "/api/crm/contacts"),
  });

  const { data: accounts = [] } = useQuery<{ id: number; account_name: string }[]>({
    queryKey: ["crm-accounts-list"],
    queryFn: () => api("GET", "/api/crm/accounts"),
  });

  const { data: history = [] } = useQuery<Activity[]>({
    queryKey: ["crm-contact-activities", selectedContact?.id],
    queryFn: () => api("GET", `/api/crm/activities?contact_id=${selectedContact?.id}`),
    enabled: !!selectedContact && historyDialog,
  });

  const saveMutation = useMutation({
    mutationFn: (c: Partial<Contact>) =>
      c.id ? api("PUT", `/api/crm/contacts/${c.id}`, c) : api("POST", "/api/crm/contacts", c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-contacts"] }); setContactDialog(false); },
  });

  const logMutation = useMutation({
    mutationFn: (a: typeof EMPTY_ACTIVITY & { contact_id: number }) =>
      api("POST", "/api/crm/activities", a),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-contact-activities"] }); setActivityDialog(false); setNewActivity(EMPTY_ACTIVITY); },
  });

  const companies = [...new Set(contacts.map((c) => c.company).filter(Boolean))] as string[];

  const filtered = contacts.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchCompany = companyFilter === "all" || c.company === companyFilter;
    return matchSearch && matchCompany;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => { setEditContact(EMPTY_CONTACT); setContactDialog(true); }}>
          <Plus size={16} className="mr-1" /> Add Contact
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <Input placeholder="Search name, email, phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Contacted</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No contacts found</TableCell></TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell className="text-sm">{c.phone}</TableCell>
                  <TableCell className="text-sm">{c.company}</TableCell>
                  <TableCell className="text-sm">{c.job_title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.source || "—"}</Badge></TableCell>
                  <TableCell className="text-sm">{c.last_contacted ? new Date(c.last_contacted).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    {c.tags?.split(",").filter(Boolean).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs mr-1">{t.trim()}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditContact(c); setContactDialog(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedContact(c); setActivityDialog(true); }}>
                        <Phone size={12} className="mr-1" /> Log
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedContact(c); setHistoryDialog(true); }}>
                        <MessageSquare size={12} className="mr-1" /> History
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editContact.id ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["name", "email", "phone", "job_title", "source", "tags"] as const).map((f) => (
              <div key={f}>
                <label className="text-xs font-medium capitalize">{f.replace("_", " ")}</label>
                <Input value={(editContact as any)[f] || ""} onChange={(e) => setEditContact({ ...editContact, [f]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium">Company</label>
              <Select value={String(editContact.account_id || "")} onValueChange={(v) => setEditContact({ ...editContact, account_id: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(editContact)} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityDialog} onOpenChange={setActivityDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity — {selectedContact?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Type</label>
              <Select value={newActivity.activity_type} onValueChange={(v) => setNewActivity({ ...newActivity, activity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["call", "email", "meeting"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <textarea className="w-full border rounded p-2 text-sm min-h-[80px]" value={newActivity.notes} onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium">Next Follow-up Date</label>
              <Input type="date" value={newActivity.next_follow_up} onChange={(e) => setNewActivity({ ...newActivity, next_follow_up: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialog(false)}>Cancel</Button>
            <Button onClick={() => logMutation.mutate({ ...newActivity, contact_id: selectedContact!.id })} disabled={logMutation.isPending}>Log Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Activity History — {selectedContact?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No activities found</p>}
            {history.map((a) => (
              <div key={a.id} className="border rounded p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{a.activity_type}</Badge>
                  <span className="text-xs text-gray-400">{new Date(a.activity_date).toLocaleDateString()}</span>
                  <Badge variant={a.status === "completed" ? "default" : "secondary"} className="text-xs ml-auto">{a.status}</Badge>
                </div>
                {a.notes && <p className="text-gray-600 text-xs">{a.notes}</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
