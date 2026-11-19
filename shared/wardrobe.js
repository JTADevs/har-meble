// Geometria szafy na wymiar: sekcje, wnętrza, drzwi i formatki.
import { T, GAP, HARDWARE, WARDROBE_INTERIORS, WARDROBE_DOORS, sanitizeFinish } from './catalog.js';

export const WARDROBE_LIMITS = { width: [80, 400], height: [180, 280], depth: [40, 70], sections: [1, 6] };
export const WARDROBE_PLINTH = 8;

export function defaultWardrobe() {
  return {
    width: 240,
    height: 250,
    depth: 60,
    carcass: 'lam_bialy',
    front: 'laminat',
    frontDecor: 'dab_bielony',
    frontStyle: 'gladki',
    doors: 'przesuwne',
    mirror: true,
    handle: 'listwa_czarna',
    hardware: 'standard',
    led: false,
    montaz: true,
    transportKm: 25,
    sections: [{ interior: 'drazek' }, { interior: 'szuflady' }, { interior: 'drazek_podwojny' }],
  };
}

const pick = (v, obj, def) => (typeof v === 'string' && Object.hasOwn(obj, v) ? v : def);
const clampInt = (v, [min, max], def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function sanitizeWardrobe(c) {
  const d = defaultWardrobe();
  c = c && typeof c === 'object' ? c : d;
  let sections = Array.isArray(c.sections) && c.sections.length ? c.sections : d.sections;
  sections = sections.slice(0, WARDROBE_LIMITS.sections[1]).map((s) => ({ interior: pick(s?.interior, WARDROBE_INTERIORS, 'polki') }));
  return {
    width: clampInt(c.width, WARDROBE_LIMITS.width, d.width),
    height: clampInt(c.height, WARDROBE_LIMITS.height, d.height),
    depth: clampInt(c.depth, WARDROBE_LIMITS.depth, d.depth),
    ...sanitizeFinish(c, d, { countertop: false }),
    doors: pick(c.doors, WARDROBE_DOORS, d.doors),
    mirror: Boolean(c.mirror),
    hardware: pick(c.hardware, HARDWARE, d.hardware),
    led: Boolean(c.led),
    montaz: c.montaz !== false,
    transportKm: clampInt(c.transportKm, [0, 500], d.transportKm),
    sections,
  };
}

function interiorItems(type, Hi) {
  const shelves = [];
  const rails = [];
  const drawers = [];
  if (type === 'polki') {
    const n = Math.max(3, Math.round(Hi / 38) - 1);
    const step = Hi / (n + 1);
    for (let i = 1; i <= n; i++) shelves.push(i * step - T / 2);
  } else if (type === 'drazek') {
    const top = Hi - 38;
    shelves.push(22, top);
    rails.push(top - 6);
  } else if (type === 'drazek_podwojny') {
    const top = Hi - 38;
    const mid = Math.round(top / 2);
    shelves.push(mid, top);
    rails.push(mid - 6, top - 6);
  } else if (type === 'szuflady') {
    const dh = 20;
    for (let i = 0; i < 3; i++) drawers.push({ y: 2 + i * (dh + 1), h: dh });
    const above = 2 + 3 * (dh + 1) + 1;
    shelves.push(above);
    const rest = Hi - above;
    const n = Math.max(1, Math.round(rest / 38) - 1);
    const step = rest / (n + 1);
    for (let i = 1; i <= n; i++) shelves.push(above + i * step);
  }
  return { shelves, rails, drawers };
}

const panel = (name, lCm, wCm, qty, edgeL, mat = 'carcass', edgeW = 0) => ({
  name,
  mat,
  l: Math.round(lCm * 10),
  w: Math.round(wCm * 10),
  qty,
  edgeL,
  edgeW,
});

export function wardrobeSpec(c) {
  const W = c.width;
  const H = c.height;
  const D = c.depth;
  const n = c.sections.length;
  const plinth = WARDROBE_PLINTH;
  const Hi = H - plinth - 2 * T;
  const sliding = c.doors === 'przesuwne';
  const Ds = sliding ? D - 10 : D - 2;
  const sw = (W - 2 * T - (n - 1) * T) / n;

  const sections = c.sections.map((s, i) => ({
    interior: s.interior,
    x: T + i * (sw + T),
    w: sw,
    ...interiorItems(s.interior, Hi),
  }));

  const doors = [];
  if (sliding) {
    const nd = W <= 200 ? 2 : W <= 300 ? 3 : 4;
    const overlap = 3;
    const dw = (W - 2 * T + overlap * (nd - 1)) / nd;
    for (let i = 0; i < nd; i++) {
      doors.push({
        kind: 'sliding',
        x: T + i * (dw - overlap),
        y: plinth + T + 0.2,
        w: dw,
        h: Hi - 0.4,
        track: i % 2,
        mirror: c.mirror && i % 2 === 1,
      });
    }
  } else if (c.doors === 'uchylne') {
    const y = plinth + GAP / 2;
    const h = H - plinth - GAP;
    sections.forEach((s, i) => {
      const x0 = i === 0 ? 0 : s.x - T / 2;
      const x1 = i === n - 1 ? W : s.x + s.w + T / 2;
      const cw = x1 - x0;
      const k = cw > 60 ? 2 : 1;
      for (let j = 0; j < k; j++) {
        doors.push({
          kind: 'door',
          x: x0 + (j * cw) / k + GAP / 2,
          y,
          w: cw / k - GAP,
          h,
          hinge: k === 1 ? (i % 2 ? 'right' : 'left') : j === 0 ? 'left' : 'right',
          hinges: h > 200 ? 5 : 4,
        });
      }
    });
  }

  const shelvesCount = sections.reduce((a, s) => a + s.shelves.length, 0);
  const drawersCount = sections.reduce((a, s) => a + s.drawers.length, 0);
  const railsCount = sections.reduce((a, s) => a + s.rails.length, 0);

  const panels = [
    panel('Bok', H, D, 2, 1),
    panel('Wieniec górny / dolny', W - 2 * T, D, 2, 1),
    panel('Cokół', W - 2 * T, plinth, 1, 1),
    panel('Plecy HDF', W - 0.4, H - plinth - 0.4, 1, 0, 'hdf'),
  ];
  if (n > 1) panels.push(panel('Przegroda pionowa', Hi, Ds, n - 1, 1));
  if (shelvesCount) panels.push(panel('Półka', sw - 0.2, Ds - 2, shelvesCount, 1));
  if (drawersCount) panels.push(panel('Front szuflady wewnętrznej', sw - 0.4, 19.6, drawersCount, 2, 'carcass', 2));
  const frontMap = new Map();
  for (const d of doors) {
    const mat = d.mirror ? 'mirror' : 'front';
    const name = d.mirror ? 'Drzwi przesuwne – lustro' : d.kind === 'sliding' ? 'Drzwi przesuwne – wypełnienie' : 'Front drzwi';
    const key = `${name}|${Math.round(d.h)}|${Math.round(d.w)}`;
    if (frontMap.has(key)) frontMap.get(key).qty += 1;
    else frontMap.set(key, panel(name, d.h, d.w, 1, 0, mat));
  }
  panels.push(...frontMap.values());

  const hinged = doors.filter((d) => d.kind === 'door');
  const hw = {
    hinges: hinged.reduce((a, d) => a + d.hinges, 0),
    handles: hinged.length,
    drawers: drawersCount,
    rails: railsCount,
    slidingDoors: sliding ? doors.length : 0,
    trackMb: sliding ? (2 * W) / 100 : 0,
    doors: doors.length,
    sections: n,
  };

  return { W, H, D, Ds, Hi, plinth, sections, doors, panels, hw };
}
