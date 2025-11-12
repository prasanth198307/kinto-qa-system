import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import ProductionEntryForm from "@/components/ProductionEntryForm";

export default function ProductionEntries() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { data: productionEntries = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/production-entries'],
  });

  const handleCreate = () => {
    setSelectedEntry(null);
    setIsDialogOpen(true);
  };

  const handleView = (entry: any) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
  };

  const getShiftBadgeVariant = (shift: string) => {
    switch (shift) {
      case 'A':
        return 'default';
      case 'B':
        return 'secondary';
      case 'General':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Entries</h1>
          <p className="text-muted-foreground mt-1">
            Track actual production output and compare against raw material issuances
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-production-entry">
          <Plus className="mr-2 h-4 w-4" />
          New Production Entry
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Entries</div>
          <div className="text-3xl font-bold mt-2">{productionEntries.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Produced</div>
          <div className="text-3xl font-bold mt-2">
            {productionEntries.reduce((sum, entry) => sum + Number(entry.producedQuantity || 0), 0).toFixed(2)}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Rejected</div>
          <div className="text-3xl font-bold mt-2 text-destructive">
            {productionEntries.reduce((sum, entry) => sum + Number(entry.rejectedQuantity || 0), 0).toFixed(2)}
          </div>
        </Card>
      </div>

      {/* Production Entries Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Production Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Issuance</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Derived Units</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No production entries found. Create your first entry to get started.
                  </TableCell>
                </TableRow>
              ) : (
                productionEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-production-entry-${entry.id}`}>
                    <TableCell className="font-medium">
                      {new Date(entry.productionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getShiftBadgeVariant(entry.shift)} data-testid={`badge-shift-${entry.id}`}>
                        Shift {entry.shift}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.issuanceId}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Number(entry.producedQuantity || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {Number(entry.rejectedQuantity || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {entry.derivedUnits ? Number(entry.derivedUnits).toFixed(2) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(entry)}
                        data-testid={`button-view-${entry.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Production Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? "View Production Entry" : "Create Production Entry"}
            </DialogTitle>
          </DialogHeader>
          <ProductionEntryForm entry={selectedEntry} onClose={closeDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
