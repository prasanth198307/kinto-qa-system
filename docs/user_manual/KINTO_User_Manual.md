# KINTO Smart Ops - User Manual

**Version 2.0**  
**Inmoisture Private Limited**  
**November 2025**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard & Analytics](#dashboard--analytics)
3. [Quality & Checklists](#quality--checklists)
4. [Production & Inventory](#production--inventory)
5. [Finance & Sales](#finance--sales)
6. [Dispatch & Logistics](#dispatch--logistics)
7. [Cash & Expenses](#cash--expenses)
8. [Maintenance](#maintenance)
9. [Master Data](#master-data)
10. [Settings](#settings)

---

## Getting Started

### Login

Access the KINTO Smart Ops system through your web browser. Enter your username and password to log in.

![Login Page](screenshots/00_Login_Page.png)

**Steps to Login:**
1. Enter your username in the "Username" field
2. Enter your password in the "Password" field
3. Click the "Login" button
4. If you forgot your password, click "Forgot your password?" to reset it

### Navigation

After logging in, you'll see the main dashboard with a sidebar navigation menu on the left. The sidebar is organized into 9 collapsible modules:

- **Dashboard & Analytics** - View business performance metrics
- **Quality & Checklists** - Manage quality control checklists
- **Production & Inventory** - Track production and inventory
- **Finance & Sales** - Handle invoices, payments, and credit notes
- **Dispatch & Logistics** - Manage gatepasses and dispatch tracking
- **Cash & Expenses** - Daily cash register and expense management
- **Maintenance** - Preventive maintenance scheduling
- **Master Data** - Manage products, vendors, and machines
- **Settings** - System configuration and user management

Click on any module header to expand or collapse its menu items.

---

## Dashboard & Analytics

### Overview Dashboard

The Overview Dashboard provides a comprehensive view of your business operations at a glance.

![Overview Dashboard](screenshots/01_Overview_Dashboard.png)

**Key Features:**
- Today's production summary
- Pending quality checks count
- Open gatepasses and dispatch status
- Recent activity timeline
- Quick action buttons for common tasks

### Sales Dashboard

Monitor your sales performance with detailed analytics and charts.

![Sales Dashboard](screenshots/02_Sales_Dashboard.png)

**Available Information:**
- Monthly sales trends
- Top selling products
- Customer-wise revenue breakdown
- Payment collection status
- Outstanding receivables summary

### Reports

Access comprehensive reports for business analysis and decision making.

![Reports](screenshots/03_Reports.png)

**Available Reports:**
- Production Reports
- Sales Reports
- Inventory Reports
- Financial Reports
- Quality Reports
- GST Reports

---

## Quality & Checklists

### Checklist Builder

Create and manage quality control checklists for various processes.

![Checklist Builder](screenshots/04_Checklist_Builder.png)

**Features:**
- Create custom checklists with multiple question types
- Set up approval workflows
- Define checklist frequency (daily, weekly, monthly)
- Assign checklists to specific machines or processes

### Checklist Assignments

View and manage checklist assignments across machines and operators.

![Checklist Assignments](screenshots/05_Checklist_Assignments.png)

**Capabilities:**
- View pending checklists
- Assign operators to checklists
- Track completion status
- Review submitted responses

### Machine Startup Reminders

Configure automated WhatsApp reminders for machine startup checklists.

![Machine Startup Reminders](screenshots/06_Machine_Startup_Reminders.png)

**Configuration Options:**
- Set reminder times for each machine
- Configure WhatsApp notification preferences
- Enable/disable reminders per machine
- Set escalation paths for missed checklists

### WhatsApp Analytics

Monitor WhatsApp integration performance and message delivery statistics.

![WhatsApp Analytics](screenshots/07_WhatsApp_Analytics.png)

**Tracked Metrics:**
- Messages sent vs delivered
- Response rates
- Checklist completion via WhatsApp
- Failed message analysis

---

## Production & Inventory

### Product Master

Manage your product catalog with detailed specifications and Bill of Materials.

![Product Master](screenshots/08_Product_Master.png)

**Features:**
- Add/edit products with full specifications
- Define Bill of Materials (BOM) for each product
- Set standard production quantities
- Link products to raw materials

### Product Categories

Organize products into logical categories for easy management.

![Product Categories](screenshots/09_Product_Categories.png)

### Product Types

Define product types within each category.

![Product Types](screenshots/10_Product_Types.png)

### Raw Materials

Manage your raw material inventory and specifications.

![Raw Materials](screenshots/11_Raw_Materials.png)

**Capabilities:**
- Track raw material stock levels
- Set reorder points
- Define conversion factors
- Manage supplier information

### Finished Goods

Track finished goods inventory and quality status.

![Finished Goods](screenshots/12_Finished_Goods.png)

**Features:**
- View current stock levels
- Quality approval status
- Batch tracking
- Location management

### Raw Material Issuance

Issue raw materials to production with BOM-based suggestions.

![Raw Material Issuance](screenshots/13_Raw_Material_Issuance.png)

**Process:**
1. Select the product to be manufactured
2. Enter production quantity
3. System calculates required raw materials based on BOM
4. Adjust quantities if needed
5. Confirm issuance to deduct from inventory

### Production Entries

Record daily production with quality metrics.

![Production Entries](screenshots/14_Production_Entries.png)

**Data Captured:**
- Product produced
- Quantity manufactured
- Machine used
- Operator name
- Quality grade
- Any defects or issues

### Production Reconciliation

End-of-day reconciliation of production vs material usage.

![Production Reconciliation](screenshots/15_Production_Reconciliation.png)

**Reconciliation Process:**
1. Review daily production totals
2. Compare actual vs expected material consumption
3. Document any variances with explanations
4. Submit for approval

### Variance Analytics

Analyze production variances and identify improvement opportunities.

![Variance Analytics](screenshots/16_Variance_Analytics.png)

**Analytics Include:**
- Material usage variance trends
- Machine-wise efficiency comparison
- Product-wise yield analysis
- Cost impact of variances

---

## Finance & Sales

### Sales Invoices

Create and manage sales invoices with GST compliance.

![Sales Invoices](screenshots/17_Sales_Invoices.png)

**Invoice Features:**
- GST-compliant invoice generation
- Multiple tax rates support
- Automatic total calculation
- Print and email options
- Invoice cancel and reissue capability

### Pending Payments

Track outstanding payments from customers.

![Pending Payments](screenshots/18_Pending_Payments.png)

**Information Displayed:**
- Invoice number and date
- Customer name
- Total amount and pending amount
- Days overdue
- Payment reminder status

### Payment Management

Record and allocate payments against invoices.

![Payment Management](screenshots/19_Payment_Management.png)

**Payment Features:**
- FIFO-based payment allocation
- Multiple payment modes (Cash, Bank, UPI, Cheque)
- Partial payment support
- Payment receipt generation
- Payment write-off capability (Admin only)

### Credit Notes

View and manage credit notes issued to customers.

![Credit Notes](screenshots/20_Credit_Notes.png)

**Credit Note Types:**
- Sales returns credit notes
- Damage claims
- Manual credit notes

### Cancelled Invoices

Track cancelled invoices with audit trail.

![Cancelled Invoices](screenshots/21_Cancelled_Invoices.png)

**Displayed Information:**
- Original invoice details
- Cancellation reason
- Replacement invoice link (if any)
- Cancelled by and date

### Sales Returns

Process customer returns with quality segregation workflow.

![Sales Returns](screenshots/22_Sales_Returns.png)

**Returns Process:**
1. Create return request
2. Receive goods and quality check
3. Segregate: Resaleable, Repairable, or Scrap
4. Update inventory accordingly
5. Generate credit note if applicable

---

## Dispatch & Logistics

### Gatepasses

Create gatepasses for goods leaving the facility.

![Gatepasses](screenshots/23_Gatepasses.png)

**Important Notes:**
- Invoice must be created before gatepass
- Gatepass creation deducts inventory
- Gatepass cancellation returns inventory

### Dispatch Tracking

Track the 5-stage dispatch workflow from invoice to delivery.

![Dispatch Tracking](screenshots/24_Dispatch_Tracking.png)

**Dispatch Stages:**
1. **Invoice Created** - Initial stage
2. **Gatepass Created** - Ready for dispatch
3. **Dispatched** - Vehicle left facility
4. **In Transit** - On the way to customer
5. **Delivered** - Proof of delivery received

---

## Cash & Expenses

### Daily Cash Register

Track daily business cash flow with comprehensive ledger entries.

![Daily Cash Register](screenshots/25_Daily_Cash_Register.png)

**Features:**
- **Opening Balance**: Automatically carried forward from previous day
- **Cash Received**: Record receipts by source type
  - Sale Cash
  - Secondary Sale
  - UPI
  - Bank Transfer
  - Other
- **Expenses**: Record daily expenses with instant voucher generation
- **Transfers**: Record cash transfers out of register
- **Closing Balance**: Auto-calculated using formula:
  `Closing = Opening + Cash Received - Expenses - Transfers`

**Reconciliation Workflow:**
1. Enter actual cash on hand
2. System calculates variance (Expected vs Actual)
3. If variance exists, enter explanation
4. Submit reconciliation
5. Day is closed and locked

### Cash Register Report

View historical cash register entries with export capability.

![Cash Register Report](screenshots/26_Cash_Register_Report.png)

**Report Features:**
- Date range filtering
- Summary totals
- Excel export
- Variance highlighting
- Detailed line item view

### Expense Vouchers

Manage expense vouchers with approval workflow.

![Expense Vouchers](screenshots/27_Expense_Vouchers.png)

**Expense Workflow:**
1. **Draft** - Create expense voucher
2. **Submitted** - Send for approval
3. **Approved/Rejected** - Manager decision
4. **Paid** - Payment confirmed

**Voucher Features:**
- Multiple line items per voucher
- Expense category assignment
- GST handling
- Payment mode tracking
- A5-sized print format (2 per A4 page)
- Signature boxes for Receiver, Cashier, Approved By

### Documents

Store and manage business documents with expiry tracking.

![Documents](screenshots/28_Documents.png)

**Document Management Features:**
- Category-based organization
- Expiry date tracking with color-coded alerts
- Link to vendors or invoices
- Bulk download (ZIP)
- Sharing capabilities
- Automated expiry notifications via WhatsApp and Email

---

## Maintenance

### PM Schedule

View preventive maintenance schedule for all machines.

**Note:** This screen may require specific navigation access based on your role.

### PM History

Track completed preventive maintenance activities.

**Tracked Information:**
- Maintenance date and type
- Machine details
- Tasks completed
- Parts replaced
- Next due date

---

## Master Data

### Users

Manage system users and their credentials.

![Users](screenshots/32_Users.png)

**User Management:**
- Create new users
- Set roles and permissions
- Enable/disable accounts
- Reset passwords

### Role Permissions

Configure access permissions for each role across all 50 system screens.

![Role Permissions](screenshots/33_Role_Permissions.png)

**Permission Levels:**
- **None** - No access to the screen
- **View** - Can view but not modify
- **Edit** - Can view and modify data

### Vendor Master

Manage vendor information and classification.

![Vendor Master](screenshots/34_Vendor_Master.png)

**Vendor Information:**
- Contact details
- GST information
- Bank details for payments
- Product brands supplied
- Three-tier classification (based on revenue)

### Vendor Types

Define vendor types for categorization.

![Vendor Types](screenshots/35_Vendor_Types.png)

### Machines

Manage machine master data.

![Machines](screenshots/36_Machines.png)

### Machine Types

Define machine types for categorization.

![Machine Types](screenshots/37_Machine_Types.png)

### Spare Parts

Manage spare parts inventory.

![Spare Parts](screenshots/38_Spare_Parts.png)

### PM Templates

Create templates for preventive maintenance activities.

![PM Templates](screenshots/39_PM_Templates.png)

### Unit of Measurement

Define units of measurement for products and materials.

![Unit of Measurement](screenshots/40_Unit_of_Measurement.png)

### Raw Material Types

Define raw material types for categorization.

![Raw Material Types](screenshots/41_Raw_Material_Types.png)

---

## Settings

### Invoice Templates

Configure invoice templates with company branding.

![Invoice Templates](screenshots/42_Invoice_Templates.png)

**Customization Options:**
- Company logo and name
- Terms and conditions
- Bank details for payment
- Signature images
- UPI QR code for payments

### Notification Settings

Configure email and WhatsApp notification preferences.

![Notification Settings](screenshots/43_Notification_Settings.png)

**Configurable Notifications:**
- Machine startup reminders
- Checklist assignment alerts
- Payment reminders
- Document expiry alerts
- Order confirmations

### Data Import

Import data from external systems like Vyapaar.

![Data Import](screenshots/44_Data_Import.png)

**Import Features:**
- Excel-based data import
- Fuzzy matching for vendors
- Intelligent date conversion
- Automatic vendor type classification
- Comprehensive error handling

---

## Support

For technical support or questions about KINTO Smart Ops, please contact:

**Inmoisture Private Limited**  
Email: support@inmoisture.com

---

*Document generated: November 2025*
