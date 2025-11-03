import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

interface Stat {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
}

interface DashboardStatsProps {
  stats: Stat[];
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-4" data-testid={`card-stat-${index}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid={`text-stat-value-${index}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground" data-testid={`text-stat-label-${index}`}>{stat.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
