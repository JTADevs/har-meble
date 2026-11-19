// TrustBar – wąski pasek konkretów pod ciemną sekcją kategorii.
// Desktop: 5 równych pól w rzędzie. Telefon/tablet (<900 px): płynne marquee z CSS (lista zduplikowana,
// translateX(-50%)), które staje po najechaniu myszą, poza ekranem i – na stałe – przyciskiem pauzy
// na końcu paska (WCAG 2.2.2, jak w próbniku dekorów). Ograniczony ruch: zwykły poziomy scroll bez przycisku.
import { Fragment, useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from '../ui.jsx';
import './trustbar.css';

const MOBILE_QUERY = '(max-width: 899.98px)';

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

// --- ikony liniowe 24 px, kreska 1.5, kolor z currentColor -------------------------
function Icon({ children }) {
  return (
    <svg
      className="h-trust-icon"
      width="24"
      height="24"
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

// pinezka mapy – regiony działania
const IconPin = () => (
  <Icon>
    <path d="M12 21s-6.75-5.9-6.75-11.1a6.75 6.75 0 0 1 13.5 0C18.75 15.1 12 21 12 21Z" />
    <circle cx="12" cy="9.9" r="2.4" />
  </Icon>
);
// dwie osoby – klienci indywidualni i firmy
const IconPeople = () => (
  <Icon>
    <circle cx="9" cy="8.25" r="3" />
    <path d="M3.25 19.5c.6-3.1 2.85-4.9 5.75-4.9s5.15 1.8 5.75 4.9" />
    <path d="M15.25 5.6a3 3 0 0 1 0 5.3M17.25 14.85c1.9.55 3.15 2.15 3.5 4.65" />
  </Icon>
);
// warsztat z szedowym dachem i kominem
const IconWorkshop = () => (
  <Icon>
    <path d="M3.25 20.25V10l5 3v-3l5 3v-3l5 3V4.75h2.5v15.5" />
    <path d="M2 20.25h20" />
    <path d="M6.5 20.25v-3.75h3v3.75" />
    <rect x="12.75" y="16" width="4" height="2.25" rx=".5" />
  </Icon>
);

// wkrętarka
const IconDrill = () => (
  <Icon>
    <path d="M4.75 5.75h9.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M15.75 7.25h2v2.5h-2M17.75 8.5h3" />
    <path d="M7.5 11.25 6.75 17.5M11.25 11.25l-.75 6.25" />
    <rect x="4.75" y="17.5" width="8" height="3" rx="1" />
  </Icon>
);

// miarka zwijana
const IconTape = () => (
  <Icon>
    <rect x="2.75" y="6.25" width="12.5" height="12.5" rx="3.5" />
    <circle cx="9" cy="12.5" r="2.75" />
    <path d="M15.25 15.75h6M15.25 18.75h6M21.25 14.75v5M18 15.75V17M19.75 15.75V17" />
  </Icon>
);

// lines: miejsca łamania na desktopie (dwie linie o podobnej długości); na marquee – jedna linia.
// Same fakty z tekstów właścicielki: ok. 11 lat, dwa regiony, klienci indywidualni i firmy, usługi B2B,
// cena potwierdzana po uzgodnieniu szczegółów i weryfikacji wymiarów.
const ITEMS = [
  { lines: ['Około 11\u00a0lat', 'w\u00a0stolarstwie'], Icon: IconWorkshop },
  { lines: ['Śląsk', 'i\u00a0Wielkopolska'], Icon: IconPin },
  { lines: ['Klienci indywidualni', 'i\u00a0firmy'], Icon: IconPeople },
  { lines: ['Cięcie, frezowanie', 'i\u00a0gięcie'], Icon: IconDrill },
  { lines: ['Cena po weryfikacji', 'wymiarów'], Icon: IconTape },
];

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

function TrustList({ clone = false }) {
  return (
    <ul className={`h-trust-list${clone ? ' h-trust-list--clone' : ''}`} aria-hidden={clone ? 'true' : undefined}>
      {ITEMS.map(({ lines, Icon: ItemIcon }, i) => (
        <li key={lines.join(' ')} className="h-trust-item" style={{ '--i': i }}>
          <ItemIcon />
          <span className="h-trust-label">
            {lines.map((line, k) => (
              <Fragment key={line}>
                {k > 0 && ' '}
                <span className="h-trust-line">{line}</span>
              </Fragment>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TrustBar() {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const appeared = useInView(viewportRef);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const moving = isMobile && !reduced; // pasek przesuwa się tylko na telefonie/tablecie i bez ograniczonego ruchu

  // Marquee poza ekranem stoi – atrybut ustawiany wprost na DOM, bez re-renderu.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => el.toggleAttribute('data-offscreen', !entry.isIntersecting), {
      rootMargin: '80px 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-offscreen');
    };
  }, []);

  // Ograniczony ruch na telefonie: pasek jest statyczny i przewijany palcem – fokus (Tab) pozwala przewijać go strzałkami.
  // Przy marquee nie dokładamy przystanku Tab na samym pasku – ruch zatrzymuje przycisk pauzy.
  const scrollProps = isMobile && reduced ? { tabIndex: 0, role: 'group', 'aria-labelledby': 'h-trust-title' } : {};

  return (
    <section ref={sectionRef} className="h-trust-section" data-paused={moving && paused ? '' : undefined}>
      <h2 id="h-trust-title" className="h-visually-hidden">
        Co zyskujesz, zamawiając u nas
      </h2>
      <div className="h-container h-trust-container">
        <div ref={viewportRef} className={`h-trust-viewport${appeared ? ' is-in' : ''}`} {...scrollProps}>
          <div className="h-trust-track">
            <TrustList />
            <TrustList clone />
          </div>
        </div>
        {moving && (
          <button
            type="button"
            className="h-trust-toggle"
            aria-label={paused ? 'Wznów przesuwanie paska' : 'Zatrzymaj przesuwanie paska'}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        )}
      </div>
    </section>
  );
}
