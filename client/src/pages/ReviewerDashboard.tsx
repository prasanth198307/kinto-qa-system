import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import type { ChecklistSubmission, SubmissionTask, User, ChecklistTemplate, Machine } from "@shared/schema";

export default function ReviewerDashboard() {
  const [selectedSubmission, setSelectedSubmission] = useState<ChecklistSubmission | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject', id: string } | null>(null);
  const { toast } = useToast();

  const { data: currentUser } = useQuery<User>({ queryKey: ['/api/auth/user'] });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<ChecklistSubmission[]>({
    queryKey: ['/api/checklist-submissions'],
    enabled: !!currentUser?.id,
    select: (data) => data.filter(s => s.reviewerId === currentUser?.id),
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const { data: selectedSubmissionTasks = [] } = useQuery<SubmissionTask[]>({
    queryKey: ['/api/checklist-submissions', selectedSubmission?.id, 'tasks'],
    enabled: !!selectedSubmission?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, reviewedAt, approvedAt }: { id: string, status: string, reviewedAt?: Date, approvedAt?: Date }) =>
      apiRequest(`/api/checklist-submissions/${id}`, 'PATCH', { status, reviewedAt, approvedAt }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-submissions'] });
      const action = variables.status === 'approved' ? 'approved' : 'rejected';
      toast({ title: "Success", description: `Checklist ${action} successfully` });
      setIsDetailDialogOpen(false);
      setSelectedSubmission(null);
      setConfirmAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive"
      });
      setConfirmAction(null);
    },
  });

  const handleViewDetails = (submission: ChecklistSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedSubmission) return;
    setConfirmAction({ type: 'approve', id: selectedSubmission.id });
  };

  const handleReject = () => {
    if (!selectedSubmission) return;
    setConfirmAction({ type: 'reject', id: selectedSubmission.id });
  };

  const confirmActionHandler = () => {
    if (!confirmAction) return;
    
    const now = new Date();
    if (confirmAction.type === 'approve') {
      updateMutation.mutate({
        id: confirmAction.id,
        status: 'approved',
        approvedAt: now,
        reviewedAt: now,
      });
    } else {
      updateMutation.mutate({
        id: confirmAction.id,
        status: 'rejected',
        reviewedAt: now,
      });
    }
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "N/A";
    const user = usersData.find((u: any) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown";
  };

  const getTemplateName = (templateId: string | null | undefined) => {
    if (!templateId) return "Unknown";
    const template = templates.find((t) => t.id === templateId);
    return template?.name || "Unknown";
  };

  const getMachineName = (machineId: string | null | undefined) => {
    if (!machineId) return "Unknown";
    const machine = machines.find((m) => m.id === machineId);
    return machine?.name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: "default" | "secondary" | "destructive" | "outline", className: string } } = {
      pending: { variant: "outline", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      approved: { variant: "outline", className: "bg-green-100 text-green-800 border-green-300" },
      rejected: { variant: "outline", className: "bg-red-100 text-red-800 border-red-300" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

  const renderSubmissionCard = (submission: ChecklistSubmission) => (
    <Card key={submission.id} className="hover-elevate" data-testid={`card-submission-${submission.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {getTemplateName(submission.templateId)}
          </CardTitle>
          {getStatusBadge(submission.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Machine:</span>
            <p className="font-medium" data-testid={`text-machine-${submission.id}`}>{getMachineName(submission.machineId)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Operator:</span>
            <p className="font-medium" data-testid={`text-operator-${submission.id}`}>{getUserName(submission.operatorId)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium" data-testid={`text-date-${submission.id}`}>
              {submission.date ? format(new Date(submission.date), "MMM dd, yyyy") : "N/A"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Shift:</span>
            <p className="font-medium" data-testid={`text-shift-${submission.id}`}>{submission.shift || "N/A"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => handleViewDetails(submission)}
          data-testid={`button-view-details-${submission.id}`}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  if (submissionsLoading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Reviewer Dashboard</h2>
        <p className="text-muted-foreground">Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Reviewer Dashboard</h2>

      <Tabs defaultValue="pending" data-testid="tabs-submissions">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Review ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" data-testid="tab-reviewed">
            Reviewed ({reviewedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({submissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground" data-testid="text-empty-pending">
                No submissions pending review
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSubmissions.map(renderSubmissionCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4 mt-4">
          {reviewedSubmissions.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground" data-testid="text-empty-reviewed">
                No reviewed submissions
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewedSubmissions.map(renderSubmissionCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {submissions.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground" data-testid="text-empty-all">
                No submissions assigned to you
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map(renderSubmissionCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail View Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-submission-details">
          <DialogHeader>
            <DialogTitle>
              Submission Details: {selectedSubmission && getTemplateName(selectedSubmission.templateId)}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              {/* Submission Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Machine:</span>
                  <p className="font-medium">{getMachineName(selectedSubmission.machineId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Operator:</span>
                  <p className="font-medium">{getUserName(selectedSubmission.operatorId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {selectedSubmission.date ? format(new Date(selectedSubmission.date), "MMM dd, yyyy HH:mm") : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shift:</span>
                  <p className="font-medium">{selectedSubmission.shift || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Supervisor:</span>
                  <p className="font-medium" data-testid="text-supervisor">{selectedSubmission.supervisorName || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                </div>
              </div>

              {/* General Remarks */}
              {selectedSubmission.generalRemarks && (
                <div>
                  <span className="text-sm text-muted-foreground">General Remarks:</span>
                  <p className="text-sm mt-1" data-testid="text-general-remarks">{selectedSubmission.generalRemarks}</p>
                </div>
              )}

              {/* Signature */}
              {selectedSubmission.signatureData && (
                <div>
                  <span className="text-sm text-muted-foreground">Operator Signature:</span>
                  <div className="mt-1 border rounded-lg p-2 bg-muted" data-testid="signature-display">
                    <img
                      src={selectedSubmission.signatureData}
                      alt="Signature"
                      className="max-h-24 mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Submission Tasks */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Task Results</h3>
                <div className="space-y-2">
                  {selectedSubmissionTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks found</p>
                  ) : (
                    selectedSubmissionTasks.map((task, index) => (
                      <Card key={task.id} className="p-3" data-testid={`task-${index}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{task.taskName}</p>
                            {task.remarks && (
                              <p className="text-sm text-muted-foreground mt-1">{task.remarks}</p>
                            )}
                          </div>
                          <Badge
                            variant={task.result === 'pass' ? 'outline' : 'destructive'}
                            className={task.result === 'pass' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                            data-testid={`badge-task-result-${index}`}
                          >
                            {task.result || 'N/A'}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedSubmission?.status === 'pending' && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={updateMutation.isPending}
                  data-testid="button-reject"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={updateMutation.isPending}
                  data-testid="button-approve"
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
            {selectedSubmission?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} data-testid="button-close">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent data-testid="dialog-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'approve' ? 'Approve Checklist' : 'Reject Checklist'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.type} this checklist submission?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActionHandler}
              data-testid="button-confirm-action"
              className={confirmAction?.type === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
