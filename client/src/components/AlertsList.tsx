import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  subtitle: string;
  time?: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export default function AlertsList({ alerts }: AlertsListProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-orange-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-l-orange-500';
      case 'error':
        return 'bg-red-50 border-l-red-500';
      default:
        return 'bg-blue-50 border-l-blue-500';
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-semibold" data-testid="text-alerts-title">Alerts</h2>
      
      {alerts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No alerts at this time</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Card
              key={alert.id}
              className={`p-4 border-l-4 ${getAlertColor(alert.type)}`}
              data-testid={`card-alert-${index}`}
            >
              <div className="flex items-start space-x-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm" data-testid={`text-alert-title-${index}`}>
                    {alert.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1" data-testid={`text-alert-subtitle-${index}`}>
                    {alert.subtitle}
                  </p>
                  {alert.time && (
                    <p className="text-xs text-muted-foreground mt-2">{alert.time}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
