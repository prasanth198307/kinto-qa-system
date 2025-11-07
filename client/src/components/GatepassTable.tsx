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
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Gatepass, GatepassItem, FinishedGood, Product, User, Vendor } from "@shared/schema";

interface GatepassTableProps {
  gatepasses: Gatepass[];
  isLoading: boolean;
  onEdit: (gatepass: Gatepass) => void;
  onDelete: (id: string) => void;
}

function GatepassItems({ gatepassId, products, finishedGoods }: { gatepassId: string; products: Product[]; finishedGoods: FinishedGood[] }) {
  const { data: items = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', gatepassId],
  });

  if (items.length === 0) return <span className="text-muted-foreground">No items</span>;

  const getItemDisplay = (item: GatepassItem) => {
    const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
    const product = fg ? products.find(p => p.id === fg.productId) : products.find(p => p.id === item.productId);
    const productName = product?.productName || item.productId || 'Unknown';
    return `${productName} (${item.quantityDispatched})`;
  };

  if (items.length === 1) {
    return <span>{getItemDisplay(items[0])}</span>;
  }

  return (
    <div className="space-y-1">
      {items.slice(0, 2).map((item, idx) => (
        <div key={idx} className="text-sm">
          {getItemDisplay(item)}
        </div>
      ))}
      {items.length > 2 && (
        <Badge variant="secondary" className="text-xs">
          +{items.length - 2} more
        </Badge>
      )}
    </div>
  );
}

export default function GatepassTable({ gatepasses, isLoading, onEdit, onDelete }: GatepassTableProps) {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const getProductName = (productId: string | null) => {
    const product = products.find(p => p.id === productId);
    return product?.productName || 'N/A';
  };

  const getFinishedGoodName = (finishedGoodId: string | null) => {
    const fg = finishedGoods.find(f => f.id === finishedGoodId);
    if (!fg) return 'N/A';
    const product = products.find(p => p.id === fg.productId);
    return product?.productName || fg.batchNumber || 'N/A';
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    return user?.username || 'N/A';
  };

  const getVendor = (vendorId: string | null | undefined) => {
    if (!vendorId) return null;
    return vendors.find(v => v.id === vendorId);
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
            <TableHead>Items</TableHead>
            <TableHead>Customer/Vendor</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gatepasses.map((gatepass) => {
            const vendor = getVendor(gatepass.vendorId);
            return (
            <TableRow key={gatepass.id} data-testid={`row-gatepass-${gatepass.id}`}>
              <TableCell className="font-medium">{gatepass.gatepassNumber}</TableCell>
              <TableCell>{format(new Date(gatepass.gatepassDate), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                <GatepassItems gatepassId={gatepass.id} products={products} finishedGoods={finishedGoods} />
              </TableCell>
              <TableCell>
                {vendor ? (
                  <div>
                    <div className="font-medium">{vendor.vendorName}</div>
                    <div className="text-xs text-muted-foreground">
                      {vendor.mobileNumber}
                      {(vendor.gstNumber || vendor.aadhaarNumber) && (
                        <> • {vendor.gstNumber || vendor.aadhaarNumber}</>
                      )}
                    </div>
                  </div>
                ) : (
                  gatepass.customerName || '-'
                )}
              </TableCell>
              <TableCell>{gatepass.vehicleNumber}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{gatepass.driverName}</div>
                  {gatepass.driverContact && (
                    <div className="text-xs text-muted-foreground">{gatepass.driverContact}</div>
                  )}
                </div>
              </TableCell>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
