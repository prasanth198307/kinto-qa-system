import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SparePartCatalog, Machine, MachineSpare } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminSparePartsManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePartCatalog | null>(null);
  const [selectedPartForMachines, setSelectedPartForMachines] = useState<SparePartCatalog | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    category: '',
    machineId: '',
    unitPrice: '',
    reorderThreshold: '',
    currentStock: ''
  });
  const { toast } = useToast();

  const { data: spareParts = [], isLoading } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }) => {
      return await apiRequest('POST', '/api/spare-parts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Spare part added",
        description: "New spare part has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add spare part. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ partName: string; partNumber?: string; category?: string; machineId?: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }> }) => {
      return await apiRequest('PATCH', `/api/spare-parts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsEditDialogOpen(false);
      setEditingSparePart(null);
      resetForm();
      toast({
        title: "Spare part updated",
        description: "Spare part has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update spare part. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/spare-parts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      toast({
        title: "Spare part deleted",
        description: "Spare part has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete spare part. Please try again.",
        variant: "destructive",
      });
    },
  });

  const assignMachineMutation = useMutation({
    mutationFn: async ({ sparePartId, machineId }: { sparePartId: string; machineId: string }) => {
      return await apiRequest('POST', '/api/machine-spares', { sparePartId, machineId, urgencyLevel: 'medium' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign machine to spare part.",
        variant: "destructive",
      });
    },
  });

  const unassignMachineMutation = useMutation({
    mutationFn: async (machineSpareId: string) => {
      return await apiRequest('DELETE', `/api/machine-spares/${machineSpareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unassign machine from spare part.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      partName: '',
      partNumber: '',
      category: '',
      machineId: '',
      unitPrice: '',
      reorderThreshold: '',
      currentStock: ''
    });
  };

  // Reset form when editing specific item
  useEffect(() => {
    if (isEditDialogOpen && editingSparePart) {
      setFormData({
        partName: editingSparePart.partName,
        partNumber: editingSparePart.partNumber || '',
        category: editingSparePart.category || '',
        machineId: editingSparePart.machineId || '',
        unitPrice: editingSparePart.unitPrice?.toString() || '',
        reorderThreshold: editingSparePart.reorderThreshold?.toString() || '',
        currentStock: editingSparePart.currentStock?.toString() || ''
      });
    }
  }, [editingSparePart]);

  // Reset form when opening add dialog
  useEffect(() => {
    if (isAddDialogOpen) {
      resetForm();
    }
  }, [isAddDialogOpen]);

  const handleAddClick = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (sparePart: SparePartCatalog) => {
    setEditingSparePart(sparePart);
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse numeric fields safely
    const parseNumber = (val: string) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val.trim(), 10);
      return isNaN(num) ? undefined : num;
    };
    
    const data = {
      partName: formData.partName.trim(),
      partNumber: formData.partNumber?.trim() || undefined,
      category: formData.category?.trim() || undefined,
      machineId: formData.machineId?.trim() || undefined,
      unitPrice: parseNumber(formData.unitPrice),
      reorderThreshold: parseNumber(formData.reorderThreshold),
      currentStock: parseNumber(formData.currentStock),
    };
    
    if (!data.partName) {
      toast({
        title: "Validation Error",
        description: "Part name is required.",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSparePart) {
      // Parse numeric fields safely
      const parseNumber = (val: string) => {
        if (!val || val.trim() === '') return undefined;
        const num = parseInt(val.trim(), 10);
        return isNaN(num) ? undefined : num;
      };
      
      const data = {
        partName: formData.partName.trim(),
        partNumber: formData.partNumber?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        machineId: formData.machineId?.trim() || undefined,
        unitPrice: parseNumber(formData.unitPrice),
        reorderThreshold: parseNumber(formData.reorderThreshold),
        currentStock: parseNumber(formData.currentStock),
      };
      
      if (!data.partName) {
        toast({
          title: "Validation Error",
          description: "Part name is required.",
          variant: "destructive",
        });
        return;
      }
      
      updateMutation.mutate({ id: editingSparePart.id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this spare part?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAssignMachines = async (part: SparePartCatalog) => {
    setSelectedPartForMachines(part);
    const response = await fetch(`/api/spare-parts/${part.id}/machines`);
    if (response.ok) {
      const machineSpares: MachineSpare[] = await response.json();
      setSelectedMachineIds(machineSpares.map(ms => ms.machineId));
    }
    setIsMachineDialogOpen(true);
  };

  const handleSaveMachineAssignments = async () => {
    if (!selectedPartForMachines) return;

    const response = await fetch(`/api/spare-parts/${selectedPartForMachines.id}/machines`);
    const currentMachineSpares: MachineSpare[] = response.ok ? await response.json() : [];
    
    const currentMachineIds = currentMachineSpares.map(ms => ms.machineId);
    const toAdd = selectedMachineIds.filter(id => !currentMachineIds.includes(id));
    const toRemove = currentMachineSpares.filter(ms => !selectedMachineIds.includes(ms.machineId));

    for (const machineId of toAdd) {
      await assignMachineMutation.mutateAsync({ sparePartId: selectedPartForMachines.id, machineId });
    }

    for (const machineSpare of toRemove) {
      await unassignMachineMutation.mutateAsync(machineSpare.id);
    }

    toast({
      title: "Machines assigned",
      description: "Machine assignments have been updated successfully.",
    });

    setIsMachineDialogOpen(false);
    setSelectedPartForMachines(null);
    setSelectedMachineIds([]);
  };

  const toggleMachine = (machineId: string) => {
    setSelectedMachineIds(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const filteredSpareParts = spareParts.filter(part =>
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h2 className="text-xl font-semibold" data-testid="text-title">Spare Parts Management</h2>
        <Button onClick={handleAddClick} data-testid="button-add-spare-part">
          <Plus className="h-4 w-4 mr-1" />
          Add Spare Part
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search spare parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {filteredSpareParts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No spare parts found matching your search.' : 'No spare parts yet. Add your first spare part to get started.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSpareParts.map((part, index) => {
            const isLowStock = part.reorderThreshold && part.currentStock !== null && part.currentStock <= part.reorderThreshold;
            return (
              <Card key={part.id} className="p-4" data-testid={`card-spare-part-${index}`}>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm" data-testid={`text-part-name-${index}`}>{part.partName}</h3>
                      {isLowStock && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Low Stock</Badge>
                      )}
                    </div>
                    {part.partNumber && <p className="text-xs text-muted-foreground mt-1">Part #: {part.partNumber}</p>}
                    {part.category && <p className="text-xs text-muted-foreground">Category: {part.category}</p>}
                    <div className="flex gap-4 mt-2 text-xs">
                      {part.unitPrice !== null && <span>Price: ₹{part.unitPrice}</span>}
                      {part.currentStock !== null && <span>Stock: {part.currentStock}</span>}
                      {part.reorderThreshold !== null && <span>Reorder at: {part.reorderThreshold}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(part)}
                      data-testid={`button-edit-${index}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAssignMachines(part)}
                      data-testid={`button-assign-machines-${index}`}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Machines
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(part.id)}
                      data-testid={`button-delete-${index}`}
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-spare-part">
          <DialogHeader>
            <DialogTitle>Add New Spare Part</DialogTitle>
            <DialogDescription>
              Add a new spare part to the inventory catalog.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="partName">Part Name</Label>
                <Input
                  id="partName"
                  placeholder="e.g., Conveyor Belt Motor"
                  value={formData.partName}
                  onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                  required
                  data-testid="input-part-name"
                />
              </div>
              <div>
                <Label htmlFor="partNumber">Part Number (Optional)</Label>
                <Input
                  id="partNumber"
                  placeholder="e.g., MOT-12345"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  data-testid="input-part-number"
                />
              </div>
              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  placeholder="e.g., Motors"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  data-testid="input-category"
                />
              </div>
              <div>
                <Label htmlFor="machineId">Machine (Optional)</Label>
                <Select value={formData.machineId} onValueChange={(value) => setFormData({ ...formData, machineId: value })}>
                  <SelectTrigger data-testid="select-machine">
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.status === 'active').map(machine => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    placeholder="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    data-testid="input-unit-price"
                  />
                </div>
                <div>
                  <Label htmlFor="currentStock">Current Stock</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    placeholder="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    data-testid="input-current-stock"
                  />
                </div>
                <div>
                  <Label htmlFor="reorderThreshold">Reorder At</Label>
                  <Input
                    id="reorderThreshold"
                    type="number"
                    placeholder="0"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                    data-testid="input-reorder-threshold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-spare-part">
                {createMutation.isPending ? 'Adding...' : 'Add Spare Part'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-spare-part">
          <DialogHeader>
            <DialogTitle>Edit Spare Part</DialogTitle>
            <DialogDescription>
              Update spare part information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-partName">Part Name</Label>
                <Input
                  id="edit-partName"
                  placeholder="e.g., Conveyor Belt Motor"
                  value={formData.partName}
                  onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                  required
                  data-testid="input-edit-part-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-partNumber">Part Number (Optional)</Label>
                <Input
                  id="edit-partNumber"
                  placeholder="e.g., MOT-12345"
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  data-testid="input-edit-part-number"
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category (Optional)</Label>
                <Input
                  id="edit-category"
                  placeholder="e.g., Motors"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  data-testid="input-edit-category"
                />
              </div>
              <div>
                <Label htmlFor="edit-machineId">Machine (Optional)</Label>
                <Select value={formData.machineId} onValueChange={(value) => setFormData({ ...formData, machineId: value })}>
                  <SelectTrigger data-testid="select-edit-machine">
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.status === 'active').map(machine => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="edit-unitPrice">Unit Price (₹)</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    placeholder="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    data-testid="input-edit-unit-price"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-currentStock">Current Stock</Label>
                  <Input
                    id="edit-currentStock"
                    type="number"
                    placeholder="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    data-testid="input-edit-current-stock"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-reorderThreshold">Reorder At</Label>
                  <Input
                    id="edit-reorderThreshold"
                    type="number"
                    placeholder="0"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                    data-testid="input-edit-reorder-threshold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-spare-part">
                {updateMutation.isPending ? 'Updating...' : 'Update Spare Part'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMachineDialogOpen} onOpenChange={setIsMachineDialogOpen}>
        <DialogContent data-testid="dialog-assign-machines">
          <DialogHeader>
            <DialogTitle>Assign Machines to Spare Part</DialogTitle>
            <DialogDescription>
              Select which machines use this spare part: {selectedPartForMachines?.partName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {machines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No machines available. Add machines first.</p>
            ) : (
              machines.map((machine) => (
                <div key={machine.id} className="flex items-center space-x-2 p-3 rounded-md hover-elevate">
                  <Checkbox
                    id={`machine-${machine.id}`}
                    checked={selectedMachineIds.includes(machine.id)}
                    onCheckedChange={() => toggleMachine(machine.id)}
                    data-testid={`checkbox-machine-${machine.id}`}
                  />
                  <label
                    htmlFor={`machine-${machine.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div>{machine.name}</div>
                    <div className="text-xs text-muted-foreground">{machine.type} - {machine.location}</div>
                  </label>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMachineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMachineAssignments} data-testid="button-save-machine-assignments">
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
