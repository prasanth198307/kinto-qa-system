import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";

export default function PendingPayments() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pending Payments</h1>
        <p className="text-muted-foreground mt-2">
          Track outstanding invoice payments and payment history
        </p>
      </div>
      <PendingPaymentsDashboard />
    </div>
  );
}
