import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, BookOpen } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function LibraryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"books" | "issues">("books");
  const [showForm, setShowForm] = useState(false);
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category: "", copies: "1" });
  const [issueForm, setIssueForm] = useState({ book_id: "", student_id: "", issue_date: new Date().toISOString().slice(0,10), due_date: "" });

  const { data: books = [] } = useQuery<any[]>({ queryKey: ["/api/education/library-books"], queryFn: () => api("GET", "/api/education/library-books") });
  const { data: issues = [] } = useQuery<any[]>({ queryKey: ["/api/education/book-issues"], queryFn: () => api("GET", "/api/education/book-issues") });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });

  const createBook = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/library-books", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowForm(false); } });
  const delBook = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/library-books/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/library-books"] }) });
  const issueBook = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/book-issues", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); qc.invalidateQueries({ queryKey: ["/api/education/library-books"] }); setShowForm(false); } });
  const returnBook = useMutation({ mutationFn: (id: number) => api("PUT", `/api/education/book-issues/${id}/return`, { return_date: new Date().toISOString().slice(0,10) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/book-issues"] }); qc.invalidateQueries({ queryKey: ["/api/education/library-books"] }); } });

  const bookArr = Array.isArray(books) ? books : [];
  const issueArr = Array.isArray(issues) ? issues : [];
  const stdArr = Array.isArray(students) ? students : [];
  const activeIssues = issueArr.filter((i: any) => !i.return_date);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />{tab === "books" ? "Add Book" : "Issue Book"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex gap-2 items-center"><BookOpen className="w-6 h-6 text-blue-500" /><div><p className="text-sm text-gray-500">Total Titles</p><p className="text-xl font-bold">{bookArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Books Issued</p><p className="text-xl font-bold text-yellow-600">{activeIssues.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600">{activeIssues.filter((i: any) => new Date(i.due_date) < new Date()).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {(["books","issues"] as const).map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t === "books" ? "Books" : "Issues"}</button>)}
      </div>

      {showForm && tab === "books" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Book</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Title</Label><Input value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Author</Label><Input value={bookForm.author} onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))} /></div>
            <div><Label>ISBN</Label><Input value={bookForm.isbn} onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={bookForm.category} onChange={e => setBookForm(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>No. of Copies</Label><Input type="number" value={bookForm.copies} onChange={e => setBookForm(p => ({ ...p, copies: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createBook.mutate({ ...bookForm, copies: parseInt(bookForm.copies) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "issues" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Issue Book</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Book</Label><Select value={issueForm.book_id} onValueChange={v => setIssueForm(p => ({ ...p, book_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{bookArr.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.title} ({b.available ?? b.copies} avail)</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Student</Label><Select value={issueForm.student_id} onValueChange={v => setIssueForm(p => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{stdArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Due Date</Label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => issueBook.mutate({ ...issueForm, book_id: parseInt(issueForm.book_id), student_id: parseInt(issueForm.student_id) })}>Issue</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "books" && <div className="grid grid-cols-3 gap-3">{bookArr.map((b: any) => <Card key={b.id}><CardContent className="pt-4 flex justify-between items-start"><div><p className="font-semibold">{b.title}</p><p className="text-xs text-gray-500">{b.author} · {b.category}</p><p className="text-xs text-gray-400">{b.available ?? b.copies}/{b.copies} available</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delBook.mutate(b.id)}>Del</Button></CardContent></Card>)}{bookArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-4 text-center">No books yet.</p>}</div>}

      {tab === "issues" && <div className="space-y-2">{issueArr.map((i: any) => (
        <Card key={i.id}><CardContent className="pt-4 flex justify-between items-center">
          <div><p className="font-semibold">{i.book_title ?? `Book #${i.book_id}`}</p><p className="text-sm text-gray-500">{i.student_name ?? `Student #${i.student_id}`} · Due: {i.due_date?.slice(0,10)}</p></div>
          {i.return_date ? <Badge className="bg-green-100 text-green-800">Returned {i.return_date.slice(0,10)}</Badge> : <div className="flex items-center gap-2"><Badge className={new Date(i.due_date) < new Date() ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>{new Date(i.due_date) < new Date() ? "Overdue" : "Issued"}</Badge><Button size="sm" variant="outline" onClick={() => returnBook.mutate(i.id)}>Return</Button></div>}
        </CardContent></Card>
      ))}{issueArr.length === 0 && <p className="text-center text-gray-400 py-8">No book issues yet.</p>}</div>}
    </div>
  );
}
