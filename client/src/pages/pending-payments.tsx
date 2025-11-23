import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";

export default function PendingPayments() {
  const [location] = useLocation();
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);

  useEffect(() => {
    // Read customer query parameter from URL
    const params = new URLSearchParams(location.split('?')[1] || '');
    const customer = params.get('customer');
    setCustomerFilter(customer);
  }, [location]);

  return (
    <div className="p-6">
      <div className="mb-6">
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
