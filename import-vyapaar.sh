#!/bin/bash

echo "🚀 Starting Vyapaar Excel Auto-Import..."
echo ""

# Check if Excel files exist
if [ ! -f "attached_assets/PartyReport_1763717077023.xlsx" ]; then
  echo "❌ Error: PartyReport Excel file not found!"
  echo "   Expected: attached_assets/PartyReport_1763717077023.xlsx"
  exit 1
fi

if [ ! -f "attached_assets/SaleReport_1763717077023.xlsx" ]; then
  echo "❌ Error: SaleReport Excel file not found!"
  echo "   Expected: attached_assets/SaleReport_1763717077023.xlsx"
  exit 1
fi

echo "✓ Excel files found"
echo ""

# Run the import script
NODE_ENV=development tsx scripts/import-vyapaar-excel.ts

echo ""
echo "✅ Import complete! Check the output above for details."
