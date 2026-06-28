import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function EducationLibraryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"books"|"issues">("books");
  const [showForm, setShowForm] = useState(false);
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", publisher: "", category: "", total_copies: "" });
  const [issueForm, setIssueForm] = useState({ student_id: "", book_id: "", due_date: "" });

  const { data: books = [] } = useQuery({ queryKey: ["/api/education/library/books"], queryFn: () => api("GET", "/api/education/library/books") });
  const { data: issues = [] } = useQuery({ queryKey: ["/api/education/library/issues"], queryFn: () => api("GET", "/api/education/library/issues") });

  const addBook = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/library/books", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/library/books"] }); setShowForm(false); toast({ title: "Book added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const issueBook = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/library/issue", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/library/issues"] }); setShowForm(false); toast({ title: "Book issued" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Library</h1>
        <div className="flex gap-2">
          <Button variant={tab === "books" ? "default" : "outline"} onClick={() => setTab("books")}>Books</Button>
          <Button variant={tab === "issues" ? "default" : "outline"} onClick={() => setTab("issues")}>Issues</Button>
          <Button onClick={() => setShowForm(!showForm)}>+ {tab === "books" ? "Add Book" : "Issue Book"}</Button>
        </div>
      </div>

      {tab === "books" && showForm && (
        <Card>
          <CardHeader><CardTitle>Add Book</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["title","author","isbn","publisher","category","total_copies"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "total_copies" ? "number" : "text"} value={(bookForm as any)[k]} onChange={e => setBookForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addBook.mutate(bookForm)} disabled={addBook.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "issues" && showForm && (
        <Card>
          <CardHeader><CardTitle>Issue Book</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Student ID</label><Input value={issueForm.student_id} onChange={e => setIssueForm(p => ({...p, student_id: e.target.value}))} /></div>
              <div><label className="text-sm font-medium">Book ID</label><Input value={issueForm.book_id} onChange={e => setIssueForm(p => ({...p, book_id: e.target.value}))} /></div>
              <div><label className="text-sm font-medium">Due Date</label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm(p => ({...p, due_date: e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => issueBook.mutate(issueForm)} disabled={issueBook.isPending}>Issue</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "books" && (
        <Card>
          <CardHeader><CardTitle>Books ({books.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>ISBN</TableHead><TableHead>Category</TableHead><TableHead>Total</TableHead><TableHead>Available</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {books.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.title}</TableCell><TableCell>{b.author}</TableCell><TableCell>{b.isbn}</TableCell>
                    <TableCell>{b.category}</TableCell><TableCell>{b.total_copies}</TableCell>
                    <TableCell><Badge variant={b.available > 0 ? "default" : "destructive"}>{b.available}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "issues" && (
        <Card>
          <CardHeader><CardTitle>Book Issues</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Returned</TableHead><TableHead>Fine</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.student_name}</TableCell><TableCell>{i.book_title}</TableCell>
                    <TableCell>{i.issue_date}</TableCell><TableCell>{i.due_date}</TableCell>
                    <TableCell>{i.return_date || "—"}</TableCell>
                    <TableCell className="text-red-600">{i.fine ? `₹${fmt(i.fine)}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
