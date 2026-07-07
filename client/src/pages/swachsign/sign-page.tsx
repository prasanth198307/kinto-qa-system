import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, FileText, Smartphone, PenTool, Shield } from "lucide-react";
import DrawSignatureTab from "./sign-page-draw";

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [tab, setTab] = useState("draw");
  const [done, setDone] = useState(false);
  const [doneSuccess, setDoneSuccess] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  // Aadhaar OTP state
  const [phone, setPhone] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DSC state
  const [dscCert, setDscCert] = useState<any>(null);
  const [dscLoading, setDscLoading] = useState(false);

  // Draw state
  const [drawLoading, setDrawLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/sign/${token}`],
    queryFn: () => fetch(`/api/public/sign/${token}`).then(r => r.json()),
  });

  useEffect(() => {
    if (data && !data.message) {
      fetch(`/api/public/sign/${token}/view`, { method: "POST" }).catch(() => {});
    }
  }, [data, token]);

  useEffect(() => {
    if (otpTimer > 0) {
      timerRef.current = setInterval(() => setOtpTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [otpTimer]);

  function finish(success: boolean, msg: string) {
    setDone(true);
    setDoneSuccess(success);
    setDoneMsg(msg);
  }

  async function sendOtp() {
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const r = await fetch(`/api/sign/documents/${data?.document?.id}/initiate-esign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer_phone: phone, signer_name: signerName, signer_email: signerEmail, sign_method: "aadhaar_otp" }),
      });
      const d = await r.json();
      if (!r.ok) { setAadhaarError(d.message || "Failed to send OTP"); return; }
      setTxnId(d.txn_id);
      setOtpSent(true);
      setOtpTimer(600);
    } catch {
      setAadhaarError("Network error. Please try again.");
    } finally {
      setAadhaarLoading(false);
    }
  }

  async function verifyOtp() {
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const r = await fetch(`/api/sign/documents/${data?.document?.id}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, signer_phone: phone, txn_id: txnId }),
      });
      const d = await r.json();
      if (!r.ok) { setAadhaarError(d.message || "Invalid OTP"); return; }
      if (d.signed) {
        // Also update the signatory status via public endpoint
        await fetch(`/api/public/sign/${token}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature_data: `AADHAAR-ESIGN:${txnId}`, sign_method: "aadhaar_otp" }),
        });
        finish(true, "Document signed with Aadhaar eSign. Legally valid under IT Act 2000.");
      }
    } catch {
      setAadhaarError("Network error. Please try again.");
    } finally {
      setAadhaarLoading(false);
    }
  }

  async function submitDraw(dataUrl: string) {
    setDrawLoading(true);
    try {
      const r = await fetch(`/api/public/sign/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: dataUrl, sign_method: "draw" }),
      });
      const d = await r.json();
      if (!r.ok) { finish(false, d.message || "Failed to sign"); return; }
      finish(true, "Document signed successfully!");
    } catch {
      finish(false, "Network error. Please try again.");
    } finally {
      setDrawLoading(false);
    }
  }

  async function detectDsc() {
    setDscLoading(true);
    try {
      // Try SignerDigital or eMudhra SafeSign JS SDK
      const win = window as any;
      if (win.SignerDigital?.getCertificates) {
        const certs = await win.SignerDigital.getCertificates();
        if (certs?.length) { setDscCert(certs[0]); }
        else { setAadhaarError("No DSC found. Please insert your USB token."); }
      } else {
        setAadhaarError("No DSC plugin detected. Please install eMudhra SafeSign or SignerDigital browser extension.");
      }
    } catch {
      setAadhaarError("Could not detect DSC. Please ensure your USB token is connected and the browser extension is installed.");
    } finally {
      setDscLoading(false);
    }
  }

  async function signWithDsc() {
    if (!dscCert || !data?.document?.id) return;
    setDscLoading(true);
    try {
      const hashR = await fetch(`/api/sign/documents/${data.document.id}/hash`);
      const { sha256 } = await hashR.json();
      const win = window as any;
      const pkcs7 = await win.SignerDigital.signHash(sha256, dscCert.id);
      const r = await fetch(`/api/sign/documents/${data.document.id}/submit-dsc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pkcs7_signed_data: pkcs7, certificate_info: dscCert }),
      });
      const d = await r.json();
      if (!r.ok) { setAadhaarError(d.message || "DSC signing failed"); return; }
      finish(true, "Document signed with DSC. Legally valid under IT Act 2000.");
    } catch {
      setAadhaarError("DSC signing failed. Please try again.");
    } finally {
      setDscLoading(false);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading document...</p></div>;
  if (error || !data || data.message) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{data?.message || "Invalid or expired signing link."}</p></div>;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center space-y-4">
            {doneSuccess ? <CheckCircle className="w-16 h-16 text-green-500 mx-auto" /> : <XCircle className="w-16 h-16 text-red-400 mx-auto" />}
            <h2 className="text-xl font-semibold">{doneSuccess ? "Signed!" : "Error"}</h2>
            <p className="text-muted-foreground">{doneMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { document: doc, signatory: sig } = data;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle>{doc.title}</CardTitle>
                <p className="text-sm text-muted-foreground capitalize">{doc.document_type?.replace(/_/g, " ")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {doc.description && <p className="text-sm text-gray-700">{doc.description}</p>}
            {doc.message_to_signatories && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <strong>Message:</strong> {doc.message_to_signatories}
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Signing as: </span>
              <strong>{sig.name}</strong>
              {sig.role && <span className="text-muted-foreground"> ({sig.role})</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Choose Signing Method</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full grid grid-cols-3 mb-6">
                <TabsTrigger value="draw"><PenTool className="w-4 h-4 mr-1" />Draw</TabsTrigger>
                <TabsTrigger value="aadhaar"><Smartphone className="w-4 h-4 mr-1" />Aadhaar OTP</TabsTrigger>
                <TabsTrigger value="dsc"><Shield className="w-4 h-4 mr-1" />DSC</TabsTrigger>
              </TabsList>

              <TabsContent value="draw">
                <DrawSignatureTab
                  signerName={signerName}
                  onSignerNameChange={setSignerName}
                  onSubmit={submitDraw}
                  loading={drawLoading}
                />
              </TabsContent>

              <TabsContent value="aadhaar" className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                      Enter your phone number to receive an OTP. Aadhaar eSign is legally valid under IT Act 2000 and Aadhaar Act 2016.
                    </div>
                    <div><Label>Full Name</Label><Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Your full name" className="mt-1" /></div>
                    <div><Label>Email (optional)</Label><Input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="your@email.com" className="mt-1" /></div>
                    <div><Label>Mobile Number</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={10} className="mt-1" /></div>
                    {aadhaarError && <p className="text-sm text-red-600">{aadhaarError}</p>}
                    <Button className="w-full" onClick={sendOtp} disabled={!phone || phone.length < 10 || !signerName.trim() || aadhaarLoading}>
                      {aadhaarLoading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                      OTP sent to {phone.slice(-4).padStart(phone.length, "*")}
                      {otpTimer > 0 && <span className="ml-2 font-mono">({fmt(otpTimer)} remaining)</span>}
                    </div>
                    <div>
                      <Label>Enter 6-digit OTP</Label>
                      <Input
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit OTP"
                        maxLength={6}
                        className="mt-1 text-center text-xl tracking-widest font-mono"
                      />
                    </div>
                    {aadhaarError && <p className="text-sm text-red-600">{aadhaarError}</p>}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setOtpSent(false); setOtp(""); setAadhaarError(""); }}>
                        Back
                      </Button>
                      <Button className="flex-1" onClick={verifyOtp} disabled={otp.length !== 6 || aadhaarLoading}>
                        {aadhaarLoading ? "Verifying..." : "Verify & Sign"}
                      </Button>
                    </div>
                    {otpTimer === 0 && (
                      <Button variant="ghost" className="w-full text-sm" onClick={() => { setOtpSent(false); setOtp(""); }}>
                        Resend OTP
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="dsc" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  DSC (Digital Signature Certificate) signing happens via your USB token and browser extension. This requires eMudhra SafeSign or SignerDigital extension.
                </div>
                {!dscCert ? (
                  <>
                    <Button className="w-full" onClick={detectDsc} disabled={dscLoading}>
                      {dscLoading ? "Detecting..." : "Detect DSC Token"}
                    </Button>
                    {aadhaarError && (
                      <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700 space-y-2">
                        <p>{aadhaarError}</p>
                        <p>
                          Install:{" "}
                          <a href="https://signerdigital.com/download" target="_blank" rel="noreferrer" className="text-blue-600 underline">SignerDigital</a>
                          {" "}or{" "}
                          <a href="https://www.emudhra.com/safesign" target="_blank" rel="noreferrer" className="text-blue-600 underline">eMudhra SafeSign</a>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="border rounded p-3 text-sm space-y-1">
                      <p><strong>Certificate Detected</strong></p>
                      <p className="text-muted-foreground">Subject: {dscCert.subject || "N/A"}</p>
                      <p className="text-muted-foreground">Issuer: {dscCert.issuer || "N/A"}</p>
                      {dscCert.valid_to && <p className="text-muted-foreground">Valid until: {new Date(dscCert.valid_to).toLocaleDateString()}</p>}
                    </div>
                    <Button className="w-full" onClick={signWithDsc} disabled={dscLoading}>
                      {dscLoading ? "Signing with DSC..." : "Sign with DSC"}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => { setDscCert(null); setAadhaarError(""); }}>
                      Use Different Certificate
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
