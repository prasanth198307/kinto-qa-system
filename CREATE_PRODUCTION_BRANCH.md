# Create Production Branch

## Git Branch Commands

I cannot create git branches due to system restrictions. You need to create the production branch yourself.

---

## Quick Command

Run this in your terminal:

```bash
git checkout -b production
git push origin production
```

---

## Detailed Steps

### 1. Create Production Branch
```bash
# Create and switch to production branch
git checkout -b production

# Verify you're on production branch
git branch
```

### 2. Push to Remote
```bash
# Push production branch to remote repository
git push origin production

# Set upstream tracking
git push --set-upstream origin production
```

### 3. Protect Production Branch (GitHub)

If using GitHub:

1. Go to repository settings
2. Click "Branches"
3. Add rule for `production` branch
4. Enable:
   - Require pull request before merging
   - Require status checks to pass
   - Include administrators

### 4. Deploy from Production Branch

On your production server:

```bash
# Clone production branch
git clone -b production <your-repo-url> kinto-app

# Or if already cloned, switch to production
cd kinto-app
git checkout production
git pull origin production
```

---

## Production Branch Strategy

```
main (development)
  ├── Feature branches
  └── Bug fixes
      └── Merge to main
          └── After testing, merge to production
              └── Deploy from production branch
```

### Recommended Workflow

1. **Development:** Work on `main` branch
2. **Testing:** Test changes on `main`
3. **Production:** Merge to `production` when ready
4. **Deploy:** Deploy from `production` branch only

---

## Current Branch Status

- `main` - Development branch (current)
- `production` - Create this for production deployments

---

## Why Separate Production Branch?

1. **Stability:** Production branch only gets tested, stable code
2. **Safety:** Prevents accidental deployment of unfinished features
3. **Rollback:** Easy to rollback to last known good state
4. **Clear Separation:** Development vs Production clearly separated

---

## To Create Production Branch Now:

```bash
git checkout -b production
git push origin production
```

That's it! Your production branch is ready.
