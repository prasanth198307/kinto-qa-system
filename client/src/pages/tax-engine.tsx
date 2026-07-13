import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Globe, Calculator, BookOpen, Shield } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const COUNTRIES = ["India", "Saudi Arabia", "UAE", "USA", "Germany", "France", "Netherlands",
  "Italy", "Spain", "Belgium", "Austria", "Portugal", "Poland", "Sweden", "Denmark",
  "Finland", "Ireland", "Greece", "Other"];

const INDIA_STATES = ["Andhra Pradesh","Bihar","Delhi","Gujarat","Haryana","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","West Bengal"];

const US_STATES = ["CA","TX","NY","FL","IL","PA","OH","GA","NC","MI"];

function RegimeBadge({ regime }: { regime: string }) {
  const colors: Record<string, string> = {
    GST: 'bg-blue-100 text-blue-800',
    ZATCA: 'bg-green-100 text-green-800',
    VAT: 'bg-purple-100 text-purple-800',
    'Sales Tax': 'bg-orange-100 text-orange-800',
    None: 'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[regime] ?? colors.None}`}>{regime}</span>;
}

// Tab 1: Tax Settings
function SettingsTab() {
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: ['/api/tax/settings'], queryFn: () => apiRequest('GET', '/api/tax/settings').then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const s = data?.settings;
  const [form, setForm] = useState({ country: s?.country ?? 'India', default_state: s?.default_state ?? '',
    seller_state: s?.seller_state ?? '', vat_number: s?.vat_number ?? '', tax_regime: s?.tax_regime ?? 'GST',
    eu_vat_number: s?.eu_vat_number ?? '', zatca_enabled: s?.zatca_enabled ?? false, us_state: s?.us_state ?? '' });

  const mut = useMutation({ mutationFn: (body: any) => apiRequest('PUT', '/api/tax/settings', body).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/tax/settings'] }); toast({ title: 'Settings saved' }); },
    onError: () => toast({ title: 'Save failed', variant: 'destructive' }) });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Tax Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Country</Label>
            <select className="w-full border rounded px-3 py-2 mt-1" value={form.country} onChange={e => set('country', e.target.value)}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <span>Regime: <RegimeBadge regime={form.tax_regime} /></span>
          </div>
        </div>

        {form.country === 'India' && (
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Seller State (for GST)</Label>
              <select className="w-full border rounded px-3 py-2 mt-1" value={form.seller_state} onChange={e => set('seller_state', e.target.value)}>
                <option value="">-- Select --</option>
                {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>GSTIN</Label><Input className="mt-1" value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="22AAAAA0000A1Z5" /></div>
          </div>
        )}

        {form.country === 'Saudi Arabia' && (
          <div className="grid grid-cols-2 gap-4">
            <div><Label>TRN Number</Label><Input className="mt-1" value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="300XXXXXXXXXXX003" /></div>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={form.zatca_enabled} onChange={e => set('zatca_enabled', e.target.checked)} id="zatca" />
              <Label htmlFor="zatca">Enable ZATCA Phase 2</Label>
            </div>
          </div>
        )}

        {form.country === 'UAE' && (
          <div><Label>TRN Number</Label><Input className="mt-1" value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="100XXXXXXXXX003" /></div>
        )}

        {['Germany','France','Netherlands','Italy','Spain','Belgium','Austria','Portugal','Poland','Sweden','Denmark','Finland','Ireland','Greece'].includes(form.country) && (
          <div className="grid grid-cols-2 gap-4">
            <div><Label>EU VAT Number</Label><Input className="mt-1" value={form.eu_vat_number} onChange={e => set('eu_vat_number', e.target.value)} placeholder="DE123456789" /></div>
          </div>
        )}

        {form.country === 'USA' && (
          <div><Label>Home State</Label>
            <select className="w-full border rounded px-3 py-2 mt-1" value={form.us_state} onChange={e => set('us_state', e.target.value)}>
              <option value="">-- Select --</option>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}

        <Button onClick={() => mut.mutate({ ...form, tax_regime: { India: 'GST', 'Saudi Arabia': 'ZATCA', UAE: 'VAT', USA: 'Sales Tax' }[form.country] ?? (form.country === 'Other' ? 'None' : 'VAT') })} disabled={mut.isPending}>
          {mut.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Tab 2: Tax Calculator
function CalculatorTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const [params, setParams] = useState({ country: 'India', state: '', sellerState: '', taxableAmount: 10000, taxRate: '', isB2B: false, customerVatNumber: '' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const set = (k: string, v: any) => setParams(p => ({ ...p, [k]: v }));

  const calculate = async () => {
    setLoading(true);
    try {
      const body: any = { country: params.country, taxableAmount: params.taxableAmount * 100,
        state: params.state || undefined, sellerState: params.sellerState || undefined,
        taxRate: params.taxRate ? Number(params.taxRate) : undefined,
        isB2B: params.isB2B, customerVatNumber: params.customerVatNumber || undefined };
      const r = await apiRequest('POST', '/api/tax/compute', body);
      setResult(await r.json());
    } catch { toast({ title: 'Compute failed', variant: 'destructive' }); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/>Tax Calculator</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label>Country</Label>
            <select className="w-full border rounded px-3 py-2 mt-1" value={params.country} onChange={e => set('country', e.target.value)}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>State (India/USA)</Label><Input className="mt-1" value={params.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Maharashtra / CA" /></div>
          <div><Label>Seller State (India only)</Label><Input className="mt-1" value={params.sellerState} onChange={e => set('sellerState', e.target.value)} /></div>
          <div><Label>Amount (${sym})</Label><Input type="number" className="mt-1" value={params.taxableAmount} onChange={e => set('taxableAmount', Number(e.target.value))} /></div>
          <div><Label>Tax Rate % (optional override)</Label><Input className="mt-1" value={params.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="Auto" /></div>
          <div><Label>Customer VAT Number (EU B2B)</Label><Input className="mt-1" value={params.customerVatNumber} onChange={e => set('customerVatNumber', e.target.value)} /></div>
          <div className="flex items-center gap-2 mt-5">
            <input type="checkbox" checked={params.isB2B} onChange={e => set('isB2B', e.target.checked)} id="b2b" />
            <Label htmlFor="b2b">B2B Transaction (EU reverse charge)</Label>
          </div>
          <div className="flex items-end"><Button onClick={calculate} disabled={loading}>{loading ? 'Calculating...' : 'Calculate Tax'}</Button></div>
        </CardContent>
      </Card>

      {result && (
        <Card><CardHeader><CardTitle>Result <RegimeBadge regime={result.regime} /></CardTitle></CardHeader>
          <CardContent>
            {result.isReverseCharge && <Badge className="mb-2 bg-yellow-100 text-yellow-800">Reverse Charge</Badge>}
            {result.zatcaRequired && <Badge className="mb-2 ml-2 bg-green-100 text-green-800">ZATCA Required</Badge>}
            <table className="w-full text-sm mt-2">
              <thead><tr className="border-b"><th className="text-left py-1">Tax</th><th className="text-right py-1">Rate</th><th className="text-right py-1">Amount</th></tr></thead>
              <tbody>
                {result.lines.map((l: any) => <tr key={l.name} className="border-b"><td className="py-1">{l.name}</td><td className="text-right">{l.rate}%</td><td className="text-right">{sym}{(l.amount / 100).toFixed(2)}</td></tr>)}
                <tr className="font-semibold"><td>Total Tax</td><td></td><td className="text-right">{sym}{(result.totalTax / 100).toFixed(2)}</td></tr>
                <tr className="font-bold text-base"><td>Grand Total</td><td></td><td className="text-right">{sym}{(result.grandTotal / 100).toFixed(2)}</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tab 3: Rate Reference
function RatesTab() {
  const { data: euData } = useQuery({ queryKey: ['/api/tax/eu-rates'], queryFn: () => apiRequest('GET', '/api/tax/eu-rates').then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: usData } = useQuery({ queryKey: ['/api/tax/us-rates'], queryFn: () => apiRequest('GET', '/api/tax/us-rates').then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const rateColor = (r: number) => r < 10 ? 'text-green-700' : r <= 18 ? 'text-yellow-700' : 'text-red-700';

  return (
    <div className="space-y-4">
      <Tabs defaultValue="eu">
        <TabsList><TabsTrigger value="eu">EU Countries</TabsTrigger><TabsTrigger value="us">US States</TabsTrigger></TabsList>
        <TabsContent value="eu">
          <Card><CardContent className="pt-4">
            <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-1">Country</th><th className="text-left py-1">Tax</th><th className="text-right py-1">Rate</th></tr></thead>
              <tbody>{(euData?.rates ?? []).map((row: any) => <tr key={row.country} className="border-b"><td className="py-1">{row.country}</td><td>VAT</td><td className={`text-right font-semibold ${rateColor(row.rate)}`}>{row.rate}%</td></tr>)}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="us">
          <Card><CardContent className="pt-4">
            <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-1">State</th><th className="text-left py-1">Tax</th><th className="text-right py-1">Rate</th></tr></thead>
              <tbody>{(usData?.rates ?? []).map((row: any) => <tr key={row.state} className="border-b"><td className="py-1">{row.state}</td><td>Sales Tax</td><td className={`text-right font-semibold ${rateColor(row.rate)}`}>{row.rate}%</td></tr>)}</tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Tab 4: ZATCA Compliance
function ZATCATab() {
  const [form, setForm] = useState({ sellerName: 'Kinto Water Trading Co.', vatNumber: '300000000000003', invoiceDate: new Date().toISOString().split('T')[0], totalWithVat: 1150, vatAmount: 150 });
  const [qr, setQr] = useState('');
  const { toast } = useToast();
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const generateQR = async () => {
    try {
      const r = await apiRequest('POST', '/api/tax/zatca-qr', form);
      const d = await r.json();
      setQr(d.qr ?? '');
    } catch { toast({ title: 'QR generation failed', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5"/>ZATCA Compliance (Saudi Arabia)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Seller Name</Label><Input className="mt-1" value={form.sellerName} onChange={e => set('sellerName', e.target.value)} /></div>
            <div><Label>VAT/TRN Number</Label><Input className="mt-1" value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} /></div>
            <div><Label>Invoice Date</Label><Input type="date" className="mt-1" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} /></div>
            <div><Label>Total with VAT (SAR)</Label><Input type="number" className="mt-1" value={form.totalWithVat} onChange={e => set('totalWithVat', Number(e.target.value))} /></div>
            <div><Label>VAT Amount (SAR)</Label><Input type="number" className="mt-1" value={form.vatAmount} onChange={e => set('vatAmount', Number(e.target.value))} /></div>
          </div>
          <Button onClick={generateQR}>Generate ZATCA QR</Button>
          {qr && <div className="mt-3 p-3 border rounded bg-gray-50"><p className="text-xs font-semibold mb-1">ZATCA TLV Data (base64):</p><p className="text-xs break-all font-mono">{qr}</p></div>}

          <div className="mt-4 space-y-2">
            <p className="font-semibold text-sm">ZATCA Compliance Checklist</p>
            {[['VAT 15% configured', true],['TRN number set', !!form.vatNumber],['Arabic seller name supported', true],['Invoice date in ISO format', true],['Phase 1: e-Invoice QR code', true],['Phase 2: Integration with ZATCA portal', false]].map(([label, done]) =>
              <div key={String(label)} className="flex items-center gap-2 text-sm">
                <span className={done ? 'text-green-600' : 'text-gray-400'}>{done ? '✅' : '⬜'}</span>{label}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaxEnginePage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Globe className="h-7 w-7 text-blue-600" />
        <div><h1 className="text-2xl font-bold">Multi-Country Tax Engine</h1>
          <p className="text-gray-500 text-sm">GST · VAT · ZATCA · US Sales Tax</p>
        </div>
      </div>
      <Tabs defaultValue="settings">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="settings">Tax Settings</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="rates">Rate Reference</TabsTrigger>
          <TabsTrigger value="zatca">ZATCA</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="calculator"><CalculatorTab /></TabsContent>
        <TabsContent value="rates"><RatesTab /></TabsContent>
        <TabsContent value="zatca"><ZATCATab /></TabsContent>
      </Tabs>
    </div>
  );
}
