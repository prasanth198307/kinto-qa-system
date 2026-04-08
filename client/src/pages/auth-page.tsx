import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Redirect, useLocation } from "wouter";
import { Loader2, Lock, User, Building2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { KintoLogo } from "@/components/branding/KintoLogo";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<{ name: string; slug: string; plan?: string } | null>(null);

  // Load tenant context from sessionStorage (set in company-select.tsx)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("selectedTenant");
      if (stored) setSelectedTenant(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  if (user) return <Redirect to="/" />;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      ...loginData,
      tenantSlug: selectedTenant?.slug,
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: resetEmail, tenantSlug: selectedTenant?.slug });
      toast({
        title: "Password reset link sent",
        description: "Please check your email for the password reset link.",
      });
      setForgotPasswordOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleChangeCompany = () => {
    sessionStorage.removeItem("selectedTenant");
    setSelectedTenant(null);
    setLocation("/company");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <KintoLogo className="justify-center" variant="full" />
          </div>

          {/* Company context banner */}
          {selectedTenant && (
            <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedTenant.name}</span>
                {selectedTenant.plan && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedTenant.plan}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={handleChangeCompany}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-change-company"
              >
                <ArrowLeft className="h-3 w-3" />
                Change
              </button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                {selectedTenant
                  ? `Sign in to ${selectedTenant.name}`
                  : "Enter your credentials to access your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4" data-testid="form-login">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username or Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter your username or email"
                      className="pl-10"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      autoFocus
                      data-testid="input-username-login"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="input-password-login"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-sm" data-testid="button-forgot-password">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        data-testid="input-reset-email"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isResetting}
                      data-testid="button-send-reset"
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {!selectedTenant && (
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4 hover:no-underline"
                    onClick={() => setLocation("/company")}
                  >
                    Select company first
                  </button>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-700 items-center justify-center p-12 text-white">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-6">Complete Manufacturing Operations</h2>
          <p className="text-lg mb-8 text-blue-100">
            Manage your entire manufacturing operations from inventory to quality assurance. Handle
            production, materials, invoicing, gatepasses, and ensure product excellence — all in one system.
          </p>
          <div className="space-y-4">
            {[
              { title: "Operations Management", desc: "Handle production, inventory, purchase orders, invoicing, and gatepasses seamlessly" },
              { title: "Quality Assurance", desc: "Create checklists, track inspections, and manage preventive maintenance tasks" },
              { title: "Comprehensive Reporting", desc: "Generate printable reports for invoices, gatepasses, materials, and quality data" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-md shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-blue-100">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
