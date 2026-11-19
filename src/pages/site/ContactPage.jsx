// Podstrona „Kontakt” (/kontakt): telefon i adresy e-mail (osobny dla zapytań B2B), siedziba w Katowicach i oddział
// w Wielkopolsce, dane do faktury z kopiowaniem jednym kliknięciem, a na końcu zachęta do wyceny.
// Bez osadzonych map Google (ciasteczka stron trzecich bez zgody) – zamiast nich linki „Pokaż na mapie”.
// Teksty właścicielki dosłownie, dane firmy wyłącznie z shared/site.js; do tego dane strukturalne (JSON-LD).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { ArrowIcon, MaskLines, Reveal, useInView } from '../home/ui.jsx';
import { B2B_SERVICES, COMPANY, ROUTES } from '../../../shared/site.js';
import './contact.css';

// --- typografia i dane --------------------------------------------------------------------------------------

// Twarda spacja po jednoliterowych słowach (w, z, i, a, o, u) i przed półpauzą – dla tekstów z shared/site.js.
// Dwa przebiegi: w parze „i w” spację przed „w” zużywa już pierwsze dopasowanie.
const ORPHAN = /(^|[\s ])([aiouwzAIOUWZ]) /g;
const tidy = (text) => text.replace(ORPHAN, '$1$2 ').replace(ORPHAN, '$1$2 ').replace(/ –/g, ' –');

// „HAR-BUD Expert sp. z o.o.” łamie się najwyżej przed „sp.”, nigdy w środku „sp. z o.o.”
const LEGAL_NAME = tidy(COMPANY.legalName).replace('sp. z', 'sp. z');
const { street: INVOICE_STREET, postal: INVOICE_POSTAL, city: INVOICE_CITY } = COMPANY.invoiceAddress;
const INVOICE_TEXT = [COMPANY.legalName, INVOICE_STREET, `${INVOICE_POSTAL} ${INVOICE_CITY}`, `NIP: ${COMPANY.nip}`].join('\n');

// Usługi B2B jako zdanie: „Cięcie, oklejanie, … i heblowanie” (bez Array.at – Safari 14 go nie ma).
const B2B_LIST = (() => {
  const items = B2B_SERVICES.map((name, i) => (i === 0 ? name : name.toLowerCase()));
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}` : items.join('');
})();

// Numer w formacie międzynarodowym do danych strukturalnych: „tel:+48517495246” → „+48 517 495 246”.
const PHONE_INTL = (() => {
  const raw = COMPANY.phoneHref.replace(/^tel:/, '');
  const m = /^\+48(\d{3})(\d{3})(\d{3})$/.exec(raw);
  return m ? `+48 ${m[1]} ${m[2]} ${m[3]}` : raw;
})();

// Adres e-mail łamie się tylko przed „@” („b2bhar.meble” / „@gmail.com”), a nie w przypadkowym miejscu.
function Email({ address }) {
  const at = address.indexOf('@');
  if (at < 1) return address;
  return (
    <>
      {address.slice(0, at)}
      <wbr />
      {address.slice(at)}
    </>
  );
}

// Dane strukturalne schema.org dla wyszukiwarek. Bez openingHours: właścicielka podała tylko „8:00–17:00”
// bez dni tygodnia, więc godziny są wyłącznie w widocznej treści. Adres strony – z bieżącej domeny (bez wpisywania).
function structuredData() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const postalAddress = ({ street, postal, city }) => ({
    '@type': 'PostalAddress',
    streetAddress: street,
    postalCode: postal,
    addressLocality: city,
    addressCountry: 'PL',
  });
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    ...(origin ? { '@id': `${origin}/#firma`, url: `${origin}/` } : {}),
    name: COMPANY.brand,
    legalName: COMPANY.legalName,
    taxID: COMPANY.nip.replace(/\D/g, ''),
    email: COMPANY.email,
    telephone: PHONE_INTL,
    address: postalAddress(COMPANY.invoiceAddress),
    areaServed: COMPANY.locations.map((loc) => ({ '@type': 'AdministrativeArea', name: loc.region })),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      name: 'Zapytania B2B',
      email: COMPANY.emailB2B,
      availableLanguage: 'pl',
    },
    department: COMPANY.locations.map((loc) => ({
      '@type': 'HomeAndConstructionBusiness',
      name: `${COMPANY.brand} (${loc.label})`,
      address: { ...postalAddress(loc), addressRegion: loc.region },
      hasMap: loc.mapUrl,
    })),
  };
  // „<” jako < – żaden tekst nie zamknie przedwcześnie znacznika <script>
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// Ten sam próg, od którego nagłówek podstrony ma dwie kolumny (site.css).
const WIDE_QUERY = '(min-width: 960px)';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

// --- ikony (liniowe 24 px, kreska 1.5, currentColor – jak w pasku zalet strony głównej) -----------------------

function Icon({ children, size = 24 }) {
  return (
    <svg
      className="s-contact-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  // smartfon
  phone: (
    <>
      <rect x="6.75" y="2.75" width="10.5" height="18.5" rx="2.25" />
      <path d="M10.5 5.75h3M11.25 18.25h1.5" />
    </>
  ),
  // koperta
  mail: (
    <>
      <rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.25" />
      <path d="m3.5 6.75 7.6 5.6a1.5 1.5 0 0 0 1.8 0l7.6-5.6" />
    </>
  ),
  // teczka – współpraca z firmami
  b2b: (
    <>
      <rect x="2.75" y="7.25" width="18.5" height="12.5" rx="2.25" />
      <path d="M8.75 7.25V5.5c0-.97.78-1.75 1.75-1.75h3c.97 0 1.75.78 1.75 1.75v1.75M2.75 12.75h18.5M10.25 12.75v1.5h3.5v-1.5" />
    </>
  ),
  // kalendarz – umówienie wizyty
  calendar: (
    <>
      <rect x="3.25" y="4.75" width="17.5" height="16" rx="2.25" />
      <path d="M3.25 9.25h17.5M8 3v3.5M16 3v3.5M7.75 13h.01M12 13h.01M16.25 13h.01M7.75 16.75h.01M12 16.75h.01" />
    </>
  ),
};

// małe ikony 16 px do przycisków (kreska 1.6 – jak strzałka ArrowIcon)
function SmallIcon({ children }) {
  return (
    <svg
      className="s-contact-sicon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const ExternalIcon = () => (
  <SmallIcon>
    <path d="M5 11 11 5M6.25 5H11v4.75" />
  </SmallIcon>
);

const CopyIcon = () => (
  <SmallIcon>
    <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.6" />
    <path d="M10.5 4v-.75C10.5 2.56 9.94 2 9.25 2h-5C3.56 2 3 2.56 3 3.25v5c0 .69.56 1.25 1.25 1.25H5" />
  </SmallIcon>
);

const CheckIcon = () => (
  <SmallIcon>
    <path d="m3.5 8.25 2.75 2.75L12.5 4.75" />
  </SmallIcon>
);

// --- słoje drewna (dekoracja kart) ---------------------------------------------------------------------------
// Koncentryczne, lekko nieregularne linie wokół „rdzenia” – przekrój pnia, a zarazem poziomice wokół pinezki.
// Słoje z jednej strony szersze (mimośród jak w prawdziwym pniu), fale wspólne dla wszystkich, więc linie się nie
// przecinają. Liczone raz przy imporcie modułu (deterministycznie) – żadnej mapy, tylko abstrakcja.
const round1 = (n) => Math.round(n * 10) / 10;

// zamknięta krzywa przez punkty (Catmull-Rom → Bézier)
function closedCurve(points) {
  const n = points.length;
  let d = `M${round1(points[0][0])} ${round1(points[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = points[(i - 1 + n) % n];
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    const [x3, y3] = points[(i + 2) % n];
    d += `C${round1(x1 + (x2 - x0) / 6)} ${round1(y1 + (y2 - y0) / 6)} ${round1(x2 - (x3 - x1) / 6)} ${round1(y2 - (y3 - y1) / 6)} ${round1(x2)} ${round1(y2)}`;
  }
  return `${d}Z`;
}

function treeRings(seed, count = 9, steps = 24) {
  const rings = [];
  let radius = 6;
  for (let i = 0; i < count; i += 1) {
    if (i > 0) radius += 9.6 + 2.2 * Math.sin(seed * 5.3 + i * 2.1);
    const drift = i * 0.12;
    const points = [];
    for (let k = 0; k < steps; k += 1) {
      const t = (k / steps) * Math.PI * 2;
      const wobble =
        0.035 * Math.sin(2 * t + seed + drift) + 0.024 * Math.sin(3 * t + seed * 1.7 - drift) + 0.012 * Math.sin(5 * t + seed * 2.9 + drift);
      const r = radius * (1 + 0.11 * Math.cos(t - seed * 1.3)) * (1 + wobble);
      points.push([100 + r * Math.cos(t), 100 + r * Math.sin(t)]);
    }
    rings.push(closedCurve(points));
  }
  return rings;
}

const RING_SETS = [treeRings(0.7), treeRings(2.3), treeRings(4.1)];

function Rings({ variant = 0, pin = true, className = '' }) {
  return (
    <svg className={`s-contact-rings ${className}`.trim()} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      {RING_SETS[variant % RING_SETS.length].map((d, i) => (
        <path key={i} d={d} pathLength="1" style={{ '--ring-i': i }} />
      ))}
      {pin && (
        <>
          <circle className="s-contact-rings__halo" cx="100" cy="100" r="9" />
          <circle className="s-contact-rings__dot" cx="100" cy="100" r="3.6" />
        </>
      )}
    </svg>
  );
}

// --- kopiowanie do schowka -------------------------------------------------------------------------------------

// Clipboard API działa tylko w bezpiecznym kontekście (HTTPS, localhost) i może odmówić (uprawnienia) – wtedy ukryte
// pole tekstowe i execCommand('copy'). Fokus i zaznaczenie na stronie wracają potem do stanu sprzed kopiowania.
async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* brak uprawnień – próbujemy starszą metodą */
    }
  }
  const active = document.activeElement;
  const selection = document.getSelection();
  const ranges = [];
  for (let i = 0; i < (selection?.rangeCount ?? 0); i += 1) ranges.push(selection.getRangeAt(i));

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.tabIndex = -1;
  // niewidoczne, ale nie display: none (tego nie da się zaznaczyć); 16 px – iOS nie przybliża przy fokusie
  Object.assign(field.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    padding: '0',
    border: '0',
    opacity: '0',
    fontSize: '16px',
  });
  document.body.appendChild(field);
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, text.length); // iOS Safari zaznacza dopiero tak
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  field.remove();
  if (selection) {
    selection.removeAllRanges();
    ranges.forEach((range) => selection.addRange(range));
  }
  if (active instanceof HTMLElement) active.focus({ preventScroll: true });
  return ok;
}

function selectContents(el) {
  const selection = window.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Przycisk „Kopiuj…” z wynikiem w regionie aria-live (widocznym obok przycisku). Etykieta przycisku się nie zmienia,
// więc czytnik ekranu nie ogłasza wyniku dwa razy. Gdy kopiowanie się nie uda, zaznaczamy tekst (selectRef) –
// wtedy wystarczy Ctrl+C / Cmd+C.
function CopyButton({ text, label, srLabel, what, selectRef, className = '' }) {
  const [status, setStatus] = useState('idle'); // idle | ok | error
  const timers = useRef([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const later = (fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const onClick = async () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStatus('idle');
    const ok = await copyText(text);
    if (!alive.current) return;
    if (!ok && selectRef?.current) selectContents(selectRef.current);
    // najpierw pusty region, po chwili komunikat – czytnik ogłosi go także przy kolejnym kliknięciu
    later(() => {
      setStatus(ok ? 'ok' : 'error');
      later(() => setStatus('idle'), ok ? 4000 : 12000);
    }, 80);
  };

  return (
    <div className={`s-contact-copy ${className}`.trim()}>
      <button type="button" className="h-btn h-btn--outline h-btn--sm s-contact-copy__btn" onClick={onClick}>
        <CopyIcon />
        {label}
        {srLabel && <span className="h-visually-hidden"> {srLabel}</span>}
      </button>
      <p className={`s-contact-copy__status${status === 'idle' ? '' : ` is-${status}`}`} role="status">
        {status === 'ok' && (
          <>
            <CheckIcon />
            Skopiowano
            <span className="h-visually-hidden"> {what}</span>
          </>
        )}
        {status === 'error' && 'Nie udało się skopiować. Tekst jest zaznaczony – skopiuj go skrótem Ctrl+C (na Macu Cmd+C).'}
      </p>
    </div>
  );
}

// --- nagłówek --------------------------------------------------------------------------------------------------

const TITLE = ['Porozmawiajmy', 'o Twoim projekcie'];
const LEAD =
  'Chcesz porozmawiać o swoim projekcie? Opowiedz nam, czego potrzebujesz – wspólnie poszukamy odpowiednich rozwiązań.';

function HeadActions() {
  return (
    <>
      <Link className="h-btn s-contact-head-btn" to={ROUTES.quote}>
        Zapytaj o&nbsp;wycenę
        <ArrowIcon />
      </Link>
      <a className="h-btn h-btn--outline s-contact-head-btn" href={COMPANY.phoneHref}>
        <Icon size={18}>{ICONS.phone}</Icon>
        <span>
          <span className="h-visually-hidden">Zadzwoń: </span>
          {COMPANY.phone}
        </span>
      </a>
    </>
  );
}

// Karta-wizytówka w prawej kolumnie nagłówka – tylko na szerokich ekranach. Na węższych stanęłaby tuż nad kafelkami
// z tymi samymi danymi, a telefon i tak jest w przyciskach nagłówka.
function QuickCard() {
  return (
    <div className="s-contact-card">
      <p className="s-contact-card__brand">{COMPANY.brand}</p>
      <p className="s-contact-card__claim">{tidy(COMPANY.claim)}</p>
      <address className="s-contact-card__address">
        <dl className="s-contact-card__list">
          <div className="s-contact-card__row">
            <dt className="s-contact-card__label">Telefon</dt>
            <dd className="s-contact-card__value">
              <a className="s-contact-card__link" href={COMPANY.phoneHref}>
                <span className="s-contact-u">{COMPANY.phone}</span>
              </a>
            </dd>
          </div>
          <div className="s-contact-card__row">
            <dt className="s-contact-card__label">E-mail</dt>
            <dd className="s-contact-card__value">
              <a className="s-contact-card__link" href={`mailto:${COMPANY.email}`}>
                <span className="s-contact-u">
                  <Email address={COMPANY.email} />
                </span>
              </a>
            </dd>
          </div>
          <div className="s-contact-card__row">
            <dt className="s-contact-card__label">Godziny kontaktu</dt>
            <dd className="s-contact-card__value">{COMPANY.hours}</dd>
          </div>
        </dl>
      </address>
    </div>
  );
}

// --- (a) telefon i e-maile ---------------------------------------------------------------------------------------

// Opis przy e-mailu – rodzaje mebli jak w menu „Oferta”; przy B2B – lista usług z shared/site.js.
const CHANNELS = [
  {
    id: 'telefon',
    icon: 'phone',
    label: 'Telefon',
    value: COMPANY.phone,
    href: COMPANY.phoneHref,
    action: 'Zadzwoń',
    note: `Godziny kontaktu: ${COMPANY.hours}`,
    copyLabel: 'Kopiuj numer',
    what: 'numer telefonu',
  },
  {
    id: 'email',
    icon: 'mail',
    label: 'E-mail – meble na wymiar',
    value: COMPANY.email,
    href: `mailto:${COMPANY.email}`,
    action: 'Napisz',
    note: 'Kuchnie, szafy, garderoby i zabudowy',
    copyLabel: 'Kopiuj adres',
    what: 'adres e-mail',
  },
  {
    id: 'b2b',
    icon: 'b2b',
    label: 'Zapytania B2B',
    value: COMPANY.emailB2B,
    href: `mailto:${COMPANY.emailB2B}`,
    action: 'Napisz',
    note: B2B_LIST,
    copyLabel: 'Kopiuj adres',
    what: 'adres e-mail do zapytań B2B',
  },
];

function ChannelTile({ channel, index }) {
  const valueRef = useRef(null);
  const { icon, label, value, href, action, note, copyLabel, what } = channel;
  return (
    <Reveal as="li" className="s-contact-tile" delay={index * 80} y={24}>
      <span className="s-contact-tile__icon">
        <Icon>{ICONS[icon]}</Icon>
      </span>
      <h3 className="s-contact-tile__label">{label}</h3>
      <a className="s-contact-tile__value" href={href}>
        <span className="h-visually-hidden">{action}: </span>
        <span ref={valueRef} className="s-contact-u">
          {href.startsWith('mailto:') ? <Email address={value} /> : value}
        </span>
      </a>
      <p className="s-contact-tile__note">{note}</p>
      <CopyButton className="s-contact-tile__copy" text={value} label={copyLabel} srLabel={value} what={what} selectRef={valueRef} />
    </Reveal>
  );
}

function Channels() {
  return (
    <section id="telefon-i-email" className="h-section s-contact-channels" aria-labelledby="s-contact-channels-title">
      <div className="h-container">
        <h2 id="s-contact-channels-title" className="h-visually-hidden">
          Telefon i&nbsp;e-mail
        </h2>
        <ul className="s-contact-tiles" role="list">
          {CHANNELS.map((channel, i) => (
            <ChannelTile key={channel.id} channel={channel} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// --- (b) siedziba i oddział ----------------------------------------------------------------------------------------

// tekst właścicielki; podział na linie tylko wizualny (MaskLines dokłada spację między liniami dla czytników)
const PLACES_TITLE = ['Działamy w dwóch regionach Polski:', 'na Śląsku i w Wielkopolsce.'];

function PlaceCard({ place, index }) {
  const { label, region, street, postal, city, mapUrl } = place;
  return (
    <Reveal as="li" className="s-contact-place" delay={index * 90}>
      <Rings variant={index} className="s-contact-place__rings" />
      <h3 className="s-contact-place__title">{tidy(label)}</h3>
      {/* region nad nagłówkiem tylko wizualnie (order w CSS) – czytnik zaczyna kartę od nazwy miejsca */}
      <p className="s-contact-place__region">{region}</p>
      <address className="s-contact-place__address">
        {street}
        <br />
        {postal} {city}
      </address>
      <a className="h-btn h-btn--outline h-btn--sm s-contact-place__map" href={mapUrl} target="_blank" rel="noopener noreferrer">
        Pokaż na mapie
        <span className="h-visually-hidden">
          : {street}, {postal} {city} (otwiera się w&nbsp;nowej karcie)
        </span>
        <ExternalIcon />
      </a>
    </Reveal>
  );
}

function Places() {
  return (
    <section id="lokalizacje" className="h-section h-section--alt s-contact-places" aria-labelledby="s-contact-places-title">
      <div className="h-container">
        <div className="s-contact-places__head">
          <Reveal as="p" className="h-eyebrow" y={12}>
            Siedziba i&nbsp;oddział
          </Reveal>
          <div id="s-contact-places-title">
            <MaskLines as="h2" className="h-title s-contact-places__title" lines={PLACES_TITLE} />
          </div>
        </div>

        <ul className="s-contact-places__list" role="list">
          {COMPANY.locations.map((place, i) => (
            <PlaceCard key={place.id} place={place} index={i} />
          ))}
        </ul>

        <Reveal className="s-contact-visit" delay={120} y={16}>
          <span className="s-contact-visit__icon">
            <Icon>{ICONS.calendar}</Icon>
          </span>
          <p className="s-contact-visit__text">{tidy(COMPANY.visitNote)}</p>
          <a className="h-link s-contact-visit__link" href={COMPANY.phoneHref}>
            Zadzwoń: {COMPANY.phone}
            <ArrowIcon />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

// --- (d) dane do faktury -----------------------------------------------------------------------------------------

function Invoice() {
  const dataRef = useRef(null);
  return (
    <section id="dane-do-faktury" className="h-section s-contact-invoice" aria-labelledby="s-contact-invoice-title">
      <div className="h-container">
        <Reveal className="s-contact-invoice__card">
          <div className="s-contact-invoice__intro">
            <h2 id="s-contact-invoice-title" className="h-subtitle s-contact-invoice__title">
              Dane do faktury
            </h2>
            <p className="s-contact-invoice__hint">Nazwa, adres i&nbsp;NIP&nbsp;– do skopiowania jednym kliknięciem.</p>
          </div>
          <div ref={dataRef} className="s-contact-invoice__data">
            <p className="s-contact-invoice__name">{LEGAL_NAME}</p>
            <address className="s-contact-invoice__address">
              {INVOICE_STREET}
              <br />
              {INVOICE_POSTAL} {INVOICE_CITY}
            </address>
            <p className="s-contact-invoice__nip">
              NIP: <span className="s-contact-invoice__num">{COMPANY.nip}</span>
            </p>
          </div>
          <CopyButton
            className="s-contact-invoice__copy"
            text={INVOICE_TEXT}
            label="Kopiuj dane do faktury"
            what="dane do faktury"
            selectRef={dataRef}
          />
        </Reveal>
      </div>
    </section>
  );
}

// --- (c) zachęta do wyceny – ostatnia sekcja przed stopką -------------------------------------------------------
// Pytanie „Chcesz porozmawiać o swoim projekcie?” jest już w nagłówku strony, więc końcowa karta prowadzi do wyceny
// tekstem właścicielki z bloku „Zapytaj o wycenę” (bez powtarzania nagłówka).

function QuoteBand() {
  const cardRef = useRef(null);
  const shown = useInView(cardRef, { threshold: 0.2 });
  return (
    <section id="wycena" className="h-section s-contact-quote" aria-labelledby="s-contact-quote-title">
      <div className="h-container">
        <div ref={cardRef} className={`s-contact-quote__card${shown ? ' is-in' : ''}`}>
          <Rings variant={2} pin={false} className="s-contact-quote__rings" />
          <Reveal as="p" className="h-eyebrow s-contact-quote__eyebrow" y={12}>
            Wycena
          </Reveal>
          <div id="s-contact-quote-title">
            <MaskLines as="h2" className="h-display s-contact-quote__title" lines={['Zapytaj o wycenę']} />
          </div>
          <div className="s-contact-quote__body">
            <Reveal as="p" className="h-lead s-contact-quote__lead" delay={140}>
              Prześlij opis projektu, orientacyjne wymiary oraz zdjęcia lub inspiracje. Podaj miejscowość realizacji
              i&nbsp;zaznacz, czy interesują Cię meble na wymiar, czy usługi B2B: cięcie, frezowanie lub gięcie.
            </Reveal>
            {/* strzałka tylko w przycisku głównym – ta sama konwencja co na stronie głównej */}
            <Reveal className="s-contact-quote__actions" delay={220} y={16}>
              <Link className="h-btn h-btn--light" to={ROUTES.quote}>
                Meble na wymiar
                <span className="h-visually-hidden">&nbsp;– formularz wyceny</span>
                <ArrowIcon />
              </Link>
              <Link className="h-btn h-btn--outline-light" to={ROUTES.quoteB2B}>
                Usługi B2B
                <span className="h-visually-hidden">&nbsp;– formularz wyceny</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- strona ---------------------------------------------------------------------------------------------------------

export default function ContactPage() {
  const wide = useMediaQuery(WIDE_QUERY);
  const jsonLd = useMemo(structuredData, []);

  return (
    <PageShell eyebrow="Kontakt" title={TITLE} lead={LEAD} actions={<HeadActions />} aside={wide ? <QuickCard /> : null}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Channels />
      <Places />
      <Invoice />
      <QuoteBand />
    </PageShell>
  );
}
