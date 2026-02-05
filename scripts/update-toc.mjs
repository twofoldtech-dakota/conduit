import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import toc from 'markdown-toc';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && p.endsWith('.md')) yield p;
  }
}

const root = 'docs';
for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8');
  const updated = toc.insert(content);
  if (updated !== content) {
    writeFileSync(file, updated);
    console.log(`updated TOC: ${file}`);
  }
}
