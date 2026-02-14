import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Upload, FileText, Download, Trash2, Search, Eye, Plus, Folder, FolderOpen,
  File, FileImage, FileSpreadsheet, AlertCircle, Archive, Clock, AlertTriangle,
  ArrowLeft, ChevronRight, ChevronDown, FolderPlus, Pencil, Move, Home, MoreVertical
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import type { DocumentCategory, Document, PaginationMeta } from "@shared/schema";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getExpiryStatus(expiryDate: string | null | undefined): {
  status: 'expired' | 'urgent' | 'warning' | 'ok' | 'none';
  daysRemaining: number | null;
  label: string;
} {
  if (!expiryDate) return { status: 'none', daysRemaining: null, label: 'No expiry set' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return { status: 'expired', daysRemaining, label: 'Expired' };
  if (daysRemaining <= 7) return { status: 'urgent', daysRemaining, label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` };
  if (daysRemaining <= 30) return { status: 'warning', daysRemaining, label: `${daysRemaining} days left` };
  return { status: 'ok', daysRemaining, label: `${daysRemaining} days left` };
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  documentCount: number;
}

function buildFolderTree(categories: DocumentCategory[], documents: Document[]): FolderNode[] {
  const countByCategory: Record<string, number> = {};
  documents.forEach(doc => {
    const key = doc.categoryId || '__root__';
    countByCategory[key] = (countByCategory[key] || 0) + 1;
  });

  const nodeMap = new Map<string, FolderNode>();
  categories.forEach(cat => {
    nodeMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId || null,
      children: [],
      documentCount: countByCategory[cat.id] || 0,
    });
  });

  const roots: FolderNode[] = [];
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function FolderTreeItem({
  node, depth, currentFolderId, onSelect, onRename, onDelete, onCreateSubfolder, canEdit, canDeletePerm
}: {
  node: FolderNode;
  depth: number;
  currentFolderId: string | null;
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  canEdit: boolean;
  canDeletePerm: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const isActive = currentFolderId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group ${isActive ? 'bg-accent' : 'hover-elevate'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
        data-testid={`folder-item-${node.id}`}
      >
        <button
          className="p-0.5 shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          data-testid={`folder-toggle-${node.id}`}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : <span className="w-3.5" />}
        </button>
        {isActive ? <FolderOpen className="h-4 w-4 text-primary shrink-0" /> : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm truncate flex-1">{node.name}</span>
        {node.documentCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">{node.documentCount}</Badge>
        )}
        {(canEdit || canDeletePerm) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 invisible group-hover:visible"
                onClick={(e) => e.stopPropagation()}
                data-testid={`folder-menu-${node.id}`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => onRename(node.id, node.name)} data-testid={`folder-rename-${node.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateSubfolder(node.id)} data-testid={`folder-add-sub-${node.id}`}>
                    <FolderPlus className="h-3.5 w-3.5 mr-2" /> New Subfolder
                  </DropdownMenuItem>
                </>
              )}
              {canDeletePerm && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node.id)} data-testid={`folder-delete-${node.id}`}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              canEdit={canEdit}
              canDeletePerm={canDeletePerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('documents', 'create');
  const canEdit = hasPermission('documents', 'edit');
  const canDelete = hasPermission('documents', 'delete');

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    title: "", description: "", categoryId: "", documentDate: "", expiryDate: "", tags: "",
  });
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>("__root__");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const folderTree = useMemo(() => buildFolderTree(categories, documents), [categories, documents]);

  const rootDocCount = useMemo(() => documents.filter(d => !d.categoryId).length, [documents]);

  const getBreadcrumb = useMemo(() => {
    if (!currentFolderId) return [];
    const trail: { id: string; name: string }[] = [];
    let current = categories.find(c => c.id === currentFolderId);
    while (current) {
      trail.unshift({ id: current.id, name: current.name });
      current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined;
    }
    return trail;
  }, [currentFolderId, categories]);

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; parentId?: string | null }) => {
      return await apiRequest('POST', '/api/document-categories', {
        name: data.name,
        parentId: data.parentId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      toast({ title: "Success", description: "Folder created" });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      setNewFolderParentId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest('PUT', `/api/document-categories/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      toast({ title: "Success", description: "Folder renamed" });
      setIsRenameFolderOpen(false);
      setRenameFolderId(null);
      setRenameFolderName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/document-categories/${id}`);
      return id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      if (currentFolderId === deletedId) {
        setCurrentFolderId(null);
      }
      toast({ title: "Success", description: "Folder deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const moveDocumentsMutation = useMutation({
    mutationFn: async ({ documentIds, targetCategoryId }: { documentIds: string[]; targetCategoryId: string | null }) => {
      return await apiRequest('PATCH', '/api/documents/move', { documentIds, targetCategoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: "Success", description: `Moved ${selectedDocuments.size} document(s)` });
      setSelectedDocuments(new Set());
      setIsMoveOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents', {
        method: 'POST', body: formData, credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: "Success", description: "Document uploaded successfully" });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadData({ title: "", description: "", categoryId: "", documentDate: "", expiryDate: "", tags: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: "Success", description: "Document deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!uploadFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadData.title || uploadFile.name);
    formData.append('description', uploadData.description);
    const folderToUse = uploadData.categoryId || (currentFolderId || "");
    if (folderToUse) formData.append('categoryId', folderToUse);
    if (uploadData.documentDate) formData.append('documentDate', uploadData.documentDate);
    if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);
    if (uploadData.tags) formData.append('tags', JSON.stringify(uploadData.tags.split(',').map(t => t.trim())));
    uploadMutation.mutate(formData);
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) newSelection.delete(docId);
    else newSelection.add(docId);
    setSelectedDocuments(newSelection);
  };

  const handleBulkDownload = async (downloadAll: boolean = false) => {
    const idsToDownload = downloadAll ? filteredDocuments.map(d => d.id) : Array.from(selectedDocuments);
    if (idsToDownload.length === 0) {
      toast({ title: "Error", description: "No documents to download", variant: "destructive" });
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch('/api/documents/bulk-download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: idsToDownload }), credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Success", description: `Downloaded ${idsToDownload.length} documents as ZIP` });
      setSelectedDocuments(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const inFolder = currentFolderId === null
        ? !doc.categoryId
        : doc.categoryId === currentFolderId;
      if (!inFolder) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return doc.title?.toLowerCase().includes(q) || doc.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [documents, currentFolderId, searchQuery]);

  const childFolders = useMemo(() => {
    return categories.filter(c => {
      if (currentFolderId === null) return !c.parentId;
      return c.parentId === currentFolderId;
    });
  }, [categories, currentFolderId]);

  const totalPages = Math.ceil(filteredDocuments.length / pageSize);
  const paginatedDocuments = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);
  const paginationMeta: PaginationMeta = {
    page, pageSize, totalItems: filteredDocuments.length, totalPages,
    hasNextPage: page < totalPages, hasPreviousPage: page > 1,
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Root';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (fileType.includes('image')) return <FileImage className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenRename = (id: string, name: string) => {
    setRenameFolderId(id);
    setRenameFolderName(name);
    setIsRenameFolderOpen(true);
  };

  const handleDeleteFolder = (id: string) => {
    const docsInFolder = documents.filter(d => d.categoryId === id).length;
    const subfolders = categories.filter(c => c.parentId === id).length;
    if (docsInFolder > 0 || subfolders > 0) {
      toast({
        title: "Cannot delete folder",
        description: `This folder has ${docsInFolder} document(s) and ${subfolders} subfolder(s). Move or delete them first.`,
        variant: "destructive",
      });
      return;
    }
    if (confirm(`Delete folder "${getCategoryName(id)}"?`)) {
      deleteFolderMutation.mutate(id);
      if (currentFolderId === id) setCurrentFolderId(null);
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setIsCreateFolderOpen(true);
  };

  const openUploadInCurrentFolder = () => {
    setUploadData(prev => ({ ...prev, categoryId: currentFolderId || "" }));
    setIsUploadOpen(true);
  };

  if (categoriesLoading || documentsLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/?tab=overview')} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Management</h1>
            <p className="text-muted-foreground text-sm">Store and organize documents in folders</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedDocuments.size > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkDownload(false)} disabled={isDownloading} data-testid="button-bulk-download">
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Downloading...' : `Download ${selectedDocuments.size}`}
              </Button>
              {canEdit && (
                <Button variant="outline" onClick={() => { setMoveTargetFolderId("__root__"); setIsMoveOpen(true); }} data-testid="button-move-documents">
                  <Move className="h-4 w-4 mr-2" /> Move {selectedDocuments.size}
                </Button>
              )}
            </>
          )}
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => { setNewFolderParentId(currentFolderId); setNewFolderName(""); setIsCreateFolderOpen(true); }} data-testid="button-create-folder">
                <FolderPlus className="h-4 w-4 mr-2" /> New Folder
              </Button>
              <Button onClick={openUploadInCurrentFolder} data-testid="button-upload-document">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        <Card className="lg:w-64 shrink-0">
          <CardHeader className="py-3 px-3">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div
              className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer ${currentFolderId === null ? 'bg-accent' : 'hover-elevate'}`}
              onClick={() => { setCurrentFolderId(null); setPage(1); }}
              data-testid="folder-root"
            >
              <Home className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">All Files</span>
              {rootDocCount > 0 && <Badge variant="secondary" className="text-xs h-5 px-1.5">{rootDocCount}</Badge>}
            </div>
            <div className="mt-1">
              {folderTree.map(node => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  currentFolderId={currentFolderId}
                  onSelect={(id) => { setCurrentFolderId(id); setPage(1); setSelectedDocuments(new Set()); }}
                  onRename={handleOpenRename}
                  onDelete={handleDeleteFolder}
                  onCreateSubfolder={handleCreateSubfolder}
                  canEdit={canEdit || canCreate}
                  canDeletePerm={canDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 min-w-0">
          {currentFolderId && (
            <div className="flex items-center gap-1 mb-3 text-sm text-muted-foreground flex-wrap">
              <button className="hover:text-foreground" onClick={() => { setCurrentFolderId(null); setPage(1); }} data-testid="breadcrumb-root">
                Root
              </button>
              {getBreadcrumb.map((item, idx) => (
                <span key={item.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <button
                    className={idx === getBreadcrumb.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground'}
                    onClick={() => { setCurrentFolderId(item.id); setPage(1); }}
                    data-testid={`breadcrumb-${item.id}`}
                  >
                    {item.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents in this folder..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>

          {childFolders.length > 0 && !searchQuery && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
              {childFolders.map(folder => {
                const docCount = documents.filter(d => d.categoryId === folder.id).length;
                return (
                  <div
                    key={folder.id}
                    className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover-elevate group"
                    onClick={() => { setCurrentFolderId(folder.id); setPage(1); setSelectedDocuments(new Set()); }}
                    data-testid={`folder-card-${folder.id}`}
                  >
                    <Folder className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{folder.name}</div>
                      <div className="text-xs text-muted-foreground">{docCount} file{docCount !== 1 ? 's' : ''}</div>
                    </div>
                    {(canEdit || canCreate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 invisible group-hover:visible shrink-0" onClick={e => e.stopPropagation()} data-testid={`folder-card-menu-${folder.id}`}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(canEdit || canCreate) && (
                            <DropdownMenuItem onClick={() => handleOpenRename(folder.id, folder.name)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFolder(folder.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {filteredDocuments.length === 0 && !searchQuery ? (
                <div className="text-center py-12">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">This folder is empty</h3>
                  <p className="text-muted-foreground text-sm mb-4">Upload documents or create subfolders</p>
                  {canCreate && (
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => { setNewFolderParentId(currentFolderId); setNewFolderName(""); setIsCreateFolderOpen(true); }}>
                        <FolderPlus className="h-4 w-4 mr-2" /> New Folder
                      </Button>
                      <Button onClick={openUploadInCurrentFolder}>
                        <Upload className="h-4 w-4 mr-2" /> Upload
                      </Button>
                    </div>
                  )}
                </div>
              ) : filteredDocuments.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No results found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search term</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                            onCheckedChange={() => {
                              if (selectedDocuments.size === filteredDocuments.length) setSelectedDocuments(new Set());
                              else setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)));
                            }}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Doc Date</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDocuments.map(doc => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedDocuments.has(doc.id)}
                              onCheckedChange={() => toggleDocumentSelection(doc.id)}
                              data-testid={`checkbox-select-${doc.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileIcon(doc.fileType)}
                              <div>
                                <div className="font-medium">{doc.title}</div>
                                {doc.description && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.documentDate ? format(new Date(doc.documentDate), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell>
                            {doc.expiryDate ? (() => {
                              const expiryInfo = getExpiryStatus(doc.expiryDate);
                              const statusColors: Record<string, string> = {
                                expired: 'text-destructive', urgent: 'text-orange-600 dark:text-orange-400',
                                warning: 'text-yellow-600 dark:text-yellow-500', ok: 'text-foreground', none: 'text-muted-foreground'
                              };
                              const StatusIcon = expiryInfo.status === 'expired' ? AlertCircle :
                                expiryInfo.status === 'urgent' ? AlertTriangle :
                                  expiryInfo.status === 'warning' ? Clock : null;
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`flex items-center gap-1 ${statusColors[expiryInfo.status]}`}>
                                      {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                                      {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{expiryInfo.label}</p></TooltipContent>
                                </Tooltip>
                              );
                            })() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setPreviewDocument(doc)} data-testid={`button-view-${doc.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/documents/${doc.id}/download`;
                                link.download = doc.fileName || doc.title || 'document';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }} data-testid={`button-download-${doc.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button variant="ghost" size="icon" onClick={() => {
                                  if (confirm('Delete this document?')) deleteMutation.mutate(doc.id);
                                }} data-testid={`button-delete-${doc.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredDocuments.length > 0 && (
                <div className="p-2">
                  <DataTablePagination
                    meta={paginationMeta}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload to: {currentFolderId ? getCategoryName(uploadData.categoryId || currentFolderId) : 'Root'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} data-testid="input-file" />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={uploadData.title} onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))} placeholder="Document title" data-testid="input-title" />
            </div>
            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select value={uploadData.categoryId || currentFolderId || "__root__"} onValueChange={(value) => setUploadData(prev => ({ ...prev, categoryId: value === "__root__" ? "" : value }))}>
                <SelectTrigger data-testid="select-upload-folder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Root (No Folder)</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={uploadData.description} onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" className="resize-none" data-testid="input-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentDate">Document Date</Label>
                <Input id="documentDate" type="date" value={uploadData.documentDate} onChange={(e) => setUploadData(prev => ({ ...prev, documentDate: e.target.value }))} data-testid="input-document-date" />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" value={uploadData.expiryDate} onChange={(e) => setUploadData(prev => ({ ...prev, expiryDate: e.target.value }))} data-testid="input-expiry-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={uploadData.tags} onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))} placeholder="contract, 2024, important" data-testid="input-tags" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending} data-testid="button-submit-upload">
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              {newFolderParentId ? `Inside: ${getCategoryName(newFolderParentId)}` : 'At root level'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) createFolderMutation.mutate({ name: newFolderName.trim(), parentId: newFolderParentId }); }}
                data-testid="input-folder-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createFolderMutation.mutate({ name: newFolderName.trim(), parentId: newFolderParentId })}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              data-testid="button-submit-folder"
            >
              {createFolderMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>Enter a new name for this folder</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="renameFolderName">Folder Name</Label>
              <Input
                id="renameFolderName"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && renameFolderName.trim() && renameFolderId) renameFolderMutation.mutate({ id: renameFolderId, name: renameFolderName.trim() }); }}
                data-testid="input-rename-folder"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameFolderOpen(false)}>Cancel</Button>
            <Button
              onClick={() => renameFolderId && renameFolderMutation.mutate({ id: renameFolderId, name: renameFolderName.trim() })}
              disabled={!renameFolderName.trim() || renameFolderMutation.isPending}
              data-testid="button-submit-rename"
            >
              {renameFolderMutation.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedDocuments.size} Document(s)</DialogTitle>
            <DialogDescription>Select the destination folder</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={moveTargetFolderId} onValueChange={setMoveTargetFolderId}>
              <SelectTrigger data-testid="select-move-target">
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">Root (No Folder)</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => moveDocumentsMutation.mutate({
                documentIds: Array.from(selectedDocuments),
                targetCategoryId: moveTargetFolderId === "__root__" ? null : moveTargetFolderId,
              })}
              disabled={moveDocumentsMutation.isPending}
              data-testid="button-submit-move"
            >
              {moveDocumentsMutation.isPending ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDocument?.title}</DialogTitle>
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Folder:</span>
                  <span className="ml-2 font-medium">{getCategoryName(previewDocument.categoryId)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Document Date:</span>
                  <span className="ml-2 font-medium">
                    {previewDocument.documentDate ? format(new Date(previewDocument.documentDate), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="ml-2 font-medium">{formatFileSize(previewDocument.fileSize)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">File Type:</span>
                  <span className="ml-2 font-medium">{previewDocument.fileType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expiry Date:</span>
                  {previewDocument.expiryDate ? (() => {
                    const expiryInfo = getExpiryStatus(previewDocument.expiryDate);
                    const statusColors: Record<string, string> = {
                      expired: 'text-destructive', urgent: 'text-orange-600 dark:text-orange-400',
                      warning: 'text-yellow-600 dark:text-yellow-500', ok: '', none: 'text-muted-foreground'
                    };
                    return (
                      <span className={`ml-2 font-medium ${statusColors[expiryInfo.status]}`}>
                        {format(new Date(previewDocument.expiryDate), 'dd MMM yyyy')}
                        {expiryInfo.status !== 'ok' && expiryInfo.status !== 'none' && (
                          <span className="ml-1 text-xs">({expiryInfo.label})</span>
                        )}
                      </span>
                    );
                  })() : <span className="ml-2 font-medium">N/A</span>}
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded:</span>
                  <span className="ml-2 font-medium">
                    {previewDocument.createdAt ? format(new Date(previewDocument.createdAt), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </div>
              </div>
              {previewDocument.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1">{previewDocument.description}</p>
                </div>
              )}
              {previewDocument.tags && (
                <div className="flex flex-wrap gap-2">
                  {(previewDocument.tags as string[]).map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/api/documents/${previewDocument.id}/download`;
                  link.download = previewDocument.fileName || previewDocument.title || 'document';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }} data-testid="button-preview-download">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
