import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Vendor } from "@shared/schema";

interface VendorType {
  id: string;
  typeCode: string;
  typeName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: string;
}

interface VendorVendorType {
  id: string;
  vendorId: string;
  vendorTypeId: string;
  isPrimary: number;
  vendorType?: VendorType;
}

function VendorTypesBadges({ vendorId }: { vendorId: string }) {
  const { data: vendorTypes = [], isLoading } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendors', vendorId, 'types'],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${vendorId}/types`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Loading...</span>;
  }

  if (vendorTypes.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="flex gap-1 flex-wrap" data-testid={`vendor-types-${vendorId}`}>
      {vendorTypes.map((vt: any) => (
        <Badge
          key={vt.id}
          variant={vt.isPrimary === 1 ? "default" : "secondary"}
          className="text-xs"
          data-testid={`vendor-type-badge-${vt.vendorTypeId}`}
        >
          {vt.isPrimary === 1 && <Star className="h-2 w-2 mr-1 fill-current" />}
          {vt.vendorType?.typeName || vt.vendorType?.typeCode || 'Unknown'}
        </Badge>
      ))}
    </div>
  );
}

export default function VendorManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [selectedVendorTypes, setSelectedVendorTypes] = useState<string[]>([]);
  const [primaryVendorTypeId, setPrimaryVendorTypeId] = useState<string | null>(null);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: vendorTypes = [] } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
  });

  const { data: currentVendorTypes = [] } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendors', editingVendor?.id, 'types'],
    enabled: !!editingVendor?.id,
    queryFn: async () => {
      if (!editingVendor?.id) return [];
      const response = await fetch(`/api/vendors/${editingVendor.id}/types`);
      if (!response.ok) throw new Error('Failed to fetch vendor types');
      return response.json();
    },
  });

  useEffect(() => {
    if (editingVendor && currentVendorTypes.length > 0) {
      setSelectedVendorTypes(currentVendorTypes.map(vt => vt.vendorTypeId));
      const primary = currentVendorTypes.find(vt => vt.isPrimary === 1);
      setPrimaryVendorTypeId(primary?.vendorTypeId || null);
    } else if (!editingVendor) {
      setSelectedVendorTypes([]);
      setPrimaryVendorTypeId(null);
    }
  }, [editingVendor, currentVendorTypes]);

  const syncVendorTypes = async (vendorId: string) => {
    try {
      for (const typeId of selectedVendorTypes) {
        const isPrimary = typeId === primaryVendorTypeId;
        await apiRequest('POST', `/api/vendors/${vendorId}/types/${typeId}`, { isPrimary });
      }
      const typesToRemove = currentVendorTypes.filter(vt => !selectedVendorTypes.includes(vt.vendorTypeId));
      for (const vt of typesToRemove) {
        await apiRequest('DELETE', `/api/vendors/${vendorId}/types/${vt.vendorTypeId}`);
      }
    } catch (error: any) {
      console.error('Error syncing vendor types:', error);
      throw error;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: async (vendor: any) => {
      if (selectedVendorTypes.length > 0) {
        await syncVendorTypes(vendor.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor created successfully" });
      setIsDialogOpen(false);
      setSelectedVendorTypes([]);
      setPrimaryVendorTypeId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vendor> }) => {
      return apiRequest("PATCH", `/api/vendors/${id}`, data);
    },
    onSuccess: async (_data: any, variables: any) => {
      await syncVendorTypes(variables.id);
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", variables.id, "types"] });
      toast({ title: "Vendor updated successfully" });
      setIsDialogOpen(false);
      setEditingVendor(null);
      setSelectedVendorTypes([]);
      setPrimaryVendorTypeId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      vendorCode: formData.get("vendorCode") as string,
      vendorName: formData.get("vendorName") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      pincode: formData.get("pincode") as string,
      gstNumber: formData.get("gstNumber") as string || null,
      aadhaarNumber: formData.get("aadhaarNumber") as string || null,
      mobileNumber: formData.get("mobileNumber") as string,
      email: formData.get("email") as string || null,
      contactPerson: formData.get("contactPerson") as string || null,
      vendorType: formData.get("vendorType") as string || null,
      isCluster: formData.get("isCluster") === "on" ? 1 : 0,
      isActive: formData.get("isActive") as string || 'true',
    };

    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setVendorToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (vendorToDelete) {
      deleteMutation.mutate(vendorToDelete);
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
    setSelectedVendorTypes([]);
    setPrimaryVendorTypeId(null);
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Vendor Master</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-vendor">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVendor ? "Edit Vendor" : "Add Vendor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorCode">Vendor Code *</Label>
                  <Input
                    id="vendorCode"
                    name="vendorCode"
                    defaultValue={editingVendor?.vendorCode}
                    required
                    data-testid="input-vendor-code"
                  />
                </div>
                <div>
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    name="vendorName"
                    defaultValue={editingVendor?.vendorName}
                    required
                    data-testid="input-vendor-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={editingVendor?.address || ""}
                  rows={2}
                  data-testid="input-address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={editingVendor?.city || ""}
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={editingVendor?.state || ""}
                    data-testid="input-state"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    defaultValue={editingVendor?.pincode || ""}
                    data-testid="input-pincode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    name="gstNumber"
                    defaultValue={editingVendor?.gstNumber || ""}
                    placeholder="Optional"
                    data-testid="input-gst-number"
                  />
                </div>
                <div>
                  <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                  <Input
                    id="aadhaarNumber"
                    name="aadhaarNumber"
                    defaultValue={editingVendor?.aadhaarNumber || ""}
                    placeholder="Optional"
                    data-testid="input-aadhaar-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    defaultValue={editingVendor?.mobileNumber}
                    required
                    data-testid="input-mobile-number"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingVendor?.email || ""}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  defaultValue={editingVendor?.contactPerson || ""}
                  data-testid="input-contact-person"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorType">Vendor Type (Legacy)</Label>
                  <Select
                    name="vendorType"
                    defaultValue={editingVendor?.vendorType || ""}
                  >
                    <SelectTrigger data-testid="select-vendor-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Supplier">Supplier</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Vendor Classifications</Label>
                <p className="text-sm text-muted-foreground">
                  Select vendor types based on product brands purchased. Mark one as primary.
                </p>
                {vendorTypes.filter(vt => vt.isActive === 'true').length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 border rounded">
                    No vendor types available. Create them in Master Data → Vendor Types.
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-md p-4">
                    {vendorTypes
                      .filter(vt => vt.isActive === 'true')
                      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999))
                      .map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between gap-3 p-2 hover-elevate rounded"
                          data-testid={`vendor-type-option-${type.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              id={`vendor-type-${type.id}`}
                              checked={selectedVendorTypes.includes(type.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedVendorTypes([...selectedVendorTypes, type.id]);
                                  if (selectedVendorTypes.length === 0) {
                                    setPrimaryVendorTypeId(type.id);
                                  }
                                } else {
                                  setSelectedVendorTypes(selectedVendorTypes.filter(id => id !== type.id));
                                  if (primaryVendorTypeId === type.id) {
                                    setPrimaryVendorTypeId(selectedVendorTypes.find(id => id !== type.id) || null);
                                  }
                                }
                              }}
                              data-testid={`checkbox-vendor-type-${type.id}`}
                            />
                            <Label htmlFor={`vendor-type-${type.id}`} className="cursor-pointer flex-1">
                              <span className="font-medium">{type.typeName}</span>
                              <span className="text-sm text-muted-foreground ml-2">({type.typeCode})</span>
                            </Label>
                          </div>
                          {selectedVendorTypes.includes(type.id) && (
                            <Button
                              type="button"
                              variant={primaryVendorTypeId === type.id ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setPrimaryVendorTypeId(type.id)}
                              data-testid={`button-primary-vendor-type-${type.id}`}
                            >
                              <Star className={`h-3 w-3 mr-1 ${primaryVendorTypeId === type.id ? 'fill-current' : ''}`} />
                              {primaryVendorTypeId === type.id ? 'Primary' : 'Set Primary'}
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <Select
                    name="isActive"
                    defaultValue={editingVendor?.isActive || 'true'}
                  >
                    <SelectTrigger data-testid="select-is-active">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="isCluster"
                    name="isCluster"
                    defaultChecked={editingVendor?.isCluster === 1}
                    data-testid="checkbox-is-cluster"
                  />
                  <Label htmlFor="isCluster" className="cursor-pointer">
                    Is Cluster
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingVendor ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No vendors found. Add your first vendor to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>GST/Aadhaar</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Classifications</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium">{vendor.vendorCode}</TableCell>
                    <TableCell>{vendor.vendorName}</TableCell>
                    <TableCell>{vendor.mobileNumber}</TableCell>
                    <TableCell className="text-sm">
                      {vendor.gstNumber || vendor.aadhaarNumber || "-"}
                    </TableCell>
                    <TableCell>{vendor.city || "-"}</TableCell>
                    <TableCell>{vendor.vendorType || "-"}</TableCell>
                    <TableCell>
                      <VendorTypesBadges vendorId={vendor.id} />
                    </TableCell>
                    <TableCell>
                      {vendor.isCluster === 1 ? (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          vendor.isActive === 'true'
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {vendor.isActive === 'true' ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          data-testid={`button-edit-${vendor.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vendor.id)}
                          data-testid={`button-delete-${vendor.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this vendor? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
