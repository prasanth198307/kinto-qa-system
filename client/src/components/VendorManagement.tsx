import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/DataTablePagination";
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
import { Plus, Pencil, Trash2, Star, Search, X, Check, ChevronsUpDown, ShieldCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

function GstStatusBadge({ status, size = "sm" }: { status: string | null | undefined; size?: "sm" | "xs" }) {
  if (!status) return null;
  
  const statusLower = status.toLowerCase();
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let className = "";
  let icon = null;
  
  if (statusLower === 'active') {
    variant = "default";
    className = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs";
    icon = <ShieldCheck className={size === "xs" ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />;
  } else if (statusLower === 'cancelled' || statusLower === 'suspended') {
    variant = "destructive";
    className = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs";
    icon = <AlertCircle className={size === "xs" ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />;
  } else if (statusLower === 'inactive') {
    variant = "secondary";
    className = size === "xs" ? "text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    icon = <AlertCircle className={size === "xs" ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />;
  } else {
    className = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs";
  }
  
  return (
    <Badge variant={variant} className={className} data-testid="badge-gst-status">
      {icon}
      GST: {status}
    </Badge>
  );
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

interface PaginatedVendorResponse {
  data: Vendor[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    filters?: {
      cities: string[];
      states: string[];
    };
  };
}

export default function VendorManagement() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [selectedVendorTypes, setSelectedVendorTypes] = useState<string[]>([]);
  const [primaryVendorTypeId, setPrimaryVendorTypeId] = useState<string | null>(null);
  const [vendorTypePopoverOpen, setVendorTypePopoverOpen] = useState(false);
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstVerificationResult, setGstVerificationResult] = useState<{
    status: string;
    legalName?: string;
    tradeName?: string;
    isBlocked?: boolean;
    blockReason?: string;
    message?: string;
  } | null>(null);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkVerifyProgress, setBulkVerifyProgress] = useState<{
    total: number;
    verified: number;
    active: number;
    cancelled: number;
    suspended: number;
  } | null>(null);

  // Force component to re-render when URL changes
  const [, forceUpdate] = useState(0);

  // Read params directly from window.location.search (not from wouter's location hook)
  const searchParams = new URLSearchParams(window.location.search);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const searchQuery = searchParams.get('searchQuery') || '';
  const cityFilter = searchParams.get('city') || 'all';
  const stateFilter = searchParams.get('state') || 'all';
  const activeStatusFilter = searchParams.get('activeStatus') || 'all';

  // Update URL params helper
  const updateUrlParams = useCallback((updates: Record<string, string | number>) => {
    const params = new URLSearchParams(window.location.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    const newSearch = params.toString();
    const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
    
    // Update URL using History API
    window.history.pushState({}, '', newUrl);
    
    // Force component to re-render and refetch
    forceUpdate(prev => prev + 1);
  }, [forceUpdate]);

  // Fetch paginated vendors
  const { data: vendorsResponse, isLoading } = useQuery<PaginatedVendorResponse | Vendor[]>({
    queryKey: ["/api/vendors", page, pageSize, searchQuery, cityFilter, stateFilter, activeStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery) params.set('searchQuery', searchQuery);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (stateFilter !== 'all') params.set('state', stateFilter);
      if (activeStatusFilter !== 'all') params.set('activeStatus', activeStatusFilter);
      
      const response = await fetch(`/api/vendors?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return response.json();
    },
  });

  // Handle both paginated and legacy array responses
  const isPaginatedResponse = vendorsResponse && typeof vendorsResponse === 'object' && 'data' in vendorsResponse && 'meta' in vendorsResponse;
  const vendors = isPaginatedResponse ? vendorsResponse.data : (Array.isArray(vendorsResponse) ? vendorsResponse : []);
  const paginationMeta = isPaginatedResponse ? vendorsResponse.meta : undefined;

  const { data: vendorTypes = [] } = useQuery<VendorType[]>({
    queryKey: ['/api/vendor-types'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter active vendor types (isActive: 1 = active, 0 = inactive)
  // Handle both number and string by coercing to number
  const activeVendorTypes = useMemo(() => {
    return vendorTypes.filter(vt => Number(vt.isActive) === 1);
  }, [vendorTypes]);

  // Batch fetch all vendor-type assignments to avoid N+1 queries
  const { data: allVendorTypeAssignments = [] } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types/batch'],
  });

  // Group vendor types by vendorId for quick lookup (memoized to prevent infinite loops)
  // Deduplicate to handle React Query dev-mode double-fetch edge cases
  const vendorTypesMap = useMemo(() => {
    return allVendorTypeAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.vendorId]) {
        acc[assignment.vendorId] = [];
      }
      
      // Deduplicate: Only add if this vendorTypeId doesn't already exist for this vendor
      const exists = acc[assignment.vendorId].some(
        existing => existing.vendorTypeId === assignment.vendorTypeId
      );
      
      if (!exists) {
        acc[assignment.vendorId].push(assignment);
      }
      
      return acc;
    }, {} as Record<string, VendorVendorType[]>);
  }, [allVendorTypeAssignments]);

  // Get unique cities and states from pagination metadata or compute from vendors
  const uniqueCities = useMemo(() => {
    if (paginationMeta?.filters?.cities) {
      return paginationMeta.filters.cities;
    }
    // Fallback for legacy array responses: compute from current vendors
    const cities = new Set(vendors.filter(v => v.city).map(v => v.city!));
    return Array.from(cities).sort();
  }, [paginationMeta, vendors]);

  const uniqueStates = useMemo(() => {
    if (paginationMeta?.filters?.states) {
      return paginationMeta.filters.states;
    }
    // Fallback for legacy array responses: compute from current vendors
    const states = new Set(vendors.filter(v => v.state).map(v => v.state!));
    return Array.from(states).sort();
  }, [paginationMeta, vendors]);

  const clearFilters = () => {
    updateUrlParams({
      searchQuery: '',
      city: 'all',
      state: 'all',
      activeStatus: 'all',
      page: 1,
    });
  };

  const hasActiveFilters = searchQuery || cityFilter !== "all" || stateFilter !== "all" || activeStatusFilter !== "all";

  // Handlers for filter updates
  const handleSearchChange = (value: string) => {
    updateUrlParams({ searchQuery: value, page: 1 });
  };

  const handleCityChange = (value: string) => {
    updateUrlParams({ city: value, page: 1 });
  };

  const handleStateChange = (value: string) => {
    updateUrlParams({ state: value, page: 1 });
  };

  const handleActiveStatusChange = (value: string) => {
    updateUrlParams({ activeStatus: value, page: 1 });
  };

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
    // Filter out null/undefined values before sending
    const validTypeIds = selectedVendorTypes.filter(id => id != null && id !== '');
    console.log('syncVendorTypes called with:', { vendorId, validTypeIds, primaryVendorTypeId });
    try {
      const response = await apiRequest('POST', `/api/vendors/${vendorId}/types/sync`, {
        vendorTypeIds: validTypeIds,
        primaryVendorTypeId: primaryVendorTypeId,
      });
      console.log('syncVendorTypes response:', response);
      return response;
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
      try {
        await syncVendorTypes(variables.id);
        queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vendors", variables.id, "types"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vendor-vendor-types/batch"] });
        toast({ title: "Vendor updated successfully" });
        setIsDialogOpen(false);
        setEditingVendor(null);
        setSelectedVendorTypes([]);
        setPrimaryVendorTypeId(null);
      } catch (syncError: any) {
        console.error('Sync error:', syncError);
        queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
        toast({ 
          title: "Vendor saved but classification sync failed",
          description: "Please try editing the vendor again to update classifications.",
          variant: "destructive" 
        });
        setIsDialogOpen(false);
        setEditingVendor(null);
      }
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
    const gstNumber = formData.get("gstNumber") as string || null;
    
    // Determine effective GST status - from verification result or existing vendor
    const effectiveGstStatus = gstVerificationResult?.status || 
      (editingVendor?.gstNumber === gstNumber ? editingVendor?.gstStatus : null);
    
    // Prevent saving if GST is suspended or cancelled
    if (gstNumber && effectiveGstStatus && 
        (effectiveGstStatus === 'Cancelled' || effectiveGstStatus === 'Suspended')) {
      toast({
        title: "Cannot Save Vendor",
        description: `GST registration is ${effectiveGstStatus}. Please use an active GST number or remove the GST number.`,
        variant: "destructive",
      });
      return;
    }
    
    // If GST number changed from existing vendor, clear GST status unless newly verified
    const gstChanged = editingVendor && editingVendor.gstNumber !== gstNumber;
    const gstStatusToSave = gstVerificationResult?.status || 
      (gstChanged ? null : editingVendor?.gstStatus) || null;
    const gstLegalNameToSave = gstVerificationResult?.legalName || 
      (gstChanged ? null : editingVendor?.gstLegalName) || null;
    const gstTradeNameToSave = gstVerificationResult?.tradeName || 
      (gstChanged ? null : editingVendor?.gstTradeName) || null;
    const gstVerifiedAtToSave = gstVerificationResult ? new Date().toISOString() : 
      (gstChanged ? null : editingVendor?.gstVerifiedAt) || null;
    
    const data = {
      vendorCode: formData.get("vendorCode") as string,
      vendorName: formData.get("vendorName") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      pincode: formData.get("pincode") as string,
      gstNumber: gstNumber,
      gstStatus: gstStatusToSave,
      gstLegalName: gstLegalNameToSave,
      gstTradeName: gstTradeNameToSave,
      gstVerifiedAt: gstVerifiedAtToSave,
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
    // Initialize GST verification result from existing vendor status
    if (vendor.gstStatus) {
      setGstVerificationResult({
        status: vendor.gstStatus,
        legalName: vendor.gstLegalName || undefined,
        tradeName: vendor.gstTradeName || undefined,
      });
    } else {
      setGstVerificationResult(null);
    }
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
    setGstVerificationResult(null);
  };

  const verifyGst = async (gstin: string) => {
    if (!gstin || gstin.length < 15) {
      toast({
        title: "Invalid GST Number",
        description: "Please enter a valid 15-character GSTIN",
        variant: "destructive",
      });
      return;
    }
    
    setGstVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/gst/verify", { gstin });
      const data = await res.json();
      setGstVerificationResult(data);
      
      if (data.status === 'Active') {
        toast({
          title: "GST Verified",
          description: `GSTIN is Active. Legal Name: ${data.legalName || 'N/A'}`,
        });
      } else if (data.status === 'Cancelled' || data.status === 'Suspended') {
        toast({
          title: "GST Status Warning",
          description: `GSTIN is ${data.status}. You cannot save this vendor.`,
          variant: "destructive",
        });
      } else if (data.status === 'Inactive') {
        toast({
          title: "GST Status Warning",
          description: "GSTIN is Inactive. Please verify manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "GST Status Unknown",
          description: data.message || "Could not verify GST. Please verify manually.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify GST",
        variant: "destructive",
      });
    } finally {
      setGstVerifying(false);
    }
  };

  const bulkVerifyGst = async () => {
    setBulkVerifying(true);
    setBulkVerifyProgress(null);
    try {
      const res = await apiRequest("POST", "/api/vendors/bulk-verify-gst", {});
      const data = await res.json();
      setBulkVerifyProgress({
        total: data.total,
        verified: data.verified,
        active: data.active,
        cancelled: data.cancelled,
        suspended: data.suspended,
      });
      
      // Refresh vendor list
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      
      toast({
        title: "Bulk GST Verification Complete",
        description: `Verified ${data.verified} of ${data.total} vendors. Active: ${data.active}, Cancelled: ${data.cancelled}, Suspended: ${data.suspended}`,
      });
    } catch (error: any) {
      toast({
        title: "Bulk Verification Failed",
        description: error.message || "Failed to verify GST for all vendors",
        variant: "destructive",
      });
    } finally {
      setBulkVerifying(false);
    }
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
              {paginationMeta ? `Showing ${vendors.length} of ${paginationMeta.totalItems} vendors` : `${vendors.length} vendors`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={bulkVerifyGst}
              disabled={bulkVerifying}
              data-testid="button-bulk-verify-gst"
            >
              {bulkVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying GST...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verify All GST
                </>
              )}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) {
                handleDialogClose();
              }
              setIsDialogOpen(open);
            }}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                data-testid="button-add-vendor"
                onClick={() => {
                  setEditingVendor(null);
                  setSelectedVendorTypes([]);
                  setPrimaryVendorTypeId(null);
                  setGstVerificationResult(null);
                }}
              >
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
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gstNumber"
                      name="gstNumber"
                      defaultValue={editingVendor?.gstNumber || ""}
                      placeholder="15-digit GSTIN"
                      className="flex-1"
                      data-testid="input-gst-number"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const gstInput = document.getElementById('gstNumber') as HTMLInputElement;
                        if (gstInput?.value) {
                          verifyGst(gstInput.value);
                        } else {
                          toast({
                            title: "No GST Number",
                            description: "Please enter a GST number to verify",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={gstVerifying}
                      data-testid="button-verify-gst"
                    >
                      {gstVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* GST Verification Result */}
                  {gstVerificationResult && (
                    <div className={cn(
                      "text-sm p-2 rounded border",
                      gstVerificationResult.status === 'Active' 
                        ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                        : gstVerificationResult.status === 'Cancelled' || gstVerificationResult.status === 'Suspended'
                        ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                        : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
                    )}>
                      <div className="flex items-center gap-1.5 font-medium">
                        {gstVerificationResult.status === 'Active' ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        GST Status: {gstVerificationResult.status}
                      </div>
                      {gstVerificationResult.legalName && (
                        <div className="text-xs mt-1">Legal Name: {gstVerificationResult.legalName}</div>
                      )}
                      {gstVerificationResult.tradeName && (
                        <div className="text-xs">Trade Name: {gstVerificationResult.tradeName}</div>
                      )}
                      {gstVerificationResult.isBlocked && (
                        <div className="text-xs mt-1 font-medium text-red-600 dark:text-red-400">
                          {gstVerificationResult.blockReason}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Show verified at timestamp */}
                  {editingVendor?.gstVerifiedAt && !gstVerifying && gstVerificationResult?.status === editingVendor?.gstStatus && (
                    <span className="text-xs text-muted-foreground">
                      Last verified: {new Date(editingVendor.gstVerifiedAt).toLocaleDateString()}
                    </span>
                  )}
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
                {activeVendorTypes.length === 0 ? (
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
                          <CommandList className="max-h-64 overflow-auto">
                            <CommandGroup>
                              {activeVendorTypes
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((type) => (
                                  <CommandItem
                                    key={type.id}
                                    value={type.name}
                                    keywords={[type.code]}
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
                                    className="flex items-center gap-2 px-2 py-1.5"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0",
                                        selectedVendorTypes.includes(type.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="flex-1">
                                      {type.name} <span className="text-muted-foreground">({type.code})</span>
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
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
          </div>
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
                  onChange={(e) => handleSearchChange(e.target.value)}
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
              <Select value={cityFilter} onValueChange={handleCityChange}>
                <SelectTrigger id="city-filter" data-testid="select-city-filter">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map((city: string) => (
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
              <Select value={stateFilter} onValueChange={handleStateChange}>
                <SelectTrigger id="state-filter" data-testid="select-state-filter">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map((state: string) => (
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
              <Select value={activeStatusFilter} onValueChange={handleActiveStatusChange}>
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
        ) : vendors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {!hasActiveFilters 
              ? "No vendors found. Add your first vendor to get started." 
              : "No vendors match your search criteria. Try adjusting your filters."}
          </div>
        ) : (
          <>
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
                {vendors.map((vendor: Vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium">{vendor.vendorCode}</TableCell>
                    <TableCell>{vendor.vendorName}</TableCell>
                    <TableCell>{vendor.mobileNumber}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {vendor.gstNumber || vendor.aadhaarNumber || "-"}
                          {vendor.gstNumber && vendor.gstStatus && (
                            <GstStatusBadge status={vendor.gstStatus} size="xs" />
                          )}
                        </div>
                      </div>
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
          
          {/* Pagination Controls */}
          {paginationMeta && (
            <DataTablePagination
              meta={paginationMeta}
              onPageChange={(newPage) => updateUrlParams({ page: newPage })}
              onPageSizeChange={(newPageSize) => updateUrlParams({ pageSize: newPageSize, page: 1 })}
            />
          )}
          </>
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
