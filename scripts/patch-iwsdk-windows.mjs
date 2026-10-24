// Works around an IWSDK 1.1.0-rc.2 bug on Windows: the dev server reads its own
// process start time via powershell.exe with a 1.5 s timeout. A cold PowerShell
// start on many Windows PCs takes longer, so startup fails with
// "Cannot establish this process birth identity". This raises that timeout to 15 s.
// Runs automatically after `npm install` (postinstall). Safe to run repeatedly.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const files = [
  'node_modules/@iwsdk/vite-plugin-dev/dist/index.js',
  'node_modules/@iwsdk/cli/dist/cli.js',
  'node_modules/@iwsdk/cli/dist/index.js',
  'node_modules/@iwsdk/cli/dist/runtime-owner.js',
  'node_modules/@iwsdk/cli/dist/runtime-files.js',
];
const pattern = /(StartTime\.ToUniversalTime\(\)\.Ticks`,\s*\],\s*\{\s*encoding: 'utf8',\s*timeout: )1500\b/g;

let patched = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  const out = src.replace(pattern, (_m, head) => { patched++; return head + '15000'; });
  if (out !== src) writeFileSync(file, out);
}
console.log(`[patch-iwsdk-windows] PowerShell timeout raised in ${patched} place(s).`);
