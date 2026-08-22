import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDeliveryHtml } from '@/lib/content/sanitize-delivery-html';

test('delivery HTML sanitizer preserves required layout markup and private assets', () => {
  const sanitized = sanitizeDeliveryHtml(`
    <section class="flow" data-question-id="q-1" aria-label="Flow chart">
      <img src="/api/test-assets/asset-id" alt="Map" draggable="false">
      <span id="answer" style="position:absolute;left:25%;color:red">Answer</span>
      <a href="#answer">Jump</a>
    </section>
  `) ?? '';

  assert.match(sanitized, /class="flow"/);
  assert.match(sanitized, /data-question-id="q-1"/);
  assert.match(sanitized, /aria-label="Flow chart"/);
  assert.match(sanitized, /src="\/api\/test-assets\/asset-id"/);
  assert.match(sanitized, /style="position:absolute;left:25%"/);
  assert.match(sanitized, /href="#answer"/);
});

test('delivery HTML sanitizer removes executable markup and URL-bearing attributes', () => {
  const sanitized = sanitizeDeliveryHtml(`
    <script>alert(1)</script>
    <style>@import url(https://attacker.example/x)</style>
    <svg><a xlink:href="javascript:alert(1)"><text>bad</text></a></svg>
    <math><mtext href="javascript:alert(1)">bad</mtext></math>
    <template><img src="/api/test-assets/hidden"></template>
    <div onclick="alert(1)" style="background:url(javascript:alert(1));width:20px">
      <img src="https://attacker.example/x" srcset="https://attacker.example/x 2x">
      <video poster="https://attacker.example/x"></video>
      <a href="javascript:alert(1)" ping="https://attacker.example/x">unsafe</a>
    </div>
  `) ?? '';

  assert.doesNotMatch(sanitized, /<\/?(?:script|style|svg|math|template)\b|onclick|xlink|javascript|attacker|srcset|poster|ping/i);
  assert.match(sanitized, /style="width:20px"/);
});
