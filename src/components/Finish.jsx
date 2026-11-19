import { useMemo } from 'react';
import { CARCASS, COUNTERTOPS, DECORS, DECOR_GROUPS, FRONTS, FRONT_STYLES, STYLE_PRESETS, fitCountertop, fitFront } from '../../shared/catalog.js';
import { pln } from '../../shared/pricing.js';
import { decorSwatchURL } from '../three/textures.js';
import { OptionCards } from './Configurator.jsx';

// Tło próbki: miniatura tekstury albo kolor jednolity.
export function decorBg(id) {
  const url = decorSwatchURL(id);
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover' } : { background: DECORS[id].hex };
}

export function DecorPicker({ value, decors, onChange, disabled }) {
  const groups = useMemo(() => {
    const g = {};
    decors.forEach((id) => (g[DECORS[id].group] ||= []).push(id));
    return Object.keys(DECOR_GROUPS)
      .filter((k) => g[k])
      .map((k) => [k, g[k]]);
  }, [decors]);
  return (
    <div className="decor-picker">
      {groups.map(([group, ids]) => (
        <div key={group}>
          {groups.length > 1 && <span className="decor-group">{DECOR_GROUPS[group]}</span>}
          <div className="decor-grid" role="radiogroup">
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={value === id}
                className={`decor ${value === id ? 'active' : ''}`}
                disabled={disabled}
                onClick={() => onChange(id)}
                title={`${DECORS[id].name} (${DECORS[id].code})`}
              >
                <span className="decor-img" style={decorBg(id)} />
                <span className="decor-name">{DECORS[id].name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectedDecor({ id }) {
  const d = DECORS[id];
  return (
    <span className="catalog-label">
      Dekor: <b className="decor-chosen">{d.name}</b> <span className="decor-code">{d.code}</span>
    </span>
  );
}

export function StylePicker({ value, allowed, onChange, pricing, disabled, note }) {
  return (
    <>
      <div className="style-picker" role="radiogroup">
        {Object.entries(FRONT_STYLES).map(([k, s]) => {
          const ok = allowed.includes(k);
          const extra = pricing.frontStyle[k];
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={value === k}
              className={`style-opt ${value === k ? 'active' : ''}`}
              disabled={disabled || !ok}
              title={ok ? s.name : 'Niedostępne dla wybranego materiału'}
              onClick={() => onChange(k)}
            >
              <span className={`style-icon style-${k}`} />
              <span>{s.name.replace(/ \(.*\)/, '')}</span>
              <small>{!ok ? 'niedostępny' : extra ? `+${pln(extra)}/m²` : 'w cenie'}</small>
            </button>
          );
        })}
      </div>
      {note && <p className="fineprint">{note}</p>}
    </>
  );
}

export function FrontsSection({ config, update, pricing, readOnly, stylesAllowed, styleNote }) {
  const F = FRONTS[config.front];
  return (
    <section>
      <h4>Fronty</h4>
      <OptionCards
        value={config.front}
        disabled={readOnly}
        onChange={(v) => update((c) => fitFront(c, v))}
        options={Object.entries(FRONTS).map(([k, f]) => ({
          value: k,
          label: f.name,
          hint: `${pln(pricing.fronts[k])}/m² · ${f.decors.length} dekorów`,
          bg: decorBg(config.front === k ? config.frontDecor : f.decors[0]),
        }))}
      />
      <span className="catalog-label">Styl frontu</span>
      <StylePicker
        value={config.frontStyle}
        allowed={stylesAllowed || F.styles}
        pricing={pricing}
        disabled={readOnly}
        note={styleNote}
        onChange={(v) => update({ frontStyle: v })}
      />
      <SelectedDecor id={config.frontDecor} />
      <DecorPicker value={config.frontDecor} decors={F.decors} disabled={readOnly} onChange={(v) => update({ frontDecor: v })} />
    </section>
  );
}

export function CountertopSection({ config, update, pricing, readOnly }) {
  return (
    <section>
      <h4>Blat</h4>
      <OptionCards
        value={config.countertop}
        disabled={readOnly}
        onChange={(v) => update((c) => fitCountertop(c, v))}
        options={Object.entries(COUNTERTOPS).map(([k, c]) => ({
          value: k,
          label: c.name,
          hint: `${pln(pricing.countertops[k])}/mb`,
          bg: decorBg(config.countertop === k ? config.countertopDecor : c.decors[0]),
        }))}
      />
      <SelectedDecor id={config.countertopDecor} />
      <DecorPicker value={config.countertopDecor} decors={COUNTERTOPS[config.countertop].decors} disabled={readOnly} onChange={(v) => update({ countertopDecor: v })} />
    </section>
  );
}

export function CarcassSection({ config, update, pricing, readOnly, title = 'Korpusy (wnętrze szafek)' }) {
  return (
    <section>
      <h4>{title}</h4>
      <OptionCards
        value={config.carcass}
        disabled={readOnly}
        onChange={(v) => update({ carcass: v })}
        options={Object.entries(CARCASS).map(([k, c]) => ({ value: k, label: c.name, hint: `${pln(pricing.carcass[k])}/m²`, bg: decorBg(c.decor) }))}
      />
    </section>
  );
}

// Gotowe zestawy wykończenia: miniaturka szafki w danym stylu + jedno kliknięcie.
export function PresetPicker({ config, update, readOnly, withCountertop = true }) {
  const keys = (set) => Object.keys(set).filter((k) => withCountertop || !k.startsWith('countertop'));
  const isActive = (p) => keys(p.set).every((k) => config[k] === p.set[k]);
  const apply = (p) => update((c) => ({ ...c, ...Object.fromEntries(keys(p.set).map((k) => [k, p.set[k]])) }));
  return (
    <div className="presets">
      {STYLE_PRESETS.map((p) => (
        <button key={p.id} type="button" className={`preset ${isActive(p) ? 'active' : ''}`} disabled={readOnly} onClick={() => apply(p)}>
          <span className="preset-art">
            {withCountertop && <span className="pa-top" style={decorBg(p.set.countertopDecor)} />}
            <span className="pa-fronts">
              {[0, 1].map((i) => (
                <span key={i} className={`pa-door pa-${p.set.frontStyle}`} style={decorBg(p.set.frontDecor)}>
                  <i className={`pa-handle ph-${p.set.handle}`} />
                </span>
              ))}
            </span>
          </span>
          <span className="preset-name">{p.name}</span>
          {withCountertop && <small>{p.desc}</small>}
        </button>
      ))}
    </div>
  );
}
