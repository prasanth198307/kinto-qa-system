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

export default function EducationTransportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ route_name: "", vehicle_number: "", driver_name: "", driver_phone: "", capacity: "" });

  const { data: routes = [] } = useQuery({ queryKey: ["/api/education/transport/routes"], queryFn: () => api("GET", "/api/education/transport/routes") });
  const { data: assignments = [] } = useQuery({ queryKey: ["/api/education/transport/assignments"], queryFn: () => api("GET", "/api/education/transport/assignments") });

  const addRoute = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/transport/routes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/transport/routes"] }); setShowForm(false); toast({ title: "Route added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transport</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Route</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Route</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {["route_name","vehicle_number","driver_name","driver_phone","capacity"].map(k => (
                <div key={k}>
                  <label className="text-sm font-medium capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k === "capacity" ? "number" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addRoute.mutate(form)} disabled={addRoute.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Routes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead><TableHead>Vehicle No</TableHead><TableHead>Driver</TableHead>
                <TableHead>Driver Phone</TableHead><TableHead>Stops</TableHead><TableHead>Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.route_name}</TableCell>
                  <TableCell>{r.vehicle_no}</TableCell>
                  <TableCell>{r.driver_name}</TableCell>
                  <TableCell>{r.driver_phone}</TableCell>
                  <TableCell>{r.stops}</TableCell>
                  <TableCell>{r.students_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Student Transport Assignments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Route</TableHead><TableHead>Stop</TableHead><TableHead>Vehicle</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.student_name}</TableCell>
                  <TableCell>{a.class}</TableCell>
                  <TableCell>{a.route_name}</TableCell>
                  <TableCell>{a.stop}</TableCell>
                  <TableCell>{a.vehicle_no}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
