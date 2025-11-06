import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, FileText, Plus } from "lucide-react";
import RawMaterialIssuanceForm from "@/components/RawMaterialIssuanceForm";
import GatepassForm from "@/components/GatepassForm";
import RawMaterialIssuanceTable from "@/components/RawMaterialIssuanceTable";
import GatepassTable from "@/components/GatepassTable";
import type { RawMaterialIssuance, Gatepass } from "@shared/schema";
import MobileHeader from "@/components/MobileHeader";

export default function ProductionManagement() {
  const [activeTab, setActiveTab] = useState("raw-material-issuance");
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [showGatepassForm, setShowGatepassForm] = useState(false);
  const [editingIssuance, setEditingIssuance] = useState<RawMaterialIssuance | null>(null);
  const [editingGatepass, setEditingGatepass] = useState<Gatepass | null>(null);
  const { toast } = useToast();

  const { data: issuances = [], isLoading: isLoadingIssuances } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: gatepasses = [], isLoading: isLoadingGatepasses } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
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

  const handleIssuanceFormClose = () => {
    setShowIssuanceForm(false);
    setEditingIssuance(null);
  };

  const handleGatepassFormClose = () => {
    setShowGatepassForm(false);
    setEditingGatepass(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Production Management" />
      
      <div className="p-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="raw-material-issuance" className="gap-2" data-testid="tab-raw-material-issuance">
              <Package className="w-4 h-4" />
              Raw Material Issuance
            </TabsTrigger>
            <TabsTrigger value="gatepasses" className="gap-2" data-testid="tab-gatepasses">
              <FileText className="w-4 h-4" />
              Gatepasses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raw-material-issuance">
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
          </TabsContent>

          <TabsContent value="gatepasses">
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

              <GatepassTable
                gatepasses={gatepasses}
                isLoading={isLoadingGatepasses}
                onEdit={handleEditGatepass}
                onDelete={handleDeleteGatepass}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
