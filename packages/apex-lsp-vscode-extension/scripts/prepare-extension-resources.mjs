import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const grammarSource = resolve(
  dirname(require.resolve('@salesforce/apex-tmlanguage/package.json')),
  'grammars',
);

await cp(grammarSource, resolve(packageRoot, 'grammars'), {
  recursive: true,
});
await mkdir(resolve(packageRoot, 'out'), { recursive: true });
const packageNlsFiles = (await readdir(packageRoot)).filter(
  (file) => file.startsWith('package.nls') && file.endsWith('.json'),
);
for (const source of [...packageNlsFiles, 'language-configuration.json']) {
  await cp(resolve(packageRoot, source), resolve(packageRoot, 'out', source));
}
