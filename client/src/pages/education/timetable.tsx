import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetablePage() {
  const qc = useQueryClient();
  const [classVal, setClassVal] = useState("10");
  const [section, setSection] = useState("A");
  const [editSlot, setEditSlot] = useState<any>(null);
  const [slotForm, setSlotForm] = useState({ subject: "", teacher: "" });

  const { data: timetable = [] } = useQuery({
    queryKey: ["edu-timetable", classVal, section],
    queryFn: () => api("GET", `/api/education/timetable?class=${classVal}&section=${section}`),
    enabled: !!classVal && !!section,
  });

  const saveSlot = useMutation({
    mutationFn: (d: any) => api("PUT", "/api/education/timetable/slot", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-timetable"] }); setEditSlot(null); },
  });

  const slots = Array.isArray(timetable) ? timetable : [];
  const getSlot = (day: string, period: number) =>
    slots.find((s: any) => s.day === day && s.period === period);

  const openEdit = (day: string, period: number) => {
    const s = getSlot(day, period);
    setEditSlot({ day, period, class: classVal, section });
    setSlotForm({ subject: s?.subject || "", teacher: s?.teacher || "" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <Button variant="outline" onClick={() => alert("PDF export not yet implemented")}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Class" value={classVal} onChange={(e) => setClassVal(e.target.value)} className="w-28" />
        <Input placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} className="w-28" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left font-semibold w-28">Day \ Period</th>
                {PERIODS.map((p) => <th key={p} className="border p-2 text-center font-semibold">P{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="hover:bg-muted/30">
                  <td className="border p-2 font-medium bg-muted/50">{day}</td>
                  {PERIODS.map((p) => {
                    const s = getSlot(day, p);
                    return (
                      <td key={p} className="border p-1 text-center min-w-[90px]">
                        <div className="text-xs font-medium">{s?.subject || "—"}</div>
                        <div className="text-xs text-muted-foreground">{s?.teacher || ""}</div>
                        <Button size="sm" variant="ghost" className="h-5 px-1 mt-1" onClick={() => openEdit(day, p)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!editSlot} onOpenChange={() => setEditSlot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Slot — {editSlot?.day} Period {editSlot?.period}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Subject" value={slotForm.subject} onChange={(e) => setSlotForm((f) => ({ ...f, subject: e.target.value }))} />
            <Input placeholder="Teacher Name" value={slotForm.teacher} onChange={(e) => setSlotForm((f) => ({ ...f, teacher: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={() => saveSlot.mutate({ ...editSlot, ...slotForm })} disabled={saveSlot.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
