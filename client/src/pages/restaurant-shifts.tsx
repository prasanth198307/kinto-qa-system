import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

function elapsed(since: string) {
  const ms = Date.now() - new Date(since).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// ── Z-Report Action Buttons ───────────────────────────────────────────────────
function ZReportActions({ shift, onDone }: { shift: any; onDone: () => void }) {
  const { toast } = useToast();
  const [journalModal, setJournalModal] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [journal, setJournal] = useState<any>(null);
  const [cashForm, setCashForm] = useState({ opening_cash: "", closing_cash: "", actual_cash: "" });
  const [closeForm, setCloseForm] = useState({ closing_notes: "", tips_collected: "" });

  const postJournal = async () => {
    const res = await api("POST", `/api/restaurant/shifts/${shift.id}/post-journal`, {});
    if (res.error) { toast({ title: res.error, variant: "destructive" }); return; }
    toast({ title: "Journal entry posted successfully" });
    const je = await api("GET", `/api/restaurant/shifts/${shift.id}/journal`);
    setJournal(je);
    setJournalModal(true);
    onDone();
  };

  const openJournal = async () => {
    const je = await api("GET", `/api/restaurant/shifts/${shift.id}/journal`);
    setJournal(je);
    setJournalModal(true);
  };

  const postCash = async () => {
    const res = await api("POST", `/api/restaurant/shifts/${shift.id}/post-cash-settlement`, cashForm);
    if (res.error) { toast({ title: res.error, variant: "destructive" }); return; }
    toast({ title: res.message || "Cash settlement saved" });
    setCashModal(false);
    onDone();
  };

  const closeShiftHR = async () => {
    const res = await api("POST", `/api/restaurant/shifts/${shift.id}/close`, closeForm);
    if (res.error) { toast({ title: res.error, variant: "destructive" }); return; }
    toast({ title: `Shift closed — ${res.hours_worked}h recorded in HR attendance` });
    setCloseModal(false);
    onDone();
  };

  const alreadyPosted = !!shift.journal_entry_id;

  return (
    <>
      <div className="flex gap-1 flex-wrap">
        {alreadyPosted ? (
          <Button size="sm" variant="outline" className="text-green-700 border-green-400" onClick={openJournal}>
            ✓ Journal
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={postJournal}>Post Journal</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setCashModal(true)}>Cash Settlement</Button>
        {shift.status !== "closed" && (
          <Button size="sm" variant="outline" className="text-red-600 border-red-400" onClick={() => setCloseModal(true)}>Close Shift</Button>
        )}
      </div>

      {/* Journal Modal */}
      <Dialog open={journalModal} onOpenChange={setJournalModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Journal Entry — Shift {shift.id}</DialogTitle></DialogHeader>
          {journal ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>Ref: {journal.reference_no}</span>
                <span>Date: {journal.entry_date}</span>
                <span className="col-span-2">Narration: {journal.narration}</span>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(journal.lines || []).filter((l: any) => l.account).map((l: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{l.account}</TableCell>
                      <TableCell>{l.debit > 0 ? fmt(l.debit) : "—"}</TableCell>
                      <TableCell>{l.credit > 0 ? fmt(l.credit) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <p className="text-gray-400 text-center py-4">No journal entry found</p>}
        </DialogContent>
      </Dialog>

      {/* Cash Settlement Modal */}
      <Dialog open={cashModal} onOpenChange={setCashModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cash Settlement — Shift {shift.id}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["opening_cash","closing_cash","actual_cash"] as const).map(k => (
              <div key={k}>
                <Label>{k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</Label>
                <Input type="number" value={cashForm[k]} onChange={e => setCashForm(f => ({...f,[k]:e.target.value}))} placeholder="0.00" />
              </div>
            ))}
            {cashForm.closing_cash && cashForm.actual_cash && (
              <p className={`text-sm font-medium ${Number(cashForm.actual_cash)-Number(cashForm.closing_cash) >= 0 ? "text-green-700":"text-red-700"}`}>
                Variance: {fmt(Number(cashForm.actual_cash)-Number(cashForm.closing_cash))}
              </p>
            )}
            <Button className="w-full" onClick={postCash}>Save Settlement</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal */}
      <Dialog open={closeModal} onOpenChange={setCloseModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Close Shift {shift.id} (HR Integration)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tips Collected</Label>
              <Input type="number" value={closeForm.tips_collected} onChange={e => setCloseForm(f => ({...f,tips_collected:e.target.value}))} placeholder="0.00" />
            </div>
            <div>
              <Label>Closing Notes</Label>
              <Textarea value={closeForm.closing_notes} onChange={e => setCloseForm(f => ({...f,closing_notes:e.target.value}))} rows={3} />
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={closeShiftHR}>Close & Record Attendance</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function RestaurantShiftsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [openForm, setOpenForm] = useState({ shift_name: "Morning Shift", cashier_name: "", terminal_id: "", outlet_id: "", opening_cash: "" });
  const [denomCounts, setDenomCounts] = useState<Record<number, string>>({});
  const [closeDenomCounts, setCloseDenomCounts] = useState<Record<number, string>>({});
  const [useCloseDenom, setUseCloseDenom] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [summaryShift, setSummaryShift] = useState<any>(null);

  const { data: activeShift, isLoading: loadingActive } = useQuery({
    queryKey: ["/api/restaurant/shifts/active"],
    queryFn: () => api("GET", "/api/restaurant/shifts/active"),
    refetchInterval: 30000,
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ["/api/restaurant/shifts"],
    queryFn: () => api("GET", "/api/restaurant/shifts"),
  });

  const { data: terminals = [] } = useQuery({
    queryKey: ["/api/restaurant/terminals"],
    queryFn: () => api("GET", "/api/restaurant/terminals"),
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts"] });
    qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts/active"] });
  };

  const openShiftMut = useMutation({
    mutationFn: (data: any) => api("POST", "/api/restaurant/shifts/open", data),
    onSuccess: () => { toast({ title: "Shift opened successfully" }); invalidate(); },
    onError: () => toast({ title: "Error opening shift", variant: "destructive" }),
  });

  const closeShiftMut = useMutation({
    mutationFn: ({ id, closing_cash }: any) => api("PUT", `/api/restaurant/shifts/${id}/close`, { closing_cash }),
    onSuccess: async (_, vars) => {
      toast({ title: "Shift closed" });
      const summary = await api("GET", `/api/restaurant/shifts/${vars.id}/summary`);
      setSummaryShift(summary);
      invalidate();
    },
    onError: () => toast({ title: "Error closing shift", variant: "destructive" }),
  });

  const openingCashFromDenom = DENOMS.reduce((sum, d) => sum + d * (parseInt(denomCounts[d] || "0") || 0), 0);
  const closingCashFromDenom = DENOMS.reduce((sum, d) => sum + d * (parseInt(closeDenomCounts[d] || "0") || 0), 0);
  const effectiveClosingCash = useCloseDenom ? closingCashFromDenom : parseFloat(closingCash || "0");
  const variance = activeShift?.id
    ? effectiveClosingCash - (activeShift.opening_cash || 0) - (activeShift.expected_cash || 0)
    : 0;

  const handleOpenShift = () => {
    const data = {
      ...openForm,
      opening_cash: openForm.opening_cash ? parseFloat(openForm.opening_cash) : openingCashFromDenom,
    };
    if (!data.cashier_name) return toast({ title: "Cashier name is required", variant: "destructive" });
    if (!data.opening_cash && openingCashFromDenom === 0) return toast({ title: "Opening cash is required", variant: "destructive" });
    openShiftMut.mutate(data);
  };

  const handleCloseShift = () => {
    if (!activeShift?.id) return;
    closeShiftMut.mutate({ id: activeShift.id, closing_cash: effectiveClosingCash });
  };

  const isShiftOpen = activeShift && activeShift.id && activeShift.status !== "closed";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Shift Management</h1>

      {/* Active Shift Banner */}
      {isShiftOpen ? (
        <Card className="border-2 border-green-400 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse inline-block" />
              Active Shift: {activeShift.shift_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">Cashier</span><p className="font-semibold">{activeShift.cashier_name}</p></div>
              <div><span className="text-gray-500">Terminal</span><p className="font-semibold">{activeShift.terminal_name || activeShift.terminal_id || "—"}</p></div>
              <div><span className="text-gray-500">Outlet</span><p className="font-semibold">{activeShift.outlet_name || activeShift.outlet_id || "—"}</p></div>
              <div><span className="text-gray-500">Time Elapsed</span><p className="font-semibold">{activeShift.opened_at ? elapsed(activeShift.opened_at) : "—"}</p></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Opening Cash</p><p className="text-xl font-bold text-green-700">{fmt(activeShift.opening_cash)}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">System Cash (KOTs)</p><p className="text-xl font-bold text-blue-700">{fmt(activeShift.expected_cash)}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Total Sales</p><p className="text-xl font-bold">{fmt(activeShift.total_sales)}</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-6 gap-3 text-center">
              {[
                { label: "Orders", value: activeShift.total_orders || 0 },
                { label: "Covers", value: activeShift.total_covers || 0 },
                { label: "Voids", value: activeShift.void_count || 0 },
                { label: "Discounts", value: fmt(activeShift.total_discounts) },
                { label: "Complimentary", value: fmt(activeShift.complimentary_amount) },
                { label: "Avg Bill", value: fmt(activeShift.avg_bill) },
              ].map(s => (
                <div key={s.label} className="bg-white rounded p-2 border">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="font-bold text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Close Shift */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold">Close Shift</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={useCloseDenom} onChange={e => setUseCloseDenom(e.target.checked)} />
                Use denomination counter
              </label>

              {useCloseDenom ? (
                <div className="grid grid-cols-5 gap-2">
                  {DENOMS.map(d => (
                    <div key={d} className="flex items-center gap-1">
                      <span className="text-xs w-10">₹{d}</span>
                      <Input type="number" min={0} placeholder="0" className="w-14 text-xs"
                        value={closeDenomCounts[d] || ""}
                        onChange={e => setCloseDenomCounts(p => ({ ...p, [d]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="col-span-5 text-sm font-medium">Total: {fmt(closingCashFromDenom)}</div>
                </div>
              ) : (
                <Input type="number" placeholder="Closing cash amount" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="w-48" />
              )}

              <div className={`text-sm font-medium ${variance >= 0 ? "text-green-700" : "text-red-700"}`}>
                Cash Variance: {variance >= 0 ? "+" : ""}{fmt(variance)}
              </div>
              <Button onClick={handleCloseShift} disabled={closeShiftMut.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                {closeShiftMut.isPending ? "Closing..." : "Close Shift"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Open Shift Form */
        <Card className="max-w-2xl mx-auto border-2 border-dashed border-gray-300">
          <CardHeader><CardTitle>Open New Shift</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Shift Name</label>
                <Input value={openForm.shift_name} onChange={e => setOpenForm(f => ({ ...f, shift_name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Cashier Name *</label>
                <Input value={openForm.cashier_name} onChange={e => setOpenForm(f => ({ ...f, cashier_name: e.target.value }))} placeholder="Cashier name" /></div>
              <div><label className="text-sm font-medium">Terminal</label>
                <Select value={openForm.terminal_id} onValueChange={v => setOpenForm(f => ({ ...f, terminal_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select terminal" /></SelectTrigger>
                  <SelectContent>{terminals.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.terminal_name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="text-sm font-medium">Outlet</label>
                <Select value={openForm.outlet_id} onValueChange={v => setOpenForm(f => ({ ...f, outlet_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div>
              <label className="text-sm font-medium">Opening Cash</label>
              <Input type="number" placeholder="Enter amount or use denomination grid" value={openForm.opening_cash}
                onChange={e => setOpenForm(f => ({ ...f, opening_cash: e.target.value }))} className="mb-2" />
              <p className="text-xs text-gray-500 mb-2">— or count denominations —</p>
              <div className="grid grid-cols-5 gap-2">
                {DENOMS.map(d => (
                  <div key={d} className="flex items-center gap-1">
                    <span className="text-xs w-10">₹{d}</span>
                    <Input type="number" min={0} placeholder="0" className="w-14 text-xs"
                      value={denomCounts[d] || ""}
                      onChange={e => setDenomCounts(p => ({ ...p, [d]: e.target.value }))} />
                  </div>
                ))}
                <div className="col-span-5 text-sm font-medium">Denomination Total: {fmt(openingCashFromDenom)}</div>
              </div>
            </div>
            <Button onClick={handleOpenShift} disabled={openShiftMut.isPending} className="w-full">
              {openShiftMut.isPending ? "Opening..." : "Open Shift"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Modal */}
      {summaryShift && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex justify-between">Shift Summary<Button variant="ghost" onClick={() => setSummaryShift(null)}>✕</Button></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {Object.entries(summaryShift).map(([k, v]: any) => (
                <div key={k}><span className="text-gray-400">{k.replace(/_/g, " ")}</span><p className="font-semibold">{typeof v === "number" ? (k.includes("cash") || k.includes("sales") || k.includes("amount") ? fmt(v) : v) : String(v ?? "—")}</p></div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift History */}
      <Card>
        <CardHeader><CardTitle>Shift History</CardTitle></CardHeader>
        <CardContent>
          {loadingShifts ? <p className="text-gray-400 text-center py-4">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-gray-400">No shifts found</TableCell></TableRow>
                ) : shifts.map((s: any) => {
                  const v = (s.closing_cash || 0) - (s.opening_cash || 0) - (s.expected_cash || 0);
                  const dur = s.opened_at && s.closed_at
                    ? Math.round((new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000)
                    : null;
                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium cursor-pointer" onClick={() => setSummaryShift(s)}>{s.shift_name}</TableCell>
                      <TableCell>{s.opened_at?.split("T")[0]}</TableCell>
                      <TableCell>{s.cashier_name}</TableCell>
                      <TableCell>{s.terminal_name || "—"}</TableCell>
                      <TableCell>{fmt(s.opening_cash)}</TableCell>
                      <TableCell>{s.closing_cash != null ? fmt(s.closing_cash) : "—"}</TableCell>
                      <TableCell className={v >= 0 ? "text-green-600" : "text-red-600"}>{s.closing_cash != null ? (v >= 0 ? "+" : "") + fmt(v) : "—"}</TableCell>
                      <TableCell>{fmt(s.total_sales)}</TableCell>
                      <TableCell>{s.total_orders || 0}</TableCell>
                      <TableCell><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status || "closed"}</Badge></TableCell>
                      <TableCell>{dur != null ? `${Math.floor(dur / 60)}h ${dur % 60}m` : "—"}</TableCell>
                      <TableCell><ZReportActions shift={s} onDone={invalidate} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
