import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Download,
  RotateCcw, ChevronRight, X, FileCheck, Info,
} from "lucide-react";

const STEPS = ["Download template", "Upload file", "Review", "Confirm import"] as const;
type Step = 0 | 1 | 2 | 3;

interface PreviewResult {
  total: number;
  validCount: number;
  errorCount: number;
  valid: any[];
  errors: Array<{ row: number; field: string; message: string; item: string }>;
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            i < step ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
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
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.location.href = "/api/inventory/bulk-import/template";
  };

  const processFile = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast({ title: "Unsupported file type", description: "Please upload a .csv or .xlsx file", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/inventory/bulk-import/preview", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setPreview(data);
      setStep(2);
    } catch (e: any) {
      toast({ title: "Failed to parse file", description: e.message, variant: "destructive" });
    }
  }, [toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = async () => {
    if (!preview?.valid.length) return;
    setImporting(true);
    try {
      const r = await fetch("/api/inventory/bulk-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: preview.valid }),
      });
      if (!r.ok) throw new Error(await r.text());
      const result = await r.json();
      setImportResult(result);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `Import complete`, description: `${result.inserted} created, ${result.updated} updated` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inventory Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload hundreds of products at once via Excel or CSV</p>
        </div>
        {step > 0 && (
          <Button variant="outline" size="sm" onClick={reset} data-testid="button-reset-import">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Start over
          </Button>
        )}
      </div>

      <StepIndicator step={step} />

      {/* ── Step 0: Download template ── */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Step 1 — Download the template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { col: "Barcode / EAN", req: false, note: "13-digit EAN or internal barcode. Duplicate = update existing." },
                  { col: "Product Name", req: true, note: "Full product name as on packaging." },
                  { col: "SKU Code", req: false, note: "Internal code. Auto-generated if blank." },
                  { col: "Category", req: false, note: "Category name (text)." },
                  { col: "HSN Code", req: true, note: "6-digit HSN for GST classification." },
                  { col: "GST %", req: true, note: "0 / 5 / 12 / 18 — must match HSN." },
                  { col: "MRP (₹)", req: true, note: "Maximum retail price — billing ceiling." },
                  { col: "Purchase Rate (₹)", req: false, note: "Cost price from supplier." },
                  { col: "Selling Price (₹)", req: true, note: "Default POS price ≤ MRP." },
                  { col: "UOM", req: true, note: "PCS / KG / LTR / PKT / BOX." },
                  { col: "Sold By (unit/weight)", req: false, note: "unit = fixed price; weight = per kg via scale." },
                  { col: "Reorder Level", req: false, note: "Triggers low-stock alert." },
                  { col: "Item Type (goods/service)", req: false, note: "goods (default) or service." },
                ].map(({ col, req, note }) => (
                  <div key={col} className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
                    <div className="flex-1">
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
                <Button onClick={handleDownloadTemplate} data-testid="button-download-template">
                  <Download className="h-4 w-4 mr-1.5" /> Download template (.csv)
                </Button>
                <Button variant="outline" onClick={() => setStep(1)} data-testid="button-skip-to-upload">
                  I have my file — skip to upload
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Duplicate barcode rule</p>
              <p>If a barcode already exists in the item master, the row <strong>updates</strong> the existing product — it does not create a duplicate. New barcodes create new items. Import is transactional — errors do not block valid rows.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Upload file ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Step 2 — Upload your file
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
              <p className="text-sm font-medium mb-1">Drag and drop your .xlsx or .csv file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
              <Button variant="outline" size="sm" type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse file
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} data-testid="input-file-upload" />
            </div>
            <Button variant="ghost" onClick={() => setStep(0)}>← Back to template</Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Review ── */}
      {step === 2 && preview && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total rows", val: preview.total, color: "text-foreground" },
              { label: "Ready to import", val: preview.validCount, color: "text-green-600 dark:text-green-400" },
              { label: "Errors", val: preview.errorCount, color: "text-red-600 dark:text-red-400" },
            ].map(({ label, val, color }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-semibold ${color}`}>{val}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Validation errors ({preview.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
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
                          <td className="px-3 py-2 text-destructive flex items-center gap-1">
                            <X className="h-3 w-3 shrink-0" />{err.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Error rows will be skipped. The {preview.validCount} valid row{preview.validCount !== 1 ? "s" : ""} will still import.</p>
              </CardContent>
            </Card>
          )}

          {/* Valid rows preview */}
          {preview.valid.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" /> Ready to import — {preview.validCount} row{preview.validCount !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {["Barcode", "Product Name", "SKU", "Category", "HSN", "GST%", "MRP", "Selling ₹", "UOM"].map(h =>
                          <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.valid.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-muted-foreground">{r.barcode || "—"}</td>
                          <td className="px-3 py-2 font-medium">{r.product_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.sku_code || "—"}</td>
                          <td className="px-3 py-2">{r.category || "—"}</td>
                          <td className="px-3 py-2 font-mono">{r.hsn_code}</td>
                          <td className="px-3 py-2">{r.gst_percent}%</td>
                          <td className="px-3 py-2">₹{Number(r.mrp / 100).toFixed(2)}</td>
                          <td className="px-3 py-2">₹{Number(r.base_price).toFixed(2)}</td>
                          <td className="px-3 py-2">{r.unit_label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>← Re-upload</Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!preview.validCount || importing}
              data-testid="button-confirm-import"
            >
              {importing ? "Importing…" : `Import ${preview.validCount} product${preview.validCount !== 1 ? "s" : ""} ↗`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && importResult && (
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
                {importResult.inserted} products created · {importResult.updated} products updated
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{importResult.inserted}</p>
                <p className="text-xs text-muted-foreground">New products</p>
              </div>
              <div className="text-center p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{importResult.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" onClick={reset} data-testid="button-import-again">
                Import more products
              </Button>
              <Button onClick={() => window.location.href = "/warehouses"}>
                Go to Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
