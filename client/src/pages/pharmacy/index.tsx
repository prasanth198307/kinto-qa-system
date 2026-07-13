import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Package, Receipt, ShoppingCart, AlertTriangle, ShieldAlert, FileText, BarChart2, Undo2, ScanLine } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MODULES = [
  { path: "/pharmacy/billing", label: "Billing (POS)", icon: Receipt, desc: "Sales with GST + GL auto-post" },
  { path: "/pharmacy/fefo-billing", label: "FEFO Billing", icon: ScanLine, desc: "First-Expiry-First-Out auto batch pick" },
  { path: "/pharmacy/drugs", label: "Drug Master", icon: Pill, desc: "Brands, generics, schedules, HSN" },
  { path: "/pharmacy/stock", label: "Stock", icon: Package, desc: "Batch-wise stock with expiry alerts" },
  { path: "/pharmacy/purchases", label: "Purchases", icon: ShoppingCart, desc: "GRN from distributors, GL COGS" },
  { path: "/pharmacy/expiry", label: "Expiry & Returns", icon: Undo2, desc: "Near-expiry, supplier returns, CDSCO recalls" },
  { path: "/pharmacy/narcotics-register", label: "Narcotics Register", icon: ShieldAlert, desc: "NDPS register + monthly report" },
  { path: "/pharmacy/schedule-h", label: "Schedule H/H1", icon: ShieldAlert, desc: "Statutory Rx register" },
  { path: "/pharmacy/schedule-x", label: "Schedule X", icon: ShieldAlert, desc: "Psychotropics register" },
  { path: "/pharmacy/e-invoice", label: "E-Invoice", icon: FileText, desc: "GST e-invoice IRN generation" },
  { path: "/pharmacy/licenses", label: "Licenses", icon: FileText, desc: "Drug license, renewals, pharmacist reg" },
  { path: "/pharmacy/reports", label: "Reports", icon: BarChart2, desc: "GST, margin, doctor-wise, dead stock" },
];

export default function PharmacyDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats = {} } = useQuery<any>({ queryKey: ["/api/pharmacy/stats"], queryFn: () => api("/api/pharmacy/stats") });
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock/expiry-alerts"], queryFn: () => api("/api/pharmacy/stock/expiry-alerts") });

  const s = stats as any;
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const alertCount = Array.isArray(alerts) ? alerts.length : 0;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pharmacy ERP</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Today's Sales</p><p className="text-2xl font-bold text-green-600">{sym}{(s.today_sales ?? 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Drugs in Master</p><p className="text-2xl font-bold">{s.drug_count ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Stock Batches</p><p className="text-2xl font-bold">{s.stock_batches ?? 0}</p></CardContent></Card>
        <Card className={alertCount > 0 ? "border-orange-300" : ""}><CardContent className="pt-4 flex items-center gap-2"><AlertTriangle className={`w-6 h-6 ${alertCount > 0 ? "text-orange-500" : "text-gray-300"}`} /><div><p className="text-sm text-gray-500">Expiry Alerts</p><p className="text-2xl font-bold text-orange-600">{alertCount}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MODULES.map(m => {
          const Icon = m.icon;
          return (
            <Card key={m.path} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(m.path)}>
              <CardContent className="pt-4 flex items-start gap-3">
                <Icon className="w-6 h-6 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
