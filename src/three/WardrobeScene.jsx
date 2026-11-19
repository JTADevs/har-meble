import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { T } from '../../shared/catalog.js';
import { S, STATIC, ensureRoomTextures, useFurnitureMaterials } from './materials.js';
import { floorPlanksTexture } from './textures.js';
import { Box, Door, Drawer, handleSpec } from './parts.jsx';

const CLOTHES = ['#3d5a80', '#98c1d9', '#e0fbfc', '#ee6c4d', '#293241', '#c9ada7', '#6d6875', '#f2e9e4'].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }),
);

function Clothes({ x, w, railY, floorY, depth }) {
  const items = useMemo(() => {
    const n = Math.max(2, Math.floor((w - 8) / 6.5));
    const maxLen = railY - floorY - 8;
    return Array.from({ length: n }, (_, i) => {
      const seed = (i * 37 + Math.round(w)) % 11;
      return { x: x + 4 + i * ((w - 10) / n), len: Math.max(30, Math.min(maxLen, 62 + seed * 3.5)), mat: CLOTHES[(i + seed) % CLOTHES.length] };
    });
  }, [x, w, railY, floorY]);
  if (railY - floorY < 45) return null;
  const dd = Math.min(depth - 8, 46);
  return items.map((it, i) => (
    <Box key={i} x={it.x} y={railY - 3 - it.len} z={depth / 2 - dd / 2} w={2.6} h={it.len} d={dd} mat={it.mat} />
  ));
}

function SlidingDoor({ d, z, mat, open }) {
  const fill = useMemo(() => Object.assign(mat.clone(), { transparent: true }), [mat]);
  const frame = useMemo(() => Object.assign(STATIC.aluminium.clone(), { transparent: true }), []);
  useEffect(() => () => fill.dispose(), [fill]);
  useEffect(() => () => frame.dispose(), [frame]);
  const ref = useRef(1);
  useFrame((_, dt) => {
    ref.current = THREE.MathUtils.damp(ref.current, open ? 0.08 : 1, 6, Math.min(dt, 0.05));
    fill.opacity = frame.opacity = ref.current;
    fill.depthWrite = frame.depthWrite = ref.current > 0.95;
  });
  return (
    <group>
      <Box x={d.x + 1.2} y={d.y + 1.2} z={z} w={d.w - 2.4} h={d.h - 2.4} d={1.2} mat={fill} />
      <Box x={d.x} y={d.y} z={z - 0.4} w={1.4} h={d.h} d={2.2} mat={frame} />
      <Box x={d.x + d.w - 1.4} y={d.y} z={z - 0.4} w={1.4} h={d.h} d={2.2} mat={frame} />
      <Box x={d.x} y={d.y} z={z - 0.2} w={d.w} h={1.2} d={1.8} mat={frame} />
      <Box x={d.x} y={d.y + d.h - 1.2} z={z - 0.2} w={d.w} h={1.2} d={1.8} mat={frame} />
    </group>
  );
}

function WardrobeRoom({ W, H }) {
  const fw = W + 300;
  const fd = 420;
  ensureRoomTextures();
  const tex = useMemo(() => floorPlanksTexture(fw, fd), [fw]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[(W / 2) * S, 0, (fd / 2 - 10) * S]}>
        <planeGeometry args={[fw * S, fd * S]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <Box x={-150} y={0} z={-10} w={fw} h={Math.max(H + 30, 270)} d={10} mat={STATIC.wall} />
      <Box x={-150} y={0} z={0} w={fw} h={8} d={1.4} mat={STATIC.skirting} round={0.3} />
      {/* ściana za kamerą – jednostronna (widać ją tylko w odbiciu lustra), nie zasłania widoku */}
      <mesh position={[(W / 2) * S, 1.35, (fd - 10) * S]} rotation-y={Math.PI} material={STATIC.wall}>
        <planeGeometry args={[fw * S, 2.7]} />
      </mesh>
    </>
  );
}

export function WardrobeScene({ config, spec, open }) {
  const frontStyle = config.doors === 'uchylne' ? config.frontStyle : 'gladki';
  const mats = useFurnitureMaterials({ carcass: config.carcass, front: config.front, frontDecor: config.frontDecor, frontStyle, countertop: null });
  const { W, H, D, Ds, Hi, plinth, sections, doors } = spec;
  const inY = plinth + T; // dół wnętrza
  return (
    <group position={[(-W / 2) * S, 0, 0]}>
      <WardrobeRoom W={W} H={H} />
      {/* korpus */}
      <Box x={0} w={T} h={H} d={D} mat={mats.carcass} />
      <Box x={W - T} w={T} h={H} d={D} mat={mats.carcass} />
      <Box x={T} y={plinth} w={W - 2 * T} h={T} d={D} mat={mats.carcass} />
      <Box x={T} y={H - T} w={W - 2 * T} h={T} d={D} mat={mats.carcass} />
      <Box x={T} y={0} z={D - 6 - T} w={W - 2 * T} h={plinth} d={T} mat={mats.carcass} />
      <Box x={T} y={inY} w={W - 2 * T} h={Hi} d={0.3} mat={mats.back} cast={false} />
      {sections.slice(1).map((s) => (
        <Box key={`div${s.x}`} x={s.x - T} y={inY} z={0.3} w={T} h={Hi} d={Ds} mat={mats.carcass} />
      ))}
      {/* wnętrza sekcji */}
      {sections.map((s, si) => (
        <group key={si}>
          {s.shelves.map((y) => (
            <Box key={`sh${y}`} x={s.x + 0.1} y={inY + y} z={0.3} w={s.w - 0.2} h={T} d={Ds - 2} mat={mats.carcass} />
          ))}
          {s.rails.map((y) => {
            const below = s.shelves.filter((sy) => sy < y).sort((a, b) => b - a)[0];
            const floorY = below !== undefined ? below + T : s.drawers.length ? 66 : 0;
            return (
              <group key={`r${y}`}>
                <mesh position={[(s.x + s.w / 2) * S, (inY + y) * S, (Ds / 2) * S]} rotation-z={Math.PI / 2} material={STATIC.steel} castShadow>
                  <cylinderGeometry args={[1.2 * S, 1.2 * S, (s.w - 0.4) * S, 16]} />
                </mesh>
                <Clothes x={s.x} w={s.w} railY={inY + y} floorY={inY + floorY} depth={Ds} />
              </group>
            );
          })}
          {s.drawers.map((d, di) => (
            <Drawer
              key={`d${di}`}
              f={{ x: s.x + 0.3, y: inY + d.y, w: s.w - 0.6, h: d.h }}
              depth={Ds - 2.2}
              mat={mats.carcass}
              boxMat={mats.carcass}
              open={open}
              travel={Math.min(35, Ds * 0.6)}
            />
          ))}
          {config.led && <Box x={s.x + 2} y={H - T - 0.5} z={Ds - 8} w={s.w - 4} h={0.5} d={1.5} mat={STATIC.led} cast={false} />}
        </group>
      ))}
      {/* fronty */}
      {doors.map((d, i) =>
        d.kind === 'sliding' ? (
          <SlidingDoor key={i} d={d} z={D - 7.5 + d.track * 3.6} mat={d.mirror ? STATIC.mirror : mats.front} open={open} />
        ) : (
          <Door key={i} f={d} z={D} mat={mats.front} open={open} handle={handleSpec(d, 'tall', 0)} handleType={config.handle} style={frontStyle} seed={i * 23 + 7} />
        ),
      )}
      {config.doors === 'przesuwne' && (
        <>
          <Box x={T} y={H - T - 1.5} z={D - 9} w={W - 2 * T} h={1.5} d={8.5} mat={STATIC.aluminium} />
          <Box x={T} y={plinth + T} z={D - 9} w={W - 2 * T} h={0.8} d={8.5} mat={STATIC.aluminium} />
        </>
      )}
    </group>
  );
}

export function wardrobeCamera(config) {
  const W = config.width * S;
  const H = config.height * S;
  return { camera: [0.45, H * 0.62, 1.4 + W * 0.85 + H * 0.45], target: [0, H * 0.48, config.depth * S * 0.5] };
}
