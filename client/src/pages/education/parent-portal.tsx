import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

export default function ParentPortalPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [studentId, setStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");

  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });
  const { data: studentInfo } = useQuery<any>({ queryKey: ["/api/education/parent/student", studentId], queryFn: () => api("GET", `/api/education/parent/student/${studentId}`), enabled: !!studentId });
  const { data: fees = [] } = useQuery<any[]>({ queryKey: ["/api/education/parent/fees", studentId], queryFn: () => api("GET", `/api/education/parent/fees/${studentId}`), enabled: !!studentId });

  const payFee = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/parent/fee-payment", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/parent/fees", studentId] }); setPayAmount(""); } });

  const stdArr = Array.isArray(students) ? students : [];
  const feeArr = Array.isArray(fees) ? fees : [];
  const info = studentInfo as any;

  const pendingFees = feeArr.filter((f: any) => f.status !== "paid");
  const totalDue = pendingFees.reduce((s: number, f: any) => s + (f.amount || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Parent Portal (Admin Preview)</h1>
      <p className="text-sm text-gray-500">This preview shows the same data a parent would see when logged into the parent app for a specific student.</p>

      <div><Label className="text-xs">Select Student</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select student" /></SelectTrigger>
          <SelectContent>{stdArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.roll_number})</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {studentId && info && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Student Profile</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-gray-500">Name:</span> {info.name}</p>
              <p><span className="text-gray-500">Class:</span> {info.class_name}</p>
              <p><span className="text-gray-500">Roll No:</span> {info.roll_number}</p>
              <p><span className="text-gray-500">Attendance %:</span> {info.attendance_pct ?? "—"}%</p>
              <p><span className="text-gray-500">Latest Exam Avg:</span> {info.avg_marks ?? "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fee Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600 mb-2">{sym}{totalDue.toLocaleString()} due</p>
              <div className="space-y-1">
                {feeArr.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm border-b pb-1">
                    <span>{f.fee_type}</span>
                    <Badge className={f.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{f.status === "paid" ? "Paid" : `${sym}${f.amount}`}</Badge>
                  </div>
                ))}
                {feeArr.length === 0 && <p className="text-gray-400 text-sm">No fee records.</p>}
              </div>
              {pendingFees.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <Input placeholder="Amount" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-32" />
                  <Button size="sm" onClick={() => payFee.mutate({ student_id: parseInt(studentId), amount: parseFloat(payAmount) })}><CreditCard className="w-3 h-3 mr-1" />Pay Online</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {!studentId && <p className="text-center text-gray-400 py-8">Select a student to preview their parent portal view.</p>}
    </div>
  );
}
