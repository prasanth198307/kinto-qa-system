import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";

export default function PendingPayments() {
  const search = useSearch();
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  useEffect(() => {
    // Read customer query parameter from URL
    const params = new URLSearchParams(search);
    const customer = params.get('customer');
    setCustomerFilter(customer);
  }, [search]);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Pending Payments</h1>
        <p className="text-muted-foreground mt-2">
          {customerFilter 
            ? `Outstanding payments for ${customerFilter}`
            : 'Track outstanding invoice payments and payment history'
          }
        </p>
      </div>
      <PendingPaymentsDashboard customerFilter={customerFilter} />
    </div>
  );
}
