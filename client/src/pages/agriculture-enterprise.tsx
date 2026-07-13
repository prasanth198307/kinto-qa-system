import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function AgricultureEnterprisePage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [farmId, setFarmId] = useState("1");
  const [mandiForm, setMandiForm] = useState({ commodity: "", mandi_name: "", price_per_qt: "", date: "" });
  const [animalForm, setAnimalForm] = useState({ farmer_id: "", animal_type: "cattle", breed: "", tag_no: "" });
  const [milkForm, setMilkForm] = useState({ date: "", morning_yield: "", evening_yield: "" });
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);

  const { data: weather = {} as any } = useQuery({ queryKey: [`/api/agriculture/weather/farm/${farmId}`], queryFn: () => api('GET', `/api/agriculture/weather/farm/${farmId}`) });
  const { data: advisories = [] } = useQuery({ queryKey: ['/api/agriculture/weather/alerts'], queryFn: () => api('GET', '/api/agriculture/weather/alerts') });
  const { data: pmKisan = [] } = useQuery({ queryKey: ['/api/agriculture/schemes/pm-kisan'], queryFn: () => api('GET', '/api/agriculture/schemes/pm-kisan') });
  const { data: pmfby = [] } = useQuery({ queryKey: ['/api/agriculture/schemes/pmfby'], queryFn: () => api('GET', '/api/agriculture/schemes/pmfby') });
  const { data: fpoMembers = [] } = useQuery({ queryKey: ['/api/agriculture/fpo/members'], queryFn: () => api('GET', '/api/agriculture/fpo/members') });
  const [mandiSearch, setMandiSearch] = useState("");
  const { data: mandiResult = { prices: [] } } = useQuery({ queryKey: ['/api/agriculture/mandi/prices', mandiSearch], queryFn: () => api('GET', `/api/agriculture/mandi/prices${mandiSearch?`?commodity=${encodeURIComponent(mandiSearch)}`:''}`) });
  const mandiPrices = (mandiResult as any).prices || mandiResult || [];
  const { data: mandiCommodities = [] } = useQuery({ queryKey: ['/api/agriculture/mandi/commodities'], queryFn: () => api('GET', '/api/agriculture/mandi/commodities') });
  const { data: animals = [] } = useQuery({ queryKey: ['/api/agriculture/livestock/animals'], queryFn: () => api('GET', '/api/agriculture/livestock/animals') });

  const addMandi = useMutation({ mutationFn: (d: any) => api('POST', '/api/agriculture/mandi/prices', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/agriculture/mandi/prices'] }) });
  const addAnimal = useMutation({ mutationFn: (d: any) => api('POST', '/api/agriculture/livestock/animals', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/agriculture/livestock/animals'] }) });
  const addMilk = useMutation({ mutationFn: (d: any) => api('POST', `/api/agriculture/livestock/animals/${selectedAnimal?.id}/milk`, d) });

  const w = weather as any;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Agriculture Enterprise</h1>
      <Tabs defaultValue="weather">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="schemes">Govt Schemes</TabsTrigger>
          <TabsTrigger value="fpo">FPO</TabsTrigger>
          <TabsTrigger value="crops">Crop & Field</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="livestock">Livestock</TabsTrigger>
        </TabsList>

        <TabsContent value="weather">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Current Weather</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3"><Input value={farmId} onChange={e=>setFarmId(e.target.value)} className="w-20" /><Button size="sm" onClick={()=>qc.invalidateQueries({queryKey:[`/api/agriculture/weather/farm/${farmId}`]})}>Refresh</Button></div>
              {w.current ? <div className="grid grid-cols-2 gap-3">
                {[['Temperature',`${w.current.temperature}°C`],['Humidity',`${w.current.humidity}%`],['Rainfall',`${w.current.rainfall} mm`],['Wind',`${w.current.wind_speed} km/h`]].map(([l,v])=>(
                  <div key={l} className="p-3 bg-blue-50 rounded text-center"><div className="text-lg font-bold">{v}</div><div className="text-xs text-gray-500">{l}</div></div>
                ))}
              </div> : <p className="text-gray-400 text-center py-4">No weather data for farm {farmId}</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Weather Advisories</CardTitle></CardHeader>
            <CardContent>
              {(advisories as any[]).map((a:any,i:number)=><div key={i} className="p-3 mb-2 rounded border-l-4 border-orange-400 bg-orange-50"><div className="font-medium text-sm">{a.crop} — {a.condition}</div><div className="text-sm text-gray-600">{a.advisory_text}</div><Badge className="mt-1" variant={a.severity==='high'?'destructive':'secondary'}>{a.severity}</Badge></div>)}
              {(advisories as any[]).length===0&&<p className="text-gray-400 text-sm py-4">No active advisories</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="schemes">
          <Tabs defaultValue="pmkisan"><TabsList><TabsTrigger value="pmkisan">PM Kisan</TabsTrigger><TabsTrigger value="pmfby">PMFBY</TabsTrigger></TabsList>
          <TabsContent value="pmkisan"><Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Farmer</TableHead><TableHead>Registration</TableHead><TableHead>Installments</TableHead><TableHead>Last Amount</TableHead></TableRow></TableHeader>
            <TableBody>{(pmKisan as any[]).map((p:any)=><TableRow key={p.id}><TableCell>{p.farmer_name||p.farmer_id}</TableCell><TableCell>{p.registration_no}</TableCell><TableCell>{p.installments?.length||0}</TableCell><TableCell>{sym}{fmt(p.last_amount||2000)}</TableCell></TableRow>)}</TableBody></Table>
            {(pmKisan as any[]).length===0&&<p className="text-center text-gray-400 py-8">No PM Kisan records</p>}
          </CardContent></Card></TabsContent>
          <TabsContent value="pmfby"><Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Farmer</TableHead><TableHead>Crop</TableHead><TableHead>Area</TableHead><TableHead>Insured Amount</TableHead><TableHead>Premium</TableHead></TableRow></TableHeader>
            <TableBody>{(pmfby as any[]).map((p:any)=><TableRow key={p.id}><TableCell>{p.farmer_name||p.farmer_id}</TableCell><TableCell>{p.crop}</TableCell><TableCell>{p.area} acres</TableCell><TableCell>{sym}{fmt(p.insured_amount)}</TableCell><TableCell>{sym}{fmt(p.premium)}</TableCell></TableRow>)}</TableBody></Table>
            {(pmfby as any[]).length===0&&<p className="text-center text-gray-400 py-8">No PMFBY records</p>}
          </CardContent></Card></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="fpo">
          <Card><CardHeader><CardTitle>FPO Members</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Farmer</TableHead><TableHead>Shares</TableHead><TableHead>Share Value</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>{(fpoMembers as any[]).map((m:any)=><TableRow key={m.id}><TableCell>{m.farmer_name||m.farmer_id}</TableCell><TableCell>{m.share_qty}</TableCell><TableCell>{sym}{fmt(m.share_value)}</TableCell><TableCell>{m.joined_date?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
            {(fpoMembers as any[]).length===0&&<p className="text-center text-gray-400 py-8">No FPO members registered</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="crops">
          <Card><CardHeader><CardTitle>Crop & Field Management</CardTitle></CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm mb-3">Field mapping, crop calendars, spray schedules and irrigation planning</p>
            <div className="grid grid-cols-3 gap-3">
              {['Fields/Plots','Spray Schedule','Irrigation Plan','Activity Calendar','Harvest Planning','Multi-Season Compare'].map(f=>(
                <Card key={f} className="cursor-pointer hover:bg-gray-50"><CardContent className="pt-4 text-center text-sm font-medium">{f}</CardContent></Card>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="market">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mandi / Market Prices</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="Search commodity..." value={mandiSearch} onChange={e=>setMandiSearch(e.target.value)} className="w-48" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={()=>setMandiSearch('')}>All</Button>
                  {(mandiCommodities as string[]).slice(0,10).map((c:string)=><Button key={c} size="sm" variant={mandiSearch===c?'default':'outline'} onClick={()=>setMandiSearch(c)}>{c}</Button>)}
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead>Market</TableHead><TableHead>State</TableHead><TableHead>Min ${sym}/Qt</TableHead><TableHead>Max ${sym}/Qt</TableHead><TableHead>Modal ${sym}/Qt</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>{(mandiPrices as any[]).map((p:any,i:number)=><TableRow key={i}>
                    <TableCell className="font-medium">{p.commodity}</TableCell>
                    <TableCell>{p.market_name||p.mandi_name}</TableCell>
                    <TableCell>{p.state||'—'}</TableCell>
                    <TableCell>{sym}{fmt(p.min_price||p.price_per_qt)}</TableCell>
                    <TableCell>{sym}{fmt(p.max_price||p.price_per_qt)}</TableCell>
                    <TableCell className="font-bold text-green-700">{sym}{fmt(p.modal_price||p.price_per_qt)}</TableCell>
                    <TableCell className="text-xs">{(p.arrival_date||p.date)?.slice(0,10)||'—'}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
                {(mandiPrices as any[]).length===0&&<p className="text-sm text-gray-400 text-center py-4">Loading mandi prices...</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Add Mandi Price Manually</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Commodity" value={mandiForm.commodity} onChange={e=>setMandiForm({...mandiForm,commodity:e.target.value})} />
                <Input placeholder="Market/Mandi name" value={mandiForm.mandi_name} onChange={e=>setMandiForm({...mandiForm,mandi_name:e.target.value})} />
                <Input type="number" placeholder="Modal Price/Quintal" value={mandiForm.price_per_qt} onChange={e=>setMandiForm({...mandiForm,price_per_qt:e.target.value})} />
                <Input type="date" value={mandiForm.date} onChange={e=>setMandiForm({...mandiForm,date:e.target.value})} />
                <Button onClick={()=>api('POST','/api/agriculture/mandi/prices',{commodity:mandiForm.commodity,market_name:mandiForm.mandi_name,modal_price:Number(mandiForm.price_per_qt),arrival_date:mandiForm.date}).then(()=>qc.invalidateQueries({queryKey:['/api/agriculture/mandi/prices',mandiSearch]}))}>Add Price</Button>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="livestock">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Animal Records</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Type</TableHead><TableHead>Breed</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>{(animals as any[]).map((a:any)=><TableRow key={a.id}><TableCell>{a.tag_no}</TableCell><TableCell>{a.animal_type}</TableCell><TableCell>{a.breed}</TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>setSelectedAnimal(a)}>Milk Log</Button></TableCell></TableRow>)}</TableBody></Table>
              <div className="space-y-2 border-t pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Animal type" value={animalForm.animal_type} onChange={e=>setAnimalForm({...animalForm,animal_type:e.target.value})} />
                  <Input placeholder="Breed" value={animalForm.breed} onChange={e=>setAnimalForm({...animalForm,breed:e.target.value})} />
                </div>
                <Input placeholder="Tag number" value={animalForm.tag_no} onChange={e=>setAnimalForm({...animalForm,tag_no:e.target.value})} />
                <Button size="sm" onClick={()=>addAnimal.mutate(animalForm)}>Add Animal</Button>
              </div>
            </CardContent></Card>
            {selectedAnimal && <Card><CardHeader><CardTitle>Milk Log — {selectedAnimal.tag_no}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={milkForm.date} onChange={e=>setMilkForm({...milkForm,date:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Morning (L)</Label><Input type="number" value={milkForm.morning_yield} onChange={e=>setMilkForm({...milkForm,morning_yield:e.target.value})} /></div>
                <div><Label>Evening (L)</Label><Input type="number" value={milkForm.evening_yield} onChange={e=>setMilkForm({...milkForm,evening_yield:e.target.value})} /></div>
              </div>
              <Button onClick={()=>addMilk.mutate({...milkForm,morning_yield:Number(milkForm.morning_yield),evening_yield:Number(milkForm.evening_yield)}).then(()=>alert('Milk log saved!'))}>Save Milk Log</Button>
            </CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
