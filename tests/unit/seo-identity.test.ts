import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CANONICAL_ORIGIN,
  SITE_URL,
  LOCALES,
  INDEXNOW_KEY,
  OG_LOCALE_MAP,
  buildAlternates,
  localizedUrl,
  buildArticleMetadata,
  buildWebsitePageMetadata,
  GUIDE_POOL,
  buildLocaleRootMetadata,
  defaultOgImageUrl,
} from '@/lib/seo';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

test('SEO: Canonical origin source of truth', () => {
  assert.equal(CANONICAL_ORIGIN, 'https://www.ieltslab.org');
  assert.equal(SITE_URL, 'https://www.ieltslab.org');
});

test('SEO: buildAlternates produces valid, self-referencing hreflang and canonical', () => {
  for (const locale of LOCALES) {
    const alternates = buildAlternates(locale);

    // Canonical must point to the preferred localized URL on the canonical origin
    assert.equal(alternates.canonical, `https://www.ieltslab.org/${locale}`);

    // Must have all supported locales
    for (const targetLocale of LOCALES) {
      assert.equal(
        alternates.languages[targetLocale],
        `https://www.ieltslab.org/${targetLocale}`,
        `Missing or incorrect hreflang for ${targetLocale} on ${locale} page`
      );
    }

    // Must have self-referencing hreflang
    assert.equal(
      alternates.languages[locale],
      alternates.canonical,
      `Self-referencing alternate must match canonical for ${locale}`
    );

    // x-default must point to English default
    assert.equal(alternates.languages['x-default'], 'https://www.ieltslab.org/en');
  }
});

test('SEO: buildAlternates for sub-paths (articles)', () => {
  const path = 'articles/academic-vs-general';
  for (const locale of LOCALES) {
    const alternates = buildAlternates(locale, path);
    assert.equal(alternates.canonical, `https://www.ieltslab.org/${locale}/${path}`);
    assert.equal(alternates.languages.en, `https://www.ieltslab.org/en/${path}`);
    assert.equal(alternates.languages.fr, `https://www.ieltslab.org/fr/${path}`);
    assert.equal(alternates.languages.ar, `https://www.ieltslab.org/ar/${path}`);
    assert.equal(alternates.languages['x-default'], `https://www.ieltslab.org/en/${path}`);
  }
});

test('SEO: localizedUrl helper produces exact canonical URLs', () => {
  assert.equal(localizedUrl('en'), 'https://www.ieltslab.org/en');
  assert.equal(localizedUrl('fr', 'articles'), 'https://www.ieltslab.org/fr/articles');
  assert.equal(localizedUrl('ar', '/articles/how-to-register-algeria'), 'https://www.ieltslab.org/ar/articles/how-to-register-algeria');
});

test('SEO: buildArticleMetadata produces canonical Open Graph and alternates', () => {
  const meta = buildArticleMetadata({
    locale: 'en',
    slug: 'how-to-register-algeria',
    title: 'How to Register',
    description: 'Guide to registering',
  });

  assert.equal(meta.metadataBase ? new URL(meta.metadataBase).origin : '', 'https://www.ieltslab.org');
  assert.equal(meta.openGraph?.url, 'https://www.ieltslab.org/en/articles/how-to-register-algeria');
  assert.equal(meta.alternates?.canonical, 'https://www.ieltslab.org/en/articles/how-to-register-algeria');
});

test('SEO: Sitemap entries all use CANONICAL_ORIGIN and have no legacy domains', () => {
  const entries = sitemap();
  assert.ok(entries.length > 0, 'Sitemap must have entries');

  for (const entry of entries) {
    assert.ok(
      entry.url.startsWith('https://www.ieltslab.org/'),
      `Sitemap URL must start with canonical origin, got: ${entry.url}`
    );
    assert.ok(!entry.url.includes('ieltslab.app'), `Sitemap must not contain ieltslab.app: ${entry.url}`);
    assert.ok(!entry.url.includes('ieltslaboran.com'), `Sitemap must not contain ieltslaboran.com: ${entry.url}`);
    assert.ok(!entry.url.includes('ieltslab.tech'), `Sitemap must not contain ieltslab.tech: ${entry.url}`);

    if (entry.alternates?.languages) {
      for (const [lang, altUrl] of Object.entries(entry.alternates.languages)) {
        assert.ok(
          (altUrl as string).startsWith('https://www.ieltslab.org/'),
          `Alternate URL for ${lang} must start with canonical origin, got: ${altUrl}`
        );
        assert.ok(!(altUrl as string).includes('ieltslab.app'), `Alternate must not contain ieltslab.app: ${altUrl}`);
        assert.ok(!(altUrl as string).includes('ieltslaboran.com'), `Alternate must not contain ieltslaboran.com: ${altUrl}`);
        assert.ok(!(altUrl as string).includes('ieltslab.tech'), `Alternate must not contain ieltslab.tech: ${altUrl}`);
      }
    }
  }
});

test('SEO: Robots configuration references canonical sitemap and allows AI search bots', () => {
  const robotsConfig = robots();
  assert.equal(robotsConfig.sitemap, 'https://www.ieltslab.org/sitemap.xml');
  assert.ok(robotsConfig.rules, 'Robots must define crawl rules');
  assert.equal(robotsConfig.host, undefined, 'Robots should not define obsolete Host directive');

  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
  const oaiRule = rules.find((r) => {
    const agents = Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent];
    return agents.includes('OAI-SearchBot');
  });
  assert.ok(oaiRule, 'OAI-SearchBot must have an explicit rule in robots.ts');
  assert.equal(oaiRule.allow, '/');
});

test('SEO: Branded 1200x630 OG image, OG locales, and IndexNow key file exist', () => {
  assert.equal(defaultOgImageUrl(), 'https://www.ieltslab.org/og-default.png');
  assert.equal(OG_LOCALE_MAP.en, 'en_US');
  assert.equal(OG_LOCALE_MAP.fr, 'fr_FR');
  assert.equal(OG_LOCALE_MAP.ar, 'ar_DZ');

  const pageMeta = buildWebsitePageMetadata({
    locale: 'fr',
    path: 'articles',
    title: 'Guides IELTS',
    description: 'Guides IELTS en Algérie',
  });
  assert.equal(pageMeta.openGraph?.url, 'https://www.ieltslab.org/fr/articles');
  assert.equal((pageMeta.openGraph as { locale?: string })?.locale, 'fr_FR');
  const ogImages = pageMeta.openGraph?.images as Array<{ url: string; width: number; height: number }>;
  assert.equal(ogImages?.[0]?.url, 'https://www.ieltslab.org/og-default.png');
  assert.equal(ogImages?.[0]?.width, 1200);
  assert.equal(ogImages?.[0]?.height, 630);

  const ogPng = fs.readFileSync(path.join(process.cwd(), 'public', 'og-default.png'));
  assert.equal(ogPng.readUInt32BE(16), 1200);
  assert.equal(ogPng.readUInt32BE(20), 630);

  const indexNowPath = path.join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`);
  assert.equal(fs.readFileSync(indexNowPath, 'utf8').trim(), INDEXNOW_KEY);
});

test('Localization: FR and AR dictionaries have translated testimonials and UI chrome', () => {
  const fr = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
  const ar = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', 'ar.json'), 'utf8'));

  assert.equal(fr.Hero.badge.includes('Oran'), true);
  assert.notEqual(fr.Hero.reserve, 'APPLY FOR THE CAMP');
  assert.notEqual(ar.Hero.reserve, 'APPLY FOR THE CAMP');
  assert.equal(Array.isArray(fr.Testimonials.items) && fr.Testimonials.items.length === 3, true);
  assert.equal(Array.isArray(ar.Testimonials.items) && ar.Testimonials.items.length === 3, true);
  assert.equal(fr.Testimonials.items[0].quote.includes('I was terrified'), false);
  assert.equal(ar.Testimonials.items[0].quote.includes('I was terrified'), false);
  assert.notEqual(fr.Intake.statusLabReady, 'Lab Ready');
  assert.notEqual(ar.Intake.statusLabReady, 'Lab Ready');
  assert.notEqual(fr.Facility.disclaimer, 'IELTS Lab Oran is an independent preparation provider and is not affiliated with IELTS, the British Council, IDP, or Cambridge University Press & Assessment.');
});


test('SEO: All indexable article SEO titles (<=60 chars) and descriptions (120..160 chars) meet SERP bounds', async () => {
  const {
    articleSeoTitle,
    articleDescription,
    STANDALONE_PAGE_SEO_TITLES,
    STANDALONE_PAGE_SEO_DESCRIPTIONS,
  } = await import('@/lib/seo');
  const { cohortLaunch } = await import('@/lib/cohort-launch');
  const { osrCopy } = await import('@/lib/one-skill-retake');
  const { getArticlesListContent } = await import('@/lib/articleContent');

  const slugs = [
    'academic-vs-general',
    'computer-vs-paper-ielts',
    'free-ielts-resources-algeria',
    'how-to-register-algeria',
    'ielts-vs-toefl-canada',
    'italy-student-visa-english-tests-algeria',
    'overcoming-speaking-anxiety',
    'tlscontact-capago',
    'writing-task-2-tactics',
  ] as const;

  for (const locale of LOCALES) {
    for (const slug of slugs) {
      const title = articleSeoTitle(locale, slug);
      const desc = articleDescription(locale, slug);
      assert.ok(
        title.length >= 25 && title.length <= 60,
        `[${locale}] ${slug} title length ${title.length} out of [25..60]: "${title}"`,
      );
      assert.ok(
        desc.length >= 120 && desc.length <= 160,
        `[${locale}] ${slug} description length ${desc.length} out of [120..160]: "${desc}"`,
      );
    }

    assert.ok(cohortLaunch[locale].title.length <= 60, `[${locale}] cohort title > 60 chars`);
    assert.ok(
      cohortLaunch[locale].desc.length >= 120 && cohortLaunch[locale].desc.length <= 160,
      `[${locale}] cohort desc length ${cohortLaunch[locale].desc.length} out of [120..160]`,
    );

    assert.ok(osrCopy[locale].title.length <= 60, `[${locale}] OSR title > 60 chars`);
    assert.ok(
      osrCopy[locale].desc.length >= 120 && osrCopy[locale].desc.length <= 160,
      `[${locale}] OSR desc length ${osrCopy[locale].desc.length} out of [120..160]`,
    );

    const listContent = getArticlesListContent(locale);
    const hubTitle = `${listContent.pageTitle} | IELTS Lab Oran`;
    assert.ok(hubTitle.length <= 60, `[${locale}] articles hub title > 60 chars`);
    assert.ok(
      listContent.pageSubtitle.length >= 120 && listContent.pageSubtitle.length <= 160,
      `[${locale}] articles hub description length ${listContent.pageSubtitle.length} out of [120..160]`,
    );
  }

  for (const slug of ['mock-test', 'about', 'privacy', 'terms'] as const) {
    for (const locale of LOCALES) {
      const title = STANDALONE_PAGE_SEO_TITLES[slug][locale];
      const desc = STANDALONE_PAGE_SEO_DESCRIPTIONS[slug][locale];
      assert.ok(
        title.length >= 25 && title.length <= 60,
        `[${locale}] /${slug} title length ${title.length} out of [25..60]: "${title}"`,
      );
      assert.ok(
        desc.length >= 120 && desc.length <= 160,
        `[${locale}] /${slug} description length ${desc.length} out of [120..160]: "${desc}"`,
      );
    }
  }
});

test('SEO: Homepage metadata titles are <=60 chars and preserve PC-first positioning across EN/FR/AR', () => {
  for (const locale of LOCALES) {
    const meta = buildLocaleRootMetadata(locale);
    const title = String(meta.title ?? '');
    const description = String(meta.description ?? '');
    assert.ok(title.length >= 35 && title.length <= 60, `[${locale}] homepage title length ${title.length} out of [35..60]: "${title}"`);
    assert.ok(description.length >= 120 && description.length <= 160, `[${locale}] homepage desc length ${description.length} out of [120..160]`);
  }
  assert.match(String(buildLocaleRootMetadata('en').title), /Computer-Based/i);
  assert.match(String(buildLocaleRootMetadata('fr').title), /ordinateur/i);
  assert.match(String(buildLocaleRootMetadata('ar').title), /الكمبيوتر/u);

  const invalidMeta = buildLocaleRootMetadata('staff');
  assert.equal(invalidMeta.alternates?.canonical, null, 'Non-locale route must not leak /en canonical');
});

test('GEO & Crawl: llms.txt, llms-full.txt, extended AI bots, 51-URL sitemap, GUIDE_POOL, cdg1 region & compressed logo', () => {
  const llmsTxt = fs.readFileSync(path.join(process.cwd(), 'public', 'llms.txt'), 'utf8');
  const llmsFullTxt = fs.readFileSync(path.join(process.cwd(), 'public', 'llms-full.txt'), 'utf8');
  assert.match(llmsTxt, /https:\/\/www\.ieltslab\.org/);
  assert.match(llmsTxt, /unaffiliated/i);
  assert.match(llmsFullTxt, /https:\/\/www\.ieltslab\.org\/en\/mock-test/);

  const robotsConfig = robots();
  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
  const allAgents = rules.flatMap((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]));
  for (const bot of ['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot', 'Applebot-Extended', 'Meta-ExternalAgent', 'Amazonbot', 'CCBot']) {
    assert.ok(allAgents.includes(bot), `robots.ts must explicitly configure ${bot}`);
  }
  for (const rule of rules) {
    const disallows = Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
    assert.ok(!disallows.includes('/staff/'), 'robots.ts must not block /staff/ so noindex can be read');
  }

  const entries = sitemap();
  assert.equal(entries.length, 51, 'Sitemap must include all 17 localized paths x 3 locales = 51 URLs');
  for (const requiredPath of ['mock-test', 'about', 'privacy', 'terms', 'articles/first-ielts-preparation-cohort-oran']) {
    for (const locale of LOCALES) {
      assert.ok(
        entries.some((e) => e.url === `https://www.ieltslab.org/${locale}/${requiredPath}`),
        `Sitemap missing /${locale}/${requiredPath}`,
      );
    }
  }

  assert.equal(GUIDE_POOL.length, 11, 'GUIDE_POOL must contain all 11 indexable guides');
  assert.ok(GUIDE_POOL.some((g) => g.slug === 'first-ielts-preparation-cohort-oran'));

  const vercelJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
  assert.deepEqual(vercelJson.regions, ['cdg1']);

  const logoSize = fs.statSync(path.join(process.cwd(), 'public', 'logo_rounded.png')).size;
  assert.ok(logoSize < 50_000, `public/logo_rounded.png must be <50KB, got ${logoSize} bytes`);
});
