import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';

const root = process.cwd();
const skipDirs = new Set(['.git', 'node_modules', '.remember', '.claude']);
const ignoreProtos = ['http://', 'https://', '//', 'mailto:', 'tel:', 'javascript:', 'data:'];

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!skipDirs.has(e)) out = out.concat(walk(p));
    } else if (e.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function extractRefs(html) {
  const refs = [];
  const re = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) refs.push(m[1]);
  return refs;
}

const broken = [];
const files = walk(root);

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  for (const r of extractRefs(html)) {
    if (!r) continue;
    if (ignoreProtos.some((p) => r.startsWith(p))) continue;
    if (r.startsWith('#')) continue;
    if (r.includes('${')) continue; // template-literal refs resolved at runtime
    const target = resolve(dirname(f), r.split('#')[0].split('?')[0]);
    let ok = existsSync(target);
    if (ok && statSync(target).isDirectory()) ok = existsSync(join(target, 'index.html'));
    if (!ok) broken.push({ file: f, ref: r });
  }
}

if (broken.length) {
  console.log(`BROKEN LINKS (${broken.length}):`);
  for (const b of broken) console.log(`  ${b.file}  ->  ${b.ref}`);
  process.exit(1);
} else {
  console.log(`OK: 0 broken internal links across ${files.length} HTML files.`);
}
