import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Trash2, Edit, LogOut, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { ROLE_MODULE_RELEVANCE } from "@/lib/role-module-relevance";

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleId: string;
  roleName: string;
  roleNames: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  operator: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  reviewer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  accountsmanager: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
};

const getRoleColor = (role: string) => {
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '');
  return roleColors[normalizedRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
};

function RoleCheckboxGroup({
  roles,
  selectedIds,
  onChange,
}: {
  roles: Role[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
      {roles.map(role => (
        <div
          key={role.id}
          className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover-elevate"
          onClick={() => toggle(role.id)}
          data-testid={`checkbox-role-${role.name}`}
        >
          <Checkbox
            checked={selectedIds.includes(role.id)}
            onCheckedChange={() => toggle(role.id)}
          />
          <span className="text-sm capitalize">{role.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminUserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);

  // Create form state
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobileNumber, setNewUserMobileNumber] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRoleIds, setNewUserRoleIds] = useState<string[]>([]);

  // Username availability check
  type AvailStatus = 'idle' | 'checking' | 'available' | 'taken';
  const [usernameStatus, setUsernameStatus] = useState<AvailStatus>('idle');
  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = (value: string) => {
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    if (!value.trim()) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    usernameDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 500);
  };

  const { toast } = useToast();
  const { modules } = usePlanFeatures();

  const { data: users = [], isLoading } = useQuery<UserWithRole[]>({
    queryKey: ['/api/users'],
  });

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Filter roles to only those relevant to the tenant's active plan modules
  const roles = allRoles.filter(role => {
    const relevantModules = ROLE_MODULE_RELEVANCE[role.name.toLowerCase()];
    if (!relevantModules) return true;
    return relevantModules.some(m => modules.includes(m));
  });

  // Update user profile + roles
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data, roleIds }: { userId: string; data: any; roleIds: string[] }) => {
      await apiRequest('PATCH', `/api/users/${userId}`, data);
      if (roleIds.length > 0) {
        await apiRequest('PUT', `/api/users/${userId}/roles`, { roleIds });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({ title: "User updated", description: "User has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user.", variant: "destructive" });
    },
  });

  // Create user then assign all roles
  const createUserMutation = useMutation({
    mutationFn: async ({ userData, roleIds }: { userData: any; roleIds: string[] }) => {
      const primaryRole = roles.find(r => r.id === roleIds[0]);
      const res = await apiRequest('POST', '/api/users', {
        ...userData,
        role: primaryRole?.name || 'operator',
      });
      const newUser = await res.json();
      if (roleIds.length > 1) {
        await apiRequest('PUT', `/api/users/${newUser.id}/roles`, { roleIds });
      }
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({ title: "User created", description: "New user has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/users/${id}`, {}),
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "User deleted", description: "User has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    },
  });

  const clearSessionsMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/users/${id}/clear-sessions`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sessions cleared",
        description: data.count > 0
          ? `${data.count} active session(s) removed. The user will need to log in again.`
          : "No active sessions found for this user.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear sessions.", variant: "destructive" });
    },
  });

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    // Pre-select current roles from the roles list
    const currentRoleIds = roles
      .filter(r => (user.roleNames || [user.role]).map(n => n.toLowerCase()).includes(r.name.toLowerCase()))
      .map(r => r.id);
    setEditRoleIds(currentRoleIds.length > 0 ? currentRoleIds : (user.roleId ? [user.roleId] : []));
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = () => {
    if (!editingUser) return;
    if (editRoleIds.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one role.", variant: "destructive" });
      return;
    }
    const updateData: any = { firstName: editFirstName, lastName: editLastName, email: editEmail };
    if (editPassword.trim()) updateData.password = editPassword;
    updateUserMutation.mutate({ userId: editingUser.id, data: updateData, roleIds: editRoleIds });
  };

  const resetCreateForm = () => {
    setNewUserUsername('');
    setNewUserEmail('');
    setNewUserMobileNumber('');
    setNewUserPassword('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserRoleIds([]);
    setUsernameStatus('idle');
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserPassword || !newUserMobileNumber) {
      toast({ title: "Validation Error", description: "Email, password, and mobile number are required.", variant: "destructive" });
      return;
    }
    if (newUserUsername.trim() && usernameStatus === 'taken') {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      return;
    }
    if (!/^[0-9]{10}$/.test(newUserMobileNumber)) {
      toast({ title: "Validation Error", description: "Mobile number must be exactly 10 digits.", variant: "destructive" });
      return;
    }
    if (newUserRoleIds.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one role.", variant: "destructive" });
      return;
    }
    createUserMutation.mutate({
      userData: {
        username: newUserUsername.trim() || undefined,
        email: newUserEmail,
        mobileNumber: newUserMobileNumber,
        password: newUserPassword,
        firstName: newUserFirstName,
        lastName: newUserLastName,
      },
      roleIds: newUserRoleIds,
    });
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold">User Management</h2>
            <p className="text-sm text-muted-foreground">{users.length} total users</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No users found matching your search.' : 'No users yet. Create your first user to get started.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => {
              const displayRoles = user.roleNames?.length > 0 ? user.roleNames : [user.role || 'operator'];
              return (
                <Card key={user.id} className="p-4" data-testid={`card-user-${index}`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-medium text-sm" data-testid={`text-user-name-${index}`}>
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'No name'}
                          </h3>
                          {displayRoles.map(roleName => (
                            <Badge key={roleName} className={getRoleColor(roleName)} data-testid={`badge-role-${index}`}>
                              {roleName}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div data-testid={`text-username-${index}`}>
                            <span className="font-medium">Username:</span> {user.username}
                          </div>
                          <div data-testid={`text-email-${index}`}>
                            <span className="font-medium">Email:</span> {user.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-${index}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearSessionsMutation.mutate(user.id)}
                        disabled={clearSessionsMutation.isPending}
                        title="Force logout — clears all active sessions for this user"
                        data-testid={`button-clear-sessions-${index}`}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setDeletingUserId(user.id); setIsDeleteDialogOpen(true); }}
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent data-testid="dialog-create-user">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user. Select one or more roles to assign.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="relative">
                  <Input
                    placeholder="Enter username (optional)"
                    value={newUserUsername}
                    onChange={(e) => { setNewUserUsername(e.target.value); checkUsername(e.target.value); }}
                    className={`pr-9 ${usernameStatus === 'available' ? 'border-emerald-500 focus-visible:ring-emerald-500' : usernameStatus === 'taken' ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    data-testid="input-username"
                  />
                  <div className="absolute right-3 top-2.5">
                    {usernameStatus === 'checking'  && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {usernameStatus === 'taken'     && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                {usernameStatus === 'available' && <p className="text-xs text-emerald-600 font-medium">Username is available</p>}
                {usernameStatus === 'taken'     && <p className="text-xs text-destructive">Username already taken — choose another</p>}
                {(usernameStatus === 'idle' || usernameStatus === 'checking') && <p className="text-xs text-muted-foreground">Leave blank to auto-generate from email</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={newUserMobileNumber}
                  onChange={(e) => setNewUserMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  data-testid="input-mobile-number"
                />
                <p className="text-xs text-muted-foreground">10-digit mobile number</p>
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    placeholder="John"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    placeholder="Doe"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roles * <span className="text-xs text-muted-foreground">(select one or more)</span></Label>
                <RoleCheckboxGroup roles={roles} selectedIds={newUserRoleIds} onChange={setNewUserRoleIds} />
                {newUserRoleIds.length === 0 && (
                  <p className="text-xs text-destructive">At least one role is required</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} data-testid="button-submit-create">
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent data-testid="dialog-edit-user">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Username: {editingUser?.username}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    placeholder="John"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    data-testid="input-edit-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    placeholder="Doe"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    data-testid="input-edit-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password <span className="text-xs text-muted-foreground">(leave blank to keep current)</span></Label>
                <Input
                  type="password"
                  placeholder="Enter new password or leave blank"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  data-testid="input-edit-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Roles * <span className="text-xs text-muted-foreground">(select one or more)</span></Label>
                <RoleCheckboxGroup roles={roles} selectedIds={editRoleIds} onChange={setEditRoleIds} />
                {editRoleIds.length === 0 && (
                  <p className="text-xs text-destructive">At least one role is required</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={updateUserMutation.isPending} data-testid="button-submit-edit">
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => { setIsDeleteDialogOpen(open); if (!open) setDeletingUserId(null); }}
          onConfirm={() => { if (deletingUserId) deleteUserMutation.mutate(deletingUserId); }}
          title="Delete User?"
          description="This action cannot be undone. This will permanently delete the user from the system."
          isPending={deleteUserMutation.isPending}
        />
      </div>
    </>
  );
}
