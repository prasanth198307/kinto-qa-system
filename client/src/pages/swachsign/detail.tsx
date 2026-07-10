import { apiFetch } from "@/lib/api-fetch";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Send, Download, Plus, Trash2, UserCheck, Layout, Bell, Shield } from "lucide-react";

const SIG_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-600",
};

export default function SwachSignDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addSigOpen, setAddSigOpen] = useState(false);
  const [sigForm, setSigForm] = useState({ name: "", email: "", phone: "", role: "", sign_method: "draw", signatory_order: 1 });

  // Aadhaar eSign state
  const [aadhaarModal, setAadhaarModal] = useState<{ signatory: any } | null>(null);
  const [aadhaarStep, setAadhaarStep] = useState<"input" | "otp" | "done">("input");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [mobileLast4, setMobileLast4] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [txnId, setTxnId] = useState("");
  const [aadhaarMsg, setAadhaarMsg] = useState("");

  // Blockchain & audit state
  const [blockchain, setBlockchain] = useState<any>(null);
  const [auditChain, setAuditChain] = useState<any>(null);

  useEffect(() => {
    if (!docId) return;
    apiFetch(`/api/sign/documents/${docId}/blockchain`).then(setBlockchain).catch(() => {});
    apiFetch(`/api/sign/documents/${docId}/audit-trail-hash`).then(setAuditChain).catch(() => {});
  }, [docId]);

  const initiateAadhaar = async () => {
    const resp = await fetch(`/api/sign/documents/${docId}/aadhaar-esign/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatory_id: aadhaarModal?.signatory?.id, aadhaar_last4: aadhaarLast4, mobile_last4: mobileLast4 }),
    });
    const data = await resp.json();
    if (data.txn_id) { setTxnId(data.txn_id); setAadhaarMsg(data.message); setAadhaarStep("otp"); }
    else { setAadhaarMsg(data.message || "Failed to initiate"); }
  };

  const verifyOTP = async () => {
    const resp = await fetch(`/api/sign/documents/${docId}/aadhaar-esign/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatory_id: aadhaarModal?.signatory?.id, txn_id: txnId, otp: otpValue }),
    });
    const data = await resp.json();
    if (data.verified) { setAadhaarStep("done"); qc.invalidateQueries({ queryKey: [`/api/sign/documents/${id}`] }); }
    else { setAadhaarMsg(data.message || "Invalid OTP"); }
  };

  const { data, isLoading } = useQuery({
    queryKey: [`/api/sign/documents/${id}`],
    queryFn: () => apiFetch(`/api/sign/documents/${id}`),
  });

  const sendMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sign/documents/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/sign/documents/${id}`] }); toast({ title: "Sent!", description: "Signing requests sent." }); },
    onError: () => toast({ title: "Error", description: "Failed to send", variant: "destructive" }),
  });

  const reminderMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sign/documents/${id}/send-reminder`),
    onSuccess: async (res) => {
      const d = await res.json();
      toast({ title: "Reminder Sent", description: d.message });
    },
    onError: () => toast({ title: "Error", description: "Failed to send reminder", variant: "destructive" }),
  });

  const addSigMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/sign/documents/${id}/signatories`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/sign/documents/${id}`] }); setAddSigOpen(false); setSigForm({ name: "", email: "", phone: "", role: "", sign_method: "draw", signatory_order: 1 }); },
    onError: () => toast({ title: "Error", description: "Failed to add signatory", variant: "destructive" }),
  });

  const removeSigMut = useMutation({
    mutationFn: (sigId: number) => apiRequest("DELETE", `/api/sign/documents/${id}/signatories/${sigId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/sign/documents/${id}`] }),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!data || data.message === "Not found") return <div className="p-6">Document not found.</div>;

  const doc = data;
  const signatories: any[] = doc.signatories || [];
  const auditTrail: any[] = doc.audit_trail || [];
  const canSend = doc.status === "draft" && signatories.length > 0;
  const isCompleted = doc.status === "completed";
  const hasPending = signatories.some(s => !["signed", "declined"].includes(s.status));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/swachsign")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">{doc.doc_no} · {doc.document_type?.replace(/_/g, " ")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isCompleted && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/api/sign/documents/${id}/download-signed`, "_blank")}>
              <Download className="w-4 h-4 mr-2" />Download Signed PDF
            </Button>
          )}
          {hasPending && doc.status !== "draft" && (
            <Button variant="outline" size="sm" onClick={() => reminderMut.mutate()} disabled={reminderMut.isPending}>
              <Bell className="w-4 h-4 mr-2" />{reminderMut.isPending ? "Sending..." : "Send Reminder"}
            </Button>
          )}
          {doc.status === "draft" && signatories.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/swachsign/${id}/placement`)}>
              <Layout className="w-4 h-4 mr-2" />Place Signatures
            </Button>
          )}
          {canSend && (
            <Button size="sm" onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
              <Send className="w-4 h-4 mr-2" />{sendMut.isPending ? "Sending..." : "Send for Signing"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className={`capitalize ${isCompleted ? "bg-green-100 text-green-700" : doc.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
              {doc.status?.replace(/_/g, " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Signatories</p>
            <p className="font-semibold">{signatories.filter(s => s.status === "signed").length} / {signatories.length} signed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Expiry Date</p>
            <p className="font-semibold">{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {doc.message_to_signatories && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Message to Signatories</p>
            <p className="text-sm">{doc.message_to_signatories}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="signatories">
        <TabsList>
          <TabsTrigger value="signatories">Signatories</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
        </TabsList>

        <TabsContent value="signatories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Signatories</CardTitle>
              {doc.status === "draft" && (
                <Dialog open={addSigOpen} onOpenChange={setAddSigOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Signatory</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Name *</Label><Input value={sigForm.name} onChange={e => setSigForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><Label>Email *</Label><Input type="email" value={sigForm.email} onChange={e => setSigForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div><Label>Phone</Label><Input value={sigForm.phone} onChange={e => setSigForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div><Label>Role</Label><Input value={sigForm.role} placeholder="Buyer, Seller, Witness..." onChange={e => setSigForm(f => ({ ...f, role: e.target.value }))} /></div>
                      <div>
                        <Label>Signing Method</Label>
                        <Select value={sigForm.sign_method} onValueChange={v => setSigForm(f => ({ ...f, sign_method: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draw">Draw Signature</SelectItem>
                            <SelectItem value="type">Type Name</SelectItem>
                            <SelectItem value="aadhaar_otp">Aadhaar OTP</SelectItem>
                            <SelectItem value="dsc">DSC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Order</Label><Input type="number" value={sigForm.signatory_order} onChange={e => setSigForm(f => ({ ...f, signatory_order: parseInt(e.target.value) || 1 }))} min={1} /></div>
                      <Button className="w-full" onClick={() => addSigMut.mutate(sigForm)} disabled={!sigForm.name || !sigForm.email || addSigMut.isPending}>
                        {addSigMut.isPending ? "Adding..." : "Add Signatory"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {signatories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No signatories added yet.</p>
              ) : signatories.map((sig: any) => (
                <div key={sig.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-8 h-8 text-muted-foreground p-1.5 bg-muted rounded-full" />
                    <div>
                      <p className="font-medium text-sm">{sig.name}</p>
                      <p className="text-xs text-muted-foreground">{sig.email} {sig.role ? `· ${sig.role}` : ""}</p>
                      {sig.signed_at && <p className="text-xs text-green-600">Signed {new Date(sig.signed_at).toLocaleString()}</p>}
                      {sig.declined_reason && <p className="text-xs text-red-600">Declined: {sig.declined_reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${SIG_STATUS_COLORS[sig.status] || "bg-gray-100 text-gray-600"}`}>{sig.status}</Badge>
                    {sig.status !== "signed" && (
                      <button
                        onClick={() => { setAadhaarModal({ signatory: sig }); setAadhaarStep("input"); setAadhaarLast4(""); setMobileLast4(""); setOtpValue(""); setAadhaarMsg(""); }}
                        style={{ fontSize: 11, padding: "3px 8px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                      >
                        Aadhaar eSign
                      </button>
                    )}
                    {doc.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => removeSigMut.mutate(sig.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Audit Trail</CardTitle>
                {auditChain && (
                  <span className="text-xs font-mono text-muted-foreground">
                    Tip: {auditChain.chain_tip_hash?.substring(0, 12)}...
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(auditChain?.entries || auditTrail).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No audit entries yet.</p>
              ) : (auditChain?.entries || auditTrail).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-start gap-3 text-sm p-3 border rounded">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium capitalize">{a.action?.replace(/_/g, " ")}</span>
                    {a.actor_name && <span className="text-muted-foreground"> by {a.actor_name}</span>}
                    {a.actor_email && <span className="text-muted-foreground"> ({a.actor_email})</span>}
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                    {a.entry_hash && (
                      <div className="text-xs font-mono text-gray-400 mt-0.5 truncate">hash: {a.entry_hash?.substring(0, 16)}...</div>
                    )}
                  </div>
                  <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" title="Tamper-evident entry" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blockchain" className="mt-4">
          {blockchain ? (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
              <div className="flex items-center gap-2">
                <span>⛓️</span>
                <strong>Blockchain Audit Trail</strong>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${blockchain.chain_valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {blockchain.chain_valid ? "✓ VERIFIED" : "✗ COMPROMISED"}
                </span>
                <span className="text-xs text-muted-foreground">{blockchain.total_blocks} blocks</span>
              </div>
              <div className="space-y-2">
                {(blockchain.blocks || []).map((block: any) => (
                  <div key={block.id} className="flex items-start gap-3 text-xs p-2 bg-white rounded border border-green-100">
                    <span className={`font-bold shrink-0 ${block.valid ? "text-green-600" : "text-red-600"}`}>#{block.block_index}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{String(block.block_data?.action || "").replace(/_/g, " ")}</span>
                      {block.block_data?.actor_name && <span className="text-muted-foreground"> · {block.block_data.actor_name}</span>}
                      <div className="text-gray-400 mt-0.5">{new Date(block.created_at).toLocaleString("en-IN")}</div>
                    </div>
                    <span className="font-mono text-gray-400 shrink-0">{block.block_hash?.substring(0, 8)}...{block.block_hash?.substring(56)}</span>
                    <span>{block.valid ? "✓" : "✗"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading blockchain data...</div>
          )}
        </TabsContent>
      </Tabs>

      {aadhaarModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 380, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 16px" }}>Aadhaar eSign — {aadhaarModal.signatory.name}</h3>
            {aadhaarStep === "input" && (
              <>
                <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 16 }}>
                  ⚠️ We only collect the last 4 digits of your Aadhaar. Your full Aadhaar number is never stored.
                </div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Last 4 digits of Aadhaar</label>
                <input maxLength={4} value={aadhaarLast4} onChange={e => setAadhaarLast4(e.target.value.replace(/\D/g, ""))} placeholder="XXXX" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", marginBottom: 12, boxSizing: "border-box" }} />
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Last 4 digits of registered mobile</label>
                <input maxLength={4} value={mobileLast4} onChange={e => setMobileLast4(e.target.value.replace(/\D/g, ""))} placeholder="XXXX" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", marginBottom: 16, boxSizing: "border-box" }} />
                {aadhaarMsg && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{aadhaarMsg}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAadhaarModal(null)} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Cancel</button>
                  <button onClick={initiateAadhaar} disabled={aadhaarLast4.length !== 4 || mobileLast4.length !== 4} style={{ flex: 1, padding: "8px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Send OTP</button>
                </div>
              </>
            )}
            {aadhaarStep === "otp" && (
              <>
                <div style={{ fontSize: 13, marginBottom: 12, color: "#059669" }}>{aadhaarMsg}</div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Enter OTP</label>
                <input maxLength={6} value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g, ""))} placeholder="6-digit OTP" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", marginBottom: 8, fontSize: 18, letterSpacing: 4, boxSizing: "border-box" }} />
                {aadhaarMsg.includes("Invalid") && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{aadhaarMsg}</div>}
                <button onClick={verifyOTP} disabled={otpValue.length !== 6} style={{ width: "100%", padding: "10px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Verify & Sign</button>
              </>
            )}
            {aadhaarStep === "done" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Aadhaar eSign Verified!</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Legally valid under IT Act 2000 &amp; Aadhaar Act 2016</div>
                <button onClick={() => { setAadhaarModal(null); setAadhaarStep("input"); window.location.reload(); }} style={{ padding: "8px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
