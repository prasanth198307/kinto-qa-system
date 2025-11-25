import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Upload, FileText, Download, Trash2, Search, Filter, Eye, Plus, Folder, File, FileImage, FileSpreadsheet, AlertCircle, Archive } from "lucide-react";
import type { DocumentCategory, Document } from "@shared/schema";

export default function DocumentsPage() {
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    categoryId: "",
    documentDate: "",
    expiryDate: "",
    tags: "",
  });
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
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
      toast({ title: "Success", description: "Document deleted successfully" });
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
    if (uploadData.categoryId) formData.append('categoryId', uploadData.categoryId);
    if (uploadData.documentDate) formData.append('documentDate', uploadData.documentDate);
    if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);
    if (uploadData.tags) formData.append('tags', JSON.stringify(uploadData.tags.split(',').map(t => t.trim())));

    uploadMutation.mutate(formData);
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocuments(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(d => d.id)));
    }
  };

  const handleBulkDownload = async (downloadAll: boolean = false) => {
    const idsToDownload = downloadAll 
      ? filteredDocuments.map(d => d.id) 
      : Array.from(selectedDocuments);
    
    if (idsToDownload.length === 0) {
      toast({ title: "Error", description: "No documents to download", variant: "destructive" });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch('/api/documents/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: idsToDownload }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
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

  if (categoriesLoading || documentsLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Document Management</h1>
          <p className="text-muted-foreground text-sm">Store and organize contracts, invoices, certificates</p>
        </div>
        
        <div className="flex gap-2">
          {filteredDocuments.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => handleBulkDownload(true)}
              disabled={isDownloading}
              data-testid="button-download-all"
            >
              <Archive className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download All'}
            </Button>
          )}
          {selectedDocuments.size > 0 && (
            <Button 
              variant="outline" 
              onClick={() => handleBulkDownload(false)}
              disabled={isDownloading}
              data-testid="button-bulk-download"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : `Download ${selectedDocuments.size} Selected`}
            </Button>
          )}
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>Upload a new document to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    data-testid="input-file"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadData.title}
                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={uploadData.categoryId}
                    onValueChange={(value) => setUploadData(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                    className="resize-none"
                    data-testid="input-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="documentDate">Document Date</Label>
                    <Input
                      id="documentDate"
                      type="date"
                      value={uploadData.documentDate}
                      onChange={(e) => setUploadData(prev => ({ ...prev, documentDate: e.target.value }))}
                      data-testid="input-document-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={uploadData.expiryDate}
                      onChange={(e) => setUploadData(prev => ({ ...prev, expiryDate: e.target.value }))}
                      data-testid="input-expiry-date"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="contract, 2024, important"
                    data-testid="input-tags"
                  />
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
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-muted-foreground text-sm">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Doc Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map(doc => (
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
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryName(doc.categoryId)}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.documentDate ? format(new Date(doc.documentDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <span className={new Date(doc.expiryDate) < new Date() ? 'text-destructive' : ''}>
                            {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewDocument(doc)}
                            data-testid={`button-view-${doc.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/api/documents/${doc.id}/download`;
                              link.download = doc.originalName || doc.title || 'document';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            data-testid={`button-download-${doc.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this document?')) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            data-testid={`button-delete-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDocument?.title}</DialogTitle>
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
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
                  <span className="ml-2 font-medium">
                    {previewDocument.expiryDate ? format(new Date(previewDocument.expiryDate), 'dd MMM yyyy') : 'N/A'}
                  </span>
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
                  link.download = previewDocument.originalName || previewDocument.title || 'document';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => setPreviewDocument(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
