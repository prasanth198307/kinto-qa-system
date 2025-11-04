import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <div className="p-10 space-y-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <ClipboardCheck className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-welcome">
                Quality Assurance
                <br />
                Management System
              </h1>
              <p className="text-sm text-gray-600">
                Streamline your manufacturing quality processes
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full h-12 text-base font-medium shadow-sm"
              onClick={() => {
                window.location.href = '/api/login';
              }}
              data-testid="button-login"
            >
              Log in with Replit
            </Button>
            
            <p className="text-center text-xs text-gray-500">
              Secure authentication • Role-based access
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
