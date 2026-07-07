import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, MousePointer, Send, Save, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface SignField {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "signature" | "initials" | "date" | "text";
  label?: string;
}

interface Signatory {
  id: number;
  name: string;
  email: string;
  role: string | null;
  color: string;
  fields: SignField[];
  status: string;
}

interface PageInfo {
  page: number;
  width: number;
  height: number;
  image_url: string;
}

const FIELD_LABELS: Record<string, string> = {
  signature: "✍ Sign here",
  initials: "Initials",
  date: "Date",
  text: "Text",
};

interface PlacementCanvasProps {
  pageImageUrl: string;
  fields: SignField[];
  color: string;
  placementMode: boolean;
  currentPage: number;
  onAddField: (f: Omit<SignField, "id" | "type" | "label"> & { page: number }) => void;
  onRemoveField: (id: string) => void;
}

function PlacementCanvas({ pageImageUrl, fields, color, placementMode, currentPage, onAddField, onRemoveField }: PlacementCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!placementMode) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    setStartPos(pos);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const pos = getRelativePos(e);
    setCurrentRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (drawing && currentRect && currentRect.width > 20 && currentRect.height > 15) {
      onAddField({ ...currentRect, page: currentPage });
    }
    setDrawing(false);
    setCurrentRect(null);
  };

  const pageFields = fields.filter(f => f.page === currentPage);

  return (
    <div
      ref={canvasRef}
      className="relative inline-block select-none"
      style={{ cursor: placementMode ? "crosshair" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDrawing(false); setCurrentRect(null); }}
    >
      <img
        src={pageImageUrl}
        alt={`Page ${currentPage}`}
        style={{ display: "block", maxWidth: "100%", userSelect: "none", pointerEvents: "none" }}
        draggable={false}
      />
      {pageFields.map(f => (
        <div
          key={f.id}
          style={{
            position: "absolute",
            left: f.x,
            top: f.y,
            width: f.width,
            height: f.height,
            background: color + "33",
            border: `2px solid ${color}`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: color,
            fontWeight: 500,
            cursor: "default",
          }}
        >
          <span style={{ pointerEvents: "none" }}>{f.label || FIELD_LABELS[f.type] || "Sign"}</span>
          <button
            onClick={e => { e.stopPropagation(); onRemoveField(f.id); }}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              background: color,
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: 16,
              height: 16,
              fontSize: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >×</button>
        </div>
      ))}
      {currentRect && (
        <div
          style={{
            position: "absolute",
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
            border: "2px dashed #4F46E5",
            background: "rgba(79,70,229,0.1)",
            pointerEvents: "none",
            borderRadius: 4,
          }}
        />
      )}
    </div>
  );
}

export default function PlacementPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeSignatoryId, setActiveSignatoryId] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [fieldType, setFieldType] = useState<SignField["type"]>("signature");
  const [currentPage, setCurrentPage] = useState(1);
  const [localFields, setLocalFields] = useState<Record<number, SignField[]>>({});

  const { data: placementData, isLoading: loadingPlacement } = useQuery({
    queryKey: [`/api/sign/documents/${id}/placement-data`],
    queryFn: () => fetch(`/api/sign/documents/${id}/placement-data`).then(r => r.json()),
    onSuccess: (data: { signatories: Signatory[] }) => {
      const initial: Record<number, SignField[]> = {};
      data.signatories.forEach((s: Signatory) => {
        initial[s.id] = s.fields || [];
      });
      setLocalFields(initial);
      if (data.signatories.length > 0) setActiveSignatoryId(data.signatories[0].id);
    },
  } as any);

  const { data: pagesData, isLoading: loadingPages } = useQuery({
    queryKey: [`/api/sign/documents/${id}/pages`],
    queryFn: () => fetch(`/api/sign/documents/${id}/pages`).then(r => r.json()),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const signatories: Signatory[] = placementData?.signatories || [];
      for (const sig of signatories) {
        const fields = localFields[sig.id] || [];
        await apiRequest("PUT", `/api/sign/documents/${id}/signatories/${sig.id}/fields`, { fields });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/sign/documents/${id}/placement-data`] });
      toast({ title: "Saved", description: "Signature field placements saved." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save", variant: "destructive" }),
  });

  const sendMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sign/documents/${id}/send`),
    onSuccess: () => {
      toast({ title: "Sent!", description: "Signing requests sent to all signatories." });
      navigate(`/swachsign/${id}`);
    },
    onError: () => toast({ title: "Error", description: "Failed to send", variant: "destructive" }),
  });

  const addField = useCallback((partial: Omit<SignField, "id" | "type" | "label"> & { page: number }) => {
    if (!activeSignatoryId) return;
    const newField: SignField = {
      id: crypto.randomUUID(),
      type: fieldType,
      label: FIELD_LABELS[fieldType],
      ...partial,
    };
    setLocalFields(prev => ({
      ...prev,
      [activeSignatoryId]: [...(prev[activeSignatoryId] || []), newField],
    }));
    setPlacementMode(false);
  }, [activeSignatoryId, fieldType]);

  const removeField = useCallback((sigId: number, fieldId: string) => {
    setLocalFields(prev => ({
      ...prev,
      [sigId]: (prev[sigId] || []).filter(f => f.id !== fieldId),
    }));
  }, []);

  if (loadingPlacement || loadingPages) {
    return <div className="p-6 text-muted-foreground">Loading placement editor...</div>;
  }

  const signatories: Signatory[] = placementData?.signatories || [];
  const pages: PageInfo[] = pagesData?.pages || [];
  const currentPageData = pages.find(p => p.page === currentPage) || pages[0];
  const activeSignatory = signatories.find(s => s.id === activeSignatoryId);

  const allHaveFields = signatories.length > 0 && signatories.every(s => (localFields[s.id] || []).length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left sidebar */}
      <div className="w-72 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/swachsign/${id}`)} className="mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <h2 className="font-semibold text-sm">Place Signatures</h2>
          <p className="text-xs text-muted-foreground mt-1">Click a signatory, then draw a box on the page to place their signature field.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signatories</p>
          {signatories.map(sig => {
            const fieldCount = (localFields[sig.id] || []).length;
            const isActive = sig.id === activeSignatoryId;
            return (
              <div
                key={sig.id}
                onClick={() => { setActiveSignatoryId(sig.id); setPlacementMode(false); }}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isActive ? "border-current shadow-sm" : "border-transparent hover:border-gray-200"}`}
                style={{ borderColor: isActive ? sig.color : undefined, background: isActive ? sig.color + "0d" : undefined }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: sig.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sig.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{sig.role || sig.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{fieldCount} field{fieldCount !== 1 ? "s" : ""}</Badge>
                </div>
                {isActive && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      {(["signature", "initials", "date", "text"] as SignField["type"][]).map(t => (
                        <button
                          key={t}
                          onClick={e => { e.stopPropagation(); setFieldType(t); }}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${fieldType === t ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                          style={{ background: fieldType === t ? sig.color : undefined, borderColor: fieldType === t ? sig.color : undefined }}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-white"
                      style={{ background: placementMode ? "#dc2626" : sig.color }}
                      onClick={e => { e.stopPropagation(); setPlacementMode(p => !p); }}
                    >
                      {placementMode ? (
                        <><MousePointer className="w-3 h-3 mr-1" />Cancel</>
                      ) : (
                        <><Plus className="w-3 h-3 mr-1" />Add Field</>
                      )}
                    </Button>
                    {(localFields[sig.id] || []).length > 0 && (
                      <div className="space-y-1">
                        {(localFields[sig.id] || []).map(f => (
                          <div key={f.id} className="flex items-center justify-between text-xs p-1 bg-gray-50 rounded">
                            <span style={{ color: sig.color }}>{FIELD_LABELS[f.type]} (p{f.page})</span>
                            <button onClick={e => { e.stopPropagation(); removeField(sig.id, f.id); }}><Trash2 className="w-3 h-3 text-red-400" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t space-y-2">
          <Button className="w-full" variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="w-4 h-4 mr-2" />{saveMut.isPending ? "Saving..." : "Save Placement"}
          </Button>
          <Button
            className="w-full"
            onClick={() => { saveMut.mutate(); setTimeout(() => sendMut.mutate(), 500); }}
            disabled={!allHaveFields || sendMut.isPending || saveMut.isPending}
            title={!allHaveFields ? "All signatories must have at least 1 field" : ""}
          >
            <Send className="w-4 h-4 mr-2" />{sendMut.isPending ? "Sending..." : "Send for Signing"}
          </Button>
          {!allHaveFields && signatories.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">Add at least 1 field per signatory to send</p>
          )}
        </div>
      </div>

      {/* Center canvas */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2 flex items-center gap-3 shrink-0">
          {placementMode && activeSignatory && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: activeSignatory.color }}>
              <MousePointer className="w-3 h-3" />
              Drawing {fieldType} field for {activeSignatory.name} — drag on the page below
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {pages.length || 1}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= (pages.length || 1)} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document canvas area */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          <div className="shadow-xl rounded overflow-hidden bg-white" style={{ maxWidth: 700, width: "100%" }}>
            {currentPageData ? (
              <>
                {signatories.map(sig => (
                  <div key={sig.id} style={{ display: sig.id === activeSignatoryId ? "block" : "none" }}>
                    <PlacementCanvas
                      pageImageUrl={currentPageData.image_url}
                      fields={localFields[sig.id] || []}
                      color={sig.color}
                      placementMode={placementMode && sig.id === activeSignatoryId}
                      currentPage={currentPage}
                      onAddField={addField}
                      onRemoveField={(fieldId) => removeField(sig.id, fieldId)}
                    />
                  </div>
                ))}
                {!activeSignatoryId && (
                  <img
                    src={currentPageData.image_url}
                    alt={`Page ${currentPage}`}
                    style={{ display: "block", maxWidth: "100%" }}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                No pages available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: field properties */}
      {activeSignatory && (
        <div className="w-56 bg-white border-l p-4 shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Field Type</p>
          <div className="space-y-2">
            {(["signature", "initials", "date", "text"] as SignField["type"][]).map(t => (
              <button
                key={t}
                onClick={() => setFieldType(t)}
                className={`w-full text-left text-sm px-3 py-2 rounded border transition-colors ${fieldType === t ? "text-white font-medium" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                style={{ background: fieldType === t ? activeSignatory.color : undefined, borderColor: fieldType === t ? activeSignatory.color : undefined }}
              >
                {FIELD_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Active Signatory</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: activeSignatory.color }} />
              <span className="text-sm font-medium truncate">{activeSignatory.name}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{(localFields[activeSignatory.id] || []).length} field(s) placed</p>
          </div>
        </div>
      )}
    </div>
  );
}
