import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { COMPANY, FEATURES, ROUTES } from '../../shared/site.js';
import '../pages/home/nav.css';

// Miniatury w wariancie 480 px (karty mają ok. 170–340 px szerokości) zamiast renderów 1600 px.
const OFFER = {
  title: 'Oferta',
  items: [
    { to: ROUTES.furniture, label: 'Meble na wymiar', note: 'Kuchnie, szafy, garderoby i zabudowy', img: '/renders/kuchnia-szalwia-480.jpg' },
    { to: ROUTES.b2b, label: 'Usługi B2B', note: 'Cięcie, oklejanie, nawiercanie, frezowanie, gięcie', img: '/renders/detal-480.jpg' },
    { to: ROUTES.quote, label: 'Wycena online', note: 'Opis, wymiary i zdjęcia w jednym zapytaniu', img: '/renders/szafa-dab-480.jpg' },
  ],
};
const CONFIGURATORS = {
  title: 'Konfiguratory 3D',
  items: [
    { to: '/konfigurator/kuchnia', label: 'Kuchnia na wymiar', note: 'Układ I lub L, 10 typów szafek', img: '/renders/kuchnia-szalwia-480.jpg' },
    { to: '/konfigurator/szafa', label: 'Szafa na wymiar', note: 'Drzwi przesuwne lub uchylne', img: '/renders/szafa-dab-480.jpg' },
    { to: '/konfigurator/szafa', label: 'Garderoba', note: 'Otwarte wnętrze sekcja po sekcji', img: '/renders/garderoba-480.jpg' },
  ],
};
// w pełnej wersji (z konfiguratorami) panel ma dwie kolumny: konfiguratory i oferta bez powtórzonych mebli
const MENU = FEATURES.configurator ? [CONFIGURATORS, { ...OFFER, items: OFFER.items.slice(1) }] : [OFFER];

const LINKS = [
  { to: ROUTES.b2b, label: 'Usługi B2B' },
  { to: ROUTES.about, label: 'O nas' },
  { to: '/#jak-to-dziala', label: 'Jak pracujemy' },
  { to: ROUTES.contact, label: 'Kontakt' },
];

const CTA = FEATURES.configurator
  ? { to: '/konfigurator/kuchnia', label: 'Zaprojektuj', long: 'Zaprojektuj swój mebel' }
  : { to: ROUTES.quote, label: 'Zapytaj o wycenę', long: 'Zapytaj o wycenę' };

// Link do sekcji strony głównej („/#o-nas”): na samej stronie głównej zwykła kotwica (płynne przewinięcie
// przeglądarki, działa też przy ponownym kliknięciu), z podstron – przejście na stronę główną do sekcji.
function NavTo({ to, onHome, children, ...rest }) {
  if (onHome && to.startsWith('/#')) {
    return (
      <a href={to.slice(1)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}

// Szerokość, od której widać „pigułkę” (poniżej – menu mobilne); dokładne dopełnienie progów max-width z nav.css.
// Zalogowany ma w pigułce jeszcze „Wyloguj” (ok. 970 px całości), więc u niego burger do 1040 px.
const WIDE = 'not all and (max-width: 900px)';
const WIDE_USER = 'not all and (max-width: 1040px)';

export default function HomeNav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [past, setPast] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const headerRef = useRef(null);
  const menuRef = useRef(null); // przycisk „Konfiguratory” + jego panel
  const triggerRef = useRef(null);
  const burgerRef = useRef(null);
  const sheetRef = useRef(null);
  const closeTimer = useRef(0);
  const openedByHover = useRef(false);

  // Jasny wariant paska, gdy dół hero (albo jego zastępczego tła przed wczytaniem strony) schowa się pod paskiem.
  // Liczone z rzeczywistej wysokości hero (ma min/max wysokość, a na telefonie innerHeight ≠ svh).
  useEffect(() => {
    let hero = null;
    const update = () => {
      if (!hero?.isConnected) hero = document.querySelector('.h-hero, .home-fallback');
      setPast(hero ? hero.getBoundingClientRect().bottom <= 90 : true);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // podmiana zastępczego tła na stronę (albo na komunikat błędu) zmienia dokument bez przewijania
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  // każda nawigacja (kotwica, logo, „Wstecz”) zamyka panel i menu mobilne
  useEffect(() => {
    setMega(false);
    setMobile(false);
  }, [location]);

  // Escape zamyka i oddaje fokus przyciskowi, który otworzył panel/menu (inaczej fokus spada na <body>)
  useEffect(() => {
    if (!mega && !mobile) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (mega) {
        const inside = menuRef.current?.contains(document.activeElement);
        setMega(false);
        if (inside) triggerRef.current?.focus();
      }
      if (mobile) {
        setMobile(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mega, mobile]);

  // otwarty panel zamyka kliknięcie/dotknięcie poza nim
  useEffect(() => {
    if (!mega) {
      openedByHover.current = false;
      return undefined;
    }
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMega(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [mega]);

  // Menu mobilne zasłania całą stronę: reszta dokumentu jest wtedy nieaktywna (inert – poza Tab i czytnikiem
  // ekranu) i nie przewija się, a fokus przechodzi na pierwszy link menu.
  useEffect(() => {
    if (!mobile) return undefined;
    const header = headerRef.current;
    const covered = [...(header?.parentElement?.children ?? [])].filter((el) => el !== header && !el.hasAttribute('inert'));
    covered.forEach((el) => el.setAttribute('inert', ''));
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    sheetRef.current?.querySelector('a')?.focus({ preventScroll: true });
    return () => {
      covered.forEach((el) => el.removeAttribute('inert'));
      html.style.overflow = '';
    };
  }, [mobile]);

  // Menu mobilne i panel znikają razem ze swoim układem (obrót tabletu, zmiana szerokości okna) – inaczej
  // arkusz bez widocznego przycisku zamykania zostałby na ekranie razem z blokadą przewijania.
  const wideQuery = user ? WIDE_USER : WIDE;
  useEffect(() => {
    const mq = window.matchMedia(wideQuery);
    const sync = () => (mq.matches ? setMobile(false) : setMega(false));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [wideQuery]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openMega = () => {
    clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(false), 160);
  };
  const closeAll = () => {
    setMega(false);
    setMobile(false);
  };

  const userLink = user ? (user.role === 'admin' ? '/admin' : '/projekty') : '/logowanie';
  const showAccount = FEATURES.accounts || Boolean(user); // w wizytówce ikona konta tylko dla zalogowanego (panel)
  // adres bez końcowego ukośnika i wielkich liter (router traktuje /Kontakt/ jak /kontakt) – jak w App.jsx
  const path = location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  const onHome = path === '/';

  // Logo na stronie głównej bez kotwicy prowadzi pod ten sam adres – router nie zmienia wtedy ani strony, ani
  // przewinięcia, więc na górę wracamy sami (płynnie, chyba że ktoś ograniczył animacje w systemie). Klatkę później,
  // gdy zamknięte menu mobilne zdejmie już blokadę przewijania dokumentu.
  const onLogo = () => {
    closeAll();
    if (!onHome || location.hash) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  };

  return (
    <header
      ref={headerRef}
      className={`hnav ${past ? 'is-past' : ''} ${mega ? 'is-mega' : ''} ${mobile ? 'is-mobile' : ''} ${user ? 'has-user' : ''}`}
    >
      {/* pierwszy przystanek Tab: przeskok nad nawigacją do treści (hero z nagłówkiem h1 jest w <main>) */}
      <a className="hnav__skip" href="#tresc" onClick={closeAll}>
        Przejdź do treści
      </a>

      <div className="hnav__bar">
        <Link to="/" className="hnav__logo" aria-label={`${COMPANY.brand} – strona główna`} onClick={onLogo}>
          <svg className="hnav__mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" />
            <path d="M9 22V10h14v12M9 16h14M16 10v12" stroke="var(--hnav-mark-ink)" strokeWidth="2.2" fill="none" />
          </svg>
          <span className="hnav__word">{COMPANY.brand}</span>
        </Link>

        <nav className="hnav__pill" aria-label="Główna nawigacja">
          {/* Panel jest w DOM tuż za przyciskiem: Tab idzie przycisk → karty → reszta menu, a wyjście fokusem
              poza przycisk i panel zamyka panel. Wizualnie panel leży pod paskiem na całą szerokość (nav.css). */}
          <div
            ref={menuRef}
            className="hnav__menu"
            onPointerEnter={() => clearTimeout(closeTimer.current)}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') closeMegaSoon();
            }}
            onBlur={(e) => {
              if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setMega(false);
            }}
          >
            <button
              ref={triggerRef}
              type="button"
              className={`hnav__item hnav__item--menu ${mega ? 'is-active' : ''}`}
              aria-expanded={mega}
              aria-controls="hnav-mega"
              onPointerEnter={(e) => {
                // najechanie otwiera tylko myszą – dotyk emuluje najechanie, a zaraz po nim klik zamykałby panel
                if (e.pointerType !== 'mouse') return;
                if (!mega) openedByHover.current = true;
                openMega();
              }}
              onClick={() => {
                // klik po otwarciu najechaniem zostawia panel otwarty; poza tym klik, Enter i Spacja przełączają
                if (openedByHover.current) {
                  openedByHover.current = false;
                  openMega();
                } else {
                  setMega((m) => !m);
                }
              }}
            >
              Oferta
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </button>

            <div id="hnav-mega" className="hnav__mega" hidden={!mega}>
              <div className="hnav__mega-inner">
                {MENU.map((col) => (
                  <div key={col.title} className="hnav__mega-col">
                    <span className="hnav__mega-title">{col.title}</span>
                    <div className="hnav__mega-cards">
                      {col.items.map((it) => (
                        <NavTo key={it.label} to={it.to} onHome={onHome} className="hnav__card" onClick={() => setMega(false)}>
                          <span className="hnav__card-img" style={{ backgroundImage: `url(${it.img})` }} />
                          <span className="hnav__card-label">{it.label}</span>
                          <span className="hnav__card-note">{it.note}</span>
                        </NavTo>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="hnav__mega-aside">
                  {FEATURES.configurator ? (
                    <>
                      <span className="hnav__mega-title">Nie wiesz, od czego zacząć?</span>
                      <p>Wybierz gotowy zestaw kolorów w konfiguratorze i zmieniaj go dowolnie. Cenę orientacyjną widzisz od razu.</p>
                      <NavTo to="/#jak-to-dziala" onHome={onHome} className="hnav__mega-link" onClick={() => setMega(false)}>
                        Zobacz, jak to działa →
                      </NavTo>
                    </>
                  ) : (
                    <>
                      <span className="hnav__mega-title">Chcesz porozmawiać o swoim projekcie?</span>
                      <p>Opowiedz nam, czego potrzebujesz – wspólnie poszukamy odpowiednich rozwiązań.</p>
                      <Link to={ROUTES.quote} className="hnav__mega-link" onClick={() => setMega(false)}>
                        Zapytaj o wycenę →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {LINKS.map((l) => (
            <NavTo
              key={l.to}
              to={l.to}
              onHome={onHome}
              className={`hnav__item${path === l.to ? ' is-active' : ''}`}
              aria-current={path === l.to ? 'page' : undefined}
            >
              {l.label}
            </NavTo>
          ))}
          <span className="hnav__sep" aria-hidden="true" />
          {showAccount && (
          <Link className="hnav__icon" to={userLink} aria-label={user ? 'Moje konto' : 'Zaloguj się'} title={user ? user.name : 'Zaloguj się'}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="7" r="3.4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 17c.9-3 3.4-4.6 6.5-4.6s5.6 1.6 6.5 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          )}
          {user && (
            <button
              type="button"
              className="hnav__item hnav__item--quiet"
              onClick={async () => {
                await logout();
                nav('/');
              }}
            >
              Wyloguj
            </button>
          )}
          <Link className="hnav__cta" to={CTA.to}>
            {CTA.label}
          </Link>
        </nav>

        <button
          ref={burgerRef}
          type="button"
          className="hnav__burger"
          aria-label={mobile ? 'Zamknij menu' : 'Otwórz menu'}
          aria-expanded={mobile}
          aria-controls="hnav-sheet"
          onClick={() => setMobile((m) => !m)}
        >
          <span />
          <span />
        </button>
      </div>

      <div id="hnav-sheet" ref={sheetRef} className="hnav__sheet" hidden={!mobile}>
        <nav className="hnav__sheet-links" aria-label="Menu mobilne">
          {FEATURES.configurator && (
            <>
              <Link to="/konfigurator/kuchnia" onClick={() => setMobile(false)}>
                Kuchnia na wymiar 3D
              </Link>
              <Link to="/konfigurator/szafa" onClick={() => setMobile(false)}>
                Szafa i garderoba 3D
              </Link>
            </>
          )}
          <NavTo to={ROUTES.furniture} onHome={onHome} onClick={() => setMobile(false)}>
            Meble na wymiar
          </NavTo>
          {LINKS.map((l) => (
            <NavTo key={l.to} to={l.to} onHome={onHome} onClick={() => setMobile(false)}>
              {l.label}
            </NavTo>
          ))}
          {showAccount && (
            <Link to={userLink} onClick={() => setMobile(false)}>
              {user ? (user.role === 'admin' ? 'Panel' : 'Moje konto') : 'Zaloguj się'}
            </Link>
          )}
        </nav>
        <Link className="hnav__sheet-cta" to={CTA.to} onClick={() => setMobile(false)}>
          {CTA.long}
        </Link>
      </div>
    </header>
  );
}
