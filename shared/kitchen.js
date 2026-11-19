// Geometria kuchni: specyfikacja każdej szafki (fronty, półki, formatki)
// oraz automatyczne rozmieszczenie szafek na ścianach.
import { MODULES, DIM, T, GAP, HARDWARE, sanitizeFinish, uid } from './catalog.js';

// Narożnik w układzie L: szafki na ścianie B zaczynają się za blatem/szafkami ściany A.
export const CORNER = { base: DIM.countertopDepth, wall: DIM.wall.depth + 3 };

function doorsAcross(W, y, h, hinges) {
  const n = W <= 60 ? 1 : 2;
  const cw = W / n;
  return Array.from({ length: n }, (_, i) => ({
    kind: 'door',
    x: i * cw + GAP / 2,
    y,
    w: cw - GAP,
    h,
    hinge: n === 1 ? 'left' : i === 0 ? 'left' : 'right',
    hinges,
  }));
}

function drawersStack(W, H, ratios) {
  const avail = H - GAP * ratios.length;
  const total = ratios.reduce((a, b) => a + b, 0);
  let y = 0;
  return ratios.map((r) => {
    const h = (avail * r) / total;
    const f = { kind: 'drawer', x: GAP / 2, y, w: W - GAP, h };
    y += h + GAP;
    return f;
  });
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

function carcassPanels(W, H, D, { rails, shelves, fixed }) {
  const iw = W - 2 * T;
  const p = [panel('Bok', H, D, 2, 1)];
  if (rails) {
    p.push(panel('Wieniec dolny', iw, D, 1, 1));
    p.push(panel('Trawers (listwa górna)', iw, 10, 2, 1));
  } else {
    p.push(panel('Wieniec górny / dolny', iw, D, 2, 1));
  }
  if (fixed) p.push(panel('Półka stała', iw, D - 2, fixed, 1));
  if (shelves) p.push(panel('Półka', iw - 0.2, D - 4, shelves, 1));
  p.push(panel('Plecy HDF', W - 0.4, H - 0.4, 1, 0, 'hdf'));
  return p;
}

function frontPanels(fronts) {
  const map = new Map();
  for (const f of fronts) {
    const name = f.kind === 'drawer' ? 'Front szuflady' : f.kind === 'flap' ? 'Front zmywarki' : 'Front drzwi';
    const key = `${name}|${Math.round(f.h * 10)}|${Math.round(f.w * 10)}`;
    if (map.has(key)) map.get(key).qty += 1;
    else map.set(key, panel(name, f.h, f.w, 1, 0, 'front'));
  }
  return [...map.values()];
}

// Pełna specyfikacja szafki danego typu i szerokości (wymiary w cm).
export function moduleSpec(type, W) {
  const def = MODULES[type];
  const B = DIM.base;
  const WL = DIM.wall;
  const TL = DIM.tall;
  let s;
  switch (type) {
    case 'dolna_drzwi':
      s = { ...B, rails: true, shelves: [34], fronts: doorsAcross(W, 0, B.height - GAP, 2) };
      break;
    case 'dolna_szuflady':
      s = { ...B, rails: true, shelves: [], fronts: drawersStack(W, B.height, [2, 2, 1]) };
      break;
    case 'zlewowa':
      s = { ...B, rails: true, shelves: [], fronts: doorsAcross(W, 0, B.height - GAP, 2), top: 'sink' };
      break;
    case 'piekarnik':
      s = {
        ...B,
        rails: true,
        shelves: [],
        fixed: [10.4],
        fronts: [{ kind: 'drawer', x: GAP / 2, y: 0, w: W - GAP, h: 11.9 }],
        appliances: [{ kind: 'oven', y: 12.5, h: 59.2 }],
        top: 'hob',
      };
      break;
    case 'zmywarka':
      s = {
        ...B,
        noCarcass: true,
        shelves: [],
        fronts: [{ kind: 'flap', x: GAP / 2, y: 0, w: W - GAP, h: B.height - GAP }],
        appliances: [{ kind: 'dishwasher' }],
      };
      break;
    case 'gorna_drzwi':
      s = { ...WL, shelves: [23, 47], fronts: doorsAcross(W, GAP / 2, WL.height - GAP, 2) };
      break;
    case 'gorna_otwarta':
      s = { ...WL, shelves: [23, 47], fronts: [] };
      break;
    case 'slupek_lodowka':
      s = {
        ...TL,
        shelves: [],
        fixed: [175.5],
        fronts: [
          { kind: 'door', x: GAP / 2, y: 0, w: W - GAP, h: 177, hinge: 'right', hinges: 0 },
          { kind: 'door', x: GAP / 2, y: 177.3, w: W - GAP, h: 29.4, hinge: 'right', hinges: 2 },
        ],
        appliances: [{ kind: 'fridge', y: 1, h: 174 }],
      };
      break;
    case 'slupek_ag':
      s = {
        ...TL,
        shelves: [35],
        fixed: [70.2, 131.5, 171.3],
        fronts: [...doorsAcross(W, 0, 71.7, 2), ...doorsAcross(W, 173.4, 33.3, 2)],
        appliances: [
          { kind: 'oven', y: 72.2, h: 59.1 },
          { kind: 'microwave', y: 133.5, h: 37.6 },
        ],
      };
      break;
    case 'slupek_spizarnia':
      s = {
        ...TL,
        shelves: [35, 70, 105, 172],
        fixed: [138.5],
        fronts: [...doorsAcross(W, 0, 140, 4), ...doorsAcross(W, 140.3, 66.4, 2)],
      };
      break;
    default:
      throw new Error(`Nieznany typ szafki: ${type}`);
  }

  const row = def.row;
  const y0 = row === 'wall' ? WL.bottom : DIM.plinth;
  const fixed = s.fixed || [];
  const panels = s.noCarcass
    ? frontPanels(s.fronts)
    : [
        ...carcassPanels(W, s.height, s.depth, { rails: s.rails, shelves: s.shelves.length, fixed: fixed.length }),
        ...frontPanels(s.fronts),
      ];
  const drawers = s.fronts.filter((f) => f.kind === 'drawer').length;
  const hw = {
    hinges: s.fronts.reduce((a, f) => a + (f.hinges || 0), 0),
    drawers,
    handles: s.fronts.length,
    legs: row === 'wall' || s.noCarcass ? 0 : W >= 80 ? 6 : 4,
    hangers: row === 'wall' ? 1 : 0,
    small: s.noCarcass ? 0 : 1,
    laborClass: s.noCarcass ? 'appliance' : row,
    sink: s.top === 'sink' ? 1 : 0,
    hob: s.top === 'hob' ? 1 : 0,
  };
  return { ...s, fixed, row, y0, width: W, appliances: s.appliances || [], panels, hw };
}

export function defaultKitchen() {
  const m = (type, width, wall = 'A') => ({ id: uid(), type, width, wall });
  return {
    layout: 'L',
    walls: { A: 360, B: 260 },
    carcass: 'lam_bialy',
    front: 'mdf_mat',
    frontDecor: 'szalwia',
    frontStyle: 'ramowy',
    countertop: 'laminat',
    countertopDecor: 'dab_naturalny',
    handle: 'galka_mosiadz',
    hardware: 'premium',
    led: true,
    montaz: true,
    transportKm: 25,
    modules: [
      m('slupek_lodowka', 60),
      m('dolna_szuflady', 60),
      m('zlewowa', 80),
      m('zmywarka', 60),
      m('piekarnik', 60),
      m('dolna_drzwi', 40),
      m('gorna_drzwi', 60),
      m('gorna_drzwi', 80),
      m('gorna_otwarta', 60),
      m('gorna_drzwi', 60),
      m('gorna_drzwi', 40),
      m('dolna_szuflady', 80, 'B'),
      m('dolna_drzwi', 60, 'B'),
      m('slupek_spizarnia', 40, 'B'),
      m('gorna_drzwi', 80, 'B'),
      m('gorna_drzwi', 60, 'B'),
    ],
  };
}

const pick = (v, obj, def) => (typeof v === 'string' && Object.hasOwn(obj, v) ? v : def);
const clampInt = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

// Szafki górne mają swobodną pozycję na ścianie: x – od początku ściany (cm), y – wysokość dolnej krawędzi (cm).
export const WALL_MOUNT = { min: 115, max: 190, std: DIM.wall.bottom };
const SNAP_CM = 6; // przyciąganie do krawędzi przy przeciąganiu
const EPS = 0.01;

const optNum = (v, min, max, step = 1) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
};

// Walidacja konfiguracji – używana przy wczytywaniu i po stronie serwera.
export function sanitizeKitchen(c) {
  const d = defaultKitchen();
  c = c && typeof c === 'object' ? c : d;
  const modules = (Array.isArray(c.modules) ? c.modules : d.modules)
    .filter((m) => m && Object.hasOwn(MODULES, m.type))
    .slice(0, 60)
    .map((m) => {
      const def = MODULES[m.type];
      const width = def.widths.includes(Number(m.width)) ? Number(m.width) : def.defaultWidth;
      const out = { id: String(m.id || uid()).slice(0, 40), type: m.type, width, wall: m.wall === 'B' ? 'B' : 'A' };
      if (def.row === 'wall') {
        const x = optNum(m.x, 0, 800, 0.5);
        const y = optNum(m.y, WALL_MOUNT.min, WALL_MOUNT.max);
        if (x !== undefined) out.x = x;
        if (y !== undefined) out.y = y;
      }
      return out;
    });
  return {
    layout: c.layout === 'I' ? 'I' : 'L',
    walls: { A: clampInt(c.walls?.A, 120, 800, d.walls.A), B: clampInt(c.walls?.B, 120, 600, d.walls.B) },
    ...sanitizeFinish(c, d),
    hardware: pick(c.hardware, HARDWARE, d.hardware),
    led: Boolean(c.led),
    montaz: c.montaz !== false,
    transportKm: clampInt(c.transportKm, 0, 500, d.transportKm),
    modules,
  };
}

export const rowStart = (wall, row) => (wall === 'B' ? (row === 'wall' ? CORNER.wall : CORNER.base) : 0);

// Rozmieszcza szafki wzdłuż ścian: dolne i słupki jedna przy drugiej (ciągły blat),
// górne w swojej pozycji (x), bez nakładania się na inne górne i na słupki.
export function layoutKitchen(config) {
  const walls = config.layout === 'L' ? ['A', 'B'] : ['A'];
  const out = { walls: {}, placed: [], warnings: [], plinthCm: 0, wallRowCm: 0, hidden: 0 };
  if (config.layout !== 'L') out.hidden = config.modules.filter((m) => m.wall === 'B').length;

  for (const wall of walls) {
    const length = config.walls[wall];
    const mods = config.modules.filter((m) => m.wall === wall);
    const placed = [];
    const tall = [];
    const baseStart = rowStart(wall, 'base');
    const wallStart = rowStart(wall, 'wall');
    let cursor = baseStart;
    mods.forEach((m, i) => {
      const spec = moduleSpec(m.type, m.width);
      if (spec.row === 'wall') return;
      placed.push({ ...m, index: i, row: spec.row, x: cursor, spec });
      if (spec.row === 'tall') tall.push([cursor, cursor + m.width]);
      cursor += m.width;
    });
    const baseEnd = cursor;

    // szafki górne: najpierw te z zapisaną pozycją (od lewej), potem nowe – w pierwszą wolną lukę
    const occupied = tall.map(([a, b]) => [a, b]);
    const firstFree = (from, w) => {
      let pos = from;
      let moved = true;
      while (moved) {
        moved = false;
        for (const [a, b] of occupied) {
          if (pos < b - EPS && pos + w > a + EPS) {
            pos = b;
            moved = true;
          }
        }
      }
      return pos;
    };
    const wallItems = mods.map((m, i) => ({ m, i, spec: moduleSpec(m.type, m.width) })).filter((o) => o.spec.row === 'wall');
    const explicit = wallItems.filter((o) => o.m.x !== undefined).sort((a, b) => a.m.x - b.m.x || a.i - b.i);
    const implicit = wallItems.filter((o) => o.m.x === undefined);
    let wallEnd = wallStart;
    for (const o of [...explicit, ...implicit]) {
      const pos = firstFree(o.m.x !== undefined ? Math.max(o.m.x, wallStart) : wallStart, o.m.width);
      occupied.push([pos, pos + o.m.width]);
      const spec = o.m.y !== undefined ? { ...o.spec, y0: o.m.y } : o.spec;
      placed.push({ ...o.m, index: o.i, row: 'wall', x: pos, spec });
      wallEnd = Math.max(wallEnd, pos + o.m.width);
    }

    placed.forEach((p) => {
      p.label = `${wall}${p.index + 1}`;
      p.overflow = p.x + p.width > length + EPS;
    });
    if (baseEnd > length) out.warnings.push(`Ściana ${wall}: szafki dolne i słupki wychodzą ${baseEnd - length} cm poza ścianę.`);
    if (wallEnd > length + EPS) out.warnings.push(`Ściana ${wall}: szafki górne wychodzą ${Math.round(wallEnd - length)} cm poza ścianę.`);

    const countertops = [];
    placed
      .filter((p) => p.row === 'base')
      .sort((a, b) => a.x - b.x)
      .forEach((p) => {
        const last = countertops[countertops.length - 1];
        if (last && Math.abs(last.end - p.x) < EPS) last.end = p.x + p.width;
        else countertops.push({ start: p.x, end: p.x + p.width });
      });

    // zajęta część rzędu górnego: suma odcinków szafek górnych i słupków (luki między szafkami nie są liczone)
    let wallUsed = 0;
    let reach = wallStart;
    occupied
      .map(([a, b]) => [Math.max(a, wallStart), b])
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0])
      .forEach(([a, b]) => {
        if (b <= reach) return;
        wallUsed += b - Math.max(a, reach);
        reach = b;
      });

    out.walls[wall] = {
      length,
      placed,
      countertops,
      baseUsed: baseEnd - baseStart,
      wallUsed: Math.round(wallUsed),
      baseAvailable: length - baseStart,
      wallAvailable: length - wallStart,
    };
    out.placed.push(...placed);
    out.plinthCm += placed.filter((p) => p.row !== 'wall').reduce((a, p) => a + p.width, 0);
    out.wallRowCm += placed.filter((p) => p.row === 'wall').reduce((a, p) => a + p.width, 0);
  }
  if (out.hidden) out.warnings.push(`Szafki ze ściany B (${out.hidden} szt.) nie są liczone w układzie prostym (I).`);
  return out;
}

// Wolne miejsca w rzędzie szafek górnych danej ściany (bez szafki `id`) – przeszkody to inne górne i słupki.
export function wallRowGaps(layout, wall, id) {
  const info = layout.walls[wall];
  const start = rowStart(wall, 'wall');
  const obstacles = info.placed
    .filter((q) => q.id !== id && (q.row === 'wall' || q.row === 'tall'))
    .map((q) => [q.x, q.x + q.width])
    .sort((a, b) => a[0] - b[0]);
  const free = [];
  let cur = start;
  for (const [a, b] of obstacles) {
    if (a > cur + EPS) free.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (info.length > cur + EPS) free.push([cur, info.length]);
  return { start, end: info.length, obstacles, free };
}

/**
 * Pozycja szafki górnej po przesunięciu (przeciąganie, strzałki, wpisanie wartości).
 * Zwraca { x, y } bez kolizji: szafka „przeskakuje” do najbliższego wolnego miejsca, w którym się mieści.
 * snap – przyciąganie do krawędzi sąsiadów, szafek dolnych, końców ściany i standardowych wysokości.
 * yStart – wysokość na początku przeciągania (lekki „magnes”, żeby ruch w poziomie nie zmieniał wysokości).
 */
export function solveWallPlacement(config, id, xWanted, yWanted, { snap = false, yStart, layout = layoutKitchen(config) } = {}) {
  const p = layout.placed.find((q) => q.id === id);
  if (!p || p.row !== 'wall') return null;
  const w = p.width;
  const H = p.spec.height;
  const { start, end, obstacles, free } = wallRowGaps(layout, p.wall, id);

  let x = xWanted;
  if (snap) {
    const targets = [start, end - w];
    obstacles.forEach(([a, b]) => targets.push(b, a - w));
    layout.walls[p.wall].placed.filter((q) => q.row === 'base').forEach((q) => targets.push(q.x, q.x + q.width - w));
    let best = null;
    for (const t of targets) {
      const dist = Math.abs(t - x);
      if (dist <= SNAP_CM && (!best || dist < best.dist)) best = { t, dist };
    }
    x = best ? best.t : Math.round(x);
  }
  let bestX = null;
  for (const [a, b] of free) {
    if (b - a < w - EPS) continue;
    const cx = Math.min(Math.max(x, a), b - w);
    if (bestX === null || Math.abs(cx - x) < Math.abs(bestX - x)) bestX = cx;
  }
  if (bestX === null) bestX = Math.max(start, Math.min(x, end - w)); // brak miejsca – zostaje ostrzeżenie o przekroczeniu

  const yMax = Math.min(WALL_MOUNT.max, DIM.roomHeight - H - 3);
  let y = yWanted ?? p.spec.y0;
  if (snap) {
    const others = layout.walls[p.wall].placed.filter((q) => q.row === 'wall' && q.id !== id).map((q) => q.spec.y0);
    const ys = [WALL_MOUNT.std, DIM.plinth + DIM.tall.height - H, ...others];
    if (yStart !== undefined) ys.push(yStart);
    let best = null;
    for (const t of ys) {
      const dist = Math.abs(t - y);
      if (dist <= 7 && (!best || dist < best.dist)) best = { t, dist };
    }
    y = best ? best.t : Math.round(y);
  }
  y = Math.min(yMax, Math.max(WALL_MOUNT.min, y));
  return { x: Math.round(bestX * 2) / 2, y: Math.round(y) };
}

// Zapisuje bieżące pozycje szafek górnych na ścianie. Dzięki temu przy ręcznym ustawianiu (lub usuwaniu) jednej szafki
// pozostałe zostają na swoich miejscach i nie „wskakują” w zwolnioną lukę.
export function freezeWallRow(config, wall) {
  const info = layoutKitchen(config).walls[wall];
  if (!info) return config;
  const xs = new Map(info.placed.filter((q) => q.row === 'wall').map((q) => [q.id, q.x]));
  let changed = false;
  const modules = config.modules.map((m) => {
    if (!xs.has(m.id) || m.x === xs.get(m.id)) return m;
    changed = true;
    return { ...m, x: xs.get(m.id) };
  });
  return changed ? { ...config, modules } : config;
}

// Podpis rzędu górnego (id:x:y) – do sprawdzenia, czy ruch cokolwiek zmienił.
const wallRowSig = (config, wall) =>
  (layoutKitchen(config).walls[wall]?.placed ?? [])
    .filter((q) => q.row === 'wall')
    .map((q) => `${q.id}:${q.x}:${q.spec.y0}`)
    .sort()
    .join('|');

const setWallXY = (config, xs, id, y) => ({
  ...config,
  modules: config.modules.map((m) => (xs.has(m.id) ? { ...m, x: xs.get(m.id), ...(m.id === id && y !== undefined ? { y } : null) } : m)),
});

/**
 * Wstawienie szafki górnej między inne, gdy pod kursorem nie ma wolnej luki: szafka trafia do pobliskiego bloku
 * stykających się szafek, a blok rozsuwa się w stronę, w której jest miejsce (np. w lukę po przenoszonej szafce).
 * Zwraca { dist, config } – dist to odległość wyniku od pozycji wskazanej kursorem.
 */
function insertWallModule(config, layout, p, xWanted, y) {
  const { start, end, obstacles } = wallRowGaps(layout, p.wall, p.id);
  const w = p.width;
  const blocks = [];
  layout.walls[p.wall].placed
    .filter((q) => q.row === 'wall' && q.id !== p.id)
    .sort((a, b) => a.x - b.x)
    .forEach((q) => {
      const last = blocks[blocks.length - 1];
      if (last && Math.abs(last.end - q.x) < EPS) {
        last.items.push(q);
        last.end = q.x + q.width;
      } else blocks.push({ items: [q], start: q.x, end: q.x + q.width });
    });
  const isFree = (a, b) => a >= start - EPS && b <= end + EPS && obstacles.every(([oa, ob]) => ob <= a + EPS || oa >= b - EPS);

  let best = null;
  for (const blk of blocks) {
    const n = blk.items.length;
    // dir 1: blok rośnie w prawo (szafki od k przesuwają się o w), dir -1: w lewo (szafki przed k przesuwają się o w)
    const dirs = [1, -1].filter((dir) => (dir > 0 ? isFree(blk.end, blk.end + w) : isFree(blk.start - w, blk.start)));
    for (const dir of dirs) {
      let acc = blk.start;
      for (let k = 0; k <= n; k++) {
        const px = dir > 0 ? acc : acc - w;
        const moved = dir > 0 ? n - k : k;
        const dist = Math.abs(px - xWanted);
        if (!best || dist < best.dist - EPS || (Math.abs(dist - best.dist) < EPS && moved < best.moved)) best = { dist, moved, blk, k, dir, px };
        if (k < n) acc += blk.items[k].width;
      }
    }
  }
  if (!best) return null;
  const xs = new Map([[p.id, best.px]]);
  best.blk.items.forEach((q, i) => {
    if (best.dir > 0 && i >= best.k) xs.set(q.id, q.x + w);
    if (best.dir < 0 && i < best.k) xs.set(q.id, q.x - w);
  });
  return { dist: best.dist, config: setWallXY(config, xs, p.id, y) };
}

/**
 * Ustawia szafkę górną w nowej pozycji (bez kolizji) – zwraca nową konfigurację (albo tę samą, gdy nic się nie zmienia).
 * reorder – przy przeciąganiu: gdy w miejscu kursora nie ma wolnej luki, szafka wsuwa się między sąsiadki
 * (zamiana kolejności), o ile to wyraźnie bliżej kursora niż najbliższe wolne miejsce.
 */
export function moveWallModule(config, id, xWanted, yWanted, opts = {}) {
  const mod = config.modules.find((m) => m.id === id);
  if (!mod || MODULES[mod.type]?.row !== 'wall') return config;
  const base = freezeWallRow(config, mod.wall);
  const layout = layoutKitchen(base);
  const p = layout.placed.find((q) => q.id === id);
  if (!p) return config; // np. szafka ze ściany B w układzie prostym
  const sol = solveWallPlacement(base, id, xWanted, yWanted, { ...opts, layout });
  let next = setWallXY(base, new Map([[id, sol.x]]), id, sol.y);
  if (opts.reorder) {
    const ins = insertWallModule(base, layout, p, xWanted, sol.y);
    if (ins && ins.dist + 5 < Math.abs(sol.x - xWanted)) next = ins.config;
  }
  return wallRowSig(next, mod.wall) === wallRowSig(config, mod.wall) ? config : next;
}

// Krok szafką górną (strzałki, przyciski): przesunięcie o `step` cm, a gdy stoi tuż przy sąsiadce – zamiana miejscami.
export function nudgeWallModule(config, id, dir, step = 5) {
  const layout = layoutKitchen(config);
  const p = layout.placed.find((q) => q.id === id);
  if (!p || p.row !== 'wall') return config;
  const moved = moveWallModule(config, id, p.x + dir * step, p.spec.y0);
  if (moved !== config) return moved;
  const row = layout.walls[p.wall].placed.filter((q) => q.row === 'wall').sort((a, b) => a.x - b.x);
  const n = row[row.findIndex((q) => q.id === id) + dir];
  if (!n) return config;
  const touching = dir > 0 ? Math.abs(p.x + p.width - n.x) < 1 : Math.abs(n.x + n.width - p.x) < 1;
  if (!touching) return config;
  // obie szafki zajmują po zamianie ten sam odcinek ściany – bez ryzyka kolizji
  const lo = Math.min(p.x, n.x);
  const xs = dir > 0 ? new Map([[n.id, lo], [p.id, lo + n.width]]) : new Map([[p.id, lo], [n.id, lo + p.width]]);
  return setWallXY(freezeWallRow(config, p.wall), xs);
}

// Szafki dolne i słupki: zmiana kolejności tak, by środek przeciąganej szafki (center, cm) trafił najbliżej swojego miejsca.
export function reorderFloorModule(config, id, center) {
  const mod = config.modules.find((m) => m.id === id);
  if (!mod) return config;
  const lane = (m) => m.wall === mod.wall && MODULES[m.type].row !== 'wall';
  const others = config.modules.filter((m) => lane(m) && m.id !== id);
  let pos = rowStart(mod.wall, 'base');
  let bestK = 0;
  let bestD = Infinity;
  for (let k = 0; k <= others.length; k++) {
    const dist = Math.abs(pos + mod.width / 2 - center);
    if (dist < bestD) {
      bestD = dist;
      bestK = k;
    }
    if (k < others.length) pos += others[k].width;
  }
  const order = [...others.slice(0, bestK), mod, ...others.slice(bestK)];
  let j = 0;
  const modules = config.modules.map((m) => (lane(m) ? order[j++] : m));
  const changed = modules.some((m, i) => m !== config.modules[i]);
  return changed ? { ...config, modules } : config;
}
