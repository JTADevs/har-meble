// Modele mebli do sekcji „Twój kolor” – zbudowane z tych samych klocków i specyfikacji co konfigurator
// (Box / FrontPanel / Handle, moduleSpec, wardrobeSpec). Wymiary w cm, S = 0.01 (1 cm = 0,01 m).
// Materiały przychodzą z zewnątrz (m.front, m.body…), bo ColorStage zmienia je w locie przy wyborze dekoru.
import * as THREE from 'three';
import { GAP, T } from '../../../../../shared/catalog.js';
import { moduleSpec } from '../../../../../shared/kitchen.js';
import { wardrobeSpec } from '../../../../../shared/wardrobe.js';
import { S } from '../../../../three/materials.js';
import { Box, FrontPanel, Handle, handleSpec } from '../../../../three/geometry.jsx';

// Front (drzwi / szuflada) w pozycji zamkniętej + uchwyty. x, y – położenie szafki; f – front ze specyfikacji.
function Front({ x = 0, y = 0, z, f, mat, style, handles, handleType, seed }) {
  return (
    <group position={[(x + f.x) * S, (y + f.y) * S, z * S]}>
      <FrontPanel w={f.w} h={f.h} mat={mat} style={style} seed={seed} />
      {handles.map((spec, i) => (
        <Handle key={i} spec={spec} type={handleType} />
      ))}
    </group>
  );
}

// --- kuchnia: szafka z drzwiami + szafka z szufladami, blat dąb, szafka wisząca, fragment ściany ------------

const K = { plinth: 10, H: 72, D: 56, ct: 3.8, ctD: 62, wallX: 20, wallY: 145, wallD: 32 };
const K_DOOR = moduleSpec('dolna_drzwi', 60);
const K_DRAWERS = moduleSpec('dolna_szuflady', 60);
const K_WALL = moduleSpec('gorna_drzwi', 80);
const K_TOP = K.plinth + K.H + K.ct; // wierzch blatu: 85,8 cm

function KitchenModel({ m }) {
  return (
    <>
      {/* fragment ściany i płytki „cegiełka” między blatem a szafką wiszącą */}
      <Box x={-12} y={0} z={-8} w={144} h={232} d={8} mat={m.wall} round={0.8} seed={1} />
      <Box x={0} y={K_TOP} z={0} w={120} h={K.wallY - K_TOP} d={0.6} mat={m.tiles} cast={false} seed={2} />

      {/* korpusy dolne (boki widoczne na końcach) i cokół cofnięty o 6 cm – jak w konfiguratorze */}
      <Box x={0} y={K.plinth} z={0} w={120} h={K.H} d={K.D} mat={m.body} seed={3} />
      <Box x={0} y={0} z={K.D - 6} w={120} h={K.plinth - 0.4} d={1.8} mat={m.body} seed={4} />
      {K_DOOR.fronts.map((f, i) => (
        <Front
          key={`d${i}`}
          y={K.plinth}
          z={K.D}
          f={f}
          mat={m.front}
          style="ramowy"
          handles={[handleSpec(f, 'base', K.plinth)]}
          handleType="galka_mosiadz"
          seed={11 + i * 5}
        />
      ))}
      {K_DRAWERS.fronts.map((f, i) => (
        <Front
          key={`s${i}`}
          x={60}
          y={K.plinth}
          z={K.D}
          f={f}
          mat={m.front}
          style="ramowy"
          handles={[handleSpec(f, 'base', K.plinth)]}
          handleType="galka_mosiadz"
          seed={31 + i * 7}
        />
      ))}

      {/* blat laminowany 38 mm w dekorze dąb naturalny (słoje wzdłuż blatu) */}
      <Box x={0} y={K.plinth + K.H} z={0} w={120} h={K.ct} d={K.ctD} mat={m.oak} round={0.3} seed={5} />

      {/* szafka wisząca 80 cm, dwoje drzwi */}
      <Box x={K.wallX} y={K.wallY} z={0} w={80} h={72} d={K.wallD} mat={m.body} seed={6} />
      {K_WALL.fronts.map((f, i) => (
        <Front
          key={`w${i}`}
          x={K.wallX}
          y={K.wallY}
          z={K.wallD}
          f={f}
          mat={m.front}
          style="ramowy"
          handles={[handleSpec(f, 'wall', K.wallY)]}
          handleType="galka_mosiadz"
          seed={57 + i * 9}
        />
      ))}

      {/* dodatki na blacie: deska oparta o płytki i ceramiczny pojemnik z drewnianą pokrywką */}
      <group position={[86 * S, K_TOP * S, 5.8 * S]} rotation-x={-0.12}>
        <Box x={0} y={0} z={0} w={26} h={38} d={1.6} mat={m.oak} round={0.6} seed={8} />
      </group>
      <mesh position={[22 * S, (K_TOP + 7) * S, 17 * S]} material={m.ceramic}>
        <cylinderGeometry args={[5.4 * S, 5.8 * S, 14 * S, 36]} />
      </mesh>
      <mesh position={[22 * S, (K_TOP + 14.9) * S, 17 * S]} material={m.oak}>
        <cylinderGeometry args={[5.1 * S, 5.3 * S, 1.8 * S, 36]} />
      </mesh>
    </>
  );
}

// --- szafa: 100 × 216 × 60 cm, dwoje drzwi uchylnych z frontem ryflowanym --------------------------------

const W_SPEC = wardrobeSpec({ width: 100, height: 216, depth: 60, doors: 'uchylne', mirror: false, sections: [{ interior: 'polki' }] });

function WardrobeModel({ m }) {
  const { W, H, D, plinth, doors } = W_SPEC;
  return (
    <>
      <Box x={0} w={T} h={H} d={D} mat={m.body} seed={1} />
      <Box x={W - T} w={T} h={H} d={D} mat={m.body} seed={2} />
      <Box x={T} y={H - T} w={W - 2 * T} h={T} d={D} mat={m.body} seed={3} />
      <Box x={T} y={plinth} w={W - 2 * T} h={T} d={D} mat={m.body} seed={4} />
      <Box x={T} y={0} z={D - 6 - T} w={W - 2 * T} h={plinth} d={T} mat={m.body} seed={5} />
      <Box x={T} y={plinth + T} w={W - 2 * T} h={H - plinth - 2 * T} d={0.3} mat={m.body} cast={false} seed={6} />
      {doors.map((f, i) => (
        <Front
          key={i}
          z={D}
          f={f}
          mat={m.front}
          style="ryflowany"
          handles={[handleSpec(f, 'tall', 0)]}
          handleType="listwa_czarna"
          seed={i * 23 + 7}
        />
      ))}
    </>
  );
}

// --- komoda: 110 × 72 × 45 cm na nóżkach 14 cm, trzy szuflady z dwiema gałkami ---------------------------

const C = { W: 110, H: 72, D: 45, legs: 14 };
const C_TOP = C.legs + C.H;
const C_DRAWERS = (() => {
  const h = (C.H - GAP * 3) / 3;
  return [0, 1, 2].map((i) => ({ kind: 'drawer', x: GAP / 2, y: i * (h + GAP), w: C.W - GAP, h }));
})();
const C_LEGS = [
  [6.5, 6],
  [C.W - 6.5, 6],
  [6.5, C.D - 6],
  [C.W - 6.5, C.D - 6],
];
// profil wazonu (promień, wysokość) w cm – obracany wokół osi Y
const VASE = [
  [0, 0],
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
  [0, 23.8],
].map(([r, y]) => new THREE.Vector2(r * S, y * S));

function DresserModel({ m }) {
  return (
    <>
      {C_LEGS.map(([x, z], i) => (
        <mesh key={i} position={[x * S, (C.legs / 2) * S, z * S]} material={m.leg}>
          <cylinderGeometry args={[1.7 * S, 1.05 * S, C.legs * S, 24]} />
        </mesh>
      ))}
      <Box x={0} y={C.legs} z={0} w={C.W} h={C.H} d={C.D} mat={m.body} round={0.3} seed={2} />
      {C_DRAWERS.map((f, i) => (
        <Front
          key={i}
          y={C.legs}
          z={C.D}
          f={f}
          mat={m.front}
          style="gladki"
          handles={[
            { x: f.w * 0.25, y: f.h / 2 },
            { x: f.w * 0.75, y: f.h / 2 },
          ]}
          handleType="galka_mosiadz"
          seed={i * 13 + 3}
        />
      ))}
      {/* dekoracje na blacie: dwie książki i ceramiczny wazon */}
      <Box x={13} y={C_TOP} z={12} w={25} h={3.2} d={18} mat={m.bookA} round={0.3} seed={9} />
      <Box x={15} y={C_TOP + 3.2} z={13} w={21} h={2.6} d={16} mat={m.bookB} round={0.3} seed={10} />
      <mesh position={[88 * S, C_TOP * S, 22 * S]} material={m.ceramic}>
        <latheGeometry args={[VASE, 40]} />
      </mesh>
    </>
  );
}

// --- definicje dla sceny ------------------------------------------------------------------------------
// bounds – obrys bryły w cm (oś obrotu = środek podstawy); frame – parametry kadrowania (framing.js);
// fluted – front ryflowany (osobny materiał dla korpusu, bez lameli); shadow – kształty miękkiego cienia.
const box = (x0, x1, z0, z1, a, blur) => ({ x0, x1, z0, z1, a, blur });

export const MODEL_DEFS = [
  {
    id: 'kuchnia',
    Model: KitchenModel,
    bounds: { x0: -12, x1: 132, z0: -8, z1: 62, h: 232 },
    pitch: 9,
    fluted: false,
    shadow: [box(-14, 134, -9, 60, 0.24, 26), box(0, 120, 0, 54, 0.36, 7), box(-12, 132, -8, 0.5, 0.5, 3)],
  },
  {
    id: 'szafa',
    Model: WardrobeModel,
    bounds: { x0: 0, x1: 100, z0: 0, z1: 63.6, h: 216 },
    pitch: 7,
    fluted: true,
    shadow: [box(-2, 102, -1, 63, 0.24, 24), box(0, 100, 0, 61.5, 0.5, 3.5)],
  },
  {
    id: 'komoda',
    Model: DresserModel,
    bounds: { x0: 0, x1: 110, z0: 0, z1: 49, h: 110 },
    pitch: 14,
    fluted: false,
    shadow: [
      box(0, 110, 0, 46, 0.3, 16),
      ...C_LEGS.map(([x, z]) => ({ x0: x - 1.2, x1: x + 1.2, z0: z - 1.2, z1: z + 1.2, a: 0.55, blur: 2.4, round: true })),
    ],
  },
];
