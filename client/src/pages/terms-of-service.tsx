import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  const [, setLocation] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="btn-back-home">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src="/swacherp-logo.png" alt="SwachERP" className="h-8 w-auto" />
          <span className="text-sm font-semibold text-muted-foreground">Terms of Service</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: 1 May 2026 &nbsp;·&nbsp; Effective: 1 May 2026</p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          These Terms of Service ("<strong>Terms</strong>") govern your access to and use of the SwachERP platform
          provided by Inmoisture Private Limited ("<strong>Company</strong>", "we", "us", or "our"). By accessing or
          using the Service, you agree to be bound by these Terms.
        </p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By creating an account or using SwachERP in any way, you confirm that you are at least 18 years old, have the legal authority to enter into these Terms on behalf of yourself or your organisation, and agree to comply with these Terms and all applicable laws and regulations.`,
          },
          {
            title: "2. Description of Service",
            body: `SwachERP is a cloud-based ERP (Enterprise Resource Planning) SaaS platform designed for Indian businesses. The Service includes modules for GST-compliant invoicing, inventory management, production, purchasing, accounting, HR & payroll, CRM, and industry-specific verticals. Features and modules available to you depend on your subscription plan.`,
          },
          {
            title: "3. Accounts and Registration",
            body: `You must provide accurate and complete information when registering. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately at info@inmoisture.com of any unauthorised use of your account. We reserve the right to suspend or terminate accounts that violate these Terms.`,
          },
          {
            title: "4. Subscription and Billing",
            body: `SwachERP operates on a subscription basis. By subscribing, you authorise us to charge your payment method on a recurring basis (monthly or annually, as selected). All prices are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period. We do not provide refunds for partial billing periods.`,
          },
          {
            title: "5. Acceptable Use",
            body: `You agree not to: use the Service for any unlawful purpose; attempt to gain unauthorised access to any part of the Service; interfere with or disrupt the integrity or performance of the Service; upload or transmit viruses or malicious code; reverse-engineer or attempt to extract the source code of the Service; or use the Service to store or transmit infringing, defamatory, or otherwise unlawful content.`,
          },
          {
            title: "6. Your Data",
            body: `You retain ownership of all data you input into the Service. You grant us a limited licence to process your data solely to provide and improve the Service. We will not access your business data except as necessary to provide technical support or as required by law. You are responsible for ensuring that your use of the Service (including the data you store) complies with applicable laws, including GST regulations and data protection laws.`,
          },
          {
            title: "7. Intellectual Property",
            body: `The Service, including its design, software, logos, and content, is owned by Inmoisture Private Limited and is protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right to use our trademarks, logos, or other proprietary information without our prior written consent.`,
          },
          {
            title: "8. Confidentiality",
            body: `Each party agrees to keep the other's confidential information secret and not to use it except as necessary to exercise rights or perform obligations under these Terms. This obligation survives termination of these Terms for a period of three years.`,
          },
          {
            title: "9. Service Availability and Modifications",
            body: `We strive to maintain 99.5% uptime but do not guarantee uninterrupted or error-free access to the Service. We may modify, suspend, or discontinue the Service (or any part thereof) at any time. We will provide reasonable notice of significant changes. We are not liable for any disruption or loss caused by such changes.`,
          },
          {
            title: "10. Limitation of Liability",
            body: `To the maximum extent permitted by law, Inmoisture Private Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service. Our total liability for any claim shall not exceed the amount you paid to us in the three months preceding the claim.`,
          },
          {
            title: "11. Indemnification",
            body: `You agree to indemnify and hold harmless Inmoisture Private Limited and its officers, directors, employees, and agents from any claims, liabilities, damages, and expenses (including reasonable legal fees) arising from your use of the Service or violation of these Terms.`,
          },
          {
            title: "12. Governing Law and Dispute Resolution",
            body: `These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts located in India. We encourage you to contact us first at info@inmoisture.com to resolve disputes amicably.`,
          },
          {
            title: "13. Changes to These Terms",
            body: `We reserve the right to modify these Terms at any time. We will notify you of material changes by email or by posting a notice within the Service. Your continued use of the Service after the effective date of the updated Terms constitutes your acceptance.`,
          },
          {
            title: "14. Contact Us",
            body: `For questions about these Terms, please contact:\n\nInmoisture Private Limited\nEmail: info@inmoisture.com`,
          },
        ].map(section => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.body.split("\n\n").map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">{para}</p>
            ))}
          </section>
        ))}

        <div className="border-t pt-6 text-xs text-muted-foreground">
          <p>© {year} Inmoisture Private Limited. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
