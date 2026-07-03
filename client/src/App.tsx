import { useState, useEffect, useCallback } from "react";
import { Switch, Route, useLocation, useSearch, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ChatAgent } from "@/components/ChatAgent";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useFilteredNavigation } from "@/hooks/use-filtered-navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import LandingPage from "@/pages/landing";
import DemoPage from "@/pages/demo";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import FeaturesPage from "@/pages/features";
import SolutionsPage from "@/pages/solutions";
import CompanySelectPage from "@/pages/company-select";
import RegisterCompanyPage from "@/pages/register-company";
import SuperAdminTenants from "@/pages/super-admin-tenants";
import SuperAdminPlans from "@/pages/super-admin-plans";
import SuperAdminOverview from "@/pages/super-admin-overview";
import SuperAdminBilling from "@/pages/super-admin-billing";
import SuperAdminDemoRequests from "@/pages/super-admin-demo-requests";
import SuperAdminBackups from "@/pages/super-admin-backups";
import SuperAdminModuleCatalog from "@/pages/super-admin-module-catalog";
import SuperAdminSettings from "@/pages/super-admin-settings";
import Landing from "@/components/Landing";
import RoleSelector from "@/components/RoleSelector";
import { TopRightHeader } from "@/components/TopRightHeader";
import { DashboardShell } from "@/components/DashboardShell";
import { OperatorDashboardShell } from "@/components/OperatorDashboardShell";
import DashboardStats from "@/components/DashboardStats";
import ChecklistForm from "@/components/ChecklistForm";
import MachineCard from "@/components/MachineCard";
import ChecklistHistoryTable from "@/components/ChecklistHistoryTable";
import MaintenanceSchedule from "@/components/MaintenanceSchedule";
import AdminDashboardOverview from "@/components/AdminDashboardOverview";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminMachineConfig from "@/components/AdminMachineConfig";
import AdminChecklistBuilder from "@/components/AdminChecklistBuilder";
import AdminSparePartsManagement from "@/components/AdminSparePartsManagement";
import SparePartsStockView from "@/components/SparePartsStockView";
import AdminMachineTypeConfig from "@/components/AdminMachineTypeConfig";
import AdminPMTaskListTemplates from "@/components/AdminPMTaskListTemplates";
import SchedulePMDialog from "@/components/SchedulePMDialog";
import PurchaseOrderManagement from "@/components/PurchaseOrderManagement";
import PMHistoryView from "@/components/PMHistoryView";
import PMExecutionDialog from "@/components/PMExecutionDialog";
import InventoryManagement from "@/pages/inventory-management";
import RawMaterialTypeMaster from "@/pages/raw-material-type-master";
import ProductionManagement from "@/pages/production-management";
import ProductionEntries from "@/pages/production-entries";
import ProductionReconciliations from "@/pages/production-reconciliations";
import ProductionReconciliationReport from "@/pages/production-reconciliation-report";
import FinishedGoodsReport from "@/pages/finished-goods-report";
import VarianceAnalytics from "@/pages/variance-analytics";
import SalesReturns from "@/pages/sales-returns";
import MachineStartupReminders from "@/pages/machine-startup-reminders";
import NotificationSettings from "@/pages/notification-settings";
import ApiKeysPage from "@/pages/api-keys";
import CustomerOutstandingReport from "@/pages/customer-outstanding-report";
import Reports from "@/pages/reports";
import WhatsAppAnalytics from "@/pages/WhatsAppAnalytics";
import TemplateManagement from "@/pages/template-management";
import ProductCategories from "@/pages/product-categories";
import ProductTypes from "@/pages/product-types";
import VendorTypes from "@/pages/vendor-types";
import VendorManagement from "@/components/VendorManagement";
import PendingPayments from "@/pages/pending-payments";
import PaymentManagement from "@/pages/payment-management";
import CreditNotes from "@/pages/credit-notes";
import CancelledInvoices from "@/pages/cancelled-invoices";
import WriteOffReport from "@/pages/write-off-report";
import InventorySummaryDashboard from "@/components/InventorySummaryDashboard";
import TodayProductionStats from "@/components/TodayProductionStats";
import RolePermissionsView from "@/components/RolePermissionsView";
import RoleManagement from "@/components/RoleManagement";
import { ManagerChecklistAssignment } from "@/components/ManagerChecklistAssignment";
import PendingPaymentsDashboard from "@/components/PendingPaymentsDashboard";
import { OperatorAssignedChecklists } from "@/components/OperatorAssignedChecklists";
import { VerticalNavSidebar, type NavSection } from "@/components/VerticalNavSidebar";
import { Activity, AlertTriangle, Archive, Award, BarChart3, BedDouble, Bell, BookOpen, Box, Briefcase, Building2, Calculator, Calendar, Camera, Car, CheckCircle, CheckCircle2, ClipboardCheck, ClipboardList, Clock, Coins, CreditCard, Crosshair, Factory, FileStack, FileText, FileX, FolderOpen, Gem, Gift, Globe, Heart, History, IndianRupee, Key, Landmark, Layers, LayoutDashboard, ListChecks, Loader2, Lock, LogOut, MessageSquare, Package, PackageX, Pill, Play, Plus, Receipt, RotateCcw, Scale, Scan, Settings, Settings2, Shield, ShoppingBag, ShoppingCart, Star, Tag, Target, Trash2, TrendingUp, Truck, Upload, UserX, Users, UtensilsCrossed, Wallet, Wifi, Wrench, XCircle, Zap , Database, GraduationCap, HeartPulse, Home, Leaf } from "lucide-react";
import { MapPin, Route as RouteIcon } from "lucide-react";
import CRMLeadsPage from "@/pages/crm-leads";
import SalesDashboard from "@/components/SalesDashboard";
import SalesOrdersPage from "@/pages/sales-orders";
import SalesOrderDetailPage from "@/pages/sales-order-detail";
import SalesOfficersPage from "@/pages/sales-officers";
import VendorAnalytics from "@/pages/vendor-analytics";
import SpareParts from "@/pages/spare-parts";
import ScrapManagement from "@/pages/scrap-management";
import PurchaseReturns from "@/pages/purchase-returns";
import TDSManagement from "@/pages/tds-management";
import ReviewerDashboardPage from "@/pages/ReviewerDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import InvoiceDetail from "@/pages/invoice-detail";
import DispatchTracking from "@/pages/dispatch-tracking";
import ChecklistsPage from "@/pages/checklists";
import DataImport from "@/pages/data-import";
import DocumentsPage from "@/pages/documents";
import ExpensesPage from "@/pages/expenses";
import ExpenseCategoriesPage from "@/pages/expense-categories";
import MonthlyExpensesPage from "@/pages/monthly-expenses";
import CashRegisterPage from "@/pages/cash-register";
import CashRegisterReport from "@/pages/cash-register-report";
import CashRegisterVoucherPrint from "@/pages/cash-register-voucher-print";
import VendorHistory from "@/pages/vendor-history";
import VendorHistoryDetail from "@/pages/vendor-history-detail";
import VendorGroupDetail from "@/pages/vendor-group-detail";
import VendorDebitNotes from "@/pages/vendor-debit-notes";
import CustomerAdvances from "@/pages/customer-advances";
import MISDashboard from "@/pages/mis-dashboard";
import MISProduction from "@/pages/mis-production";
import MISInventory from "@/pages/mis-inventory";
import MISSales from "@/pages/mis-sales";
import MISDelivery from "@/pages/mis-delivery";
import MISCash from "@/pages/mis-cash";
import MISFinancial from "@/pages/mis-financial";
import MISManufacturing from "@/pages/mis-manufacturing";
import DispatchMasters from "@/pages/dispatch-masters";
import PrintInvoicePage from "@/pages/PrintInvoicePage";
import PrintGatepassPage from "@/pages/PrintGatepassPage";
import PrintCreditNotePage from "@/pages/PrintCreditNotePage";
import PrintDebitNotePage from "@/pages/PrintDebitNotePage";
import PrintInvoiceGatepassPage from "@/pages/PrintInvoiceGatepassPage";
import RawMaterialDetail from "@/pages/raw-material-detail";
import RawMaterialTypeDetail from "@/pages/raw-material-type-detail";
import ProductDetail from "@/pages/product-detail";
import FinishedGoodDetail from "@/pages/finished-good-detail";
import ChartOfAccountsPage from "@/pages/chart-of-accounts";
import AccountSubtypesPage from "@/pages/account-subtypes";
import JournalEntriesPage from "@/pages/journal-entries";
import JournalEntryDetailPage from "@/pages/journal-entry-detail";
import ManualJournalEntryPage from "@/pages/manual-journal-entry";
import TrialBalancePage from "@/pages/trial-balance";
import ProfitLossPage from "@/pages/profit-loss";
import BalanceSheetPage from "@/pages/balance-sheet";
import BankTransactionsPage from "@/pages/bank-transactions";
import LedgerViewPage from "@/pages/ledger-view";
import DayBookPage from "@/pages/day-book";
import AgingReportPage from "@/pages/aging-report";
import CashFlowStatementPage from "@/pages/cash-flow-statement";
import GroupSummaryPage from "@/pages/group-summary";
import BudgetVariancePage from "@/pages/budget-variance";
import AdminToolsPage from "@/pages/admin-tools";
import TenantSettings from "@/pages/tenant-settings";
import HRMastersPage from "@/pages/hr-masters";
import HREmployeesPage from "@/pages/hr-employees";
import HRAttendancePage from "@/pages/hr-attendance";
import HRLeavesPage from "@/pages/hr-leaves";
import HRPayrollPage from "@/pages/hr-payroll";
import HRReportsPage from "@/pages/hr-reports";
import HRExitManagementPage from "@/pages/hr-exit-management";
import HRLoansPage from "@/pages/hr-loans";
import HRTdsDeclarationsPage from "@/pages/hr-tds-declarations";
import HRRecruitmentPage from "@/pages/hr-recruitment";
import HRPayslipPage from "@/pages/hr-payslip";
import PricingPage from "@/pages/pricing";
import EssLogin from "@/pages/ess-login";
import EssPortal from "@/pages/ess-portal";
import HRExpenseClaimsPage from "@/pages/hr-expense-claims";
import HROnboardingPage from "@/pages/hr-onboarding";
import HRLettersPage from "@/pages/hr-letters";
import HRSupportDeskPage from "@/pages/hr-support-desk";
import CRMSurveysPage from "@/pages/crm-surveys";
import RecurringInvoicesPage from "@/pages/recurring-invoices";
import WarehousesPage from "@/pages/warehouses";
import InventoryBulkImportPage from "@/pages/inventory-bulk-import";
import InventoryGrnScanPage from "@/pages/inventory-grn-scan";
import InventoryStockAdjustmentsPage from "@/pages/inventory-stock-adjustments";
import ProjectManagementPage from "@/pages/project-management";
import TimesheetsPage from "@/pages/timesheets";
import FixedAssetsPage from "@/pages/fixed-assets";
import PerformanceAppraisalPage from "@/pages/performance-appraisal";
import CurrencyManagementPage from "@/pages/currency-management";
import TaxEnginePage from "@/pages/tax-engine";
import CostCentresPage from "@/pages/cost-centres";
import PurchaseRequisitionsPage from "@/pages/purchase-requisitions";
import ApprovalWorkflowsPage from "@/pages/approval-workflows";
import GoodsReceiptNotesPage from "@/pages/goods-receipt-notes";
import PriceListsPage from "@/pages/price-lists";
import GSTRReportsPage from "@/pages/gstr-reports";
import AuditLogPage from "@/pages/audit-log";
import SecurityDashboardPage from "@/pages/security-dashboard";
import SuperAdminSecurity from "@/pages/super-admin-security";
import SuperAdminSetupWizard from "@/pages/super-admin-setup-wizard";
import HealthcarePage from "@/pages/healthcare";
import HotelPage from "@/pages/hotel";
import RestaurantPage from "@/pages/restaurant";
import CRMPipelinePage from "@/pages/crm";
import EcommercePage from "@/pages/ecommerce";
import NGOPage from "@/pages/ngo";
import PharmacyPage from "@/pages/pharmacy";
import NidhiPage from "@/pages/nidhi";
import FinanceErpPage from "@/pages/finance-erp";
import EducationPage from "@/pages/education";
import LogisticsPage from "@/pages/logistics";
import RealEstatePage from "@/pages/real-estate";
import POSPage from "@/pages/pos";
import EInvoicePage from "@/pages/einvoice";
import AgriculturePage from "@/pages/agriculture";
import GoldErpPage from "@/pages/gold-erp";
import AccountsPayablePage from "@/pages/accounts-payable";
import BankReconciliationPage from "@/pages/bank-reconciliation";
import PeriodClosePage from "@/pages/period-close";
import RestaurantEnterprisePage from "@/pages/restaurant-enterprise";
import HotelEnterprisePage from "@/pages/hotel-enterprise";
import HealthcareEnterprisePage from "@/pages/healthcare-enterprise";
import EducationEnterprisePage from "@/pages/education-enterprise";
import RealEstateEnterprisePage from "@/pages/real-estate-enterprise";
import MastersPage from "@/pages/masters";
import RetailEnterprisePage from "@/pages/retail-enterprise";
import PharmacyEnterprisePage from "@/pages/pharmacy-enterprise";
import LogisticsEnterprisePage from "@/pages/logistics-enterprise";
import CRMEnterprisePage from "@/pages/crm-enterprise";
import NGOEnterprisePage from "@/pages/ngo-enterprise";
import AgricultureEnterprisePage from "@/pages/agriculture-enterprise";
import EcommerceEnterprisePage from "@/pages/ecommerce-enterprise";
import HealthcareEnterprise2Page from "@/pages/healthcare-enterprise2";
import EducationEnterprise2Page from "@/pages/education-enterprise2";
import RestaurantPOSPage from "@/pages/restaurant-pos";
import RestaurantKitchenPage from "@/pages/restaurant-kitchen";
import RestaurantTablesPage from "@/pages/restaurant-tables";
import RestaurantMenuPage from "@/pages/restaurant-menu";
import RestaurantOrdersPage from "@/pages/restaurant-orders";
import RestaurantDeliveryPage from "@/pages/restaurant-delivery";
import RestaurantReservationsPage from "@/pages/restaurant-reservations";
import RestaurantShiftsPage from "@/pages/restaurant-shifts";
import RestaurantCustomersPage from "@/pages/restaurant-customers";
import RestaurantInventoryPage from "@/pages/restaurant-inventory";
import RestaurantOutletsPage from "@/pages/restaurant-outlets";
import RestaurantReportsPage from "@/pages/restaurant-reports";
import RestaurantStewardPage from "@/pages/restaurant-steward";
import RestaurantKioskPage from "@/pages/restaurant-kiosk";
import RestaurantAggregatorsPage from "@/pages/restaurant-aggregators";
import RestaurantAnalyticsPage from "@/pages/restaurant-analytics";
import RestaurantStaffPage from "@/pages/restaurant-staff";
import RestaurantFranchisePage from "@/pages/restaurant-franchise";
import RestaurantTaxSettingsPage from "@/pages/restaurant-tax-settings";
import RestaurantGiftCardsPage from "@/pages/restaurant-gift-cards";
import RestaurantCentralKitchenPage from "@/pages/restaurant-central-kitchen";
import RestaurantMenuTranslationsPage from "@/pages/restaurant-menu-translations";
import RestaurantTableOrderPage from "@/pages/restaurant-table-order";
import RestaurantCDSPage from "@/pages/restaurant-cds";
import RestaurantCampaignsPage from "@/pages/restaurant-campaigns";
import RestaurantRecipesPage from "@/pages/restaurant-recipes";
import RestaurantOnlineOrderPage from "@/pages/restaurant-online-order";
import RestaurantPaymentTerminalPage from "@/pages/restaurant-payment-terminal";
import HotelFrontDeskPage from "@/pages/hotel/front-desk";
import HotelReservationsPage from "@/pages/hotel/reservations";
import HotelCheckinPage from "@/pages/hotel/checkin";
import HotelRoomsPage from "@/pages/hotel/rooms";
import HotelFolioPage from "@/pages/hotel/folio";
import HotelHousekeepingPage from "@/pages/hotel/housekeeping";
import HotelRatesPage from "@/pages/hotel/rates";
import HotelCorporatePage from "@/pages/hotel/corporate";
import HotelNightAuditPage from "@/pages/hotel/night-audit";
import HotelReportsPage from "@/pages/hotel/reports";
import HotelChannelManagerPage from "@/pages/hotel/channel-manager";
import HotelRevenueManagementPage from "@/pages/hotel/revenue-management";
import HotelBanquetPage from "@/pages/hotel/banquet";
import OndcIntegrationPage from "@/pages/restaurant/ondc-integration";
import MultiCompanyPage from "@/pages/multi-company";
import GSTRFilingPage from "@/pages/gstr-filing";
import HealthcarePatientsPage from "@/pages/healthcare/patients";
import HealthcareOPDPage from "@/pages/healthcare/opd";
import HealthcareIPDPage from "@/pages/healthcare/ipd";
import HealthcareBedsPage from "@/pages/healthcare/beds";
import HealthcareOTPage from "@/pages/healthcare/ot";
import HealthcareLabPage from "@/pages/healthcare/lab";
import HealthcareNursingPage from "@/pages/healthcare/nursing";
import HealthcareInsurancePage from "@/pages/healthcare/insurance";
import HealthcareDoctorsPage from "@/pages/healthcare/doctors";
import HealthcareBloodBankPage from "@/pages/healthcare/blood-bank";
import HealthcareReportsPage from "@/pages/healthcare/reports";
import HealthcareABDMPage from "@/pages/healthcare/abdm";
import HealthcareEMRPage from "@/pages/healthcare/emr";
import HealthcareTPAClaimsPage from "@/pages/healthcare/tpa-claims";
import EducationStudentsPage from "@/pages/education/students";
import EducationAdmissionsPage from "@/pages/education/admissions";
import EducationClassesPage from "@/pages/education/classes";
import EducationAttendancePage from "@/pages/education/attendance";
import EducationExamsPage from "@/pages/education/exams";
import EducationFeesPage from "@/pages/education/fees";
import EducationTimetablePage from "@/pages/education/timetable";
import EducationHomeworkPage from "@/pages/education/homework";
import EducationOnlineExamsPage from "@/pages/education/online-exams";
import EducationLibraryPage from "@/pages/education/library";
import EducationTransportPage from "@/pages/education/transport";
import EducationHostelPage from "@/pages/education/hostel";
import EducationParentPortalPage from "@/pages/education/parent-portal";
import EducationReportsPage from "@/pages/education/reports";
import RealEstateProjectsPage from "@/pages/real-estate/projects";
import RealEstateCRMPage from "@/pages/real-estate/crm";
import RealEstateBookingsPage from "@/pages/real-estate/bookings";
import RealEstateCollectionsPage from "@/pages/real-estate/collections";
import RealEstateBrokersPage from "@/pages/real-estate/brokers";
import RealEstateConstructionPage from "@/pages/real-estate/construction";
import RealEstateDocumentsPage from "@/pages/real-estate/documents";
import RealEstateCustomerPortalPage from "@/pages/real-estate/customer-portal";
import RealEstateSocietyPage from "@/pages/real-estate/society";
import RealEstateReportsPage from "@/pages/real-estate/reports";
import LogisticsFleetPage from "@/pages/logistics/fleet";
import LogisticsDriversPage from "@/pages/logistics/drivers";
import LogisticsTripsPage from "@/pages/logistics/trips";
import LogisticsGPSPage from "@/pages/logistics/gps";
import LogisticsConsignmentsPage from "@/pages/logistics/consignments";
import LogisticsFreightPage from "@/pages/logistics/freight";
import LogisticsEPODPage from "@/pages/logistics/epod";
import LogisticsFuelPage from "@/pages/logistics/fuel";
import LogisticsDocumentsPage from "@/pages/logistics/documents";
import LogisticsReportsPage from "@/pages/logistics/reports";
import AgricultureFarmsPage from "@/pages/agriculture/farms";
import AgricultureCropsPage from "@/pages/agriculture/crops";
import AgricultureInputsPage from "@/pages/agriculture/inputs";
import AgricultureHarvestPage from "@/pages/agriculture/harvest";
import AgricultureWeatherPage from "@/pages/agriculture/weather";
import AgricultureSchemesPage from "@/pages/agriculture/schemes";
import AgricultureFPOPage from "@/pages/agriculture/fpo";
import AgricultureMarketPage from "@/pages/agriculture/market";
import AgricultureReportsPage from "@/pages/agriculture/reports";
import NGODonorsPage from "@/pages/ngo/donors";
import NGODonationsPage from "@/pages/ngo/donations";
import NGO80GPage from "@/pages/ngo/80g";
import NGOProjectsPage from "@/pages/ngo/projects";
import NGOBeneficiariesPage from "@/pages/ngo/beneficiaries";
import NGOGrantsPage from "@/pages/ngo/grants";
import NGOVolunteersPage from "@/pages/ngo/volunteers";
import NGOFCRAPage from "@/pages/ngo/fcra";
import NGOReportsPage from "@/pages/ngo/reports";
import NGO80GBulkPage from "@/pages/ngo/80g-bulk";
import NGOCSRPage from "@/pages/ngo/csr";
import PharmacyBillingPage from "@/pages/pharmacy/billing";
import PharmacyDrugsPage from "@/pages/pharmacy/drugs";
import PharmacyStockPage from "@/pages/pharmacy/stock";
import PharmacyPurchasesPage from "@/pages/pharmacy/purchases";
import PharmacyScheduleHPage from "@/pages/pharmacy/schedule-h";
import PharmacyScheduleXPage from "@/pages/pharmacy/schedule-x";
import PharmacyLicensesPage from "@/pages/pharmacy/licenses";
import PharmacyExpiryPage from "@/pages/pharmacy/expiry";
import PharmacyReportsPage from "@/pages/pharmacy/reports";
import PharmacyNarcoticsRegisterPage from "@/pages/pharmacy/narcotics-register";
import PharmacyEInvoicePage from "@/pages/pharmacy/e-invoice";
import CRMPipelinePage from "@/pages/crm/pipeline";
import CRMContactsPage from "@/pages/crm/contacts";
import CRMAccountsPage from "@/pages/crm/accounts";
import CRMActivitiesPage from "@/pages/crm/activities";
import CRMEmailCampaignsPage from "@/pages/crm/email-campaigns";
import CRMWhatsAppPage from "@/pages/crm/whatsapp";
import CRMReportsPage from "@/pages/crm/reports";
import NidhiMembersPage from "@/pages/nidhi/members";
import NidhiDepositsPage from "@/pages/nidhi/deposits";
import NidhiLoansPage from "@/pages/nidhi/loans";
import NidhiEMIPage from "@/pages/nidhi/emi";
import NidhiSharesPage from "@/pages/nidhi/shares";
import NidhiGoldRatesPage from "@/pages/nidhi/gold-rates";
import NidhiInterestRatesPage from "@/pages/nidhi/interest-rates";
import NidhiDailyCollectionPage from "@/pages/nidhi/daily-collection";
import NidhiCompliancePage from "@/pages/nidhi/compliance";
import NidhiReportsPage from "@/pages/nidhi/reports";
import EcommerceDashboardPage from "@/pages/ecommerce/dashboard";
import EcommerceOrdersPage from "@/pages/ecommerce/orders";
import EcommerceListingsPage from "@/pages/ecommerce/listings";
import EcommerceShipmentsPage from "@/pages/ecommerce/shipments";
import EcommerceReturnsPage from "@/pages/ecommerce/returns";
import EcommerceSettlementsPage from "@/pages/ecommerce/settlements";
import EcommerceChannelsPage from "@/pages/ecommerce/channels";
import EcommerceReportsPage from "@/pages/ecommerce/reports";
import MastersHSNCodesPage from "@/pages/masters/hsn-codes";
import MastersSACCodesPage from "@/pages/masters/sac-codes";
import MastersTaxConfigPage from "@/pages/masters/tax-config";
import MastersStatesCountriesPage from "@/pages/masters/states-countries";
import MastersBankMasterPage from "@/pages/masters/bank-master";
import MastersBranchesPage from "@/pages/masters/branches";
import MastersDocNumberingPage from "@/pages/masters/doc-numbering";
import MastersEmailTemplatesPage from "@/pages/masters/email-templates";
import MastersSMSTemplatesPage from "@/pages/masters/sms-templates";
import MastersApprovalMatrixPage from "@/pages/masters/approval-matrix";
import MastersFeatureFlagsPage from "@/pages/masters/feature-flags";
import MastersPrintTemplatesPage from "@/pages/masters/print-templates";
import MastersWebhooksPage from "@/pages/masters/webhooks";
import RestaurantFeedbackPublicPage from "@/pages/restaurant-feedback-public";
// Phase 7F — Nidhi
import NidhiLoanSanctionPage from "@/pages/nidhi/loan-sanction";
import NidhiPDCTrackingPage from "@/pages/nidhi/pdc-tracking";
import NidhiRBIReturnsPage from "@/pages/nidhi/rbi-returns";
// Phase 7G — CRM
import CRMLeadScoringPage from "@/pages/crm/lead-scoring";
import CRMDripCampaignsPage from "@/pages/crm/drip-campaigns";
import CRMCustomer360Page from "@/pages/crm/customer-360";
// Phase 7H — Logistics
import LogisticsEWayBillPage from "@/pages/logistics/eway-bill";
import LogisticsLiveGPSPage from "@/pages/logistics/live-gps";
import LogisticsRouteOptimizationPage from "@/pages/logistics/route-optimization";
// Phase 7I — Real Estate
import RealEstateRERAPage from "@/pages/real-estate/rera";
import RealEstateDemandLettersPage from "@/pages/real-estate/demand-letters";
import RealEstateProjectPLPage from "@/pages/real-estate/project-pl";
// Phase 7J — Agriculture ERP
import AgricultureMandiPricesPage from "@/pages/agriculture/mandi-prices";
import AgriculturePMFBYPage from "@/pages/agriculture/pmfby";
// Phase 7K — Education ERP
import EducationCertificatesPage from "@/pages/education/certificates";
import EducationNEPCompliancePage from "@/pages/education/nep-compliance";
// Phase 7L — Gold ERP
import GoldLiveRatesPage from "@/pages/gold-erp/live-rates";
import GoldHallmarkingPage from "@/pages/gold-erp/hallmarking";
// Phase 7M — HR ERP
import HREPFOFilingPage from "@/pages/hr/epfo-filing";
import HRComplianceCalendarPage from "@/pages/hr/compliance-calendar";
import HROfferLettersPage from "@/pages/hr/offer-letters";
// Phase 7N — Retail ERP
import RetailFranchisePage from "@/pages/retail/franchise";
import RetailB2BPortalPage from "@/pages/retail/b2b-portal";
// Phase 7O — Manufacturing ERP
import ManufacturingMRPPage from "@/pages/manufacturing/mrp";
import ManufacturingWorkOrdersPage from "@/pages/manufacturing/work-orders";
import ManufacturingQualityPage from "@/pages/manufacturing/quality";
import ManufacturingJobCardsPage from "@/pages/manufacturing/job-cards";
import ManufacturingSubContractingPage from "@/pages/manufacturing/sub-contracting";
import ManufacturingMachineOEEPage from "@/pages/manufacturing/machine-oee";
import { parseISO } from "date-fns";
import NotificationEnginePage from "@/pages/NotificationSettingsPage";

type Role = 'admin' | 'operator' | 'reviewer' | 'manager';

function OperatorDashboard() {
  const { logoutMutation } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'checklist' | 'history' | 'production'>('dashboard');

  const mockStats = [
    { label: 'Pending', value: 3, icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Completed Today', value: 5, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'In Review', value: 2, icon: XCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Alerts', value: 1, icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  const mockTasks = [
    { id: '1', name: 'Clean the Machine', verificationCriteria: 'Wipe down surfaces and remove any spills', result: null, remarks: '' },
    { id: '2', name: 'Check for Leaks', verificationCriteria: 'Inspect hoses and fittings for leaks', result: null, remarks: '' },
    { id: '3', name: 'Inspect Safety Features', verificationCriteria: 'Test emergency stop buttons', result: null, remarks: '' },
    { id: '4', name: 'Functionality Check', verificationCriteria: 'Run a sample batch', result: null, remarks: '' }
  ];

  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'You', status: 'approved' as const },
    { id: '2', machine: 'PET Blowing Machine', date: 'Oct 31, 2025', shift: 'Afternoon', operator: 'You', status: 'in_review' as const },
  ];

  const bottomNav = (
    <div
      className="fixed bottom-0 left-0 right-0 bg-card border-t z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="mobile-bottom-nav"
    >
      <div className="flex">
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('dashboard')}
          data-testid="tab-dashboard"
        >
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-xs">Dashboard</span>
        </button>
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'history' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('history')}
          data-testid="tab-history"
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs">History</span>
        </button>
        <button
          className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeView === 'production' ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveView('production')}
          data-testid="tab-production"
        >
          <Factory className="h-5 w-5" />
          <span className="text-xs">Production</span>
        </button>
      </div>
    </div>
  );

  return (
    <OperatorDashboardShell
      title="Operator Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={1}
      bottomNav={bottomNav}
    >
      {activeView === 'dashboard' && (
        <div className="p-4 space-y-6">
          <DashboardStats stats={mockStats} />
          
          <OperatorAssignedChecklists />
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Assigned Machines</h3>
            <div className="space-y-3">
              <MachineCard
                name="RFC Machine"
                type="Rinse-Fill-Cap"
                status="active"
                lastMaintenance="Oct 28, 2025"
                onClick={() => setActiveView('checklist')}
              />
              <MachineCard
                name="PET Blowing Machine"
                type="Bottle Manufacturing"
                status="active"
                lastMaintenance="Oct 30, 2025"
                onClick={() => setActiveView('checklist')}
              />
            </div>
          </div>
        </div>
      )}

      {activeView === 'checklist' && (
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => setActiveView('dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            ← Back to Dashboard
          </Button>
          <ChecklistForm
            machineName="RFC Machine"
            tasks={mockTasks}
            onSubmit={() => setActiveView('dashboard')}
          />
        </div>
      )}

      {activeView === 'history' && (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">My Submissions</h3>
          <ChecklistHistoryTable records={mockRecords} />
        </div>
      )}

      {activeView === 'production' && (
        <ProductionManagement />
      )}
    </OperatorDashboardShell>
  );
}

const DASHBOARD_VALID_TABS = [
  'overview', 'invoices', 'gatepasses', 'raw-material-issuance', 'products', 'inventory',
  'production', 'finished-goods', 'raw-materials', 'checklists', 'users', 'machines',
  'maintenance', 'reports', 'sales-dashboard', 'vendor-analytics', 'sales-orders',
  'checklist-assignments', 'machine-startup-reminders', 'whatsapp-analytics',
  'product-categories', 'product-types', 'production-entries', 'production-reconciliations',
  'production-reconciliation-report', 'finished-goods-report',
  'variance-analytics', 'purchase-orders', 'pm-history', 'role-permissions',
  'vendors', 'assignments',
  'machine-types', 'pm-templates', 'uom', 'raw-material-types', 'template-management',
  'notification-settings', 'data-import', 'spare-parts-stock', 'roles', 'templates', 'api-keys',
  'sales-returns', 'pending-payments', 'payment-management', 'credit-notes',
  'cancelled-invoices', 'write-off-report', 'dispatch-tracking', 'vendor-types', 'customer-outstanding-report',
  'spare-parts', 'tds-management', 'purchase-returns', 'scrap-management',
  'goods-receipt-notes', 'purchase-requisitions', 'vendor-history', 'vendor-debit-notes', 'customer-advances',
  'inventory-bulk-import', 'inventory-grn-scan', 'inventory-stock-adjustments',
  'hr-employees', 'hr-attendance', 'hr-leaves', 'hr-payroll', 'hr-reports',
  'hr-departments', 'hr-settings', 'hr-recruitment', 'hr-exit', 'hr-tds',
  'crm-leads', 'accounting', 'chart-of-accounts', 'ledger-entries', 'expense-management',
  'cash-register', 'document-management',
  'healthcare', 'education', 'logistics', 'real-estate', 'pos', 'agriculture', 'gold-erp', 'hotel', 'restaurant', 'crm-pipeline', 'ecommerce', 'ngo', 'pharmacy', 'nidhi-company', 'finance-erp',
];

function ReviewerDashboard() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <ReviewerDashboardPage />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      default:
        return <ReviewerDashboardPage />;
    }
  };

  return (
    <DashboardShell
      title="Reviewer Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

function ManagerDashboard() {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const mockRecords = [
    { id: '1', machine: 'RFC Machine', date: 'Oct 31, 2025', shift: 'Morning', operator: 'Ramesh Kumar', status: 'in_review' as const },
  ];

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-4">
            <div className="p-4 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2">Awaiting Final Approval</h3>
                <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
              </Card>

              <TodayProductionStats />

              <PendingPaymentsDashboard />

              <div>
                <h3 className="text-base font-semibold mb-3">For Your Approval</h3>
                <ChecklistHistoryTable records={mockRecords} />
              </div>
            </div>
            <InventorySummaryDashboard />
          </div>
        );
      case 'assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
          </div>
        );
      case 'uom':
      case 'products':
      case 'raw-materials':
      case 'finished-goods':
      case 'vendors':
        return <InventoryManagement activeTab={activeView} />;
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'purchase-orders':
        return (
          <div className="p-4">
            <PurchaseOrderManagement />
          </div>
        );
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'production-reconciliations':
        return <ProductionReconciliations />;
      case 'production-reconciliation-report':
        return <ProductionReconciliationReport />;
      case 'finished-goods-report':
        return <FinishedGoodsReport />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'sales-returns':
        return <SalesReturns />;
      case 'pending-payments':
        return <PendingPayments />;
      case 'payment-management':
        return <PaymentManagement />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'product-categories':
        return <ProductCategories />;
      case 'product-types':
        return <ProductTypes />;
      case 'vendor-types':
        return <VendorTypes />;
      case 'spare-parts':
        return (
          <div className="p-4">
            <AdminSparePartsManagement />
          </div>
        );
      case 'machines':
        return (
          <div className="p-4">
            <AdminMachineConfig />
          </div>
        );
      case 'machine-types':
        return (
          <div className="p-4">
            <AdminMachineTypeConfig />
          </div>
        );
      case 'pm-templates':
        return (
          <div className="p-4">
            <AdminPMTaskListTemplates />
          </div>
        );
      case 'pm-history':
        return (
          <div className="p-4">
            <PMHistoryView />
          </div>
        );
      case 'maintenance':
        return (
          <div className="p-4">
            <MaintenanceSchedule tasks={[]} onComplete={() => {}} />
          </div>
        );
      case 'checklists':
        return (
          <div className="p-4">
            <AdminChecklistBuilder />
          </div>
        );
      case 'checklist-assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
          </div>
        );
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'api-keys':
        return <ApiKeysPage />;
      case 'customer-outstanding-report':
        return <CustomerOutstandingReport />;
      case 'data-import':
        return <DataImport />;
      case 'users':
        return (
          <div className="p-4">
            <AdminUserManagement />
          </div>
        );
      case 'role-permissions':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'template-management':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      case 'vendor-analytics':
        setLocation('/vendor-analytics');
        return null;
      case 'reports':
        return <Reports showHeader={false} />;
      default:
        return (
          <div className="space-y-4">
            <div className="p-4 space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2">Awaiting Final Approval</h3>
                <p className="text-3xl font-bold text-primary">{mockRecords.length}</p>
              </Card>
              <TodayProductionStats />
            </div>
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <DashboardShell
      title="Manager Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
    </DashboardShell>
  );
}

// Dashboard for custom roles - uses AdminDashboard layout with database-based permission filtering
function CustomRoleDashboard({ roleName }: { roleName: string }) {
  const { logoutMutation } = useAuth();
  const { permissions, role: userRoleName, isLoading: permissionsLoading, error: permissionsError } = usePermissions();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const { data: maintenancePlans = [] } = useQuery<any[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  const mockMaintenanceTasks = maintenancePlans.length > 0 
    ? maintenancePlans.map((plan: any) => {
        const isActive = plan.isActive === true || plan.isActive === 'true';
        const isOverdue = plan.nextDueDate && parseISO(plan.nextDueDate) < new Date();
        const status = !isActive ? 'completed' : (isOverdue ? 'overdue' : 'upcoming');
        return {
          id: plan.id,
          machine: plan.machineId || 'Unassigned',
          taskType: plan.planName,
          scheduledDate: plan.nextDueDate ? parseISO(plan.nextDueDate).toLocaleDateString() : 'Not scheduled',
          status: status as 'upcoming' | 'overdue' | 'completed',
          assignedTo: plan.assignedTo || 'Unassigned',
          planData: plan,
        };
      })
    : [];

  const handleCompletePM = (task: any) => {
    if (task.planData) {
      setSelectedPlanForExecution(task.planData);
      setIsExecutionDialogOpen(true);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get all navigation sections, then filter by database permissions for custom roles
  const allNavSections = getAdminNavSections(setLocation);
  const navSections = filterNavSectionsWithDbPermissions(allNavSections, permissions, userRoleName);

  // Show loading state while permissions are being fetched
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state if permissions fetch failed
  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to load permissions</h2>
          <p className="text-muted-foreground">Failed to load your screen permissions. Please refresh the page or contact your administrator.</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </Card>
      </div>
    );
  }

  // If no permissions granted, show access message
  if (navSections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome, {roleName}</h2>
          <p className="text-muted-foreground">No screens have been assigned to your role yet. Please contact your administrator to grant access to specific screens.</p>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <PendingPaymentsDashboard />
            <InventorySummaryDashboard />
          </div>
        );
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'vendor-analytics':
        setLocation('/vendor-analytics');
        return null;
      case 'reports':
        return <Reports showHeader={false} />;
      case 'users':
        return (
          <div className="p-4">
            <AdminUserManagement />
          </div>
        );
      case 'role-permissions':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'machines':
        return (
          <div className="p-4">
            <AdminMachineConfig />
          </div>
        );
      case 'checklists':
        return (
          <div className="p-4">
            <AdminChecklistBuilder />
          </div>
        );
      case 'checklist-assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
          </div>
        );
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'spare-parts':
        return (
          <div className="p-4">
            <AdminSparePartsManagement />
          </div>
        );
      case 'machine-types':
        return (
          <div className="p-4">
            <AdminMachineTypeConfig />
          </div>
        );
      case 'pm-templates':
        return (
          <div className="p-4">
            <AdminPMTaskListTemplates />
          </div>
        );
      case 'maintenance':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Preventive Maintenance</h2>
              <Button onClick={() => setIsPMDialogOpen(true)} data-testid="button-add-maintenance">
                <Plus className="h-4 w-4 mr-1" />
                Schedule PM
              </Button>
            </div>
            <MaintenanceSchedule tasks={mockMaintenanceTasks} onComplete={handleCompletePM} />
          </div>
        );
      case 'pm-history':
        return (
          <div className="p-4">
            <PMHistoryView />
          </div>
        );
      case 'purchase-orders':
        return (
          <div className="p-4">
            <PurchaseOrderManagement />
          </div>
        );
      case 'uom':
      case 'products':
      case 'raw-materials':
      case 'finished-goods':
      case 'vendors':
        return <InventoryManagement activeTab={activeView} />;
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
      case 'product-categories':
        return <ProductCategories />;
      case 'product-types':
        return <ProductTypes />;
      case 'vendor-types':
        return <VendorTypes />;
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'production-reconciliations':
        return <ProductionReconciliations />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'sales-returns':
        return <SalesReturns />;
      case 'pending-payments':
        return <PendingPayments />;
      case 'payment-management':
        return <PaymentManagement />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'data-import':
        return <DataImport />;
      case 'goods-receipt-notes':
        return <GoodsReceiptNotesPage />;
      case 'purchase-requisitions':
        return <PurchaseRequisitionsPage />;
      case 'vendor-history':
        return <VendorHistory />;
      case 'vendor-debit-notes':
        return <VendorDebitNotes />;
      case 'customer-outstanding-report':
        return <CustomerOutstandingReport />;
      case 'customer-advances':
        return <CustomerAdvances />;
      case 'inventory-bulk-import':
        return <InventoryBulkImportPage />;
      case 'inventory-grn-scan':
        return <InventoryGrnScanPage />;
      case 'inventory-stock-adjustments':
        return <InventoryStockAdjustmentsPage />;
      case 'roles':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'templates':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      default:
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <PendingPaymentsDashboard />
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <>
      <DashboardShell
        title={`${roleName} Dashboard`}
        onLogoutClick={handleLogout}
        notificationCount={0}
        navSections={navSections}
        activeView={activeView}
        onNavigate={setActiveView}
      >
        {renderContent()}
      </DashboardShell>
      {isExecutionDialogOpen && selectedPlanForExecution && (
        <PMExecutionDialog
          open={isExecutionDialogOpen}
          onOpenChange={setIsExecutionDialogOpen}
          plan={selectedPlanForExecution}
        />
      )}
    </>
  );
}

function AdminDashboard() {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [isPMDialogOpen, setIsPMDialogOpen] = useState(false);
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<any>(null);

  // Derive activeView directly from URL — synchronous, no useEffect timing issues
  const urlTab = new URLSearchParams(search).get('tab');
  const activeView = (urlTab && DASHBOARD_VALID_TABS.includes(urlTab)) ? urlTab : 'overview';

  // setActiveView updates URL so activeView derives correctly on next render
  const setActiveView = useCallback((view: string) => {
    setLocation(view === 'overview' ? '/' : `/?tab=${view}`);
  }, [setLocation]);

  const { data: maintenancePlans = [] } = useQuery<any[]>({
    queryKey: ['/api/maintenance-plans'],
  });

  const mockMaintenanceTasks = maintenancePlans.length > 0 
    ? maintenancePlans.map((plan: any) => {
        const isActive = plan.isActive === true || plan.isActive === 'true';
        const isOverdue = plan.nextDueDate && parseISO(plan.nextDueDate) < new Date();
        const status = !isActive ? 'completed' : (isOverdue ? 'overdue' : 'upcoming');
        return {
          id: plan.id,
          machine: plan.machineId || 'Unassigned',
          taskType: plan.planName,
          scheduledDate: plan.nextDueDate ? parseISO(plan.nextDueDate).toLocaleDateString() : 'Not scheduled',
          status: status as 'upcoming' | 'overdue' | 'completed',
          assignedTo: plan.assignedTo || 'Unassigned',
          planData: plan,
        };
      })
    : [];

  const handleCompletePM = (task: any) => {
    if (task.planData) {
      setSelectedPlanForExecution(task.planData);
      setIsExecutionDialogOpen(true);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // In-app notification badge — polls active system alerts every 60 s
  const { data: alertCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/generic/system-alerts/count'],
    refetchInterval: 60000,
  });
  const alertCount = alertCountData?.count ?? 0;


  const allNavSections = getAdminNavSections(setLocation);
  const { navSections: filteredNav, isLoading: navLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = navLoading ? allNavSections : filteredNav;


  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <PendingPaymentsDashboard />
            <InventorySummaryDashboard />
          </div>
        );
      case 'users':
        return (
          <div className="p-4">
            <AdminUserManagement />
          </div>
        );
      case 'role-permissions':
        return (
          <div className="p-4">
            <RoleManagement />
          </div>
        );
      case 'machines':
        return (
          <div className="p-4">
            <AdminMachineConfig />
          </div>
        );
      case 'checklists':
        return (
          <div className="p-4">
            <AdminChecklistBuilder />
          </div>
        );
      case 'checklist-assignments':
        return (
          <div className="p-4">
            <ManagerChecklistAssignment />
          </div>
        );
      case 'spare-parts':
        return (
          <div className="p-4">
            <AdminSparePartsManagement />
          </div>
        );
      case 'machine-types':
        return (
          <div className="p-4">
            <AdminMachineTypeConfig />
          </div>
        );
      case 'pm-templates':
        return (
          <div className="p-4">
            <AdminPMTaskListTemplates />
          </div>
        );
      case 'template-management':
        return (
          <div className="p-4">
            <TemplateManagement />
          </div>
        );
      case 'maintenance':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Preventive Maintenance</h2>
              <Button onClick={() => setIsPMDialogOpen(true)} data-testid="button-add-maintenance">
                <Plus className="h-4 w-4 mr-1" />
                Schedule PM
              </Button>
            </div>
            <MaintenanceSchedule tasks={mockMaintenanceTasks} onComplete={handleCompletePM} />
          </div>
        );
      case 'pm-history':
        return (
          <div className="p-4">
            <PMHistoryView />
          </div>
        );
      case 'purchase-orders':
        return (
          <div className="p-4">
            <PurchaseOrderManagement />
          </div>
        );
      case 'uom':
      case 'products':
      case 'raw-materials':
      case 'finished-goods':
      case 'vendors':
        return <InventoryManagement activeTab={activeView} />;
      case 'spare-parts-stock':
        return (
          <div className="p-4">
            <SparePartsStockView />
          </div>
        );
      case 'product-categories':
        return <ProductCategories />;
      case 'product-types':
        return <ProductTypes />;
      case 'vendor-types':
        return <VendorTypes />;
      case 'raw-material-types':
        return <RawMaterialTypeMaster />;
      case 'raw-material-issuance':
      case 'gatepasses':
      case 'invoices':
        return <ProductionManagement activeTab={activeView} />;
      case 'production-entries':
        return <ProductionEntries />;
      case 'production-reconciliations':
        return <ProductionReconciliations />;
      case 'production-reconciliation-report':
        return <ProductionReconciliationReport />;
      case 'finished-goods-report':
        return <FinishedGoodsReport />;
      case 'variance-analytics':
        return <VarianceAnalytics />;
      case 'sales-returns':
        return <SalesReturns />;
      case 'pending-payments':
        return <PendingPayments />;
      case 'payment-management':
        return <PaymentManagement />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'cancelled-invoices':
        return <CancelledInvoices showHeader={false} />;
      case 'write-off-report':
        return <WriteOffReport />;
      case 'sales-orders':
        return <SalesOrdersPage showHeader={false} />;
      case 'dispatch-tracking':
        return <DispatchTracking showHeader={false} />;
      case 'machine-startup-reminders':
        return <MachineStartupReminders />;
      case 'whatsapp-analytics':
        return <WhatsAppAnalytics />;
      case 'notification-settings':
        return <NotificationSettings />;
      case 'notification-engine':
        return <NotificationEnginePage />;
      case 'api-keys':
        return <ApiKeysPage />;
      case 'customer-outstanding-report':
        return <CustomerOutstandingReport />;
      case 'customer-advances':
        return <CustomerAdvances />;
      case 'goods-receipt-notes':
        return <GoodsReceiptNotesPage />;
      case 'purchase-requisitions':
        return <PurchaseRequisitionsPage />;
      case 'vendor-history':
        return <VendorHistory />;
      case 'vendor-debit-notes':
        return <VendorDebitNotes />;
      case 'inventory-bulk-import':
        return <InventoryBulkImportPage />;
      case 'inventory-grn-scan':
        return <InventoryGrnScanPage />;
      case 'inventory-stock-adjustments':
        return <InventoryStockAdjustmentsPage />;
      case 'data-import':
        return <DataImport />;
      case 'sales-dashboard':
        return (
          <div className="p-4">
            <SalesDashboard />
          </div>
        );
      case 'vendor-analytics':
        // Redirect to standalone route
        setLocation('/vendor-analytics');
        return null;
      case 'reports':
        return <Reports showHeader={false} />;
      default:
        return (
          <div className="p-4 space-y-6">
            <AdminDashboardOverview onNavigateToTab={setActiveView} />
            <TodayProductionStats />
            <InventorySummaryDashboard />
          </div>
        );
    }
  };

  return (
    <DashboardShell
      title="Admin Dashboard"
      onLogoutClick={handleLogout}
      notificationCount={alertCount}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {renderContent()}
      
      <SchedulePMDialog open={isPMDialogOpen} onOpenChange={setIsPMDialogOpen} />
      <PMExecutionDialog 
        open={isExecutionDialogOpen} 
        onOpenChange={setIsExecutionDialogOpen} 
        plan={selectedPlanForExecution} 
      />
    </DashboardShell>
  );
}

function RoleAssignment() {
  const { toast } = useToast();
  
  const setRoleMutation = useMutation({
    mutationFn: async (role: Role) => {
      return await apiRequest('POST', '/api/auth/set-role', { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role assigned",
        description: "Your role has been assigned successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <RoleSelector 
      onRoleSelect={(role) => {
        setRoleMutation.mutate(role);
      }}
    />
  );
}

function DemoBanner() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  if (!(user as any)?.isDemo) return null;
  return (
    <div
      data-testid="demo-banner"
      className="sticky top-0 z-[9999] w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm font-medium"
      style={{ background: "hsl(38 95% 48%)", color: "#fff" }}
    >
      <span className="flex items-center gap-2">
        <Play className="w-4 h-4 shrink-0" />
        You are exploring a live demo. Data is shared and may be reset daily.
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-amber-900 border-amber-100 bg-white/90"
          onClick={() => setLocation("/register-company")}
          data-testid="demo-banner-start-trial"
        >
          Start Free Trial
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-white"
          onClick={() => logoutMutation.mutate()}
          data-testid="demo-banner-exit"
        >
          Exit Demo
        </Button>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Super-admin goes directly to their portal — no role selection needed
  if ((user as any)?.isSuperAdmin) {
    return <SuperAdminOverview />;
  }

  if (!(user as any)?.role) {
    return <RoleAssignment />;
  }

  const role = ((user as any).role as string).toLowerCase() as Role;

  const dashboard =
    role === 'operator' ? <OperatorDashboard /> :
    role === 'reviewer' ? <ReviewerDashboard /> :
    role === 'manager'  ? <ManagerDashboard /> :
    role === 'admin'    ? <AdminDashboard /> :
    <CustomRoleDashboard roleName={(user as any).role} />;

  return (
    <>
      <DemoBanner />
      {dashboard}
    </>
  );
}

// Wrapper component for Vendor Management with filtered navigation
function VendorManagementPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendors');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorManagement />
    </DashboardShell>
  );
}

// Wrapper component for Reports with filtered navigation
function ReportsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('reports');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Reports"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <Reports showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Pending Payments with filtered navigation
function PendingPaymentsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('pending-payments');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Pending Payments"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PendingPayments />
    </DashboardShell>
  );
}

function CustomerOutstandingReportPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('customer-outstanding-report');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Customer Outstanding"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => { setActiveView(viewId); }}
    >
      <CustomerOutstandingReport />
    </DashboardShell>
  );
}

// Wrapper component for Payment Management with filtered navigation
function PaymentManagementPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('payment-management');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Payment Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <PaymentManagement />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History with filtered navigation
function VendorHistoryPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistory />
    </DashboardShell>
  );
}

// Wrapper component for Vendor History Detail with filtered navigation
function VendorHistoryDetailPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor History"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorHistoryDetail />
    </DashboardShell>
  );
}

function VendorGroupDetailPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-history');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Vendor Group"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorGroupDetail />
    </DashboardShell>
  );
}

// Permission mapping: maps nav item IDs to database screen_keys
const navItemToScreenKey: Record<string, string> = {
  // Dashboard & Analytics
  'overview': 'dashboard',
  'sales-dashboard': 'sales_dashboard',
  'vendor-analytics': 'vendor_analytics',
  'reports': 'reports',
  // MIS Reports
  'mis-dashboard': 'mis_dashboard',
  'mis-production': 'mis_production',
  'mis-inventory': 'mis_inventory',
  'mis-sales': 'mis_sales',
  'mis-delivery': 'mis_delivery',
  'mis-cash': 'mis_cash',
  'mis-financial': 'mis_financial',
  'mis-manufacturing': 'mis_manufacturing',
  // Quality & Checklists
  'checklists': 'checklist_templates',
  'checklist-assignments': 'checklist_assignments',
  'machine-startup-reminders': 'machine_startup_reminders',
  'whatsapp-analytics': 'whatsapp_analytics',
  // Production & Inventory
  'products': 'products',
  'product-categories': 'product_categories',
  'product-types': 'product_types',
  'raw-materials': 'raw_materials',
  'finished-goods': 'finished_goods',
  'raw-material-issuance': 'raw_material_issuance',
  'production-entries': 'production_entries',
  'production-reconciliations': 'production_reconciliations',
  'production-reconciliation-report': 'production_reconciliation_report',
  'finished-goods-report': 'finished_goods_report',
  'variance-analytics': 'variance_analytics',
  'spare-parts': 'spare_parts',
  // Finance & Sales
  'sales-orders': 'sales_orders',
  'invoices': 'invoices',
  'vendor-history': 'vendor_history',
  'vendor-debit-notes': 'vendor_debit_notes',
  'pending-payments': 'pending_payments',
  'payment-management': 'payments',
  'customer-advances': 'customer_advances',
  'credit-notes': 'credit_notes',
  'cancelled-invoices': 'cancelled_invoices_report',
  'sales-returns': 'sales_returns',
  'write-off-report': 'payment_writeoff',
  // Dispatch & Logistics
  'gatepasses': 'gatepasses',
  'dispatch-tracking': 'dispatch_tracking',
  'dispatch-masters': 'dispatch_masters',
  // Cash & Expenses
  'cash-register': 'cash_register',
  'cash-register-report': 'cash_register_report',
  'expenses': 'expenses',
  'expense-categories': 'expense_categories',
  'monthly-expenses': 'monthly_expenses',
  'documents': 'documents',
  // Accounting & Ledger
  'chart-of-accounts': 'chart_of_accounts',
  'journal-entries': 'journal_entries',
  'journal-entry-new': 'manual_journal_entry',
  'bank-transactions': 'journal_entries',
  'trial-balance': 'trial_balance',
  'profit-loss': 'profit_loss',
  'balance-sheet': 'balance_sheet',
  'ledger-view': 'ledger_view',
  'day-book': 'day_book',
  'aging-report': 'aging_report',
  'cash-flow-statement': 'cash_flow_statement',
  'group-summary': 'group_summary',
  'budget-variance': 'budget_variance',
  // Maintenance
  'maintenance': 'maintenance_plans',
  'pm-history': 'pm_history',
  'purchase-orders': 'purchase_orders',
  'purchase-returns': 'purchase_returns',
  'scrap-management': 'scrap_inventory',
  'tds-management': 'tds_management',
  // Master Data
  'users': 'users',
  'role-permissions': 'roles',
  'vendors': 'vendors',
  'vendor-types': 'vendor_types',
  'machines': 'machines',
  'machine-types': 'machine_types',
  'pm-templates': 'pm_templates',
  'uom': 'uom',
  'raw-material-types': 'raw_material_types',
  'template-management': 'template_management',
  // CRM Module
  'crm-leads': 'crm_leads',
  // HR Module
  'hr-employees': 'hr_employees',
  'hr-attendance': 'hr_attendance',
  'hr-leaves': 'hr_leaves',
  'hr-payroll': 'hr_payroll',
  'hr-exit-management': 'hr_exit_management',
  'hr-loans': 'hr_loans',
  'hr-tds': 'hr_tds',
  'hr-recruitment': 'hr_recruitment',
  'hr-reports': 'hr_reports',
  'hr-ess-admin': 'hr_ess_admin',
  'hr-masters': 'hr_masters',
  // Settings
  'notification-settings': 'notification_settings',
  'data-import': 'data_import',
  'admin-tools': 'admin_tools',
  'company-settings': 'admin_tools',
};

// Legacy permission mapping for backward compatibility with default roles
const navItemToScreen: Record<string, string> = {
  // Dashboard & Analytics
  'overview': 'Overview',
  'sales-dashboard': 'Overview',
  'vendor-analytics': 'Overview',
  'reports': 'Overview',
  // MIS Reports (admin/manager only)
  'mis-dashboard': 'MIS Reports',
  'mis-production': 'MIS Reports',
  'mis-inventory': 'MIS Reports',
  'mis-sales': 'MIS Reports',
  'mis-delivery': 'MIS Reports',
  'mis-cash': 'MIS Reports',
  'mis-financial': 'MIS Reports',
  'mis-manufacturing': 'MIS Reports',
  // Quality & Checklists
  'checklists': 'Checklist Templates',
  'checklist-assignments': 'Checklist Templates',
  'machine-startup-reminders': 'Checklist Templates',
  'whatsapp-analytics': 'Checklist Templates',
  // Production & Inventory
  'products': 'Inventory Management',
  'product-categories': 'Inventory Management',
  'product-types': 'Inventory Management',
  'raw-materials': 'Inventory Management',
  'finished-goods': 'Inventory Management',
  'raw-material-issuance': 'Create Raw Material Transactions',
  'production-entries': 'Create Finished Goods',
  'production-reconciliations': 'Create Finished Goods',
  'production-reconciliation-report': 'Create Finished Goods',
  'finished-goods-report': 'Create Finished Goods',
  'variance-analytics': 'Create Finished Goods',
  'spare-parts-stock': 'Spare Parts Stock',
  // Finance & Sales
  'invoices': 'Purchase Orders',
  'vendor-history': 'Purchase Orders',
  'pending-payments': 'Purchase Orders',
  'payment-management': 'Purchase Orders',
  'credit-notes': 'Purchase Orders',
  'cancelled-invoices': 'Purchase Orders',
  'sales-returns': 'Purchase Orders',
  'write-off-report': 'Purchase Orders',
  // Dispatch & Logistics
  'gatepasses': 'Purchase Orders',
  'dispatch-tracking': 'Purchase Orders',
  // Cash & Expenses
  'cash-register': 'Purchase Orders',
  'cash-register-report': 'Purchase Orders',
  'expenses': 'Purchase Orders',
  'expense-categories': 'Purchase Orders',
  'monthly-expenses': 'Purchase Orders',
  'documents': 'Documents',
  // Finance & Accounts (merged Finance ERP + Accounting & Ledger)
  'finance-erp': 'Finance & Accounts',
  'chart-of-accounts': 'Finance & Accounts',
  'journal-entries': 'Finance & Accounts',
  'journal-entry-new': 'Finance & Accounts',
  'bank-transactions': 'Finance & Accounts',
  'trial-balance': 'Finance & Accounts',
  'profit-loss': 'Finance & Accounts',
  'balance-sheet': 'Finance & Accounts',
  'ledger-view': 'Finance & Accounts',
  'day-book': 'Finance & Accounts',
  'aging-report': 'Finance & Accounts',
  'cash-flow-statement': 'Finance & Accounts',
  'group-summary': 'Finance & Accounts',
  'budget-variance': 'Finance & Accounts',
  'cost-centres': 'Finance & Accounts',
  'currency-management': 'Finance & Accounts',
  'fixed-assets': 'Finance & Accounts',
  'gstr-reports': 'Finance & Accounts',
  // CRM Module
  'crm-leads': 'CRM & Leads',
  // HR Module
  'hr-employees': 'HR & Payroll',
  'hr-attendance': 'HR & Payroll',
  'hr-leaves': 'HR & Payroll',
  'hr-payroll': 'HR & Payroll',
  'hr-exit-management': 'HR & Payroll',
  'hr-loans': 'HR & Payroll',
  'hr-tds': 'HR & Payroll',
  'hr-recruitment': 'HR & Payroll',
  'hr-reports': 'HR & Payroll',
  'hr-masters': 'HR & Payroll',
  'hr-ess-admin': 'HR & Payroll',
  // Maintenance
  'maintenance': 'Maintenance Plans',
  'pm-history': 'PM History',
  'purchase-orders': 'Purchase Orders',
  'purchase-returns': 'Purchase Orders',
  'tds-management': 'Finance & Accounts',
  'scrap-management': 'Create Finished Goods',
  'spare-parts': 'Spare Parts',
  // Master Data
  'users': 'User Management',
  'role-permissions': 'User Management',
  'vendors': 'Inventory Management',
  'vendor-types': 'Inventory Management',
  'machines': 'Machines',
  'machine-types': 'Machine Types',
  'pm-templates': 'PM Templates',
  'uom': 'Inventory Management',
  'raw-material-types': 'Inventory Management',
  'template-management': 'Inventory Management',
  // Settings
  'notification-settings': 'User Management',
  'data-import': 'User Management',
  'admin-tools': 'User Management',
  'company-settings': 'User Management',
};

// Permission matrix: which roles can access which screens
const screenPermissions: Record<string, { admin: boolean; manager: boolean; operator: boolean; reviewer: boolean }> = {
  'Overview': { admin: true, manager: true, operator: true, reviewer: true },
  'MIS Reports': { admin: true, manager: true, operator: false, reviewer: false },
  'User Management': { admin: true, manager: false, operator: false, reviewer: false },
  'Machines': { admin: true, manager: true, operator: false, reviewer: false },
  'Checklist Templates': { admin: true, manager: true, operator: false, reviewer: false },
  'Spare Parts': { admin: true, manager: true, operator: false, reviewer: false },
  'Machine Types': { admin: true, manager: true, operator: false, reviewer: false },
  'PM Templates': { admin: true, manager: true, operator: false, reviewer: false },
  'Maintenance Plans': { admin: true, manager: true, operator: false, reviewer: false },
  'PM History': { admin: true, manager: true, operator: true, reviewer: true },
  'Purchase Orders': { admin: true, manager: true, operator: false, reviewer: false },
  'Inventory Management': { admin: true, manager: true, operator: false, reviewer: false },
  'Create Raw Material Transactions': { admin: true, manager: true, operator: true, reviewer: false },
  'Create Finished Goods': { admin: true, manager: true, operator: true, reviewer: false },
  'Execute Checklists': { admin: true, manager: false, operator: true, reviewer: false },
  'Review Checklists': { admin: true, manager: false, operator: false, reviewer: true },
  'Final Approval': { admin: true, manager: true, operator: false, reviewer: false },
  'Accounting': { admin: true, manager: true, operator: false, reviewer: false },
  'Finance & Accounts': { admin: true, manager: true, operator: false, reviewer: false },
};

// Check if a nav item is accessible for a given role (for default roles)
function canAccessNavItem(itemId: string, role: string): boolean {
  const screenName = navItemToScreen[itemId];
  if (!screenName) return true; // If not mapped, show it (safe default)
  
  const permissions = screenPermissions[screenName];
  if (!permissions) return true; // If no permissions defined, show it
  
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return permissions.admin;
  if (roleLower === 'manager') return permissions.manager;
  if (roleLower === 'operator') return permissions.operator;
  if (roleLower === 'reviewer') return permissions.reviewer;
  
  // Custom roles - return false so they use database permissions check
  return false;
}

// Check if a nav item is accessible using database permissions
interface Permission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

function canAccessNavItemWithDbPermissions(itemId: string, dbPermissions: Permission[]): boolean {
  const screenKey = navItemToScreenKey[itemId];
  if (!screenKey) return false; // If not mapped, hide it for custom roles
  
  // Special case: Admin Tools - show if user has admin_tools OR data_import permission (backward compatibility)
  if (itemId === 'admin-tools') {
    const hasAdminTools = dbPermissions.find(p => p.screenKey === 'admin_tools')?.canView === true;
    const hasDataImport = dbPermissions.find(p => p.screenKey === 'data_import')?.canView === true;
    const hasUsers = dbPermissions.find(p => p.screenKey === 'users')?.canView === true;
    return hasAdminTools || hasDataImport || hasUsers;
  }
  
  // Special case: For 'reports' nav item, also check if user has any individual report_* permissions
  if (itemId === 'reports') {
    const hasReportsAccess = dbPermissions.find(p => p.screenKey === 'reports')?.canView === true;
    if (hasReportsAccess) return true;
    
    // Check for any individual report tab permissions
    const reportTabKeys = [
      'report_gatepasses', 'report_invoices', 'report_issuances', 
      'report_purchase_orders', 'report_maintenance', 'report_expenses',
      'report_cash_register', 'report_gst', 'report_payments',
      'report_finished_goods', 'report_monthly_sales', 'report_monthly_production'
    ];
    return dbPermissions.some(p => reportTabKeys.includes(p.screenKey) && p.canView === true);
  }
  
  const permission = dbPermissions.find(p => p.screenKey === screenKey);
  return permission?.canView === true;
}

// Filter nav sections - this is now a stub, actual filtering done by filterNavSectionsWithDbPermissions
function filterNavSectionsByRole(sections: NavSection[], role: string): NavSection[] {
  // 100% database driven - return empty so filterNavSectionsWithDbPermissions handles all filtering
  return [];
}

// System roles always have full access — no DB permission rows needed
const SYSTEM_ROLES_FULL_ACCESS = ['admin', 'manager', 'accountsmanager'];

// Filter nav sections using database permissions (for custom roles)
function filterNavSectionsWithDbPermissions(sections: NavSection[], dbPermissions: Permission[], roleName?: string): NavSection[] {
  if (!sections || !Array.isArray(sections)) return [];

  // System roles (admin, manager, accountsmanager) see ALL nav items — no DB filter
  const roleNameLower = roleName?.toLowerCase() || '';
  if (roleName && SYSTEM_ROLES_FULL_ACCESS.includes(roleNameLower)) {
    return sections;
  }

  if (!dbPermissions || dbPermissions.length === 0) return [];

  const filtered = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessNavItemWithDbPermissions(item.id, dbPermissions))
    }))
    .filter(section => section.items.length > 0);
    
  return filtered;
}

// ── Gold ERP nav sections ─────────────────────────────────────────────────────
function buildGoldNavSections(setLocation: (path: string) => void): NavSection[] {
  const go = (key: string) => setLocation(`/gold-erp?section=${key}`);
  return [
    {
      id: "gold-erp-section",
      label: "Gold & Jewellery ERP",
      items: [],
      subSections: [
        {
          id: "gold-erp-core",
          label: "Core",
          items: [
            { id: "gold-erp-live-rates",    label: "Live Gold Rates",     icon: TrendingUp,      onClick: () => setLocation("/gold-erp/live-rates") },
            { id: "gold-erp-hallmarking-page", label: "BIS Hallmarking",  icon: Award,           onClick: () => setLocation("/gold-erp/hallmarking") },
            { id: "gold-erp-overview",      label: "Overview",            icon: LayoutDashboard, onClick: () => go("overview") },
            { id: "gold-erp-rates",         label: "Metal Rates",         icon: TrendingUp,      onClick: () => go("rates") },
            { id: "gold-erp-karigar",       label: "Karigar",             icon: Users,           onClick: () => go("karigar") },
            { id: "gold-erp-items",         label: "Jewellery Items",     icon: Package,         onClick: () => go("items") },
            { id: "gold-erp-estimates",     label: "Estimates",           icon: IndianRupee,     onClick: () => go("estimates") },
            { id: "gold-erp-metal-ledger",  label: "Metal Ledger",        icon: BookOpen,        onClick: () => go("metal-ledger") },
          ],
        },
        {
          id: "gold-erp-production",
          label: "Production",
          items: [
            { id: "gold-erp-production",     label: "Production",          icon: Factory,         onClick: () => go("production") },
            { id: "gold-erp-jobwork",        label: "Karigar Job Orders (Internal)", icon: Layers, onClick: () => go("jobwork") },
            { id: "gold-erp-sketch",         label: "Sketch / Design",     icon: Camera,          onClick: () => go("sketch") },
            { id: "gold-erp-cad",            label: "CAD / CAM",           icon: Crosshair,       onClick: () => go("cad") },
            { id: "gold-erp-ghat",           label: "Ghat Settlement",     icon: Coins,           onClick: () => go("ghat") },
            { id: "gold-erp-settlement",     label: "Karigar Settlement",  icon: IndianRupee,     onClick: () => go("settlement") },
            { id: "gold-erp-finalize",       label: "Job Finalize",        icon: CheckCircle,     onClick: () => go("finalize") },
            { id: "gold-erp-karigar-ledger", label: "Karigar Ledger",      icon: BookOpen,        onClick: () => go("karigar-ledger") },
            { id: "gold-erp-repairs",        label: "Repairs",             icon: Wrench,          onClick: () => go("repairs") },
          ],
        },
        {
          id: "gold-erp-wholesale",
          label: "Wholesale & B2B",
          items: [
            { id: "gold-erp-wholesale-jobwork",   label: "Customer Jobwork (Customer's Gold)", icon: Layers, onClick: () => go("wholesale-jobwork") },
            { id: "gold-erp-hallmarking-batches", label: "Hallmarking — Batch Submission",     icon: Award,  onClick: () => go("hallmarking-batches") },
          ],
        },
        {
          id: "gold-erp-retail",
          label: "Retail",
          items: [
            { id: "gold-erp-counter-bookings",   label: "Counter Bookings",     icon: ClipboardList, onClick: () => go("counter-bookings") },
            { id: "gold-erp-customer-approvals", label: "Approvals",            icon: CheckCircle,   onClick: () => go("customer-approvals") },
            { id: "gold-erp-buyback",            label: "Old Gold Buy-back",    icon: RotateCcw,     onClick: () => go("buyback") },
            { id: "gold-erp-physical-audit",     label: "Physical Audit",       icon: ShoppingBag,   onClick: () => go("physical-audit") },
            { id: "gold-erp-loyalty",            label: "Loyalty & Rewards",    icon: Gift,          onClick: () => go("loyalty") },
            { id: "gold-erp-promotions",         label: "Promotions",           icon: Tag,           onClick: () => go("promotions") },
            { id: "gold-erp-refining",           label: "Refining",             icon: Zap,           onClick: () => go("refining") },
            { id: "gold-erp-pos-old-gold",       label: "Old Gold Purchase (No Sale)", icon: ShoppingCart,  onClick: () => go("pos-old-gold") },
            { id: "gold-erp-hallmarking",        label: "Hallmarking — HUID Records",  icon: CheckCircle,   onClick: () => go("hallmarking") },
          ],
        },
        {
          id: "gold-erp-bullion",
          label: "Bullion & Vault",
          items: [
            { id: "gold-erp-bullion",          label: "Bullion Stock",    icon: BarChart3,  onClick: () => go("bullion") },
            { id: "gold-erp-bullion-bookings", label: "Bullion Bookings", icon: CreditCard, onClick: () => go("bullion-bookings") },
            { id: "gold-erp-vault-audit",      label: "Vault Audit",      icon: Shield,     onClick: () => go("vault-audit") },
          ],
        },
        {
          id: "gold-erp-chit",
          label: "Chit Schemes",
          items: [
            { id: "gold-erp-chit",             label: "Chit Schemes",  icon: Shield,        onClick: () => go("chit") },
            { id: "gold-erp-chit-maturity",    label: "Maturity",      icon: CheckCircle,   onClick: () => go("chit-maturity") },
            { id: "gold-erp-chit-defaulters",  label: "Defaulters",    icon: AlertTriangle, onClick: () => go("chit-defaulters") },
            { id: "gold-erp-chit-redemptions", label: "Redemptions",   icon: Gift,          onClick: () => go("chit-redemptions") },
          ],
        },
        {
          id: "gold-erp-digital",
          label: "Digital & OMS",
          items: [
            { id: "gold-erp-ecatalog",   label: "E-Catalog",         icon: BookOpen,      onClick: () => go("ecatalog") },
            { id: "gold-erp-oms-orders", label: "OMS Orders",        icon: ClipboardList, onClick: () => go("oms-orders") },
            { id: "gold-erp-oms-notify", label: "OMS Notifications", icon: Bell,          onClick: () => go("oms-notify") },
            { id: "gold-erp-ecommerce",  label: "E-Commerce Store",  icon: Globe,         onClick: () => go("ecommerce") },
          ],
        },
        {
          id: "gold-erp-rfid",
          label: "RFID",
          items: [
            { id: "gold-erp-rfid", label: "RFID Management", icon: Wifi, onClick: () => go("rfid") },
          ],
        },
        {
          id: "gold-erp-finance",
          label: "Finance",
          items: [
            { id: "gold-erp-metal-finance", label: "Metal Finance", icon: Coins, onClick: () => go("metal-finance") },
          ],
        },
        {
          id: "gold-erp-integrations",
          label: "Integrations",
          items: [
            { id: "gold-erp-integrations-config", label: "Integrations", icon: Settings2, onClick: () => go("integrations-config") },
          ],
        },
      ],
    },
  ];
}

// Shared admin navigation sections factory - matches main dashboard navigation
function getAdminNavSections(setLocation: (path: string) => void, userRole?: string): NavSection[] {
  const allSections: NavSection[] = [
    {
      id: "dashboard",
      label: "Dashboard & Analytics",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, onClick: () => setLocation('/') },
        { id: "sales-dashboard", label: "Sales Dashboard", icon: TrendingUp, onClick: () => setLocation('/?tab=sales-dashboard') },
        { id: "vendor-analytics", label: "Vendor Analytics", icon: Building2, onClick: () => setLocation('/vendor-analytics') },
        { id: "reports", label: "Reports", icon: FileText, onClick: () => setLocation('/reports') },
      ],
    },
    {
      id: "mis-section",
      label: "MIS Reports",
      items: [
        { id: "mis-dashboard", label: "Executive Dashboard", icon: TrendingUp, onClick: () => setLocation('/mis') },
        { id: "mis-production", label: "Production Analytics", icon: Factory, onClick: () => setLocation('/mis/production') },
        { id: "mis-inventory", label: "Inventory Intelligence", icon: Box, onClick: () => setLocation('/mis/inventory') },
        { id: "mis-sales", label: "Sales Analysis", icon: IndianRupee, onClick: () => setLocation('/mis/sales') },
        { id: "mis-delivery", label: "Delivery Performance", icon: Truck, onClick: () => setLocation('/mis/delivery') },
        { id: "mis-cash", label: "Cash Analytics", icon: Wallet, onClick: () => setLocation('/mis/cash') },
        { id: "mis-financial", label: "Financial Analytics", icon: BookOpen, onClick: () => setLocation('/mis/financial') },
        { id: "mis-manufacturing", label: "Mfg Sales Analysis", icon: Factory, onClick: () => setLocation('/mis/manufacturing') },
      ],
    },
    {
      id: "quality-section",
      label: "Quality & Checklists",
      items: [
        { id: "checklists", label: "Checklist Builder", icon: FileText, onClick: () => setLocation('/checklists') },
        { id: "checklist-assignments", label: "Checklist Assignments", icon: ClipboardList, onClick: () => setLocation('/?tab=checklist-assignments') },
        { id: "machine-startup-reminders", label: "Machine Startup Reminders", icon: Bell, onClick: () => setLocation('/?tab=machine-startup-reminders') },
        { id: "whatsapp-analytics", label: "WhatsApp Analytics", icon: TrendingUp, onClick: () => setLocation('/?tab=whatsapp-analytics') },
      ],
    },
    {
      id: "production-section",
      label: "Production & Inventory",
      items: [
        { id: "products", label: "Product Master", icon: Package, onClick: () => setLocation('/?tab=products') },
        { id: "product-categories", label: "Product Categories", icon: Layers, onClick: () => setLocation('/?tab=product-categories') },
        { id: "product-types", label: "Product Types", icon: Archive, onClick: () => setLocation('/?tab=product-types') },
        { id: "raw-materials", label: "Raw Materials", icon: Box, onClick: () => setLocation('/?tab=raw-materials') },
        { id: "finished-goods", label: "Finished Goods", icon: CheckCircle2, onClick: () => setLocation('/?tab=finished-goods') },
        { id: "raw-material-issuance", label: "Raw Material Issuance", icon: Package, onClick: () => setLocation('/?tab=raw-material-issuance') },
        { id: "production-entries", label: "Production Entries", icon: ListChecks, onClick: () => setLocation('/?tab=production-entries') },
        { id: "production-reconciliations", label: "Production Reconciliation", icon: Calculator, onClick: () => setLocation('/?tab=production-reconciliations') },
        { id: "production-reconciliation-report", label: "Reconciliation Report", icon: FileStack, onClick: () => setLocation('/reports/production-reconciliation') },
        { id: "variance-analytics", label: "Variance Analytics", icon: TrendingUp, onClick: () => setLocation('/?tab=variance-analytics') },
        { id: "spare-parts", label: "Spare Parts", icon: Wrench, onClick: () => setLocation('/spare-parts') },
        { id: "scrap-management", label: "Scrap Management", icon: Trash2, onClick: () => setLocation('/scrap-management') },
        { id: "manufacturing/mrp", label: "MRP Engine", icon: Calculator, onClick: () => setLocation('/manufacturing/mrp') },
        { id: "manufacturing/work-orders", label: "Work Orders", icon: ListChecks, onClick: () => setLocation('/manufacturing/work-orders') },
        { id: "manufacturing/quality", label: "Quality Control", icon: CheckCircle, onClick: () => setLocation('/manufacturing/quality') },
        { id: "manufacturing/job-cards", label: "Shop Floor / Job Cards", icon: ClipboardList, onClick: () => setLocation('/manufacturing/job-cards') },
        { id: "manufacturing/sub-contracting", label: "Sub-contracting", icon: Package, onClick: () => setLocation('/manufacturing/sub-contracting') },
        { id: "warehouses", label: "Warehouses & Stock", icon: Archive, onClick: () => setLocation('/warehouses') },
        { id: "inventory-bulk-import", label: "Bulk Import Products", icon: Upload },
        { id: "inventory-grn-scan", label: "GRN Scan (Barcode)", icon: Scan },
        { id: "inventory-stock-adjustments", label: "Stock Adjustments", icon: AlertTriangle },
      ],
    },
    {
      id: "finance-section",
      label: "Finance & Sales",
      items: [
        { id: "sales-orders", label: "Sales Orders", icon: ClipboardList, onClick: () => setLocation('/sales-orders') },
        { id: "invoices", label: "Sales Invoices", icon: Receipt, onClick: () => setLocation('/?tab=invoices') },
        { id: "sales-officers", label: "Sales Officers", icon: Users, onClick: () => setLocation('/sales-officers') },
        { id: "customer-outstanding-report", label: "Customer Outstanding", icon: BarChart3, onClick: () => setLocation('/customer-outstanding-report') },
        { id: "payment-management", label: "Payment Management", icon: CreditCard, onClick: () => setLocation('/payment-management') },
        { id: "customer-advances", label: "Customer Advances", icon: Wallet, onClick: () => setLocation('/customer-advances') },
        { id: "credit-notes", label: "Credit Notes", icon: FileText, onClick: () => setLocation('/credit-notes') },
        { id: "cancelled-invoices", label: "Cancelled Invoices", icon: FileX, onClick: () => setLocation('/cancelled-invoices') },
        { id: "write-off-report", label: "Write-Off Report", icon: XCircle, onClick: () => setLocation('/write-off-report') },
        { id: "sales-returns", label: "Sales Returns", icon: Package, onClick: () => setLocation('/sales-returns') },
        { id: "recurring-invoices", label: "Recurring Invoices", icon: History, onClick: () => setLocation('/recurring-invoices') },
        { id: "vendor-history", label: "Vendor History", icon: History, onClick: () => setLocation('/vendor-history') },
        { id: "vendor-debit-notes", label: "Vendor Debit Notes", icon: FileX, onClick: () => setLocation('/vendor-debit-notes') },
        { id: "pending-payments", label: "Pending Payments", icon: IndianRupee, onClick: () => setLocation('/pending-payments') },
      ],
    },
    {
      id: "dispatch-section",
      label: "Dispatch & Logistics",
      items: [
        { id: "gatepasses", label: "Gatepasses", icon: FileText, onClick: () => setLocation('/?tab=gatepasses') },
        { id: "dispatch-tracking", label: "Dispatch Tracking", icon: Truck, onClick: () => setLocation('/dispatch-tracking') },
        { id: "dispatch-masters", label: "Dispatch Masters", icon: Car, onClick: () => setLocation('/dispatch-masters') },
        { id: "logistics/eway-bill", label: "E-Way Bill", icon: FileText, onClick: () => setLocation('/logistics/eway-bill') },
      ],
    },
    {
      id: "purchases-section",
      label: "Purchases",
      items: [
        { id: "purchase-orders", label: "Purchase Orders", icon: ShoppingCart, onClick: () => setLocation('/?tab=purchase-orders') },
        { id: "purchase-requisitions", label: "Purchase Requisitions", icon: ClipboardList },
        { id: "goods-receipt-notes", label: "Goods Receipt Notes", icon: Package },
        { id: "purchase-returns", label: "Purchase Returns", icon: PackageX, onClick: () => setLocation('/purchase-returns') },
      ],
    },
    {
      id: "cash-section",
      label: "Cash & Expenses",
      items: [
        { id: "cash-register", label: "Daily Cash Register", icon: Calculator, onClick: () => setLocation('/cash-register') },
        { id: "cash-register-report", label: "Cash Register Report", icon: FileStack, onClick: () => setLocation('/cash-register-report') },
        { id: "expenses", label: "Expense Vouchers", icon: Wallet, onClick: () => setLocation('/expenses') },
        { id: "expense-categories", label: "Expense Categories", icon: Tag, onClick: () => setLocation('/expense-categories') },
        { id: "monthly-expenses", label: "Monthly Expenses", icon: Calendar, onClick: () => setLocation('/monthly-expenses') },
      ],
    },
    {
      id: "documents-section",
      label: "Documents",
      items: [
        { id: "documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/documents') },
      ],
    },
    {
      id: "accounting-section",
      label: "Finance & Accounts",
      items: [
        { id: "chart-of-accounts", label: "Chart of Accounts", icon: BookOpen, onClick: () => setLocation('/chart-of-accounts') },
        { id: "journal-entries", label: "Journal Entries", icon: FileStack, onClick: () => setLocation('/journal-entries') },
        { id: "bank-transactions", label: "Bank & Reconciliation", icon: Landmark, onClick: () => setLocation('/bank-transactions') },
        { id: "trial-balance", label: "Trial Balance", icon: Scale, onClick: () => setLocation('/trial-balance') },
        { id: "profit-loss", label: "Profit & Loss", icon: BarChart3, onClick: () => setLocation('/profit-loss') },
        { id: "balance-sheet", label: "Balance Sheet", icon: Scale, onClick: () => setLocation('/balance-sheet') },
        { id: "ledger-view", label: "Ledger View", icon: BookOpen, onClick: () => setLocation('/ledger-view') },
        { id: "day-book", label: "Day Book", icon: FileStack, onClick: () => setLocation('/day-book') },
        { id: "cash-flow-statement", label: "Cash Flow Statement", icon: TrendingUp, onClick: () => setLocation('/cash-flow-statement') },
        { id: "aging-report", label: "Outstanding / Aging", icon: AlertTriangle, onClick: () => setLocation('/aging-report') },
        { id: "group-summary", label: "Group Summary", icon: Layers, onClick: () => setLocation('/group-summary') },
        { id: "budget-variance", label: "Budget & Variance", icon: Scale, onClick: () => setLocation('/budget-variance') },
        { id: "gstr-reports", label: "GST Returns (GSTR)", icon: FileText, onClick: () => setLocation('/gstr-reports') },
        { id: "tds-management", label: "TDS Management", icon: Calculator, onClick: () => setLocation('/tds-management') },
        { id: "cost-centres", label: "Cost Centres", icon: Building2, onClick: () => setLocation('/cost-centres') },
        { id: "currency-management", label: "Multi-currency", icon: IndianRupee, onClick: () => setLocation('/currency-management') },
        { id: "tax-engine", label: "Multi-Country Tax", icon: Globe, onClick: () => setLocation('/tax-engine') },
        { id: "fixed-assets", label: "Fixed Assets", icon: Landmark, onClick: () => setLocation('/fixed-assets') },
      ],
    },
    {
      id: "maintenance-section",
      label: "Maintenance",
      items: [
        { id: "maintenance", label: "PM Schedule", icon: Wrench, onClick: () => setLocation('/?tab=maintenance') },
        { id: "pm-history", label: "PM History", icon: History, onClick: () => setLocation('/?tab=pm-history') },
        { id: "manufacturing/machine-oee", label: "Machine OEE", icon: Activity, onClick: () => setLocation('/manufacturing/machine-oee') },
      ],
    },
    {
      id: "crm-section",
      label: "CRM & Leads",
      items: [
        { id: "crm-leads", label: "Lead Management", icon: Target, onClick: () => setLocation('/crm/leads') },
        { id: "crm-surveys", label: "Feedback & Surveys", icon: Star, onClick: () => setLocation('/crm/surveys') },
        { id: "crm/lead-scoring", label: "Lead Scoring", icon: TrendingUp, onClick: () => setLocation('/crm/lead-scoring') },
        { id: "crm/drip-campaigns", label: "Drip Campaigns", icon: MessageSquare, onClick: () => setLocation('/crm/drip-campaigns') },
        { id: "crm/customer-360", label: "Customer 360", icon: Users, onClick: () => setLocation('/crm/customer-360') },
      ],
    },
    {
      id: "nidhi-erp-section",
      label: "Nidhi Company ERP",
      items: [
        { id: "nidhi/loan-sanction", label: "Loan Sanction", icon: Landmark, onClick: () => setLocation('/nidhi/loan-sanction') },
        { id: "nidhi/pdc-tracking", label: "PDC Tracking", icon: CreditCard, onClick: () => setLocation('/nidhi/pdc-tracking') },
        { id: "nidhi/rbi-returns", label: "RBI NDH Returns", icon: FileText, onClick: () => setLocation('/nidhi/rbi-returns') },
      ],
    },
    {
      id: "realestate-erp-section",
      label: "Real Estate ERP",
      items: [
        { id: "real-estate/rera", label: "RERA Compliance", icon: Shield, onClick: () => setLocation('/real-estate/rera') },
        { id: "real-estate/demand-letters", label: "Demand Letters", icon: FileText, onClick: () => setLocation('/real-estate/demand-letters') },
        { id: "real-estate/project-pl", label: "Project P&L", icon: TrendingUp, onClick: () => setLocation('/real-estate/project-pl') },
      ],
    },
    {
      id: "hr-section",
      label: "HR & Payroll",
      items: [
        { id: "hr-employees", label: "Employees", icon: Users, onClick: () => setLocation('/hr/employees') },
        { id: "hr-attendance", label: "Attendance", icon: Calendar, onClick: () => setLocation('/hr/attendance') },
        { id: "hr-leaves", label: "Leave Management", icon: ClipboardList, onClick: () => setLocation('/hr/leaves') },
        { id: "hr-payroll", label: "Payroll", icon: IndianRupee, onClick: () => setLocation('/hr/payroll') },
        { id: "hr-exit-management", label: "Exit Management", icon: UserX, onClick: () => setLocation('/hr/exit-management') },
        { id: "hr-loans", label: "Loans & Advances", icon: CreditCard, onClick: () => setLocation('/hr/loans') },
        { id: "hr-tds", label: "TDS & Compliance", icon: Shield, onClick: () => setLocation('/hr/tds-declarations') },
        { id: "hr-recruitment", label: "Recruitment", icon: Briefcase, onClick: () => setLocation('/hr/recruitment') },
        { id: "hr-onboarding", label: "Onboarding", icon: CheckCircle2, onClick: () => setLocation('/hr/onboarding') },
        { id: "hr-letters", label: "HR Letters", icon: FileText, onClick: () => setLocation('/hr/letters') },
        { id: "hr-support-desk", label: "Support Desk", icon: MessageSquare, onClick: () => setLocation('/hr/support-desk') },
        { id: "hr-reports", label: "HR Reports", icon: BarChart3, onClick: () => setLocation('/hr/reports') },
        { id: "hr-masters", label: "HR Masters", icon: Settings, onClick: () => setLocation('/hr/masters') },
        { id: "hr-expense-claims", label: "Expense Claims", icon: Wallet, onClick: () => setLocation('/hr/expense-claims') },
        { id: "timesheets", label: "Timesheets", icon: Clock, onClick: () => setLocation('/hr/timesheets') },
        { id: "hr-appraisals", label: "Performance Appraisal", icon: Target, onClick: () => setLocation('/hr/appraisals') },
      ],
    },
    {
      id: "projects-section",
      label: "Projects",
      items: [
        { id: "projects", label: "Project Management", icon: FolderOpen, onClick: () => setLocation('/projects') },
      ],
    },
    {
      id: "master-section",
      label: "Master Data",
      items: [
        { id: "users", label: "Users", icon: Users, onClick: () => setLocation('/?tab=users') },
        { id: "role-permissions", label: "Role Permissions", icon: Shield, onClick: () => setLocation('/?tab=role-permissions') },
        { id: "vendors", label: "Vendor Master", icon: Building2, onClick: () => setLocation('/vendor-management') },
        { id: "vendor-types", label: "Vendor Types", icon: Shield, onClick: () => setLocation('/vendor-types') },
        { id: "machines", label: "Machines", icon: Settings, onClick: () => setLocation('/?tab=machines') },
        { id: "machine-types", label: "Machine Types", icon: Layers, onClick: () => setLocation('/?tab=machine-types') },
        { id: "pm-templates", label: "PM Templates", icon: ListChecks, onClick: () => setLocation('/?tab=pm-templates') },
        { id: "uom", label: "Unit of Measurement", icon: Layers, onClick: () => setLocation('/?tab=uom') },
        { id: "raw-material-types", label: "Raw Material Types", icon: Archive, onClick: () => setLocation('/?tab=raw-material-types') },
        { id: "template-management", label: "Invoice Templates", icon: FileStack, onClick: () => setLocation('/?tab=template-management') },
      ],
    },
    {
      id: "masters-section",
      label: "ERP Masters",
      items: [
        { id: "masters/hsn-codes", label: "HSN Codes", icon: Tag, onClick: () => setLocation('/masters/hsn-codes') },
        { id: "masters/sac-codes", label: "SAC Codes", icon: Tag, onClick: () => setLocation('/masters/sac-codes') },
        { id: "masters/tax-config", label: "Tax Configuration", icon: Settings, onClick: () => setLocation('/masters/tax-config') },
        { id: "masters/states-countries", label: "States & Countries", icon: Globe, onClick: () => setLocation('/masters/states-countries') },
        { id: "masters/bank-master", label: "Bank Master", icon: Landmark, onClick: () => setLocation('/masters/bank-master') },
        { id: "masters/branches", label: "Branches", icon: Building2, onClick: () => setLocation('/masters/branches') },
        { id: "masters/doc-numbering", label: "Document Numbering", icon: FileText, onClick: () => setLocation('/masters/doc-numbering') },
        { id: "masters/email-templates", label: "Email Templates", icon: MessageSquare, onClick: () => setLocation('/masters/email-templates') },
        { id: "masters/sms-templates", label: "SMS Templates", icon: MessageSquare, onClick: () => setLocation('/masters/sms-templates') },
        { id: "masters/approval-matrix", label: "Approval Matrix", icon: CheckCircle, onClick: () => setLocation('/masters/approval-matrix') },
        { id: "masters/feature-flags", label: "Feature Flags", icon: Zap, onClick: () => setLocation('/masters/feature-flags') },
        { id: "masters/print-templates", label: "Print Templates", icon: FileText, onClick: () => setLocation('/masters/print-templates') },
        { id: "masters/webhooks", label: "Webhooks", icon: Wifi, onClick: () => setLocation('/masters/webhooks') },
      ],
    },
    {
      id: "restaurant-erp-section",
      label: "Restaurant / F&B ERP",
      items: [
        { id: "restaurant-pos", label: "POS Terminal", icon: UtensilsCrossed, onClick: () => setLocation('/restaurant-pos') },
        { id: "restaurant-kitchen", label: "Kitchen Display", icon: UtensilsCrossed, onClick: () => setLocation('/restaurant-kitchen') },
        { id: "restaurant-tables", label: "Tables & Floor Plan", icon: LayoutDashboard, onClick: () => setLocation('/restaurant-tables') },
        { id: "restaurant-menu", label: "Menu Management", icon: BookOpen, onClick: () => setLocation('/restaurant-menu') },
        { id: "restaurant-orders", label: "Orders & KOT", icon: ClipboardList, onClick: () => setLocation('/restaurant-orders') },
        { id: "restaurant-delivery", label: "Delivery Orders", icon: Truck, onClick: () => setLocation('/restaurant-delivery') },
        { id: "restaurant-reservations", label: "Reservations", icon: Calendar, onClick: () => setLocation('/restaurant-reservations') },
        { id: "restaurant-shifts", label: "Shifts & Cash", icon: Clock, onClick: () => setLocation('/restaurant-shifts') },
        { id: "restaurant-customers", label: "Customers & Loyalty", icon: Users, onClick: () => setLocation('/restaurant-customers') },
        { id: "restaurant-inventory", label: "Inventory & Recipes", icon: Package, onClick: () => setLocation('/restaurant-inventory') },
        { id: "restaurant-outlets", label: "Outlets & Terminals", icon: Building2, onClick: () => setLocation('/restaurant-outlets') },
        { id: "restaurant-reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/restaurant-reports') },
        { id: "restaurant-aggregators", label: "Delivery Platforms", icon: Truck, onClick: () => setLocation('/restaurant-aggregators') },
        { id: "restaurant-analytics", label: "Analytics & BI", icon: BarChart3, onClick: () => setLocation('/restaurant-analytics') },
        { id: "restaurant-staff", label: "Staff & Tips", icon: Users, onClick: () => setLocation('/restaurant-staff') },
        { id: "restaurant-steward", label: "Steward App", icon: UtensilsCrossed, onClick: () => setLocation('/restaurant-steward') },
        { id: "restaurant-franchise", label: "Franchise", icon: Building2, onClick: () => setLocation('/restaurant-franchise') },
        { id: "restaurant-central-kitchen", label: "Central Kitchen", icon: Package, onClick: () => setLocation('/restaurant-central-kitchen') },
        { id: "restaurant-campaigns", label: "Campaigns", icon: BarChart3, onClick: () => setLocation('/restaurant-campaigns') },
        { id: "restaurant-gift-cards", label: "Gift Cards", icon: Package, onClick: () => setLocation('/restaurant-gift-cards') },
        { id: "restaurant-recipes", label: "Recipe Costing", icon: UtensilsCrossed, onClick: () => setLocation('/restaurant-recipes') },
        { id: "restaurant-payment-terminal", label: "Payment Terminal", icon: Package, onClick: () => setLocation('/restaurant-payment-terminal') },
        { id: "restaurant-menu-translations", label: "Menu Translations", icon: Package, onClick: () => setLocation('/restaurant-menu-translations') },
        { id: "restaurant/ondc-integration", label: "ONDC Integration", icon: Package, onClick: () => setLocation('/restaurant/ondc-integration') },
      ],
    },
    {
      id: "hotel-erp-section",
      label: "Hotel ERP",
      items: [
        { id: "hotel/front-desk", label: "Front Desk", icon: Building2, onClick: () => setLocation('/hotel/front-desk') },
        { id: "hotel/reservations", label: "Reservations", icon: Calendar, onClick: () => setLocation('/hotel/reservations') },
        { id: "hotel/checkin", label: "Check-in / Check-out", icon: CheckCircle, onClick: () => setLocation('/hotel/checkin') },
        { id: "hotel/rooms", label: "Room Management", icon: BedDouble, onClick: () => setLocation('/hotel/rooms') },
        { id: "hotel/folio", label: "Folio & Billing", icon: Receipt, onClick: () => setLocation('/hotel/folio') },
        { id: "hotel/housekeeping", label: "Housekeeping", icon: CheckCircle, onClick: () => setLocation('/hotel/housekeeping') },
        { id: "hotel/rates", label: "Rate Plans", icon: Tag, onClick: () => setLocation('/hotel/rates') },
        { id: "hotel/corporate", label: "Corporate & Agents", icon: Briefcase, onClick: () => setLocation('/hotel/corporate') },
        { id: "hotel/night-audit", label: "Night Audit", icon: Clock, onClick: () => setLocation('/hotel/night-audit') },
        { id: "hotel/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/hotel/reports') },
        { id: "hotel/channel-manager", label: "Channel Manager", icon: BarChart3, onClick: () => setLocation('/hotel/channel-manager') },
        { id: "hotel/revenue-management", label: "Revenue Management", icon: BarChart3, onClick: () => setLocation('/hotel/revenue-management') },
        { id: "hotel/banquet", label: "Banquet & Events", icon: Calendar, onClick: () => setLocation('/hotel/banquet') },
      ],
    },
    {
      id: "healthcare-erp-section",
      label: "Healthcare ERP",
      items: [
        { id: "healthcare/patients", label: "Patient Registration", icon: Users, onClick: () => setLocation('/healthcare/patients') },
        { id: "healthcare/opd", label: "OPD & Appointments", icon: Calendar, onClick: () => setLocation('/healthcare/opd') },
        { id: "healthcare/ipd", label: "IPD & Admissions", icon: BedDouble, onClick: () => setLocation('/healthcare/ipd') },
        { id: "healthcare/beds", label: "Bed Management", icon: BedDouble, onClick: () => setLocation('/healthcare/beds') },
        { id: "healthcare/ot", label: "OT Scheduling", icon: Clock, onClick: () => setLocation('/healthcare/ot') },
        { id: "healthcare/lab", label: "Lab & Diagnostics", icon: ClipboardList, onClick: () => setLocation('/healthcare/lab') },
        { id: "healthcare/nursing", label: "Nursing & Vitals", icon: HeartPulse, onClick: () => setLocation('/healthcare/nursing') },
        { id: "pharmacy/billing", label: "Pharmacy Link", icon: Pill, onClick: () => setLocation('/pharmacy/billing') },
        { id: "healthcare/insurance", label: "Insurance & TPA", icon: Shield, onClick: () => setLocation('/healthcare/insurance') },
        { id: "healthcare/doctors", label: "Doctor Management", icon: Users, onClick: () => setLocation('/healthcare/doctors') },
        { id: "healthcare/blood-bank", label: "Blood Bank", icon: Heart, onClick: () => setLocation('/healthcare/blood-bank') },
        { id: "healthcare/abdm", label: "ABDM / ABHA", icon: Shield, onClick: () => setLocation('/healthcare/abdm') },
        { id: "healthcare/emr", label: "EMR", icon: FileText, onClick: () => setLocation('/healthcare/emr') },
        { id: "healthcare/tpa-claims", label: "TPA Claims", icon: IndianRupee, onClick: () => setLocation('/healthcare/tpa-claims') },
        { id: "healthcare/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/healthcare/reports') },
      ],
    },
    {
      id: "education-erp-section",
      label: "Education ERP",
      items: [
        { id: "education/students", label: "Students", icon: Users, onClick: () => setLocation('/education/students') },
        { id: "education/admissions", label: "Admissions", icon: FolderOpen, onClick: () => setLocation('/education/admissions') },
        { id: "education/classes", label: "Classes & Subjects", icon: BookOpen, onClick: () => setLocation('/education/classes') },
        { id: "education/attendance", label: "Attendance", icon: CheckCircle, onClick: () => setLocation('/education/attendance') },
        { id: "education/exams", label: "Examinations", icon: ClipboardList, onClick: () => setLocation('/education/exams') },
        { id: "education/fees", label: "Fee Management", icon: IndianRupee, onClick: () => setLocation('/education/fees') },
        { id: "education/timetable", label: "Timetable", icon: Calendar, onClick: () => setLocation('/education/timetable') },
        { id: "education/homework", label: "Homework", icon: BookOpen, onClick: () => setLocation('/education/homework') },
        { id: "education/online-exams", label: "Online Exams", icon: ClipboardList, onClick: () => setLocation('/education/online-exams') },
        { id: "education/library", label: "Library", icon: BookOpen, onClick: () => setLocation('/education/library') },
        { id: "education/transport", label: "Transport", icon: Truck, onClick: () => setLocation('/education/transport') },
        { id: "education/hostel", label: "Hostel", icon: BedDouble, onClick: () => setLocation('/education/hostel') },
        { id: "education/parent-portal", label: "Parent Portal", icon: Users, onClick: () => setLocation('/education/parent-portal') },
        { id: "education/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/education/reports') },
      ],
    },
    {
      id: "real-estate-erp-section",
      label: "Real Estate ERP",
      items: [
        { id: "real-estate/projects", label: "Projects & Units", icon: Building2, onClick: () => setLocation('/real-estate/projects') },
        { id: "real-estate/crm", label: "Sales CRM", icon: Users, onClick: () => setLocation('/real-estate/crm') },
        { id: "real-estate/bookings", label: "Bookings", icon: Calendar, onClick: () => setLocation('/real-estate/bookings') },
        { id: "real-estate/collections", label: "Payment Collections", icon: IndianRupee, onClick: () => setLocation('/real-estate/collections') },
        { id: "real-estate/brokers", label: "Broker Management", icon: Users, onClick: () => setLocation('/real-estate/brokers') },
        { id: "real-estate/construction", label: "Construction", icon: Wrench, onClick: () => setLocation('/real-estate/construction') },
        { id: "real-estate/documents", label: "Documents", icon: FolderOpen, onClick: () => setLocation('/real-estate/documents') },
        { id: "real-estate/customer-portal", label: "Customer Portal", icon: Users, onClick: () => setLocation('/real-estate/customer-portal') },
        { id: "real-estate/society", label: "Society", icon: Building2, onClick: () => setLocation('/real-estate/society') },
        { id: "real-estate/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/real-estate/reports') },
      ],
    },
    {
      id: "logistics-erp-section",
      label: "Logistics ERP",
      items: [
        { id: "logistics/eway-bill", label: "E-Way Bill", icon: FileText, onClick: () => setLocation('/logistics/eway-bill') },
        { id: "logistics/live-gps", label: "Live GPS Tracking", icon: MapPin, onClick: () => setLocation('/logistics/live-gps') },
        { id: "logistics/route-optimization", label: "Route Optimization", icon: RouteIcon, onClick: () => setLocation('/logistics/route-optimization') },
        { id: "logistics/fleet", label: "Fleet Management", icon: Truck, onClick: () => setLocation('/logistics/fleet') },
        { id: "logistics/drivers", label: "Drivers", icon: Users, onClick: () => setLocation('/logistics/drivers') },
        { id: "logistics/trips", label: "Trip Management", icon: Car, onClick: () => setLocation('/logistics/trips') },
        { id: "logistics/gps", label: "GPS Tracking", icon: Crosshair, onClick: () => setLocation('/logistics/gps') },
        { id: "logistics/consignments", label: "Consignments", icon: Package, onClick: () => setLocation('/logistics/consignments') },
        { id: "logistics/freight", label: "Freight Billing", icon: Receipt, onClick: () => setLocation('/logistics/freight') },
        { id: "logistics/epod", label: "ePOD", icon: ClipboardCheck, onClick: () => setLocation('/logistics/epod') },
        { id: "logistics/fuel", label: "Fuel Management", icon: Zap, onClick: () => setLocation('/logistics/fuel') },
        { id: "logistics/documents", label: "Vehicle Documents", icon: FolderOpen, onClick: () => setLocation('/logistics/documents') },
        { id: "logistics/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/logistics/reports') },
      ],
    },
    {
      id: "agriculture-erp-section",
      label: "Agriculture ERP",
      items: [
        { id: "agriculture/farms", label: "Farms & Farmers", icon: Leaf, onClick: () => setLocation('/agriculture/farms') },
        { id: "agriculture/crops", label: "Crop Management", icon: Leaf, onClick: () => setLocation('/agriculture/crops') },
        { id: "agriculture/inputs", label: "Crop Inputs", icon: Package, onClick: () => setLocation('/agriculture/inputs') },
        { id: "agriculture/harvest", label: "Harvest Records", icon: Archive, onClick: () => setLocation('/agriculture/harvest') },
        { id: "agriculture/weather", label: "Weather & Advisory", icon: Wifi, onClick: () => setLocation('/agriculture/weather') },
        { id: "agriculture/schemes", label: "Govt Schemes", icon: Shield, onClick: () => setLocation('/agriculture/schemes') },
        { id: "agriculture/fpo", label: "FPO Management", icon: Users, onClick: () => setLocation('/agriculture/fpo') },
        { id: "agriculture/market", label: "Market Prices", icon: TrendingUp, onClick: () => setLocation('/agriculture/market') },
        { id: "agriculture/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/agriculture/reports') },
      ],
    },
    {
      id: "ngo-erp-section",
      label: "NGO / Trust ERP",
      items: [
        { id: "ngo/donors", label: "Donors", icon: Heart, onClick: () => setLocation('/ngo/donors') },
        { id: "ngo/donations", label: "Donations", icon: Gift, onClick: () => setLocation('/ngo/donations') },
        { id: "ngo/80g", label: "80G Receipts", icon: Receipt, onClick: () => setLocation('/ngo/80g') },
        { id: "ngo/projects", label: "Projects", icon: FolderOpen, onClick: () => setLocation('/ngo/projects') },
        { id: "ngo/beneficiaries", label: "Beneficiaries", icon: Users, onClick: () => setLocation('/ngo/beneficiaries') },
        { id: "ngo/grants", label: "Grants", icon: Award, onClick: () => setLocation('/ngo/grants') },
        { id: "ngo/volunteers", label: "Volunteers", icon: Users, onClick: () => setLocation('/ngo/volunteers') },
        { id: "ngo/fcra", label: "FCRA Compliance", icon: Shield, onClick: () => setLocation('/ngo/fcra') },
        { id: "ngo/80g-bulk", label: "80G Bulk Certificates", icon: FileText, onClick: () => setLocation('/ngo/80g-bulk') },
        { id: "ngo/csr", label: "CSR Module", icon: Target, onClick: () => setLocation('/ngo/csr') },
        { id: "ngo/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/ngo/reports') },
      ],
    },
    {
      id: "pharmacy-erp-section",
      label: "Pharmacy ERP",
      items: [
        { id: "pharmacy/billing", label: "Drug Billing POS", icon: Pill, onClick: () => setLocation('/pharmacy/billing') },
        { id: "pharmacy/drugs", label: "Drug Master", icon: Pill, onClick: () => setLocation('/pharmacy/drugs') },
        { id: "pharmacy/stock", label: "Stock Management", icon: Package, onClick: () => setLocation('/pharmacy/stock') },
        { id: "pharmacy/purchases", label: "Purchase Management", icon: ShoppingCart, onClick: () => setLocation('/pharmacy/purchases') },
        { id: "pharmacy/schedule-h", label: "Schedule H Register", icon: ClipboardList, onClick: () => setLocation('/pharmacy/schedule-h') },
        { id: "pharmacy/schedule-x", label: "Schedule X Register", icon: ClipboardList, onClick: () => setLocation('/pharmacy/schedule-x') },
        { id: "pharmacy/licenses", label: "Drug Licenses", icon: Shield, onClick: () => setLocation('/pharmacy/licenses') },
        { id: "pharmacy/expiry", label: "Expiry Alerts", icon: Clock, onClick: () => setLocation('/pharmacy/expiry') },
        { id: "pharmacy/narcotics-register", label: "Narcotics Register", icon: ClipboardList, onClick: () => setLocation('/pharmacy/narcotics-register') },
        { id: "pharmacy/e-invoice", label: "GST E-Invoice", icon: FileText, onClick: () => setLocation('/pharmacy/e-invoice') },
        { id: "pharmacy/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/pharmacy/reports') },
      ],
    },
    {
      id: "crm-erp-section",
      label: "CRM ERP",
      items: [
        { id: "crm-leads", label: "Lead Management", icon: Target, onClick: () => setLocation('/crm/leads') },
        { id: "crm-surveys", label: "Feedback & Surveys", icon: Star, onClick: () => setLocation('/crm/surveys') },
        { id: "crm/pipeline", label: "Pipeline", icon: TrendingUp, onClick: () => setLocation('/crm/pipeline') },
        { id: "crm/contacts", label: "Contacts", icon: Users, onClick: () => setLocation('/crm/contacts') },
        { id: "crm/accounts", label: "Accounts", icon: Building2, onClick: () => setLocation('/crm/accounts') },
        { id: "crm/activities", label: "Activities", icon: Calendar, onClick: () => setLocation('/crm/activities') },
        { id: "crm/email-campaigns", label: "Email Campaigns", icon: MessageSquare, onClick: () => setLocation('/crm/email-campaigns') },
        { id: "crm/whatsapp", label: "WhatsApp CRM", icon: MessageSquare, onClick: () => setLocation('/crm/whatsapp') },
        { id: "crm/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/crm/reports') },
      ],
    },
    {
      id: "nidhi-erp-section",
      label: "Nidhi / NBFC ERP",
      items: [
        { id: "nidhi/members", label: "Members", icon: Users, onClick: () => setLocation('/nidhi/members') },
        { id: "nidhi/deposits", label: "Deposits", icon: Coins, onClick: () => setLocation('/nidhi/deposits') },
        { id: "nidhi/loans", label: "Loans", icon: Landmark, onClick: () => setLocation('/nidhi/loans') },
        { id: "nidhi/emi", label: "EMI Collection", icon: IndianRupee, onClick: () => setLocation('/nidhi/emi') },
        { id: "nidhi/shares", label: "Share Management", icon: TrendingUp, onClick: () => setLocation('/nidhi/shares') },
        { id: "nidhi/gold-rates", label: "Gold Rates", icon: Gem, onClick: () => setLocation('/nidhi/gold-rates') },
        { id: "nidhi/interest-rates", label: "Interest Rates", icon: TrendingUp, onClick: () => setLocation('/nidhi/interest-rates') },
        { id: "nidhi/daily-collection", label: "Daily Collection", icon: Wallet, onClick: () => setLocation('/nidhi/daily-collection') },
        { id: "nidhi/compliance", label: "Compliance (NDH)", icon: Shield, onClick: () => setLocation('/nidhi/compliance') },
        { id: "nidhi/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/nidhi/reports') },
      ],
    },
    {
      id: "ecommerce-erp-section",
      label: "E-Commerce ERP",
      items: [
        { id: "ecommerce/dashboard", label: "Dashboard", icon: LayoutDashboard, onClick: () => setLocation('/ecommerce/dashboard') },
        { id: "ecommerce/orders", label: "Orders", icon: ShoppingCart, onClick: () => setLocation('/ecommerce/orders') },
        { id: "ecommerce/listings", label: "Listings", icon: Package, onClick: () => setLocation('/ecommerce/listings') },
        { id: "ecommerce/shipments", label: "Shipments", icon: Truck, onClick: () => setLocation('/ecommerce/shipments') },
        { id: "ecommerce/returns", label: "Returns & RTO", icon: RotateCcw, onClick: () => setLocation('/ecommerce/returns') },
        { id: "ecommerce/settlements", label: "Settlements", icon: Wallet, onClick: () => setLocation('/ecommerce/settlements') },
        { id: "ecommerce/channels", label: "Channels", icon: Globe, onClick: () => setLocation('/ecommerce/channels') },
        { id: "ecommerce/reports", label: "Reports", icon: BarChart3, onClick: () => setLocation('/ecommerce/reports') },
        { id: "healthcare", label: "Healthcare", icon: Briefcase, onClick: () => setLocation('/healthcare') },
        { id: "education", label: "Education", icon: BookOpen, onClick: () => setLocation('/education') },
        { id: "logistics", label: "Logistics & Transport", icon: Truck, onClick: () => setLocation('/logistics') },
        { id: "real-estate", label: "Real Estate", icon: Building2, onClick: () => setLocation('/real-estate') },
        { id: "agriculture", label: "Agriculture", icon: Layers, onClick: () => setLocation('/agriculture') },
        { id: "agriculture/mandi-prices", label: "Mandi Price Feed", icon: TrendingUp, onClick: () => setLocation('/agriculture/mandi-prices') },
        { id: "agriculture/pmfby", label: "PMFBY Insurance", icon: Shield, onClick: () => setLocation('/agriculture/pmfby') },
        { id: "education/certificates", label: "Certificates", icon: FileText, onClick: () => setLocation('/education/certificates') },
        { id: "education/nep-compliance", label: "NEP 2020 Compliance", icon: CheckCircle, onClick: () => setLocation('/education/nep-compliance') },
      ],
    },
    {
      id: "pos-section",
      label: "Point of Sale",
      items: [
        { id: "pos", label: "POS Terminal", icon: ShoppingCart, onClick: () => setLocation('/pos') },
        { id: "retail/franchise", label: "Franchise Management", icon: Building2, onClick: () => setLocation('/retail/franchise') },
        { id: "retail/b2b-portal", label: "B2B Portal", icon: Layers, onClick: () => setLocation('/retail/b2b-portal') },
      ],
    },
    ...buildGoldNavSections(setLocation),
    {
      id: "api-hub-section",
      label: "API Hub",
      items: [
        { id: "api-keys", label: "API Management", icon: Key, onClick: () => setLocation('/?tab=api-keys') },
      ],
    },
    {
      id: "settings-section",
      label: "Settings",
      items: [
        { id: "notification-settings", label: "Notification Settings", icon: Bell, onClick: () => setLocation('/?tab=notification-settings') },
        { id: "data-import", label: "Data Import", icon: Upload, onClick: () => setLocation('/?tab=data-import') },
        { id: "admin-tools", label: "Admin Tools", icon: Wrench, onClick: () => setLocation('/admin-tools') },
        { id: "company-settings", label: "Company Settings", icon: Building2, onClick: () => setLocation('/company-settings') },
        { id: "price-lists", label: "Price Lists", icon: Tag, onClick: () => setLocation('/price-lists') },
        { id: "approval-workflows", label: "Approval Workflows", icon: CheckCircle, onClick: () => setLocation('/approval-workflows') },
        { id: "audit-log", label: "Audit Log", icon: Shield, onClick: () => setLocation('/audit-log') },
        { id: "security-dashboard", label: "Security Dashboard", icon: Shield, onClick: () => setLocation('/security-dashboard') },
      ],
    },
  ];
  
  // If no role provided, return all sections (admin view)
  if (!userRole) return allSections;
  
  // Filter sections based on user's role permissions
  return filterNavSectionsByRole(allSections, userRole);
}

// Wrapper component for Vendor Analytics with filtered navigation
function VendorAnalyticsPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-analytics');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorAnalytics />
    </DashboardShell>
  );
}

// Wrapper component for Vendor Debit Notes page with filtered navigation
function VendorDebitNotesPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-debit-notes');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Debit Notes"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorDebitNotes />
    </DashboardShell>
  );
}

// Wrapper component for Customer Advances page with filtered navigation
function CustomerAdvancesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('customer-advances');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Customer Advances"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CustomerAdvances />
    </DashboardShell>
  );
}

// Wrapper component for Documents page with filtered navigation
function DocumentsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('documents');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Documents"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
        setLocation('/');
      }}
    >
      <DocumentsPage />
    </DashboardShell>
  );
}

// Wrapper component for Expense Categories page
function ExpenseCategoriesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('expense-categories');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Expense Categories"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <ExpenseCategoriesPage />
    </DashboardShell>
  );
}

// Wrapper component for Expenses page with filtered navigation
function ExpensesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('expenses');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Expense Vouchers"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ExpensesPage />
    </DashboardShell>
  );
}

function MonthlyExpensesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('monthly-expenses');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Monthly Expenses"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => { setActiveView(viewId); }}
    >
      <MonthlyExpensesPage />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register page with filtered navigation
function CashRegisterPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cash Register"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterPage />
    </DashboardShell>
  );
}

function ChartOfAccountsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('chart-of-accounts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Chart of Accounts" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ChartOfAccountsPage />
    </DashboardShell>
  );
}


function AccountSubtypesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('chart-of-accounts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Account Types" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AccountSubtypesPage />
    </DashboardShell>
  );
}

function JournalEntriesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Journal Entries" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <JournalEntriesPage />
    </DashboardShell>
  );
}

function JournalEntryDetailPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Journal Entry" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <JournalEntryDetailPage />
    </DashboardShell>
  );
}

function ManualJournalEntryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('journal-entries');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="New Journal Entry" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ManualJournalEntryPage />
    </DashboardShell>
  );
}

function TrialBalancePageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('trial-balance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Trial Balance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <TrialBalancePage />
    </DashboardShell>
  );
}

function ProfitLossPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('profit-loss');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Profit & Loss" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <ProfitLossPage />
    </DashboardShell>
  );
}

function BalanceSheetPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('balance-sheet');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Balance Sheet" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BalanceSheetPage />
    </DashboardShell>
  );
}

function BankTransactionsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('bank-transactions');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Bank Statements" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BankTransactionsPage />
    </DashboardShell>
  );
}

function LedgerViewPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('ledger-view');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Ledger View" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <LedgerViewPage />
    </DashboardShell>
  );
}

function DayBookPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('day-book');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Day Book" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <DayBookPage />
    </DashboardShell>
  );
}

function AgingReportPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('aging-report');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Outstanding / Aging Report" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AgingReportPage />
    </DashboardShell>
  );
}

function CashFlowStatementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-flow-statement');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Cash Flow Statement" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <CashFlowStatementPage />
    </DashboardShell>
  );
}

function GroupSummaryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('group-summary');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Group Summary" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <GroupSummaryPage />
    </DashboardShell>
  );
}

function BudgetVariancePageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('budget-variance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Budget & Variance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <BudgetVariancePage />
    </DashboardShell>
  );
}

function AdminToolsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('admin-tools');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Admin Tools" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); }}>
      <AdminToolsPage />
    </DashboardShell>
  );
}

function TenantSettingsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('company-settings');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Company Settings" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => { setActiveView(viewId); setLocation(`/${viewId}`); }}>
      <TenantSettings />
    </DashboardShell>
  );
}

// Wrapper component for Cash Register Report page with filtered navigation
function CashRegisterReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cash-register-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cash Register Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CashRegisterReport />
    </DashboardShell>
  );
}

// Wrapper component for Credit Notes page with filtered navigation
function CreditNotesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('credit-notes');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Credit Notes"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CreditNotes />
    </DashboardShell>
  );
}

// Wrapper component for Sales Returns page with filtered navigation
function SalesReturnsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-returns');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Sales Returns"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <SalesReturns />
    </DashboardShell>
  );
}

// Wrapper component for Write-Off Report page with filtered navigation
function WriteOffReportPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('write-off-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Write-Off Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <WriteOffReport showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Dispatch Tracking page with filtered navigation
function DispatchTrackingPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('dispatch-tracking');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Dispatch Tracking"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <DispatchTracking showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Cancelled Invoices page with filtered navigation
function CancelledInvoicesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cancelled-invoices');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Cancelled Invoices"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <CancelledInvoices showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Checklists page with filtered navigation
function ChecklistsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('checklists');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Checklists"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ChecklistsPage showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Reviewer Dashboard page with filtered navigation
function ReviewerDashboardPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('overview');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Reviewer Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ReviewerDashboardPage />
    </DashboardShell>
  );
}

// Wrapper component for Vendor Types page with filtered navigation
function VendorTypesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('vendor-types');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Vendor Types"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <VendorTypes />
    </DashboardShell>
  );
}

// Wrapper component for Dispatch Masters page with filtered navigation
function DispatchMastersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('dispatch-masters');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Dispatch Master Data"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <DispatchMasters />
    </DashboardShell>
  );
}

// Wrapper component for Invoice Detail page with filtered navigation
function InvoiceDetailPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('invoices');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Invoice Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <InvoiceDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Sales Orders page with filtered navigation
function SalesOrdersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-orders');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Orders"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOrdersPage showHeader={false} />
    </DashboardShell>
  );
}

function SalesOfficersPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-officers');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Officers"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOfficersPage showHeader={false} />
    </DashboardShell>
  );
}

function SalesOrderDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('sales-orders');

  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;

  return (
    <DashboardShell
      title="Sales Order Detail"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <SalesOrderDetailPage showHeader={false} />
    </DashboardShell>
  );
}

function RawMaterialDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('raw-materials');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Raw Material Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <RawMaterialDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Raw Material Type Detail page with filtered navigation
function RawMaterialTypeDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('raw-material-types');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Material Type Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <RawMaterialTypeDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Product Detail page with filtered navigation
function ProductDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('products');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Product Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Finished Good Detail page with filtered navigation
function FinishedGoodDetailWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('finished-goods');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Finished Good Details"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <FinishedGoodDetail showHeader={false} />
    </DashboardShell>
  );
}

// Wrapper component for Production Management page with filtered navigation
function ProductionManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('production-entries');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Management"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductionManagement />
    </DashboardShell>
  );
}

// Wrapper component for Production Reconciliation Report page with filtered navigation
function ProductionReconciliationReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('production-reconciliation-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Reconciliation Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <ProductionReconciliationReport />
    </DashboardShell>
  );
}

// Wrapper component for Finished Goods Report page with filtered navigation
function FinishedGoodsReportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('finished-goods-report');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Finished Goods Inventory Report"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => {
        setActiveView(viewId);
      }}
    >
      <FinishedGoodsReport />
    </DashboardShell>
  );
}

// MIS Dashboard wrapper
function MISDashboardPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-dashboard');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="MIS Executive Dashboard"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISDashboard />
    </DashboardShell>
  );
}

// MIS Production Analytics wrapper
function MISProductionPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-production');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Production Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISProduction />
    </DashboardShell>
  );
}

// MIS Inventory Intelligence wrapper
function MISInventoryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-inventory');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Inventory Intelligence"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISInventory />
    </DashboardShell>
  );
}

// MIS Sales Analysis wrapper
function MISSalesPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-sales');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Sales Analysis"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISSales />
    </DashboardShell>
  );
}

// MIS Financial Analytics wrapper
function MISFinancialPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-financial');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Financial Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISFinancial />
    </DashboardShell>
  );
}

// MIS Cash Analytics wrapper
function MISCashPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-cash');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Cash Analytics"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISCash />
    </DashboardShell>
  );
}

// MIS Delivery Performance wrapper
function MISDeliveryPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-delivery');
  
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  
  return (
    <DashboardShell
      title="Delivery Performance"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISDelivery />
    </DashboardShell>
  );
}

function MISManufacturingPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('mis-manufacturing');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell
      title="Manufacturing Sales Analysis"
      onLogoutClick={() => logoutMutation.mutate()}
      notificationCount={0}
      navSections={resolvedNav}
      activeView={activeView}
      onNavigate={(viewId) => setActiveView(viewId)}
    >
      <MISManufacturing />
    </DashboardShell>
  );
}

function SparePartsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('spare-parts');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Spare Parts" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <SpareParts />
    </DashboardShell>
  );
}

function ScrapManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('scrap-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Scrap Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <ScrapManagement />
    </DashboardShell>
  );
}

function PurchaseReturnsPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('purchase-returns');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Purchase Returns" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <PurchaseReturns />
    </DashboardShell>
  );
}

function TDSManagementPageWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('tds-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="TDS Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0} navSections={resolvedNav} activeView={activeView} onNavigate={(viewId) => setActiveView(viewId)}>
      <TDSManagement />
    </DashboardShell>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainContent = document.querySelector('.flex-1.pt-16');
    if (mainContent) mainContent.scrollTop = 0;
  }, [location]);
  return null;
}

function SmartRoot() {
  const { user, isLoading } = useAuth();
  // null = still checking | '' = no tenant (show landing) | 'kinto' = redirect to /auth
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish first
    if (isLoading) return;
    // User is already logged in — no domain check needed
    if (user) { setTenantSlug(''); return; }
    // Auth done, no user — check if this origin belongs to a tenant
    const origin = window.location.origin;
    fetch(`/api/public/tenant-branding?origin=${encodeURIComponent(origin)}&_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        // data.slug present → tenant custom domain → go to their login
        setTenantSlug(data?.slug ?? '');
      })
      .catch(() => setTenantSlug(''));
  }, [user, isLoading]);

  // Still resolving auth or domain check
  if (isLoading || tenantSlug === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  // Known tenant domain → hard redirect to their auth page
  if (tenantSlug) {
    return <Redirect to={`/auth?tenant=${encodeURIComponent(tenantSlug)}`} />;
  }
  if (!user) return <LandingPage />;
  return <AuthenticatedApp />;
}

// ── HR Module Wrappers ────────────────────────────────────────────────────────
function HREmployeesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-employees');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Employees" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HREmployeesPage />
    </DashboardShell>
  );
}

function HRAttendanceWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-attendance');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Attendance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRAttendancePage />
    </DashboardShell>
  );
}

function HRLeavesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-leaves');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Leave Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRLeavesPage />
    </DashboardShell>
  );
}

function HRPayrollWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-payroll');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Payroll" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRPayrollPage />
    </DashboardShell>
  );
}

function HRMastersWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-masters');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Masters" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRMastersPage />
    </DashboardShell>
  );
}

function HRReportsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-reports');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Reports" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRReportsPage />
    </DashboardShell>
  );
}

function HRExitManagementWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-exit-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Exit Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRExitManagementPage />
    </DashboardShell>
  );
}

function HRTdsDeclarationsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-tds');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="TDS & Compliance" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRTdsDeclarationsPage />
    </DashboardShell>
  );
}

function CRMLeadsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('crm-leads');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Lead Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <CRMLeadsPage />
    </DashboardShell>
  );
}

function CRMPipelineLegacyWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('crm-pipeline');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="CRM Pipeline" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <CRMPipelinePage />
    </DashboardShell>
  );
}

function HRRecruitmentWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-recruitment');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Recruitment" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRRecruitmentPage />
    </DashboardShell>
  );
}

function HRLoansWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-loans');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Loans & Advances" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRLoansPage />
    </DashboardShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/company" component={CompanySelectPage} />
      <Route path="/company-select" component={CompanySelectPage} />
      <Route path="/register-company" component={RegisterCompanyPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/solutions" component={SolutionsPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/restaurant-feedback/:outletId" component={RestaurantFeedbackPublicPage} />
      <Route path="/restaurant-feedback" component={RestaurantFeedbackPublicPage} />
      <Route path="/restaurant-kiosk/:outletId" component={RestaurantKioskPage} />
      <Route path="/restaurant-kiosk" component={RestaurantKioskPage} />
      <Route path="/order/:slug" component={RestaurantOnlineOrderPage} />
      <ProtectedRoute path="/super-admin/overview" component={() => <SuperAdminOverview />} />
      <ProtectedRoute path="/super-admin/tenants" component={() => <SuperAdminTenants />} />
      <ProtectedRoute path="/super-admin/billing" component={() => <SuperAdminBilling />} />
      <ProtectedRoute path="/super-admin/plans" component={() => <SuperAdminPlans />} />
      <ProtectedRoute path="/super-admin/demo-requests" component={() => <SuperAdminDemoRequests />} />
      <ProtectedRoute path="/super-admin/backups" component={() => <SuperAdminBackups />} />
      <ProtectedRoute path="/super-admin/module-catalog" component={() => <SuperAdminModuleCatalog />} />
      <ProtectedRoute path="/super-admin/settings" component={() => <SuperAdminSettings />} />
      <ProtectedRoute path="/super-admin/security" component={() => <SuperAdminSecurity />} />
      <ProtectedRoute path="/super-admin/setup-wizard" component={() => <SuperAdminSetupWizard />} />
      <Route path="/print/invoice/:id" component={PrintInvoicePage} />
      <Route path="/print/gatepass/:id" component={PrintGatepassPage} />
      <Route path="/print/credit-note/:id" component={PrintCreditNotePage} />
      <Route path="/print/debit-note/:id" component={PrintDebitNotePage} />
      <Route path="/print/invoice-gatepass/:invoiceId/:gatepassId" component={PrintInvoiceGatepassPage} />
      <ProtectedRoute path="/checklists" component={ChecklistsPageWrapper} />
      <ProtectedRoute path="/reviewer-dashboard" component={ReviewerDashboardPageWrapper} />
      <ProtectedRoute path="/vendor-types" component={VendorTypesPageWrapper} />
      <ProtectedRoute path="/vendor-management" component={VendorManagementPage} />
      <ProtectedRoute path="/vendor-history" component={VendorHistoryPage} />
      <ProtectedRoute path="/vendor-group/:vendorName" component={VendorGroupDetailPage} />
      <ProtectedRoute path="/vendor-history/:vendorId" component={VendorHistoryDetailPage} />
      <ProtectedRoute path="/invoice/:id" component={InvoiceDetailPageWrapper} />
      <ProtectedRoute path="/sales-orders" component={SalesOrdersPageWrapper} />
      <ProtectedRoute path="/sales-orders/:id" component={SalesOrderDetailWrapper} />
      <ProtectedRoute path="/sales-officers" component={SalesOfficersPageWrapper} />
      <ProtectedRoute path="/raw-material/:id" component={RawMaterialDetailWrapper} />
      <ProtectedRoute path="/raw-material-type/:id" component={RawMaterialTypeDetailWrapper} />
      <ProtectedRoute path="/product/:id" component={ProductDetailWrapper} />
      <ProtectedRoute path="/finished-good/:id" component={FinishedGoodDetailWrapper} />
      <ProtectedRoute path="/dispatch-tracking" component={DispatchTrackingPageWrapper} />
      <ProtectedRoute path="/dispatch-masters" component={DispatchMastersPageWrapper} />
      <ProtectedRoute path="/sales-returns" component={SalesReturnsPageWrapper} />
      <ProtectedRoute path="/credit-notes" component={CreditNotesPageWrapper} />
      <ProtectedRoute path="/cancelled-invoices" component={CancelledInvoicesPageWrapper} />
      <ProtectedRoute path="/write-off-report" component={WriteOffReportPageWrapper} />
      <ProtectedRoute path="/pending-payments" component={PendingPaymentsPage} />
      <ProtectedRoute path="/customer-outstanding-report" component={CustomerOutstandingReportPage} />
      <ProtectedRoute path="/payment-management" component={PaymentManagementPage} />
      <ProtectedRoute path="/vendor-analytics" component={VendorAnalyticsPage} />
      <ProtectedRoute path="/spare-parts" component={SparePartsPageWrapper} />
      <ProtectedRoute path="/scrap-management" component={ScrapManagementPageWrapper} />
      <ProtectedRoute path="/purchase-returns" component={PurchaseReturnsPageWrapper} />
      <ProtectedRoute path="/tds-management" component={TDSManagementPageWrapper} />
      <ProtectedRoute path="/vendor-debit-notes" component={VendorDebitNotesPage} />
      <ProtectedRoute path="/customer-advances" component={CustomerAdvancesPageWrapper} />
      <ProtectedRoute path="/mis" component={MISDashboardPageWrapper} />
      <ProtectedRoute path="/mis/production" component={MISProductionPageWrapper} />
      <ProtectedRoute path="/mis/inventory" component={MISInventoryPageWrapper} />
      <ProtectedRoute path="/mis/sales" component={MISSalesPageWrapper} />
      <ProtectedRoute path="/mis/delivery" component={MISDeliveryPageWrapper} />
      <ProtectedRoute path="/mis/cash" component={MISCashPageWrapper} />
      <ProtectedRoute path="/mis/financial" component={MISFinancialPageWrapper} />
      <ProtectedRoute path="/mis/manufacturing" component={MISManufacturingPageWrapper} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/production-management" component={ProductionManagementPageWrapper} />
      <ProtectedRoute path="/reports/production-reconciliation" component={ProductionReconciliationReportWrapper} />
      <ProtectedRoute path="/reports/finished-goods" component={FinishedGoodsReportWrapper} />
      <ProtectedRoute path="/documents" component={DocumentsPageWrapper} />
      <ProtectedRoute path="/expenses" component={ExpensesPageWrapper} />
      <ProtectedRoute path="/expense-categories" component={ExpenseCategoriesPageWrapper} />
      <ProtectedRoute path="/monthly-expenses" component={MonthlyExpensesPageWrapper} />
      <ProtectedRoute path="/cash-register" component={CashRegisterPageWrapper} />
      <ProtectedRoute path="/cash-register-report" component={CashRegisterReportWrapper} />
      <ProtectedRoute path="/cash-register/vouchers/print" component={CashRegisterVoucherPrint} />
      <ProtectedRoute path="/chart-of-accounts" component={ChartOfAccountsPageWrapper} />
      <ProtectedRoute path="/account-types" component={AccountSubtypesPageWrapper} />
      <ProtectedRoute path="/journal-entries" component={JournalEntriesPageWrapper} />
      <ProtectedRoute path="/trial-balance" component={TrialBalancePageWrapper} />
      <ProtectedRoute path="/profit-loss" component={ProfitLossPageWrapper} />
      <ProtectedRoute path="/balance-sheet" component={BalanceSheetPageWrapper} />
      <ProtectedRoute path="/bank-transactions" component={BankTransactionsPageWrapper} />
      <ProtectedRoute path="/ledger-view" component={LedgerViewPageWrapper} />
      <ProtectedRoute path="/day-book" component={DayBookPageWrapper} />
      <ProtectedRoute path="/aging-report" component={AgingReportPageWrapper} />
      <ProtectedRoute path="/accounts-payable" component={() => <AccountsPayablePage />} />
      <ProtectedRoute path="/bank-reconciliation" component={() => <BankReconciliationPage />} />
      <ProtectedRoute path="/period-close" component={() => <PeriodClosePage />} />
      <ProtectedRoute path="/cash-flow-statement" component={CashFlowStatementPageWrapper} />
      <ProtectedRoute path="/group-summary" component={GroupSummaryPageWrapper} />
      <ProtectedRoute path="/budget-variance" component={BudgetVariancePageWrapper} />
      <ProtectedRoute path="/admin-tools" component={AdminToolsPageWrapper} />
      <ProtectedRoute path="/company-settings" component={TenantSettingsPageWrapper} />
      <ProtectedRoute path="/hr/employees" component={HREmployeesWrapper} />
      <ProtectedRoute path="/hr/attendance" component={HRAttendanceWrapper} />
      <ProtectedRoute path="/hr/leaves" component={HRLeavesWrapper} />
      <ProtectedRoute path="/hr/payroll" component={HRPayrollWrapper} />
      <ProtectedRoute path="/hr/masters" component={HRMastersWrapper} />
      <ProtectedRoute path="/hr/exit-management" component={HRExitManagementWrapper} />
      <ProtectedRoute path="/hr/loans" component={HRLoansWrapper} />
      <ProtectedRoute path="/hr/tds-declarations" component={HRTdsDeclarationsWrapper} />
      <ProtectedRoute path="/crm/leads" component={CRMLeadsWrapper} />
      <ProtectedRoute path="/hr/recruitment" component={HRRecruitmentWrapper} />
      <ProtectedRoute path="/hr/reports" component={HRReportsWrapper} />
      <Route path="/hr/payslip/:id" component={HRPayslipPage} />
      <ProtectedRoute path="/hr/expense-claims" component={HRExpenseClaimsWrapper} />
      <ProtectedRoute path="/hr/onboarding" component={HROnboardingWrapper} />
      <ProtectedRoute path="/hr/letters" component={HRLettersWrapper} />
      <ProtectedRoute path="/hr/support-desk" component={HRSupportDeskWrapper} />
      <ProtectedRoute path="/crm/surveys" component={CRMSurveysWrapper} />
      <ProtectedRoute path="/hr/timesheets" component={TimesheetsWrapper} />
      <ProtectedRoute path="/hr/appraisals" component={PerformanceAppraisalWrapper} />
      <ProtectedRoute path="/recurring-invoices" component={RecurringInvoicesWrapper} />
      <ProtectedRoute path="/warehouses" component={WarehousesWrapper} />
      <ProtectedRoute path="/inventory/bulk-import" component={InventoryBulkImportWrapper} />
      <ProtectedRoute path="/inventory/grn-scan" component={InventoryGrnScanWrapper} />
      <ProtectedRoute path="/inventory/stock-adjustments" component={InventoryStockAdjustmentsWrapper} />
      <ProtectedRoute path="/projects" component={ProjectManagementWrapper} />
      <ProtectedRoute path="/fixed-assets" component={FixedAssetsWrapper} />
      <ProtectedRoute path="/currency-management" component={CurrencyManagementWrapper} />
      <ProtectedRoute path="/tax-engine" component={() => <TaxEnginePage />} />
      <ProtectedRoute path="/cost-centres" component={CostCentresWrapper} />
      <ProtectedRoute path="/purchase-requisitions" component={PurchaseRequisitionsWrapper} />
      <ProtectedRoute path="/approval-workflows" component={ApprovalWorkflowsWrapper} />
      <ProtectedRoute path="/goods-receipt-notes" component={GoodsReceiptNotesWrapper} />
      <ProtectedRoute path="/price-lists" component={PriceListsWrapper} />
      <ProtectedRoute path="/gstr-reports" component={GSTRReportsWrapper} />
      <ProtectedRoute path="/gstr-filing" component={() => <GSTRFilingPage />} />
      <ProtectedRoute path="/multi-company" component={() => <MultiCompanyPage />} />
      <ProtectedRoute path="/audit-log" component={AuditLogWrapper} />
      <ProtectedRoute path="/security-dashboard" component={SecurityDashboardPage} />
      <ProtectedRoute path="/pos" component={POSWrapper} />
        <ProtectedRoute path="/einvoice" component={EInvoicePage} />
      <ProtectedRoute path="/crm-pipeline" component={CRMPipelineLegacyWrapper} />
        <ProtectedRoute path="/finance-erp" component={FinanceErpWrapper} />

      <ProtectedRoute path="/restaurant-pos" component={RestaurantPOSWrapper} />
      <ProtectedRoute path="/restaurant-kitchen" component={RestaurantKitchenWrapper} />
      <ProtectedRoute path="/restaurant-tables" component={RestaurantTablesWrapper} />
      <ProtectedRoute path="/restaurant-menu" component={RestaurantMenuWrapper} />
      <ProtectedRoute path="/restaurant-orders" component={RestaurantOrdersWrapper} />
      <ProtectedRoute path="/restaurant-delivery" component={RestaurantDeliveryWrapper} />
      <ProtectedRoute path="/restaurant-reservations" component={RestaurantReservationsWrapper} />
      <ProtectedRoute path="/restaurant-shifts" component={RestaurantShiftsWrapper} />
      <ProtectedRoute path="/restaurant-customers" component={RestaurantCustomersWrapper} />
      <ProtectedRoute path="/restaurant-inventory" component={RestaurantInventoryWrapper} />
      <ProtectedRoute path="/restaurant-outlets" component={RestaurantOutletsWrapper} />
      <ProtectedRoute path="/restaurant-reports" component={RestaurantReportsWrapper} />
      <ProtectedRoute path="/restaurant-aggregators" component={RestaurantAggregatorsWrapper} />
      <ProtectedRoute path="/restaurant-analytics" component={RestaurantAnalyticsWrapper} />
      <ProtectedRoute path="/restaurant-staff" component={RestaurantStaffWrapper} />
      <ProtectedRoute path="/restaurant-steward" component={RestaurantStewardWrapper} />
      <ProtectedRoute path="/restaurant-franchise" component={RestaurantFranchiseWrapper} />
      <ProtectedRoute path="/restaurant-tax-settings" component={RestaurantTaxSettingsWrapper} />
      <ProtectedRoute path="/restaurant-gift-cards" component={RestaurantGiftCardsWrapper} />
      <ProtectedRoute path="/restaurant-central-kitchen" component={RestaurantCentralKitchenWrapper} />
      <ProtectedRoute path="/restaurant-menu-translations" component={RestaurantMenuTranslationsWrapper} />
      <ProtectedRoute path="/restaurant-campaigns" component={RestaurantCampaignsWrapper} />
      <ProtectedRoute path="/restaurant-recipes" component={RestaurantRecipesWrapper} />
      <ProtectedRoute path="/restaurant-payment-terminal" component={RestaurantPaymentTerminalWrapper} />
      <ProtectedRoute path="/restaurant/ondc-integration" component={() => <OndcIntegrationPage />} />
      <Route path="/restaurant-table-order/:outletId/:tableId" component={RestaurantTableOrderPage} />
      <Route path="/restaurant-table-order/:outletId" component={RestaurantTableOrderPage} />
      <Route path="/restaurant-cds" component={RestaurantCDSPage} />
      <ProtectedRoute path="/hotel/front-desk" component={HotelFrontDeskWrapper} />
      <ProtectedRoute path="/hotel/reservations" component={HotelReservationsWrapper} />
      <ProtectedRoute path="/hotel/checkin" component={HotelCheckinWrapper} />
      <ProtectedRoute path="/hotel/rooms" component={HotelRoomsWrapper} />
      <ProtectedRoute path="/hotel/folio" component={HotelFolioWrapper} />
      <ProtectedRoute path="/hotel/housekeeping" component={HotelHousekeepingWrapper} />
      <ProtectedRoute path="/hotel/rates" component={HotelRatesWrapper} />
      <ProtectedRoute path="/hotel/corporate" component={HotelCorporateWrapper} />
      <ProtectedRoute path="/hotel/night-audit" component={HotelNightAuditWrapper} />
      <ProtectedRoute path="/hotel/reports" component={HotelReportsWrapper} />
      <ProtectedRoute path="/hotel/channel-manager" component={() => <HotelChannelManagerPage />} />
      <ProtectedRoute path="/hotel/revenue-management" component={() => <HotelRevenueManagementPage />} />
      <ProtectedRoute path="/hotel/banquet" component={() => <HotelBanquetPage />} />
      <ProtectedRoute path="/healthcare/patients" component={HealthcarePatientsWrapper} />
      <ProtectedRoute path="/healthcare/opd" component={HealthcareOPDWrapper} />
      <ProtectedRoute path="/healthcare/ipd" component={HealthcareIPDWrapper} />
      <ProtectedRoute path="/healthcare/beds" component={HealthcareBedsWrapper} />
      <ProtectedRoute path="/healthcare/ot" component={HealthcareOTWrapper} />
      <ProtectedRoute path="/healthcare/lab" component={HealthcareLabWrapper} />
      <ProtectedRoute path="/healthcare/nursing" component={HealthcareNursingWrapper} />
      <ProtectedRoute path="/healthcare/insurance" component={HealthcareInsuranceWrapper} />
      <ProtectedRoute path="/healthcare/doctors" component={HealthcareDoctorsWrapper} />
      <ProtectedRoute path="/healthcare/blood-bank" component={HealthcareBloodBankWrapper} />
      <ProtectedRoute path="/healthcare/reports" component={HealthcareReportsWrapper} />
      <ProtectedRoute path="/healthcare/abdm" component={HealthcareABDMWrapper} />
      <ProtectedRoute path="/healthcare/emr" component={HealthcareEMRWrapper} />
      <ProtectedRoute path="/healthcare/tpa-claims" component={HealthcareTPAClaimsWrapper} />
      <ProtectedRoute path="/education/students" component={EducationStudentsWrapper} />
      <ProtectedRoute path="/education/admissions" component={EducationAdmissionsWrapper} />
      <ProtectedRoute path="/education/classes" component={EducationClassesWrapper} />
      <ProtectedRoute path="/education/attendance" component={EducationAttendanceWrapper} />
      <ProtectedRoute path="/education/exams" component={EducationExamsWrapper} />
      <ProtectedRoute path="/education/fees" component={EducationFeesWrapper} />
      <ProtectedRoute path="/education/timetable" component={EducationTimetableWrapper} />
      <ProtectedRoute path="/education/homework" component={EducationHomeworkWrapper} />
      <ProtectedRoute path="/education/online-exams" component={EducationOnlineExamsWrapper} />
      <ProtectedRoute path="/education/library" component={EducationLibraryWrapper} />
      <ProtectedRoute path="/education/transport" component={EducationTransportWrapper} />
      <ProtectedRoute path="/education/hostel" component={EducationHostelWrapper} />
      <ProtectedRoute path="/education/parent-portal" component={EducationParentPortalWrapper} />
      <ProtectedRoute path="/education/reports" component={EducationReportsWrapper} />
      <ProtectedRoute path="/real-estate/projects" component={RealEstateProjectsWrapper} />
      <ProtectedRoute path="/real-estate/crm" component={RealEstateCRMWrapper} />
      <ProtectedRoute path="/real-estate/bookings" component={RealEstateBookingsWrapper} />
      <ProtectedRoute path="/real-estate/collections" component={RealEstateCollectionsWrapper} />
      <ProtectedRoute path="/real-estate/brokers" component={RealEstateBrokersWrapper} />
      <ProtectedRoute path="/real-estate/construction" component={RealEstateConstructionWrapper} />
      <ProtectedRoute path="/real-estate/documents" component={RealEstateDocumentsWrapper} />
      <ProtectedRoute path="/real-estate/customer-portal" component={RealEstateCustomerPortalWrapper} />
      <ProtectedRoute path="/real-estate/society" component={RealEstateSocietyWrapper} />
      <ProtectedRoute path="/real-estate/reports" component={RealEstateReportsWrapper} />
      <ProtectedRoute path="/logistics/fleet" component={LogisticsFleetWrapper} />
      <ProtectedRoute path="/logistics/drivers" component={LogisticsDriversWrapper} />
      <ProtectedRoute path="/logistics/trips" component={LogisticsTripsWrapper} />
      <ProtectedRoute path="/logistics/gps" component={LogisticsGPSWrapper} />
      <ProtectedRoute path="/logistics/consignments" component={LogisticsConsignmentsWrapper} />
      <ProtectedRoute path="/logistics/freight" component={LogisticsFreightWrapper} />
      <ProtectedRoute path="/logistics/epod" component={LogisticsEPODWrapper} />
      <ProtectedRoute path="/logistics/fuel" component={LogisticsFuelWrapper} />
      <ProtectedRoute path="/logistics/documents" component={LogisticsDocumentsWrapper} />
      <ProtectedRoute path="/logistics/reports" component={LogisticsReportsWrapper} />
      <ProtectedRoute path="/agriculture/farms" component={AgricultureFarmsWrapper} />
      <ProtectedRoute path="/agriculture/crops" component={AgricultureCropsWrapper} />
      <ProtectedRoute path="/agriculture/inputs" component={AgricultureInputsWrapper} />
      <ProtectedRoute path="/agriculture/harvest" component={AgricultureHarvestWrapper} />
      <ProtectedRoute path="/agriculture/weather" component={AgricultureWeatherWrapper} />
      <ProtectedRoute path="/agriculture/schemes" component={AgricultureSchemesWrapper} />
      <ProtectedRoute path="/agriculture/fpo" component={AgricultureFPOWrapper} />
      <ProtectedRoute path="/agriculture/market" component={AgricultureMarketWrapper} />
      <ProtectedRoute path="/agriculture/reports" component={AgricultureReportsWrapper} />
      <ProtectedRoute path="/ngo/donors" component={NGODonorsWrapper} />
      <ProtectedRoute path="/ngo/donations" component={NGODonationsWrapper} />
      <ProtectedRoute path="/ngo/80g" component={NGO80GWrapper} />
      <ProtectedRoute path="/ngo/projects" component={NGOProjectsWrapper} />
      <ProtectedRoute path="/ngo/beneficiaries" component={NGOBeneficiariesWrapper} />
      <ProtectedRoute path="/ngo/grants" component={NGOGrantsWrapper} />
      <ProtectedRoute path="/ngo/volunteers" component={NGOVolunteersWrapper} />
      <ProtectedRoute path="/ngo/fcra" component={NGOFCRAWrapper} />
      <ProtectedRoute path="/ngo/reports" component={NGOReportsWrapper} />
      <ProtectedRoute path="/ngo/80g-bulk" component={NGO80GBulkWrapper} />
      <ProtectedRoute path="/ngo/csr" component={NGOCSRWrapper} />
      <ProtectedRoute path="/pharmacy/billing" component={PharmacyBillingWrapper} />
      <ProtectedRoute path="/pharmacy/drugs" component={PharmacyDrugsWrapper} />
      <ProtectedRoute path="/pharmacy/stock" component={PharmacyStockWrapper} />
      <ProtectedRoute path="/pharmacy/purchases" component={PharmacyPurchasesWrapper} />
      <ProtectedRoute path="/pharmacy/schedule-h" component={PharmacyScheduleHWrapper} />
      <ProtectedRoute path="/pharmacy/schedule-x" component={PharmacyScheduleXWrapper} />
      <ProtectedRoute path="/pharmacy/licenses" component={PharmacyLicensesWrapper} />
      <ProtectedRoute path="/pharmacy/expiry" component={PharmacyExpiryWrapper} />
      <ProtectedRoute path="/pharmacy/reports" component={PharmacyReportsWrapper} />
      <ProtectedRoute path="/pharmacy/narcotics-register" component={PharmacyNarcoticsRegisterWrapper} />
      <ProtectedRoute path="/pharmacy/e-invoice" component={PharmacyEInvoiceWrapper} />
      <ProtectedRoute path="/crm/pipeline" component={CRMPipelineWrapper} />
      <ProtectedRoute path="/crm/contacts" component={CRMContactsWrapper} />
      <ProtectedRoute path="/crm/accounts" component={CRMAccountsWrapper} />
      <ProtectedRoute path="/crm/activities" component={CRMActivitiesWrapper} />
      <ProtectedRoute path="/crm/email-campaigns" component={CRMEmailCampaignsWrapper} />
      <ProtectedRoute path="/crm/whatsapp" component={CRMWhatsAppWrapper} />
      <ProtectedRoute path="/crm/reports" component={CRMReportsWrapper} />
      <ProtectedRoute path="/nidhi/members" component={NidhiMembersWrapper} />
      <ProtectedRoute path="/nidhi/deposits" component={NidhiDepositsWrapper} />
      <ProtectedRoute path="/nidhi/loans" component={NidhiLoansWrapper} />
      <ProtectedRoute path="/nidhi/emi" component={NidhiEMIWrapper} />
      <ProtectedRoute path="/nidhi/shares" component={NidhiSharesWrapper} />
      <ProtectedRoute path="/nidhi/gold-rates" component={NidhiGoldRatesWrapper} />
      <ProtectedRoute path="/nidhi/interest-rates" component={NidhiInterestRatesWrapper} />
      <ProtectedRoute path="/nidhi/daily-collection" component={NidhiDailyCollectionWrapper} />
      <ProtectedRoute path="/nidhi/compliance" component={NidhiComplianceWrapper} />
      <ProtectedRoute path="/nidhi/reports" component={NidhiReportsWrapper} />
      <ProtectedRoute path="/ecommerce/dashboard" component={EcommerceDashboardWrapper} />
      <ProtectedRoute path="/ecommerce/orders" component={EcommerceOrdersWrapper} />
      <ProtectedRoute path="/ecommerce/listings" component={EcommerceListingsWrapper} />
      <ProtectedRoute path="/ecommerce/shipments" component={EcommerceShipmentsWrapper} />
      <ProtectedRoute path="/ecommerce/returns" component={EcommerceReturnsWrapper} />
      <ProtectedRoute path="/ecommerce/settlements" component={EcommerceSettlementsWrapper} />
      <ProtectedRoute path="/ecommerce/channels" component={EcommerceChannelsWrapper} />
      <ProtectedRoute path="/ecommerce/reports" component={EcommerceReportsWrapper} />
      <ProtectedRoute path="/masters/hsn-codes" component={MastersHSNCodesWrapper} />
      <ProtectedRoute path="/masters/sac-codes" component={MastersSACCodesWrapper} />
      <ProtectedRoute path="/masters/tax-config" component={MastersTaxConfigWrapper} />
      <ProtectedRoute path="/masters/states-countries" component={MastersStatesCountriesWrapper} />
      <ProtectedRoute path="/masters/bank-master" component={MastersBankMasterWrapper} />
      <ProtectedRoute path="/masters/branches" component={MastersBranchesWrapper} />
      <ProtectedRoute path="/masters/doc-numbering" component={MastersDocNumberingWrapper} />
      <ProtectedRoute path="/masters/email-templates" component={MastersEmailTemplatesWrapper} />
      <ProtectedRoute path="/masters/sms-templates" component={MastersSMSTemplatesWrapper} />
      <ProtectedRoute path="/masters/approval-matrix" component={MastersApprovalMatrixWrapper} />
      <ProtectedRoute path="/masters/feature-flags" component={MastersFeatureFlagsWrapper} />
      <ProtectedRoute path="/masters/print-templates" component={MastersPrintTemplatesWrapper} />
      <ProtectedRoute path="/masters/webhooks" component={MastersWebhooksWrapper} />
      <ProtectedRoute path="/restaurant-enterprise" component={RestaurantEnterpriseWrapper} />
      <ProtectedRoute path="/hotel-enterprise" component={HotelEnterpriseWrapper} />
      <ProtectedRoute path="/healthcare-enterprise" component={HealthcareEnterpriseWrapper} />
      <ProtectedRoute path="/education-enterprise" component={EducationEnterpriseWrapper} />
      <ProtectedRoute path="/real-estate-enterprise" component={RealEstateEnterpriseWrapper} />
      <ProtectedRoute path="/masters" component={MastersWrapper} />
          <ProtectedRoute path="/retail-enterprise" component={RetailEnterpriseWrapper} />
          <ProtectedRoute path="/pharmacy-enterprise" component={PharmacyEnterpriseWrapper} />
          <ProtectedRoute path="/logistics-enterprise" component={LogisticsEnterpriseWrapper} />
          <ProtectedRoute path="/crm-enterprise" component={CRMEnterpriseWrapper} />
          <ProtectedRoute path="/ngo-enterprise" component={NGOEnterpriseWrapper} />
          <ProtectedRoute path="/agriculture-enterprise" component={AgricultureEnterpriseWrapper} />
          <ProtectedRoute path="/ecommerce-enterprise" component={EcommerceEnterpriseWrapper} />
          <ProtectedRoute path="/healthcare-enterprise2" component={HealthcareEnterprise2Wrapper} />
          <ProtectedRoute path="/education-enterprise2" component={EducationEnterprise2Wrapper} />
      <ProtectedRoute path="/gold-erp" component={GoldErpWrapper} />
      {/* Phase 7F — Nidhi */}
      <ProtectedRoute path="/nidhi/loan-sanction" component={() => <NidhiLoanSanctionPage />} />
      <ProtectedRoute path="/nidhi/pdc-tracking" component={() => <NidhiPDCTrackingPage />} />
      <ProtectedRoute path="/nidhi/rbi-returns" component={() => <NidhiRBIReturnsPage />} />
      {/* Phase 7G — CRM */}
      <ProtectedRoute path="/crm/lead-scoring" component={() => <CRMLeadScoringPage />} />
      <ProtectedRoute path="/crm/drip-campaigns" component={() => <CRMDripCampaignsPage />} />
      <ProtectedRoute path="/crm/customer-360" component={() => <CRMCustomer360Page />} />
      {/* Phase 7H — Logistics */}
      <ProtectedRoute path="/logistics/eway-bill" component={LogisticsEWayBillWrapper} />
      <ProtectedRoute path="/logistics/live-gps" component={() => <LogisticsLiveGPSPage />} />
      <ProtectedRoute path="/logistics/route-optimization" component={() => <LogisticsRouteOptimizationPage />} />
      {/* Phase 7I — Real Estate */}
      <ProtectedRoute path="/real-estate/rera" component={() => <RealEstateRERAPage />} />
      <ProtectedRoute path="/real-estate/demand-letters" component={() => <RealEstateDemandLettersPage />} />
      <ProtectedRoute path="/real-estate/project-pl" component={() => <RealEstateProjectPLPage />} />
      {/* Phase 7J — Agriculture */}
      <ProtectedRoute path="/agriculture/mandi-prices" component={() => <AgricultureMandiPricesPage />} />
      <ProtectedRoute path="/agriculture/pmfby" component={() => <AgriculturePMFBYPage />} />
      {/* Phase 7K — Education */}
      <ProtectedRoute path="/education/certificates" component={() => <EducationCertificatesPage />} />
      <ProtectedRoute path="/education/nep-compliance" component={() => <EducationNEPCompliancePage />} />
      {/* Phase 7L — Gold ERP */}
      <ProtectedRoute path="/gold-erp/live-rates" component={() => <GoldLiveRatesPage />} />
      <ProtectedRoute path="/gold-erp/hallmarking" component={() => <GoldHallmarkingPage />} />
      {/* Phase 7M — HR */}
      <ProtectedRoute path="/hr/epfo-filing" component={() => <HREPFOFilingPage />} />
      <ProtectedRoute path="/hr/compliance-calendar" component={() => <HRComplianceCalendarPage />} />
      <ProtectedRoute path="/hr/offer-letters" component={() => <HROfferLettersPage />} />
      {/* Phase 7N — Retail */}
      <ProtectedRoute path="/retail/franchise" component={() => <RetailFranchisePage />} />
      <ProtectedRoute path="/retail/b2b-portal" component={() => <RetailB2BPortalPage />} />
      {/* Phase 7O — Manufacturing */}
      <ProtectedRoute path="/manufacturing/mrp" component={() => <ManufacturingMRPPage />} />
      <ProtectedRoute path="/manufacturing/work-orders" component={ManufacturingWorkOrdersWrapper} />
      <ProtectedRoute path="/manufacturing/quality" component={ManufacturingQualityWrapper} />
      <ProtectedRoute path="/manufacturing/job-cards" component={ManufacturingJobCardsWrapper} />
      <ProtectedRoute path="/manufacturing/sub-contracting" component={ManufacturingSubContractingWrapper} />
      <ProtectedRoute path="/manufacturing/machine-oee" component={ManufacturingMachineOEEWrapper} />
      <Route path="/ess" component={EssLogin} />
      <Route path="/ess/portal" component={EssPortal} />
      <ProtectedRoute path="/journal-entry/new" component={ManualJournalEntryPageWrapper} />
      <ProtectedRoute path="/journal-entry/:id" component={JournalEntryDetailPageWrapper} />
      <Route path="/" component={SmartRoot} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HRExpenseClaimsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-expense-claims');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Expense Claims" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRExpenseClaimsPage />
    </DashboardShell>
  );
}

function HROnboardingWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-onboarding');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Onboarding & Induction" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HROnboardingPage />
    </DashboardShell>
  );
}

function HRLettersWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-letters');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Letters & Documents" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRLettersPage />
    </DashboardShell>
  );
}

function HRSupportDeskWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-support-desk');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="HR Support Desk" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HRSupportDeskPage />
    </DashboardShell>
  );
}

function CRMSurveysWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('crm-surveys');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Feedback & Survey Hub" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <CRMSurveysPage />
    </DashboardShell>
  );
}

function RecurringInvoicesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('recurring-invoices');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Recurring Invoices" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <RecurringInvoicesPage />
    </DashboardShell>
  );
}

function WarehousesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('warehouses');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Warehouses & Stock" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <WarehousesPage />
    </DashboardShell>
  );
}

function InventoryBulkImportWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('inventory-bulk-import');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Inventory Bulk Import" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <InventoryBulkImportPage />
    </DashboardShell>
  );
}

function InventoryGrnScanWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('inventory-grn-scan');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="GRN — Scan Mode" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <InventoryGrnScanPage />
    </DashboardShell>
  );
}

function InventoryStockAdjustmentsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('inventory-stock-adjustments');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Stock Adjustments" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <InventoryStockAdjustmentsPage />
    </DashboardShell>
  );
}

function ProjectManagementWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('projects');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Project Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <ProjectManagementPage />
    </DashboardShell>
  );
}

function TimesheetsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('timesheets');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Timesheets" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <TimesheetsPage />
    </DashboardShell>
  );
}

function FixedAssetsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('fixed-assets');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Fixed Assets" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <FixedAssetsPage />
    </DashboardShell>
  );
}

function PerformanceAppraisalWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hr-appraisals');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Performance Appraisal" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <PerformanceAppraisalPage />
    </DashboardShell>
  );
}

function CurrencyManagementWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('currency-management');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Currency Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <CurrencyManagementPage />
    </DashboardShell>
  );
}

function CostCentresWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('cost-centres');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Cost Centres" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <CostCentresPage />
    </DashboardShell>
  );
}

function PurchaseRequisitionsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('purchase-requisitions');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Purchase Requisitions" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <PurchaseRequisitionsPage />
    </DashboardShell>
  );
}

function ApprovalWorkflowsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('approval-workflows');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Approval Workflows" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <ApprovalWorkflowsPage />
    </DashboardShell>
  );
}

function GoodsReceiptNotesWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('goods-receipt-notes');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Goods Receipt Notes" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <GoodsReceiptNotesPage />
    </DashboardShell>
  );
}

function PriceListsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('price-lists');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Price Lists" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <PriceListsPage />
    </DashboardShell>
  );
}

function GSTRReportsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('gstr-reports');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="GST Returns" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <GSTRReportsPage />
    </DashboardShell>
  );
}

function AuditLogWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('audit-log');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Audit Log" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <AuditLogPage />
    </DashboardShell>
  );
}

function HealthcareWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('healthcare');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Healthcare" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HealthcarePage />
    </DashboardShell>
  );
}

function EducationWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('education');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Education" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <EducationPage />
    </DashboardShell>
  );
}

function LogisticsWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('logistics');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Logistics & Transport" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <LogisticsPage />
    </DashboardShell>
  );
}

function RealEstateWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('real-estate');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Real Estate" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <RealEstatePage />
    </DashboardShell>
  );
}

function POSWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('pos');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Point of Sale" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <POSPage />
    </DashboardShell>
  );
}

function GoldErpWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const section = new URLSearchParams(search).get('section') || 'overview';
  const activeView = `gold-erp-${section}`;
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Gold & Jewellery ERP" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => {
        if (v.startsWith('gold-erp-')) {
          setLocation(`/gold-erp?section=${v.replace('gold-erp-', '')}`);
        } else {
          setLocation(v === 'overview' ? '/' : `/?tab=${v}`);
        }
      }}>
      <GoldErpPage activeSection={section} />
    </DashboardShell>
  );
}

function AgricultureWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('agriculture');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Agriculture" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <AgriculturePage />
    </DashboardShell>
  );
}

function HotelWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hotel');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Hotel ERP" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <HotelPage />
    </DashboardShell>
  );
}

function RestaurantWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('restaurant');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Restaurant ERP" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <RestaurantPage />
    </DashboardShell>
  );
}

function AuthenticatedChatAgent() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;
  return <ChatAgent />;
}


function EcommerceWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('ecommerce');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Ecommerce" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <EcommercePage />
    </DashboardShell>
  );
}

function NGOWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('ngo');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="NGO Management" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <NGOPage />
    </DashboardShell>
  );
}

function PharmacyWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('pharmacy');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Pharmacy" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <PharmacyPage />
    </DashboardShell>
  );
}



function makeWrapper(title: string, activeId: string, PageComponent: React.ComponentType<any>) {
  return function GenericPageWrapper() {
    const { logoutMutation } = useAuth();
    const [, setLocation] = useLocation();
    const [activeView, setActiveView] = useState(activeId);
    const allNavSections = getAdminNavSections(setLocation);
    const { navSections, isLoading } = useFilteredNavigation(allNavSections);
    const resolvedNav = isLoading ? allNavSections : navSections;
    return (
      <DashboardShell title={title} onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
        navSections={resolvedNav} activeView={activeView}
        onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : '/?tab=' + v); }}>
        <PageComponent />
      </DashboardShell>
    );
  };
}
const RestaurantPOSWrapper = makeWrapper('POS Terminal', 'restaurant-pos', RestaurantPOSPage);
const RestaurantKitchenWrapper = makeWrapper('Kitchen Display', 'restaurant-kitchen', RestaurantKitchenPage);
const RestaurantTablesWrapper = makeWrapper('Tables & Floor Plan', 'restaurant-tables', RestaurantTablesPage);
const RestaurantMenuWrapper = makeWrapper('Menu Management', 'restaurant-menu', RestaurantMenuPage);
const RestaurantOrdersWrapper = makeWrapper('Orders & KOT', 'restaurant-orders', RestaurantOrdersPage);
const RestaurantDeliveryWrapper = makeWrapper('Delivery Orders', 'restaurant-delivery', RestaurantDeliveryPage);
const RestaurantReservationsWrapper = makeWrapper('Reservations', 'restaurant-reservations', RestaurantReservationsPage);
const RestaurantShiftsWrapper = makeWrapper('Shifts & Cash', 'restaurant-shifts', RestaurantShiftsPage);
const RestaurantCustomersWrapper = makeWrapper('Customers & Loyalty', 'restaurant-customers', RestaurantCustomersPage);
const RestaurantInventoryWrapper = makeWrapper('Inventory & Recipes', 'restaurant-inventory', RestaurantInventoryPage);
const RestaurantOutletsWrapper = makeWrapper('Outlets & Terminals', 'restaurant-outlets', RestaurantOutletsPage);
const RestaurantReportsWrapper = makeWrapper('Reports', 'restaurant-reports', RestaurantReportsPage);
const RestaurantAggregatorsWrapper = makeWrapper('Delivery Platforms', 'restaurant-aggregators', RestaurantAggregatorsPage);
const RestaurantAnalyticsWrapper = makeWrapper('Analytics & BI', 'restaurant-analytics', RestaurantAnalyticsPage);
const RestaurantStaffWrapper = makeWrapper('Staff & Tips', 'restaurant-staff', RestaurantStaffPage);
const RestaurantStewardWrapper = makeWrapper('Steward App', 'restaurant-steward', RestaurantStewardPage);
const RestaurantFranchiseWrapper = makeWrapper('Franchise Management', 'restaurant-franchise', RestaurantFranchisePage);
const RestaurantTaxSettingsWrapper = makeWrapper('Tax & Currency', 'restaurant-tax-settings', RestaurantTaxSettingsPage);
const RestaurantGiftCardsWrapper = makeWrapper('Gift Cards', 'restaurant-gift-cards', RestaurantGiftCardsPage);
const RestaurantCentralKitchenWrapper = makeWrapper('Central Kitchen', 'restaurant-central-kitchen', RestaurantCentralKitchenPage);
const RestaurantMenuTranslationsWrapper = makeWrapper('Menu Translations', 'restaurant-menu-translations', RestaurantMenuTranslationsPage);
const RestaurantCampaignsWrapper = makeWrapper('Marketing Campaigns', 'restaurant-campaigns', RestaurantCampaignsPage);
const RestaurantRecipesWrapper = makeWrapper('Recipe & Food Costing', 'restaurant-recipes', RestaurantRecipesPage);
const RestaurantPaymentTerminalWrapper = makeWrapper('Payment Terminals', 'restaurant-payment-terminal', RestaurantPaymentTerminalPage);
const HotelFrontDeskWrapper = makeWrapper('Front Desk', 'hotel/front-desk', HotelFrontDeskPage);
const HotelReservationsWrapper = makeWrapper('Reservations', 'hotel/reservations', HotelReservationsPage);
const HotelCheckinWrapper = makeWrapper('Check-in / Check-out', 'hotel/checkin', HotelCheckinPage);
const HotelRoomsWrapper = makeWrapper('Room Management', 'hotel/rooms', HotelRoomsPage);
const HotelFolioWrapper = makeWrapper('Folio & Billing', 'hotel/folio', HotelFolioPage);
const HotelHousekeepingWrapper = makeWrapper('Housekeeping', 'hotel/housekeeping', HotelHousekeepingPage);
const HotelRatesWrapper = makeWrapper('Rate Plans', 'hotel/rates', HotelRatesPage);
const HotelCorporateWrapper = makeWrapper('Corporate & Agents', 'hotel/corporate', HotelCorporatePage);
const HotelNightAuditWrapper = makeWrapper('Night Audit', 'hotel/night-audit', HotelNightAuditPage);
const HotelReportsWrapper = makeWrapper('Reports', 'hotel/reports', HotelReportsPage);
const HealthcarePatientsWrapper = makeWrapper('Patient Registration', 'healthcare/patients', HealthcarePatientsPage);
const HealthcareOPDWrapper = makeWrapper('OPD & Appointments', 'healthcare/opd', HealthcareOPDPage);
const HealthcareIPDWrapper = makeWrapper('IPD & Admissions', 'healthcare/ipd', HealthcareIPDPage);
const HealthcareBedsWrapper = makeWrapper('Bed Management', 'healthcare/beds', HealthcareBedsPage);
const HealthcareOTWrapper = makeWrapper('OT Scheduling', 'healthcare/ot', HealthcareOTPage);
const HealthcareLabWrapper = makeWrapper('Lab & Diagnostics', 'healthcare/lab', HealthcareLabPage);
const HealthcareNursingWrapper = makeWrapper('Nursing & Vitals', 'healthcare/nursing', HealthcareNursingPage);
const HealthcareInsuranceWrapper = makeWrapper('Insurance & TPA', 'healthcare/insurance', HealthcareInsurancePage);
const HealthcareDoctorsWrapper = makeWrapper('Doctor Management', 'healthcare/doctors', HealthcareDoctorsPage);
const HealthcareBloodBankWrapper = makeWrapper('Blood Bank', 'healthcare/blood-bank', HealthcareBloodBankPage);
const HealthcareReportsWrapper = makeWrapper('Reports', 'healthcare/reports', HealthcareReportsPage);
const HealthcareABDMWrapper = makeWrapper('ABDM / ABHA', 'healthcare/abdm', HealthcareABDMPage);
const HealthcareEMRWrapper = makeWrapper('EMR', 'healthcare/emr', HealthcareEMRPage);
const HealthcareTPAClaimsWrapper = makeWrapper('TPA Claims', 'healthcare/tpa-claims', HealthcareTPAClaimsPage);
const EducationStudentsWrapper = makeWrapper('Students', 'education/students', EducationStudentsPage);
const EducationAdmissionsWrapper = makeWrapper('Admissions', 'education/admissions', EducationAdmissionsPage);
const EducationClassesWrapper = makeWrapper('Classes & Subjects', 'education/classes', EducationClassesPage);
const EducationAttendanceWrapper = makeWrapper('Attendance', 'education/attendance', EducationAttendancePage);
const EducationExamsWrapper = makeWrapper('Examinations', 'education/exams', EducationExamsPage);
const EducationFeesWrapper = makeWrapper('Fee Management', 'education/fees', EducationFeesPage);
const EducationTimetableWrapper = makeWrapper('Timetable', 'education/timetable', EducationTimetablePage);
const EducationHomeworkWrapper = makeWrapper('Homework', 'education/homework', EducationHomeworkPage);
const EducationOnlineExamsWrapper = makeWrapper('Online Exams', 'education/online-exams', EducationOnlineExamsPage);
const EducationLibraryWrapper = makeWrapper('Library', 'education/library', EducationLibraryPage);
const EducationTransportWrapper = makeWrapper('Transport', 'education/transport', EducationTransportPage);
const EducationHostelWrapper = makeWrapper('Hostel', 'education/hostel', EducationHostelPage);
const EducationParentPortalWrapper = makeWrapper('Parent Portal', 'education/parent-portal', EducationParentPortalPage);
const EducationReportsWrapper = makeWrapper('Reports', 'education/reports', EducationReportsPage);
const RealEstateProjectsWrapper = makeWrapper('Projects & Units', 'real-estate/projects', RealEstateProjectsPage);
const RealEstateCRMWrapper = makeWrapper('Sales CRM', 'real-estate/crm', RealEstateCRMPage);
const RealEstateBookingsWrapper = makeWrapper('Bookings', 'real-estate/bookings', RealEstateBookingsPage);
const RealEstateCollectionsWrapper = makeWrapper('Payment Collections', 'real-estate/collections', RealEstateCollectionsPage);
const RealEstateBrokersWrapper = makeWrapper('Broker Management', 'real-estate/brokers', RealEstateBrokersPage);
const RealEstateConstructionWrapper = makeWrapper('Construction', 'real-estate/construction', RealEstateConstructionPage);
const RealEstateDocumentsWrapper = makeWrapper('Documents', 'real-estate/documents', RealEstateDocumentsPage);
const RealEstateCustomerPortalWrapper = makeWrapper('Customer Portal', 'real-estate/customer-portal', RealEstateCustomerPortalPage);
const RealEstateSocietyWrapper = makeWrapper('Society', 'real-estate/society', RealEstateSocietyPage);
const RealEstateReportsWrapper = makeWrapper('Reports', 'real-estate/reports', RealEstateReportsPage);
const LogisticsFleetWrapper = makeWrapper('Fleet Management', 'logistics/fleet', LogisticsFleetPage);
const LogisticsDriversWrapper = makeWrapper('Drivers', 'logistics/drivers', LogisticsDriversPage);
const LogisticsTripsWrapper = makeWrapper('Trip Management', 'logistics/trips', LogisticsTripsPage);
const LogisticsGPSWrapper = makeWrapper('GPS Tracking', 'logistics/gps', LogisticsGPSPage);
const LogisticsConsignmentsWrapper = makeWrapper('Consignments', 'logistics/consignments', LogisticsConsignmentsPage);
const LogisticsFreightWrapper = makeWrapper('Freight Billing', 'logistics/freight', LogisticsFreightPage);
const LogisticsEPODWrapper = makeWrapper('ePOD', 'logistics/epod', LogisticsEPODPage);
const LogisticsFuelWrapper = makeWrapper('Fuel Management', 'logistics/fuel', LogisticsFuelPage);
const LogisticsDocumentsWrapper = makeWrapper('Vehicle Documents', 'logistics/documents', LogisticsDocumentsPage);
const LogisticsReportsWrapper = makeWrapper('Reports', 'logistics/reports', LogisticsReportsPage);
const LogisticsEWayBillWrapper = makeWrapper('E-Way Bill', 'logistics/eway-bill', LogisticsEWayBillPage);
const ManufacturingJobCardsWrapper = makeWrapper('Shop Floor / Job Cards', 'manufacturing/job-cards', ManufacturingJobCardsPage);
const ManufacturingSubContractingWrapper = makeWrapper('Sub-contracting', 'manufacturing/sub-contracting', ManufacturingSubContractingPage);
const ManufacturingMachineOEEWrapper = makeWrapper('Machine OEE', 'manufacturing/machine-oee', ManufacturingMachineOEEPage);
const ManufacturingWorkOrdersWrapper = makeWrapper('Work Orders', 'manufacturing/work-orders', ManufacturingWorkOrdersPage);
const ManufacturingQualityWrapper = makeWrapper('Quality Control', 'manufacturing/quality', ManufacturingQualityPage);
const AgricultureFarmsWrapper = makeWrapper('Farms & Farmers', 'agriculture/farms', AgricultureFarmsPage);
const AgricultureCropsWrapper = makeWrapper('Crop Management', 'agriculture/crops', AgricultureCropsPage);
const AgricultureInputsWrapper = makeWrapper('Crop Inputs', 'agriculture/inputs', AgricultureInputsPage);
const AgricultureHarvestWrapper = makeWrapper('Harvest Records', 'agriculture/harvest', AgricultureHarvestPage);
const AgricultureWeatherWrapper = makeWrapper('Weather & Advisory', 'agriculture/weather', AgricultureWeatherPage);
const AgricultureSchemesWrapper = makeWrapper('Govt Schemes', 'agriculture/schemes', AgricultureSchemesPage);
const AgricultureFPOWrapper = makeWrapper('FPO Management', 'agriculture/fpo', AgricultureFPOPage);
const AgricultureMarketWrapper = makeWrapper('Market Prices', 'agriculture/market', AgricultureMarketPage);
const AgricultureReportsWrapper = makeWrapper('Reports', 'agriculture/reports', AgricultureReportsPage);
const NGODonorsWrapper = makeWrapper('Donors', 'ngo/donors', NGODonorsPage);
const NGODonationsWrapper = makeWrapper('Donations', 'ngo/donations', NGODonationsPage);
const NGO80GWrapper = makeWrapper('80G Receipts', 'ngo/80g', NGO80GPage);
const NGOProjectsWrapper = makeWrapper('Projects', 'ngo/projects', NGOProjectsPage);
const NGOBeneficiariesWrapper = makeWrapper('Beneficiaries', 'ngo/beneficiaries', NGOBeneficiariesPage);
const NGOGrantsWrapper = makeWrapper('Grants', 'ngo/grants', NGOGrantsPage);
const NGOVolunteersWrapper = makeWrapper('Volunteers', 'ngo/volunteers', NGOVolunteersPage);
const NGOFCRAWrapper = makeWrapper('FCRA Compliance', 'ngo/fcra', NGOFCRAPage);
const NGOReportsWrapper = makeWrapper('Reports', 'ngo/reports', NGOReportsPage);
const NGO80GBulkWrapper = makeWrapper('80G Bulk Certificates', 'ngo/80g-bulk', NGO80GBulkPage);
const NGOCSRWrapper = makeWrapper('CSR Module', 'ngo/csr', NGOCSRPage);
const PharmacyBillingWrapper = makeWrapper('Drug Billing POS', 'pharmacy/billing', PharmacyBillingPage);
const PharmacyDrugsWrapper = makeWrapper('Drug Master', 'pharmacy/drugs', PharmacyDrugsPage);
const PharmacyStockWrapper = makeWrapper('Stock Management', 'pharmacy/stock', PharmacyStockPage);
const PharmacyPurchasesWrapper = makeWrapper('Purchase Management', 'pharmacy/purchases', PharmacyPurchasesPage);
const PharmacyScheduleHWrapper = makeWrapper('Schedule H Register', 'pharmacy/schedule-h', PharmacyScheduleHPage);
const PharmacyScheduleXWrapper = makeWrapper('Schedule X Register', 'pharmacy/schedule-x', PharmacyScheduleXPage);
const PharmacyLicensesWrapper = makeWrapper('Drug Licenses', 'pharmacy/licenses', PharmacyLicensesPage);
const PharmacyExpiryWrapper = makeWrapper('Expiry Alerts', 'pharmacy/expiry', PharmacyExpiryPage);
const PharmacyReportsWrapper = makeWrapper('Reports', 'pharmacy/reports', PharmacyReportsPage);
const PharmacyNarcoticsRegisterWrapper = makeWrapper('Narcotics Register', 'pharmacy/narcotics-register', PharmacyNarcoticsRegisterPage);
const PharmacyEInvoiceWrapper = makeWrapper('GST E-Invoice', 'pharmacy/e-invoice', PharmacyEInvoicePage);
const CRMPipelineWrapper = makeWrapper('Pipeline', 'crm/pipeline', CRMPipelinePage);
const CRMContactsWrapper = makeWrapper('Contacts', 'crm/contacts', CRMContactsPage);
const CRMAccountsWrapper = makeWrapper('Accounts', 'crm/accounts', CRMAccountsPage);
const CRMActivitiesWrapper = makeWrapper('Activities', 'crm/activities', CRMActivitiesPage);
const CRMEmailCampaignsWrapper = makeWrapper('Email Campaigns', 'crm/email-campaigns', CRMEmailCampaignsPage);
const CRMWhatsAppWrapper = makeWrapper('WhatsApp CRM', 'crm/whatsapp', CRMWhatsAppPage);
const CRMReportsWrapper = makeWrapper('Reports', 'crm/reports', CRMReportsPage);
const NidhiMembersWrapper = makeWrapper('Members', 'nidhi/members', NidhiMembersPage);
const NidhiDepositsWrapper = makeWrapper('Deposits', 'nidhi/deposits', NidhiDepositsPage);
const NidhiLoansWrapper = makeWrapper('Loans', 'nidhi/loans', NidhiLoansPage);
const NidhiEMIWrapper = makeWrapper('EMI Collection', 'nidhi/emi', NidhiEMIPage);
const NidhiSharesWrapper = makeWrapper('Share Management', 'nidhi/shares', NidhiSharesPage);
const NidhiGoldRatesWrapper = makeWrapper('Gold Rates', 'nidhi/gold-rates', NidhiGoldRatesPage);
const NidhiInterestRatesWrapper = makeWrapper('Interest Rates', 'nidhi/interest-rates', NidhiInterestRatesPage);
const NidhiDailyCollectionWrapper = makeWrapper('Daily Collection', 'nidhi/daily-collection', NidhiDailyCollectionPage);
const NidhiComplianceWrapper = makeWrapper('Compliance (NDH)', 'nidhi/compliance', NidhiCompliancePage);
const NidhiReportsWrapper = makeWrapper('Reports', 'nidhi/reports', NidhiReportsPage);
const EcommerceDashboardWrapper = makeWrapper('Dashboard', 'ecommerce/dashboard', EcommerceDashboardPage);
const EcommerceOrdersWrapper = makeWrapper('Orders', 'ecommerce/orders', EcommerceOrdersPage);
const EcommerceListingsWrapper = makeWrapper('Listings', 'ecommerce/listings', EcommerceListingsPage);
const EcommerceShipmentsWrapper = makeWrapper('Shipments', 'ecommerce/shipments', EcommerceShipmentsPage);
const EcommerceReturnsWrapper = makeWrapper('Returns & RTO', 'ecommerce/returns', EcommerceReturnsPage);
const EcommerceSettlementsWrapper = makeWrapper('Settlements', 'ecommerce/settlements', EcommerceSettlementsPage);
const EcommerceChannelsWrapper = makeWrapper('Channels', 'ecommerce/channels', EcommerceChannelsPage);
const EcommerceReportsWrapper = makeWrapper('Reports', 'ecommerce/reports', EcommerceReportsPage);
const MastersHSNCodesWrapper = makeWrapper('HSN Codes', 'masters/hsn-codes', MastersHSNCodesPage);
const MastersSACCodesWrapper = makeWrapper('SAC Codes', 'masters/sac-codes', MastersSACCodesPage);
const MastersTaxConfigWrapper = makeWrapper('Tax Configuration', 'masters/tax-config', MastersTaxConfigPage);
const MastersStatesCountriesWrapper = makeWrapper('States & Countries', 'masters/states-countries', MastersStatesCountriesPage);
const MastersBankMasterWrapper = makeWrapper('Bank Master', 'masters/bank-master', MastersBankMasterPage);
const MastersBranchesWrapper = makeWrapper('Branches', 'masters/branches', MastersBranchesPage);
const MastersDocNumberingWrapper = makeWrapper('Document Numbering', 'masters/doc-numbering', MastersDocNumberingPage);
const MastersEmailTemplatesWrapper = makeWrapper('Email Templates', 'masters/email-templates', MastersEmailTemplatesPage);
const MastersSMSTemplatesWrapper = makeWrapper('SMS Templates', 'masters/sms-templates', MastersSMSTemplatesPage);
const MastersApprovalMatrixWrapper = makeWrapper('Approval Matrix', 'masters/approval-matrix', MastersApprovalMatrixPage);
const MastersFeatureFlagsWrapper = makeWrapper('Feature Flags', 'masters/feature-flags', MastersFeatureFlagsPage);
const MastersPrintTemplatesWrapper = makeWrapper('Print Templates', 'masters/print-templates', MastersPrintTemplatesPage);
const MastersWebhooksWrapper = makeWrapper('Webhooks', 'masters/webhooks', MastersWebhooksPage);

function RestaurantEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('restaurant-enterprise');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Restaurant Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <RestaurantEnterprisePage />
    </DashboardShell>
  );
}

function HotelEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('hotel-enterprise');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Hotel Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <HotelEnterprisePage />
    </DashboardShell>
  );
}

function HealthcareEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('healthcare-enterprise');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Healthcare Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <HealthcareEnterprisePage />
    </DashboardShell>
  );
}

function EducationEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('education-enterprise');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Education Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <EducationEnterprisePage />
    </DashboardShell>
  );
}

function RealEstateEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('real-estate-enterprise');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Real Estate Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <RealEstateEnterprisePage />
    </DashboardShell>
  );
}

function RetailEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("retail-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Retail POS Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <RetailEnterprisePage />
    </DashboardShell>
  );
}
function PharmacyEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("pharmacy-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Pharmacy Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <PharmacyEnterprisePage />
    </DashboardShell>
  );
}
function LogisticsEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("logistics-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Logistics Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <LogisticsEnterprisePage />
    </DashboardShell>
  );
}
function CRMEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("crm-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="CRM Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <CRMEnterprisePage />
    </DashboardShell>
  );
}
function NGOEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("ngo-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="NGO / Trust Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <NGOEnterprisePage />
    </DashboardShell>
  );
}
function AgricultureEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("agriculture-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Agriculture Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <AgricultureEnterprisePage />
    </DashboardShell>
  );
}
function EcommerceEnterpriseWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("ecommerce-enterprise");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="E-Commerce Enterprise" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <EcommerceEnterprisePage />
    </DashboardShell>
  );
}
function HealthcareEnterprise2Wrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("healthcare-enterprise2");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Healthcare Advanced" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <HealthcareEnterprise2Page />
    </DashboardShell>
  );
}
function EducationEnterprise2Wrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("education-enterprise2");
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Education Advanced" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <EducationEnterprise2Page />
    </DashboardShell>
  );
}
function MastersWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('masters');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Global Masters" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === "overview" ? "/" : "/"); }}>
      <MastersPage />
    </DashboardShell>
  );
}

function NidhiWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('nidhi-company');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Nidhi / NBFC" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <NidhiPage />
    </DashboardShell>
  );
}

function FinanceErpWrapper() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState('finance-erp');
  const allNavSections = getAdminNavSections(setLocation);
  const { navSections, isLoading } = useFilteredNavigation(allNavSections);
  const resolvedNav = isLoading ? allNavSections : navSections;
  return (
    <DashboardShell title="Finance ERP" onLogoutClick={() => logoutMutation.mutate()} notificationCount={0}
      navSections={resolvedNav} activeView={activeView}
      onNavigate={(v) => { setActiveView(v); setLocation(v === 'overview' ? '/' : `/?tab=${v}`); }}>
      <FinanceErpPage />
    </DashboardShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Router />
          <Toaster />
          <AuthenticatedChatAgent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
