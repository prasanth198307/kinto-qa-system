import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Truck, User, Car, Phone, Mail, MapPin, FileText, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Transporter {
  id: string;
  transporterCode: string;
  transporterName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  isActive: number;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string | null;
  capacity: string | null;
  transporterId: string | null;
  transporterName: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  insuranceExpiry: string | null;
  fitnessExpiry: string | null;
  permitExpiry: string | null;
  isActive: number;
}

interface Driver {
  id: string;
  driverCode: string;
  driverName: string;
  phone: string;
  alternatePhone: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  address: string | null;
  transporterId: string | null;
  transporterName: string | null;
  isActive: number;
}

export default function DispatchMasters() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("transporters");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dispatch Master Data</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="transporters" data-testid="tab-transporters">
            <Truck className="w-4 h-4 mr-2" />
            Transporters
          </TabsTrigger>
          <TabsTrigger value="vehicles" data-testid="tab-vehicles">
            <Car className="w-4 h-4 mr-2" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="drivers" data-testid="tab-drivers">
            <User className="w-4 h-4 mr-2" />
            Drivers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transporters">
          <TransportersTab />
        </TabsContent>
        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="drivers">
          <DriversTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransportersTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transporter | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Transporter | null>(null);

  const [formData, setFormData] = useState({
    transporterCode: "",
    transporterName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    panNumber: "",
    isActive: 1,
  });

  const { data: items, isLoading } = useQuery<Transporter[]>({
    queryKey: ['/api/transporters'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/transporters', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transporters'] });
      toast({ title: "Transporter created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create transporter", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/transporters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transporters'] });
      toast({ title: "Transporter updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update transporter", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/transporters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transporters'] });
      toast({ title: "Transporter deleted successfully" });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete transporter", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      transporterCode: "",
      transporterName: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstNumber: "",
      panNumber: "",
      isActive: 1,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Transporter) => {
    setEditingItem(item);
    setFormData({
      transporterCode: item.transporterCode,
      transporterName: item.transporterName,
      contactPerson: item.contactPerson || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      gstNumber: item.gstNumber || "",
      panNumber: item.panNumber || "",
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Transporters
        </CardTitle>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" data-testid="button-add-transporter">
          <Plus className="w-4 h-4 mr-2" /> Add Transporter
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !items?.length ? (
          <div className="text-center py-8 text-muted-foreground">No transporters found. Add your first transporter.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`row-transporter-${item.id}`}>
                  <TableCell className="font-mono">{item.transporterCode}</TableCell>
                  <TableCell className="font-medium">{item.transporterName}</TableCell>
                  <TableCell>{item.contactPerson || "-"}</TableCell>
                  <TableCell>{item.phone || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.gstNumber || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} data-testid={`button-edit-transporter-${item.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(item); setDeleteConfirmOpen(true); }} data-testid={`button-delete-transporter-${item.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Transporter" : "Add Transporter"}</DialogTitle>
            <DialogDescription>Enter transporter details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transporterCode">Code *</Label>
                <Input id="transporterCode" value={formData.transporterCode} onChange={(e) => setFormData({ ...formData, transporterCode: e.target.value.toUpperCase() })} required data-testid="input-transporter-code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transporterName">Name *</Label>
                <Input id="transporterName" value={formData.transporterName} onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })} required data-testid="input-transporter-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} data-testid="input-contact-person" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} data-testid="input-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input id="gstNumber" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} maxLength={15} data-testid="input-gst" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input id="panNumber" value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })} maxLength={10} data-testid="input-pan" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive === 1} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? 1 : 0 })} data-testid="switch-active" />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-transporter">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transporter?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the transporter as inactive. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function VehiclesTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "",
    capacity: "",
    transporterId: "",
    ownerName: "",
    ownerPhone: "",
    insuranceExpiry: "",
    fitnessExpiry: "",
    permitExpiry: "",
    isActive: 1,
  });

  const { data: items, isLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
  });

  const { data: transporters } = useQuery<Transporter[]>({
    queryKey: ['/api/transporters'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: "Vehicle created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create vehicle", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: "Vehicle updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update vehicle", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: "Vehicle deleted successfully" });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete vehicle", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      transporterId: "",
      ownerName: "",
      ownerPhone: "",
      insuranceExpiry: "",
      fitnessExpiry: "",
      permitExpiry: "",
      isActive: 1,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Vehicle) => {
    setEditingItem(item);
    setFormData({
      vehicleNumber: item.vehicleNumber,
      vehicleType: item.vehicleType || "",
      capacity: item.capacity || "",
      transporterId: item.transporterId || "",
      ownerName: item.ownerName || "",
      ownerPhone: item.ownerPhone || "",
      insuranceExpiry: item.insuranceExpiry || "",
      fitnessExpiry: item.fitnessExpiry || "",
      permitExpiry: item.permitExpiry || "",
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      transporterId: formData.transporterId || null,
      insuranceExpiry: formData.insuranceExpiry || null,
      fitnessExpiry: formData.fitnessExpiry || null,
      permitExpiry: formData.permitExpiry || null,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          Vehicles
        </CardTitle>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" data-testid="button-add-vehicle">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !items?.length ? (
          <div className="text-center py-8 text-muted-foreground">No vehicles found. Add your first vehicle.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Fitness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`row-vehicle-${item.id}`}>
                  <TableCell className="font-mono font-medium">{item.vehicleNumber}</TableCell>
                  <TableCell>{item.vehicleType || "-"}</TableCell>
                  <TableCell>{item.capacity || "-"}</TableCell>
                  <TableCell>{item.transporterName || "-"}</TableCell>
                  <TableCell>
                    {item.insuranceExpiry ? (
                      <span className={isExpired(item.insuranceExpiry) ? "text-red-600" : isExpiringSoon(item.insuranceExpiry) ? "text-orange-500" : ""}>
                        {format(new Date(item.insuranceExpiry), "dd/MM/yyyy")}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {item.fitnessExpiry ? (
                      <span className={isExpired(item.fitnessExpiry) ? "text-red-600" : isExpiringSoon(item.fitnessExpiry) ? "text-orange-500" : ""}>
                        {format(new Date(item.fitnessExpiry), "dd/MM/yyyy")}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} data-testid={`button-edit-vehicle-${item.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(item); setDeleteConfirmOpen(true); }} data-testid={`button-delete-vehicle-${item.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
            <DialogDescription>Enter vehicle details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input id="vehicleNumber" value={formData.vehicleNumber} onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })} required placeholder="AP09AB1234" data-testid="input-vehicle-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
                  <SelectTrigger data-testid="select-vehicle-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Mini-Truck">Mini-Truck</SelectItem>
                    <SelectItem value="Tempo">Tempo</SelectItem>
                    <SelectItem value="Pickup">Pickup</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} placeholder="e.g., 10 Ton, 500 cases" data-testid="input-capacity" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transporterId">Transporter</Label>
                <Select value={formData.transporterId} onValueChange={(value) => setFormData({ ...formData, transporterId: value })}>
                  <SelectTrigger data-testid="select-transporter">
                    <SelectValue placeholder="Select transporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.transporterName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input id="ownerName" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} data-testid="input-owner-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <Input id="ownerPhone" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} data-testid="input-owner-phone" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                <Input id="insuranceExpiry" type="date" value={formData.insuranceExpiry} onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })} data-testid="input-insurance-expiry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fitnessExpiry">Fitness Expiry</Label>
                <Input id="fitnessExpiry" type="date" value={formData.fitnessExpiry} onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })} data-testid="input-fitness-expiry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permitExpiry">Permit Expiry</Label>
                <Input id="permitExpiry" type="date" value={formData.permitExpiry} onChange={(e) => setFormData({ ...formData, permitExpiry: e.target.value })} data-testid="input-permit-expiry" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive === 1} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? 1 : 0 })} data-testid="switch-vehicle-active" />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-vehicle">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the vehicle as inactive. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DriversTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Driver | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);

  const [formData, setFormData] = useState({
    driverCode: "",
    driverName: "",
    phone: "",
    alternatePhone: "",
    licenseNumber: "",
    licenseExpiry: "",
    address: "",
    transporterId: "",
    isActive: 1,
  });

  const { data: items, isLoading } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
  });

  const { data: transporters } = useQuery<Transporter[]>({
    queryKey: ['/api/transporters'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/drivers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: "Driver created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create driver", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/drivers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: "Driver updated successfully" });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update driver", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/drivers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({ title: "Driver deleted successfully" });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete driver", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      driverCode: "",
      driverName: "",
      phone: "",
      alternatePhone: "",
      licenseNumber: "",
      licenseExpiry: "",
      address: "",
      transporterId: "",
      isActive: 1,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Driver) => {
    setEditingItem(item);
    setFormData({
      driverCode: item.driverCode,
      driverName: item.driverName,
      phone: item.phone,
      alternatePhone: item.alternatePhone || "",
      licenseNumber: item.licenseNumber || "",
      licenseExpiry: item.licenseExpiry || "",
      address: item.address || "",
      transporterId: item.transporterId || "",
      isActive: item.isActive,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      transporterId: formData.transporterId || null,
      licenseExpiry: formData.licenseExpiry || null,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Drivers
        </CardTitle>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" data-testid="button-add-driver">
          <Plus className="w-4 h-4 mr-2" /> Add Driver
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !items?.length ? (
          <div className="text-center py-8 text-muted-foreground">No drivers found. Add your first driver.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License No.</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} data-testid={`row-driver-${item.id}`}>
                  <TableCell className="font-mono">{item.driverCode}</TableCell>
                  <TableCell className="font-medium">{item.driverName}</TableCell>
                  <TableCell>{item.phone}</TableCell>
                  <TableCell className="font-mono text-xs">{item.licenseNumber || "-"}</TableCell>
                  <TableCell>
                    {item.licenseExpiry ? (
                      <span className={isExpired(item.licenseExpiry) ? "text-red-600" : isExpiringSoon(item.licenseExpiry) ? "text-orange-500" : ""}>
                        {format(new Date(item.licenseExpiry), "dd/MM/yyyy")}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{item.transporterName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} data-testid={`button-edit-driver-${item.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(item); setDeleteConfirmOpen(true); }} data-testid={`button-delete-driver-${item.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Driver" : "Add Driver"}</DialogTitle>
            <DialogDescription>Enter driver details below</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverCode">Code *</Label>
                <Input id="driverCode" value={formData.driverCode} onChange={(e) => setFormData({ ...formData, driverCode: e.target.value.toUpperCase() })} required placeholder="DRV001" data-testid="input-driver-code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverName">Name *</Label>
                <Input id="driverName" value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} required data-testid="input-driver-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required data-testid="input-driver-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input id="alternatePhone" value={formData.alternatePhone} onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })} data-testid="input-alt-phone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input id="licenseNumber" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })} data-testid="input-license-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input id="licenseExpiry" type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} data-testid="input-license-expiry" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transporterId">Transporter</Label>
              <Select value={formData.transporterId} onValueChange={(value) => setFormData({ ...formData, transporterId: value })}>
                <SelectTrigger data-testid="select-driver-transporter">
                  <SelectValue placeholder="Select transporter" />
                </SelectTrigger>
                <SelectContent>
                  {transporters?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.transporterName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} data-testid="input-driver-address" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={formData.isActive === 1} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? 1 : 0 })} data-testid="switch-driver-active" />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-driver">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the driver as inactive. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
