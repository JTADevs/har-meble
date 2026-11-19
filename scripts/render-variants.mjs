// Tworzy mniejsze warianty renderów (480 i 800 px szerokości) dla responsywnych obrazów (srcset).
// Używa wbudowanego w macOS narzędzia `sips`; na innych systemach podmień na sharp/ImageMagick.
// Uruchomienie: npm run renders:variants
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '../public/renders');
const SIZES = [480, 800];
const sources = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg') && !/-\d+\.jpg$/.test(f));
for (const file of sources) {
  const src = path.join(dir, file);
  for (const w of SIZES) {
    const out = path.join(dir, file.replace(/\.jpg$/, `-${w}.jpg`));
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    execFileSync('sips', ['-Z', String(w), '-s', 'formatOptions', '80', src, '--out', out], { stdio: 'ignore' });
    console.log(`${path.basename(out)}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
}
