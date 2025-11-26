import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = './docs/user_manual/screenshots';

interface ScreenConfig {
  id: string;
  name: string;
  navPath?: string;
  route?: string;
  waitFor?: string;
  description: string;
}

const screens: ScreenConfig[] = [
  // Dashboard & Analytics
  { id: 'overview', name: '01_Overview_Dashboard', description: 'Main dashboard showing key metrics, production stats, pending payments, and inventory summary' },
  { id: 'sales-dashboard', name: '02_Sales_Dashboard', description: 'Sales analytics and revenue tracking dashboard' },
  { id: 'reports', name: '03_Reports', description: 'Comprehensive reporting system for all modules' },
  
  // Quality & Checklists
  { id: 'checklists', name: '04_Checklist_Builder', description: 'Create and manage checklist templates for quality control' },
  { id: 'checklist-assignments', name: '05_Checklist_Assignments', description: 'Assign checklists to operators for specific machines and shifts' },
  { id: 'machine-startup-reminders', name: '06_Machine_Startup_Reminders', description: 'Configure automated reminders for machine startup procedures' },
  { id: 'whatsapp-analytics', name: '07_WhatsApp_Analytics', description: 'Track WhatsApp message delivery and response analytics' },
  
  // Production & Inventory
  { id: 'products', name: '08_Product_Master', description: 'Manage product catalog with specifications and pricing' },
  { id: 'product-categories', name: '09_Product_Categories', description: 'Organize products into categories' },
  { id: 'product-types', name: '10_Product_Types', description: 'Define product types for classification' },
  { id: 'raw-materials', name: '11_Raw_Materials', description: 'Manage raw material inventory and specifications' },
  { id: 'finished-goods', name: '12_Finished_Goods', description: 'Track finished goods inventory with quality status' },
  { id: 'raw-material-issuance', name: '13_Raw_Material_Issuance', description: 'Issue raw materials to production with BOM-based calculations' },
  { id: 'production-entries', name: '14_Production_Entries', description: 'Record daily production output by machine and product' },
  { id: 'production-reconciliations', name: '15_Production_Reconciliation', description: 'End-of-day reconciliation of production vs materials consumed' },
  { id: 'variance-analytics', name: '16_Variance_Analytics', description: 'Analyze production variances and efficiency metrics' },
  
  // Finance & Sales
  { id: 'invoices', name: '17_Sales_Invoices', description: 'Create GST-compliant invoices with UPI QR codes' },
  { id: 'pending-payments', name: '18_Pending_Payments', description: 'Track outstanding payments with aging analysis' },
  { id: 'payment-management', name: '19_Payment_Management', description: 'Record and allocate payments using FIFO method' },
  { id: 'credit-notes', name: '20_Credit_Notes', description: 'Manage credit notes for returns and adjustments' },
  { id: 'cancelled-invoices', name: '21_Cancelled_Invoices', description: 'View cancelled invoices with audit trail' },
  { id: 'sales-returns', name: '22_Sales_Returns', description: 'Process customer returns with quality segregation' },
  
  // Dispatch & Logistics
  { id: 'gatepasses', name: '23_Gatepasses', description: 'Create gatepasses for dispatching goods' },
  { id: 'dispatch-tracking', name: '24_Dispatch_Tracking', description: 'Track shipments through 5-stage delivery workflow' },
  
  // Cash & Expenses
  { id: 'cash-register', name: '25_Daily_Cash_Register', route: '/cash-register', description: 'Daily business cash flow tracking with reconciliation' },
  { id: 'cash-register-report', name: '26_Cash_Register_Report', route: '/cash-register-report', description: 'Cash register reports with Excel export' },
  { id: 'expenses', name: '27_Expense_Vouchers', route: '/expenses', description: 'Record expenses with voucher generation and approval workflow' },
  { id: 'documents', name: '28_Documents', route: '/documents', description: 'Store and manage business documents with expiry tracking' },
  
  // Maintenance
  { id: 'maintenance', name: '29_PM_Schedule', description: 'Schedule preventive maintenance tasks' },
  { id: 'pm-history', name: '30_PM_History', description: 'View maintenance history and completed tasks' },
  { id: 'purchase-orders', name: '31_Purchase_Orders', description: 'Create and manage purchase orders for materials' },
  
  // Master Data
  { id: 'users', name: '32_Users', description: 'Manage system users with role assignments' },
  { id: 'role-permissions', name: '33_Role_Permissions', description: 'Configure granular access control for 50+ screens' },
  { id: 'vendors', name: '34_Vendor_Master', route: '/vendor-management', description: 'Manage vendors with classification and contact details' },
  { id: 'vendor-types', name: '35_Vendor_Types', description: 'Define vendor classification types' },
  { id: 'machines', name: '36_Machines', description: 'Configure machine inventory with specifications' },
  { id: 'machine-types', name: '37_Machine_Types', description: 'Define machine categories and types' },
  { id: 'spare-parts', name: '38_Spare_Parts', description: 'Manage spare parts inventory for maintenance' },
  { id: 'pm-templates', name: '39_PM_Templates', description: 'Create preventive maintenance task templates' },
  { id: 'uom', name: '40_Unit_of_Measurement', description: 'Define units of measurement for products and materials' },
  { id: 'raw-material-types', name: '41_Raw_Material_Types', description: 'Categorize raw materials by type' },
  { id: 'template-management', name: '42_Invoice_Templates', description: 'Design invoice templates with company branding' },
  
  // Settings
  { id: 'notification-settings', name: '43_Notification_Settings', description: 'Configure email and WhatsApp notification preferences' },
  { id: 'data-import', name: '44_Data_Import', description: 'Import data from Excel files and external systems' },
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  
  // Ensure directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Capture login page first
    console.log('Capturing login page...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await delay(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '00_Login_Page.png'),
      fullPage: false 
    });
    console.log('Captured: Login Page');

    // Login
    console.log('Logging in...');
    await page.waitForSelector('input[data-testid="input-username-login"]', { timeout: 30000 });
    await page.fill('input[data-testid="input-username-login"]', 'admin');
    await page.fill('input[data-testid="input-password-login"]', 'Admin@123');
    await page.click('button[data-testid="button-login"]');
    await delay(5000);

    // Capture each screen
    for (const screen of screens) {
      try {
        console.log(`Capturing: ${screen.name}...`);
        
        if (screen.route) {
          // Navigate directly to route
          await page.goto(`${BASE_URL}${screen.route}`);
          await delay(2500);
        } else {
          // Click on navigation item
          const navSelector = `[data-testid="nav-${screen.id}"]`;
          
          // First expand the section if needed
          const navItem = await page.$(navSelector);
          if (navItem) {
            // Check if visible
            const isVisible = await navItem.isVisible();
            if (!isVisible) {
              // Try to expand sections
              const sections = await page.$$('[data-testid^="toggle-section-"]');
              for (const section of sections) {
                await section.click();
                await delay(300);
              }
            }
            
            await page.click(navSelector);
            await delay(2500);
          } else {
            console.log(`  Nav item not found: ${navSelector}, trying to expand sections...`);
            // Expand all sections
            const sections = await page.$$('[data-testid^="toggle-section-"]');
            for (const section of sections) {
              await section.click();
              await delay(300);
            }
            await delay(500);
            
            // Try again
            const retryNav = await page.$(navSelector);
            if (retryNav) {
              await page.click(navSelector);
              await delay(2500);
            } else {
              console.log(`  Skipping: ${screen.name} - navigation not found`);
              continue;
            }
          }
        }

        // Wait for page to load
        await delay(1500);
        
        // Take screenshot
        await page.screenshot({ 
          path: path.join(SCREENSHOT_DIR, `${screen.name}.png`),
          fullPage: false 
        });
        
        console.log(`  Captured: ${screen.name}`);
      } catch (error) {
        console.error(`  Error capturing ${screen.name}:`, error);
      }
    }

    // Generate screen descriptions JSON for the manual
    const screenDescriptions = screens.map(s => ({
      filename: `${s.name}.png`,
      title: s.name.replace(/^\d+_/, '').replace(/_/g, ' '),
      description: s.description
    }));
    
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'screen_descriptions.json'),
      JSON.stringify(screenDescriptions, null, 2)
    );

    console.log('\nScreenshot capture complete!');
    console.log(`Total screens captured: ${screens.length}`);
    
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
