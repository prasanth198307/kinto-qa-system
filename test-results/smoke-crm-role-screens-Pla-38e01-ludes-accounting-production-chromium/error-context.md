# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/crm-role-screens.spec.ts >> Plan Feature Gates — API verification >> starter plan: GET /api/tenant/features → allowedNavItems excludes accounting, production
- Location: tests/smoke/crm-role-screens.spec.ts:517:3

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img [ref=e7]
      - heading "404 Page Not Found" [level=1] [ref=e9]
    - paragraph [ref=e10]: Did you forget to add the page to the router?
  - region "Notifications (F8)":
    - list
```