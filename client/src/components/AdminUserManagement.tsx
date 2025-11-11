import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  roleId: string;
  roleName: string;
}

export default function AdminUserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Edit user form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  
  // Create user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobileNumber, setNewUserMobileNumber] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState('operator');
  
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<UserWithRole[]>({
    queryKey: ['/api/users'],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      return await apiRequest('PATCH', `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "User updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; mobileNumber: string; password: string; firstName: string; lastName: string; role: string }) => {
      return await apiRequest('POST', '/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      resetCreateForm();
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/users/${id}`, {});
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setDeletingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditEmail(user.email || '');
    setEditPassword(''); // Don't show existing password
    setEditRole(user.role || 'operator');
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = () => {
    if (!editingUser) return;

    const updateData: any = {
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      role: editRole,
    };

    // Only include password if it's been changed
    if (editPassword.trim()) {
      updateData.password = editPassword;
    }

    updateUserMutation.mutate({ userId: editingUser.id, data: updateData });
  };

  const resetCreateForm = () => {
    setNewUserEmail('');
    setNewUserMobileNumber('');
    setNewUserPassword('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserRole('operator');
  };

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserPassword || !newUserMobileNumber) {
      toast({
        title: "Validation Error",
        description: "Email, password, and mobile number are required.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate mobile number format
    if (!/^[0-9]{10}$/.test(newUserMobileNumber)) {
      toast({
        title: "Validation Error",
        description: "Mobile number must be exactly 10 digits.",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate({
      email: newUserEmail,
      mobileNumber: newUserMobileNumber,
      password: newUserPassword,
      firstName: newUserFirstName,
      lastName: newUserLastName,
      role: newUserRole,
    });
  };

  const handleDeleteUser = (id: string) => {
    setDeletingUserId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingUserId) {
      deleteUserMutation.mutate(deletingUserId);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingUserId(null);
    }
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    operator: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    reviewer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">User Management</h2>
            <p className="text-sm text-muted-foreground">{users.length} total users</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-user"
          >
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
          {filteredUsers.map((user, index) => (
            <Card key={user.id} className="p-4" data-testid={`card-user-${index}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm" data-testid={`text-user-name-${index}`}>
                        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'No name'}
                      </h3>
                      <Badge className={roleColors[user.role as keyof typeof roleColors] || roleColors.operator} data-testid={`badge-role-${index}`}>
                        {user.role || 'operator'}
                      </Badge>
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
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    data-testid={`button-delete-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Username will be auto-generated from email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={newUserMobileNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setNewUserMobileNumber(value);
                }}
                data-testid="input-mobile-number"
              />
              <p className="text-xs text-muted-foreground">Enter 10-digit mobile number</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                data-testid="input-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUserRole">Role *</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogDescription>
              Update user information. Username: {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                placeholder="user@example.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                data-testid="input-edit-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  placeholder="John"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  data-testid="input-edit-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  placeholder="Doe"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">New Password (leave blank to keep current)</Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="Enter new password or leave blank"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="mt-1" data-testid="select-edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
        onOpenChange={handleDeleteDialogClose}
        onConfirm={confirmDelete}
        title="Delete User?"
        description="This action cannot be undone. This will permanently delete the user from the system."
        isPending={deleteUserMutation.isPending}
      />
      </div>
    </>
  );
}
