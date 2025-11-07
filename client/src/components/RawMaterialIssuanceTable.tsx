import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { RawMaterialIssuance, Product, User } from "@shared/schema";
import PrintableRawMaterialIssuance from "@/components/PrintableRawMaterialIssuance";

interface RawMaterialIssuanceTableProps {
  issuances: RawMaterialIssuance[];
  isLoading: boolean;
  onEdit: (issuance: RawMaterialIssuance) => void;
  onDelete: (id: string) => void;
}

export default function RawMaterialIssuanceTable({ issuances, isLoading, onEdit, onDelete }: RawMaterialIssuanceTableProps) {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const getProductName = (productId: string | null | undefined) => {
    if (!productId) return 'N/A';
    const product = products.find(p => p.id === productId);
    return product ? `${product.productCode} - ${product.productName}` : 'N/A';
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    return user?.username || 'N/A';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading issuances...</div>;
  }

  if (issuances.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No raw material issuances found. Click "Issue Material" to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issuance No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>For Product</TableHead>
            <TableHead>Issued To</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issuances.map((issuance) => (
            <TableRow key={issuance.id} data-testid={`row-issuance-${issuance.id}`}>
              <TableCell className="font-medium">{issuance.issuanceNumber}</TableCell>
              <TableCell>{format(new Date(issuance.issuanceDate), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{getProductName(issuance.productId)}</TableCell>
              <TableCell>{issuance.issuedTo || '-'}</TableCell>
              <TableCell>{getUserName(issuance.issuedBy)}</TableCell>
              <TableCell className="max-w-xs truncate">{issuance.remarks || '-'}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <PrintableRawMaterialIssuance issuance={issuance} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(issuance)}
                    data-testid={`button-edit-issuance-${issuance.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(issuance.id)}
                    data-testid={`button-delete-issuance-${issuance.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
