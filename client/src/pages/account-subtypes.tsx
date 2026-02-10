import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Lock, Tag } from "lucide-react";

interface AccountTypeEntry {
  id: string;
  name: string;
  label: string;
  isSystem: number;
}

export default function AccountSubtypesPage() {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const { data: accountTypes = [], isLoading } = useQuery<AccountTypeEntry[]>({
    queryKey: ["/api/account-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; label: string }) => {
      const res = await apiRequest("POST", "/api/account-types", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-types"] });
      toast({ title: "Account type created successfully" });
      setAdding(false);
      setNewLabel("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/account-types/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-types"] });
      toast({ title: "Account type deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
    },
  });

  function handleAdd() {
    if (!newLabel.trim()) {
      toast({ title: "Please enter an account type name", variant: "destructive" });
      return;
    }
    const autoName = newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    createMutation.mutate({ name: autoName, label: newLabel.trim() });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-page-title">Account Types</h2>
          <p className="text-sm text-muted-foreground">Manage account types used in Chart of Accounts (e.g. Asset, Liability, Revenue)</p>
        </div>
        <Button
          onClick={() => setAdding(!adding)}
          variant={adding ? "outline" : "default"}
          data-testid="button-add-type"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {adding ? "Cancel" : "Add Account Type"}
        </Button>
      </div>

      {adding && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Enter new account type name (e.g. Suspense, Contra)"
                className="flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
                data-testid="input-new-type"
              />
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending}
                data-testid="button-save-type"
              >
                {createMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : accountTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No account types found
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <span className="text-sm font-medium">{accountTypes.length} Account Type{accountTypes.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y">
              {accountTypes
                .sort((a, b) => a.label.localeCompare(b.label))
                .map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                  data-testid={`row-type-${t.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm" data-testid={`text-label-${t.id}`}>{t.label}</span>
                    {t.isSystem === 1 && (
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.isSystem !== 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete account type "${t.label}"? This will fail if any accounts use it.`)) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                        data-testid={`button-delete-${t.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
