import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const apiPost = (u: string, b: any) =>
  fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

function StarRating({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl transition-transform hover:scale-110 focus:outline-none"
          >
            <span className={star <= (hovered || value) ? "text-yellow-400" : "text-gray-200"}>★</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <div className="text-xs text-gray-500">
          {value === 1 ? "Poor" : value === 2 ? "Fair" : value === 3 ? "Good" : value === 4 ? "Very Good" : "Excellent"}
        </div>
      )}
    </div>
  );
}

export default function RestaurantFeedbackPublicPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    food_rating: 0,
    service_rating: 0,
    ambience_rating: 0,
    overall_rating: 0,
    comment: "",
    customer_name: "",
    customer_phone: "",
    table_number: "",
  });

  // Try to get outletId from URL path if available
  const pathParts = window.location.pathname.split("/");
  const outletId = pathParts[pathParts.length - 1] || "1";

  const handleSubmit = async () => {
    if (form.overall_rating === 0) {
      toast({ title: "Please give an overall rating", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await apiPost("/api/restaurant/feedback", {
        ...form,
        tenant_id: 1,
        outlet_id: outletId,
      });
      if (result.success) {
        setSubmitted(true);
      } else {
        toast({ title: result.error || "Failed to submit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🙏</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Thank You!</h1>
          <p className="text-gray-600 mb-2">Your feedback means a lot to us.</p>
          <p className="text-gray-500 text-sm mb-8">We'll use your review to keep improving our food and service.</p>
          <div className="bg-white rounded-2xl p-5 shadow-md border border-orange-100 mb-6">
            <div className="text-2xl mb-2">🎁</div>
            <div className="font-semibold text-gray-700">Special Offer</div>
            <div className="text-sm text-gray-500 mt-1">Show this screen on your next visit for</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">10% OFF</div>
            <div className="text-xs text-gray-400 mt-1">Valid on your next bill</div>
          </div>
          <Button onClick={() => { setSubmitted(false); setForm({ food_rating: 0, service_rating: 0, ambience_rating: 0, overall_rating: 0, comment: "", customer_name: "", customer_phone: "", table_number: "" }); }}
            variant="outline" size="sm">Submit Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">How was your experience?</h1>
          <p className="text-gray-500 text-sm mt-1">Your feedback helps us serve you better</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6 pb-6 space-y-6">

            {/* Table number (optional) */}
            <div>
              <label className="text-sm text-gray-500 block mb-1">Table Number (optional)</label>
              <Input
                placeholder="e.g. T-12"
                value={form.table_number}
                onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Star ratings */}
            <div className="space-y-5">
              <StarRating
                label="🍽️ Food Quality"
                value={form.food_rating}
                onChange={v => setForm(f => ({ ...f, food_rating: v }))}
              />
              <StarRating
                label="👨‍🍳 Service"
                value={form.service_rating}
                onChange={v => setForm(f => ({ ...f, service_rating: v }))}
              />
              <StarRating
                label="🏠 Ambiance"
                value={form.ambience_rating}
                onChange={v => setForm(f => ({ ...f, ambience_rating: v }))}
              />
              <StarRating
                label="⭐ Overall Experience"
                value={form.overall_rating}
                onChange={v => setForm(f => ({ ...f, overall_rating: v }))}
              />
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Comments (optional)</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                rows={3}
                placeholder="Tell us what you loved or how we can improve..."
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              />
            </div>

            {/* Name & phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Your Name</label>
                <Input
                  placeholder="Optional"
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Phone</label>
                <Input
                  placeholder="Optional"
                  value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 text-base"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </Button>

            <p className="text-xs text-center text-gray-400">
              Your feedback is anonymous and helps us improve
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
