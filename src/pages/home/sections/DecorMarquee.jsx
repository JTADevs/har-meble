// Próbnik dekorów: dwa rzędy kafelków płynące w przeciwnych kierunkach (CSS keyframes,
// treść zduplikowana → translateX(-50%)). Miniatury drewna i kamienia generuje decorSwatchURL –
// moduł importuje three.js, więc ładujemy go dynamicznie, gdy sekcja zbliża się do widoku,
// a miniatury liczymy w czasie bezczynności przeglądarki (nie blokują przewijania).
// Do tego czasu kafelek ma kolor hex dekoru – bez skoku layoutu.
import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, LINKS, SectionHead, useInView, useReducedMotion } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';
import { DECORS, DECOR_GROUPS } from '../../../../shared/catalog.js';
import './marquee.css';

// Polska typografia: twarda spacja po jednoliterowych słowach (w, z, i…) – nie zostają same na końcu linii –
// i przed półpauzą, żeby linia nie zaczynała się od „–”.
const SINGLE_LETTER = /^[a-ząćęłńóśźż]$/i;
const DASH = /^[–—]$/;
function nbsp(text) {
  const words = text.split(' ');
  return words.reduce((out, w, i) => {
    if (i === 0) return w;
    const glue = SINGLE_LETTER.test(words[i - 1]) || DASH.test(w);
    return out + (glue ? ' ' : ' ') + w;
  }, '');
}

function decorsWord(n) {
  if (n === 1) return 'dekor';
  const d = n % 10;
  const h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'dekory' : 'dekorów';
}

// Kompozycja rzędów: na przemian jasne i ciemne, ciepłe i chłodne – sąsiednie kafelki się nie zlewają.
// Rząd 1: kolory + drewno, rząd 2: kamień + drewno (drewno w innej kolejności, żeby nie szło w parze).
const ROW_1 = [
  'bialy', 'dab_naturalny', 'szalwia', 'granat', 'dab_bielony', 'terakota', 'kosc', 'orzech', 'musztarda',
  'zielen', 'jesion', 'roz', 'grafit', 'dab_miodowy', 'kaszmir', 'czarny', 'szary_jasny', 'dab_wedzony',
];
const ROW_2 = [
  'marmur_bialy', 'orzech', 'beton_jasny', 'dab_bielony', 'granit_czarny', 'terrazzo', 'dab_miodowy',
  'marmur_czarny', 'kwarc_bialy', 'dab_wedzony', 'kwarc_szary', 'jesion', 'beton_ciemny', 'dab_naturalny',
];

function composeRows() {
  const a = ROW_1.filter((id) => DECORS[id]);
  const b = ROW_2.filter((id) => DECORS[id]);
  const used = new Set([...a, ...b]);
  // dekory dopisane później do katalogu też trafią na taśmę
  for (const [id, d] of Object.entries(DECORS)) {
    if (!used.has(id)) (d.group === 'kamien' ? b : a).push(id);
  }
  return [a, b];
}

const [ROW_A, ROW_B] = composeRows();
const TEXTURED = [...new Set([...ROW_A, ...ROW_B])].filter((id) => DECORS[id].tex);
const NAMES = Object.fromEntries(Object.entries(DECORS).map(([id, d]) => [id, nbsp(d.name)]));

const COUNT = Object.keys(DECORS).length;
// W wizytówce bez liczby dekorów: to przykładowa paleta z prototypu, nie pełna oferta płyt i blatów stolarni.
const TITLE = FEATURES.configurator ? [`${COUNT} ${decorsWord(COUNT)}.`, 'Jeden konfigurator.'] : ['Kolory i dekory', 'na każdy styl'];
const LEAD = nbsp(
  FEATURES.configurator
    ? 'Od spokojnych bieli i szałwii, przez ciepły dąb i orzech, po marmur, beton i terrazzo. ' +
        'Każdy dekor sprawdzisz na własnym projekcie w konfiguratorze – zanim cokolwiek zamówisz.'
    : 'Od spokojnych bieli i szałwii, przez ciepły dąb i orzech, po marmur, beton i terrazzo. ' +
        'To przykładowe dekory płyt i blatów – materiały do Twojego projektu dobierzemy razem z Tobą.',
);

// Legenda pod taśmą: liczba dekorów w grupach + kropka w kolorze przykładowego dekoru.
const GROUP_SAMPLE = { kolor: 'szalwia', drewno: 'dab_naturalny', kamien: 'beton_jasny' };
const GROUPS = Object.entries(DECOR_GROUPS)
  .map(([key, label]) => {
    const items = Object.entries(DECORS).filter(([, d]) => d.group === key);
    const sample = DECORS[GROUP_SAMPLE[key]] || items[0]?.[1];
    return { key, label, count: items.length, hex: sample?.hex };
  })
  .filter((g) => g.count > 0);

const EMPTY = Object.freeze({});
let swatchStore = null; // miniatury policzone w tej sesji – po powrocie na stronę bez ponownego liczenia

const idle = (cb) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(cb, { timeout: 700 })
    : window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 34);
const cancelIdle = (handle) =>
  typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback(handle) : window.clearTimeout(handle);

// --- kafelek i rząd -------------------------------------------------------------------

const Tile = memo(function Tile({ id, url }) {
  const d = DECORS[id];
  return (
    <li className="h-marq-tile">
      <span className="h-marq-media">
        <span className="h-marq-swatch" style={{ '--h-marq-hex': d.hex }}>
          {url && (
            <img className="h-marq-img" src={url} alt="" width="130" height="130" decoding="async" draggable={false} />
          )}
        </span>
      </span>
      <p className="h-marq-label">
        <span className="h-marq-name">{NAMES[id]}</span>
        <span className="h-marq-sep" aria-hidden="true">
          {' · '}
        </span>
        <span className="h-visually-hidden">, kod </span>
        <span className="h-marq-code">{d.code}</span>
      </p>
    </li>
  );
});

// scrollable – tryb ograniczonego ruchu: rząd przewijany ręcznie, więc musi dać się sfokusować (klawiatura).
const MarqueeRow = memo(function MarqueeRow({ ids, label, duration, reverse = false, swatches, scrollable }) {
  const rowProps = scrollable ? { tabIndex: 0, role: 'region', 'aria-label': label } : {};
  return (
    <div
      className={`h-marq-row${reverse ? ' h-marq-row--reverse' : ''}`}
      style={{ '--h-marq-dur': duration }}
      {...rowProps}
    >
      <div className="h-marq-track">
        <ul className="h-marq-half" aria-label={scrollable ? undefined : label}>
          {ids.map((id) => (
            <Tile key={id} id={id} url={swatches[id]} />
          ))}
        </ul>
        <ul className="h-marq-half h-marq-half--clone" aria-hidden="true">
          {ids.map((id) => (
            <Tile key={id} id={id} url={swatches[id]} />
          ))}
        </ul>
      </div>
    </div>
  );
});

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M4.75 3v8M9.25 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path d="M4.5 3.1v7.8a.6.6 0 0 0 .9.52l6.6-3.9a.6.6 0 0 0 0-1.04L5.4 2.58a.6.6 0 0 0-.9.52Z" fill="currentColor" />
    </svg>
  );
}

// --- sekcja ---------------------------------------------------------------------------

export default function DecorMarquee() {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const rowsRef = useRef(null);
  const rowsIn = useInView(rowsRef, { threshold: 0.1 });
  const [swatches, setSwatches] = useState(() => swatchStore || EMPTY);
  const [paused, setPaused] = useState(false);

  // Miniatury: moduł z three.js dopiero, gdy sekcja jest ~1000 px od widoku; potem po kilka na klatkę bezczynności.
  useEffect(() => {
    if (swatchStore || !TEXTURED.length) return undefined;
    const el = sectionRef.current;
    if (!el) return undefined;
    let cancelled = false;
    let handle = 0;
    let io = null;

    const generate = () => {
      import('../../../three/textures.js')
        .then(({ decorSwatchURL }) => {
          if (cancelled) return;
          const queue = TEXTURED.slice();
          const out = {};
          const step = (deadline) => {
            handle = 0;
            if (cancelled) return;
            // co najmniej jedna miniatura na wywołanie, kolejne – dopóki przeglądarka ma wolny czas
            do {
              const id = queue.shift();
              try {
                const url = decorSwatchURL(id);
                if (url) out[id] = url;
              } catch {
                // brak miniatury – kafelek zostaje w kolorze hex dekoru
              }
            } while (queue.length && deadline.timeRemaining() > 10);
            if (queue.length) {
              handle = idle(step);
            } else {
              swatchStore = out;
              setSwatches(out);
            }
          };
          handle = idle(step);
        })
        .catch(() => {
          // moduł się nie wczytał (np. brak sieci) – zostają kolory hex
        });
    };

    if (typeof IntersectionObserver === 'undefined') {
      generate();
    } else {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          generate();
        },
        { rootMargin: '1000px 0px' },
      );
      io.observe(el);
    }
    return () => {
      cancelled = true;
      io?.disconnect();
      if (handle) cancelIdle(handle);
    };
  }, []);

  // Taśmy poza ekranem stoją – atrybut ustawiany wprost na DOM, bez re-renderu 60+ kafelków.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => el.toggleAttribute('data-offscreen', !entry.isIntersecting), {
      rootMargin: '100px 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-offscreen');
    };
  }, []);

  return (
    <section ref={sectionRef} id="dekory" className="h-marq-section" data-paused={paused ? '' : undefined}>
      <div className="h-container">
        <SectionHead
          eyebrow="Próbnik dekorów"
          title={TITLE}
          lead={LEAD}
          action={
            <Link to={FEATURES.configurator ? LINKS.kuchnia : ROUTES.quote} className="h-btn">
              {FEATURES.configurator ? 'Dobierz dekor w 3D' : 'Zapytaj o dekor'}
              <ArrowIcon />
            </Link>
          }
        />
      </div>

      <div ref={rowsRef} className={`h-marq-rows${rowsIn ? ' is-in' : ''}`}>
        <MarqueeRow ids={ROW_A} label="Kolory i drewno" duration="60s" swatches={swatches} scrollable={reduced} />
        <MarqueeRow
          ids={ROW_B}
          label="Kamień, beton i drewno"
          duration="75s"
          swatches={swatches}
          scrollable={reduced}
          reverse
        />
      </div>

      <div className={`h-container h-marq-foot${rowsIn ? ' is-in' : ''}`}>
        <ul className="h-marq-legend" aria-label="Dekory w grupach">
          {GROUPS.map((g) => (
            <li key={g.key} className="h-marq-legend-item">
              <span className="h-marq-legend-dot" style={{ background: g.hex }} aria-hidden="true" />
              {g.label}
              <span className="h-marq-legend-count">{g.count}</span>
            </li>
          ))}
        </ul>
        {!reduced && (
          <button type="button" className="h-marq-toggle" onClick={() => setPaused((v) => !v)}>
            {paused ? <PlayIcon /> : <PauseIcon />}
            <span>{paused ? 'Wznów' : 'Zatrzymaj'}</span>
            <span className="h-visually-hidden"> przesuwanie dekorów</span>
          </button>
        )}
      </div>
    </section>
  );
}
