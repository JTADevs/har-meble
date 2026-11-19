import { useMemo, useState } from 'react';
import { HANDLES, HARDWARE, T, WARDROBE_DOORS, WARDROBE_INTERIORS } from '../../shared/catalog.js';
import { WARDROBE_LIMITS, defaultWardrobe, sanitizeWardrobe, wardrobeSpec } from '../../shared/wardrobe.js';
import { priceWardrobe, pln } from '../../shared/pricing.js';
import { useAuth } from '../auth.jsx';
import { usePricing } from '../usePricing.js';
import { NumberStepper, Segmented } from '../components/ui.jsx';
import { CutListModal, OptionCards, PhotoOverlay, PriceSummary, ProjectBar, SubmitModal, Viewport, usePhotoMode, useProject } from '../components/Configurator.jsx';
import { CarcassSection, FrontsSection, PresetPicker } from '../components/Finish.jsx';
import { SceneShell } from '../three/parts.jsx';
import { WardrobeScene, wardrobeCamera } from '../three/WardrobeScene.jsx';

export default function WardrobePage() {
  const proj = useProject('szafa', { sanitize: sanitizeWardrobe, makeDefault: defaultWardrobe, defaultName: 'Moja szafa' });
  const { config, update, readOnly } = proj;
  const { user } = useAuth();
  const pricing = usePricing();
  const [open, setOpen] = useState(false);
  const [camKey, setCamKey] = useState(0);
  const [modal, setModal] = useState(null);
  const pm = usePhotoMode(proj.name);

  const spec = useMemo(() => wardrobeSpec(config), [config]);
  const result = useMemo(() => priceWardrobe(config, pricing), [config, pricing]);
  const cam = wardrobeCamera(config);
  const sectionWidth = Math.round(spec.sections[0]?.w + T);
  const unit = (v, u) => `${pln(v)}/${u}`;

  const setSections = (n) =>
    update((c) => {
      const s = [...c.sections];
      while (s.length < n) s.push({ interior: 'polki' });
      return { ...c, sections: s.slice(0, n) };
    });
  const setInterior = (i, interior) => update((c) => ({ ...c, sections: c.sections.map((s, j) => (j === i ? { interior } : s)) }));

  if (proj.loading) return <div className="page-loading">Wczytywanie projektu…</div>;

  return (
    <div className="cfg">
      <ProjectBar title="Szafa na wymiar" proj={proj} onSubmitClick={() => setModal('submit')} />

      <aside className="panel panel-left">
        {readOnly && <div className="note">Projekt jest tylko do podglądu – został wysłany do stolarni.</div>}
        <div className="panel-body">
          <section>
            <h4>Wymiary wnęki / szafy</h4>
            <label className="field">
              <span className="field-label">Szerokość</span>
              <NumberStepper value={config.width} min={WARDROBE_LIMITS.width[0]} max={WARDROBE_LIMITS.width[1]} step={5} disabled={readOnly} onChange={(v) => update({ width: v })} />
            </label>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Wysokość</span>
                <NumberStepper value={config.height} min={WARDROBE_LIMITS.height[0]} max={WARDROBE_LIMITS.height[1]} step={5} disabled={readOnly} onChange={(v) => update({ height: v })} />
              </label>
              <label className="field">
                <span className="field-label">Głębokość</span>
                <NumberStepper value={config.depth} min={WARDROBE_LIMITS.depth[0]} max={WARDROBE_LIMITS.depth[1]} step={5} disabled={readOnly} onChange={(v) => update({ depth: v })} />
              </label>
            </div>
          </section>

          <section>
            <div className="section-head">
              <h4>Sekcje i wnętrze</h4>
              <span className="muted small">ok. {sectionWidth} cm / sekcja</span>
            </div>
            <label className="field">
              <span className="field-label">Liczba sekcji</span>
              <NumberStepper value={config.sections.length} min={1} max={WARDROBE_LIMITS.sections[1]} unit="szt." disabled={readOnly} onChange={setSections} />
            </label>
            {sectionWidth > 110 && <div className="warn">Sekcje szersze niż 110 cm – półki mogą się uginać. Dodaj sekcję.</div>}
            <div className="sections">
              {config.sections.map((s, i) => (
                <label key={i} className="section-row">
                  <span className="section-no">{i + 1}</span>
                  <select value={s.interior} disabled={readOnly} onChange={(e) => setInterior(i, e.target.value)}>
                    {Object.entries(WARDROBE_INTERIORS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h4>Drzwi</h4>
            <Segmented
              value={config.doors}
              disabled={readOnly}
              onChange={(v) => update({ doors: v })}
              options={Object.entries(WARDROBE_DOORS).map(([k, v]) => ({ value: k, label: v.name.replace('Drzwi ', '').replace(' (garderoba)', '') }))}
            />
            {config.doors === 'przesuwne' && (
              <label className="check">
                <input type="checkbox" checked={config.mirror} disabled={readOnly} onChange={(e) => update({ mirror: e.target.checked })} />
                <span>
                  Lustro na co drugim skrzydle <small>{unit(pricing.mirror, 'm²')}</small>
                </span>
              </label>
            )}
            {config.doors === 'uchylne' && (
              <OptionCards
                value={config.handle}
                disabled={readOnly}
                onChange={(v) => update({ handle: v })}
                options={Object.entries(HANDLES).map(([k, h]) => ({ value: k, label: h.name, hint: `${pln(pricing.handles[k])}/szt.` }))}
              />
            )}
          </section>

          {config.doors !== 'brak' && (
            <>
              <section>
                <h4>Gotowe zestawy</h4>
                <PresetPicker config={config} update={update} readOnly={readOnly} withCountertop={false} />
              </section>
              <FrontsSection
                config={config}
                update={update}
                pricing={pricing}
                readOnly={readOnly}
                stylesAllowed={config.doors === 'uchylne' ? undefined : ['gladki']}
                styleNote={config.doors === 'uchylne' ? null : 'Fronty ramowe i ryflowane – tylko przy drzwiach uchylnych.'}
              />
            </>
          )}

          <CarcassSection config={config} update={update} pricing={pricing} readOnly={readOnly} title="Korpus" />

          <section>
            <h4>Okucia i dodatki</h4>
            <Segmented
              value={config.hardware}
              disabled={readOnly}
              onChange={(v) => update({ hardware: v })}
              options={Object.entries(HARDWARE).map(([k, h]) => ({ value: k, label: k === 'standard' ? h.name : 'Premium' }))}
            />
            <label className="check">
              <input type="checkbox" checked={config.led} disabled={readOnly} onChange={(e) => update({ led: e.target.checked })} />
              <span>
                Oświetlenie LED wnętrza <small>{unit(pricing.led, 'mb')}</small>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={config.montaz} disabled={readOnly} onChange={(e) => update({ montaz: e.target.checked })} />
              <span>
                Montaż u klienta <small>{unit(pricing.assemblyWardrobe, 'mb')}</small>
              </span>
            </label>
            <label className="field">
              <span className="field-label">Odległość od stolarni</span>
              <NumberStepper value={config.transportKm} min={0} max={500} step={5} unit="km" disabled={readOnly} onChange={(v) => update({ transportKm: v })} />
            </label>
          </section>
        </div>
      </aside>

      <Viewport
        warnings={result.warnings}
        toolbar={
          !pm.photo && (
          <>
            {config.doors !== 'brak' && (
              <button className={`btn btn-sm ${open ? 'btn-primary' : ''}`} onClick={() => setOpen((o) => !o)}>
                {open ? 'Pokaż drzwi' : 'Pokaż wnętrze'}
              </button>
            )}
            <button className="btn btn-sm" onClick={() => setCamKey((k) => k + 1)}>
              Widok domyślny
            </button>
            <button className="btn btn-sm btn-dark" onClick={pm.start}>
              Render fotorealistyczny
            </button>
          </>
          )
        }
      >
        <SceneShell camera={cam.camera} target={cam.target} resetKey={camKey} photo={pm.photo} onPhotoProgress={pm.setSamples} glRef={pm.glRef}>
          <WardrobeScene config={config} spec={spec} open={open || config.doors === 'brak'} />
        </SceneShell>
        <PhotoOverlay pm={pm} />
      </Viewport>

      <aside className="panel panel-right">
        <PriceSummary result={result} isAdmin={user?.role === 'admin'} project={proj.project} onCutList={() => setModal('cut')} />
      </aside>

      {modal === 'cut' && <CutListModal result={result} name={proj.name} onClose={() => setModal(null)} />}
      {modal === 'submit' && <SubmitModal proj={proj} result={result} onClose={() => setModal(null)} />}
    </div>
  );
}
