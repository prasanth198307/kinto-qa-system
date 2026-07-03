/**
 * PDFPreviewButton — open a PDF from the pdf-service in a new tab.
 * Works for both:
 *   a) Quick preview via POST /api/pdf/generate with template+data
 *   b) Resource-specific URLs like GET /api/pdf/salary-slip/:id
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFPreviewButtonProps {
  /** Named template (used with `data`) */
  template?: string;
  /** Data payload when using `template` */
  data?: Record<string, any>;
  /** Direct GET URL (overrides template+data) */
  url?: string;
  /** Button label */
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function PDFPreviewButton({
  template,
  data,
  url,
  label = "PDF",
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
}: PDFPreviewButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      if (url) {
        window.open(url, "_blank");
        return;
      }
      if (!template) throw new Error("No template or URL provided");

      const resp = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, data }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `PDF generation failed (${resp.status})`);
      }

      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const win = window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      if (!win) {
        toast({ title: "Popup blocked", description: "Please allow popups to view PDF.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "PDF Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
      {label}
    </Button>
  );
}

export default PDFPreviewButton;
