import { useState } from "react";
import { Check, AlertTriangle, X, Plus, CreditCard, Calendar, ChevronRight, Info, Package, Shield, Users, Settings, BarChart3, FileText, BookOpen, Layers, Factory, Award, Wrench, Phone, Clock } from "lucide-react";

interface Module {
  key: string;
  name: string;
  price: number;
  icon: React.ElementType;
  free?: boolean;
  dependents?: string[];
  status?: "active" | "cancelling" | "cancelled";
  cancelDate?: string;
}

const ACTIVE_MODULES: Module[] = [
  { key: "users",      name: "User Management",     price: 0,   icon: Users,    free: true },
  { key: "roles",      name: "Roles & Permissions", price: 0,   icon: Shield,   free: true },
  { key: "settings",   name: "Company Settings",    price: 0,   icon: Settings, free: true },
  { key: "dashboard",  name: "Dashboard & Reports", price: 0,   icon: BarChart3,free: true },
  { key: "invoicing",  name: "GST Invoicing",       price: 699, icon: FileText,  status: "active" },
  { key: "accounting", name: "Accounting & Ledger", price: 899, icon: BookOpen,  status: "active" },
  { key: "inventory",  name: "Inventory",           price: 599, icon: Package,   status: "active", dependents: ["purchase"] },
  { key: "purchase",   name: "Purchase & PO",       price: 499, icon: Layers,    status: "cancelling", cancelDate: "June 30, 2026" },
  { key: "hr",         name: "HR & Payroll",        price: 799, icon: Users,     status: "active" },
  { key: "attendance", name: "Attendance & Leave",  price: 349, icon: Clock,     status: "active" },
];

const AVAILABLE_MODULES: Module[] = [
  { key: "quality",    name: "Quality Assurance",    price: 399, icon: Award },
  { key: "crm",        name: "CRM & Leads",          price: 499, icon: Phone },
  { key: "maintenance",name: "Preventive Maintenance",price: 349, icon: Wrench },
  { key: "production", name: "Production / BOM",     price: 699, icon: Factory },
];

export function SubscriptionManager() {
  const [modules, setModules] = useState<Module[]>(ACTIVE_MODULES);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [showDependencyWarn, setShowDependencyWarn] = useState<string | null>(null);

  const paidActive = modules.filter(m => !m.free && m.status === "active");
  const cancelling = modules.filter(m => m.status === "cancelling");
  const total = paidActive.reduce((s, m) => s + m.price, 0);
  const nextTotal = paidActive.filter(m => !cancelling.find(c => c.key === m.key)).reduce((s, m) => s + m.price, 0)
    + cancelling.reduce((s, m) => s + m.price, 0); // this month still
  const nextBillTotal = paidActive.filter(m => m.status === "active" && !cancelling.find(c => c.key === m.key)).reduce((s, m) => s + m.price, 0);

  const handleCancelRequest = (key: string) => {
    const mod = modules.find(m => m.key === key);
    const hasDependents = modules.some(m => m.dependents?.includes(key) && m.status === "active");
    if (hasDependents) {
      setShowDependencyWarn(key);
    } else {
      setConfirmCancel(key);
    }
  };

  const confirmCancelModule = (key: string) => {
    setModules(prev => prev.map(m => m.key === key
      ? { ...m, status: "cancelling", cancelDate: "June 30, 2026" }
      : m
    ));
    setConfirmCancel(null);
  };

  const undoCancel = (key: string) => {
    setModules(prev => prev.map(m => m.key === key
      ? { ...m, status: "active", cancelDate: undefined }
      : m
    ));
  };

  const addModule = (mod: Module) => {
    setModules(prev => [...prev, { ...mod, status: "active" }]);
  };

  const activeAddedKeys = new Set(modules.map(m => m.key));
  const stillAvailable = AVAILABLE_MODULES.filter(m => !activeAddedKeys.has(m.key));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Company Settings</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Subscription & Modules</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Subscription & Modules</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your active modules. Changes take effect at the next billing cycle.</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-400">Next bill on <strong className="text-gray-600">July 1, 2026</strong></div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">₹{nextBillTotal.toLocaleString("en-IN")}<span className="text-sm font-normal text-gray-400">/mo</span></div>
              {cancelling.length > 0 && (
                <div className="text-xs text-amber-600 mt-0.5">↓ from ₹{total.toLocaleString("en-IN")} this month</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Cancelling warning banner */}
        {cancelling.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {cancelling.length} module{cancelling.length > 1 ? "s" : ""} scheduled for removal
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Access continues until <strong>June 30, 2026</strong>. Your data will be preserved — re-add anytime to restore access.
              </p>
            </div>
          </div>
        )}

        {/* Active modules */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Modules</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {modules.filter(m => m.free).map(mod => {
              const Icon = mod.icon;
              return (
                <div key={mod.key} className="flex items-center gap-4 px-5 py-3.5 bg-emerald-50/40">
                  <div className="p-1.5 rounded-lg bg-emerald-100">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{mod.name}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">FREE — Always included</span>
                </div>
              );
            })}
            {modules.filter(m => !m.free).map(mod => {
              const Icon = mod.icon;
              const isCancelling = mod.status === "cancelling";
              return (
                <div key={mod.key} className={`flex items-center gap-4 px-5 py-3.5 ${isCancelling ? "bg-red-50/30" : ""}`}>
                  <div className={`p-1.5 rounded-lg ${isCancelling ? "bg-gray-100" : "bg-blue-50"}`}>
                    <Icon className={`h-4 w-4 ${isCancelling ? "text-gray-400" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCancelling ? "text-gray-400 line-through" : "text-gray-800"}`}>{mod.name}</span>
                      {isCancelling && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                          Access ends {mod.cancelDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${isCancelling ? "text-gray-300" : "text-gray-700"}`}>
                    ₹{mod.price}/mo
                  </span>
                  {isCancelling ? (
                    <button
                      onClick={() => undoCancel(mod.key)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCancelRequest(mod.key)}
                      className="text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add more modules */}
        {stillAvailable.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Add More Modules</h2>
            <div className="grid grid-cols-2 gap-3">
              {stillAvailable.map(mod => {
                const Icon = mod.icon;
                return (
                  <div key={mod.key} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-gray-100">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">{mod.name}</div>
                      <div className="text-xs text-gray-400">₹{mod.price}/mo</div>
                    </div>
                    <button
                      onClick={() => addModule(mod)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Billing summary */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Billing Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current month (until June 30)</span>
              <span className="font-semibold text-gray-800">₹{total.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">From July 1 onward</span>
              <span className={`font-semibold ${nextBillTotal < total ? "text-emerald-600" : "text-gray-800"}`}>
                ₹{nextBillTotal.toLocaleString("en-IN")}
                {nextBillTotal < total && <span className="text-xs font-normal ml-1">(saves ₹{(total - nextBillTotal).toLocaleString("en-IN")}/mo)</span>}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Auto-deducted from saved card •••• 4242 via Razorpay</span>
              <button className="ml-auto text-xs text-blue-600 hover:underline">Change</button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm cancel dialog */}
      {confirmCancel && (() => {
        const mod = modules.find(m => m.key === confirmCancel)!;
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-50">
                  <X className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Remove {mod.name}?</h3>
                  <p className="text-sm text-gray-500 mt-1">You'll keep access until <strong>June 30, 2026</strong>. All your data will be preserved — you can re-add this module anytime.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmCancel(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Keep it</button>
                <button onClick={() => confirmCancelModule(confirmCancel)} className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Yes, remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dependency warning dialog */}
      {showDependencyWarn && (() => {
        const mod = modules.find(m => m.key === showDependencyWarn)!;
        const deps = modules.filter(m => m.dependents?.includes(showDependencyWarn));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-amber-50">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Dependency warning</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>{mod.name}</strong> is used by {deps.map(d => d.name).join(", ")}. Removing it may limit how those modules work.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDependencyWarn(null)} className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => { setShowDependencyWarn(null); setConfirmCancel(showDependencyWarn); }} className="flex-1 px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600">Remove anyway</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
