// Proceduralne tekstury dekorów (drewno, marmur, beton, terrazzo, kwarc) rysowane na <canvas>.
// Wszystko w centymetrach: tekstura ma realny rozmiar (np. drewno 100×200 cm), a geometria
// ma UV w metrach – dzięki temu słoje mają tę samą skalę na szufladzie i na wysokim słupku.
// W produkcji można tu podstawić zdjęcia/skany dekorów od dostawcy płyt (te same UV).
import * as THREE from 'three';
import { DECORS } from '../../shared/catalog.js';

const TILE_CM = { wood: [100, 200], marble: [120, 120], concrete: [100, 100], terrazzo: [60, 60], speckle: [50, 50] };

function rng(seedStr) {
  let s = 2166136261;
  for (const ch of String(seedStr)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0;
  s = s || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000003) / 1000003;
  };
}

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Szum wartości okresowy (bezszwowy) o okresie P komórek.
function makeNoise(seed, P) {
  const r = rng(seed);
  const g = new Float32Array(P * P).map(() => r());
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = sm(x - xi);
    const v = sm(y - yi);
    const x0 = ((xi % P) + P) % P;
    const y0 = ((yi % P) + P) % P;
    const x1 = (x0 + 1) % P;
    const y1 = (y0 + 1) % P;
    const a = g[y0 * P + x0];
    const b = g[y0 * P + x1];
    const c = g[y1 * P + x0];
    const d = g[y1 * P + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbm(noise, x, y, oct) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * noise(x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// Rysuje fn przesuniętą o ±szerokość/wysokość, żeby wzór był ciągły na krawędziach kafla.
function wrap(W, H, fn) {
  for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) fn(dx, dy);
}

function drawWood(ctx, W, H, ppc, t, r) {
  const dark = hexToRgb(t.dark);
  const light = hexToRgb(t.light);
  ctx.fillStyle = t.base;
  ctx.fillRect(0, 0, W, H);

  // pasy / klepki – naturalna różnica odcienia między arkuszami
  let x = 0;
  while (x < W) {
    const bw = (9 + r() * 16) * ppc;
    ctx.fillStyle = r() > 0.5 ? rgba(light, 0.06 + r() * 0.12) : rgba(dark, 0.04 + r() * 0.1);
    ctx.fillRect(x, 0, Math.min(bw, W - x), H);
    x += bw;
  }

  // długie słoje
  const lines = Math.round((W / ppc) * 2.4);
  for (let i = 0; i < lines; i++) {
    const x0 = r() * W;
    const k = 1 + Math.floor(r() * 3);
    const amp = (0.2 + r() * 1.4) * ppc;
    const ph = r() * Math.PI * 2;
    ctx.strokeStyle = r() < 0.7 ? rgba(dark, 0.05 + r() * 0.16) : rgba(light, 0.05 + r() * 0.12);
    ctx.lineWidth = Math.max(0.6, (0.04 + r() * 0.25) * ppc);
    for (const dx of [-W, 0, W]) {
      ctx.beginPath();
      for (let y = 0; y <= H; y += 6) {
        const xx = x0 + dx + Math.sin((y / H) * Math.PI * 2 * k + ph) * amp;
        if (y === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
  }

  // „katedry” – charakterystyczne łuki przy przekroju stycznym
  const cathedrals = Math.max(t.cathedral > 0 ? 1 : 0, Math.round((t.cathedral * (W / ppc)) / 18));
  for (let i = 0; i < cathedrals; i++) {
    const cx = r() * W;
    const y0 = r() * H;
    const L = (35 + r() * 70) * ppc;
    const rings = 6 + Math.floor(r() * 9);
    const sp = (0.35 + r() * 0.5) * ppc;
    for (let k = 1; k <= rings; k++) {
      ctx.strokeStyle = rgba(dark, 0.06 + r() * 0.13);
      ctx.lineWidth = Math.max(0.7, (0.05 + r() * 0.18) * ppc);
      const hw0 = k * sp;
      const steps = 32;
      wrap(W, H, (dx, dy) => {
        ctx.beginPath();
        for (let s = steps; s >= 0; s--) {
          const tt = s / steps;
          const hw = hw0 * (0.25 + Math.sqrt(tt) * 1.6);
          const xx = cx + dx - hw + Math.sin(tt * 9 + k) * 0.3 * ppc;
          if (s === steps) ctx.moveTo(xx, y0 + dy + tt * L);
          else ctx.lineTo(xx, y0 + dy + tt * L);
        }
        for (let s = 0; s <= steps; s++) {
          const tt = s / steps;
          const hw = hw0 * (0.25 + Math.sqrt(tt) * 1.6);
          ctx.lineTo(cx + dx + hw + Math.sin(tt * 9 + k * 1.3) * 0.3 * ppc, y0 + dy + tt * L);
        }
        ctx.stroke();
      });
    }
  }

  // pory (dąb, jesion)
  const pores = Math.round(t.pores * (W / ppc) * (H / ppc) * 0.6);
  ctx.fillStyle = rgba(dark, 0.22);
  for (let i = 0; i < pores; i++) {
    ctx.globalAlpha = 0.25 + r() * 0.75;
    ctx.fillRect(r() * W, r() * H, Math.max(0.6, 0.06 * ppc), (0.2 + r() * 0.9) * ppc);
  }
  ctx.globalAlpha = 1;
}

function drawMarble(ctx, W, H, ppc, t, r, seed) {
  const base = hexToRgb(t.base);
  const cloud = hexToRgb(t.cloud);
  const P = Math.max(2, Math.round(W / ppc / 15));
  const noise = makeNoise(`${seed}-m`, P);
  const img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const n = fbm(noise, (px / W) * P, (py / H) * P, 5);
      const m = smoothstep(0.38, 0.8, n) * 0.85;
      const i = (py * W + px) * 4;
      img.data[i] = base[0] + (cloud[0] - base[0]) * m;
      img.data[i + 1] = base[1] + (cloud[1] - base[1]) * m;
      img.data[i + 2] = base[2] + (cloud[2] - base[2]) * m;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const vein = hexToRgb(t.vein);
  ctx.lineJoin = ctx.lineCap = 'round';
  const walk = (x, y, a, len, step, turn) => {
    const pts = [[x, y]];
    for (let d = 0; d < len; d += step) {
      a += (r() - 0.5) * turn;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      pts.push([x, y]);
    }
    return pts;
  };
  const stroke = (pts, width, alpha) =>
    wrap(W, H, (dx, dy) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
      for (const [mul, a] of [
        [7, alpha * 0.06],
        [2.6, alpha * 0.16],
        [1, alpha],
      ]) {
        ctx.strokeStyle = rgba(vein, a);
        ctx.lineWidth = Math.max(0.6, width * mul);
        ctx.stroke();
      }
    });

  // liczba żył proporcjonalna do powierzchni (miniatura nie może być gęstsza niż blat)
  const main = Math.max(2, Math.round((3 + r() * 3) * Math.sqrt(((W / ppc) * (H / ppc)) / 14400)));
  for (let i = 0; i < main; i++) {
    const pts = walk(r() * W, r() * H, (0.15 + r() * 0.35) * Math.PI, W * (0.7 + r() * 0.5), 1.5 * ppc, 0.35);
    stroke(pts, (0.12 + r() * 0.3) * ppc, 0.55 + r() * 0.3);
    // odgałęzienia
    const branches = 1 + Math.floor(r() * (W / ppc > 60 ? 4 : 2));
    for (let b = 0; b < branches; b++) {
      const [bx, by] = pts[Math.floor(r() * pts.length)];
      const sub = walk(bx, by, r() * Math.PI * 2, (8 + r() * 30) * ppc, 0.8 * ppc, 0.6);
      stroke(sub, (0.04 + r() * 0.1) * ppc, 0.4 + r() * 0.3);
    }
  }
}

function drawConcrete(ctx, W, H, ppc, t, r, seed) {
  const base = hexToRgb(t.base);
  const P1 = Math.max(2, Math.round(W / ppc / 16));
  const P2 = Math.max(4, Math.round(W / ppc / 2));
  const n1 = makeNoise(`${seed}-c1`, P1);
  const n2 = makeNoise(`${seed}-c2`, P2);
  const img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const v = py / H;
      const k = 1 + (fbm(n1, u * P1, v * P1, 4) - 0.5) * 0.26 + (n2(u * P2, v * P2) - 0.5) * 0.1 + (r() - 0.5) * 0.07;
      const i = (py * W + px) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const pores = Math.round((W / ppc) * (H / ppc) * 1.2);
  for (let i = 0; i < pores; i++) {
    ctx.fillStyle = `rgba(30,30,30,${0.2 + r() * 0.35})`;
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, Math.max(0.5, (0.03 + r() * 0.1) * ppc), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrazzo(ctx, W, H, ppc, t, r) {
  ctx.fillStyle = t.base;
  ctx.fillRect(0, 0, W, H);
  const palette = ['#b9b2a6', '#8c8478', '#d6cfc4', '#6e6a64', '#c9a98a', '#f8f6f2', '#a3a8a2', '#d9b8a0', '#5d5852'];
  const chips = Math.round((W / ppc) * (H / ppc) * 0.32);
  for (let i = 0; i < chips; i++) {
    const cx = r() * W;
    const cy = r() * H;
    const size = (0.2 + r() ** 2 * 1.6) * ppc;
    const n = 5 + Math.floor(r() * 3);
    const rot = r() * Math.PI * 2;
    const pts = Array.from({ length: n }, (_, k) => {
      const a = rot + (k / n) * Math.PI * 2;
      const rr = size * (0.55 + r() * 0.45);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    });
    ctx.fillStyle = palette[Math.floor(r() * palette.length)];
    const near = cx < size || cy < size || cx > W - size || cy > H - size;
    const draw = (dx, dy) => {
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(cx + x + dx, cy + y + dy) : ctx.moveTo(cx + x + dx, cy + y + dy)));
      ctx.closePath();
      ctx.fill();
    };
    if (near) wrap(W, H, draw);
    else draw(0, 0);
  }
}

function drawSpeckle(ctx, W, H, ppc, t, r) {
  ctx.fillStyle = t.base;
  ctx.fillRect(0, 0, W, H);
  const lightBase = hexToRgb(t.base).reduce((a, b) => a + b, 0) / 3 > 128;
  const count = Math.round((W / ppc) * (H / ppc) * (t.coarse ? 9 : 6));
  const colors = t.coarse
    ? ['rgba(235,232,225,A)', 'rgba(160,160,158,A)', 'rgba(110,100,90,A)', 'rgba(60,60,62,A)']
    : lightBase
      ? ['rgba(120,120,125,A)', 'rgba(170,165,160,A)', 'rgba(255,255,255,A)', 'rgba(90,85,80,A)']
      : ['rgba(255,255,255,A)', 'rgba(200,200,200,A)', 'rgba(60,60,60,A)'];
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)].replace('A', (0.25 + r() * 0.6).toFixed(2));
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, Math.max(0.5, (t.coarse ? 0.05 + r() ** 2 * 0.35 : 0.03 + r() ** 2 * 0.14) * ppc), 0, Math.PI * 2);
    ctx.fill();
  }
}

const DRAW = { wood: drawWood, marble: drawMarble, concrete: drawConcrete, terrazzo: drawTerrazzo, speckle: drawSpeckle };

function renderDecor(id, wCm, hCm, ppc) {
  const t = DECORS[id].tex;
  const c = document.createElement('canvas');
  c.width = Math.round(wCm * ppc);
  c.height = Math.round(hCm * ppc);
  DRAW[t.kind](c.getContext('2d'), c.width, c.height, ppc, t, rng(id), id);
  return c;
}

const texCache = new Map();

// Tekstura dekoru do sceny 3D (bezszwowa, w realnej skali). horizontal – słoje wzdłuż blatu.
// ppc – rozdzielczość w pikselach na cm (domyślnie maks. 10; strona główna używa ~3–4 dla małych podglądów).
export function decorTexture(id, { horizontal = false, ppc: ppcOpt } = {}) {
  const t = DECORS[id]?.tex;
  if (!t) return null;
  let [tw, th] = TILE_CM[t.kind];
  const ppc = Math.min(ppcOpt ?? 10, 2048 / Math.max(tw, th));
  const key = `${id}|${horizontal && t.kind === 'wood'}|${ppc}`;
  if (texCache.has(key)) return texCache.get(key);
  let canvas = renderDecor(id, tw, th, ppc);
  if (horizontal && t.kind === 'wood') {
    const rot = document.createElement('canvas');
    rot.width = canvas.height;
    rot.height = canvas.width;
    const ctx = rot.getContext('2d');
    ctx.translate(rot.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(canvas, 0, 0);
    canvas = rot;
    [tw, th] = [th, tw];
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.repeat.set(100 / tw, 100 / th); // UV w metrach -> powtórzenie co rozmiar kafla
  texCache.set(key, tex);
  return tex;
}

const swatchCache = new Map();

// Miniatura dekoru do próbnika w panelu (fragment ok. 26×26 cm).
export function decorSwatchURL(id) {
  const d = DECORS[id];
  if (!d?.tex) return null;
  if (swatchCache.has(id)) return swatchCache.get(id);
  const url = renderDecor(id, 26, 26, 5).toDataURL('image/jpeg', 0.86);
  swatchCache.set(id, url);
  return url;
}

let flutes = null;

// Mapa normalnych frontu ryflowanego – lamele co 3,2 cm, niezależnie od rozmiaru frontu.
export function flutesNormalTexture() {
  if (flutes) return flutes;
  const W = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = 4;
  const ctx = c.getContext('2d');
  for (let x = 0; x < W; x++) {
    const t = (x + 0.5) / W;
    let a;
    if (t < 0.84) a = (t / 0.84 - 0.5) * 1.5;
    else a = -((t - 0.84) / 0.16 - 0.5) * 2.2;
    const nx = Math.sin(a);
    const nz = Math.cos(a);
    ctx.fillStyle = `rgb(${Math.round((nx * 0.5 + 0.5) * 255)},128,${Math.round((nz * 0.5 + 0.5) * 255)})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  flutes = new THREE.CanvasTexture(c);
  flutes.wrapS = flutes.wrapT = THREE.RepeatWrapping;
  flutes.repeat.set(100 / 3.2, 1);
  return flutes;
}

// --- tekstury pomieszczenia (tylko do aranżacji sceny) -------------------------

function canvasTexture(canvas, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

let plaster = null;
// Delikatny tynk na ściany (kafel 100×100 cm).
export function plasterTexture() {
  if (plaster) return plaster;
  const W = 512;
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const ctx = c.getContext('2d');
  const base = [240, 236, 229];
  const n1 = makeNoise('plaster1', 6);
  const n2 = makeNoise('plaster2', 64);
  const r = rng('plaster');
  const img = ctx.createImageData(W, W);
  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const v = py / W;
      const k = 1 + (fbm(n1, u * 6, v * 6, 3) - 0.5) * 0.05 + (n2(u * 64, v * 64) - 0.5) * 0.035 + (r() - 0.5) * 0.02;
      const i = (py * W + px) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  plaster = canvasTexture(c);
  plaster.repeat.set(1, 1);
  return plaster;
}

let tiles = null;
// Płytki „cegiełka” 15×7,5 cm z fugą – ściana nad blatem (kafel 60×60 cm).
export function tilesTexture() {
  if (tiles) return tiles;
  const ppc = 8;
  const S = 60 * ppc;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d6d1c8';
  ctx.fillRect(0, 0, S, S);
  const r = rng('tiles');
  const tw = 15 * ppc;
  const th = 7.5 * ppc;
  const g = 0.3 * ppc;
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? tw / 2 : 0;
    for (let col = -1; col < 5; col++) {
      const x = col * tw + off + g / 2;
      const y = row * th + g / 2;
      const l = 93 + r() * 4;
      const grad = ctx.createLinearGradient(x, y, x, y + th);
      grad.addColorStop(0, `hsl(40, 12%, ${l + 2}%)`);
      grad.addColorStop(0.5, `hsl(40, 10%, ${l}%)`);
      grad.addColorStop(1, `hsl(40, 10%, ${l - 3}%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, tw - g, th - g, 2);
      ctx.fill();
    }
  }
  tiles = canvasTexture(c);
  tiles.repeat.set(100 / 60, 100 / 60);
  return tiles;
}

let floorBase = null;
// Podłoga z desek dębowych 20 cm o różnej długości (kafel 200×200 cm).
function floorCanvas() {
  if (floorBase) return floorBase;
  const ppc = 5;
  const S = 200 * ppc;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  drawWood(ctx, S, S, ppc, { base: '#d2b48f', dark: '#9a7651', light: '#ead5b5', cathedral: 0.6, pores: 0.5 }, rng('floor'));
  const r = rng('planks');
  const pw = 20 * ppc;
  for (let col = 0; col < 10; col++) {
    let y = -r() * 150 * ppc;
    while (y < S) {
      const len = (70 + r() * 110) * ppc;
      ctx.fillStyle = r() > 0.5 ? `rgba(255,245,230,${r() * 0.12})` : `rgba(90,60,30,${r() * 0.1})`;
      ctx.fillRect(col * pw, y, pw, len);
      ctx.strokeStyle = 'rgba(70,45,25,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(col * pw + 0.75, y, pw - 1.5, len);
      y += len;
    }
  }
  floorBase = c;
  return c;
}

export function floorPlanksTexture(widthCm, depthCm) {
  const tex = canvasTexture(floorCanvas());
  tex.repeat.set(widthCm / 200, depthCm / 200);
  return tex;
}
