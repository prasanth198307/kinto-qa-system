#!/bin/bash
# ============================================================================
# KINTO Smart Ops - Mac Database Setup Script
# ============================================================================
# This script automates the database setup process on Mac
# Run with: bash setup_mac.sh
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "KINTO Smart Ops - Database Setup for Mac"
echo "============================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if PostgreSQL is installed
echo "Step 1: Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed!"
    echo ""
    echo "Install PostgreSQL using Homebrew:"
    echo "  brew install postgresql@15"
    echo "  brew services start postgresql@15"
    exit 1
fi
print_success "PostgreSQL is installed: $(psql --version)"
echo ""

# Check if DATABASE_URL is set
echo "Step 2: Checking DATABASE_URL environment variable..."
if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL is not set!"
    echo ""
    read -p "Enter database name (default: kinto_ops): " DB_NAME
    DB_NAME=${DB_NAME:-kinto_ops}
    
    read -p "Enter database username (default: $USER): " DB_USER
    DB_USER=${DB_USER:-$USER}
    
    read -s -p "Enter database password (press Enter if no password): " DB_PASS
    echo ""
    
    if [ -z "$DB_PASS" ]; then
        export DATABASE_URL="postgresql://$DB_USER@localhost/$DB_NAME"
    else
        export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost/$DB_NAME"
    fi
    
    print_success "DATABASE_URL set to: $DATABASE_URL"
    echo ""
    print_warning "Add this to your ~/.zshrc to make it permanent:"
    echo "  export DATABASE_URL=\"$DATABASE_URL\""
else
    print_success "DATABASE_URL is already set"
    echo "  $DATABASE_URL"
fi
echo ""

# Check if database exists
echo "Step 3: Checking if database exists..."
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_warning "Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        dropdb $DB_NAME 2>/dev/null || true
        createdb $DB_NAME
        print_success "Database recreated"
    else
        print_warning "Using existing database"
    fi
else
    createdb $DB_NAME
    print_success "Database '$DB_NAME' created"
fi
echo ""

# Test database connection
echo "Step 4: Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_error "Failed to connect to database"
    exit 1
fi
echo ""

# Run schema migration
echo "Step 5: Creating database schema (27 tables)..."
if psql "$DATABASE_URL" -f 01_complete_schema.sql > /dev/null 2>&1; then
    print_success "Schema created successfully"
else
    print_error "Failed to create schema"
    exit 1
fi
echo ""

# Run seed data
echo "Step 6: Loading reference data..."
echo "  - 4 Roles (Admin, Manager, Operator, Reviewer)"
echo "  - Default Admin User (admin / Admin@123)"
echo "  - 62 Role Permissions"
echo "  - 8 Units of Measurement"
echo "  - 5 Machine Types"
echo "  - 3 Vendor Types (Kinto, HPPani, Purejal)"
echo "  - 4 Product Categories"
echo "  - 5 Product Types"
echo ""

if psql "$DATABASE_URL" -f 02_seed_data.sql > /dev/null 2>&1; then
    print_success "Reference data loaded successfully"
else
    print_error "Failed to load reference data"
    exit 1
fi
echo ""

# Verify installation
echo "Step 7: Verifying installation..."

# Count tables
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
print_success "Tables created: $TABLE_COUNT"

# Count roles
ROLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
print_success "Roles: $ROLE_COUNT"

# Count permissions
PERM_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM role_permissions;" | xargs)
print_success "Permissions: $PERM_COUNT"

# Count vendor types
VENDOR_TYPE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM vendor_types;" | xargs)
print_success "Vendor Types: $VENDOR_TYPE_COUNT"

# Verify admin user
ADMIN_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" | xargs)
if [ "$ADMIN_EXISTS" -eq "1" ]; then
    print_success "Admin user created"
else
    print_warning "Admin user not found"
fi

echo ""
echo "============================================================================"
echo -e "${GREEN}✓ Database setup complete!${NC}"
echo "============================================================================"
echo ""
echo "Default Admin Credentials:"
echo "  Username: admin"
echo "  Password: Admin@123"
echo ""
print_warning "IMPORTANT: Change the admin password after first login!"
echo ""
echo "Vendor Types Installed:"
psql "$DATABASE_URL" -c "SELECT code, name, description FROM vendor_types ORDER BY code;"
echo ""
echo "To connect to your database:"
echo "  psql $DATABASE_URL"
echo ""
echo "To view all tables:"
echo "  psql $DATABASE_URL -c \"\\dt\""
echo ""
echo "============================================================================"
