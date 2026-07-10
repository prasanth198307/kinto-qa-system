import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: any;
  new_values: any;
  performed_by: string;
  created_at: string;
}

const ACTION_BADGE: Record<string, any> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  approve: "default",
  reject: "destructive",
};

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["/api/generic/audit-log", entityType, action],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType !== "all") params.append("entity_type", entityType);
      if (action !== "all") params.append("action", action);
      return fetch(`/api/generic/audit-log?${params}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
    },
  });

  const filtered = logs.filter(log =>
    !search || log.entity_id?.toLowerCase().includes(search.toLowerCase()) || log.performed_by?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Audit Log</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-44" data-testid="select-entity-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="expense_claim">Expense Claims</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-36" data-testid="select-action"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-48">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Entity ID or user…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading audit trail...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2" />
              <p>No audit records found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <>
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="text-sm tabular-nums">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={ACTION_BADGE[log.action] || "secondary"}>{log.action}</Badge></TableCell>
                      <TableCell className="capitalize">{log.entity_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entity_id}</TableCell>
                      <TableCell>{log.performed_by}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.new_values && Object.keys(log.new_values).length > 0
                          ? `${Object.keys(log.new_values).length} field(s) changed`
                          : "—"}
                      </TableCell>
                    </TableRow>
                    {expanded === log.id && (log.old_values || log.new_values) && (
                      <TableRow key={`${log.id}-expanded`}>
                        <TableCell colSpan={6} className="bg-muted/40 p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {log.old_values && (
                              <div>
                                <p className="font-medium mb-1 text-muted-foreground">Before</p>
                                <pre className="bg-background rounded-md p-2 text-xs overflow-x-auto">{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <p className="font-medium mb-1 text-muted-foreground">After</p>
                                <pre className="bg-background rounded-md p-2 text-xs overflow-x-auto">{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
