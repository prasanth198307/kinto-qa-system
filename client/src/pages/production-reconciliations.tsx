import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Eye, Edit, Calculator, Package, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ProductionReconciliationForm from "@/components/ProductionReconciliationForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProductionReconciliation {
  id: string;
  reconciliationNumber: string;
  issuanceId: string;
  productionEntryId?: string;
  reconciliationDate: string;
  shift: string;
  remarks?: string;
  editCount: number;
  createdAt: string;
  items?: any[];
}

export default function ProductionReconciliations() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<ProductionReconciliation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reconciliationToDelete, setReconciliationToDelete] = useState<ProductionReconciliation | null>(null);

  const { data: reconciliations = [], isLoading } = useQuery<ProductionReconciliation[]>({
    queryKey: ['/api/production-reconciliations'],
  });

  const { data: issuances = [] } = useQuery<any[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: productions = [] } = useQuery<any[]>({
    queryKey: ['/api/production-entries'],
  });

  const handleCreate = () => {
    setSelectedReconciliation(null);
    setViewMode('list');
    setDialogOpen(true);
  };

  const handleEdit = async (reconciliation: ProductionReconciliation) => {
    // Fetch full details including items
    const response = await fetch(`/api/production-reconciliations/${reconciliation.id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.error('Failed to fetch reconciliation details');
      return;
    }
    const fullData = await response.json();
    setSelectedReconciliation(fullData);
    setViewMode('list');
    setDialogOpen(true);
  };

  const handleView = async (reconciliation: ProductionReconciliation) => {
    // Fetch full details including items
    const response = await fetch(`/api/production-reconciliations/${reconciliation.id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      console.error('Failed to fetch reconciliation details');
      return;
    }
    const fullData = await response.json();
    setSelectedReconciliation(fullData);
    setViewMode('detail');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReconciliation(null);
    setViewMode('list');
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/production-reconciliations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete reconciliation');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production-reconciliations'] });
      toast({
        title: "Success",
        description: "Reconciliation deleted successfully",
      });
      setDeleteDialogOpen(false);
      setReconciliationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reconciliation",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (reconciliation: ProductionReconciliation) => {
    setReconciliationToDelete(reconciliation);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reconciliationToDelete) {
      deleteMutation.mutate(reconciliationToDelete.id);
    }
  };

  const getIssuanceNumber = (issuanceId: string) => {
    const issuance = issuances.find(i => i.id === issuanceId);
    return issuance?.issuanceNumber || issuanceId;
  };

  const getProductionInfo = (productionId?: string) => {
    if (!productionId) return null;
    const production = productions.find(p => p.id === productionId);
    return production;
  };

  const calculateNetConsumed = (used: number, returned: number, pending: number): number => {
    return used - returned - pending;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Reconciliation</h1>
          <p className="text-muted-foreground mt-1">
            End-of-day material usage reconciliation tracking
          </p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-reconciliation">
          <Plus className="mr-2 h-4 w-4" />
          Create Reconciliation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reconciliations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-reconciliations">
              {reconciliations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Reconciliations</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-reconciliations">
              {reconciliations.filter(r => 
                format(new Date(r.reconciliationDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shifts Covered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-shifts-covered">
              {new Set(reconciliations.map(r => r.shift)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Records</CardTitle>
          <CardDescription>
            View and manage material usage reconciliation entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reconciliations...</div>
          ) : reconciliations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Reconciliations Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first production reconciliation to start tracking material usage
              </p>
              <Button onClick={handleCreate} data-testid="button-create-first">
                <Plus className="mr-2 h-4 w-4" />
                Create First Reconciliation
              </Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reconciliation #</TableHead>
                    <TableHead>Issuance</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Production Entry</TableHead>
                    <TableHead>Edit Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((reconciliation) => {
                    const production = getProductionInfo(reconciliation.productionEntryId);
                    
                    return (
                      <TableRow key={reconciliation.id} data-testid={`row-reconciliation-${reconciliation.id}`}>
                        <TableCell className="font-medium">
                          {reconciliation.reconciliationNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getIssuanceNumber(reconciliation.issuanceId)}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(reconciliation.reconciliationDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Shift {reconciliation.shift}</Badge>
                        </TableCell>
                        <TableCell>
                          {production ? (
                            <div className="text-sm">
                              <div className="font-medium">{production.producedQuantity} units</div>
                              <div className="text-muted-foreground text-xs">
                                {format(new Date(production.productionDate), 'MMM dd')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={reconciliation.editCount >= 3 ? "destructive" : "default"}
                            data-testid={`badge-edit-count-${reconciliation.id}`}
                          >
                            {reconciliation.editCount || 0}/3
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(reconciliation)}
                              data-testid={`button-view-${reconciliation.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reconciliation)}
                              data-testid={`button-edit-${reconciliation.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reconciliation)}
                              data-testid={`button-delete-${reconciliation.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Create/Edit/View */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {viewMode === 'detail' && selectedReconciliation ? (
            <>
              <DialogHeader>
                <DialogTitle>Reconciliation Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Reconciliation #</div>
                    <div className="font-medium">{selectedReconciliation.reconciliationNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Issuance</div>
                    <div className="font-medium">{getIssuanceNumber(selectedReconciliation.issuanceId)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-medium">{format(new Date(selectedReconciliation.reconciliationDate), 'MMM dd, yyyy')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Shift</div>
                    <div className="font-medium">Shift {selectedReconciliation.shift}</div>
                  </div>
                </div>

                {selectedReconciliation.remarks && (
                  <div>
                    <div className="text-sm text-muted-foreground">Remarks</div>
                    <div className="text-sm">{selectedReconciliation.remarks}</div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Material Details</h3>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Returned</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead className="text-right">Net Consumed</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReconciliation.items?.map((item: any, index: number) => {
                          const netConsumed = calculateNetConsumed(
                            item.quantityUsed || 0,
                            item.quantityReturned || 0,
                            item.quantityPending || 0
                          );

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.rawMaterialId}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">{item.quantityIssued}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{item.quantityUsed || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{item.quantityReturned || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{item.quantityPending || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={netConsumed < 0 ? "destructive" : "default"}>
                                  {netConsumed}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {item.remarks || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setViewMode('list');
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Reconciliation
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <ProductionReconciliationForm
              reconciliation={selectedReconciliation}
              onClose={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reconciliation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete reconciliation{" "}
              <strong>{reconciliationToDelete?.reconciliationNumber}</strong>?
              This action cannot be undone. Note that this is a soft delete and the record will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
