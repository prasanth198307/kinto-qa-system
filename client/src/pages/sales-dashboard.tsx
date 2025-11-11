import SalesDashboard from "@/components/SalesDashboard";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

export default function SalesDashboardPage() {
  const { logoutMutation } = useAuth();

  return (
    <>
      <div className="p-6">
        <SalesDashboard />
      </div>
    </>
  );
}
