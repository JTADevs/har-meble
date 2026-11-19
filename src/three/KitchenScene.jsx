import * as THREE from 'three';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { COUNTERTOPS, DIM, FT, T } from '../../shared/catalog.js';
import { layoutKitchen, moveWallModule, reorderFloorModule, rowStart, wallRowGaps } from '../../shared/kitchen.js';
import { S, STATIC, ensureRoomTextures, useFurnitureMaterials } from './materials.js';
import { floorPlanksTexture } from './textures.js';
import { Box, Door, Drawer, Flap, Outline, handleSpec } from './geometry.jsx';

// stały „seed” usłojenia z id szafki – wzór drewna nie przeskakuje, gdy szafka się przesuwa
const idSeed = (id) => {
  let h = 7;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h;
};

function Carcass({ s, W, mats }) {
  const H = s.height;
  const D = s.depth;
  const iw = W - 2 * T;
  return (
    <>
      <Box x={0} w={T} h={H} d={D} mat={mats.carcass} />
      <Box x={W - T} w={T} h={H} d={D} mat={mats.carcass} />
      <Box x={T} w={iw} h={T} d={D} mat={mats.carcass} />
      {s.rails ? (
        <>
          <Box x={T} y={H - T} z={D - 10} w={iw} h={T} d={10} mat={mats.carcass} />
          <Box x={T} y={H - T} w={iw} h={T} d={10} mat={mats.carcass} />
        </>
      ) : (
        <Box x={T} y={H - T} w={iw} h={T} d={D} mat={mats.carcass} />
      )}
      <Box x={T} y={T} w={iw} h={H - 2 * T} d={0.3} mat={mats.back} cast={false} />
      {s.shelves.map((y) => (
        <Box key={`s${y}`} x={T + 0.1} y={y} z={0.3} w={iw - 0.2} h={T} d={D - 4} mat={mats.carcass} />
      ))}
      {s.fixed.map((y) => (
        <Box key={`f${y}`} x={T} y={y} z={0.3} w={iw} h={T} d={D - 2} mat={mats.carcass} />
      ))}
    </>
  );
}

function Appliance({ a, W, D }) {
  if (a.kind === 'oven' || a.kind === 'microwave') {
    return (
      <>
        <Box x={0.3} y={a.y} z={D - 2} w={W - 0.6} h={a.h} d={2.2} mat={STATIC.glass} />
        <Box x={0.3} y={a.y + a.h - 9} z={D + 0.15} w={W - 0.6} h={8.7} d={0.2} mat={STATIC.steelDark} cast={false} />
        <Box x={W * 0.15} y={a.y + a.h - 14} z={D + 0.2} w={W * 0.7} h={1.4} d={2.2} mat={STATIC.steel} />
      </>
    );
  }
  if (a.kind === 'fridge') return <Box x={T + 0.5} y={a.y} z={3} w={W - 2 * T - 1} h={a.h} d={D - 6} mat={STATIC.fridge} />;
  if (a.kind === 'dishwasher') return <Box x={1} y={1} z={4} w={W - 2} h={DIM.base.height - 3} d={D - 6} mat={STATIC.steelDark} />;
  return null;
}

function Sink({ W, y }) {
  const sw = Math.min(W - 16, 78);
  const x = (W - sw) / 2;
  const z = 10;
  const cx = W / 2;
  return (
    <group>
      <Box x={x} y={y} z={z} w={sw} h={0.4} d={44} mat={STATIC.steel} cast={false} />
      <Box x={x + 3} y={y + 0.41} z={z + 3} w={sw - 6} h={0.05} d={38} mat={STATIC.steelDark} cast={false} />
      <mesh position={[cx * S, (y + 13) * S, 6 * S]} material={STATIC.steel} castShadow>
        <cylinderGeometry args={[1.4 * S, 1.6 * S, 26 * S, 16]} />
      </mesh>
      <mesh position={[cx * S, (y + 25) * S, 15 * S]} rotation-x={Math.PI / 2} material={STATIC.steel} castShadow>
        <cylinderGeometry args={[1.1 * S, 1.1 * S, 19 * S, 16]} />
      </mesh>
    </group>
  );
}

function Hob({ W, y }) {
  const x = (W - 58) / 2;
  const cx = W / 2;
  const cz = 31;
  const rings = [
    [-13, -10, 8],
    [13, -10, 6.5],
    [-13, 11, 6.5],
    [13, 11, 9],
  ];
  return (
    <group>
      <Box x={x} y={y} z={6} w={58} h={0.6} d={50} mat={STATIC.glass} cast={false} />
      {rings.map(([dx, dz, r]) => (
        <mesh key={`${dx}${dz}`} position={[(cx + dx) * S, (y + 0.62) * S, (cz + dz) * S]} rotation-x={-Math.PI / 2} material={STATIC.ring}>
          <ringGeometry args={[(r - 0.5) * S, r * S, 40]} />
        </mesh>
      ))}
    </group>
  );
}

function CabinetInner({ p, mats, config, open, selected, onSelect, onGrab, ctThickness, draggable, dragging }) {
  const [hover, setHover] = useState(false);
  const s = p.spec;
  const W = p.width;
  const H = s.height;
  const D = s.depth;
  const y0 = s.y0;
  const topY = DIM.plinth + DIM.base.height + ctThickness;
  useEffect(() => () => (document.body.style.cursor = ''), []);

  const outlineY = s.row === 'wall' ? y0 - 0.3 : 0;
  const outlineH = (s.row === 'wall' ? H : y0 + H + (s.row === 'base' ? ctThickness : 0)) + 0.6;
  const tagY = s.row === 'base' ? topY + 10 : s.row === 'wall' ? y0 + H / 2 : y0 + H + 8;
  const tagZ = s.row === 'wall' ? D + FT + 2 : D / 2;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(p.id);
      }}
      onPointerDown={(e) => onGrab?.(e, p)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        if (!document.body.dataset.dragging) document.body.style.cursor = draggable ? 'grab' : 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        if (!document.body.dataset.dragging) document.body.style.cursor = '';
      }}
    >
      {s.row !== 'wall' && <Box x={0} y={0} z={D - 6} w={W} h={DIM.plinth - 0.4} d={1.8} mat={mats.plinth} />}
      <group position={[0, y0 * S, 0]}>
        {!s.noCarcass && <Carcass s={s} W={W} mats={mats} />}
        {s.appliances.map((a) => (
          <Appliance key={`${a.kind}${a.y || 0}`} a={a} W={W} D={D} />
        ))}
        {s.fronts.map((f, i) => {
          const handle = handleSpec(f, s.row, y0);
          const common = { f, mat: mats.front, open, handle, handleType: config.handle, style: config.frontStyle, seed: idSeed(p.id) + i * 17 };
          if (f.kind === 'drawer') return <Drawer key={i} {...common} depth={D} boxMat={mats.carcass} />;
          if (f.kind === 'flap') return <Flap key={i} {...common} z={D} />;
          return <Door key={i} {...common} z={D} />;
        })}
        {s.row === 'wall' && config.led && <Box x={2} y={-0.6} z={D - 6} w={W - 4} h={0.6} d={1.6} mat={STATIC.led} cast={false} />}
      </group>
      {s.top === 'sink' && <Sink W={W} y={topY} />}
      {s.top === 'hob' && <Hob W={W} y={topY} />}
      {(selected || hover || p.overflow || dragging) && (
        <Outline
          x={-0.3}
          y={outlineY}
          z={0}
          w={W + 0.6}
          h={outlineH}
          d={(s.row === 'base' ? DIM.countertopDepth : D + FT) + 0.6}
          color={dragging ? '#2563eb' : p.overflow ? '#d6336c' : selected ? '#e8590c' : '#f4a261'}
          fill={selected || dragging}
        />
      )}
      {selected && !dragging && (
        <Html position={[(W / 2) * S, tagY * S, tagZ * S]} center zIndexRange={[20, 0]}>
          <div className="mod-tag">
            <b>{p.label}</b> · {W} cm
          </div>
        </Html>
      )}
    </group>
  );
}

const Cabinet = memo(
  CabinetInner,
  (a, b) =>
    a.p.id === b.p.id &&
    a.p.type === b.p.type &&
    a.p.width === b.p.width &&
    a.p.wall === b.p.wall &&
    a.p.label === b.p.label &&
    a.p.overflow === b.p.overflow &&
    a.p.spec.y0 === b.p.spec.y0 &&
    a.mats === b.mats &&
    a.config.handle === b.config.handle &&
    a.config.frontStyle === b.config.frontStyle &&
    a.config.led === b.config.led &&
    a.open === b.open &&
    a.selected === b.selected &&
    a.dragging === b.dragging &&
    a.draggable === b.draggable &&
    a.ctThickness === b.ctThickness &&
    a.onSelect === b.onSelect &&
    a.onGrab === b.onGrab,
);

// Grupa, która płynnie dojeżdża do pozycji (zmiana kolejności, strzałki); w trakcie przeciągania podąża natychmiast.
function SlideGroup({ x, y = 0, z = 0, instant, children }) {
  const ref = useRef(null);
  const first = useRef(true);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (first.current || instant) {
      g.position.set(x, y, z);
      first.current = false;
      return;
    }
    const k = Math.min(dt, 0.05);
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 14, k);
    g.position.y = THREE.MathUtils.damp(g.position.y, y, 14, k);
    g.position.z = THREE.MathUtils.damp(g.position.z, z, 14, k);
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      {children}
    </group>
  );
}

const DIM_MAT = new THREE.MeshBasicMaterial({ color: '#2563eb', toneMapped: false });

// Linia wymiaru (jak w planerach IKEA): odcinek z kreskami na końcach i etykietą w cm. Współrzędne w cm, w układzie ściany.
function DimLine({ a, b, y, z, vertical = false, x }) {
  const len = Math.abs(b - a);
  if (len < 0.5) return null;
  const lo = Math.min(a, b);
  const mid = lo + len / 2;
  return (
    <group>
      {vertical ? (
        <>
          <Box x={x - 0.15} y={lo} z={z} w={0.3} h={len} d={0.3} mat={DIM_MAT} cast={false} />
          <Box x={x - 2} y={lo - 0.15} z={z} w={4} h={0.3} d={0.3} mat={DIM_MAT} cast={false} />
          <Box x={x - 2} y={lo + len - 0.15} z={z} w={4} h={0.3} d={0.3} mat={DIM_MAT} cast={false} />
        </>
      ) : (
        <>
          <Box x={lo} y={y - 0.15} z={z} w={len} h={0.3} d={0.3} mat={DIM_MAT} cast={false} />
          <Box x={lo - 0.15} y={y - 2} z={z} w={0.3} h={4} d={0.3} mat={DIM_MAT} cast={false} />
          <Box x={lo + len - 0.15} y={y - 2} z={z} w={0.3} h={4} d={0.3} mat={DIM_MAT} cast={false} />
        </>
      )}
      <Html position={vertical ? [x * S, mid * S, z * S] : [mid * S, y * S, z * S]} center zIndexRange={[30, 0]}>
        <div className="dim-tag">{Math.round(len)} cm</div>
      </Html>
    </group>
  );
}

// Wymiary zaznaczonej szafki górnej: odstęp do sąsiadów / krawędzi ściany, nad blatem i do sufitu.
function WallCabinetDims({ p, layout, ctTop, wall }) {
  const { start, end, obstacles } = wallRowGaps(layout, wall, p.id);
  const left = obstacles.reduce((m, [, b]) => (b <= p.x + 0.01 ? Math.max(m, b) : m), start);
  const right = obstacles.reduce((m, [a]) => (a >= p.x + p.width - 0.01 ? Math.min(m, a) : m), end);
  const lx = (v) => (wall === 'B' ? -v : v);
  const y0 = p.spec.y0;
  const yMid = y0 + p.spec.height / 2;
  const cx = p.x + p.width / 2;
  return (
    <group>
      <DimLine a={lx(left)} b={lx(p.x)} y={yMid} z={1} />
      <DimLine a={lx(p.x + p.width)} b={lx(right)} y={yMid} z={1} />
      <DimLine vertical x={lx(cx)} a={ctTop} b={y0} z={2} />
      <DimLine vertical x={lx(cx)} a={y0 + p.spec.height} b={DIM.roomHeight} z={2} />
    </group>
  );
}

// Podpis malowany na ścianie (tekstura z canvas – bez elementów DOM).
function WallLabel({ text, position, rotationY = 0 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(4, 14, 504, 68, 34);
    ctx.fill();
    ctx.fillStyle = '#4a4037';
    ctx.font = '600 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 49);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[0.96, 0.18]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

function KitchenRoom({ layout, walls, labels = true }) {
  const A = walls.A;
  const B = layout === 'L' ? walls.B : 0;
  const H = DIM.roomHeight;
  const th = 12;
  const floorW = A + 220;
  const floorD = Math.max(B, 320) + 120;
  ensureRoomTextures();
  const tex = useMemo(() => floorPlanksTexture(floorW, floorD), [floorW, floorD]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[(floorW / 2 - th - 60) * S, 0, (floorD / 2 - th) * S]}>
        <planeGeometry args={[floorW * S, floorD * S]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <Box x={-th} y={0} z={-th} w={A + th} h={H} d={th} mat={STATIC.wall} />
      <Box x={layout === 'L' ? 0 : -1} y={0} z={0} w={A + (layout === 'L' ? 0 : 1)} h={8} d={1.4} mat={STATIC.skirting} round={0.3} />
      {layout === 'L' && (
        <>
          <Box x={-th} y={0} z={0} w={th} h={H} d={B} mat={STATIC.wall} />
          <Box x={0} y={0} z={0} w={1.4} h={8} d={B} mat={STATIC.skirting} round={0.3} />
        </>
      )}
      {labels && <WallLabel text={`Ściana A · ${A} cm`} position={[(A / 2) * S, (H - 22) * S, 0.002]} />}
      {labels && layout === 'L' && <WallLabel text={`Ściana B · ${B} cm`} position={[0.002, (H - 22) * S, (B / 2) * S]} rotationY={Math.PI / 2} />}
    </>
  );
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3();
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const V_DEAD_PX = 24;

/**
 * readOnly – bez przeciągania; onCommit(nowaKonfiguracja) – zatwierdzenie po upuszczeniu szafki;
 * dragInfo – ref, w którym zapisujemy czas końca przeciągania (żeby kliknięcie „w pustkę” po upuszczeniu nie odznaczało szafki).
 */
export function KitchenScene({ config, layout, selectedId, onSelect, open, photo = false, readOnly = false, onCommit, dragInfo }) {
  const mats = useFurnitureMaterials(config);
  const ct = COUNTERTOPS[config.countertop];
  const ctTop = DIM.plinth + DIM.base.height + ct.thickness;
  const camera = useThree((st) => st.camera);
  const gl = useThree((st) => st.gl);
  const controls = useThree((st) => st.controls);
  const [drag, setDrag] = useState(null); // { id, config, followX? }
  const live = useRef({ config, layout, controls, onCommit, onSelect, readOnly, photo });
  live.current = { config, layout, controls, onCommit, onSelect, readOnly, photo };
  const dragRef = useRef(null);
  const pendingRef = useRef(null);
  const rafRef = useRef(0);

  const viewLayout = useMemo(() => (drag ? layoutKitchen(drag.config) : layout), [drag, layout]);
  const draggable = !readOnly && !photo;

  // punkt pod kursorem na płaszczyźnie frontów danej ściany → { s: współrzędna wzdłuż ściany (cm), y: wysokość (cm) }
  const wallPoint = useCallback(
    (clientX, clientY, wall, depthCm) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.set(wall === 'A' ? AXIS_Z : AXIS_X, -depthCm * S);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { s: (wall === 'A' ? hit.x : hit.z) / S, y: hit.y / S };
    },
    [camera, gl],
  );

  const flush = useCallback(() => {
    rafRef.current = 0;
    if (pendingRef.current) setDrag(pendingRef.current);
  }, []);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', d?.onMove);
    window.removeEventListener('pointerup', d?.onUp);
    window.removeEventListener('pointercancel', d?.onUp);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const { controls: ctl, onCommit: commit } = live.current;
    if (ctl) ctl.enabled = true;
    delete document.body.dataset.dragging;
    document.body.style.cursor = '';
    const finalState = pendingRef.current;
    pendingRef.current = null;
    if (d?.moved) {
      if (dragInfo) dragInfo.current = performance.now();
      if (finalState && finalState.config !== d.config) commit?.(finalState.config);
    }
    setDrag(null);
  }, [dragInfo]);

  const onGrab = useCallback(
    (e, stale) => {
      const { readOnly: ro, photo: ph, controls: ctl, config: cfg, layout: lay, onSelect: select } = live.current;
      if (ro || ph || e.button !== 0 || dragRef.current) return;
      // szafki są zapamiętane (memo) bez pozycji – aktualne miejsce bierzemy z bieżącego układu
      const p = lay.placed.find((q) => q.id === stale.id);
      if (!p) return;
      e.stopPropagation();
      const depth = p.spec.depth + FT;
      const pt = wallPoint(e.nativeEvent.clientX, e.nativeEvent.clientY, p.wall, depth);
      if (!pt) return;
      select(p.id);
      if (ctl) ctl.enabled = false; // kamera nie obraca się, gdy chwytamy szafkę
      const d = {
        id: p.id,
        wall: p.wall,
        row: p.row,
        width: p.width,
        x0: p.x,
        y0: p.spec.y0,
        s0: pt.s,
        py0: pt.y,
        depth,
        cx: e.nativeEvent.clientX,
        cy: e.nativeEvent.clientY,
        moved: false,
        config: cfg,
      };
      d.onMove = (ev) => {
        if (!d.moved) {
          if (Math.hypot(ev.clientX - d.cx, ev.clientY - d.cy) < 5) return;
          d.moved = true;
          document.body.dataset.dragging = '1';
          document.body.style.cursor = 'grabbing';
        }
        const q = wallPoint(ev.clientX, ev.clientY, d.wall, d.depth);
        if (!q) return;
        const dx = q.s - d.s0;
        if (d.row === 'wall') {
          // martwa strefa w pionie: drgnięcie ręki przy przesuwaniu w bok nie zmienia wysokości zawieszenia
          const dyPx = Math.abs(ev.clientY - d.cy);
          const k = dyPx > V_DEAD_PX ? 1 - V_DEAD_PX / dyPx : 0;
          const next = moveWallModule(d.config, d.id, d.x0 + dx, d.y0 + (q.y - d.py0) * k, { snap: !ev.altKey, yStart: d.y0, reorder: true });
          pendingRef.current = { id: d.id, config: next };
        } else {
          const center = d.x0 + d.width / 2 + dx;
          const next = reorderFloorModule(d.config, d.id, center);
          const start = rowStart(d.wall, 'base');
          const len = d.config.walls[d.wall];
          pendingRef.current = { id: d.id, config: next, followX: Math.min(Math.max(center - d.width / 2, start), Math.max(start, len - d.width)) };
        }
        if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
      };
      d.onUp = () => endDrag();
      dragRef.current = d;
      window.addEventListener('pointermove', d.onMove);
      window.addEventListener('pointerup', d.onUp);
      window.addEventListener('pointercancel', d.onUp);
    },
    [wallPoint, flush, endDrag],
  );

  // sprzątanie, gdyby scena zniknęła w trakcie przeciągania
  useEffect(() => () => dragRef.current && endDrag(), [endDrag]);

  const dimsId = drag?.id ?? selectedId;

  return (
    <group>
      <KitchenRoom layout={config.layout} walls={config.walls} labels={!photo} />
      {Object.entries(viewLayout.walls).map(([wall, w]) => {
        const dimsFor = !photo ? w.placed.find((q) => q.id === dimsId && q.row === 'wall') : null;
        return (
          <group key={wall} rotation-y={wall === 'B' ? Math.PI / 2 : 0}>
            {w.placed.map((p) => {
              const isDragged = drag?.id === p.id;
              const x = isDragged && drag.followX !== undefined ? drag.followX : p.x;
              const lift = isDragged ? (p.row === 'wall' ? 0 : 3) : 0;
              return (
                <SlideGroup key={p.id} x={(wall === 'B' ? -(x + p.width) : x) * S} y={lift * S} z={isDragged && p.row === 'wall' ? 2 * S : 0} instant={isDragged}>
                  <Cabinet
                    p={p}
                    mats={mats}
                    config={config}
                    open={open}
                    selected={p.id === selectedId}
                    onSelect={onSelect}
                    onGrab={draggable ? onGrab : undefined}
                    ctThickness={ct.thickness}
                    draggable={draggable}
                    dragging={isDragged}
                  />
                </SlideGroup>
              );
            })}
            {dimsFor && <WallCabinetDims p={dimsFor} layout={viewLayout} ctTop={ctTop} wall={wall} />}
            {w.countertops.map((c) => (
              <Box
                key={`tiles-${c.start}`}
                x={wall === 'B' ? -c.end : c.start}
                y={ctTop}
                z={0}
                w={c.end - c.start}
                h={DIM.wall.bottom - ctTop}
                d={0.5}
                mat={STATIC.tiles}
                cast={false}
              />
            ))}
            {w.countertops.map((c) => (
              <Box
                key={`${c.start}-${c.end}`}
                x={wall === 'B' ? -c.end : c.start}
                y={DIM.plinth + DIM.base.height}
                z={0}
                w={c.end - c.start}
                h={ct.thickness}
                d={DIM.countertopDepth}
                mat={mats.countertop}
                seed={c.start + (wall === 'B' ? 900 : 0)}
                round={0.3}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

export function kitchenCamera(config) {
  const A = config.walls.A * S;
  if (config.layout === 'L') {
    const B = config.walls.B * S;
    return { camera: [A * 0.68 + 1.1, 2.05, B * 0.95 + 3.3], target: [A * 0.45, 1.0, B * 0.3] };
  }
  return { camera: [A / 2 + 0.5, 1.85, 3.6 + A * 0.45], target: [A / 2, 1.0, 0.3] };
}
