import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download } from "lucide-react";

interface ChecklistRecord {
  id: string;
  machine: string;
  date: string;
  shift: string;
  operator: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
}

interface ChecklistHistoryTableProps {
  records: ChecklistRecord[];
}

export default function ChecklistHistoryTable({ records }: ChecklistHistoryTableProps) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    pending: 'Pending',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Rejected'
  };

  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <Card key={record.id} className="p-4" data-testid={`card-checklist-${index}`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm" data-testid={`text-machine-${index}`}>{record.machine}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {record.date} • {record.shift} • {record.operator}
                </p>
              </div>
              <Badge className={statusColors[record.status]} data-testid={`badge-status-${index}`}>
                {statusLabels[record.status]}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => console.log('View checklist', record.id)}
                data-testid={`button-view-${index}`}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => console.log('Download PDF', record.id)}
                data-testid={`button-download-${index}`}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
