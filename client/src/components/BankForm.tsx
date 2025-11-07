import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Bank } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const bankFormSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().min(11, "IFSC code must be 11 characters").max(11),
  branchName: z.string().optional(),
  accountType: z.string().optional(),
  upiId: z.string().optional(),
  isDefault: z.number().optional(),
});

type BankFormData = z.infer<typeof bankFormSchema>;

interface BankFormProps {
  bank?: Bank;
  onClose: () => void;
}

export default function BankForm({ bank, onClose }: BankFormProps) {
  const { toast } = useToast();

  const form = useForm<BankFormData>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      bankName: bank?.bankName || "",
      accountHolderName: bank?.accountHolderName || "",
      accountNumber: bank?.accountNumber || "",
      ifscCode: bank?.ifscCode || "",
      branchName: bank?.branchName || "",
      accountType: bank?.accountType || "Current",
      upiId: bank?.upiId || "",
      isDefault: bank?.isDefault || 0,
    },
  });

  const createBankMutation = useMutation({
    mutationFn: async (data: BankFormData) => {
      if (bank) {
        return await apiRequest("PATCH", `/api/banks/${bank.id}`, data);
      } else {
        return await apiRequest("POST", "/api/banks", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banks"] });
      toast({
        title: "Success",
        description: bank ? "Bank updated successfully" : "Bank created successfully",
      });
      form.reset();
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: bank ? "Failed to update bank" : "Failed to create bank",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankFormData) => {
    createBankMutation.mutate(data);
  };

  return (
    <Card className="p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <Input
              id="bankName"
              {...form.register("bankName")}
              placeholder="State Bank of India"
              data-testid="input-bank-name"
            />
            {form.formState.errors.bankName && (
              <p className="text-sm text-destructive">{form.formState.errors.bankName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name *</Label>
            <Input
              id="accountHolderName"
              {...form.register("accountHolderName")}
              placeholder="KINTO Manufacturing"
              data-testid="input-account-holder-name"
            />
            {form.formState.errors.accountHolderName && (
              <p className="text-sm text-destructive">{form.formState.errors.accountHolderName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              {...form.register("accountNumber")}
              placeholder="12345678901234"
              data-testid="input-account-number"
            />
            {form.formState.errors.accountNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.accountNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code *</Label>
            <Input
              id="ifscCode"
              {...form.register("ifscCode")}
              placeholder="SBIN0001234"
              maxLength={11}
              data-testid="input-ifsc-code"
            />
            {form.formState.errors.ifscCode && (
              <p className="text-sm text-destructive">{form.formState.errors.ifscCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchName">Branch Name</Label>
            <Input
              id="branchName"
              {...form.register("branchName")}
              placeholder="Koramangala"
              data-testid="input-branch-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select
              value={form.watch("accountType")}
              onValueChange={(value) => form.setValue("accountType", value)}
            >
              <SelectTrigger data-testid="select-account-type">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Current">Current</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Cash Credit">Cash Credit</SelectItem>
                <SelectItem value="Overdraft">Overdraft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              {...form.register("upiId")}
              placeholder="kinto@sbi"
              data-testid="input-upi-id"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={createBankMutation.isPending} data-testid="button-save-bank">
            {createBankMutation.isPending ? "Saving..." : bank ? "Update Bank" : "Add Bank"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
