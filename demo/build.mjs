// Assembles dist-demo/artifact.html: the demo bundle + CSS inlined into one self-contained page.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
execSync('npx vite build -c demo/vite.config.ts', { stdio: 'inherit' });
const css = readFileSync('dist-demo/demo.css', 'utf8');
const js = readFileSync('dist-demo/demo.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const out = readFileSync('demo/template.html', 'utf8').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
writeFileSync('dist-demo/artifact.html', out);
console.log('artifact.html', (out.length / 1024).toFixed(0) + ' KB');
