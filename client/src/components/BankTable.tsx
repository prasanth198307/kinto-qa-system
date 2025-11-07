import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Star } from "lucide-react";
import type { Bank } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface BankTableProps {
  banks: Bank[];
  isLoading: boolean;
  onEdit?: (bank: Bank) => void;
  onDelete?: (bank: Bank) => void;
  onSetDefault?: (bank: Bank) => void;
}

export default function BankTable({ banks, isLoading, onEdit, onDelete, onSetDefault }: BankTableProps) {
  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-banks">Loading banks...</div>;
  }

  if (banks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground" data-testid="no-banks">No bank accounts found</div>;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="header-bank-name">Bank Name</TableHead>
            <TableHead data-testid="header-account-holder">Account Holder</TableHead>
            <TableHead data-testid="header-account-number">Account Number</TableHead>
            <TableHead data-testid="header-ifsc">IFSC Code</TableHead>
            <TableHead data-testid="header-branch">Branch</TableHead>
            <TableHead data-testid="header-upi">UPI ID</TableHead>
            <TableHead data-testid="header-status">Status</TableHead>
            <TableHead data-testid="header-actions">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banks.map((bank) => (
            <TableRow key={bank.id} data-testid={`bank-row-${bank.id}`}>
              <TableCell data-testid={`bank-name-${bank.id}`}>{bank.bankName}</TableCell>
              <TableCell data-testid={`account-holder-${bank.id}`}>{bank.accountHolderName}</TableCell>
              <TableCell data-testid={`account-number-${bank.id}`} className="font-mono text-sm">
                {bank.accountNumber}
              </TableCell>
              <TableCell data-testid={`ifsc-${bank.id}`} className="font-mono text-sm">
                {bank.ifscCode}
              </TableCell>
              <TableCell data-testid={`branch-${bank.id}`}>{bank.branchName || "-"}</TableCell>
              <TableCell data-testid={`upi-${bank.id}`} className="font-mono text-sm">
                {bank.upiId || "-"}
              </TableCell>
              <TableCell data-testid={`status-${bank.id}`}>
                {bank.isDefault === 1 ? (
                  <Badge variant="default" className="flex items-center gap-1 w-fit">
                    <Star className="w-3 h-3" />
                    Default
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell data-testid={`actions-${bank.id}`}>
                <div className="flex gap-2">
                  {bank.isDefault === 0 && onSetDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSetDefault(bank)}
                      data-testid={`button-set-default-${bank.id}`}
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(bank)}
                      data-testid={`button-edit-${bank.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(bank)}
                      data-testid={`button-delete-${bank.id}`}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
