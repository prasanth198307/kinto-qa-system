import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
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


const COUNTRY_PRESETS = [
  { country: "India", tax_name: "GST", tax_rate: 5, currency: "INR", currency_symbol: "₹", flag: "🇮🇳" },
  { country: "UAE", tax_name: "VAT", tax_rate: 5, currency: "AED", currency_symbol: "د.إ", flag: "🇦🇪" },
  { country: "Saudi Arabia", tax_name: "VAT", tax_rate: 15, currency: "SAR", currency_symbol: "ر.س", flag: "🇸🇦" },
  { country: "UK", tax_name: "VAT", tax_rate: 20, currency: "GBP", currency_symbol: "£", flag: "🇬🇧" },
  { country: "USA", tax_name: "Sales Tax", tax_rate: 8, currency: "USD", currency_symbol: "$", flag: "🇺🇸" },
  { country: "Singapore", tax_name: "GST", tax_rate: 9, currency: "SGD", currency_symbol: "S$", flag: "🇸🇬" },
  { country: "Bahrain", tax_name: "VAT", tax_rate: 10, currency: "BHD", currency_symbol: "BD", flag: "🇧🇭" },
  { country: "Qatar", tax_name: "VAT", tax_rate: 5, currency: "QAR", currency_symbol: "QR", flag: "🇶🇦" },
];

function TaxCurrencyTab() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [form, setForm] = useState({ tax_number: "", tax_rate: "", invoice_prefix: "", currency: "", currency_symbol: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/restaurant/tax/countries")
      .then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      .then(data => setConfigs(Array.isArray(data) ? data : []))
      .catch(() => setConfigs(COUNTRY_PRESETS as any[]));
  }, []);

  const loadCountry = (country: string) => {
    setSelectedCountry(country);
    const existing = configs.find(c => c.country === country);
    const preset = COUNTRY_PRESETS.find(p => p.country === country);
    const data = { ...preset, ...existing };
    setForm({
      tax_number: data.tax_number || "",
      tax_rate: String(data.tax_rate || ""),
      invoice_prefix: data.invoice_prefix || "",
      currency: data.currency || "",
      currency_symbol: data.currency_symbol || "",
    });
  };

  const save = async () => {
    if (!selectedCountry) return;
    setSaving(true);
    try {
      await fetch(`/api/restaurant/tax/${encodeURIComponent(selectedCountry)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast({ title: `${selectedCountry} tax config saved!` });
      const updated = await fetch("/api/restaurant/tax/countries").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      setConfigs(Array.isArray(updated) ? updated : []);
    } catch { toast({ title: "Save failed", variant: "destructive" } as any); }
    setSaving(false);
  };

  const testCalc = async () => {
    if (!selectedCountry) return;
    setLoading(true);
    try {
      const result = await fetch("/api/restaurant/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1000, country: selectedCountry }),
      }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      toast({ title: `Tax Calculation: ${result.currency_symbol}1000 + ${result.tax_name} ${result.tax_rate}% = ${result.currency_symbol}${result.total}` });
    } catch { toast({ title: "Calculation failed", variant: "destructive" } as any); }
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Select Country / Region</h3>
          {COUNTRY_PRESETS.map(preset => {
            const saved = configs.find(c => c.country === preset.country);
            return (
              <button
                key={preset.country}
                onClick={() => loadCountry(preset.country)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${selectedCountry === preset.country ? "bg-blue-50 border-blue-400" : "bg-white border-gray-100 hover:border-gray-300"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{preset.flag}</span>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{preset.country}</div>
                    <div className="text-xs text-gray-500">{preset.tax_name} {preset.tax_rate}% · {preset.currency_symbol} {preset.currency}</div>
                  </div>
                </div>
                {saved?.tax_number && <span className="text-xs text-green-500 font-semibold">✓ Configured</span>}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {!selectedCountry ? (
            <div className="flex items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-2xl">
              <div className="text-center"><div className="text-5xl mb-3">🌍</div><p>Select a country to configure tax settings</p></div>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const preset = COUNTRY_PRESETS.find(p => p.country === selectedCountry)!;
                return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <span className="text-4xl">{preset.flag}</span>
                      <div>
                        <h3 className="font-bold text-lg">{selectedCountry}</h3>
                        <p className="text-sm text-gray-600">Configure {preset.tax_name} registration and invoice settings</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">{preset.tax_name} Registration Number</label>
                        <Input
                          placeholder={selectedCountry === "India" ? "22AAAAA0000A1Z5" : selectedCountry === "UAE" ? "100123456789003" : `Your ${preset.tax_name} number`}
                          value={form.tax_number}
                          onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {selectedCountry === "India" && "15-digit GSTIN"}
                          {selectedCountry === "UAE" && "15-digit TRN (Tax Registration Number)"}
                          {selectedCountry === "Saudi Arabia" && "15-digit TRN (ZATCA)"}
                          {(selectedCountry === "UK" || selectedCountry === "USA") && "VAT/EIN number"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">{preset.tax_name} Rate (%)</label>
                        <Input type="number" step="0.1" value={form.tax_rate || preset.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">Currency Code</label>
                        <Input value={form.currency || preset.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">Currency Symbol</label>
                        <Input value={form.currency_symbol || preset.currency_symbol} onChange={e => setForm(f => ({ ...f, currency_symbol: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-gray-600 block mb-1 uppercase tracking-wide">Invoice Number Prefix</label>
                        <Input placeholder="e.g. INV, UAE-INV, SA-INV" value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} />
                      </div>
                    </div>

                    {selectedCountry === "Saudi Arabia" && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="font-semibold text-green-800 mb-1">🇸🇦 ZATCA Phase 2 Compliance</div>
                        <p className="text-xs text-green-700">SwachERP generates ZATCA-compliant invoices with TLV-encoded QR codes as required by Saudi Arabia's e-invoicing mandate. Enter your TRN above to enable.</p>
                        <button className="mt-2 text-xs text-green-600 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-100" onClick={() => window.open("/api/restaurant/tax/zatca/generate", "_blank")}>Test ZATCA QR Generation</button>
                      </div>
                    )}

                    {selectedCountry === "UAE" && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="font-semibold text-blue-800 mb-1">🇦🇪 UAE FTA Compliance</div>
                        <p className="text-xs text-blue-700">SwachERP generates UAE FTA-compliant VAT invoices with English and Arabic fields as required. Use the VAT Return Report under Analytics to file quarterly returns.</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={testCalc} disabled={loading} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        {loading ? "Testing..." : "Test Calculation"}
                      </button>
                      <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                        {saving ? "Saving..." : `Save ${selectedCountry} Configuration`}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FranchiseTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["/api/restaurant/franchise/summary"],
    queryFn: () => fetch("/api/restaurant/franchise/summary").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: royaltyConfig } = useQuery({
    queryKey: ["/api/restaurant/franchise/royalty-config"],
    queryFn: () => fetch("/api/restaurant/franchise/royalty-config").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data: any) => setConfig(data),
  });

  const cfg = config || royaltyConfig || { royalty_pct: 5, marketing_fee_pct: 2, min_royalty: 5000, payment_cycle: "monthly" };
  const summaryData = (summary as any) || { total_outlets: 0, total_revenue: 0, total_royalty: 0, outlets: [] };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/restaurant/franchise/royalty-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      toast({ title: "Franchise config saved!" });
    } catch { toast({ title: "Save failed", variant: "destructive" } as any); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Franchise Outlets", value: summaryData.total_outlets || 0, icon: "🏢" },
          { label: "Total Network Revenue", value: `₹${Number(summaryData.total_revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "💰" },
          { label: "Royalty Earned (month)", value: `₹${Number(summaryData.total_royalty || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "📊" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <span className="text-3xl">{s.icon}</span>
              <div><div className="text-xl font-black">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Royalty Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Royalty % (of net sales)</label>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.5" value={cfg.royalty_pct} onChange={e => setConfig((c: any) => ({ ...c, royalty_pct: e.target.value }))} className="flex-1" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Marketing Fee % (of net sales)</label>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.5" value={cfg.marketing_fee_pct} onChange={e => setConfig((c: any) => ({ ...c, marketing_fee_pct: e.target.value }))} className="flex-1" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Minimum Royalty (₹ per cycle)</label>
              <Input type="number" value={cfg.min_royalty} onChange={e => setConfig((c: any) => ({ ...c, min_royalty: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Cycle</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={cfg.payment_cycle} onChange={e => setConfig((c: any) => ({ ...c, payment_cycle: e.target.value }))}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <div className="font-semibold mb-1">Example Calculation</div>
              Net Sales: ₹1,00,000<br />
              Royalty ({cfg.royalty_pct}%): ₹{(100000 * Number(cfg.royalty_pct) / 100).toLocaleString("en-IN")}<br />
              Marketing Fee ({cfg.marketing_fee_pct}%): ₹{(100000 * Number(cfg.marketing_fee_pct) / 100).toLocaleString("en-IN")}<br />
              <strong>Total Due: ₹{(100000 * (Number(cfg.royalty_pct) + Number(cfg.marketing_fee_pct)) / 100).toLocaleString("en-IN")}</strong>
            </div>
            <button onClick={save} disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Royalty Config"}
            </button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Franchise Outlet Performance</CardTitle></CardHeader>
          <CardContent>
            {(summaryData.outlets || []).length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase"><tr>
                  <th className="text-left py-1.5">Outlet</th>
                  <th className="text-right py-1.5">Revenue</th>
                  <th className="text-right py-1.5">Royalty</th>
                </tr></thead>
                <tbody className="divide-y">
                  {summaryData.outlets.map((o: any) => (
                    <tr key={o.id}>
                      <td className="py-2 font-medium">{o.name}</td>
                      <td className="py-2 text-right">₹{Number(o.revenue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 text-right text-blue-600">₹{Number(o.royalty).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">🏢</div>
                <p className="text-sm">No franchise outlets configured yet.</p>
                <p className="text-xs mt-1">Add outlets from the Outlets tab and mark them as franchise.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RestaurantOutletsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"outlets" | "terminals" | "printers">("outlets");
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
          {(["outlets", "terminals", "printers"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => { setTab(t); resetForm(); }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
          <Button variant="outline" onClick={() => window.location.href = '/restaurant-central-kitchen'}>🏭 Central Kitchen ↗</Button>
          <Button variant="outline" onClick={() => window.location.href = '/restaurant-tax-settings'}>🌍 Tax Settings ↗</Button>
          <Button variant="outline" onClick={() => window.location.href = '/restaurant-franchise'}>🏢 Franchise ↗</Button>
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

    </div>
  );
}
