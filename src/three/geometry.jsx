// Lekki moduł 3D: geometria mebli (bryły z UV w realnej skali, fronty, uchwyty, drzwi, szuflady) i odbicia otoczenia.
// Bez path tracera i postprocessingu – importują go strona główna (film, kolory) i konfigurator (przez parts.jsx).
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FT, HANDLES } from '../../shared/catalog.js';
import { S, STATIC } from './materials.js';

const damp = THREE.MathUtils.damp;

// Prostopadłościan z UV w metrach (tekstury w realnej skali) i losowym przesunięciem wzoru,
// żeby każdy front miał inny fragment usłojenia – jak w prawdziwym meblu.
class WorldBoxGeometry extends THREE.BoxGeometry {
  constructor(w = 1, h = 1, d = 1, seed = 0) {
    super(w, h, d);
    const uv = this.attributes.uv;
    const dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    const frac = (v) => v - Math.floor(v);
    const ou = frac(Math.sin(seed * 12.9898 + 1.7) * 43758.5453) * 4;
    const ov = frac(Math.sin(seed * 78.233 + 4.1) * 24634.6345) * 4;
    for (let i = 0; i < uv.count; i++) {
      const [su, sv] = dims[Math.floor(i / 4)];
      uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
    }
  }
}
// Bryła z zaokrąglonymi krawędziami (fronty, blat, uchwyty) – krawędzie łapią światło jak w prawdziwym meblu.
// UV liczone projekcją pudełkową w metrach, więc tekstury mają tę samą skalę co na zwykłych bryłach.
class RoundBoxGeometry extends RoundedBoxGeometry {
  constructor(w = 1, h = 1, d = 1, radius = 0.002, seed = 0) {
    super(w, h, d, 2, Math.min(radius, Math.min(w, h, d) / 2 - 1e-5));
    const pos = this.attributes.position;
    const nor = this.attributes.normal;
    const uv = this.attributes.uv;
    const frac = (v) => v - Math.floor(v);
    const ou = frac(Math.sin(seed * 12.9898 + 1.7) * 43758.5453) * 4;
    const ov = frac(Math.sin(seed * 78.233 + 4.1) * 24634.6345) * 4;
    for (let i = 0; i < pos.count; i++) {
      const ax = Math.abs(nor.getX(i));
      const ay = Math.abs(nor.getY(i));
      const az = Math.abs(nor.getZ(i));
      let u;
      let v;
      if (ax >= ay && ax >= az) [u, v] = [pos.getZ(i) + d / 2, pos.getY(i) + h / 2];
      else if (ay >= az) [u, v] = [pos.getX(i) + w / 2, pos.getZ(i) + d / 2];
      else [u, v] = [pos.getX(i) + w / 2, pos.getY(i) + h / 2];
      uv.setXY(i, u + ou, v + ov);
    }
  }
}
extend({ WorldBoxGeometry, RoundBoxGeometry });

// Prostopadłościan podawany w cm, od lewego-dolnego-tylnego narożnika.
// round – promień zaokrąglenia krawędzi w cm (0 = ostre krawędzie, tańsze w renderze).
export function Box({ x = 0, y = 0, z = 0, w, h, d, mat, cast = true, seed, round = 0 }) {
  const sd = seed ?? x * 1.31 + y * 7.17 + z * 3.71 + w * 0.19;
  return (
    <mesh position={[(x + w / 2) * S, (y + h / 2) * S, (z + d / 2) * S]} material={mat} castShadow={cast} receiveShadow>
      {round > 0 ? <roundBoxGeometry args={[w * S, h * S, d * S, round * S, sd]} /> : <worldBoxGeometry args={[w * S, h * S, d * S, sd]} />}
    </mesh>
  );
}

// Front: gładki/ryflowany = jedna płyta (lamele robi mapa normalnych),
// ramowy = płyta z frezowaną ramką (rama wystaje 1 cm nad płycinę).
export function FrontPanel({ x = 0, w, h, mat, style, seed = 0 }) {
  if (style !== 'ramowy' || Math.min(w, h) < 22) return <Box x={x} w={w} h={h} d={FT} mat={mat} seed={seed} round={0.3} />;
  const fw = Math.min(6.5, w * 0.2, h * 0.2);
  const lip = 1;
  return (
    <>
      <Box x={x} w={w} h={h} d={FT - lip} mat={mat} seed={seed} round={0.2} />
      <Box x={x} z={FT - lip} w={fw} h={h} d={lip} mat={mat} seed={seed + 1} round={0.25} />
      <Box x={x + w - fw} z={FT - lip} w={fw} h={h} d={lip} mat={mat} seed={seed + 2} round={0.25} />
      <Box x={x + fw - 0.3} z={FT - lip} w={w - 2 * fw + 0.6} h={fw} d={lip - 0.05} mat={mat} seed={seed + 3} round={0.25} />
      <Box x={x + fw - 0.3} y={h - fw} z={FT - lip} w={w - 2 * fw + 0.6} h={fw} d={lip - 0.05} mat={mat} seed={seed + 4} round={0.25} />
    </>
  );
}

// Położenie uchwytu na froncie (współrzędne lokalne frontu, cm).
export function handleSpec(f, row, y0) {
  if (f.kind === 'drawer' || f.kind === 'flap') {
    return { x: f.w / 2, y: f.h - Math.min(4, f.h / 3), horiz: true, L: Math.min(f.w * 0.5, 40) };
  }
  const L = f.h > 100 ? 40 : Math.min(18, f.h * 0.45);
  let y;
  if (row === 'wall') y = L / 2 + 4;
  else if (row === 'base') y = f.h - L / 2 - 4;
  else if (f.h > 100) y = Math.min(f.h - L / 2 - 4, Math.max(L / 2 + 4, 105 - (y0 + f.y)));
  else y = L / 2 + 4;
  return { x: f.hinge === 'left' ? f.w - 3.5 : 3.5, y, horiz: false, L };
}

const HANDLE_MAT = { alu: STATIC.handle, black: STATIC.knob, brass: STATIC.brass };

// Gałka toczona (profil obracany wokół osi): szyjka, kołnierz i lekko wypukła główka; jedna geometria dla wszystkich gałek.
// Punkty [promień, wysokość] w cm – od powierzchni frontu na zewnątrz.
const KNOB_PROFILE = [
  [0, 0], [1.0, 0], [0.96, 0.14], [0.62, 0.42], [0.55, 0.7], [0.72, 1.02], [1.22, 1.38], [1.46, 1.6],
  [1.52, 1.78], [1.47, 1.98], [1.26, 2.18], [0.8, 2.33], [0.36, 2.4], [0, 2.42],
];
let knobGeo = null;
const getKnobGeo = () => {
  if (!knobGeo) knobGeo = new THREE.LatheGeometry(KNOB_PROFILE.map(([r, y]) => new THREE.Vector2(r * S, y * S)), 48);
  return knobGeo;
};

export function Handle({ spec, type, ox = 0 }) {
  const h = HANDLES[type];
  if (!spec || !h || h.shape === 'none') return null;
  const mat = HANDLE_MAT[h.finish];
  if (h.shape === 'knob') {
    return (
      <mesh position={[(ox + spec.x) * S, spec.y * S, FT * S]} rotation-x={Math.PI / 2} geometry={getKnobGeo()} material={mat} castShadow />
    );
  }
  const w = spec.horiz ? spec.L : 1.2;
  const hh = spec.horiz ? 1.2 : spec.L;
  return <Box x={ox + spec.x - w / 2} y={spec.y - hh / 2} z={FT} w={w} h={hh} d={1.8} mat={mat} round={0.45} />;
}

export function Door({ f, z, mat, open, handle, handleType, style, seed = 0, angle = 1.75 }) {
  const ref = useRef();
  const left = f.hinge === 'left';
  const target = open ? (left ? -angle : angle) : 0;
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y = damp(ref.current.rotation.y, target, 5, Math.min(dt, 0.05));
  });
  const ox = left ? 0 : -f.w;
  return (
    <group ref={ref} position={[(left ? f.x : f.x + f.w) * S, f.y * S, z * S]}>
      <FrontPanel x={ox} w={f.w} h={f.h} mat={mat} style={style} seed={seed} />
      <Handle spec={handle} type={handleType} ox={ox} />
    </group>
  );
}

export function Flap({ f, z, mat, open, handle, handleType, style, seed = 0 }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x = damp(ref.current.rotation.x, open ? 1.35 : 0, 5, Math.min(dt, 0.05));
  });
  return (
    <group ref={ref} position={[f.x * S, f.y * S, z * S]}>
      <FrontPanel w={f.w} h={f.h} mat={mat} style={style} seed={seed} />
      <Handle spec={handle} type={handleType} />
    </group>
  );
}

export function Drawer({ f, depth, mat, boxMat, open, handle, handleType, travel, style, seed = 0 }) {
  const ref = useRef();
  const target = open ? (travel ?? depth * 0.6) * S : 0;
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.z = damp(ref.current.position.z, target, 5, Math.min(dt, 0.05));
  });
  const bw = f.w - 4;
  const bh = Math.max(f.h - 7, 5);
  const bd = depth - 6;
  const x0 = f.x + 2;
  const y0 = f.y + 2.5;
  const z0 = depth - bd;
  return (
    <group ref={ref}>
      <group position={[f.x * S, f.y * S, depth * S]}>
        <FrontPanel w={f.w} h={f.h} mat={mat} style={style} seed={seed} />
        <Handle spec={handle} type={handleType} />
      </group>
      <Box x={x0} y={y0} z={z0} w={1.2} h={bh} d={bd} mat={boxMat} />
      <Box x={x0 + bw - 1.2} y={y0} z={z0} w={1.2} h={bh} d={bd} mat={boxMat} />
      <Box x={x0} y={y0} z={z0} w={bw} h={bh} d={1.2} mat={boxMat} />
      <Box x={x0} y={y0} z={z0} w={bw} h={0.8} d={bd} mat={boxMat} />
    </group>
  );
}

// Obrys jest tylko wizualny: bez trafiania kursorem. Linie w three.js łapią promień w promieniu
// raycaster.params.Line.threshold (domyślnie 1 jednostka = 1 m!) – obrys zaznaczonej szafki „kradł” kliknięcia sąsiadek.
const NO_RAYCAST = () => null;

export function Outline({ x, y, z, w, h, d, color, fill }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w * S, h * S, d * S)), [w, h, d]);
  useEffect(() => () => geo.dispose(), [geo]);
  const pos = [(x + w / 2) * S, (y + h / 2) * S, (z + d / 2) * S];
  return (
    <>
      <lineSegments geometry={geo} position={pos} renderOrder={10} raycast={NO_RAYCAST}>
        <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
      </lineSegments>
      {fill && (
        <mesh position={pos} material={STATIC.select} raycast={NO_RAYCAST}>
          <boxGeometry args={[w * S, h * S, d * S]} />
        </mesh>
      )}
    </>
  );
}

// Odbicia otoczenia: wnętrze „studyjne” generowane lokalnie (bez pobierania HDRI).
// Dla podglądu – PMREM, dla path tracera – cube mapa tego samego pomieszczenia.
export function RoomEnvironmentMap({ cubeRef, intensity = 0.4 }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(room, 0.04);
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    new THREE.CubeCamera(0.1, 100, cubeRT).update(gl, room);
    scene.environment = envRT.texture;
    scene.environmentIntensity = intensity;
    if (cubeRef) cubeRef.current = cubeRT.texture;
    return () => {
      scene.environment = null;
      envRT.dispose();
      cubeRT.dispose();
      pmrem.dispose();
      room.dispose?.();
    };
  }, [gl, scene, cubeRef, intensity]);
  return null;
}
