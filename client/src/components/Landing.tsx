import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Shield, CheckCircle, User, Wrench } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <ClipboardCheck className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold" data-testid="text-welcome">
            KINTO QA System
          </h1>
          <p className="text-lg text-muted-foreground">
            Quality Assurance & Preventive Maintenance Management
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="font-semibold text-sm">Daily Checklists</h3>
          </Card>
          
          <Card className="p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h3 className="font-semibold text-sm">Approval Workflow</h3>
          </Card>
          
          <Card className="p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <h3 className="font-semibold text-sm">Maintenance</h3>
          </Card>
          
          <Card className="p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="font-semibold text-sm">Role-Based Access</h3>
          </Card>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              window.location.href = '/api/login';
            }}
            data-testid="button-login"
          >
            Login with Replit
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Secure authentication powered by Replit
          </p>
        </div>
      </Card>
    </div>
  );
}
