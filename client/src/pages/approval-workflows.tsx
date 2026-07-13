import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface ApprovalRule {
  id: number;
  entity_type: string;
  min_amount: number;
  max_amount: number | null;
  approver_role: string;
  is_active: boolean;
}

interface ApprovalRequest {
  id: number;
  entity_type: string;
  entity_id: string;
  status: string;
  amount: number;
  requested_by: string;
  notes: string;
  created_at: string;
}

const STATUS_BADGE: Record<string, any> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function ApprovalWorkflowsPage() {
  const { toast } = useToast();
  const [ruleOpen, setRuleOpen] = useState(false);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [ruleForm, setRuleForm] = useState({ entity_type: "purchase_order", min_amount: 0, max_amount: "", approver_role: "" });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<ApprovalRule[]>({
    queryKey: ["/api/generic/approval-rules"],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/generic/approval-requests"],
  });

  const saveRuleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/approval-rules", {
      ...ruleForm,
      min_amount: Number(ruleForm.min_amount),
      max_amount: ruleForm.max_amount ? Number(ruleForm.max_amount) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/approval-rules"] });
      toast({ title: "Approval rule created" });
      setRuleOpen(false);
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: string; notes?: string }) =>
      apiRequest("POST", `/api/generic/approval-requests/${id}/action`, { action, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/approval-requests"] });
      toast({ title: "Action recorded" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Approval Workflows</h1>
          {pending.length > 0 && <Badge>{pending.length} pending</Badge>}
        </div>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" data-testid="tab-inbox">Approval Inbox</TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {requestsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : pending.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map(req => (
                      <TableRow key={req.id} data-testid={`row-approval-${req.id}`}>
                        <TableCell className="capitalize">{req.entity_type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-sm">{req.entity_id}</TableCell>
                        <TableCell>{sym}{Number(req.amount || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{req.requested_by}</TableCell>
                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => actionMutation.mutate({ id: req.id, action: "approve" })} disabled={actionMutation.isPending} data-testid={`button-approve-${req.id}`}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ id: req.id, action: "reject" })} disabled={actionMutation.isPending} data-testid={`button-reject-${req.id}`}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setRuleOpen(true)} data-testid="button-add-rule">
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {rulesLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : rules.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No approval rules configured.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Max Amount</TableHead>
                      <TableHead>Approver Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map(rule => (
                      <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                        <TableCell className="capitalize">{rule.entity_type.replace(/_/g, " ")}</TableCell>
                        <TableCell>{sym}{Number(rule.min_amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell>{rule.max_amount ? `${sym}${Number(rule.max_amount).toLocaleString("en-IN")}` : "No limit"}</TableCell>
                        <TableCell>{rule.approver_role}</TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {resolved.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No resolved approvals yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolved.map(req => (
                      <TableRow key={req.id} data-testid={`row-history-${req.id}`}>
                        <TableCell className="capitalize">{req.entity_type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-sm">{req.entity_id}</TableCell>
                        <TableCell>{sym}{Number(req.amount || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell><Badge variant={STATUS_BADGE[req.status]}>{req.status}</Badge></TableCell>
                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Approval Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Entity Type</Label>
              <Select value={ruleForm.entity_type} onValueChange={v => setRuleForm(f => ({ ...f, entity_type: v }))}>
                <SelectTrigger data-testid="select-entity-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  <SelectItem value="expense_claim">Expense Claim</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Min Amount (₹)</Label>
                <Input type="number" data-testid="input-min-amount" value={ruleForm.min_amount} onChange={e => setRuleForm(f => ({ ...f, min_amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Amount (₹, blank = unlimited)</Label>
                <Input type="number" data-testid="input-max-amount" value={ruleForm.max_amount} onChange={e => setRuleForm(f => ({ ...f, max_amount: e.target.value }))} placeholder="No limit" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Approver Role</Label>
              <Input data-testid="input-approver-role" value={ruleForm.approver_role} onChange={e => setRuleForm(f => ({ ...f, approver_role: e.target.value }))} placeholder="e.g. Manager, Finance Head" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRuleOpen(false)}>Cancel</Button>
              <Button onClick={() => saveRuleMutation.mutate()} disabled={saveRuleMutation.isPending || !ruleForm.approver_role} data-testid="button-save-rule">
                {saveRuleMutation.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
