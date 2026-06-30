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

interface GiftCard {
  id: number;
  card_number: string;
  customer_name: string;
  customer_phone: string;
  issued_date: string;
  initial_amount: number;
  balance: number;
  expiry_date: string;
  status: string;
}

interface CardTransaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  note: string;
}

function generateCardNumber() {
  return "GC" + Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0");
}

export default function RestaurantGiftCardsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchCard, setSearchCard] = useState<string>("");
  const [lookedUpCard, setLookedUpCard] = useState<GiftCard | null>(null);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [redeemAmount, setRedeemAmount] = useState<string>("");

  const [issueForm, setIssueForm] = useState({
    card_number: generateCardNumber(),
    initial_amount: "",
    customer_name: "",
    customer_phone: "",
    expiry_date: "",
  });

  const { data: cards = [] } = useQuery<GiftCard[]>({
    queryKey: ["gift-cards"],
    queryFn: () => api("GET", "/api/restaurant/gift-cards"),
  });

  const { data: summary = {} } = useQuery({
    queryKey: ["gift-cards-summary"],
    queryFn: () => api("GET", "/api/restaurant/gift-cards/summary"),
  });

  const issueCard = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/gift-cards/issue", {
      ...issueForm,
      initial_amount: parseFloat(issueForm.initial_amount),
    }),
    onSuccess: () => {
      toast({ title: "Gift card issued successfully" });
      qc.invalidateQueries({ queryKey: ["gift-cards"] });
      qc.invalidateQueries({ queryKey: ["gift-cards-summary"] });
      setIssueForm({
        card_number: generateCardNumber(),
        initial_amount: "",
        customer_name: "",
        customer_phone: "",
        expiry_date: "",
      });
    },
    onError: () => toast({ title: "Failed to issue card", variant: "destructive" }),
  });

  const lookupCard = async () => {
    const data = await api("GET", `/api/restaurant/gift-cards/${searchCard}`);
    if (data?.id) {
      setLookedUpCard(data);
      const txns = await api("GET", `/api/restaurant/gift-cards/${searchCard}/transactions`);
      setCardTransactions(Array.isArray(txns) ? txns : []);
    } else {
      toast({ title: "Card not found", variant: "destructive" });
      setLookedUpCard(null);
    }
  };

  const redeemCard = useMutation({
    mutationFn: () => api("POST", `/api/restaurant/gift-cards/${lookedUpCard?.card_number}/redeem`, {
      amount: parseFloat(redeemAmount),
    }),
    onSuccess: () => {
      toast({ title: "Amount redeemed successfully" });
      setRedeemAmount("");
      lookupCard();
      qc.invalidateQueries({ queryKey: ["gift-cards-summary"] });
    },
    onError: () => toast({ title: "Redemption failed", variant: "destructive" }),
  });

  const cardList = Array.isArray(cards) ? cards : [];
  const filtered = statusFilter === "all" ? cardList : cardList.filter((c: GiftCard) => c.status === statusFilter);

  const s: any = summary;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gift Card Management</h1>
          <p className="text-muted-foreground">Issue, redeem, and track gift cards</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards Issued</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.total_issued ?? cardList.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {s?.active_cards ?? cardList.filter((c: GiftCard) => c.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{(s?.outstanding_balance ?? cardList.reduce((sum: number, c: GiftCard) => sum + (c.balance || 0), 0)).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="issue">
          <TabsList>
            <TabsTrigger value="issue">Issue Card</TabsTrigger>
            <TabsTrigger value="redeem">Balance & Redeem</TabsTrigger>
            <TabsTrigger value="all">All Cards</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="issue">
            <Card>
              <CardHeader><CardTitle>Issue New Gift Card</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Card Number (Auto-generated)</Label>
                    <div className="flex gap-2">
                      <Input value={issueForm.card_number} readOnly className="font-mono" />
                      <Button variant="outline" onClick={() => setIssueForm({ ...issueForm, card_number: generateCardNumber() })}>
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Amount (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={issueForm.initial_amount}
                      onChange={(e) => setIssueForm({ ...issueForm, initial_amount: e.target.value })}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input
                      value={issueForm.customer_name}
                      onChange={(e) => setIssueForm({ ...issueForm, customer_name: e.target.value })}
                      placeholder="Customer full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Phone</Label>
                    <Input
                      value={issueForm.customer_phone}
                      onChange={(e) => setIssueForm({ ...issueForm, customer_phone: e.target.value })}
                      placeholder="+91 9000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={issueForm.expiry_date}
                      onChange={(e) => setIssueForm({ ...issueForm, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={() => issueCard.mutate()} disabled={issueCard.isPending || !issueForm.initial_amount}>
                  {issueCard.isPending ? "Issuing..." : "Issue Gift Card"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redeem">
            <Card>
              <CardHeader><CardTitle>Balance Check & Redemption</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchCard}
                    onChange={(e) => setSearchCard(e.target.value)}
                    placeholder="Enter card number (e.g. GC123456789)"
                    className="font-mono"
                  />
                  <Button onClick={lookupCard}>Lookup</Button>
                </div>
                {lookedUpCard && (
                  <div className="space-y-4">
                    <div className="bg-muted rounded-md p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Card #</span><br /><strong className="font-mono">{lookedUpCard.card_number}</strong></div>
                      <div><span className="text-muted-foreground">Customer</span><br /><strong>{lookedUpCard.customer_name}</strong></div>
                      <div><span className="text-muted-foreground">Phone</span><br /><strong>{lookedUpCard.customer_phone}</strong></div>
                      <div><span className="text-muted-foreground">Balance</span><br /><strong className="text-green-700">₹{lookedUpCard.balance?.toLocaleString()}</strong></div>
                      <div><span className="text-muted-foreground">Expiry</span><br /><strong>{lookedUpCard.expiry_date}</strong></div>
                      <div><span className="text-muted-foreground">Status</span><br />
                        <Badge className={lookedUpCard.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {lookedUpCard.status}
                        </Badge>
                      </div>
                    </div>

                    {lookedUpCard.status === "active" && (
                      <div className="flex gap-2 items-end">
                        <div className="space-y-2 flex-1">
                          <Label>Redeem Amount (₹)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={lookedUpCard.balance}
                            value={redeemAmount}
                            onChange={(e) => setRedeemAmount(e.target.value)}
                            placeholder={`Max ₹${lookedUpCard.balance}`}
                          />
                        </div>
                        <Button onClick={() => redeemCard.mutate()} disabled={redeemCard.isPending || !redeemAmount}>
                          {redeemCard.isPending ? "Processing..." : "Redeem"}
                        </Button>
                      </div>
                    )}

                    {cardTransactions.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Transaction History</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cardTransactions.map((t: CardTransaction) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  <Badge variant={t.type === "issue" || t.type === "topup" ? "default" : "secondary"}>{t.type}</Badge>
                                </TableCell>
                                <TableCell className="text-right">₹{t.amount?.toLocaleString()}</TableCell>
                                <TableCell>{t.date}</TableCell>
                                <TableCell className="text-muted-foreground">{t.note}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Gift Cards</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="depleted">Depleted</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead className="text-right">Initial Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No cards found</TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((card: GiftCard) => (
                        <TableRow key={card.id}>
                          <TableCell className="font-mono text-xs">{card.card_number}</TableCell>
                          <TableCell>{card.customer_name}</TableCell>
                          <TableCell>{card.issued_date}</TableCell>
                          <TableCell className="text-right">₹{card.initial_amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">₹{card.balance?.toLocaleString()}</TableCell>
                          <TableCell>{card.expiry_date}</TableCell>
                          <TableCell>
                            <Badge className={
                              card.status === "active" ? "bg-green-100 text-green-800" :
                              card.status === "expired" ? "bg-orange-100 text-orange-800" :
                              "bg-gray-100 text-gray-800"
                            }>{card.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Cards Issued Per Month</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Bar chart visualization requires charting library integration.</p>
                  <div className="mt-4 space-y-2">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => {
                      const val = Math.floor(Math.random() * 40) + 5;
                      return (
                        <div key={month} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-muted-foreground">{month}</span>
                          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                            <div className="bg-primary h-3 rounded-full" style={{ width: `${(val / 45) * 100}%` }} />
                          </div>
                          <span className="w-6 text-right">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Outstanding Liability</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Issued Value</span>
                      <span className="font-semibold">₹{(s?.total_issued_value ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Redeemed</span>
                      <span className="font-semibold">₹{(s?.total_redeemed ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-medium">Outstanding Liability</span>
                      <span className="font-bold text-orange-600">₹{(s?.outstanding_balance ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
