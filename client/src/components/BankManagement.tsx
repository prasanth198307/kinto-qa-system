import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import BankForm from "@/components/BankForm";
import BankTable from "@/components/BankTable";
import type { Bank } from "@shared/schema";

export default function BankManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const { toast } = useToast();

  const { data: banks = [], isLoading } = useQuery<Bank[]>({
    queryKey: ["/api/banks"],
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/banks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
      toast({
        title: "Success",
        description: "Bank deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bank",
        variant: "destructive",
      });
    },
  });

  const setDefaultBankMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/banks/${id}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
      toast({
        title: "Success",
        description: "Default bank set successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set default bank",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setShowForm(true);
  };

  const handleDelete = (bank: Bank) => {
    if (confirm("Are you sure you want to delete this bank?")) {
      deleteBankMutation.mutate(bank.id);
    }
  };

  const handleSetDefault = (bank: Bank) => {
    setDefaultBankMutation.mutate(bank.id);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingBank(null);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Bank Master</h2>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          data-testid="button-add-bank"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Bank
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <BankForm bank={editingBank || undefined} onClose={handleFormClose} />
        </div>
      )}

      <BankTable
        banks={banks}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
      />
    </Card>
  );
}
