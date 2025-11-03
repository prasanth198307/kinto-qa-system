import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ClipboardCheck, CheckCircle, User } from "lucide-react";

type Role = 'admin' | 'operator' | 'reviewer' | 'manager';

interface RoleSelectorProps {
  onRoleSelect: (role: Role) => void;
}

export default function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const roles = [
    { id: 'admin' as Role, name: 'Admin', icon: Shield, color: 'bg-purple-500', description: 'System configuration & RBAC' },
    { id: 'operator' as Role, name: 'Operator', icon: ClipboardCheck, color: 'bg-blue-500', description: 'Fill out checklists' },
    { id: 'reviewer' as Role, name: 'Reviewer', icon: CheckCircle, color: 'bg-green-500', description: 'Verify submissions' },
    { id: 'manager' as Role, name: 'Manager', icon: User, color: 'bg-orange-500', description: 'Final approval' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold" data-testid="text-welcome">Welcome to KINTO QA</h1>
          <p className="text-sm text-muted-foreground">Select your role to continue</p>
        </div>

        <div className="grid gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <Card
                key={role.id}
                className={`p-4 cursor-pointer transition-all hover-elevate ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedRole(role.id)}
                data-testid={`card-role-${role.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`${role.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium" data-testid={`text-role-name-${role.id}`}>{role.name}</h3>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!selectedRole}
          onClick={() => {
            if (selectedRole) {
              console.log('Role selected:', selectedRole);
              onRoleSelect(selectedRole);
            }
          }}
          data-testid="button-continue"
        >
          Continue as {selectedRole ? roles.find(r => r.id === selectedRole)?.name : '...'}
        </Button>
      </Card>
    </div>
  );
}
