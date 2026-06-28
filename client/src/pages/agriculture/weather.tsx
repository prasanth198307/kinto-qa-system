import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function AgricultureWeatherPage() {
  const { data: weather } = useQuery({ queryKey: ["/api/agriculture/weather/farm/1"], queryFn: () => api("GET", "/api/agriculture/weather/farm/1") });
  const { data: advisories = [] } = useQuery({ queryKey: ["/api/agriculture/weather/advisories"], queryFn: () => api("GET", "/api/agriculture/weather/advisories") });

  const current = weather?.current || {};
  const forecast = weather?.forecast || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Weather & Advisory</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{current.temperature ?? "--"}°C</div><div className="text-sm text-muted-foreground">Temperature</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{current.humidity ?? "--"}%</div><div className="text-sm text-muted-foreground">Humidity</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{current.rainfall ?? "--"} mm</div><div className="text-sm text-muted-foreground">Rainfall</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{current.wind_speed ?? "--"} km/h</div><div className="text-sm text-muted-foreground">Wind Speed</div></CardContent></Card>
      </div>
      {current.last_updated && <p className="text-xs text-muted-foreground">Last updated: {current.last_updated}</p>}

      <Card>
        <CardHeader><CardTitle>7-Day Forecast</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Condition</TableHead><TableHead>Min °C</TableHead>
                <TableHead>Max °C</TableHead><TableHead>Rainfall (mm)</TableHead><TableHead>Wind (km/h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.map((f: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{f.date}</TableCell><TableCell>{f.condition}</TableCell>
                  <TableCell>{f.min_temp}</TableCell><TableCell>{f.max_temp}</TableCell>
                  <TableCell>{f.rainfall}</TableCell><TableCell>{f.wind_speed}</TableCell>
                </TableRow>
              ))}
              {forecast.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No forecast data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Advisories</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Crop</TableHead><TableHead>Advisory</TableHead><TableHead>Issued By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advisories.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.date}</TableCell><TableCell>{a.crop}</TableCell>
                  <TableCell>{a.advisory_text}</TableCell><TableCell>{a.issued_by}</TableCell>
                </TableRow>
              ))}
              {advisories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No advisories</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
