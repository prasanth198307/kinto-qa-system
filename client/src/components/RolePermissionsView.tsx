import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface Permission {
  screen: string;
  description: string;
  admin: boolean;
  manager: boolean;
  operator: boolean;
  reviewer: boolean;
}

const permissions: Permission[] = [
  {
    screen: "Overview",
    description: "Dashboard with system overview and inventory alerts",
    admin: true,
    manager: true,
    operator: true,
    reviewer: true,
  },
  {
    screen: "User Management",
    description: "Create and manage users, assign roles",
    admin: true,
    manager: false,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Machines",
    description: "Configure machines and machine types",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Checklist Templates",
    description: "Create and manage QA checklist templates",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Spare Parts",
    description: "Manage spare parts catalog",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Machine Types",
    description: "Define machine types and categories",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "PM Templates",
    description: "Preventive maintenance task templates",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Maintenance Plans",
    description: "Schedule and manage maintenance plans",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "PM History",
    description: "View preventive maintenance execution history",
    admin: true,
    manager: true,
    operator: true,
    reviewer: true,
  },
  {
    screen: "Purchase Orders",
    description: "Create and manage purchase orders",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Inventory Management",
    description: "Manage UOM, products, raw materials, and finished goods",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
  {
    screen: "Create Raw Material Transactions",
    description: "Record raw material usage and receipts",
    admin: true,
    manager: true,
    operator: true,
    reviewer: false,
  },
  {
    screen: "Create Finished Goods",
    description: "Record finished goods production",
    admin: true,
    manager: true,
    operator: true,
    reviewer: false,
  },
  {
    screen: "Execute Checklists",
    description: "Complete daily QA checklists",
    admin: true,
    manager: false,
    operator: true,
    reviewer: false,
  },
  {
    screen: "Review Checklists",
    description: "Review and approve completed checklists",
    admin: true,
    manager: false,
    operator: false,
    reviewer: true,
  },
  {
    screen: "Final Approval",
    description: "Provide final approval on reviewed checklists",
    admin: true,
    manager: true,
    operator: false,
    reviewer: false,
  },
];

const roleColors = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  operator: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  reviewer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
};

export default function RolePermissionsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" data-testid="text-title">Role-Based Access Control</h2>
        <p className="text-sm text-muted-foreground">
          Overview of which screens and features each role can access
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <Badge className={roleColors.admin}>Admin</Badge>
          <p className="text-xs text-muted-foreground mt-2">Full system access and user management</p>
        </Card>
        <Card className="p-4">
          <Badge className={roleColors.manager}>Manager</Badge>
          <p className="text-xs text-muted-foreground mt-2">Inventory, approvals, and configuration</p>
        </Card>
        <Card className="p-4">
          <Badge className={roleColors.operator}>Operator</Badge>
          <p className="text-xs text-muted-foreground mt-2">Execute checklists and record production</p>
        </Card>
        <Card className="p-4">
          <Badge className={roleColors.reviewer}>Reviewer</Badge>
          <p className="text-xs text-muted-foreground mt-2">Review and approve QA checklists</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Screen / Feature</th>
                <th className="text-center p-4 font-semibold w-24">
                  <Badge className={roleColors.admin} data-testid="header-admin">Admin</Badge>
                </th>
                <th className="text-center p-4 font-semibold w-24">
                  <Badge className={roleColors.manager} data-testid="header-manager">Manager</Badge>
                </th>
                <th className="text-center p-4 font-semibold w-24">
                  <Badge className={roleColors.operator} data-testid="header-operator">Operator</Badge>
                </th>
                <th className="text-center p-4 font-semibold w-24">
                  <Badge className={roleColors.reviewer} data-testid="header-reviewer">Reviewer</Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission, index) => (
                <tr key={index} className="border-b hover-elevate" data-testid={`row-permission-${index}`}>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-screen-${index}`}>{permission.screen}</p>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                  </td>
                  <td className="p-4 text-center" data-testid={`cell-admin-${index}`}>
                    {permission.admin ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center" data-testid={`cell-manager-${index}`}>
                    {permission.manager ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center" data-testid={`cell-operator-${index}`}>
                    {permission.operator ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="p-4 text-center" data-testid={`cell-reviewer-${index}`}>
                    {permission.reviewer ? (
                      <Check className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <h3 className="font-semibold text-sm mb-2">Permission Notes</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Admins have full access to all features including user management</li>
          <li>• Managers can configure system settings, manage inventory, and provide final approvals</li>
          <li>• Operators execute daily tasks like checklists and production recording</li>
          <li>• Reviewers focus on QA checklist review and approval</li>
          <li>• Only admins can create new users and assign admin/manager roles</li>
          <li>• Users can self-assign operator or reviewer roles during initial setup</li>
        </ul>
      </Card>
    </div>
  );
}
