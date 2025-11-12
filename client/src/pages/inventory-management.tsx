import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, Package, Layers, Box, CheckCircle, Users, Minus } from "lucide-react";
import VendorManagement from "@/components/VendorManagement";
import BankManagement from "@/components/BankManagement";
import { GlobalHeader } from "@/components/GlobalHeader";

interface InventoryManagementProps {
  activeTab?: string;
}

export default function InventoryManagement({ activeTab: externalActiveTab }: InventoryManagementProps = {}) {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState(externalActiveTab || "uom");
  const [searchTerm, setSearchTerm] = useState("");

  // Update activeTab when externalActiveTab changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  if (!user || !['admin', 'manager'].includes(user.role || '')) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to access Inventory Management. This feature is only available to Admin and Manager roles.</p>
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

  return (
    <>
      <div className="bg-background">
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage units, products, raw materials, and finished goods</p>
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Uom | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        <Button onClick={handleAdd} data-testid="button-add-uom">
          <Plus className="h-4 w-4 mr-2" />
          Add UOM
        </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

function ProductsTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const saveProductWithBomMutation = useMutation({
    mutationFn: async ({ mode, id, data }: { mode: 'create' | 'update'; id?: string; data: ProductFormData }) => {
      // Extract BOM items from form data
      const { bomItems, ...productData } = data;
      
      // Step 1: Save product
      let productId: string;
      let savedProduct: Product;
      if (mode === 'create') {
        const result = await apiRequest('POST', '/api/products', productData);
        productId = result.id;
        savedProduct = result; // Full product object returned from API
      } else {
        const result = await apiRequest('PATCH', `/api/products/${id}`, productData);
        productId = id!;
        savedProduct = result; // Full product object returned from API
      }

      // Step 2: Save BOM (bulk replace) - only if bomItems exist
      let bomSuccess = true;
      let bomError: string | null = null;
      if (bomItems && bomItems.length > 0) {
        try {
          await apiRequest('POST', `/api/products/${productId}/bom`, bomItems);
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

  const filteredItems = products.filter(item =>
    item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

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
        <Button onClick={handleAdd} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

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
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-product-${item.id}`}>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <ProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        uoms={uoms}
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
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: Product | null; 
  uoms: Uom[];
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [bomSaving, setBomSaving] = useState(false);

  // Fetch raw materials for BOM dropdown
  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
    enabled: open,
  });

  // Fetch existing BOM when editing
  const { data: existingBom = [] } = useQuery<any[]>({
    queryKey: ['/api/products', item?.id, 'bom'],
    queryFn: async () => {
      if (!item?.id) return [];
      const response = await fetch(`/api/products/${item.id}/bom`);
      if (!response.ok) throw new Error('Failed to fetch BOM');
      return response.json();
    },
    enabled: open && !!item?.id,
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productCode: '',
      productName: '',
      description: '',
      category: '',
      skuCode: '',
      productType: '',
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
          category: item.category || '',
          skuCode: item.skuCode || '',
          productType: item.productType || '',
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
        });
        // Hydrate BOM items when editing
        if (existingBom.length > 0) {
          replace(existingBom.map(bom => ({
            rawMaterialId: bom.rawMaterialId || bom.raw_material_id,
            quantityRequired: bom.quantityRequired || bom.quantity_required,
            uom: bom.uom || '',
            notes: bom.notes || '',
          })));
        } else {
          replace([]);
        }
      } else {
        form.reset({
          productCode: '',
          productName: '',
          description: '',
          category: '',
          skuCode: '',
          productType: '',
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
        });
        replace([]);
      }
      setActiveTab("info");
    }
  }, [item, open, form, existingBom, replace]);

  const handleAddBomRow = () => {
    append({ rawMaterialId: '', quantityRequired: 0, uom: '', notes: '' } as any);
  };

  const handleSubmit = async (data: ProductFormData) => {
    // Pass the complete form data (including bomItems) to parent's onSubmit
    // Parent will handle the two-step mutation (product save + BOM bulk replace)
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto" data-testid="dialog-product">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update product details and bill of materials' : 'Create a new product with packaging, pricing, and BOM'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pointer-events-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="pointer-events-auto">
              <TabsList className="grid w-full grid-cols-4 pointer-events-auto">
                <TabsTrigger value="info" data-testid="tab-info" className="pointer-events-auto">Product Info</TabsTrigger>
                <TabsTrigger value="packaging" data-testid="tab-packaging" className="pointer-events-auto">Packaging</TabsTrigger>
                <TabsTrigger value="pricing" data-testid="tab-pricing" className="pointer-events-auto">Pricing/Tax</TabsTrigger>
                <TabsTrigger value="bom" data-testid="tab-bom" className="pointer-events-auto">BOM</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Beverages" {...field} value={field.value || ''} data-testid="input-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Finished Goods" {...field} value={field.value || ''} data-testid="input-product-type" />
                        </FormControl>
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
              </TabsContent>

              <TabsContent value="packaging" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="kg" {...field} value={field.value || ''} data-testid="input-base-unit" />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="bottle" {...field} value={field.value || ''} data-testid="input-derived-unit" />
                        </FormControl>
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
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Formula-Based">Formula-Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {conversionMethod === 'Direct' && (
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

                {(conversionMethod === 'Direct' || conversionMethod === 'Formula-Based') && (
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
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (Paise)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50000" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-base-price"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">Price in paise (₹500 = 50000 paise)</FormDescription>
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
                    <FormLabel>Total Price with GST (Paise)</FormLabel>
                    <Input 
                      value={calculatedTotalPrice} 
                      disabled 
                      className="bg-muted font-semibold"
                      data-testid="display-total-price"
                    />
                    <FormDescription className="text-xs">
                      ₹{(calculatedTotalPrice / 100).toFixed(2)} (Auto-calculated)
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
              </TabsContent>

              <TabsContent value="bom" className="space-y-4 mt-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Material</TableHead>
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
                            No BOM items. Click "Add Row" to add raw materials.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Select 
                                value={(field as any).rawMaterialId || ''} 
                                onValueChange={(value) => form.setValue(`bomItems.${index}.rawMaterialId` as any, value)}
                              >
                                <SelectTrigger data-testid={`select-bom-material-${index}`}>
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rawMaterials.filter(rm => rm.recordStatus === 1).map(rm => (
                                    <SelectItem key={rm.id} value={rm.id}>
                                      {rm.materialCode} - {rm.materialName}
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
                                value={(field as any).quantityRequired || ''} 
                                onChange={(e) => form.setValue(`bomItems.${index}.quantityRequired` as any, parseFloat(e.target.value) || 0)}
                                data-testid={`input-bom-quantity-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="kg" 
                                value={(field as any).uom || ''} 
                                onChange={(e) => form.setValue(`bomItems.${index}.uom` as any, e.target.value)}
                                data-testid={`input-bom-uom-${index}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Optional notes" 
                                value={(field as any).notes || ''} 
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddBomRow}
                  data-testid="button-add-bom-row"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </TabsContent>
            </Tabs>

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { data: materials = [], isLoading } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertRawMaterialSchema>) => {
      return await apiRequest('POST', '/api/raw-materials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
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

  const filteredItems = materials.filter(item =>
    item.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.materialName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            data-testid="input-search-material"
          />
        </div>
        <Button onClick={handleAdd} data-testid="button-add-material">
          <Plus className="h-4 w-4 mr-2" />
          Add Raw Material
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Code</TableHead>
                <TableHead>Name</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No raw materials found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-material-${item.id}`}>
                    <TableCell className="font-medium" data-testid={`text-code-${item.id}`}>{item.materialCode}</TableCell>
                    <TableCell data-testid={`text-name-${item.id}`}>{item.materialName}</TableCell>
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
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <RawMaterialDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        uoms={uoms}
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
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: RawMaterial | null; 
  uoms: Uom[];
  onSubmit: (data: z.infer<typeof insertRawMaterialSchema>) => void;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [selectedTypeDetails, setSelectedTypeDetails] = useState<RawMaterialType | null>(null);
  
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
    },
  });

  // Fetch Material Types
  const { data: materialTypes = [] } = useQuery<RawMaterialType[]>({
    queryKey: ['/api/raw-material-types'],
  });

  // Watch for Material Type selection and stock mode changes
  const selectedTypeId = form.watch('typeId');
  const isOpeningStockOnly = form.watch('isOpeningStockOnly');
  const openingStock = form.watch('openingStock');
  const receivedQuantity = form.watch('receivedQuantity');
  const returnedQuantity = form.watch('returnedQuantity');
  const adjustments = form.watch('adjustments');

  // Auto-fetch Material Type details when type is selected
  useEffect(() => {
    if (selectedTypeId && selectedTypeId !== '') {
      const typeDetails = materialTypes.find(t => t.id === selectedTypeId);
      if (typeDetails) {
        setSelectedTypeDetails(typeDetails);
      }
    } else {
      setSelectedTypeDetails(null);
    }
  }, [selectedTypeId, materialTypes]);

  // Auto-calculate closing stock when relevant fields change
  useEffect(() => {
    if (selectedTypeDetails) {
      const usableMultiplier = Number(selectedTypeDetails.usableUnits) || 0;
      
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
  }, [selectedTypeDetails, isOpeningStockOnly, openingStock, receivedQuantity, returnedQuantity, adjustments, form]);

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          materialCode: item.materialCode || undefined,
          materialName: item.materialName || '',
          description: item.description || '',
          category: item.category || '',
          typeId: item.typeId || '',
          isOpeningStockOnly: item.isOpeningStockOnly || 1,
          openingStock: item.openingStock || 0,
          openingDate: item.openingDate || undefined,
          closingStock: item.closingStock || undefined,
          closingStockUsable: item.closingStockUsable || undefined,
          receivedQuantity: item.receivedQuantity || 0,
          returnedQuantity: item.returnedQuantity || 0,
          adjustments: item.adjustments || 0,
          uomId: item.uomId || undefined,
          currentStock: item.currentStock || 0,
          reorderLevel: item.reorderLevel || undefined,
          maxStockLevel: item.maxStockLevel || undefined,
          unitCost: item.unitCost || undefined,
          location: item.location || '',
          supplier: item.supplier || '',
          isActive: item.isActive || 'true',
        });
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
        });
        setSelectedTypeDetails(null);
      }
    }
  }, [item, open, form]);

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
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-material-type">
                            <SelectValue placeholder="Select Material Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materialTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.typeName}
                            </SelectItem>
                          ))}
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
              </div>
            )}

            {/* Stock Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Stock Management</h3>
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
                          Date of opening stock entry
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinishedGood | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { data: goods = [], isLoading } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
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

  const filteredItems = goods.filter(item =>
    item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Search by batch number..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-good"
          />
        </div>
        <Button onClick={handleAdd} data-testid="button-add-good">
          <Plus className="h-4 w-4 mr-2" />
          Add Finished Good
        </Button>
      </div>

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
                    No finished goods found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-good-${item.id}`}>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <FinishedGoodDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        products={products}
        uoms={uoms}
        machines={machines}
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
  machines,
  users,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: FinishedGood | null; 
  products: Product[];
  uoms: Uom[];
  machines: Machine[];
  users: User[];
  onSubmit: (data: z.infer<typeof insertFinishedGoodSchema>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof insertFinishedGoodSchema>>({
    resolver: zodResolver(insertFinishedGoodSchema),
    defaultValues: {
      productId: '',
      batchNumber: '',
      productionDate: new Date().toISOString().split('T')[0],
      quantity: 0,
      uomId: undefined,
      qualityStatus: 'pending',
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
        form.reset({
          productId: item.productId || '',
          batchNumber: item.batchNumber || '',
          productionDate: item.productionDate ? new Date(item.productionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          quantity: item.quantity || 0,
          uomId: item.uomId || undefined,
          qualityStatus: item.qualityStatus || 'pending',
          machineId: item.machineId || undefined,
          operatorId: item.operatorId || undefined,
          inspectedBy: item.inspectedBy || undefined,
          inspectionDate: item.inspectionDate ? new Date(item.inspectionDate).toISOString().split('T')[0] : undefined,
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
          qualityStatus: 'pending',
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

  const handleSubmit = (data: z.infer<typeof insertFinishedGoodSchema>) => {
    onSubmit(data);
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
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                    <Select onValueChange={field.onChange} value={field.value || 'pending'}>
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
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-machine">
                          <SelectValue placeholder="Select Machine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {machines.filter(m => m.status === 'active').map(machine => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name}
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
                name="operatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-good-operator">
                          <SelectValue placeholder="Select Operator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.filter(u => u.role === 'operator').map(user => (
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
                        {users.filter(u => ['reviewer', 'manager', 'admin'].includes(u.role || '')).map(user => (
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
