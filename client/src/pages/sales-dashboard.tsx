import SalesDashboard from "@/components/SalesDashboard";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

export default function SalesDashboardPage() {
  const { logoutMutation } = useAuth();

  return (
    <>
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="p-6 mt-16">
        <SalesDashboard />
      </div>
    </>
  );
}
