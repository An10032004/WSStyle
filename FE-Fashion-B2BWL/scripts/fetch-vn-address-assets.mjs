/**
 * Chạy MỘT LẦN khi có mạng: tải provinces.open-api.vn v2 → public/assets/vn-address/
 * Sau đó FE chỉ đọc file tĩnh, không gọi API ngoài.
 *
 *   node scripts/fetch-vn-address-assets.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'assets', 'vn-address');
const OUT_P = join(OUT, 'p');
const BASE = 'https://provinces.open-api.vn/api/v2';

async function main() {
  await mkdir(OUT_P, { recursive: true });

  const res = await fetch(`${BASE}/`);
  if (!res.ok) throw new Error(`GET / failed: ${res.status}`);
  const provinces = await res.json();
  if (!Array.isArray(provinces)) throw new Error('provinces is not an array');

  await writeFile(join(OUT, 'provinces.json'), JSON.stringify(provinces), 'utf8');
  console.log(`Wrote provinces.json (${provinces.length} items)`);

  for (const pr of provinces) {
    const code = String(pr.code);
    const r2 = await fetch(`${BASE}/p/${encodeURIComponent(code)}?depth=2`);
    if (!r2.ok) {
      console.warn(`Skip ${code}: HTTP ${r2.status}`);
      continue;
    }
    const detail = await r2.json();
    await writeFile(join(OUT, 'p', `${code}.json`), JSON.stringify(detail), 'utf8');
    const n = Array.isArray(detail.wards) ? detail.wards.length : 0;
    console.log(`  p/${code}.json (${n} wards)`);
  }

  console.log('Done. Commit public/assets/vn-address/ to repo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
