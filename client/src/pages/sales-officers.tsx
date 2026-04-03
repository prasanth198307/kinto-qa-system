import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ArrowLeft, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

interface SalesOfficer {
  id: string;
  name: string;
  code: string;
  mobileNumber: string | null;
  email: string | null;
  territory: string | null;
  isActive: number;
  recordStatus: number;
  createdAt: string | null;
  updatedAt: string | null;
}

const emptyForm = {
  name: "",
  code: "",
  mobileNumber: "",
  email: "",
  territory: "",
  isActive: true,
};

type FormData = typeof emptyForm;

interface OfficerFormFieldsProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
}

function OfficerFormFields({ formData, setFormData, errors }: OfficerFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="so-name">Name *</Label>
          <Input
            id="so-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Full name"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="so-code">Code *</Label>
          <Input
            id="so-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g. SO001"
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="so-mobile">Mobile Number</Label>
          <Input
            id="so-mobile"
            value={formData.mobileNumber}
            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            placeholder="10-digit mobile"
          />
          {errors.mobileNumber && <p className="text-xs text-destructive">{errors.mobileNumber}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="so-email">Email</Label>
          <Input
            id="so-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="so-territory">Territory / Area</Label>
          <Input
            id="so-territory"
            value={formData.territory}
            onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
            placeholder="e.g. Vizag North"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="so-active"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="so-active">Active</Label>
      </div>
    </div>
  );
}

export default function SalesOfficersPage({ showHeader = true }: { showHeader?: boolean }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { logoutMutation } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<SalesOfficer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<SalesOfficer | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: officers = [], isLoading } = useQuery<SalesOfficer[]>({
    queryKey: ["/api/sales-officers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await apiRequest("POST", "/api/sales-officers", {
        ...data,
        isActive: data.isActive ? 1 : 0,
        mobileNumber: data.mobileNumber || null,
        email: data.email || null,
        territory: data.territory || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-officers"] });
      setIsCreateOpen(false);
      setFormData(emptyForm);
      toast({ title: "Sales Officer Created", description: "The sales officer has been added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create sales officer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      const res = await apiRequest("PATCH", `/api/sales-officers/${id}`, {
        ...data,
        isActive: data.isActive ? 1 : 0,
        mobileNumber: data.mobileNumber || null,
        email: data.email || null,
        territory: data.territory || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-officers"] });
      setIsEditOpen(false);
      setEditingOfficer(null);
      toast({ title: "Sales Officer Updated", description: "The sales officer has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update sales officer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/sales-officers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-officers"] });
      setDeleteConfirmOpen(false);
      setOfficerToDelete(null);
      toast({ title: "Sales Officer Deleted", description: "The sales officer has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete sales officer", variant: "destructive" });
    },
  });

  const validate = (data: typeof emptyForm) => {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = "Name is required";
    if (!data.code.trim()) errs.code = "Code is required";
    if (data.mobileNumber && !/^\d{10}$/.test(data.mobileNumber.trim())) {
      errs.mobileNumber = "Mobile must be a 10-digit number";
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    return errs;
  };

  const handleCreate = () => {
    const errs = validate(formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingOfficer) return;
    const errs = validate(formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    updateMutation.mutate({ id: editingOfficer.id, data: formData });
  };

  const openEdit = (officer: SalesOfficer) => {
    setEditingOfficer(officer);
    setFormData({
      name: officer.name,
      code: officer.code,
      mobileNumber: officer.mobileNumber || "",
      email: officer.email || "",
      territory: officer.territory || "",
      isActive: officer.isActive === 1,
    });
    setErrors({});
    setIsEditOpen(true);
  };

  const openDelete = (officer: SalesOfficer) => {
    setOfficerToDelete(officer);
    setDeleteConfirmOpen(true);
  };

  const pageContent = (
    <div className={showHeader ? "container mx-auto p-6 mt-16" : "p-4"}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {showHeader && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="h-8 w-8" />
              Sales Officers
            </h1>
            <p className="text-muted-foreground mt-1">Manage the list of Sales Officers for order tracking.</p>
          </div>
        </div>
        <Button onClick={() => { setFormData(emptyForm); setErrors({}); setIsCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Sales Officer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Officers ({officers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : officers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No sales officers found. Add your first one.
                  </TableCell>
                </TableRow>
              ) : (
                officers.map((officer) => (
                  <TableRow key={officer.id}>
                    <TableCell className="font-mono font-medium">{officer.code}</TableCell>
                    <TableCell className="font-medium">{officer.name}</TableCell>
                    <TableCell>{officer.mobileNumber || "—"}</TableCell>
                    <TableCell>{officer.email || "—"}</TableCell>
                    <TableCell>{officer.territory || "—"}</TableCell>
                    <TableCell>
                      {officer.isActive === 1
                        ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(officer)}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openDelete(officer)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sales Officer</DialogTitle>
          </DialogHeader>
          <OfficerFormFields formData={formData} setFormData={setFormData} errors={errors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sales Officer</DialogTitle>
          </DialogHeader>
          <OfficerFormFields formData={formData} setFormData={setFormData} errors={errors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Officer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{officerToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => officerToDelete && deleteMutation.mutate(officerToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (!showHeader) return pageContent;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      {pageContent}
    </div>
  );
}
