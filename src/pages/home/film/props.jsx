// Rekwizyty do filmu w hero (generowane w kodzie, bez plików 3D): wazony, misy, książki, rośliny, lampa,
// obraz, torba, owoce. Wymiary w cm (jak reszta sceny), materiały współdzielone z pamięci podręcznej.
import * as THREE from 'three';
import { useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S } from '../../../three/materials.js';

const matCache = new Map();
export function mat(color, roughness = 0.6, metalness = 0, extra = {}) {
  const key = `${color}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  return matCache.get(key);
}

const geoCache = new Map();
function cachedGeo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

const lathe = (key, pts, segments = 48) =>
  cachedGeo(`lathe|${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x * S, y * S)), segments));

// --- naczynia ---------------------------------------------------------------------

const VASE_PROFILES = {
  amfora: [
    [0, 0],
    [4.5, 0],
    [6.5, 2],
    [8, 8],
    [7.6, 14],
    [5.2, 19],
    [3.2, 22],
    [3, 26],
    [3.7, 28],
    [3.2, 28.2],
    [2.4, 26],
  ],
  kula: [
    [0, 0],
    [4, 0],
    [8, 3],
    [9.5, 8],
    [8.6, 13],
    [5, 16.4],
    [3.4, 17.6],
    [3.6, 19],
    [3, 19.1],
    [2.6, 17.8],
  ],
  walec: [
    [0, 0],
    [5, 0],
    [5.4, 1],
    [5.4, 24],
    [5, 24.2],
    [4.6, 23],
  ],
  butelka: [
    [0, 0],
    [5.5, 0],
    [6.2, 1.5],
    [6.2, 14],
    [4.5, 18],
    [1.9, 21],
    [1.8, 30],
    [2.2, 30.6],
    [1.5, 30.8],
  ],
};

export function Vase({ position = [0, 0, 0], kind = 'amfora', color = '#efe7da', scale = 1, rotation }) {
  return (
    <mesh
      geometry={lathe(kind, VASE_PROFILES[kind])}
      material={mat(color, 0.55)}
      position={position.map((v) => v * S)}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

export function Bowl({ position = [0, 0, 0], color = '#e9e1d3', fruit = '#e8c23a', count = 4, radius = 12 }) {
  const k = radius / 12;
  const fruits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.4;
        const r = i === 0 ? 0 : 4.6 * k;
        return [Math.cos(a) * r, 3.6 * k + (i === 0 ? 2.2 * k : 0), Math.sin(a) * r];
      }),
    [count, k],
  );
  return (
    <group position={position.map((v) => v * S)} scale={k}>
      <mesh
        geometry={lathe('bowl', [
          [0, 0],
          [5.5, 0],
          [9.5, 2.4],
          [12, 6],
          [11.4, 6.2],
          [9, 3],
          [5, 1.1],
          [0, 0.9],
        ])}
        material={mat(color, 0.45)}
        castShadow
        receiveShadow
      />
      {fruits.map((p, i) => (
        <mesh key={i} position={p.map((v) => (v * S) / k)} scale={[1, 0.88, 1]} material={mat(fruit, 0.5)} castShadow>
          <sphereGeometry args={[3.3 * S, 24, 16]} />
        </mesh>
      ))}
    </group>
  );
}

export function Mug({ position = [0, 0, 0], color = '#f2ede4', rotation = 0 }) {
  return (
    <group position={position.map((v) => v * S)} rotation-y={rotation}>
      <mesh position={[0, 4.5 * S, 0]} material={mat(color, 0.35)} castShadow receiveShadow>
        <cylinderGeometry args={[4 * S, 3.8 * S, 9 * S, 32]} />
      </mesh>
      <mesh position={[4.3 * S, 4.6 * S, 0]} material={mat(color, 0.35)} castShadow>
        <torusGeometry args={[2.3 * S, 0.65 * S, 10, 24, Math.PI]} />
      </mesh>
    </group>
  );
}

export function Candle({ position = [0, 0, 0], color = '#f1eadd', h = 9 }) {
  return (
    <mesh position={[position[0] * S, (position[1] + h / 2) * S, position[2] * S]} material={mat(color, 0.7)} castShadow receiveShadow>
      <cylinderGeometry args={[3.2 * S, 3.2 * S, h * S, 28]} />
    </mesh>
  );
}

export function Sphere({ position = [0, 0, 0], r = 6, color = '#2b2b2c', roughness = 0.5 }) {
  return (
    <mesh position={[position[0] * S, (position[1] + r) * S, position[2] * S]} material={mat(color, roughness)} castShadow receiveShadow>
      <sphereGeometry args={[r * S, 32, 20]} />
    </mesh>
  );
}

// --- książki ------------------------------------------------------------------------

const PAGE = '#f3eee4';

// Książka stojąca: t = grubość (oś X), h = wysokość, d = głębokość.
export function Book({ position = [0, 0, 0], t = 3, h = 24, d = 17, color = '#3d5a80', rotation }) {
  return (
    <group position={position.map((v) => v * S)} rotation={rotation}>
      <mesh position={[0, (h / 2) * S, 0]} material={mat(color, 0.7)} castShadow receiveShadow>
        <boxGeometry args={[t * S, h * S, d * S]} />
      </mesh>
      <mesh position={[0, (h / 2) * S, 0.4 * S]} material={mat(PAGE, 0.9)}>
        <boxGeometry args={[(t - 0.5) * S, (h - 0.8) * S, (d - 0.2) * S]} />
      </mesh>
    </group>
  );
}

const BOOK_COLORS = ['#3d5a80', '#ee6c4d', '#e0c58f', '#293241', '#98c1d9', '#c9ada7', '#6d6875', '#7a8c69', '#b5633e', '#efe6d6'];

// Rząd książek na półce (stojące, różne wysokości) – szerokość ok. w cm.
export function BookRow({ position = [0, 0, 0], w = 24, seed = 0, maxH = 26, lean = true }) {
  const books = useMemo(() => {
    const out = [];
    let x = 0;
    let i = 0;
    while (x < w - 2) {
      const t = 2.2 + ((seed * 7 + i * 13) % 5) * 0.7;
      const h = maxH - 6 + ((seed * 3 + i * 11) % 7);
      out.push({ x: x + t / 2, t, h, color: BOOK_COLORS[(seed + i * 3) % BOOK_COLORS.length] });
      x += t + 0.2;
      i += 1;
    }
    return out;
  }, [w, seed, maxH]);
  const last = books[books.length - 1]; // bez .at() – Safari < 15.4 / Chrome < 92
  return (
    <group position={position.map((v) => v * S)}>
      {books.map((b, i) => (
        <Book key={i} position={[b.x, 0, 0]} t={b.t} h={b.h} d={16} color={b.color} />
      ))}
      {lean && last && <Book position={[last.x + last.t + 4, 0, 0]} t={2.6} h={maxH - 4} d={16} color="#d8cbb8" rotation={[0, 0, -0.32]} />}
    </group>
  );
}

// Stos książek leżących.
export function BookStack({ position = [0, 0, 0], count = 3, seed = 0, rotation = 0 }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        w: 22 - ((seed + i * 5) % 4) * 1.6,
        d: 16 - ((seed + i * 3) % 3) * 1.2,
        t: 2.4 + ((seed + i) % 3) * 0.8,
        rot: (((seed + i * 7) % 5) - 2) * 0.05,
        color: BOOK_COLORS[(seed * 2 + i * 3) % BOOK_COLORS.length],
      })),
    [count, seed],
  );
  let y = 0;
  return (
    <group position={position.map((v) => v * S)} rotation-y={rotation}>
      {items.map((b, i) => {
        const yy = y;
        y += b.t;
        return (
          <group key={i} position={[0, yy * S, 0]} rotation-y={b.rot}>
            <mesh position={[0, (b.t / 2) * S, 0]} material={mat(b.color, 0.7)} castShadow receiveShadow>
              <boxGeometry args={[b.w * S, b.t * S, b.d * S]} />
            </mesh>
            <mesh position={[0.5 * S, (b.t / 2) * S, 0]} material={mat(PAGE, 0.9)}>
              <boxGeometry args={[(b.w - 0.6) * S, (b.t - 0.5) * S, (b.d + 0.02) * S]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- rośliny --------------------------------------------------------------------------

function leafGeometry(w, h) {
  return cachedGeo(`leaf|${w}|${h}`, () => {
    const s = new THREE.Shape();
    s.moveTo((-w / 2) * S, 0);
    s.quadraticCurveTo(-w * 0.62 * S, h * 0.55 * S, 0, h * S);
    s.quadraticCurveTo(w * 0.62 * S, h * 0.55 * S, (w / 2) * S, 0);
    s.closePath();
    return new THREE.ShapeGeometry(s, 8);
  });
}

const LEAF_MAT = () => mat('#4e6b3d', 0.6, 0, { side: THREE.DoubleSide });

// Sansewieria w donicy.
export function Plant({ position = [0, 0, 0], potColor = '#c46b46', scale = 1, leaves = 9, seed = 1 }) {
  const items = useMemo(
    () =>
      Array.from({ length: leaves }, (_, i) => {
        const a = (i / leaves) * Math.PI * 2 + seed;
        const r = 2.2 + ((i * 7 + seed) % 3);
        return {
          pos: [Math.cos(a) * r * S, 15.5 * S, Math.sin(a) * r * S],
          rotY: -a + Math.PI / 2,
          tilt: 0.12 + ((i * 5 + seed) % 4) * 0.07,
          w: 4.2 + ((i + seed) % 3) * 0.9,
          h: 34 + ((i * 11 + seed) % 5) * 6,
        };
      }),
    [leaves, seed],
  );
  return (
    <group position={position.map((v) => v * S)} scale={scale}>
      <mesh position={[0, 8 * S, 0]} material={mat(potColor, 0.75)} castShadow receiveShadow>
        <cylinderGeometry args={[8.5 * S, 6.8 * S, 16 * S, 32]} />
      </mesh>
      <mesh position={[0, 15.6 * S, 0]} rotation-x={-Math.PI / 2} material={mat('#3b2a1f', 0.95)}>
        <circleGeometry args={[7.9 * S, 24]} />
      </mesh>
      {items.map((l, i) => (
        // grupa obraca liść „na zewnątrz” donicy, a mesh pochyla go od pionu
        <group key={i} position={l.pos} rotation-y={l.rotY}>
          <mesh geometry={leafGeometry(l.w, l.h)} material={LEAF_MAT()} rotation-x={l.tilt} castShadow />
        </group>
      ))}
    </group>
  );
}

// Suche gałązki w wazonie (cienkie łodygi z drobnymi kulkami).
export function Branches({ position = [0, 0, 0], color = '#c9b08a', count = 5, h = 46, seed = 2 }) {
  const stems = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + seed;
        return { rotZ: Math.cos(a) * 0.28, rotX: Math.sin(a) * 0.28, h: h - ((i * 7) % 3) * 6 };
      }),
    [count, h, seed],
  );
  return (
    <group position={position.map((v) => v * S)}>
      {stems.map((st, i) => (
        <group key={i} rotation={[st.rotX, 0, st.rotZ]}>
          <mesh position={[0, (st.h / 2) * S, 0]} material={mat('#8a6f4f', 0.8)} castShadow>
            <cylinderGeometry args={[0.18 * S, 0.3 * S, st.h * S, 6]} />
          </mesh>
          {Array.from({ length: 6 }, (_, j) => (
            <mesh key={j} position={[((j % 2) - 0.5) * 2.4 * S, (st.h * 0.55 + j * 3.2) * S, 0]} material={mat(color, 0.9)} castShadow>
              <sphereGeometry args={[(1.6 - j * 0.12) * S, 10, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// --- lampa, obraz, torba ----------------------------------------------------------------

// Lampa „grzybek”: klosz, nóżka, podstawa; wewnątrz świecąca kula (z bloomem wygląda jak zapalona).
export function MushroomLamp({ position = [0, 0, 0], color = '#efe4cf', glow = true }) {
  return (
    <group position={position.map((v) => v * S)}>
      <mesh position={[0, 0.6 * S, 0]} material={mat(color, 0.35)} castShadow receiveShadow>
        <cylinderGeometry args={[6.5 * S, 7 * S, 1.2 * S, 32]} />
      </mesh>
      <mesh position={[0, 8 * S, 0]} material={mat(color, 0.35)} castShadow>
        <cylinderGeometry args={[1.5 * S, 1.8 * S, 14 * S, 20]} />
      </mesh>
      <mesh
        position={[0, 13 * S, 0]}
        geometry={lathe('lampshade', [
          [0, 9],
          [6, 8.4],
          [10.5, 6],
          [13, 2.4],
          [13.4, 0.2],
          [12.8, 0],
          [12.4, 2],
          [0, 2.6],
        ])}
        material={mat(color, 0.3)}
        castShadow
      />
      {glow && (
        <mesh position={[0, 14 * S, 0]} material={mat('#fff1d0', 0.4, 0, { emissive: '#ffd79a', emissiveIntensity: 5 })}>
          <sphereGeometry args={[3.2 * S, 16, 12]} />
        </mesh>
      )}
    </group>
  );
}

let artTexture = null;
// Abstrakcyjna grafika (łuki i koła w kolorach dekorów) – oryginalna, generowana w canvas.
// Eksport: film przygotowuje ją w wolnej chwili, zanim zamontuje płótno.
export function getArtTexture() {
  if (artTexture) return artTexture;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 704;
  const g = c.getContext('2d');
  g.fillStyle = '#efe7da';
  g.fillRect(0, 0, 512, 704);
  g.fillStyle = '#b5633e';
  g.beginPath();
  g.arc(170, 470, 150, Math.PI, 0);
  g.fill();
  g.fillStyle = '#2f4a3b';
  g.fillRect(256, 120, 170, 300);
  g.fillStyle = '#d2a13c';
  g.beginPath();
  g.arc(360, 560, 86, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1d1814';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(150, 230, 90, -Math.PI * 0.2, Math.PI * 0.9);
  g.stroke();
  g.fillStyle = '#9dab95';
  g.fillRect(60, 580, 140, 60);
  artTexture = new THREE.CanvasTexture(c);
  artTexture.colorSpace = THREE.SRGBColorSpace;
  return artTexture;
}

export function ArtFrame({ position = [0, 0, 0], w = 50, h = 70, rotation, frameColor = '#c9a27a' }) {
  const art = useMemo(() => new THREE.MeshStandardMaterial({ map: getArtTexture(), roughness: 0.85 }), []);
  return (
    <group position={position.map((v) => v * S)} rotation={rotation}>
      <mesh position={[0, (h / 2) * S, 0]} material={mat(frameColor, 0.55)} castShadow receiveShadow>
        <boxGeometry args={[w * S, h * S, 2.2 * S]} />
      </mesh>
      <mesh position={[0, (h / 2) * S, 1.15 * S]} material={art}>
        <planeGeometry args={[(w - 5) * S, (h - 5) * S]} />
      </mesh>
    </group>
  );
}

export function ToteBag({ position = [0, 0, 0], color = '#e8dfd0', rotation }) {
  const body = useMemo(() => cachedGeo('tote', () => new RoundedBoxGeometry(36 * S, 34 * S, 9 * S, 3, 2.5 * S)), []);
  return (
    <group position={position.map((v) => v * S)} rotation={rotation}>
      <mesh geometry={body} position={[0, 17 * S, 0]} material={mat(color, 0.85)} castShadow receiveShadow />
      <mesh position={[0, 34 * S, 0]} material={mat('#6b4a33', 0.6)} castShadow>
        <torusGeometry args={[9 * S, 0.9 * S, 10, 32, Math.PI]} />
      </mesh>
    </group>
  );
}

// Płaski „magazyn” z okładką – do kompozycji z góry.
export function Magazine({ position = [0, 0, 0], rotation = 0 }) {
  const cover = useMemo(() => new THREE.MeshStandardMaterial({ map: getArtTexture(), roughness: 0.6 }), []);
  return (
    <group position={position.map((v) => v * S)} rotation-y={rotation}>
      <mesh position={[0, 0.3 * S, 0]} material={mat(PAGE, 0.9)} castShadow receiveShadow>
        <boxGeometry args={[22 * S, 0.6 * S, 29 * S]} />
      </mesh>
      <mesh position={[0, 0.62 * S, 0]} rotation-x={-Math.PI / 2} material={cover}>
        <planeGeometry args={[22 * S, 29 * S]} />
      </mesh>
    </group>
  );
}

// Para kapci – do kompozycji z góry.
export function Slippers({ position = [0, 0, 0], color = '#d9aea6', rotation = 0 }) {
  const geo = useMemo(() => cachedGeo('slipper', () => new RoundedBoxGeometry(10 * S, 3.5 * S, 26 * S, 3, 1.6 * S)), []);
  return (
    <group position={position.map((v) => v * S)} rotation-y={rotation}>
      {[-6.5, 6.5].map((x, i) => (
        <mesh key={x} geometry={geo} position={[x * S, 1.75 * S, (i ? 2 : 0) * S]} rotation-y={i ? 0.08 : -0.06} material={mat(color, 0.9)} castShadow receiveShadow />
      ))}
    </group>
  );
}
