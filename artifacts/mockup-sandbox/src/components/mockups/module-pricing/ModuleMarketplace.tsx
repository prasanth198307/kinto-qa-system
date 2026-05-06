import { useState } from "react";
import { Check, Shield, Users, Settings, BarChart3, FileText, Package, Factory, Wrench, HeartPulse, GraduationCap, Truck, Building2, ShoppingCart, Sprout, CreditCard, BookOpen, Phone, Clock, Award, Layers, X } from "lucide-react";

interface Module {
  key: string;
  name: string;
  desc: string;
  price: number;
  icon: React.ElementType;
  free?: boolean;
  popular?: boolean;
}

interface Category {
  label: string;
  color: string;
  modules: Module[];
}

const CATEGORIES: Category[] = [
  {
    label: "Always Included — Free",
    color: "emerald",
    modules: [
      { key: "users",       name: "User Management",     desc: "Add/manage users and set passwords",        price: 0, icon: Users,       free: true },
      { key: "roles",       name: "Roles & Permissions", desc: "Screen-level access control per role",       price: 0, icon: Shield,      free: true },
      { key: "settings",    name: "Company Settings",    desc: "Profile, branding, GST details",             price: 0, icon: Settings,    free: true },
      { key: "dashboard",   name: "Dashboard & Reports", desc: "MIS overview, analytics, KPIs",             price: 0, icon: BarChart3,   free: true },
    ],
  },
  {
    label: "Finance & Billing",
    color: "blue",
    modules: [
      { key: "invoicing",   name: "GST Invoicing",       desc: "Tax invoices, credit/debit notes, proforma", price: 699,  icon: FileText,   popular: true },
      { key: "accounting",  name: "Accounting & Ledger", desc: "Double-entry, COA, journal, P&L, balance sheet", price: 899, icon: BookOpen },
      { key: "expenses",    name: "Expense Claims",      desc: "Employee expense submission & approvals",    price: 299,  icon: CreditCard },
      { key: "tds",         name: "TDS Management",      desc: "TDS calculation, challans, Form 26Q",        price: 399,  icon: FileText },
    ],
  },
  {
    label: "Inventory & Supply Chain",
    color: "orange",
    modules: [
      { key: "inventory",   name: "Inventory",           desc: "Stock, batches, FIFO, reorder alerts",      price: 599,  icon: Package,    popular: true },
      { key: "purchase",    name: "Purchase & PO",       desc: "RFQ, PO, GRN, vendor invoices, three-way match", price: 499, icon: Layers },
      { key: "warehouse",   name: "Multi-Warehouse",     desc: "Multiple locations, stock transfers, UOM",   price: 399,  icon: Building2 },
      { key: "gatepass",    name: "Gatepasses",          desc: "Outward gatepasses, dispatch, serial tracking", price: 299, icon: Truck },
    ],
  },
  {
    label: "Production & Operations",
    color: "purple",
    modules: [
      { key: "production",  name: "Production / BOM",    desc: "Work orders, BOM, FG tracking",             price: 699,  icon: Factory },
      { key: "quality",     name: "Quality Assurance",   desc: "QA checklists, inspection, rejection logs",  price: 399,  icon: Award },
      { key: "maintenance", name: "Preventive Maintenance", desc: "PM schedules, machine downtime tracking", price: 349,  icon: Wrench },
      { key: "projects",    name: "Project Management",  desc: "BOQ, milestones, timesheets, P&L",          price: 599,  icon: Layers },
    ],
  },
  {
    label: "HR & People",
    color: "rose",
    modules: [
      { key: "hr",          name: "HR & Payroll",        desc: "Employee master, payroll, payslips",         price: 799,  icon: Users,      popular: true },
      { key: "attendance",  name: "Attendance & Leave",  desc: "Daily attendance, leave requests, calendar", price: 349,  icon: Clock },
      { key: "ess",         name: "ESS Portal",          desc: "Employee self-service — claims, leaves, payslips", price: 249, icon: Phone },
      { key: "appraisals",  name: "Performance Appraisals", desc: "Appraisal cycles, ratings, goals",       price: 299,  icon: Award },
    ],
  },
  {
    label: "Sales & CRM",
    color: "teal",
    modules: [
      { key: "crm",         name: "CRM & Leads",         desc: "Lead pipeline, follow-ups, conversion",     price: 499,  icon: Phone },
      { key: "salesorders", name: "Sales Orders",        desc: "Quotations, SO, delivery challans",          price: 399,  icon: FileText },
    ],
  },
  {
    label: "Industry Verticals",
    color: "indigo",
    modules: [
      { key: "healthcare",  name: "Healthcare",          desc: "Patients, OPD/IPD, wards, appointments",    price: 999,  icon: HeartPulse },
      { key: "education",   name: "Education ERP",       desc: "Students, fees, timetable, assessments",    price: 999,  icon: GraduationCap },
      { key: "logistics",   name: "Logistics & Fleet",   desc: "Vehicles, trips, LR / consignment notes",   price: 799,  icon: Truck },
      { key: "realestate",  name: "Real Estate",         desc: "Projects, units, bookings, payment schedules", price: 799, icon: Building2 },
      { key: "pos",         name: "Retail / POS",        desc: "POS terminal, sessions, sales history",      price: 699,  icon: ShoppingCart },
      { key: "agriculture", name: "Agriculture",         desc: "Farms, crop cycles, procurement, commodity prices", price: 699, icon: Sprout },
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; badge: string; badgeText: string; ring: string }> = {
  emerald: { bg: "bg-emerald-50",  border: "border-emerald-200", badge: "bg-emerald-100",  badgeText: "text-emerald-700", ring: "ring-emerald-400" },
  blue:    { bg: "bg-blue-50",     border: "border-blue-200",    badge: "bg-blue-100",     badgeText: "text-blue-700",    ring: "ring-blue-400" },
  orange:  { bg: "bg-orange-50",   border: "border-orange-200",  badge: "bg-orange-100",   badgeText: "text-orange-700",  ring: "ring-orange-400" },
  purple:  { bg: "bg-purple-50",   border: "border-purple-200",  badge: "bg-purple-100",   badgeText: "text-purple-700",  ring: "ring-purple-400" },
  rose:    { bg: "bg-rose-50",     border: "border-rose-200",    badge: "bg-rose-100",     badgeText: "text-rose-700",    ring: "ring-rose-400" },
  teal:    { bg: "bg-teal-50",     border: "border-teal-200",    badge: "bg-teal-100",     badgeText: "text-teal-700",    ring: "ring-teal-400" },
  indigo:  { bg: "bg-indigo-50",   border: "border-indigo-200",  badge: "bg-indigo-100",   badgeText: "text-indigo-700",  ring: "ring-indigo-400" },
};

const FREE_KEYS = new Set(["users", "roles", "settings", "dashboard"]);

export function ModuleMarketplace() {
  const [selected, setSelected] = useState<Set<string>>(new Set(FREE_KEYS));

  const toggle = (key: string) => {
    if (FREE_KEYS.has(key)) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allModules = CATEGORIES.flatMap(c => c.modules);
  const total = allModules.filter(m => selected.has(m.key) && m.price > 0).reduce((s, m) => s + m.price, 0);
  const selectedPaid = allModules.filter(m => selected.has(m.key) && m.price > 0);
  const selectedCount = selected.size - FREE_KEYS.size;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Build Your Plan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Pick the modules your business needs — pay only for what you use</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Monthly total</div>
              <div className="text-2xl font-bold text-gray-900">₹{total.toLocaleString("en-IN")}<span className="text-sm font-normal text-gray-400">/mo</span></div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Left — module grid */}
        <div className="flex-1 space-y-8">
          {CATEGORIES.map(cat => {
            const c = colorMap[cat.color];
            return (
              <div key={cat.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge} ${c.badgeText}`}>{cat.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {cat.modules.map(mod => {
                    const Icon = mod.icon;
                    const isFree = FREE_KEYS.has(mod.key);
                    const isOn = selected.has(mod.key);
                    return (
                      <button
                        key={mod.key}
                        onClick={() => toggle(mod.key)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isFree
                            ? `${c.bg} ${c.border} cursor-default`
                            : isOn
                            ? `bg-white border-blue-500 ring-2 ring-blue-100 shadow-sm`
                            : `bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${isFree ? c.badge : isOn ? "bg-blue-100" : "bg-gray-100"}`}>
                              <Icon className={`h-4 w-4 ${isFree ? c.badgeText : isOn ? "text-blue-600" : "text-gray-500"}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-semibold ${isOn ? "text-gray-900" : "text-gray-700"}`}>{mod.name}</span>
                                {mod.popular && !isFree && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Popular</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{mod.desc}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            {isFree ? (
                              <span className={`text-xs font-bold ${c.badgeText}`}>FREE</span>
                            ) : (
                              <span className="text-sm font-bold text-gray-900">₹{mod.price}<span className="text-xs font-normal text-gray-400">/mo</span></span>
                            )}
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isFree ? "bg-emerald-500" : isOn ? "bg-blue-500" : "border-2 border-gray-300"
                            }`}>
                              {(isFree || isOn) && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — sticky summary */}
        <div className="w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Price summary card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-4">
                <div className="text-blue-100 text-xs font-medium mb-1">Your monthly cost</div>
                <div className="text-white text-3xl font-bold">₹{total.toLocaleString("en-IN")}</div>
                <div className="text-blue-200 text-xs mt-1">{selectedCount} paid module{selectedCount !== 1 ? "s" : ""} + 4 free</div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {/* Free always */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span>Users, Roles, Settings, Dashboard — always free</span>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {selectedPaid.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No paid modules selected yet. Add some above.</p>
                  ) : (
                    selectedPaid.map(m => (
                      <div key={m.key} className="flex items-center justify-between">
                        <span className="text-xs text-gray-700">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">₹{m.price}</span>
                          <button
                            onClick={() => toggle(m.key)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedPaid.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total / month</span>
                    <span className="text-sm font-bold text-blue-600">₹{total.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors mt-1">
                  Start Free Trial
                </button>
                <p className="text-center text-xs text-gray-400">14-day trial · No credit card needed</p>
              </div>
            </div>

            {/* Per-user note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-800 font-medium">Per-user add-on</p>
              <p className="text-xs text-amber-700 mt-1">Base prices include 5 users. Each additional user is <strong>₹150/month</strong>.</p>
            </div>

            {/* WhatsApp */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-gray-700">Need help choosing?</p>
              <p className="text-xs text-gray-500 mt-1">Our team can recommend the right modules for your industry.</p>
              <button className="mt-2 text-xs text-blue-600 font-semibold hover:text-blue-700">
                Chat on WhatsApp →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
