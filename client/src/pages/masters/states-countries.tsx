import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const INDIAN_STATES = [
  { state_code: "AP", state_name: "Andhra Pradesh", gst_state_code: "37", region: "South" },
  { state_code: "AR", state_name: "Arunachal Pradesh", gst_state_code: "12", region: "Northeast" },
  { state_code: "AS", state_name: "Assam", gst_state_code: "18", region: "Northeast" },
  { state_code: "BR", state_name: "Bihar", gst_state_code: "10", region: "East" },
  { state_code: "CG", state_name: "Chhattisgarh", gst_state_code: "22", region: "Central" },
  { state_code: "GA", state_name: "Goa", gst_state_code: "30", region: "West" },
  { state_code: "GJ", state_name: "Gujarat", gst_state_code: "24", region: "West" },
  { state_code: "HR", state_name: "Haryana", gst_state_code: "06", region: "North" },
  { state_code: "HP", state_name: "Himachal Pradesh", gst_state_code: "02", region: "North" },
  { state_code: "JK", state_name: "Jammu & Kashmir", gst_state_code: "01", region: "North" },
  { state_code: "JH", state_name: "Jharkhand", gst_state_code: "20", region: "East" },
  { state_code: "KA", state_name: "Karnataka", gst_state_code: "29", region: "South" },
  { state_code: "KL", state_name: "Kerala", gst_state_code: "32", region: "South" },
  { state_code: "MP", state_name: "Madhya Pradesh", gst_state_code: "23", region: "Central" },
  { state_code: "MH", state_name: "Maharashtra", gst_state_code: "27", region: "West" },
  { state_code: "MN", state_name: "Manipur", gst_state_code: "14", region: "Northeast" },
  { state_code: "ML", state_name: "Meghalaya", gst_state_code: "17", region: "Northeast" },
  { state_code: "MZ", state_name: "Mizoram", gst_state_code: "15", region: "Northeast" },
  { state_code: "NL", state_name: "Nagaland", gst_state_code: "13", region: "Northeast" },
  { state_code: "OD", state_name: "Odisha", gst_state_code: "21", region: "East" },
  { state_code: "PB", state_name: "Punjab", gst_state_code: "03", region: "North" },
  { state_code: "RJ", state_name: "Rajasthan", gst_state_code: "08", region: "North" },
  { state_code: "SK", state_name: "Sikkim", gst_state_code: "11", region: "Northeast" },
  { state_code: "TN", state_name: "Tamil Nadu", gst_state_code: "33", region: "South" },
  { state_code: "TS", state_name: "Telangana", gst_state_code: "36", region: "South" },
  { state_code: "TR", state_name: "Tripura", gst_state_code: "16", region: "Northeast" },
  { state_code: "UP", state_name: "Uttar Pradesh", gst_state_code: "09", region: "North" },
  { state_code: "UK", state_name: "Uttarakhand", gst_state_code: "05", region: "North" },
  { state_code: "WB", state_name: "West Bengal", gst_state_code: "19", region: "East" },
  { state_code: "AN", state_name: "Andaman & Nicobar", gst_state_code: "35", region: "Island" },
  { state_code: "CH", state_name: "Chandigarh", gst_state_code: "04", region: "North" },
  { state_code: "DN", state_name: "Dadra & Nagar Haveli", gst_state_code: "26", region: "West" },
  { state_code: "DD", state_name: "Daman & Diu", gst_state_code: "25", region: "West" },
  { state_code: "DL", state_name: "Delhi", gst_state_code: "07", region: "North" },
  { state_code: "LD", state_name: "Lakshadweep", gst_state_code: "31", region: "Island" },
  { state_code: "PY", state_name: "Puducherry", gst_state_code: "34", region: "South" },
  { state_code: "LA", state_name: "Ladakh", gst_state_code: "38", region: "North" },
];

export default function MastersStatesCountriesPage() {
  const [tab, setTab] = useState<"states"|"countries">("states");
  const { data: countries = [] } = useQuery({ queryKey: ["/api/masters/countries"], queryFn: () => api("GET", "/api/masters/countries") });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">States & Countries</h1>
      <div className="flex gap-2">
        <Button variant={tab === "states" ? "default" : "outline"} onClick={() => setTab("states")}>Indian States</Button>
        <Button variant={tab === "countries" ? "default" : "outline"} onClick={() => setTab("countries")}>Countries</Button>
      </div>
      {tab === "states" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>State Code</TableHead><TableHead>State Name</TableHead><TableHead>GST State Code</TableHead><TableHead>Region</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {INDIAN_STATES.map(s => (
                  <TableRow key={s.state_code}>
                    <TableCell>{s.state_code}</TableCell><TableCell>{s.state_name}</TableCell>
                    <TableCell>{s.gst_state_code}</TableCell><TableCell>{s.region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {tab === "countries" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Currency</TableHead><TableHead>Phone Code</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {Array.isArray(countries) && countries.map((c: any) => (
                  <TableRow key={c.code}>
                    <TableCell>{c.code}</TableCell><TableCell>{c.name}</TableCell>
                    <TableCell>{c.currency}</TableCell><TableCell>{c.phone_code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
