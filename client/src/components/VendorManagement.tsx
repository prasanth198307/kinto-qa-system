import { useState, useEffect, useMemo } from "react";
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
import { Plus, Pencil, Trash2, Star, Search, X, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Vendor } from "@shared/schema";

interface VendorType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: number;
  recordStatus: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface VendorVendorType {
  id: string;
  vendorId: string;
  vendorTypeId: string;
  isPrimary: number;
  vendorType?: VendorType;
}

function VendorTypesBadges({ vendorId, vendorTypes = [] }: { vendorId: string; vendorTypes?: VendorVendorType[] }) {
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
          {vt.vendorType?.name || vt.vendorType?.code || 'Unknown'}
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
  const [vendorTypePopoverOpen, setVendorTypePopoverOpen] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: vendorTypes = [] } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
  });

  // Batch fetch all vendor-type assignments to avoid N+1 queries
  const { data: allVendorTypeAssignments = [] } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types/batch'],
  });

  // Group vendor types by vendorId for quick lookup (memoized to prevent infinite loops)
  const vendorTypesMap = useMemo(() => {
    return allVendorTypeAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.vendorId]) {
        acc[assignment.vendorId] = [];
      }
      acc[assignment.vendorId].push(assignment);
      return acc;
    }, {} as Record<string, VendorVendorType[]>);
  }, [allVendorTypeAssignments]);

  // Get unique cities and states for filters
  const uniqueCities = useMemo(() => {
    const cities = new Set(vendors.filter(v => v.city).map(v => v.city!));
    return Array.from(cities).sort();
  }, [vendors]);

  const uniqueStates = useMemo(() => {
    const states = new Set(vendors.filter(v => v.state).map(v => v.state!));
    return Array.from(states).sort();
  }, [vendors]);

  // Filtered vendors based on search and filters
  const filteredVendors = useMemo(() => {
    let filtered = [...vendors];

    // Search by vendor name, code, or GST number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(query) ||
          v.vendorCode.toLowerCase().includes(query) ||
          (v.gstNumber && v.gstNumber.toLowerCase().includes(query)) ||
          (v.aadhaarNumber && v.aadhaarNumber.toLowerCase().includes(query)) ||
          (v.mobileNumber && v.mobileNumber.includes(query))
      );
    }

    // Filter by city
    if (cityFilter !== "all") {
      filtered = filtered.filter((v) => v.city === cityFilter);
    }

    // Filter by state
    if (stateFilter !== "all") {
      filtered = filtered.filter((v) => v.state === stateFilter);
    }

    // Filter by active status
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter((v) => v.isActive === activeStatusFilter);
    }

    // Sort by vendor code
    return filtered.sort((a, b) => a.vendorCode.localeCompare(b.vendorCode));
  }, [vendors, searchQuery, cityFilter, stateFilter, activeStatusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setCityFilter("all");
    setStateFilter("all");
    setActiveStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || cityFilter !== "all" || stateFilter !== "all" || activeStatusFilter !== "all";

  const { data: currentVendorTypes = [], isLoading: isLoadingVendorTypes } = useQuery<VendorVendorType[]>({
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
    // Don't update state while query is loading to avoid clearing existing selections
    if (isLoadingVendorTypes) return;
    
    if (editingVendor && currentVendorTypes.length > 0) {
      setSelectedVendorTypes(currentVendorTypes.map(vt => vt.vendorTypeId));
      const primary = currentVendorTypes.find(vt => vt.isPrimary === 1);
      setPrimaryVendorTypeId(primary?.vendorTypeId || null);
    } else if (!editingVendor) {
      setSelectedVendorTypes([]);
      setPrimaryVendorTypeId(null);
    }
  }, [editingVendor, currentVendorTypes, isLoadingVendorTypes]);

  const syncVendorTypes = async (vendorId: string) => {
    try {
      // Use batch sync endpoint - single transaction, handles primary flag clearing
      await apiRequest('POST', `/api/vendors/${vendorId}/types/sync`, {
        vendorTypeIds: selectedVendorTypes,
        primaryVendorTypeId: primaryVendorTypeId,
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-vendor-types/batch"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-vendor-types/batch"] });
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
    // Pre-seed vendor types from cached data to avoid UI flicker
    const existingTypes = vendorTypesMap[vendor.id] || [];
    setSelectedVendorTypes(existingTypes.map(vt => vt.vendorTypeId));
    const primary = existingTypes.find(vt => vt.isPrimary === 1);
    setPrimaryVendorTypeId(primary?.vendorTypeId || null);
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
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Vendor Master</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredVendors.length} of {vendors.length} vendors
            </p>
          </div>
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
                {vendorTypes.filter(vt => vt.isActive === 1).length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3 border rounded">
                    No vendor types available. Create them in Master Data → Vendor Types.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Popover open={vendorTypePopoverOpen} onOpenChange={setVendorTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={vendorTypePopoverOpen}
                          className="w-full justify-between"
                          data-testid="button-select-vendor-types"
                        >
                          {selectedVendorTypes.length > 0
                            ? `${selectedVendorTypes.length} type${selectedVendorTypes.length > 1 ? 's' : ''} selected`
                            : "Select vendor types..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search vendor types..." data-testid="input-search-vendor-types" />
                          <CommandEmpty>No vendor type found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {vendorTypes
                              .filter(vt => vt.isActive === 1)
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((type) => (
                                <CommandItem
                                  key={type.id}
                                  value={`${type.name} ${type.code}`}
                                  onSelect={() => {
                                    const isSelected = selectedVendorTypes.includes(type.id);
                                    if (isSelected) {
                                      const newSelected = selectedVendorTypes.filter(id => id !== type.id);
                                      setSelectedVendorTypes(newSelected);
                                      // Clear primary if it was the removed type
                                      if (primaryVendorTypeId === type.id) {
                                        setPrimaryVendorTypeId(newSelected.length > 0 ? newSelected[0] : null);
                                      }
                                    } else {
                                      const newSelected = [...selectedVendorTypes, type.id];
                                      setSelectedVendorTypes(newSelected);
                                      // Auto-set primary if first type being added
                                      if (selectedVendorTypes.length === 0) {
                                        setPrimaryVendorTypeId(type.id);
                                      }
                                    }
                                  }}
                                  data-testid={`vendor-type-option-${type.id}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedVendorTypes.includes(type.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <span className="font-medium">{type.name}</span>
                                    <span className="text-sm text-muted-foreground ml-2">({type.code})</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Display selected types as removable badges */}
                    {selectedVendorTypes.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="selected-vendor-types-container">
                        {selectedVendorTypes.map((typeId) => {
                          const type = vendorTypes.find(vt => vt.id === typeId);
                          if (!type) return null;
                          return (
                            <Badge
                              key={typeId}
                              variant={primaryVendorTypeId === typeId ? "default" : "secondary"}
                              className="text-xs pl-2 pr-1"
                              data-testid={`selected-vendor-type-${typeId}`}
                            >
                              {primaryVendorTypeId === typeId && <Star className="h-2 w-2 mr-1 fill-current" />}
                              {type.name}
                              <button
                                type="button"
                                className="ml-1 hover:bg-accent/20 rounded-sm p-0.5"
                                onClick={() => {
                                  const newSelected = selectedVendorTypes.filter(id => id !== typeId);
                                  setSelectedVendorTypes(newSelected);
                                  if (primaryVendorTypeId === typeId) {
                                    setPrimaryVendorTypeId(newSelected.length > 0 ? newSelected[0] : null);
                                  }
                                }}
                                data-testid={`button-remove-vendor-type-${typeId}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Primary type selection - only shown when multiple types are selected */}
                    {selectedVendorTypes.length > 1 && (
                      <div className="space-y-2">
                        <Label>Primary Type</Label>
                        <Select
                          value={primaryVendorTypeId || undefined}
                          onValueChange={setPrimaryVendorTypeId}
                        >
                          <SelectTrigger data-testid="select-primary-vendor-type">
                            <SelectValue placeholder="Select primary type" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedVendorTypes.map((typeId) => {
                              const type = vendorTypes.find(vt => vt.id === typeId);
                              if (!type) return null;
                              return (
                                <SelectItem key={typeId} value={typeId} data-testid={`primary-option-${typeId}`}>
                                  {type.name} ({type.code})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
    </Card>

    {/* Filters Card */}
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="vendor-search" className="text-sm font-medium mb-1.5 block">
                Search Vendor
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="vendor-search"
                  placeholder="Search by name, code, GST number, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-vendor-search"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-vendor-filters"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City Filter */}
            <div>
              <Label htmlFor="city-filter" className="text-sm font-medium mb-1.5 block">
                City
              </Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger id="city-filter" data-testid="select-city-filter">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State Filter */}
            <div>
              <Label htmlFor="state-filter" className="text-sm font-medium mb-1.5 block">
                State
              </Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger id="state-filter" data-testid="select-state-filter">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status Filter */}
            <div>
              <Label htmlFor="active-status-filter" className="text-sm font-medium mb-1.5 block">
                Status
              </Label>
              <Select value={activeStatusFilter} onValueChange={setActiveStatusFilter}>
                <SelectTrigger id="active-status-filter" data-testid="select-active-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Vendor Table Card */}
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-8">Loading vendors...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {vendors.length === 0 
              ? "No vendors found. Add your first vendor to get started." 
              : "No vendors match your search criteria. Try adjusting your filters."}
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
                {filteredVendors.map((vendor) => (
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
                      <VendorTypesBadges vendorId={vendor.id} vendorTypes={vendorTypesMap[vendor.id] || []} />
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
    </div>
    </>
  );
}
