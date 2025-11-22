import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Tag, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface VendorType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: string;
  createdAt: string;
  updatedAt: string | null;
}

export default function VendorTypes() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingType, setEditingType] = useState<VendorType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<VendorType | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    typeCode: "",
    typeName: "",
    description: "",
    displayOrder: "",
    isActive: true,
  });

  const { data: types, isLoading } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/vendor-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-types'] });
      toast({ title: "Vendor type created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const message = error.message || "Failed to create vendor type";
      if (message.includes("unique") || message.includes("duplicate") || message.includes("already exists")) {
        setValidationErrors({ 
          typeCode: "This type code already exists",
          typeName: "This type name already exists"
        });
      }
      toast({ 
        title: "Failed to create vendor type", 
        description: message,
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/vendor-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-types'] });
      toast({ title: "Vendor type updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      const message = error.message || "Failed to update vendor type";
      if (message.includes("unique") || message.includes("duplicate") || message.includes("already exists")) {
        setValidationErrors({ 
          typeCode: "This type code already exists",
          typeName: "This type name already exists"
        });
      }
      toast({ 
        title: "Failed to update vendor type", 
        description: message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/vendor-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-types'] });
      toast({ 
        title: "Vendor type deactivated", 
        description: "The vendor type has been marked as inactive" 
      });
      setDeleteConfirmOpen(false);
      setTypeToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to deactivate vendor type", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
      setDeleteConfirmOpen(false);
      setTypeToDelete(null);
    }
  });

  const resetForm = () => {
    setFormData({
      typeCode: "",
      typeName: "",
      description: "",
      displayOrder: "",
      isActive: true,
    });
    setEditingType(null);
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const trimmedCode = formData.typeCode.trim();
    const trimmedName = formData.typeName.trim();

    if (!trimmedCode) {
      errors.typeCode = "Type code is required";
    } else if (types) {
      const duplicate = types.find(
        (t) => t.typeCode.toLowerCase() === trimmedCode.toLowerCase() && 
               (!editingType || t.id !== editingType.id)
      );
      if (duplicate) {
        errors.typeCode = "This type code already exists";
      }
    }

    if (!trimmedName) {
      errors.typeName = "Type name is required";
    } else if (types) {
      const duplicate = types.find(
        (t) => t.typeName.toLowerCase() === trimmedName.toLowerCase() && 
               (!editingType || t.id !== editingType.id)
      );
      if (duplicate) {
        errors.typeName = "This type name already exists";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm()) return;

    createMutation.mutate({
      typeCode: formData.typeCode.trim(),
      typeName: formData.typeName.trim(),
      description: formData.description.trim() || null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
      isActive: formData.isActive ? 'true' : 'false',
    });
  };

  const handleEdit = (type: VendorType) => {
    setEditingType(type);
    setFormData({
      typeCode: type.typeCode,
      typeName: type.typeName,
      description: type.description || "",
      displayOrder: type.displayOrder?.toString() || "",
      isActive: type.isActive === 'true',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingType) return;
    if (!validateForm()) return;

    updateMutation.mutate({
      id: editingType.id,
      data: {
        typeCode: formData.typeCode.trim(),
        typeName: formData.typeName.trim(),
        description: formData.description.trim() || null,
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : null,
        isActive: formData.isActive ? 'true' : 'false',
      }
    });
  };

  const handleDeleteClick = (type: VendorType) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (typeToDelete) {
      deleteMutation.mutate(typeToDelete.id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Tag className="h-8 w-8" />
              Vendor Types
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage vendor classifications based on product brands (Kinto, HPPani, Purejal)
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-vendor-type">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor Type
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Vendor Types</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !types || types.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No vendor types found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {types
                  .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999))
                  .map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                      data-testid={`vendor-type-item-${type.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{type.typeName}</h3>
                          <span className="text-sm text-muted-foreground">({type.typeCode})</span>
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
                          data-testid={`button-edit-vendor-type-${type.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(type)}
                          data-testid={`button-delete-vendor-type-${type.id}`}
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
          <DialogContent data-testid="dialog-create-vendor-type">
            <DialogHeader>
              <DialogTitle>Create Vendor Type</DialogTitle>
              <DialogDescription>
                Add a new vendor classification type
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeCode">Type Code *</Label>
                <Input
                  id="typeCode"
                  value={formData.typeCode}
                  onChange={(e) => {
                    setFormData({ ...formData, typeCode: e.target.value });
                    setValidationErrors({ ...validationErrors, typeCode: "" });
                  }}
                  placeholder="e.g., KINTO, HPPANI, PUREJAL"
                  className={validationErrors.typeCode ? "border-destructive" : ""}
                  data-testid="input-vendor-type-code"
                />
                {validationErrors.typeCode && (
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="error-vendor-type-code">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors.typeCode}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeName">Type Name *</Label>
                <Input
                  id="typeName"
                  value={formData.typeName}
                  onChange={(e) => {
                    setFormData({ ...formData, typeName: e.target.value });
                    setValidationErrors({ ...validationErrors, typeName: "" });
                  }}
                  placeholder="e.g., Kinto, HPPani, Purejal"
                  className={validationErrors.typeName ? "border-destructive" : ""}
                  data-testid="input-vendor-type-name"
                />
                {validationErrors.typeName && (
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="error-vendor-type-name">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors.typeName}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this vendor classification"
                  data-testid="input-vendor-type-description"
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
                  data-testid="input-vendor-type-display-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-vendor-type-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.typeCode || !formData.typeName || createMutation.isPending}
                data-testid="button-save-vendor-type"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent data-testid="dialog-edit-vendor-type">
            <DialogHeader>
              <DialogTitle>Edit Vendor Type</DialogTitle>
              <DialogDescription>
                Update vendor type details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-typeCode">Type Code *</Label>
                <Input
                  id="edit-typeCode"
                  value={formData.typeCode}
                  onChange={(e) => {
                    setFormData({ ...formData, typeCode: e.target.value });
                    setValidationErrors({ ...validationErrors, typeCode: "" });
                  }}
                  className={validationErrors.typeCode ? "border-destructive" : ""}
                  data-testid="input-edit-vendor-type-code"
                />
                {validationErrors.typeCode && (
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="error-edit-vendor-type-code">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors.typeCode}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-typeName">Type Name *</Label>
                <Input
                  id="edit-typeName"
                  value={formData.typeName}
                  onChange={(e) => {
                    setFormData({ ...formData, typeName: e.target.value });
                    setValidationErrors({ ...validationErrors, typeName: "" });
                  }}
                  className={validationErrors.typeName ? "border-destructive" : ""}
                  data-testid="input-edit-vendor-type-name"
                />
                {validationErrors.typeName && (
                  <div className="flex items-center gap-1 text-sm text-destructive" data-testid="error-edit-vendor-type-name">
                    <AlertCircle className="h-3 w-3" />
                    <span>{validationErrors.typeName}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-edit-vendor-type-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayOrder">Display Order</Label>
                <Input
                  id="edit-displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  data-testid="input-edit-vendor-type-display-order"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-isActive">Active</Label>
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-edit-vendor-type-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!formData.typeCode || !formData.typeName || updateMutation.isPending}
                data-testid="button-update-vendor-type"
              >
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent data-testid="dialog-confirm-delete-vendor-type">
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Vendor Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark "{typeToDelete?.typeName}" as inactive (soft delete). 
                The vendor type will not be permanently deleted and can be reactivated later 
                by editing it and toggling the Active switch.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-vendor-type">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover-elevate"
                data-testid="button-confirm-delete-vendor-type"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
