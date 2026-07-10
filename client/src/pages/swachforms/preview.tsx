import { apiFetch } from "@/lib/api-fetch";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Link, Code, CreditCard } from "lucide-react";

interface EmbedSnippet {
  script_tag: string; inline_embed: string; direct_url: string; iframe: string;
}

export default function SwachFormsPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedSnippet, setEmbedSnippet] = useState<EmbedSnippet | null>(null);
  const [embedTab, setEmbedTab] = useState<"script_tag" | "inline_embed" | "direct_url" | "iframe">("script_tag");

  const { data: form, isLoading } = useQuery<any>({
    queryKey: [`/api/forms/${id}`],
    queryFn: async () => apiFetch(`/api/forms/${id}`),
  });

  const schema: any[] = Array.isArray(form?.schema) ? form.schema : [];

  const openEmbed = async () => {
    const r = await fetch(`/api/forms/${id}/embed-snippet`);
    if (r.ok) { setEmbedSnippet(await r.json()); setEmbedTab("script_tag"); setShowEmbed(true); }
    else toast({ title: "Error loading embed code", variant: "destructive" });
  };

  const copyShareLink = async () => {
    if (!embedSnippet) {
      const r = await fetch(`/api/forms/${id}/embed-snippet`);
      if (!r.ok) { toast({ title: "Error", variant: "destructive" }); return; }
      const data = await r.json();
      navigator.clipboard.writeText(data.direct_url).then(() => toast({ title: "Share link copied" }));
    } else {
      navigator.clipboard.writeText(embedSnippet.direct_url).then(() => toast({ title: "Share link copied" }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied to clipboard" }));
  };

  const embedTabKeys: Array<"script_tag" | "inline_embed" | "direct_url" | "iframe"> = ["script_tag", "inline_embed", "direct_url", "iframe"];
  const embedTabLabels: Record<string, string> = { script_tag: "Script Tag", inline_embed: "Inline Embed", direct_url: "Direct URL", iframe: "iFrame" };

  const renderFieldPreview = (field: any) => {
    switch (field.type) {
      case "heading":
        return <h3 className="text-base font-semibold text-gray-700">{field.label}</h3>;
      case "divider":
        return <hr className="border-gray-200" />;
      case "payment":
        return (
          <div className="border border-green-200 rounded-lg p-3 bg-green-50">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800 text-sm">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
            </div>
            <div className="text-green-700 font-semibold">
              {field.currency === "USD" ? "$" : field.currency === "EUR" ? "€" : "₹"}{field.amount}
            </div>
            {field.description && <p className="text-xs text-green-600 mt-1">{field.description}</p>}
            <button className="mt-2 bg-green-600 text-white text-xs px-3 py-1 rounded opacity-70 cursor-not-allowed" disabled>Pay Now</button>
          </div>
        );
      case "textarea":
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <Textarea rows={3} placeholder={field.placeholder || field.label} disabled className="bg-gray-50" />
          </div>
        );
      case "select":
      case "multiselect":
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <select className="border rounded px-2 py-1 text-sm w-full bg-gray-50" disabled>
              <option>Select...</option>
              {(field.options || []).map((o: string, i: number) => <option key={i}>{o}</option>)}
            </select>
          </div>
        );
      case "radio":
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="space-y-1">
              {(field.options || []).map((o: string, i: number) => (
                <label key={i} className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" disabled />{o}</label>
              ))}
            </div>
          </div>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled />
            <span>{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</span>
          </label>
        );
      case "file":
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="border-2 border-dashed rounded p-3 text-center text-sm text-muted-foreground bg-gray-50">Click to upload</div>
          </div>
        );
      case "signature":
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="border rounded h-16 bg-gray-50 flex items-center justify-center text-sm text-muted-foreground">Signature area</div>
          </div>
        );
      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <Input
              type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
              placeholder={field.placeholder || field.label}
              disabled
              className="bg-gray-50"
            />
          </div>
        );
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading form...</div>;
  if (!form) return <div className="p-6 text-muted-foreground">Form not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/swachforms")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <div>
            <h1 className="text-xl font-bold">Preview: {form.name}</h1>
            <p className="text-sm text-muted-foreground">Non-functional preview of how the form will look when embedded</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Link className="w-4 h-4 mr-1" />Share Link
          </Button>
          <Button size="sm" onClick={openEmbed}>
            <Code className="w-4 h-4 mr-1" />Get Embed Code
          </Button>
        </div>
      </div>

      <div className="max-w-xl mx-auto bg-white border rounded-lg p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{form.name}</h2>
          {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
        </div>
        {schema.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="text-sm">No fields added yet. Open the builder to add fields.</p>
          </div>
        ) : (
          schema.map((field: any) => (
            <div key={field.id}>{renderFieldPreview(field)}</div>
          ))
        )}
        {schema.length > 0 && (
          <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-70 cursor-not-allowed" disabled>
            Submit
          </button>
        )}
      </div>

      {/* Embed modal */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Embed This Form</DialogTitle></DialogHeader>
          {embedSnippet && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {embedTabKeys.map(k => (
                  <button key={k} onClick={() => setEmbedTab(k)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${embedTab === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                    {embedTabLabels[k]}
                  </button>
                ))}
              </div>
              <div>
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {embedSnippet[embedTab]}
                </pre>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(embedSnippet[embedTab])}>
                    Copy
                  </Button>
                  {embedTab === "direct_url" && (
                    <Button size="sm" variant="outline" onClick={() => window.open(embedSnippet.direct_url, "_blank")}>
                      Preview in New Tab
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
