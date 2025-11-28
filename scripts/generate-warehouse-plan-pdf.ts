import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const outputPath = path.join(process.cwd(), 'attached_assets', 'Warehouse_DeliveryChallan_Implementation_Plan.pdf');

// Ensure directory exists
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Helper functions
const addTitle = (text: string) => {
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a365d').text(text, { align: 'center' });
  doc.moveDown(0.5);
};

const addHeading = (text: string) => {
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2d3748').text(text);
  doc.moveDown(0.3);
};

const addSubHeading = (text: string) => {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#4a5568').text(text);
  doc.moveDown(0.2);
};

const addParagraph = (text: string) => {
  doc.fontSize(10).font('Helvetica').fillColor('#2d3748').text(text, { align: 'justify' });
  doc.moveDown(0.3);
};

const addBullet = (text: string) => {
  doc.fontSize(10).font('Helvetica').fillColor('#2d3748').text(`• ${text}`, { indent: 20 });
};

const addTableRow = (cols: string[], isHeader = false) => {
  const startX = 50;
  const colWidths = [150, 180, 150];
  let x = startX;
  
  if (isHeader) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a365d');
  } else {
    doc.font('Helvetica').fontSize(9).fillColor('#2d3748');
  }
  
  cols.forEach((col, i) => {
    doc.text(col, x, doc.y, { width: colWidths[i] || 150, continued: i < cols.length - 1 });
    x += colWidths[i] || 150;
  });
  doc.moveDown(0.3);
};

const addHorizontalLine = () => {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0');
  doc.moveDown(0.3);
};

const checkPageBreak = (height = 100) => {
  if (doc.y > 700) {
    doc.addPage();
  }
};

// ===== DOCUMENT CONTENT =====

// Cover Page
doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a365d')
   .text('KINTO Smart Ops', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(22).font('Helvetica-Bold').fillColor('#2d3748')
   .text('Warehouse, Delivery Challan &', { align: 'center' })
   .text('Vendor-Warehouse System', { align: 'center' });
doc.moveDown(1);
doc.fontSize(14).font('Helvetica').fillColor('#718096')
   .text('Comprehensive Implementation Plan', { align: 'center' });
doc.moveDown(2);
doc.fontSize(12).font('Helvetica').fillColor('#a0aec0')
   .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });

doc.addPage();

// Executive Summary
addTitle('Executive Summary');
addParagraph('This document provides a comprehensive implementation plan for a multi-warehouse inventory system with delivery challans, vendor-warehouse linking, consignment management, and integration with existing invoice/dispatch workflows in the KINTO Smart Ops platform.');
addHorizontalLine();

// Part 1: Introduction
addHeading('1. Introduction');
addSubHeading('1.1 What is a Delivery Challan?');
addParagraph('A Delivery Challan (DC) is a GST-compliant document for goods movement without immediate sale. Unlike invoices, it does not create tax liability and uses triplicate copies. It is required for stock transfers, job-work, samples, and returnable goods.');

addSubHeading('1.2 Challan vs Invoice');
addBullet('Invoice: Creates tax liability, used for sales');
addBullet('Delivery Challan: No tax liability, used for goods movement');
addBullet('DC can be linked to invoice or standalone');
doc.moveDown(0.5);

addSubHeading('1.3 Warehouse Concept');
addParagraph('Warehouses are locations where inventory is stored. They can be company-owned (factory, depot) or vendor-hosted (distributor, consignment agent). The system tracks stock levels, movements, and enables inter-warehouse transfers.');

checkPageBreak();
doc.addPage();

// Part 2: DC-Invoice Linkage
addHeading('2. Delivery Challan - Invoice Linkage');
addHorizontalLine();

addSubHeading('2.1 Invoice-First Flow');
addParagraph('Standard sales flow where invoice is created first, then DC is generated from invoice lines for dispatch tracking.');
addBullet('Invoice Created → DC Generated → Goods Dispatched → POD Received');
doc.moveDown(0.3);

addSubHeading('2.2 DC-First Flow');
addParagraph('Field sales flow where goods are dispatched first with DC, then converted to invoice later.');
addBullet('DC Created → Goods Dispatched → Customer Confirms → Invoice Generated');
doc.moveDown(0.3);

addSubHeading('2.3 Standalone DC (No Invoice)');
addParagraph('Used for internal movements, samples, job-work where no sale occurs.');
addBullet('Stock Transfers between warehouses');
addBullet('Samples and exhibitions');
addBullet('Job-work material dispatch');
addBullet('Returnable goods');

checkPageBreak();
doc.addPage();

// Part 3: Challan Types
addHeading('3. Delivery Challan Types');
addHorizontalLine();

const challanTypes = [
  ['Type', 'Purpose', 'Invoice Link'],
  ['Sale', 'Delivery against invoice', 'Required'],
  ['Returnable', 'Samples, demo units', 'Optional'],
  ['Job Work', 'Goods sent for processing', 'No'],
  ['Stock Transfer', 'Inter-warehouse movement', 'No'],
  ['Sample', 'Free samples', 'No'],
  ['Exhibition', 'Trade show goods', 'No'],
];

challanTypes.forEach((row, i) => addTableRow(row, i === 0));

checkPageBreak();
doc.addPage();

// Part 4: Vendor as Warehouse
addHeading('4. Vendor-Warehouse Concept');
addHorizontalLine();

addSubHeading('4.1 Linked-Vendor Warehouse Model');
addParagraph('Instead of converting vendors to warehouses, we link vendors to warehouse entities. This preserves vendor analytics while enabling stock tracking at vendor locations.');
doc.moveDown(0.3);

addSubHeading('4.2 Use Cases');
addBullet('Distributor holding consignment stock');
addBullet('Stockist with company inventory');
addBullet('Consignment agent selling on behalf');
addBullet('Job-work partner processing materials');
addBullet('External rented storage');
doc.moveDown(0.3);

addSubHeading('4.3 Inventory Types at Vendor-Warehouse');
addBullet('Consignment: Unsold stock (company ownership)');
addBullet('Owned: Sold to vendor via invoice (vendor ownership)');
addBullet('Reserved: Committed for pending orders');

checkPageBreak();
doc.addPage();

// Part 5: Database Schema
addHeading('5. Database Schema Design');
addHorizontalLine();

addSubHeading('5.1 New Tables');
const tables = [
  'warehouses - Core warehouse master',
  'warehouse_vendor_relations - Vendor-warehouse linkage with terms',
  'warehouse_inventory - Stock by warehouse/product/batch',
  'stock_ledger - Movement history and audit trail',
  'delivery_challans - DC header with workflow status',
  'delivery_challan_items - DC line items',
  'stock_transfers - Inter-warehouse transfer tracking',
  'stock_transfer_items - Transfer line items',
  'consignment_settlements - Vendor settlement tracking',
  'invoice_delivery_links - DC-Invoice relationship',
];
tables.forEach(t => addBullet(t));

checkPageBreak();
doc.addPage();

// Part 6: Workflow
addHeading('6. Workflow & State Machine');
addHorizontalLine();

addSubHeading('6.1 Delivery Challan States');
addBullet('Draft - Initial creation');
addBullet('Approved - Stock reserved, ready for dispatch');
addBullet('In Transit - Goods dispatched, gatepass issued');
addBullet('Delivered - POD received');
addBullet('Returned - Goods returned (for returnable DC)');
addBullet('Cancelled - DC cancelled');
doc.moveDown(0.5);

addSubHeading('6.2 Stock Transfer States');
addBullet('Pending - Request created');
addBullet('Approved - Ready for dispatch');
addBullet('In Transit - Goods moving');
addBullet('Received - Verified and inventory updated');
addBullet('Cancelled - Transfer cancelled');

checkPageBreak();
doc.addPage();

// Part 7: Features
addHeading('7. Feature Breakdown');
addHorizontalLine();

addSubHeading('Module 1: Warehouse Master');
addBullet('Warehouse CRUD with ownership types');
addBullet('Vendor linking capability');
addBullet('GST location codes for compliance');
addBullet('Default warehouse per user/role');
doc.moveDown(0.3);

addSubHeading('Module 2: Warehouse Inventory');
addBullet('Stock view by warehouse');
addBullet('Stock ledger with movement history');
addBullet('Min/Max stock alerts');
addBullet('Batch and lot tracking');
addBullet('Expiry date tracking');
doc.moveDown(0.3);

addSubHeading('Module 3: Delivery Challans');
addBullet('Full DC CRUD operations');
addBullet('Generate DC from invoice');
addBullet('Multiple challan types');
addBullet('Workflow status management');
addBullet('E-Way Bill integration');
addBullet('Print template');
addBullet('POD upload and tracking');
doc.moveDown(0.3);

checkPageBreak();

addSubHeading('Module 4: Stock Transfers');
addBullet('Transfer request creation');
addBullet('Approval workflow');
addBullet('Paired DC generation (out/in)');
addBullet('Receipt with variance handling');
doc.moveDown(0.3);

addSubHeading('Module 5: Consignment Management');
addBullet('Track consignment stock at vendors');
addBullet('Vendor sales reporting');
addBullet('Settlement calculation');
addBullet('Settlement invoice generation');
doc.moveDown(0.3);

addSubHeading('Module 6: Integration & Reports');
addBullet('Update dispatch tracking dashboard');
addBullet('Update gatepass flow');
addBullet('Warehouse stock report');
addBullet('DC register for GST');
addBullet('Consignment aging report');

checkPageBreak();
doc.addPage();

// Part 8: Role Permissions
addHeading('8. Role Permissions');
addHorizontalLine();

const permissions = [
  ['Screen Key', 'Label', 'Actions'],
  ['warehouses', 'Warehouse Master', 'view, create, edit, delete'],
  ['warehouse_inventory', 'Warehouse Inventory', 'view, create, edit'],
  ['delivery_challans', 'Delivery Challans', 'view, create, edit, delete'],
  ['stock_transfers', 'Stock Transfers', 'view, create, edit'],
  ['consignment_management', 'Consignment Management', 'view, create, edit'],
  ['consignment_settlements', 'Consignment Settlements', 'view, create'],
];
permissions.forEach((row, i) => addTableRow(row, i === 0));

checkPageBreak();
doc.addPage();

// Part 9: API Endpoints
addHeading('9. API Endpoints');
addHorizontalLine();

addSubHeading('Warehouses');
addBullet('GET /api/warehouses - List all warehouses');
addBullet('POST /api/warehouses - Create warehouse');
addBullet('GET /api/warehouses/:id/inventory - Warehouse stock');
doc.moveDown(0.3);

addSubHeading('Delivery Challans');
addBullet('GET /api/delivery-challans - List challans');
addBullet('POST /api/delivery-challans - Create challan');
addBullet('POST /api/delivery-challans/:id/approve - Approve DC');
addBullet('POST /api/delivery-challans/from-invoice/:id - Generate from invoice');
doc.moveDown(0.3);

addSubHeading('Stock Transfers');
addBullet('GET /api/stock-transfers - List transfers');
addBullet('POST /api/stock-transfers - Create transfer');
addBullet('POST /api/stock-transfers/:id/receive - Receive transfer');
doc.moveDown(0.3);

addSubHeading('Consignment');
addBullet('GET /api/consignment/summary/:warehouseId - Consignment overview');
addBullet('POST /api/consignment/settlements - Create settlement');

checkPageBreak();
doc.addPage();

// Part 10: UI Screens
addHeading('10. UI Screens');
addHorizontalLine();

const screens = [
  ['Screen', 'Location', 'Purpose'],
  ['Warehouse List', 'Admin → Warehouses', 'Manage all warehouses'],
  ['Warehouse Detail', 'Warehouses/:id', 'View stock, ledger, vendors'],
  ['Vendor Warehouses', 'Vendor → Warehouses tab', 'Linked locations'],
  ['Delivery Challan List', 'Sales → Challans', 'All DCs with filters'],
  ['Create DC', 'Sales → New DC', 'Create new challan'],
  ['DC from Invoice', 'Invoice → Create DC', 'Auto-generate DC'],
  ['Stock Transfers', 'Inventory → Transfers', 'Inter-warehouse moves'],
  ['Consignment Dashboard', 'Sales → Consignment', 'Vendor stock overview'],
  ['Settlements', 'Sales → Settlements', 'Vendor settlements'],
];
screens.forEach((row, i) => addTableRow(row, i === 0));

checkPageBreak();
doc.addPage();

// Part 11: Implementation Timeline
addHeading('11. Implementation Timeline');
addHorizontalLine();

const timeline = [
  ['Week', 'Phase', 'Deliverables'],
  ['Week 1', 'Foundation', 'Warehouse master, inventory tables, basic CRUD'],
  ['Week 2', 'Inventory', 'Stock ledger, warehouse views, transfers'],
  ['Week 3', 'Delivery Challans', 'DC CRUD, types, workflow, integration'],
  ['Week 4', 'Consignment', 'Vendor-warehouse linking, tracking'],
  ['Week 5', 'Integration', 'Dispatch tracking, gatepass, invoice linking'],
  ['Week 6', 'Reports & Polish', 'Reports, print templates, testing'],
];
timeline.forEach((row, i) => addTableRow(row, i === 0));

checkPageBreak();
doc.addPage();

// Part 12: GST Compliance
addHeading('12. GST Compliance');
addHorizontalLine();

addSubHeading('12.1 Document Requirements');
addBullet('Delivery Challan must have unique serial number');
addBullet('Triplicate copies: Original, Duplicate, Triplicate');
addBullet('GSTIN of consignor and consignee');
addBullet('HSN codes for all items');
addBullet('E-Way Bill for goods > Rs. 50,000');
doc.moveDown(0.3);

addSubHeading('12.2 Tax Treatment by Movement Type');
addBullet('Company → Vendor Warehouse: DC (No tax - consignment)');
addBullet('Vendor Warehouse → Customer: Invoice (GST charged)');
addBullet('Unsold Return: Return Challan (No tax)');
addBullet('Settlement (Sale to Vendor): Invoice (GST charged)');

doc.moveDown(2);
addHorizontalLine();
doc.fontSize(10).font('Helvetica-Oblique').fillColor('#718096')
   .text('End of Document', { align: 'center' });
doc.fontSize(8).fillColor('#a0aec0')
   .text('KINTO Smart Ops - Warehouse & Delivery Challan Implementation Plan', { align: 'center' });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log(`PDF generated successfully at: ${outputPath}`);
});
