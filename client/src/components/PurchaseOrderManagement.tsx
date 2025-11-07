import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PurchaseOrder, SparePartCatalog } from "@shared/schema";
import { Package, AlertTriangle, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";
import PrintablePurchaseOrder from "@/components/PrintablePurchaseOrder";

export default function PurchaseOrderManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSparePartId, setSelectedSparePartId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const { toast } = useToast();

  const { data: purchaseOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/purchase-orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      resetForm();
      setIsCreateDialogOpen(false);
      toast({
        title: "Purchase Order Created",
        description: "Purchase order has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/purchase-orders/${id}`, {});
    },
    onSuccess: () => {
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

  const resetForm = () => {
    setSelectedSparePartId('');
    setQuantity('');
    setUrgencyLevel('medium');
  };

  const handleCreatePO = () => {
    if (!selectedSparePartId || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please select a spare part and enter quantity.",
        variant: "destructive",
      });
      return;
    }

    const quantityNum = Number(quantity);
    if (!Number.isInteger(quantityNum) || quantityNum < 1) {
      toast({
        title: "Validation Error",
        description: "Quantity must be a positive integer.",
        variant: "destructive",
      });
      return;
    }

    const sparePart = spareParts.find(sp => sp.id === selectedSparePartId);
    if (!sparePart) return;

    const data = {
      sparePartId: selectedSparePartId,
      quantity: quantityNum,
      urgency: urgencyLevel,
      status: 'pending',
      estimatedCost: (sparePart.unitPrice || 0) * quantityNum
    };

    createPOMutation.mutate(data);
  };

  const handleDeletePO = (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      deletePOMutation.mutate(id);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Purchase Order Management</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-po">
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
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm" data-testid={`low-stock-item-${item.id}`}>
                    <span className="font-medium">{item.partName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        Stock: {item.currentStock} / Threshold: {item.reorderThreshold}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSparePartId(item.id);
                          setUrgencyLevel('high');
                          setIsCreateDialogOpen(true);
                        }}
                        data-testid={`button-create-po-for-${item.id}`}
                      >
                        Create PO
                      </Button>
                    </div>
                  </div>
                ))}
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
          </Card>
        ) : (
          <div className="space-y-3">
            {purchaseOrders.map((po) => {
              const sparePart = spareParts.find(sp => sp.id === po.sparePartId);
              return (
                <Card key={po.id} className="p-4" data-testid={`card-po-${po.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{sparePart?.partName || 'Unknown Part'}</h4>
                        {getStatusBadge(po.status || 'pending')}
                        {getUrgencyBadge(po.urgency || 'medium')}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Quantity: {po.quantity}</p>
                        <p>Estimated Cost: ${po.estimatedCost?.toFixed(2) || '0.00'}</p>
                        {po.createdAt && <p>Order Date: {new Date(po.createdAt).toLocaleDateString()}</p>}
                        {po.expectedDeliveryDate && <p>Expected Delivery: {new Date(po.expectedDeliveryDate).toLocaleDateString()}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
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

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-po">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for spare parts that need to be reordered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="spare-part">Spare Part *</Label>
              <Select value={selectedSparePartId} onValueChange={setSelectedSparePartId}>
                <SelectTrigger data-testid="select-spare-part">
                  <SelectValue placeholder="Select a spare part" />
                </SelectTrigger>
                <SelectContent>
                  {spareParts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      <div className="flex items-center gap-2">
                        <span>{part.partName}
                        {part.partNumber && ` (${part.partNumber})`}</span>
                        {part.currentStock !== null && part.currentStock !== undefined && part.reorderThreshold && part.currentStock < part.reorderThreshold && 
                          <AlertTriangle className="h-3 w-3 text-orange-600" data-testid="icon-low-stock-alert" />
                        }
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-quantity"
              />
            </div>

            <div>
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={urgencyLevel} onValueChange={(value: any) => setUrgencyLevel(value)}>
                <SelectTrigger data-testid="select-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedSparePartId && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Estimated Cost</p>
                <p className="text-2xl font-bold">
                  ${((spareParts.find(sp => sp.id === selectedSparePartId)?.unitPrice || 0) * (Number(quantity) || 0)).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={createPOMutation.isPending} data-testid="button-submit-po">
              {createPOMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
