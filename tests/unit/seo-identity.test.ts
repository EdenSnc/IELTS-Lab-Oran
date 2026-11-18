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

test('Landing copy: First cohort does not claim dedicated PCs or classroom workstations', () => {
  const enRaw = fs.readFileSync(path.join(process.cwd(), 'messages', 'en.json'), 'utf8');
  const frRaw = fs.readFileSync(path.join(process.cwd(), 'messages', 'fr.json'), 'utf8');
  const arRaw = fs.readFileSync(path.join(process.cwd(), 'messages', 'ar.json'), 'utf8');
  const schemaRaw = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'LocalSchema.tsx'), 'utf8');
  const launchRaw = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'cohort-launch.ts'), 'utf8');

  for (const forbidden of ['dedicated workstation', '4 skills on PC', 'on dedicated PCs', '100% PC training', '8-seat PC lab']) {
    assert.equal(enRaw.includes(forbidden), false, `en.json must not contain "${forbidden}"`);
    assert.equal(schemaRaw.includes(forbidden), false, `LocalSchema.tsx must not contain "${forbidden}"`);
    assert.equal(launchRaw.includes(forbidden), false, `cohort-launch.ts must not contain "${forbidden}"`);
  }
  for (const forbidden of ['poste PC dédié', '4 compétences sur PC', 'sur ordinateurs dédiés', '100% sur PC', '8 postes']) {
    assert.equal(frRaw.includes(forbidden), false, `fr.json must not contain "${forbidden}"`);
    assert.equal(schemaRaw.includes(forbidden), false, `LocalSchema.tsx must not contain "${forbidden}"`);
  }
  for (const forbidden of ['كمبيوتر خاص بك', 'المهارات الأربع على الكمبيوتر', 'على حواسيب مخصصة', '8 أجهزة']) {
    assert.equal(arRaw.includes(forbidden), false, `ar.json must not contain "${forbidden}"`);
    assert.equal(schemaRaw.includes(forbidden), false, `LocalSchema.tsx must not contain "${forbidden}"`);
  }
});
