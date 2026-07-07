import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, CheckCircle, Smartphone } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Request failed");
    return d;
  });

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const PRESETS = [500, 1000, 2500, 5000];

export default function DonatePublicPage() {
  const [, params] = useRoute("/donate/:slug");
  const slug = params?.slug || "";
  const [form, setForm] = useState({ donor_name: "", donor_email: "", donor_phone: "", amount: "", purpose: "" });
  const [done, setDone] = useState<any>(null);

  const { data: org, isLoading, error } = useQuery<any>({
    queryKey: ["donate-org", slug],
    queryFn: () => api("GET", `/api/ngo/public/donate/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  const donateMut = useMutation({
    mutationFn: () => api("POST", `/api/ngo/public/donate/${slug}`, { ...form, amount: Number(form.amount), payment_mode: "upi" }),
    onSuccess: (d: any) => setDone(d),
  });

  const upiLink = org?.upi_id && form.amount
    ? `upi://pay?pa=${encodeURIComponent(org.upi_id)}&pn=${encodeURIComponent(org.org_name || "NGO")}&am=${Number(form.amount)}&cu=INR&tn=${encodeURIComponent(form.purpose || "Donation")}`
    : null;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (error || !org) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Organization not found</div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">Thank you for your donation!</h2>
            <div className="text-3xl font-bold">{fmt(done.amount)}</div>
            <div className="text-sm text-muted-foreground">Donation No: <span className="font-mono">{done.donation_number}</span></div>
            <div className="text-sm text-muted-foreground">Your 80G receipt will be emailed. Keep this reference:</div>
            <div className="font-mono text-xs bg-muted rounded p-2 break-all">{done.receipt_token}</div>
            {upiLink && (
              <a href={upiLink}>
                <Button className="w-full mt-2"><Smartphone className="w-4 h-4 mr-2" />Pay {fmt(form.amount)} via UPI</Button>
              </a>
            )}
            <p className="text-xs text-muted-foreground">Complete the UPI payment in your app if you haven't already.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <Heart className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h1 className="text-2xl font-bold">{org.org_name}</h1>
            {org.description && <p className="text-sm text-muted-foreground mt-1">{org.description}</p>}
            <p className="text-xs text-muted-foreground mt-2">Donations are eligible for 80G tax deduction</p>
          </div>

          <div>
            <Label className="text-xs">Amount (₹)</Label>
            <div className="grid grid-cols-4 gap-2 my-2">
              {PRESETS.map(a => (
                <Button key={a} type="button" variant={form.amount === String(a) ? "default" : "outline"} size="sm" onClick={() => setForm(p => ({ ...p, amount: String(a) }))}>₹{a}</Button>
              ))}
            </div>
            <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Custom amount" />
          </div>

          <div><Label className="text-xs">Your Name</Label><Input value={form.donor_name} onChange={e => setForm(p => ({ ...p, donor_name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Email</Label><Input type="email" value={form.donor_email} onChange={e => setForm(p => ({ ...p, donor_email: e.target.value }))} /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.donor_phone} onChange={e => setForm(p => ({ ...p, donor_phone: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs">Purpose (optional)</Label><Input value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="e.g. Education, Medical camp" /></div>

          <Button className="w-full" size="lg" disabled={!form.amount || !form.donor_name || donateMut.isPending} onClick={() => donateMut.mutate()}>
            <Heart className="w-4 h-4 mr-2" />{donateMut.isPending ? "Processing..." : `Donate ${form.amount ? fmt(form.amount) : ""}`}
          </Button>
          {!org.upi_id && <p className="text-xs text-center text-muted-foreground">This organization hasn't configured UPI — you'll receive payment instructions by email.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
