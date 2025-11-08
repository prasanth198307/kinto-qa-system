# Image Columns Migration Summary
**Date:** November 8, 2025  
**Migration File:** `20251108_093500_image_columns_to_text.sql`

## Overview
This migration changes all image/photo URL columns from `varchar` to `text` to support base64-encoded images throughout the KINTO QA system.

## Why This Migration is Needed

### The Problem
- The system stores images as base64-encoded data URLs (not external file URLs)
- Base64 images are typically 13,000 to 650,000 characters long
- Old `varchar(500)` columns were too small, causing insert/update failures
- Users couldn't upload company logos, profile pictures, or task photos

### The Solution
- Change all image columns to `text` type (unlimited length)
- `text` type is optimized for large strings in PostgreSQL
- Safe, non-destructive migration (no data loss)

## Columns Changed

| Table | Column | Old Type | New Type | Purpose |
|-------|--------|----------|----------|---------|
| `users` | `profile_image_url` | `varchar` | `text` | User profile pictures |
| `submission_tasks` | `photo_url` | `varchar(500)` | `text` | QA checklist task photos |
| `pm_execution_tasks` | `photo_url` | `varchar(500)` | `text` | PM task documentation photos |
| `invoice_templates` | `logo_url` | `varchar(500)` | `text` | Company logos on invoices |

## How to Apply This Migration

### Option 1: Using psql (Recommended for Production)

```bash
# Using DATABASE_URL environment variable
psql $DATABASE_URL -f updated_dbscripts/20251108_093500_image_columns_to_text.sql

# Or with explicit connection
psql -U postgres -d kinto_qa -f updated_dbscripts/20251108_093500_image_columns_to_text.sql
```

### Option 2: Using Drizzle Kit (Development Only)

```bash
# Sync schema automatically
npm run db:push

# Force sync if needed
npm run db:push --force
```

## Verification

After applying the migration, verify all columns were changed:

```sql
SELECT 
  table_name, 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('profile_image_url', 'photo_url', 'logo_url')
ORDER BY table_name, column_name;
```

**Expected result:** All columns should show `data_type = 'text'` and `character_maximum_length = (null)`

## Affected Features

After this migration, the following features will work properly:

✅ **User Profile Pictures**
- Users can upload profile pictures via base64 encoding
- No external file storage needed

✅ **Invoice Template Logos**
- Admins can upload company logos in Template Management
- Logos appear on all generated invoices
- Supports PNG, JPG, SVG formats

✅ **QA Checklist Photos**
- Operators can attach photos to checklist tasks
- Photos stored directly in database
- Mobile app camera integration supported

✅ **PM Task Photos**
- Maintenance photos for preventive maintenance tasks
- Documentation of maintenance work
- Before/after photos for auditing

## Base64 Image Size Reference

| Image Type | Typical Size | Base64 Chars | Old Limit | New Limit |
|------------|-------------|--------------|-----------|-----------|
| Small icon (16x16) | ~1KB | ~1,300 | ❌ Failed (500) | ✅ Works |
| Avatar (100x100) | ~10KB | ~13,000 | ❌ Failed (500) | ✅ Works |
| Logo (500x500) | ~100KB | ~130,000 | ❌ Failed (500) | ✅ Works |
| Photo (1920x1080) | ~500KB | ~650,000 | ❌ Failed (500) | ✅ Works |

## Safety & Rollback

### Safety Features
- ✅ Non-destructive migration (no data loss)
- ✅ Existing data preserved during conversion
- ✅ Compatible with all PostgreSQL versions
- ✅ Safe to re-run (idempotent)
- ✅ No application code changes required

### Rollback (NOT Recommended)

If you absolutely must rollback:

```sql
ALTER TABLE users ALTER COLUMN profile_image_url TYPE varchar;
ALTER TABLE submission_tasks ALTER COLUMN photo_url TYPE varchar(500);
ALTER TABLE pm_execution_tasks ALTER COLUMN photo_url TYPE varchar(500);
ALTER TABLE invoice_templates ALTER COLUMN logo_url TYPE varchar(500);
```

⚠️ **WARNING:** Rolling back will truncate any base64 images longer than 500 characters!

## Integration with Application Code

### Frontend (React/TypeScript)
No changes needed - the application code already expects these columns to be text.

**Example: File upload to base64**
```typescript
const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && file.size <= 2 * 1024 * 1024) { // 2MB limit
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // base64String is now 13,000+ chars - stored in text column ✅
      setFormData({ ...formData, logoUrl: base64String });
    };
    reader.readAsDataURL(file);
  }
};
```

### Backend (Express/Drizzle)
Schema is already updated in `shared/schema.ts`:

```typescript
export const invoiceTemplates = pgTable("invoice_templates", {
  // ... other fields
  logoUrl: text("logo_url"), // ✅ Already using text type
});
```

## Performance Impact

### Storage
- Minimal impact - PostgreSQL handles text efficiently
- Images compressed before base64 encoding
- Typical logo: 100KB raw → 130KB base64 (30% overhead)

### Query Performance
- No degradation expected
- text columns are optimized for large strings
- Indexes still work efficiently

### Best Practices
- Compress images before upload (recommended: 500x500 max for logos)
- Use WebP format for better compression
- Set file size limits (recommended: 2MB max)

## Testing Checklist

After migration, test these features:

- [ ] Upload a company logo in Template Management
- [ ] Create/edit user profile with profile picture
- [ ] Take photo in QA checklist task completion
- [ ] Attach photo to PM task execution
- [ ] Generate invoice PDF with logo - verify logo displays
- [ ] Print invoice - verify logo quality

## Troubleshooting

### Issue: Migration fails with "column does not exist"
**Solution:** Table structure may differ. Check your database schema first:
```sql
\d users
\d submission_tasks
\d pm_execution_tasks
\d invoice_templates
```

### Issue: Images still failing to upload
**Solution:** Check application-level file size limits:
- Client-side: 2MB limit in file upload component
- Server-side: Check Express body-parser limit
- Database: Verify connection string allows large payloads

### Issue: Invoice PDF doesn't show logo
**Solution:** 
1. Verify logo was saved: `SELECT logo_url FROM invoice_templates WHERE id = ?`
2. Check base64 format: Should start with `data:image/png;base64,` or similar
3. Clear browser cache and reload

## Migration Sequence

This migration should be applied **after** all core schema migrations:

```bash
# 1-7: Core migrations (see README.md)
# ...

# 8: This migration (image columns)
psql $DATABASE_URL -f updated_dbscripts/20251108_093500_image_columns_to_text.sql
```

## Related Files

- **Migration SQL:** `updated_dbscripts/20251108_093500_image_columns_to_text.sql`
- **Schema Definition:** `shared/schema.ts`
- **Template Management:** `client/src/pages/template-management.tsx`
- **Invoice Component:** `client/src/components/PrintableInvoice.tsx`
- **User Profile:** (if implemented)

## Questions?

For detailed migration instructions, see: `updated_dbscripts/README.md`

---

**Migration Status:** ✅ Ready to Apply  
**Risk Level:** 🟢 Low (Non-destructive)  
**Estimated Time:** < 1 minute  
**Downtime Required:** None (can be applied during operation)
