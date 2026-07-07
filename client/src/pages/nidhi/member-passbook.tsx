import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Printer } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const PDC_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  presented: "default",
  cleared: "outline",
  bounced: "destructive",
};

interface Member {
  id: number;
  name: string;
  member_no: string;
  account_no: string;
  share_capital: number;
  phone: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface PDC {
  id: number;
  cheque_no: string;
  bank: string;
  amount: number;
  instrument_date: string;
  status: string;
}

export default function MemberPassbookPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [memberId, setMemberId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["nidhi-members-list"],
    queryFn: () => api("GET", "/api/nidhi-company/members").catch(() => []),
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["nidhi-passbook", memberId],
    queryFn: () => api("GET", `/api/nidhi-company/members/${memberId}/passbook`).catch(() => []),
    enabled: !!memberId,
  });

  const { data: pdcList = [] } = useQuery<PDC[]>({
    queryKey: ["nidhi-pdc-member", memberId],
    queryFn: () => api("GET", `/api/nidhi-company/pdc?member_id=${memberId}`).catch(() => []),
    enabled: !!memberId,
  });

  const { data: summary } = useQuery<{ total_deposits: number; outstanding_loans: number; emi_due: number }>({
    queryKey: ["nidhi-member-summary", memberId],
    queryFn: () => api("GET", `/api/nidhi-company/members/${memberId}/summary`).catch(() => ({ total_deposits: 0, outstanding_loans: 0, emi_due: 0 })),
    enabled: !!memberId,
  });

  const presentMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/nidhi-company/pdc/${id}/present`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-pdc-member"] }); toast({ title: "Cheque presented" }); },
  });

  const handleMemberSelect = (id: string) => {
    setMemberId(id);
    const m = members.find(m => String(m.id) === id);
    setSelectedMember(m || null);
  };

  const downloadPassbook = () => {
    window.open(`/api/nidhi-company/members/${memberId}/passbook/pdf`, "_blank");
  };

  const filteredMembers = memberSearch
    ? members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.member_no?.includes(memberSearch))
    : members;

  const txRows: Transaction[] = Array.isArray(transactions) ? transactions : [];
  const pdcRows: PDC[] = Array.isArray(pdcList) ? pdcList : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Member Passbook</h1>
        {memberId && (
          <Button onClick={downloadPassbook}>
            <Download className="h-4 w-4 mr-2" />Print Passbook
          </Button>
        )}
      </div>

      {/* Member Search */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-3">
            <Input placeholder="Search member by name or member no..." value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)} className="flex-1" />
            <Select value={memberId} onValueChange={handleMemberSelect}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {filteredMembers.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name} — {m.member_no}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <div className="grid grid-cols-4 gap-4 bg-muted/50 rounded p-4">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-semibold">{selectedMember.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Member No</div>
                <div className="font-semibold">{selectedMember.member_no}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Account No</div>
                <div className="font-semibold">{selectedMember.account_no}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Share Capital</div>
                <div className="font-semibold">₹{Number(selectedMember.share_capital || 0).toLocaleString()}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Deposits</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">₹{Number(summary.total_deposits || 0).toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Loans</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">₹{Number(summary.outstanding_loans || 0).toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">EMI Due This Month</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-yellow-600">₹{Number(summary.emi_due || 0).toLocaleString()}</p></CardContent>
          </Card>
        </div>
      )}

      {memberId && (
        <Tabs defaultValue="passbook">
          <TabsList>
            <TabsTrigger value="passbook">Passbook</TabsTrigger>
            <TabsTrigger value="pdc">PDC Cheques</TabsTrigger>
          </TabsList>

          <TabsContent value="passbook">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction History</CardTitle>
                  <Button variant="outline" size="sm" onClick={downloadPassbook}>
                    <Printer className="h-4 w-4 mr-2" />Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txRows.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                    ) : txRows.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {tx.debit ? `₹${Number(tx.debit).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {tx.credit ? `₹${Number(tx.credit).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{Number(tx.balance).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pdc">
            <Card>
              <CardHeader><CardTitle>Post-Dated Cheques</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cheque No</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdcRows.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No PDC cheques</TableCell></TableRow>
                    ) : pdcRows.map(pdc => (
                      <TableRow key={pdc.id}>
                        <TableCell>{pdc.cheque_no}</TableCell>
                        <TableCell>{pdc.bank}</TableCell>
                        <TableCell>₹{Number(pdc.amount).toLocaleString()}</TableCell>
                        <TableCell>{pdc.instrument_date}</TableCell>
                        <TableCell>
                          <Badge variant={PDC_STATUS_VARIANT[pdc.status?.toLowerCase()] || "secondary"} className="capitalize">
                            {pdc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pdc.status?.toLowerCase() === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => presentMut.mutate(pdc.id)}>
                              Present
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
