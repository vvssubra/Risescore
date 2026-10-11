// Loads the verbatim v2 engine and v3 toolkit library extracted from the supplied prototype.
// These files are the golden reference: the TypeScript port must match them exactly.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RISE = require('./engine.v2.cjs');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'toolkits.v3.js'), 'utf8'), ctx);
module.exports = { RISE, RISE_TOOLKITS: ctx.RISE_TOOLKITS };
