import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wrench, AlertTriangle, CheckCircle2, XCircle, RefreshCw, FileStack } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface FixDetail {
  invoiceId: string;
  invoiceNumber: string;
  action: string;
  oldAmount: number;
  newAmount: number;
}

interface FixResult {
  found: number;
  deleted: number;
  regenerated: number;
  errors: number;
  details: FixDetail[];
}

interface PaymentFixResult {
  adjustmentsFixed: number;
  writeOffsFixed: number;
  errors: number;
  details: Array<{ id: string; paymentType: string; invoiceNumber: string; amount: number; action: string }>;
}

interface BackfillResult {
  invoices: { processed: number; skipped: number; errors: number };
  payments: { processed: number; skipped: number; errors: number };
  [key: string]: { processed: number; skipped: number; errors: number };
}

function formatPaise(paise: number): string {
  return `${sym}${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminToolsPage() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [paymentFixResult, setPaymentFixResult] = useState<PaymentFixResult | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  const fixInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/journal-entries/fix-invoices');
      return res.json() as Promise<FixResult>;
    },
    onSuccess: (data) => {
      setFixResult(data);
      if (data.regenerated > 0) {
        toast({ title: "Invoice Journals Fixed", description: `${data.regenerated} journal entries repaired successfully.` });
      } else if (data.found === 0) {
        toast({ title: "All Good", description: "No broken invoice journal entries found." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Fix Failed", description: error.message, variant: "destructive" });
    },
  });

  const fixPaymentsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/journal-entries/fix-payments');
      return res.json() as Promise<PaymentFixResult>;
    },
    onSuccess: (data) => {
      setPaymentFixResult(data);
      const totalFixed = data.adjustmentsFixed + data.writeOffsFixed;
      if (totalFixed > 0) {
        toast({ title: "Payment Journals Fixed", description: `${totalFixed} misclassified journal entries corrected.` });
      } else {
        toast({ title: "All Good", description: "No misclassified payment journal entries found." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Fix Failed", description: error.message, variant: "destructive" });
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/journal-entries/backfill');
      return res.json() as Promise<BackfillResult>;
    },
    onSuccess: (data) => {
      setBackfillResult(data);
      const totalProcessed = Object.values(data).reduce((sum, v) => sum + (v?.processed || 0), 0);
      toast({ title: "Backfill Complete", description: `${totalProcessed} journal entries created.` });
    },
    onError: (error: Error) => {
      toast({ title: "Backfill Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-admin-tools-title">Admin Tools</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Fix Invoice Journal Entries</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Finds invoice journal entries with incorrect amounts (zero or mismatched), deletes them, and regenerates correct entries. Also creates entries for invoices that are missing them entirely.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fixInvoicesMutation.mutate()}
              disabled={fixInvoicesMutation.isPending}
              data-testid="button-fix-invoices"
            >
              {fixInvoicesMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Running...</>
              ) : (
                <><AlertTriangle className="h-4 w-4 mr-2" /> Run Fix</>
              )}
            </Button>
          </div>

          {fixResult && (
            <div className="space-y-3" data-testid="section-fix-results">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" data-testid="badge-found">
                  Found: {fixResult.found}
                </Badge>
                <Badge variant="outline" data-testid="badge-deleted">
                  Deleted: {fixResult.deleted}
                </Badge>
                <Badge variant={fixResult.regenerated > 0 ? "default" : "outline"} data-testid="badge-regenerated">
                  Regenerated: {fixResult.regenerated}
                </Badge>
                {fixResult.errors > 0 && (
                  <Badge variant="destructive" data-testid="badge-errors">
                    Errors: {fixResult.errors}
                  </Badge>
                )}
              </div>

              {fixResult.details.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Invoice</th>
                        <th className="text-left p-2 font-medium">Action</th>
                        <th className="text-right p-2 font-medium">Old Amount</th>
                        <th className="text-right p-2 font-medium">New Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixResult.details.map((d, i) => (
                        <tr key={i} className="border-t" data-testid={`row-fix-detail-${i}`}>
                          <td className="p-2 font-mono text-xs">{d.invoiceNumber}</td>
                          <td className="p-2">
                            {d.action === 'fixed' && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" /> Fixed
                              </span>
                            )}
                            {d.action === 'created_missing' && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <FileStack className="h-3 w-3" /> Created
                              </span>
                            )}
                            {d.action.startsWith('error') && (
                              <span className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-3 w-3" /> {d.action}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono text-xs text-muted-foreground">
                            {d.oldAmount > 0 ? formatPaise(d.oldAmount) : '-'}
                          </td>
                          <td className="p-2 text-right font-mono text-xs">
                            {d.newAmount > 0 ? formatPaise(d.newAmount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {fixResult.found === 0 && fixResult.details.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  All invoice journal entries are correct. Nothing to fix.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Fix Payment Journal Entries</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Fixes write-off and VDN adjustment payments that were incorrectly recorded as regular "Payment Received" journal entries. Removes duplicate adjustment journals and reclassifies write-offs to proper "Bad Debts" accounting.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fixPaymentsMutation.mutate()}
              disabled={fixPaymentsMutation.isPending}
              data-testid="button-fix-payments"
            >
              {fixPaymentsMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Running...</>
              ) : (
                <><AlertTriangle className="h-4 w-4 mr-2" /> Run Fix</>
              )}
            </Button>
          </div>

          {paymentFixResult && (
            <div className="space-y-3" data-testid="section-payment-fix-results">
              <div className="flex flex-wrap gap-2">
                <Badge variant={paymentFixResult.adjustmentsFixed > 0 ? "default" : "outline"} data-testid="badge-adjustments-fixed">
                  Adjustments Fixed: {paymentFixResult.adjustmentsFixed}
                </Badge>
                <Badge variant={paymentFixResult.writeOffsFixed > 0 ? "default" : "outline"} data-testid="badge-writeoffs-fixed">
                  Write-offs Fixed: {paymentFixResult.writeOffsFixed}
                </Badge>
                {paymentFixResult.errors > 0 && (
                  <Badge variant="destructive" data-testid="badge-payment-fix-errors">
                    Errors: {paymentFixResult.errors}
                  </Badge>
                )}
              </div>

              {paymentFixResult.details.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Invoice</th>
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-right p-2 font-medium">Amount</th>
                        <th className="text-left p-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentFixResult.details.map((d, i) => (
                        <tr key={i} className="border-t" data-testid={`row-payment-fix-detail-${i}`}>
                          <td className="p-2 font-mono text-xs">{d.invoiceNumber}</td>
                          <td className="p-2">
                            <Badge variant="outline">{d.paymentType}</Badge>
                          </td>
                          <td className="p-2 text-right font-mono text-xs">
                            {formatPaise(d.amount)}
                          </td>
                          <td className="p-2">
                            {d.action === 'removed_duplicate' && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" /> Removed Duplicate
                              </span>
                            )}
                            {d.action === 'reclassified' && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <CheckCircle2 className="h-3 w-3" /> Reclassified
                              </span>
                            )}
                            {d.action.startsWith('error') && (
                              <span className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-3 w-3" /> {d.action}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {paymentFixResult.adjustmentsFixed === 0 && paymentFixResult.writeOffsFixed === 0 && paymentFixResult.errors === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  All payment journal entries are correctly classified. Nothing to fix.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Backfill All Journal Entries</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Scans all transactions (invoices, payments, credit notes, expenses, etc.) and creates journal entries for any that are missing. Skips entries that already exist.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
              variant="outline"
              data-testid="button-backfill"
            >
              {backfillMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Running...</>
              ) : (
                <><FileStack className="h-4 w-4 mr-2" /> Run Backfill</>
              )}
            </Button>
          </div>

          {backfillResult && (
            <div className="space-y-2" data-testid="section-backfill-results">
              <div className="border rounded-md overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-right p-2 font-medium">Created</th>
                      <th className="text-right p-2 font-medium">Skipped</th>
                      <th className="text-right p-2 font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(backfillResult).map(([key, val]) => (
                      <tr key={key} className="border-t" data-testid={`row-backfill-${key}`}>
                        <td className="p-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td className="p-2 text-right">
                          {val?.processed > 0 ? (
                            <Badge variant="default">{val.processed}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">{val?.skipped || 0}</td>
                        <td className="p-2 text-right">
                          {val?.errors > 0 ? (
                            <Badge variant="destructive">{val.errors}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
