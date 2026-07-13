import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Scan, Plus, Minus, CheckCircle2, Loader2, AlertCircle, Package, Trash2 } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface ScannedItem {
  product_id: number;
  name: string;
  barcode: string | null;
  sku: string | null;
  hsn_code: string | null;
  tax_rate: number;
  selling_price: number;
  mrp: number | null;
  unit_label: string;
  qty: number;
}

export default function InventoryGrnScan() {
  const { toast } = useToast();
  const scanRef = useRef<HTMLInputElement>(null);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [scanInput, setScanInput] = useState("");
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const val = scanInput.trim();
    if (!val) return;
    setScanError(null);
    setScanning(true);
    try {
      const res = await fetch(
        `/api/inventory/products/lookup?barcode=${encodeURIComponent(val)}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setScanError(err.error || "Product not found in item master");
        scanRef.current?.select();
        return;
      }
      const product = await res.json();
      setItems(prev => {
        const idx = prev.findIndex(i => i.product_id === product.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
          return updated;
        }
        return [...prev, {
          product_id: product.id,
          name: product.name,
          barcode: product.barcode || null,
          sku: product.sku || null,
          hsn_code: product.hsn_code || null,
          tax_rate: product.tax_rate ?? 0,
          selling_price: product.selling_price ?? 0,
          mrp: product.mrp ?? null,
          unit_label: product.unit_label || "pcs",
          qty: 1,
        }];
      });
      setScanInput("");
      scanRef.current?.focus();
    } catch {
      setScanError("Network error — please try again");
    } finally {
      setScanning(false);
    }
  }, [scanInput]);

  const confirmMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inventory/grn-scan/confirm", { items, supplier }),
    onSuccess: (data: any) => {
      toast({
        title: `GRN ${data.grn_number} created`,
        description: data.message || `${data.received} item(s) received — pending Purchase Manager approval before stock updates.`,
      });
      setItems([]);
      setSupplier("");
      setScanInput("");
      setTimeout(() => scanRef.current?.focus(), 100);
    },
    onError: () => toast({ title: "Error creating GRN", variant: "destructive" }),
  });

  const adjustQty = (id: number, delta: number) => {
    setItems(prev => prev.map(i =>
      i.product_id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
    ));
  };

  const removeItem = (id: number) => setItems(prev => prev.filter(i => i.product_id !== id));

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-semibold">GRN — Scan Mode</h1>
        <p className="text-sm text-muted-foreground">Scan barcodes or type SKU codes to receive stock into godown</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Supplier (optional)</label>
          <Input
            placeholder="e.g. Hindustan Unilever"
            value={supplier}
            onChange={e => setSupplier(e.target.value)}
            data-testid="input-supplier"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <form onSubmit={handleScan} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={scanRef}
                autoFocus
                className="pl-9"
                placeholder="Scan barcode or type SKU and press Enter…"
                value={scanInput}
                onChange={e => { setScanInput(e.target.value); setScanError(null); }}
                data-testid="input-barcode-scan"
              />
            </div>
            <Button type="submit" disabled={scanning || !scanInput.trim()} data-testid="button-scan-add">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setScanInput(""); setScanError(null); scanRef.current?.focus(); }}
              data-testid="button-manual-entry"
            >
              Manual
            </Button>
          </form>
          {scanError && (
            <div className="flex items-center gap-2 text-sm text-destructive" data-testid="text-scan-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {scanError}
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              Scanned items
              <span className="text-muted-foreground font-normal ml-1">
                ({items.length} product{items.length !== 1 ? "s" : ""}, {totalQty} unit{totalQty !== 1 ? "s" : ""})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {items.map(item => (
              <div
                key={item.product_id}
                className="flex items-center gap-3 p-3 rounded-md border"
                data-testid={`row-scan-item-${item.product_id}`}
              >
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.barcode ? `EAN: ${item.barcode}` : item.sku ? `SKU: ${item.sku}` : "No barcode"}
                    {item.hsn_code ? ` · HSN: ${item.hsn_code}` : ""}
                    {item.tax_rate ? ` · GST: ${item.tax_rate}%` : ""}
                    {item.mrp ? ` · MRP: ${sym}${(item.mrp / 100).toFixed(0)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => adjustQty(item.product_id, -1)}
                    data-testid={`button-qty-minus-${item.product_id}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium text-sm" data-testid={`text-qty-${item.product_id}`}>
                    {item.qty}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => adjustQty(item.product_id, 1)}
                    data-testid={`button-qty-plus-${item.product_id}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-7">{item.unit_label}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(item.product_id)}
                    data-testid={`button-remove-${item.product_id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setItems([])} data-testid="button-clear-scan">
            Clear all
          </Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            data-testid="button-confirm-grn"
          >
            {confirmMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Confirming…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" />Receive {totalQty} unit{totalQty !== 1 ? "s" : ""} into stock</>
            )}
          </Button>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-14 text-muted-foreground text-sm">
          <Scan className="h-10 w-10 mx-auto mb-3 opacity-25" />
          Scan a barcode or type a SKU to start receiving stock
        </div>
      )}
    </div>
  );
}
