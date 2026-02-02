import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, ChevronRight, Edit, Trash2, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SparePartCatalog, Machine, MachineSpare } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface MachineWithSpares extends Machine {
  spareParts: (SparePartCatalog & { machineSpareId?: string; recommendedQuantity?: number })[];
}

export default function MachineSpareEntryView() {
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [editingSpare, setEditingSpare] = useState<SparePartCatalog | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSpareId, setDeletingSpareId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    category: '',
    unitPrice: '',
    reorderThreshold: '',
    currentStock: '',
    recommendedQuantity: '1'
  });
  const { toast } = useToast();

  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: spareParts = [], isLoading: sparesLoading } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: machineSpares = [] } = useQuery<MachineSpare[]>({
    queryKey: ['/api/machine-spares'],
  });

  const createSpareMutation = useMutation({
    mutationFn: async (data: { partName: string; partNumber?: string; category?: string; machineId: string; unitPrice?: number; reorderThreshold?: number; currentStock?: number }) => {
      return await apiRequest('POST', '/api/spare-parts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machine-spares'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Spare part added",
        description: "New spare part has been added to the machine.",
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

  const updateSpareMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SparePartCatalog> }) => {
      return await apiRequest('PATCH', `/api/spare-parts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsEditDialogOpen(false);
      setEditingSpare(null);
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

  const deleteSpareMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/spare-parts/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingSpareId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machine-spares'] });
      toast({
        title: "Spare part deleted",
        description: "Spare part has been removed successfully.",
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

  const resetForm = () => {
    setFormData({
      partName: '',
      partNumber: '',
      category: '',
      unitPrice: '',
      reorderThreshold: '',
      currentStock: '',
      recommendedQuantity: '1'
    });
  };

  const toggleMachine = (machineId: string) => {
    setExpandedMachines(prev => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  const handleAddSpare = (machineId: string) => {
    setSelectedMachineId(machineId);
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditSpare = (spare: SparePartCatalog) => {
    setEditingSpare(spare);
    setFormData({
      partName: spare.partName || '',
      partNumber: spare.partNumber || '',
      category: spare.category || '',
      unitPrice: spare.unitPrice?.toString() || '',
      reorderThreshold: spare.reorderThreshold?.toString() || '',
      currentStock: spare.currentStock?.toString() || '',
      recommendedQuantity: '1'
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteSpare = (id: string) => {
    setDeletingSpareId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingSpareId) {
      deleteSpareMutation.mutate(deletingSpareId);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parseNumber = (val: string) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val.trim(), 10);
      return isNaN(num) ? undefined : num;
    };

    const data = {
      partName: formData.partName.trim(),
      partNumber: formData.partNumber?.trim() || undefined,
      category: formData.category?.trim() || undefined,
      machineId: selectedMachineId,
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

    createSpareMutation.mutate(data);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpare) return;

    const parseNumber = (val: string) => {
      if (!val || val.trim() === '') return undefined;
      const num = parseInt(val.trim(), 10);
      return isNaN(num) ? undefined : num;
    };

    const data = {
      partName: formData.partName.trim(),
      partNumber: formData.partNumber?.trim() || undefined,
      category: formData.category?.trim() || undefined,
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

    updateSpareMutation.mutate({ id: editingSpare.id, data });
  };

  const getMachineSpares = (machineId: string): SparePartCatalog[] => {
    return spareParts.filter(sp => sp.machineId === machineId);
  };

  const getUnassignedSpares = (): SparePartCatalog[] => {
    return spareParts.filter(sp => !sp.machineId);
  };

  const isLoading = machinesLoading || sparesLoading;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  const categories = ['Bearing', 'Belt', 'Motor', 'Sensor', 'Valve', 'Filter', 'Seal', 'Electrical', 'Pneumatic', 'Other'];

  return (
    <div className="space-y-3">
        {machines.map(machine => {
          const machineSparesList = getMachineSpares(machine.id);
          const isExpanded = expandedMachines.has(machine.id);

          return (
            <Card key={machine.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => toggleMachine(machine.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base" data-testid={`text-machine-name-${machine.id}`}>
                          {machine.name}
                        </CardTitle>
                        <Badge variant="secondary" className="ml-2">
                          {machineSparesList.length} spare{machineSparesList.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSpare(machine.id);
                        }}
                        data-testid={`button-add-spare-${machine.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {machineSparesList.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No spare parts assigned to this machine yet.
                      </p>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2 font-medium">Part Name</th>
                              <th className="text-left p-2 font-medium">Part No.</th>
                              <th className="text-left p-2 font-medium">Category</th>
                              <th className="text-right p-2 font-medium">Stock</th>
                              <th className="text-right p-2 font-medium">Reorder</th>
                              <th className="text-right p-2 font-medium">Unit Price</th>
                              <th className="text-center p-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {machineSparesList.map(spare => (
                              <tr key={spare.id} className="border-t" data-testid={`row-spare-${spare.id}`}>
                                <td className="p-2">{spare.partName}</td>
                                <td className="p-2 text-muted-foreground">{spare.partNumber || '-'}</td>
                                <td className="p-2">
                                  {spare.category && (
                                    <Badge variant="outline" className="text-xs">{spare.category}</Badge>
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  <span className={spare.currentStock !== null && spare.reorderThreshold !== null && spare.currentStock <= spare.reorderThreshold ? 'text-destructive font-medium' : ''}>
                                    {spare.currentStock ?? 0}
                                  </span>
                                </td>
                                <td className="p-2 text-right text-muted-foreground">{spare.reorderThreshold ?? '-'}</td>
                                <td className="p-2 text-right">
                                  {spare.unitPrice ? `₹${(spare.unitPrice / 100).toFixed(2)}` : '-'}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleEditSpare(spare)}
                                      data-testid={`button-edit-spare-${spare.id}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteSpare(spare.id)}
                                      data-testid={`button-delete-spare-${spare.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {getUnassignedSpares().length > 0 && (
          <Card className="overflow-hidden border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-muted-foreground">Unassigned Spare Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Part Name</th>
                      <th className="text-left p-2 font-medium">Part No.</th>
                      <th className="text-left p-2 font-medium">Category</th>
                      <th className="text-right p-2 font-medium">Stock</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUnassignedSpares().map(spare => (
                      <tr key={spare.id} className="border-t">
                        <td className="p-2">{spare.partName}</td>
                        <td className="p-2 text-muted-foreground">{spare.partNumber || '-'}</td>
                        <td className="p-2">
                          {spare.category && (
                            <Badge variant="outline" className="text-xs">{spare.category}</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">{spare.currentStock ?? 0}</td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditSpare(spare)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSpare(spare.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Spare Part</DialogTitle>
            <DialogDescription>
              Add a new spare part to {machines.find(m => m.id === selectedMachineId)?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="partName">Part Name *</Label>
                <Input
                  id="partName"
                  value={formData.partName}
                  onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                  placeholder="Enter part name"
                  data-testid="input-part-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number</Label>
                  <Input
                    id="partNumber"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="e.g., BRG-001"
                    data-testid="input-part-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStock">Opening Stock *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="0"
                    data-testid="input-current-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderThreshold">Reorder Level</Label>
                  <Input
                    id="reorderThreshold"
                    type="number"
                    min="0"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                    placeholder="5"
                    data-testid="input-reorder-threshold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSpareMutation.isPending} data-testid="button-submit-add">
                {createSpareMutation.isPending ? 'Adding...' : 'Add Spare Part'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Spare Part</DialogTitle>
            <DialogDescription>
              Update spare part details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editPartName">Part Name *</Label>
                <Input
                  id="editPartName"
                  value={formData.partName}
                  onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                  placeholder="Enter part name"
                  data-testid="input-edit-part-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPartNumber">Part Number</Label>
                  <Input
                    id="editPartNumber"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="e.g., BRG-001"
                    data-testid="input-edit-part-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editCurrentStock">Opening Stock *</Label>
                  <Input
                    id="editCurrentStock"
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="0"
                    data-testid="input-edit-current-stock"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editReorderThreshold">Reorder Level</Label>
                  <Input
                    id="editReorderThreshold"
                    type="number"
                    min="0"
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                    placeholder="5"
                    data-testid="input-edit-reorder-threshold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSpareMutation.isPending} data-testid="button-submit-edit">
                {updateSpareMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Spare Part"
        description="Are you sure you want to delete this spare part? This action cannot be undone."
      />
    </div>
  );
}
