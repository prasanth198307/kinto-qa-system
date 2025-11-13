import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ProductType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  isActive: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductTypes() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    displayOrder: "",
    isActive: true,
  });

  const { data: types, isLoading } = useQuery<ProductType[]>({
    queryKey: ['/api/product-types'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/product-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-types'] });
      toast({ title: "Product type created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create product type", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/product-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-types'] });
      toast({ title: "Product type updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update product type", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/product-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-types'] });
      toast({ title: "Product type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product type", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      displayOrder: "",
      isActive: true,
    });
    setEditingType(null);
  };

  const handleCreate = () => {
    createMutation.mutate({
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
      isActive: formData.isActive ? 'true' : 'false',
    });
  };

  const handleEdit = (type: ProductType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || "",
      displayOrder: type.displayOrder?.toString() || "",
      isActive: type.isActive === 'true',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingType) return;
    updateMutation.mutate({
      id: editingType.id,
      data: {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
        isActive: formData.isActive ? 'true' : 'false',
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product type?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Types</h1>
            <p className="text-muted-foreground mt-1">
              Manage product types and classifications
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-type">
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Types</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !types || types.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product types found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {types
                  .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999))
                  .map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`type-item-${type.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{type.name}</h3>
                          <span className="text-sm text-muted-foreground">({type.code})</span>
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Order: {type.displayOrder || 'N/A'}</span>
                          <span className={type.isActive === 'true' ? "text-green-600" : "text-red-600"}>
                            {type.isActive === 'true' ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(type)}
                          data-testid={`button-edit-${type.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(type.id)}
                          data-testid={`button-delete-${type.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent data-testid="dialog-create-type">
            <DialogHeader>
              <DialogTitle>Create Product Type</DialogTitle>
              <DialogDescription>
                Add a new product type for classification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Type Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., PT-001, RAWMAT"
                  data-testid="input-type-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Type Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Raw Material, Finished Good"
                  data-testid="input-type-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  data-testid="input-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  placeholder="Order number for sorting"
                  data-testid="input-display-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.code || !formData.name || createMutation.isPending}
                data-testid="button-save-type"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent data-testid="dialog-edit-type">
            <DialogHeader>
              <DialogTitle>Edit Product Type</DialogTitle>
              <DialogDescription>
                Update product type details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Type Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  data-testid="input-edit-type-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Type Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-edit-type-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-edit-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayOrder">Display Order</Label>
                <Input
                  id="edit-displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  data-testid="input-edit-display-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Active</Label>
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-edit-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.code || !formData.name || updateMutation.isPending}
                data-testid="button-update-type"
              >
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
