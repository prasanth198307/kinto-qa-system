import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Search, FileText } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

interface Donor {
  id: number;
  name: string;
  email: string;
  phone: string;
  pan: string;
  total_donated: number;
  donation_count: number;
}

interface Donation {
  id: number;
  donor_id: number;
  donor_name?: string;
  amount: number;
  payment_mode: string;
  donation_date: string;
  purpose: string;
  fund: string;
}

interface CSRProject {
  id: number;
  name: string;
  client_company: string;
  allocated_budget: number;
  spent: number;
  status: string;
  start_date: string;
  end_date: string;
}

const PAYMENT_MODES = ["Cash", "Cheque", "NEFT", "RTGS", "UPI", "DD"];

export default function DonorAdminPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [donorSearch, setDonorSearch] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showCSRForm, setShowCSRForm] = useState(false);
  const [selected80GIds, setSelected80GIds] = useState<number[]>([]);

  const [donationForm, setDonationForm] = useState({
    donor_id: "", amount: "", payment_mode: "NEFT",
    donation_date: new Date().toISOString().slice(0, 10), purpose: "", fund: "General",
  });

  const [csrForm, setCSRForm] = useState({
    name: "", client_company: "", allocated_budget: "", start_date: "", end_date: "",
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: ["/api/ngo/donors", donorSearch],
    queryFn: () => api("GET", `/api/ngo/donors?search=${donorSearch}`),
  });

  const { data: donorDonations = [] } = useQuery<Donation[]>({
    queryKey: ["/api/ngo/donations", selectedDonor?.id],
    queryFn: () => api("GET", `/api/ngo/donations?donor_id=${selectedDonor!.id}`),
    enabled: !!selectedDonor,
  });

  const { data: csrProjects = [] } = useQuery<CSRProject[]>({
    queryKey: ["/api/ngo/csr/projects"],
    queryFn: () => api("GET", "/api/ngo/csr/projects"),
  });

  const addDonationMut = useMutation({
    mutationFn: (data: typeof donationForm) => api("POST", "/api/ngo/donations", data),
    onSuccess: () => {
      toast({ title: "Donation recorded" });
      qc.invalidateQueries({ queryKey: ["/api/ngo/donors"] });
      setShowDonationForm(false);
    },
    onError: () => toast({ title: "Failed to record donation", variant: "destructive" }),
  });

  const generate80GMut = useMutation({
    mutationFn: (ids: number[]) => api("POST", "/api/ngo/donations/80g/bulk-pdf", { donation_ids: ids }),
    onSuccess: () => toast({ title: "80G certificates generated" }),
    onError: () => toast({ title: "Failed to generate certificates", variant: "destructive" }),
  });

  const addCSRMut = useMutation({
    mutationFn: (data: typeof csrForm) => api("POST", "/api/ngo/csr/projects", data),
    onSuccess: () => {
      toast({ title: "CSR Project added" });
      qc.invalidateQueries({ queryKey: ["/api/ngo/csr/projects"] });
      setShowCSRForm(false);
    },
    onError: () => toast({ title: "Failed to add project", variant: "destructive" }),
  });

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const toggle80G = (id: number) =>
    setSelected80GIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Donor Administration</h1>
        <Button onClick={() => setShowDonationForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Donation
        </Button>
      </div>

      <Tabs defaultValue="donors">
        <TabsList>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="csr">CSR Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="donors" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search donors..."
                value={donorSearch}
                onChange={e => setDonorSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-sm">Donors</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-96 overflow-y-auto">
                  {donors.map(d => (
                    <button
                      key={d.id}
                      className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${selectedDonor?.id === d.id ? "bg-muted" : ""}`}
                      onClick={() => setSelectedDonor(d)}
                    >
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.email}</div>
                      <div className="text-xs font-semibold text-green-700 mt-1">{fmt(d.total_donated)}</div>
                    </button>
                  ))}
                  {donors.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">No donors found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              {selectedDonor ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>{selectedDonor.name}</CardTitle>
                      <div className="flex gap-2">
                        {selected80GIds.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generate80GMut.mutate(selected80GIds)}
                            disabled={generate80GMut.isPending}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Generate 80G ({selected80GIds.length})
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div><span className="text-muted-foreground">PAN:</span> {selectedDonor.pan || "—"}</div>
                        <div><span className="text-muted-foreground">Phone:</span> {selectedDonor.phone || "—"}</div>
                        <div><span className="text-muted-foreground">Total Donated:</span> <strong>{fmt(selectedDonor.total_donated)}</strong></div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">
                              <input type="checkbox" onChange={e => {
                                if (e.target.checked) setSelected80GIds(donorDonations.map(d => d.id));
                                else setSelected80GIds([]);
                              }} />
                            </TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Fund</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {donorDonations.map(d => (
                            <TableRow key={d.id}>
                              <TableCell>
                                <input type="checkbox" checked={selected80GIds.includes(d.id)} onChange={() => toggle80G(d.id)} />
                              </TableCell>
                              <TableCell>{d.donation_date}</TableCell>
                              <TableCell className="font-medium">{fmt(d.amount)}</TableCell>
                              <TableCell>{d.payment_mode}</TableCell>
                              <TableCell>{d.purpose}</TableCell>
                              <TableCell>{d.fund}</TableCell>
                            </TableRow>
                          ))}
                          {donorDonations.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No donations</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3" />
                    <p>Select a donor to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="csr" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCSRForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add CSR Project
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client Company</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {csrProjects.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.client_company}</TableCell>
                  <TableCell>{fmt(p.allocated_budget)}</TableCell>
                  <TableCell>{fmt(p.spent)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.start_date} – {p.end_date}</TableCell>
                </TableRow>
              ))}
              {csrProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">No CSR projects</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* New Donation Dialog */}
      <Dialog open={showDonationForm} onOpenChange={setShowDonationForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Donation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Donor</Label>
              <Select value={donationForm.donor_id} onValueChange={v => setDonationForm(f => ({ ...f, donor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select donor" /></SelectTrigger>
                <SelectContent>
                  {donors.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input type="number" value={donationForm.amount} onChange={e => setDonationForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Payment Mode</Label>
                <Select value={donationForm.payment_mode} onValueChange={v => setDonationForm(f => ({ ...f, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={donationForm.donation_date} onChange={e => setDonationForm(f => ({ ...f, donation_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Purpose</Label>
              <Input value={donationForm.purpose} onChange={e => setDonationForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fund</Label>
              <Input value={donationForm.fund} onChange={e => setDonationForm(f => ({ ...f, fund: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDonationForm(false)}>Cancel</Button>
            <Button onClick={() => addDonationMut.mutate(donationForm)} disabled={addDonationMut.isPending}>
              Record Donation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSR Project Dialog */}
      <Dialog open={showCSRForm} onOpenChange={setShowCSRForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add CSR Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Project Name</Label>
              <Input value={csrForm.name} onChange={e => setCSRForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Client Company</Label>
              <Input value={csrForm.client_company} onChange={e => setCSRForm(f => ({ ...f, client_company: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Allocated Budget (₹)</Label>
              <Input type="number" value={csrForm.allocated_budget} onChange={e => setCSRForm(f => ({ ...f, allocated_budget: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={csrForm.start_date} onChange={e => setCSRForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={csrForm.end_date} onChange={e => setCSRForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCSRForm(false)}>Cancel</Button>
            <Button onClick={() => addCSRMut.mutate(csrForm)} disabled={addCSRMut.isPending}>Add Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
