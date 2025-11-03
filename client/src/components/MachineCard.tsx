import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar } from "lucide-react";

interface MachineCardProps {
  name: string;
  type: string;
  status: 'active' | 'maintenance' | 'inactive';
  lastMaintenance?: string;
  nextMaintenance?: string;
  onClick?: () => void;
}

export default function MachineCard({ 
  name, 
  type, 
  status, 
  lastMaintenance, 
  nextMaintenance,
  onClick 
}: MachineCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800'
  };

  return (
    <Card className="p-4 hover-elevate cursor-pointer" onClick={() => {
      console.log('Machine clicked:', name);
      onClick?.();
    }} data-testid={`card-machine-${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm" data-testid="text-machine-name">{name}</h3>
            <p className="text-xs text-muted-foreground">{type}</p>
          </div>
        </div>
        <Badge className={statusColors[status]} data-testid="badge-machine-status">
          {status}
        </Badge>
      </div>

      {(lastMaintenance || nextMaintenance) && (
        <div className="space-y-1 pt-3 border-t">
          {lastMaintenance && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              Last: {lastMaintenance}
            </div>
          )}
          {nextMaintenance && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              Next: {nextMaintenance}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
