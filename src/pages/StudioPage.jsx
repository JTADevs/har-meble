// Studio renderów (tylko tryb deweloperski): /studio?preset=nazwa | /studio?queue=all | /studio?preset=nazwa&preview=1
// Renderuje gotowe sceny path tracerem i zapisuje JPG do public/renders przez POST /api/dev/render.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STYLE_PRESETS } from '../../shared/catalog.js';
import { defaultKitchen, layoutKitchen, sanitizeKitchen } from '../../shared/kitchen.js';
import { defaultWardrobe, sanitizeWardrobe, wardrobeSpec } from '../../shared/wardrobe.js';
import { SceneShell } from '../three/parts.jsx';
import { KitchenScene } from '../three/KitchenScene.jsx';
import { WardrobeScene } from '../three/WardrobeScene.jsx';

const preset = (id) => STYLE_PRESETS.find((p) => p.id === id).set;
const kitchenI = (c) => ({ ...c, layout: 'I', walls: { ...c.walls, A: 360 } });
const wardrobeSet = (id) => {
  const { countertop, countertopDecor, ...rest } = preset(id);
  return rest;
};

export const STUDIO = {
  'kuchnia-szalwia': { kind: 'kitchen', config: (c) => ({ ...c, ...preset('szalwia') }), camera: [3.45, 1.55, 4.15], target: [1.5, 1.02, 0.75] },
  'kuchnia-orzech': { kind: 'kitchen', config: (c) => kitchenI({ ...c, ...preset('orzech') }), camera: [3.15, 1.48, 3.85], target: [1.75, 1.05, 0.35] },
  'kuchnia-zielen': { kind: 'kitchen', config: (c) => ({ ...c, ...preset('butelkowa') }), camera: [3.25, 1.45, 3.95], target: [1.5, 1.02, 0.7] },
  'kuchnia-grafit': { kind: 'kitchen', config: (c) => kitchenI({ ...c, ...preset('grafit') }), camera: [0.55, 1.5, 3.7], target: [1.75, 1.03, 0.3] },
  'kuchnia-skandi': { kind: 'kitchen', config: (c) => ({ ...c, ...preset('skandynawski') }), camera: [3.55, 1.58, 4.3], target: [1.5, 1.02, 0.8] },
  'szafa-dab': { kind: 'wardrobe', config: (c) => c, camera: [0.6, 1.4, 4.7], target: [0, 1.25, 0.3] },
  'szafa-szalwia': { kind: 'wardrobe', config: (c) => ({ ...c, doors: 'uchylne', ...wardrobeSet('szalwia') }), camera: [0.75, 1.4, 4.7], target: [0, 1.25, 0.3] },
  garderoba: {
    kind: 'wardrobe',
    config: (c) => ({
      ...c,
      width: 300,
      doors: 'brak',
      carcass: 'lam_dab',
      sections: [{ interior: 'drazek' }, { interior: 'szuflady' }, { interior: 'polki' }, { interior: 'drazek_podwojny' }],
    }),
    camera: [0.85, 1.38, 4.9],
    target: [0, 1.22, 0.3],
  },
  detal: { kind: 'kitchen', config: (c) => kitchenI({ ...c, ...preset('szalwia') }), camera: [1.95, 0.9, 1.12], target: [1.62, 0.66, 0.56], fov: 32 },
};

const W = 1600;
const H = 1000;

function StudioScene({ name, samples, preview, onDone }) {
  const p = STUDIO[name];
  const glRef = useRef(null);
  const [photo, setPhoto] = useState(false);
  const [n, setN] = useState(0);
  const [status, setStatus] = useState('przygotowanie…');
  const doneRef = useRef(false);

  const scene = useMemo(() => {
    if (p.kind === 'kitchen') {
      const config = sanitizeKitchen(p.config(defaultKitchen()));
      return { config, layout: layoutKitchen(config) };
    }
    const config = sanitizeWardrobe(p.config(defaultWardrobe()));
    return { config, spec: wardrobeSpec(config) };
  }, [p]);

  useEffect(() => {
    if (preview) return undefined;
    const t = setTimeout(() => setPhoto(true), 900);
    return () => clearTimeout(t);
  }, [preview]);

  useEffect(() => {
    if (!photo || n < samples || doneRef.current) return;
    doneRef.current = true;
    requestAnimationFrame(async () => {
      const data = glRef.current.domElement.toDataURL('image/jpeg', 0.9);
      setStatus('zapisywanie…');
      const res = await fetch('/api/dev/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data }),
      });
      setStatus(res.ok ? 'zapisano' : `błąd zapisu ${res.status}`);
      onDone?.(res.ok);
    });
  }, [photo, n, samples, name, onDone]);

  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
        <SceneShell
          camera={p.camera}
          target={p.target}
          interactive={preview}
          photo={photo}
          photoSamples={samples}
          onPhotoProgress={setN}
          glRef={glRef}
          dpr={1}
          fov={p.fov}
        >
          {p.kind === 'kitchen' ? (
            <KitchenScene config={scene.config} layout={scene.layout} selectedId={null} onSelect={() => {}} open={false} photo />
          ) : (
            <WardrobeScene config={scene.config} spec={scene.spec} open={scene.config.doors === 'brak'} />
          )}
        </SceneShell>
      </div>
      <div
        data-studio-status={status}
        style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9, padding: '8px 12px', background: '#111', color: '#fff', borderRadius: 8, font: '13px monospace' }}
      >
        {name}: {preview ? 'podgląd' : `${n}/${samples} · ${status}`}
      </div>
    </>
  );
}

export default function StudioPage() {
  const [params] = useSearchParams();
  const samples = Number(params.get('samples')) || 220;
  const preview = params.get('preview') === '1';
  const q = params.get('queue');
  const queue = q === 'all' ? Object.keys(STUDIO) : q ? q.split(',').filter((n) => STUDIO[n]) : [params.get('preset') || 'kuchnia-szalwia'];
  const [i, setI] = useState(0);
  const [log, setLog] = useState([]);
  const name = queue[i];
  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        overflow: 'hidden',
        background: '#000',
        // podgląd kadru: pomniejszenie, żeby cały kadr zmieścił się w oknie (proporcje bez zmian)
        ...(preview ? { transform: 'scale(0.62)', transformOrigin: '0 0' } : null),
      }}
    >
      {name ? (
        <StudioScene
          key={name}
          name={name}
          samples={samples}
          preview={preview}
          onDone={(ok) => {
            setLog((l) => [...l, `${name}: ${ok ? 'ok' : 'błąd'}`]);
            setTimeout(() => setI((x) => x + 1), 400);
          }}
        />
      ) : (
        <pre data-studio-finished="1" style={{ color: '#fff', padding: 24 }}>
          {`Gotowe:\n${log.join('\n')}`}
        </pre>
      )}
    </div>
  );
}
