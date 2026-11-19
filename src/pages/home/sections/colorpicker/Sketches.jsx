// Szkice 2D (widok z przodu) – zaślepki pokazywane, zanim wczyta się scena 3D, i zapas, gdy WebGL
// jest niedostępny. Proporcje i podziały frontów są takie same jak w modelach 3D (wymiary w cm),
// a kolor frontów bierze się ze zmiennej --h-color-fill, więc próbki działają także bez 3D.
import { useId } from 'react';

// stałe kolory elementów, które nie zmieniają dekoru (z katalogu: dąb naturalny, mosiądz, czarny mat)
const OAK = '#c69c6d';
const BRASS = '#c9a04f';
const BLACK = '#1f1f20';

// prostokąt we współrzędnych mebla (y od podłogi w górę) → SVG (y w dół)
function rect(H, x, y, w, h, className, rx) {
  return <rect x={x} y={H - y - h} width={w} height={h} rx={rx} className={className} />;
}

function Frame({ H, x, y, w, h }) {
  const fw = Math.min(6.5, w * 0.2, h * 0.2);
  return (
    <>
      {rect(H, x, y, w, h, 'h-color-sk-f h-color-sk-edge')}
      {Math.min(w, h) >= 22 && rect(H, x + fw, y + fw, w - 2 * fw, h - 2 * fw, 'h-color-sk-inset')}
    </>
  );
}

function Knob({ H, x, y }) {
  return <circle cx={x} cy={H - y} r={1.5} fill={BRASS} />;
}

function Shadow({ id, cx, y, rx }) {
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="currentColor" stopOpacity="0.24" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={y} rx={rx} ry={5} fill={`url(#${id})`} />
    </>
  );
}

function KitchenSketch({ gid }) {
  const H = 232;
  const drawers = [
    [10, 28.44],
    [38.74, 28.44],
    [67.48, 14.22],
  ];
  return (
    <svg className="h-color-sketch" viewBox="-12 0 144 232" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <Shadow id={gid} cx={60} y={H + 1} rx={92} />
      {rect(H, -12, 0, 144, 232, 'h-color-sk-wall h-color-sk-edge')}
      {rect(H, 0, 85.8, 120, 59.2, 'h-color-sk-tiles')}
      {[1, 2, 3, 4, 5, 6, 7].map((k) => (
        <line key={k} x1={0} x2={120} y1={H - 85.8 - k * 7.5} y2={H - 85.8 - k * 7.5} className="h-color-sk-grout" />
      ))}
      {rect(H, 0, 0, 120, 9.6, 'h-color-sk-f')}
      {rect(H, 0, 0, 120, 9.6, 'h-color-sk-shade')}
      <Frame H={H} x={0.15} y={10} w={59.7} h={71.7} />
      {drawers.map(([y, h]) => (
        <Frame key={y} H={H} x={60.15} y={y} w={59.7} h={h} />
      ))}
      <rect x={0} y={H - 85.8} width={120} height={3.8} rx={0.4} fill={OAK} className="h-color-sk-edge" />
      <Frame H={H} x={20.15} y={145.15} w={39.7} h={71.7} />
      <Frame H={H} x={60.15} y={145.15} w={39.7} h={71.7} />
      <Knob H={H} x={56.35} y={68.7} />
      <Knob H={H} x={90} y={34.44} />
      <Knob H={H} x={90} y={63.18} />
      <Knob H={H} x={90} y={77.7} />
      <Knob H={H} x={56.35} y={158.15} />
      <Knob H={H} x={63.65} y={158.15} />
      <rect x={86} y={H - 85.8 - 37.7} width={26} height={37.7} rx={1.2} fill={OAK} className="h-color-sk-edge" />
      {rect(H, 16.6, 85.8, 10.8, 14, 'h-color-sk-cer h-color-sk-edge', 2)}
      <rect x={16.9} y={H - 99.8 - 1.8} width={10.2} height={1.8} rx={0.6} fill={OAK} />
    </svg>
  );
}

function WardrobeSketch({ gid }) {
  const H = 216;
  const flutes = [];
  for (const x0 of [0.15, 50.15]) for (let x = x0 + 3.2; x < x0 + 49.6; x += 3.2) flutes.push(x);
  return (
    <svg className="h-color-sketch" viewBox="0 0 100 216" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <Shadow id={gid} cx={50} y={H + 1} rx={66} />
      {rect(H, 0, 0, 100, 216, 'h-color-sk-f')}
      {rect(H, 1.8, 0, 96.4, 8, 'h-color-sk-shade h-color-sk-deep')}
      {rect(H, 0.15, 8.15, 49.7, 207.7, 'h-color-sk-f h-color-sk-edge')}
      {rect(H, 50.15, 8.15, 49.7, 207.7, 'h-color-sk-f h-color-sk-edge')}
      {flutes.map((x) => (
        <line key={x} x1={x} x2={x} y1={0.15} y2={207.85} className="h-color-sk-flute" />
      ))}
      <rect x={45.75} y={H - 125} width={1.2} height={40} rx={0.4} fill={BLACK} />
      <rect x={53.05} y={H - 125} width={1.2} height={40} rx={0.4} fill={BLACK} />
    </svg>
  );
}

// profil wazonu (promień, wysokość) – ten sam co w modelu 3D
const VASE = [
  [4.6, 0],
  [5.6, 1.2],
  [6.4, 4.5],
  [6.5, 8],
  [5.8, 12.5],
  [4.2, 16],
  [2.6, 19],
  [2.2, 21.5],
  [2.5, 23.2],
  [2.3, 23.8],
];

function DresserSketch({ gid }) {
  const H = 110;
  const top = 86;
  const dh = (72 - 0.9) / 3;
  const leg = (x) => `M${x - 1.7} ${H - 14}H${x + 1.7}L${x + 1.05} ${H}H${x - 1.05}Z`;
  const right = VASE.map(([r, y]) => `${88 + r} ${H - top - y}`);
  const left = [...VASE].reverse().map(([r, y]) => `${88 - r} ${H - top - y}`);
  return (
    <svg className="h-color-sketch" viewBox="0 0 110 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <Shadow id={gid} cx={55} y={H + 1} rx={70} />
      <path d={leg(6.5)} fill={OAK} />
      <path d={leg(103.5)} fill={OAK} />
      {rect(H, 0, 14, 110, 72, 'h-color-sk-f h-color-sk-edge', 0.4)}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          {rect(H, 0.15, 14 + i * (dh + 0.3), 109.7, dh, 'h-color-sk-f h-color-sk-edge')}
          <Knob H={H} x={0.15 + 109.7 * 0.25} y={14 + i * (dh + 0.3) + dh / 2} />
          <Knob H={H} x={0.15 + 109.7 * 0.75} y={14 + i * (dh + 0.3) + dh / 2} />
        </g>
      ))}
      {rect(H, 13, top, 25, 3.2, 'h-color-sk-book', 0.3)}
      {rect(H, 15, top + 3.2, 21, 2.6, 'h-color-sk-book h-color-sk-book--dark', 0.3)}
      <path d={`M${right.join('L')}L${left.join('L')}Z`} className="h-color-sk-cer h-color-sk-edge" />
    </svg>
  );
}

const SKETCHES = { kuchnia: KitchenSketch, szafa: WardrobeSketch, komoda: DresserSketch };

export function ModelSketch({ kind }) {
  const gid = `h-color-sh-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const Sketch = SKETCHES[kind];
  return Sketch ? <Sketch gid={gid} /> : null;
}
