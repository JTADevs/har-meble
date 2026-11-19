// Statement – pierwsza sekcja pod filmem w hero.
// Zdanie-manifest odsłaniane słowo po słowie w rytm przewijania: useScrollProgress woła callback w rAF,
// a krycie słów zapisujemy prosto do DOM przez refy (zero setState, zero re-renderów).
// Pod spodem pigułki kategorii wjeżdżające ze staggerem.
import { Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, LINKS, Reveal, useInView, useReducedMotion, useScrollProgress } from '../ui.jsx';
import { COMPANY, FEATURES, ROUTES } from '../../../../shared/site.js';
import './statement.css';

// accent: zdanie-puenta w kolorze akcentu, zawsze od nowej linii.
// Zdania z tekstów właścicielki („udana zabudowa zaczyna się od rozmowy…”, „dbamy o całość…”).
// Półpauza sklejona twardą spacją ze słowem przed nią – nie zaczyna nowej linii.
const SENTENCES = [
  { text: 'Udana zabudowa zaczyna się od rozmowy.' },
  { text: 'O potrzebach, przyzwyczajeniach i przestrzeni.' },
  { text: 'Dbamy o całość\u00a0– od proporcji po wykończenie.' },
  { text: 'Opowiedz nam o swoim projekcie.', accent: true },
];

const FULL_TEXT = SENTENCES.map((s) => s.text).join(' ');

// Słowa z globalnym indeksem (kolejność odsłaniania), podzielone na treść i puentę. Liczone raz, przy imporcie.
const WORDS = (() => {
  const lead = [];
  const punch = [];
  let i = 0;
  for (const s of SENTENCES) {
    for (const w of s.text.split(' ')) (s.accent ? punch : lead).push({ w, i: i++ });
  }
  return { lead, punch, count: i };
})();

const FLOOR = 0.16; // krycie słowa przed odsłonięciem
const SPREAD = 0.24; // część postępu, na której odsłania się jedno słowo (zakładki = miękka fala)

// mebel – wartość z FURNITURE_TYPES (shared/site.js): link otwiera formularz wyceny z zaznaczonym rodzajem mebla.
// cfg – konfigurator 3D (tylko w pełnej wersji strony; w wizytówce wszystkie pigułki prowadzą do wyceny).
const PILLS = [
  { label: 'Kuchnie', mebel: 'Kuchnia', cfg: LINKS.kuchnia },
  { label: 'Szafy', mebel: 'Szafa', cfg: LINKS.szafa },
  { label: 'Garderoby', mebel: 'Garderoba', cfg: LINKS.szafa },
  { label: 'Zabudowy wnęk', mebel: 'Zabudowa wnęki', cfg: LINKS.szafa },
  { label: 'Komody', mebel: 'Komoda, regał lub szafka RTV' },
  { label: 'Regały', mebel: 'Komoda, regał lub szafka RTV' },
  { label: 'Szafki RTV', mebel: 'Komoda, regał lub szafka RTV' },
  { label: 'Meble łazienkowe', mebel: 'Meble łazienkowe' },
  { label: 'Wszystkie meble', href: '#meble', ghost: true },
];

const quoteFor = (mebel) => `${ROUTES.quote}?mebel=${encodeURIComponent(mebel)}`;

export default function Statement() {
  const reduced = useReducedMotion();
  const probeRef = useRef(null); // punkt w połowie wysokości nagłówka – od niego liczymy postęp
  const words = useRef([]);
  const lastP = useRef(-1);
  const ctaRef = useRef(null);
  const ctaIn = useInView(ctaRef, { threshold: 0.2 });

  // p = 0, gdy środek nagłówka jest na 88% wysokości ekranu; p = 1, gdy dojdzie do 36%.
  // Każde słowo ma własne okno postępu (smoothstep), więc odsłanianie płynie jak fala.
  useScrollProgress(
    probeRef,
    (progress) => {
      const p = reduced ? 1 : progress;
      if (Math.abs(p - lastP.current) < 0.0005) return;
      lastP.current = p;
      const n = WORDS.count;
      for (let i = 0; i < n; i++) {
        const el = words.current[i];
        if (!el) continue;
        const start = n > 1 ? (i / (n - 1)) * (1 - SPREAD) : 0;
        let t = (p - start) / SPREAD;
        t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
        el.style.opacity = String(Math.round((FLOOR + (1 - FLOOR) * t) * 1000) / 1000);
      }
    },
    { start: 0.88, end: 0.36 },
  );

  // Po jednoliterowym słowie („W”, „Z”) twarda spacja – nie zostaje samo na końcu linii.
  const renderWord = ({ w, i }) => (
    <Fragment key={i}>
      <span
        className="h-stmt-word"
        ref={(el) => {
          words.current[i] = el;
        }}
      >
        {w}
      </span>
      {w.length === 1 ? ' ' : ' '}
    </Fragment>
  );

  return (
    <section className="h-stmt-section" aria-labelledby="h-stmt-title">
      <div className="h-container h-stmt-inner">
        <Reveal as="p" className="h-eyebrow h-stmt-eyebrow" y={12}>
          {COMPANY.brand} · {COMPANY.regions.replace(' i ', ' i\u00a0')}
        </Reveal>

        <h2 id="h-stmt-title" className="h-stmt-title">
          {/* Czytniki ekranu dostają całe zdanie; rozbicie na słowa jest tylko wizualne. */}
          <span className="h-visually-hidden">{FULL_TEXT}</span>
          <span className="h-stmt-text" aria-hidden="true">
            <span className="h-stmt-lead">{WORDS.lead.map(renderWord)}</span>
            <span className="h-stmt-punch">{WORDS.punch.map(renderWord)}</span>
          </span>
          <span ref={probeRef} className="h-stmt-probe" aria-hidden="true" />
        </h2>

        <div ref={ctaRef} className={`h-stmt-cta ${ctaIn ? 'is-in' : ''}`.trim()}>
          <ul className="h-stmt-pills" aria-label="Meble na wymiar">
            {PILLS.map((p, i) => (
              <li key={p.label} className="h-stmt-pill-item" style={{ '--i': i }}>
                {FEATURES.configurator && p.cfg ? (
                  // Znacznik „3D” jest częścią nazwy linku („Kuchnie 3D – zaprojektuj w konfiguratorze”),
                  // więc polecenie głosowe z widocznym tekstem („Kuchnie 3D”) trafia w link (WCAG 2.5.3).
                  <Link to={p.cfg} className="h-pill-link h-stmt-pill">
                    {p.label} <span className="h-stmt-badge">3D</span>
                    <span className="h-visually-hidden"> – zaprojektuj w konfiguratorze</span>
                  </Link>
                ) : p.ghost ? (
                  <a href={p.href} className="h-pill-link h-stmt-pill h-stmt-pill--ghost">
                    {p.label}
                    <ArrowIcon size={15} />
                  </a>
                ) : (
                  <Link to={quoteFor(p.mebel)} className="h-pill-link h-stmt-pill">
                    {p.label}
                    <span className="h-visually-hidden"> – zapytaj o wycenę</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {FEATURES.configurator ? (
            <p className="h-stmt-note">
              <span className="h-stmt-badge h-stmt-badge--note">3D</span>– zaprojektujesz samodzielnie w&nbsp;konfiguratorze.
              Pozostałe meble projektujemy razem z&nbsp;Tobą.
            </p>
          ) : (
            <p className="h-stmt-note">Wybierz rodzaj mebla i&nbsp;zapytaj o&nbsp;wycenę&nbsp;– wspólnie poszukamy odpowiednich rozwiązań.</p>
          )}
        </div>
      </div>
    </section>
  );
}
