import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const BLANK = { enrollment_type: "aadhaar", aadhaar_number: "", mobile: "", name: "", dob: "", gender: "M", otp: "" };
const STATUS_COLOR: Record<string, string> = { GRANTED: "bg-green-100 text-green-800", PENDING: "bg-yellow-100 text-yellow-800", REVOKED: "bg-red-100 text-red-800" };

const MOCK_LINKED = [
  { id: 1, patient_name: "Ravi Kumar", patient_id: "P-001", abha_id: "91-1234-5678-9012", health_id: "ravi.kumar@abdm", linked: true },
  { id: 2, patient_name: "Meena Devi", patient_id: "P-002", abha_id: "91-9876-5432-1098", health_id: "meena.devi@abdm", linked: true },
  { id: 3, patient_name: "Arjun Sharma", patient_id: "P-003", abha_id: null, health_id: null, linked: false },
];

const MOCK_CONSENTS = [
  { id: 1, patient: "Ravi Kumar", requester: "Apollo Diagnostics", purpose: "Lab Results", status: "GRANTED", date: "2026-06-01", expiry: "2026-12-01" },
  { id: 2, patient: "Meena Devi", requester: "City Hospital", purpose: "Discharge Summary", status: "PENDING", date: "2026-06-25", expiry: "2026-07-25" },
  { id: 3, patient: "Arjun Sharma", requester: "MedLab Plus", purpose: "Prescription", status: "REVOKED", date: "2026-05-10", expiry: "2026-11-10" },
];

export default function ABDMPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...BLANK });
  const [otpSent, setOtpSent] = useState(false);
  const [createdAbha, setCreatedAbha] = useState<{ abha_id: string; health_id: string } | null>(null);
  const [linked, setLinked] = useState(MOCK_LINKED);
  const [consents, setConsents] = useState(MOCK_CONSENTS);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const sendOtp = useMutation({
    mutationFn: () => api("POST", "/api/healthcare/abdm/send-otp", { enrollment_type: form.enrollment_type, aadhaar_number: form.aadhaar_number, mobile: form.mobile }),
    onSuccess: () => { setOtpSent(true); toast({ title: "OTP sent successfully" }); },
    onError: () => toast({ title: "Failed to send OTP", variant: "destructive" }),
  });

  const createAbha = useMutation({
    mutationFn: () => api("POST", "/api/healthcare/abdm/create-abha", form),
    onSuccess: (data) => {
      setCreatedAbha(data);
      toast({ title: "ABHA created", description: `ABHA ID: ${data.abha_id}` });
      setForm({ ...BLANK });
      setOtpSent(false);
    },
    onError: () => toast({ title: "ABHA creation failed", variant: "destructive" }),
  });

  const toggleLink = (id: number) => {
    setLinked(prev => prev.map(p => p.id === id ? { ...p, linked: !p.linked } : p));
    toast({ title: "Patient ABHA link updated" });
  };

  const updateConsent = (id: number, status: string) => {
    setConsents(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    toast({ title: `Consent ${status.toLowerCase()}` });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">ABDM / ABHA Registration</h1>
      </div>
      <Tabs defaultValue="creation">
        <TabsList>
          <TabsTrigger value="creation">ABHA Creation</TabsTrigger>
          <TabsTrigger value="linked">Linked Records</TabsTrigger>
          <TabsTrigger value="locker">Health Locker</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
        </TabsList>

        <TabsContent value="creation" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader><CardTitle>Create ABHA Account</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {createdAbha && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-semibold text-green-800">ABHA Created Successfully</p>
                  <p className="text-sm text-green-700">ABHA ID: <strong>{createdAbha.abha_id}</strong></p>
                  <p className="text-sm text-green-700">Health ID: <strong>{createdAbha.health_id}</strong></p>
                </div>
              )}
              <div>
                <Label>Enrollment Type</Label>
                <Select value={form.enrollment_type} onValueChange={v => set("enrollment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhaar">Aadhaar-based</SelectItem>
                    <SelectItem value="mobile">Mobile-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.enrollment_type === "aadhaar" && (
                <div>
                  <Label>Aadhaar Number</Label>
                  <Input placeholder="XXXX XXXX XXXX" value={form.aadhaar_number} onChange={e => set("aadhaar_number", e.target.value)} maxLength={12} />
                </div>
              )}
              <div>
                <Label>Mobile Number</Label>
                <Input placeholder="10-digit mobile" value={form.mobile} onChange={e => set("mobile", e.target.value)} maxLength={10} />
              </div>
              {!otpSent ? (
                <Button onClick={() => sendOtp.mutate()} disabled={sendOtp.isPending}>
                  {sendOtp.isPending ? "Sending..." : "Send OTP"}
                </Button>
              ) : (
                <>
                  <div>
                    <Label>OTP</Label>
                    <Input placeholder="6-digit OTP" value={form.otp} onChange={e => set("otp", e.target.value)} maxLength={6} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={form.name} onChange={e => set("name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => set("gender", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => createAbha.mutate()} disabled={createAbha.isPending} className="w-full">
                    {createAbha.isPending ? "Creating..." : "Create ABHA"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Patient ABHA Links</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead><TableHead>Patient ID</TableHead>
                    <TableHead>ABHA ID</TableHead><TableHead>Health ID</TableHead>
                    <TableHead>Status</TableHead><TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linked.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.patient_name}</TableCell>
                      <TableCell>{p.patient_id}</TableCell>
                      <TableCell>{p.abha_id || "—"}</TableCell>
                      <TableCell>{p.health_id || "—"}</TableCell>
                      <TableCell>
                        <Badge className={p.linked ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {p.linked ? "Linked" : "Not Linked"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant={p.linked ? "outline" : "default"} onClick={() => toggleLink(p.id)}>
                          {p.linked ? "Unlink" : "Link"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locker" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Health Locker</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Health Locker Integration</p>
                <p className="text-sm mt-1">Connect with PHR apps (ABHA app, DigiLocker) to share health records securely.</p>
                <Button className="mt-4">Connect PHR App</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Consent Requests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead><TableHead>Requester</TableHead>
                    <TableHead>Purpose</TableHead><TableHead>Date</TableHead>
                    <TableHead>Expiry</TableHead><TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consents.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.patient}</TableCell>
                      <TableCell>{c.requester}</TableCell>
                      <TableCell>{c.purpose}</TableCell>
                      <TableCell>{c.date}</TableCell>
                      <TableCell>{c.expiry}</TableCell>
                      <TableCell><Badge className={STATUS_COLOR[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        {c.status !== "GRANTED" && (
                          <Button size="sm" onClick={() => updateConsent(c.id, "GRANTED")}>Grant</Button>
                        )}
                        {c.status !== "REVOKED" && (
                          <Button size="sm" variant="outline" onClick={() => updateConsent(c.id, "REVOKED")}>Revoke</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
