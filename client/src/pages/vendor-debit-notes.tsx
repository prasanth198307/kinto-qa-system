import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, FileText, CheckCircle, Clock, XCircle, DollarSign, ArrowRightLeft, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { VendorDebitNoteDialog } from "@/components/VendorDebitNoteDialog";
import { DebitNoteAdjustmentDialog } from "@/components/DebitNoteAdjustmentDialog";
import PrintableDebitNote from "@/components/PrintableDebitNote";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface VendorDebitNote {
  id: string;
  noteNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGst: string | null;
  debitDate: string;
  reason: string;
  status: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  settledAmount: number;
  settlementDate: string | null;
  settlementReference: string | null;
  notes: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  processing_charges: "Processing Charges",
  job_work_charges: "Job Work Charges",
  freight_charges: "Freight/Transport Charges",
  quality_premium: "Quality Premium/Bonus",
  material_conversion: "Material Conversion Charges",
  defective_goods: "Defective Goods",
  short_receipt: "Short Receipt",
  quality_rejection: "Quality Rejection",
  price_dispute: "Price Dispute",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  issued: { label: "Issued", variant: "default", icon: FileText },
  acknowledged: { label: "Acknowledged", variant: "outline", icon: CheckCircle },
  settled: { label: "Settled", variant: "default", icon: DollarSign },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

export default function VendorDebitNotesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('vendor_debit_notes', 'create');
  const canDelete = hasPermission('vendor_debit_notes', 'delete');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adjustmentNote, setAdjustmentNote] = useState<VendorDebitNote | null>(null);
  const [deleteNote, setDeleteNote] = useState<VendorDebitNote | null>(null);

  const { data: debitNotes = [], isLoading } = useQuery<VendorDebitNote[]>({
    queryKey: ["/api/vendor-debit-notes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/vendor-debit-notes/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Debit Note Deleted",
        description: data.revokedAdjustments > 0 
          ? `Debit note deleted. ${data.revokedAdjustments} adjustment(s) and related invoice payments have been revoked.`
          : "Debit note deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-payments"] });
      setDeleteNote(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete debit note",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const filteredNotes = debitNotes.filter((note) => {
    const matchesSearch =
      note.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || note.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredNotes.reduce((sum, note) => sum + note.grandTotal, 0);
  const settledAmount = filteredNotes.reduce((sum, note) => sum + (note.settledAmount || 0), 0);
  const pendingAmount = totalAmount - settledAmount;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=invoices')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Vendor Debit Notes</h1>
            <p className="text-muted-foreground text-sm">
              Create and manage debit notes against vendors for claims
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-debit-note">
            <Plus className="h-4 w-4 mr-2" /> Create Debit Note
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-total-claims">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{filteredNotes.length} debit notes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Settled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-settled-amount">
              {formatCurrency(settledAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Amount recovered from vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-pending-amount">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Yet to be recovered</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="text-lg">Debit Notes</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "No debit notes match your search criteria"
                : "No vendor debit notes yet. Click 'Create Debit Note' to issue one."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Note Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Settled</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => {
                  const statusConfig = STATUS_CONFIG[note.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={note.id} data-testid={`row-debit-note-${note.id}`}>
                      <TableCell className="font-medium" data-testid={`text-note-number-${note.id}`}>
                        {note.noteNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{note.vendorName}</div>
                          {note.vendorGst && (
                            <div className="text-xs text-muted-foreground">{note.vendorGst}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(note.debitDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{REASON_LABELS[note.reason] || note.reason}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(note.grandTotal)}</TableCell>
                      <TableCell className="text-right">
                        {note.settledAmount > 0 ? (
                          <span className="text-green-600">{formatCurrency(note.settledAmount)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <PrintableDebitNote debitNote={note} />
                          {note.status !== 'cancelled' && note.status !== 'settled' && note.settledAmount < note.grandTotal && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setAdjustmentNote(note)}
                              data-testid={`button-adjust-${note.id}`}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-1" />
                              Adjust
                            </Button>
                          )}
                          {note.status !== 'cancelled' && canDelete && (
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteNote(note)}
                              data-testid={`button-delete-${note.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VendorDebitNoteDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {}}
      />

      {adjustmentNote && (
        <DebitNoteAdjustmentDialog
          open={!!adjustmentNote}
          onOpenChange={(open) => !open && setAdjustmentNote(null)}
          debitNote={{
            id: adjustmentNote.id,
            noteNumber: adjustmentNote.noteNumber,
            vendorId: adjustmentNote.vendorId,
            vendorName: adjustmentNote.vendorName,
            grandTotal: adjustmentNote.grandTotal,
            settledAmount: adjustmentNote.settledAmount,
          }}
          onSuccess={() => setAdjustmentNote(null)}
        />
      )}

      <AlertDialog open={!!deleteNote} onOpenChange={(open) => !open && setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Debit Note?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteNote && (
                <>
                  <p className="mb-2">
                    Are you sure you want to delete <strong>{deleteNote.noteNumber}</strong>?
                  </p>
                  {deleteNote.settledAmount > 0 && (
                    <p className="text-orange-600 font-medium">
                      This debit note has {formatCurrency(deleteNote.settledAmount)} in adjustments. 
                      <strong> All adjustments will be revoked</strong> and any related invoice payments will be removed.
                    </p>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteNote && deleteMutation.mutate(deleteNote.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
