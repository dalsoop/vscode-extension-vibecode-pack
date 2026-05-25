// Intercept `require('vscode')` from any test or imported source file.
const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'vscode') return require.resolve('./_mocks/vscode.cjs');
  return orig.call(this, request, ...args);
};
