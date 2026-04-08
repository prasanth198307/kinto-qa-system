import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Video, RefreshCw, Mail, Phone, MapPin, Building2 } from "lucide-react";
import SuperAdminLayout from "./super-admin-layout";
import { format } from "date-fns";

interface DemoRequest {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  city: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export default function SuperAdminDemoRequests() {
  const { data: requests = [], isLoading, isError, refetch } = useQuery<DemoRequest[]>({
    queryKey: ["/api/admin/demo-requests"],
  });

  const statusColor: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

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
          {requests.map((req) => (
            <div
              key={req.id}
              className="border rounded-md p-4 bg-card"
              data-testid={`demo-request-row-${req.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{req.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[req.status] ?? statusColor.new}`}>
                      {req.status}
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
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.created_at), "d MMM yyyy, h:mm a")}
                  </p>
                  <a href={`mailto:${req.email}?subject=Your Kinto Smart Ops Demo Request&body=Hi ${req.name},%0D%0A%0D%0AThank you for your interest in Kinto Smart Ops!`}>
                    <Button size="sm" variant="outline" className="mt-2" data-testid={`demo-contact-${req.id}`}>
                      <Mail className="w-3 h-3 mr-1.5" />
                      Contact
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}
