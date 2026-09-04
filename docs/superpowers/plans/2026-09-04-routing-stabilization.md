# Routing Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore valid non-localized route groups and make every truly unmatched global URL return the custom HTTP 404 response with `noindex`.

**Architecture:** Keep `next-intl` responsible only for root redirection and recognized locale routes. Pass every other pathname to the Next.js router so real route groups resolve normally and the enabled `global-not-found.tsx` convention handles unmatched paths with native 404 semantics.

**Tech Stack:** Next.js 16.3.1 App Router and Proxy, TypeScript, next-intl 4.13.1, Node test runner through tsx.

**Spec:** `docs/superpowers/specs/2026-09-04-end-to-end-verification-repair-design.md`

## Global Constraints

- Preserve `https://www.ieltslab.org` as the canonical production origin.
- Preserve `/ -> /en` as a direct permanent redirect with its query string.
- Preserve localized routing, API routes, test-engine routes, CSP nonces, Supabase session refresh, LiveKit sources, and all security headers.
- Do not change visible copy, branding, layout, or responsive behavior.
- Use local state for state-changing checks and do not initiate real payments.
- Every repair requires a failing behavior-level regression test before production code changes.

---

### Task 1: Prove the proxy routing defect

**Files:**
- Create: `tests/integration/proxy-routing.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the default `proxy(request: NextRequest): Promise<NextResponse>` export from `src/proxy.ts`.
- Produces: `npm run test:proxy`, a direct integration test proving that valid non-localized and unmatched paths are delegated to the App Router instead of rewritten to `/_not-found`.

- [ ] **Step 1: Write the failing proxy integration test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'publishable-integration-key';

test('proxy delegates valid route groups and unknown paths to the App Router', async () => {
  const { default: proxy } = await import('../../src/proxy');
  for (const pathname of ['/sample', '/staff/operations', '/zz', '/random/unmatched/path']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`));
    assert.equal(response.headers.get('x-middleware-rewrite'), null, `${pathname} must not be rewritten`);
    assert.equal(response.headers.get('location'), null, `${pathname} must not be redirected by locale routing`);
  }
});
```

- [ ] **Step 2: Add the direct test command**

Add this script to `package.json`:

```json
"test:proxy": "node --import tsx --test tests/integration/proxy-routing.test.ts"
```

- [ ] **Step 3: Run the test and verify the expected failure**

Run: `npm run test:proxy`

Expected: FAIL because `/sample`, `/staff/operations`, `/zz`, and
`/random/unmatched/path` contain an `x-middleware-rewrite` header targeting
`/_not-found`.

- [ ] **Step 4: Commit the red test**

```powershell
git add package.json tests/integration/proxy-routing.test.ts
git commit -m "test: cover non-localized proxy routing"
```

### Task 2: Delegate non-localized paths to Next.js

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `routing.locales`, `handleI18nRouting`, and `NextResponse.next()`.
- Produces: root redirect, locale routing, and a default App Router continuation without a synthetic rewrite.

- [ ] **Step 1: Replace the hard-coded passthrough/rewrite branch**

Replace:

```ts
  } else if (['api', 'sim', 'speaking'].includes(firstSegment)) {
    response = NextResponse.next();
  } else {
    response = NextResponse.rewrite(new URL('/_not-found', request.url));
  }
```

with:

```ts
  } else {
    response = NextResponse.next();
  }
```

Do not change the root redirect, locale handler, session-refresh policy, CSP,
or matcher in the same edit.

- [ ] **Step 2: Run the proxy test and verify it passes**

Run: `npm run test:proxy`

Expected: PASS; none of the four paths is rewritten or redirected by proxy.

- [ ] **Step 3: Run adjacent unit tests**

Run: `npm test`

Expected: all unit/certification tests pass, with the configured public
Supabase environment and the existing Windows user-info shim when required by
the host.

- [ ] **Step 4: Commit the minimal repair**

```powershell
git add src/proxy.ts
git commit -m "fix: restore app router not-found semantics"
```

### Task 3: Enforce runtime routing checks in CI

**Files:**
- Modify: `tests/integration/http-runtime.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the built Next.js production server on port 3099.
- Produces: `npm run test:http` and a CI gate after `npm run build`.

- [ ] **Step 1: Add the valid privileged route regression**

Add this test to `tests/integration/http-runtime.test.ts`:

```ts
test('HTTP Runtime: valid non-localized staff route reaches its authentication boundary', async () => {
  const res = await fetch(`${BASE_URL}/staff/operations`, { redirect: 'manual' });
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), '/en/auth/sign-in');
});
```

The existing global-unmatched test remains the runtime proof for HTTP 404,
custom UI, exactly one document, `noindex`, and absence of canonical, Open
Graph locale/URL, and hreflang metadata.

- [ ] **Step 2: Add the production-runtime test command**

Add this script to `package.json`:

```json
"test:http": "node --import tsx --test tests/integration/http-runtime.test.ts"
```

- [ ] **Step 3: Add the runtime gate after the build**

Append this step immediately after `npm run build` in `.github/workflows/ci.yml`:

```yaml
      - run: npm run test:http
```

- [ ] **Step 4: Build the production application**

Run: `npm run build`

Expected: exit 0 and a production build containing `/_global-not-found`.

- [ ] **Step 5: Run the runtime suite**

Run: `npm run test:http`

Expected: PASS for root, locales, SEO endpoints, favicon, valid staff routing,
localized 404s, global 404s, and test-engine `noindex` behavior.

- [ ] **Step 6: Run Phase 1 validation**

Run, in order:

```powershell
npm run lint
npm run typecheck
npm run db:validate
git diff --check
git status --short
```

Expected: all commands exit 0; only the planned Phase 1 files differ from the
plan commit.

- [ ] **Step 7: Commit the CI/runtime gate**

```powershell
git add package.json tests/integration/http-runtime.test.ts .github/workflows/ci.yml
git commit -m "test: enforce production routing semantics"
```

### Task 4: Verify the live boundary after release approval

**Files:**
- No repository changes.

**Interfaces:**
- Consumes: the committed deployment selected by Vercel.
- Produces: recorded HTTP evidence for canonical routes and failure semantics.

- [ ] **Step 1: Verify valid non-localized routes**

Check `/sample`, `/staff/operations`, `/sim/test-1`, and `/speaking`. Require
their real page or authentication boundary and reject the global 404 UI.

- [ ] **Step 2: Verify global and localized missing routes**

Check `/zz`, `/random/unmatched/path`, `/en/this-does-not-exist`,
`/fr/this-does-not-exist`, and `/ar/this-does-not-exist`. Require HTTP 404,
custom UI, `noindex`, and no canonical/og:url/hreflang.

- [ ] **Step 3: Verify SEO and identity invariants**

Check `/`, `/en`, `/fr`, `/ar`, `/robots.txt`, `/sitemap.xml`, and
`/favicon.ico`. Require the existing `.org` canonical and x-default behavior,
root 308, correct content types, and no legacy-domain leakage.
