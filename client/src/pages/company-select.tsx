import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { KintoLogo } from "@/components/branding/KintoLogo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CompanySelectPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const tenant = await apiRequest("GET", `/api/tenants/lookup/${encodeURIComponent(trimmed)}`);
      // Store selected tenant in sessionStorage for the login page
      sessionStorage.setItem("selectedTenant", JSON.stringify(tenant));
      setLocation(`/auth?tenant=${encodeURIComponent(trimmed)}`);
    } catch (err: any) {
      const msg = err?.message || "Company not found";
      toast({
        title: "Company not found",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <KintoLogo className="justify-center" variant="full" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome to SwachERP</CardTitle>
              <CardDescription>
                Enter your company's unique ID to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-company-select">
                <div className="space-y-2">
                  <Label htmlFor="company-slug">Company ID</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-slug"
                      data-testid="input-company-slug"
                      type="text"
                      placeholder="e.g. acme-manufacturing"
                      className="pl-10"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      autoFocus
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the unique ID for your company's account.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !slug.trim()}
                  data-testid="button-continue"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up company...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-4 hover:no-underline"
                onClick={() => setLocation("/register-company")}
                data-testid="link-register-company"
              >
                Register your company
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="max-w-md text-center space-y-6">
          <Building2 className="mx-auto h-16 w-16 opacity-80" />
          <h2 className="text-3xl font-bold">
            One Platform. Every Operation.
          </h2>
          <p className="text-lg opacity-80 leading-relaxed">
            SwachERP brings together production, inventory, quality, finance, and compliance in one unified system built for Indian manufacturers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm opacity-70 mt-8">
            <div className="bg-primary-foreground/10 rounded-md p-3">GST-compliant invoicing</div>
            <div className="bg-primary-foreground/10 rounded-md p-3">BOM-driven production</div>
            <div className="bg-primary-foreground/10 rounded-md p-3">FIFO batch allocation</div>
            <div className="bg-primary-foreground/10 rounded-md p-3">Double-entry accounting</div>
          </div>
        </div>
      </div>
    </div>
  );
}
