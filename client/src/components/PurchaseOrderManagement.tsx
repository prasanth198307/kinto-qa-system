import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, SparePartCatalog, Vendor } from "@shared/schema";
import { Package, AlertTriangle, CheckCircle, Clock, Plus, Trash2, Edit, ArrowLeft } from "lucide-react";
import PrintablePurchaseOrder from "@/components/PrintablePurchaseOrder";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import { format } from "date-fns";

type ViewMode = 'list' | 'create' | 'edit';

export default function PurchaseOrderManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPOId, setDeletingPOId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const deletePOMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/purchase-orders/${id}`, {});
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingPOId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Purchase Order Deleted",
        description: "Purchase order has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFormSuccess = () => {
    setViewMode('list');
    setEditingPO(null);
  };

  const handleFormCancel = () => {
    setViewMode('list');
    setEditingPO(null);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setViewMode('edit');
  };

  const handleDeletePO = (id: string) => {
    setDeletingPOId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingPOId) {
      deletePOMutation.mutate(deletingPOId);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingPOId(null);
    }
  };

  // Get low stock items (below reorder threshold)
  const lowStockItems = spareParts.filter(sp => 
    sp.reorderThreshold && sp.currentStock !== null && sp.currentStock !== undefined && sp.currentStock < sp.reorderThreshold
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'ordered':
        return <Badge className="bg-purple-500"><Package className="h-3 w-3 mr-1" />Ordered</Badge>;
      case 'received':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Received</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getUrgencyBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge>{level}</Badge>;
    }
  };

  const getVendorName = (vendorId: string | null | undefined) => {
    if (!vendorId) return 'Not Assigned';
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.vendorName || 'Unknown Vendor';
  };

  // Render create/edit form view
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleFormCancel}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to List
          </Button>
          <h2 className="text-xl font-semibold">
            {viewMode === 'create' ? 'Create Purchase Order' : 'Edit Purchase Order'}
          </h2>
        </div>

        <PurchaseOrderForm
          editingPO={editingPO}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  // Render list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Purchase Order Management</h2>
        <Button onClick={() => setViewMode('create')} data-testid="button-create-po">
          <Plus className="h-4 w-4 mr-1" />
          Create PO
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Low Stock Alert</h3>
              <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below reorder threshold
              </p>
              <div className="mt-3 space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm" data-testid={`low-stock-item-${item.id}`}>
                    <span className="font-medium">{item.partName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        Stock: {item.currentStock} / Threshold: {item.reorderThreshold}
                      </span>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {lowStockItems.length - 5} more items
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Purchase Orders List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Purchase Orders</h3>
        {purchaseOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No purchase orders yet</p>
            <Button 
              className="mt-4" 
              onClick={() => setViewMode('create')}
              data-testid="button-create-first-po"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Your First PO
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {purchaseOrders.map((po) => {
              const sparePart = spareParts.find(sp => sp.id === po.sparePartId);
              const grandTotal = po.grandTotal ? (po.grandTotal / 100).toFixed(2) : 
                (po.estimatedCost ? (po.estimatedCost / 100).toFixed(2) : '0.00');
              
              return (
                <Card key={po.id} className="p-4" data-testid={`card-po-${po.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{po.poNumber}</h4>
                        {getStatusBadge(po.status || 'pending')}
                        {getUrgencyBadge(po.urgency || 'medium')}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium">Vendor:</span> {getVendorName(po.vendorId)}</p>
                        <p><span className="font-medium">Spare Part:</span> {sparePart?.partName || 'Unknown Part'}</p>
                        <p><span className="font-medium">Quantity:</span> {po.quantity}</p>
                        <p><span className="font-medium">Grand Total:</span> ₹{grandTotal}</p>
                        {po.poDate && (
                          <p><span className="font-medium">PO Date:</span> {format(new Date(po.poDate), 'dd/MM/yyyy')}</p>
                        )}
                        {po.expectedDeliveryDate && (
                          <p><span className="font-medium">Expected Delivery:</span> {format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPO(po)}
                        data-testid={`button-edit-po-${po.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <PrintablePurchaseOrder po={po} />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePO(po.id)}
                        data-testid={`button-delete-po-${po.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        onConfirm={confirmDelete}
        title="Delete Purchase Order?"
        description="This action cannot be undone. This will permanently delete the purchase order from the system."
        isPending={deletePOMutation.isPending}
      />
    </div>
  );
}
