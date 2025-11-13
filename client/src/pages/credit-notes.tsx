import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, Eye, IndianRupee } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreditNote {
  id: string;
  noteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  creditDate: string | Date;
  buyerName: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  reason: string;
}

interface CreditNoteItem {
  id: string;
  creditNoteId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export default function CreditNotes() {
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: creditNotes = [], isLoading } = useQuery<CreditNote[]>({
    queryKey: ['/api/credit-notes'],
  });

  const { data: creditNoteItems = [] } = useQuery<CreditNoteItem[]>({
    queryKey: ['/api/credit-note-items', selectedCreditNote?.id],
    queryFn: async () => {
      if (!selectedCreditNote?.id) return [];
      const res = await fetch(`/api/credit-note-items?creditNoteId=${selectedCreditNote.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch credit note items');
      return res.json();
    },
    enabled: !!selectedCreditNote,
  });

  const handleView = (creditNote: CreditNote) => {
    setSelectedCreditNote(creditNote);
    setIsViewOpen(true);
  };

  const handleClose = () => {
    setIsViewOpen(false);
    setSelectedCreditNote(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Credit Notes</h1>
        <p className="text-muted-foreground mt-2">
          View credit notes issued for sales returns and adjustments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Credit Notes
          </CardTitle>
          <CardDescription>
            GST-compliant credit notes for returned goods and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : creditNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credit notes found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit Note #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditNotes.map((cn) => {
                  const total = (cn.grandTotal ?? 0) / 100;
                  return (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">
                        {cn.noteNumber}
                      </TableCell>
                      <TableCell>{cn.invoiceNumber}</TableCell>
                      <TableCell>
                        {format(new Date(cn.creditDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{cn.buyerName}</TableCell>
                      <TableCell className="text-right">
                        ₹{((cn.subtotal ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{((cn.cgstAmount ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{((cn.sgstAmount ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{((cn.igstAmount ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(cn)}
                          data-testid={`button-view-${cn.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credit Note Details</DialogTitle>
            <DialogDescription>
              {selectedCreditNote?.creditNoteNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedCreditNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedCreditNote.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedCreditNote.creditDate), 'dd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Name</p>
                  <p className="font-medium">{selectedCreditNote.buyerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="font-medium">{selectedCreditNote.reason || 'N/A'}</p>
                </div>
              </div>

              {creditNoteItems.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditNoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">{item.quantity ?? 0}</TableCell>
                          <TableCell className="text-right">
                            ₹{(item.unitPrice ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(item.amount ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>₹{((selectedCreditNote.subtotal ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST:</span>
                    <span>₹{((selectedCreditNote.cgstAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST:</span>
                    <span>₹{((selectedCreditNote.sgstAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST:</span>
                    <span>₹{((selectedCreditNote.igstAmount ?? 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>
                      ₹{((selectedCreditNote.grandTotal ?? 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
