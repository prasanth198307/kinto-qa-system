import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <span className="text-sm font-semibold text-muted-foreground">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: 1 May 2026 &nbsp;·&nbsp; Effective: 1 May 2026</p>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          Inmousture Private Limited ("<strong>Company</strong>", "we", "us", or "our") operates the SwachERP platform
          (the "<strong>Service</strong>"). This Privacy Policy explains how we collect, use, disclose, and safeguard
          your information when you use our Service. Please read it carefully.
        </p>

        {[
          {
            title: "1. Information We Collect",
            body: `We collect information you provide directly — such as your name, email address, company name, GST number, phone number, and billing details when you register or use the Service. We also automatically collect usage data including IP addresses, browser type, pages visited, and the dates and times of your visits. Data created within the platform (invoices, inventory records, employee information, etc.) is stored on your behalf and remains your property.`,
          },
          {
            title: "2. How We Use Your Information",
            body: `We use the information we collect to: provide, maintain, and improve the Service; process transactions and send related information; send administrative messages, updates, and security alerts; respond to your comments and questions; and comply with legal obligations. We do not sell your personal information to third parties.`,
          },
          {
            title: "3. Data Storage and Security",
            body: `Your data is stored on secure cloud infrastructure (Neon Serverless PostgreSQL) hosted within ISO 27001-compliant data centres. We implement industry-standard security measures including encryption in transit (TLS 1.2+), encrypted storage, role-based access control, and regular automated backups. No method of transmission over the internet is 100% secure; however, we strive to protect your personal information using commercially acceptable means.`,
          },
          {
            title: "4. Multi-Tenancy and Data Isolation",
            body: `SwachERP is a multi-tenant SaaS platform. Each tenant's data is logically isolated using tenant-scoped identifiers and enforced at every layer of the application. Employees of one organisation cannot access data belonging to another organisation.`,
          },
          {
            title: "5. Third-Party Services",
            body: `We use third-party services to support the platform, including payment processors (Razorpay), communication providers (WhatsApp Business API, email delivery), and cloud infrastructure providers. These providers have their own privacy policies and we encourage you to review them. We only share the minimum data necessary to provide the Service.`,
          },
          {
            title: "6. Cookies and Tracking",
            body: `We use session cookies strictly necessary for authentication and to keep you logged in. We do not use advertising cookies or third-party tracking pixels. You may configure your browser to refuse cookies, but this may affect your ability to use certain features of the Service.`,
          },
          {
            title: "7. Data Retention",
            body: `We retain your data for as long as your account is active or as needed to provide you with the Service. Upon account termination, we will delete or anonymise your data within 90 days, unless we are legally required to retain it longer. You may request earlier deletion by contacting us.`,
          },
          {
            title: "8. Your Rights",
            body: `Subject to applicable law, you have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing. To exercise these rights, contact us at info@inmoisture.com. We will respond within 30 days.`,
          },
          {
            title: "9. Children's Privacy",
            body: `The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.`,
          },
          {
            title: "10. Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.`,
          },
          {
            title: "11. Contact Us",
            body: `If you have questions or concerns about this Privacy Policy, please contact us at:\n\nInmousture Private Limited\nEmail: info@inmoisture.com`,
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
          <p>© {year} Inmousture Private Limited. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
