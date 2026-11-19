// Meble do filmu w hero: parametryczna szafka (kolumny × komórki) z animacją składania w czasie ujęcia.
// Wymiary w cm; czas animacji w sekundach od początku ujęcia (film.st).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FT, GAP, T } from '../../../../shared/catalog.js';
import { S } from '../../../three/materials.js';
import { Box, FrontPanel, Handle } from '../../../three/geometry.jsx';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const ease = {
  outCubic: (k) => 1 - (1 - k) ** 3,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  outBack: (k) => {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
  },
  outQuint: (k) => 1 - (1 - k) ** 5,
};

// Grupa animowana zależnie od czasu ujęcia. kind:
//  grow    – rośnie w osi Y od dołu (pivot = dół grupy)
//  pop     – skaluje się od zera z lekkim „odbiciem” (pivot = środek podstawy)
//  slideZ  – wjeżdża w osi Z z odległości `from` cm
//  drop    – opada w osi Y z wysokości `from` cm
//  openclose – wysuwa się w osi Z o `from` cm między at…at+0.5 s i wraca po `hold` s
export function AnimPiece({ film, shot, at = 0, dur = 0.5, kind = 'pop', from = 30, hold = 1.2, pos = [0, 0, 0], children }) {
  const ref = useRef(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const f = film.current ?? film;
    const st = f.shot === shot ? f.st : 1e6; // poza ujęciem – stan końcowy
    const k = clamp01((st - at) / dur);
    switch (kind) {
      case 'grow':
        g.scale.set(1, Math.max(1e-4, ease.outCubic(k)), 1);
        break;
      case 'pop': {
        const s = Math.max(1e-4, ease.outBack(k));
        g.scale.set(s, s, s);
        break;
      }
      case 'slideZ':
        g.position.z = (pos[2] + (1 - ease.outQuint(k)) * from) * S;
        g.scale.setScalar(k > 0 ? 1 : 1e-4);
        break;
      case 'drop':
        g.position.y = (pos[1] + (1 - ease.outCubic(k)) * from) * S;
        g.scale.setScalar(k > 0 ? 1 : 1e-4);
        break;
      case 'openclose': {
        const open = ease.inOutCubic(k);
        const close = ease.inOutCubic(clamp01((st - at - dur - hold) / dur));
        g.position.z = (pos[2] + (open - close) * from) * S;
        break;
      }
      default:
        break;
    }
  });
  return (
    <group ref={ref} position={pos.map((v) => v * S)}>
      {children}
    </group>
  );
}

// Brak animacji – zwykła grupa (gdy timing nie jest podany).
function Static({ pos = [0, 0, 0], children }) {
  return <group position={pos.map((v) => v * S)}>{children}</group>;
}

/**
 * Szafka/komoda/regał.
 * cols: [{ w, cells: [{ h, type: 'door'|'drawer'|'open', hinge: 'left'|'right' }] }] – komórki od dołu; ostatnia wypełnia resztę.
 * mats: { carcass, front, back? }  style: styl frontu  handle: typ uchwytu (HANDLES)
 * legs: wysokość nóżek (cm, 0 = brak)  legMat: materiał nóżek
 * timing: { carcass: [start, krok], shelves: [start, krok], fronts: [start, krok], content: [start, krok] } – sekundy od początku ujęcia
 * drawers: { at, hold, amount, step } – wysuwanie szuflad w trakcie ujęcia
 * fill(col, cell, box) – treść komórek otwartych (box w cm: x, y, w, h, d)
 */
export function Unit({ w, h, d, cols, mats, style = 'gladki', handle = 'bezuchwytowe', handleTop = false, legs = 0, legMat, film, shot, timing, drawers, fill }) {
  const y0 = legs;
  const inner = w - T * (cols.length + 1);
  const nominal = cols.reduce((a, c) => a + c.w, 0);
  const A = (key, i, props, children) => {
    const t = timing?.[key];
    if (!t || !film) return (
      <Static key={`${key}-${i}`} pos={props.pos}>
        {children}
      </Static>
    );
    return (
      <AnimPiece key={`${key}-${i}`} film={film} shot={shot} at={t[0] + i * t[1]} dur={t[2] ?? 0.55} {...props}>
        {children}
      </AnimPiece>
    );
  };

  const pieces = { carcass: [], shelves: [], fronts: [], content: [] };
  let cIdx = 0;
  // boki i przegrody (rosną od dołu)
  const sideXs = [0];
  let x = T;
  cols.forEach((c) => {
    c.x = x;
    c.cw = (c.w / nominal) * inner;
    x += c.cw;
    sideXs.push(x);
    x += T;
  });
  sideXs.forEach((sx, i) => {
    const outer = i === 0 || i === sideXs.length - 1;
    pieces.carcass.push(
      A('carcass', cIdx++, { kind: 'grow', pos: [sx, y0, 0] }, <Box x={0} y={0} z={0} w={T} h={h} d={outer ? d : d - 1} mat={mats.carcass} />),
    );
  });
  pieces.carcass.push(A('carcass', cIdx++, { kind: 'grow', pos: [T, y0 + T, 0] }, <Box x={0} y={0} z={0} w={w - 2 * T} h={h - 2 * T} d={0.4} mat={mats.back || mats.carcass} cast={false} />));
  // wieńce
  let sIdx = 0;
  pieces.shelves.push(A('shelves', sIdx++, { kind: 'slideZ', from: -d, pos: [T, y0, 0] }, <Box x={0} y={0} z={0} w={w - 2 * T} h={T} d={d} mat={mats.carcass} />));
  pieces.shelves.push(A('shelves', sIdx++, { kind: 'slideZ', from: -d, pos: [0, y0 + h - T, 0] }, <Box x={0} y={0} z={0} w={w} h={T} d={d} mat={mats.carcass} round={0.2} />));

  let fIdx = 0;
  let fillIdx = 0;
  let drawerIdx = 0;
  cols.forEach((c, ci) => {
    const free = h - 2 * T;
    const fixed = c.cells.slice(0, -1).reduce((a, cell) => a + cell.h, 0);
    let cy = y0 + T;
    c.cells.forEach((cell, k) => {
      const last = k === c.cells.length - 1;
      const ch = last ? free - fixed - T * (c.cells.length - 1) : cell.h;
      // półka nad komórką (oprócz ostatniej)
      if (!last) {
        pieces.shelves.push(
          A('shelves', sIdx++, { kind: 'slideZ', from: -d, pos: [c.x, cy + ch, 0.4] }, <Box x={0} y={0} z={0} w={c.cw} h={T} d={d - 1.5} mat={mats.carcass} />),
        );
      }
      if (cell.type === 'open') {
        if (fill) {
          const content = fill(ci, k, { x: c.x, y: cy, w: c.cw, h: ch, d });
          if (content) pieces.content.push(A('content', fillIdx++, { kind: 'pop', pos: [c.x + c.cw / 2, cy, d / 2] }, content));
        }
      } else {
        // front nakładany: zakrywa komórkę i połowę sąsiednich płyt
        const fx = (ci === 0 ? 0 : c.x - T / 2) + GAP / 2;
        const fx1 = (ci === cols.length - 1 ? w : c.x + c.cw + T / 2) - GAP / 2;
        const fy = (k === 0 ? y0 : cy - T / 2) + GAP / 2;
        const fy1 = (last ? y0 + h : cy + ch + T / 2) - GAP / 2;
        const fw = fx1 - fx;
        const fh = fy1 - fy;
        const isDrawer = cell.type === 'drawer';
        const hinge = cell.hinge || (ci < cols.length / 2 ? 'left' : 'right');
        const spec = isDrawer
          ? { x: fw / 2, y: fh - Math.min(5, fh / 3), horiz: true, L: Math.min(fw * 0.5, 36) }
          : {
              x: hinge === 'left' ? fw - 4 : 4,
              y: handleTop ? fh - Math.min(18, fh * 0.4) / 2 - 4 : Math.min(fh - 10, Math.max(10, fh * 0.62)),
              horiz: false,
              L: Math.min(18, fh * 0.4),
            };
        const front = (
          <group>
            <FrontPanel w={fw} h={fh} mat={mats.front} style={style} seed={ci * 13 + k * 7 + (shot || 0) * 31} />
            <Handle spec={spec} type={handle} />
            {isDrawer && (
              // skrzynka szuflady (widoczna po wysunięciu)
              <Box x={3} y={3} z={-(d - 6)} w={fw - 6} h={Math.max(fh - 8, 4)} d={d - 6} mat={mats.carcass} />
            )}
          </group>
        );
        const slide = isDrawer && drawers ? drawers : null;
        const inner2 = slide ? (
          <AnimPiece film={film} shot={shot} kind="openclose" at={slide.at + drawerIdx++ * (slide.step ?? 0.15)} dur={0.55} hold={slide.hold} from={slide.amount}>
            {front}
          </AnimPiece>
        ) : (
          front
        );
        pieces.fronts.push(A('fronts', fIdx++, { kind: 'slideZ', from: 26, pos: [fx, fy, d] }, inner2));
      }
      cy += ch + T;
    });
  });

  // nóżki
  const legEls = [];
  if (legs > 0) {
    const lx = [4, w - 4];
    const lz = [5, d - 5];
    lx.forEach((xx) =>
      lz.forEach((zz) =>
        legEls.push(
          <mesh key={`${xx}-${zz}`} position={[xx * S, (legs / 2) * S, zz * S]} material={legMat} castShadow>
            <cylinderGeometry args={[1.1 * S, 0.8 * S, legs * S, 24]} />
          </mesh>,
        ),
      ),
    );
  }

  return (
    <group>
      {legEls}
      {pieces.carcass}
      {pieces.shelves}
      {pieces.fronts}
      {pieces.content}
    </group>
  );
}
