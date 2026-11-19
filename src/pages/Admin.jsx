import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../api.js';
import { DEFAULT_PRICING, PRICING_SCHEMA, STATUSES, getPath, setPath } from '../../shared/catalog.js';
import { defaultKitchen } from '../../shared/kitchen.js';
import { defaultWardrobe } from '../../shared/wardrobe.js';
import { priceKitchen, priceWardrobe, pln } from '../../shared/pricing.js';
import { COMPANY, FEATURES } from '../../shared/site.js';
import { INQUIRY_STATUSES, INQUIRY_TYPES, LABELS, formatBytes, inquiryRows, inquiryScope, inquirySubject } from '../../shared/inquiry.js';
import { StatusBadge, toast } from '../components/ui.jsx';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');

// Adres z formularza w linku mailto: zakodowany (z „@” bez zmian) – walidacja przepuszcza znaki ?, &, # i %,
// a niezakodowane dopisałyby do wiadomości temat, treść albo dodatkowych odbiorców (np. „…?bcc=…”).
const mailtoHref = (email, subject) =>
  `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

// Wizytówka (etap 1): tylko zapytania z formularza wyceny. Pełna wersja: do tego projekty z konfiguratora i cennik.
const TABS = FEATURES.configurator
  ? [
      ['formularz', 'Formularz wyceny'],
      ['zapytania', 'Projekty z konfiguratora'],
      ['cennik', 'Cennik'],
    ]
  : [['formularz', 'Formularz wyceny']];

export default function Admin() {
  const [tab, setTab] = useState('formularz');
  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Panel {COMPANY.brand}</h1>
          <p className="muted">
            {TABS.length > 1
              ? 'Zapytania z formularza wyceny, projekty wysłane z konfiguratora i cennik konfiguratora.'
              : 'Zapytania wysłane przez formularz wyceny na stronie.'}
          </p>
        </div>
        {TABS.length > 1 && (
          <div className="tabs tabs-inline" role="tablist">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                id={`admin-tab-${id}`}
                role="tab"
                aria-selected={tab === id}
                aria-controls="admin-panel"
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div id="admin-panel" role={TABS.length > 1 ? 'tabpanel' : undefined} aria-labelledby={TABS.length > 1 ? `admin-tab-${tab}` : undefined}>
        {tab === 'formularz' && <FormInquiries />}
        {tab === 'zapytania' && <ProjectInquiries />}
        {tab === 'cennik' && <PricingEditor />}
      </div>
    </div>
  );
}

// --- zapytania z formularza wyceny (/wycena) -------------------------------------------------------
const STATUS_TONE = { nowe: 'info', w_toku: 'accent', zamkniete: 'muted' };

function MailBadge({ mail }) {
  if (mail?.sent) return <span className="badge badge-ok">wysłany</span>;
  if (mail?.error) {
    return (
      <span className="badge badge-bad" title={mail.error}>
        nie wysłany
      </span>
    );
  }
  return <span className="badge badge-muted">w kolejce</span>;
}

const mailState = (mail) =>
  mail?.sent
    ? `Powiadomienie e-mail wysłane ${fmtDate(mail.at)}.`
    : mail?.error
      ? `Powiadomienie e-mail nie zostało wysłane: ${mail.error}.`
      : 'Powiadomienie e-mail czeka na wysłanie.';

// Panel loguje się tokenem w nagłówku (nie ciasteczkiem), więc zwykły link do pliku nie zadziała –
// pobieramy plik przez fetch z nagłówkiem Authorization i zapisujemy go z tymczasowego adresu blob.
async function downloadAttachment(inquiryId, file) {
  const token = getToken();
  const res = await fetch(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}/files/${encodeURIComponent(file.id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Nie udało się pobrać pliku (${res.status}).`);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function FormInquiries() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const toggleRefs = useRef({}); // przyciski z nazwą klienta w wierszach (id zapytania → przycisk)
  const refreshRef = useRef(null);
  const focusAfterDelete = useRef(null); // id zapytania, którego wiersz dostaje fokus po usunięciu, albo 'refresh'

  const load = useCallback(() => {
    setError('');
    return api('/api/admin/inquiries')
      .then((r) => setList(r.inquiries))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Usunięcie zabiera z dokumentu wiersz szczegółów razem z przyciskiem „Usuń zapytanie”, który miał fokus –
  // bez tego fokus spadłby na <body>. Trafia na sąsiedni wiersz, a gdy lista jest pusta – na „Odśwież”.
  useEffect(() => {
    const target = focusAfterDelete.current;
    if (!target) return;
    focusAfterDelete.current = null;
    (toggleRefs.current[target] ?? refreshRef.current)?.focus();
  }, [list]);

  const matches = (i) => (!status || i.status === status) && (!type || i.type === type);

  const patch = async (id, body, okMessage) => {
    try {
      const r = await api(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: 'PATCH', body });
      setList((l) => l.map((x) => (x.id === id ? r.inquiry : x)));
      if (okMessage) toast(okMessage);
      return true;
    } catch (e) {
      toast(e.message, 'bad');
      return false;
    }
  };

  const remove = async (inq) => {
    if (!window.confirm(`Usunąć zapytanie od: ${inq.contact.company || inq.contact.name} razem z załącznikami? Tego nie można cofnąć.`)) return;
    try {
      await api(`/api/admin/inquiries/${encodeURIComponent(inq.id)}`, { method: 'DELETE' });
      const visible = list.filter(matches);
      const i = visible.findIndex((x) => x.id === inq.id);
      focusAfterDelete.current = (visible[i + 1] ?? visible[i - 1])?.id ?? 'refresh';
      setList((l) => l.filter((x) => x.id !== inq.id));
      setOpenId(null);
      toast('Zapytanie usunięte.');
    } catch (e) {
      toast(e.message, 'bad');
    }
  };

  if (!list) {
    return error ? (
      <div className="empty">
        <p>{error}</p>
        <button type="button" className="btn btn-sm" onClick={load}>
          Spróbuj ponownie
        </button>
      </div>
    ) : (
      <p className="muted">Ładowanie…</p>
    );
  }

  const shown = list.filter(matches);
  const count = (s) => list.filter((i) => i.status === s).length;

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <span>Nowe</span>
          <b>{count('nowe')}</b>
        </div>
        <div className="kpi">
          <span>W toku</span>
          <b>{count('w_toku')}</b>
        </div>
        <div className="kpi">
          <span>Wszystkie zapytania</span>
          <b>{list.length}</b>
        </div>
      </div>

      <div className="inq-toolbar">
        <label className="inq-filter">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(INQUIRY_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="inq-filter">
          <span>Rodzaj</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(INQUIRY_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button ref={refreshRef} type="button" className="btn btn-sm" onClick={load}>
          Odśwież
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="empty">{list.length ? 'Żadne zapytanie nie pasuje do filtrów.' : 'Nie ma jeszcze zapytań z formularza wyceny.'}</div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Rodzaj</th>
                <th>Klient</th>
                <th>Miejscowość</th>
                <th>Zakres</th>
                <th className="num">Pliki</th>
                <th>E-mail</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((inq) => {
                const open = openId === inq.id;
                const detailId = `inq-detail-${inq.id}`;
                const toggle = () => setOpenId(open ? null : inq.id);
                const who = inq.contact.company || inq.contact.name;
                return (
                  <Fragment key={inq.id}>
                    <tr className={`clickable ${open ? 'open' : ''}`} onClick={toggle}>
                      <td className="nowrap">{fmtDate(inq.createdAt)}</td>
                      <td>
                        <span className={`badge badge-${inq.type === 'b2b' ? 'info' : 'accent'}`}>{inq.type === 'b2b' ? 'B2B' : 'Meble'}</span>
                      </td>
                      <td>
                        {/* przycisk – szczegóły otwiera też klawiatura (cały wiersz klika się myszą) */}
                        <button
                          ref={(el) => {
                            if (el) toggleRefs.current[inq.id] = el;
                            else delete toggleRefs.current[inq.id];
                          }}
                          type="button"
                          className="inq-toggle"
                          aria-expanded={open}
                          aria-controls={open ? detailId : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle();
                          }}
                        >
                          {who}
                        </button>
                        <div className="muted small">
                          {inq.contact.company ? `${inq.contact.name} · ` : ''}
                          {inq.contact.email}
                        </div>
                      </td>
                      <td className="inq-clip">{inq.contact.city || (inq.type === 'b2b' && inq.details.pickup) || '–'}</td>
                      <td className="inq-clip">{inquiryScope(inq) || '–'}</td>
                      <td className="num">{inq.files.length || '–'}</td>
                      <td>
                        <MailBadge mail={inq.mail} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`inq-status inq-status-${STATUS_TONE[inq.status] || 'muted'}`}
                          aria-label={`Status zapytania: ${who}`}
                          value={inq.status}
                          onChange={(e) => patch(inq.id, { status: e.target.value }, 'Status zapisany.')}
                        >
                          {Object.entries(INQUIRY_STATUSES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {open && (
                      <tr className="detail-row" id={detailId}>
                        <td colSpan={8}>
                          <FormInquiryDetail inq={inq} onPatch={patch} onDelete={remove} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FormInquiryDetail({ inq, onPatch, onDelete }) {
  const [note, setNote] = useState(inq.note || '');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const { contact, details } = inquiryRows(inq);
  const replyHref = mailtoHref(inq.contact.email, `Re: ${inquirySubject(inq)}`);

  const saveNote = async () => {
    setBusy(true);
    await onPatch(inq.id, { note }, 'Notatka zapisana.');
    setBusy(false);
  };

  const download = async (file) => {
    setDownloading(file.id);
    try {
      await downloadAttachment(inq.id, file);
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setDownloading(null);
    }
  };

  const value = (label, v) => {
    if (label === LABELS.email) return <a href={mailtoHref(v)}>{v}</a>;
    if (label === LABELS.phone) return <a href={`tel:${v.replace(/[^\d+]/g, '')}`}>{v}</a>;
    return v;
  };

  return (
    <div className="inquiry">
      <div className="inquiry-info">
        <h2>{inq.type === 'b2b' ? 'Opis zlecenia' : 'Opis projektu'}</h2>
        <p className="quote pre-wrap">{inq.message}</p>
        <h2>Kontakt</h2>
        <dl className="mini-dl inq-dl">
          {contact.map(([label, v]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value(label, v)}</dd>
            </Fragment>
          ))}
        </dl>
        {details.length > 0 && (
          <>
            <h2>Szczegóły</h2>
            <dl className="mini-dl inq-dl">
              {details.map(([label, v]) => (
                <Fragment key={label}>
                  <dt>{label}</dt>
                  <dd className="pre-wrap">{v}</dd>
                </Fragment>
              ))}
            </dl>
          </>
        )}
        <h2>Załączniki ({inq.files.length})</h2>
        {inq.files.length ? (
          <ul className="inq-files">
            {inq.files.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => download(f)}
                  disabled={downloading === f.id}
                  aria-label={`Pobierz plik ${f.name}`}
                >
                  {downloading === f.id ? 'Pobieranie…' : 'Pobierz'}
                </button>
                <span className="inq-file-name">{f.name}</span>
                <span className="muted small">{formatBytes(f.size)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Brak załączników.</p>
        )}
      </div>
      <div className="inquiry-form">
        <a className="btn btn-primary" href={replyHref}>
          Odpowiedz e-mailem
        </a>
        <label className="field">
          <span className="field-label">Notatka (widoczna tylko w panelu)</span>
          <textarea rows={5} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Np. termin rozmowy, ustalenia…" />
        </label>
        <button type="button" className="btn" onClick={saveNote} disabled={busy || note === (inq.note || '')}>
          {busy ? 'Zapisywanie…' : 'Zapisz notatkę'}
        </button>
        <p className="muted small inq-mail-state">{mailState(inq.mail)}</p>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(inq)}>
          Usuń zapytanie
        </button>
      </div>
    </div>
  );
}

// --- projekty wysłane z konfiguratora (pełna wersja) -----------------------------------------------
function ProjectInquiries() {
  const [data, setData] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = () =>
    api(`/api/admin/projects${showDrafts ? '?all=1' : ''}`)
      .then(setData)
      .catch((e) => toast(e.message, 'bad'));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDrafts]);

  if (!data) return <p className="muted">Ładowanie…</p>;
  const projects = data.projects;
  const waiting = projects.filter((p) => p.status === 'wyslane');
  const value = projects.filter((p) => p.status !== 'szkic' && p.status !== 'odrzucone').reduce((a, p) => a + (p.offerPrice || p.price.gross), 0);

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <span>Czeka na wycenę</span>
          <b>{waiting.length}</b>
        </div>
        <div className="kpi">
          <span>Wartość zapytań (brutto)</span>
          <b>{pln(value)}</b>
        </div>
        <div className="kpi">
          <span>Klienci z kontem</span>
          <b>{data.clients}</b>
        </div>
      </div>
      <label className="check inline">
        <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} />
        <span>Pokaż także szkice klientów (niewysłane)</span>
      </label>
      {projects.length === 0 ? (
        <div className="empty">Brak zapytań.</div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Klient</th>
                <th>Projekt</th>
                <th className="num">Wg konfiguratora</th>
                <th className="num">Zysk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <Fragment key={p.id}>
                  <tr className={`clickable ${openId === p.id ? 'open' : ''}`} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    <td className="nowrap">{fmtDate(p.submittedAt || p.updatedAt)}</td>
                    <td>
                      <b>{p.owner?.name}</b>
                      <div className="muted small">{p.owner?.email}</div>
                    </td>
                    <td>
                      <span className="tag">{p.type === 'szafa' ? 'Szafa' : 'Kuchnia'}</span> {p.name}
                    </td>
                    <td className="num nowrap">{pln(p.price.gross)}</td>
                    <td className="num nowrap">{p.price.cost != null ? pln(p.price.net - p.price.cost) : '–'}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                  {openId === p.id && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <InquiryDetail
                          p={p}
                          onSaved={(np) => setData((d) => ({ ...d, projects: d.projects.map((x) => (x.id === np.id ? np : x)) }))}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function InquiryDetail({ p, onSaved }) {
  const [status, setStatus] = useState(p.status);
  const [offerPrice, setOfferPrice] = useState(p.offerPrice ?? '');
  const [adminNote, setAdminNote] = useState(p.adminNote || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api(`/api/admin/projects/${p.id}`, { method: 'PATCH', body: { status, offerPrice: offerPrice === '' ? null : offerPrice, adminNote } });
      onSaved(r.project);
      toast('Zapisano – klient zobaczy zmiany w „Moich projektach”.');
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inquiry">
      <div className="inquiry-info">
        <h2>Wiadomość od klienta</h2>
        <p className="quote">{p.clientMessage || <span className="muted">(brak wiadomości)</span>}</p>
        <dl className="mini-dl">
          <dt>Telefon</dt>
          <dd>{p.contactPhone || p.owner?.phone || '–'}</dd>
          <dt>E-mail</dt>
          <dd>{p.owner?.email}</dd>
          <dt>Netto / koszt</dt>
          <dd>
            {pln(p.price.net)} / {pln(p.price.cost)}
          </dd>
        </dl>
        <Link className="btn btn-sm" to={`/konfigurator/${p.type}/${p.id}`}>
          Otwórz projekt w 3D + lista formatek
        </Link>
      </div>
      <div className="inquiry-form">
        <label className="field">
          <span className="field-label">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUSES).map(([k, s]) => (
              <option key={k} value={k}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Cena ofertowa brutto (po pomiarze)</span>
          <input type="number" min="0" step="10" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder={String(Math.round(p.price.gross))} />
        </label>
        <label className="field">
          <span className="field-label">Wiadomość dla klienta</span>
          <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Np. termin pomiaru, uwagi do projektu…" />
        </label>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Zapisywanie…' : 'Zapisz odpowiedź'}
        </button>
      </div>
    </div>
  );
}

function PricingEditor() {
  const [pricing, setPricing] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/pricing')
      .then((r) => {
        setPricing(r.pricing);
        setSaved(r.pricing);
      })
      .catch((e) => toast(e.message, 'bad'));
  }, []);

  const preview = useMemo(() => {
    if (!pricing) return null;
    return {
      kitchen: priceKitchen(defaultKitchen(), pricing).totals,
      wardrobe: priceWardrobe(defaultWardrobe(), pricing).totals,
      kitchenBefore: priceKitchen(defaultKitchen(), saved).totals,
    };
  }, [pricing, saved]);

  if (!pricing) return <p className="muted">Ładowanie…</p>;
  const dirty = JSON.stringify(pricing) !== JSON.stringify(saved);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api('/api/pricing', { method: 'PUT', body: { pricing } });
      setPricing(r.pricing);
      setSaved(r.pricing);
      toast('Cennik zapisany – konfigurator od razu liczy według nowych cen.');
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pricing-layout">
      <div className="pricing-form">
        {PRICING_SCHEMA.map((g) => (
          <fieldset key={g.group}>
            <legend>{g.group}</legend>
            {g.fields.map((f) => {
              const v = getPath(pricing, f.key);
              const changed = v !== getPath(saved, f.key);
              return (
                <label key={f.key} className={`price-field ${changed ? 'changed' : ''}`}>
                  <span>{f.label}</span>
                  <span className="price-input">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={v}
                      onChange={(e) => setPricing((p) => setPath(p, f.key, e.target.value === '' ? 0 : Number(e.target.value)))}
                    />
                    <small>{f.unit}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
      <aside className="pricing-side">
        <div className="card sticky">
          <h2>Podgląd wpływu na ceny</h2>
          <p className="muted small">Przykładowe projekty (domyślna kuchnia L i szafa 240 cm) przeliczone wg cennika w formularzu.</p>
          <div className="preview-row">
            <span>Kuchnia – brutto</span>
            <b>{pln(preview.kitchen.gross)}</b>
          </div>
          {dirty && (
            <div className="preview-row muted small">
              <span>przed zmianą</span>
              <span>{pln(preview.kitchenBefore.gross)}</span>
            </div>
          )}
          <div className="preview-row">
            <span>Kuchnia – Twój zysk</span>
            <b>{pln(preview.kitchen.profit)}</b>
          </div>
          <div className="preview-row">
            <span>Szafa – brutto</span>
            <b>{pln(preview.wardrobe.gross)}</b>
          </div>
          <div className="stack">
            <button className="btn btn-primary btn-block" disabled={!dirty || busy} onClick={save}>
              {busy ? 'Zapisywanie…' : 'Zapisz cennik'}
            </button>
            <button className="btn btn-block" disabled={!dirty} onClick={() => setPricing(saved)}>
              Cofnij zmiany
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setPricing(structuredClone(DEFAULT_PRICING))}>
              Wczytaj ceny domyślne
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
