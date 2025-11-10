import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Shield, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  recordStatus: number;
}

interface RolePermission {
  id: string;
  roleId: string;
  screenKey: string;
  canView: number;
  canCreate: number;
  canEdit: number;
  canDelete: number;
}

// Available screens in the system
const AVAILABLE_SCREENS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales_dashboard', label: 'Sales Dashboard' },
  { key: 'users', label: 'User Management' },
  { key: 'roles', label: 'Role Management' },
  { key: 'machines', label: 'Machines' },
  { key: 'machine_types', label: 'Machine Types' },
  { key: 'checklist_templates', label: 'Checklist Templates' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'spare_parts', label: 'Spare Parts' },
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'maintenance_plans', label: 'Maintenance Plans' },
  { key: 'pm_templates', label: 'PM Task Templates' },
  { key: 'pm_execution', label: 'PM Execution' },
  { key: 'pm_history', label: 'PM History' },
  { key: 'inventory', label: 'Inventory Management' },
  { key: 'uom', label: 'Units of Measure' },
  { key: 'products', label: 'Products' },
  { key: 'raw_materials', label: 'Raw Materials' },
  { key: 'finished_goods', label: 'Finished Goods' },
  { key: 'invoices', label: 'Sales Invoices' },
  { key: 'dispatch_tracking', label: 'Dispatch Tracking' },
  { key: 'gatepasses', label: 'Gatepasses' },
  { key: 'vendors', label: 'Vendor Master' },
  { key: 'invoice_templates', label: 'Invoice Templates' },
  { key: 'notification_settings', label: 'Notification Settings' },
  { key: 'reports', label: 'Reports' },
];

export default function RoleManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  
  // Create role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  
  // Edit role form
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDescription, setEditRoleDescription] = useState('');
  
  // Permissions state
  const [permissions, setPermissions] = useState<Map<string, RolePermission>>(new Map());

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Fetch all role permissions
  const { data: allPermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ['/api/role-permissions'],
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest('POST', '/api/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({
        title: "Role created",
        description: "New role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role.",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/roles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsEditDialogOpen(false);
      setEditingRole(null);
      toast({
        title: "Role updated",
        description: "Role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/roles/${id}`, {});
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingRoleId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Role deleted",
        description: "Role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role.",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: any[] }) => {
      return await apiRequest('PUT', `/api/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      setIsPermissionsDialogOpen(false);
      setPermissionsRole(null);
      toast({
        title: "Permissions updated",
        description: "Role permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions.",
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setNewRoleName('');
    setNewRoleDescription('');
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required.",
        variant: "destructive",
      });
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
    });
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDescription(role.description || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;

    if (!editRoleName.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required.",
        variant: "destructive",
      });
      return;
    }

    updateRoleMutation.mutate({
      id: editingRole.id,
      data: {
        name: editRoleName.trim(),
        description: editRoleDescription.trim(),
      },
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (['admin', 'manager', 'operator', 'reviewer'].includes(role.name)) {
      toast({
        title: "Cannot delete",
        description: "Default system roles cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setDeletingRoleId(role.id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingRoleId) {
      deleteRoleMutation.mutate(deletingRoleId);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingRoleId(null);
    }
  };

  const handleEditPermissions = (role: Role) => {
    setPermissionsRole(role);
    
    // Load existing permissions for this role
    const rolePerms = allPermissions.filter(p => p.roleId === role.id);
    const permsMap = new Map<string, RolePermission>();
    
    rolePerms.forEach(p => {
      permsMap.set(p.screenKey, p);
    });
    
    setPermissions(permsMap);
    setIsPermissionsDialogOpen(true);
  };

  const handleTogglePermission = (screenKey: string, permType: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    const current = permissions.get(screenKey) || {
      id: '',
      roleId: permissionsRole?.id || '',
      screenKey,
      canView: 0,
      canCreate: 0,
      canEdit: 0,
      canDelete: 0,
    };

    const updated = {
      ...current,
      [permType]: current[permType] === 1 ? 0 : 1,
    };

    const newPermissions = new Map(permissions);
    newPermissions.set(screenKey, updated);
    setPermissions(newPermissions);
  };

  const handleSavePermissions = () => {
    if (!permissionsRole) return;

    const permissionsArray = AVAILABLE_SCREENS.map(screen => {
      const perm = permissions.get(screen.key) || {
        screenKey: screen.key,
        canView: 0,
        canCreate: 0,
        canEdit: 0,
        canDelete: 0,
      };

      return {
        screenKey: screen.key,
        canView: perm.canView === 1,
        canCreate: perm.canCreate === 1,
        canEdit: perm.canEdit === 1,
        canDelete: perm.canDelete === 1,
      };
    });

    updatePermissionsMutation.mutate({
      roleId: permissionsRole.id,
      permissions: permissionsArray,
    });
  };

  const getPermission = (screenKey: string, permType: 'canView' | 'canCreate' | 'canEdit' | 'canDelete'): boolean => {
    const perm = permissions.get(screenKey);
    return perm ? perm[permType] === 1 : false;
  };

  const isDefaultRole = (roleName: string) => {
    return ['admin', 'manager', 'operator', 'reviewer'].includes(roleName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and their permissions</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-role"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      {rolesLoading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading roles...</p>
        </Card>
      ) : roles.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No roles found. Create your first role to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role, index) => (
            <Card key={role.id} className="p-6" data-testid={`card-role-${index}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold" data-testid={`text-role-name-${index}`}>
                      {role.name}
                    </h3>
                    {isDefaultRole(role.name) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {role.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPermissions(role)}
                  data-testid={`button-edit-permissions-${index}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Permissions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditRole(role)}
                  data-testid={`button-edit-role-${index}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {!isDefaultRole(role.name) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(role)}
                    data-testid={`button-delete-role-${index}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-role">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., supervisor, quality_inspector"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                data-testid="input-role-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                placeholder="Describe the role and its responsibilities"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                data-testid="input-role-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createRoleMutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                placeholder="Role name"
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                disabled={editingRole ? isDefaultRole(editingRole.name) : false}
                data-testid="input-edit-role-name"
              />
              {editingRole && isDefaultRole(editingRole.name) && (
                <p className="text-xs text-muted-foreground">
                  Default role names cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                placeholder="Role description"
                value={editRoleDescription}
                onChange={(e) => setEditRoleDescription(e.target.value)}
                data-testid="input-edit-role-description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-edit-permissions">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions: {permissionsRole?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Configure which screens and features this role can access
            </p>
          </DialogHeader>
          <div className="py-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Screen</th>
                    <th className="text-center py-2 px-2">View</th>
                    <th className="text-center py-2 px-2">Create</th>
                    <th className="text-center py-2 px-2">Edit</th>
                    <th className="text-center py-2 px-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {AVAILABLE_SCREENS.map((screen, index) => (
                    <tr key={screen.key} className="border-b hover-elevate" data-testid={`row-permission-${index}`}>
                      <td className="py-3 px-2 font-medium">{screen.label}</td>
                      <td className="text-center py-3 px-2">
                        <Checkbox
                          checked={getPermission(screen.key, 'canView')}
                          onCheckedChange={() => handleTogglePermission(screen.key, 'canView')}
                          data-testid={`checkbox-view-${index}`}
                        />
                      </td>
                      <td className="text-center py-3 px-2">
                        <Checkbox
                          checked={getPermission(screen.key, 'canCreate')}
                          onCheckedChange={() => handleTogglePermission(screen.key, 'canCreate')}
                          data-testid={`checkbox-create-${index}`}
                        />
                      </td>
                      <td className="text-center py-3 px-2">
                        <Checkbox
                          checked={getPermission(screen.key, 'canEdit')}
                          onCheckedChange={() => handleTogglePermission(screen.key, 'canEdit')}
                          data-testid={`checkbox-edit-${index}`}
                        />
                      </td>
                      <td className="text-center py-3 px-2">
                        <Checkbox
                          checked={getPermission(screen.key, 'canDelete')}
                          onCheckedChange={() => handleTogglePermission(screen.key, 'canDelete')}
                          data-testid={`checkbox-delete-${index}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionsDialogOpen(false)}
              data-testid="button-cancel-permissions"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
              data-testid="button-save-permissions"
            >
              {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogClose}
        onConfirm={confirmDelete}
        title="Delete Role?"
        description="This action cannot be undone. This will permanently delete the role from the system."
        isPending={deleteRoleMutation.isPending}
      />
    </div>
  );
}
