import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CostCentre {
  id: number;
  name: string;
  code: string;
  description: string;
  parent_id: number | null;
  is_active: boolean;
}

export default function CostCentresPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostCentre | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const { data: costCentres = [], isLoading } = useQuery<CostCentre[]>({
    queryKey: ["/api/generic/cost-centres"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? apiRequest("PUT", `/api/generic/cost-centres/${editing.id}`, data)
        : apiRequest("POST", "/api/generic/cost-centres", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/cost-centres"] });
      toast({ title: editing ? "Cost centre updated" : "Cost centre created" });
      setOpen(false);
      setEditing(null);
      setForm({ name: "", code: "", description: "" });
    },
    onError: () => toast({ title: "Error saving cost centre", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/generic/cost-centres/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/cost-centres"] });
      toast({ title: "Cost centre deleted" });
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setOpen(true);
  }

  function openEdit(cc: CostCentre) {
    setEditing(cc);
    setForm({ name: cc.name, code: cc.code, description: cc.description || "" });
    setOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Cost Centres</h1>
        </div>
        <Button onClick={openCreate} data-testid="button-add-cost-centre">
          <Plus className="h-4 w-4 mr-1" /> Add Cost Centre
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : costCentres.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No cost centres yet. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCentres.map((cc) => (
                  <TableRow key={cc.id} data-testid={`row-cost-centre-${cc.id}`}>
                    <TableCell className="font-mono text-sm">{cc.code}</TableCell>
                    <TableCell className="font-medium">{cc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cc.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cc.is_active !== false ? "default" : "secondary"}>
                        {cc.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(cc)} data-testid={`button-edit-${cc.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(cc.id)} data-testid={`button-delete-${cc.id}`}>
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cost Centre" : "New Cost Centre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cc-code">Code</Label>
              <Input id="cc-code" data-testid="input-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CC-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-name">Name</Label>
              <Input id="cc-name" data-testid="input-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Marketing" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-desc">Description</Label>
              <Input id="cc-desc" data-testid="input-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.code} data-testid="button-save-cost-centre">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
