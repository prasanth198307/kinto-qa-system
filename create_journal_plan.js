const XLSX = require('xlsx');

// Create workbook
const wb = XLSX.utils.book_new();

// Sheet 1: Manufacturing Expense Categories
const expenseCategories = [
  ['Category Code', 'Category Name', 'Description', 'GST Applicable', 'Account Type'],
  ['RAW', 'Raw Material Consumption', 'Materials used in production (preforms, caps, chemicals)', 'Yes', 'Direct Cost'],
  ['LABOR', 'Direct Labor', 'Wages for production workers', 'No', 'Direct Cost'],
  ['MAINT', 'Machine Maintenance', 'Repairs, spare parts, servicing', 'Yes', 'Factory Overhead'],
  ['UTIL', 'Shop-floor Utilities', 'Electricity, water, fuel for factory', 'Yes', 'Factory Overhead'],
  ['PACK', 'Packaging Materials', 'Bottles, caps, labels, cartons, shrink wrap', 'Yes', 'Direct Cost'],
  ['QA', 'Quality Assurance', 'Testing, lab supplies, QC expenses', 'Yes', 'Factory Overhead'],
  ['FACTOH', 'Factory Overheads', 'Rent, depreciation, insurance', 'Mixed', 'Factory Overhead'],
  ['SCRAP', 'Scrap & Rework', 'Waste handling, rejected materials', 'No', 'Direct Cost'],
  ['LOGIST', 'Logistics & Dispatch', 'Transport, loading, vehicle expenses', 'Yes', 'Selling Expense'],
  ['ADMIN', 'Admin Overheads', 'Office, salaries, miscellaneous', 'Mixed', 'Admin Expense'],
  ['DIESEL', 'Diesel & Fuel', 'Vehicle fuel, generator fuel', 'Yes', 'Operating Expense'],
  ['TRAVEL', 'Travel & Conveyance', 'Staff travel, local conveyance', 'No', 'Admin Expense'],
  ['FOOD', 'Staff Welfare', 'Tiffin, tea, meals for staff', 'No', 'Admin Expense'],
  ['PETTY', 'Petty Cash Expenses', 'Miscellaneous small expenses', 'No', 'Admin Expense'],
];

const ws1 = XLSX.utils.aoa_to_sheet(expenseCategories);
ws1['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 18 }];
XLSX.utils.book_append_sheet(wb, ws1, 'Expense Categories');

// Sheet 2: Chart of Accounts
const chartOfAccounts = [
  ['Account Code', 'Account Name', 'Account Type', 'Parent Account', 'Linked Expense Category'],
  ['1000', 'ASSETS', 'Header', '', ''],
  ['1100', 'Cash on Hand', 'Asset', '1000', ''],
  ['1110', 'Petty Cash - Factory', 'Asset', '1100', ''],
  ['1120', 'Petty Cash - Office', 'Asset', '1100', ''],
  ['1200', 'Bank Accounts', 'Asset', '1000', ''],
  ['1210', 'Main Bank Account', 'Asset', '1200', ''],
  ['1220', 'Secondary Bank Account', 'Asset', '1200', ''],
  ['1300', 'Accounts Receivable', 'Asset', '1000', ''],
  ['1400', 'Inventory', 'Asset', '1000', ''],
  ['1410', 'Raw Materials', 'Asset', '1400', ''],
  ['1420', 'Work in Progress', 'Asset', '1400', ''],
  ['1430', 'Finished Goods', 'Asset', '1400', ''],
  ['2000', 'LIABILITIES', 'Header', '', ''],
  ['2100', 'Accounts Payable', 'Liability', '2000', ''],
  ['2200', 'GST Payable', 'Liability', '2000', ''],
  ['3000', 'EQUITY', 'Header', '', ''],
  ['3100', 'Owner Capital', 'Equity', '3000', ''],
  ['3200', 'Retained Earnings', 'Equity', '3000', ''],
  ['4000', 'REVENUE', 'Header', '', ''],
  ['4100', 'Sales - Primary', 'Revenue', '4000', ''],
  ['4200', 'Sales - Secondary', 'Revenue', '4000', ''],
  ['4300', 'Other Income', 'Revenue', '4000', ''],
  ['5000', 'EXPENSES', 'Header', '', ''],
  ['5100', 'Raw Material Expense', 'Expense', '5000', 'RAW'],
  ['5200', 'Direct Labor', 'Expense', '5000', 'LABOR'],
  ['5300', 'Machine Maintenance', 'Expense', '5000', 'MAINT'],
  ['5400', 'Utilities', 'Expense', '5000', 'UTIL'],
  ['5500', 'Packaging Materials', 'Expense', '5000', 'PACK'],
  ['5600', 'Quality Assurance', 'Expense', '5000', 'QA'],
  ['5700', 'Factory Overheads', 'Expense', '5000', 'FACTOH'],
  ['5800', 'Scrap & Waste', 'Expense', '5000', 'SCRAP'],
  ['5900', 'Logistics & Dispatch', 'Expense', '5000', 'LOGIST'],
  ['6000', 'Admin Expenses', 'Expense', '5000', 'ADMIN'],
  ['6100', 'Diesel & Fuel', 'Expense', '5000', 'DIESEL'],
  ['6200', 'Travel & Conveyance', 'Expense', '5000', 'TRAVEL'],
  ['6300', 'Staff Welfare', 'Expense', '5000', 'FOOD'],
  ['6400', 'Petty Cash Expenses', 'Expense', '5000', 'PETTY'],
];

const ws2 = XLSX.utils.aoa_to_sheet(chartOfAccounts);
ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
XLSX.utils.book_append_sheet(wb, ws2, 'Chart of Accounts');

// Sheet 3: Cash Register Journal Mapping
const cashRegisterMapping = [
  ['Transaction Type', 'Debit Account', 'Credit Account', 'Description', 'Expense Category'],
  ['cash_received', 'Cash on Hand (1100)', 'Sales - Secondary (4200)', 'Cash received from sales', ''],
  ['deposit', 'Main Bank Account (1210)', 'Cash on Hand (1100)', 'Cash deposited to bank', ''],
  ['expense - Diesel', 'Diesel & Fuel (6100)', 'Cash on Hand (1100)', 'Diesel expense', 'DIESEL'],
  ['expense - Food', 'Staff Welfare (6300)', 'Cash on Hand (1100)', 'Staff tiffin/food', 'FOOD'],
  ['expense - Travel', 'Travel & Conveyance (6200)', 'Cash on Hand (1100)', 'Travel expense', 'TRAVEL'],
  ['expense - Maintenance', 'Machine Maintenance (5300)', 'Cash on Hand (1100)', 'Machine repair', 'MAINT'],
  ['expense - Packaging', 'Packaging Materials (5500)', 'Cash on Hand (1100)', 'Packaging supplies', 'PACK'],
  ['expense - Other', 'Petty Cash Expenses (6400)', 'Cash on Hand (1100)', 'Miscellaneous expense', 'PETTY'],
  ['transfer', 'Recipient Account', 'Cash on Hand (1100)', 'Cash transfer', ''],
];

const ws3 = XLSX.utils.aoa_to_sheet(cashRegisterMapping);
ws3['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 18 }];
XLSX.utils.book_append_sheet(wb, ws3, 'Cash Register Mapping');

// Sheet 4: Journal Entry Sample
const journalSample = [
  ['Journal Entry Example - Daily Cash Register Posting'],
  [''],
  ['Date', '2025-01-09', '', '', '', ''],
  ['Reference', 'CR-250109', '', '', '', ''],
  ['Description', 'Daily cash register transactions', '', '', '', ''],
  [''],
  ['Line', 'Account', 'Debit (Rs)', 'Credit (Rs)', 'Category', 'Memo'],
  ['1', 'Cash on Hand', '17460', '', '', 'Cash received from sales'],
  ['2', 'Sales - Secondary', '', '17460', '', 'Secondary sale income'],
  ['3', 'Diesel & Fuel', '3000', '', 'DIESEL', 'Ramesh diesel'],
  ['4', 'Staff Welfare', '110', '', 'FOOD', 'Ankith tiffin'],
  ['5', 'Petty Cash Expenses', '100', '', 'PETTY', 'Krishna petrol'],
  ['6', 'Cash on Hand', '', '3210', '', 'Cash paid for expenses'],
  ['', '', '', '', '', ''],
  ['', 'TOTAL', '20670', '20670', '', 'Balanced Entry'],
];

const ws4 = XLSX.utils.aoa_to_sheet(journalSample);
ws4['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 28 }];
XLSX.utils.book_append_sheet(wb, ws4, 'Journal Sample');

// Sheet 5: Implementation Tasks
const tasks = [
  ['Phase', 'Task', 'Priority', 'Status', 'Notes'],
  ['1', 'Create accounts table in database', 'High', 'Pending', 'Chart of accounts with hierarchy'],
  ['1', 'Create journal_entries table', 'High', 'Pending', 'Header: date, ref, description, status'],
  ['1', 'Create journal_entry_lines table', 'High', 'Pending', 'Lines: account, debit, credit'],
  ['2', 'Add manufacturing expense categories', 'High', 'Pending', 'Seed data from Expense Categories sheet'],
  ['2', 'Link categories to accounts', 'Medium', 'Pending', 'expense_category_id on accounts'],
  ['3', 'Chart of Accounts UI screen', 'High', 'Pending', 'CRUD with tree view'],
  ['3', 'Journal Entry form', 'High', 'Pending', 'Debit/Credit validation, must balance'],
  ['3', 'Journal Entry list', 'High', 'Pending', 'Filter, search, print capability'],
  ['4', 'Cash Register auto-journal', 'High', 'Pending', 'Auto-create entries from transactions'],
  ['4', 'Link transactions to journal', 'Medium', 'Pending', 'Add journal_entry_id to cash_register_transactions'],
  ['5', 'General Ledger report', 'Medium', 'Pending', 'Account-wise transaction listing'],
  ['5', 'Trial Balance report', 'Medium', 'Pending', 'Debit/Credit totals by account'],
  ['5', 'Expense by Category report', 'Medium', 'Pending', 'Category-wise expense analysis'],
];

const ws5 = XLSX.utils.aoa_to_sheet(tasks);
ws5['!cols'] = [{ wch: 8 }, { wch: 38 }, { wch: 10 }, { wch: 12 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, ws5, 'Implementation Tasks');

// Save
XLSX.writeFile(wb, 'attached_assets/Journal_Entry_Plan.xlsx');
console.log('Excel file created: attached_assets/Journal_Entry_Plan.xlsx');
