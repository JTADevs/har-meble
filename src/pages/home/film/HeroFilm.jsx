// Film w hero strony głównej: 4 ujęcia liczone na żywo w 3D (zamiast pliku wideo).
// Detal frontu → widok z góry na komodę → regał składający się na oczach → wnętrze ze światłem z okna.
import * as THREE from 'three';
import { createRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Box, RoomEnvironmentMap } from '../../../three/geometry.jsx';
import { S, STATIC, ensureRoomTextures, surfaceMaterial } from '../../../three/materials.js';
import { decorTexture, floorPlanksTexture, flutesNormalTexture, plasterTexture, tilesTexture } from '../../../three/textures.js';
import { Unit, ease } from './cabinetry.jsx';
import * as P from './props.jsx';
import { createFrame, frameCamera } from './framing.js';
import { SHOTS, cancelIdle, filmAt, whenIdle } from './shots.js';

export { SHOTS };

// Światło ujęć. shadow: [zasięg kamery cienia ±m, bias, normalBias w tekselach mapy], ao: promień N8AO (m).
// Ujęcie makro ma ciasną kamerę cienia i mały promień AO – frezy ramek i gałki rzucają własne cienie.
const LIGHTS = [
  { sun: [-1.8, 2.8, 2.6], target: [0.6, 0.6, 0.3], intensity: 2.3, color: '#fff2e1', hemi: 0.34, env: 0.45, shadow: [0.9, -0.0001, 2.5], ao: 0.05 },
  { sun: [-2.4, 3.4, -1.7], target: [0, 0, 0], intensity: 1.9, color: '#fff3e2', hemi: 0.3, env: 0.36, shadow: [2.4, -0.0003, 3], ao: 0.3 },
  { sun: [2.4, 3.6, 3.2], target: [-0.1, 0.9, 0], intensity: 1.9, color: '#fff3e4', hemi: 0.4, env: 0.42, shadow: [2.4, -0.0003, 3], ao: 0.32 },
  { sun: [-6, 3.2, 3.5], target: [0, 0.6, 0], intensity: 3.6, color: '#ffe7c7', hemi: 0.24, env: 0.3, shadow: [3, -0.0003, 3], ao: 0.32 },
];

// Plan zdjęciowy większy niż kadr także na ekranach pionowych (kamera odsunięta, obiektyw przesunięty) –
// krawędzie podłogi i ścian nie wchodzą w kadr. Wzory (deski, tynk) leżą w świecie tak samo jak na mniejszym planie.
const FLOOR_M = 16;
const GROUND_M = 24;
const WALL = { x: -600, w: 1200, h: 700, seed: -316.1 }; // seed – ten sam wzór tynku co na dawnej ścianie 6 m

// --- jakość: dobierana do urządzenia, obniżana, gdy film nie nadąża -----------------------------------------

function detectTier() {
  const mq = (q) => Boolean(window.matchMedia?.(q).matches);
  const touchOnly = mq('(pointer: coarse)') && !mq('(any-pointer: fine)');
  const mem = navigator.deviceMemory;
  return touchOnly || (typeof mem === 'number' && mem <= 4) ? 'mobile' : 'desktop';
}

// Piksele CSS płótna (hero: szerokość okna × 100svh w granicach 620–1200 px).
function viewportPixels() {
  const w = document.documentElement.clientWidth || window.innerWidth;
  return w * Math.min(1200, Math.max(620, window.innerHeight));
}

/**
 * Ustawienia renderu. level: 0 = start; każdy kolejny włącza monitor, gdy film przez ~5 s ma < 40 kl./s
 * (1: mniej pikseli, bez AO; 2: bez MSAA, mniejsza mapa cieni; 3: 30 kl./s).
 * Bufory kompozytora (HalfFloat, MSAA) kosztują ok. 70–115 B na piksel – stąd budżet pikseli zamiast stałego dpr.
 */
function qualityFor(tier, level, cssPx) {
  const mobile = tier === 'mobile';
  const budget = mobile ? 0.85e6 : 2.4e6;
  const maxDpr = mobile ? 1.75 : 1.5;
  const scale = (mobile ? [1, 0.8, 0.65, 0.65] : [1, 0.85, 0.7, 0.7])[level];
  const base = Math.min(maxDpr, Math.max(1, Math.sqrt(budget / Math.max(1, cssPx))));
  const cap = Math.max(level ? 0.6 : 1, Math.round(base * scale * 20) / 20);
  const dense = (window.devicePixelRatio || 1) > 1.25; // gęsty ekran – schodki krawędzi mniej widoczne, wystarczy 2× MSAA
  return {
    dpr: [Math.min(1, cap), cap],
    samples: level >= 2 ? 0 : mobile || dense || cssPx > budget ? 2 : 4,
    ao: !mobile && level < 1,
    shadow: mobile || level >= 2 ? 1024 : 2048,
    fps: level >= 3 ? 30 : 60,
    ppc: PPC[tier],
  };
}

// Rozdzielczość tekstury dębu na blacie (ujęcie makro, mocne zbliżenie) w px/cm – domyślnie w konfiguratorze 10.
const PPC = { desktop: 8, mobile: 4 };

// --- materiały otoczenia: tekstury przygotowywane w wolnych chwilach, zanim powstanie płótno ----------------

let world = null;
const prepared = {};

// Każda porcja to osobne zadanie (tynk z szumem per piksel, podłoga z deskami, dąb, grafika…) –
// zamiast jednego długiego zadania w chwili, gdy użytkownik zaczyna klikać.
function worldJobs(ppc) {
  return [
    () => plasterTexture(),
    () => tilesTexture(),
    () => {
      prepared.floor = floorPlanksTexture(FLOOR_M * 100, FLOOR_M * 100);
    },
    () => decorTexture('dab_naturalny', { horizontal: true, ppc }),
    () => {
      flutesNormalTexture();
      P.getArtTexture();
      ensureRoomTextures();
    },
  ];
}

function getWorld(ppc) {
  if (world) return world;
  ensureRoomTextures();
  const plaster = plasterTexture();
  // tło ujęcia z góry: ten sam kafel tynku na 9 m co dotąd, choć płaszczyzna jest większa (obraz współdzielony)
  const ground = plaster.clone();
  const r = GROUND_M / 9;
  const o = (((0.5 - 0.5 * r) % 1) + 1) % 1;
  ground.repeat.set(r, r);
  ground.offset.set(o, o);
  world = {
    floor: new THREE.MeshStandardMaterial({ map: prepared.floor ?? floorPlanksTexture(FLOOR_M * 100, FLOOR_M * 100), roughness: 0.55 }),
    pinkGround: new THREE.MeshStandardMaterial({ color: '#f0d6ce', map: ground, roughness: 0.95 }),
    warmWall: new THREE.MeshStandardMaterial({ color: '#f1e9de', map: plaster, roughness: 0.95 }),
    legs: new THREE.MeshStandardMaterial({ color: '#1f1f20', metalness: 0.6, roughness: 0.35 }),
    oak: surfaceMaterial('dab_naturalny', 'mat', { horizontal: true, ppc }),
    white: surfaceMaterial('bialy', 'mat'),
  };
  return world;
}

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'];

function collectTextures(scene) {
  const set = new Set();
  scene.traverse((o) => {
    const m = o.material;
    if (!m || Array.isArray(m)) return;
    for (const k of TEX_KEYS) if (m[k]?.isTexture) set.add(m[k]);
  });
  return [...set];
}

// --- zegar filmu, kamera, światło, przejścia ---------------------------------------

const FRAME = createFrame(); // wynik kadrowania – jeden obiekt nadpisywany co klatkę
const BG = SHOTS.map((s) => new THREE.Color(s.bg));

function Director({ film, playing, groups, sun, sunTarget, hemi, ao, ui, warm, shadowSize }) {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const last = useRef({ shot: -1, ext: 0, nb: 0, alpha: -1, flash: '', bars: [] });

  useFrame((state, delta) => {
    if (!warm.current.ready) {
      // rozgrzewka pod plakatem: shadery i tekstury przygotowują się w tle, czas filmu stoi
      for (const g of groups) if (g.current) g.current.visible = false;
      return;
    }
    const f = film.current;
    if (playing) f.t += Math.min(delta, 0.1);
    const at = filmAt(f.t);
    f.shot = at.shot;
    f.st = at.st;
    f.p = at.p;
    const L = LIGHTS[at.shot];
    const m = last.current;
    const u = ui.current;

    if (at.shot !== m.shot) {
      m.shot = at.shot;
      groups.forEach((g, i) => g.current && (g.current.visible = i === at.shot));
      scene.background = BG[at.shot];
      sun.current.position.fromArray(L.sun);
      sunTarget.current.position.fromArray(L.target);
      sun.current.intensity = L.intensity;
      sun.current.color.set(L.color);
      hemi.current.intensity = L.hemi;
      scene.environmentIntensity = L.env;
      // bieżące ujęcie dla czytników ekranu
      u?.shots?.forEach((el, i) => {
        if (!el) return;
        if (i === at.shot) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
      });
    }
    // w ujęciu „Wnętrze” słońce lekko wędruje – plamy światła z okna przesuwają się po ścianie
    if (at.shot === 3) sun.current.position.z = 3.5 - at.p * 0.7;

    // kamera: kadr ujęcia dopasowany do proporcji płótna (na pionowym ekranie mebel nad tekstem hero)
    const { width, height } = state.size;
    frameCamera(at.shot, at.p, width / Math.max(1, height), u?.safe, FRAME);
    camera.position.fromArray(FRAME.pos);
    camera.fov = FRAME.fov;
    if (FRAME.lift > 1e-4) camera.setViewOffset(width, height, 0, FRAME.lift * height, width, height);
    else camera.clearViewOffset();
    camera.lookAt(FRAME.target[0], FRAME.target[1], FRAME.target[2]);

    // kamera cienia w skali kadru (oddalony kadr pionowy obejmuje więcej planu), normalBias w tekselach mapy
    const ext = L.shadow[0] * Math.max(1, FRAME.k / 1.5);
    const nb = (L.shadow[2] * 2 * ext) / shadowSize;
    if (ext !== m.ext || nb !== m.nb) {
      m.ext = ext;
      m.nb = nb;
      const sh = sun.current.shadow;
      sh.camera.left = -ext;
      sh.camera.right = ext;
      sh.camera.top = ext;
      sh.camera.bottom = -ext;
      sh.camera.updateProjectionMatrix();
      sh.bias = L.shadow[1];
      sh.normalBias = nb;
    }
    const n8 = ao.current;
    if (n8 && n8.configuration.aoRadius !== L.ao) n8.configuration.aoRadius = L.ao;

    // interfejs: paski postępu ujęć + „przenikanie” przez kolor przy cięciu (zapis do DOM tylko przy zmianie)
    const bars = u?.bars;
    if (bars) {
      for (let i = 0; i < bars.length; i++) {
        const el = bars[i];
        const v = i < at.shot ? 1 : i === at.shot ? at.p : 0;
        if (el && m.bars[i] !== v) {
          m.bars[i] = v;
          el.style.transform = `scaleX(${v})`;
        }
      }
    }
    const flash = u?.flash;
    if (flash) {
      const dur = SHOTS[at.shot].dur;
      const out = Math.max(0, 1 - at.st / 0.45);
      const inn = Math.max(0, 1 - (dur - at.st) / 0.22);
      const alpha = playing ? Math.max(out, inn) : 0;
      if (alpha !== m.alpha) {
        m.alpha = alpha;
        flash.style.opacity = String(alpha);
      }
      const bg = SHOTS[inn > out ? (at.shot + 1) % SHOTS.length : at.shot].bg;
      if (bg !== m.flash) {
        m.flash = bg;
        flash.style.backgroundColor = bg;
      }
    }
  }, -1);
  return null;
}

/**
 * Rozgrzewka przed pierwszą klatką (pod plakatem):
 * 1) czeka, aż kompozytor ma przejścia efektów (wcześniej jego klatki nic nie rysują),
 * 2) kompiluje programy wszystkich ujęć z podpiętym buforem kompozytora – w tym samym wariancie, którym
 *    rysuje RenderPass (liniowy, bez tone mappingu); compileAsync nie blokuje wątku, gdy jest KHR_parallel_shader_compile,
 * 3) wysyła tekstury na GPU po jednej na klatkę,
 * 4) pokazuje ujęcie i dopiero po narysowaniu go przez kompozytor woła onReady.
 * Priorytet 2 – po kompozytorze (1). invalidate() w useFrame dociąga klatki także w trybie 'demand'.
 */
function Warmup({ composer, warm, onReady }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    const w = warm.current;
    if (w.done) return;
    const c = composer.current;
    if (!c || c.passes.length < 2) {
      invalidate();
      return;
    }
    if (!w.started) {
      w.started = true;
      const compiled = () => {
        w.compiled = true;
        invalidate();
      };
      gl.setRenderTarget(c.inputBuffer);
      try {
        gl.compileAsync(scene, camera).then(compiled, compiled);
      } catch {
        compiled();
      }
      gl.setRenderTarget(null);
      w.textures = collectTextures(scene);
      invalidate();
      return;
    }
    if (w.textures.length) {
      gl.initTexture(w.textures.pop());
      invalidate();
      return;
    }
    if (!w.compiled) return; // obietnica kompilacji sama poprosi o klatkę
    if (!w.ready) {
      w.ready = true; // następna klatka: Director pokazuje ujęcie, kompozytor je rysuje
      invalidate();
      return;
    }
    w.done = true;
    onReady?.();
  }, 2);
  return null;
}

// Tempo klatek: najwyżej `fps` (na ekranach 120 Hz+ co druga klatka – połowa pracy GPU bez różnicy w obrazie).
function Ticker({ run, fps }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!run) return undefined;
    let raf = 0;
    let prev = 0;
    let avg = 1000 / 60;
    let n = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (prev) avg += (Math.min(50, t - prev) - avg) * 0.05; // średni odstęp odświeżania ekranu
      prev = t;
      const every = Math.max(1, Math.floor(1000 / avg / fps + 0.15));
      n += 1;
      if (n >= every) {
        n = 0;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, fps, invalidate]);
  return null;
}

// Monitor płynności: gdy przez dwa kolejne okna ~2,5 s film ma < 40 kl./s – obniżamy jakość o poziom.
function Monitor({ run, onDecline }) {
  const s = useRef({ t0: 0, last: 0, n: 0, bad: 0 });
  useFrame(() => {
    const m = s.current;
    if (!run) {
      m.t0 = 0;
      return;
    }
    const now = performance.now();
    if (!m.t0 || now - m.last > 250) {
      // początek pomiaru albo przerwa (karta w tle, pauza, przewinięcie poza film) – liczymy od nowa
      m.t0 = now;
      m.last = now;
      m.n = 0;
      return;
    }
    m.last = now;
    m.n += 1;
    if (now - m.t0 < 2500) return;
    const fps = (m.n * 1000) / (now - m.t0);
    m.t0 = now;
    m.n = 0;
    m.bad = fps < 40 ? m.bad + 1 : 0;
    if (m.bad >= 2) {
      m.bad = 0;
      onDecline();
    }
  }, 3);
  return null;
}

// --- ujęcia ---------------------------------------------------------------------------

function Floor({ mat, size = FLOOR_M }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, size / 4]} material={mat} receiveShadow>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

// Ujęcie 1 – makro: fronty ramowe w szałwii, mosiężne gałki, dębowy blat, płytki.
const ShotDetal = memo(function ShotDetal({ refObj, world }) {
  const mats = useMemo(() => ({ carcass: world.white, front: surfaceMaterial('szalwia', 'mat') }), [world]);
  return (
    <group ref={refObj} visible={false}>
      <Floor mat={world.floor} />
      <Box x={-120} y={0} z={-10} w={400} h={260} d={9.5} mat={STATIC.wall} />
      <Box x={-60} y={85.8} z={-0.6} w={300} h={60} d={0.6} mat={STATIC.tiles} cast={false} />
      <group position={[0, 10 * S, 0]}>
        <Unit
          w={160}
          h={72}
          d={56}
          cols={[{ w: 40, cells: [{ type: 'door' }] }, { w: 40, cells: [{ type: 'door' }] }, { w: 40, cells: [{ type: 'door', hinge: 'right' }] }, { w: 40, cells: [{ h: 30, type: 'drawer' }, { type: 'drawer' }] }]}
          mats={mats}
          style="ramowy"
          handle="galka_mosiadz"
          handleTop
        />
      </group>
      <Box x={0} y={0} z={50} w={160} h={9.6} d={1.8} mat={mats.front} />
      <Box x={-1} y={82} z={0} w={162} h={3.8} d={62} mat={world.oak} round={0.3} />
      <P.Vase position={[118, 85.8, 18]} kind="walec" color="#efe7da" />
      <P.Plant position={[22, 85.8, 16]} potColor="#e9e1d3" scale={0.55} seed={3} />
      <P.Bowl position={[60, 85.8, 26]} color="#f1ebe1" fruit="#e8b13a" radius={10} />
    </group>
  );
});

// Ujęcie 2 – widok z góry: różowa komoda „leży” na różowym tle wśród przedmiotów.
const ShotUklad = memo(function ShotUklad({ refObj, world, film }) {
  const mats = useMemo(() => ({ carcass: surfaceMaterial('roz', 'mat'), front: surfaceMaterial('roz', 'mat') }), []);
  return (
    <group ref={refObj} visible={false}>
      <mesh rotation-x={-Math.PI / 2} material={world.pinkGround} receiveShadow>
        <planeGeometry args={[GROUND_M, GROUND_M]} />
      </mesh>
      <group position={[-0.9, 0, 0.4]} rotation-x={-Math.PI / 2}>
        <Unit
          w={180}
          h={80}
          d={42}
          cols={[
            { w: 45, cells: [{ type: 'door' }] },
            { w: 45, cells: [{ h: 24, type: 'drawer' }, { h: 24, type: 'drawer' }, { type: 'drawer' }] },
            { w: 45, cells: [{ h: 34, type: 'open' }, { type: 'open' }] },
            { w: 45, cells: [{ type: 'door', hinge: 'right' }] },
          ]}
          mats={mats}
          handle="galka_mosiadz"
          film={film}
          shot={1}
          timing={{ fronts: [0.15, 0.09, 0.6] }}
          drawers={{ at: 1.9, hold: 1.0, amount: 16, step: 0.16 }}
          fill={(ci, k, box) => (ci === 2 ? <P.BookRow position={[-box.w / 2 + 3, 0, 0]} w={box.w - 8} seed={k * 5 + 2} maxH={Math.min(26, box.h - 3)} lean={false} /> : null)}
        />
      </group>
      {[
        [[-128, 0, -52], <P.BookStack count={4} seed={2} rotation={0.35} />],
        [[126, 0, -58], <P.Plant potColor="#f1ebe1" scale={0.9} seed={5} />],
        [[-122, 0, 48], <P.Bowl color="#f3ede4" fruit="#e8c23a" radius={13} count={5} />],
        [[118, 0, 52], <P.Vase kind="kula" color="#f2ece2" scale={1.1} />],
        [[-36, 0, 74], <P.Magazine rotation={-0.18} />],
        [[44, 0, 80], <P.Slippers color="#c98f86" rotation={0.25} />],
        [[-156, 0, 4], <P.Mug color="#2f4a3b" rotation={0.8} />],
        [[156, 0, -4], <P.Candle color="#f1eadd" />],
        [[140, 0, 6], <P.Sphere r={5} color="#b5633e" />],
        [[-56, 0, -82], <P.ToteBag rotation={[0, 0.2, 0]} color="#efe8dc" />],
      ].map(([pos, el], i) => (
        <FilmPop key={i} film={film} shot={1} at={0.55 + i * 0.07} pos={pos}>
          {el}
        </FilmPop>
      ))}
    </group>
  );
});

// Pojawienie się rekwizytu („wyskok” od zera) wokół własnego miejsca `pos` (cm) – dzieci ustawiaj w [0,0,0].
function FilmPop({ film, shot, at, pos = [0, 0, 0], children }) {
  const ref = useRef(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const st = film.current.shot === shot ? film.current.st : 1e6;
    const k = Math.min(1, Math.max(0, (st - at) / 0.5));
    const s = Math.max(1e-4, ease.outBack(k));
    g.scale.set(s, s, s);
  });
  return (
    <group position={pos.map((v) => v * S)}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

const MORPH = ['#b5633e', '#9dab95', '#27344a'];

// Ujęcie 3 – regał składa się na oczach i zmienia kolor (terakota → szałwia → granat).
const ShotKolor = memo(function ShotKolor({ refObj, world, film }) {
  const morph = useMemo(() => new THREE.MeshStandardMaterial({ color: MORPH[0], roughness: 0.74 }), []);
  const c0 = useMemo(() => MORPH.map((c) => new THREE.Color(c)), []);
  useFrame(() => {
    const f = film.current;
    if (f.shot !== 2) return;
    const a = ease.inOutCubic(Math.min(1, Math.max(0, (f.st - 2.6) / 0.6)));
    const b = ease.inOutCubic(Math.min(1, Math.max(0, (f.st - 3.75) / 0.6)));
    if (b > 0) morph.color.lerpColors(c0[1], c0[2], b);
    else morph.color.lerpColors(c0[0], c0[1], a);
  });
  const mats = useMemo(() => ({ carcass: morph, front: morph }), [morph]);
  const fill = (ci, k, box) => {
    const key = `${ci}-${k}`;
    const left = -box.w / 2;
    switch (key) {
      case '0-1':
        return <P.Bowl position={[0, 0, 0]} color="#f1ebe1" fruit="#e69a3a" radius={10} />;
      case '0-2':
        return <P.BookRow position={[left + 3, 0, 0]} w={box.w - 12} seed={1} maxH={Math.min(26, box.h - 4)} />;
      case '0-3':
        return <P.Plant position={[0, 0, 0]} potColor="#efe7da" scale={0.72} seed={2} />;
      case '1-1':
        return (
          <group>
            <P.BookStack position={[-4, 0, 0]} count={3} seed={4} />
            <P.Candle position={[12, 7.5, 2]} h={8} />
          </group>
        );
      case '1-2':
        return (
          <group>
            <P.Vase position={[-6, 0, 0]} kind="butelka" color="#efe7da" scale={1.3} />
            <P.Sphere position={[9, 0, 4]} r={4.5} color="#d2a13c" />
          </group>
        );
      case '2-0':
        return (
          <group>
            <P.Sphere position={[-6, 0, 0]} r={7} color="#efe7da" />
            <P.Candle position={[9, 0, 4]} color="#d9aea6" h={11} />
          </group>
        );
      case '2-1':
        return <P.BookRow position={[left + 3, 0, 0]} w={box.w - 6} seed={6} maxH={Math.min(28, box.h - 4)} lean={false} />;
      case '2-3':
        return (
          <group>
            <P.Vase position={[-6, 0, 0]} kind="kula" color="#2f4a3b" />
            <P.Mug position={[10, 0, 4]} color="#f2ede4" rotation={-0.6} />
          </group>
        );
      case '3-2':
        return <P.BookRow position={[left + 2, 0, 0]} w={box.w - 14} seed={9} maxH={Math.min(27, box.h - 4)} />;
      case '3-3':
        return (
          <group>
            <P.ArtFrame position={[-3, 0, -6]} w={26} h={36} rotation={[-0.12, 0, 0]} />
            <P.Vase position={[11, 0, 6]} kind="amfora" color="#b5633e" scale={0.7} />
          </group>
        );
      default:
        return null;
    }
  };
  return (
    <group ref={refObj} visible={false}>
      <Floor mat={world.floor} />
      <Box x={WALL.x} y={0} z={-10} w={WALL.w} h={WALL.h} d={10} mat={world.warmWall} seed={WALL.seed} />
      <Box x={WALL.x} y={0} z={0} w={WALL.w} h={8} d={1.4} mat={STATIC.skirting} round={0.3} />
      <group position={[-0.8, 0, 0.02]}>
        <Unit
          w={160}
          h={190}
          d={35}
          cols={[
            { w: 40, cells: [{ h: 28, type: 'drawer' }, { h: 40, type: 'open' }, { h: 44, type: 'open' }, { type: 'open' }] },
            { w: 40, cells: [{ h: 70, type: 'door' }, { h: 36, type: 'open' }, { type: 'open' }] },
            { w: 40, cells: [{ h: 32, type: 'open' }, { h: 48, type: 'open' }, { h: 52, type: 'door', hinge: 'right' }, { type: 'open' }] },
            { w: 40, cells: [{ h: 28, type: 'drawer' }, { h: 28, type: 'drawer' }, { h: 52, type: 'open' }, { type: 'open' }] },
          ]}
          mats={mats}
          handle="listwa_czarna"
          film={film}
          shot={2}
          timing={{ carcass: [0.05, 0.06, 0.65], shelves: [0.5, 0.045, 0.55], fronts: [1.3, 0.08, 0.55], content: [1.6, 0.07, 0.5] }}
          fill={fill}
        />
      </group>
      <FilmPop film={film} shot={2} at={1.9} pos={[112, 0, 30]}>
        <P.Plant potColor="#e9e1d3" scale={1.25} seed={7} />
      </FilmPop>
    </group>
  );
});

// Ściana z oknami poza kadrem – słońce rzuca przez nią na ścianę i podłogę plamy światła z cieniem szprosów.
function WindowWall({ mat }) {
  const x = -260;
  // wysoka (400 cm), żeby słońce nie wpadało nad nią – do środka trafia tylko światło z okien
  const pieces = [
    [x, 0, -60, 10, 400, 120], // przed oknem 1
    [x, 0, 145, 10, 400, 25], // między oknami
    [x, 0, 255, 10, 400, 200], // za oknem 2
    [x, 0, 60, 10, 90, 85], // parapet okna 1
    [x, 230, 60, 10, 170, 85], // nadproże okna 1
    [x, 0, 170, 10, 90, 85],
    [x, 230, 170, 10, 170, 85],
    [x, 90, 101, 10, 140, 3], // szpros pionowy okna 1
    [x, 160, 60, 10, 3, 85], // szpros poziomy okna 1
    [x, 90, 211, 10, 140, 3],
    [x, 160, 170, 10, 3, 85],
  ];
  return pieces.map(([bx, by, bz, bw, bh, bd], i) => <Box key={i} x={bx} y={by} z={bz} w={bw} h={bh} d={bd} mat={mat} />);
}

// Ujęcie 4 – musztardowa komoda ryflowana na nóżkach w pokoju ze słońcem; kamera zjeżdża z góry.
const ShotDom = memo(function ShotDom({ refObj, world }) {
  const mats = useMemo(
    () => ({ carcass: surfaceMaterial('musztarda', 'mat'), front: surfaceMaterial('musztarda', 'mat', { fluted: true }) }),
    [],
  );
  return (
    <group ref={refObj} visible={false}>
      <Floor mat={world.floor} />
      <Box x={WALL.x} y={0} z={-10} w={WALL.w} h={WALL.h} d={10} mat={world.warmWall} seed={WALL.seed} />
      <Box x={WALL.x} y={0} z={0} w={WALL.w} h={8} d={1.4} mat={STATIC.skirting} round={0.3} />
      <WindowWall mat={world.warmWall} />
      <group position={[-0.9, 0, 0.03]}>
        <Unit
          w={180}
          h={66}
          d={45}
          legs={18}
          legMat={world.legs}
          cols={[
            { w: 45, cells: [{ type: 'door' }] },
            { w: 45, cells: [{ type: 'door', hinge: 'right' }] },
            { w: 45, cells: [{ h: 28, type: 'open' }, { type: 'open' }] },
            { w: 45, cells: [{ h: 30, type: 'drawer' }, { type: 'drawer' }] },
          ]}
          mats={mats}
          style="ryflowany"
          handle="bezuchwytowe"
          fill={(ci, k, box) =>
            k === 0 ? (
              <P.BookStack position={[0, 0, 0]} count={3} seed={8} rotation={0.1} />
            ) : (
              <P.BookRow position={[-box.w / 2 + 3, 0, 0]} w={box.w - 10} seed={3} maxH={Math.min(26, box.h - 3)} />
            )
          }
        />
        <P.MushroomLamp position={[30, 84, 24]} />
        <P.Vase position={[150, 84, 24]} kind="butelka" color="#efe7da" />
        <P.Branches position={[150, 112, 24]} />
        <P.BookStack position={[98, 84, 22]} count={2} seed={11} rotation={-0.2} />
        <P.ArtFrame position={[86, 84, 6]} w={46} h={62} rotation={[-0.09, 0, 0]} />
      </group>
      <P.Plant position={[128, 0, 34]} potColor="#e9e1d3" scale={1.45} seed={9} />
      <P.Sphere position={[-118, 0, 40]} r={9} color="#2f4a3b" />
    </group>
  );
});

// --- płótno ---------------------------------------------------------------------------

// Dithering w końcowym przejściu kompozytora: gładkie gradienty (ściany, lakier) bez schodków 8-bitowych.
// Sprawdzane co klatkę, bo kompozytor jest odtwarzany po powrocie hero w okolice widoku.
function Dither({ composer }) {
  useFrame(() => {
    const c = composer.current;
    if (!c) return;
    for (const p of c.passes) if ('dithering' in p && !p.dithering) p.dithering = true;
  }, -2);
  return null;
}

// Eksportowana także dla /studio/film (render filmu do MP4 klatka po klatce).
export function Scene({ film, playing, ui, near, q, onReady }) {
  const groups = useMemo(() => SHOTS.map(() => createRef()), []);
  const sun = useRef(null);
  const sunTarget = useRef(null);
  const hemi = useRef(null);
  const ao = useRef(null);
  const composer = useRef(null);
  const warm = useRef({ started: false, compiled: false, ready: false, done: false, textures: [] });
  const world = getWorld(q.ppc);
  useEffect(() => {
    if (sun.current && sunTarget.current) sun.current.target = sunTarget.current;
  }, []);
  // nowy rozmiar mapy cieni (obniżona jakość): stara mapa do zwolnienia – three utworzy nową przy następnym renderze
  useEffect(() => {
    const sh = sun.current?.shadow;
    if (sh?.map) {
      sh.map.dispose();
      sh.map = null;
    }
  }, [q.shadow]);
  return (
    <>
      <RoomEnvironmentMap intensity={0.42} />
      <hemisphereLight ref={hemi} args={['#fff8ee', '#a8977e', 0.36]} />
      <object3D ref={sunTarget} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.2}
        shadow-mapSize={[q.shadow, q.shadow]}
        shadow-camera-near={0.3}
        shadow-camera-far={16}
        shadow-bias={-0.0003}
        shadow-normalBias={0.012}
      />
      <ShotDetal refObj={groups[0]} world={world} />
      <ShotUklad refObj={groups[1]} world={world} film={film} />
      <ShotKolor refObj={groups[2]} world={world} film={film} />
      <ShotDom refObj={groups[3]} world={world} />
      <Director film={film} playing={playing} groups={groups} sun={sun} sunTarget={sunTarget} hemi={hemi} ao={ao} ui={ui} warm={warm} shadowSize={q.shadow} />
      <Warmup composer={composer} warm={warm} onReady={onReady} />
      <Dither composer={composer} />
      {/* daleko od widoku (ponad ekran) kompozytor jest odmontowany – zwalnia bufory; czas filmu zostaje w film.current */}
      {near && (
        <EffectComposer ref={composer} multisampling={q.samples}>
          {q.ao ? (
            <N8AO ref={ao} aoRadius={0.32} distanceFalloff={0.6} intensity={2.4} quality={q.aoQuality ?? 'medium'} halfRes={q.aoHalfRes ?? true} />
          ) : null}
          <Bloom intensity={0.6} luminanceThreshold={1.6} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={0.28} darkness={0.45} />
        </EffectComposer>
      )}
    </>
  );
}

// offsetSize: rozmiar z układu, bez transformacji rodzica (wejście hero skaluje .h-hero__media);
// bez nasłuchu przewijania – pozycja płótna na stronie nie jest potrzebna.
const RESIZE = { offsetSize: true, scroll: false };
const CAMERA_OPTS = { fov: 34, near: 0.03, far: 40, position: [1, 0.8, 1] };
// antialias robi kompozytor (MSAA); 'default' – bez budzenia karty dedykowanej w laptopach z dwoma GPU
const GL = { antialias: false, powerPreference: 'default' };

/**
 * film: ref { t } – czas filmu (s); playing: czy film biegnie; visible: hero na ekranie (inaczej pętla stoi);
 * near: hero najwyżej ok. ekran od widoku (inaczej bez kompozytora);
 * ui: ref { bars, shots, flash, safe, invalidate } – elementy DOM i wolny pas kadru z HeroSection.
 */
export default function HeroFilm({ film, playing, visible, near, ui, onFirstFrame }) {
  const [tier] = useState(detectTier);
  const [level, setLevel] = useState(0);
  const [cssPx, setCssPx] = useState(viewportPixels);
  const [texturesReady, setTexturesReady] = useState(() => world !== null);
  const [ready, setReady] = useState(false);
  const q = useMemo(() => qualityFor(tier, level, cssPx), [tier, level, cssPx]);

  // tekstury w porcjach – każda w osobnej wolnej chwili, płótno dopiero potem (jak bramka w ColorStage)
  useEffect(() => {
    if (texturesReady) return undefined;
    const jobs = worldJobs(PPC[tier]);
    let alive = true;
    let handle = null;
    let i = 0;
    const run = () => {
      if (!alive) return;
      const job = jobs[i++];
      if (!job) {
        setTexturesReady(true);
        return;
      }
      job();
      handle = whenIdle(run, 1000);
    };
    handle = whenIdle(run, 1000);
    return () => {
      alive = false;
      cancelIdle(handle);
    };
  }, [texturesReady, tier]);

  // budżet pikseli przeliczany po zmianie szerokości okna (obrót, zmiana rozmiaru); sama wysokość zmienia się
  // na telefonie przy chowaniu paska przeglądarki – wtedy nic nie robimy
  useEffect(() => {
    let w = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      setCssPx(viewportPixels());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(
    () => () => {
      if (ui.current) ui.current.invalidate = null;
    },
    [ui],
  );

  if (!texturesReady) return null;
  return (
    <Canvas
      shadows="soft"
      dpr={q.dpr}
      frameloop={visible ? 'demand' : 'never'}
      resize={RESIZE}
      camera={CAMERA_OPTS}
      gl={GL}
      onCreated={({ gl, invalidate }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        if (ui.current) ui.current.invalidate = invalidate;
      }}
      aria-hidden="true"
    >
      <Scene
        film={film}
        playing={playing}
        ui={ui}
        near={near}
        q={q}
        onReady={() => {
          setReady(true);
          onFirstFrame?.();
        }}
      />
      <Ticker run={visible && playing} fps={q.fps} />
      <Monitor run={visible && playing && ready && level < 3} onDecline={() => setLevel((l) => Math.min(3, l + 1))} />
    </Canvas>
  );
}
