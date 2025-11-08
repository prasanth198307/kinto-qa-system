import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, Plus, Pencil, Trash2, Star, Package, Shield, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceTemplate, TermsConditions } from "@shared/schema";

interface TemplateManagementProps {
  activeTab?: string;
}

export default function TemplateManagement({ activeTab: externalActiveTab }: TemplateManagementProps = {}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(externalActiveTab || "invoice-templates");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access Template Management. This feature is only available to Admin users.</p>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'invoice-templates':
        return <InvoiceTemplatesTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      case 'terms-conditions':
        return <TermsConditionsTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
      default:
        return <InvoiceTemplatesTab searchTerm={searchTerm} onSearchChange={setSearchTerm} />;
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground mt-1">Manage invoice templates and terms & conditions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="invoice-templates" data-testid="tab-invoice-templates">
            <FileText className="w-4 h-4 mr-2" />
            Invoice Templates
          </TabsTrigger>
          <TabsTrigger value="terms-conditions" data-testid="tab-terms-conditions">
            <Shield className="w-4 h-4 mr-2" />
            Terms & Conditions
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceTemplatesTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<InvoiceTemplate[]>({
    queryKey: ['/api/invoice-templates'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/invoice-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-templates'] });
      toast({ title: "Success", description: "Invoice template created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/invoice-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-templates'] });
      toast({ title: "Success", description: "Invoice template updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/invoice-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-templates'] });
      toast({ title: "Success", description: "Invoice template deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/invoice-templates/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-templates'] });
      toast({ title: "Success", description: "Default template set successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredItems = templates.filter(item =>
    item.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: InvoiceTemplate) => {
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
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
          data-testid="input-search-templates"
        />
        <Button onClick={handleAdd} data-testid="button-add-template">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Seller Name</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading templates...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((template) => (
                <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                  <TableCell className="font-medium">{template.templateName}</TableCell>
                  <TableCell>{template.defaultSellerName}</TableCell>
                  <TableCell>{template.defaultSellerGstin}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {template.isDefault ? (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" data-testid="icon-default" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        data-testid={`button-set-default-${template.id}`}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        data-testid={`button-delete-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingItem={editingItem}
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
        <AlertDialogContent data-testid="dialog-delete-template-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-template">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-template"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  editingItem,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: InvoiceTemplate | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    templateName: '',
    defaultSellerName: '',
    defaultSellerGstin: '',
    defaultSellerAddress: '',
    defaultSellerState: '',
    defaultSellerStateCode: '',
    defaultSellerPhone: '',
    defaultSellerEmail: '',
    defaultBankName: '',
    defaultBankAccountNumber: '',
    defaultBankIfscCode: '',
    defaultBranchName: '',
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        templateName: editingItem.templateName,
        defaultSellerName: editingItem.defaultSellerName || '',
        defaultSellerGstin: editingItem.defaultSellerGstin || '',
        defaultSellerAddress: editingItem.defaultSellerAddress || '',
        defaultSellerState: editingItem.defaultSellerState || '',
        defaultSellerStateCode: editingItem.defaultSellerStateCode || '',
        defaultSellerPhone: editingItem.defaultSellerPhone || '',
        defaultSellerEmail: editingItem.defaultSellerEmail || '',
        defaultBankName: editingItem.defaultBankName || '',
        defaultBankAccountNumber: editingItem.defaultBankAccountNumber || '',
        defaultBankIfscCode: editingItem.defaultBankIfscCode || '',
        defaultBranchName: editingItem.defaultBranchName || '',
        isActive: editingItem.isActive === 1,
        isDefault: editingItem.isDefault === 1,
      });
    } else {
      setFormData({
        templateName: '',
        defaultSellerName: '',
        defaultSellerGstin: '',
        defaultSellerAddress: '',
        defaultSellerState: '',
        defaultSellerStateCode: '',
        defaultSellerPhone: '',
        defaultSellerEmail: '',
        defaultBankName: '',
        defaultBankAccountNumber: '',
        defaultBankIfscCode: '',
        defaultBranchName: '',
        isActive: true,
        isDefault: false,
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      isActive: formData.isActive ? 1 : 0,
      isDefault: formData.isDefault ? 1 : 0,
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Invoice Template' : 'Add Invoice Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                required
                data-testid="input-template-name"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                  data-testid="checkbox-is-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                  data-testid="checkbox-is-default"
                />
                <Label htmlFor="isDefault">Set as Default</Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Seller Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultSellerName">Seller Name *</Label>
                  <Input
                    id="defaultSellerName"
                    value={formData.defaultSellerName}
                    onChange={(e) => setFormData({ ...formData, defaultSellerName: e.target.value })}
                    required
                    data-testid="input-seller-name"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSellerGstin">GSTIN *</Label>
                  <Input
                    id="defaultSellerGstin"
                    value={formData.defaultSellerGstin}
                    onChange={(e) => setFormData({ ...formData, defaultSellerGstin: e.target.value })}
                    required
                    data-testid="input-seller-gstin"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="defaultSellerAddress">Address</Label>
                  <Textarea
                    id="defaultSellerAddress"
                    value={formData.defaultSellerAddress}
                    onChange={(e) => setFormData({ ...formData, defaultSellerAddress: e.target.value })}
                    data-testid="input-seller-address"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSellerState">State</Label>
                  <Input
                    id="defaultSellerState"
                    value={formData.defaultSellerState}
                    onChange={(e) => setFormData({ ...formData, defaultSellerState: e.target.value })}
                    data-testid="input-seller-state"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSellerStateCode">State Code</Label>
                  <Input
                    id="defaultSellerStateCode"
                    value={formData.defaultSellerStateCode}
                    onChange={(e) => setFormData({ ...formData, defaultSellerStateCode: e.target.value })}
                    data-testid="input-seller-state-code"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSellerPhone">Phone</Label>
                  <Input
                    id="defaultSellerPhone"
                    value={formData.defaultSellerPhone}
                    onChange={(e) => setFormData({ ...formData, defaultSellerPhone: e.target.value })}
                    data-testid="input-seller-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultSellerEmail">Email</Label>
                  <Input
                    id="defaultSellerEmail"
                    type="email"
                    value={formData.defaultSellerEmail}
                    onChange={(e) => setFormData({ ...formData, defaultSellerEmail: e.target.value })}
                    data-testid="input-seller-email"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultBankName">Bank Name</Label>
                  <Input
                    id="defaultBankName"
                    value={formData.defaultBankName}
                    onChange={(e) => setFormData({ ...formData, defaultBankName: e.target.value })}
                    data-testid="input-bank-name"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultBankAccountNumber">Account Number</Label>
                  <Input
                    id="defaultBankAccountNumber"
                    value={formData.defaultBankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, defaultBankAccountNumber: e.target.value })}
                    data-testid="input-bank-account-number"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultBankIfscCode">IFSC Code</Label>
                  <Input
                    id="defaultBankIfscCode"
                    value={formData.defaultBankIfscCode}
                    onChange={(e) => setFormData({ ...formData, defaultBankIfscCode: e.target.value })}
                    data-testid="input-bank-ifsc"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultBranchName">Branch</Label>
                  <Input
                    id="defaultBranchName"
                    value={formData.defaultBranchName}
                    onChange={(e) => setFormData({ ...formData, defaultBranchName: e.target.value })}
                    data-testid="input-bank-branch"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="button-submit">
              {isLoading ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TermsConditionsTab({ searchTerm, onSearchChange }: { searchTerm: string; onSearchChange: (value: string) => void }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TermsConditions | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: tcs = [], isLoading } = useQuery<TermsConditions[]>({
    queryKey: ['/api/terms-conditions'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/terms-conditions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/terms-conditions'] });
      toast({ title: "Success", description: "Terms & conditions created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/terms-conditions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/terms-conditions'] });
      toast({ title: "Success", description: "Terms & conditions updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/terms-conditions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/terms-conditions'] });
      toast({ title: "Success", description: "Terms & conditions deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/terms-conditions/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/terms-conditions'] });
      toast({ title: "Success", description: "Default terms & conditions set successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredItems = tcs.filter(item =>
    item.tcName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: TermsConditions) => {
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
      setItemToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search terms & conditions..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
          data-testid="input-search-tc"
        />
        <Button onClick={handleAdd} data-testid="button-add-tc">
          <Plus className="w-4 h-4 mr-2" />
          Add Terms & Conditions
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading terms & conditions...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No terms & conditions found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((tc) => (
                <TableRow key={tc.id} data-testid={`row-tc-${tc.id}`}>
                  <TableCell className="font-medium">{tc.tcName}</TableCell>
                  <TableCell>{tc.terms.length} point(s)</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${tc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {tc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {tc.isDefault ? (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" data-testid="icon-default-tc" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(tc.id)}
                        data-testid={`button-set-default-tc-${tc.id}`}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tc)}
                        data-testid={`button-edit-tc-${tc.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tc.id)}
                        data-testid={`button-delete-tc-${tc.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TCDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingItem={editingItem}
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
        <AlertDialogContent data-testid="dialog-delete-tc-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terms & Conditions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this terms & conditions set? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-tc">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-tc"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TCDialog({
  open,
  onOpenChange,
  editingItem,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: TermsConditions | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    tcName: '',
    terms: [''],
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        tcName: editingItem.tcName,
        terms: editingItem.terms.length > 0 ? editingItem.terms : [''],
        isActive: editingItem.isActive === 1,
        isDefault: editingItem.isDefault === 1,
      });
    } else {
      setFormData({
        tcName: '',
        terms: [''],
        isActive: true,
        isDefault: false,
      });
    }
  }, [editingItem, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      terms: formData.terms.filter(p => p.trim() !== ''),
      isActive: formData.isActive ? 1 : 0,
      isDefault: formData.isDefault ? 1 : 0,
    };
    onSubmit(submitData);
  };

  const addPoint = () => {
    setFormData({ ...formData, terms: [...formData.terms, ''] });
  };

  const removePoint = (index: number) => {
    setFormData({
      ...formData,
      terms: formData.terms.filter((_, i) => i !== index),
    });
  };

  const updatePoint = (index: number, value: string) => {
    const newTerms = [...formData.terms];
    newTerms[index] = value;
    setFormData({ ...formData, terms: newTerms });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-tc">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Terms & Conditions' : 'Add Terms & Conditions'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="tcName">Name *</Label>
              <Input
                id="tcName"
                value={formData.tcName}
                onChange={(e) => setFormData({ ...formData, tcName: e.target.value })}
                required
                data-testid="input-tc-name"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                  data-testid="checkbox-tc-is-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                  data-testid="checkbox-tc-is-default"
                />
                <Label htmlFor="isDefault">Set as Default</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Points *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPoint} data-testid="button-add-point">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Point
                </Button>
              </div>
              <div className="space-y-2">
                {formData.terms.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      value={point}
                      onChange={(e) => updatePoint(index, e.target.value)}
                      placeholder={`Point ${index + 1}`}
                      className="flex-1"
                      data-testid={`input-point-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePoint(index)}
                      disabled={formData.terms.length === 1}
                      data-testid={`button-remove-point-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-tc">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="button-submit-tc">
              {isLoading ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
