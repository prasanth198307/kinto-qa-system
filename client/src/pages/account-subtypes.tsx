import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Lock, Layers, X } from "lucide-react";

interface AccountSubtype {
  id: string;
  accountType: string;
  name: string;
  label: string;
  isSystem: number;
}

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

function typeLabel(t: string): string {
  return ACCOUNT_TYPES.find(at => at.value === t)?.label || t;
}

function typeBadgeVariant(t: string): "default" | "secondary" | "outline" | "destructive" {
  switch (t) {
    case "asset": return "default";
    case "liability": return "destructive";
    case "equity": return "secondary";
    case "revenue": return "default";
    case "expense": return "outline";
    default: return "secondary";
  }
}

export default function AccountSubtypesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [addingToType, setAddingToType] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const { data: subtypes = [], isLoading } = useQuery<AccountSubtype[]>({
    queryKey: ["/api/account-subtypes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { accountType: string; name: string; label: string }) => {
      const res = await apiRequest("POST", "/api/account-subtypes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-subtypes"] });
      toast({ title: "Sub-type created successfully" });
      setAddingToType(null);
      setNewLabel("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/account-subtypes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-subtypes"] });
      toast({ title: "Sub-type deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
    },
  });

  function handleAdd(accountType: string) {
    if (!newLabel.trim()) {
      toast({ title: "Please enter a sub-type name", variant: "destructive" });
      return;
    }
    const autoName = newLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    createMutation.mutate({ accountType, name: autoName, label: newLabel.trim() });
  }

  const filtered = subtypes.filter(st => {
    if (filterType !== "all" && st.accountType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return st.name.toLowerCase().includes(q) || st.label.toLowerCase().includes(q);
    }
    return true;
  });

  const typesToShow = filterType === "all" ? ACCOUNT_TYPES : ACCOUNT_TYPES.filter(t => t.value === filterType);

  const grouped = typesToShow.reduce<Record<string, AccountSubtype[]>>((acc, type) => {
    acc[type.value] = filtered.filter(st => st.accountType === type.value);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-page-title">Account Sub-Types</h2>
          <p className="text-sm text-muted-foreground">Manage the sub-type categories used in Chart of Accounts</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sub-types..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([accountType, items]) => (
            <Card key={accountType}>
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadgeVariant(accountType)} className="text-xs">
                      {typeLabel(accountType)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {items.length} sub-type{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAddingToType(addingToType === accountType ? null : accountType);
                      setNewLabel("");
                    }}
                    data-testid={`button-add-${accountType}`}
                  >
                    {addingToType === accountType ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>

                {addingToType === accountType && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                    <Input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder={`New ${typeLabel(accountType)} sub-type name...`}
                      className="flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleAdd(accountType); }}
                      data-testid="input-new-subtype"
                    />
                    <Button
                      onClick={() => handleAdd(accountType)}
                      disabled={createMutation.isPending}
                      data-testid="button-save-subtype"
                    >
                      {createMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                )}

                <div className="divide-y">
                  {items.length === 0 && addingToType !== accountType ? (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                      No sub-types yet
                    </div>
                  ) : (
                    items
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map(st => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between px-4 py-2.5 gap-3"
                        data-testid={`row-subtype-${st.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm" data-testid={`text-label-${st.id}`}>{st.label}</span>
                              {st.isSystem === 1 && (
                                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {st.isSystem !== 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Delete sub-type "${st.label}"? This will fail if any accounts use it.`)) {
                                  deleteMutation.mutate(st.id);
                                }
                              }}
                              data-testid={`button-delete-${st.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
