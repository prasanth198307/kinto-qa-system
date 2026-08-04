# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke/ngo-regional-screens.spec.ts >> NGO Multi-region Consistency >> accounting screens work correctly for all regional NGO tenants
- Location: tests/smoke/ngo-regional-screens.spec.ts:196:3

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