// Stopka (strona główna i podstrony wizytówki): hasło firmy, kolumny linków, dane kontaktowe obu oddziałów
// (shared/site.js), pasek prawny z danymi spółki i ogromny wordmark „HAR MEBLE” na całą szerokość kontenera,
// wjeżdżający spod maski litera po literze.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaskLines, Reveal, useInView, useReducedMotion } from '../ui.jsx';
import { COMPANY, FEATURES, ROUTES } from '../../../../shared/site.js';
import './footer.css';

// spacja w wordmarku jako twarda – zwykła w inline-blocku zwinęłaby się do zera
const WORD = COMPANY.brand.replace(/ /g, '\u00a0');

// to – trasa (Link; „/#sekcja” prowadzi do sekcji strony głównej), href – adres zewnętrzny (mailto:).
const COLUMNS = [
  {
    title: 'Oferta',
    links: [
      { to: ROUTES.furniture, label: 'Meble na wymiar' },
      { to: ROUTES.b2b, label: 'Usługi B2B' },
      { to: ROUTES.quote, label: 'Wycena online' },
      ...(FEATURES.configurator
        ? [
            { to: '/konfigurator/kuchnia', label: 'Konfigurator kuchni' },
            { to: '/konfigurator/szafa', label: 'Konfigurator szafy' },
          ]
        : []),
    ],
  },
  {
    title: 'Firma',
    links: [
      { to: ROUTES.about, label: 'O nas' },
      { to: '/#jak-to-dziala', label: 'Jak pracujemy' },
      { to: '/#faq', label: 'FAQ' },
      { to: ROUTES.contact, label: 'Kontakt' },
    ],
  },
  {
    title: 'Informacje',
    links: [
      { to: ROUTES.quoteB2B, label: 'Zapytanie B2B' },
      { to: ROUTES.privacy, label: 'Polityka prywatności' },
      ...(FEATURES.accounts
        ? [
            { to: '/logowanie', label: 'Zaloguj się' },
            { to: '/projekty', label: 'Moje projekty' },
          ]
        : []),
    ],
  },
];

// Link stopki: na stronie głównej sekcje „/#…” jako zwykła kotwica (płynne przewinięcie), poza nią – Link.
function FootLink({ to, href, children, onHome }) {
  if (href) {
    return (
      <a className="h-foot-link" href={href}>
        {children}
      </a>
    );
  }
  if (onHome && to.startsWith('/#')) {
    return (
      <a className="h-foot-link" href={to.slice(1)}>
        {children}
      </a>
    );
  }
  return (
    <Link className="h-foot-link" to={to}>
      {children}
    </Link>
  );
}

// Wordmark wypełnia kontener: font-size = 100cqi / (szerokość słowa w em). Domyślny współczynnik w CSS
// policzono z metryk Inter Tight 650; tu mierzymy go po wczytaniu fontów – gdyby przeglądarka użyła
// innego kroju (np. zablokowane fonty), słowo i tak zmieści się w kontenerze. Współczynnik nie zależy
// od szerokości ekranu, więc wystarczy pomiar po załadowaniu fontów (bez ResizeObservera).
function useWordmarkFit(markRef, wordRef) {
  useEffect(() => {
    const mark = markRef.current;
    const word = wordRef.current;
    if (!mark || !word) return undefined;
    const fonts = document.fonts;
    let alive = true;
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (!alive) return;
      const size = parseFloat(getComputedStyle(word).fontSize);
      const width = word.getBoundingClientRect().width;
      if (size > 0 && width > 0) mark.style.setProperty('--foot-fit', (width / size + 0.004).toFixed(4));
    };
    const schedule = () => {
      if (alive && !raf) raf = requestAnimationFrame(measure);
    };
    schedule();
    fonts?.ready?.then(schedule);
    fonts?.addEventListener?.('loadingdone', schedule);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, [markRef, wordRef]);
}

function Wordmark() {
  const markRef = useRef(null);
  const wordRef = useRef(null);
  const reduced = useReducedMotion();
  const inView = useInView(markRef, { rootMargin: '0px', threshold: 0.25 });
  const [settled, setSettled] = useState(false);
  useWordmarkFit(markRef, wordRef);

  // Po wjeździe liter zdejmujemy opóźnienia staggeru, żeby hover (lekkie uniesienie litery) reagował od razu.
  useEffect(() => {
    if (!inView || reduced) return undefined;
    const t = setTimeout(() => setSettled(true), 1300 + WORD.length * 60);
    return () => clearTimeout(t);
  }, [inView, reduced]);

  return (
    <div className="h-foot-brand">
      <div
        ref={markRef}
        className={`h-foot-mark${inView ? ' is-in' : ''}${settled ? ' is-settled' : ''}`}
        aria-hidden="true"
      >
        <span ref={wordRef} className="h-foot-word">
          {WORD.split('').map((ch, i) => (
            <span key={i} className="h-foot-char" style={{ '--foot-i': i }}>
              {ch}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function Footer() {
  const onHome = useLocation().pathname === '/';
  const year = new Date().getFullYear();
  return (
    <footer className="h-foot-root">
      <div className="h-container">
        <div className="h-foot-top">
          {/* hasło firmy z tekstów właścicielki */}
          <MaskLines as="p" className="h-foot-claim" lines={['Doświadczenie, ', 'które widać ', 'w\u00a0detalach.']} />
          <Reveal as="p" className="h-foot-intro" delay={200}>
            Meble na wymiar dla klientów indywidualnych i&nbsp;firm oraz usługi stolarskie: cięcie, oklejanie, nawiercanie,
            frezowanie i&nbsp;gięcie. Działamy na Śląsku i&nbsp;w&nbsp;Wielkopolsce.
          </Reveal>
        </div>

        <div className="h-foot-grid">
          <nav className="h-foot-nav" aria-label="Na skróty">
            {COLUMNS.map((col, i) => (
              <Reveal key={col.title} className="h-foot-col" delay={i * 80} y={18}>
                <h2 className="h-foot-heading">{col.title}</h2>
                <ul className="h-foot-list">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <FootLink to={l.to} href={l.href} onHome={onHome}>
                        {l.label}
                      </FootLink>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </nav>

          <Reveal className="h-foot-col" delay={COLUMNS.length * 80} y={18}>
            <h2 className="h-foot-heading">Kontakt</h2>
            <address className="h-foot-address">
              <a className="h-foot-link" href={COMPANY.phoneHref}>
                {COMPANY.phone}
              </a>
              <a className="h-foot-link" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
              <a className="h-foot-link" href={`mailto:${COMPANY.emailB2B}`}>
                {COMPANY.emailB2B} <span className="h-foot-tag">B2B</span>
              </a>
              {COMPANY.locations.map((loc) => (
                <span key={loc.id}>
                  {loc.street}
                  <br />
                  {loc.postal} {loc.city}
                </span>
              ))}
              <span>Godziny kontaktu: {COMPANY.hours}</span>
            </address>
          </Reveal>
        </div>

        <div className="h-foot-legal">
          <p className="h-foot-copy">
            {/* twarde spacje: „sp. z o.o.” i numer NIP nie łamią się między wierszami */}
            © {year} {COMPANY.brand} · {COMPANY.legalName.replace(/ /g, '\u00a0')} · <span className="h-foot-nowrap">NIP {COMPANY.nip}</span>
          </p>
          {/* Konta testowe z seeda (server/db.js) – tylko w trybie deweloperskim (npm run dev); w buildzie
              produkcyjnym import.meta.env.DEV = false i blok nie trafia do paczki. W produkcji konto panelu
              zakłada się zmiennymi ADMIN_EMAIL i ADMIN_PASSWORD (README). */}
          {import.meta.env.DEV && (
            <p className="h-foot-demo">
              <span className="h-foot-demo-label">Konta demo:</span>
              {FEATURES.accounts ? ' klient@demo.pl / demo123 ·' : ''} panel: admin@stolarnia.pl / admin123
            </p>
          )}
        </div>

        <Wordmark />
      </div>
    </footer>
  );
}
