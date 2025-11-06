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
import type { Gatepass, Product, User } from "@shared/schema";

interface GatepassTableProps {
  gatepasses: Gatepass[];
  isLoading: boolean;
  onEdit: (gatepass: Gatepass) => void;
  onDelete: (id: string) => void;
}

export default function GatepassTable({ gatepasses, isLoading, onEdit, onDelete }: GatepassTableProps) {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const getProductName = (productId: string | null) => {
    const product = products.find(p => p.id === productId);
    return product?.productName || 'N/A';
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    return user?.username || 'N/A';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading gatepasses...</div>;
  }

  if (gatepasses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No gatepasses found. Click "Issue Gatepass" to create one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>GP Number</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gatepasses.map((gatepass) => (
            <TableRow key={gatepass.id} data-testid={`row-gatepass-${gatepass.id}`}>
              <TableCell className="font-medium">{gatepass.gatepassNumber}</TableCell>
              <TableCell>{format(new Date(gatepass.gatepassDate), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{getProductName(gatepass.productId)}</TableCell>
              <TableCell>{gatepass.quantityDispatched}</TableCell>
              <TableCell>{gatepass.vehicleNumber}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{gatepass.driverName}</div>
                  {gatepass.driverContact && (
                    <div className="text-xs text-muted-foreground">{gatepass.driverContact}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>{gatepass.destination || '-'}</TableCell>
              <TableCell>{getUserName(gatepass.issuedBy)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(gatepass)}
                    data-testid={`button-edit-gatepass-${gatepass.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(gatepass.id)}
                    data-testid={`button-delete-gatepass-${gatepass.id}`}
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
