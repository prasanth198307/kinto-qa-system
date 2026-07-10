import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, X, Send, ArrowRight } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const GST_RATES = [0, 5, 12, 18, 28];
const EMPTY_FORM = { contact_id: "", title: "", valid_till: "", notes: "" };
const EMPTY_LINE = { description: "", qty: "1", unit_price: "", gst_rate: "18" };

export default function CRMQuotationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  const { data: quotations = [] } = useQuery<any[]>({ queryKey: ["/api/crm/quotations"], queryFn: () => api("GET", "/api/crm/quotations") });
  const { data: selectedItems = [] } = useQuery<any[]>({ queryKey: ["/api/crm/quotations", selectedId, "items"], queryFn: () => selectedId ? api("GET", `/api/crm/quotations/${selectedId}/items`) : Promise.resolve([]), enabled: !!selectedId });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const create = useMutation({
    mutationFn: (b: any) => api("POST", "/api/crm/quotations/create", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/quotations"] }); setShowForm(false); setForm({ ...EMPTY_FORM }); setLines([{ ...EMPTY_LINE }]); },
  });

  const sendQuote = useMutation({
    mutationFn: (id: number) => api("POST", `/api/crm/quotations/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/quotations"] }),
  });

  const convertToInvoice = useMutation({
    mutationFn: (id: number) => api("POST", `/api/crm/quotations/${id}/convert-to-invoice`, {}),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["/api/crm/quotations"] }); alert(`Invoice #${d.invoice_id || d.id} created successfully.`); },
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const lf = (i: number, k: string, v: string) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const quoteArr = Array.isArray(quotations) ? quotations : [];
  const itemsArr = Array.isArray(selectedItems) ? selectedItems : [];
  const contactsArr = Array.isArray(contacts) ? contacts : [];

  const selectedQuote = quoteArr.find((q: any) => q.id === selectedId);

  const lineTotal = (l: typeof EMPTY_LINE) => {
    const base = parseFloat(l.qty || "0") * parseFloat(l.unit_price || "0");
    const gst = base * parseFloat(l.gst_rate || "0") / 100;
    return { base, gst, total: base + gst };
  };

  const grandTotal = lines.reduce((s, l) => { const t = lineTotal(l); return { base: s.base + t.base, gst: s.gst + t.gst, total: s.total + t.total }; }, { base: 0, gst: 0, total: 0 });

  const STATUS_COLOR: Record<string, string> = { draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-800", accepted: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", converted: "bg-purple-100 text-purple-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-blue-600" />Quotations</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Quote</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {["draft", "sent", "accepted", "converted"].map(s => (
          <Card key={s}><CardContent className="pt-3"><p className="text-xs text-gray-500 capitalize">{s}</p><p className="text-2xl font-bold">{quoteArr.filter((q: any) => q.status === s).length}</p></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Quotation</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contact *</Label>
                <Select value={form.contact_id} onValueChange={v => f("contact_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contactsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} placeholder="Proposal for..." /></div>
              <div><Label>Valid Till</Label><Input type="date" value={form.valid_till} onChange={e => f("valid_till", e.target.value)} /></div>
              <div className="col-span-3"><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} placeholder="Terms and conditions..." /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" />Add Row</Button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs">
                    <th className="text-left p-2 border">Description</th>
                    <th className="p-2 border w-16">Qty</th>
                    <th className="p-2 border w-28">Unit Price</th>
                    <th className="p-2 border w-20">GST %</th>
                    <th className="p-2 border w-28">Total</th>
                    <th className="p-2 border w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const t = lineTotal(l);
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-1"><Input value={l.description} onChange={e => lf(i, "description", e.target.value)} className="h-7 text-xs" /></td>
                        <td className="p-1"><Input type="number" value={l.qty} onChange={e => lf(i, "qty", e.target.value)} className="h-7 text-xs text-center" /></td>
                        <td className="p-1"><Input type="number" value={l.unit_price} onChange={e => lf(i, "unit_price", e.target.value)} className="h-7 text-xs" placeholder="0.00" /></td>
                        <td className="p-1">
                          <Select value={l.gst_rate} onValueChange={v => lf(i, "gst_rate", v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-right text-xs">₹{t.total.toFixed(2)}</td>
                        <td className="p-1"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => removeLine(i)}><X className="w-3 h-3" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-end mt-2 text-sm space-x-4">
                <span>Subtotal: ₹{grandTotal.base.toFixed(2)}</span>
                <span>GST: ₹{grandTotal.gst.toFixed(2)}</span>
                <span className="font-bold">Total: ₹{grandTotal.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate({ ...form, contact_id: parseInt(form.contact_id), items: lines.map(l => ({ description: l.description, qty: parseFloat(l.qty), unit_price: parseFloat(l.unit_price || "0"), gst_rate: parseFloat(l.gst_rate) })) })}>Create Quote</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 space-y-2">
          {quoteArr.map((q: any) => (
            <Card key={q.id} className={`cursor-pointer ${selectedId === q.id ? "ring-2 ring-blue-500" : ""}`} onClick={() => setSelectedId(q.id)}>
              <CardContent className="pt-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">#{q.id} · {q.title || "Quotation"}</p>
                    <p className="text-xs text-gray-500">{q.contact_name}</p>
                    <p className="text-xs text-gray-400">₹{Number(q.total_amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <Badge className={STATUS_COLOR[q.status] ?? "bg-gray-100"}>{q.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {quoteArr.length === 0 && <p className="text-gray-400 text-sm py-6 text-center">No quotations.</p>}
        </div>

        <div className="col-span-2">
          {selectedQuote ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">#{selectedQuote.id} — {selectedQuote.title || "Quotation"}</CardTitle>
                <div className="flex gap-2">
                  {selectedQuote.status === "draft" && <Button size="sm" onClick={() => sendQuote.mutate(selectedQuote.id)}><Send className="w-3 h-3 mr-1" />Send</Button>}
                  {["sent", "accepted"].includes(selectedQuote.status) && (
                    <Button size="sm" onClick={() => convertToInvoice.mutate(selectedQuote.id)}>
                      <ArrowRight className="w-3 h-3 mr-1" />Convert to Invoice
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div><span className="text-gray-500">Contact: </span>{selectedQuote.contact_name}</div>
                  <div><span className="text-gray-500">Valid Till: </span>{selectedQuote.valid_till?.slice(0, 10)}</div>
                  <div><span className="text-gray-500">Status: </span><Badge className={STATUS_COLOR[selectedQuote.status]}>{selectedQuote.status}</Badge></div>
                  <div><span className="text-gray-500">Total: </span><strong>₹{Number(selectedQuote.total_amount || 0).toLocaleString("en-IN")}</strong></div>
                  {selectedQuote.notes && <div className="col-span-2"><span className="text-gray-500">Notes: </span>{selectedQuote.notes}</div>}
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="bg-gray-50"><th className="text-left p-2 border">Description</th><th className="p-2 border">Qty</th><th className="p-2 border">Rate</th><th className="p-2 border">GST</th><th className="p-2 border">Total</th></tr></thead>
                  <tbody>
                    {itemsArr.map((item: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.qty}</td>
                        <td className="p-2 text-right">₹{Number(item.unit_price).toLocaleString("en-IN")}</td>
                        <td className="p-2 text-center">{item.gst_rate}%</td>
                        <td className="p-2 text-right">₹{(Number(item.qty) * Number(item.unit_price) * (1 + Number(item.gst_rate) / 100)).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : <div className="flex items-center justify-center h-48 text-gray-400">Select a quotation to view details</div>}
        </div>
      </div>
    </div>
  );
}
