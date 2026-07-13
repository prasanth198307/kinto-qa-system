import { useState, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Download,
  RotateCcw, ChevronRight, X, FileCheck, Info, Package, ShoppingCart, Layers,
} from "lucide-react";

type Mode = "raw-materials" | "finished-goods" | "retail";
type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = ["Choose type", "Download template", "Upload file", "Review", "Confirm"] as const;

const MODE_CONFIG: Record<Mode, {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  who: string;
  previewCols: string[];
  fields: Array<{ col: string; req: boolean; note: string }>;
}> = {
  "raw-materials": {
    label: "Raw Materials",
    subtitle: "Inputs for production (steel, chemicals, components…)",
    icon: Layers,
    who: "Manufacturing tenants — items that go INTO production",
    previewCols: ["Material Code", "Material Name", "Category", "UOM", "Unit Cost", "Reorder Lvl", "Opening Stock", "Supplier"],
    fields: [
      { col: "Material Code",           req: false, note: "Unique code (e.g. RM-STEEL-001). Auto-generated if blank. Duplicate = update." },
      { col: "Material Name",           req: true,  note: "Full name of the raw material or component." },
      { col: "Description",             req: false, note: "Optional detailed description or specification." },
      { col: "Category",                req: false, note: "Group (e.g. Steel, Chemicals, Packaging)." },
      { col: "UOM",                     req: true,  note: "Unit: KG / LTR / PCS / MTR / NOS." },
      { col: "Unit Cost ",           req: false, note: "Purchase cost per unit from supplier." },
      { col: "Reorder Level (qty)",     req: false, note: "Trigger low-stock alert at this qty." },
      { col: "Max Stock Level (qty)",   req: false, note: "Maximum qty to keep in store." },
      { col: "Opening Stock (qty)",     req: false, note: "Current qty on hand as of today." },
      { col: "Opening Date",            req: false, note: "YYYY-MM-DD — date of opening balance." },
      { col: "Supplier",                req: false, note: "Primary supplier name." },
      { col: "Storage Location",        req: false, note: "Rack / shelf / bin location." },
    ],
  },
  "finished-goods": {
    label: "Finished Goods",
    subtitle: "Manufactured products — optionally POS-enabled per row",
    icon: Package,
    who: "Manufacturing tenants — items that come OUT of production",
    previewCols: ["Product Code", "Product Name", "HSN", "GST%", "Selling ${sym}", "Sell@POS", "Barcode", "MRP"],
    fields: [
      { col: "Product Code",                req: false, note: "Unique code (e.g. FG-BOTTLE-001). Auto-generated if blank. Duplicate code = update existing." },
      { col: "Product Name",                req: true,  note: "Full product name as manufactured." },
      { col: "Category",                    req: false, note: "Product family or category." },
      { col: "HSN Code",                    req: true,  note: "6-digit HSN for GST invoicing / dispatch." },
      { col: "GST %",                       req: true,  note: "0 / 5 / 12 / 18 / 28." },
      { col: "Standard Cost ",           req: false, note: "Cost of production per unit." },
      { col: "Selling Price ",           req: true,  note: "Default dispatch / selling price." },
      { col: "UOM",                         req: true,  note: "PCS / KG / BOX / SET." },
      { col: "Item Type (goods/service)",   req: false, note: "Usually goods. Use service for job-work." },
      { col: "Reorder Level",               req: false, note: "Min FG stock before re-triggering production." },
      { col: "— POS section (if sold at retail counter) —", req: false, note: "Leave the next 3 columns blank if this product is never sold at a counter." },
      { col: "Sell at Retail Counter (Y/N)", req: false, note: "Y = this finished good is also scanned at POS. Activates barcode + MRP fields for this row only." },
      { col: "Barcode/EAN",                 req: false, note: "13-digit EAN or internal barcode. Required if Sell at Retail Counter = Y." },
      { col: "MRP ",                     req: false, note: "Max retail price. Required if Sell at Retail Counter = Y. Selling Price must be ≤ MRP." },
    ],
  },
  "retail": {
    label: "Retail / POS Products",
    subtitle: "Barcode-scanned items sold at POS counter",
    icon: ShoppingCart,
    who: "Retail & grocery tenants — items sold at the POS billing counter",
    previewCols: ["Barcode", "Product Name", "HSN", "GST%", "MRP", "Selling ${sym}", "Brand", "Opening Stock"],
    fields: [
      { col: "Barcode / EAN",              req: false, note: "13-digit EAN or internal barcode. Duplicate barcode = update existing item, no duplicate created." },
      { col: "Product Name",               req: true,  note: "Full name as printed on packet." },
      { col: "SKU Code",                   req: false, note: "Internal stock-keeping code." },
      { col: "Category",                   req: false, note: "Aisle / shelf category (e.g. Staples, Beverages)." },
      { col: "HSN Code",                   req: true,  note: "6-digit HSN for GST billing." },
      { col: "GST %",                      req: true,  note: "0 / 5 / 12 / 18." },
      { col: "MRP ",                    req: true,  note: "Max retail price printed on packet. Selling price must be ≤ MRP." },
      { col: "Purchase Rate ",          req: false, note: "Cost price from distributor / supplier." },
      { col: "Selling Price ",          req: true,  note: "Default POS counter billing price." },
      { col: "UOM",                        req: true,  note: "PCS / KG / LTR / PKT." },
      { col: "Sold By (unit/weight)",      req: false, note: "unit = fixed price per piece; weight = per kg via weighing scale." },
      { col: "Reorder Level",              req: false, note: "Low-stock alert threshold quantity." },
      { col: "Item Type (goods/service)",  req: false, note: "goods (default for all physical products)." },
      { col: "Opening Stock (qty)",        req: false, note: "Current stock at time of import. Written directly to warehouse stock ledger." },
      { col: "Brand",                      req: false, note: "Manufacturer / brand name (e.g. ITC, HUL, Nestle)." },
      { col: "Expiry Tracking (YES/NO)",   req: false, note: "YES = enables batch/expiry date tracking for this item at POS." },
      { col: "Warehouse",                  req: false, note: "Warehouse name to post opening stock into. Uses default warehouse if blank." },
    ],
  },
};

interface PreviewResult {
  total: number;
  validCount: number;
  errorCount: number;
  valid: any[];
  errors: Array<{ row: number; field: string; message: string; item: string }>;
  mode: Mode;
}

function StepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i < step  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
            i === step ? "bg-primary/10 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>
            {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
            {label}
          </div>
          {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function InventoryBulkImportPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(0);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [mode, setMode] = useState<Mode>("retail");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = MODE_CONFIG[mode];

  const handleDownload = () => {
    window.location.href = `/api/inventory/bulk-import/template?mode=${mode}`;
  };

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast({ title: "Unsupported file", description: "Please upload a .csv or .xlsx file", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", mode);
    try {
      const r = await fetch("/api/inventory/bulk-import/preview", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setPreview(data);
      setStep(3);
    } catch (e: any) {
      toast({ title: "Failed to parse file", description: e.message, variant: "destructive" });
    }
  }, [toast, mode]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = async () => {
    if (!preview?.valid.length) return;
    setImporting(true);
    try {
      const r = await fetch("/api/inventory/bulk-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: preview.valid, mode }),
      });
      if (!r.ok) throw new Error(await r.text());
      const result = await r.json();
      setImportResult(result);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/raw-materials"] });
      toast({ title: "Import complete", description: `${result.inserted} created, ${result.updated} updated` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(0); setPreview(null); setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // helper: render a preview cell per mode
  const renderRow = (r: any, col: string, i: number) => {
    if (mode === "raw-materials") {
      const vals: Record<string, any> = {
        "Material Code": r.material_code || "—", "Material Name": r.material_name,
        "Category": r.category || "—", "UOM": r.base_unit,
        "Unit Cost": r.unit_cost ? `${sym}${r.unit_cost}` : "—",
        "Reorder Lvl": r.reorder_level || "—", "Opening Stock": r.opening_stock || "—",
        "Supplier": r.supplier || "—",
      };
      return <td key={i} className="px-3 py-2">{vals[col] ?? "—"}</td>;
    }
    if (mode === "finished-goods") {
      const vals: Record<string, any> = {
        "Product Code": r.product_code || "—",
        "Product Name": r.product_name,
        "HSN": r.hsn_code,
        "GST%": `${r.gst_percent}%`,
        "Selling ${sym}": `${sym}${r.base_price}`,
        "Sell@POS": r.pos_enabled
          ? <span className="text-green-600 font-medium">Yes</span>
          : <span className="text-muted-foreground">No</span>,
        "Barcode": r.barcode || "—",
        "MRP": r.mrp ? `${sym}${(r.mrp / 100).toFixed(2)}` : "—",
      };
      return <td key={i} className="px-3 py-2">{vals[col] ?? "—"}</td>;
    }
    // retail
    const vals: Record<string, any> = {
      "Barcode": r.barcode || "—",
      "Product Name": r.product_name,
      "SKU": r.sku_code || "—",
      "HSN": r.hsn_code,
      "Brand": r.brand || "—",
      "Opening Stock": r.opening_stock ? `${r.opening_stock} ${r.unit_label || ""}`.trim() : "—",
      "GST%": `${r.gst_percent}%`, "MRP": `${sym}${(r.mrp / 100).toFixed(2)}`,
      "Selling ${sym}": `${sym}${r.base_price}`, "UOM": r.unit_label,
    };
    return <td key={i} className="px-3 py-2">{vals[col] ?? "—"}</td>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventory Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload hundreds of items at once via Excel or CSV</p>
        </div>
        {step > 0 && (
          <Button variant="outline" size="sm" onClick={reset} data-testid="button-reset-import">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Start over
          </Button>
        )}
      </div>

      <StepBar step={step} />

      {/* ── Step 0: Choose mode ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">What are you importing?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([key, c]) => {
              const Icon = c.icon;
              const selected = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  data-testid={`button-mode-${key}`}
                  className={`text-left p-4 rounded-md border-2 transition-colors hover-elevate ${
                    selected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium text-sm">{c.label}</span>
                    {selected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{c.who}</p>
                </button>
              );
            })}
          </div>
          <Button onClick={() => setStep(1)} data-testid="button-next-to-template">
            Continue with {cfg.label} →
          </Button>
        </div>
      )}

      {/* ── Step 1: Template ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Download the {cfg.label} template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cfg.fields.map(({ col, req, note }) => (
                  <div key={col} className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{col}</p>
                      <p className="text-xs text-muted-foreground">{note}</p>
                    </div>
                    <Badge variant={req ? "destructive" : "secondary"} className="text-xs shrink-0">
                      {req ? "Required" : "Optional"}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                <Button onClick={handleDownload} data-testid="button-download-template">
                  <Download className="h-4 w-4 mr-1.5" /> Download template (.csv)
                </Button>
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-skip-to-upload">
                  I have my file — skip to upload
                </Button>
              </div>
            </CardContent>
          </Card>

          {mode === "raw-materials" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>Duplicate material code = update existing item. New code = create new item.</p>
            </div>
          )}
          {mode !== "raw-materials" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>{mode === "retail" ? "Duplicate barcode" : "Duplicate product code"} = update existing item. New = create.</p>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => setStep(0)}>← Back to type selection</Button>
        </div>
      )}

      {/* ── Step 2: Upload ──────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload your {cfg.label} file
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-md p-10 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="drop-zone-upload"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Drag & drop your .xlsx or .csv file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
              <Button variant="outline" size="sm" type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse file
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} data-testid="input-file-upload" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back to template</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Review ──────────────────────────────────────────────── */}
      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total rows",       val: preview.total,      color: "text-foreground" },
              { label: "Ready to import",  val: preview.validCount, color: "text-green-600 dark:text-green-400" },
              { label: "Errors",           val: preview.errorCount, color: "text-red-600 dark:text-red-400" },
            ].map(({ label, val, color }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-semibold ${color}`}>{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {preview.errors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Errors ({preview.errors.length}) — these rows will be skipped
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.errors.map((err, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-mono text-muted-foreground">{err.row}</td>
                          <td className="px-3 py-2 font-medium">{err.item}</td>
                          <td className="px-3 py-2 text-destructive">
                            <span className="flex items-center gap-1"><X className="h-3 w-3 shrink-0" />{err.message}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {preview.valid.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" /> Ready — {preview.validCount} row{preview.validCount !== 1 ? "s" : ""} will be imported
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {cfg.previewCols.map(h => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.valid.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          {cfg.previewCols.map((col, j) => renderRow(r, col, j))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>← Re-upload</Button>
            <Button onClick={handleConfirm} disabled={!preview.validCount || importing} data-testid="button-confirm-import">
              {importing ? "Importing…" : `Import ${preview.validCount} item${preview.validCount !== 1 ? "s" : ""} →`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ────────────────────────────────────────────────── */}
      {step === 4 && importResult && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Import complete</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.inserted} {cfg.label} created · {importResult.updated} updated
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{importResult.inserted}</p>
                <p className="text-xs text-muted-foreground">New items</p>
              </div>
              <div className="text-center p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{importResult.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" onClick={reset} data-testid="button-import-again">Import more</Button>
              <Button onClick={() => window.location.href = "/warehouses"}>Go to Inventory</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
