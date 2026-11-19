import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { CARCASS, COUNTERTOPS, DECORS, FRONTS } from '../../shared/catalog.js';
import { decorTexture, flutesNormalTexture, plasterTexture, tilesTexture } from './textures.js';

export const S = 0.01; // 1 cm -> 0.01 jednostki sceny (metry)

// Materiały niezależne od konfiguracji
export const STATIC = {
  wall: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }),
  tiles: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18 }),
  skirting: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.5 }),
  back: new THREE.MeshStandardMaterial({ color: '#d8d2c8', roughness: 0.9 }),
  handle: new THREE.MeshStandardMaterial({ color: '#d4d7da', metalness: 0.55, roughness: 0.3 }),
  knob: new THREE.MeshStandardMaterial({ color: '#1f1f20', metalness: 0.4, roughness: 0.4 }),
  brass: new THREE.MeshStandardMaterial({ color: '#c9a04f', metalness: 0.8, roughness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: '#d6d9db', metalness: 0.6, roughness: 0.28 }),
  steelDark: new THREE.MeshStandardMaterial({ color: '#a4a8ab', metalness: 0.55, roughness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: '#141516', metalness: 0.3, roughness: 0.08 }),
  ring: new THREE.MeshStandardMaterial({ color: '#5e5e60', roughness: 0.5 }),
  fridge: new THREE.MeshStandardMaterial({ color: '#f5f6f7', roughness: 0.4 }),
  led: new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd99a', emissiveIntensity: 2.2 }),
  mirror: new THREE.MeshStandardMaterial({ color: '#dfe6ea', metalness: 1, roughness: 0.04 }),
  aluminium: new THREE.MeshStandardMaterial({ color: '#c8cbcf', metalness: 0.55, roughness: 0.35 }),
  select: new THREE.MeshBasicMaterial({ color: '#e8590c', transparent: true, opacity: 0.1, depthWrite: false }),
};

// Tekstury pomieszczenia podpinane leniwie (dopiero gdy scena jest w przeglądarce).
export function ensureRoomTextures() {
  if (!STATIC.wall.map) {
    STATIC.wall.map = plasterTexture();
    STATIC.tiles.map = tilesTexture();
    STATIC.wall.needsUpdate = STATIC.tiles.needsUpdate = true;
  }
}

const ROUGHNESS = { mat: 0.78, gloss: 0.2, oil: 0.55, polished: 0.22 };

// Materiał powierzchni z dekoru: kolor jednolity albo tekstura (drewno, kamień, beton).
export function surfaceMaterial(decorId, finish, { horizontal = false, fluted = false, ppc } = {}) {
  const d = DECORS[decorId];
  const map = decorTexture(decorId, { horizontal, ppc });
  let roughness = ROUGHNESS[finish] ?? 0.7;
  if (map && finish === 'mat') roughness = d.tex.kind === 'wood' ? 0.62 : d.tex.kind === 'concrete' ? 0.85 : 0.55;
  const props = { color: map ? '#ffffff' : d.hex, map, roughness };
  const m = finish === 'gloss' ? new THREE.MeshPhysicalMaterial({ ...props, clearcoat: 1, clearcoatRoughness: 0.06 }) : new THREE.MeshStandardMaterial(props);
  if (fluted) {
    m.normalMap = flutesNormalTexture();
    m.normalScale = new THREE.Vector2(1.6, 1.6);
  }
  return m;
}

export function useFurnitureMaterials({ carcass, front, frontDecor, frontStyle, countertop, countertopDecor }) {
  const mats = useMemo(() => {
    const finish = FRONTS[front].finish;
    return {
      ...STATIC,
      carcass: surfaceMaterial(CARCASS[carcass].decor, 'mat'),
      front: surfaceMaterial(frontDecor, finish, { fluted: frontStyle === 'ryflowany' }),
      plinth: surfaceMaterial(frontDecor, finish),
      countertop: countertop ? surfaceMaterial(countertopDecor, COUNTERTOPS[countertop].finish, { horizontal: true }) : null,
    };
  }, [carcass, front, frontDecor, frontStyle, countertop, countertopDecor]);

  useEffect(
    () => () => {
      mats.carcass.dispose();
      mats.front.dispose();
      mats.plinth.dispose();
      mats.countertop?.dispose();
    },
    [mats],
  );
  return mats;
}
