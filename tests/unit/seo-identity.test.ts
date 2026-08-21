import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_ORIGIN,
  SITE_URL,
  LOCALES,
  buildAlternates,
  localizedUrl,
  buildArticleMetadata,
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

test('SEO: Robots configuration references canonical sitemap and avoids Host directive', () => {
  const robotsConfig = robots();
  assert.equal(robotsConfig.sitemap, 'https://www.ieltslab.org/sitemap.xml');
  assert.ok(robotsConfig.rules, 'Robots must define crawl rules');
  assert.equal(robotsConfig.host, undefined, 'Robots should not define obsolete Host directive');
});
