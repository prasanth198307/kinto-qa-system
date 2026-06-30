import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

type RatePlan = { id: number; name: string; description: string; is_active: boolean };
type RatePlanPrice = { id: number; rate_plan_id: number; room_type_id: number; price_per_night: number; weekend_price: number; extra_adult_charge: number; extra_child_charge: number; valid_from: string; valid_to: string };
type RoomType = { id: number; name: string; base_price: number };
type TravelAgent = { id: number; agency_name: string; contact_person: string; phone: string; email: string; commission_rate: number; total_bookings: number; total_commission: number };

const emptyPrice = { room_type_id: "", price_per_night: "", weekend_price: "", extra_adult_charge: "", extra_child_charge: "", valid_from: "", valid_to: "" };
const emptyAgent = { agency_name: "", contact_person: "", phone: "", email: "", commission_rate: "" };

export default function RatesPage() {
  const qc = useQueryClient();
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", description: "" });
  const [priceDialog, setPriceDialog] = useState<{ planId: number; price?: RatePlanPrice } | null>(null);
  const [priceForm, setPriceForm] = useState<Record<string, string>>(emptyPrice);
  const [agentDialog, setAgentDialog] = useState<{ agent?: TravelAgent } | null>(null);
  const [agentForm, setAgentForm] = useState<Record<string, string>>(emptyAgent);

  const { data: plans = [] } = useQuery<RatePlan[]>({ queryKey: ["rate-plans"], queryFn: () => api("GET", "/api/hotel/rate-plans") });
  const { data: roomTypes = [] } = useQuery<RoomType[]>({ queryKey: ["room-types"], queryFn: () => api("GET", "/api/hotel/room-types") });
  const { data: agents = [] } = useQuery<TravelAgent[]>({ queryKey: ["travel-agents"], queryFn: () => api("GET", "/api/hotel/travel-agents") });
  const { data: planPrices = [] } = useQuery<RatePlanPrice[]>({
    queryKey: ["rate-plan-prices", expandedPlan],
    queryFn: () => api("GET", `/api/hotel/rate-plan-prices/${expandedPlan}`),
    enabled: expandedPlan !== null,
  });

  const addPlan = useMutation({ mutationFn: (b: unknown) => api("POST", "/api/hotel/rate-plans", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-plans"] }); setPlanDialog(false); setPlanForm({ name: "", description: "" }); } });
  const togglePlan = useMutation({ mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => api("PUT", `/api/hotel/rate-plans/${id}`, { is_active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["rate-plans"] }) });
  const savePrice = useMutation({
    mutationFn: (b: unknown) => priceDialog?.price ? api("PUT", `/api/hotel/rate-plan-prices/${priceDialog.price.id}`, b) : api("POST", "/api/hotel/rate-plan-prices", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rate-plan-prices", expandedPlan] }); setPriceDialog(null); setPriceForm(emptyPrice); },
  });
  const saveAgent = useMutation({
    mutationFn: (b: unknown) => agentDialog?.agent ? api("PUT", `/api/hotel/travel-agents/${agentDialog.agent.id}`, b) : api("POST", "/api/hotel/travel-agents", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["travel-agents"] }); setAgentDialog(null); setAgentForm(emptyAgent); },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rates & Travel Agents</h1>
      <Tabs defaultValue="rate-plans">
        <TabsList>
          <TabsTrigger value="rate-plans">Rate Plans</TabsTrigger>
          <TabsTrigger value="travel-agents">Travel Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="rate-plans" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setPlanDialog(true)}><Plus className="w-4 h-4 mr-1" />Add Rate Plan</Button>
          </div>
          <div className="border rounded-lg divide-y">
            {plans.map((plan) => (
              <div key={plan.id}>
                <div className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}>
                  {expandedPlan === plan.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-medium flex-1">{plan.name}</span>
                  <span className="text-sm text-muted-foreground flex-1">{plan.description}</span>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); togglePlan.mutate({ id: plan.id, is_active: !plan.is_active }); }}>
                    {plan.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setPriceDialog({ planId: plan.id }); setPriceForm({ ...emptyPrice, rate_plan_id: String(plan.id) }); }}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {expandedPlan === plan.id && (
                  <div className="px-8 pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room Type</TableHead>
                          <TableHead>Price/Night</TableHead>
                          <TableHead>Weekend</TableHead>
                          <TableHead>Extra Adult</TableHead>
                          <TableHead>Extra Child</TableHead>
                          <TableHead>Valid From</TableHead>
                          <TableHead>Valid To</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planPrices.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{roomTypes.find((r) => r.id === p.room_type_id)?.name ?? p.room_type_id}</TableCell>
                            <TableCell>₹{p.price_per_night}</TableCell>
                            <TableCell>₹{p.weekend_price}</TableCell>
                            <TableCell>₹{p.extra_adult_charge}</TableCell>
                            <TableCell>₹{p.extra_child_charge}</TableCell>
                            <TableCell>{p.valid_from}</TableCell>
                            <TableCell>{p.valid_to}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => { setPriceDialog({ planId: plan.id, price: p }); setPriceForm({ room_type_id: String(p.room_type_id), price_per_night: String(p.price_per_night), weekend_price: String(p.weekend_price), extra_adult_charge: String(p.extra_adult_charge), extra_child_charge: String(p.extra_child_charge), valid_from: p.valid_from, valid_to: p.valid_to }); }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="travel-agents" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => { setAgentDialog({}); setAgentForm(emptyAgent); }}><Plus className="w-4 h-4 mr-1" />Add Agent</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Total Commission</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.agency_name}</TableCell>
                  <TableCell>{a.contact_person}</TableCell>
                  <TableCell>{a.phone}</TableCell>
                  <TableCell>{a.commission_rate}%</TableCell>
                  <TableCell>{a.total_bookings}</TableCell>
                  <TableCell>₹{a.total_commission}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setAgentDialog({ agent: a }); setAgentForm({ agency_name: a.agency_name, contact_person: a.contact_person, phone: a.phone, email: a.email, commission_rate: String(a.commission_rate) }); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Rate Plan</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => addPlan.mutate(planForm)}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!priceDialog} onOpenChange={() => setPriceDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{priceDialog?.price ? "Edit" : "Add"} Price Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Room Type</Label>
              <Select value={priceForm.room_type_id} onValueChange={(v) => setPriceForm({ ...priceForm, room_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>{roomTypes.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(["price_per_night", "weekend_price", "extra_adult_charge", "extra_child_charge"] as const).map((f) => (
              <div key={f}><Label>{f.replace(/_/g, " ")}</Label><Input type="number" value={priceForm[f]} onChange={(e) => setPriceForm({ ...priceForm, [f]: e.target.value })} /></div>
            ))}
            <div><Label>Valid From</Label><Input type="date" value={priceForm.valid_from} onChange={(e) => setPriceForm({ ...priceForm, valid_from: e.target.value })} /></div>
            <div><Label>Valid To</Label><Input type="date" value={priceForm.valid_to} onChange={(e) => setPriceForm({ ...priceForm, valid_to: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => savePrice.mutate({ ...priceForm, rate_plan_id: priceDialog?.planId })}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!agentDialog} onOpenChange={() => setAgentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{agentDialog?.agent ? "Edit" : "Add"} Travel Agent</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["agency_name", "contact_person", "phone", "email"] as const).map((f) => (
              <div key={f}><Label>{f.replace(/_/g, " ")}</Label><Input value={agentForm[f]} onChange={(e) => setAgentForm({ ...agentForm, [f]: e.target.value })} /></div>
            ))}
            <div className="col-span-2"><Label>Commission Rate (%)</Label><Input type="number" value={agentForm.commission_rate} onChange={(e) => setAgentForm({ ...agentForm, commission_rate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={() => saveAgent.mutate(agentForm)}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
