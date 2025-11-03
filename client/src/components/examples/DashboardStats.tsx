import DashboardStats from '../DashboardStats';
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

export default function DashboardStatsExample() {
  const mockStats = [
    { label: 'Pending Review', value: 5, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Completed', value: 23, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Rejected', value: 2, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
    { label: 'Alerts', value: 3, icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  return <DashboardStats stats={mockStats} />;
}
