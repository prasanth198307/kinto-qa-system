import { useState, useEffect, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { 
  insertUomSchema, 
  insertProductSchema,
  insertProductBomSchema,
  productFormSchema,
  insertRawMaterialSchema, 
  insertFinishedGoodSchema,
  type Uom,
  type Product,
  type ProductBom,
  type ProductBomConfiguration,
  type ProductFormData,
  type RawMaterial,
  type RawMaterialType,
  type FinishedGood,
  type Machine,
  type User
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, Package, Layers, Box, CheckCircle, Users, Minus, Check, X, Printer, CalendarIcon, AlertTriangle, ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isWithinInterval } from "date-fns";
import VendorManagement from "@/components/VendorManagement";
import BankManagement from "@/components/BankManagement";
import { GlobalHeader } from "@/components/GlobalHeader";
import { DataTablePagination } from "@/components/DataTablePagination";

interface InventoryManagementProps {
  activeTab?: string;
}

export default function InventoryManagement({ activeTab: externalActiveTab }: InventoryManagementProps = {}) {
  const { user, logoutMutation } = useAuth();
  const { role, canAccessScreen, isLoading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState(externalActiveTab || "uom");
  const [searchTerm, setSearchTerm] = useState("");

  // Update activeTab when externalActiveTab changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Check access using database permissions only
  // Allow access if user has permission to any inventory-related screen
  const hasAccess = canAccessScreen('inventory_management') || 
    canAccessScreen('finished_goods') ||
    canAccessScreen('products') ||
    canAccessScreen('raw_materials') ||
    canAccessScreen('uom');

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to access Inventory Management. Please contact your administrator to request access.</p>
          </Card>
        </div>
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'uom':
        return <UOMTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'products':
        return <ProductsTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'raw-materials':
        return <RawMaterialsTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'finished-goods':
        return <FinishedGoodsTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'vendors':
        return <VendorManagement />;
      case 'banks':
        return <BankManagement />;
      default:
        return <UOMTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
    }
  };

  const navigate = (path: string) => setLocation(path);

  return (
    <>
      <div className="bg-background">
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/?tab=inventory')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage units, products, raw materials, and finished goods</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {renderContent()}
        </div>
      </div>
    </>
  );
}

function UOMTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const { role, hasPermission } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Uom | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Permission checks - 100% database driven
  const canCreate = hasPermission('uom', 'create');
  const canEdit = hasPermission('uom', 'edit');
  const canDelete = hasPermission('uom', 'delete');

  const { data: uoms = [], isLoading } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertUomSchema>) => {
      return await apiRequest('POST', '/api/uom', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/uom'] });
      toast({ title: "Success", description: "UOM created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertUomSchema>> }) => {
      return await apiRequest('PATCH', `/api/uom/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/uom'] });
      toast({ title: "Success", description: "UOM updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/uom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/uom'] });
      toast({ title: "Success", description: "UOM deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredItems = uoms.filter(item =>
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Uom) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this UOM?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-uom"
          />
        </div>
        {canCreate && (
          <Button onClick={handleAdd} data-testid="button-add-uom">
            <Plus className="h-4 w-4 mr-2" />
            Add UOM
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No UOMs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-uom-${item.id}`}>
                    <TableCell className="font-medium" data-testid={`text-code-${item.id}`}>{item.code}</TableCell>
                    <TableCell data-testid={`text-name-${item.id}`}>{item.name}</TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-description-${item.id}`}>
                      {item.description || '-'}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${item.id}`}>
                      <Badge variant={item.isActive === 'true' ? 'default' : 'secondary'}>
                        {item.isActive === 'true' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}

      <UOMDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function UOMDialog({ 
  open, 
  onOpenChange, 
  item, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: Uom | null; 
  onSubmit: (data: z.infer<typeof insertUomSchema>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof insertUomSchema>>({
    resolver: zodResolver(insertUomSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      isActive: 'true',
    },
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          code: item.code || '',
          name: item.name || '',
          description: item.description || '',
          isActive: item.isActive || 'true',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          isActive: 'true',
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = (data: z.infer<typeof insertUomSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-uom">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit UOM' : 'Add UOM'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the unit of measurement details' : 'Create a new unit of measurement'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., KG, L, PCS" {...field} data-testid="input-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kilogram, Liter, Pieces" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about this unit..." 
                      {...field} 
                      value={field.value || ''} 
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>Enable or disable this unit of measurement</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                      data-testid="switch-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit">
                {isLoading ? 'Saving...' : (item ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface PaginatedProductResponse {
  data: Product[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    filters?: {
      categories: string[];
      types: string[];
    };
  };
}

function ProductsTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const { role, hasPermission } = usePermissions();
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Permission checks - 100% database driven
  const canCreate = hasPermission('products', 'create');
  const canEdit = hasPermission('products', 'edit');
  const canDelete = hasPermission('products', 'delete');

  // Get pathname and search params separately
  const pathname = location.split('?')[0];
  const searchParams = useMemo(() => new URLSearchParams(location.split('?')[1] || ''), [location]);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const categoryFilter = searchParams.get('category') || 'all';
  const typeFilter = searchParams.get('type') || 'all';
  const activeStatusFilter = searchParams.get('activeStatus') || 'all';

  // Update URL params helper
  const updateUrlParams = (updates: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    const newSearch = newParams.toString();
    setLocation(`${pathname}${newSearch ? `?${newSearch}` : ''}`);
  };

  // Fetch paginated products
  const { data: productsResponse, isLoading } = useQuery<PaginatedProductResponse | Product[]>({
    queryKey: ["/api/products", page, pageSize, searchTerm, categoryFilter, typeFilter, activeStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchTerm) params.set('searchQuery', searchTerm);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (activeStatusFilter !== 'all') params.set('activeStatus', activeStatusFilter);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Handle both paginated and legacy array responses
  const isPaginatedResponse = productsResponse && typeof productsResponse === 'object' && 'data' in productsResponse && 'meta' in productsResponse;
  const products = isPaginatedResponse ? productsResponse.data : (Array.isArray(productsResponse) ? productsResponse : []);
  const paginationMeta = isPaginatedResponse ? productsResponse.meta : undefined;

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: productCategories = [] } = useQuery<any[]>({
    queryKey: ['/api/product-categories'],
  });

  const { data: productTypes = [] } = useQuery<any[]>({
    queryKey: ['/api/product-types'],
  });

  // Get category ID to name mapping
  const getCategoryName = (id: string) => {
    const cat = productCategories.find(c => c.id === id);
    return cat?.name || id;
  };

  // Get type ID to name mapping
  const getTypeName = (id: string) => {
    const typ = productTypes.find(t => t.id === id);
    return typ?.name || id;
  };

  // Always show ALL categories and types in filter dropdowns (not just those on current page)
  // This ensures filters remain usable even when current page has limited data
  const allCategoryIds = useMemo(() => {
    return productCategories.map(c => c.id);
  }, [productCategories]);

  const allTypeIds = useMemo(() => {
    return productTypes.map(t => t.id);
  }, [productTypes]);

  const saveProductWithBomMutation = useMutation({
    mutationFn: async ({ mode, id, data }: { mode: 'create' | 'update'; id?: string; data: ProductFormData & { bomConfigurationId?: string | null } }) => {
      // Extract BOM items and configuration ID from submitted form data
      const { bomItems: rawBomItems, bomConfigurationId, ...productData } = data;
      
      // Filter out empty/incomplete BOM rows (those without materialTypeId)
      const bomItems = (rawBomItems || []).filter(item => 
        item.materialTypeId && item.materialTypeId.trim() !== ''
      );
      
      // Step 0: Validate remaining BOM items for valid quantity
      if (bomItems && bomItems.length > 0) {
        const invalidRows: number[] = [];
        bomItems.forEach((item, index) => {
          const hasValidQuantity = item.quantityRequired && Number(item.quantityRequired) > 0;
          if (!hasValidQuantity) {
            invalidRows.push(index + 1);
          }
        });

        if (invalidRows.length > 0) {
          throw new Error(`BOM validation failed: Row(s) ${invalidRows.join(', ')} have invalid quantity. Please enter valid quantity values before saving.`);
        }
      }
      
      // Step 1: Save product (only after BOM validation passes)
      let productId: string | undefined;
      let savedProduct: Product;
      
      if (mode === 'create') {
        const response = await apiRequest('POST', '/api/products', productData);
        const result = await response.json();
        productId = result.id;
        savedProduct = result;
      } else {
        const response = await apiRequest('PATCH', `/api/products/${id}`, productData);
        const result = await response.json();
        productId = id;
        savedProduct = result;
      }

      // Guard: Ensure productId exists before BOM save
      if (!productId) {
        throw new Error('Failed to get product ID from save response');
      }

      // Step 2: Save BOM (all items already validated)
      let bomSuccess = true;
      let bomError: string | null = null;
      if (bomItems && bomItems.length > 0) {
        try {
          const bomPayload = bomItems.map(item => ({
            materialTypeId: item.materialTypeId?.trim() || '',
            quantityRequired: String(item.quantityRequired),  // Must be string for Drizzle-Zod numeric schema
            uom: item.uom?.trim() || null,  // Send null instead of empty string for nullable fields
            notes: item.notes?.trim() || null,  // Send null instead of empty string for nullable fields
            configurationId: bomConfigurationId || null,  // Include configuration ID if present
          }));
          const response = await apiRequest('POST', `/api/products/${productId}/bom`, bomPayload);
          await response.json();  // Consume response
        } catch (error) {
          console.error('BOM save failed after product save:', error);
          bomSuccess = false;
          bomError = (error as Error).message;
        }
      }

      return { productId, bomSuccess, bomError, createdProduct: mode === 'create', savedProduct };
    },
    onSuccess: ({ productId, bomSuccess, bomError, createdProduct, savedProduct }, variables) => {
      // Always invalidate product list to show newly created/updated product
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      if (bomSuccess) {
        // Full success - invalidate BOM cache and close dialog
        queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'bom'] });
        toast({ title: "Success", description: "Product and BOM saved successfully" });
        setIsDialogOpen(false);
        setEditingItem(null);
      } else {
        // Partial success - product saved but BOM failed
        toast({ 
          title: "Partial Success", 
          description: `Product saved successfully, but BOM update failed: ${bomError}. Please fix the BOM and save again.`, 
          variant: "destructive" 
        });
        
        // Switch to update mode using the savedProduct returned from API
        // This ensures the dialog is in update mode for retry (avoiding duplicate product creation)
        setEditingItem(savedProduct);
        // Keep dialog open for retry
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Success", description: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearFilters = () => {
    onSearchChange('');
    updateUrlParams({
      category: 'all',
      type: 'all',
      activeStatus: 'all',
      page: 1,
    });
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'all' || typeFilter !== 'all' || activeStatusFilter !== 'all';

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const getUomName = (uomId: string | null) => {
    if (!uomId) return '-';
    const uom = uoms.find(u => u.id === uomId);
    return uom ? uom.name : '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-product"
          />
        </div>
        {canCreate && (
          <Button onClick={handleAdd} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-product-filters"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <Label htmlFor="category-filter" className="text-sm font-medium mb-1.5 block">
                  Category
                </Label>
                <Select value={categoryFilter} onValueChange={(value) => updateUrlParams({ category: value, page: 1 })}>
                  <SelectTrigger id="category-filter" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategoryIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {getCategoryName(id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div>
                <Label htmlFor="type-filter" className="text-sm font-medium mb-1.5 block">
                  Type
                </Label>
                <Select value={typeFilter} onValueChange={(value) => updateUrlParams({ type: value, page: 1 })}>
                  <SelectTrigger id="type-filter" data-testid="select-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {allTypeIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {getTypeName(id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium mb-1.5 block">
                  Status
                </Label>
                <Select value={activeStatusFilter} onValueChange={(value) => updateUrlParams({ activeStatus: value, page: 1 })}>
                  <SelectTrigger id="status-filter" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Standard Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoading 
                      ? "Loading products..."
                      : "No products match your search criteria. Try adjusting your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((item) => (
                  <TableRow key={item.id} data-testid={`row-product-${item.id}`} className="cursor-pointer hover-elevate" onClick={() => setLocation(`/product/${item.id}`)}>
                    <TableCell className="font-medium" data-testid={`text-code-${item.id}`}>{item.productCode}</TableCell>
                    <TableCell data-testid={`text-name-${item.id}`}>{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-category-${item.id}`}>
                      {item.category || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-uom-${item.id}`}>{getUomName(item.uomId)}</TableCell>
                    <TableCell data-testid={`text-cost-${item.id}`}>
                      {item.standardCost ? `₹${item.standardCost}` : '-'}
                    </TableCell>
                    <TableCell data-testid={`badge-status-${item.id}`}>
                      <Badge variant={item.isActive === 'true' ? 'default' : 'secondary'}>
                        {item.isActive === 'true' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {paginationMeta && (
        <DataTablePagination
          meta={paginationMeta}
          onPageChange={(newPage) => updateUrlParams({ page: newPage })}
          onPageSizeChange={(newSize) => updateUrlParams({ pageSize: newSize, page: 1 })}
        />
      )}

      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        uoms={uoms}
        productCategories={productCategories}
        productTypes={productTypes}
        onSubmit={(data) => {
          saveProductWithBomMutation.mutate({
            mode: editingItem ? 'update' : 'create',
            id: editingItem?.id,
            data
          });
        }}
        isLoading={saveProductWithBomMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-product">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-product"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({ 
  open, 
  onOpenChange, 
  item, 
  uoms,
  productCategories,
  productTypes,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: Product | null; 
  uoms: Uom[];
  productCategories: any[];
  productTypes: any[];
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [bomSaving, setBomSaving] = useState(false);
  
  // Multi-BOM Configuration state
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [newConfigName, setNewConfigName] = useState("");
  const [newConfigDescription, setNewConfigDescription] = useState("");
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  
  // Edit configuration state
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editConfigName, setEditConfigName] = useState("");
  const [editConfigDescription, setEditConfigDescription] = useState("");

  // Fetch material types for BOM dropdown (instead of raw materials)
  const { data: materialTypesForBom = [] } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
    enabled: open,
  });
  
  // Also fetch raw materials for legacy support
  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
    enabled: open,
  });

  // Fetch BOM configurations for this product
  const { data: bomConfigurations = [], refetch: refetchConfigs } = useQuery<ProductBomConfiguration[]>({
    queryKey: ['/api/products', item?.id, 'bom-configurations'],
    queryFn: async () => {
      if (!item?.id) return [];
      const response = await fetch(`/api/products/${item.id}/bom-configurations`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch BOM configurations');
      return response.json();
    },
    enabled: open && !!item?.id,
  });

  // Fetch existing BOM when editing (filtered by configuration if selected)
  const { data: existingBom = [], refetch: refetchBom } = useQuery<any[]>({
    queryKey: ['/api/products', item?.id, 'bom', selectedConfigId],
    queryFn: async () => {
      if (!item?.id) return [];
      const url = selectedConfigId 
        ? `/api/products/${item.id}/bom?configurationId=${selectedConfigId}`
        : `/api/products/${item.id}/bom`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch BOM');
      return response.json();
    },
    enabled: open && !!item?.id,
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: { configName: string; description: string }) => {
      return await apiRequest('POST', `/api/products/${item?.id}/bom-configurations`, data);
    },
    onSuccess: async (response) => {
      const newConfig = await response.json();
      toast({ title: "Success", description: "BOM configuration created successfully" });
      refetchConfigs();
      setSelectedConfigId(newConfig.id);
      setNewConfigName("");
      setNewConfigDescription("");
      setShowNewConfigForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      return await apiRequest('DELETE', `/api/products/${item?.id}/bom-configurations/${configId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "BOM configuration deleted successfully" });
      refetchConfigs();
      setSelectedConfigId(null);
      replace([]); // Clear BOM items when config is deleted
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Set default configuration mutation
  const setDefaultConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      return await apiRequest('POST', `/api/products/${item?.id}/bom-configurations/${configId}/set-default`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Default configuration updated" });
      refetchConfigs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ configId, data }: { configId: string; data: { configName: string; description: string } }) => {
      return await apiRequest('PATCH', `/api/products/${item?.id}/bom-configurations/${configId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "BOM configuration updated successfully" });
      refetchConfigs();
      setEditingConfigId(null);
      setEditConfigName("");
      setEditConfigDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productCode: '',
      productName: '',
      description: '',
      categoryId: undefined,
      skuCode: '',
      typeId: undefined,
      uomId: undefined,
      standardCost: undefined,
      baseUnit: '',
      derivedUnit: '',
      conversionMethod: '',
      derivedValuePerBase: undefined,
      weightPerBase: undefined,
      weightPerDerived: undefined,
      usableDerivedUnits: '',
      defaultLossPercent: undefined,
      basePrice: undefined,
      gstPercent: undefined,
      totalPrice: undefined,
      hsnCode: '',
      sacCode: '',
      taxType: '',
      minimumStockLevel: undefined,
      isActive: 'true',
      bomItems: [],
    },
  });

  // BOM field array
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "bomItems",
  });

  // Watch basePrice and gstPercent for totalPrice calculation
  const basePrice = useWatch({ control: form.control, name: "basePrice" });
  const gstPercent = useWatch({ control: form.control, name: "gstPercent" });
  const conversionMethod = useWatch({ control: form.control, name: "conversionMethod" });
  
  // Watch bomItems to properly track changes in the BOM table
  const watchedBomItems = useWatch({ control: form.control, name: "bomItems" });

  // Calculate totalPrice
  const calculatedTotalPrice = basePrice && gstPercent !== undefined
    ? Math.round((Number(basePrice) || 0) * (1 + (Number(gstPercent) || 0) / 100))
    : undefined;

  // Reset form and BOM when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          productCode: item.productCode || '',
          productName: item.productName || '',
          description: item.description || '',
          categoryId: item.categoryId || undefined,
          skuCode: item.skuCode || '',
          typeId: item.typeId || undefined,
          uomId: item.uomId || undefined,
          standardCost: item.standardCost || undefined,
          baseUnit: item.baseUnit || '',
          derivedUnit: item.derivedUnit || '',
          conversionMethod: item.conversionMethod || '',
          derivedValuePerBase: item.derivedValuePerBase || undefined,
          weightPerBase: item.weightPerBase || undefined,
          weightPerDerived: item.weightPerDerived || undefined,
          usableDerivedUnits: item.usableDerivedUnits || '',
          defaultLossPercent: item.defaultLossPercent || undefined,
          basePrice: item.basePrice || undefined,
          gstPercent: item.gstPercent || undefined,
          totalPrice: item.totalPrice || undefined,
          hsnCode: item.hsnCode || '',
          sacCode: item.sacCode || '',
          taxType: item.taxType || '',
          minimumStockLevel: item.minimumStockLevel || undefined,
          isActive: item.isActive || 'true',
          bomItems: [], // Initialize empty BOM array - will be hydrated by separate effect
        });
        // BOM will be hydrated by separate effect below
      } else {
        // Adding new product - reset form and clear BOM
        form.reset({
          productCode: '',
          productName: '',
          description: '',
          categoryId: undefined,
          skuCode: '',
          typeId: undefined,
          uomId: undefined,
          standardCost: undefined,
          baseUnit: '',
          derivedUnit: '',
          conversionMethod: '',
          derivedValuePerBase: undefined,
          weightPerBase: undefined,
          weightPerDerived: undefined,
          usableDerivedUnits: '',
          defaultLossPercent: undefined,
          basePrice: undefined,
          gstPercent: undefined,
          totalPrice: undefined,
          hsnCode: '',
          sacCode: '',
          taxType: '',
          minimumStockLevel: undefined,
          isActive: 'true',
          bomItems: [], // Initialize empty BOM array
        });
      }
      setActiveTab("info");
      // Reset BOM configuration state
      setSelectedConfigId(null);
      setShowNewConfigForm(false);
      setNewConfigName("");
      setNewConfigDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]); // Only reset when dialog opens or editing different item

  // Effect 2: Auto-select default configuration when configurations load
  useEffect(() => {
    if (open && item && bomConfigurations.length > 0 && !selectedConfigId) {
      const defaultConfig = bomConfigurations.find(c => c.isDefault === 1);
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
      }
    }
  }, [open, item, bomConfigurations, selectedConfigId]);

  // Effect 3: Hydrate BOM field array when BOM data loads (separate to avoid tab reset)
  useEffect(() => {
    if (open && item) {
      // Filter BOM by selected configuration
      const filteredBom = selectedConfigId 
        ? existingBom.filter(bom => bom.configurationId === selectedConfigId || bom.configuration_id === selectedConfigId)
        : existingBom.filter(bom => !bom.configurationId && !bom.configuration_id); // Legacy BOM without configuration
        
      if (filteredBom.length > 0) {
        const hydratedBom = filteredBom.map(bom => {
          const quantityStr = bom.quantityRequired || bom.quantity_required;
          // Support both new materialTypeId and legacy rawMaterialId
          // If materialTypeId exists, use it. Otherwise try to get typeId from raw material
          let typeId = bom.materialTypeId || bom.material_type_id || '';
          
          // Fallback: If no materialTypeId but has rawMaterialId, find the type from raw material
          if (!typeId && (bom.rawMaterialId || bom.raw_material_id)) {
            const rmId = bom.rawMaterialId || bom.raw_material_id;
            const rm = rawMaterials.find(r => r.id === rmId);
            if (rm && rm.typeId) {
              typeId = rm.typeId;
            }
          }
          
          return {
            materialTypeId: typeId,
            quantityRequired: quantityStr ? parseFloat(quantityStr) : 0,
            uom: bom.uom || '',
            notes: bom.notes || '',
          };
        });
        replace(hydratedBom);
      } else {
        // Clear BOM array when editing product with no BOM for selected config
        replace([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBom, open, item?.id, rawMaterials, selectedConfigId]); // When BOM data changes or dialog opens for edit or config changes

  const handleAddBomRow = () => {
    append({ materialTypeId: '', quantityRequired: 0, uom: '', notes: '' } as any, { shouldFocus: false });
  };

  const handleSubmit = async (data: ProductFormData) => {
    // Pass the complete form data (including bomItems) to parent's onSubmit
    // Include the selected configuration ID for BOM items
    const submitData = {
      ...data,
      bomConfigurationId: selectedConfigId, // Pass selected config ID
    };
    onSubmit(submitData as ProductFormData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-product">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update product details and bill of materials' : 'Create a new product with packaging, pricing, and BOM'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Custom Tab Implementation - Manual Control */}
            <div className="space-y-4">
              <div className="grid w-full grid-cols-4 gap-1 rounded-md bg-muted p-1">
                <div
                  onClick={() => setActiveTab('info')}
                  className={`cursor-pointer rounded px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'info' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-background/50'
                  }`}
                  data-testid="tab-info"
                >
                  Product Info
                </div>
                <div
                  onClick={() => setActiveTab('packaging')}
                  className={`cursor-pointer rounded px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'packaging' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-background/50'
                  }`}
                  data-testid="tab-packaging"
                >
                  Packaging
                </div>
                <div
                  onClick={() => setActiveTab('pricing')}
                  className={`cursor-pointer rounded px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'pricing' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-background/50'
                  }`}
                  data-testid="tab-pricing"
                >
                  Pricing/Tax
                </div>
                <div
                  onClick={() => setActiveTab('bom')}
                  className={`cursor-pointer rounded px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'bom' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-background/50'
                  }`}
                  data-testid="tab-bom"
                >
                  BOM
                </div>
              </div>

              {activeTab === 'info' && (<div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="productCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="PROD-001" {...field} data-testid="input-product-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skuCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU Code</FormLabel>
                        <FormControl>
                          <Input placeholder="SKU-001" {...field} value={field.value || ''} data-testid="input-sku-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mineral Water 1L" {...field} data-testid="input-product-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productCategories.map((category: any) => (
                              <SelectItem key={category.id} value={String(category.id)} data-testid={`select-item-category-${category.code}`}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="typeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product-type">
                              <SelectValue placeholder="Select Product Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypes.map((type: any) => (
                              <SelectItem key={type.id} value={String(type.id)} data-testid={`select-item-type-${type.code}`}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Product description..." {...field} value={field.value || ''} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="uomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit of Measurement</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-uom">
                              <SelectValue placeholder="Select UOM" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uoms.filter(u => u.isActive === 'true').map(uom => (
                              <SelectItem key={uom.id} value={uom.id}>
                                {uom.name} ({uom.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="standardCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Standard Cost (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-standard-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>Enable or disable this product</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 'true'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>)}

              {activeTab === 'packaging' && (<div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-base-unit">
                              <SelectValue placeholder="Select base unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uoms.map(uom => (
                              <SelectItem key={uom.id} value={uom.name}>
                                {uom.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="derivedUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Derived Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-derived-unit">
                              <SelectValue placeholder="Select derived unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {uoms.map(uom => (
                              <SelectItem key={uom.id} value={uom.name}>
                                {uom.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="conversionMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-conversion-method">
                            <SelectValue placeholder="Select conversion method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="multiply">Multiply</SelectItem>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Formula-Based">Formula-Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(conversionMethod === 'Direct' || conversionMethod === 'multiply') && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="derivedValuePerBase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Derived Value per Base</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="12" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-derived-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultLossPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Loss %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="5" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-loss-percent"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {conversionMethod === 'Formula-Based' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weightPerBase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight per Base Unit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="1000" 
                                {...field} 
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-weight-base"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="weightPerDerived"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight per Derived Unit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="1" 
                                {...field} 
                                value={field.value || ''} 
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-weight-derived"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="defaultLossPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Loss %</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="5" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              data-testid="input-loss-percent-formula"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {(conversionMethod === 'Direct' || conversionMethod === 'Formula-Based' || conversionMethod === 'multiply') && (
                  <FormItem>
                    <FormLabel>Usable Derived Units (Auto-Calculated)</FormLabel>
                    <Input 
                      value={item?.usableDerivedUnits || 'Calculated after save'} 
                      disabled 
                      className="bg-muted"
                      data-testid="display-usable-units"
                    />
                    <FormDescription className="text-xs">
                      This value is calculated by the backend based on conversion method and loss percentage
                    </FormDescription>
                  </FormItem>
                )}
              </div>)}

              {activeTab === 'pricing' && (<div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="94.50" 
                            {...field} 
                            value={field.value ? (Number(field.value) / 100).toFixed(2) : ''} 
                            onChange={(e) => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                            data-testid="input-base-price"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Enter price in rupees (e.g., 94.50 for ₹94.50)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="18" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-gst-percent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {calculatedTotalPrice !== undefined && (
                  <FormItem>
                    <FormLabel>Total Price with GST (₹)</FormLabel>
                    <Input 
                      value={(calculatedTotalPrice / 100).toFixed(2)} 
                      disabled 
                      className="bg-muted font-semibold"
                      data-testid="display-total-price"
                    />
                    <FormDescription className="text-xs">
                      ₹{(calculatedTotalPrice / 100).toFixed(2)} (Auto-calculated from Base Price + GST)
                    </FormDescription>
                  </FormItem>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hsnCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HSN Code</FormLabel>
                        <FormControl>
                          <Input placeholder="2201" {...field} value={field.value || ''} data-testid="input-hsn-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sacCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SAC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="9973" {...field} value={field.value || ''} data-testid="input-sac-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="taxType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Type</FormLabel>
                        <FormControl>
                          <Input placeholder="GST" {...field} value={field.value || ''} data-testid="input-tax-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimumStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Stock Level</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="100" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            data-testid="input-min-stock"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>)}

              {activeTab === 'bom' && (<div className="space-y-4 mt-4">
                {/* BOM Configuration Management - Only show for editing existing products */}
                {item?.id && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">BOM Configurations</Label>
                        <p className="text-xs text-muted-foreground">
                          Create multiple material configurations (e.g., "Standard - 21gm Preform", "Economy - 19.2gm Preform")
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewConfigForm(!showNewConfigForm)}
                        data-testid="button-toggle-new-config"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Configuration
                      </Button>
                    </div>

                    {/* New Configuration Form */}
                    {showNewConfigForm && (
                      <div className="space-y-3 p-3 rounded border bg-background">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Configuration Name *</Label>
                            <Input
                              placeholder="e.g., Standard - 21gm Preform"
                              value={newConfigName}
                              onChange={(e) => setNewConfigName(e.target.value)}
                              data-testid="input-new-config-name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="Optional description"
                              value={newConfigDescription}
                              onChange={(e) => setNewConfigDescription(e.target.value)}
                              data-testid="input-new-config-description"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newConfigName.trim() || createConfigMutation.isPending}
                            onClick={() => createConfigMutation.mutate({ configName: newConfigName.trim(), description: newConfigDescription.trim() })}
                            data-testid="button-create-config"
                          >
                            {createConfigMutation.isPending ? 'Creating...' : 'Create Configuration'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNewConfigForm(false);
                              setNewConfigName("");
                              setNewConfigDescription("");
                            }}
                            data-testid="button-cancel-new-config"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Configuration List */}
                    {bomConfigurations.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Select configuration to edit:</Label>
                        <div className="flex flex-wrap gap-2">
                          {bomConfigurations.map((config) => (
                            <div 
                              key={config.id} 
                              className={`flex items-center gap-1 p-2 rounded border cursor-pointer transition-colors ${
                                selectedConfigId === config.id 
                                  ? 'bg-primary text-primary-foreground border-primary' 
                                  : 'bg-background hover:bg-muted'
                              }`}
                              onClick={() => setSelectedConfigId(config.id)}
                              data-testid={`config-tab-${config.id}`}
                            >
                              <span className="text-sm font-medium">{config.configName}</span>
                              {config.isDefault === 1 && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {selectedConfigId === config.id && (
                                <div className="flex items-center ml-2 gap-1">
                                  {config.isDefault !== 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDefaultConfigMutation.mutate(config.id);
                                      }}
                                      title="Set as default"
                                      data-testid={`button-set-default-${config.id}`}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingConfigId(config.id);
                                      setEditConfigName(config.configName);
                                      setEditConfigDescription(config.description || "");
                                    }}
                                    title="Edit configuration"
                                    data-testid={`button-edit-config-${config.id}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Delete "${config.configName}" configuration? This will also delete all BOM items in this configuration.`)) {
                                        deleteConfigMutation.mutate(config.id);
                                      }
                                    }}
                                    title="Delete configuration"
                                    data-testid={`button-delete-config-${config.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Edit Configuration Form */}
                        {editingConfigId && (
                          <div className="space-y-3 p-3 rounded border bg-muted/50">
                            <Label className="text-xs font-medium">Edit Configuration</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Configuration Name *</Label>
                                <Input
                                  placeholder="e.g., Standard - 21gm Preform"
                                  value={editConfigName}
                                  onChange={(e) => setEditConfigName(e.target.value)}
                                  data-testid="input-edit-config-name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input
                                  placeholder="Optional description"
                                  value={editConfigDescription}
                                  onChange={(e) => setEditConfigDescription(e.target.value)}
                                  data-testid="input-edit-config-description"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={!editConfigName.trim() || updateConfigMutation.isPending}
                                onClick={() => updateConfigMutation.mutate({ 
                                  configId: editingConfigId, 
                                  data: { configName: editConfigName.trim(), description: editConfigDescription.trim() } 
                                })}
                                data-testid="button-update-config"
                              >
                                {updateConfigMutation.isPending ? 'Updating...' : 'Update Configuration'}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingConfigId(null);
                                  setEditConfigName("");
                                  setEditConfigDescription("");
                                }}
                                data-testid="button-cancel-edit-config"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No configurations yet. Create your first configuration to organize BOM items.
                      </p>
                    )}
                  </div>
                )}

                {/* BOM Items Table */}
                {(!item?.id || selectedConfigId || bomConfigurations.length === 0) && (
                  <>
                    {item?.id && selectedConfigId && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">
                          BOM Items for: {bomConfigurations.find(c => c.id === selectedConfigId)?.configName}
                        </Label>
                      </div>
                    )}
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material Type</TableHead>
                            <TableHead>Quantity Required</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No BOM items. Click "Add Row" to add material types.
                              </TableCell>
                            </TableRow>
                          ) : (
                            fields.map((field, index) => {
                              const bomItem = watchedBomItems?.[index] || {};
                              return (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <Select 
                                      value={bomItem.materialTypeId || ''} 
                                      onValueChange={(value) => form.setValue(`bomItems.${index}.materialTypeId` as any, value)}
                                    >
                                      <SelectTrigger data-testid={`select-bom-material-${index}`}>
                                        <SelectValue placeholder="Select material type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {materialTypesForBom.filter(mt => mt.isActive === 1).map(mt => (
                                          <SelectItem key={mt.id} value={mt.id}>
                                            {mt.typeName} ({mt.baseUnit})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      placeholder="0" 
                                      value={bomItem.quantityRequired || ''} 
                                      onChange={(e) => form.setValue(`bomItems.${index}.quantityRequired` as any, parseFloat(e.target.value) || 0)}
                                      data-testid={`input-bom-quantity-${index}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select 
                                      value={bomItem.uom || ''} 
                                      onValueChange={(value) => form.setValue(`bomItems.${index}.uom` as any, value)}
                                    >
                                      <SelectTrigger data-testid={`select-bom-uom-${index}`}>
                                        <SelectValue placeholder="Select UOM" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {uoms.map(uom => (
                                          <SelectItem key={uom.id} value={uom.name}>
                                            {uom.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input 
                                      placeholder="Optional notes" 
                                      value={bomItem.notes || ''} 
                                      onChange={(e) => form.setValue(`bomItems.${index}.notes` as any, e.target.value)}
                                      data-testid={`input-bom-notes-${index}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => remove(index)}
                                      data-testid={`button-delete-bom-${index}`}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddBomRow}
                      disabled={item?.id && bomConfigurations.length > 0 && !selectedConfigId}
                      data-testid="button-add-bom-row"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </>
                )}
                
                {/* Message when no config is selected but configs exist */}
                {item?.id && bomConfigurations.length > 0 && !selectedConfigId && (
                  <p className="text-sm text-muted-foreground text-center py-4 italic">
                    Please select a configuration above to view and edit its BOM items.
                  </p>
                )}
              </div>)}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || bomSaving} data-testid="button-submit">
                {isLoading || bomSaving ? 'Saving...' : (item ? 'Update Product' : 'Create Product')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RawMaterialsTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const { role, hasPermission } = usePermissions();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [printLabelOpen, setPrintLabelOpen] = useState(false);
  const [printItem, setPrintItem] = useState<RawMaterial | null>(null);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const itemsPerPage = 10;
  
  // Permission checks - 100% database driven
  const canCreate = hasPermission('raw_materials', 'create');
  const canEdit = hasPermission('raw_materials', 'edit');
  const canDelete = hasPermission('raw_materials', 'delete');

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stockModeFilter, setStockModeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: materialTypes = [] } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertRawMaterialSchema>) => {
      return await apiRequest('POST', '/api/raw-materials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders/receiving-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ title: "Success", description: "Raw material created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertRawMaterialSchema>> }) => {
      return await apiRequest('PATCH', `/api/raw-materials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({ title: "Success", description: "Raw material updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/raw-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({ title: "Success", description: "Raw material deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Comprehensive filtering logic
  const filteredItems = useMemo(() => {
    return materials.filter(item => {
      // Search filter
      const matchesSearch = 
        item.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.materialName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = 
        typeFilter === 'all' || 
        item.typeId === typeFilter;
      
      // Stock mode filter
      const matchesStockMode = 
        stockModeFilter === 'all' || 
        (stockModeFilter === 'opening' && item.isOpeningStockOnly === 1) ||
        (stockModeFilter === 'ongoing' && item.isOpeningStockOnly === 0);
      
      // Status filter
      const matchesStatus = 
        statusFilter === 'all' || 
        item.isActive === statusFilter;
      
      return matchesSearch && matchesType && matchesStockMode && matchesStatus;
    });
  }, [materials, searchTerm, typeFilter, stockModeFilter, statusFilter]);

  // Clear filters function
  const clearFilters = () => {
    onSearchChange('');
    setTypeFilter('all');
    setStockModeFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || typeFilter !== 'all' || stockModeFilter !== 'all' || statusFilter !== 'all';

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: RawMaterial) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handlePrintLabel = (item: RawMaterial) => {
    if (!(item as any).batchCode) {
      toast({ 
        title: "No Batch Code", 
        description: "This material doesn't have a batch code. Edit the material and set a date to generate one.",
        variant: "destructive"
      });
      return;
    }
    setPrintItem(item);
    setLabelQuantity(1);
    setPrintLabelOpen(true);
  };

  const executePrint = () => {
    if (!printItem) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow pop-ups for printing", variant: "destructive" });
      return;
    }
    
    const batchCode = (printItem as any).batchCode || 'N/A';
    const materialName = printItem.materialName;
    const materialCode = printItem.materialCode;
    const category = printItem.category || '';
    const receivedDate = (printItem as any).receivedDate || (printItem as any).openingDate || '';
    
    // Generate multiple labels
    let labelsHtml = '';
    for (let i = 0; i < labelQuantity; i++) {
      labelsHtml += `
        <div class="label">
          <div class="batch-code">${batchCode}</div>
          <div class="material-name">${materialName}</div>
          <div class="material-code">${materialCode}</div>
          ${category ? `<div class="category">${category}</div>` : ''}
          ${receivedDate ? `<div class="date">Date: ${new Date(receivedDate).toLocaleDateString('en-IN')}</div>` : ''}
        </div>
      `;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels - ${batchCode}</title>
        <style>
          @page {
            size: 100mm 50mm;
            margin: 2mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .label {
            width: 96mm;
            height: 46mm;
            border: 1px dashed #ccc;
            padding: 4mm;
            margin: 2mm auto;
            page-break-after: always;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }
          .label:last-child {
            page-break-after: avoid;
          }
          .batch-code {
            font-size: 24px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            margin-bottom: 4mm;
            padding: 2mm 4mm;
            border: 2px solid #000;
            background: #f5f5f5;
          }
          .material-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          .material-code {
            font-size: 12px;
            color: #666;
            margin-bottom: 1mm;
          }
          .category {
            font-size: 10px;
            color: #888;
            margin-bottom: 1mm;
          }
          .date {
            font-size: 10px;
            color: #666;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .label { border: 1px dashed #ccc; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setPrintLabelOpen(false);
    toast({ title: "Print Initiated", description: `Printing ${labelQuantity} label(s) for ${batchCode}` });
  };

  const getUomName = (uomId: string | null) => {
    if (!uomId) return '-';
    const uom = uoms.find(u => u.id === uomId);
    return uom ? uom.name : '-';
  };

  const getTypeName = (typeId: string | null) => {
    if (!typeId) return '-';
    const type = materialTypes.find(t => t.id === typeId);
    return type ? `${type.code} - ${type.name}` : '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-material"
          />
        </div>
        {canCreate && (
          <Button onClick={handleAdd} data-testid="button-add-material">
            <Plus className="h-4 w-4 mr-2" />
            Add Raw Material
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-material-filters"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <Label htmlFor="type-filter-material" className="text-sm font-medium mb-1.5 block">
                  Material Type
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter-material" data-testid="select-type-filter-material">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {materialTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.code} - {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Mode Filter */}
              <div>
                <Label htmlFor="stock-mode-filter" className="text-sm font-medium mb-1.5 block">
                  Stock Mode
                </Label>
                <Select value={stockModeFilter} onValueChange={setStockModeFilter}>
                  <SelectTrigger id="stock-mode-filter" data-testid="select-stock-mode-filter">
                    <SelectValue placeholder="All Stock Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Modes</SelectItem>
                    <SelectItem value="opening">Opening Stock Only</SelectItem>
                    <SelectItem value="ongoing">Ongoing Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter-material" className="text-sm font-medium mb-1.5 block">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter-material" data-testid="select-status-filter-material">
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

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Batch Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Base Unit</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {materials.length === 0 
                      ? "No raw materials found. Add your first raw material to get started."
                      : "No raw materials match your search criteria. Try adjusting your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-material-${item.id}`} className="cursor-pointer hover-elevate" onClick={() => navigate(`/raw-material/${item.id}`)}>
                    <TableCell className="font-medium" data-testid={`text-code-${item.id}`}>{item.materialCode}</TableCell>
                    <TableCell data-testid={`text-name-${item.id}`}>{item.materialName}</TableCell>
                    <TableCell data-testid={`text-batch-${item.id}`}>
                      {(item as any).batchCode ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {(item as any).batchCode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-category-${item.id}`}>
                      {item.category || '-'}
                    </TableCell>
                    <TableCell data-testid={`text-base-unit-${item.id}`}>
                      {item.baseUnit || '-'}
                      {item.weightPerUnit ? ` (${item.weightPerUnit})` : ''}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-conversion-${item.id}`}>
                      {item.conversionType === 'None' || !item.conversionType ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium">{item.conversionType}</span>
                          {item.conversionValue && (
                            <span className="text-muted-foreground">{item.conversionValue} pcs</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-stock-${item.id}`}>{item.currentStock || 0}</TableCell>
                    <TableCell data-testid={`badge-status-${item.id}`}>
                      <Badge variant={item.isActive === 'true' ? 'default' : 'secondary'}>
                        {item.isActive === 'true' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handlePrintLabel(item); }}
                          title="Print Label"
                          data-testid={`button-print-${item.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}

      {/* Print Label Dialog */}
      <Dialog open={printLabelOpen} onOpenChange={setPrintLabelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print Batch Labels</DialogTitle>
            <DialogDescription>
              Configure and print labels for this raw material batch.
            </DialogDescription>
          </DialogHeader>
          {printItem && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-mono font-bold mb-2">
                  {(printItem as any).batchCode}
                </div>
                <div className="text-sm font-medium">{printItem.materialName}</div>
                <div className="text-xs text-muted-foreground">{printItem.materialCode}</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="label-quantity">Number of Labels</Label>
                <Input
                  id="label-quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={labelQuantity}
                  onChange={(e) => setLabelQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  data-testid="input-label-quantity"
                />
                <p className="text-xs text-muted-foreground">
                  Print multiple labels for bags/rolls (max 100)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintLabelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executePrint} data-testid="button-execute-print">
              <Printer className="h-4 w-4 mr-2" />
              Print {labelQuantity} Label{labelQuantity > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RawMaterialDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        uoms={uoms}
        materials={materials}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Raw Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this raw material? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-raw-material">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-raw-material"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RawMaterialDialog({ 
  open, 
  onOpenChange, 
  item, 
  uoms,
  materials,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: RawMaterial | null; 
  uoms: Uom[];
  materials: RawMaterial[];
  onSubmit: (data: z.infer<typeof insertRawMaterialSchema>) => void;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [selectedTypeDetails, setSelectedTypeDetails] = useState<RawMaterialType | null>(null);
  const [existingTypeStock, setExistingTypeStock] = useState<number>(0);
  const [selectedPOId, setSelectedPOId] = useState<string>('');
  const [selectedPOItemId, setSelectedPOItemId] = useState<string>('');
  
  // Pricing unit state - allows vendor to quote in different units
  // Options: 'same_as_base' | 'per_kg' | 'per_piece' | 'other'
  const [vendorPricingMode, setVendorPricingMode] = useState<'same_as_base' | 'per_kg' | 'per_piece' | 'other'>('same_as_base');
  const [vendorQuotedPrice, setVendorQuotedPrice] = useState<number | undefined>(undefined);
  const [manualConversionFactor, setManualConversionFactor] = useState<number | undefined>(undefined);
  const [customPricingUnitName, setCustomPricingUnitName] = useState<string>('');

  // Fetch all Purchase Orders (we'll filter client-side for approved/ordered/partially_received)
  const { data: allPOs = [] } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders'],
  });
  
  // Filter to POs that can receive materials (approved, ordered, or partially_received)
  const approvedPOs = useMemo(() => {
    return allPOs.filter((po: any) => 
      po.status === 'approved' || po.status === 'ordered' || po.status === 'partially_received'
    );
  }, [allPOs]);

  // Fetch PO items for selected PO
  const { data: poItems = [] } = useQuery<any[]>({
    queryKey: ['/api/purchase-order-items', selectedPOId],
    enabled: !!selectedPOId,
  });

  // Get already-received PO item IDs from materials
  const receivedPOItemIds = useMemo(() => {
    return new Set(
      materials
        .filter((m: any) => m.purchaseOrderItemId)
        .map((m: any) => m.purchaseOrderItemId)
    );
  }, [materials]);

  // Filter PO items to exclude already-received ones
  const availablePOItems = useMemo(() => {
    return poItems.filter((item: any) => !receivedPOItemIds.has(item.id));
  }, [poItems, receivedPOItemIds]);

  // Filter POs to show only those with unreceived items
  const availablePOs = useMemo(() => {
    // We need to check each PO to see if it has any unreceived items
    // This requires knowing all PO items for each PO
    return approvedPOs.filter((po: any) => {
      // Check if any materials are linked to this PO
      const materialsForPO = materials.filter((m: any) => m.purchaseOrderId === po.id);
      // If no items count available, assume PO has items to receive
      if (!po.itemCount && po.itemCount !== 0) return true;
      // If received count < total item count, show the PO
      return materialsForPO.length < (po.itemCount || 999);
    });
  }, [approvedPOs, materials]);
  
  const form = useForm<z.infer<typeof insertRawMaterialSchema>>({
    resolver: zodResolver(insertRawMaterialSchema.extend({
      typeId: z.string().min(1, "Material Type is required"),
    })),
    defaultValues: {
      materialCode: undefined,
      materialName: '',
      description: '',
      category: '',
      typeId: '',
      isOpeningStockOnly: 1,
      openingStock: 0,
      openingDate: undefined,
      closingStock: undefined,
      closingStockUsable: undefined,
      receivedQuantity: 0,
      returnedQuantity: 0,
      adjustments: 0,
      uomId: undefined,
      currentStock: 0,
      reorderLevel: undefined,
      maxStockLevel: undefined,
      unitCost: undefined,
      location: '',
      supplier: '',
      isActive: 'true',
      purchaseOrderId: undefined,
      purchaseOrderItemId: undefined,
    },
  });

  // Fetch Material Types
  const { data: materialTypes = [] } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  // Watch for Material Type selection and stock mode changes
  const selectedTypeId = form.watch('typeId');
  const selectedCategory = form.watch('category');
  const isOpeningStockOnly = form.watch('isOpeningStockOnly');
  const openingStock = form.watch('openingStock');
  const receivedQuantity = form.watch('receivedQuantity');
  const returnedQuantity = form.watch('returnedQuantity');
  const adjustments = form.watch('adjustments');
  const unitCost = form.watch('unitCost');
  const gstRate = form.watch('gstRate');
  const selectedUomId = form.watch('uomId');
  
  // Filter Material Types by selected Category
  const filteredMaterialTypes = useMemo(() => {
    if (!selectedCategory || selectedCategory === '') {
      return materialTypes;
    }
    // Filter types by category field (exact match, case insensitive)
    return materialTypes.filter(type => 
      type.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [materialTypes, selectedCategory]);
  
  // Derive UOM from form watch
  const selectedUom = useMemo(() => uoms.find(u => u.id === selectedUomId), [uoms, selectedUomId]);
  
  // Get conversion factor based on pricing mode and Material Type data
  const getConversionFactor = useMemo(() => {
    if (vendorPricingMode === 'per_kg' && selectedTypeDetails?.baseUnitWeight) {
      return selectedTypeDetails.baseUnitWeight;
    }
    if (vendorPricingMode === 'per_piece' && selectedTypeDetails?.usableUnits) {
      return selectedTypeDetails.usableUnits;
    }
    if (vendorPricingMode === 'other') {
      return manualConversionFactor;
    }
    return undefined;
  }, [vendorPricingMode, selectedTypeDetails, manualConversionFactor]);
  
  // Get the unit name for vendor pricing
  const vendorPricingUnitLabel = useMemo(() => {
    if (vendorPricingMode === 'per_kg') return 'KG';
    if (vendorPricingMode === 'per_piece') return selectedTypeDetails?.derivedUnit || 'Piece';
    if (vendorPricingMode === 'other') return customPricingUnitName || 'Unit';
    return selectedUom?.name || 'Base Unit';
  }, [vendorPricingMode, selectedTypeDetails, customPricingUnitName, selectedUom]);

  // Check if conversion data is available for selected pricing unit
  const canConvertToKg = selectedTypeDetails?.baseUnitWeight && selectedTypeDetails.baseUnitWeight > 0;
  const canConvertToPiece = selectedTypeDetails?.usableUnits && selectedTypeDetails.usableUnits > 0;
  
  // Auto-convert vendor quoted price to base unit price when pricing unit or vendor price changes
  useEffect(() => {
    if (vendorPricingMode === 'same_as_base') {
      // No conversion needed - vendor quotes in base unit
      return;
    }
    
    if (vendorQuotedPrice === undefined || vendorQuotedPrice === 0) {
      return;
    }
    
    const factor = getConversionFactor;
    if (factor === undefined || factor === 0) {
      return;
    }
    
    // Calculate base price: vendorPrice × conversionFactor
    // Example: ₹200/KG × 25 KG/Bag = ₹5,000/Bag
    const basePrice = vendorQuotedPrice * factor;
    
    // Update the base price field
    form.setValue('unitCost', parseFloat(basePrice.toFixed(2)));
  }, [vendorQuotedPrice, vendorPricingMode, getConversionFactor, form]);

  // Auto-calculate Total Cost and Total Valuation when Pricing or Quantity changes
  useEffect(() => {
    const base = Number(unitCost) || 0;
    const gst = Number(gstRate) || 0;
    const qty = Number(receivedQuantity) || Number(openingStock) || 0;
    
    const unitWithGst = base + (base * gst / 100);
    const totalValuation = unitWithGst * qty;

    form.setValue('totalCost', parseFloat(unitWithGst.toFixed(2)));
    form.setValue('totalValuation' as any, parseFloat(totalValuation.toFixed(2)));
  }, [unitCost, gstRate, receivedQuantity, openingStock, form]);

  // Track if user manually selected a type (vs loaded from editing)
  const [userChangedType, setUserChangedType] = useState(false);
  
  // Clear typeId when category changes if current type doesn't match
  useEffect(() => {
    if (selectedCategory && selectedTypeId) {
      const currentType = materialTypes.find(t => t.id === selectedTypeId);
      if (currentType) {
        const typeMatchesCategory = currentType.category?.toLowerCase() === selectedCategory.toLowerCase();
        if (!typeMatchesCategory) {
          form.setValue('typeId', '');
          setSelectedTypeDetails(null);
        }
      }
    }
  }, [selectedCategory, materialTypes]);
  
  // Auto-fetch Material Type details and existing stock when type is selected
  useEffect(() => {
    if (selectedTypeId && selectedTypeId !== '') {
      const typeDetails = materialTypes.find(t => t.id === selectedTypeId);
      if (typeDetails) {
        setSelectedTypeDetails(typeDetails);
        
        // Auto-populate Material Name from Material Type (only for new entries and if name is empty)
        if (!item && userChangedType) {
          const currentName = form.getValues('materialName');
          if (!currentName || currentName === '') {
            form.setValue('materialName', typeDetails.typeName);
          }
        }
        
        // Auto-populate UOM from Material Type's baseUnit
        if (typeDetails.baseUnit && uoms.length > 0) {
          const matchingUom = uoms.find(u => 
            u.name.toLowerCase() === typeDetails.baseUnit?.toLowerCase() ||
            u.code.toLowerCase() === typeDetails.baseUnit?.toLowerCase()
          );
          if (matchingUom) {
            form.setValue('uomId', matchingUom.id);
          }
        }
      }
      
      // Only check for existing stock when adding new material (not editing)
      // And only when user actively changed the type selection
      if (!item && userChangedType) {
        // Calculate total existing stock for this material type
        const existingMaterialsForType = materials.filter(m => m.typeId === selectedTypeId);
        const totalExistingStock = existingMaterialsForType.reduce((sum, m) => {
          // Use currentStock or calculate from closingStock
          return sum + (Number(m.currentStock) || Number(m.closingStock) || 0);
        }, 0);
        
        setExistingTypeStock(totalExistingStock);
        
        // If there's existing stock, auto-switch to Ongoing Inventory mode and prefill
        if (totalExistingStock > 0) {
          form.setValue('isOpeningStockOnly', 0); // Switch to Ongoing Inventory
          form.setValue('openingStock', totalExistingStock);
        } else {
          // No existing stock - default to Opening Stock Only mode
          form.setValue('isOpeningStockOnly', 1);
          form.setValue('openingStock', 0);
        }
      }
    } else {
      setSelectedTypeDetails(null);
      setExistingTypeStock(0);
    }
  }, [selectedTypeId, materialTypes, materials, item, form, userChangedType, uoms]);

  // Auto-calculate closing stock when relevant fields change
  useEffect(() => {
    if (selectedTypeDetails) {
      // Use the override value if provided, otherwise fallback to the type default
      const usableUnitsOverride = form.watch('usableDerivedUnits');
      const usableMultiplier = Number(usableUnitsOverride) || Number(selectedTypeDetails.usableUnits) || 0;
      
      if (isOpeningStockOnly === 1) {
        // Opening Stock Only mode
        const opening = Number(openingStock) || 0;
        form.setValue('closingStock', opening);
        form.setValue('closingStockUsable', Math.round(opening * usableMultiplier));
      } else {
        // Ongoing Inventory mode
        const opening = Number(openingStock) || 0;
        const received = Number(receivedQuantity) || 0;
        const returned = Number(returnedQuantity) || 0;
        const adjust = Number(adjustments) || 0;
        const closing = opening + received - returned + adjust;
        form.setValue('closingStock', closing);
        form.setValue('closingStockUsable', Math.round(closing * usableMultiplier));
      }
    }
  }, [selectedTypeDetails, isOpeningStockOnly, openingStock, receivedQuantity, returnedQuantity, adjustments, form.watch('usableDerivedUnits'), form]);

  // Auto-fill from PO item when selected
  useEffect(() => {
    if (selectedPOItemId && poItems.length > 0) {
      const selectedItem = poItems.find((pi: any) => pi.id === selectedPOItemId);
      if (selectedItem) {
        // Auto-fill material name from PO item
        form.setValue('materialName', selectedItem.itemName || '');
        form.setValue('description', selectedItem.description || '');
        
        // Auto-fill unit cost from PO (convert from paise to rupees)
        const unitPriceInRupees = (selectedItem.unitPrice || 0) / 100;
        form.setValue('unitCost', unitPriceInRupees);
        
        // Auto-fill received quantity from PO quantity
        const qty = parseFloat(selectedItem.quantity) || 0;
        form.setValue('receivedQuantity', qty);
        form.setValue('openingStock', qty);
        
        // Set PO references
        form.setValue('purchaseOrderId', selectedPOId);
        form.setValue('purchaseOrderItemId', selectedPOItemId);
        
        // Set today as received date
        const today = new Date().toISOString().split('T')[0];
        form.setValue('receivedDate', today);
        
        // Switch to ongoing inventory mode since we're receiving stock
        form.setValue('isOpeningStockOnly', 0);
      }
    }
  }, [selectedPOItemId, poItems, selectedPOId, form]);

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        // When editing, load existing values properly
        // Use explicit check for isOpeningStockOnly since 0 is a valid value
        const stockMode = item.isOpeningStockOnly !== undefined && item.isOpeningStockOnly !== null 
          ? item.isOpeningStockOnly 
          : 1;
        
        form.reset({
          materialCode: item.materialCode || undefined,
          materialName: item.materialName || '',
          description: item.description || '',
          category: item.category || '',
          typeId: item.typeId || '',
          isOpeningStockOnly: stockMode,
          openingStock: Number(item.openingStock) || 0,
          openingDate: item.openingDate || undefined,
          closingStock: item.closingStock !== undefined ? Number(item.closingStock) : undefined,
          closingStockUsable: item.closingStockUsable !== undefined ? Number(item.closingStockUsable) : undefined,
          receivedQuantity: Number(item.receivedQuantity) || 0,
          receivedDate: item.receivedDate || undefined,
          returnedQuantity: Number(item.returnedQuantity) || 0,
          adjustments: Number(item.adjustments) || 0,
          uomId: item.uomId || undefined,
          currentStock: Number(item.currentStock) || 0,
          reorderLevel: item.reorderLevel !== undefined ? Number(item.reorderLevel) : undefined,
          maxStockLevel: item.maxStockLevel !== undefined ? Number(item.maxStockLevel) : undefined,
          unitCost: item.unitCost !== undefined ? Number(item.unitCost) : undefined,
          gstRate: (item as any).gstRate !== undefined ? Number((item as any).gstRate) : 0,
          totalCost: (item as any).totalCost !== undefined ? Number((item as any).totalCost) : undefined,
          location: item.location || '',
          supplier: item.supplier || '',
          isActive: item.isActive || 'true',
          purchaseOrderId: (item as any).purchaseOrderId || undefined,
          purchaseOrderItemId: (item as any).purchaseOrderItemId || undefined,
        });
        
        // Set PO state for editing
        setSelectedPOId((item as any).purchaseOrderId || '');
        setSelectedPOItemId((item as any).purchaseOrderItemId || '');
        
        // Also set the type details for editing mode
        if (item.typeId) {
          const typeDetails = materialTypes.find(t => t.id === item.typeId);
          if (typeDetails) {
            setSelectedTypeDetails(typeDetails);
          }
        }
      } else {
        form.reset({
          materialCode: undefined,
          materialName: '',
          description: '',
          category: '',
          typeId: '',
          isOpeningStockOnly: 1,
          openingStock: 0,
          openingDate: undefined,
          closingStock: undefined,
          closingStockUsable: undefined,
          receivedQuantity: 0,
          receivedDate: undefined,
          returnedQuantity: 0,
          adjustments: 0,
          uomId: undefined,
          currentStock: 0,
          reorderLevel: undefined,
          maxStockLevel: undefined,
          unitCost: undefined,
          location: '',
          supplier: '',
          isActive: 'true',
          purchaseOrderId: undefined,
          purchaseOrderItemId: undefined,
        });
        setSelectedTypeDetails(null);
        setExistingTypeStock(0);
        setUserChangedType(false);
        setSelectedPOId('');
        setSelectedPOItemId('');
        setVendorPricingMode('same_as_base');
        setVendorQuotedPrice(undefined);
        setManualConversionFactor(undefined);
        setCustomPricingUnitName('');
      }
    }
  }, [item, open, form, materialTypes]);

  const handleSubmit = (data: z.infer<typeof insertRawMaterialSchema>) => {
    if (!selectedTypeDetails) {
      toast({ 
        title: "Error", 
        description: "Please select a Material Type", 
        variant: "destructive" 
      });
      return;
    }
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-testid="dialog-material">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the raw material details' : 'Create a new raw material entry with stock management'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Link to Purchase Order (Optional) */}
            {!item && availablePOs.length > 0 && (
              <div className="space-y-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Link to Purchase Order (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>Purchase Order</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        setSelectedPOId(value === 'none' ? '' : value);
                        setSelectedPOItemId('');
                      }} 
                      value={selectedPOId || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-purchase-order">
                          <SelectValue placeholder="Select Approved PO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- No PO Link --</SelectItem>
                        {availablePOs.map((po: any) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poNumber} - {po.vendorName || 'Unknown Vendor'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Select an approved PO to auto-fill details
                    </FormDescription>
                  </FormItem>
                  
                  {selectedPOId && (
                    <FormItem>
                      <FormLabel>PO Line Item</FormLabel>
                      <Select 
                        onValueChange={(value) => setSelectedPOItemId(value === 'none' ? '' : value)} 
                        value={selectedPOItemId || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-po-item">
                            <SelectValue placeholder="Select Line Item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Select Item --</SelectItem>
                          {availablePOItems.length > 0 ? (
                            availablePOItems.map((item: any) => (
                              <SelectItem key={item.id} value={item.id}>
                                #{item.serialNo}: {item.itemName} - Qty: {item.quantity}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              All items already received
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {availablePOItems.length > 0 
                          ? "Selecting an item will auto-fill material details"
                          : "All items from this PO have been received"}
                      </FormDescription>
                    </FormItem>
                  )}
                </div>
                {selectedPOItemId && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Material will be linked to this PO for traceability
                  </p>
                )}
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Material ID</FormLabel>
                  <Input disabled placeholder="AUTO (generated by system)" data-testid="input-material-id" />
                  <FormDescription className="text-xs">Auto-generated on save</FormDescription>
                </FormItem>
                <FormField
                  control={form.control}
                  name="materialName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Preform 21g" {...field} data-testid="input-material-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-material-category">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Preform">Preform</SelectItem>
                          <SelectItem value="Cap">Cap</SelectItem>
                          <SelectItem value="Label">Label</SelectItem>
                          <SelectItem value="Shrink">Shrink</SelectItem>
                          <SelectItem value="Adhesive">Adhesive</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="typeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Type *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Mark that user manually changed the type
                          if (!item) {
                            setUserChangedType(true);
                          }
                        }} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-material-type">
                            <SelectValue placeholder="Select Material Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredMaterialTypes.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              No types found for {selectedCategory || 'this category'}
                            </SelectItem>
                          ) : (
                            filteredMaterialTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.typeName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Auto-fetches units and conversion details
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            {/* Stock Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Stock Management</h3>
                  {!item && existingTypeStock > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Existing: {existingTypeStock} {selectedTypeDetails?.baseUnit || 'units'}
                    </Badge>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="isOpeningStockOnly"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel className="text-xs text-muted-foreground mb-0">
                        {field.value === 1 ? 'Opening Stock Only' : 'Ongoing Inventory'}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value === 0}
                          onCheckedChange={(checked) => field.onChange(checked ? 0 : 1)}
                          data-testid="switch-stock-mode"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Info message for existing stock */}
              {!item && existingTypeStock > 0 && (
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200 dark:border-blue-900">
                  This material type already has <strong>{existingTypeStock} {selectedTypeDetails?.baseUnit || 'units'}</strong> in inventory. 
                  The Opening Stock is prefilled with the current balance. Add received quantities to update inventory.
                </div>
              )}

              {isOpeningStockOnly === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openingStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Stock *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || 0} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-opening-stock"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Initial stock quantity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="openingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''} 
                            data-testid="input-opening-date"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Date of opening stock entry (used for batch code)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Show auto-generated batch code preview */}
                  {form.watch('openingDate') && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <span className="text-sm text-muted-foreground">Batch Code:</span>
                      <Badge variant="outline" className="font-mono">
                        LOT-{form.watch('openingDate')?.replace(/-/g, '') || 'YYYYMMDD'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(auto-generated on save)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openingStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Stock *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || 0} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-opening-stock"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Starting balance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receivedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || 0} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-received-quantity"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Quantity received
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receivedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''} 
                            data-testid="input-received-date"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Date material was received (used for batch code & FIFO)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Show auto-generated batch code preview */}
                  {form.watch('receivedDate') && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border col-span-2">
                      <span className="text-sm text-muted-foreground">Batch Code:</span>
                      <Badge variant="outline" className="font-mono">
                        LOT-{form.watch('receivedDate')?.replace(/-/g, '') || 'YYYYMMDD'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(auto-generated on save, used for FIFO)</span>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="returnedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Returned Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || 0} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-returned-quantity"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Quantity returned
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adjustments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adjustments</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value || 0} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            data-testid="input-adjustments"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Plus/minus adjustments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Calculated Closing Stock Display */}
              {selectedTypeDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Closing Stock (Base Units)</p>
                    <p className="text-lg font-semibold text-foreground" data-testid="text-closing-stock">
                      {form.watch('closingStock') !== undefined ? form.watch('closingStock')?.toFixed(2) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closing Stock (Usable Units)</p>
                    <p className="text-lg font-semibold text-foreground" data-testid="text-closing-stock-usable">
                      {form.watch('closingStockUsable') !== undefined ? Math.round(form.watch('closingStockUsable') || 0) : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Purchase Unit (Base Unit)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      disabled
                      value={selectedTypeDetails?.baseUnit || 'Select Material Type first'}
                      className="bg-muted"
                      data-testid="input-purchase-unit"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-green-600">
                    Auto-populated from Material Type
                  </FormDescription>
                </FormItem>
              </div>

              {/* Pricing Unit Selection - uses conversion data from Material Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormItem>
                  <FormLabel>Vendor Quotes In</FormLabel>
                  <Select 
                    onValueChange={(val) => {
                      setVendorPricingMode(val as 'same_as_base' | 'per_kg' | 'per_piece' | 'other');
                      if (val === 'same_as_base') {
                        setVendorQuotedPrice(undefined);
                        setManualConversionFactor(undefined);
                        setCustomPricingUnitName('');
                      }
                    }} 
                    value={vendorPricingMode}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-pricing-unit">
                        <SelectValue placeholder="Select pricing unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="same_as_base">
                        Per {selectedUom?.name || selectedTypeDetails?.baseUnit || 'Base Unit'}
                      </SelectItem>
                      <SelectItem value="per_kg" disabled={!canConvertToKg}>
                        Per KG {canConvertToKg ? `(${selectedTypeDetails?.baseUnitWeight} KG/${selectedTypeDetails?.baseUnit})` : '(not configured)'}
                      </SelectItem>
                      <SelectItem value="per_piece" disabled={!canConvertToPiece}>
                        Per {selectedTypeDetails?.derivedUnit || 'Piece'} {canConvertToPiece ? `(${selectedTypeDetails?.usableUnits} pcs/${selectedTypeDetails?.baseUnit})` : '(not configured)'}
                      </SelectItem>
                      <SelectItem value="other">Other Unit (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Conversion from Material Type: {selectedTypeDetails?.typeName || 'Select type first'}
                  </FormDescription>
                </FormItem>

                {vendorPricingMode !== 'same_as_base' && (
                  <>
                    {vendorPricingMode === 'other' && (
                      <>
                        <FormItem>
                          <FormLabel>Custom Unit Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Litre, Meter" 
                              value={customPricingUnitName}
                              onChange={(e) => setCustomPricingUnitName(e.target.value)}
                              data-testid="input-custom-unit-name"
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel>Conversion Factor</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="e.g., 25" 
                              value={manualConversionFactor ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualConversionFactor(val === '' ? undefined : parseFloat(val));
                              }}
                              data-testid="input-conversion-factor"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            How many {customPricingUnitName || 'units'} per {selectedUom?.name || 'Base Unit'}?
                          </FormDescription>
                        </FormItem>
                      </>
                    )}
                    <FormItem>
                      <FormLabel>
                        Vendor Price (₹ per {vendorPricingUnitLabel})
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="0.00" 
                          value={vendorQuotedPrice ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVendorQuotedPrice(val === '' ? undefined : parseFloat(val));
                          }}
                          data-testid="input-vendor-quoted-price"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {getConversionFactor && vendorQuotedPrice
                          ? `₹${vendorQuotedPrice} × ${getConversionFactor} = ₹${(vendorQuotedPrice * getConversionFactor).toFixed(2)}/${selectedUom?.name || 'Unit'}`
                          : vendorPricingMode === 'other' ? 'Enter conversion factor and price' : 'Enter vendor price'}
                      </FormDescription>
                    </FormItem>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => {
                    // Only disable if vendor pricing mode selected AND conversion factor available
                    const shouldDisable = vendorPricingMode !== 'same_as_base' && 
                      getConversionFactor !== undefined && getConversionFactor > 0;
                    
                    return (
                      <FormItem>
                        <FormLabel>Base Price (₹ per {selectedUom?.name || selectedTypeDetails?.baseUnit || 'Unit'})</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="0.00" 
                            disabled={shouldDisable}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : parseFloat(val));
                            }}
                            data-testid="input-material-unit-cost"
                          />
                        </FormControl>
                        {shouldDisable && (
                          <FormDescription className="text-xs text-green-600">
                            Auto-calculated from vendor price
                          </FormDescription>
                        )}
                        {vendorPricingMode !== 'same_as_base' && !shouldDisable && vendorPricingMode === 'other' && (
                          <FormDescription className="text-xs text-amber-600">
                            Enter conversion factor to auto-calculate
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="gstRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST %</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        value={field.value?.toString() || '0'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-material-gst">
                            <SelectValue placeholder="Select GST" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost per {selectedTypeDetails?.baseUnit || 'Unit'} (Incl. GST)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          disabled
                          placeholder="0.00" 
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-material-total-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>
                    {(() => {
                      const qty = Number(receivedQuantity) || Number(openingStock) || 0;
                      const unit = selectedTypeDetails?.baseUnit || 'Units';
                      if (qty > 0) {
                        return `Total Value for ${qty} ${unit}${qty > 1 ? 's' : ''} (₹)`;
                      }
                      return `Total Valuation (₹)`;
                    })()}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      disabled
                      placeholder="0.00" 
                      value={form.watch('totalValuation' as any) || ''}
                      data-testid="input-material-total-valuation"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    {(() => {
                      const base = Number(unitCost) || 0;
                      const gst = Number(gstRate) || 0;
                      const qty = Number(receivedQuantity) || Number(openingStock) || 0;
                      const unitWithGst = base + (base * gst / 100);
                      const total = unitWithGst * qty;
                      if (qty > 0 && unitWithGst > 0) {
                        return `₹${unitWithGst.toLocaleString('en-IN')} × ${qty} = ₹${total.toLocaleString('en-IN')}`;
                      }
                      return `(Unit Cost incl. GST) × Quantity`;
                    })()}
                  </FormDescription>
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Material description, notes, specifications..." 
                        {...field} 
                        value={field.value || ''} 
                        data-testid="input-material-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-Fetched Type Details Display */}
            {selectedTypeDetails && (
              <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                <h3 className="text-sm font-medium text-foreground">Type Details (Auto-Fetched)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Base Unit</p>
                    <p className="font-medium" data-testid="text-base-unit">{selectedTypeDetails.baseUnit || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Usable Units</p>
                    <p className="font-medium" data-testid="text-usable-units">{selectedTypeDetails.usableUnits || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Conversion Method</p>
                    <p className="font-medium" data-testid="text-conversion-method">{selectedTypeDetails.conversionMethod || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Loss %</p>
                    <p className="font-medium" data-testid="text-loss-percent">{selectedTypeDetails.lossPercent || 0}%</p>
                  </div>
                </div>

                <div className="pt-2 border-t mt-2">
                  <FormField
                    control={form.control}
                    name="usableDerivedUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Actual Pieces per {selectedTypeDetails?.baseUnit || 'Box'} (Entry Override)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            className="h-8 text-xs"
                            placeholder={selectedTypeDetails?.usableUnits?.toString() || "e.g., 6000"}
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : parseFloat(val));
                            }}
                            data-testid="input-material-usable-units-override"
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Enter actual pieces if different from type default ({selectedTypeDetails?.usableUnits || 0})
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>Enable or disable this raw material</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                      data-testid="switch-material-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} data-testid="button-submit">
                {isLoading ? 'Saving...' : (item ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FinishedGoodsTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const { role, hasPermission } = usePermissions();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detail' | 'consolidated'>('detail');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const itemsPerPage = 10;
  
  // Permission checks - 100% database driven
  const canCreate = hasPermission('finished_goods', 'create');
  const canEdit = hasPermission('finished_goods', 'edit');
  const canDelete = hasPermission('finished_goods', 'delete');

  // Filter states
  const [qualityStatusFilter, setQualityStatusFilter] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'range' | 'month' | 'year'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const { data: goods = [], isLoading } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  // Consolidated inventory view
  const { data: consolidatedData, isLoading: isConsolidatedLoading } = useQuery<{
    consolidated: Array<{
      productId: string;
      productName: string;
      productCode: string;
      batchNumber: string;
      totalQuantity: number;
      approvedQuantity: number;
      pendingQuantity: number;
      sourceBreakdown: {
        production: number;
        sales_return_restock: number;
        sales_return_repack: number;
      };
      details: Array<{
        id: string;
        quantity: number;
        qualityStatus: string;
        source: string;
        salesReturnItemId: string | null;
        createdAt: string;
      }>;
    }>;
    summary: {
      totalBatches: number;
      totalQuantity: number;
      totalApproved: number;
      totalPending: number;
      fromProduction: number;
      fromRestock: number;
      fromRepack: number;
    };
  }>({
    queryKey: ['/api/finished-goods/consolidated'],
    enabled: viewMode === 'consolidated',
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertFinishedGoodSchema>) => {
      return await apiRequest('POST', '/api/finished-goods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({ title: "Success", description: "Finished good created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertFinishedGoodSchema>> }) => {
      return await apiRequest('PATCH', `/api/finished-goods/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({ title: "Success", description: "Finished good updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/finished-goods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({ title: "Success", description: "Finished good deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      return await apiRequest('PATCH', `/api/finished-goods/${id}`, {
        qualityStatus: status,
        inspectionDate: new Date().toISOString(),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      const action = variables.status === 'approved' ? 'approved' : 'rejected';
      toast({ 
        title: "Success", 
        description: `Finished good ${action} successfully`,
        variant: variables.status === 'approved' ? 'default' : 'destructive'
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Helper to get product name
  const getProductNameById = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.productName.toLowerCase() : '';
  };

  // Comprehensive filtering logic
  const filteredItems = useMemo(() => {
    const filtered = goods.filter(item => {
      // Hide items with zero quantity
      if (item.quantity === 0) return false;
      
      // Search filter (batch number or product name)
      const productName = getProductNameById(item.productId);
      const matchesSearch = 
        item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        productName.includes(searchTerm.toLowerCase());
      
      // Quality status filter
      const itemQualityStatus = item.qualityStatus || 'pending';
      const matchesQualityStatus = 
        qualityStatusFilter === 'all' || 
        itemQualityStatus === qualityStatusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilterType !== 'all') {
        const itemDate = parseISO(item.productionDate);
        
        if (dateFilterType === 'range' && dateFrom && dateTo) {
          // Adjust dateTo to include the entire end day (23:59:59)
          const adjustedDateTo = new Date(dateTo);
          adjustedDateTo.setHours(23, 59, 59, 999);
          matchesDate = isWithinInterval(itemDate, { start: dateFrom, end: adjustedDateTo });
        } else if (dateFilterType === 'month' && selectedMonth) {
          const [year, month] = selectedMonth.split('-');
          matchesDate = format(itemDate, 'yyyy-MM') === `${year}-${month}`;
        } else if (dateFilterType === 'year' && selectedYear) {
          matchesDate = format(itemDate, 'yyyy') === selectedYear;
        }
      }
      
      return matchesSearch && matchesQualityStatus && matchesDate;
    });
    
    // Sort by production date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.productionDate).getTime();
      const dateB = new Date(b.productionDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
  }, [goods, products, searchTerm, qualityStatusFilter, dateFilterType, dateFrom, dateTo, selectedMonth, selectedYear]);

  // Clear filters function
  const clearFilters = () => {
    onSearchChange('');
    setQualityStatusFilter('all');
    setDateFilterType('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedMonth('');
    setSelectedYear('');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || qualityStatusFilter !== 'all' || dateFilterType !== 'all';

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: FinishedGood) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.productName : '-';
  };

  const getUomName = (uomId: string | null) => {
    if (!uomId) return '-';
    const uom = uoms.find(u => u.id === uomId);
    return uom ? uom.name : '-';
  };

  const getMachineName = (machineId: string | null) => {
    if (!machineId) return '-';
    const machine = machines.find(m => m.id === machineId);
    return machine ? machine.name : '-';
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return '-';
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '-';
  };

  const getQualityStatusVariant = (status: string | null): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by batch number or product..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-good"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'detail' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('detail')}
              className="rounded-r-none"
              data-testid="button-view-detail"
            >
              Detail View
            </Button>
            <Button
              variant={viewMode === 'consolidated' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('consolidated')}
              className="rounded-l-none"
              data-testid="button-view-consolidated"
            >
              Consolidated
            </Button>
          </div>
          {canCreate && (
            <Button onClick={handleAdd} data-testid="button-add-good">
              <Plus className="h-4 w-4 mr-2" />
              Add Finished Good
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="button-clear-good-filters"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quality Status Filter */}
              <div>
                <Label htmlFor="quality-status-filter" className="text-sm font-medium mb-1.5 block">
                  Quality Status
                </Label>
                <Select value={qualityStatusFilter} onValueChange={setQualityStatusFilter}>
                  <SelectTrigger id="quality-status-filter" data-testid="select-quality-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filter Type */}
              <div>
                <Label htmlFor="date-filter-type-good" className="text-sm font-medium mb-1.5 block">
                  Date Filter
                </Label>
                <Select value={dateFilterType} onValueChange={(value: 'all' | 'range' | 'month' | 'year') => setDateFilterType(value)}>
                  <SelectTrigger id="date-filter-type-good" data-testid="select-date-filter-type-good">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional date inputs based on filter type */}
              {dateFilterType === 'range' && (
                <>
                  <div>
                    <Label htmlFor="date-from-good" className="text-sm font-medium mb-1.5 block">
                      From Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-date-from-good"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="date-to-good" className="text-sm font-medium mb-1.5 block">
                      To Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-date-to-good"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {dateFilterType === 'month' && (
                <div>
                  <Label htmlFor="month-filter-good" className="text-sm font-medium mb-1.5 block">
                    Select Month
                  </Label>
                  <Input
                    id="month-filter-good"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    data-testid="input-month-filter-good"
                  />
                </div>
              )}

              {dateFilterType === 'year' && (
                <div>
                  <Label htmlFor="year-filter-good" className="text-sm font-medium mb-1.5 block">
                    Select Year
                  </Label>
                  <Input
                    id="year-filter-good"
                    type="number"
                    min="2000"
                    max="2099"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    placeholder="YYYY"
                    data-testid="input-year-filter-good"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consolidated View */}
      {viewMode === 'consolidated' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Consolidated Inventory by Batch
            </CardTitle>
            {consolidatedData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-muted-foreground">Total Batches</p>
                  <p className="text-2xl font-bold">{consolidatedData.summary.totalBatches}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{consolidatedData.summary.totalQuantity.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-md">
                  <p className="text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{consolidatedData.summary.totalApproved.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-md">
                  <p className="text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{consolidatedData.summary.totalPending.toLocaleString()}</p>
                </div>
              </div>
            )}
            {consolidatedData?.summary && (
              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div className="border p-3 rounded-md">
                  <p className="text-muted-foreground">From Production</p>
                  <p className="text-lg font-semibold">{consolidatedData.summary.fromProduction.toLocaleString()}</p>
                </div>
                <div className="border p-3 rounded-md">
                  <p className="text-muted-foreground">From Restock</p>
                  <p className="text-lg font-semibold text-blue-600">{consolidatedData.summary.fromRestock.toLocaleString()}</p>
                </div>
                <div className="border p-3 rounded-md">
                  <p className="text-muted-foreground">From Repack</p>
                  <p className="text-lg font-semibold text-purple-600">{consolidatedData.summary.fromRepack.toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isConsolidatedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : consolidatedData?.consolidated.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inventory data found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Source Breakdown</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consolidatedData?.consolidated.map((batch) => (
                    <Fragment key={`${batch.productId}-${batch.batchNumber}`}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedBatch(expandedBatch === `${batch.productId}-${batch.batchNumber}` ? null : `${batch.productId}-${batch.batchNumber}`)}
                        data-testid={`row-consolidated-${batch.batchNumber}`}
                      >
                        <TableCell>
                          <ChevronRight className={`h-4 w-4 transition-transform ${expandedBatch === `${batch.productId}-${batch.batchNumber}` ? 'rotate-90' : ''}`} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.productName}</div>
                            {batch.productCode && <div className="text-xs text-muted-foreground">{batch.productCode}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.batchNumber}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{batch.totalQuantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{batch.approvedQuantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-yellow-600">{batch.pendingQuantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {batch.sourceBreakdown.production > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Prod: {batch.sourceBreakdown.production}
                              </Badge>
                            )}
                            {batch.sourceBreakdown.sales_return_restock > 0 && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                Restock: {batch.sourceBreakdown.sales_return_restock}
                              </Badge>
                            )}
                            {batch.sourceBreakdown.sales_return_repack > 0 && (
                              <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                Repack: {batch.sourceBreakdown.sales_return_repack}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedBatch === `${batch.productId}-${batch.batchNumber}` && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4">
                            <div className="text-sm font-medium mb-2">Detail Records:</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {batch.details.map((detail: any) => (
                                <div key={detail.id} className="border rounded-md p-2 text-sm bg-background">
                                  <div className="flex justify-between">
                                    <span>Qty: <strong>{detail.quantity}</strong></span>
                                    <Badge variant={detail.qualityStatus === 'approved' ? 'default' : 'secondary'} className="text-xs">
                                      {detail.qualityStatus}
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground text-xs mt-1">
                                    Source: {detail.source || 'production'}
                                    {detail.salesReturnItemId && (
                                      <span className="ml-2">(Return Ref: {detail.salesReturnItemId.slice(0, 8)}...)</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail View */}
      {viewMode === 'detail' && (
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Production Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Quality Status</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {goods.length === 0 
                      ? "No finished goods found. Add your first finished good to get started."
                      : "No finished goods match your search criteria. Try adjusting your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-good-${item.id}`} className="cursor-pointer hover-elevate" onClick={() => navigate(`/finished-good/${item.id}`)}>
                    <TableCell className="font-medium" data-testid={`text-batch-${item.id}`}>{item.batchNumber}</TableCell>
                    <TableCell data-testid={`text-product-${item.id}`}>{getProductName(item.productId)}</TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-date-${item.id}`}>
                      {new Date(item.productionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell data-testid={`text-quantity-${item.id}`}>{item.quantity}</TableCell>
                    <TableCell data-testid={`text-uom-${item.id}`}>{getUomName(item.uomId)}</TableCell>
                    <TableCell data-testid={`badge-quality-${item.id}`}>
                      <Badge variant={getQualityStatusVariant(item.qualityStatus)}>
                        {item.qualityStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-machine-${item.id}`}>{getMachineName(item.machineId)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.qualityStatus === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); approvalMutation.mutate({ id: item.id, status: 'approved' }); }}
                              disabled={approvalMutation.isPending}
                              title="Approve"
                              data-testid={`button-approve-${item.id}`}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); approvalMutation.mutate({ id: item.id, status: 'rejected' }); }}
                              disabled={approvalMutation.isPending}
                              title="Reject"
                              data-testid={`button-reject-${item.id}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      )}

      {viewMode === 'detail' && totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}

      <FinishedGoodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        products={products}
        uoms={uoms}
        users={users}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Finished Good</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this finished good? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-finished-good">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-finished-good"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FinishedGoodDialog({ 
  open, 
  onOpenChange, 
  item, 
  products,
  uoms,
  users,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: FinishedGood | null; 
  products: Product[];
  uoms: Uom[];
  users: User[];
  onSubmit: (data: z.infer<typeof insertFinishedGoodSchema>) => void;
  isLoading: boolean;
}) {
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [pendingData, setPendingData] = useState<z.infer<typeof insertFinishedGoodSchema> | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ batchNumber: string; quantity: number; productionDate: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const form = useForm<z.infer<typeof insertFinishedGoodSchema>>({
    resolver: zodResolver(insertFinishedGoodSchema),
    defaultValues: {
      productId: '',
      batchNumber: '',
      productionDate: new Date().toISOString().split('T')[0],
      quantity: 0,
      uomId: undefined,
      qualityStatus: 'approved', // Default to approved for manual entry
      machineId: undefined,
      operatorId: undefined,
      inspectedBy: undefined,
      inspectionDate: undefined,
      storageLocation: '',
      remarks: '',
    },
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        // Helper to safely extract date string without timezone issues
        const getDateString = (dateValue: string | Date | null | undefined): string => {
          if (!dateValue) return new Date().toISOString().split('T')[0];
          // If it's already a YYYY-MM-DD string, use it directly
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
          }
          // If it has time component, extract just the date part
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0];
          }
          // For other formats, parse and format using local timezone
          const date = new Date(dateValue);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
        
        form.reset({
          productId: item.productId || '',
          batchNumber: item.batchNumber || '',
          productionDate: getDateString(item.productionDate),
          quantity: item.quantity || 0,
          uomId: item.uomId || undefined,
          qualityStatus: item.qualityStatus || 'pending',
          machineId: item.machineId || undefined,
          operatorId: item.operatorId || undefined,
          inspectedBy: item.inspectedBy || undefined,
          inspectionDate: item.inspectionDate ? getDateString(item.inspectionDate) : undefined,
          storageLocation: item.storageLocation || '',
          remarks: item.remarks || '',
        });
      } else {
        form.reset({
          productId: '',
          batchNumber: '',
          productionDate: new Date().toISOString().split('T')[0],
          quantity: 0,
          uomId: undefined,
          qualityStatus: 'approved', // Default to approved for manual entry
          machineId: undefined,
          operatorId: undefined,
          inspectedBy: undefined,
          inspectionDate: undefined,
          storageLocation: '',
          remarks: '',
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = async (data: z.infer<typeof insertFinishedGoodSchema>) => {
    // Skip duplicate check when editing existing item
    if (item) {
      onSubmit(data);
      return;
    }

    // Check if batch number already exists for new entries
    setIsChecking(true);
    try {
      const response = await fetch(`/api/finished-goods/check-batch/${encodeURIComponent(data.batchNumber)}`);
      const result = await response.json();
      
      if (result.exists) {
        // Show warning dialog
        setDuplicateInfo(result.existingItem);
        setPendingData(data);
        setDuplicateWarningOpen(true);
      } else {
        // No duplicate, proceed with creation
        onSubmit(data);
      }
    } catch (error) {
      console.error("Error checking batch number:", error);
      // On error, proceed anyway (backend will handle final validation)
      onSubmit(data);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmDuplicate = () => {
    if (pendingData) {
      onSubmit(pendingData);
    }
    setDuplicateWarningOpen(false);
    setPendingData(null);
    setDuplicateInfo(null);
  };

  const handleCancelDuplicate = () => {
    setDuplicateWarningOpen(false);
    setPendingData(null);
    setDuplicateInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" data-testid="dialog-good">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Finished Good' : 'Add Finished Good'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update the finished good details' : 'Create a new finished good record'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-product">
                          <SelectValue placeholder="Select Product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.filter(p => p.isActive === 'true').map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName} ({product.productCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BATCH-20251104-001" {...field} data-testid="input-good-batch" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="productionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value as string} data-testid="input-good-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="0" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? 0 : parseInt(val, 10));
                        }}
                        data-testid="input-good-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="uomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UOM</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-uom">
                          <SelectValue placeholder="Select UOM" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uoms.filter(u => u.isActive === 'true').map(uom => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.name} ({uom.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qualityStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'approved'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-quality">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inspectedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspected By</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-inspector">
                          <SelectValue placeholder="Select Inspector" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.filter(u => ['reviewer', 'manager', 'admin'].includes((u.role || '').toLowerCase())).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="storageLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Warehouse B, Section 3" {...field} value={field.value || ''} data-testid="input-good-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes..." 
                      {...field} 
                      value={field.value || ''} 
                      data-testid="input-good-remarks"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-finished-good">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isChecking} data-testid="button-submit-finished-good">
                {isChecking ? 'Checking...' : isLoading ? 'Saving...' : (item ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Duplicate Batch Warning Dialog */}
      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Batch Code Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>A finished good with batch code <strong>{duplicateInfo?.batchNumber}</strong> already exists:</p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p><strong>Existing Quantity:</strong> {duplicateInfo?.quantity}</p>
                  <p><strong>Production Date:</strong> {duplicateInfo?.productionDate ? new Date(duplicateInfo.productionDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <p className="text-amber-600 font-medium">Do you still want to create a new entry with the same batch code?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDuplicate} data-testid="button-cancel-duplicate">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate} data-testid="button-confirm-duplicate">
              Yes, Create Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
