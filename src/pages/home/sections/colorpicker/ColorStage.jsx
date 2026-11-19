// Scena 3D sekcji „Twój kolor” – osobny moduł ładowany przez React.lazy, gdy sekcja zbliża się do widoku.
//
// Jedno płótno WebGL na całą sekcję: warstwa nad rzędem okien kart (bez zdarzeń wskaźnika). Każdy mebel ma
// własną kamerę i jest rysowany tylko w prostokącie „okna” swojej karty (viewport + scissor), mierzonym
// w każdej klatce względem płótna. Płótno leży w tym samym torze co karty, więc przewija się razem z nimi
// (siatka na desktopie, karuzela na telefonie) – modele nie „pływają” przy przewijaniu, a przy wjeździe
// kart po prostu jadą razem z nimi. Osobne kamery dają każdemu meblowi tę samą perspektywę
// (jedna wspólna kamera przekrzywiałaby modele w skrajnych kolumnach).
//
// Pętla działa w trybie „demand”: klatki powstają tylko wtedy, gdy coś się rusza (wejście, krótki pokaz
// bryły, zmiana dekoru, obrót) – w spoczynku płótno nie zużywa GPU. Ruch, który startuje sam, trwa < 5 s.
import * as THREE from 'three';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { DECORS } from '../../../../../shared/catalog.js';
import { S, surfaceMaterial } from '../../../../three/materials.js';
import { decorTexture, flutesNormalTexture, tilesTexture } from '../../../../three/textures.js';
import { RoomEnvironmentMap } from '../../../../three/geometry.jsx';
import { DRAG_LIMIT, SPRING_DRAG, cancelIdle, finishFor, idle, isWood } from './data.js';
import { fitCamera } from './framing.js';
import { MODEL_DEFS } from './models.jsx';

const DEG = Math.PI / 180;
const BASE_YAW = -14 * DEG; // spoczynek: mebel lekko z boku, widać oświetlony prawy bok
const INTRO_TIME = 1.25; // s – wejście modelu (obrót + skala)
const INTRO_STAGGER = 0.1; // s – przesunięcie wejścia między kartami
const INTRO_YAW = 22 * DEG; // wejście: obrót z boku do spoczynku
// Jednorazowy pokaz bryły po wejściu: jeden spokojny wychył w prawo i w lewo z łagodnym startem i końcem.
// Wejście + pokaz trwają razem (z przesunięciem kart) ok. 4,6 s i już nie wracają (WCAG 2.2.2: ruch
// startujący sam musi ustać w 5 s). Pokaz gaśnie od razu przy pierwszym obrocie użytkownika.
const SHOW_START = 1; // s od startu wejścia (końcówka wejścia jest już niezauważalna)
const SHOW_TIME = 3.4; // s
const SHOW_AMP = 12 * DEG; // obwiednia sin·sin daje szczyty ok. ±9°
const SHOW_END = SHOW_START + SHOW_TIME;
const SETTLE = 2e-3; // rad (ok. 0,1°, ułamek piksela) – bliżej celu obrót „dociągamy” i pętla zasypia
const COLOR_TIME = 0.5; // s – płynne przejście między kolorami jednolitymi
const SQUASH_IN = 0.16; // s – „przysiad”; w jego najniższym punkcie podmieniamy materiał (drewno)
const BOUNCE_END = 0.72; // s – koniec odbicia
// Rozdzielczość tekstur drewna [px/cm]: okno karty ma ok. 300–450 px, więc 400×800 px na kafel 100×200 cm
// wystarcza (domyślne 10 px/cm = 1000×2000 px i ok. 10 MB na GPU na każdy dekor).
const PPC = 4;
// Kadrowanie wspólne dla wszystkich kart; zakres obrotu = maksymalne odchylenie od spoczynku.
const FRAME = { fov: 24, yaw: BASE_YAW / DEG, range: DRAG_LIMIT / DEG, anchor: -0.62, top: 0.8, bottom: -0.92, side: 0.84 };

// Telefon i tablet (palec): płótno obejmuje cały tor karuzeli, więc mniejszy bufor – bez MSAA i z DPR do 1,25.
const COARSE = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
// stałe propsy płótna (nowe obiekty przy każdym renderze niepotrzebnie rekonfigurowałyby renderer)
const GL = { antialias: !COARSE, alpha: true, powerPreference: 'default' };
const DPR = COARSE ? [1, 1.25] : [1, 1.5];
const CAMERA = { fov: 24, near: 0.1, far: 60, position: [0, 1.2, 8] };
const RESIZE = { scroll: false }; // pozycja płótna na stronie nie jest potrzebna – bez nasłuchu przewijania
const STYLE = { pointerEvents: 'none' };

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (k) => k * k * (3 - 2 * k);
const easeOutQuart = (k) => 1 - (1 - k) ** 4;
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const damp = THREE.MathUtils.damp;

// „Przysiad” i odbicie: 0 → 1 (przysiad), potem tłumiona sprężyna startująca z zerową prędkością,
// z lekkim przeskokiem ponad stan spoczynku; na końcu wygaszona do zera bez skoku.
function bounceCurve(t) {
  if (t < SQUASH_IN) return smooth(t / SQUASH_IN);
  const tau = t - SQUASH_IN;
  const w0 = 2 * Math.PI * 2.4;
  const zeta = 0.42;
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  const v = Math.exp(-zeta * w0 * tau) * (Math.cos(wd * tau) + ((zeta * w0) / wd) * Math.sin(wd * tau));
  return v * (1 - smooth(clamp01((t - (BOUNCE_END - 0.14)) / 0.14)));
}

// Zadanie po najbliższym malowaniu (rAF → setTimeout): kliknięcie najpierw odświeża próbnik, potem liczymy.
function afterPaint(cb) {
  let timer = 0;
  const raf = requestAnimationFrame(() => {
    timer = window.setTimeout(cb, 0);
  });
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
}

function idleTask(cb) {
  const handle = idle(cb, 800);
  return () => cancelIdle(handle);
}

// --- materiały ------------------------------------------------------------------------------------------

// Każdy mebel ma stałe materiały „wyświetlane” (front / korpus), do których kopiujemy parametry
// materiału z konfiguratora (surfaceMaterial). Siatki nie zmieniają materiału, więc zmiana dekoru nie
// wymaga re-renderu Reacta. Tekstury dekorów są współdzielone (pamięć podręczna textures.js) – nie zwalniamy ich.
function copyMaterial(target, src) {
  target.copy(src);
  target.needsUpdate = true;
  src.dispose();
}

function applyDecor(rig, id) {
  const finish = finishFor(id);
  copyMaterial(rig.front, surfaceMaterial(id, finish, { fluted: rig.def.fluted, ppc: PPC }));
  if (rig.body !== rig.front) copyMaterial(rig.body, surfaceMaterial(id, finish, { ppc: PPC }));
}

// Płynne przejście koloru liczone w sRGB (równomierne dla oka także między ciemnym a jasnym).
function startColorLerp(rig, id) {
  const a = rig.colorAnim ?? { from: new THREE.Color(), to: new THREE.Color(), t: 0 };
  a.from.copy(rig.front.color).convertLinearToSRGB();
  a.to.set(DECORS[id].hex).convertLinearToSRGB();
  a.t = 0;
  rig.colorAnim = a;
}

// Miękki cień pod meblem: kształty rozmyte przez shadowBlur na <canvas> (kształt rysujemy poza
// płótnem, zostaje sam cień). Płaszczyzna leży tuż nad podłogą i obraca się razem z meblem.
const SHADOW_RGB = '38, 27, 19';

function makeShadow(def) {
  const { x0, x1, z0, z1 } = def.bounds;
  const M = 34; // margines na rozmycie [cm]
  const W = x1 - x0 + 2 * M;
  const D = z1 - z0 + 2 * M;
  const k = 256 / Math.max(W, D); // px na cm
  const c = document.createElement('canvas');
  c.width = Math.max(32, Math.round(W * k));
  c.height = Math.max(32, Math.round(D * k));
  const ctx = c.getContext('2d');
  const off = c.width + 64;
  ctx.fillStyle = '#000';
  ctx.shadowOffsetX = off;
  ctx.shadowOffsetY = 0;
  for (const s of def.shadow) {
    ctx.shadowColor = `rgba(${SHADOW_RGB}, ${s.a})`;
    ctx.shadowBlur = s.blur * k;
    const pw = (s.x1 - s.x0) * k;
    const ph = (s.z1 - s.z0) * k;
    const px = (s.x0 - x0 + M) * k - off;
    const py = (s.z0 - z0 + M) * k;
    ctx.beginPath();
    if (s.round) ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
    else ctx.rect(px, py, pw, ph);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, W, D, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

// Materiały, które się nie zmieniają: ściana, płytki, blat dąb, dodatki.
function createStatics() {
  return {
    wall: new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.92 }),
    tiles: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, map: tilesTexture() }),
    oak: surfaceMaterial('dab_naturalny', 'mat', { horizontal: true, ppc: PPC }),
    ceramic: new THREE.MeshStandardMaterial({ color: '#efe9e0', roughness: 0.34 }),
    leg: new THREE.MeshStandardMaterial({ color: '#b08a5f', roughness: 0.5 }),
    bookA: new THREE.MeshStandardMaterial({ color: '#d8cdbd', roughness: 0.85 }),
    bookB: new THREE.MeshStandardMaterial({ color: '#7c6c5f', roughness: 0.8 }),
  };
}

function createRig(def, index, decorId) {
  const b = def.bounds;
  const front = new THREE.MeshStandardMaterial();
  const rig = {
    def,
    index,
    front,
    body: def.fluted ? new THREE.MeshStandardMaterial() : front, // korpus bez lameli
    shown: decorId, // dekor, który pokazuje (lub do którego właśnie przechodzi) materiał
    target: decorId, // dekor wybrany w próbniku
    colorAnim: null,
    bounce: null,
    squash: 0,
    t: -index * INTRO_STAGGER, // zegar wejścia i pokazu [s] – rośnie tylko w rysowanych klatkach
    showK: 1, // siła pokazu bryły (gaśnie po pierwszym obrocie użytkownika)
    dragYaw: 0,
    outer: null,
    camera: new THREE.PerspectiveCamera(24, 1, 0.1, 50),
    frame: { ...FRAME, W: (b.x1 - b.x0) * S, D: (b.z1 - b.z0) * S, H: b.h * S, pitch: def.pitch },
    viewW: 0,
    viewH: 0,
    shadow: makeShadow(def),
  };
  applyDecor(rig, decorId);
  return rig;
}

// --- animacja jednego mebla (wywoływana w każdej klatce) ----------------------------------------------------
// Zwraca true, dopóki mebel jest w ruchu – pętla w trybie „demand” prosi wtedy o kolejną klatkę.
// instant – zmiana dekoru bez animacji (ograniczony ruch albo przed pierwszą klatką);
// texOk(id) – czy tekstura dekoru jest gotowa (jeśli nie, zleca ją i zwraca false).

const tmpColor = new THREE.Color();

function stepRig(rig, it, dt, reduced, instant, canIntro, texOk) {
  const o = rig.outer;
  if (!o) return false;
  let busy = false;

  // 1) wejście (obrót z boku do spoczynku + skala 0,9 → 1 od podłogi) i jednorazowy pokaz bryły.
  // Zegar rig.t rośnie tylko w rysowanych klatkach o ograniczonym dt, więc po powrocie na kartę
  // przeglądarki albo do sekcji ruch płynie dalej, zamiast przeskoczyć o kilkanaście stopni.
  let ie = 1;
  let sway = 0;
  if (!reduced && rig.t < SHOW_END) {
    if (canIntro) {
      rig.t = Math.min(SHOW_END, rig.t + dt);
      busy = true;
    }
    ie = easeOutQuart(clamp01(rig.t / INTRO_TIME));
    if (it?.touched && rig.showK > 0) {
      rig.showK = damp(rig.showK, 0, 10, dt);
      if (rig.showK < 1e-3) rig.showK = 0;
    }
    const s = clamp01((rig.t - SHOW_START) / SHOW_TIME);
    sway = rig.showK * SHOW_AMP * Math.sin(s * Math.PI * 2) * Math.sin(s * Math.PI);
    if (rig.showK === 0 && rig.t >= INTRO_TIME) rig.t = SHOW_END; // pokaz przerwany – zegar staje
  }

  // 2) zmiana dekoru
  if (instant) {
    if (rig.shown !== rig.target && texOk(rig.target)) {
      applyDecor(rig, rig.target);
      rig.shown = rig.target;
    }
    rig.colorAnim = null;
    rig.bounce = null;
    rig.squash = 0;
  } else {
    if (rig.shown !== rig.target) {
      if (!isWood(rig.shown) && !isWood(rig.target)) {
        // kolor → kolor: płynne przejście barwy tego samego materiału
        startColorLerp(rig, rig.target);
        rig.shown = rig.target;
      } else if (!rig.bounce) {
        // drewno w grze: „przysiad”, w najniższym punkcie zamiana materiału, odbicie
        rig.bounce = { t: 0, swapped: false };
      }
    }
    const a = rig.colorAnim;
    if (a) {
      a.t = Math.min(1, a.t + dt / COLOR_TIME);
      tmpColor.copy(a.from).lerp(a.to, easeInOutCubic(a.t)).convertSRGBToLinear();
      rig.front.color.copy(tmpColor);
      if (rig.body !== rig.front) rig.body.color.copy(tmpColor);
      if (a.t >= 1) rig.colorAnim = null;
      busy = true;
    }
    const b = rig.bounce;
    if (b) {
      busy = true;
      b.t += dt;
      if (!b.swapped && b.t >= SQUASH_IN) {
        // najnowszy wybór (użytkownik mógł kliknąć kilka razy w trakcie przysiadu)
        if (rig.shown === rig.target || texOk(rig.target)) {
          b.swapped = true;
          if (rig.shown !== rig.target) {
            applyDecor(rig, rig.target);
            rig.shown = rig.target;
            rig.colorAnim = null;
          }
        } else {
          b.t = SQUASH_IN; // tekstura jeszcze się generuje – mebel czeka w najniższym punkcie przysiadu
        }
      }
      if (b.t >= BOUNCE_END) {
        rig.bounce = null;
        rig.squash = 0;
      } else {
        rig.squash = bounceCurve(b.t);
      }
    }
  }

  // 3) obrót: użytkownik (mysz / przyciski, stan z DOM) + wejście + pokaz; łącznie maks. ±30°.
  // it.drag – bieżący kąt użytkownika, it.hold – kąt ustawiony przyciskami (tam wraca po puszczeniu myszy).
  let user = 0;
  if (it) {
    if (!it.dragging && it.drag !== it.hold) {
      it.drag = damp(it.drag, it.hold, it.spring || SPRING_DRAG, dt);
      if (Math.abs(it.drag - it.hold) < SETTLE) it.drag = it.hold;
      if (!reduced) busy = true;
    }
    user = it.drag;
  }
  if (reduced) {
    rig.dragYaw = 0;
  } else if (rig.dragYaw !== user) {
    rig.dragYaw = damp(rig.dragYaw, user, 14, dt);
    if (Math.abs(rig.dragYaw - user) < SETTLE) rig.dragYaw = user;
    busy = true;
  }
  const offset = sway + rig.dragYaw - (1 - ie) * INTRO_YAW;
  o.rotation.y = BASE_YAW + Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, offset));

  // 4) skala: wejście i „przysiad” (Y do 0,97, X/Z lekko na boki – zachowanie objętości)
  const si = 0.9 + 0.1 * ie;
  const sq = rig.squash;
  o.scale.set(si * (1 + 0.012 * sq), si * (1 - 0.03 * sq), si * (1 + 0.012 * sq));
  return busy;
}

// --- rysowanie: każdy mebel w prostokącie swojej karty -------------------------------------------------------
// Zawsze wszystkie okna (także kart poza ekranem): w trybie „demand” przewinięcie karuzeli nie wywołuje
// nowej klatki, więc płótno musi mieć gotowe wszystkie meble.

function drawViews(state, rigs, viewRefs) {
  const { gl, scene, size } = state;
  const cr = gl.domElement.getBoundingClientRect();
  if (cr.width < 1 || cr.height < 1) return;
  const autoClear = gl.autoClear;
  gl.autoClear = false;
  gl.setScissorTest(false);
  gl.setClearColor(0x000000, 0);
  // ostatnio rysowany był przezroczysty cień (depthWrite: false) – bez tego bufor głębi by się nie wyczyścił
  gl.state.buffers.color.setMask(true);
  gl.state.buffers.depth.setMask(true);
  gl.clear(true, true, true);
  gl.setScissorTest(true);
  for (let i = 0; i < rigs.length; i++) {
    const rig = rigs[i];
    const el = viewRefs[i]?.current;
    if (!el || !rig.outer) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.width !== rig.viewW || r.height !== rig.viewH) {
      fitCamera(rig.camera, rig.frame, r.width, r.height);
      rig.viewW = r.width;
      rig.viewH = r.height;
    }
    const x = r.left - cr.left;
    const y = size.height - (r.top - cr.top) - r.height; // WebGL liczy od dołu
    for (let j = 0; j < rigs.length; j++) if (rigs[j].outer) rigs[j].outer.visible = j === i;
    gl.setViewport(x, y, r.width, r.height);
    gl.setScissor(x, y, r.width, r.height);
    gl.render(scene, rig.camera);
  }
  for (let j = 0; j < rigs.length; j++) if (rigs[j].outer) rigs[j].outer.visible = true;
  gl.setScissorTest(false);
  gl.setViewport(0, 0, size.width, size.height);
  gl.autoClear = autoClear;
}

// --- scena ---------------------------------------------------------------------------------------------------

function Stage({ viewRefs, initialDecors, decors, reduced, frameloop, interactRef, play, apiRef, onReady, onError }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  // najświeższe propsy dla pętli i nasłuchów (zapisywane po renderze, nie w jego trakcie)
  const live = useRef({ reduced, play, onReady, onError });
  useLayoutEffect(() => {
    live.current = { reduced, play, onReady, onError };
  });
  const flags = useRef({ compiled: false, ready: false });
  const compiling = useRef(null); // obietnica kompilacji shaderów (do bezpiecznego sprzątania)

  const statics = useMemo(createStatics, []);
  // dekory startowe = stan próbników przy montowaniu ColorStage (ich tekstury są już gotowe)
  const rigs = useMemo(() => MODEL_DEFS.map((def, i) => createRig(def, i, initialDecors[i])), [initialDecors]);

  // Tekstury drewna generujemy leniwie – gdy kursor albo fokus trafi na próbkę (w wolnej chwili) albo po
  // kliknięciu (zaraz po malowaniu) – i zawsze w osobnym zadaniu: kliknięcie od razu odświeża próbnik (INP),
  // a mebel w razie potrzeby czeka chwilę w „przysiadzie”. Na GPU trafiają tylko dekory, które ktoś wybrał.
  const [texq] = useState(() => ({ ready: new Set(initialDecors.filter(isWood)), jobs: new Map(), off: false }));
  useEffect(() => {
    texq.off = false;
    return () => {
      texq.off = true;
      texq.jobs.forEach((job) => job.cancel());
      texq.jobs.clear();
    };
  }, [texq]);
  const ensureTex = useCallback(
    (id, urgent) => {
      if (!isWood(id) || texq.ready.has(id)) return true;
      const job = texq.jobs.get(id);
      if (job && (job.urgent || !urgent)) return false;
      job?.cancel(); // zadanie „w wolnej chwili” awansuje na pilne
      const run = () => {
        texq.jobs.delete(id);
        if (texq.off) return;
        const tex = decorTexture(id, { ppc: PPC });
        if (tex) gl.initTexture(tex);
        texq.ready.add(id);
        invalidate();
      };
      texq.jobs.set(id, { urgent, cancel: urgent ? afterPaint(run) : idleTask(run) });
      return false;
    },
    [gl, invalidate, texq],
  );
  const texOk = useCallback((id) => ensureTex(id, true), [ensureTex]);

  // Sprzątanie materiałów i tekstur cieni. Jeśli kompilacja jeszcze trwa, czekamy na nią (sprawdza
  // gotowość programów tych materiałów w setTimeout), z limitem czasu na wypadek utraty kontekstu.
  useEffect(
    () => () => {
      let done = false;
      const disposeAll = () => {
        if (done) return;
        done = true;
        rigs.forEach((r) => {
          r.front.dispose();
          if (r.body !== r.front) r.body.dispose();
          r.shadow.tex.dispose();
        });
        Object.values(statics).forEach((m) => m.dispose());
      };
      const job = compiling.current;
      if (!job) {
        disposeAll();
        return;
      }
      job.then(disposeAll, disposeAll);
      window.setTimeout(disposeAll, 4000);
    },
    [rigs, statics],
  );

  // utrata kontekstu WebGL (np. słaby telefon) → wracamy do szkiców 2D
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (e) => {
      e.preventDefault();
      live.current.onError?.();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [gl]);

  // Kompilacja shaderów przed pierwszą klatką (asynchronicznie, bez zacinania przewijania) – także wariantów
  // materiału, które pojawią się dopiero po zmianie dekoru (kolor/drewno × gładki/ryflowany).
  // Materiały-wzorce zostają w pamięci do końca, żeby skompilowane programy nie zostały zwolnione.
  useEffect(() => {
    let alive = true;
    const geo = new THREE.PlaneGeometry(0.001, 0.001);
    const oak = statics.oak.map;
    const flutes = flutesNormalTexture();
    const variants = [
      new THREE.MeshStandardMaterial(),
      new THREE.MeshStandardMaterial({ map: oak }),
      new THREE.MeshStandardMaterial({ normalMap: flutes }),
      new THREE.MeshStandardMaterial({ map: oak, normalMap: flutes }),
    ];
    const probe = new THREE.Group();
    variants.forEach((m) => probe.add(new THREE.Mesh(geo, m)));
    scene.add(probe);
    let settled = false;
    const disposeProbe = () => {
      geo.dispose();
      variants.forEach((m) => m.dispose());
    };
    const done = () => {
      settled = true;
      compiling.current = null;
      scene.remove(probe);
      if (!alive) {
        disposeProbe();
        return;
      }
      flags.current.compiled = true;
      invalidate();
    };
    let job;
    try {
      job = gl.compileAsync ? gl.compileAsync(scene, rigs[0].camera) : Promise.resolve(gl.compile(scene, rigs[0].camera));
    } catch {
      job = Promise.resolve();
    }
    compiling.current = job;
    job.then(done, done);
    return () => {
      alive = false;
      scene.remove(probe);
      if (settled) disposeProbe(); // inaczej posprząta `done` po zakończeniu kompilacji
    };
  }, [gl, scene, rigs, statics, invalidate]);

  // Tryb „demand”: świeża klatka po powrocie z „never” (sekcja poza ekranem), przy wejściu sekcji w widok
  // (start animacji wejścia) i po zmianie preferencji ruchu.
  useEffect(() => {
    if (frameloop !== 'never') invalidate();
  }, [frameloop, play, reduced, invalidate]);

  // Zmiana dekoru w próbniku: od razu zlecamy teksturę (osobne zadanie), animację prowadzi pętla.
  useEffect(() => {
    rigs.forEach((rig, i) => {
      const id = decors[i];
      if (!id || id === rig.target) return;
      rig.target = id;
      ensureTex(id, true);
    });
    invalidate();
  }, [decors, rigs, ensureTex, invalidate]);

  // Most do DOM (ColorPicker.jsx): wybudzenie pętli przy obrocie myszą / przyciskami i wcześniejsze
  // przygotowanie tekstury drewna, gdy kursor albo fokus trafi na próbkę.
  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = {
      wake: () => invalidate(),
      prepare: (id) => {
        ensureTex(id, false);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, invalidate, ensureTex]);

  // Pętla: animacje (priorytet 1 = rysujemy sami, R3F nie renderuje sceny domyślną kamerą).
  useFrame((state, delta) => {
    // po przerwie (tryb „demand”, karta w tle) delta bywa ogromna – wtedy liczymy jedną zwykłą klatkę
    const dt = delta > 0.25 ? 1 / 60 : Math.min(delta, 1 / 20);
    const { reduced: rm, play: pl } = live.current;
    const f = flags.current;
    const interact = interactRef.current;
    let busy = false;
    for (let i = 0; i < rigs.length; i++) {
      if (stepRig(rigs[i], interact?.[i], dt, rm, rm || !f.ready, pl && f.compiled, texOk)) busy = true;
    }
    if (!f.compiled) return;
    drawViews(state, rigs, viewRefs);
    if (!f.ready) {
      f.ready = true;
      live.current.onReady?.();
    }
    if (busy) state.invalidate();
  }, 1);

  const content = useMemo(
    () =>
      rigs.map((rig) => {
        const { def, shadow } = rig;
        const { Model, bounds: b } = def;
        const m = { ...statics, front: rig.front, body: rig.body };
        return (
          <group
            key={def.id}
            ref={(o) => {
              rig.outer = o;
            }}
          >
            {/* oś obrotu = środek podstawy mebla */}
            <group position={[(-(b.x0 + b.x1) / 2) * S, 0, (-(b.z0 + b.z1) / 2) * S]}>
              <Model m={m} />
              <mesh position={[shadow.cx * S, 0.0015, shadow.cz * S]} rotation-x={-Math.PI / 2} renderOrder={1}>
                <planeGeometry args={[shadow.W * S, shadow.D * S]} />
                <meshBasicMaterial map={shadow.tex} transparent depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          </group>
        );
      }),
    [rigs, statics],
  );

  return (
    <>
      <RoomEnvironmentMap intensity={0.55} />
      <directionalLight position={[2.6, 4.2, 3.6]} intensity={2.1} color="#fff5e8" />
      {content}
    </>
  );
}

// --- płótno ----------------------------------------------------------------------------------------------------

export default function ColorStage({ viewRefs, decors, reduced, frameloop, interactRef, play, apiRef, onReady, onError }) {
  const [prepared, setPrepared] = useState(false);
  // dekory w chwili montowania – ich tekstury szykujemy przed pierwszą klatką, dalsze zmiany obsługuje scena
  const [initial] = useState(decors);

  // Tekstury potrzebne od razu (blat dąb, płytki, lamele, dekory startowe) – każda w osobnej wolnej chwili,
  // zamiast jednego długiego zadania w trakcie przewijania.
  useEffect(() => {
    const jobs = [
      () => decorTexture('dab_naturalny', { horizontal: true, ppc: PPC }),
      () => tilesTexture(),
      () => flutesNormalTexture(),
      ...initial.filter(isWood).map((id) => () => decorTexture(id, { ppc: PPC })),
    ];
    let alive = true;
    let handle = 0;
    let i = 0;
    const run = () => {
      if (!alive) return;
      const job = jobs[i++];
      if (!job) {
        setPrepared(true);
        return;
      }
      job();
      handle = idle(run, 1200);
    };
    handle = idle(run, 1200);
    return () => {
      alive = false;
      cancelIdle(handle);
    };
  }, [initial]);

  if (!prepared) return null;
  // frameloop „demand”: klatki tylko w trakcie animacji i interakcji (useFrame prosi o kolejne); poza ekranem stop
  return (
    <Canvas
      gl={GL}
      dpr={DPR}
      camera={CAMERA}
      resize={RESIZE}
      style={STYLE}
      frameloop={frameloop === 'never' ? 'never' : 'demand'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping; // wierne kolory dekorów – jak w konfiguratorze
        gl.toneMappingExposure = 1;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Stage
        viewRefs={viewRefs}
        initialDecors={initial}
        decors={decors}
        reduced={reduced}
        frameloop={frameloop}
        interactRef={interactRef}
        play={play}
        apiRef={apiRef}
        onReady={onReady}
        onError={onError}
      />
    </Canvas>
  );
}
