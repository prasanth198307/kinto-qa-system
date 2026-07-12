import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Video, RefreshCw, Mail, Phone, MapPin, Building2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SuperAdminLayout from "./super-admin-layout";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DemoRequest {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: "New",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  closed:    { label: "Closed",    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  converted: { label: "Converted", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
};

const NEXT_STATUSES: Record<string, { value: string; label: string }[]> = {
  new:       [{ value: "contacted", label: "Mark Contacted" }, { value: "closed", label: "Mark Closed" }, { value: "converted", label: "Converted to Trial" }],
  contacted: [{ value: "closed",    label: "Mark Closed" },   { value: "converted", label: "Converted to Trial" }],
  closed:    [{ value: "new",       label: "Reopen" }],
  converted: [],
};

export default function SuperAdminDemoRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading, isError, refetch } = useQuery<DemoRequest[]>({
    queryKey: ["/api/admin/demo-requests"],
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/demo-requests/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  return (
    <SuperAdminLayout
      title="Demo Requests"
      subtitle="Enquiries submitted via the landing page Book a Demo form"
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="demo-requests-refresh">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Could not load demo requests</p>
            <p className="text-sm text-muted-foreground mt-1">A server error occurred. Please refresh.</p>
          </div>
          <Button size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center text-muted-foreground">
          <Video className="h-10 w-10 opacity-30" />
          <p className="font-medium">No demo requests yet</p>
          <p className="text-sm">Requests submitted via the landing page will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusConf = STATUS_LABELS[req.status] ?? STATUS_LABELS.new;
            const nextStatuses = NEXT_STATUSES[req.status] ?? [];
            return (
              <div
                key={req.id}
                className="border rounded-md p-4 bg-card"
                data-testid={`demo-request-row-${req.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">{req.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {req.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${req.email}`} className="hover:text-foreground transition-colors underline underline-offset-2">
                          {req.email}
                        </a>
                      </span>
                      {req.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {req.phone}
                        </span>
                      )}
                      {req.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {req.city}
                        </span>
                      )}
                    </div>

                    {req.message && (
                      <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2 italic">
                        "{req.message}"
                      </p>
                    )}

                    {req.notes && (
                      <p className="text-xs text-muted-foreground border-l-2 border-yellow-400 pl-2">
                        Note: {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), "d MMM yyyy, h:mm a")}
                    </p>
                    <div className="flex gap-2">
                      <a href={`mailto:${req.email}?subject=Your SwachERP Demo Request&body=Hi ${req.name},%0D%0A%0D%0AThank you for your interest in SwachERP!`}>
                        <Button size="sm" variant="outline" data-testid={`demo-contact-${req.id}`}>
                          <Mail className="w-3 h-3 mr-1.5" />
                          Contact
                        </Button>
                      </a>
                      {nextStatuses.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary" disabled={updateStatus.isPending} data-testid={`demo-status-${req.id}`}>
                              Update Status
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {nextStatuses.map(ns => (
                              <DropdownMenuItem
                                key={ns.value}
                                onClick={() => updateStatus.mutate({ id: req.id, status: ns.value })}
                              >
                                {ns.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SuperAdminLayout>
  );
}
