import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Trash2, FileText, FileImage, Download, Upload } from "lucide-react";

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by_name: string;
  created_at: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (!mime) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

interface Props {
  entityType: string;
  entityId: number | string | undefined | null;
  label?: string;
}

export function InlineAttachments({ entityType, entityId, label = "Attachments" }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const qKey = ["/api/generic/attachments", entityType, entityId];

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: qKey,
    queryFn: () =>
      fetch(`/api/generic/attachments/${entityType}/${entityId}`, { credentials: "include" })
        .then(r => r.json()),
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/generic/attachments/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast({ title: "Attachment removed" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !entityId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/generic/attachments/${entityType}/${entityId}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: qKey });
      toast({ title: "File uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!entityId) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">({attachments.length})</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="button-upload-attachment"
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          {uploading ? "Uploading..." : "Attach File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          data-testid="input-file-attachment"
        />
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-1">Loading...</div>
      ) : attachments.length === 0 ? (
        <div className="text-xs text-muted-foreground py-1">No attachments yet.</div>
      ) : (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              data-testid={`attachment-row-${att.id}`}
            >
              {fileIcon(att.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{att.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(att.file_size)}
                  {att.uploaded_by_name && ` · ${att.uploaded_by_name}`}
                  {att.created_at && ` · ${new Date(att.created_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a href={att.file_path} target="_blank" rel="noopener noreferrer" download={att.file_name}>
                  <Button type="button" size="icon" variant="ghost" data-testid={`button-download-${att.id}`}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(att.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-attachment-${att.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
