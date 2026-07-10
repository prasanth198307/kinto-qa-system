import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2, Users, DollarSign, GraduationCap, TrendingUp } from "lucide-react";

const api = (path: string) => fetch(path).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = ["admission_funnel", "attendance_summary", "fee_collection", "exam_results", "class_performance", "teacher_performance"] as const;
type Tab = typeof TABS[number];
const LABELS: Record<Tab, string> = { admission_funnel: "Admission Funnel", attendance_summary: "Attendance Summary", fee_collection: "Fee Collection", exam_results: "Exam Results", class_performance: "Class Performance", teacher_performance: "Teacher Performance" };
const ICONS: Record<Tab, any> = { admission_funnel: TrendingUp, attendance_summary: Users, fee_collection: DollarSign, exam_results: GraduationCap, class_performance: BarChart2, teacher_performance: Users };

export default function EducationReportsPage() {
  const [tab, setTab] = useState<Tab>("admission_funnel");
  const { data: report = {} } = useQuery<any>({ queryKey: ["/api/education/reports", tab], queryFn: () => api(`/api/education/reports/${tab.replace(/_/g, "-")}`) });
  const r = report as any;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Education Reports</h1>

      <div className="flex gap-2 flex-wrap border-b pb-1">
        {TABS.map(t => { const Icon = ICONS[t]; return <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}><Icon className="w-3.5 h-3.5" />{LABELS[t]}</button>; })}
      </div>

      {tab === "admission_funnel" && (
        <div className="grid grid-cols-4 gap-4">
          {[["Inquiries", r.inquiries ?? 0], ["Applications", r.applications ?? 0], ["Tests Taken", r.tests_taken ?? 0], ["Enrolled", r.enrolled ?? 0]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className="text-2xl font-bold">{v}</p></CardContent></Card>
          ))}
        </div>
      )}

      {tab === "attendance_summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Avg Attendance %", `${r.avg_attendance_pct ?? 0}%`, "text-green-600"], ["Present Today", r.present_today ?? 0, ""], ["Absent Today", r.absent_today ?? 0, "text-red-600"]].map(([l, v, c]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">By Class</CardTitle></CardHeader><CardContent>
            <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Class","Present","Absent","%"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
              <tbody>{Array.isArray(r.by_class) && r.by_class.map((c: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{c.class_name}</td><td className="p-2">{c.present}</td><td className="p-2">{c.absent}</td><td className="p-2">{c.pct}%</td></tr>)}
              {(!r.by_class || r.by_class?.length === 0) && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
            </table>
          </CardContent></Card>
        </div>
      )}

      {tab === "fee_collection" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[["Total Collected", `₹${(r.total_collected ?? 0).toLocaleString()}`, "text-green-600"], ["Total Due", `₹${(r.total_due ?? 0).toLocaleString()}`, "text-red-600"], ["Collection %", `${r.collection_pct ?? 0}%`, ""]].map(([l, v, c]) => (
              <Card key={l as string}><CardContent className="pt-4"><p className="text-sm text-gray-500">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle className="text-base">By Class</CardTitle></CardHeader><CardContent>
            <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Class","Collected","Due"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
              <tbody>{Array.isArray(r.by_class) && r.by_class.map((c: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{c.class_name}</td><td className="p-2">₹{c.collected?.toLocaleString()}</td><td className="p-2">₹{c.due?.toLocaleString()}</td></tr>)}
              {(!r.by_class || r.by_class?.length === 0) && <tr><td colSpan={3} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
            </table>
          </CardContent></Card>
        </div>
      )}

      {tab === "exam_results" && (
        <Card><CardHeader><CardTitle className="text-base">Exam Results</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Exam","Class","Avg %","Pass %","Top Score"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{Array.isArray(r.exams) && r.exams.map((e: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{e.exam_name}</td><td className="p-2">{e.class_name}</td><td className="p-2">{e.avg_pct}%</td><td className="p-2">{e.pass_pct}%</td><td className="p-2">{e.top_score}</td></tr>)}
            {(!r.exams || r.exams?.length === 0) && <tr><td colSpan={5} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "class_performance" && (
        <Card><CardHeader><CardTitle className="text-base">Class Performance</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Class","Students","Avg Marks","Attendance %"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{Array.isArray(r.classes) && r.classes.map((c: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{c.class_name}</td><td className="p-2">{c.student_count}</td><td className="p-2">{c.avg_marks}</td><td className="p-2">{c.attendance_pct}%</td></tr>)}
            {(!r.classes || r.classes?.length === 0) && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "teacher_performance" && (
        <Card><CardHeader><CardTitle className="text-base">Teacher Performance</CardTitle></CardHeader><CardContent>
          <table className="w-full text-sm"><thead><tr className="bg-gray-50">{["Teacher","Classes Taught","Avg Class Score","Attendance %"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>{Array.isArray(r.teachers) && r.teachers.map((t: any, i: number) => <tr key={i} className="border-b"><td className="p-2">{t.teacher_name}</td><td className="p-2">{t.classes_taught}</td><td className="p-2">{t.avg_score}</td><td className="p-2">{t.attendance_pct}%</td></tr>)}
            {(!r.teachers || r.teachers?.length === 0) && <tr><td colSpan={4} className="text-center p-4 text-gray-400">No data.</td></tr>}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
