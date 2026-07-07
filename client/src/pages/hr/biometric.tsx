import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Cpu, RefreshCw, Trash2, Plus, Loader2, Wifi, WifiOff, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
};

const DIR_COLOR: Record<string, string> = {
  in: "bg-green-100 text-green-700",
  out: "bg-blue-100 text-blue-700",
  unknown: "bg-gray-100 text-gray-700",
};

export default function BiometricPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", ip_address: "", port: "4370", serial_no: "", location: "", device_type: "ZKTeco" });
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data: devices = [] } = useQuery<any[]>({
    queryKey: ["biometric-devices"],
    queryFn: () => fetch("/api/hr/biometric/devices").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<any[]>({
    queryKey: ["biometric-logs"],
    queryFn: () => fetch("/api/hr/biometric/logs").then(r => r.json()),
    refetchInterval: 15000,
  });

  const addDevice = useMutation({
    mutationFn: (data: any) => api("POST", "/api/hr/biometric/devices", data),
    onSuccess: () => {
      toast({ title: "Device added" });
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      setAddOpen(false);
      setForm({ name: "", ip_address: "", port: "4370", serial_no: "", location: "", device_type: "ZKTeco" });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/hr/biometric/devices/${id}`),
    onSuccess: () => { toast({ title: "Device removed" }); qc.invalidateQueries({ queryKey: ["biometric-devices"] }); },
  });

  const syncDevice = async (id: number) => {
    setSyncingId(id);
    try {
      const result = await api("POST", `/api/hr/biometric/devices/${id}/sync`, {});
      toast({ title: result.synced > 0 ? `Synced ${result.synced} records` : "Sync complete", description: result.message });
      qc.invalidateQueries({ queryKey: ["biometric-devices"] });
      qc.invalidateQueries({ queryKey: ["biometric-logs"] });
    } catch { toast({ title: "Sync failed", variant: "destructive" }); }
    setSyncingId(null);
  };

  const processLogs = async () => {
    setProcessing(true);
    try {
      const r = await api("POST", "/api/hr/biometric/process-logs", {});
      toast({ title: `Processed ${r.processed} records`, description: `${r.unmatched} unmatched employee codes` });
      qc.invalidateQueries({ queryKey: ["biometric-logs"] });
    } catch { toast({ title: "Processing failed", variant: "destructive" }); }
    setProcessing(false);
  };

  const baseUrl = window.location.origin;
  const admsUrl = `${baseUrl}/api/hr/biometric/adms`;

  const rawCount = (logs as any[]).filter((l: any) => l.status === "raw").length;
  const processedCount = (logs as any[]).filter((l: any) => l.status === "processed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Cpu className="h-6 w-6" />Biometric Attendance</h1>
          <p className="text-sm text-muted-foreground">ZKTeco device management · ADMS push sync · Attendance log processing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={processLogs} disabled={processing || rawCount === 0}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Activity className="h-4 w-4 mr-1" />}
            Process {rawCount > 0 ? `${rawCount} Raw Logs` : "Logs"}
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Device</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Devices</p><p className="text-2xl font-bold">{(devices as any[]).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{(devices as any[]).filter((d: any) => d.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Logs</p><p className="text-2xl font-bold text-amber-600">{rawCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Processed Today</p><p className="text-2xl font-bold text-blue-600">{processedCount}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="logs">Punch Logs</TabsTrigger>
          <TabsTrigger value="adms">ADMS Config</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          {(devices as any[]).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Cpu className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No devices registered. Add a ZKTeco device to begin.</p>
            </CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Total Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(devices as any[]).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.device_type}</TableCell>
                    <TableCell className="font-mono text-xs">{d.ip_address}:{d.port}</TableCell>
                    <TableCell className="font-mono text-xs">{d.serial_no || "—"}</TableCell>
                    <TableCell>{d.location || "—"}</TableCell>
                    <TableCell className="text-xs">{d.last_sync_at ? new Date(d.last_sync_at).toLocaleString("en-IN") : "Never"}</TableCell>
                    <TableCell>{d.total_records_synced || 0}</TableCell>
                    <TableCell><Badge className={`text-xs ${STATUS_COLOR[d.status] || ""}`}>{d.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => syncDevice(d.id)} disabled={syncingId === d.id} title="Pull attendance from device">
                          {syncingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteDevice.mutate(d.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Last 200 punch records from all devices</p>
            <div className="flex gap-2 text-xs">
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">{rawCount} pending</span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">{processedCount} processed</span>
            </div>
          </div>
          {loadingLogs ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (logs as any[]).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No punch records yet. Sync a device or configure ADMS push.</CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Punch Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Verify Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs as any[]).map((l: any) => (
                  <TableRow key={l.id} className={l.status === "raw" ? "bg-amber-50" : ""}>
                    <TableCell className="font-mono text-xs">{l.employee_code}</TableCell>
                    <TableCell>{l.first_name ? `${l.first_name} ${l.last_name || ""}` : <span className="text-red-500 text-xs">Unmatched</span>}</TableCell>
                    <TableCell>{l.device_name || "—"}</TableCell>
                    <TableCell className="text-xs">{l.punch_time ? new Date(l.punch_time).toLocaleString("en-IN") : "—"}</TableCell>
                    <TableCell><Badge className={`text-xs ${DIR_COLOR[l.direction] || ""}`}>{l.direction}</Badge></TableCell>
                    <TableCell>{l.verify_type}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${l.status === "processed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="adms">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4" />ADMS Push Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-blue-900">Configure your ZKTeco device to push attendance here:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-medium w-32">Server Address:</span>
                    <code className="bg-white border rounded px-2 py-1 text-xs select-all">{window.location.hostname}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-medium w-32">Port:</span>
                    <code className="bg-white border rounded px-2 py-1 text-xs">{window.location.port || "80"}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-medium w-32">URL Path:</span>
                    <code className="bg-white border rounded px-2 py-1 text-xs select-all">/api/hr/biometric/adms</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-medium w-32">Full URL:</span>
                    <code className="bg-white border rounded px-2 py-1 text-xs select-all">{admsUrl}</code>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Steps to configure on ZKTeco device:</p>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>On the device LCD, go to <strong>Menu → Communication → Cloud Server Settings</strong></li>
                  <li>Enable <strong>ADMS</strong> (Attendance Data Management System)</li>
                  <li>Set <strong>Server Address</strong> to your server hostname or IP</li>
                  <li>Set <strong>Server Port</strong> to {window.location.port || "80"}</li>
                  <li>Set <strong>Company Code</strong> (optional, maps to tenant)</li>
                  <li>Save and restart the device network connection</li>
                  <li>The device will push punch records every 30 seconds automatically</li>
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                <WifiOff className="h-4 w-4 inline mr-1" />
                <strong>Note:</strong> The ADMS endpoint is public (no auth header required) so ZKTeco devices can reach it.
                Device serial number is matched to the registered device to associate tenant. Ensure your server is accessible from the device's network.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Biometric Device</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Device Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Office Main Door" />
              </div>
              <div>
                <Label>Device Type</Label>
                <Input value={form.device_type} onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))} placeholder="ZKTeco" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>IP Address *</Label>
                <Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.100" />
              </div>
              <div>
                <Label>Port</Label>
                <Input value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="4370" type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Serial Number</Label>
                <Input value={form.serial_no} onChange={e => setForm(f => ({ ...f, serial_no: e.target.value }))} placeholder="ABC1234567" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Main Office, Floor 2" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addDevice.mutate({ ...form, port: Number(form.port) })} disabled={!form.name || !form.ip_address || addDevice.isPending}>
              {addDevice.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
