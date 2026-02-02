import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, ArrowLeft } from "lucide-react";
import SparePartEntryForm from "./SparePartEntryForm";
import type { SparePartCatalog, Machine } from "@shared/schema";

export default function SparePartsStockView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPart, setSelectedPart] = useState<SparePartCatalog | null>(null);

  const { data: spareParts = [], isLoading } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const getMachineName = (machineId: string | null) => {
    if (!machineId) return '-';
    const machine = machines.find(m => m.id === machineId);
    return machine?.name || machineId;
  };

  const filteredParts = spareParts.filter(part => 
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedPart) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedPart(null)} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </Button>
        <SparePartEntryForm part={selectedPart} onClose={() => setSelectedPart(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-title">Spare Parts Stock</h2>
          <p className="text-sm text-muted-foreground">Manage stock entries and issuances for spare parts</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search spare parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-parts"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading spare parts...</div>
      ) : filteredParts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No spare parts found matching your search.' : 'No spare parts in catalog.'}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part #</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const isLowStock = (part.currentStock || 0) <= (part.reorderThreshold || 0);
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">{part.partName}</TableCell>
                      <TableCell>{part.partNumber || '-'}</TableCell>
                      <TableCell>{part.category || '-'}</TableCell>
                      <TableCell>{getMachineName(part.machineId)}</TableCell>
                      <TableCell className="font-medium">{part.currentStock || 0}</TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedPart(part)}
                          data-testid={`button-manage-stock-${part.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Manage Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
