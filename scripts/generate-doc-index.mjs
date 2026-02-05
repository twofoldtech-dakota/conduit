import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dirs = [
  'docs/getting-started',
  'docs/guides',
  'docs/reference',
  'docs/architecture',
  'docs/operations',
  'docs/contributing'
];

for (const dir of dirs) {
  let files = [];
  try {
    files = readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.md') && d.name.toLowerCase() !== 'readme.md')
      .map(d => d.name)
      .sort();
  } catch {
    // ignore missing dirs
    continue;
  }

  const lines = ['# ' + titleFromDir(dir), ''];
  for (const f of files) lines.push(`- [${titleFromFile(f)}](${f})`);
  writeFileSync(join(dir, 'README.md'), lines.join('\n') + '\n');
}

function titleFromDir(dir) {
  const name = dir.split('/').pop() || '';
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function titleFromFile(file) {
  return file.replace(/\.md$/i, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
