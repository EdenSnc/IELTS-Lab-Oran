/* eslint-disable @typescript-eslint/no-require-imports */
if (typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', { value: () => 0 });
}

// The delivery smoke test executes server modules directly, outside Next.js'
// resolver. Treat the marker-only package as the no-op it is in a server build.
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};
