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
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const OUTLET_TYPE_COLORS: Record<string, string> = {
  dine_in: "bg-blue-100 text-blue-800",
  cloud_kitchen: "bg-purple-100 text-purple-800",
  qsr: "bg-green-100 text-green-800",
  cafe: "bg-amber-100 text-amber-800",
  fine_dining: "bg-rose-100 text-rose-800",
};
const TERMINAL_TYPE_COLORS: Record<string, string> = {
  pos: "bg-blue-100 text-blue-800",
  kds: "bg-green-100 text-green-800",
  kiosk: "bg-purple-100 text-purple-800",
  self_order: "bg-orange-100 text-orange-800",
};

const emptyOutlet = { outlet_code: "", outlet_name: "", outlet_type: "dine_in", address: "", city: "", gstin: "", phone: "", manager_name: "", service_charge_pct: "0", is_service_charge_enabled: false, is_active: true };
const emptyTerminal = { terminal_name: "", terminal_code: "", outlet_id: "", terminal_type: "pos", printer_ip: "", printer_port: "9100", printer_type: "thermal", is_active: true };
const emptyPrinter = { printer_name: "", printer_type: "thermal", connection_type: "network", ip_address: "", port: "9100", paper_size: "80mm", stations: [] as string[], print_types: [] as string[], is_active: true };

export default function RestaurantOutletsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"outlets" | "terminals" | "printers" | "central-kitchen">("outlets");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [outletForm, setOutletForm] = useState({ ...emptyOutlet });
  const [terminalForm, setTerminalForm] = useState({ ...emptyTerminal });
  const [printerForm, setPrinterForm] = useState({ ...emptyPrinter });
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrOutletId, setQrOutletId] = useState<number | null>(null);

  // Central Kitchen state
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    from_outlet_id: '', to_outlet_id: '', items: [{ item_name: '', quantity: 0, unit: 'kg' }], notes: '', dispatch_date: new Date().toISOString().split('T')[0]
  });
  const [receivedBy, setReceivedBy] = useState<Record<number, string>>({});
  const [expandedDispatch, setExpandedDispatch] = useState<number | null>(null);

  const { data: outlets = [], isLoading: loadingOutlets } = useQuery({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  const { data: terminals = [], isLoading: loadingTerminals } = useQuery({
    queryKey: ["/api/restaurant/terminals"],
    queryFn: () => api("GET", "/api/restaurant/terminals"),
    enabled: tab === "terminals",
  });

  const { data: printers = [], isLoading: loadingPrinters } = useQuery({
    queryKey: ["/api/restaurant/printers"],
    queryFn: () => api("GET", "/api/restaurant/printers"),
    enabled: tab === "printers",
  });

  const { data: dispatches = [], refetch: refetchDispatches } = useQuery({
    queryKey: ['/api/restaurant/central-kitchen/dispatches'],
    queryFn: () => api("GET", "/api/restaurant/central-kitchen/dispatches"),
    enabled: tab === "central-kitchen",
  });

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  const outletMut = useMutation({
    mutationFn: (data: any) => editId ? api("PUT", `/api/restaurant/outlets/${editId}`, data) : api("POST", "/api/restaurant/outlets", data),
    onSuccess: () => { toast({ title: editId ? "Outlet updated" : "Outlet created" }); invalidate("/api/restaurant/outlets"); resetForm(); },
    onError: () => toast({ title: "Error saving outlet", variant: "destructive" }),
  });

  const deleteOutletMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/outlets/${id}`),
    onSuccess: () => { toast({ title: "Outlet deleted" }); invalidate("/api/restaurant/outlets"); },
  });

  const terminalMut = useMutation({
    mutationFn: (data: any) => editId ? api("PUT", `/api/restaurant/terminals/${editId}`, data) : api("POST", "/api/restaurant/terminals", data),
    onSuccess: () => { toast({ title: editId ? "Terminal updated" : "Terminal created" }); invalidate("/api/restaurant/terminals"); resetForm(); },
    onError: () => toast({ title: "Error saving terminal", variant: "destructive" }),
  });

  const deleteTerminalMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/terminals/${id}`),
    onSuccess: () => { toast({ title: "Terminal deleted" }); invalidate("/api/restaurant/terminals"); },
  });

  const printerMut = useMutation({
    mutationFn: (data: any) => editId ? api("PUT", `/api/restaurant/printers/${editId}`, data) : api("POST", "/api/restaurant/printers", data),
    onSuccess: () => { toast({ title: editId ? "Printer updated" : "Printer created" }); invalidate("/api/restaurant/printers"); resetForm(); },
    onError: () => toast({ title: "Error saving printer", variant: "destructive" }),
  });

  const deletePrinterMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/printers/${id}`),
    onSuccess: () => { toast({ title: "Printer deleted" }); invalidate("/api/restaurant/printers"); },
  });

  const testPrinterMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/restaurant/printers/${id}/test`),
    onSuccess: () => toast({ title: "Test print sent successfully" }),
    onError: () => toast({ title: "Printer test failed", variant: "destructive" }),
  });

  const qrMut = useMutation({
    mutationFn: (outletId: number) => api("POST", "/api/restaurant/qr-session/create", { table_id: "main", outlet_id: outletId }),
    onSuccess: (data) => { setQrToken(data.token || data.qr_token || JSON.stringify(data)); },
    onError: () => toast({ title: "Error generating QR", variant: "destructive" }),
  });

  const createDispatchMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/restaurant/central-kitchen/dispatches", data),
    onSuccess: () => { refetchDispatches(); setShowDispatchForm(false); toast({ title: "Dispatch created" }); resetDispatchForm(); },
    onError: () => toast({ title: "Error creating dispatch", variant: "destructive" }),
  });

  const receiveDispatchMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api("PUT", `/api/restaurant/central-kitchen/dispatches/${id}/receive`, data),
    onSuccess: () => { refetchDispatches(); toast({ title: "Dispatch received" }); },
    onError: () => toast({ title: "Error receiving dispatch", variant: "destructive" }),
  });

  const resetForm = () => { setShowForm(false); setEditId(null); setOutletForm({ ...emptyOutlet }); setTerminalForm({ ...emptyTerminal }); setPrinterForm({ ...emptyPrinter }); };

  const resetDispatchForm = () => {
    setDispatchForm({ from_outlet_id: '', to_outlet_id: '', items: [{ item_name: '', quantity: 0, unit: 'kg' }], notes: '', dispatch_date: new Date().toISOString().split('T')[0] });
  };

  const startEditOutlet = (o: any) => {
    setOutletForm({ outlet_code: o.outlet_code || "", outlet_name: o.outlet_name || "", outlet_type: o.outlet_type || "dine_in", address: o.address || "", city: o.city || "", gstin: o.gstin || "", phone: o.phone || "", manager_name: o.manager_name || "", service_charge_pct: String(o.service_charge_pct || 0), is_service_charge_enabled: o.is_service_charge_enabled ?? false, is_active: o.is_active ?? true });
    setEditId(o.id); setShowForm(true);
  };

  const startEditTerminal = (t: any) => {
    setTerminalForm({ terminal_name: t.terminal_name || "", terminal_code: t.terminal_code || "", outlet_id: String(t.outlet_id || ""), terminal_type: t.terminal_type || "pos", printer_ip: t.printer_ip || "", printer_port: String(t.printer_port || 9100), printer_type: t.printer_type || "thermal", is_active: t.is_active ?? true });
    setEditId(t.id); setShowForm(true);
  };

  const startEditPrinter = (p: any) => {
    setPrinterForm({ printer_name: p.printer_name || "", printer_type: p.printer_type || "thermal", connection_type: p.connection_type || "network", ip_address: p.ip_address || "", port: String(p.port || 9100), paper_size: p.paper_size || "80mm", stations: p.stations || [], print_types: p.print_types || [], is_active: p.is_active ?? true });
    setEditId(p.id); setShowForm(true);
  };

  const toggleCheckbox = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const addDispatchItem = () => {
    setDispatchForm(f => ({ ...f, items: [...f.items, { item_name: '', quantity: 0, unit: 'kg' }] }));
  };

  const updateDispatchItem = (idx: number, field: string, value: any) => {
    setDispatchForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));
  };

  const removeDispatchItem = (idx: number) => {
    setDispatchForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const activeCount = (outlets as any[]).filter((o: any) => o.is_active).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Outlets & Infrastructure</h1>
        <div className="flex gap-2">
          {(["outlets", "terminals", "printers", "central-kitchen"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => { setTab(t); resetForm(); }}>
              {t === "central-kitchen" ? "Central Kitchen" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {tab === "outlets" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Total Outlets</p><p className="text-3xl font-bold">{(outlets as any[]).length}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Active</p><p className="text-3xl font-bold text-green-600">{activeCount}</p></CardContent></Card>
          </div>

          <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Outlet</Button>

          {showForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader><CardTitle>{editId ? "Edit Outlet" : "New Outlet"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Outlet Code *</label><Input value={outletForm.outlet_code} onChange={e => setOutletForm(f => ({ ...f, outlet_code: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Outlet Name *</label><Input value={outletForm.outlet_name} onChange={e => setOutletForm(f => ({ ...f, outlet_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Type</label>
                    <Select value={outletForm.outlet_type} onValueChange={v => setOutletForm(f => ({ ...f, outlet_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["dine_in", "cloud_kitchen", "qsr", "cafe", "fine_dining"].map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select></div>
                  <div><label className="text-sm font-medium">City</label><Input value={outletForm.city} onChange={e => setOutletForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Phone</label><Input value={outletForm.phone} onChange={e => setOutletForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Manager</label><Input value={outletForm.manager_name} onChange={e => setOutletForm(f => ({ ...f, manager_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">GSTIN (15 chars)</label><Input value={outletForm.gstin} maxLength={15} onChange={e => setOutletForm(f => ({ ...f, gstin: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Service Charge %</label><Input type="number" min={0} max={20} value={outletForm.service_charge_pct} onChange={e => setOutletForm(f => ({ ...f, service_charge_pct: e.target.value }))} /></div>
                  <div className="col-span-2"><label className="text-sm font-medium">Address</label><textarea className="w-full border rounded p-2 text-sm" rows={2} value={outletForm.address} onChange={e => setOutletForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div className="flex items-center gap-4 col-span-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={outletForm.is_service_charge_enabled} onChange={e => setOutletForm(f => ({ ...f, is_service_charge_enabled: e.target.checked }))} /> Service charge enabled</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={outletForm.is_active} onChange={e => setOutletForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => {
                    if (!outletForm.outlet_code || !outletForm.outlet_name) return toast({ title: "Code and Name required", variant: "destructive" });
                    if (outletForm.gstin && outletForm.gstin.length !== 15) return toast({ title: "GSTIN must be 15 characters", variant: "destructive" });
                    outletMut.mutate({ ...outletForm, service_charge_pct: parseFloat(outletForm.service_charge_pct) });
                  }} disabled={outletMut.isPending}>{outletMut.isPending ? "Saving..." : editId ? "Update" : "Create"}</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {qrToken && (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-1">QR Token for Outlet #{qrOutletId}</p>
                <code className="bg-white px-3 py-2 rounded border text-sm block break-all">{qrToken}</code>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setQrToken(null)}>Dismiss</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>GSTIN</TableHead><TableHead>Phone</TableHead><TableHead>Manager</TableHead><TableHead>SC%</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loadingOutlets ? <TableRow><TableCell colSpan={10} className="text-center">Loading...</TableCell></TableRow>
                    : (outlets as any[]).length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-gray-400">No outlets</TableCell></TableRow>
                    : (outlets as any[]).map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">{o.outlet_code}</TableCell>
                        <TableCell className="font-medium">{o.outlet_name}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs ${OUTLET_TYPE_COLORS[o.outlet_type] || "bg-gray-100"}`}>{o.outlet_type?.replace("_", " ")}</span></TableCell>
                        <TableCell>{o.city || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{o.gstin || "—"}</TableCell>
                        <TableCell>{o.phone || "—"}</TableCell>
                        <TableCell>{o.manager_name || "—"}</TableCell>
                        <TableCell>{o.service_charge_pct || 0}%</TableCell>
                        <TableCell><Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEditOutlet(o)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => { setQrOutletId(o.id); qrMut.mutate(o.id); }}>QR</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Delete this outlet?")) deleteOutletMut.mutate(o.id); }}>Del</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "terminals" && (
        <>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Terminal</Button>
          {showForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader><CardTitle>{editId ? "Edit Terminal" : "New Terminal"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Terminal Name *</label><Input value={terminalForm.terminal_name} onChange={e => setTerminalForm(f => ({ ...f, terminal_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Terminal Code</label><Input value={terminalForm.terminal_code} onChange={e => setTerminalForm(f => ({ ...f, terminal_code: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Outlet</label>
                    <Select value={terminalForm.outlet_id} onValueChange={v => setTerminalForm(f => ({ ...f, outlet_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                      <SelectContent>{(outlets as any[]).map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><label className="text-sm font-medium">Type</label>
                    <Select value={terminalForm.terminal_type} onValueChange={v => setTerminalForm(f => ({ ...f, terminal_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["pos", "kds", "kiosk", "self_order"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><label className="text-sm font-medium">Printer IP</label><Input value={terminalForm.printer_ip} onChange={e => setTerminalForm(f => ({ ...f, printer_ip: e.target.value }))} placeholder="192.168.1.100" /></div>
                  <div><label className="text-sm font-medium">Printer Port</label><Input type="number" value={terminalForm.printer_port} onChange={e => setTerminalForm(f => ({ ...f, printer_port: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Printer Type</label>
                    <Select value={terminalForm.printer_type} onValueChange={v => setTerminalForm(f => ({ ...f, printer_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["thermal", "inkjet", "laser"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={terminalForm.is_active} onChange={e => setTerminalForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => terminalMut.mutate({ ...terminalForm, printer_port: parseInt(terminalForm.printer_port) })} disabled={!terminalForm.terminal_name || terminalMut.isPending}>{terminalMut.isPending ? "Saving..." : editId ? "Update" : "Create"}</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Outlet</TableHead><TableHead>Type</TableHead><TableHead>Printer</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loadingTerminals ? <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
                    : (terminals as any[]).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-gray-400">No terminals</TableCell></TableRow>
                    : (terminals as any[]).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.terminal_name}</TableCell>
                        <TableCell className="font-mono text-sm">{t.terminal_code || "—"}</TableCell>
                        <TableCell>{t.outlet_name || t.outlet_id || "—"}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs ${TERMINAL_TYPE_COLORS[t.terminal_type] || "bg-gray-100"}`}>{t.terminal_type?.toUpperCase()}</span></TableCell>
                        <TableCell className="font-mono text-xs">{t.printer_ip ? `${t.printer_ip}:${t.printer_port}` : "—"}</TableCell>
                        <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEditTerminal(t)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Delete terminal?")) deleteTerminalMut.mutate(t.id); }}>Del</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "printers" && (
        <>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Printer</Button>
          {showForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader><CardTitle>{editId ? "Edit Printer" : "New Printer"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Printer Name *</label><Input value={printerForm.printer_name} onChange={e => setPrinterForm(f => ({ ...f, printer_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Printer Type</label>
                    <Select value={printerForm.printer_type} onValueChange={v => setPrinterForm(f => ({ ...f, printer_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["thermal", "inkjet", "laser"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><label className="text-sm font-medium">Connection</label>
                    <Select value={printerForm.connection_type} onValueChange={v => setPrinterForm(f => ({ ...f, connection_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["network", "usb", "bluetooth"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  {printerForm.connection_type === "network" && <>
                    <div><label className="text-sm font-medium">IP Address</label><Input value={printerForm.ip_address} onChange={e => setPrinterForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.x" /></div>
                    <div><label className="text-sm font-medium">Port</label><Input type="number" value={printerForm.port} onChange={e => setPrinterForm(f => ({ ...f, port: e.target.value }))} /></div>
                  </>}
                  <div><label className="text-sm font-medium">Paper Size</label>
                    <Select value={printerForm.paper_size} onValueChange={v => setPrinterForm(f => ({ ...f, paper_size: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["80mm", "58mm", "A4"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium block mb-1">Stations</label>
                    <div className="flex gap-4">{["kot", "bill", "receipt"].map(s => (<label key={s} className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={printerForm.stations.includes(s)} onChange={() => setPrinterForm(f => ({ ...f, stations: toggleCheckbox(f.stations, s) }))} />{s.toUpperCase()}</label>))}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium block mb-1">Print Types</label>
                    <div className="flex gap-4">{["kot", "bill", "report"].map(s => (<label key={s} className="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" checked={printerForm.print_types.includes(s)} onChange={() => setPrinterForm(f => ({ ...f, print_types: toggleCheckbox(f.print_types, s) }))} />{s.toUpperCase()}</label>))}</div>
                  </div>
                  <div><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={printerForm.is_active} onChange={e => setPrinterForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => printerMut.mutate({ ...printerForm, port: parseInt(printerForm.port) })} disabled={!printerForm.printer_name || printerMut.isPending}>{printerMut.isPending ? "Saving..." : editId ? "Update" : "Create"}</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Connection</TableHead><TableHead>IP</TableHead><TableHead>Port</TableHead><TableHead>Paper</TableHead><TableHead>Stations</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loadingPrinters ? <TableRow><TableCell colSpan={9} className="text-center">Loading...</TableCell></TableRow>
                    : (printers as any[]).length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-gray-400">No printers</TableCell></TableRow>
                    : (printers as any[]).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.printer_name}</TableCell>
                        <TableCell>{p.printer_type}</TableCell>
                        <TableCell>{p.connection_type}</TableCell>
                        <TableCell className="font-mono text-xs">{p.ip_address || "—"}</TableCell>
                        <TableCell>{p.port || "—"}</TableCell>
                        <TableCell>{p.paper_size}</TableCell>
                        <TableCell>{Array.isArray(p.stations) ? p.stations.join(", ") : "—"}</TableCell>
                        <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-blue-600 text-xs" onClick={() => testPrinterMut.mutate(p.id)}>Test</Button>
                            <Button size="sm" variant="ghost" onClick={() => startEditPrinter(p)}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Delete printer?")) deletePrinterMut.mutate(p.id); }}>Del</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "central-kitchen" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Central Kitchen Dispatches</h2>
            <Button onClick={() => setShowDispatchForm(true)}>+ New Dispatch</Button>
          </div>

          {/* Dispatch list */}
          <div className="space-y-3">
            {(dispatches as any[]).length === 0 ? (
              <p className="text-center text-gray-400 py-8">No dispatches yet</p>
            ) : (dispatches as any[]).map((d: any) => {
              const items = Array.isArray(d.items_json) ? d.items_json : (typeof d.items_json === 'string' ? JSON.parse(d.items_json || '[]') : []);
              return (
                <Card key={d.id} className={d.status === 'received' ? 'border-green-200' : 'border-blue-200'}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{d.dispatch_number || `#${d.id}`}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>{d.from_outlet_name || d.from_outlet_id}</span>
                          <span className="mx-2">→</span>
                          <span>{d.to_outlet_name || d.to_outlet_id}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString() : '—'} · {items.length} item(s)
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        {d.status === 'dispatched' && (
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Received by"
                              className="w-32 h-8 text-sm"
                              value={receivedBy[d.id] || ''}
                              onChange={e => setReceivedBy(prev => ({ ...prev, [d.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => {
                              receiveDispatchMutation.mutate({ id: d.id, received_by: receivedBy[d.id] || '' });
                            }}>Mark Received</Button>
                          </div>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setExpandedDispatch(expandedDispatch === d.id ? null : d.id)}>
                          {expandedDispatch === d.id ? '▲' : '▼'}
                        </Button>
                      </div>
                    </div>
                    {expandedDispatch === d.id && items.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Items</p>
                        <div className="space-y-1">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-4 text-sm">
                              <span className="font-medium">{item.item_name}</span>
                              <span className="text-gray-500">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                        {d.notes && <p className="text-xs text-gray-400 mt-2">Notes: {d.notes}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* New Dispatch Form */}
          {showDispatchForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader><CardTitle>New Dispatch</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From Outlet</label>
                    <Select value={dispatchForm.from_outlet_id} onValueChange={v => setDispatchForm(f => ({ ...f, from_outlet_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                      <SelectContent>{(outlets as any[]).map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Outlet</label>
                    <Select value={dispatchForm.to_outlet_id} onValueChange={v => setDispatchForm(f => ({ ...f, to_outlet_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                      <SelectContent>{(outlets as any[]).map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Dispatch Date</label>
                    <Input type="date" value={dispatchForm.dispatch_date} onChange={e => setDispatchForm(f => ({ ...f, dispatch_date: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Items</label>
                    <Button size="sm" variant="outline" onClick={addDispatchItem}>+ Add Item</Button>
                  </div>
                  <div className="space-y-2">
                    {dispatchForm.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input placeholder="Item name" value={item.item_name} onChange={e => updateDispatchItem(idx, 'item_name', e.target.value)} className="flex-1" />
                        <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => updateDispatchItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-24" />
                        <Select value={item.unit} onValueChange={v => updateDispatchItem(idx, 'unit', v)}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{["kg", "g", "L", "ml", "pcs"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                        {dispatchForm.items.length > 1 && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeDispatchItem(idx)}>✕</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea className="w-full border rounded p-2 text-sm mt-1" rows={2} value={dispatchForm.notes} onChange={e => setDispatchForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this dispatch..." />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => {
                    createDispatchMutation.mutate({
                      from_outlet_id: dispatchForm.from_outlet_id,
                      to_outlet_id: dispatchForm.to_outlet_id,
                      items_json: dispatchForm.items,
                      notes: dispatchForm.notes,
                      dispatch_date: dispatchForm.dispatch_date,
                      status: 'dispatched'
                    });
                  }} disabled={!dispatchForm.from_outlet_id || !dispatchForm.to_outlet_id || createDispatchMutation.isPending}>
                    {createDispatchMutation.isPending ? "Creating..." : "Create Dispatch"}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowDispatchForm(false); resetDispatchForm(); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
