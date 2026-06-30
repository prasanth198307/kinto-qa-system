import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, TrendingUp, Users, DollarSign, Percent } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUSES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  new: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  qualified: "bg-yellow-100 text-yellow-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

interface Lead {
  id: number;
  name: string;
  company?: string;
  value?: number;
  assigned_to?: string;
  status: Status;
}

export default function PipelinePage() {
  const qc = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["crm-leads"],
    queryFn: () => api("GET", "/api/crm/leads?status=all"),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) =>
      api("PATCH", `/api/crm/leads/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads"] }),
  });

  const totalLeads = leads.length;
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";

  const grouped = STATUSES.reduce<Record<Status, Lead[]>>(
    (acc, s) => ({ ...acc, [s]: leads.filter((l) => l.status === s) }),
    {} as Record<Status, Lead[]>
  );

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading pipeline...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sales Pipeline</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="text-blue-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Total Leads</p>
              <p className="text-xl font-bold">{totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <DollarSign className="text-green-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Pipeline Value</p>
              <p className="text-xl font-bold">₹{totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <TrendingUp className="text-purple-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Won Deals</p>
              <p className="text-xl font-bold">{wonLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Percent className="text-orange-500" size={20} />
            <div>
              <p className="text-xs text-gray-500">Conversion Rate</p>
              <p className="text-xl font-bold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {STATUSES.map((status) => (
            <div key={status} className="w-64 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${STATUS_COLORS[status]}`}>
                  {status}
                </span>
                <span className="text-xs text-gray-500">{grouped[status].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[status].map((lead) => (
                  <Card key={lead.id} className="shadow-sm">
                    <CardContent className="pt-3 pb-3 space-y-1">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      {lead.company && <p className="text-xs text-gray-500 truncate">{lead.company}</p>}
                      {lead.value != null && (
                        <p className="text-xs font-semibold text-green-700">₹{lead.value.toLocaleString()}</p>
                      )}
                      {lead.assigned_to && (
                        <p className="text-xs text-gray-400">Assigned: {lead.assigned_to}</p>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-7">
                            Move <ChevronDown size={12} className="ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {STATUSES.filter((s) => s !== status).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              className="capitalize"
                              onClick={() => moveMutation.mutate({ id: lead.id, status: s })}
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))}
                {grouped[status].length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded p-4 text-center text-xs text-gray-400">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
