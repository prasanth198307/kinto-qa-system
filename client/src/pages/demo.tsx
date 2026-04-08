import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Factory,
  CheckCircle2,
  ArrowLeft,
  Video,
  Users,
  BarChart3,
  MessageCircle,
  Wrench,
  FileText,
  Loader2,
  Play,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Full name is required"),
  company: z.string().min(2, "Company name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const highlights = [
  { icon: Factory, text: "Live walkthrough of production & BOM management" },
  { icon: FileText, text: "GST-compliant invoicing & accounting demo" },
  { icon: BarChart3, text: "MIS dashboards & real-time analytics" },
  { icon: MessageCircle, text: "WhatsApp checklist integration in action" },
  { icon: Wrench, text: "Preventive maintenance scheduling" },
  { icon: Users, text: "Multi-user role-based access control" },
];

export default function DemoPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleDemoLogin() {
    setDemoLoading(true);
    try {
      await apiRequest("POST", "/api/demo-login", {});
      setLocation("/");
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Demo unavailable", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setDemoLoading(false);
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", company: "", email: "", phone: "", city: "", message: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/demo-request", values);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            data-testid="demo-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Factory className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-bold">Kinto Smart Ops</span>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/auth")} data-testid="demo-nav-login">
              Log in
            </Button>
            <Button size="sm" onClick={() => setLocation("/register-company")} data-testid="demo-nav-register">
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3 text-xs gap-1.5 px-3 py-1">
            <Video className="w-3 h-3 text-primary" />
            Product Demo
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">See Kinto Smart Ops in action</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Book a personalised demo with our team. We'll walk you through the platform
            tailored to your manufacturing process — no generic slides.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left — what you'll see */}
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-base mb-4">What we'll cover in your demo</h2>
              <div className="space-y-3">
                {highlights.map((h) => (
                  <div key={h.text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <h.icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground pt-1.5">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold text-sm">Also available</p>
                <div className="space-y-2">
                  {[
                    "30-minute personalised walkthrough",
                    "Free data import from Tally / Excel",
                    "Custom module configuration for your industry",
                    "Training session for your team included",
                    "14-day free trial to follow immediately",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="border rounded-md p-4 bg-primary/5 space-y-3">
              <div className="flex items-start gap-3">
                <Play className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Try the live platform now</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Explore a fully populated demo account — no registration needed.
                    Data is pre-filled with products, vendors, machines and invoices.
                  </p>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                data-testid="demo-page-live-demo-btn"
              >
                {demoLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up demo...</>
                  : <><Play className="w-4 h-4" /> Launch Live Demo</>
                }
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Or start with your own account:</p>
              <Button variant="outline" size="sm" onClick={() => setLocation("/register-company")} data-testid="demo-try-free">
                Start 14-day free trial instead
              </Button>
            </div>
          </div>

          {/* Right — form or success */}
          <div>
            {submitted ? (
              <Card>
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Request received!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Our team will reach out within 1 business day to schedule your demo.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Button onClick={() => setLocation("/register-company")} data-testid="demo-success-register">
                      Start free trial now
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/")} data-testid="demo-success-home">
                      Back to home
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="font-semibold text-sm mb-5">Book your personalised demo</p>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Rajesh Sharma"
                          data-testid="demo-input-name"
                          {...form.register("name")}
                        />
                        {form.formState.errors.name && (
                          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="company" className="text-sm">Company Name *</Label>
                        <Input
                          id="company"
                          placeholder="ABC Industries Pvt. Ltd."
                          data-testid="demo-input-company"
                          {...form.register("company")}
                        />
                        {form.formState.errors.company && (
                          <p className="text-xs text-destructive">{form.formState.errors.company.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Work Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="rajesh@abcindustries.in"
                        data-testid="demo-input-email"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="+91 98765 43210"
                          data-testid="demo-input-phone"
                          {...form.register("phone")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-sm">City / State</Label>
                        <Input
                          id="city"
                          placeholder="Pune, Maharashtra"
                          data-testid="demo-input-city"
                          {...form.register("city")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-sm">
                        What would you like to see?
                        <span className="text-muted-foreground ml-1">(optional)</span>
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="e.g. We make auto components and want to track raw material wastage and GST invoicing..."
                        rows={3}
                        data-testid="demo-input-message"
                        {...form.register("message")}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                      data-testid="demo-submit-btn"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Book My Demo"
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      We'll reach out within 1 business day. No spam, ever.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
