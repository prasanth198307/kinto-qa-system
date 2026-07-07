import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, CheckCircle, XCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-600",
};

const FILTER_OPTIONS = ["all", "new", "reviewed", "approved", "rejected", "archived"];

export default function SwachFormsSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: form } = useQuery<any>({
    queryKey: [`/api/forms/${id}`],
    queryFn: async () => (await fetch(`/api/forms/${id}`)).json(),
  });

  const { data: submissions = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/forms/${id}/submissions`, statusFilter],
    queryFn: async () => {
      const url = statusFilter !== "all" ? `/api/forms/${id}/submissions?status=${statusFilter}` : `/api/forms/${id}/submissions`;
      return (await fetch(url)).json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ subId, status, reviewer_notes }: any) => {
      const r = await fetch(`/api/forms/${id}/submissions/${subId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewer_notes }),
      });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Submission updated" });
      setSelectedSub(null);
      qc.invalidateQueries({ queryKey: [`/api/forms/${id}/submissions`] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleExport = () => {
    window.open(`/api/forms/${id}/submissions/export`, "_blank");
  };

  // Detect payment fields
  const schema: any[] = Array.isArray(form?.schema) ? form.schema : [];
  const paymentFields = schema.filter((f: any) => f.type === "payment");
  const hasPaymentFields = paymentFields.length > 0;

  const getPaymentStatus = (sub: any) => {
    if (!hasPaymentFields) return null;
    const paid = paymentFields.some((f: any) => sub.data?.[`${f.id}_payment_id`]);
    return paid ? "paid" : "unpaid";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/swachforms")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <div>
            <h1 className="text-xl font-bold">{form?.name || "Form"} — Submissions</h1>
            <p className="text-sm text-muted-foreground">{submissions.length} submissions</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Submission No</th>
              <th className="text-left px-4 py-3 font-medium">Submitter</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              {hasPaymentFields && <th className="text-left px-4 py-3 font-medium">Payment</th>}
              <th className="text-left px-4 py-3 font-medium">Reviewer</th>
              <th className="text-left px-4 py-3 font-medium">Submitted At</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={hasPaymentFields ? 7 : 6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan={hasPaymentFields ? 7 : 6} className="text-center py-8 text-muted-foreground">No submissions yet</td></tr>
            ) : submissions.map((s: any) => {
              const payStatus = getPaymentStatus(s);
              return (
                <tr key={s.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{s.submission_no}</td>
                  <td className="px-4 py-3">
                    <div>{s.submitter_name || "-"}</div>
                    {s.submitter_email && <div className="text-xs text-muted-foreground">{s.submitter_email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${STATUS_COLORS[s.status] || ""}`}>{s.status}</Badge>
                  </td>
                  {hasPaymentFields && (
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${payStatus === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                        {payStatus}
                      </Badge>
                    </td>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{s.reviewer_id ? `#${s.reviewer_id}` : "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedSub(s); setNotes(s.reviewer_notes || ""); }}>
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submission detail dialog */}
      <Dialog open={!!selectedSub} onOpenChange={open => !open && setSelectedSub(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission {selectedSub?.submission_no}</DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Submitter:</span> {selectedSub.submitter_name || selectedSub.submitter_email || "Anonymous"}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-xs ${STATUS_COLORS[selectedSub.status] || ""}`}>{selectedSub.status}</Badge></div>
                <div><span className="text-muted-foreground">Submitted:</span> {new Date(selectedSub.created_at).toLocaleString()}</div>
                {selectedSub.reviewed_at && <div><span className="text-muted-foreground">Reviewed:</span> {new Date(selectedSub.reviewed_at).toLocaleString()}</div>}
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm">Form Data</h4>
                {Object.entries(selectedSub.data || {}).map(([key, value]: any) => (
                  <div key={key} className="grid grid-cols-2 gap-2 text-sm py-1 border-b last:border-0">
                    <span className="text-muted-foreground font-medium">{key}</span>
                    <span className="break-all">{String(value)}</span>
                  </div>
                ))}
              </div>

              {selectedSub.reviewer_notes && (
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <h4 className="font-medium text-sm mb-1">Reviewer Notes</h4>
                  <p className="text-sm">{selectedSub.reviewer_notes}</p>
                </div>
              )}

              {!["approved", "rejected"].includes(selectedSub.status) && (
                <div className="space-y-2">
                  <Label>Reviewer Notes</Label>
                  <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ subId: selectedSub.id, status: "approved", reviewer_notes: notes })} disabled={updateMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ subId: selectedSub.id, status: "rejected", reviewer_notes: notes })} disabled={updateMutation.isPending}>
                      <XCircle className="w-4 h-4 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSub(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
