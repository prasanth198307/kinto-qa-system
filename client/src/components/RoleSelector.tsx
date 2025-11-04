import { Card } from "@/components/ui/card";
import { Settings, Wrench, CheckCircle, BarChart3 } from "lucide-react";

type Role = 'admin' | 'operator' | 'reviewer' | 'manager';

interface RoleSelectorProps {
  onRoleSelect: (role: Role) => void;
}

export default function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const roles = [
    { 
      id: 'admin' as Role, 
      name: 'Admin', 
      icon: Settings, 
      description: 'Configure system settings, manage users, and oversee all operations',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10'
    },
    { 
      id: 'operator' as Role, 
      name: 'Operator', 
      icon: Wrench, 
      description: 'Complete quality checklists and execute maintenance tasks',
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    { 
      id: 'reviewer' as Role, 
      name: 'Reviewer', 
      icon: CheckCircle, 
      description: 'Review and approve quality inspection submissions',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    { 
      id: 'manager' as Role, 
      name: 'Manager', 
      icon: BarChart3, 
      description: 'Monitor performance and review analytics across the facility',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-welcome">
            Select Your Role
          </h1>
          <p className="text-gray-600">
            Choose your role to access the appropriate dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            
            return (
              <Card
                key={role.id}
                className="p-8 cursor-pointer transition-all duration-200 border-2 hover:border-primary hover:shadow-lg"
                onClick={() => {
                  console.log('Role selected:', role.id);
                  onRoleSelect(role.id);
                }}
                data-testid={`card-role-${role.id}`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`${role.iconBg} p-4 rounded-full`}>
                    <Icon className={`h-12 w-12 ${role.iconColor}`} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900" data-testid={`text-role-name-${role.id}`}>
                      {role.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {role.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500">
          Role selection determines which features and data you can access
        </p>
      </div>
    </div>
  );
}
