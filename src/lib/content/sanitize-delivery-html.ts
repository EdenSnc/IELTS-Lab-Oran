import 'server-only';

import { load } from 'cheerio';

const BLOCKED_ELEMENTS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'button',
  'input',
  'textarea',
  'select',
  'svg',
  'math',
  'template',
  'noscript',
].join(',');
const BLOCKED_URL_ATTRIBUTES = new Set([
  'action',
  'background',
  'cite',
  'data',
  'formaction',
  'ping',
  'poster',
  'srcdoc',
  'srcset',
]);
const SAFE_STYLE_PROPERTIES = new Set([
  'position',
  'aspect-ratio',
  'width',
  'max-width',
  'height',
  'top',
  'right',
  'bottom',
  'left',
]);

function sanitizeStyle(value: string) {
  return value
    .split(';')
    .flatMap((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 1) return [];
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const cssValue = declaration.slice(separator + 1).trim();
      if (!SAFE_STYLE_PROPERTIES.has(property)) return [];
      if (!/^(?:absolute|relative|\d+(?:\.\d+)?(?:%|px)?|\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)$/i.test(cssValue)) {
        return [];
      }
      return [`${property}:${cssValue}`];
    })
    .join(';');
}

/**
 * Treat imported/database HTML as untrusted. Interactive controls are created
 * by React, never accepted from content, and executable markup is discarded.
 */
export function sanitizeDeliveryHtml(html: string | null) {
  if (!html) return html;
  const $ = load(html, null, false);
  $(BLOCKED_ELEMENTS).remove();
  $('*').each((_, element) => {
    if (!('attribs' in element)) return;
    for (const [rawName, rawValue] of Object.entries(element.attribs)) {
      const name = rawName.toLowerCase();
      if (name.startsWith('on') || name.includes(':') || BLOCKED_URL_ATTRIBUTES.has(name)) {
        $(element).removeAttr(rawName);
        continue;
      }
      if (name === 'href') {
        if (!rawValue.startsWith('#')) $(element).removeAttr(rawName);
        continue;
      }
      if (name === 'src') {
        if (!rawValue.startsWith('/api/test-assets/')) $(element).removeAttr(rawName);
        continue;
      }
      if (name === 'style') {
        const style = sanitizeStyle(rawValue);
        if (style) $(element).attr('style', style);
        else $(element).removeAttr('style');
      }
    }
  });
  return $.html();
}
