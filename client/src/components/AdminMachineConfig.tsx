import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import type { Machine, MachineType } from "@shared/schema";

export default function AdminMachineConfig() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMachineId, setDeletingMachineId] = useState<string | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    warmupTimeMinutes: 0,
    status: 'active' as const
  });
  const { toast } = useToast();

  const { data: machines = [], isLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: machineTypes = [] } = useQuery<MachineType[]>({
    queryKey: ['/api/machine-types'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/machines', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Machine added",
        description: "New machine has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add machine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest('PATCH', `/api/machines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      setIsEditDialogOpen(false);
      setEditingMachine(null);
      resetForm();
      toast({
        title: "Machine updated",
        description: "Machine has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update machine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      setIsDeleteDialogOpen(false);
      setDeletingMachineId(null);
      toast({
        title: "Machine deleted",
        description: "Machine has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete machine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      location: '',
      warmupTimeMinutes: 0,
      status: 'active'
    });
  };

  const handleAddClick = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      type: machine.type,
      location: machine.location || '',
      warmupTimeMinutes: machine.warmupTimeMinutes || 0,
      status: (machine.status || 'active') as 'active'
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMachine) {
      updateMutation.mutate({ id: editingMachine.id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingMachineId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingMachineId) {
      deleteMutation.mutate(deletingMachineId);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingMachineId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-title">Machine Configuration</h2>
        <Button onClick={handleAddClick} data-testid="button-add-machine">
          <Plus className="h-4 w-4 mr-1" />
          Add Machine
        </Button>
      </div>

      {machines.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No machines configured yet. Add your first machine to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {machines.map((machine, index) => (
            <Card key={machine.id} className="p-4" data-testid={`card-machine-${index}`}>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm" data-testid={`text-machine-name-${index}`}>{machine.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Type: {machine.type}</p>
                  {machine.location && <p className="text-xs text-muted-foreground">Location: {machine.location}</p>}
                  <p className="text-xs text-muted-foreground">
                    Warmup Time: {machine.warmupTimeMinutes || 0} minutes
                    {(machine.warmupTimeMinutes || 0) === 0 && <span className="text-green-600 ml-1">(Ready instantly)</span>}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(machine)}
                    data-testid={`button-edit-${index}`}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(machine.id)}
                    data-testid={`button-delete-${index}`}
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
        <DialogContent data-testid="dialog-add-machine">
          <DialogHeader>
            <DialogTitle>Add New Machine</DialogTitle>
            <DialogDescription>
              Add a new machine to your production floor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Machine Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., RFC Machine 01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-machine-name"
                />
              </div>
              <div>
                <Label htmlFor="type">Machine Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
                  <SelectTrigger data-testid="select-machine-type">
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.filter(t => t.isActive === 'true').map((type) => (
                      <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Production Line A"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  data-testid="input-machine-location"
                />
              </div>
              <div>
                <Label htmlFor="warmup">Warmup Time Before Production (Minutes)</Label>
                <Input
                  id="warmup"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.warmupTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, warmupTimeMinutes: parseInt(e.target.value) || 0 })}
                  data-testid="input-warmup-time"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long before production should this machine be started? (0 = can start directly)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-machine">
                {createMutation.isPending ? 'Adding...' : 'Add Machine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-machine">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
            <DialogDescription>
              Update machine information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Machine Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., RFC Machine 01"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-edit-machine-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Machine Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
                  <SelectTrigger data-testid="select-edit-machine-type">
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.filter(t => t.isActive === 'true').map((type) => (
                      <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-location">Location (Optional)</Label>
                <Input
                  id="edit-location"
                  placeholder="e.g., Production Line A"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  data-testid="input-edit-machine-location"
                />
              </div>
              <div>
                <Label htmlFor="edit-warmup">Warmup Time Before Production (Minutes)</Label>
                <Input
                  id="edit-warmup"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.warmupTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, warmupTimeMinutes: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-warmup-time"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long before production should this machine be started? (0 = can start directly)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-machine">
                {updateMutation.isPending ? 'Updating...' : 'Update Machine'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        onConfirm={confirmDelete}
        title="Delete Machine?"
        description="This action cannot be undone. This will permanently delete the machine from the system."
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
