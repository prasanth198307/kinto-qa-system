import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Calendar, User, Package } from "lucide-react";
import { format } from "date-fns";

interface Gatepass {
  id: string;
  gatepassNumber: string;
  gatepassDate: string;
  vehicleNumber: string;
  driverName: string;
  transporterName: string | null;
  destination: string | null;
  status: string;
  casesCount: number | null;
  securitySealNo: string | null;
}

export default function VehicleExitRecording() {
  const { toast } = useToast();
  const [selectedGatepass, setSelectedGatepass] = useState<string | null>(null);
  const [outTime, setOutTime] = useState<string>("");
  const [verifiedBy, setVerifiedBy] = useState<string>("");

  const { data: gatepasses = [], isLoading } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  // Filter gatepasses with "generated" status
  const pendingGatepasses = gatepasses.filter((gp) => gp.status === "generated");

  const vehicleExitMutation = useMutation({
    mutationFn: async (data: { id: string; outTime: string; verifiedBy: string }) => {
      return await apiRequest('PATCH', `/api/gatepasses/${data.id}/vehicle-exit`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      toast({
        title: "Success",
        description: "Vehicle exit recorded successfully",
      });
      setSelectedGatepass(null);
      setOutTime("");
      setVerifiedBy("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record vehicle exit",
      });
    },
  });

  const handleRecordExit = () => {
    if (!selectedGatepass || !outTime || !verifiedBy) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields",
      });
      return;
    }

    vehicleExitMutation.mutate({
      id: selectedGatepass,
      outTime,
      verifiedBy,
    });
  };

  const selectedGatepassData = pendingGatepasses.find((gp) => gp.id === selectedGatepass);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Vehicle Exit Recording</h2>
        <p className="text-muted-foreground">Record when vehicles leave the plant with gatepasses</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Gatepasses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Gatepasses ({pendingGatepasses.length})
            </CardTitle>
            <CardDescription>Select a gatepass to record vehicle exit</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingGatepasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending gatepasses</p>
            ) : (
              <div className="space-y-2">
                {pendingGatepasses.map((gatepass) => (
                  <Card
                    key={gatepass.id}
                    className={`cursor-pointer transition-colors ${
                      selectedGatepass === gatepass.id
                        ? "border-primary bg-accent"
                        : "hover-elevate active-elevate-2"
                    }`}
                    onClick={() => setSelectedGatepass(gatepass.id)}
                    data-testid={`card-gatepass-${gatepass.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{gatepass.gatepassNumber}</div>
                          <Badge variant="secondary" data-testid={`badge-status-${gatepass.id}`}>
                            {gatepass.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Truck className="w-4 h-4" />
                          <span data-testid={`text-vehicle-${gatepass.id}`}>{gatepass.vehicleNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span data-testid={`text-driver-${gatepass.id}`}>{gatepass.driverName}</span>
                        </div>
                        {gatepass.casesCount && (
                          <div className="text-sm text-muted-foreground">
                            Cases: {gatepass.casesCount}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exit Recording Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Record Exit
            </CardTitle>
            <CardDescription>Verify and record vehicle departure time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedGatepassData ? (
              <>
                <div className="p-4 bg-muted rounded-md space-y-2">
                  <div className="font-semibold">{selectedGatepassData.gatepassNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    Vehicle: {selectedGatepassData.vehicleNumber}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Driver: {selectedGatepassData.driverName}
                  </div>
                  {selectedGatepassData.transporterName && (
                    <div className="text-sm text-muted-foreground">
                      Transporter: {selectedGatepassData.transporterName}
                    </div>
                  )}
                  {selectedGatepassData.securitySealNo && (
                    <div className="text-sm text-muted-foreground">
                      Seal No: {selectedGatepassData.securitySealNo}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="outTime">Exit Date & Time *</Label>
                  <Input
                    id="outTime"
                    type="datetime-local"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    data-testid="input-out-time"
                  />
                </div>

                <div>
                  <Label htmlFor="verifiedBy">Verified By (Security Person) *</Label>
                  <Input
                    id="verifiedBy"
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="Security guard name"
                    data-testid="input-verified-by"
                  />
                </div>

                <Button
                  onClick={handleRecordExit}
                  disabled={vehicleExitMutation.isPending}
                  className="w-full"
                  data-testid="button-record-exit"
                >
                  {vehicleExitMutation.isPending ? "Recording..." : "Record Vehicle Exit"}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a gatepass from the list to record vehicle exit
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
