import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, AlertTriangle, Check } from "lucide-react";
import { groupAccountsByParent } from "@/lib/account-hierarchy";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType?: string;
  parentId?: string | null;
  level?: number;
}

interface JournalLineForm {
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
  partyType: string;
  partyName: string;
}

function formatAmount(paise: number): string {
  return `${sym}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function ManualJournalEntryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchString = useSearch();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const editId = new URLSearchParams(searchString).get("edit");
  const isEditMode = !!editId;

  const [journalDate, setJournalDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [lines, setLines] = useState<JournalLineForm[]>([
    { accountId: "", debit: "", credit: "", memo: "", partyType: "", partyName: "" },
    { accountId: "", debit: "", credit: "", memo: "", partyType: "", partyName: "" },
  ]);

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ["/api/chart-of-accounts"],
  });

  const { data: editEntry } = useQuery<any>({
    queryKey: ["/api/journal-entries", editId],
    queryFn: async () => {
      const res = await fetch(`/api/journal-entries/${editId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch journal entry");
      return res.json();
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (editEntry && !loaded) {
      setJournalDate(editEntry.journalDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setDescription(editEntry.description || "");
      setNotes(editEntry.notes || "");
      if (editEntry.lines && editEntry.lines.length > 0) {
        setLines(editEntry.lines.map((l: any) => ({
          accountId: l.accountId || "",
          debit: l.debit ? String(l.debit / 100) : "",
          credit: l.credit ? String(l.credit / 100) : "",
          memo: l.memo || "",
          partyType: l.partyType || "",
          partyName: l.partyName || "",
        })));
      }
      setLoaded(true);
    }
  }, [editEntry, loaded]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditMode) {
        const res = await apiRequest("PUT", `/api/journal-entries/${editId}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/journal-entries", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries", editId] });
      toast({ title: isEditMode ? "Journal entry updated successfully" : "Journal entry created successfully" });
      setLocation(`/journal-entry/${data.id || editId}`);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function addLine() {
    setLines(prev => [...prev, { accountId: "", debit: "", credit: "", memo: "", partyType: "", partyName: "" }]);
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof JournalLineForm, value: string) {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === "debit" && value) updated.credit = "";
      if (field === "credit" && value) updated.debit = "";
      return updated;
    }));
  }

  const totalDebit = lines.reduce((sum, l) => sum + Math.round(parseFloat(l.debit || "0") * 100), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Math.round(parseFloat(l.credit || "0") * 100), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const difference = Math.abs(totalDebit - totalCredit);

  function handleSubmit() {
    if (!isBalanced) {
      toast({ title: "Debits must equal credits", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }

    const validLines = lines
      .filter(l => l.accountId && (parseFloat(l.debit || "0") > 0 || parseFloat(l.credit || "0") > 0))
      .map(l => ({
        accountId: l.accountId,
        debit: Math.round(parseFloat(l.debit || "0") * 100),
        credit: Math.round(parseFloat(l.credit || "0") * 100),
        memo: l.memo || undefined,
        partyType: l.partyType || undefined,
        partyName: l.partyName || undefined,
      }));

    if (validLines.length < 2) {
      toast({ title: "At least 2 lines required", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      journalDate,
      description,
      notes: notes || undefined,
      lines: validLines,
    });
  }

  const hierarchyGroups = groupAccountsByParent(accounts);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" data-testid="page-manual-journal">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/journal-entries")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">{isEditMode ? "Edit Journal Entry" : "New Manual Journal Entry"}</h1>
          <p className="text-sm text-muted-foreground">{isEditMode ? "Modify this journal entry" : "Create a double-entry journal transaction"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Journal Date</Label>
          <Input
            type="date"
            value={journalDate}
            onChange={e => setJournalDate(e.target.value)}
            data-testid="input-journal-date"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Bank deposit, Purchase payment, Salary disbursement"
            data-testid="input-description"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span>Journal Lines</span>
            <Button variant="outline" size="sm" onClick={addLine} data-testid="button-add-line">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start" data-testid={`line-${idx}`}>
              <div className="col-span-12 sm:col-span-4">
                <Select value={line.accountId} onValueChange={v => updateLine(idx, "accountId", v)}>
                  <SelectTrigger data-testid={`select-account-${idx}`}>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchyGroups.map(group => (
                      <div key={group.label}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group.label}</div>
                        {group.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Debit ${sym}"
                  value={line.debit}
                  onChange={e => updateLine(idx, "debit", e.target.value)}
                  step="0.01"
                  min="0"
                  data-testid={`input-debit-${idx}`}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  placeholder="Credit ${sym}"
                  value={line.credit}
                  onChange={e => updateLine(idx, "credit", e.target.value)}
                  step="0.01"
                  min="0"
                  data-testid={`input-credit-${idx}`}
                />
              </div>
              <div className="col-span-3 sm:col-span-3">
                <Input
                  placeholder="Memo"
                  value={line.memo}
                  onChange={e => updateLine(idx, "memo", e.target.value)}
                  data-testid={`input-memo-${idx}`}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={lines.length <= 2}
                  onClick={() => removeLine(idx)}
                  data-testid={`button-remove-${idx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t gap-4 flex-wrap">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Debit: </span>
                <span className="font-mono font-medium" data-testid="text-total-debit">{formatAmount(totalDebit)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Credit: </span>
                <span className="font-mono font-medium" data-testid="text-total-credit">{formatAmount(totalCredit)}</span>
              </div>
              {difference > 0 && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Difference: {formatAmount(difference)}
                </div>
              )}
              {isBalanced && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="w-3.5 h-3.5" />
                  Balanced
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Additional notes for this journal entry"
          rows={2}
          data-testid="input-notes"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setLocation("/journal-entries")} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isBalanced || createMutation.isPending || !description.trim()}
          data-testid="button-save-journal"
        >
          <Save className="w-4 h-4 mr-1" />
          {createMutation.isPending ? "Saving..." : isEditMode ? "Update Journal Entry" : "Save Journal Entry"}
        </Button>
      </div>
    </div>
  );
}
