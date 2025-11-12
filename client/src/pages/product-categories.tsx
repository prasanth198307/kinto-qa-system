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

interface ProductCategory {
  id: string;
  categoryName: string;
  description: string | null;
  isActive: number;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProductCategories() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  const [formData, setFormData] = useState({
    categoryName: "",
    description: "",
    isActive: true,
    displayOrder: "",
  });

  const { data: categories, isLoading } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/product-categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({ title: "Product category created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create product category", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/product-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({ title: "Product category updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update product category", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/product-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({ title: "Product category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product category", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      categoryName: "",
      description: "",
      isActive: true,
      displayOrder: "",
    });
    setEditingCategory(null);
  };

  const handleCreate = () => {
    createMutation.mutate({
      categoryName: formData.categoryName,
      description: formData.description || null,
      isActive: formData.isActive ? 1 : 0,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
    });
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      categoryName: category.categoryName,
      description: category.description || "",
      isActive: category.isActive === 1,
      displayOrder: category.displayOrder?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingCategory) return;
    updateMutation.mutate({
      id: editingCategory.id,
      data: {
        categoryName: formData.categoryName,
        description: formData.description || null,
        isActive: formData.isActive ? 1 : 0,
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product category?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Categories</h1>
            <p className="text-muted-foreground mt-1">
              Manage product categories and their organization
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !categories || categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product categories found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {categories
                  .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999))
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`category-item-${category.id}`}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{category.categoryName}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Order: {category.displayOrder || 'N/A'}</span>
                          <span className={category.isActive === 1 ? "text-green-600" : "text-red-600"}>
                            {category.isActive === 1 ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                          data-testid={`button-edit-${category.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                          data-testid={`button-delete-${category.id}`}
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

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent data-testid="dialog-create-category">
            <DialogHeader>
              <DialogTitle>Create Product Category</DialogTitle>
              <DialogDescription>
                Add a new product category to organize your products
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input
                  id="categoryName"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  placeholder="e.g., Electronics, Furniture"
                  data-testid="input-category-name"
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
                  placeholder="Order number"
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
                disabled={!formData.categoryName || createMutation.isPending}
                data-testid="button-save-category"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent data-testid="dialog-edit-category">
            <DialogHeader>
              <DialogTitle>Edit Product Category</DialogTitle>
              <DialogDescription>
                Update product category details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-categoryName">Category Name *</Label>
                <Input
                  id="edit-categoryName"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  data-testid="input-edit-category-name"
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
                disabled={!formData.categoryName || updateMutation.isPending}
                data-testid="button-update-category"
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
