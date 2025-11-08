import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Calendar, User, Package, CheckCircle, Pen } from "lucide-react";

interface Gatepass {
  id: string;
  gatepassNumber: string;
  gatepassDate: string;
  vehicleNumber: string;
  driverName: string;
  transporterName: string | null;
  destination: string | null;
  status: string;
  outTime: string | null;
  verifiedBy: string | null;
}

export default function ProofOfDelivery() {
  const { toast } = useToast();
  const [selectedGatepass, setSelectedGatepass] = useState<string | null>(null);
  const [podDate, setPodDate] = useState<string>("");
  const [podReceivedBy, setPodReceivedBy] = useState<string>("");
  const [podRemarks, setPodRemarks] = useState<string>("");
  const [podSignature, setPodSignature] = useState<string>("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 200;
    
    // Set drawing styles
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Fill with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [selectedGatepass]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    
    // Save signature as base64
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setPodSignature(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPodSignature("");
  };

  const { data: gatepasses = [], isLoading } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  // Filter gatepasses with "vehicle_out" status (ready for POD)
  const deliveryPendingGatepasses = gatepasses.filter((gp) => gp.status === "vehicle_out");

  const podMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      podDate: string;
      podReceivedBy: string;
      podRemarks?: string;
      podSignature?: string;
    }) => {
      return await apiRequest('PATCH', `/api/gatepasses/${data.id}/pod`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      toast({
        title: "Success",
        description: "Proof of delivery captured successfully",
      });
      setSelectedGatepass(null);
      setPodDate("");
      setPodReceivedBy("");
      setPodRemarks("");
      setPodSignature("");
      clearSignature();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to capture proof of delivery",
      });
    },
  });

  const handleCapturePOD = () => {
    if (!selectedGatepass || !podDate || !podReceivedBy) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields",
      });
      return;
    }

    if (!podSignature) {
      toast({
        variant: "destructive",
        title: "Signature Required",
        description: "Please capture the customer signature before submitting",
      });
      return;
    }

    podMutation.mutate({
      id: selectedGatepass,
      podDate,
      podReceivedBy,
      podRemarks: podRemarks.trim() || undefined,
      podSignature,
    });
  };

  const selectedGatepassData = deliveryPendingGatepasses.find((gp) => gp.id === selectedGatepass);

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
        <h2 className="text-2xl font-semibold">Proof of Delivery (POD)</h2>
        <p className="text-muted-foreground">Capture delivery confirmation and customer signatures</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Deliveries ({deliveryPendingGatepasses.length})
            </CardTitle>
            <CardDescription>Select a gatepass to capture proof of delivery</CardDescription>
          </CardHeader>
          <CardContent>
            {deliveryPendingGatepasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deliveries</p>
            ) : (
              <div className="space-y-2">
                {deliveryPendingGatepasses.map((gatepass) => (
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
                        {gatepass.destination && (
                          <div className="text-sm text-muted-foreground">
                            Destination: {gatepass.destination}
                          </div>
                        )}
                        {gatepass.outTime && (
                          <div className="text-sm text-muted-foreground">
                            Left at: {new Date(gatepass.outTime).toLocaleString()}
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

        {/* POD Capture Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Capture POD
            </CardTitle>
            <CardDescription>Record delivery confirmation details</CardDescription>
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
                  {selectedGatepassData.outTime && (
                    <div className="text-sm text-muted-foreground">
                      Left plant at: {new Date(selectedGatepassData.outTime).toLocaleString()}
                    </div>
                  )}
                  {selectedGatepassData.verifiedBy && (
                    <div className="text-sm text-muted-foreground">
                      Verified by: {selectedGatepassData.verifiedBy}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="podDate">Delivery Date & Time *</Label>
                  <Input
                    id="podDate"
                    type="datetime-local"
                    value={podDate}
                    onChange={(e) => setPodDate(e.target.value)}
                    data-testid="input-pod-date"
                  />
                </div>

                <div>
                  <Label htmlFor="podReceivedBy">Received By (Name) *</Label>
                  <Input
                    id="podReceivedBy"
                    type="text"
                    value={podReceivedBy}
                    onChange={(e) => setPodReceivedBy(e.target.value)}
                    placeholder="Customer name or signature"
                    data-testid="input-pod-received-by"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Name of person who received the delivery
                  </p>
                </div>

                <div>
                  <Label htmlFor="podRemarks">Remarks (Optional)</Label>
                  <Textarea
                    id="podRemarks"
                    value={podRemarks}
                    onChange={(e) => setPodRemarks(e.target.value)}
                    placeholder="Any delivery issues, breakage, short delivery, etc."
                    rows={4}
                    data-testid="input-pod-remarks"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Note any issues like breakage, short delivery, or other remarks
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Customer Signature *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                      data-testid="button-clear-signature"
                    >
                      <Pen className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-dashed rounded-md p-2">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="border rounded cursor-crosshair w-full touch-none"
                      style={{ maxWidth: '400px', height: '200px' }}
                      data-testid="canvas-signature"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Draw the customer's signature above
                  </p>
                </div>

                <Button
                  onClick={handleCapturePOD}
                  disabled={podMutation.isPending}
                  className="w-full"
                  data-testid="button-capture-pod"
                >
                  {podMutation.isPending ? "Capturing..." : "Capture Proof of Delivery"}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a gatepass from the list to capture proof of delivery
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
