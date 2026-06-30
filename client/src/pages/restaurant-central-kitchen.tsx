import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
    credentials: "include",
  }).then((r) => r.json());

interface ProductionItem {
  id: number;
  item_name: string;
  target_qty: number;
  actual_qty: number;
  unit: string;
  status: string;
}

interface Dispatch {
  id: number;
  outlet_name: string;
  items_count: number;
  dispatch_time: string;
  status: string;
  created_at: string;
}

interface OutletRequest {
  id: number;
  outlet_name: string;
  item_name: string;
  qty_requested: number;
  unit: string;
  status: string;
  requested_at: string;
}

interface Recipe {
  id: number;
  item_name: string;
  batch_size: number;
  yield_qty: number;
  unit: string;
  ingredients_count: number;
}

export default function RestaurantCentralKitchenPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [dispatchItems, setDispatchItems] = useState<Array<{ item_id: number; qty: number }>>([]);
  const [dispatchTime, setDispatchTime] = useState<string>("");
  const [editingQtys, setEditingQtys] = useState<Record<number, number>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { data: schedule = [] } = useQuery<ProductionItem[]>({
    queryKey: ["ck-schedule", selectedDate],
    queryFn: () => api("GET", `/api/restaurant/central-kitchen/schedule?date=${selectedDate}`),
  });

  const { data: dispatches = [] } = useQuery<Dispatch[]>({
    queryKey: ["ck-dispatches"],
    queryFn: () => api("GET", "/api/restaurant/central-kitchen/dispatches"),
  });

  const { data: requests = [] } = useQuery<OutletRequest[]>({
    queryKey: ["ck-requests"],
    queryFn: () => api("GET", "/api/restaurant/central-kitchen/outlet-requests"),
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["ck-recipes"],
    queryFn: () => api("GET", "/api/restaurant/central-kitchen/recipes"),
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ["ck-outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  const { data: summary = {} } = useQuery({
    queryKey: ["ck-summary"],
    queryFn: () => api("GET", "/api/restaurant/central-kitchen/summary"),
  });

  const updateQty = useMutation({
    mutationFn: ({ id, actual_qty }: { id: number; actual_qty: number }) =>
      api("PUT", `/api/restaurant/central-kitchen/schedule/${id}`, { actual_qty }),
    onSuccess: () => {
      toast({ title: "Quantity updated" });
      qc.invalidateQueries({ queryKey: ["ck-schedule"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/restaurant/central-kitchen/schedule/${id}`, { status }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      qc.invalidateQueries({ queryKey: ["ck-schedule"] });
    },
  });

  const createDispatch = useMutation({
    mutationFn: () =>
      api("POST", "/api/restaurant/central-kitchen/dispatches", {
        outlet_id: selectedOutlet,
        items: dispatchItems,
        dispatch_time: dispatchTime,
      }),
    onSuccess: () => {
      toast({ title: "Dispatch created" });
      qc.invalidateQueries({ queryKey: ["ck-dispatches"] });
      setDispatchItems([]);
    },
    onError: () => toast({ title: "Dispatch failed", variant: "destructive" }),
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/restaurant/central-kitchen/outlet-requests/${id}`, { status }),
    onSuccess: () => {
      toast({ title: "Request updated" });
      qc.invalidateQueries({ queryKey: ["ck-requests"] });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const scheduleList = Array.isArray(schedule) ? schedule : [];
  const dispatchList = Array.isArray(dispatches) ? dispatches : [];
  const requestList = Array.isArray(requests) ? requests : [];
  const recipeList = Array.isArray(recipes) ? recipes : [];
  const outletList = Array.isArray(outlets) ? outlets : [];
  const s: any = summary;

  const statusColor = (st: string) => {
    if (st === "completed") return "bg-green-100 text-green-800";
    if (st === "in-progress") return "bg-blue-100 text-blue-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Central Kitchen Operations</h1>
          <p className="text-muted-foreground">Production scheduling, dispatch, and outlet request management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Production Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.capacity ?? "—"}</div>
              <p className="text-xs text-muted-foreground">units/day</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Dispatches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.todays_dispatches ?? dispatchList.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outlets Served</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.outlets_served ?? outletList.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Production Schedule</TabsTrigger>
            <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
            <TabsTrigger value="requests">Outlet Requests</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label>Production Date</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Target Qty</TableHead>
                      <TableHead className="text-right">Actual Produced</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No production schedule for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      scheduleList.map((item: ProductionItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.target_qty}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="w-20 text-right inline-block"
                              defaultValue={item.actual_qty}
                              onChange={(e) => setEditingQtys({ ...editingQtys, [item.id]: parseFloat(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Badge className={statusColor(item.status)}>{item.status}</Badge>
                          </TableCell>
                          <TableCell className="space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQty.mutate({ id: item.id, actual_qty: editingQtys[item.id] ?? item.actual_qty })}
                            >
                              Save
                            </Button>
                            <Select
                              value={item.status}
                              onValueChange={(v) => updateStatus.mutate({ id: item.id, status: v })}
                            >
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatch" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Create Dispatch</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Outlet</Label>
                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                      <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                      <SelectContent>
                        {outletList.map((o: any) => (
                          <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dispatch Time</Label>
                    <Input type="datetime-local" value={dispatchTime} onChange={(e) => setDispatchTime(e.target.value)} />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Select items from today's completed production to add to dispatch.
                </div>
                <Button
                  onClick={() => createDispatch.mutate()}
                  disabled={createDispatch.isPending || !selectedOutlet}
                >
                  {createDispatch.isPending ? "Creating..." : "Create Dispatch"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Dispatch History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Dispatch Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No dispatches yet</TableCell>
                      </TableRow>
                    ) : (
                      dispatchList.map((d: Dispatch) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.outlet_name}</TableCell>
                          <TableCell>{d.items_count} items</TableCell>
                          <TableCell>{d.dispatch_time}</TableCell>
                          <TableCell><Badge className={statusColor(d.status)}>{d.status}</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader><CardTitle>Outlet Ingredient Requests</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Requested</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending requests</TableCell>
                      </TableRow>
                    ) : (
                      requestList.map((req: OutletRequest) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.outlet_name}</TableCell>
                          <TableCell>{req.item_name}</TableCell>
                          <TableCell className="text-right">{req.qty_requested}</TableCell>
                          <TableCell>{req.unit}</TableCell>
                          <TableCell><Badge className={statusColor(req.status)}>{req.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{req.requested_at}</TableCell>
                          <TableCell className="space-x-1">
                            {req.status === "pending" && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => updateRequest.mutate({ id: req.id, status: "approved" })}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => updateRequest.mutate({ id: req.id, status: "rejected" })}>
                                  Reject
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle>Recipe List</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recipeList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recipes added</p>
                    ) : (
                      recipeList.map((r: Recipe) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRecipe(r)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedRecipe?.id === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <div className="font-medium">{r.item_name}</div>
                          <div className="text-xs opacity-70">Batch: {r.batch_size} {r.unit} · {r.ingredients_count} ingredients</div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="md:col-span-2">
                {selectedRecipe ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedRecipe.item_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-muted rounded p-3 text-center">
                          <div className="text-muted-foreground">Batch Size</div>
                          <div className="font-semibold text-lg">{selectedRecipe.batch_size} {selectedRecipe.unit}</div>
                        </div>
                        <div className="bg-muted rounded p-3 text-center">
                          <div className="text-muted-foreground">Yield</div>
                          <div className="font-semibold text-lg">{selectedRecipe.yield_qty} {selectedRecipe.unit}</div>
                        </div>
                        <div className="bg-muted rounded p-3 text-center">
                          <div className="text-muted-foreground">Ingredients</div>
                          <div className="font-semibold text-lg">{selectedRecipe.ingredients_count}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Full ingredient details available via API integration.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
                      Select a recipe to view details
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
