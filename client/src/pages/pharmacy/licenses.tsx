import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface License { id: number; license_type: string; license_number: string; issuing_authority: string; validity_from: string; validity_to: string; attached_document_url?: string; }

const blank = { license_type: "Form 20/21", license_number: "", issuing_authority: "", validity_from: "", validity_to: "", attached_document_url: "" };

function daysToExpiry(date: string) {
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function PharmacyLicenses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState({ ...blank });

  const { data: licenses = [], isLoading } = useQuery<License[]>({
    queryKey: ["pharmacy-licenses"],
    queryFn: () => api("GET", "/api/pharmacy/licenses"),
  });

  const saveLicense = useMutation({
    mutationFn: (data: any) =>
      editing ? api("PUT", `/api/pharmacy/licenses/${editing.id}`, data) : api("POST", "/api/pharmacy/licenses", data),
    onSuccess: () => {
      toast({ title: editing ? "License updated" : "License added" });
      qc.invalidateQueries({ queryKey: ["pharmacy-licenses"] });
      setOpen(false); setEditing(null); setForm({ ...blank });
    },
    onError: () => toast({ title: "Failed to save license", variant: "destructive" }),
  });

  const openAdd = () => { setEditing(null); setForm({ ...blank }); setOpen(true); };
  const openEdit = (l: License) => { setEditing(l); setForm({ license_type: l.license_type, license_number: l.license_number, issuing_authority: l.issuing_authority, validity_from: l.validity_from, validity_to: l.validity_to, attached_document_url: l.attached_document_url || "" }); setOpen(true); };
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const licensesArr = Array.isArray(licenses) ? licenses : [];
  const expiringSoon = licensesArr.filter((l) => l.validity_to && daysToExpiry(l.validity_to) <= 60 && daysToExpiry(l.validity_to) > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">License Management</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add License</Button>
      </div>

      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-300 rounded-md">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-800">
            <strong>{expiringSoon.length} license(s)</strong> expiring within 60 days: {expiringSoon.map((l) => l.license_type).join(", ")}. Please initiate renewal.
          </p>
        </div>
      )}

      {isLoading && <p className="text-muted-foreground">Loading licenses...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {licensesArr.map((license) => {
          const days = license.validity_to ? daysToExpiry(license.validity_to) : null;
          const isExpired = days !== null && days < 0;
          const isWarning = days !== null && days >= 0 && days <= 60;
          const isGood = days !== null && days > 60;
          return (
            <Card key={license.id} className={isExpired ? "border-red-400" : isWarning ? "border-orange-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{license.license_type}</CardTitle>
                  <div className="flex items-center gap-2">
                    {days !== null && (
                      <Badge variant={isExpired ? "destructive" : isWarning ? "outline" : "default"} className={isWarning ? "border-orange-400 text-orange-700" : ""}>
                        {isExpired ? `Expired ${Math.abs(days)}d ago` : isGood ? <><CheckCircle className="h-3 w-3 mr-1 inline" />{days}d left</> : <><Clock className="h-3 w-3 mr-1 inline" />{days}d left</>}
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(license)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">License No.</span><span className="font-mono font-medium">{license.license_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Issuing Authority</span><span>{license.issuing_authority}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valid From</span><span>{license.validity_from ? new Date(license.validity_from).toLocaleDateString() : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valid To</span><span className={isExpired ? "text-red-600 font-medium" : isWarning ? "text-orange-600 font-medium" : ""}>{license.validity_to ? new Date(license.validity_to).toLocaleDateString() : "-"}</span></div>
                {license.attached_document_url && <div className="pt-1"><a href={license.attached_document_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">View Document</a></div>}
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && licensesArr.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No licenses added yet</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit License" : "Add License"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>License Type *</Label><Input value={form.license_type} onChange={f("license_type")} placeholder="e.g. Form 20/21" /></div>
            <div className="space-y-1"><Label>License Number *</Label><Input value={form.license_number} onChange={f("license_number")} /></div>
            <div className="space-y-1"><Label>Issuing Authority</Label><Input value={form.issuing_authority} onChange={f("issuing_authority")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Valid From</Label><Input type="date" value={form.validity_from} onChange={f("validity_from")} /></div>
              <div className="space-y-1"><Label>Valid To</Label><Input type="date" value={form.validity_to} onChange={f("validity_to")} /></div>
            </div>
            <div className="space-y-1"><Label>Document URL</Label><Input value={form.attached_document_url} onChange={f("attached_document_url")} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveLicense.mutate(form)} disabled={saveLicense.isPending || !form.license_type || !form.license_number}>
              {saveLicense.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
