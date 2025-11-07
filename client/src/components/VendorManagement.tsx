import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Vendor } from "@shared/schema";

export default function VendorManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      return apiRequest("/api/vendors", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor created successfully" });
      setIsDialogOpen(false);
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
      return apiRequest(`/api/vendors/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor updated successfully" });
      setIsDialogOpen(false);
      setEditingVendor(null);
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
      return apiRequest(`/api/vendors/${id}`, "DELETE");
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
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
  };

  return (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    defaultValue={editingVendor?.contactPerson || ""}
                    data-testid="input-contact-person"
                  />
                </div>
                <div>
                  <Label htmlFor="vendorType">Vendor Type</Label>
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
  );
}
