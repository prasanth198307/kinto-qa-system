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

const OUTLET_TYPES = ["dine_in", "cloud_kitchen", "qsr", "cafe"];
const TERMINAL_TYPES = ["pos", "kds", "kiosk"];
const PRINTER_TYPES = ["thermal", "inkjet"];
const CONN_TYPES = ["network", "usb"];
const PAPER_SIZES = ["80mm", "58mm"];

const blankOutlet = { outlet_code: "", outlet_name: "", outlet_type: "dine_in", address: "", city: "", gstin: "", phone: "", manager_name: "", service_charge_pct: "", is_service_charge_enabled: true };
const blankTerminal = { terminal_name: "", terminal_code: "", outlet_id: "", terminal_type: "pos", printer_ip: "", printer_port: "" };
const blankPrinter = { printer_name: "", printer_type: "thermal", connection_type: "network", ip_address: "", port: "", paper_size: "80mm" };

export default function RestaurantOutletsPage() {
  const [tab, setTab] = useState<"outlets" | "terminals">("outlets");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });
  const { data: terminals = [] } = useQuery({ queryKey: ["/api/restaurant/terminals"], queryFn: () => api("GET", "/api/restaurant/terminals") });
  const { data: printers = [] } = useQuery({ queryKey: ["/api/restaurant/printers"], queryFn: () => api("GET", "/api/restaurant/printers") });

  const [outletForm, setOutletForm] = useState({ ...blankOutlet });
  const [editId, setEditId] = useState<number | null>(null);
  const [terminalForm, setTerminalForm] = useState({ ...blankTerminal });
  const [printerForm, setPrinterForm] = useState({ ...blankPrinter });

  const saveOutlet = useMutation({
    mutationFn: (d: any) => editId ? api("PUT", `/api/restaurant/outlets/${editId}`, d) : api("POST", "/api/restaurant/outlets", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/outlets"] }); toast({ title: editId ? "Outlet updated" : "Outlet added" }); setOutletForm({ ...blankOutlet }); setEditId(null); },
  });
  const delOutlet = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/outlets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/outlets"] }),
  });
  const addTerminal = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/terminals", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/terminals"] }); toast({ title: "Terminal added" }); setTerminalForm({ ...blankTerminal }); },
  });
  const addPrinter = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/printers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/printers"] }); toast({ title: "Printer added" }); setPrinterForm({ ...blankPrinter }); },
  });
  const testPrint = useMutation({
    mutationFn: (id: number) => api("POST", `/api/restaurant/printers/${id}/test`),
    onSuccess: () => toast({ title: "Test print sent" }),
  });

  const startEdit = (o: any) => { setOutletForm({ outlet_code: o.outlet_code, outlet_name: o.outlet_name, outlet_type: o.outlet_type, address: o.address, city: o.city, gstin: o.gstin, phone: o.phone, manager_name: o.manager_name, service_charge_pct: o.service_charge_pct, is_service_charge_enabled: o.is_service_charge_enabled }); setEditId(o.id); };

  const OF = outletForm as any;
  const setOF = (k: string, v: any) => setOutletForm(p => ({ ...p, [k]: v }));
  const TF = terminalForm as any;
  const setTF = (k: string, v: any) => setTerminalForm(p => ({ ...p, [k]: v }));
  const PF = printerForm as any;
  const setPF = (k: string, v: any) => setPrinterForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Outlets & Terminals</h1>
      <div className="flex gap-2">
        <Button variant={tab === "outlets" ? "default" : "outline"} onClick={() => setTab("outlets")}>Outlets</Button>
        <Button variant={tab === "terminals" ? "default" : "outline"} onClick={() => setTab("terminals")}>Terminals & Printers</Button>
      </div>

      {tab === "outlets" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>{editId ? "Edit Outlet" : "Add Outlet"}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input placeholder="Outlet Code" value={OF.outlet_code} onChange={e => setOF("outlet_code", e.target.value)} />
              <Input placeholder="Outlet Name" value={OF.outlet_name} onChange={e => setOF("outlet_name", e.target.value)} />
              <Select value={OF.outlet_type} onValueChange={v => setOF("outlet_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OUTLET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Address" value={OF.address} onChange={e => setOF("address", e.target.value)} />
              <Input placeholder="City" value={OF.city} onChange={e => setOF("city", e.target.value)} />
              <Input placeholder="GSTIN" value={OF.gstin} onChange={e => setOF("gstin", e.target.value)} />
              <Input placeholder="Phone" value={OF.phone} onChange={e => setOF("phone", e.target.value)} />
              <Input placeholder="Manager Name" value={OF.manager_name} onChange={e => setOF("manager_name", e.target.value)} />
              <Input placeholder="Service Charge %" type="number" value={OF.service_charge_pct} onChange={e => setOF("service_charge_pct", e.target.value)} />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={OF.is_service_charge_enabled} onChange={e => setOF("is_service_charge_enabled", e.target.checked)} id="sc" />
                <label htmlFor="sc">Service Charge Enabled</label>
              </div>
              <Button onClick={() => saveOutlet.mutate(outletForm)}>{editId ? "Update" : "Add"} Outlet</Button>
              {editId && <Button variant="outline" onClick={() => { setEditId(null); setOutletForm({ ...blankOutlet }); }}>Cancel</Button>}
            </CardContent>
          </Card>
          <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>GSTIN</TableHead><TableHead>Phone</TableHead><TableHead>Manager</TableHead><TableHead>SC%</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{(outlets as any[]).map((o: any) => (<TableRow key={o.id}><TableCell>{o.outlet_code}</TableCell><TableCell>{o.outlet_name}</TableCell><TableCell><Badge variant="outline">{o.outlet_type}</Badge></TableCell><TableCell>{o.city}</TableCell><TableCell className="font-mono text-xs">{o.gstin}</TableCell><TableCell>{o.phone}</TableCell><TableCell>{o.manager_name}</TableCell><TableCell>{o.service_charge_pct}%</TableCell><TableCell><Badge variant={o.is_active ? "default" : "secondary"}>{o.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => startEdit(o)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => delOutlet.mutate(o.id)}>Del</Button></TableCell></TableRow>))}</TableBody>
          </Table></CardContent></Card>
        </div>
      )}

      {tab === "terminals" && (
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Add Terminal</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input placeholder="Terminal Name" value={TF.terminal_name} onChange={e => setTF("terminal_name", e.target.value)} />
              <Input placeholder="Terminal Code" value={TF.terminal_code} onChange={e => setTF("terminal_code", e.target.value)} />
              <Select value={TF.outlet_id} onValueChange={v => setTF("outlet_id", v)}><SelectTrigger><SelectValue placeholder="Select Outlet" /></SelectTrigger><SelectContent>{(outlets as any[]).map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent></Select>
              <Select value={TF.terminal_type} onValueChange={v => setTF("terminal_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TERMINAL_TYPES.map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Printer IP" value={TF.printer_ip} onChange={e => setTF("printer_ip", e.target.value)} />
              <Input placeholder="Printer Port" value={TF.printer_port} onChange={e => setTF("printer_port", e.target.value)} />
              <Button onClick={() => addTerminal.mutate(terminalForm)}>Add Terminal</Button>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Terminals</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Outlet</TableHead><TableHead>Type</TableHead><TableHead>Printer IP</TableHead><TableHead>Port</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{(terminals as any[]).map((t: any) => (<TableRow key={t.id}><TableCell>{t.terminal_name}</TableCell><TableCell>{t.terminal_code}</TableCell><TableCell>{t.outlet_name}</TableCell><TableCell><Badge variant="outline">{t.terminal_type}</Badge></TableCell><TableCell>{t.printer_ip}</TableCell><TableCell>{t.printer_port}</TableCell><TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell></TableRow>))}</TableBody>
          </Table></CardContent></Card>
          <Card><CardHeader><CardTitle>Add Printer</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input placeholder="Printer Name" value={PF.printer_name} onChange={e => setPF("printer_name", e.target.value)} />
              <Select value={PF.printer_type} onValueChange={v => setPF("printer_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRINTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Select value={PF.connection_type} onValueChange={v => setPF("connection_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="IP Address" value={PF.ip_address} onChange={e => setPF("ip_address", e.target.value)} />
              <Input placeholder="Port" value={PF.port} onChange={e => setPF("port", e.target.value)} />
              <Select value={PF.paper_size} onValueChange={v => setPF("paper_size", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAPER_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Button onClick={() => addPrinter.mutate(printerForm)}>Add Printer</Button>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Printers</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>IP</TableHead><TableHead>Port</TableHead><TableHead>Paper</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{(printers as any[]).map((p: any) => (<TableRow key={p.id}><TableCell>{p.printer_name}</TableCell><TableCell>{p.printer_type}</TableCell><TableCell>{p.ip_address}</TableCell><TableCell>{p.port}</TableCell><TableCell>{p.paper_size}</TableCell><TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => testPrint.mutate(p.id)}>Test Print</Button></TableCell></TableRow>))}</TableBody>
          </Table></CardContent></Card>
        </div>
      )}
    </div>
  );
}
