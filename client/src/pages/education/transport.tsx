import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Bus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const ROUTE_EMPTY = { route_number: "", route_name: "", vehicle: "", driver: "" };
const STUDENT_EMPTY = { student_id: "", route_id: "", stop: "", fee: "" };

export default function TransportPage() {
  const qc = useQueryClient();
  const [routeOpen, setRouteOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [routeForm, setRouteForm] = useState<any>(ROUTE_EMPTY);
  const [studentForm, setStudentForm] = useState<any>(STUDENT_EMPTY);

  const { data: routes = [] } = useQuery({ queryKey: ["edu-routes"], queryFn: () => api("GET", "/api/education/transport/routes") });
  const { data: transportStudents = [] } = useQuery({ queryKey: ["edu-transport-students"], queryFn: () => api("GET", "/api/education/transport/students") });

  const addRoute = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/transport/routes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-routes"] }); setRouteOpen(false); setRouteForm(ROUTE_EMPTY); },
  });

  const assignStudent = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/transport/students", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-transport-students"] }); setStudentOpen(false); setStudentForm(STUDENT_EMPTY); },
  });

  const routeList = Array.isArray(routes) ? routes : [];
  const studentList = Array.isArray(transportStudents) ? transportStudents : [];
  const setR = (k: string, v: string) => setRouteForm((f: any) => ({ ...f, [k]: v }));
  const setS = (k: string, v: string) => setStudentForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Transport Management</h1>

      <Tabs defaultValue="routes">
        <TabsList><TabsTrigger value="routes">Routes</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList>

        <TabsContent value="routes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1"><Bus className="w-4 h-4" />Total Routes: <strong>{routeList.length}</strong></span>
            </div>
            <Button onClick={() => { setRouteForm(ROUTE_EMPTY); setRouteOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Route</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Route No.</TableHead><TableHead>Route Name</TableHead><TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead><TableHead>Stops</TableHead><TableHead>Students</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {routeList.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.route_number}</TableCell>
                      <TableCell className="font-medium">{r.route_name}</TableCell>
                      <TableCell>{r.vehicle}</TableCell>
                      <TableCell>{r.driver}</TableCell>
                      <TableCell>{r.stops_count || 0}</TableCell>
                      <TableCell>{r.students_count || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setStudentForm(STUDENT_EMPTY); setStudentOpen(true); }}><Plus className="w-4 h-4 mr-2" />Assign Student</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Route</TableHead>
                  <TableHead>Stop</TableHead><TableHead>Fee (Monthly)</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {studentList.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.student_name || s.student_id}</TableCell>
                      <TableCell>{s.class}</TableCell>
                      <TableCell>{s.route_name || s.route_id}</TableCell>
                      <TableCell>{s.stop}</TableCell>
                      <TableCell>₹{Number(s.fee).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Route</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Route Number" value={routeForm.route_number} onChange={(e) => setR("route_number", e.target.value)} />
              <Input placeholder="Route Name" value={routeForm.route_name} onChange={(e) => setR("route_name", e.target.value)} />
            </div>
            <Input placeholder="Vehicle (e.g. TN01AB1234)" value={routeForm.vehicle} onChange={(e) => setR("vehicle", e.target.value)} />
            <Input placeholder="Driver Name" value={routeForm.driver} onChange={(e) => setR("driver", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteOpen(false)}>Cancel</Button>
            <Button onClick={() => addRoute.mutate(routeForm)} disabled={addRoute.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={studentOpen} onOpenChange={setStudentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Student to Route</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Student ID" value={studentForm.student_id} onChange={(e) => setS("student_id", e.target.value)} />
            <Select value={studentForm.route_id} onValueChange={(v) => setS("route_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select Route" /></SelectTrigger>
              <SelectContent>{routeList.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>{r.route_number} — {r.route_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Stop Name" value={studentForm.stop} onChange={(e) => setS("stop", e.target.value)} />
            <Input placeholder="Monthly Fee" type="number" value={studentForm.fee} onChange={(e) => setS("fee", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentOpen(false)}>Cancel</Button>
            <Button onClick={() => assignStudent.mutate(studentForm)} disabled={assignStudent.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
