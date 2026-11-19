import { useEffect, useMemo, useRef, useState } from 'react';
import { DIM, HANDLES, HARDWARE, MODULES, ROW_LABELS, uid } from '../../shared/catalog.js';
import {
  WALL_MOUNT,
  defaultKitchen,
  freezeWallRow,
  layoutKitchen,
  moveWallModule,
  nudgeWallModule,
  rowStart,
  sanitizeKitchen,
  wallRowGaps,
} from '../../shared/kitchen.js';
import { priceKitchen, pln } from '../../shared/pricing.js';
import { useAuth } from '../auth.jsx';
import { usePricing } from '../usePricing.js';
import { ModuleIcon, NumberStepper, Segmented } from '../components/ui.jsx';
import { CutListModal, OptionCards, PhotoOverlay, PriceSummary, ProjectBar, SubmitModal, Viewport, usePhotoMode, useProject } from '../components/Configurator.jsx';
import { CarcassSection, CountertopSection, FrontsSection, PresetPicker } from '../components/Finish.jsx';
import { SceneShell } from '../three/parts.jsx';
import { KitchenScene, kitchenCamera } from '../three/KitchenScene.jsx';

const lane = (type) => (MODULES[type].row === 'wall' ? 'wall' : 'floor');

export default function KitchenPage() {
  const proj = useProject('kuchnia', { sanitize: sanitizeKitchen, makeDefault: defaultKitchen, defaultName: 'Moja kuchnia' });
  const { config, update, readOnly } = proj;
  const { user } = useAuth();
  const pricing = usePricing();
  const [tab, setTab] = useState('szafki');
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);
  const [addWall, setAddWall] = useState('A');
  const [camKey, setCamKey] = useState(0);
  const [modal, setModal] = useState(null);
  const pm = usePhotoMode(proj.name);

  const layout = useMemo(() => layoutKitchen(config), [config]);
  const result = useMemo(() => priceKitchen(config, pricing), [config, pricing]);
  const cam = kitchenCamera(config);
  const selected = layout.placed.find((p) => p.id === selectedId);
  const targetWall = config.layout === 'L' ? addWall : 'A';
  const dragInfo = useRef(0); // czas końca przeciągania – kliknięcie „w pustkę” zaraz po nim nie odznacza szafki

  // --- historia zmian (cofnij / ponów) -----------------------------------------------
  // `known` – konfiguracje powstałe w edit/undo/redo. Inna konfiguracja (wczytanie projektu, nowy projekt) zeruje historię.
  const hist = useRef(null);
  const configRef = useRef(config);
  const [, setHistTick] = useState(0);
  if (!hist.current || !hist.current.known.has(config)) {
    hist.current = { past: [], future: [], known: new WeakSet([config]) };
    configRef.current = config;
  }

  // każda zmiana projektu przechodzi przez edit – trafia do historii.
  // group – seria drobnych zmian tego samego rodzaju (przytrzymana strzałka, klikanie +/−) w odstępach < 0,8 s
  // daje jeden krok cofania zamiast kilkudziesięciu
  const lastEdit = useRef({ group: null, at: 0 });
  const edit = (patch, group) => {
    if (readOnly) return;
    const cur = configRef.current;
    const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch };
    if (next === cur) return;
    const h = hist.current;
    const now = performance.now();
    const merge = group && lastEdit.current.group === group && now - lastEdit.current.at < 800 && h.past.length > 0;
    lastEdit.current = { group: group ?? null, at: now };
    if (!merge) {
      h.past.push(cur);
      if (h.past.length > 80) h.past.shift();
    }
    h.future = [];
    h.known.add(next);
    configRef.current = next;
    update(() => next);
    setHistTick((n) => n + 1);
  };
  const undo = () => {
    const h = hist.current;
    if (readOnly || !h.past.length) return;
    lastEdit.current.group = null;
    const prev = h.past.pop();
    h.future.push(configRef.current);
    configRef.current = prev;
    update(() => prev);
    setHistTick((n) => n + 1);
  };
  const redo = () => {
    const h = hist.current;
    if (readOnly || !h.future.length) return;
    lastEdit.current.group = null;
    const next = h.future.pop();
    h.past.push(configRef.current);
    configRef.current = next;
    update(() => next);
    setHistTick((n) => n + 1);
  };

  // bez zmiany listy (np. strzałka przy końcu rzędu) – bez pustego kroku w historii
  const setModules = (fn, group) =>
    edit((c) => {
      const modules = fn(c.modules);
      return modules === c.modules ? c : { ...c, modules };
    }, group);

  const addModule = (type) => {
    const m = { id: uid(), type, width: MODULES[type].defaultWidth, wall: targetWall };
    setModules((ms) => [...ms, m]);
    setSelectedId(m.id);
  };

  const move = (id, dir, group) =>
    setModules((ms) => {
      const m = ms.find((x) => x.id === id);
      const same = ms.map((x, i) => [x, i]).filter(([x]) => x.wall === m.wall && lane(x.type) === lane(m.type));
      const pos = same.findIndex(([x]) => x.id === id);
      const other = same[pos + dir];
      if (!other) return ms;
      const next = [...ms];
      const a = same[pos][1];
      const b = other[1];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    }, group);

  // przesunięcie w lewo/prawo: dolne i słupki – zmiana kolejności, górne – krok o `step` cm (albo zamiana z sąsiadką)
  const shift = (p, dir, step = 5, group = `shift-${p.id}`) => {
    if (p.row === 'wall') edit((c) => nudgeWallModule(c, p.id, dir, step), group);
    else move(p.id, dir, group);
  };
  const placeWall = (p, x, y, group) => edit((c) => moveWallModule(c, p.id, x, y), group);
  const alignWall = (p, side) => {
    const { start, end, obstacles } = wallRowGaps(layout, p.wall, p.id);
    if (side === 'left') placeWall(p, obstacles.reduce((m, [, b]) => (b <= p.x + 0.01 ? Math.max(m, b) : m), start), p.spec.y0);
    else placeWall(p, obstacles.reduce((m, [a]) => (a >= p.x + p.width - 0.01 ? Math.min(m, a) : m), end) - p.width, p.spec.y0);
  };
  const baseUnder = (p) => layout.walls[p.wall].placed.find((q) => q.row === 'base' && q.x <= p.x + p.width / 2 && p.x + p.width / 2 < q.x + q.width);
  const centerOverBase = (p) => {
    const q = baseUnder(p);
    if (q) placeWall(p, q.x + (q.width - p.width) / 2, p.spec.y0);
  };

  const patchModule = (id, patch) => setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeModule = (id) => {
    edit((c) => {
      const m = c.modules.find((x) => x.id === id);
      const base = m && MODULES[m.type].row === 'wall' ? freezeWallRow(c, m.wall) : c;
      return { ...base, modules: base.modules.filter((x) => x.id !== id) };
    });
    setSelectedId(null);
  };
  // przeniesienie na drugą ścianę: szafka górna trafia w pierwszą wolną lukę, a szafki tamtej ściany zostają na miejscach
  const toOtherWall = (p) => {
    const wall = p.wall === 'A' ? 'B' : 'A';
    edit((c) => {
      const base = p.row === 'wall' ? freezeWallRow(c, wall) : c;
      return { ...base, modules: base.modules.map((m) => (m.id === p.id ? { ...m, wall, x: undefined } : m)) };
    });
  };
  const duplicateModule = (id) => {
    const newId = uid();
    setModules((ms) => {
      const i = ms.findIndex((m) => m.id === id);
      return [...ms.slice(0, i + 1), { ...ms[i], id: newId }, ...ms.slice(i + 1)];
    });
    setSelectedId(newId);
  };

  const unit = (v, u) => `${pln(v)}/${u}`;

  // skróty: Ctrl/Cmd+Z cofnij, Ctrl/Cmd+Shift+Z lub Ctrl+Y ponów, strzałki – przesuwanie (Shift = 10 cm), Delete – usuń, Esc – odznacz
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (!selected || readOnly || pm.photo || mod) return;
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeModule(selected.id);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const visual = e.key === 'ArrowRight' ? 1 : -1;
        shift(selected, selected.wall === 'B' ? -visual : visual, step); // na ścianie B oś biegnie od narożnika w lewo ekranu
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected.row === 'wall') {
        e.preventDefault();
        placeWall(selected, selected.x, selected.spec.y0 + (e.key === 'ArrowUp' ? step : -step), `lift-${selected.id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (proj.loading) return <div className="page-loading">Wczytywanie projektu…</div>;

  return (
    <div className="cfg">
      <ProjectBar title="Kuchnia na wymiar" proj={proj} onSubmitClick={() => setModal('submit')} />

      <aside className="panel panel-left">
        <div className="tabs" role="tablist">
          {[
            ['szafki', 'Układ i szafki'],
            ['wykonczenie', 'Wykończenie'],
            ['uslugi', 'Usługi'],
          ].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {readOnly && <div className="note">Projekt jest tylko do podglądu – został wysłany do stolarni.</div>}

        {tab === 'szafki' && (
          <div className="panel-body">
            <section>
              <h4>Kształt kuchni</h4>
              <Segmented
                value={config.layout}
                disabled={readOnly}
                onChange={(v) => {
                  edit({ layout: v });
                  setCamKey((k) => k + 1);
                }}
                options={[
                  { value: 'I', label: 'Prosta (I)' },
                  { value: 'L', label: 'Narożna (L)' },
                ]}
              />
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Ściana A</span>
                  <NumberStepper value={config.walls.A} min={120} max={800} step={10} disabled={readOnly} onChange={(v) => edit((c) => ({ ...c, walls: { ...c.walls, A: v } }))} />
                </label>
                {config.layout === 'L' && (
                  <label className="field">
                    <span className="field-label">Ściana B</span>
                    <NumberStepper value={config.walls.B} min={120} max={600} step={10} disabled={readOnly} onChange={(v) => edit((c) => ({ ...c, walls: { ...c.walls, B: v } }))} />
                  </label>
                )}
              </div>
              {Object.entries(layout.walls).map(([w, info]) => (
                <div key={w} className="usage">
                  <div className="usage-row">
                    <span>Ściana {w} – dolne</span>
                    <Usage used={info.baseUsed} total={info.baseAvailable} />
                  </div>
                  <div className="usage-row">
                    <span>Ściana {w} – górne</span>
                    <Usage used={info.wallUsed} total={info.wallAvailable} />
                  </div>
                </div>
              ))}
            </section>

            {!readOnly && (
              <section>
                <div className="section-head">
                  <h4>Dodaj szafkę</h4>
                  {config.layout === 'L' && (
                    <Segmented
                      value={addWall}
                      onChange={setAddWall}
                      options={[
                        { value: 'A', label: 'na ścianę A' },
                        { value: 'B', label: 'na ścianę B' },
                      ]}
                    />
                  )}
                </div>
                {['base', 'tall', 'wall'].map((row) => (
                  <div key={row} className="catalog-group">
                    <span className="catalog-label">{ROW_LABELS[row]}</span>
                    <div className="catalog">
                      {Object.entries(MODULES)
                        .filter(([, d]) => d.row === row)
                        .map(([type, d]) => (
                          <button key={type} className="catalog-item" onClick={() => addModule(type)} title={`Dodaj: ${d.name}`}>
                            <ModuleIcon type={type} />
                            <span>{d.name}</span>
                            <span className="plus">+</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section>
              <h4>Szafki w projekcie</h4>
              {Object.entries(layout.walls).map(([w, info]) => (
                <div key={w} className="mod-list">
                  <span className="catalog-label">
                    Ściana {w} · {info.placed.length} szt.
                  </span>
                  {info.placed.length === 0 && <p className="muted small">Brak szafek – dodaj z katalogu powyżej.</p>}
                  {[...info.placed]
                    .sort((a, b) => (a.row === 'wall') - (b.row === 'wall') || a.x - b.x)
                    .map((p) => (
                      <button key={p.id} className={`mod-item ${p.id === selectedId ? 'active' : ''} ${p.overflow ? 'overflow' : ''}`} onClick={() => setSelectedId(p.id)}>
                        <ModuleIcon type={p.type} width={p.width} size={30} />
                        <span className="mod-label">{p.label}</span>
                        <span className="mod-name">{MODULES[p.type].name}</span>
                        <span className="mod-width">{p.width} cm</span>
                      </button>
                    ))}
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'wykonczenie' && (
          <div className="panel-body">
            <section>
              <h4>Gotowe zestawy</h4>
              <PresetPicker config={config} update={edit} readOnly={readOnly} />
            </section>
            <FrontsSection config={config} update={edit} pricing={pricing} readOnly={readOnly} />
            <CountertopSection config={config} update={edit} pricing={pricing} readOnly={readOnly} />
            <CarcassSection config={config} update={edit} pricing={pricing} readOnly={readOnly} />
            <section>
              <h4>Uchwyty</h4>
              <OptionCards
                value={config.handle}
                disabled={readOnly}
                onChange={(v) => edit({ handle: v })}
                options={Object.entries(HANDLES).map(([k, h]) => ({ value: k, label: h.name, hint: `${pln(pricing.handles[k])}/szt.` }))}
              />
            </section>
            <section>
              <h4>Okucia (zawiasy, szuflady)</h4>
              <OptionCards
                value={config.hardware}
                disabled={readOnly}
                onChange={(v) => edit({ hardware: v })}
                options={Object.entries(HARDWARE).map(([k, h]) => ({
                  value: k,
                  label: h.name,
                  hint: `zawias ${pln(pricing.hinge[k])} · szuflada ${pln(pricing.drawer[k])}`,
                }))}
              />
            </section>
          </div>
        )}

        {tab === 'uslugi' && (
          <div className="panel-body">
            <section>
              <h4>Dodatki i usługi</h4>
              <label className="check">
                <input type="checkbox" checked={config.led} disabled={readOnly} onChange={(e) => edit({ led: e.target.checked })} />
                <span>
                  Oświetlenie LED pod szafkami górnymi <small>{unit(pricing.led, 'mb')}</small>
                </span>
              </label>
              <label className="check">
                <input type="checkbox" checked={config.montaz} disabled={readOnly} onChange={(e) => edit({ montaz: e.target.checked })} />
                <span>
                  Montaż u klienta <small>{pln(pricing.assemblyPerModule)}/szafka + blat</small>
                </span>
              </label>
              <label className="field">
                <span className="field-label">Odległość od stolarni (dojazd)</span>
                <NumberStepper value={config.transportKm} min={0} max={500} step={5} unit="km" disabled={readOnly} onChange={(v) => edit({ transportKm: v })} />
              </label>
            </section>
            <section className="info-card">
              <h4>Co dalej po wysłaniu?</h4>
              <ol>
                <li>Stolarnia weryfikuje projekt i umawia bezpłatny pomiar.</li>
                <li>Otrzymujesz ofertę z ceną ostateczną w zakładce „Moje projekty”.</li>
                <li>Po akceptacji – produkcja ok. {result.stats.leadWeeks} tyg. i montaż.</li>
              </ol>
            </section>
          </div>
        )}
      </aside>

      <Viewport
        warnings={result.warnings}
        hint={
          readOnly
            ? 'Przeciągnij tło: obrót · kółko: zoom'
            : 'Przeciągnij szafkę, aby ją przesunąć · strzałki: o 1 cm (Shift: 10 cm) · przeciągnij tło: obrót'
        }
        toolbar={
          !pm.photo && (
            <>
              {!readOnly && (
                <span className="btn-group" role="group" aria-label="Historia zmian">
                  <button className="btn btn-sm btn-icon" onClick={undo} disabled={!hist.current.past.length} title="Cofnij (Ctrl/Cmd+Z)" aria-label="Cofnij">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M5.5 4 2.5 7l3 3M3 7h6.5a4 4 0 0 1 0 8H7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button className="btn btn-sm btn-icon" onClick={redo} disabled={!hist.current.future.length} title="Ponów (Ctrl/Cmd+Shift+Z)" aria-label="Ponów">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M10.5 4l3 3-3 3M13 7H6.5a4 4 0 0 0 0 8H9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </span>
              )}
              <button className={`btn btn-sm ${open ? 'btn-primary' : ''}`} onClick={() => setOpen((o) => !o)}>
                {open ? 'Zamknij fronty' : 'Otwórz fronty'}
              </button>
              <button className="btn btn-sm" onClick={() => setCamKey((k) => k + 1)}>
                Widok domyślny
              </button>
              <button
                className="btn btn-sm btn-dark"
                onClick={() => {
                  setSelectedId(null);
                  pm.start();
                }}
              >
                Render fotorealistyczny
              </button>
            </>
          )
        }
      >
        <SceneShell
          camera={cam.camera}
          target={cam.target}
          resetKey={`${config.layout}-${camKey}`}
          onMissed={() => {
            if (performance.now() - dragInfo.current > 250) setSelectedId(null);
          }}
          photo={pm.photo}
          onPhotoProgress={pm.setSamples}
          glRef={pm.glRef}
        >
          <KitchenScene
            config={config}
            layout={layout}
            selectedId={selectedId}
            onSelect={pm.photo ? () => {} : setSelectedId}
            open={open}
            photo={pm.photo}
            readOnly={readOnly}
            onCommit={(next) => edit(() => next)}
            dragInfo={dragInfo}
          />
        </SceneShell>
        <PhotoOverlay pm={pm} />

        {selected && !pm.photo && (
          <div className="selected-card">
            <div className="selected-head">
              <ModuleIcon type={selected.type} width={selected.width} size={40} />
              <div>
                <span className="eyebrow">
                  {selected.label} · ściana {selected.wall}
                </span>
                <b>{MODULES[selected.type].name}</b>
              </div>
              <button className="icon-btn" onClick={() => setSelectedId(null)} aria-label="Zamknij">
                ×
              </button>
            </div>
            <span className="catalog-label">Szerokość</span>
            <div className="chips">
              {MODULES[selected.type].widths.map((w) => (
                <button key={w} className={`chip ${w === selected.width ? 'active' : ''}`} disabled={readOnly} onClick={() => patchModule(selected.id, { width: w })}>
                  {w}
                </button>
              ))}
            </div>
            {selected.row === 'wall' && (
              <>
                <div className="pos-grid">
                  <label className="field">
                    <span className="field-label">{selected.wall === 'B' ? 'Od narożnika' : 'Od lewej krawędzi'}</span>
                    <NumberStepper
                      value={Math.round(selected.x)}
                      min={rowStart(selected.wall, 'wall')}
                      max={Math.max(rowStart(selected.wall, 'wall'), config.walls[selected.wall] - selected.width)}
                      step={5}
                      disabled={readOnly}
                      onChange={(v) => placeWall(selected, v, selected.spec.y0, `x-${selected.id}`)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Dół szafki od podłogi</span>
                    <NumberStepper
                      value={selected.spec.y0}
                      min={WALL_MOUNT.min}
                      max={Math.min(WALL_MOUNT.max, DIM.roomHeight - selected.spec.height - 3)}
                      step={5}
                      disabled={readOnly}
                      onChange={(v) => placeWall(selected, selected.x, v, `y-${selected.id}`)}
                    />
                  </label>
                </div>
                {!readOnly && (
                  <div className="selected-actions">
                    <button className="btn btn-sm" onClick={() => alignWall(selected, selected.wall === 'B' ? 'right' : 'left')} title="Dosuń do sąsiadki lub krawędzi ściany">
                      ⇤ Dosuń
                    </button>
                    <button className="btn btn-sm" onClick={() => alignWall(selected, selected.wall === 'B' ? 'left' : 'right')} title="Dosuń do sąsiadki lub krawędzi ściany">
                      Dosuń ⇥
                    </button>
                    {baseUnder(selected) && (
                      <button className="btn btn-sm" onClick={() => centerOverBase(selected)}>
                        Nad szafkę dolną
                      </button>
                    )}
                    {selected.spec.y0 !== WALL_MOUNT.std && (
                      <button className="btn btn-sm" onClick={() => placeWall(selected, selected.x, WALL_MOUNT.std)}>
                        Standardowa wysokość
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {!readOnly && (
              <div className="selected-actions">
                <button className="btn btn-sm" onClick={() => shift(selected, selected.wall === 'B' ? 1 : -1)}>
                  ◀ {selected.row === 'wall' ? '5 cm' : 'W lewo'}
                </button>
                <button className="btn btn-sm" onClick={() => shift(selected, selected.wall === 'B' ? -1 : 1)}>
                  {selected.row === 'wall' ? '5 cm' : 'W prawo'} ▶
                </button>
                {config.layout === 'L' && (
                  <button className="btn btn-sm" onClick={() => toOtherWall(selected)}>
                    Na ścianę {selected.wall === 'A' ? 'B' : 'A'}
                  </button>
                )}
                <button className="btn btn-sm" onClick={() => duplicateModule(selected.id)}>
                  Duplikuj
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => removeModule(selected.id)}>
                  Usuń
                </button>
              </div>
            )}
          </div>
        )}
      </Viewport>

      <aside className="panel panel-right">
        <PriceSummary result={result} isAdmin={user?.role === 'admin'} project={proj.project} onCutList={() => setModal('cut')} />
      </aside>

      {modal === 'cut' && <CutListModal result={result} name={proj.name} onClose={() => setModal(null)} />}
      {modal === 'submit' && <SubmitModal proj={proj} result={result} onClose={() => setModal(null)} />}
    </div>
  );
}

function Usage({ used, total }) {
  const pct = Math.min(100, (used / total) * 100);
  const over = used > total;
  return (
    <span className={`usage-bar ${over ? 'over' : ''}`}>
      <span className="usage-track">
        <span className="usage-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="usage-num">
        {used}/{total} cm
      </span>
    </span>
  );
}
