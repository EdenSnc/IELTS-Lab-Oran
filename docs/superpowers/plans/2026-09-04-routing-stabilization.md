# Routing Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore valid non-localized route groups and make every truly unmatched global URL return the custom HTTP 404 response with `noindex`.

**Architecture:** Keep `next-intl` responsible only for root redirection and recognized locale routes. Delegate the five real non-localized route roots to the App Router, while rewriting every other first segment to the enabled global not-found document with an explicit HTTP 404 status so the top-level `[locale]` segment cannot capture it as a bogus locale.

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
- Produces: `npm run test:proxy`, a direct integration test proving that valid non-localized paths reach the App Router while unmatched paths use the global not-found document with HTTP 404.

- [ ] **Step 1: Write the failing proxy integration test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'publishable-integration-key';

test('proxy delegates valid route groups and returns a real global 404 for unknown paths', async () => {
  const { default: proxy } = await import('../../src/proxy');
  for (const pathname of ['/sample', '/staff/operations']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`));
    assert.equal(response.headers.get('x-middleware-rewrite'), null, `${pathname} must not be rewritten`);
    assert.equal(response.headers.get('location'), null, `${pathname} must not be redirected by locale routing`);
  }

  for (const pathname of ['/zz', '/random/unmatched/path']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`));
    assert.equal(response.status, 404, `${pathname} must carry HTTP 404 through the rewrite`);
    assert.equal(response.headers.get('x-middleware-rewrite'), 'http://localhost/_not-found');
    assert.equal(response.headers.get('location'), null, `${pathname} must not redirect`);
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

Expected: FAIL because `/sample` and `/staff/operations` are incorrectly
rewritten, and the unknown-path rewrite carries HTTP 200 instead of 404.

- [ ] **Step 4: Commit the red test**

```powershell
git add package.json tests/integration/proxy-routing.test.ts
git commit -m "test: cover non-localized proxy routing"
```

### Task 2: Separate valid route roots from global 404s

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `routing.locales`, `handleI18nRouting`, `NextResponse.next()`, and the existing `/_not-found` matcher exclusion.
- Produces: root redirect, locale routing, valid application-root continuation, and an HTTP 404 global-not-found rewrite for every unknown first segment.

- [ ] **Step 1: Complete the application-root boundary and add 404 status**

Add beside the proxy configuration:

```ts
const applicationRootSegments = new Set(['api', 'sample', 'sim', 'speaking', 'staff']);
```

Use it in the branch:

```ts
  } else if (applicationRootSegments.has(firstSegment)) {
    response = NextResponse.next();
  } else {
    response = NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
  }
```

Do not change the root redirect, locale handler, session-refresh policy, CSP,
or matcher in the same edit.

- [ ] **Step 2: Run the proxy test and verify it passes**

Run: `npm run test:proxy`

Expected: PASS; valid roots continue normally and unknown paths carry a 404
rewrite to the global not-found document.

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
