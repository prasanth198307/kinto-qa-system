import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Package, FileText } from "lucide-react";
import RawMaterialIssuanceForm from "@/components/RawMaterialIssuanceForm";
import GatepassForm from "@/components/GatepassForm";
import InvoiceForm from "@/components/InvoiceForm";
import RawMaterialIssuanceTable from "@/components/RawMaterialIssuanceTable";
import GatepassTable from "@/components/GatepassTable";
import InvoiceTable from "@/components/InvoiceTable";
import type { RawMaterialIssuance, Gatepass, Invoice } from "@shared/schema";

interface ProductionManagementProps {
  activeTab?: string;
}

export default function ProductionManagement({ activeTab: externalActiveTab }: ProductionManagementProps = {}) {
  const [activeTab, setActiveTab] = useState(externalActiveTab || "raw-material-issuance");
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [showGatepassForm, setShowGatepassForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<RawMaterialIssuance | null>(null);
  const [editingGatepass, setEditingGatepass] = useState<Gatepass | null>(null);
  const [selectedGatepassForInvoice, setSelectedGatepassForInvoice] = useState<Gatepass | null>(null);
  const { toast } = useToast();

  // Update activeTab when externalActiveTab changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const { data: issuances = [], isLoading: isLoadingIssuances } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: gatepasses = [], isLoading: isLoadingGatepasses } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
  });

  const deleteIssuanceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/raw-material-issuances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({
        title: "Success",
        description: "Issuance deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete issuance",
        variant: "destructive",
      });
    },
  });

  const deleteGatepassMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/gatepasses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({
        title: "Success",
        description: "Gatepass deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete gatepass",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleEditIssuance = (issuance: RawMaterialIssuance) => {
    setEditingIssuance(issuance);
    setShowIssuanceForm(true);
  };

  const handleEditGatepass = (gatepass: Gatepass) => {
    setEditingGatepass(gatepass);
    setShowGatepassForm(true);
  };

  const handleDeleteIssuance = (id: string) => {
    if (confirm("Are you sure you want to delete this issuance?")) {
      deleteIssuanceMutation.mutate(id);
    }
  };

  const handleDeleteGatepass = (id: string) => {
    if (confirm("Are you sure you want to delete this gatepass?")) {
      deleteGatepassMutation.mutate(id);
    }
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleIssuanceFormClose = () => {
    setShowIssuanceForm(false);
    setEditingIssuance(null);
  };

  const handleGatepassFormClose = () => {
    setShowGatepassForm(false);
    setEditingGatepass(null);
  };

  const handleGenerateInvoice = (gatepass: Gatepass) => {
    setSelectedGatepassForInvoice(gatepass);
    setShowInvoiceForm(true);
  };

  const handleInvoiceFormClose = () => {
    setShowInvoiceForm(false);
    setSelectedGatepassForInvoice(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'raw-material-issuance':
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Raw Material Issuance</h2>
              <Button 
                onClick={() => setShowIssuanceForm(true)} 
                size="sm"
                data-testid="button-add-issuance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Material
              </Button>
            </div>

            {showIssuanceForm && (
              <div className="mb-4">
                <RawMaterialIssuanceForm
                  issuance={editingIssuance}
                  onClose={handleIssuanceFormClose}
                />
              </div>
            )}

            <RawMaterialIssuanceTable
              issuances={issuances}
              isLoading={isLoadingIssuances}
              onEdit={handleEditIssuance}
              onDelete={handleDeleteIssuance}
            />
          </Card>
        );
      case 'gatepasses':
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Gatepasses</h2>
              <Button 
                onClick={() => setShowGatepassForm(true)} 
                size="sm"
                data-testid="button-add-gatepass"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Gatepass
              </Button>
            </div>

            {showGatepassForm && (
              <div className="mb-4">
                <GatepassForm
                  gatepass={editingGatepass}
                  onClose={handleGatepassFormClose}
                />
              </div>
            )}

            {showInvoiceForm && (
              <div className="mb-4">
                <InvoiceForm
                  gatepass={selectedGatepassForInvoice || undefined}
                  onClose={handleInvoiceFormClose}
                />
              </div>
            )}

            <GatepassTable
              gatepasses={gatepasses}
              isLoading={isLoadingGatepasses}
              onEdit={handleEditGatepass}
              onDelete={handleDeleteGatepass}
              onGenerateInvoice={handleGenerateInvoice}
            />
          </Card>
        );
      case 'invoices':
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Sales Invoices</h2>
            </div>

            <InvoiceTable
              invoices={invoices}
              isLoading={isLoadingInvoices}
              onDelete={handleDeleteInvoice}
            />
          </Card>
        );
      default:
        return (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Raw Material Issuance</h2>
              <Button 
                onClick={() => setShowIssuanceForm(true)} 
                size="sm"
                data-testid="button-add-issuance"
              >
                <Plus className="w-4 h-4 mr-2" />
                Issue Material
              </Button>
            </div>

            {showIssuanceForm && (
              <div className="mb-4">
                <RawMaterialIssuanceForm
                  issuance={editingIssuance}
                  onClose={handleIssuanceFormClose}
                />
              </div>
            )}

            <RawMaterialIssuanceTable
              issuances={issuances}
              isLoading={isLoadingIssuances}
              onEdit={handleEditIssuance}
              onDelete={handleDeleteIssuance}
            />
          </Card>
        );
    }
  };

  return (
    <div className="bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Production Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage raw material issuance and gatepasses</p>
        </div>
      </div>

      <div className="p-4 pb-20">
        {renderContent()}
      </div>
    </div>
  );
}
