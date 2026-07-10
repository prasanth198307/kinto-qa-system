import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, Link, Unlink } from "lucide-react";

function fmtINR(n: number | string) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type MatchFilter = "all" | "unmatched" | "matched" | "manual";

interface BankLine {
  id: string;
  txn_date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  status: string;
  reconciled_with: string;
  matched_journal_number: string;
  journal_entry_id: string;
}

export default function BankReconciliation() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [matchOpen, setMatchOpen] = useState<string | null>(null);
  const [journalSearch, setJournalSearch] = useState("");
  const [journalEntryId, setJournalEntryId] = useState("");

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/bank-reconciliation/summary"],
  });

  const { data: lines = [], isLoading } = useQuery<BankLine[]>({
    queryKey: ["/api/bank-reconciliation/lines", filter],
    queryFn: () => {
      const params = filter !== "all" ? `?match_status=${filter}` : "";
      return fetch(`/api/bank-reconciliation/lines${params}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
    },
  });

  const { data: journals = [] } = useQuery<any[]>({
    queryKey: ["/api/journal-entries", journalSearch],
    queryFn: () =>
      fetch(`/api/journal-entries?search=${encodeURIComponent(journalSearch)}&limit=20`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: matchOpen !== null,
  });

  const autoMatch = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bank-reconciliation/auto-match", {}),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/bank-reconciliation"] });
      toast({ title: `Auto-match complete: ${data.matched} matched, ${data.unmatched} unmatched` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const matchLine = useMutation({
    mutationFn: ({ id, journal_entry_id }: { id: string; journal_entry_id: string }) =>
      apiRequest("PUT", `/api/bank-reconciliation/lines/${id}/match`, { journal_entry_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bank-reconciliation"] });
      setMatchOpen(null);
      toast({ title: "Line matched to journal entry" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unmatchLine = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/bank-reconciliation/lines/${id}/unmatch`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bank-reconciliation"] });
      toast({ title: "Line unmatched" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function rowColor(line: BankLine) {
    if (line.status === "reconciled" && line.reconciled_with === "manual") return "bg-blue-50";
    if (line.status === "reconciled") return "bg-green-50";
    return "bg-red-50/40";
  }

  function statusBadge(line: BankLine) {
    if (line.status === "reconciled" && line.reconciled_with === "manual")
      return <Badge className="bg-blue-100 text-blue-700">Manual</Badge>;
    if (line.status === "reconciled")
      return <Badge className="bg-green-100 text-green-700">Matched</Badge>;
    return <Badge className="bg-red-100 text-red-700">Unmatched</Badge>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
        <Button onClick={() => autoMatch.mutate()} disabled={autoMatch.isPending}>
          <RefreshCw className="h-4 w-4 mr-2" />Auto-Match
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Lines", value: summary?.total_lines || 0, cls: "" },
          { label: "Matched", value: summary?.matched || 0, cls: "text-green-600" },
          { label: "Unmatched", value: summary?.unmatched || 0, cls: "text-red-600" },
          { label: "Reconciled Balance", value: fmtINR(summary?.reconciled_balance || 0), cls: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-xl font-bold ${s.cls}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={v => setFilter(v as MatchFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lines table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched Journal</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">Loading...</TableCell></TableRow>
              )}
              {!isLoading && (lines as BankLine[]).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400">No lines found</TableCell></TableRow>
              )}
              {(lines as BankLine[]).map(line => (
                <TableRow key={line.id} className={rowColor(line)}>
                  <TableCell className="text-sm">{line.txn_date}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={line.description}>{line.description}</TableCell>
                  <TableCell className="text-right text-sm">{Number(line.debit) > 0 ? fmtINR(line.debit) : ""}</TableCell>
                  <TableCell className="text-right text-sm">{Number(line.credit) > 0 ? fmtINR(line.credit) : ""}</TableCell>
                  <TableCell className="text-right text-sm">{fmtINR(line.balance)}</TableCell>
                  <TableCell>{statusBadge(line)}</TableCell>
                  <TableCell className="text-sm text-blue-600">{line.matched_journal_number || "—"}</TableCell>
                  <TableCell className="space-x-1">
                    {line.status !== "reconciled" && (
                      <Button size="sm" variant="outline" onClick={() => { setMatchOpen(line.id); setJournalEntryId(""); setJournalSearch(""); }}>
                        <Link className="h-3 w-3 mr-1" />Match
                      </Button>
                    )}
                    {line.status === "reconciled" && (
                      <Button size="sm" variant="ghost" className="text-red-500 text-xs" onClick={() => unmatchLine.mutate(line.id)}>
                        <Unlink className="h-3 w-3 mr-1" />Unmatch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Match dialog */}
      <Dialog open={matchOpen !== null} onOpenChange={() => setMatchOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Match to Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Search Journal Entries</Label>
              <Input placeholder="Journal number or description..." value={journalSearch} onChange={e => setJournalSearch(e.target.value)} />
            </div>
            <div>
              <Label>Or enter Journal Entry ID directly</Label>
              <Input placeholder="Journal entry ID" value={journalEntryId} onChange={e => setJournalEntryId(e.target.value)} />
            </div>
            {(journals as any[]).length > 0 && (
              <div className="border rounded max-h-40 overflow-y-auto text-sm">
                {(journals as any[]).slice(0, 10).map((je: any) => (
                  <div key={je.id} className={`p-2 cursor-pointer hover:bg-gray-50 ${journalEntryId === je.id ? "bg-blue-50" : ""}`}
                    onClick={() => setJournalEntryId(je.id)}>
                    <span className="font-mono font-medium">{je.journalNumber || je.journal_number}</span>
                    <span className="text-gray-500 ml-2">{je.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchOpen(null)}>Cancel</Button>
            <Button disabled={!journalEntryId || matchLine.isPending}
              onClick={() => matchOpen && matchLine.mutate({ id: matchOpen, journal_entry_id: journalEntryId })}>
              Confirm Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
