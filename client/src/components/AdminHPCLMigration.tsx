import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Eye, Play, CheckCircle, XCircle, AlertTriangle, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PreviewData {
  totalHPPaniVendors: number;
  alreadyMigrated: number;
  toMigrate: number;
  hpclCorporate: {
    vendorName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber: string;
  };
  vendorsToMigrate: Array<{
    vendorCode: string;
    currentName: string;
    currentAddress: string;
    currentGst: string;
    willBecome: {
      shipToName: string;
      shipToAddress: string;
    };
  }>;
}

interface MigrationResult {
  success: boolean;
  message: string;
  totalVendors: number;
  migratedCount: number;
  hpclCorporate: {
    vendorName: string;
    gstNumber: string;
  };
  migrationLog: Array<{
    vendorCode: string;
    originalName?: string;
    vendorName?: string;
    originalGst?: string;
    status: string;
    reason?: string;
    newShipTo?: string;
  }>;
}

export default function AdminHPCLMigration() {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/preview-hpcl-migration');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to preview migration');
      }
      return response.json();
    },
    onSuccess: (data: PreviewData) => {
      setPreviewData(data);
      setMigrationResult(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/migrate-hpcl-vendors');
      return response.json() as Promise<MigrationResult>;
    },
    onSuccess: (data: MigrationResult) => {
      setMigrationResult(data);
      setPreviewData(null);
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${data.migratedCount} vendors`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Migration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">HPCL Vendor Migration</h2>
          <p className="text-muted-foreground">
            Migrate HPPani vendors to use HPCL corporate billing with ship-to addresses
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            HPCL Corporate Details
          </CardTitle>
          <CardDescription>
            All HPPani vendors will be updated to bill from this corporate entity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Vendor Name:</span>
              <p className="text-muted-foreground">VISAKH RETAIL RO Petronilayam, HPCL</p>
            </div>
            <div>
              <span className="font-medium">GSTIN:</span>
              <p className="text-muted-foreground">37AAACH1118B1ZB</p>
            </div>
            <div>
              <span className="font-medium">Address:</span>
              <p className="text-muted-foreground">Opp AU IN Gate, China Waltair, Visakhapatnam</p>
            </div>
            <div>
              <span className="font-medium">Location:</span>
              <p className="text-muted-foreground">Visakhapatnam, Andhra Pradesh - 530003</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending || migrateMutation.isPending}
          variant="outline"
          data-testid="button-preview-migration"
        >
          {previewMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          Preview Migration
        </Button>

        <Button
          onClick={() => migrateMutation.mutate()}
          disabled={migrateMutation.isPending || previewMutation.isPending}
          variant="default"
          data-testid="button-execute-migration"
        >
          {migrateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Execute Migration
        </Button>
      </div>

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Preview</CardTitle>
            <CardDescription>
              Review the vendors that will be migrated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{previewData.totalHPPaniVendors}</Badge>
                <span className="text-sm">Total HPPani Vendors</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{previewData.toMigrate}</Badge>
                <span className="text-sm">To Migrate</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{previewData.alreadyMigrated}</Badge>
                <span className="text-sm">Already Migrated</span>
              </div>
            </div>

            {previewData.toMigrate === 0 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>All vendors already migrated</AlertTitle>
                <AlertDescription>
                  There are no vendors left to migrate.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Current Name</th>
                      <th className="text-left p-2">Current GST</th>
                      <th className="text-left p-2">Will Become Ship-To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.vendorsToMigrate.slice(0, 20).map((vendor, idx) => (
                      <tr key={vendor.vendorCode} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="p-2 font-mono text-xs">{vendor.vendorCode}</td>
                        <td className="p-2">{vendor.currentName}</td>
                        <td className="p-2 font-mono text-xs">{vendor.currentGst || '-'}</td>
                        <td className="p-2 text-muted-foreground">{vendor.willBecome.shipToName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.vendorsToMigrate.length > 20 && (
                  <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                    ... and {previewData.vendorsToMigrate.length - 20} more vendors
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {migrationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Migration Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={migrationResult.success ? "default" : "destructive"}>
              <AlertTitle>{migrationResult.message}</AlertTitle>
              <AlertDescription>
                {migrationResult.migratedCount} of {migrationResult.totalVendors} vendors processed
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Vendor Code</th>
                    <th className="text-left p-2">Original Name</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {migrationResult.migrationLog.slice(0, 30).map((log, idx) => (
                    <tr key={log.vendorCode} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-2 font-mono text-xs">{log.vendorCode}</td>
                      <td className="p-2">{log.originalName || log.vendorName}</td>
                      <td className="p-2">
                        {log.status === 'migrated' ? (
                          <Badge variant="default">Migrated</Badge>
                        ) : (
                          <Badge variant="secondary">Skipped</Badge>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {log.reason || (log.newShipTo ? `Ship-To: ${log.newShipTo}` : '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {migrationResult.migrationLog.length > 30 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                  ... and {migrationResult.migrationLog.length - 30} more entries
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>What this migration does</AlertTitle>
        <AlertDescription className="text-sm space-y-1">
          <p>1. Moves current vendor name, address, and GST to <strong>Ship-To</strong> fields</p>
          <p>2. Sets main vendor details to HPCL corporate (for billing/invoicing)</p>
          <p>3. Only affects vendors where HPPani is the <strong>primary</strong> vendor type</p>
          <p>4. Skips vendors that have already been migrated</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
