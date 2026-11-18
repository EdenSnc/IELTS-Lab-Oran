# Full-Spectrum SEO, GEO, AEO & Web Development Diagnosis and Implementation Plan — `https://www.ieltslab.org`

**Audit Date:** 2026-11-18  
**Target Domain:** `https://www.ieltslab.org` (legacy domain `ieltslab.tech` redirecting via Vercel)  
**Repository:** `c:\Users\Admin\Documents\IELTS Lab\IELTS-Lab-Oran-cohort-announcement` (`codex/founding-cohort-announcement`, synced to `origin/main` `b4782dc` / `8bc35fd` / `e5d21dd`)  
**Implementation Status:** Codebase Remediation Complete (Working Tree Verified — see Section 7 for exact implemented items vs remaining owner dashboard actions)  

---

## 1. Executive Summary & Key Metrics Baseline

### 1.1 Git & Live Deployment Timeline Observed During This Audit

During this investigation (2026-11-18T01:37Z–03:05Z), the production repository and live Vercel deployment progressed through the following verified commits:

1. **`960d059` (`960d059d87ef2baaf548fe1f256b51e1a3a7c475`, 2026-11-17 23:46:19 +0100 — Initial Baseline):**
   - `feat(seo,i18n,acquisition): QR tracking, FR/AR localization, OG/schema/robots/IndexNow & demand-driven guide upgrades` (85 files changed, +45,662 / -481).
   - Deployed QR poster redirect `/r/[code]`, `/sample` middleware pass-through, FR/AR article & source localization, `1200×630` `public/og-default.png`, `LocalSchema` (`EducationalOrganization` + `WebSite`), `VideoObject`, `CollectionPage`, `FAQPage`, `ArticleTrust` breadcrumbs/related guides, `OAI-SearchBot` allow rule in `robots.ts`, IndexNow key `public/e4b8c2d91f0a47e69c3b58a12d7f60e3.txt`, `noindex` on private routes, 11 published guides in `sitemap.xml` (39 URLs), `Intake.tsx` non-strikethrough `previousFee` / `capacitySummary` (`CLAUDE-33`, `CLAUDE-34`), `"Verified Score"` badge replacing `"Proven Results"`, and contrast fixes in `Navbar.tsx`, `StopTraining.tsx`, `About.tsx`, `Compare.tsx`, `Facility.tsx`, and `Testimonials.tsx`.
   - Initial live probes (`2026-11-18T01:46Z–02:15Z`) confirmed `960d059` live in production, while codebase inspection uncovered a soft-404 HTTP 200 rewrite bug in `src/proxy.ts`, an invalid `VideoObject.contentUrl`, a `10` vs `11` guide count mismatch in `FeaturedGuides.tsx`, and canonical leakage on `/account` & `/auth`.
2. **`80214b9` (`80214b9ca1f4dae3075edffe21c0b301d59fb8be`, 2026-11-18 01:18:36 +0100 — Audit Remediation):**
   - `fix(security,engine,auth,i18n,seo): comprehensive audit remediation across middleware, exam delivery, RBAC, auth & acquisition` (86 files changed, +1,538 / -380).
   - Resolved unknown-route soft-404 rewrite (`{ status: 404 }`), BotID segment bypass in `src/proxy.ts`, `VideoObject.contentUrl` removal, `FeaturedGuides.tsx` `10` → `11` count fix, `MockTestOffer` DB error handling (`try/catch`), `account/layout.tsx` & `auth/layout.tsx` `noindex` + metadata nullification, `global-not-found.tsx` `noindex`, RTL logical CSS classes across core components, `italy-student-visa` `sitemap.ts` `lastmod` sync (`2026-09-01`), `ielts-one-skill-retake-algeria` `publishedTime`, `/r/[code]` prefetch guard, and localized onboarding/auth copy.
3. **`e14b3dc` (`e14b3dcdcba67ab7190011764e9194814c856352`, 2026-11-18 03:17:39 +0100 — Historical Intermediate Commit):**
   - `fix(copy,i18n,seo): remove dedicated PC/workstation claims for traditional in-person cohort` (7 files changed, +96 / -74).
   - Temporarily removed physical PC-lab claims and expanded homepage `<title>` tags to **EN=79, FR=80, AR=79 chars**. **Superseded by `e5d21dd`.**
4. **`aab5df9` (`aab5df9a8c65fc6bca7ad0a7981fb847eb58e2a4`, 2026-11-18 03:24:50 +0100) & `892a62c` (2026-11-18 03:43:28 +0100):**
   - `aab5df9`: `fix(csp,ci): inject per-request CSP nonces on global 404 and export local Supabase CI keys` (added `await headers()` to `src/app/global-not-found.tsx:L21-24`, shifting `<html lang="en">` to `L26`).
   - `892a62c`: `fix(speaking,tests): align Speaking booking entitlement guard with LRW blueprints and use relative future date in payment-operations test`.
5. **`e5d21dd` (`e5d21dd9302c6eb99c283c80108df4bcdba74cc0`, 2026-11-18 03:49:33 +0100) + `8bc35fd` & `b4782dc` (`origin/main` Baseline):**
   - `e5d21dd`: `fix(copy): restore full PC-first brand positioning and scope classroom note strictly to Cohort 1` (7 files changed, +70 / -92). Restored full PC-first brand positioning (`"8-Seat Physical Lab"`, `"Train on PC for test day"`, `"The Physical Lab"`, `"100% PC training"`) while scoping the traditional-classroom nuance strictly to Cohort 1 (`5,000 DA`). Note: sections below citing `e14b3dc` (`FIX-03`) are preserved for historical audit traceability; **our implementation strictly preserves `e5d21dd`'s PC-first brand positioning** while updating `simulation-platform/page.tsx` from stale `"in development"` copy to live platform copy.
   - `8bc35fd` & `b4782dc`: Excluded generated `supabase/.temp` edge runtime files from `eslint`/`tsc` and stripped UTF-8 BOM from `tsconfig.json` and `eslint.config.mjs`.

### 1.2 Executive Diagnosis Verdict

`https://www.ieltslab.org` has strong foundational assets for the Algerian market — genuine EN/FR/AR localization with `hreflang` parity across 39 sitemap URLs, DZD pricing with Chargily Pay / Baridimob, verified founder E-E-A-T (`Amine Senouci`, Band 8.0 / Listening 9.0), and proactive AI crawler access (`OAI-SearchBot`, `PerplexityBot`, `Claude-SearchBot`). Yet organic acquisition is severely constrained by **five systemic bottlenecks**:

1. **Dynamic `no-store` SSR & Cross-Region Latency (P0):** `src/proxy.ts` issues a per-request CSP nonce and `src/components/MockTestOffer.tsx` executes a Prisma DB lookup + `recordFunnelEvent` Postgres write on every homepage SSR, forcing `Cache-Control: private, no-cache, no-store` (`x-vercel-cache: MISS`, `cdg1::iad1`) and **2.05s–4.74s live TTFB**.
2. **Severe Page-1 CTR Deficit & Search Appearance Gap (P0/P1):** GSC shows **7,453 impressions** (avg pos ~7.5) yielding only **45 clicks (0.60% CTR)**, **0 rich result search appearances**, and **18 Indexed vs 27 Not Indexed** pages (plus a **-41.8%** impression drop from Sep to Oct).
3. **GEO/AI Brand Collision & Missing Machine-Readable Assets (P1):** Global SaaS sites `ieltslab.app`, `ieltslab.io`, and `ieltslab.uz` cause Google AI Search to conflate `ieltslab.org` with unrelated products; `/llms.txt` and `/llms-full.txt` return `404`; and **no `openai-domain-verification` TXT record** exists on `ieltslab.org` or `www.ieltslab.org` DNS.
4. **Incomplete Oran Local Signals & Missing Article Landmarks (P1):** Only `"Bir El Djir, Oran"` appears (no street/landmark, `31130` postal code, `GeoCoordinates`, `openingHoursSpecification`, `hasMap`, `tel:` link, or real classroom photos); `<footer>` is nested inside `<main><section>` on the homepage and completely absent on all 13 `/articles*` routes; 10 of 13 article routes lack `<main>`.
5. **High-Demand Zero-Impression Gaps & Noindexed Lead Magnet (P1/P2):** `/sample` (`noindex, follow`) and `simulation-platform` (`noindex` with stale "in development" copy) capture zero organic traffic for breakout Algeria simulator queries (`engnovate`, `ielts simulator`, `ielts test gratuit`), while `Canada Immigration` (76 queries / 0 GSC imp), `Computer Format / Retake` (12 queries / 0 imp), and Oran test-day logistics lack answer-first/calculator capture.

### 1.3 Verified Quantitative Baseline Table

| Category | Metric / Observation | Verified Value | Source / Timestamp |
|---|---|---|---|
| **PageSpeed / Lighthouse** (`https://www.ieltslab.org/en`) | CrUX Real-User Field Data | `Aucune donnée` (Mobile & Desktop) | `google pagespeed.txt` L18–19, L488–489 (16 Nov 2026 19:59 UTC+1) |
| | Lab Scores (Mobile / Desktop) | Perf **100 / 100**, A11y **96 / 96**, BP **96 / 96**, SEO **100 / 100**, Agentic **2/2 / 2/2** | `google pagespeed.txt` L22–31, L492–501 |
| | Core Web Vitals (Mobile / Desktop) | FCP **1.2s / 0.3s**, LCP **1.2s / 0.3s** (Desktop render delay **1,320 ms**, TTFB **70 ms**), TBT **30 ms / 50 ms**, CLS **0.019 / 0**, SI **1.8s / 1.0s** | `google pagespeed.txt` L33–61, L503–531, L606–615 |
| | Assets & Diagnostics | Render-blocking CSS **23.7 KiB** (450 ms mobile); Unused JS **199.3 KiB** (~128.1 KiB savings); Legacy JS **13.9 KiB**; 2 long tasks (**149 ms** M / **151 ms** D); DOM **468** elements (depth 12, max children 11); **19 (M) / 21 (D)** contrast failures | `google pagespeed.txt` L89–269, L557–746 |
| **Ahrefs Site Audit** (`Overview` & `All issues` PDF, `ahref.txt`) | Health & AI Discoverability | Health Score **93** (`Excellent`: 80 clean / 6 error URLs); AI Discoverability **100** (`Excellent`: Bot access **100**, Machine readability **97**) | `Overview - Ieltslab.pdf` p.1 (16 Nov 2026 20:37) |
| | Issues & Crawl Distribution | **180** issue instances across **17** active types (**6** Errors, **106** Warnings, **68** Notices); **129** crawled URLs (59 internal, 45 external, 25 resources); **432** links (409 crawled, 17 uncrawled, 6 robots-blocked); **49** crawled pages all with **0** backlinks & **0** organic traffic | `Overview` PDF, `All issues` PDF, `ahref.txt` L121–1007 |
| | Ahrefs TTFB & HTTP Codes | 2xx: **78**, 3xx: **8**; TTFB `<200ms`: **46**, `200–300ms`: **4**, `300–500ms`: **1** | `Overview - Ieltslab.pdf` p.1–2 |
| **Google Search Console** (87-day Window & Coverage) | Search Performance (`2026-08-20` to `2026-11-14`) | **45 clicks**, **7,453 impressions** (`Pages.csv` sum: **7,597**), **0.60% overall CTR** | `ieltslab.org-Performance-on-Search-2026-11-16.zip` (`Chart.csv`, `Pages.csv`) |
| | Monthly Trajectory (`Chart.csv`) | Aug 20–31: **3 / 422**; Sep 1–30: **21 / 4,007** (peak Sep 7: 255 imp); Oct 1–31: **16 / 2,332 (-41.8%)**; Nov 1–14: **5 / 692** | `Chart.csv` |
| | Devices & Countries (`Devices.csv`, `Countries.csv`) | Mobile: **32 / 4,780** (0.67% CTR, pos 7.4); Desktop: **11 / 2,638** (0.42%, pos 8.01); Tablet: **2 / 35** (5.71%, pos 5.86). Algeria: **37 / 6,136** (82.3% imp, 0.60% CTR, pos 7.58); UK 172 imp, US 169, FR 169 | `Devices.csv`, `Countries.csv` |
| | Search Appearance & Indexing (`2026-11-13`) | Search appearance: **0 rows**; Indexing: **18 Indexed / 27 Not Indexed** (45 total known pages); **7** critical issues totaling 27 pages (0 non-critical) | `Search appearance.csv`, `media_1794950416031_5b566271.zip` |
| **Live Production Probe** (`960d059` & `e14b3dc`) | Caching & Server TTFB | `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; `x-vercel-cache: MISS`; `x-vercel-id: cdg1::iad1`; TTFB **2,045–4,744 ms** across `/en`, `/fr`, `/ar`, `/articles*` | Live probes `2026-11-18T01:46Z–02:27Z` |
| | Crawl, Redirects & Assets | `http://ieltslab.org/` → 308 → `https://ieltslab.org/` → 308 → `https://www.ieltslab.org/` → 308 → `/en` (3 hops); **39/39** sitemap URLs HTTP 200; `/llms.txt` **404**; CSS **123,818 B** (2 files); JS **1,301,055 B** (16 chunks); Fonts **112,788 B** (3 WOFF2); `logo_rounded.png` **923,918 B**; `og-default.png` **88,775 B** (`1200×630`) | Live probes & `Resolve-DnsName` |
| | DNS Records (`ieltslab.org`) | `A`: `216.198.79.1`; `www CNAME`: `7b8c2637c1d1aa10.vercel-dns-017.com`; `MX`: Zoho; `TXT`: Zoho verify, `v=spf1 include:zohomail.com ~all`, `google-site-verification`; `_dmarc` & `openai-domain-verification`: **None** | `Resolve-DnsName` `2026-11-18` |
| **Analytics Status** | GA4 vs Vercel Analytics | **0 GA4/`gtag` exports or tracking** (`media_1794950416033_07c4182f.zip` is `google-analytics-mcp-main` code). Site uses `@vercel/analytics` (`^2.0.1`) & `@vercel/speed-insights` (`^2.0.0`) only | `package.json` L38–39; `src/app/[locale]/layout.tsx` L3–4, L77–78 |
| **Google Trends (DZ & DZ-31)** | Seasonality & Demand Gaps | 5y peak **Aug–Nov** (35.3–37.6) vs Mar–May trough (18.7–20.8); 90d `IELTS` mean **60.58** (peak 100 Oct 28); `tcf canada` **56.94** vs `ielts algérie` **0.6**; DZ-31 `TCF` **20.09** vs `IELTS` **2.56**; **662** unified queries in `demand_gap_matrix.csv` (Breakout mock/simulator demand; 0 GSC imp for Canada & Retake clusters) | `GOOGLE_TRENDS_AND_DEMAND_REPORT_20261117.md`, `trends_related.csv`, `demand_gap_matrix.csv` |

---

## 2. Complete Lossless Reconciliation (All 108 Prior Export Items + Commit `960d059` Updates)

**Status Classification Key (`Status vs 960d059`):**
- `Resolved in 960d059`: Fully addressed by commit `960d059`.
- `Partially Resolved`: Addressed in part in `960d059`, with verified gaps remaining.
- `Still Open`: Unresolved as of `960d059` (including pre-existing export items untouched by `960d059`).
- `New Finding`: Newly surfaced during the `960d059`–`e14b3dc` codebase/live/export investigation (not itemized in prior `claude report.txt`).

### 2.1 Prior AI Audit (`claude report.txt` — `CLAUDE-01` to `CLAUDE-50`)

| ID | Summary of Prior Audit Finding | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **CLAUDE-01** | `"Try a free Reading sample"` 404 on `/sample?locale=en`; move to `/[locale]/sample`; ensure real HTTP 404 | `Partially Resolved` | `/sample?locale=en` returns `200`; `80214b9` fixed unknown-route rewrite `{ status: 404 }`; `/[locale]/sample` still 307-redirects to `/sample?locale=` | `src/proxy.ts:L116-120`; `src/app/[locale]/sample/page.tsx:L1-12`; `src/app/(test-engine)/sample/page.tsx:L1-25`; live `/nonexistent-page-check-404` -> `404` |
| **CLAUDE-02** | Missing `og:image`/`twitter:image`, `/articles` inheriting homepage OG, `metadataBase`, `1200x630` PNG, `og:image:alt` | `Partially Resolved` | `og-default.png` (`1200×630`, 88,775 B), `metadataBase`, `articles` OG fixed; `/[locale]/waitlist`, `/articles/simulation-platform`, `/admin/acquisition` still inherit homepage OG | `src/lib/seo.ts:L38-158`; `src/app/[locale]/articles/page.tsx:L28-33`; `waitlist/page.tsx:L5-14`; `simulation-platform/page.tsx:L6-14`; `admin/acquisition/page.tsx:L12-15` |
| **CLAUDE-03** | Synthetic `article:modified_time` (`2026-11-16`) & sitemap `lastmod`; show visible Published/Updated dates | `Partially Resolved` | `ArticleTrust` renders visible fact-check date; `80214b9` synced `italy-student-visa` (`2026-09-01`) & OSR `publishedTime`; 5 older articles modified in `960d059` still default to `2026-07-29` in `sitemap.ts` | `src/app/sitemap.ts:L22-37`; `src/components/ArticleTrust.tsx:L125-150`; `italy-student-visa-english-tests-algeria/page.tsx:L10` |
| **CLAUDE-04** | 20 Nov 2026 deadline 4 days away; plan post-deadline waitlist/closed state & update `Offer.availability` | `Partially Resolved` | `/waitlist` exists (`noindex`), `cohort-launch.ts` tracks deadline state, **but** `LocalSchema.tsx` still hardcodes `5000` & `LimitedAvailability` unconditionally regardless of deadline/fullness | `src/components/LocalSchema.tsx:L101-103`; `src/lib/cohort-launch.ts`; `src/app/[locale]/waitlist/page.tsx` |
| **CLAUDE-05** | Partial FR/AR translations (testimonials, badges, `"Methodology Walkthrough"`, chips, image `alt`s, disclaimer) | `Resolved in 960d059` | **Resolved** on homepage & 11 guides (`ui_leaks=[]`); minor gaps persist on `waitlist`, `simulation-platform`, `account`, and `LocalSchema` JSON-LD strings | `messages/{en,fr,ar}.json` (148 leaf keys, 0 missing); live `/fr`, `/ar` `ui_leaks=[]`; `waitlist/page.tsx:L8-10`; `LocalSchema.tsx:L48,71` |
| **CLAUDE-06** | Missing legal/trust pages (Privacy, Terms, Refund, About, street address, hours, registration, Law 18-07) | `Still Open` | **Still Open** — zero `/privacy`, `/terms`, `/refund`, `/about`, or street address/hours exist in codebase or live routes | `src/app/[locale]/` route tree; `Facility.tsx:L108`; `claude report.txt` L10, L185, L193 |
| **CLAUDE-07** | Single-homepage hash links (`#methodology`, `#mock-test`, `#faq`); mock test needs own indexable URL | `Still Open` | **Still Open** — homepage nav still uses `#methodology`, `#faq`; `/sample` is `noindex` and `simulation-platform` is `noindex` with "in development" copy | `Navbar.tsx`; `src/app/(test-engine)/sample/page.tsx:L14`; `src/app/[locale]/articles/simulation-platform/page.tsx:L9,27` |
| **CLAUDE-08** | Verify reciprocal `en`, `fr`, `ar`, `x-default` `hreflang` on all localized routes | `Resolved in 960d059` | **Resolved** on all 39 sitemap URLs (`en`, `fr`, `ar`, `x-default` -> `/en...`) + `Link` header alignment (`alignXDefaultWithEnglish`); `/en/admin/acquisition` & `/en/<404>` leak `Link` hreflangs | `src/lib/seo.ts:L60-75`; `src/proxy.ts:L81-98`; `src/app/sitemap.ts:L43-51`; live 39/39 `200` check |
| **CLAUDE-09** | Verify `ieltslab.org` -> `www.ieltslab.org/en` is single-hop `301`/`308` & ignores `Accept-Language` | `Partially Resolved` | Ignores `Accept-Language` (`308 Location: /en` confirmed), **but** remains a **3-hop `308` chain** from `http://ieltslab.org/` (2 hops from `https://ieltslab.org/`) | Live probes: `http://ieltslab.org/` -> `https://ieltslab.org/` -> `https://www.ieltslab.org/` -> `/en`; `src/proxy.ts:L110-113` |
| **CLAUDE-10** | Use `language_TERRITORY` (`en_US`, `fr_FR`, `ar_DZ`) + `og:locale:alternate` | `Resolved in 960d059` | **Resolved** live across `/en`, `/fr`, `/ar` and articles (`OG_LOCALE_MAP`: `en_US`, `fr_FR`, `ar_DZ` + `alternateLocale`) | `src/lib/seo.ts:L31-35, L105-106, L145-146`; live `/en`, `/fr`, `/ar` HTML |
| **CLAUDE-11** | `/{locale}/account` in main nav; add `noindex` on account, checkout, results; exclude from sitemap | `Partially Resolved` | `960d059` added `noindex` & excluded from sitemap; `80214b9` fixed `/account` & `/auth` canonical inheritance; `/admin/acquisition` still leaks `/en` canonical & `/account` still linked in `Navbar` (`307` hops) | `src/app/[locale]/account/layout.tsx`; `src/app/[locale]/auth/layout.tsx`; `admin/acquisition/page.tsx:L12-15`; `ahref.txt` L301-330 |
| **CLAUDE-12** | Sitemap includes all 3 locales with `hreflang` alternates and honest `lastmod` | `Partially Resolved` | All 39 URLs (13×3) with `xhtml:link` hreflangs live & 200; `80214b9` synced `italy-student-visa`; 5 articles still fall back to `2026-07-29` | `src/app/sitemap.ts:L6-55`; live `sitemap.xml` probe (39/39 `200`) |
| **CLAUDE-13** | Optional localized FR/AR article slugs instead of English slugs on `/fr/articles/*` and `/ar/articles/*` | `Still Open` | **Still Open** — all FR/AR articles use English slugs (low priority if `hreflang` + localized titles/body perform well) | `src/app/[locale]/articles/*`; `src/app/sitemap.ts:L6-20` |
| **CLAUDE-14** | Verify site in Bing Webmaster Tools & deploy IndexNow | `Partially Resolved` | IndexNow key file (`e4b8c2d91f0a47e69c3b58a12d7f60e3.txt`) & `scripts/submit-indexnow.mjs` live (`200`); Bing Webmaster Tools manual check/submission requires user confirmation | `public/e4b8c2d91f0a47e69c3b58a12d7f60e3.txt`; `src/lib/seo.ts:L29`; `scripts/submit-indexnow.mjs:L1-89` |
| **CLAUDE-15** | Heading order defects (`Mr.Senouci` `H3` before `H2`; footer `H3`s without parent `H2`) | `Partially Resolved` | Homepage heading order cleaned up (14 `H2` / 13 `H3`), **but** `Facility.tsx` nests `<footer>` inside `<main><section>` and article pages have 0 `<footer>` | `src/components/Facility.tsx:L29-111`; `src/app/[locale]/articles/*` |
| **CLAUDE-16** | Hero `H1` fuses two sentences (`"IELTS preparation in Oran Train for test day."`); separate `<p>` tagline | `Resolved in 960d059` | **Resolved** — live `<h1>` is cleanly `"IELTS preparation in Oran"` / `"Préparation IELTS à Oran"` / `"التحضير لاختبار IELTS في وهران"` | `src/components/Hero.tsx:L32`; live `/en`, `/fr`, `/ar` HTML |
| **CLAUDE-17** | Missing local target keywords on `/fr` (`préparation IELTS Oran`, `cours IELTS Oran`) and `/ar` (`تحضير ايلتس وهران`, `دورة ايلتس وهران`) | `Partially Resolved` | `/fr` and `/ar` localized with `Préparation IELTS à Oran` / `التحضير لاختبار IELTS في وهران`; `e14b3dc` added `Cours en Petit Groupe`; Arabic still leans on Latin `IELTS` over `ايلتس` | `messages/{fr,ar}.json`; `src/app/[locale]/layout.tsx:L36-37`; live `/fr`, `/ar` |
| **CLAUDE-18** | Only 3 of 10 guides on homepage footer; add visible guides section with 6 cards | `Resolved in 960d059` | **Resolved** — `FeaturedGuides` renders 6 cards on homepage + link to `/articles` (`80214b9` fixed count `"10"` -> `"11"`) | `src/components/FeaturedGuides.tsx:L104-118`; live `/en`, `/fr`, `/ar` |
| **CLAUDE-19** | Article internal linking: breadcrumbs, `"Related guides"`, retake link inside registration guide | `Partially Resolved` | `ArticleTrust` adds breadcrumbs + 3 related guides on 11 articles, **but** renders breadcrumbs at the **bottom** and omits `first-ielts-preparation-cohort-oran` from `GUIDE_POOL` | `src/components/ArticleTrust.tsx:L26-110, L226-236` |
| **CLAUDE-20** | Icon-only account link lacks `aria-label`; duplicated desktop/mobile nav markup | `Partially Resolved` | `Navbar` localization updated, **but** mobile hamburger still lacks `aria-expanded`/`aria-controls` and `Navbar` imports `@supabase/supabase-js` on all SEO pages | `src/components/Navbar.tsx:L17-22, L69-73` |
| **CLAUDE-21** | Inconsistent offer terminology (`camp`, `cohort`, `group`, `founding seats`, `Lab`) | `Partially Resolved` | `e14b3dc` standardized in-person small-group classroom (8 seats) vs online mock test across homepage/schema, **but** `ApplicationForm.tsx` & `articleContent.ts` still retain `"PCs, not paper"` / `"digital lab"` | `src/components/ApplicationForm.tsx:L14-16,52-53,70-71`; `src/lib/articleContent.ts:L34,60,86,296,305,314,357,384` |
| **CLAUDE-22** | Typography typo: `"Mr.Senouci"` missing space | `Resolved in 960d059` | **Resolved** — `Mr. Senouci` / `Amine Senouci` rendered cleanly | `src/components/About.tsx`; `src/components/LocalSchema.tsx:L46` |
| **CLAUDE-23** | Inconsistent currency formatting (`DZD 3,900`, `5,000 DA`, `40,000 DZD`); standardize visible & schema `DZD` | `Partially Resolved` | Schema uses `priceCurrency: 'DZD'`; visible UI still mixes `DA` (`5,000 DA`, `40,000 DA`), `DZD` (`3,900 DZD` via `Intl.NumberFormat`), and `ArticleMobileCta` uses `en-US` commas for Arabic | `src/components/MockTestOffer.tsx:L25-29`; `src/components/ArticleMobileCta.tsx:L17`; `LocalSchema.tsx:L102` |
| **CLAUDE-24** | `/_next/image?...w=3840` indicates missing `sizes` prop on `<Image>` | `Still Open` | **Still Open** — Facility Unsplash fallback `src` serves `w=3840` (`228,953 B`); `About.tsx` puts `priority` on offscreen `/amine.jpg` | `src/components/Facility.tsx:L36-43`; `src/components/About.tsx:L50`; live HTML |
| **CLAUDE-25** | Facility photo is Unsplash stock image; replace with real classroom/facility photos | `Still Open` | **Still Open** — `Facility.tsx` still loads `images.unsplash.com/photo-1497215728101-856f4ea42174` with `"Illustrative image"` caption | `src/components/Facility.tsx:L36-43`; `next.config.ts`; live `/en` |
| **CLAUDE-26** | Ensure TRF image redacts candidate name, candidate number, and TRF number | `Still Open` | **Manual verification / asset check still required** for `/ielts_cropped.png` used in `StopTraining.tsx:L48` | `src/components/StopTraining.tsx:L48`; `claude report.txt` L43 |
| **CLAUDE-27** | Replace outbound `"Methodology Walkthrough"` link with lite YouTube embed + `VideoObject` schema | `Partially Resolved` | `VideoObject` added (`80214b9` fixed invalid `contentUrl`), **but** still links out to YouTube instead of lite `<iframe>` embed, lacks `duration`/`publisher`, and description ends in `:` | `src/components/Methodology.tsx:L58-92`; live `/en` JSON-LD |
| **CLAUDE-28** | Founder E-E-A-T: consistent `Amine Senouci`, exact cert (CELTA/TEFL), test date, LinkedIn profile | `Partially Resolved` | `Amine Senouci` + `Person` `#instructor` added, **but** `LocalSchema` uses unlinked inline `founder`, `sameAs` uses org profiles not Amine's personal LinkedIn, no `/about` or test date | `src/components/About.tsx:L10-27`; `src/components/LocalSchema.tsx:L44-50` |
| **CLAUDE-29** | Named author/reviewer bylines on articles instead of generic `"Fact-checked by IELTS Lab Oran"` | `Resolved in 960d059` | **Resolved** visually (`"Fact-checked ... by Amine Senouci"`), though `Article` JSON-LD still lacks `reviewedBy` & `#instructor` `@id` link | `src/components/ArticleTrust.tsx:L127, L174-179` |
| **CLAUDE-30** | Re-verify 40,000 DA fee & 30 April 2026 computer-delivery claim vs British Council Algeria + cite source | `Resolved in 960d059` | **Resolved** — `Official Sources` block + citations to `britishcouncil.dz` rendered in `ArticleTrust`; `Article` JSON-LD still lacks `citation`/`isBasedOn` property | `src/components/ArticleTrust.tsx:L246-263`; `teamwork_explorer_competitors/analysis.md` L24 |
| **CLAUDE-31** | Remove/substantiate superlatives (`"Oran's first..."`, `"Proven Results"`) | `Partially Resolved` | `e14b3dc` removed physical PC-lab superlatives; `"PROVEN RESULTS"` badge remains in `StopTraining`/contrast audit | `e14b3dc` diff; `google pagespeed.txt` L204; `StopTraining.tsx` |
| **CLAUDE-32** | Testimonial E-E-A-T defects (colleague quote, target vs achieved band, no surnames/photos, no `Review` schema) | `Partially Resolved` | Correctly avoids fake `Review` schema; still uses first names/target bands without verified Google review links | `src/components/Testimonials.tsx`; `claude report.txt` L53-57 |
| **CLAUDE-33** | Strikethrough `29,500 DA` beside `5,000 DA` reads like fictitious reference price | `Still Open` | **Still Open** in UI / `messages/en.json:L157` — verify whether strikethrough styling remains and reword explicitly as `"Regular price from next cohort: 29,500 DA"` | `messages/en.json:L157`; `src/components/Intake.tsx` |
| **CLAUDE-34** | Copy contradictions (`"Reserve Your Seat"` vs `"does not reserve a seat"`, `"0 of 8 seats reserved"` negative proof) | `Still Open` | **Still Open** — reconcile CTA wording vs cohort rules and avoid `0/8` negative social proof | `src/components/Intake.tsx`; `claude report.txt` L59-61 |
| **CLAUDE-35** | Upgrade `ieltslab.oran@gmail.com` to `contact@ieltslab.org` (SPF/DKIM/DMARC) + `tel:` link | `Still Open` | **Still Open** — DNS has Zoho MX + SPF, **no `_dmarc`**, site & schema still use `ieltslab.oran@gmail.com` and `wa.me` without `tel:` link | `Facility.tsx:L62-69`; `LocalSchema.tsx:L67-68`; `Resolve-DnsName` |
| **CLAUDE-36** | Claim vanity Facebook URL instead of numeric `profile.php?id=61591282143384` | `Still Open` | **Still Open** — numeric `profile.php?id=61591282143384` still in `LocalSchema.tsx:L108` and `Facility.tsx` | `LocalSchema.tsx:L108`; `Facility.tsx:L92-100` |
| **CLAUDE-37** | AEO Answer-First 40–60 word direct answers + concrete facts (hours, schedule, dates, CEFR level, area, class size, refund) | `Partially Resolved` | Added `<dl>`/summaries on `how-to-register-algeria` & `ielts-one-skill-retake-algeria`; homepage hero & 6 of 11 articles still lack 40–60 word direct answers & complete logistics | `src/components/Hero.tsx`; `teamwork_explorer_codebase/analysis.md` L182-184 |
| **CLAUDE-38** | Dedicated `/[locale]/about` entity page (org, founder, location, contact, policies) | `Still Open` | **Still Open** — no `/about` route exists; founder bio only on homepage `#instructor` | `src/app/[locale]/`; `LocalSchema.tsx:L49` |
| **CLAUDE-39** | Allow AI search/training bots (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`, `ClaudeBot`, `GPTBot`); optional `llms.txt` | `Partially Resolved` | `robots.ts` allows 8 major AI bots (`200` live); missing explicit `Applebot-Extended`/`CCBot`/`Meta-ExternalAgent`/`Amazonbot`, and `/llms.txt` is `404` | `src/app/robots.ts:L6-29`; live `/robots.txt` & `/llms.txt` (`404`) |
| **CLAUDE-40** | Off-site GEO (YouTube walkthroughs, Algerian directories, GBP once physical address verified; no `LocalBusiness` before) | `Partially Resolved` | GBP partially updated manually (category/site/socials), **but** missing verified street address, hours, photos, reviews, Google Maps URL (`hasMap`), and `LocalBusiness` schema | `LocalSchema.tsx:L37`; `teamwork_explorer_competitors/analysis.md` L108-115 |
| **CLAUDE-41** | Content roadmap (EN+FR+AR): dates/fees, computer-delivered changes, IELTS vs TCF/TEF, band guide, Task 1/2 tips | `Partially Resolved` | `how-to-register`, `computer-vs-paper`, `writing-task-2-tactics`, `ielts-one-skill-retake` live; still missing IELTS vs TCF/TEF Express Entry comparison, Listening/Reading strategy, Oran test-day logistics | `src/app/[locale]/articles/*`; `demand_gap_matrix.csv` |
| **CLAUDE-42** | Structured data expansion (`EducationalOrganization`, `WebSite`, `Person`, `Course`, `Article`, `BreadcrumbList`, `Product` for Mock Test, `FAQPage`) | `Partially Resolved` | `EducationalOrganization`, `WebSite`, `Person`, `Course`, `Article`, `BreadcrumbList`, `FAQPage`, `CollectionPage`, `VideoObject` added; missing Mock Test `Offer`/`SoftwareApplication`, `LocalBusiness`+`Geo`, `CourseSchedule` | `LocalSchema.tsx`; `ArticleTrust.tsx`; `About.tsx`; `FAQ.tsx` |
| **CLAUDE-43** | Verify `<html lang>` per locale, `dir="rtl"` on `/ar`, Arabic font loading, mirrored RTL icons | `Partially Resolved` | `[locale]/layout.tsx` sets `lang`/`dir`/`Cairo`; `80214b9` fixed logical CSS in 4 components; `(test-engine)/layout.tsx` & `global-not-found.tsx` hardcode `lang="en"`, and articles/testimonials keep `border-l-4`/`ml-11`/`left-6` | `(test-engine)/layout.tsx:L50`; `global-not-found.tsx:L22`; `how-to-register-algeria/page.tsx:L164`; `computer-vs-paper-ielts/page.tsx:L122,157`; `Testimonials.tsx:L37` |
| **CLAUDE-44** | Check PageSpeed/CrUX (LCP/INP/CLS), LCP `priority`, `sizes`, AVIF/WebP, font loading | `Still Open` | Lab Perf 100, **but** live SSR TTFB is **2.05–4.74s** (`no-store`), `amine.jpg` has offscreen `priority`, AVIF disabled, `logo_rounded.png` 924 KB, 1.3 MB JS, no CrUX field data | `About.tsx:L50`; `next.config.ts`; `MockTestOffer.tsx:L24`; `src/proxy.ts` |
| **CLAUDE-45** | Run Google Rich Results Test on homepage & an article | `Partially Resolved` | Run on `https://ieltslab.org/` (16 Nov 2026: `Local businesses` & `Organisation` valid with 3 optional field warnings); **not yet re-run** on `/en` & `/articles/*` post-`e14b3dc` | `rich results test.txt` L1-442 |
| **CLAUDE-46** | Verify HTTP security headers (HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) | `Resolved in 960d059` | **Resolved** — all 5 headers verified live on `200` routes (`HSTS` on `308` lacks `includeSubDomains; preload`; Lighthouse flags Trusted Types / `unsafe-inline` audit) | `next.config.ts:L48-71`; `src/proxy.ts:L39-79`; live headers |
| **CLAUDE-47** | Verify Chargily webhook signature verification on server & 30-day stored result expiration | `Still Open` | Requires backend runtime/audit confirmation outside static SEO scope (`80214b9` touched exam delivery/RBAC; explicit 30-day purge job & webhook test not verified in SEO dossiers) | `claude report.txt` L185 |
| **CLAUDE-48** | Accessibility audit: contrast, focus states, form labels, icon-only account link | `Still Open` | **Still Open** — Lighthouse flagged **19 (M) / 21 (D)** contrast failures, missing skip-link, `FloatingWidget` non-keyboard `<div>`, `Navbar` hamburger missing `aria-expanded` | `google pagespeed.txt` L180-269, L647-746; `FloatingWidget.tsx:L152-171`; `Navbar.tsx:L69-73` |
| **CLAUDE-49** | Analytics & conversion tracking (Form clicks, WhatsApp, mock purchases, `/sample` starts, UTMs, cookie notice) | `Partially Resolved` | `/r/[code]` + `AcquisitionUtmCapture` + `@vercel/analytics` + `PRODUCT_VIEWED` DB write live; **0 GA4/`gtag`**, `PRODUCT_VIEWED` fires on bot SSR, and cookie/privacy notice still absent | `AcquisitionUtmCapture.tsx`; `MockTestOffer.tsx:L24`; `package.json:L38-39` |
| **CLAUDE-50** | Search Console: verify Domain property & inspect Page Indexing for 404s and non-canonical pages | `Partially Resolved` | `google-site-verification` TXT exists in DNS & sitemap resubmitted, **but** 27/45 pages still Not Indexed & `.tech` Change of Address / Domain property checks require manual GSC confirmation | `Resolve-DnsName`; `media_1794950416031_5b566271.zip`; `SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md` |

### 2.2 Google PageSpeed Insights (`google pagespeed.txt` — `PSI-01` to `PSI-14`)

| ID | Summary of Finding / Metric | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **PSI-01** | CrUX field experience: `"Aucune donnée"` on Mobile & Desktop (insufficient traffic) | `Still Open` | **Still Open** — zero CrUX RUM data; organic clicks currently 45 / 87 days | `google pagespeed.txt` L18–19, L488–489 |
| **PSI-02** | Render-blocking CSS: **23.7 KiB** (`450 ms` M / `120 ms` D est. savings) across 2 CSS chunks | `Still Open` | **Still Open** — live `/en` still loads 2 CSS files totaling **123,818 B** (`3,825 B` + `119,993 B`) | `google pagespeed.txt` L89–101, L557–568; live `/en` probe |
| **PSI-03** | Legacy JS polyfills/transforms: **13.9 KiB** wasted (`Array.prototype.at`, `flat`, `Object.hasOwn`, etc.) | `Still Open` | **Still Open** — no modern `browserslist` optimization applied in `960d059`, `80214b9`, or `e14b3dc` | `google pagespeed.txt` L102–123, L569–590 |
| **PSI-04** | Mobile CLS **0.019** caused by fixed `FloatingWidgetClient` (`STATUS UPDATE`) | `Still Open` | **Still Open** — `FloatingWidget` remains mounted in `[locale]/layout.tsx` (`position: fixed`, `top: 643px`) | `google pagespeed.txt` L124–132; `FloatingWidget.tsx:L152-184` |
| **PSI-05** | DOM size informational: **468** elements, depth **12** (`"PCs, not paper"`), max children **11** (`<main>`) | `Partially Resolved` | `e14b3dc` updated homepage copy (`PCs, not paper` removed from `messages/*.json`), DOM structure unchanged | `google pagespeed.txt` L133–147, L591–605; `e14b3dc` diff |
| **PSI-06** | Desktop LCP breakdown: **1,320 ms** element render delay on `<h1>` (lab TTFB 70 ms) | `Still Open` | **Worsened on uncached cold SSR** — live TTFB measured **2,045–4,744 ms** (`no-store`), compounding client hydration delay (`10/13` homepage components `'use client'`) | `google pagespeed.txt` L606–615; `src/app/[locale]/page.tsx`; live TTFB probe |
| **PSI-07** | Unused JS: **199.3 KiB** transfer / **128.1 KiB** est. savings across 2 large chunks | `Still Open` | **Still Open** — live `/en` serves **16 JS chunks (1,301,055 B)**; `Navbar` imports Supabase & 6 static components remain `'use client'` | `google pagespeed.txt` L151–163, L618–630; live `/en` asset probe |
| **PSI-08** | Long main-thread tasks: **2 tasks** totaling **149 ms** (M) / **151 ms** (D) | `Still Open` | **Still Open** — heavy client hydration on homepage unchanged | `google pagespeed.txt` L164–176, L631–643 |
| **PSI-09** | Accessibility **96/100**: **19** (M) / **21** (D) color contrast failures (`text-gray-400`, `text-white/40`, `text-crimson` on `bg-crimson/20`, `text-black/50`, `Cash`/`Baridimob` badges, Desktop `FR`/`AR` links) | `Still Open` | **Still Open** — contrast tokens (`text-white/40`, `text-black/40`, `text-white/45`) persist in `TrustBadges.tsx:L13`, `MockTestOffer.tsx:L50`, `Intake.tsx:L186`, `ApplicationForm.tsx:L211,244,251` | `google pagespeed.txt` L180–269, L647–746 |
| **PSI-10** | Best Practices **96/100**: Chrome DevTools `Issues` panel flagged `Content security policy` | `Still Open` | **Still Open** — per-request nonce + `style-src 'self' 'unsafe-inline'` & missing Trusted Types persist | `google pagespeed.txt` L277–283, L754–760; live CSP header |
| **PSI-11** | Missing source map for large first-party JS chunk (`0bp7_itc4dig8.js`) | `Still Open` | **Still Open** — `next.config.ts` does not enable `productionBrowserSourceMaps` (acceptable security trade-off if intentional) | `google pagespeed.txt` L284–290, L761–767; `next.config.ts` |
| **PSI-12** | CSP XSS audit (`Moyenne`): `script-src` `'unsafe-inline'` fallback advisory | `Still Open` | **Still Open** — CSP uses `'nonce-<uuid>' 'strict-dynamic'` without `'unsafe-inline'` in `script-src` (expected for strict nonce CSP; triggers Lighthouse informational check) | `google pagespeed.txt` L292–299, L769–776; `content-security-policy.ts` |
| **PSI-13** | CSP DOM XSS / Trusted Types audit (`Élevée`): missing `require-trusted-types-for` | `Still Open` | **Still Open** — no `require-trusted-types-for 'script'` directive in CSP header | `google pagespeed.txt` L300–305, L777–782; live CSP header |
| **PSI-14** | Baseline browser compatibility: 3 `Limited Availability` features (`font-metric-overrides`, `referencetarget`, `layout-instability`) + 8 `Newly Available` | `Still Open` | **Still Open** — caused by Next.js font metric overrides & `@vercel/speed-insights` | `google pagespeed.txt` L307–429, L784–906 |

---

### 2.3 Google Rich Results Test (`rich results test.txt` — `RRT-01` to `RRT-04`)

| ID | Summary of Finding / Schema Status | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **RRT-01** | `Local businesses` valid (`EducationalOrganization`), non-critical warning: `Missing field 'image' (optional)` | `Resolved in 960d059` | **Resolved for `image`** (`LocalSchema.tsx` emits `image` + `logo`), **though** `EducationalOrganization` lacks `LocalBusiness` type, `geo`, and `openingHoursSpecification` | `rich results test.txt` L5–18, L228–241; `LocalSchema.tsx:L37-43` |
| **RRT-02** | `Organisation` valid, 2 non-critical warnings: `Missing field 'postalCode' (optional)` & `'streetAddress' (optional)` | `Still Open` | **Still Open** — `LocalSchema.tsx:L51-56` still emits only `Bir El Djir`, `Oran`, `DZ` (no `streetAddress` or `postalCode`) | `rich results test.txt` L115–140, L337–362; `LocalSchema.tsx:L51-56` |
| **RRT-03** | Schema trust/syntax: `ieltslab.oran@gmail.com`, numeric FB `profile.php?id=...`, `http://schema.org/LimitedAvailability`, `5000 DZD` `Course` | `Partially Resolved` | `960d059` fixed protocol to `https://schema.org/LimitedAvailability`, **but** Gmail, numeric FB ID, and static `5000`/`LimitedAvailability` remain | `rich results test.txt` L47, L101, L209; `LocalSchema.tsx:L67, L101-108` |
| **RRT-04** | Absent rich result types on root test (`WebSite`, `FAQPage`, `VideoObject`, `BreadcrumbList`, Mock Test `Offer`) | `Partially Resolved` | Live `/en`, `/fr`, `/ar` now emit `EducationalOrganization`, `WebSite`, `VideoObject` (`80214b9` fixed `contentUrl`), `Person`, and `FAQPage` (7 Qs); **still missing** Mock Test `Offer`/`SoftwareApplication` & re-test post-`e14b3dc` | `rich results test.txt` L1–442; live `/en` HTML JSON-LD |

---

### 2.4 Ahrefs Site Audit (`ahref.txt`, `Overview - Ieltslab.pdf`, `All issues - Ieltslab.pdf` — `AHREF-01` to `AHREF-21`)

| ID | Issue / Count / Severity | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **AHREF-01** | **Error:** `Duplicate pages without canonical` — **3** crawled pages | `Resolved in 960d059` | **Resolved** on indexable routes — all **39/39** sitemap URLs return `200` with self-referencing canonicals | `All issues` PDF; `ahref.txt` L1253–1255; live 39/39 sitemap probe |
| **AHREF-02** | **Error:** `Page has links to broken page` — **3** indexable pages | `Partially Resolved` | Live `/en`, `/fr`, `/ar`, `/articles` extracted **0** broken internal links, **yet** `/[locale]/sample` 307s & 12 broken locale-concatenated URLs existed in Ahrefs crawl (root cause needs verification) | `All issues` PDF; `ahref.txt` L1138–1140; live internal link check |
| **AHREF-03** | **Warning:** `Open Graph tags incomplete` — **42** crawled pages | `Partially Resolved` | **Resolved** on all 39 indexable pages (`og-default.png` `1200×630` + `og:locale`); still incomplete on `waitlist`, `simulation-platform`, `admin/acquisition` | `ahref.txt` L1234–1236; live `/en`, `/fr`, `/ar`, 33 articles |
| **AHREF-04** | **Warning:** `Page has links to redirect` — **39** indexable pages | `Still Open` | **Still Open** — `Navbar` links to `/{locale}/account` which `307`s to `/{locale}/auth/sign-in`, and `/[locale]/sample` `307`s to `/sample?locale=` | `ahref.txt` L1147–1149; live `/en/account` (`307`), `/en/sample` (`307`) |
| **AHREF-05** | **Warning:** `Meta description too short` — **11** indexable pages | `Partially Resolved` | Homepage descriptions are `130–164` chars (`e14b3dc`), `/ar/articles` is `82` chars; check `ARTICLE_DESCRIPTIONS` across all 33 guide pages | `ahref.txt` L1205–1207; `teamwork_explorer_livesite/handoff.md` L139 |
| **AHREF-06** | **Warning:** `3XX redirect` — **8** crawled URLs (`/`, `/account`, trailing slashes) | `Still Open` | **Still Open** — `http/https` apex, `/`, `/en/`, `/en/account`, `/en/sample` all return `308`/`307` | `ahref.txt` L1176–1178; live redirect table |
| **AHREF-07** | **Warning:** `Low word count` (Indexable) — **3** indexable pages | `Still Open` | **Still Open** — `first-ielts-preparation-cohort-oran` is only **208 (EN) / 240 (FR) / 198 (AR)** words (3 indexable locales!); `overcoming-speaking-anxiety` is 293/324/276 words | `ahref.txt` L1214–1216; live word counts |
| **AHREF-08** | **Warning:** `Open Graph URL not matching canonical` — **3** crawled pages (`/en|fr|ar/articles`) | `Resolved in 960d059` | **Resolved** — `src/app/[locale]/articles/page.tsx:L28-33` sets `path: 'articles'`, matching `og:url` to canonical | `ahref.txt` L1243–1245; `articles/page.tsx:L28-33` |
| **AHREF-09** | **Notice:** `Article page missing Article schema` — **3** pages (`/en|fr|ar/articles`) | `Resolved in 960d059` | **Resolved** — `/[locale]/articles` now emits `CollectionPage` + `ItemList` (11) + `BreadcrumbList`, and all 11 individual guides emit `Article` + `BreadcrumbList` | `ahref.txt` L1127–1129, L1377–1472; `articles/page.tsx:L43-86` |
| **AHREF-10** | **Notice:** `Page has only one dofollow incoming internal link` (Indexable) — **3** pages | `Partially Resolved` | Likely `first-ielts-preparation-cohort-oran` (`en/fr/ar`), which is STILL omitted from `ArticleTrust.tsx` `GUIDE_POOL` (only linked from `/articles` index!) | `ahref.txt` L1156–1158; `ArticleTrust.tsx:L26-110` |
| **AHREF-11** | **Notice:** `Page has only one dofollow incoming internal link` (Not indexable) — **6** pages | `Still Open` | **Still Open** — likely `simulation-platform` & `waitlist` across 3 locales | `ahref.txt` L1166–1168 |
| **AHREF-12** | **Notice:** `Redirect chain` — **3** URLs (`http://ieltslab.org/` -> `https://` -> `www` -> `/en`) | `Still Open` | **Still Open** — verified live `3-hop` `308` chain from `http://ieltslab.org/` and `2-hop` from `https://ieltslab.org/` | `ahref.txt` L1185–1187; live redirect probe |
| **AHREF-13** | **Notice:** `HTTP to HTTPS redirect` — **2** URLs | `Still Open` | **Still Open** — `http://ieltslab.org/` and `http://www.ieltslab.org/` return `308` to HTTPS | `ahref.txt` L1194–1196; live redirect probe |
| **AHREF-14** | **Notice:** `Low word count` (Not indexable) — **6** pages (`/sample`, `waitlist`, `simulation-platform`, auth) | `Still Open` | **Still Open** — `/sample` CSR (~9 words), `waitlist`, `simulation-platform` | `ahref.txt` L1224–1226; `competitors/analysis.md` L89 |
| **AHREF-15** | **Notice:** `Indexable page not in sitemap` — **3** pages | `Resolved in 960d059` | **Resolved** — `sitemap.xml` expanded to 39 URLs (all 13 indexable paths × 3 locales, all `200`) | `ahref.txt` L1263–1265; `src/app/sitemap.ts:L6-55` |
| **AHREF-16** | **Notice:** `External 4XX` — **14** external linked URLs returning 4XX | `Still Open` | **Still Open** — outbound official/source links in guides need link-check verification & replacement (several government/embassy portals block bots or moved URLs) | `ahref.txt` L1273–1275 |
| **AHREF-17** | **Notice:** `External 3XX redirect` — **2** external linked URLs returning 3XX | `Still Open` | **Still Open** — update external links to final canonical URLs | `ahref.txt` L1282–1284 |
| **AHREF-18** | **Crawled 404 locale-doubling URLs (12 URLs):** `/en/fr`, `/fr/ar`, `/en/ar/articles`, etc. | `Partially Resolved` | Live `LocaleSwitcher` emits clean `/fr`, `/ar` links, **and** `80214b9` fixed unknown routes to return real HTTP `404`, **yet** `/en/<404>` still emits duplicate `robots` meta + `Link:` hreflangs | `ahref.txt` L254–1006; live `/en/nonexistent-page-check-404` |
| **AHREF-19** | **Internal link equity wasted on redirects/auth & FR/AR link deficit:** `ieltslab.org/` (585 backlinks), `www.ieltslab.org/` (155), `/en/account` (33), `/en/auth/sign-in` (34), while `/fr` & `/ar` articles had only **1** internal link | `Partially Resolved` | `ArticleTrust` added localized 3-card cross-links on all 11 FR/AR articles, **but** `/account` still receives sitewide nav links (`307`) and `GUIDE_POOL` omits `first-ielts-preparation-cohort-oran` | `ahref.txt` L301–330, L929–943; `ArticleTrust.tsx:L26-110` |
| **AHREF-20** | **Title/Language tag mismatch:** `/ar` & `/fr` homepages had EN `<title>` and EN UI leaks across 18 `/fr`/`/ar` articles | `Resolved in 960d059` | **Resolved** on homepages & 11 guides (`ui_leaks=[]`; `e14b3dc` kept FR/AR titles localized at 80 chars); remaining leaks only on `waitlist`, `simulation-platform`, `account` | `ahref.txt` L142–252, L367–867; live `/fr`, `/ar`, 22 articles |
| **AHREF-21** | **Crawl blocks & slow TTFB:** 6 links blocked by `robots.txt`; 1 URL 300–500 ms, 4 URLs 200–300 ms | `Still Open` | **Worsened on uncached probes** — live TTFB measured **2,045–4,744 ms** (`no-store` / `cdg1::iad1`), and `/staff/` `robots.txt` disallow still blocks `noindex` discovery | `Overview` PDF p.1; live TTFB probes; `src/app/robots.ts:L4` |

---

### 2.5 Google Search Console (`Performance-on-Search-2026-11-16.zip`, Coverage ZIPs, `SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md` — `GSC-01` to `GSC-13`)

| ID | Summary of Finding / Metric | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **GSC-01** | **Page with redirect** (Validation: Failed) — **6 pages** | `Still Open` | **Still Open** in GSC (awaiting recrawl/validation after root/locale canonicalization; `/[locale]/sample` & `/[locale]/account` still 307) | `Critical issues.csv` R1; `teamwork_explorer_exports/analysis.md` L239 |
| **GSC-02** | **Redirect error** (Validation: Failed) — **2 pages** | `Still Open` | **Still Open** — manual GSC URL Inspection required to identify the 2 URLs and revalidate | `Critical issues.csv` R2 |
| **GSC-03** | **Excluded by `noindex` tag** (Validation: Failed) — **2 pages** (`/ar/articles/simulation-platform`, `/fr/articles/simulation-platform`) | `Still Open` | **Intentional `noindex`**, **but** page still holds stale `"in development"` copy & hardcoded EN metadata (`e14b3dc` did not remove or replace with live simulator landing) | `Critical issues.csv` R3; `media_1794950416033_f979f1cf.zip`; `simulation-platform/page.tsx:L6-27` |
| **GSC-04** | **Duplicate, Google chose different canonical than user** (Validation: Failed) — **3 FR pages** (`/fr`, `/fr/articles/overcoming-speaking-anxiety`, `/fr/articles/free-ielts-resources-algeria`) | `Partially Resolved` | Code root cause (localized FR bodies/meta/self-canonicals) is **fixed live** (`200`, localized FR, self-canonical); **GSC validation restart pending manual user action** | `Critical issues.csv` R4; `media_1794950416027_12ebcb38.zip`; live `/fr` probe |
| **GSC-05** | **Not found (404)** (Validation: Not Started) — **2 pages** | `Partially Resolved` | `/sample?locale=en` fixed to `200` in `960d059` & unknown routes return real `404` in `80214b9`; manual GSC inspection needed for exact 2 URLs | `Critical issues.csv` R5; live `/sample` (`200`) |
| **GSC-06** | **Discovered - currently not indexed** (Not Started) — **11 pages** (part of 27 Not Indexed vs 18 Indexed) | `Still Open` | **Still Open** — exacerbated by 2.05–4.74s cold SSR TTFB, `no-store`, weak internal linking to cohort post, and lack of sitemap recrawl | `Critical issues.csv` R6; live TTFB probes |
| **GSC-07** | **Crawled - currently not indexed** — **1 page** | `Still Open` | **Still Open** — likely thin `first-ielts-preparation-cohort-oran` (`208` words) or legacy URL; inspect in GSC | `Critical issues.csv` R7 |
| **GSC-08** | **Legacy HTTP non-www split:** `http://ieltslab.org/` had **1,239 imp, 6 clicks, 0.48% CTR, pos 3.88** (16.6% of impressions) | `Still Open` | **Still Open** — `http://ieltslab.org/` still executes a 3-hop `308` chain to `/en` and GSC Domain property consolidation requires manual verification | `Pages.csv` R3; `SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md` L35, L59 |
| **GSC-09** | **Severe Page-1 CTR gap (`0.60%` overall):** `/fr/articles/how-to-register-algeria` (**4,173 imp**, pos 8.87, **0.34% CTR**); `/en/articles/how-to-register-algeria` (857 imp, pos 7.92, 0.47%); `italy-student-visa` (532 imp, pos 5.4, 0.56%); 8/17 pages have 0 clicks | `Still Open` | **Still Open** — `e14b3dc` even lengthened homepage `<title>` to **80 chars** (truncation risk); top articles need CTR-driven titles/meta descriptions + FAQ/table rich formatting | `Pages.csv` R1–R17; `src/lib/seo.ts:L214-260`; `src/app/[locale]/layout.tsx:L35-37` |
| **GSC-10** | **Query-level CTR & ranking gaps:** `ielts oran` (698 imp, pos 3.35, 6 clicks / 0.86% CTR); `ielts booking algeria` (218 imp, 0 clicks); `ielts prix algérie` (132 imp, 0 clicks); `ielts registration algeria` (120, 0); conversational AI queries (`كم سعر الايلتس`, `comment je peux m'inscrire`) | `Still Open` | **Still Open** — missing dedicated Oran hub/test-centre guide, answer-first 40–60w summaries, and high-CTR fee/date snippets | `Queries.csv` R1–R196 |
| **GSC-11** | **Zero Rich Result search appearances** (0 rows in `Search appearance.csv`) | `Partially Resolved` | `960d059`/`80214b9` expanded JSON-LD (`LocalSchema`, `FAQPage`, `VideoObject`, `Article`, `CollectionPage`), **but** still missing `LocalBusiness`+`Geo`, `CourseSchedule`, Mock Test `Offer`, and GSC post-deploy crawl | `Search appearance.csv`; `LocalSchema.tsx`; `Methodology.tsx` |
| **GSC-12** | **Post-September impression decline (-41.8%):** Sep (**4,007** imp / 21 clicks) -> Oct (**2,332** / 16) -> Nov 1–14 (**692** / 5) | `Still Open` | **Still Open** — driven by `.tech` -> `.org` migration friction, canonical splits (`GSC-04`), and unindexed guides (`GSC-06`) | `Chart.csv`; `SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md` L75–79 |
| **GSC-13** | **Multi-hop redirect chains (`ieltslab.tech` & `ieltslab.org`) + manual GSC Change of Address:** 3 hops (`http://ieltslab.tech/` -> `https://ieltslab.tech/` -> `https://www.ieltslab.org/` -> `/en`) | `Still Open` | **Still Open** — `http://ieltslab.org/` -> `/en` confirmed 3 hops live; Vercel direct apex-to-`www.ieltslab.org/en` redirect & GSC `.tech` Change of Address remain pending | `SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md` L9–18, L81–84; live redirect probe |

---

### 2.6 Analytics Inventory (`media_1794950416033_07c4182f.zip`, `package.json`, `layout.tsx` — `GA-01` to `GA-02`)

| ID | Summary of Finding / Gap | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **GA-01** | **No GA4 data export exists:** Uploaded archive `media_1794950416033_07c4182f.zip` is `google-analytics-mcp-main` source code, not GA4 telemetry CSVs | `Still Open` | **Still Open** — zero GA4 baseline metrics available | `.user_uploaded\media_1794950416033_07c4182f.zip` |
| **GA-02** | **No GA4 property instrumented in app:** Only `@vercel/analytics` (`^2.0.1`) & `@vercel/speed-insights` (`^2.0.0`) installed | `Still Open` | **Still Open** — funnel attribution relies on Vercel Analytics + Postgres `FunnelEvent` (currently skewed by bot SSR `PRODUCT_VIEWED` writes in `MockTestOffer.tsx:L24`) | `package.json` L38–39; `src/app/[locale]/layout.tsx:L77-78`; `MockTestOffer.tsx:L24` |

---

### 2.7 Google Trends & Autocomplete (`GOOGLE_TRENDS_AND_DEMAND_REPORT_20261117.md` & CSVs — `TREND-01` to `TREND-04`)

| ID | Summary of Demand Opportunity | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **TREND-01** | **Strong Aug–Nov seasonal window (`DZ` 5y):** Mean 35.3–37.6 vs Mar–May 18.7–20.8; mid-Nov launch catches tail of peak before Dec (24.5) | `Still Open` | **Still Open** — urgent to publish cohort waitlist/next-cohort dates & capture Q4 searchers before Dec dip | `GOOGLE_TRENDS_AND_DEMAND_REPORT_20261117.md` L8–23 |
| **TREND-02** | **Breakout mock-test & simulator demand (`DZ` & `DZ-31`):** `engnovate` (Breakout), `ielts gg`, `cathoven ielts`, `jumpinto ielts`, `ielts simulator`, `ielts online tests` (+600% DZ / Breakout DZ-31), `ielts test gratuit` (Breakout DZ-31) | `Still Open` | **Still Open** — `/sample` is `noindex` CSR and `simulation-platform` is `noindex` with stale copy; zero indexable simulator landing page exists | `trends_related.csv` L27–45, L301–344; `sample/page.tsx:L14` |
| **TREND-03** | **Zero-impression high-demand clusters:** `Canada Immigration` (76 queries, `tcf canada` 56.94 vs `ielts algérie` 0.6, **0 GSC imp**), `Computer Format / Retake` (12 queries, **0 imp**), `Skills & Band Strategy` (46 queries, **3 imp**), `Free Resources & Mock Test` (46 queries, **2 imp**) | `Partially Resolved` | `960d059` published `ielts-one-skill-retake-algeria` and upgraded `ielts-vs-toefl-canada`, **but** still lacks Listening/Reading guides, `IELTS vs TCF Canada` Express Entry guide, and interactive CLB/band calculators | `demand_gap_matrix.csv` L1–663; `GOOGLE_TRENDS_AND_DEMAND_REPORT_20261117.md` L27–39 |
| **TREND-04** | **Under-captured FR/AR local & multi-city terms:** `inscription ielts algerie` (peak 100), `دورة ايلتس` (peak 87), `ielts constantine` (peak 100), `ielts oran` (`DZ-31` peak 50), `rendez vous ielts`, `test blanc ielts gratuit`, `تحضير ايلتس` | `Partially Resolved` | `960d059` localized FR/AR UI & guides, **but** no dedicated Oran/Western Algeria catchment guide, no Algerian regional centres guide (Oran/Algiers/Constantine), and `/sample` remains unindexed | `trends_summary.csv` L8–11, L52–56; `autocomplete_dz.csv` |

---

### 2.8 Commit `960d059` Deliverables & Manual Action Verification

| Commit `960d059` Claim / Action | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|
| **QR poster redirect `/r/[code]` + UTM attribution** | `Resolved in 960d059` | **Live & functional** (`80214b9` added `!isPrefetchRequest` guard; `/r/` disallowed in `robots.ts`; canonical strips UTM params) | `src/app/r/[code]/route.ts:L1-35`; `AcquisitionUtmCapture.tsx`; live `/r/test123456` -> `404` (`x-matched-path: /r/[code]`) |
| **`/sample` pass-through** | `Partially Resolved` | `/sample?locale=en` returns `200` (`noindex, follow`), **but** `/[locale]/sample` returns `307` and `(test-engine)/layout.tsx` hardcodes `lang="en"` without `dir="rtl"` for `locale=ar` | `src/proxy.ts:L116-117`; `src/app/(test-engine)/sample/page.tsx:L1-25`; `src/app/[locale]/sample/page.tsx:L1-12` |
| **FR/AR dictionary & article source localization** | `Resolved in 960d059` | **Live & verified** (`148` matching keys in `en`/`fr`/`ar.json`, `ui_leaks=[]` across all 22 FR/AR guides; `80214b9` localized onboarding/auth) | `messages/{en,fr,ar}.json`; `ArticleTrust.tsx:L125-150`; live 22 FR/AR articles |
| **Branded `1200×630` `public/og-default.png`** | `Resolved in 960d059` | **Live `200`** (`88,775 B`, `1200×630` PNG; identical `opengraph-image.png` & `twitter-image.png`) | `public/og-default.png`; live `/og-default.png` -> `200` |
| **`LocalSchema` (`EducationalOrganization` + `WebSite`)** | `Partially Resolved` | **Live**, **but** lacks `LocalBusiness`, `streetAddress`/`31130`, `GeoCoordinates`, `openingHoursSpecification`, Mock Test `Offer`; leaks EN `jobTitle`/`Algeria`/`OfferCatalog.name` on FR/AR; unlinked from `#instructor`; hardcodes `5000`/`LimitedAvailability` | `src/components/LocalSchema.tsx:L28-134`; live `/fr` & `/ar` JSON-LD |
| **`VideoObject`** | `Partially Resolved` | `960d059` had invalid `contentUrl` (`watch?v=`); **`80214b9` fixed `contentUrl` removal**; still lacks `duration`, `publisher`, trailing `:` in description, and actual embedded player | `src/components/Methodology.tsx:L58-92`; `80214b9` diff; live `/en` JSON-LD |
| **`CollectionPage` (`/articles`)** | `Resolved in 960d059` | **Live** (`CollectionPage` + `ItemList` [11 items] + `BreadcrumbList`); minor polish: add `item: { '@type': 'Article', url, name }` to `ListItem` | `src/app/[locale]/articles/page.tsx:L43-86`; live `/en/articles` |
| **`FAQPage` (Homepage + 2 guides)** | `Partially Resolved` | **Live** on `/` (7 Qs), `how-to-register-algeria` (4 Qs), `computer-vs-paper-ielts` (5 Qs); lacks `inLanguage`, Q3 Baridimob answer incomplete, missing on other 9 guides | `FAQ.tsx:L55-71`; `how-to-register-algeria/page.tsx:L113-114,254-270`; `computer-vs-paper-ielts/page.tsx:L225-241` |
| **`ArticleTrust` related guides & breadcrumbs** | `Partially Resolved` | **Live** on 11 guides, **but** breadcrumbs sit at the **bottom**, `GUIDE_POOL` omits `first-ielts-preparation-cohort-oran` (10 vs 11), `Article.publisher.url` conflicts with `#organization`, lacks `citation`/`reviewedBy` | `src/components/ArticleTrust.tsx:L26-110, L164-279` |
| **`OAI-SearchBot` allow rule in `robots.ts`** | `Resolved in 960d059` | **Live `200`** allowing `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`, `Claude-User`, `GPTBot`, `ClaudeBot`, `Google-Extended`; `/staff/` disallow conflicts with `noindex` | `src/app/robots.ts:L4-29`; live `/robots.txt` |
| **IndexNow key & script** | `Resolved in 960d059` | **Live `200`** at `/e4b8c2d91f0a47e69c3b58a12d7f60e3.txt` matching `scripts/submit-indexnow.mjs`; run post-`e14b3dc` submission | `public/e4b8c2d91f0a47e69c3b58a12d7f60e3.txt`; `scripts/submit-indexnow.mjs` |
| **`noindex` on `/account/*`, `/auth/*`, `/admin/*`, `/staff/*`** | `Partially Resolved` | `80214b9` fixed `/account` & `/auth` canonicals via new layouts; **`/en/admin/acquisition` STILL streams HTTP `200` Suspense shell with `canonical=/en` & `Link` hreflangs**, `/staff` returns `404` matching `/[locale]` with `canonical=/en`, `/staff/` blocked by `robots.txt` | `admin/acquisition/page.tsx:L12-15`; live `/en/admin/acquisition` (`200`), `/staff` (`404` `canonical=/en`) |
| **Manual: Search Console (sitemap, canonicals, co-owner)** | `Partially Resolved` | `google-site-verification` TXT present; **manual actions still needed** for `.tech` Change of Address, FR canonical validation, 27 unindexed URLs, redirect errors | `Resolve-DnsName`; `media_1794950416031_5b566271.zip` |
| **Manual: Bing Webmaster Tools (sitemap + 10 URLs)** | `Partially Resolved` | IndexNow endpoint live; verify Bing Webmaster Tools property indexing status & submit remaining 29 URLs manually | `ORIGINAL_REQUEST.md` L17; `public/e4b8c2d91f0a47e69c3b58a12d7f60e3.txt` |
| **Manual: ChatGPT Business Profile DNS TXT verification** | `Still Open` | **NOT VISIBLE IN LIVE DNS** — `Resolve-DnsName -Type TXT ieltslab.org` and `www.ieltslab.org` show **zero `openai-domain-verification` TXT records** | `teamwork_explorer_livesite/handoff.md` L209–213 |
| **Manual: Google Business Profile updates** | `Partially Resolved` | GBP category/site/socials started, **but** no `hasMap` URL in `LocalSchema.tsx`, no street/landmark/`31130`, no hours, no real photos, no Google review flow on site | `LocalSchema.tsx:L51-56, L107-111`; `Facility.tsx:L36-48` |

---

### 2.9 Newly Surfaced Findings (Codebase & Live Production Probes)

| ID | Summary of New Finding | Status vs `960d059` | Live State (at `e14b3dc`) | Exact Evidence Citation |
|---|---|---|---|---|
| **NEW-01** | **Per-request `no-store` SSR + `MockTestOffer` DB write (`2.05s–4.74s` TTFB)** via `proxy.ts` nonce & `recordFunnelEvent` on every landing render | `New Finding` | **Active in `e14b3dc`** (`MISS` / `cdg1::iad1`; inflates `PRODUCT_VIEWED` on bot crawls) | `src/proxy.ts:L39-79`; `MockTestOffer.tsx:L13-24`; live TTFB probes |
| **NEW-02** | **80-character homepage `<title>` across EN/FR/AR** introduced by `e14b3dc` (exceeds ~60-char SERP truncation limit) | `New Finding` | **Active in `e14b3dc`** (`IELTS Preparation in Oran \| Small-Group Course & Mock Practice \| IELTS Lab Oran` = 80 chars) | `src/app/[locale]/layout.tsx:L29-38`; live `/en`, `/fr`, `/ar` |
| **NEW-03** | **Residual PC-lab copy after `e14b3dc`** in `ApplicationForm.tsx` (`"PCs, not paper"`) & `articleContent.ts` (`"our computer-based lab in Oran"`) | `New Finding` | **Active in `e14b3dc`** — contradicts `e14b3dc` classroom positioning | `ApplicationForm.tsx:L14-16,52-53,70-71`; `articleContent.ts:L34,60,86,296,305,314,357,384` |
| **NEW-04** | **`<footer>` inside `<main><section>` on homepage + absent on all 13 `/articles*` routes + `<main>` absent on 10/13 article routes** | `New Finding` | **Active in `e14b3dc`** (`Facility.tsx:L57` nests `<footer>`; `bool(soup.find("footer")) == False` on `/articles*`) | `Facility.tsx:L29-111`; `src/app/[locale]/page.tsx:L27-40`; `delta/handoff.md` L86–104 |
| **NEW-05** | **`ieltslab.app` / `ieltslab.io` / `ieltslab.uz` AI brand collision** causing Google AI Search to conflate `ieltslab.org` with unrelated global SaaS apps | `New Finding` | **Active** — brand entity must consistently anchor to `IELTS Lab Oran` (`ieltslab.org`) | `teamwork_explorer_competitors/analysis.md` L16, L71–75, L119 |
| **NEW-06** | **Gated/404 metadata leaks:** `/en/admin/acquisition` returns `200` Suspense shell with `canonical=/en`; `/staff` 404 matches `/[locale]` with `canonical=/en`; `/en/<404>` emits duplicate `robots` + `Link` hreflang; `src/app/not-found.tsx` lacks `robots: noindex` | `New Finding` | **Active in `e14b3dc`** | `admin/acquisition/page.tsx:L12-15`; `src/app/not-found.tsx:L5-9`; live probes |
| **NEW-07** | **Homepage client JS bloat & offscreen `priority`:** 6 static components marked `'use client'`, `Navbar` pulls `@supabase/supabase-js` into all SEO pages, `About.tsx` sets `priority` on offscreen `/amine.jpg`, `logo_rounded.png` is `923,918 B`, AVIF disabled | `New Finding` | **Active in `e14b3dc`** (1.30 MB JS / 124 KB CSS) | `Hero.tsx`, `Methodology.tsx`, `StopTraining.tsx`, `Compare.tsx`, `Facility.tsx`, `About.tsx:L50`, `Navbar.tsx:L17-22` |

---

## 3. Eight-Dimension Technical & Strategic Diagnosis

### Dimension 1: Technical SEO — **Verdict: Fail / Critical Gaps**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Apex & HTTP Redirect Chains** | **Fail** | `http://ieltslab.org/` executes a **3-hop `308` chain**: `http://ieltslab.org/` (`308`) -> `https://ieltslab.org/` (`308`) -> `https://www.ieltslab.org/` (`308`) -> `/en` (`200`). `https://ieltslab.org/` takes **2 hops**. Legacy `http://ieltslab.tech/` also runs a 3-hop chain (`SEARCH_CONSOLE_MIGRATION_AUDIT_20261117.md:L9-18`), and `http://ieltslab.org/` still held **1,239 GSC impressions (16.6% of total)** in `Pages.csv` (`GSC-08`). |
| **Caching & TTFB (`proxy.ts` + `MockTestOffer`)** | **Fail** | `src/proxy.ts:L39-79` injects a per-request random CSP nonce, and `src/components/MockTestOffer.tsx:L13-24` queries `prisma.product.findUnique` + writes `recordFunnelEvent({ type: 'PRODUCT_VIEWED' })` on every SSR render. Every public localized route returns `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, `x-vercel-cache: MISS`, executing in `iad1` via `cdg1` with **2,045–4,744 ms live TTFB**. |
| **`robots.txt` vs `noindex` Conflict (`/staff/`)** | **Gap** | `src/app/robots.ts:L4` blocks `/staff/` in `PUBLIC_DISALLOW`, while `src/app/(test-engine)/staff/operations/page.tsx:L4-6` sets `robots: { index: false, follow: false }`. Disallowing `/staff/` prevents crawlers from reading the `noindex` tag. Meanwhile `/staff/operations` `307`s unauthenticated requests to `/en/auth/sign-in`. |
| **Admin Suspense Shell Leak (`/en/admin/acquisition`)** | **Fail** | Probing `https://www.ieltslab.org/en/admin/acquisition` returns **HTTP `200`** (`Loading campaign placements…` Suspense shell from `loading.tsx`) embedding a client `NEXT_REDIRECT` in the RSC payload instead of a server `307`. Worse, `admin/acquisition/page.tsx:L12-15` omits `alternates` overrides, inheriting **`canonical="https://www.ieltslab.org/en"`** and leaking `Link:` hreflangs for `/en\|fr\|ar/admin/acquisition`. |
| **`/staff` 404 Canonical Leak & `/en/<404>` Duplicate Meta** | **Fail** | `https://www.ieltslab.org/staff` returns `404` (`x-matched-path: /[locale]`) with homepage `<title>` and **`canonical="https://www.ieltslab.org/en"`**. Probing `/en/nonexistent-page-check-404` returns `404` (`x-matched-path: /404`) with **duplicate `<meta name="robots">` tags** (`noindex` and `noindex, nofollow`) and **`Link` header hreflang alternates** for a 404 URL. `src/app/not-found.tsx:L5-9` lacks `robots: { index: false, follow: false }`. |
| **Root Non-Locale 404 & BotID Bypass** | **Pass** | Fixed in `80214b9`: `src/proxy.ts:L102-104, L118-120` bypasses BotID and rewrites unknown routes to `/_not-found` with `{ status: 404 }`; `src/app/global-not-found.tsx:L14,17` adds `metadataBase` and `noindex, nofollow`. Verified live on `/nonexistent-page-check-404` -> `404`. |
| **`/sample` 307 + `noindex`** | **Gap** | `src/app/[locale]/sample/page.tsx:L1-12` issues a `307` redirect to `/sample?locale=${safeLocale}` (contributing to Ahrefs `Page has links to redirect` & GSC `Page with redirect`), while `src/app/(test-engine)/sample/page.tsx:L12-14` sets `noindex, follow` and canonical `/sample`. |
| **`sitemap.ts` Completeness & `lastmod` Accuracy** | **Gap** | `src/app/sitemap.ts:L6-55` cleanly serves **39/39 HTTP `200` URLs** with reciprocal `xhtml:link` hreflangs (`80214b9` synced `italy-student-visa` to `2026-09-01`). However, `LAST_MODIFIED` (`L22-31`) omits 5 articles updated in `960d059` (`ielts-vs-toefl-canada`, `academic-vs-general`, `tlscontact-capago`, `overcoming-speaking-anxiety`, `writing-task-2-tactics`), leaving stale `2026-07-29` dates. |
| **GSC Indexing Coverage & Post-Sep Drop** | **Fail** | As of `2026-11-13`, only **18 of 45 known pages are Indexed** (**27 Not Indexed**: 11 `Discovered - not indexed`, 6 `Page with redirect`, 3 `Duplicate canonical` FR pages, 2 `Redirect error`, 2 `Excluded by noindex`, 2 `404`, 1 `Crawled - not indexed`), alongside a **-41.8% impression drop** from Sep (`4,007`) to Oct (`2,332`). |

---

### Dimension 2: On-Page & Content Architecture — **Verdict: Gap / Partial Fail**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Semantic `<main>` & `<footer>` Landmarks** | **Fail** | **10 of 13 files** in `src/app/[locale]/articles/*` (`academic-vs-general`, `computer-vs-paper-ielts`, `free-ielts-resources-algeria`, `how-to-register-algeria`, `ielts-vs-toefl-canada`, `italy-student-visa-english-tests-algeria`, `overcoming-speaking-anxiety`, `simulation-platform`, `tlscontact-capago`, `writing-task-2-tactics`) have **no `<main>` landmark** (`delta/handoff.md:L89-103`). **All 13/13** `/articles*` routes have **no `<footer>` at all** (`bool(soup.find("footer")) == False`), stripping Oran NAP and sitewide links from guide pages. On the homepage, `Facility.tsx:L57-110` nests `<footer>` inside `<section id="facility">` inside `<main>` (`page.tsx:L27-40`). |
| **Breadcrumbs Placement & `GUIDE_POOL` Exclusion** | **Gap** | `ArticleTrust.tsx:L226-236` renders `<nav aria-label="Breadcrumb">` at the **bottom** of articles (`<div className="mt-16">`) rather than above `<h1>`. Furthermore, `GUIDE_POOL` (`ArticleTrust.tsx:L26-110`) lists only **10 guides**, omitting `first-ielts-preparation-cohort-oran`, so none of the other 10 articles ever link to the cohort page (`AHREF-10`). |
| **80-Character Homepage `<title>` After `e14b3dc`** | **Fail** | `e14b3dc` changed `src/app/[locale]/layout.tsx:L29-38` homepage `<title>` to **80 chars** in all 3 locales (`IELTS Preparation in Oran \| Small-Group Course & Mock Practice \| IELTS Lab Oran`, `Préparation IELTS à Oran \| Cours en Petit Groupe & Tests Blancs \| IELTS Lab Oran`, `التحضير لاختبار IELTS في وهران \| دورة حضورية واختبارات تجريبية \| IELTS Lab Oran`), exceeding the ~60-char SERP display limit. |
| **Residual PC-Lab Copy After `e14b3dc`** | **Fail** | Despite `e14b3dc` removing physical PC-lab claims from `messages/*.json`, `LocalSchema.tsx`, and `cohort-launch.ts`, contradictory PC-lab copy remains in **`src/components/ApplicationForm.tsx:L14,16,52-53,70-71`** (`"PCs, not paper — The official exam is digital..."`) and **`src/lib/articleContent.ts:L34,60,86,296,305,314,357,384`** (`"Our digital lab"`, `"our computer-based lab in Oran"`). |
| **Stale `simulation-platform` & Thin Cohort Article** | **Fail** | `src/app/[locale]/articles/simulation-platform/page.tsx:L9,27` still claims `"The IELTS simulation platform is currently in development"` despite `/sample`, `/account`, and `/sim` being live (`noindex`, hardcoded EN metadata). Meanwhile, `first-ielts-preparation-cohort-oran` is only **208 (EN) / 240 (FR) / 198 (AR)** words (`AHREF-07`), too thin to rank or get cited for `"IELTS cohort Oran"`. |
| **Missing Trust / Entity Pages (`/about`, `/legal`)** | **Fail** | No dedicated `/[locale]/about` (or `/instructor`), `/privacy`, `/terms`, or `/refund` pages exist (`CLAUDE-06`, `CLAUDE-38`), despite collecting WhatsApp leads, Chargily payments, and 30-day test storage (Algeria Law `18-07` compliance risk). |
| **Severe GSC CTR Crisis (`0.60%`)** | **Fail** | `Pages.csv` & `Queries.csv` show Page-1 rankings failing to convert into clicks: `ielts oran` ranks **3.35** (698 imp -> **6 clicks / 0.86% CTR**); `/fr/articles/how-to-register-algeria` gets **4,173 imp** (55% of site total) at pos **8.87** for **14 clicks (0.34% CTR)**; 8 of 17 pages and high-intent queries (`ielts booking algeria` 218 imp, `ielts prix algérie` 132 imp) have **0 clicks**. |

---

### Dimension 3: Structured Data / Rich Results — **Verdict: Gap / Partial Fail**

| Schema / Component | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **`LocalSchema.tsx` (`EducationalOrganization` + `WebSite`)** | **Gap** | Emits valid `EducationalOrganization` (`@id: #organization`) + `WebSite` (`#website`), **but**: (1) omits `'LocalBusiness'` type, `streetAddress`, `postalCode` (`31130`), `GeoCoordinates`, `hasMap`, `openingHoursSpecification`, and `AggregateRating`; (2) `Course` / `Offer` (`L73-105`) omits `Offer.url`, `CourseSchedule` (`repeatFrequency`/`duration`), `instructor` `@id` link, and **Mock Test `Offer` / `SoftwareApplication`** (`MockTestOffer.tsx` is absent from schema); (3) **hardcodes `price: '5000'` and `availability: 'https://schema.org/LimitedAvailability'`** (`L101-103`) even after `isCohortDeadlinePassed()` or `cohortStatus.isFull` (`29,500 DA` next cohort). |
| **Entity Graph Disconnection & `@id` URL Conflict** | **Fail** | `LocalSchema.tsx:L44-50` defines an inline anonymous `founder` `Person` object instead of referencing `{ '@id': 'https://www.ieltslab.org/#instructor' }` emitted by `About.tsx:L13`. Meanwhile, `LocalSchema.tsx:L40` sets `#organization.url` to `https://www.ieltslab.org`, while `ArticleTrust.tsx:L180-185` sets `#organization.url` to `localizedUrl(safeLocale)` (`/fr`, `/ar`), creating conflicting `url` values for the same `@id`. |
| **`VideoObject` (`Methodology.tsx:L79-92`)** | **Gap** | `80214b9` removed invalid `contentUrl`, keeping `embedUrl: 'https://www.youtube.com/embed/r5eiUU3EpHE'`. Still lacks `duration`, `publisher` (`#organization`), `inLanguage`, clean title/description (current description ends in `:`), and **no embedded `<iframe>` player loads on-page** (thumbnail links out to YouTube, preventing Video rich-result indexing). |
| **`ArticleTrust.tsx` (`Article` + `BreadcrumbList`)** | **Gap** | Emits valid `Article` + 3-level `BreadcrumbList` on 11 guides, **but** omits `citation` / `isBasedOn` (despite rendering `Official Sources` visually), omits `reviewedBy`, passes `YYYY-MM-DD` without `+01:00` timezone, lacks `publisher.logo` on the `Article` node, and leaves `author` unlinked to `#instructor`. |
| **`FAQPage` & `CollectionPage`** | **Pass (with gaps)** | `FAQPage` emits on `/` (7 Qs), `how-to-register-algeria` (4 Qs), and `computer-vs-paper-ielts` (5 Qs), and `CollectionPage` + `ItemList` (11) emits on `/articles`. All 3 `FAQPage` blocks omit `inLanguage`, and 9 other guides lack `FAQPage`. GSC `Search appearance.csv` currently records **0 rows**. |

---

### Dimension 4: GEO — AI Search Visibility — **Verdict: Gap**

| Signal / Lever | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Brand Collision (`ieltslab.org` vs `.app`/`.io`/`.uz`)** | **Fail** | Querying `site:ieltslab.org` in Google AI Search conflates `ieltslab.org` with unrelated global SaaS apps `ieltslab.app` (*Free IELTS Practice Tests with Instant AI Scores*), `ieltslab.io`, and `ieltslab.uz` (`competitors/analysis.md:L71-75, L119`). Copy and schemas must consistently anchor the entity as **`IELTS Lab Oran` (`ieltslab.org`)** in Bir El Djir, Oran, Algeria. |
| **`/llms.txt` & `/llms-full.txt`** | **Fail** | Both `https://www.ieltslab.org/llms.txt` and `/llms-full.txt` return **HTTP `404`** (`livesite/handoff.md:L54-55`), denying LLMs and AI agents a clean Markdown index of courses, DZD pricing, Oran venue, and 11 guides. |
| **ChatGPT Business Profile DNS TXT Verification** | **Fail** | `Resolve-DnsName -Type TXT ieltslab.org` and `www.ieltslab.org` show **zero `openai-domain-verification` TXT records** (`livesite/handoff.md:L213`). External DNS configuration has not propagated or was not added to the authoritative zone. |
| **AI Crawler Access (`robots.ts`)** | **Pass (minor gap)** | `src/app/robots.ts:L6-29` explicitly allows `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`, `Claude-User`, `GPTBot`, `ClaudeBot`, `Google-Extended` (Ahrefs Bot access **100**). Missing explicit rules for `Applebot-Extended`, `CCBot`, `Meta-ExternalAgent`, `Amazonbot`. |
| **AI Crawl Latency (`no-store`) & Extractability** | **Fail / Gap** | Cold uncached `no-store` SSR (**2.05s–4.74s TTFB**) slows AI retrieval bots (`OAI-SearchBot`, `PerplexityBot`). On-page, the homepage hero leads with marketing slogans rather than an extractable 50-word entity summary + HTML comparison `<table>` (unlike `bandladder.com` & `mycoach-in.com`), and `Article` JSON-LD lacks machine-readable `citation` URLs. |

---

### Dimension 5: AEO — Answer Engine Optimization — **Verdict: Gap**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Answer-First 40–60 Word Leads & Quick-Fact Blocks** | **Gap** | Strong AEO structure on `how-to-register-algeria` (Quick Summary + `<dl>` + 4 FAQs), `ielts-one-skill-retake-algeria` (`<dl>` + `<details>` matrix), `italy-student-visa`, and `computer-vs-paper-ielts`. **Missing** on **6 of 11 guides** (`overcoming-speaking-anxiety`, `writing-task-2-tactics`, `academic-vs-general`, `tlscontact-capago`, `ielts-vs-toefl-canada`, `free-ielts-resources-algeria`), which lack FAQ blocks, `<dl>`/`<table>` summary cards, and direct-answer leads under question-style H2s. |
| **Payment Question Precision (`how-to-register-algeria`)** | **Gap** | FAQ Q3 (`how-to-register-algeria/page.tsx:L113-114`) asks `"Can I pay with Baridimob, CIB, Edahabia, or cash in Algeria?"` while the answer never explicitly states Baridimob/Edahabia acceptance (only `"online bank-card payment, digital banking/transfer, and HSBC cash deposit"`), weakening direct-answer accuracy for a high-demand Algeria query. |
| **Zero-Click Demand & Simulator Capture** | **Fail** | Google Trends/Autocomplete (`demand_gap_matrix.csv`) shows **76 `Canada Immigration` queries (0 GSC imp)**, **12 `Computer Format / Retake` queries (0 GSC imp)**, and **Breakout simulator demand** (`engnovate`, `ielts simulator`, `ielts test gratuit`). Yet `/sample` is `noindex` CSR (9 words) and `ielts-vs-toefl-canada` lacks `FAQPage`/interactive CLB calculator schema. |

---

### Dimension 6: Core Web Vitals, Web Development, Accessibility & Security — **Verdict: Fail / Needs Remediation**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **SSR Caching, DB Side Effects & TTFB** | **Fail** | `src/proxy.ts` per-request CSP nonce + `MockTestOffer.tsx:L13-24` (`prisma.product.findUnique` + `recordFunnelEvent` Postgres write) forces `Cache-Control: private, no-cache, no-store` (`MISS`, `cdg1::iad1`) -> **2.05s–4.74s live TTFB** (even though Lighthouse lab TTFB was 70 ms in a warm/synthetic run). |
| **Client Bundle & Hydration Bloat** | **Fail** | **10 of 13** homepage components are `'use client'` — **6 static components** (`Hero.tsx`, `Methodology.tsx`, `StopTraining.tsx`, `Compare.tsx`, `Facility.tsx`, `About.tsx`) have zero client hooks/state and should be Server Components. `Navbar.tsx:L17-22` imports `@supabase/supabase-js` on all SEO pages just to show an account dot. Live `/en` ships **1,301,055 B JS** (16 chunks; **199.3 KiB** unused in PSI) + **123,818 B CSS** (23.7 KiB render-blocking) + **149–151 ms** main-thread long tasks + **13.9 KiB** legacy polyfills. |
| **Image Optimization & Preload Mismatch** | **Fail** | `About.tsx:L50` puts `priority` (`<link rel="preload" as="image">`) on offscreen below-the-fold `/amine.jpg`; `public/logo_rounded.png` is **923,918 B**; `Facility.tsx` uses a `228,953 B` (`w=3840`) Unsplash stock photo; AVIF is disabled (`next.config.ts` serves WebP only). |
| **Accessibility (WCAG AA Contrast & Landmarks)** | **Fail** | Lighthouse **96/100** reports **19 (M) / 21 (D)** color-contrast failures (`TrustBadges.tsx:L13` `text-white/40` & `text-gray-400`, `MockTestOffer.tsx:L50` `text-white/40`, `Intake.tsx:L186` `text-white/45`, `ApplicationForm.tsx:L211,244,251` `text-black/40`/`45`, `Cash`/`Baridimob` badges, Desktop `FR`/`AR` switcher). Also: **no skip-to-content link**, **`FloatingWidget.tsx:L152-171` `<div onPointerUp>` is keyboard-inaccessible** and causes **0.019 mobile CLS** (`PSI-04`), `Navbar.tsx:L69-73` mobile toggle lacks `aria-expanded`/`aria-controls`, and 10 articles lack `<main>`. |
| **Security Headers & CSP** | **Pass (with advisories)** | HSTS (`max-age=63072000; includeSubDomains; preload` on `200`s; lacks `includeSubDomains; preload` on `308`s), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and strict nonce CSP are active. Lighthouse Best Practices (`96/100`) notes missing `require-trusted-types-for` (`PSI-13`), `script-src` `'unsafe-inline'` audit (`PSI-12`), and missing production source maps (`PSI-11`). |

---

### Dimension 7: EN / FR / AR Internationalization (i18n) — **Verdict: Gap**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Dictionary & Public Guide Localization** | **Pass** | `messages/en.json`, `fr.json`, `ar.json` all contain **148 matching leaf keys**; all 22 FR/AR guide pages have `ui_leaks=[]`; `[locale]/layout.tsx:L64-69` sets `lang`, `dir="rtl"`, and `Cairo` font; `hreflang` + `x-default -> /en` is consistent across HTML, `Link` headers, and 39-URL `sitemap.xml`. |
| **`(test-engine)/layout.tsx` & `global-not-found.tsx` Hardcoded `lang="en"`** | **Fail** | `src/app/(test-engine)/layout.tsx:L50` hardcodes `<html lang="en">` with **no `dir="rtl"`** even when `/sample?locale=ar` is rendered! `src/app/global-not-found.tsx:L22` also hardcodes `<html lang="en">`. |
| **English-Only Metadata/UI on `waitlist`, `simulation-platform`, `account`** | **Fail** | `waitlist/page.tsx:L8-10` and `simulation-platform/page.tsx:L9-10,45` use English-only `<title>`, `<meta description>`, and `"Status Update"` badge across `/fr` and `/ar`. `account/page.tsx:L105-106` & `orders/[orderId]/page.tsx:L32-38` have English-only headings. |
| **JSON-LD Hardcoded English Strings on `/fr` & `/ar`** | **Fail** | `LocalSchema.tsx:L48,57-66,71` emits English `founder.jobTitle` (`"Founder & Lead IELTS Instructor"`), `areaServed` (`"Algeria"`), and `OfferCatalog.name` (`"IELTS Preparation Courses"`) on `/fr` and `/ar`. `About.tsx:L18` emits English `knowsAbout` on FR/AR. |
| **Physical CSS Instead of RTL Logical Properties** | **Gap** | While `80214b9` fixed `Hero`, `Intake`, `LeadMagnet`, `MockTestOffer`, `Methodology`, and `WaitlistUI`, physical LTR classes remain in `how-to-register-algeria/page.tsx:L164` (`border-l-4 rounded-r-2xl`), `computer-vs-paper-ielts/page.tsx:L122,157` (`border-l-4`, `ml-11`), `Testimonials.tsx:L37` (`left-6`), and `FloatingWidget.tsx:L184,292-293` (drag side `textAlign` ignores `dir="rtl"`). `ArticleMobileCta.tsx:L17` uses `en-US` number formatting on Arabic. |
| **Root `/` `Accept-Language` Policy** | **Pass (Intentional Guard)** | `localeDetection: false` (`src/i18n/routing.ts:L7`) keeps `/` -> `308` `/en` deterministic for US-based Googlebot (`CLAUDE-09`). Keep US-bot-safe default `/en` while ensuring prominent, high-contrast `EN | FR | AR` switcher links in `Navbar` (`PSI-09` flagged Desktop `FR`/`AR` contrast). |

---

### Dimension 8: Oran / Algeria Local SEO — **Verdict: Fail / Critical Gaps**

| Check / Sub-Area | Verdict | Verified Evidence & Diagnosis |
|---|---|---|
| **Incomplete Bir El Djir NAP & Coordinates** | **Fail** | Sitewide NAP states only `"Bir El Djir, Oran"` (`Facility.tsx:L48,108`, `LocalSchema.tsx:L51-56`). Missing: street/landmark, postal code (`31130`), `GeoCoordinates`, `openingHoursSpecification`, Google Maps `hasMap` URL, and **`Facility.mapBtn` (`messages/{en,fr,ar}.json:L109`) is defined in all 3 dictionaries yet unused in `Facility.tsx`!** |
| **Contact Channels (`tel:`, Gmail, Email Auth, Facebook)** | **Fail** | `Facility.tsx:L66-69` links only to `wa.me/213780343103` with **no `tel:+213780343103` link**. Email uses `ieltslab.oran@gmail.com` instead of `@ieltslab.org` (Zoho MX + SPF exist, but **`_dmarc.ieltslab.org` is missing**). Facebook `sameAs` uses numeric `profile.php?id=61591282143384`. |
| **Facility Media & Social Proof** | **Fail** | `Facility.tsx:L36-43` shows an Unsplash stock photo (*"Illustrative image. Real lab photos will be published after setup"*). No real classroom/instructor photos, no YouTube channel `sameAs`, and no Google Business Profile review link/count (unlike competitor `mycoach-in.com` `4.8/5`, `123` reviews). |
| **Oran Neighborhoods, Catchment & Test-Day Logistics** | **Gap** | Missing neighborhood/university mentions (Bir El Djir, USTO, Millenium, Akid Lotfi, Canastel, Hai Yasmine, Sidi Chahmi, Es-Senia) and Western Algeria catchment (Tlemcen, Mostaganem, Sidi Bel Abbès, Mascara, Ain Temouchent), plus a deep **Oran test-day logistics guide** clarifying British Council Oran (`Imtiyaz El Djazair`: Castors vs USTO/Sidi Chahmi, monthly date frequency, UKVI Algiers requirement). |

---

## 4. Algeria & Oran Competitor Discovery & Benchmarking

### 4.1 Discovered Competitor Landscape (Verified Live URLs)

Multi-lingual SERP discovery across English, French, and Arabic (`search_web` & `parallel_parallel-search`) paired with live HTTP/HTML/JSON-LD probes identified three competitor tiers plus an active global brand collision:

#### Tier A — Direct Oran Physical & Official-Ecosystem Competitors
1. **British Council Algeria** — `https://www.britishcouncil.dz/en/exam/ielts`, `/fr/examen/ielts`, `/en/exam/ielts/dates-fees-locations`, `/en/exam/ielts/prepare` (Verified live HTTP `200` on `robots.txt`, `sitemap.xml` [225 URLs, 43 IELTS URLs], `/en/exam/ielts`, `/dates-fees-locations`, `/book-test`)
   - **Positioning:** Sole official IELTS exam administrator in Algeria (IDP does not operate in Algeria). All exams computer-delivered since 30 April 2026 (`40,000 DZD` Academic/GT, `43,400 DZD` UKVI, `28,900 DZD` Life Skills, `25,000 DZD` One Skill Retake; `+1%` cash stamp duty). Bundles free *IELTS Ready: Premium* (40 practice tests) with booking.
   - **SEO/GEO Notes:** High institutional authority; `Crawl-delay: 10` in `robots.txt`; French/Arabic hubs focus heavily on Algiers while delegating Oran to a venue line (*"Imtiyaz El Djazair (Oran)"*).
2. **Imtiyaz El Djazair (Oran)** — `https://www.imtiyazeldjazair.dz/`, `/ielts`, `/fr/ielts`, `/ar/ielts`, `/exam-center`
   - **Positioning:** Official British Council computer-based Oran exam venue and private prep centre (`04, rue Djellat Ahmed - Les Castors, 31000 Oran` in site footer vs `76 Bis, Avenue Sidi Chahmi / USTO` on `ielts.org` & directories).
   - **Strengths / Weaknesses:** Next.js trilingual (`36` URLs in sitemap, full `hreflang`), **but** `/ielts` and `/exam-center` have **0 Oran mentions** and **0 DZD pricing** in HTML text; `/fr/ielts` and `/ar/ielts` leave `<title>` and `<meta description>` untranslated in English; `/ielts` emits only `BreadcrumbList` JSON-LD (no `Course`, `FAQPage`, or `AggregateRating`).
3. **Les Ingliz (Bir El Djir, Oran)** — `https://lesingliz.com/`, `/trouver-mon-cours/?parcours=ielts`
   - **Positioning:** Direct hyper-local Bir El Djir competitor (`Cité El Riadh, Îlot N°81, Bir El Djir, Oran 31130`, `+213 794 02 68 24`) claiming `+3,000 élèves depuis 2023` and featuring `Préparation IELTS` in main nav.
   - **Strengths / Weaknesses:** Complete Bir El Djir NAP, **47 Oran hits**, **14 DZD hits** on homepage, video testimonials, explicit cohort start dates, `EducationalOrganization` + `LocalBusiness` + `PostalAddress` JSON-LD. **Weaknesses:** French-only (`hreflang=[]`), empty `<meta description>`, IELTS landing flow is a JS-gated quiz with no static syllabus/FAQ or `Course`/`FAQPage` schema.
4. **British College of Excellence (`https://bce-algeria.com/`) & Essal Institute (`https://essal.dz/en`) (Oran)**
   - **Positioning:** Established Oran training centres surfacing in EN/FR SERPs (`Les Génets, CW 75` for BCE; trilingual `essal.dz`). Both suffer thin IELTS landing content (`bce-algeria.com`: no `<h1>`, 316 words, 3 IELTS mentions; `essal.dz/en`: 298 words, 0 IELTS mentions on root). Other Oran schools (`insim-oran.com`, `in-tuition.dz`) also have 0 IELTS mentions on root pages.

#### Tier B — National Algeria & Multinational Competitors Capturing Oran/Algeria Demand
5. **My Coach-in (Algiers + Nationwide Visio incl. Oran)** — `https://www.mycoach-in.com/preparation-ielts/`, `/en/preparation-ielts/`, `/ar/preparation-ielts/`, `/2026/05/24/ielts-oran-examen-preparation/`
   - **Positioning:** **Strongest private-sector SEO/AEO/GEO competitor in Algeria.** Birkhadem (Algiers) state-accredited (#418) school capturing Oran & Western Algeria via a **2,398-word Oran pillar guide** (`47` Oran hits, `7` DZD hits, Oran candidate `7.0 in 10 weeks` Google review, catchment coverage for Tlemcen/Mostaganem/Sidi Bel Abbès, `1–2 sessions/month` Oran test frequency).
   - **SEO/Schema Excellence:** Trilingual prep pages with `hreflang`, transparent DZD + EUR pricing (`25,000 DA / 10h`, `44,000 DA / 20h`, `60,000 DA / 30h`; `2,000 DA` first trial), free 10-min placement test, and complete schema (`["EducationalOrganization", "LocalBusiness"]`, `GeoCoordinates`, `OpeningHoursSpecification`, `AggregateRating` `4.8/5` [123 reviews], `Course`, `CourseInstance`, `Offer`, `FAQPage`, `BreadcrumbList`, `BlogPosting`).
6. **Berlitz Algeria (`https://www.berlitz.com/fr-dz/entreprises/tests-certifications/ielts`, `/en-dz/business/testing-assessment/ielts`)**
   - Global domain authority, `6` Oran hits/page, `FAQPage` JSON-LD, **but** no `hreflang` cross-links on DZ IELTS pages, no Arabic Algeria IELTS page, zero DZD pricing, lead form only.
7. **Wall Street English Algeria (`https://www.wallstreetenglish.dz/`), EF Algeria (`https://www.ef.dz/fr/ils/courses/ielts-preparation/`), ABI School (`https://abischool.dz/`)**
   - `wallstreetenglish.dz` is thin (102 words, 0 JSON-LD, `sitemap.xml` `404`); `ef.dz` sells overseas IELTS study (empty `<meta description>`, `sitemap.xml` `404`); `abischool.dz` (El Achour, Algiers) emits `LanguageSchool` + `PostalAddress` + `GeoCoordinates` but has 0 Oran/DZD mentions.

#### Tier C — Global AI/Mock Platforms & Brand Collision
8. **BandLadder (`https://bandladder.com/study-abroad/ielts-for-algeria`, `/guides/ielts-test-centres-in-algeria`)**
   - **Top GEO/AEO benchmark for informational & mock-test queries.** Wins AI search summaries via 40–60 word direct-answer leads (*"IELTS costs DZD 40,000 in Algeria..."*), HTML comparison tables, *"Checked [date]"* timestamps, named author credentials, live Oran vs Algiers UKVI date intelligence, outbound official citations (`ielts.org`, `britishcouncil.dz`, `gov.uk`, `ircc`), DZD micro-pricing (`799–4,803 DZD`), and free no-account calculators/AI checks. **Weakness:** English-only, no physical Oran classroom.
9. **Brand-Name Collisions & Global Mock Platforms (`ieltslab.app`, `ieltslab.io`, `ieltslab.uz`, `ieltsmocklab.com`, `oneielts.com`, `bandcheck.app`, `alfaielts.com`, `speakmetry.com`, `langogh.com`, `bngoh.com`)**
   - **Critical Collision:** Querying `site:ieltslab.org` in Google AI Search blended `ieltslab.org` with **`https://ieltslab.app/`** (`title='Free IELTS Practice Tests with Instant AI Scores | IELTSLab'`, `SoftwareApplication`/`WebApplication` + `Offer` schema), **`https://ieltslab.io/`**, and **`ieltslab.uz`**.

---

### 4.2 Apples-to-Apples Comparison Matrix (`ieltslab.org` at `e14b3dc` vs Competitors)

| Dimension | `ieltslab.org` (Live at `e14b3dc`) | `britishcouncil.dz` | `imtiyazeldjazair.dz` | `lesingliz.com` | `mycoach-in.com` | `berlitz.com` (DZ) | `bandladder.com` (DZ) | `ieltslab.app` (Collision) |
|---|---|---|---|---|---|---|---|---|
| **Primary Positioning** | In-person small-group classroom (8 seats, Bir El Djir, Oran) + online Academic mock test platform | Official test admin + *IELTS Ready: Premium* | Official Oran BC venue + private English school | Bir El Djir language & IELTS school | Algiers + online visio (CELTA) nationwide incl. Oran | Private/group IELTS (Algiers & Oran) | Global AI mock platform + DZ guides | Global free AI IELTS practice SaaS |
| **HTTP & Caching** | `200`, Vercel SSR, `Cache-Control: private, no-store` (`MISS`, 2.05–4.74s TTFB) | `200`, `Crawl-delay: 10`, 43 IELTS URLs in sitemap | `200`, Next.js, 36-URL sitemap | `200`, WordPress | `200`, Astro/static-like, 76-URL sitemap | `200`, 925-URL sitemap | `200`, 15,007-URL sitemap | `200` |
| **EN / FR / AR & `hreflang`** | **EN / FR / AR** + `x-default` (fully localized UI & guides; minor schema/metadata leaks) | EN / FR / AR (cross-path asymmetry) | EN / FR / AR + `x-default` (untranslated EN meta on `/fr`/`/ar/ielts`) | **FR only** (`hreflang=[]`) | **EN / FR / AR** + `x-default` on prep; blog FR-only | EN-DZ / FR-DZ (`hreflang=[]`; no AR) | **EN only** (`hreflang=[]`) | **EN only** |
| **Oran Local Signals** | `20–21` Oran hits/home; Bir El Djir named; **no street, no `31130`, no `GeoCoordinates`, no hours, no `tel:`** | Names Imtiyaz (Oran) as venue; Hydra Algiers office | **0 Oran hits** on `/ielts` & `/exam-center`; Castors vs USTO address conflict | **47 Oran hits**, full Bir El Djir `31130` street NAP & phone | **47 Oran hits** in Oran guide + Oran Google review; Algiers `Geo` | `6` Oran hits/page; no Oran street NAP | `5` Oran hits + Oran venue notes | `0` Oran hits |
| **DZD Pricing Transparency** | **High:** Cohort `5,000 DA` + Online Mock Test (`3,900 DZD` tier) + Chargily Pay / Baridimob / Cash | Official exam fees (`40,000` / `43,400` / `25,000 DZD`) | **None** (`0` DZD hits) | `14` DZD hits on home; none on IELTS quiz | **Very High:** `25,000` / `44,000` / `60,000 DA` + `2,000 DA` trial + EUR | **None** (`0` DZD hits; quote form) | **Very High:** `40,000 DZD` official + `799–4,803 DZD` passes | USD/global SaaS |
| **JSON-LD Richness** | `EducationalOrganization`, `Course`, `CourseInstance`, `Offer` (cohort only), `Person`, `WebSite`, `VideoObject`, `FAQPage`, `Article`, `CollectionPage`, `BreadcrumbList`. **Missing:** `LocalBusiness`, `GeoCoordinates`, `OpeningHours`, `AggregateRating`, Mock Test `Offer`/`SoftwareApplication` | Institutional standard | Home: `EducationalOrganization`, `OpeningHours`, `PostalAddress`, `WebSite`. `/ielts`: **only `BreadcrumbList`** | `EducationalOrganization`, `LocalBusiness`, `PostalAddress` | `EducationalOrganization`+`LocalBusiness`, `GeoCoordinates`, `OpeningHours`, `AggregateRating` (`4.8/5`, 123), `Course`, `CourseInstance`, `Offer`, `FAQPage`, `BreadcrumbList`, `BlogPosting` | `FAQPage` only | `EducationalOrganization`, `Person`, `WebSite`, `MobileApplication`, `Product`, `Offer`, `FAQPage`, `BreadcrumbList` | `EducationalOrganization`, `SoftwareApplication`, `WebSite`, `Offer` |
| **Free Interactive Lead Magnet** | `/sample?locale=en` (5-Q Reading sample), **BUT `noindex, follow` + CSR (9 words)** + WhatsApp PDF cheat sheet | Free PDFs/webinars + *IELTS Ready Premium* | None on `/ielts` | JS placement quiz | Free 10-min instant level test + 1st trial | Level check at centre | Free 10-min level check (no account) + free AI Writing check + calculators | Free mock + AI checker |
| **GEO / AEO Readiness** | Good (`FAQPage`, Quick Facts on `how-to-register`, 11 guides, Amine Senouci Band 8.0 byline); **Gaps:** `/llms.txt` 404, no OpenAI TXT, 208w cohort post, `/sample` noindex, missing answer-first leads | Official authority, sparse Q&A tables | Generic copy, no Oran test-day guide | Video reviews, no FAQ/guides | **Strongest local private AEO/GEO** (Oran Q&A, DZD table, CELTA, Oran review) | Short FAQ, generic global template | **Strongest informational GEO** (40–60w leads, "Checked" dates, citations, calculators) | Global SaaS copy |

---

### 4.3 Strategic Gap Analysis & `ieltslab.org`'s Defensible Moats (Aligned with `e14b3dc`)

#### Key Competitive Gaps to Close
1. **Oran Test-Day & Venue Logistics Pillar (EN/FR/AR):** `mycoach-in.com` (`2,398` words) and `bandladder.com` own *"centre examen IELTS Oran"*, *"Imtiyaz El Djazair USTO vs Castors"*, monthly Oran exam frequency, and *"IELTS UKVI Oran vs Algiers"*. `ieltslab.org` has national registration (`how-to-register-algeria`) but no dedicated Oran test-day & catchment pillar.
2. **Indexable Free Simulator & Calculator Landing Pages:** `bandladder.com`, `mycoach-in.com`, and `ieltslab.app` capture top-of-funnel simulator/calculator traffic with **indexable** tool wrappers. `ieltslab.org`'s `/sample` is `noindex` CSR and `simulation-platform` is `noindex` with stale "in development" copy.
3. **Hyper-Local Bir El Djir NAP & Visual Proof:** `lesingliz.com` publishes exact Bir El Djir `31130` street NAP and student videos, while `mycoach-in.com` embeds `GeoCoordinates` + `123` Google reviews (`4.8/5`). `ieltslab.org` still lacks street/landmark, `31130`, `GeoCoordinates`, `openingHoursSpecification`, and real classroom photos.
4. **Brand Entity Disambiguation:** Consistently use **`IELTS Lab Oran`** (`ieltslab.org`) in lead entity statements, schema `alternateName`, `sameAs`, and `/llms.txt` to break AI conflation with `ieltslab.app`/`.io`/`.uz`.

#### `ieltslab.org`'s Defensible Moats (Updated Accurately for `e14b3dc`)
1. **Hybrid Oran Small-Group Coaching + Proprietary Online Computer-Based Mock Simulator:** Following `e14b3dc`, `ieltslab.org`'s authentic moat is pairing **in-person 8-seat small-group coaching in Bir El Djir, Oran** (direct instructor feedback with Band 8.0 / Listening 9.0 founder Amine Senouci) with a **proprietary online computer-based IELTS mock test & Reading sample platform** (`/sample`, `/sim`, `/speaking`) — matching the 100% computer-delivered British Council Algeria reality since 30 April 2026 without overclaiming a physical PC lab.
2. **Genuine EN / FR / AR Trilingual Parity + Clean `hreflang`:** Beats `lesingliz.com` (FR-only), `bandladder.com` (EN-only), `berlitz.com/fr-dz` (no AR / no `hreflang`), and `imtiyazeldjazair.dz` (untranslated FR/AR IELTS meta) with 11 trilingual Algeria-specific guides (`Italy student visa`, `TLScontact/Capago`, `One Skill Retake Algeria`, `How to Register in Algeria`).
3. **Local DZD Pricing + Chargily Pay / Baridimob Frictionless Checkout:** Global platforms (`ieltslab.app`, `oneielts.com`, `speakmetry.com`) require international Visa/Mastercard in USD/EUR. Transparent DZD pricing (`5,000 DA` founding cohort + online Academic mock test payable in DZD via Chargily Pay / Baridimob) is a decisive conversion moat in Algeria.
4. **Founder E-E-A-T & Proactive AI Crawler Architecture:** `Amine Senouci` (`Band 8.0`, `Listening 9.0`, TEFL, Applied AI & Software Engineering) + structured `Person` / `ArticleTrust` fact-check attribution + explicit `OAI-SearchBot` / `PerplexityBot` / `Claude-SearchBot` allowance + IndexNow readiness outclass local Oran competitors once `/llms.txt`, OpenAI DNS TXT verification, and edge caching are completed.

---

## 5. Prioritized Catalog of All Fixes & Improvements (`P0` -> `P3`)

### P0 — Critical (Immediate Traffic, TTFB, Indexing & Brand Alignment Blockers)

#### `FIX-01` — Eliminate `no-store` SSR Bottleneck & Bot-Skewed DB Writes on Public Landing Pages
- **Priority:** `P0 Critical`
- **Dimension(s) & Linked Audit IDs:** Technical SEO, CWV/Web Dev, Analytics, GEO (`AHREF-21`, `PSI-06`, `GA-02`, `GSC-06`, `NEW-01`)
- **Root Cause:** `src/proxy.ts:L39-79` generates a per-request CSP nonce (`crypto.randomUUID()`), forcing dynamic SSR (`Cache-Control: private, no-cache, no-store`, `x-vercel-cache: MISS`, `cdg1::iad1`), while `src/components/MockTestOffer.tsx:L13-24` calls `getLocale()` + `prisma.product.findUnique` + `await recordFunnelEvent({ type: 'PRODUCT_VIEWED' })` on every SSR render (2.05–4.74s TTFB, inflating DB telemetry with bots).
- **Affected URL(s) & File(s):** `/en`, `/fr`, `/ar`, `/en/articles/*`; `src/proxy.ts:L39-79`, `src/components/MockTestOffer.tsx:L13-24`, `next.config.ts`
- **Exact Target Change:**
  1. Remove `await recordFunnelEvent({ type: 'PRODUCT_VIEWED', ... })` from Server Component `MockTestOffer.tsx:L24` and trigger `PRODUCT_VIEWED` asynchronously on the client (e.g., via `IntersectionObserver` + `fetch('/api/...')` or Vercel Analytics custom event) only for real interactive browsers.
  2. Cache `prisma.product.findUnique` with `unstable_cache` / `use cache` (revalidated on product update or 1-hour TTL) and decouple public marketing routes (`/en`, `/fr`, `/ar`, `/[locale]/articles*`) from per-request DB/session/nonce dynamic forcing (e.g., ISR `export const revalidate = 3600` + hash/static-compatible CSP or Vercel region `cdg1` preferred region for Algiers/Oran proximity).
- **Verification Check:** `curl -sI https://www.ieltslab.org/en` shows edge caching (`HIT` or `PRERENDER`), TTFB `<300 ms` from EU/DZ, and Postgres `FunnelEvent` no longer logs `PRODUCT_VIEWED` on `curl` fetches.
- **Manual User Action Required?** `No` (optional `Vercel Dashboard -> Project Settings -> Functions -> Region` review to prefer `cdg1` Paris near Algeria if DB is in EU/US).

#### `FIX-02` — Trim `e14b3dc` 80-Character Homepage `<title>` & Optimize Page-1 SERP Titles/Descriptions
- **Priority:** `P0 Critical`
- **Dimension(s) & Linked Audit IDs:** On-Page SEO, CTR (`GSC-09`, `GSC-10`, `AHREF-05`, `NEW-02`)
- **Root Cause:** `e14b3dc` expanded homepage `<title>` to **80 chars** across EN/FR/AR (truncating brand/value prop in SERPs). Meanwhile top Page-1 guides (`how-to-register-algeria` pos 8.87, `0.34% CTR` on 4,173 imp; `ielts oran` pos 3.35, `0.86% CTR`) have low-CTR metadata.
- **Affected URL(s) & File(s):** `/en`, `/fr`, `/ar`, `/[locale]/articles`, `/[locale]/articles/*`; `src/app/[locale]/layout.tsx:L29-38`, `src/lib/seo.ts:L160-264`, `src/lib/articleContent.ts:L408-443`
- **Exact Target Change:**
  1. Shorten homepage `<title>` in `src/app/[locale]/layout.tsx:L35-37` to **52–60 chars**:
     - EN: `IELTS Preparation in Oran | Small-Group & Mock Tests — IELTS Lab Oran` (or `IELTS Preparation in Oran | IELTS Lab Oran` / `IELTS Prep Oran: Small-Group Course & Mocks | IELTS Lab` ≤60 chars).
     - FR: `Préparation IELTS Oran : Cours & Tests Blancs | IELTS Lab` (57 chars).
     - AR: `تحضير IELTS وهران: دورة حضورية واختبار تجريبي | IELTS Lab` (58 chars).
  2. Expand `/ar/articles` meta description (currently 82 chars) to ~140–155 chars, and rewrite `ARTICLE_SEO_TITLES` & `ARTICLE_DESCRIPTIONS` for `how-to-register-algeria` (lead with `40,000 DA` + `2026 Dates` + `Baridimob/HSBC` in EN/FR/AR) and `italy-student-visa-english-tests-algeria`.
- **Verification Check:** Automated unit check verifying all `<title>` lengths `50–60` chars (or ≤62) and descriptions `120–160` chars across `en`/`fr`/`ar`; track CTR lift in GSC over 28 days.
- **Manual User Action Required?** `No`.

#### `FIX-03` — Remove Residual PC-Lab Copy After `e14b3dc` & Update `simulation-platform`
- **Priority:** `P0 Critical`
- **Dimension(s) & Linked Audit IDs:** On-Page SEO, Copy Consistency (`CLAUDE-21`, `NEW-03`, `GSC-03`)
- **Root Cause:** `e14b3dc` pivoted to in-person small-group classroom + online mock tests, but missed `ApplicationForm.tsx`, `articleContent.ts`, and `simulation-platform/page.tsx` (`"currently in development"`).
- **Affected URL(s) & File(s):** `/en`, `/fr`, `/ar`, `/[locale]/articles`, `/[locale]/articles/simulation-platform`; `src/components/ApplicationForm.tsx:L14,16,52-53,70-71`, `src/lib/articleContent.ts:L34,60,86,296,305,314,357,384`, `src/app/[locale]/articles/simulation-platform/page.tsx:L6-45`
- **Exact Target Change:**
  1. Replace `"PCs, not paper"` / `"digital lab"` / `"our computer-based lab in Oran"` in `ApplicationForm.tsx` and `articleContent.ts` with consistent small-group classroom + online computer-based mock simulator messaging, and extend `tests/unit/seo-identity.test.ts:L169-189` to scan `src/components/` and `src/lib/articleContent.ts`.
  2. Update `simulation-platform/page.tsx` (or `301` redirect it to the new indexable mock-test landing page once created in `FIX-21`) and localize its `<title>`, `<meta description>`, and `"Status Update"` badge.
- **Verification Check:** `vitest` / unit test in `tests/unit/seo-identity.test.ts` passes with zero PC-lab phrase matches across `src/`; live HTML check confirms consistent messaging.
- **Manual User Action Required?** `No`.

#### `FIX-04` — Collapse 3-Hop Redirect Chains (`ieltslab.tech` & `ieltslab.org` -> `https://www.ieltslab.org/en`)
- **Priority:** `P0 Critical`
- **Dimension(s) & Linked Audit IDs:** Technical SEO, Crawl Budget (`CLAUDE-09`, `GSC-08`, `GSC-13`, `AHREF-06`, `AHREF-12`, `AHREF-13`)
- **Root Cause:** `http://ieltslab.org/` -> `https://ieltslab.org/` -> `https://www.ieltslab.org/` -> `/en` executes 3 `308` hops (same for `ieltslab.tech`), fragmenting `1,239` GSC impressions on `http://ieltslab.org/`.
- **Affected URL(s) & File(s):** `http(s)://ieltslab.tech/*`, `http(s)://ieltslab.org/*`; Vercel Domain settings + `vercel.json` / `next.config.ts` / `src/proxy.ts:L110-113`
- **Exact Target Change:** Configure Vercel Domain redirects so `https://ieltslab.org/` and `https://ieltslab.tech/` redirect directly (single hop `308`) to `https://www.ieltslab.org/en` on root `/` (preserving path `/:path*` when non-root), and keep `src/proxy.ts` `/` -> `/en` `308` deterministic for direct hits to `https://www.ieltslab.org/`. Ensure HSTS `includeSubDomains; preload` is emitted on redirects if configurable at edge.
- **Verification Check:** `curl -sI https://ieltslab.org/` returns a single `308` directly to `https://www.ieltslab.org/en` (and `http://ieltslab.org/` takes at most HTTPS upgrade + single target hop).
- **Manual User Action Required?** `Yes` — Update Vercel Project Domain Redirect rules in Vercel Dashboard AND submit **Change of Address** in Google Search Console (`ieltslab.tech` -> `www.ieltslab.org`).

#### `FIX-05` — Add OpenAI Domain Verification DNS TXT Record & Publish `/llms.txt` + `/llms-full.txt`
- **Priority:** `P0 Critical`
- **Dimension(s) & Linked Audit IDs:** GEO / AI Search Visibility (`CLAUDE-39`, `NEW-05`)
- **Root Cause:** Live DNS on `ieltslab.org` and `www.ieltslab.org` lacks `openai-domain-verification=...`; `/llms.txt` and `/llms-full.txt` return `404`; Google AI Search blends `ieltslab.org` with `ieltslab.app`/`.io`/`.uz`.
- **Affected URL(s) & File(s):** DNS TXT zone (`ieltslab.org`); `public/llms.txt` & `public/llms-full.txt` (or Next.js App Router route handlers)
- **Exact Target Change:**
  1. Add `public/llms.txt` and `public/llms-full.txt` explicitly disambiguating **`IELTS Lab Oran (https://www.ieltslab.org)`** (not `ieltslab.app`, `ieltslab.io`, or `ieltslab.uz`), summarizing the Bir El Djir Oran in-person small-group cohort (`5,000 DA`), online Academic mock test platform (`/sample`, Chargily Pay / Baridimob), Amine Senouci's credentials (`Band 8.0`, `Listening 9.0`), verified British Council Algeria facts (`40,000 DA`), and all 11 EN/FR/AR guide URLs.
  2. Add the exact `openai-domain-verification=...` TXT record from ChatGPT Business Profile to authoritative DNS for `ieltslab.org`.
- **Verification Check:** `curl -s https://www.ieltslab.org/llms.txt` returns `HTTP 200` (`text/plain; charset=utf-8`); `Resolve-DnsName -Type TXT ieltslab.org` returns the `openai-domain-verification` token.
- **Manual User Action Required?** `Yes` — Retrieve token from OpenAI / ChatGPT Business Profile and add the `TXT` record in your DNS provider, then click Verify.

---

### P1 — High (Landmarks, Schema Completeness, Local Oran NAP, i18n Bugs & High-ROI AEO)

#### `FIX-06` — Fix `<main>` and `<footer>` Semantic Landmarks Across Homepage & All 13 `/articles*` Routes
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** On-Page SEO, Accessibility, Local SEO (`CLAUDE-15`, `CLAUDE-48`, `NEW-04`)
- **Root Cause:** `Facility.tsx:L57-110` nests `<footer>` inside `<section id="facility">` inside `<main>` (`page.tsx:L27-40`). All 13 routes in `src/app/[locale]/articles/*` lack `<footer>`, and 10 of 13 lack `<main>`.
- **Affected URL(s) & File(s):** `/[locale]`, `/[locale]/articles`, all 12 `/[locale]/articles/*` pages; `src/components/Facility.tsx:L29-111`, `src/app/[locale]/page.tsx:L27-40`, `src/app/[locale]/articles/*`
- **Exact Target Change:**
  1. Extract a shared `<SiteFooter />` component (containing Oran NAP, `tel:`, WhatsApp, email, legal links, guides links, disclaimer) and render it as a sibling **after** `</main>` in `[locale]/page.tsx` and in a shared `src/app/[locale]/articles/layout.tsx` (or each article page). Keep `<section id="facility">` inside `<main>` without `<footer>`.
  2. Wrap `<article>` in `<main>` on all 10 missing article files (`academic-vs-general`, `computer-vs-paper-ielts`, `free-ielts-resources-algeria`, `how-to-register-algeria`, `ielts-vs-toefl-canada`, `italy-student-visa-english-tests-algeria`, `overcoming-speaking-anxiety`, `simulation-platform`, `tlscontact-capago`, `writing-task-2-tactics`).
- **Verification Check:** Inspect DOM on `/en` (`footer` is direct sibling of `main`, not descendant) and all 13 `/en/articles*` routes (`count(main) == 1`, `count(footer) == 1`).
- **Manual User Action Required?** `No`.

#### `FIX-07` — Eliminate Gated/404 Canonical Leaks (`/en/admin/acquisition`, `/staff`, `/en/<404>`, `not-found.tsx`) & Resolve `/staff/` Robots Conflict
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** Technical SEO, Security Hygiene (`CLAUDE-11`, `AHREF-18`, `NEW-06`)
- **Root Cause:** `admin/acquisition/page.tsx:L12-15` lacks `alternates: { canonical: null, languages: {} }` and `loading.tsx` streams a `200` Suspense shell before `requireStaffPageAal2()` runs; `/staff` hits `/[locale]` emitting `canonical=/en`; `/en/<404>` emits duplicate `robots` meta & `Link:` hreflangs; `src/app/not-found.tsx:L5-9` omits `robots: noindex`; `/staff/` is disallowed in `robots.ts` while setting `noindex`.
- **Affected URL(s) & File(s):** `src/app/[locale]/admin/acquisition/page.tsx:L12-15` (+ new `admin/layout.tsx`), `src/app/not-found.tsx:L5-9`, `src/app/[locale]/not-found.tsx`, `src/proxy.ts`, `src/app/robots.ts:L4`
- **Exact Target Change:**
  1. Add `src/app/[locale]/admin/layout.tsx` matching `account/layout.tsx` (`robots: { index: false, follow: false }`, `alternates: { canonical: null, languages: {} }`, `openGraph: null`, `twitter: null`) and move the unauthenticated auth check into middleware/route guard or server layout before streaming `loading.tsx` (returning `307` or `401/403` + `X-Robots-Tag: noindex, nofollow` on `/admin/*`, `/account/*`, `/staff/*`, `/sample`).
  2. Add `robots: { index: false, follow: false }` to `src/app/not-found.tsx`, strip `Link:` `hreflang` headers in `src/proxy.ts` when status is `404` or path is `/staff`/`/admin/*`, and ensure `/staff` routes cleanly to `404` (`/_not-found`) or `/staff/operations` redirect without matching `[locale]`.
  3. Remove `/staff/` from `robots.ts` `PUBLIC_DISALLOW` if you want Google to crawl-confirm `X-Robots-Tag: noindex, nofollow` (or keep disallowed only once zero external links exist and `X-Robots-Tag` is emitted on `307`s).
- **Verification Check:** `curl -i https://www.ieltslab.org/en/admin/acquisition` returns `307` (not `200` with `canonical=/en`); `curl -i https://www.ieltslab.org/staff` returns `404` without `canonical=/en`; `curl -i https://www.ieltslab.org/en/nonexistent` has a single `noindex, nofollow` and no `Link:` hreflang header.
- **Manual User Action Required?** `No`.

#### `FIX-08` — Upgrade `LocalSchema.tsx`, `About.tsx`, `VideoObject`, & `ArticleTrust.tsx` Entity Graph
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** Structured Data, GEO, i18n, Local SEO (`RRT-01..04`, `CLAUDE-27..30`, `CLAUDE-42`)
- **Root Cause:** `LocalSchema.tsx` omits `LocalBusiness`, `streetAddress`, `31130`, `GeoCoordinates`, `openingHoursSpecification`, `hasMap`, `CourseSchedule`, and Mock Test `Offer`/`SoftwareApplication`; hardcodes `5000` & `LimitedAvailability` regardless of `cohortStatus.isFull`/`isCohortDeadlinePassed()`; leaks English `jobTitle`/`Algeria`/`OfferCatalog.name` on FR/AR; duplicates `Person` instead of linking `#instructor`; `ArticleTrust.tsx` overrides `#organization.url` per locale and omits `citation`/`reviewedBy`; `VideoObject` lacks `duration`/`publisher` and embedded player.
- **Affected URL(s) & File(s):** `src/components/LocalSchema.tsx:L28-134`, `src/components/About.tsx:L10-27`, `src/components/Methodology.tsx:L58-92`, `src/components/ArticleTrust.tsx:L164-210`, `src/components/FAQ.tsx:L55-71`
- **Exact Target Change:**
  1. **Unify Entity `@id`s:** Reference `{ '@id': 'https://www.ieltslab.org/#instructor' }` in `LocalSchema.founder`, `CourseInstance.instructor`, and `ArticleTrust.author`; add `url` (`/#instructor` or `/[locale]/about`) + `image` (`/amine.jpg`) + Amine's personal LinkedIn to `About.tsx` `Person`; keep `#organization.url` strictly `'https://www.ieltslab.org'` everywhere (`ArticleTrust` too) and include `publisher.logo`.
  2. **Localize JSON-LD fields:** Localize `OfferCatalog.name`, `founder.jobTitle`, `areaServed`, and `About.knowsAbout` via `messages/{en,fr,ar}.json`; add `inLanguage` to all 3 `FAQPage` blocks.
  3. **Dynamic Cohort & Mock Test Offers:** Wire `LocalSchema` to `cohort-launch.ts` (`SoldOut` / waitlist / `29500` next-cohort price when closed/full) and add `CourseInstance.courseSchedule` (`Schedule`) + a second `Offer` / `Product` (`SoftwareApplication`) in `hasOfferCatalog` for the online Academic Mock Test (`priceCurrency: 'DZD'`).
  4. **LocalBusiness + Geo (once address finalized):** Upgrade `@type` to `['EducationalOrganization', 'LocalBusiness']` with verified `streetAddress`, `postalCode: '31130'`, `geo` (`GeoCoordinates`), `openingHoursSpecification`, `hasMap` (GBP URL), and `priceRange: '$$'`.
  5. **Article & Video Enhancements:** Add `citation` (official source URLs), `reviewedBy`, and `+01:00` ISO timestamps to `ArticleTrust.tsx`. In `Methodology.tsx`, add `duration` & `publisher` to `VideoObject`, remove trailing `:` in description, and render a click-to-load lite `youtube-nocookie.com/embed/r5eiUU3EpHE` `<iframe>` on click (note: update CSP `frame-src` to allow `https://www.youtube-nocookie.com` if embedding).
- **Verification Check:** Validate `/en`, `/fr`, `/ar`, and `/en/articles/how-to-register-algeria` in Google Rich Results Test and Schema.org Validator with 0 errors and unified `@id` graph.
- **Manual User Action Required?** `Yes` — Provide exact verified Bir El Djir street address/landmark, coordinates, opening hours, Google Maps GBP URL (`hasMap`), and Amine Senouci's personal LinkedIn URL + YouTube video duration.

#### `FIX-09` — Move Article Breadcrumbs Above `<h1>` & Add `first-ielts-preparation-cohort-oran` to `GUIDE_POOL`
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** On-Page SEO, Internal Linking (`CLAUDE-19`, `AHREF-10`, `AHREF-19`)
- **Root Cause:** `ArticleTrust.tsx:L226-236` renders `<nav aria-label="Breadcrumb">` at the bottom of articles, and `GUIDE_POOL` (`L26-110`) lists 10 guides instead of 11.
- **Affected URL(s) & File(s):** All 11 indexable guide pages; `src/components/ArticleTrust.tsx:L26-110, L226-236`
- **Exact Target Change:** Split `<ArticleBreadcrumb />` out of `ArticleTrust` and render it at the top above `<h1>` on all 11 guides (leaving Fact-check / Official Sources / Related Guides at the bottom), and add `first-ielts-preparation-cohort-oran` (EN/FR/AR) to `GUIDE_POOL`.
- **Verification Check:** Inspect all 11 guide pages: visible `<nav aria-label="Breadcrumb">` appears before `<h1>`, and `first-ielts-preparation-cohort-oran` receives multiple internal links from related guides.
- **Manual User Action Required?** `No`.

#### `FIX-10` — Complete Hyper-Local Bir El Djir NAP, Activate `Facility.mapBtn`, Add `tel:` Link & Replace Stock Photo
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** Local SEO, E-E-A-T (`CLAUDE-06`, `CLAUDE-25`, `CLAUDE-35`, `CLAUDE-36`, `RRT-02`, `delta/handoff.md:L75`)
- **Root Cause:** `Facility.tsx` only states `"Bir El Djir, Oran"`, leaves `Facility.mapBtn` (`messages/*.json:L109`) unused, uses a `228 KB` Unsplash stock photo, links `wa.me` without `tel:`, uses `ieltslab.oran@gmail.com` without DMARC, and uses numeric Facebook `profile.php?id=61591282143384`.
- **Affected URL(s) & File(s):** Homepage & new `<SiteFooter />`; `src/components/Facility.tsx:L36-110`, `src/components/LocalSchema.tsx:L51-68,107-111`, DNS records
- **Exact Target Change:**
  1. Add street/landmark + `31130 Bir El Djir, Oran`, opening hours, clickable `tel:+213780343103` alongside WhatsApp, and wire `Facility.mapBtn` to load a Google Maps embed or link directly to Google Business Profile (`hasMap`).
  2. Replace the Unsplash stock photo with compressed real classroom/instructor photos (`public/images/classroom-oran.webp` + `sizes`).
  3. Upgrade email to `contact@ieltslab.org` (Zoho Mail already configured on MX/SPF) and claim a vanity Facebook slug (`facebook.com/ieltslaboran`) + add YouTube channel & GBP to `sameAs`.
- **Verification Check:** Live footer & `LocalSchema` display street/landmark, `31130`, `tel:` link, real photo, `@ieltslab.org` email, and active map button.
- **Manual User Action Required?** `Yes` — Shoot/upload real Bir El Djir classroom photos, claim Facebook vanity URL, create `contact@ieltslab.org` alias in Zoho, and add `_dmarc.ieltslab.org` TXT + DKIM in DNS.

#### `FIX-11` — Expand Thin Cohort Page (`208` Words -> `1,200+` Words) & Build Oran Test-Day Logistics Pillar
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** Content, Local SEO, AEO, GEO (`AHREF-07`, `GSC-07`, `GSC-10`, `TREND-04`, `competitors/analysis.md:L97,122`)
- **Root Cause:** `first-ielts-preparation-cohort-oran` is only `208/240/198` words (`AHREF-07`), and `ieltslab.org` lacks an Oran-specific test-centre/catchment pillar to compete with `mycoach-in.com`'s `2,398`-word Oran guide.
- **Affected URL(s) & File(s):** `src/app/[locale]/articles/first-ielts-preparation-cohort-oran/page.tsx`, `src/lib/cohort-launch.ts`, new `/[locale]/articles/ielts-oran-test-centre-preparation-guide` (EN/FR/AR)
- **Exact Target Change:**
  1. Expand `first-ielts-preparation-cohort-oran` (EN/FR/AR) to `1,200+` words with full syllabus/weekly structure, hours/schedule, entry CEFR level, `5,000 DA` Founding vs `29,500 DA` next-cohort table, refund/reschedule policy, Bir El Djir logistics, and `Course` + `FAQPage` schema.
  2. Publish a dedicated trilingual **Oran IELTS Test Centre & Preparation Guide** covering Imtiyaz El Djazair (clarifying Castors vs USTO/Sidi Chahmi), monthly Oran session frequency, why UKVI requires Algiers, Oran neighborhoods (`Bir El Djir`, `USTO`, `Akid Lotfi`, `Canastel`, `Millenium`, `Es-Senia`), and Western Algeria catchment (`Tlemcen`, `Mostaganem`, `Sidi Bel Abbès`, `Mascara`, `Ain Temouchent`).
- **Verification Check:** Word count `>=1,200` across EN/FR/AR; included in `sitemap.ts`, `articles/page.tsx`, `GUIDE_POOL`, and `llms.txt`; submit via IndexNow.
- **Manual User Action Required?** `No` (once cohort schedule details are confirmed by founder).

#### `FIX-12` — Fix `(test-engine)/layout.tsx` & `global-not-found.tsx` Hardcoded `lang="en"` / Missing `dir="rtl"`
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** i18n, Accessibility (`CLAUDE-43`, `codebase/analysis.md:L246-247`)
- **Root Cause:** `src/app/(test-engine)/layout.tsx:L50` hardcodes `<html lang="en">` without `dir="rtl"` when `/sample?locale=ar` is loaded; `global-not-found.tsx:L22` hardcodes `<html lang="en">`.
- **Affected URL(s) & File(s):** `/sample?locale=fr|ar`, `src/app/(test-engine)/layout.tsx:L50`, `src/app/global-not-found.tsx:L22`
- **Exact Target Change:** Read `locale` (via query/header/middleware cookie fallback) in `(test-engine)/layout.tsx` or use a `[locale]`-aware wrapper / `searchParams` propagation so `/sample?locale=ar` sets `lang="ar" dir="rtl"` (loading `Cairo`) and `/sample?locale=fr` sets `lang="fr"`.
- **Verification Check:** Fetch `/sample?locale=ar` and verify `<html lang="ar" dir="rtl">` in HTML.
- **Manual User Action Required?** `No`.

#### `FIX-13` — Convert 6 Static Homepage Components to Server Components & Remove `@supabase/supabase-js` from Public `Navbar`
- **Priority:** `P1 High`
- **Dimension(s) & Linked Audit IDs:** Core Web Vitals, Bundle Size (`PSI-06`, `PSI-07`, `PSI-08`, `CLAUDE-44`, `NEW-07`)
- **Root Cause:** `Hero.tsx`, `Methodology.tsx`, `StopTraining.tsx`, `Compare.tsx`, `Facility.tsx`, and `About.tsx` have zero client state/hooks yet carry `'use client'`; `Navbar.tsx:L17-22` pulls `@supabase/supabase-js` into all SEO pages just to render an auth status dot; `About.tsx:L50` sets `priority` on offscreen `/amine.jpg`.
- **Affected URL(s) & File(s):** `src/components/Hero.tsx`, `Methodology.tsx`, `StopTraining.tsx`, `Compare.tsx`, `Facility.tsx`, `About.tsx:L50`, `Navbar.tsx:L17-22`, `public/logo_rounded.png`, `next.config.ts`
- **Exact Target Change:**
  1. Remove `'use client'` from those 6 static components and switch `useTranslations()` -> `await getTranslations()` (`next-intl/server`).
  2. Replace client-side `createSupabaseBrowserClient().auth.getSession()` in `Navbar.tsx` with either a lightweight cookie presence check or isolated client island loaded lazily only when needed, dropping Supabase from marketing JS chunks.
  3. Remove `priority` from `About.tsx:L50` (`/amine.jpg`), compress `public/logo_rounded.png` (`923,918 B` -> `<40 KB` WebP/PNG), add `formats: ['image/avif', 'image/webp']` in `next.config.ts`, and audit `sizes` props on all `<Image>` components.
- **Verification Check:** Re-run `next build` and inspect homepage First Load JS size + Lighthouse (`PSI-06/07/08`) + verify `<link rel="preload" as="image" href="...amine.jpg">` is gone.
- **Manual User Action Required?** `No`.

---

### P2 — Medium (Accessibility, Secondary SEO Hygiene, AEO Structure & Legal Trust)

#### `FIX-14` — Fix All 19–21 WCAG AA Color Contrast Failures & Add Skip-Link / `Navbar` ARIA / Keyboard-Accessible `FloatingWidget`
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** Accessibility, CWV CLS (`PSI-04`, `PSI-09`, `CLAUDE-48`)
- **Root Cause:** Low-opacity Tailwind classes (`text-white/40`, `text-white/45`, `text-gray-400`, `text-black/40`, `text-black/45`, `text-crimson` on `bg-crimson/20`) fail 4.5:1 contrast; `FloatingWidget.tsx:L152-171` uses a non-keyboard `<div onPointerUp>` and shifts mobile CLS (`0.019`); `Navbar.tsx:L69-73` lacks `aria-expanded`/`aria-controls`.
- **Affected URL(s) & File(s):** `TrustBadges.tsx:L13`, `MockTestOffer.tsx:L50`, `Intake.tsx:L186`, `ApplicationForm.tsx:L211,244,251`, `LeadMagnet.tsx:L139`, `Navbar.tsx:L69-73`, `FloatingWidget.tsx:L152-184`, `src/app/[locale]/layout.tsx`
- **Exact Target Change:**
  1. Replace failing contrast classes with WCAG AA-compliant tokens (`>=4.5:1`: e.g., `text-white/75` or `text-gray-300` on `bg-charcoal`, `text-gray-600`/`text-black/70` on white/surface, darken crimson badge text or solidify pill background).
  2. Add a `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to main content</a>` in `[locale]/layout.tsx` and `id="main-content"` on `<main>`.
  3. Add `aria-expanded={mobileOpen}` and `aria-controls="mobile-nav"` to `Navbar.tsx` hamburger button, and `aria-label` on icon-only account link.
  4. Replace `FloatingWidget` `<div onPointerUp>` with semantic `<button type="button">` (keyboard Enter/Space support), anchor initial layout cleanly to avoid `0.019` mobile CLS (`bottom-4` reserved space or avoid late mount shift), and make `textAlign` RTL-aware (`dir="rtl"` -> `text-start`).
- **Verification Check:** Re-run PageSpeed Insights / Lighthouse Accessibility -> **100/100** (0 contrast errors) and mobile CLS **`0`**.
- **Manual User Action Required?** `No`.

#### `FIX-15` — Sync `sitemap.ts` `LAST_MODIFIED` Dates & Standardize ISO 8601 Timezones
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** Technical SEO, Freshness Signals (`CLAUDE-03`, `CLAUDE-12`)
- **Root Cause:** `src/app/sitemap.ts:L22-31` omits 5 guides modified in `960d059` (`ielts-vs-toefl-canada`, `academic-vs-general`, `tlscontact-capago`, `overcoming-speaking-anxiety`, `writing-task-2-tactics`), leaving `2026-07-29`, and `ArticleTrust.tsx` passes `YYYY-MM-DD` without `+01:00`.
- **Affected URL(s) & File(s):** `src/app/sitemap.ts:L22-37`, `src/components/ArticleTrust.tsx:L170-171`, those 5 article files
- **Exact Target Change:** Update `LAST_MODIFIED` in `sitemap.ts` and `reviewedAt`/`modifiedTime` in the 5 modified articles to reflect their genuine revision date (`2026-11-17`, or the actual content-review date when next updated), and format JSON-LD `datePublished`/`dateModified` as `YYYY-MM-DDT00:00:00+01:00`.
- **Verification Check:** `sitemap.xml` `<lastmod>` matches each article's `article:modified_time` and `Article` JSON-LD `dateModified`.
- **Manual User Action Required?** `No`.

#### `FIX-16` — Add Answer-First Summaries, `FAQPage` & Comparison Tables to Remaining 6 Guides + Fix Q3 Baridimob Answer
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** AEO, GEO (`CLAUDE-37`, `TREND-03`, `codebase/analysis.md:L117,184`)
- **Root Cause:** 6 of 11 guides (`overcoming-speaking-anxiety`, `writing-task-2-tactics`, `academic-vs-general`, `tlscontact-capago`, `ielts-vs-toefl-canada`, `free-ielts-resources-algeria`) lack FAQ blocks, `<dl>`/`<table>` summary boxes, and 40–60 word direct leads; `how-to-register-algeria` FAQ Q3 asks about Baridimob/Edahabia without answering specifically.
- **Affected URL(s) & File(s):** Those 7 article files under `src/app/[locale]/articles/*/page.tsx`
- **Exact Target Change:** Add a top 40–60 word "Quick Answer" summary box + HTML comparison/fact `<table>` or `<dl>` + 3–5 localized Q&As (`FAQPage` with `inLanguage`) to each of the 6 guides, and update `how-to-register-algeria` Q3 (`L113-114`) to explicitly clarify British Council Algeria accepted methods (CIB/Edahabia online card vs bank transfer vs HSBC cash deposit + 1% stamp duty) vs IELTS Lab Oran's Baridimob/Chargily Pay acceptance. Also add an extractable 50-word entity summary block on the homepage (`Hero` or below hero).
- **Verification Check:** Rich Results Test & HTML inspection verify `FAQPage` + `<table>`/`<dl>` on all 11 guides across EN/FR/AR.
- **Manual User Action Required?** `No`.

#### `FIX-17` — Create Dedicated `/[locale]/about` & Legal Pages (`/privacy`, `/terms`, `/refund`) for Algeria Law `18-07` & E-E-A-T
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** E-E-A-T, Legal/Trust, Local SEO (`CLAUDE-06`, `CLAUDE-28`, `CLAUDE-38`, `CLAUDE-47`)
- **Root Cause:** No `/about`, `/privacy`, `/terms`, or `/refund` routes exist despite collecting WhatsApp leads, Chargily payments, and storing 30-day exam results (Algeria Law `18-07`).
- **Affected URL(s) & File(s):** New routes `src/app/[locale]/about/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `refund/page.tsx`, `SiteFooter`, `LocalSchema.tsx`, `sitemap.ts`
- **Exact Target Change:** Create localized EN/FR/AR `/about` (full entity profile, Amine Senouci Band 8.0/TEFL credentials + test date + redacted TRF verification, Bir El Djir address/map, coaching philosophy) and `/privacy`, `/terms`, `/refund` pages compliant with Law `18-07` and Chargily checkout requirements; link them in `<SiteFooter />`, `ApplicationForm`, `MockTestOffer`, and `sitemap.ts`. Point `Person.url` to `/[locale]/about#instructor`.
- **Verification Check:** All 4 routes × 3 locales return `200`, appear in `sitemap.xml`, and are linked from sitewide footer.
- **Manual User Action Required?** `Yes` — Founder/legal review of Privacy Policy (Law `18-07` data controller details, 30-day test data retention), Terms, and Refund Policy text + confirm TRF redaction (`/ielts_cropped.png`).

#### `FIX-18` — Localize `waitlist`, `account`, `orders`, `ArticleMobileCta` & Replace Physical RTL CSS Classes
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** i18n, RTL UX (`CLAUDE-05`, `CLAUDE-43`, `codebase/analysis.md:L258-263`)
- **Root Cause:** `waitlist/page.tsx:L8-10` has EN-only metadata; `account/page.tsx:L105-106` & `orders/[orderId]/page.tsx:L32-38` have EN-only headings; physical CSS (`border-l-4`, `rounded-r-2xl`, `ml-11`, `left-6`) breaks RTL mirroring in 2 articles & `Testimonials.tsx`; `ArticleMobileCta.tsx:L17` formats Arabic price with `en-US`.
- **Affected URL(s) & File(s):** `src/app/[locale]/waitlist/page.tsx:L5-14`, `account/page.tsx:L105-106`, `orders/[orderId]/page.tsx:L32-38`, `how-to-register-algeria/page.tsx:L164`, `computer-vs-paper-ielts/page.tsx:L122,157`, `Testimonials.tsx:L37`, `ArticleMobileCta.tsx:L17`
- **Exact Target Change:** Localize `waitlist` metadata (`generateMetadata` + `openGraph`/`twitter`), localize `account` & `orders` UI strings, convert `border-l-4` -> `border-s-4`, `rounded-r-2xl` -> `rounded-e-2xl`, `ml-11` -> `ms-11`, `left-6` -> `start-6`, and use locale-appropriate number formatting in `ArticleMobileCta`.
- **Verification Check:** Visual/DOM check on `/ar/*` confirms clean RTL alignment and zero untranslated EN headings on `/fr/waitlist`, `/ar/waitlist`, `/fr/account`, `/ar/account`.
- **Manual User Action Required?** `No`.

#### `FIX-19` — Fix Internal Redirect Links (`/account`, `/[locale]/sample`), Audit External 4XX/3XX Links & Check Cohort Copy Contradictions
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** Technical SEO, Copy/CRO (`AHREF-02`, `AHREF-04`, `AHREF-16`, `AHREF-17`, `CLAUDE-23`, `CLAUDE-33`, `CLAUDE-34`)
- **Root Cause:** `Navbar` links to `/{locale}/account` (307s for guests), articles/components link to `/{locale}/sample` (`307`s), Ahrefs detected `14` external 4XX and `2` external 3XX links, currency mixes `DA`/`DZD`, and `Intake.tsx`/`messages/*.json` contain `"Reserve Your Seat"` vs `"does not reserve a seat"`, strikethrough `29,500 DA`, and `0/8` negative social proof.
- **Affected URL(s) & File(s):** `src/components/Navbar.tsx`, `src/app/[locale]/sample/page.tsx`, all article outbound source links, `messages/{en,fr,ar}.json`, `src/components/Intake.tsx`
- **Exact Target Change:**
  1. Point public sample CTAs directly to `/sample?locale=${locale}` (or replace `/[locale]/sample` 307 with direct render, see `FIX-23`), add `rel="nofollow"` or route guest account nav cleanly without crawler redirect loops.
  2. Run a link-checker over all external URLs in `src/app/[locale]/articles/*` and `ArticleTrust.tsx` sources to replace any 4XX/3XX dead official links.
  3. Standardize visible currency formatting (`5,000 DZD` or `5,000 DA` consistently; keep `DZD` in schema), remove strikethrough in favor of `"Regular price from next cohort: 29,500 DA"`, reconcile `"Apply for the Cohort"` vs `"Reserve Your Seat"`, and replace `0/8 seats reserved` with `"8 seats total · applications open"`.
- **Verification Check:** Re-crawl shows `0` internal broken/redirect-chain links and `0` external 4XX links.
- **Manual User Action Required?** `No`.

#### `FIX-20` — Tune Pricing/Offer Messaging & Capture Q4 Seasonal Cohort Waitlist Before Dec Dip
- **Priority:** `P2 Medium`
- **Dimension(s) & Linked Audit IDs:** Growth, Demand Timing (`CLAUDE-04`, `TREND-01`)
- **Root Cause:** Mid-Nov is the tail of the Aug–Nov peak (`35.3–37.6` vs Dec `24.5`), and post-Nov 20 cohort transition requires seamless waitlist/next-cohort continuity.
- **Affected URL(s) & File(s):** `src/lib/cohort-launch.ts`, `src/components/Intake.tsx`, `src/app/[locale]/waitlist/page.tsx`
- **Exact Target Change:** Ensure `cohort-launch.ts` automatically transitions post-deadline UI and `LocalSchema` to the next cohort / waitlist CTA with clear upcoming month/date so seasonal demand isn't lost to a "closed" dead end.
- **Verification Check:** Simulate `isCohortDeadlinePassed() === true` in unit tests and confirm UI + JSON-LD cleanly reflect waitlist / next-cohort intake.
- **Manual User Action Required?** `Yes` — Confirm next cohort target dates once Founding Cohort closes on 20 Nov 2026.

---

### P3 — Low / Strategic Growth (Indexable Tools, Content Expansion, Security/JS Polish & Authority)

#### `FIX-21` — Launch Indexable Mock Test & Free Sample Landing Page (`/[locale]/mock-test`) + Interactive Band/CLB Calculator
- **Priority:** `P3 Low` *(High Strategic Upside)*
- **Dimension(s) & Linked Audit IDs:** AEO, GEO, Product SEO, Trends (`CLAUDE-07`, `CLAUDE-42`, `TREND-02`, `TREND-03`, `competitors/analysis.md:L98`)
- **Root Cause:** `/sample` is `noindex` CSR (9 words), sacrificing breakout Algeria simulator searches (`engnovate`, `ielts simulator`, `ielts online tests`, `ielts test gratuit`) and `Canada Immigration` (`76` queries, `0` GSC imp).
- **Affected URL(s) & File(s):** New indexable `/[locale]/mock-test` (EN/FR/AR) + optional `/[locale]/tools/ielts-band-clb-calculator`
- **Exact Target Change:** Build a rich, indexable SSR landing page `/[locale]/mock-test` explaining the online Academic mock test + free 5-question Reading sample (linking directly to `/sample?locale=...`), DZD pricing, Chargily Pay / Baridimob instant access, 30-day score report, `SoftwareApplication`/`Product`/`Offer`/`FAQPage` schema, and an interactive Band-to-CLB Express Entry calculator (`tcf canada` vs `ielts` comparison).
- **Verification Check:** Returns `200` indexable with `>=800` words, valid `Product`/`Offer` + `FAQPage` schema, and linked from `Navbar` & `sitemap.ts`.
- **Manual User Action Required?** `No`.

#### `FIX-22` — Expand Content Roadmap for Zero-Impression Clusters (Canada Express Entry vs TCF, Listening/Reading Guides, Multi-City Algeria)
- **Priority:** `P3 Low` *(High Strategic Upside)*
- **Dimension(s) & Linked Audit IDs:** Content SEO, AEO, Trends (`CLAUDE-41`, `TREND-03`, `TREND-04`)
- **Root Cause:** `Canada Immigration` (`tcf canada` 56.94 vs `ielts algérie` 0.6), `Skills & Band Strategy` (46 queries / 3 GSC imp), and multi-city Algeria (`ielts constantine` peak 100, `ielts alger bab ezzouar`) are under-captured.
- **Affected URL(s) & File(s):** New trilingual guides under `src/app/[locale]/articles/*` + `sitemap.ts` + `ArticleTrust.tsx` `GUIDE_POOL`
- **Exact Target Change:** Publish 3 high-priority trilingual guides: (1) *IELTS vs TCF Canada for Algerian Express Entry Candidates (CLB & CRS Points)*; (2) *IELTS Listening & Reading Computer-Based Strategy Guide*; (3) *IELTS Test Centres in Algeria: Algiers, Oran & Constantine Dates & Fees*.
- **Verification Check:** All 3 guides × 3 locales return `200`, pass `ArticleTrust` + `FAQPage` validation, and submit via `scripts/submit-indexnow.mjs`.
- **Manual User Action Required?** `No`.

#### `FIX-23` — Clean Up `browserslist`, Render-Blocking CSS, Extended AI Bot Rules, Security Polish & Optional GA4
- **Priority:** `P3 Low`
- **Dimension(s) & Linked Audit IDs:** CWV, Security, GEO, Analytics (`PSI-02`, `PSI-03`, `PSI-10..14`, `CLAUDE-39`, `GA-01`, `GA-02`)
- **Root Cause:** Legacy JS transforms waste `13.9 KiB` (`PSI-03`); CSS is `23.7 KiB` render-blocking (`PSI-02`); CSP triggers Lighthouse informational Trusted Types/source-map notes (`PSI-11..13`); `robots.ts` relies on `*` for `Applebot-Extended`/`CCBot`/`Meta-ExternalAgent`/`Amazonbot`; zero GA4 telemetry exists (`GA-01..02`).
- **Affected URL(s) & File(s):** `package.json` (`browserslist`), `src/app/robots.ts`, `src/lib/security/content-security-policy.ts`, `next.config.ts`, `src/app/[locale]/layout.tsx`
- **Exact Target Change:**
  1. Set modern `browserslist` (`defaults and supports es6-module`) to drop legacy polyfills.
  2. Add explicit `Allow` rules in `robots.ts` for `Applebot-Extended`, `CCBot`, `Meta-ExternalAgent`, `Amazonbot`.
  3. Optionally evaluate Trusted Types (`require-trusted-types-for 'script'` after verifying Next.js/Vercel Analytics compatibility) and `productionBrowserSourceMaps` (if public maps desired) or leave intentionally omitted.
  4. Review Vercel Analytics custom events (`form_click`, `whatsapp_click`, `sample_start`, `checkout_start`) — and only add GA4 (`gtag` with CSP nonce) if founder wants Google Analytics dashboards alongside Vercel Analytics.
- **Verification Check:** Bundle diff shows legacy JS savings eliminated; `/robots.txt` lists all AI bots explicitly.
- **Manual User Action Required?** `Optional` (founder decision on GA4 vs Vercel Analytics + custom events).

---

## 6. Phased Implementation Plan & Manual User Action Checklist

### 6.1 Phased Implementation Plan

#### Phase 0 — Immediate Manual & Hotfix Actions (Days 1–2)
1. **Manual DNS & Platform Verification:** Add OpenAI `openai-domain-verification` TXT record and `_dmarc.ieltslab.org` TXT record in DNS; submit GSC Change of Address (`ieltslab.tech` -> `www.ieltslab.org`) and validate canonical fixes (`GSC-04`).
2. **Copy & Title Hotfixes (`FIX-02`, `FIX-03`):** Trim `e14b3dc` 80-char homepage `<title>` tags (`layout.tsx:L29-38`) to ≤60 chars; purge remaining PC-lab strings in `ApplicationForm.tsx` and `articleContent.ts`; update `simulation-platform` metadata/copy.
3. **Collapse Vercel Redirect Chain (`FIX-04`):** Update Vercel Domain redirect rules so apex `ieltslab.org` and `ieltslab.tech` redirect in a single hop to `https://www.ieltslab.org/en` (preserving paths).

#### Phase 1 — Technical SEO, Caching/TTFB, Landmarks & Core Schema (Days 3–7)
1. **Eliminate `no-store` Bottleneck (`FIX-01`):** Move `PRODUCT_VIEWED` tracking (`MockTestOffer.tsx:L24`) to client-side event, cache `prisma.product.findUnique`, and enable edge caching/ISR on marketing routes (`x-vercel-cache: HIT`, TTFB `<300 ms`).
2. **Landmarks & Breadcrumbs (`FIX-06`, `FIX-09`):** Extract `<SiteFooter />` out of `<main><section id="facility">` onto homepage & all 13 `/articles*` routes; wrap `<main>` on the 10 missing articles; move article breadcrumbs above `<h1>` and add `first-ielts-preparation-cohort-oran` to `GUIDE_POOL`.
3. **Gated/404 Hygiene (`FIX-07`):** Fix `/en/admin/acquisition` `200` Suspense shell & canonical leak, `/staff` 404 canonical leak, `/en/<404>` duplicate robots + `Link` hreflang, `not-found.tsx` `noindex`, and `/staff/` `robots.txt` vs `noindex` conflict.
4. **GEO & Schema Graph (`FIX-05`, `FIX-08`, `FIX-15`):** Publish `/llms.txt` & `/llms-full.txt`; unify `#instructor` & `#organization` `@id`s across `LocalSchema`, `About`, and `ArticleTrust`; localize `LocalSchema` & `About` JSON-LD fields; add Mock Test `Offer` + dynamic `cohort-launch` availability + `citation`/`reviewedBy` + `VideoObject` duration/lite-embed; sync `sitemap.ts` `lastmod` dates.

#### Phase 2 — Local Oran SEO, i18n Parity, CWV Bundle & Accessibility (Weeks 2–3)
1. **Local Bir El Djir NAP & Media (`FIX-10`, `FIX-17`):** Publish verified street/landmark, `31130`, `GeoCoordinates`, `openingHoursSpecification`, active `Facility.mapBtn`, `tel:` link, real classroom photos, `@ieltslab.org` email, vanity Facebook URL, and `/[locale]/about` + Law `18-07` legal pages (`/privacy`, `/terms`, `/refund`).
2. **Bundle & CWV Optimization (`FIX-13`):** Convert 6 static homepage components from `'use client'` to RSC, decouple `@supabase/supabase-js` from public `Navbar`, remove offscreen `priority` on `/amine.jpg`, compress `logo_rounded.png` (`924 KB` -> `<40 KB`), enable AVIF in `next.config.ts`.
3. **Accessibility & i18n (`FIX-12`, `FIX-14`, `FIX-18`, `FIX-19`):** Fix all 19–21 contrast failures, add skip-link, make `FloatingWidget` keyboard-accessible with `0` CLS, add `Navbar` `aria-expanded`, fix `(test-engine)/layout.tsx` `lang`/`dir="rtl"` for `/sample?locale=ar`, localize `waitlist`/`account`, replace physical RTL CSS classes, and fix external 4XX links + CTA copy contradictions.

#### Phase 3 — AEO/GEO Content Expansion, Indexable Tools & Off-Site Authority (Weeks 3–6)
1. **Cohort & Oran Pillar (`FIX-11`):** Expand `first-ielts-preparation-cohort-oran` to `1,200+` words; publish trilingual **Oran IELTS Test Centre & Preparation Guide** covering Imtiyaz El Djazair, Oran neighborhoods, and Western Algeria wilayas.
2. **AEO Upgrades & Indexable Mock Landing (`FIX-16`, `FIX-21`, `FIX-22`):** Add quick-answer summaries + tables + `FAQPage` to the remaining 6 guides (fix Q3 Baridimob answer); launch indexable `/[locale]/mock-test` + Band/CLB calculator; publish `IELTS vs TCF Canada`, `Listening & Reading Strategy`, and `Algeria Multi-City Centres` guides.
3. **Resubmit & Monitor (`FIX-23`):** Run `scripts/submit-indexnow.mjs` after each batch, resubmit `sitemap.xml`, collect verified Google Business Profile reviews, and monitor GSC CTR, Rich Results, and Vercel Analytics conversions.

---

### 6.2 Manual User Action Checklist (Updated 2026-11-18 Post-Automation)

| # | Platform / Area | Current Automated Status & Remaining Owner Action | Linked Fix / Audit ID |
|---|---|---|---|
| **1** | **ChatGPT Business Profile** | **Automated Done:** `openai-business-claim` `TXT` added in Spaceship DNS and OpenAI approved the domain claim (`bizprof_9e2c1b0d73648198b4418f07ee752dea`). **Owner Action Needed:** Click **`Vérifier`** in ChatGPT Business Hub to complete **Persona** identity verification (ID/selfie), then edit/save verified profile fields (`IELTS Lab Oran`, `https://www.ieltslab.org`, `Bir El Djir, Oran 31130`, `+213 780 34 31 03`). | `FIX-05`, `960d059` |
| **2** | **Google Search Console** | **Automated Done:** Confirmed `sc-domain:ieltslab.tech` -> `ieltslab.org` Change of Address active since Aug 21, 2026; started canonical validation (`Validation Started`); added `ieltslab.oran@gmail.com` as Co-Owner alongside `smohammedelamine0@gmail.com`; submitted updated `sitemap.xml` (51 URLs). **Owner Action Optional:** Monitor validation completion email & inspect legacy redirect/404 rows if needed. | `FIX-04`, `GSC-01..13`, `CLAUDE-50` |
| **3** | **Vercel Dashboard** | **Automated Done:** Pinned Serverless Functions to `"regions": ["cdg1"]` (Paris) in `vercel.json`. **Owner Action Optional:** In Vercel -> Project Settings -> Domains, point `ieltslab.org` and `ieltslab.tech` directly to `https://www.ieltslab.org` (`308`) if you want to collapse the apex-to-www redirect hop. | `FIX-01`, `FIX-04`, `GSC-13` |
| **4** | **Bing Webmaster Tools & IndexNow** | **Automated Done:** Verified `https://www.ieltslab.org`, submitted updated `sitemap.xml` (51 URLs), and ran `npm run seo:indexnow` post-deploy (`HTTP 200/202`). **Owner Action:** None required. | `CLAUDE-14`, `FIX-23` |
| **5** | **Google Business Profile (GBP)** | **Automated Done:** Updated Primary Category (`École de langue`), Additional Categories (`Centre de formation`, `Service de soutien scolaire`), Website (`https://www.ieltslab.org/`), and LinkedIn. **Owner Action Needed:** Complete postal/video validation on the open `Valider` tab (`business.google.com/u/0/verify/l/11368165342968278507`), upload real classroom/founder photos when ready, and share the public Google Maps place URL once verified. | `FIX-08`, `FIX-10`, `CLAUDE-40` |
| **6** | **DNS / Email & Social Identity** | **Automated Done:** Added `_dmarc.ieltslab.org` `TXT` record (`v=DMARC1; p=none; rua=mailto:ieltslab.oran@gmail.com`) in Spaceship DNS alongside existing Zoho MX/SPF records. **Owner Action Optional:** Add Zoho DKIM `TXT` record & `contact@ieltslab.org` mailbox in Zoho Mail; claim Facebook vanity URL (`facebook.com/ieltslaboran`); share personal LinkedIn URL & exact YouTube duration if desired. | `FIX-08`, `FIX-10`, `CLAUDE-26`, `CLAUDE-35`, `CLAUDE-36` |
| **7** | **Legal, Payments & Cohort Dates** | **Automated Done:** Published trilingual `/[locale]/privacy` (Algeria Law `18-07`), `/[locale]/terms` (30-day access & refund policy), `/[locale]/about`, and `/[locale]/mock-test`. **Owner Action Optional:** Review legal copy & confirm post-20 Nov 2026 Cohort 2 dates when scheduled. | `FIX-17`, `FIX-20`, `CLAUDE-06`, `CLAUDE-47` |
| **8** | **Analytics & Telemetry** | **Automated Done:** Kept `@vercel/analytics` + `@vercel/speed-insights` and removed bot/prefetch SSR `PRODUCT_VIEWED` DB blocking writes. **Owner Action Optional:** Connect a GA4 Measurement ID (`G-*`) only if you want Google Analytics alongside Vercel Analytics. | `FIX-01`, `FIX-23`, `GA-01`, `GA-02` |


---

## 7. Codebase Remediation Summary Implemented on 2026-11-18

All safe repository-side fixes from `FIX-01` through `FIX-23` have been implemented on top of `b4782dc` (`origin/main`, preserving `e5d21dd` PC-first brand positioning and `aab5df9` strict per-request CSP nonces):

1. **Latency, Caching & Bot-Safe Telemetry (`FIX-01`):**
   - Added `vercel.json` (`"regions": ["cdg1"]` Paris, co-located with `eu-west-3` Supabase and closest to Algeria).
   - Cached `prisma.product.findUnique` in `src/components/MockTestOffer.tsx` via `unstable_cache` (`revalidate: 3600`).
   - Guarded `PRODUCT_VIEWED` recording against bots/crawlers/prefetches and deferred execution via Next.js `after()` so SSR never blocks on Postgres writes while keeping server-side `funnel-wiring.test.ts` intact.
2. **SERP CTR Titles, Descriptions & ISO Dates (`FIX-02`, `FIX-15`):**
   - Trimmed all homepage & article `<title>` tags to `≤60` characters across EN/FR/AR (preserving PC-first positioning and adding Arabic `ايلتس`).
   - Tuned all indexable homepage, `/articles` hub, guide, and trust-page `<meta name="description">` tags to `120–160` characters across EN/FR/AR (fixing `/ar/articles`, `/ar/articles/ielts-one-skill-retake-algeria`, and `/ar/articles/first-ielts-preparation-cohort-oran` short-description warnings).
   - Standardized `+01:00` ISO 8601 timestamps (`toAlgeriaIsoDate`) and synced `sitemap.ts` `LAST_MODIFIED` across all 17 localized paths (**51 sitemap URLs**).
3. **GEO Entity Disambiguation, `/llms.txt`, AI Bots & Modern JS (`FIX-05`, `FIX-23`):**
   - Created `public/llms.txt` and `public/llms-full.txt` disambiguating **IELTS Lab Oran (`https://www.ieltslab.org`)** from `ieltslab.app`/`.io`/`.uz` with verified Algeria IELTS reference data and complete EN/FR/AR URL directory.
   - Added explicit `Allow: /` rules in `src/app/robots.ts` for `Applebot-Extended`, `Meta-ExternalAgent`, `Amazonbot`, and `CCBot`, and removed `/staff/` from `PUBLIC_DISALLOW` so crawlers can read its `noindex` directive.
   - Configured modern `browserslist` in `package.json` (`chrome >= 111`, `edge >= 111`, `firefox >= 115`, `safari >= 16.4`, `ios >= 16.4`) and enabled `formats: ['image/avif', 'image/webp']` in `next.config.ts`.
4. **Semantic Landmarks, Footer NAP, Breadcrumbs & Internal Linking (`FIX-06`, `FIX-09`, `FIX-10`):**
   - Extracted shared Server Component `src/components/SiteFooter.tsx` (`Bir El Djir, Oran 31130, Algeria`, `tel:+213780343103`, WhatsApp, email, active Google Maps search button via `Facility.mapBtn`, localized guides + `/mock-test` + `/about` + `/privacy` + `/terms` links, social icons, and disclaimer), rendered as a sibling after `</main>` on the homepage (`[locale]/page.tsx`), all 13 `/articles*` routes (`[locale]/articles/layout.tsx`), and all new pages.
   - Added keyboard skip-to-content link in `[locale]/layout.tsx` and `<main id="main-content">` across all pages and articles.
   - Moved visible `<ArticleBreadcrumb />` above `<h1>` across all 11 indexable guides and added `first-ielts-preparation-cohort-oran` to `GUIDE_POOL` in `ArticleTrust.tsx`.
5. **Gated/404 Canonical Hygiene & Test-Engine RTL (`FIX-07`, `FIX-12`):**
   - Added `src/app/[locale]/admin/layout.tsx` enforcing server-side `requireStaffPageAal2(['CONTENT_REVIEWER', 'ADMIN'])` before `loading.tsx` streams (returning HTTP `307` instead of `200` Suspense shell) with `noindex, nofollow`, `metadataBase`, and nullified canonical/OG, backed by React `cache()` request deduplication in `src/lib/auth/staff-page.ts`.
   - Updated `src/proxy.ts` to rewrite bare `/staff` to `/_not-found` (`404`), strip `Link:` `hreflang` headers on all non-indexable/404 routes, emit `X-Robots-Tag: noindex, nofollow` on `/admin/*`, `/account/*`, `/auth/*`, `/staff*`, `/sample`, `/waitlist`, and 404s, and forward `x-sample-locale` so `src/app/(test-engine)/layout.tsx` sets `<html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>` (with `Cairo` font) on `/sample?locale=ar|fr|en`.
   - Guarded `[locale]/layout.tsx` `generateMetadata` against invalid locale segments, added `metadataBase` across gated layouts/pages, and added `robots: { index: false, follow: false }` to `src/app/not-found.tsx`.
6. **Unified Schema Graph & Lite YouTube Facade (`FIX-08`):**
   - Unified `#organization`, `#website`, and `#instructor` `@id`s across `LocalSchema.tsx`, `About.tsx`, `ArticleTrust.tsx`, `articles/page.tsx`, `mock-test/page.tsx`, and `about/page.tsx` with zero dangling `@id` references on any route (strictly `url: 'https://www.ieltslab.org'` on `#organization`, `postalCode: '31130'`, `hasMap`, `publisher.logo`, `citation`, `reviewedBy`, localized `areaServed`/`OfferCatalog`/`knowsAbout`, `inLanguage` on all `FAQPage` schemas).
   - Wired `LocalSchema` Cohort `Offer` dynamically to `isCohortDeadlinePassed()` / `cohortStatus.isFull` and added the online Academic Mock Test (`3,900 DZD` `SoftwareApplication` + `Offer`).
   - Added click-to-load `MethodologyVideoFacade.tsx` (`youtube-nocookie.com/embed/r5eiUU3EpHE` allowed in `frame-src` in `content-security-policy.ts`, verified in headless Chrome with 0 CSP violations) and enriched `VideoObject`.
7. **Bundle Slimming, Asset Compression, Contrast, A11y & RTL (`FIX-13`, `FIX-14`, `FIX-18`, `FIX-19`):**
   - Converted `Hero`, `Methodology`, `StopTraining`, `Compare`, `Facility`, and `About` to Server Components; decoupled eager `@supabase/supabase-js` from `Navbar.tsx` via lazy auth-cookie detection; removed offscreen `priority` on `/amine.jpg`; compressed `public/logo_rounded.png` from `923,918 B` to `25,352 B` (`512×512` PNG).
   - Fixed all WCAG AA contrast tokens (including `.testimonial-card .title-text` in `globals.css`), landmark containment (`<nav>` on `#mobile-nav-menu` with `invisible` when closed, `<aside>` on `FloatingWidget` and `ArticleMobileCta`), and assistive-technology `onClick` support on `FloatingWidget` — verified with `axe-core` in live headless Chrome across desktop and mobile (`0` violations across all public marketing, guide, and trust routes); replaced physical LTR CSS classes and hardcoded `&rarr;` arrows with RTL-aware equivalents; localized `waitlist`, `simulation-platform` (live platform copy), `account`, and `orders`; and replaced broken/redirecting external links.
8. **Content Expansion, Indexable Mock Landing & Law 18-07 Legal Pages (`FIX-11`, `FIX-16`, `FIX-17`, `FIX-21`):**
   - Expanded `first-ielts-preparation-cohort-oran` (`900+` words across EN/FR/AR) and `overcoming-speaking-anxiety` (`690+` words), added Answer-First summaries + tables + localized `FAQPage` schemas across all remaining guides, and clarified Q3 CIB/Edahabia vs Baridimob vs HSBC cash in `how-to-register-algeria`.
   - Created trilingual indexable `/[locale]/mock-test` (`800+` words across EN/FR/AR), `/[locale]/about`, `/[locale]/privacy` (Algeria Law `18-07`), and `/[locale]/terms`.
