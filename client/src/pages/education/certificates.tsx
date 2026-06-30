import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Plus } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const CERT_TYPES = ["TC", "Bonafide", "Character", "Migration", "Mark Sheet"];
const EMPTY = { student_name: "", student_id: "", cert_type: "Bonafide", reason: "", class_name: "", admission_no: "" };

export default function CertificatesPage() {
  const qc = useQueryClient();
  const [certType, setCertType] = useState("Bonafide");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [preview, setPreview] = useState<typeof EMPTY | null>(null);

  const { data: certs = [] } = useQuery({ queryKey: ["edu-certs", certType], queryFn: () => api("GET", `/api/education/certificates?type=${certType}`) });

  const issueMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/education/certificates", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-certs"] }); setPreview(null); setForm({ ...EMPTY }); },
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(certs) ? certs : [];

  const previewHtml = preview ? `
    <div style="font-family: serif; padding: 40px; border: 2px solid #333; max-width: 600px; margin: auto;">
      <h2 style="text-align:center; font-size:20px;">KINTO PUBLIC SCHOOL</h2>
      <h3 style="text-align:center; color:#555;">${preview.cert_type} Certificate</h3>
      <p><strong>This is to certify that</strong> <u>${preview.student_name || "___________"}</u>,
      Admission No. <u>${preview.admission_no || "___"}</u>, Class <u>${preview.class_name || "___"}</u>
      is/was a bonafide student of this institution.</p>
      ${preview.reason ? `<p><strong>Reason:</strong> ${preview.reason}</p>` : ""}
      <br/><br/>
      <div style="display:flex; justify-content:space-between; margin-top:40px;">
        <div>Date: ___________</div>
        <div>Principal's Signature</div>
      </div>
    </div>
  ` : "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificate Printing</h1>
          <p className="text-muted-foreground">Issue TC, Bonafide, Character, Migration & Mark Sheet</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {CERT_TYPES.map(t => (
          <Button key={t} variant={certType === t ? "default" : "outline"} onClick={() => setCertType(t)} className="text-sm">{t}</Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Issue New Certificate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Certificate Type</label>
              <Select value={form.cert_type} onValueChange={v => setForm(p => ({ ...p, cert_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CERT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {["student_name", "admission_no", "class_name", "reason"].map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input value={(form as Record<string, string>)[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview(form)} className="flex-1">Preview</Button>
              <Button onClick={() => issueMut.mutate(form)} className="flex-1">Issue & Print</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Certificate Preview</CardTitle></CardHeader>
          <CardContent>
            {preview ? (
              <>
                <div className="border rounded p-4 text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                <Button className="mt-3 w-full" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Fill the form and click Preview</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Issued Certificates — {certType}</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input placeholder="Search by student name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? rows.filter((r: Record<string, unknown>) => !search || String(r.student_name).toLowerCase().includes(search.toLowerCase())).map((r: Record<string, unknown>, i) => (
                <TableRow key={i}>
                  <TableCell>{String(r.serial_no)}</TableCell>
                  <TableCell>{String(r.student_name)}</TableCell>
                  <TableCell>{String(r.class_name)}</TableCell>
                  <TableCell><Badge variant="outline">{String(r.cert_type)}</Badge></TableCell>
                  <TableCell>{String(r.issued_date)}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No certificates issued yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
