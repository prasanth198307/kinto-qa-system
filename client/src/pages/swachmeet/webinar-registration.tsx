import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mic, Calendar, Users, Clock } from "lucide-react";

export default function WebinarRegistration() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", questions: "" });
  const [registered, setRegistered] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: ["/api/public/meet", roomCode],
    queryFn: () => fetch(`/api/public/meet/${roomCode}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    enabled: !!roomCode,
  });

  const registerMut = useMutation({
    mutationFn: () =>
      fetch(`/api/public/meet/${roomCode}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data: any) => {
      if (data.registration) {
        setRegistered(true);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading webinar details...</p>
      </div>
    );
  }

  const r = room as any;

  if (!r || r.message) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8">
            <p className="text-lg font-medium">Webinar not found</p>
            <p className="text-muted-foreground mt-2">This webinar link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">You're Registered!</h2>
            <p className="text-muted-foreground">
              Thank you for registering for <strong>{r.title}</strong>.
              We'll send you the meeting link closer to the date.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-left space-y-1">
              <p><strong>Webinar:</strong> {r.title}</p>
              {r.scheduled_at && <p><strong>Date:</strong> {new Date(r.scheduled_at).toLocaleString()}</p>}
              {r.host_name && <p><strong>Host:</strong> {r.host_name}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const valid = form.name.trim() && form.email.trim() && form.email.includes("@");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Webinar Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Mic className="w-7 h-7 text-purple-600" />
              </div>
              <div className="flex-1">
                <Badge className="bg-purple-100 text-purple-700 mb-2">Webinar</Badge>
                <h1 className="text-2xl font-bold">{r.title}</h1>
                {r.host_name && <p className="text-muted-foreground">Hosted by <strong>{r.host_name}</strong></p>}
                {r.description && <p className="text-muted-foreground mt-2">{r.description}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {r.scheduled_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(r.scheduled_at).toLocaleString()}
                    </span>
                  )}
                  {r.max_participants && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Up to {r.max_participants} attendees
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Register for this Webinar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <Label>Company / Organization</Label>
                <Input
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Your company name"
                />
              </div>
            </div>
            <div>
              <Label>Questions for the Host (optional)</Label>
              <Textarea
                value={form.questions}
                onChange={e => setForm(f => ({ ...f, questions: e.target.value }))}
                placeholder="Any questions you'd like answered during the webinar..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => registerMut.mutate()}
              disabled={!valid || registerMut.isPending}
            >
              {registerMut.isPending ? "Registering..." : "Register Now — It's Free"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll receive the join link via email before the webinar starts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
