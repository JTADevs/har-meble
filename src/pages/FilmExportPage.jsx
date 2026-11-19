// Tylko tryb deweloperski: eksport filmu z hero do MP4, klatka po klatce w stałym czasie filmu.
// Każda klatka to SUB podklatek uśrednionych w świetle liniowym:
//  - czas podklatek rozłożony na migawkę 180° → filmowe rozmycie ruchu,
//  - kamera przesunięta o ułamek piksela (ciąg Haltona) → wygładzanie krawędzi bez schodków.
// Przenikanie przez kolor przy cięciach – jak w hero (tam robi je element DOM nad filmem).
// Surowe klatki RGBA idą przez POST /api/dev/film/* prosto do ffmpeg → exports/<nazwa>.mp4.
// Adres: /studio/film?format=16x9&auto=1  (format: 16x9 | 9x16, test=1 – tylko 2 s).
import * as THREE from 'three';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Scene } from './home/film/HeroFilm.jsx';
import { FILM_LENGTH, SHOTS, filmAt, shotStart } from './home/film/shots.js';

const FORMATS = {
  '16x9': { w: 1920, h: 1080, name: 'film-stolarnia-1920x1080-60fps', label: 'Poziomo 1920×1080', safe: null },
  // pionowo: kompozycja na środku kadru (w hero jest wyżej – nad tekstem)
  '9x16': { w: 1080, h: 1920, name: 'film-stolarnia-1080x1920-60fps', label: 'Pionowo 1080×1920', safe: { top: 0.25, bottom: 0.75 } },
};
const FPS = 60;
const SUB = 8; // podklatki na klatkę
const SHUTTER = 0.5; // 180°: naświetlanie przez pół odstępu między klatkami
// jakość bez kompromisów (render offline): pełne AO w najwyższej jakości, mapa cieni 4096, gęstsza tekstura dębu
const QUALITY = { samples: 0, ao: true, aoQuality: 'ultra', aoHalfRes: false, shadow: 4096, fps: FPS, ppc: 10 };

const halton = (i, b) => {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
};
const JITTER = Array.from({ length: SUB }, (_, k) => [halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5]);

// sRGB ⇄ liniowe (tablice – bez potęgowania na każdy piksel)
const TO_LIN = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const LIN_N = 16384;
const TO_SRGB = Float32Array.from({ length: LIN_N + 1 }, (_, i) => {
  const c = i / LIN_N;
  return (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255;
});
// szum ±0,5 poziomu przed zaokrągleniem do 8 bitów (dithering) – bez pasm na gładkich gradientach;
// tablica przesuwana co klatkę, żeby wzór nie stał w miejscu
const NOISE_N = 1 << 16;
const NOISE = Float32Array.from({ length: NOISE_N }, () => Math.random() - 0.5);

const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// to samo „przenikanie przez kolor” co w Director (HeroFilm) przy odtwarzaniu
function flashAt(t) {
  const at = filmAt(t);
  const dur = SHOTS[at.shot].dur;
  const out = Math.max(0, 1 - at.st / 0.45);
  const inn = Math.max(0, 1 - (dur - at.st) / 0.22);
  return { alpha: Math.max(out, inn), rgb: hexRgb(SHOTS[inn > out ? (at.shot + 1) % SHOTS.length : at.shot].bg) };
}

// przesunięcie subpikselowe kamery – po Director (priorytet -1), przed kompozytorem (1)
function Jitter({ jitter }) {
  useFrame((state) => {
    const j = jitter.current;
    if (!j) return;
    const cam = state.camera;
    const { width, height } = state.size;
    if (cam.view?.enabled) {
      cam.view.offsetX += j[0];
      cam.view.offsetY += j[1];
      cam.updateProjectionMatrix();
    } else cam.setViewOffset(width, height, j[0], j[1], width, height);
  }, 0.5);
  return null;
}

// przekazuje na zewnątrz płótna advance (ręczne klatki w trybie „never”) i renderer
function Bridge({ onApi }) {
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  useEffect(() => onApi({ advance, gl }), [onApi, advance, gl]);
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (url, body, json = true) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': json ? 'application/json' : 'application/octet-stream' },
    body: json ? JSON.stringify(body ?? {}) : body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || data.log || `HTTP ${res.status}`);
  return data;
};

export default function FilmExportPage() {
  const [params] = useSearchParams();
  const fmtKey = FORMATS[params.get('format')] ? params.get('format') : '16x9';
  const fmt = FORMATS[fmtKey];
  const test = params.get('test') === '1';
  const film = useRef({ t: 0, shot: 0, st: 0, p: 0 });
  const ui = useRef({ bars: [], shots: [], flash: null, invalidate: null, safe: fmt.safe });
  const jitter = useRef(null);
  const api = useRef(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({ phase: 'przygotowanie', frame: 0, total: 0, eta: '', file: '', error: '' });
  const started = useRef(false);
  const onApi = useCallback((v) => {
    api.current = v;
    setReady(true);
  }, []);

  const run = async () => {
    if (started.current) return;
    started.current = true;
    try {
      const { advance, gl } = api.current;
      // rozgrzewka sceny: w trybie „never” sami popychamy klatki, aż Warmup skompiluje shadery i wyśle tekstury
      setState((s) => ({ ...s, phase: 'rozgrzewka' }));
      for (let i = 0; i < 600 && !readyRef.current; i++) {
        advance(0);
        await sleep(16);
      }
      if (!readyRef.current) throw new Error('Scena nie wystartowała.');
      const { w: W, h: H } = fmt;
      const length = test ? 2 : FILM_LENGTH;
      const total = Math.round(length * FPS);
      const name = test ? `${fmt.name}-test` : fmt.name;
      // resume: po przeładowaniu karty (np. Chrome zwolnił ją z pamięci) kontynuujemy od klatki, którą ma serwer
      const job = await post('/api/dev/film/start', { name, width: W, height: H, fps: FPS, resume: true });
      const ctx = gl.getContext();
      // bufory alokowane raz – w pętli żadnych nowych tablic (wcześniej 8 × 8 MB śmieci na klatkę)
      const px = new Uint8Array(W * H * 4);
      const acc = new Float32Array(W * H * 3);
      const out = new Uint8ClampedArray(W * H * 4);
      const first = job.frames || 0;
      const t0 = performance.now();
      let ts = 1 + first / FPS; // znacznik czasu dla advance (tylko rośnie)
      for (let i = first; i < total; i++) {
        const tc = i / FPS;
        const at = filmAt(tc);
        const lo = shotStart(at.shot);
        const hi = lo + SHOTS[at.shot].dur - 1e-4;
        acc.fill(0);
        for (let k = 0; k < SUB; k++) {
          // podklatki w obrębie bieżącego ujęcia (cięcie zawsze między klatkami)
          const tk = Math.min(hi, Math.max(lo, tc + ((k + 0.5) / SUB - 0.5) * (SHUTTER / FPS)));
          film.current.t = Math.min(FILM_LENGTH - 1e-4, Math.max(0, tk));
          jitter.current = JITTER[k];
          ts += 1 / (FPS * SUB);
          advance(ts);
          gl.setRenderTarget(null);
          ctx.readPixels(0, 0, W, H, ctx.RGBA, ctx.UNSIGNED_BYTE, px); // wiersze od dołu – odwracamy przy zapisie
          for (let p = 0, a = 0; p < px.length; p += 4, a += 3) {
            acc[a] += TO_LIN[px[p]];
            acc[a + 1] += TO_LIN[px[p + 1]];
            acc[a + 2] += TO_LIN[px[p + 2]];
          }
        }
        // średnia → sRGB, potem kolor przejścia (w hero mieszany w sRGB przez przeglądarkę)
        const { alpha, rgb } = flashAt(tc);
        const s = LIN_N / SUB;
        const ia = 1 - alpha;
        const fr = rgb[0] * alpha;
        const fg = rgb[1] * alpha;
        const fb = rgb[2] * alpha;
        const off = (i * 7919) % NOISE_N;
        for (let y = 0; y < H; y++) {
          let p = y * W * 4; // wiersz wyjściowy (od góry)
          let a = (H - 1 - y) * W * 3; // ten sam wiersz w buforze z readPixels (od dołu)
          for (let x = 0; x < W; x++, p += 4, a += 3) {
            const n = NOISE[(p + off) & (NOISE_N - 1)];
            out[p] = TO_SRGB[Math.min(LIN_N, (acc[a] * s) | 0)] * ia + fr + n;
            out[p + 1] = TO_SRGB[Math.min(LIN_N, (acc[a + 1] * s) | 0)] * ia + fg + n;
            out[p + 2] = TO_SRGB[Math.min(LIN_N, (acc[a + 2] * s) | 0)] * ia + fb + n;
            out[p + 3] = 255;
          }
        }
        await post(`/api/dev/film/frame?i=${i}`, out, false);
        if (i % 6 === 0 || i === total - 1) {
          const per = (performance.now() - t0) / (i + 1 - first);
          const left = Math.round(((total - i - 1) * per) / 1000);
          setState((st) => ({ ...st, phase: 'render', frame: i + 1, total, eta: `${Math.floor(left / 60)} min ${left % 60} s`, file: job.file }));
        }
      }
      jitter.current = null;
      setState((st) => ({ ...st, phase: 'kodowanie' }));
      const end = await post('/api/dev/film/end');
      const secs = Math.round((performance.now() - t0) / 1000); // od wznowienia, jeśli było
      setState((st) => ({ ...st, phase: 'gotowe', file: end.file, eta: `${end.frames} klatek w ${Math.floor(secs / 60)} min ${secs % 60} s` }));
      document.title = 'GOTOWE – eksport filmu';
    } catch (e) {
      console.error(e);
      setState((st) => ({ ...st, phase: 'błąd', error: String(e.message || e) }));
      document.title = 'BŁĄD – eksport filmu';
    }
  };

  useEffect(() => {
    if (ready && params.get('auto') === '1') run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const scale = Math.min(1, 900 / fmt.w, 560 / fmt.h);
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Eksport filmu z hero → MP4</h1>
      <p style={{ margin: '0 0 12px', color: '#555', fontSize: 14 }}>
        {fmt.label}, {FPS} kl./s, {SUB} podklatek (rozmycie ruchu + wygładzanie), AO ultra, cienie 4096. Plik trafia do <code>exports/</code>.
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 14 }} data-export-status={state.phase}>
        <b>Status:</b> {state.phase}
        {state.total ? ` · klatka ${state.frame}/${state.total}` : ''}
        {state.eta ? ` · ${state.phase === 'render' ? 'zostało ok. ' : ''}${state.eta}` : ''}
        {state.file ? ` · ${state.file}` : ''}
        {state.error ? <span style={{ color: '#c00' }}> · {state.error}</span> : null}
      </p>
      <button type="button" className="btn btn-primary" disabled={!ready || started.current} onClick={run} style={{ marginBottom: 16 }}>
        Renderuj film
      </button>
      <div style={{ width: fmt.w * scale, height: fmt.h * scale, overflow: 'hidden', borderRadius: 8, background: '#ddd' }}>
        <div style={{ width: fmt.w, height: fmt.h, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Canvas
            shadows="soft"
            dpr={1}
            frameloop="never"
            resize={{ offsetSize: true, scroll: false }}
            camera={{ fov: 34, near: 0.03, far: 40, position: [1, 0.8, 1] }}
            gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.NeutralToneMapping;
            }}
            style={{ width: fmt.w, height: fmt.h }}
          >
            <Scene
              film={film}
              playing={false}
              ui={ui}
              near
              q={QUALITY}
              onReady={() => {
                readyRef.current = true;
              }}
            />
            <Jitter jitter={jitter} />
            <Bridge onApi={onApi} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
