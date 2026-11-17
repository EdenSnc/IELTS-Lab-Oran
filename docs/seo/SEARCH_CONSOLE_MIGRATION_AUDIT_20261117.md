# Google Search Console & Domain Migration Audit (17 November 2026)

Audited at: `2026-11-17T21:53:34.377348+00:00`

## 1. Live Redirect & Canonical Chain Verification

| Input URL | Hop Chain (Status -> Location) |
|---|---|
| `http://ieltslab.tech/` | `308` (https://ieltslab.tech/) -> `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `https://ieltslab.tech/` | `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `https://www.ieltslab.tech/` | `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `https://www.ieltslab.tech/fr/articles/how-to-register-algeria` | `308` (https://www.ieltslab.org/fr/articles/how-to-register-algeria) -> `200` |
| `https://ieltslab.tech/ar` | `308` (https://www.ieltslab.org/ar) -> `200` |
| `https://ieltslab.tech/sitemap.xml` | `308` (https://www.ieltslab.org/sitemap.xml) -> `200` |
| `http://ieltslab.org/` | `308` (https://ieltslab.org/) -> `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `https://ieltslab.org/` | `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `http://www.ieltslab.org/` | `308` (https://www.ieltslab.org/) -> `308` (/en) -> `200` |
| `https://www.ieltslab.org/` | `308` (/en) -> `200` |
| `https://www.ieltslab.org/en` | `200` |
| `https://www.ieltslab.org/fr` | `200` |
| `https://www.ieltslab.org/ar` | `200` |
| `https://www.ieltslab.org/fr/articles/how-to-register-algeria` | `200` |

## 2. DNS TXT Records (`google-site-verification`)

- **`ieltslab.tech`**:
  - `google-site-verification=OsaQYak8sfGizdgNojtHVVoarnozne96PvjY89KV2N4`
- **`ieltslab.org`**:
  - `zoho-verification=zb31779159.zmverify.zoho.com`
  - `v=spf1 include:zohomail.com ~all`
  - `google-site-verification=JdF_M0i4FTx1W_cIYYWOKBK8Q_U4lLBKAQoQXBZptgA`

## 3. Search Console Evidence (Exports dated 2026-11-16)

- **Canonical Host Selected by Google**: `https://www.ieltslab.org` (18 indexed URLs as of 2026-11-13). However, legacy `http://ieltslab.org/` still retained **1,239 impressions / 6 clicks** in the 3-month window.
- **Coverage Drilldown (`Duplicate, Google chose different canonical than user`)**:
  - `https://www.ieltslab.org/fr` (last crawled `2026-10-28`) — caused by the pre-16 Nov `proxy.ts` locale-header bug serving English headings/content on `/fr` URLs; fixed in commit `34de4fe`, requires Search Console validation re-run after localization fixes.
  - `https://www.ieltslab.org/fr/articles/overcoming-speaking-anxiety` (last crawled `2026-08-22`) — caused by the pre-16 Nov `proxy.ts` locale-header bug serving English headings/content on `/fr` URLs; fixed in commit `34de4fe`, requires Search Console validation re-run after localization fixes.
  - `https://www.ieltslab.org/fr/articles/free-ielts-resources-algeria` (last crawled `2026-08-22`) — caused by the pre-16 Nov `proxy.ts` locale-header bug serving English headings/content on `/fr` URLs; fixed in commit `34de4fe`, requires Search Console validation re-run after localization fixes.

### Coverage Issues Summary

| Reason | Source | Validation | Pages |
|---|---|---|---|
| Page with redirect | Website | Failed | 6 |
| Redirect error | Website | Failed | 2 |
| Excluded by ‘noindex’ tag | Website | Failed | 2 |
| Duplicate, Google chose different canonical than user | Google systems | Failed | 3 |
| Not found (404) | Website | Not Started | 2 |
| Discovered - currently not indexed | Google systems | Not Started | 11 |
| Crawled - currently not indexed | Google systems | N/A | 1 |

### Top URLs by Impressions & CTR Gaps

| URL | Clicks | Impressions | CTR | Position |
|---|---|---|---|---|
| `https://www.ieltslab.org/fr/articles/how-to-register-algeria` | 14 | 4173 | 0.34% | 8.87 |
| `https://www.ieltslab.org/en` | 10 | 376 | 2.66% | 7.81 |
| `http://ieltslab.org/` | 6 | 1239 | 0.48% | 3.88 |
| `https://www.ieltslab.org/en/articles/how-to-register-algeria` | 4 | 857 | 0.47% | 7.92 |
| `https://www.ieltslab.org/ar/articles/italy-student-visa-english-tests-algeria` | 4 | 85 | 4.71% | 5.69 |
| `https://www.ieltslab.org/en/articles/italy-student-visa-english-tests-algeria` | 3 | 532 | 0.56% | 5.4 |
| `https://www.ieltslab.org/fr` | 2 | 75 | 2.67% | 10.11 |
| `https://www.ieltslab.org/fr/articles/italy-student-visa-english-tests-algeria` | 1 | 55 | 1.82% | 6.42 |
| `https://www.ieltslab.org/en/articles/free-ielts-resources-algeria` | 1 | 42 | 2.38% | 6.6 |
| `https://www.ieltslab.org/ar/articles/how-to-register-algeria` | 0 | 69 | 0% | 9.65 |
| `https://www.ieltslab.org/fr/articles/computer-vs-paper-ielts` | 0 | 28 | 0% | 6.71 |
| `https://www.ieltslab.org/ar/articles/computer-vs-paper-ielts` | 0 | 17 | 0% | 8.41 |
| `https://www.ieltslab.org/en/articles/writing-task-2-tactics` | 0 | 17 | 0% | 11 |
| `https://www.ieltslab.org/en/articles` | 0 | 15 | 0% | 6.67 |
| `https://www.ieltslab.org/fr/articles/writing-task-2-tactics` | 0 | 10 | 0% | 7.2 |
| `https://www.ieltslab.org/en/articles/overcoming-speaking-anxiety` | 0 | 6 | 0% | 19.5 |
| `https://www.ieltslab.org/ar/articles/tlscontact-capago` | 0 | 1 | 0% | 7 |

### Monthly Impression Trend
- September 2026 total impressions: **4007** (Peak day: `2026-09-07` with **255** impressions — aligns with seasonal Aug/Sep IELTS peak and Italy Embassy 27 Aug notice).
- October 2026 total impressions: **2332**.
- November 1–14, 2026 partial total impressions: **692**.
- Cause of drop after September: combination of (a) normal Oct/Nov post-peak seasonality, (b) `http://ieltslab.org/` legacy canonical split, and (c) `/fr` duplicate canonicalization from `proxy.ts` locale header regression (3 URLs).

## 4. Google Change of Address Requirements Checklist (`support.google.com/webmasters/answer/9370220`)
- **301/308 Permanent Path-Preserving Redirects**: Verified (`ieltslab.tech` & `www.ieltslab.tech` & apex `ieltslab.org` -> `https://www.ieltslab.org/...`).
- **Verification TXT Records on Both Domains**: Present on both `ieltslab.tech` and `ieltslab.org`.
- **Owner-Only Manual Check in Search Console UI**: Change of Address tool status and `.tech` Domain property inspection can only be read/submitted inside Google Search Console logged in as the verified owner (`ieltslab.oran@gmail.com`).