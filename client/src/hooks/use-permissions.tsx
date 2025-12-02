import { useQuery } from "@tanstack/react-query";

interface Permission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface UserPermissions {
  role: string;
  roleId: string;
  permissions: Permission[];
}

export function usePermissions() {
  const { data, isLoading, error } = useQuery<UserPermissions>({
    queryKey: ['/api/my-permissions'],
  });

  const hasPermission = (screenKey: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    if (!data?.permissions) return false;
    
    const permission = data.permissions.find(p => p.screenKey === screenKey);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  };

  const hasAnyPermission = (screenKey: string): boolean => {
    if (!data?.permissions) return false;
    const permission = data.permissions.find(p => p.screenKey === screenKey);
    return permission ? (permission.canView || permission.canCreate || permission.canEdit || permission.canDelete) : false;
  };

  const isDefaultRole = (roleName: string): boolean => {
    const defaultRoles = ['admin', 'manager', 'operator', 'reviewer'];
    return defaultRoles.includes(roleName.toLowerCase());
  };

  const canAccessScreen = (screenKey: string): boolean => {
    if (!data) return false;
    
    const roleLower = data.role.toLowerCase();
    if (roleLower === 'admin') return true;
    
    return hasPermission(screenKey, 'view');
  };

  return {
    role: data?.role || '',
    roleId: data?.roleId || '',
    permissions: data?.permissions || [],
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    canAccessScreen,
    isDefaultRole: data ? isDefaultRole(data.role) : false,
  };
}
