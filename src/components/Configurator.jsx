import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DECORS, FRONTS, STYLE_PRESETS, fitFront } from '../../shared/catalog.js';
import { api, clearDraft, readDraft, writeDraft } from '../api.js';
import { useAuth } from '../auth.jsx';
import { num, panelsToCSV, pln, pln2 } from '../../shared/pricing.js';
import { Modal, StatusBadge, toast } from './ui.jsx';

// Nowy projekt z linku strony głównej: ?zestaw=<id z STYLE_PRESETS>, ?dekor=<id dekoru frontu>, (szafa) ?drzwi=uchylne|przesuwne|brak.
function applyUrlStart(config, params, type) {
  let c = config;
  const preset = STYLE_PRESETS.find((p) => p.id === params.get('zestaw'));
  if (preset) {
    const set = { ...preset.set };
    if (type === 'szafa') {
      delete set.countertop;
      delete set.countertopDecor;
    }
    c = { ...c, ...set };
  }
  const doors = params.get('drzwi');
  if (type === 'szafa' && ['przesuwne', 'uchylne', 'brak'].includes(doors)) c = { ...c, doors };
  const decor = params.get('dekor');
  if (decor && Object.hasOwn(DECORS, decor)) {
    if (FRONTS[c.front].decors.includes(decor)) c = { ...c, frontDecor: decor };
    else {
      const front = Object.keys(FRONTS).find((k) => FRONTS[k].decors.includes(decor));
      if (front) c = fitFront({ ...c, frontDecor: decor }, front);
    }
  }
  return { config: c, presetName: preset?.name };
}

// Ładowanie / zapis / wysyłka projektu – wspólne dla kuchni i szafy.
export function useProject(type, { sanitize, makeDefault, defaultName }) {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [start] = useState(() => (!id && !readDraft(type) ? applyUrlStart(makeDefault(), params, type) : null));
  const [config, setConfig] = useState(() => {
    const d = !id && readDraft(type);
    if (d) return sanitize(d.config);
    return start ? sanitize(start.config) : makeDefault();
  });
  const [name, setName] = useState(
    () => (!id && readDraft(type)?.name) || (start?.presetName ? `${defaultName} – ${start.presetName}` : defaultName),
  );
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(null);

  useEffect(() => {
    if (!id) {
      if (loadedRef.current) {
        loadedRef.current = null;
        setProject(null);
        setConfig(makeDefault());
        setName(defaultName);
        setDirty(false);
      }
      return;
    }
    if (loadedRef.current === id) return;
    setLoading(true);
    api(`/api/projects/${id}`)
      .then(({ project: p }) => {
        loadedRef.current = id;
        setProject(p);
        setConfig(sanitize(p.config));
        setName(p.name);
        setDirty(false);
      })
      .catch((e) => {
        toast(e.message, 'bad');
        nav(e.status === 401 ? `/logowanie?next=${encodeURIComponent(loc.pathname)}` : `/konfigurator/${type}`, { replace: true });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isForeign = Boolean(project && user && project.userId !== user.id);
  const readOnly = Boolean(project && (isForeign || project.status !== 'szkic'));

  const update = (patch) => {
    if (readOnly) return;
    setConfig((c) => (typeof patch === 'function' ? patch(c) : { ...c, ...patch }));
    setDirty(true);
  };

  const rename = (n) => {
    if (readOnly) return;
    setName(n);
    setDirty(true);
  };

  const requireLogin = () => {
    writeDraft(type, { config, name });
    toast('Zaloguj się lub załóż konto – Twoja konfiguracja zostanie zachowana.', 'info');
    nav(`/logowanie?next=${encodeURIComponent(loc.pathname)}`);
  };

  const persist = async (asNew = false, newName = name) => {
    const r =
      project && !asNew && project.userId === user.id
        ? await api(`/api/projects/${project.id}`, { method: 'PUT', body: { name: newName, config } })
        : await api('/api/projects', { method: 'POST', body: { type, name: newName, config } });
    loadedRef.current = r.project.id;
    setProject(r.project);
    setName(r.project.name);
    setDirty(false);
    clearDraft(type);
    if (r.project.id !== id) nav(`/konfigurator/${type}/${r.project.id}`, { replace: !asNew });
    return r.project;
  };

  const save = async () => {
    if (!user) return requireLogin();
    setBusy(true);
    try {
      const p = await persist();
      toast('Projekt zapisany.');
      return p;
    } catch (e) {
      toast(e.message, 'bad');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const submit = async ({ message, phone }) => {
    setBusy(true);
    try {
      const p = dirty || !project ? await persist() : project;
      const r = await api(`/api/projects/${p.id}/submit`, { method: 'POST', body: { message, phone } });
      setProject(r.project);
      toast('Zapytanie wysłane do stolarni. Odezwiemy się z ofertą!');
      return true;
    } catch (e) {
      toast(e.message, 'bad');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    if (!user) return requireLogin();
    setBusy(true);
    try {
      await persist(true, `${name} (kopia)`);
      toast('Utworzono kopię – możesz ją edytować.');
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return { config, update, name, rename, project, loading, busy, dirty, readOnly, isForeign, save, submit, duplicate, requireLogin, user };
}

export function ProjectBar({ title, proj, onSubmitClick }) {
  const { project, name, rename, readOnly, isForeign, dirty, busy, save, duplicate } = proj;
  return (
    <div className="cfg-head">
      <div className="cfg-title">
        <span className="eyebrow">{title}</span>
        <input className="name-input" value={name} onChange={(e) => rename(e.target.value)} disabled={readOnly} aria-label="Nazwa projektu" maxLength={100} />
        {project && <StatusBadge status={project.status} />}
        {dirty && !readOnly && <span className="dirty-dot" title="Niezapisane zmiany" />}
      </div>
      <div className="cfg-actions">
        {isForeign && (
          <span className="muted small">
            Projekt klienta: <b>{project.owner?.name}</b>
          </span>
        )}
        {readOnly && !isForeign && (
          <button className="btn" onClick={duplicate} disabled={busy}>
            Utwórz kopię do edycji
          </button>
        )}
        {isForeign && (
          <Link className="btn" to="/admin">
            Wróć do zapytań
          </Link>
        )}
        {!readOnly && (
          <>
            <button className="btn" onClick={save} disabled={busy}>
              {busy ? 'Zapisywanie…' : 'Zapisz projekt'}
            </button>
            <button className="btn btn-primary" onClick={onSubmitClick} disabled={busy}>
              Wyślij zapytanie do stolarni
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PriceSummary({ result, isAdmin, project, onCutList }) {
  const { totals, groups, stats } = result;
  return (
    <div className="price">
      {project?.offerPrice || project?.adminNote ? (
        <div className="offer-box">
          <span className="eyebrow">Odpowiedź stolarni</span>
          {project.offerPrice && (
            <div className="offer-price">
              {pln(project.offerPrice)} <small>brutto – cena ofertowa</small>
            </div>
          )}
          {project.adminNote && <p>{project.adminNote}</p>}
        </div>
      ) : null}
      <div className="price-total">
        <span className="eyebrow">Cena orientacyjna</span>
        <strong>{pln(totals.gross)}</strong>
        <small>
          netto {pln(totals.net)} + VAT {totals.vatPct}% ({pln(totals.vat)})
        </small>
      </div>
      <div className="price-groups">
        {groups.map((g) => (
          <details key={g.name}>
            <summary>
              <span>{g.name}</span>
              <b>{pln(g.price)}</b>
            </summary>
            <table className="lines">
              <tbody>
                {g.lines.map((l) => (
                  <tr key={l.label}>
                    <td>{l.label}</td>
                    <td className="num nowrap">
                      {num(l.qty)} {l.unit} × {pln2(l.unitPrice)}
                    </td>
                    <td className="num nowrap">{pln(l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
      <dl className="stats">
        <div>
          <dt>Płyta meblowa</dt>
          <dd>{num(stats.boardM2, 1)} m²</dd>
        </div>
        <div>
          <dt>Fronty</dt>
          <dd>{num(stats.frontM2, 1)} m²</dd>
        </div>
        <div>
          <dt>Formatki</dt>
          <dd>{stats.panelsCount} szt.</dd>
        </div>
        <div>
          <dt>Realizacja</dt>
          <dd>ok. {stats.leadWeeks} tyg.</dd>
        </div>
      </dl>
      {isAdmin && (
        <div className="admin-box">
          <span className="eyebrow">Widok stolarni</span>
          <div>
            Koszt własny: <b>{pln(totals.cost)}</b>
          </div>
          <div>
            Zysk: <b>{pln(totals.profit)}</b> (marża {totals.marginPct}%)
          </div>
          <div>Robocizna: {num(stats.laborH, 1)} h</div>
        </div>
      )}
      <button className="btn btn-block" onClick={onCutList}>
        Lista formatek do rozkroju
      </button>
      <p className="fineprint">Cena orientacyjna na podstawie konfiguracji. Ostateczna oferta po bezpłatnym pomiarze.</p>
    </div>
  );
}

export function CutListModal({ result, name, onClose }) {
  const download = () => {
    const blob = new Blob([panelsToCSV(result.panels)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `formatki-${name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const byModule = Object.groupBy ? Object.groupBy(result.panels, (p) => p.module) : groupBy(result.panels, (p) => p.module);
  return (
    <Modal title="Lista formatek do rozkroju" onClose={onClose} wide>
      <p className="muted">
        Wygenerowana automatycznie z projektu – gotowa do wysłania do hurtowni płyt lub na pilarkę/CNC. Wymiary w mm, okleina: liczba
        oklejanych krawędzi wzdłuż długości / szerokości.
      </p>
      <div className="cutlist-scroll">
        <table className="cutlist">
          <thead>
            <tr>
              <th>Element</th>
              <th>Materiał</th>
              <th className="num">Dł.</th>
              <th className="num">Szer.</th>
              <th className="num">Szt.</th>
              <th className="num">Okleina</th>
            </tr>
          </thead>
          {Object.entries(byModule).map(([mod, panels]) => (
            <tbody key={mod}>
              <tr className="cut-group">
                <td colSpan={6}>{mod}</td>
              </tr>
              {panels.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td className="muted">{p.material}</td>
                  <td className="num">{p.l}</td>
                  <td className="num">{p.w}</td>
                  <td className="num">{p.qty}</td>
                  <td className="num">
                    {p.edgeL}/{p.edgeW}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="modal-actions">
        <span className="muted small">
          Razem: {result.stats.panelsCount} formatek · {num(result.stats.boardM2, 2)} m² płyty
        </span>
        <button className="btn btn-primary" onClick={download}>
          Pobierz CSV (Excel)
        </button>
      </div>
    </Modal>
  );
}

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    (acc[fn(x)] ||= []).push(x);
    return acc;
  }, {});
}

export function SubmitModal({ proj, result, onClose }) {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(proj.user?.phone || '');
  if (!proj.user) {
    return (
      <Modal title="Wyślij zapytanie" onClose={onClose}>
        <p>Aby wysłać zapytanie ofertowe, zaloguj się lub załóż konto. Twoja konfiguracja zostanie zachowana.</p>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={proj.requireLogin}>
            Zaloguj się
          </button>
        </div>
      </Modal>
    );
  }
  const send = async (e) => {
    e.preventDefault();
    if (await proj.submit({ message, phone })) onClose();
  };
  return (
    <Modal title="Wyślij zapytanie do stolarni" onClose={onClose}>
      <form onSubmit={send} className="form">
        <div className="submit-summary">
          <span>{proj.name}</span>
          <b>{pln(result.totals.gross)} brutto</b>
        </div>
        <label className="field">
          <span className="field-label">Telefon kontaktowy</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="np. 600 100 200" />
        </label>
        <label className="field">
          <span className="field-label">Wiadomość (opcjonalnie)</span>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Np. preferowany termin pomiaru, adres, pytania…" />
        </label>
        <p className="fineprint">Po wysłaniu projekt zostanie zablokowany do edycji – zawsze możesz utworzyć jego kopię.</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" disabled={proj.busy}>
            {proj.busy ? 'Wysyłanie…' : 'Wyślij zapytanie'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Karty wyboru materiału z próbką koloru i ceną jednostkową.
export function OptionCards({ value, options, onChange, disabled, columns = 1 }) {
  return (
    <div className={`option-cards cols-${columns}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`option-card ${value === o.value ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.bg && <span className="swatch" style={o.bg} />}
          <span className="option-text">
            <span>{o.label}</span>
            {o.hint && <small>{o.hint}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ColorSwatches({ value, colors, onChange, disabled }) {
  return (
    <div className="color-swatches" role="radiogroup">
      {Object.entries(colors).map(([k, c]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={c.name}
          title={c.name}
          disabled={disabled}
          className={`color-swatch ${value === k ? 'active' : ''}`}
          style={{ '--sw': c.hex }}
          onClick={() => onChange(k)}
        >
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  );
}

export function Viewport({ children, toolbar, warnings, hint }) {
  return (
    <main className="viewport">
      {children}
      <div className="vp-toolbar">{toolbar}</div>
      {warnings?.length > 0 && (
        <div className="vp-warnings">
          {warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      )}
      <div className="vp-hint">{hint || 'Przeciągnij: obrót · Prawy przycisk: przesuwanie · Kółko: zoom'}</div>
    </main>
  );
}

// --- tryb fotorealistyczny (path tracing) --------------------------------------
export const PHOTO_TARGET = 300;

export function usePhotoMode(name) {
  const [photo, setPhoto] = useState(false);
  const [samples, setSamples] = useState(0);
  const glRef = useRef(null);
  const start = () => {
    setSamples(0);
    setPhoto(true);
  };
  const stop = () => setPhoto(false);
  const download = () => {
    const gl = glRef.current;
    if (!gl) return;
    const a = document.createElement('a');
    a.href = gl.domElement.toDataURL('image/png');
    a.download = `wizualizacja-${name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.png`;
    a.click();
  };
  return { photo, samples, setSamples, start, stop, download, glRef };
}

export function PhotoOverlay({ pm }) {
  if (!pm.photo) return null;
  const done = pm.samples >= PHOTO_TARGET;
  const pct = Math.min(100, (pm.samples / PHOTO_TARGET) * 100);
  return (
    <div className="photo-overlay">
      <div className="photo-status">
        <b>{pm.samples < 1 ? 'Przygotowanie sceny…' : done ? 'Render gotowy' : 'Renderowanie fotorealistyczne…'}</b>
        <span className="muted small">
          {pm.samples} / {PHOTO_TARGET} próbek{!done && pm.samples > 0 ? ' – obraz będzie się wyostrzał' : ''}
        </span>
        <span className="photo-bar">
          <span style={{ width: `${pct}%` }} />
        </span>
      </div>
      <div className="row-gap">
        <button className="btn btn-sm btn-primary" onClick={pm.download} disabled={pm.samples < 16}>
          Pobierz zdjęcie (PNG)
        </button>
        <button className="btn btn-sm" onClick={pm.stop}>
          Wróć do edycji
        </button>
      </div>
    </div>
  );
}
