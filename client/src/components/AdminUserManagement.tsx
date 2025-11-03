import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'reviewer' | 'manager';
  status: 'active' | 'inactive';
}

export default function AdminUserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState<User[]>([
    { id: '1', name: 'Ramesh Kumar', email: 'ramesh@kinto.com', role: 'operator', status: 'active' },
    { id: '2', name: 'Priya Sharma', email: 'priya@kinto.com', role: 'reviewer', status: 'active' },
    { id: '3', name: 'Amit Patel', email: 'amit@kinto.com', role: 'manager', status: 'active' },
    { id: '4', name: 'Admin User', email: 'admin@kinto.com', role: 'admin', status: 'active' },
  ]);

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    operator: 'bg-blue-100 text-blue-800',
    reviewer: 'bg-green-100 text-green-800',
    manager: 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-title">User Management</h2>
        <Button onClick={() => console.log('Add user')} data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-1" />
          Add User
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

      <div className="space-y-3">
        {users.map((user, index) => (
          <Card key={user.id} className="p-4" data-testid={`card-user-${index}`}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-sm" data-testid={`text-user-name-${index}`}>{user.name}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={roleColors[user.role]} data-testid={`badge-role-${index}`}>
                    {user.role}
                  </Badge>
                  <Badge 
                    className={user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                    data-testid={`badge-status-${index}`}
                  >
                    {user.status}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => console.log('Edit user', user.id)}
                  data-testid={`button-edit-${index}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Delete user', user.id)}
                  data-testid={`button-delete-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
