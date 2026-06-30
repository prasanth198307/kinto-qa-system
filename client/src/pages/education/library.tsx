import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const BOOK_EMPTY = { accession_number: "", title: "", author: "", category: "", copies_total: "" };
const ISSUE_EMPTY = { book_id: "", student_id: "", due_date: "" };

export default function LibraryPage() {
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [bookForm, setBookForm] = useState<any>(BOOK_EMPTY);
  const [issueForm, setIssueForm] = useState<any>(ISSUE_EMPTY);
  const [returnTx, setReturnTx] = useState<any>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: books = [] } = useQuery({ queryKey: ["edu-books"], queryFn: () => api("GET", "/api/education/library/books") });
  const { data: transactions = [] } = useQuery({ queryKey: ["edu-transactions"], queryFn: () => api("GET", "/api/education/library/transactions") });

  const addBook = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/library/books", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-books"] }); setBookOpen(false); setBookForm(BOOK_EMPTY); },
  });

  const issueBook = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/library/issue", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-transactions", "edu-books"] }); setIssueOpen(false); setIssueForm(ISSUE_EMPTY); },
  });

  const returnBook = useMutation({
    mutationFn: (d: any) => api("POST", `/api/education/library/return/${d.id}`, { return_date: d.return_date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-transactions", "edu-books"] }); setReturnOpen(false); setReturnTx(null); },
  });

  const bookList = Array.isArray(books) ? books : [];
  const txList = Array.isArray(transactions) ? transactions : [];
  const setB = (k: string, v: string) => setBookForm((f: any) => ({ ...f, [k]: v }));
  const setI = (k: string, v: string) => setIssueForm((f: any) => ({ ...f, [k]: v }));

  const calcFine = (tx: any) => {
    if (!tx?.due_date) return 0;
    const due = new Date(tx.due_date);
    const ret = new Date(returnDate);
    const days = Math.max(0, Math.floor((ret.getTime() - due.getTime()) / 86400000));
    return days * 2;
  };

  const openReturn = (tx: any) => { setReturnTx(tx); setReturnDate(new Date().toISOString().split("T")[0]); setReturnOpen(true); };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Library Management</h1>

      <Tabs defaultValue="books">
        <TabsList><TabsTrigger value="books">Books</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger></TabsList>

        <TabsContent value="books" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span>Total: <strong>{bookList.length}</strong></span>
              <span>Available: <strong>{bookList.filter((b: any) => Number(b.copies_available) > 0).length}</strong></span>
            </div>
            <Button onClick={() => { setBookForm(BOOK_EMPTY); setBookOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Book</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Accession No.</TableHead><TableHead>Title</TableHead><TableHead>Author</TableHead>
                  <TableHead>Category</TableHead><TableHead>Total</TableHead><TableHead>Available</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bookList.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.accession_number}</TableCell>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell>{b.author}</TableCell>
                      <TableCell><Badge variant="secondary">{b.category}</Badge></TableCell>
                      <TableCell>{b.copies_total}</TableCell>
                      <TableCell><Badge variant={Number(b.copies_available) > 0 ? "default" : "destructive"}>{b.copies_available}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => { setIssueForm({ ...ISSUE_EMPTY, book_id: String(b.id) }); setIssueOpen(true); }} disabled={Number(b.copies_available) < 1}><BookOpen className="w-3 h-3 mr-1" />Issue</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead><TableHead>Returned</TableHead><TableHead>Fine</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {txList.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.student_name || t.student_id}</TableCell>
                      <TableCell className="font-medium">{t.book_title}</TableCell>
                      <TableCell>{t.issue_date}</TableCell>
                      <TableCell>{t.due_date}</TableCell>
                      <TableCell>{t.return_date || <Badge variant="outline">Pending</Badge>}</TableCell>
                      <TableCell>{t.fine ? `₹${t.fine}` : "—"}</TableCell>
                      <TableCell>
                        {!t.return_date && <Button size="sm" variant="outline" onClick={() => openReturn(t)}>Return</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Book</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Accession Number" value={bookForm.accession_number} onChange={(e) => setB("accession_number", e.target.value)} />
            <Input placeholder="Title" value={bookForm.title} onChange={(e) => setB("title", e.target.value)} />
            <Input placeholder="Author" value={bookForm.author} onChange={(e) => setB("author", e.target.value)} />
            <Input placeholder="Category" value={bookForm.category} onChange={(e) => setB("category", e.target.value)} />
            <Input placeholder="Total Copies" type="number" value={bookForm.copies_total} onChange={(e) => setB("copies_total", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookOpen(false)}>Cancel</Button>
            <Button onClick={() => addBook.mutate(bookForm)} disabled={addBook.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={issueForm.book_id} onValueChange={(v) => setI("book_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select Book" /></SelectTrigger>
              <SelectContent>{bookList.filter((b: any) => Number(b.copies_available) > 0).map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Student ID" value={issueForm.student_id} onChange={(e) => setI("student_id", e.target.value)} />
            <Input placeholder="Due Date" type="date" value={issueForm.due_date} onChange={(e) => setI("due_date", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={() => issueBook.mutate(issueForm)} disabled={issueBook.isPending}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Return Book — {returnTx?.book_title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Return Date" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            <div className="p-3 bg-muted rounded text-sm">
              <p>Due: {returnTx?.due_date}</p>
              <p className="font-semibold mt-1">Fine: ₹{calcFine(returnTx)} ({Math.max(0, Math.floor((new Date(returnDate).getTime() - new Date(returnTx?.due_date || returnDate).getTime()) / 86400000))} days × ₹2)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={() => returnBook.mutate({ id: returnTx?.id, return_date: returnDate })} disabled={returnBook.isPending}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
