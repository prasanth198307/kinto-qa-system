import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MachineType } from "@shared/schema";

export default function AdminMachineTypeConfig() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const { toast } = useToast();

  const { data: machineTypes = [], isLoading } = useQuery<MachineType[]>({
    queryKey: ['/api/machine-types'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/machine-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-types'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Machine type added",
        description: "New machine type has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add machine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest('PATCH', `/api/machine-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-types'] });
      setIsEditDialogOpen(false);
      setEditingType(null);
      resetForm();
      toast({
        title: "Machine type updated",
        description: "Machine type has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update machine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/machine-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-types'] });
      toast({
        title: "Machine type deleted",
        description: "Machine type has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete machine type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const handleAddClick = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (type: MachineType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this machine type?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-title">Machine Type Configuration</h2>
        <Button onClick={handleAddClick} data-testid="button-add-machine-type">
          <Plus className="h-4 w-4 mr-1" />
          Add Machine Type
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading machine types...</p>
        </Card>
      ) : machineTypes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No machine types yet. Add your first machine type to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {machineTypes.map((type, index) => (
            <Card key={type.id} className="p-4" data-testid={`card-machine-type-${index}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-sm" data-testid={`text-type-name-${index}`}>{type.name}</h3>
                  {type.description && <p className="text-xs text-muted-foreground mt-1">{type.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {type.isActive === 'true' ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(type)}
                    data-testid={`button-edit-type-${index}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(type.id)}
                    data-testid={`button-delete-type-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-machine-type">
          <DialogHeader>
            <DialogTitle>Add New Machine Type</DialogTitle>
            <DialogDescription>
              Add a new machine type to the system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Machine Type Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Labeling Machine"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-type-name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the machine type"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="textarea-type-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-machine-type">
                {createMutation.isPending ? 'Adding...' : 'Add Machine Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-machine-type">
          <DialogHeader>
            <DialogTitle>Edit Machine Type</DialogTitle>
            <DialogDescription>
              Update machine type information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Machine Type Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Labeling Machine"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-edit-type-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Brief description of the machine type"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="textarea-edit-type-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-machine-type">
                {updateMutation.isPending ? 'Updating...' : 'Update Machine Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
