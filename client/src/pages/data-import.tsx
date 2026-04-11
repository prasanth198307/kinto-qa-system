import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Info, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    vendors: number;
    products: number;
    invoices: number;
    vendorTypes: number;
    skipped: number;
    payments: number;
    paymentsSkipped: number;
    paymentsUnallocated: number;
  };
}

interface CreditNoteImportResult {
  success: boolean;
  message: string;
  stats: {
    creditNotes: number;
    creditNoteItems: number;
    skippedNotes: number;
    skippedItems: number;
    unmatchedVendors: string[];
    unmatchedProducts: string[];
  };
}

export default function DataImport() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [partyFile, setPartyFile] = useState<File | null>(null);
  const [saleFile, setSaleFile] = useState<File | null>(null);
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importSuccessful, setImportSuccessful] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showClearInvoicesDialog, setShowClearInvoicesDialog] = useState(false);
  
  const [creditNotesFile, setCreditNotesFile] = useState<File | null>(null);
  const [creditNotesResult, setCreditNotesResult] = useState<CreditNoteImportResult | null>(null);
  const [creditNotesSuccessful, setCreditNotesSuccessful] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/import-vyapaar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Import failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Check if import actually succeeded
      if (!result.success) {
        throw new Error(result.message || 'Import failed');
      }
      
      return result as ImportResult;
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setImportSuccessful(true);
      const stats = data.stats;
      
      // Invalidate all caches so UI refreshes with imported data
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-types'] });
      
      const hasPaymentIssues = (stats.paymentsSkipped || 0) > 0 || (stats.paymentsUnallocated || 0) > 0;
      
      toast({
        title: hasPaymentIssues ? "Import Completed with Warnings" : "Import Successful",
        description: hasPaymentIssues 
          ? `Imported ${stats.invoices} invoices, ${stats.payments || 0} payments. Check payment notes below for issues.`
          : `Imported ${stats.vendors} vendors, ${stats.products} products, ${stats.invoices} invoices${stats.payments > 0 ? `, and ${stats.payments} payments` : ''}`,
        variant: hasPaymentIssues ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      setImportResult(null);
      setImportSuccessful(false);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/clear-imported-data', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear data');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      
      toast({
        title: "Data Cleared",
        description: data.message,
      });
      setShowClearDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearInvoicesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/clear-invoices-only', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear invoices');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
      
      toast({
        title: "Invoices Cleared",
        description: `Cleared ${data.stats.invoices} invoices, ${data.stats.invoiceItems} items, ${data.stats.invoicePayments} payments. Vendors and products preserved.`,
      });
      setShowClearInvoicesDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const creditNotesImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/import-credit-notes', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Import failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Import failed');
      }
      
      return result as CreditNoteImportResult;
    },
    onSuccess: (data: CreditNoteImportResult) => {
      setCreditNotesResult(data);
      setCreditNotesSuccessful(true);
      
      queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
      
      toast({
        title: "Credit Notes Import Successful",
        description: `Imported ${data.stats.creditNotes} credit notes with ${data.stats.creditNoteItems} items`,
      });
    },
    onError: (error: Error) => {
      setCreditNotesResult(null);
      setCreditNotesSuccessful(false);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!saleFile) {
      toast({
        title: "Missing File",
        description: "Please upload at least the Sale Report file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    if (partyFile) {
      formData.append('partyReport', partyFile);
    }
    formData.append('saleReport', saleFile);
    if (itemFile) {
      formData.append('itemDetails', itemFile);
    }
    if (paymentsFile) {
      formData.append('paymentsReport', paymentsFile);
    }

    setImportResult(null);
    importMutation.mutate(formData);
  };

  const handleCreditNotesImport = () => {
    if (!creditNotesFile) {
      toast({
        title: "Missing File",
        description: "Please upload a Credit Notes Excel file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('creditNotesFile', creditNotesFile);

    setCreditNotesResult(null);
    creditNotesImportMutation.mutate(formData);
  };

  const handleClearData = () => {
    clearDataMutation.mutate();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/?tab=overview')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold" data-testid="heading-data-import">Vyapaar Data Import</h2>
            <p className="text-muted-foreground" data-testid="description-data-import">
              Upload Excel files from Vyapaar to migrate your data
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog open={showClearInvoicesDialog} onOpenChange={setShowClearInvoicesDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={clearInvoicesMutation.isPending}
                data-testid="button-clear-invoices"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Invoices Only
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Invoice Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL invoices, invoice items, payments, and credit notes.
                  <br /><br />
                  <strong>Vendors and Products will be preserved.</strong>
                  <br /><br />
                  Use this when you want to re-import invoices without losing your vendor and product data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-clear-invoices">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearInvoicesMutation.mutate()}
                  className="bg-destructive hover:bg-destructive/90"
                  data-testid="button-confirm-clear-invoices"
                >
                  {clearInvoicesMutation.isPending ? 'Clearing...' : 'Clear Invoices'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={clearDataMutation.isPending}
                data-testid="button-clear-data"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Transaction Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL vendors, products, invoices, gatepasses, production entries, and related transactional data.
                  Master data (UOMs, roles, permissions, users, vendor types, product categories) will be preserved.
                  <br /><br />
                  <strong>Warning:</strong> This clears ALL data, not just Vyapaar imports.
                  <br /><br />
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive hover:bg-destructive/90"
                  data-testid="button-confirm-clear"
                >
                  {clearDataMutation.isPending ? 'Clearing...' : 'Clear Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Alert data-testid="alert-import-info">
        <Info className="h-4 w-4" />
        <AlertTitle>Import Options</AlertTitle>
        <AlertDescription className="space-y-2">
          <p><strong>Full Import:</strong> Upload Party Report + Sale Report (with Item Details sheet) to import vendors, products, and invoices.</p>
          <p><strong>Invoices Only:</strong> If vendors and products already exist, use "Clear Invoices Only" then upload just the Sale Report to re-import invoices while preserving your vendor and product data.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle data-testid="title-upload-files">Upload Excel Files</CardTitle>
          <CardDescription data-testid="description-upload-files">
            Select the Excel exports from Vyapaar (Item Details is optional if included in Sale Report)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-file" data-testid="label-party-file">
              Party Report (Vendors/Customers) - Optional if vendors exist
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="party-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setPartyFile(e.target.files?.[0] || null)}
                disabled={importMutation.isPending || importSuccessful}
                data-testid="input-party-file"
              />
              {partyFile && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-party-file-selected" />
              )}
            </div>
            {partyFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-party-filename">
                Selected: {partyFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-file" data-testid="label-sale-file">
              Sale Report (Invoices)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sale-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSaleFile(e.target.files?.[0] || null)}
                disabled={importMutation.isPending || importSuccessful}
                data-testid="input-sale-file"
              />
              {saleFile && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-sale-file-selected" />
              )}
            </div>
            {saleFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-sale-filename">
                Selected: {saleFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-file" data-testid="label-item-file">
              Item Details Report (Products) - Optional
            </Label>
            <p className="text-xs text-muted-foreground">
              Only needed if not included as a sheet in Sale Report
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="item-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setItemFile(e.target.files?.[0] || null)}
                disabled={importMutation.isPending || importSuccessful}
                data-testid="input-item-file"
              />
              {itemFile && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-item-file-selected" />
              )}
            </div>
            {itemFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-item-filename">
                Selected: {itemFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payments-file" data-testid="label-payments-file">
              Payments Report - Optional
            </Label>
            <p className="text-xs text-muted-foreground">
              Separate payments received after invoices. Will be allocated to invoices using FIFO (oldest first)
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="payments-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setPaymentsFile(e.target.files?.[0] || null)}
                disabled={importMutation.isPending || importSuccessful}
                data-testid="input-payments-file"
              />
              {paymentsFile && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-payments-file-selected" />
              )}
            </div>
            {paymentsFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-payments-filename">
                Selected: {paymentsFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!saleFile || importMutation.isPending || importSuccessful}
              className="flex-1 gap-2"
              data-testid="button-start-import"
            >
              {importMutation.isPending ? (
                <>
                  <Upload className="h-4 w-4 animate-pulse" />
                  Importing Data...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
            {importSuccessful && (
              <Button
                onClick={() => {
                  setImportSuccessful(false);
                  setPartyFile(null);
                  setSaleFile(null);
                  setItemFile(null);
                  setPaymentsFile(null);
                  setImportResult(null);
                }}
                variant="outline"
                className="gap-2"
                data-testid="button-reset-import"
              >
                Reset
              </Button>
            )}
          </div>

          {importMutation.isPending && (
            <div className="space-y-2" data-testid="import-progress">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Processing Excel files... This may take a minute
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {importResult && (
        <Card data-testid="card-import-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="title-import-results">
              {importResult.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Import Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Import Failed
                </>
              )}
            </CardTitle>
            <CardDescription data-testid="description-import-results">
              {importResult.message}
            </CardDescription>
          </CardHeader>
          {importResult.success && (
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1" data-testid="stat-vendors">
                  <p className="text-sm text-muted-foreground">Vendors</p>
                  <p className="text-2xl font-bold">{importResult.stats.vendors}</p>
                </div>
                <div className="space-y-1" data-testid="stat-products">
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{importResult.stats.products}</p>
                </div>
                <div className="space-y-1" data-testid="stat-invoices">
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="text-2xl font-bold">{importResult.stats.invoices}</p>
                </div>
                <div className="space-y-1" data-testid="stat-payments">
                  <p className="text-sm text-muted-foreground">Payments (FIFO)</p>
                  <p className="text-2xl font-bold">{importResult.stats.payments || 0}</p>
                </div>
                <div className="space-y-1" data-testid="stat-vendor-types">
                  <p className="text-sm text-muted-foreground">Vendor Types</p>
                  <p className="text-2xl font-bold">{importResult.stats.vendorTypes}</p>
                </div>
              </div>
              {importResult.stats.skipped > 0 && (
                <Alert className="mt-4" data-testid="alert-skipped-items">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some Items Skipped</AlertTitle>
                  <AlertDescription>
                    {importResult.stats.skipped} items were skipped (duplicates or missing data)
                  </AlertDescription>
                </Alert>
              )}
              {((importResult.stats.paymentsSkipped || 0) > 0 || (importResult.stats.paymentsUnallocated || 0) > 0) && (
                <Alert className="mt-4" variant="destructive" data-testid="alert-payment-issues">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Payment Import Warnings</AlertTitle>
                  <AlertDescription>
                    {(importResult.stats.paymentsSkipped || 0) > 0 && (
                      <span className="block">{importResult.stats.paymentsSkipped} payments skipped (duplicates, missing vendor, or invalid data)</span>
                    )}
                    {(importResult.stats.paymentsUnallocated || 0) > 0 && (
                      <span className="block">{importResult.stats.paymentsUnallocated} payments had excess amounts (no more unpaid invoices)</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle data-testid="title-credit-notes-import">Credit Notes Import</CardTitle>
          <CardDescription>
            Import Credit Notes from Vyapaar Custom Report export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Requirements</AlertTitle>
            <AlertDescription>
              The Excel file must contain "Custom Report" and "Item Details" sheets from Vyapaar.
              Vendors and products must already exist in the system for matching.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="credit-notes-file" data-testid="label-credit-notes-file">
              Credit Notes Excel File
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="credit-notes-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setCreditNotesFile(e.target.files?.[0] || null)}
                disabled={creditNotesImportMutation.isPending || creditNotesSuccessful}
                data-testid="input-credit-notes-file"
              />
              {creditNotesFile && (
                <CheckCircle2 className="h-5 w-5 text-green-600" data-testid="icon-credit-notes-file-selected" />
              )}
            </div>
            {creditNotesFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-credit-notes-filename">
                Selected: {creditNotesFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreditNotesImport}
              disabled={!creditNotesFile || creditNotesImportMutation.isPending || creditNotesSuccessful}
              className="gap-2"
              data-testid="button-import-credit-notes"
            >
              {creditNotesImportMutation.isPending ? (
                <>
                  <Progress className="h-4 w-4" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import Credit Notes
                </>
              )}
            </Button>
            {creditNotesSuccessful && (
              <Button
                onClick={() => {
                  setCreditNotesSuccessful(false);
                  setCreditNotesFile(null);
                  setCreditNotesResult(null);
                }}
                variant="outline"
                className="gap-2"
                data-testid="button-reset-credit-notes-import"
              >
                Reset
              </Button>
            )}
          </div>

          {creditNotesImportMutation.isPending && (
            <div className="space-y-2" data-testid="credit-notes-import-progress">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                Processing Credit Notes...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {creditNotesResult && (
        <Card data-testid="card-credit-notes-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="title-credit-notes-results">
              {creditNotesResult.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Credit Notes Import Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Credit Notes Import Failed
                </>
              )}
            </CardTitle>
            <CardDescription data-testid="description-credit-notes-results">
              {creditNotesResult.message}
            </CardDescription>
          </CardHeader>
          {creditNotesResult.success && (
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1" data-testid="stat-credit-notes">
                  <p className="text-sm text-muted-foreground">Credit Notes</p>
                  <p className="text-2xl font-bold">{creditNotesResult.stats.creditNotes}</p>
                </div>
                <div className="space-y-1" data-testid="stat-credit-note-items">
                  <p className="text-sm text-muted-foreground">Line Items</p>
                  <p className="text-2xl font-bold">{creditNotesResult.stats.creditNoteItems}</p>
                </div>
                <div className="space-y-1" data-testid="stat-skipped-notes">
                  <p className="text-sm text-muted-foreground">Skipped Notes</p>
                  <p className="text-2xl font-bold">{creditNotesResult.stats.skippedNotes}</p>
                </div>
                <div className="space-y-1" data-testid="stat-skipped-items">
                  <p className="text-sm text-muted-foreground">Skipped Items</p>
                  <p className="text-2xl font-bold">{creditNotesResult.stats.skippedItems}</p>
                </div>
              </div>
              {creditNotesResult.stats.unmatchedVendors.length > 0 && (
                <Alert className="mt-4" variant="destructive" data-testid="alert-unmatched-vendors">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Unmatched Vendors</AlertTitle>
                  <AlertDescription>
                    {creditNotesResult.stats.unmatchedVendors.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
              {creditNotesResult.stats.unmatchedProducts.length > 0 && (
                <Alert className="mt-4" variant="destructive" data-testid="alert-unmatched-products">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Unmatched Products</AlertTitle>
                  <AlertDescription>
                    {creditNotesResult.stats.unmatchedProducts.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle data-testid="title-instructions">How to Export from Vyapaar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Party Report</p>
              <p className="text-muted-foreground">
                Go to Reports → Party Report → Export to Excel
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Sale Report</p>
              <p className="text-muted-foreground">
                Go to Reports → Sale Report → Export to Excel
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Item Details Report</p>
              <p className="text-muted-foreground">
                Go to Reports → Item Details → Export to Excel
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Credit Notes Report</p>
              <p className="text-muted-foreground">
                Go to Reports → Credit Notes → Custom Report → Export to Excel (include Item Details)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
