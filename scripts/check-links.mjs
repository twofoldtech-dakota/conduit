import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import linkCheck from 'link-check';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && p.endsWith('.md')) yield p;
  }
}

const cfg = JSON.parse(readFileSync('.mlc.json', 'utf8'));
const ignorePatterns = (cfg.ignorePatterns || []).map(p => new RegExp(p.pattern));

const files = Array.from(walk('docs'));
let failures = 0;

function shouldIgnore(url) {
  if (!/^https?:\/\//i.test(url)) return true; // ignore non-http(s)
  return ignorePatterns.some(re => re.test(url));
}

for (const file of files) {
  const markdown = readFileSync(file, 'utf8');
  const urls = new Set(
    Array.from(markdown.matchAll(/\]\(([^)\s]+)\)/g)).map(m => m[1])
  );

  const httpUrls = Array.from(urls).filter(u => !shouldIgnore(u));
  if (httpUrls.length === 0) {
    console.log(`ok (no external links): ${file}`);
    continue;
  }

  console.log(`checking ${httpUrls.length} links in ${file}`);
  for (const url of httpUrls) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      linkCheck(url, { timeout: cfg.timeout || '10s', retryOn429: cfg.retryOn429 !== false }, (err, res) => {
        if (err) {
          console.error(`  error: ${url} -> ${err.message}`);
          failures++;
          return resolve();
        }
        if (res.status === 'dead') {
          console.error(`  dead: ${url} (${res.statusCode || 'no status'})`);
          failures++;
        } else {
          console.log(`  ok: ${url}`);
        }
        resolve();
      });
    });
  }
}

if (failures) {
  console.error(`Total broken external links: ${failures}`);
  process.exit(1);
}
