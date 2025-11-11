import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChecklistHistoryTable from "@/components/ChecklistHistoryTable";
import AdminChecklistBuilder from "@/components/AdminChecklistBuilder";
import { ManagerChecklistAssignment } from "@/components/ManagerChecklistAssignment";
import { useAuth } from "@/hooks/use-auth";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { ChecklistSubmission } from "@shared/schema";

export default function ChecklistsPage() {
  const { user, logoutMutation } = useAuth();
  const role = (user as any)?.role;

  // Fetch checklist submissions for history
  const { data: submissions = [] } = useQuery<ChecklistSubmission[]>({
    queryKey: ['/api/checklist-submissions'],
  });

  // Transform submissions to the format ChecklistHistoryTable expects
  const historyRecords = submissions.map(submission => ({
    id: submission.id,
    machine: submission.machineId || 'Unknown',
    date: submission.date ? format(new Date(submission.date), 'MMM dd, yyyy') : 'Unknown',
    shift: submission.shift || 'Unknown',
    operator: submission.operatorId || 'Unknown',
    status: submission.status as 'pending' | 'in_review' | 'approved' | 'rejected'
  }));

  return (
    <>
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 mt-16">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Checklists</h2>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          {(role === 'admin') && (
            <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          )}
          {(role === 'admin' || role === 'manager') && (
            <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
          )}
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        {(role === 'admin') && (
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checklist Templates</CardTitle>
                <CardDescription>
                  Create and manage checklist templates for different machines and processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminChecklistBuilder />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(role === 'admin' || role === 'manager') && (
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checklist Assignments</CardTitle>
                <CardDescription>
                  Assign checklists to operators and reviewers for execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManagerChecklistAssignment />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checklist History</CardTitle>
              <CardDescription>
                View completed checklists and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChecklistHistoryTable records={historyRecords} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}
