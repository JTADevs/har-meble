import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, matchPath, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AuthProvider, RequireAuth, useAuth } from './auth.jsx';
import { Toaster } from './components/ui.jsx';
import HomeNav from './components/HomeNav.jsx';
import { COMPANY, FEATURES, ROUTES } from '../shared/site.js';

// Każda podstrona to osobny plik JS – strona główna nie ładuje konfiguratora, a konfigurator strony głównej.
const HomePage = lazy(() => import('./pages/home/HomePage.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const KitchenPage = lazy(() => import('./pages/KitchenPage.jsx'));
const WardrobePage = lazy(() => import('./pages/WardrobePage.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const B2BPage = lazy(() => import('./pages/site/B2BPage.jsx'));
const QuotePage = lazy(() => import('./pages/site/QuotePage.jsx'));
const ContactPage = lazy(() => import('./pages/site/ContactPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/site/PrivacyPage.jsx'));
const StudioPage = import.meta.env.DEV ? lazy(() => import('./pages/StudioPage.jsx')) : null;
const FilmExportPage = import.meta.env.DEV ? lazy(() => import('./pages/FilmExportPage.jsx')) : null;

// Podstrony wizytówki – ta sama nawigacja i system projektowy co strona główna (HomeNav + .h-page).
const SITE_PAGES = [
  [ROUTES.b2b, B2BPage, `Usługi B2B dla stolarni i firm – cięcie, oklejanie, frezowanie, gięcie – ${COMPANY.brand}`],
  [ROUTES.quote, QuotePage, `Wycena online mebli na wymiar i usług B2B – ${COMPANY.brand}`],
  [ROUTES.contact, ContactPage, `Kontakt – Katowice i Wielkopolska – ${COMPANY.brand}`],
  [ROUTES.privacy, PrivacyPage, `Polityka prywatności – ${COMPANY.brand}`],
];
const SITE_PATHS = new Set(['/', ...SITE_PAGES.map(([path]) => path)]);

// Tytuły kart dla tras (pierwszy pasujący wzorzec); reszta to strona „Nie znaleziono”.
const brand = (title) => `${title} – ${COMPANY.brand}`;
const TITLES = [
  ['/', `${COMPANY.brand} – meble na wymiar i usługi stolarskie · Śląsk i Wielkopolska`],
  ...SITE_PAGES.map(([path, , title]) => [path, title]),
  ...(FEATURES.configurator
    ? [
        ['/konfigurator/kuchnia/:id?', brand('Konfigurator kuchni')],
        ['/konfigurator/szafa/:id?', brand('Konfigurator szafy')],
      ]
    : []),
  ['/logowanie', brand('Logowanie')],
  ...(FEATURES.accounts
    ? [
        ['/rejestracja', brand('Rejestracja')],
        ['/projekty', brand('Moje projekty')],
      ]
    : []),
  ['/admin', brand('Panel')],
  ...(StudioPage ? [['/studio', brand('Studio renderów')]] : []),
  ...(FilmExportPage ? [['/studio/film', brand('Eksport filmu')]] : []),
];

const titleFor = (pathname) => TITLES.find(([pattern]) => matchPath(pattern, pathname))?.[1] ?? brand('Nie znaleziono strony');

// Ukryte wizualnie, ale dostępne dla czytników ekranu (globalne style nie mają takiej klasy).
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

// Natychmiastowe przewinięcie z pominięciem `scroll-behavior: smooth` strony głównej (nav.css) – bez animowanego
// przejazdu przez całą stronę, który po drodze odpalałby odsłanianie sekcji i leniwe 3D.
function instantly(scroll) {
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  scroll();
  html.style.scrollBehavior = prev;
}

// Pozycje przewinięcia wpisów historii (tylko w pamięci karty) – „Wstecz” wraca tam, skąd się wyszło.
const scrollPositions = new Map();

// Wejście z innej podstrony na sekcję (/#o-nas): fokus na sekcji, żeby Tab i czytnik ekranu zaczynały od niej – jak
// po zwykłym przejściu do kotwicy (inaczej zostają na początku dokumentu). Sekcja dostaje tabindex="-1" tylko na czas
// fokusu. Fokus zabieramy wyłącznie z <body> albo z ogłoszenia tytułu strony – nie temu, kto w trakcie wczytywania
// strony przeszedł już Tabem dalej.
function focusAnchor(el, announcer) {
  const active = document.activeElement;
  if (active && active !== document.body && active !== announcer) return;
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    el.setAttribute('data-anchor-focus', ''); // styles.css: bez obwódki wokół całej sekcji (fokus z kodu)
    el.addEventListener(
      'blur',
      () => {
        el.removeAttribute('tabindex');
        el.removeAttribute('data-anchor-focus');
      },
      { once: true },
    );
  }
  el.focus({ preventScroll: true });
}

// Przewijanie przy zmianie strony:
// - „Wstecz”/„Dalej” na inną podstronę przywraca zapamiętaną pozycję,
// - kotwica (np. /#kontakt po F5 albo wejściu z zewnątrz) przewija do sekcji także wtedy, gdy leniwa strona
//   jeszcze się wczytuje (element szukany w kolejnych klatkach zamiast przewijania na górę); po wejściu z innej
//   strony sekcja dostaje też fokus,
// - nowa podstrona startuje od góry.
function ScrollManager({ announcerRef }) {
  const { pathname, search, hash, key } = useLocation();
  const navType = useNavigationType();
  const entry = `${key}|${pathname}${search}${hash}`;
  const entryRef = useRef(entry);
  const prevPath = useRef(null);

  // wpis historii, do którego należy bieżące przewinięcie (aktualizowany w commicie, przed zdarzeniami scroll)
  useLayoutEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const onScroll = () => scrollPositions.set(entryRef.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const samePage = prevPath.current === pathname;
    prevPath.current = pathname;
    const saved = navType === 'POP' && !samePage ? scrollPositions.get(entry) : undefined;
    const started = performance.now();
    let raf = 0;

    if (saved !== undefined) {
      // strona może jeszcze rosnąć (obrazy, leniwe sekcje) – ponawiaj, aż da się dojechać do zapamiętanej pozycji
      const restore = () => {
        instantly(() => window.scrollTo(0, saved));
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max < saved && performance.now() - started < 1500) raf = requestAnimationFrame(restore);
      };
      restore();
    } else if (hash) {
      let id = hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* niepoprawne kodowanie – szukamy surowego id */
      }
      const toAnchor = () => {
        const el = document.getElementById(id);
        if (el) {
          // na tej samej stronie płynnie (jak zwykła kotwica – fokus przenosi sama przeglądarka), po wejściu na stronę –
          // od razu i z fokusem (ten efekt działa po RouteAnnouncer, więc fokus zostaje na sekcji)
          if (samePage) el.scrollIntoView();
          else {
            instantly(() => el.scrollIntoView());
            focusAnchor(el, announcerRef.current);
          }
        } else if (performance.now() - started < 10000) {
          raf = requestAnimationFrame(toAnchor);
        }
      };
      toAnchor();
    } else if (samePage) {
      window.scrollTo(0, 0);
    } else {
      instantly(() => window.scrollTo(0, 0));
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagujemy na zmianę strony lub kotwicy (nie na samo ?query)
  }, [pathname, hash]);

  return null;
}

// Tytuł karty dla każdej trasy. Po przejściu na inną podstronę fokus trafia na ukryty akapit z nazwą strony
// na początku dokumentu: czytnik ekranu ją odczyta, a Tab zaczyna od nawigacji – jak po zwykłym wczytaniu strony
// (inaczej fokus zostaje na znikniętym linku, czyli na <body>). Pierwsze wejście ogłasza sama przeglądarka.
// Przy wejściu na sekcję (/#o-nas) fokus przejmuje potem sekcja (ScrollManager).
function RouteAnnouncer({ announcerRef }) {
  const { pathname } = useLocation();
  const title = titleFor(pathname);
  const mounted = useRef(false);

  useEffect(() => {
    document.title = title;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const el = announcerRef.current;
    if (!el) return;
    el.textContent = title;
    el.focus({ preventScroll: true });
  }, [title, announcerRef]);

  return <p ref={announcerRef} tabIndex={-1} style={VISUALLY_HIDDEN} />;
}

// Błąd wczytania pliku podstrony: zwykle stara karta po nowym wdrożeniu (pliki w /assets mają nowe nazwy)
// albo zerwane połączenie. Komunikaty: Chrome/Edge, Firefox, Safari, preload CSS z Vite.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;
const RELOAD_KEY = 'stolarnia:odswiezenie-po-bledzie-modulu'; // klucz techniczny – bez zmiany przy nowej marce

const isChunkError = (error) => CHUNK_ERROR.test(String(error?.message ?? error));

// Jedno automatyczne odświeżenie (wczytuje aktualną wersję strony). Ponowny błąd w ciągu 10 s albo brak
// sessionStorage – bez automatu (żadnej pętli przeładowań), zostaje komunikat z przyciskiem „Odśwież”.
function reloadOnce() {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0;
    if (Date.now() - last < 10000) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Granica błędów podstron: błąd ładowania albo renderu strony nie zostawia białego ekranu – nawigacja zostaje,
// a w miejscu strony jest komunikat z przyciskiem „Odśwież”. Zmiana trasy czyści błąd. Komunikat zastępuje stronę
// razem z jej <main> (i h1), więc ma własne.
class RouteErrorBoundary extends Component {
  state = { error: null, reloading: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error, reloading: isChunkError(error) };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey === state.resetKey ? null : { error: null, reloading: false, resetKey: props.resetKey };
  }

  componentDidCatch(error) {
    console.error('Nie udało się wyświetlić strony:', error);
    if (isChunkError(error) && !reloadOnce()) this.setState({ reloading: false });
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;
    if (reloading) return <div className="page-loading">Wczytywanie aktualnej wersji strony…</div>;
    const chunk = isChunkError(error);
    return (
      <main id="tresc" className={`page narrow route-error ${this.props.home ? 'route-error--home' : ''}`}>
        <div role="alert">
          <h1>Nie udało się wczytać strony</h1>
          <p>
            {chunk
              ? 'Nie udało się pobrać plików strony. Sprawdź połączenie z internetem i odśwież stronę.'
              : 'Wystąpił nieoczekiwany błąd. Odśwież stronę – jeśli to nie pomoże, spróbuj ponownie za chwilę.'}
          </p>
        </div>
        <div className="row-gap route-error__actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Odśwież
          </button>
          {!this.props.home && (
            <Link className="btn" to="/">
              Strona główna
            </Link>
          )}
        </div>
      </main>
    );
  }
}

// Pasek stron „aplikacji” (logowanie, panel, konfiguratory w pełnej wersji) – strony wizytówki mają HomeNav.
function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="navbar">
      <Link to="/" className="logo">
        <span className="logo-mark" aria-hidden="true" />
        <span>{COMPANY.brand}</span>
      </Link>
      <nav className="nav-links">
        {FEATURES.configurator ? (
          <>
            <NavLink to="/konfigurator/kuchnia">Kuchnia</NavLink>
            <NavLink to="/konfigurator/szafa">Szafa</NavLink>
          </>
        ) : (
          <NavLink to="/" end>
            Strona główna
          </NavLink>
        )}
        {user && FEATURES.accounts && <NavLink to="/projekty">Moje projekty</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Panel</NavLink>}
      </nav>
      <div className="nav-user">
        {user ? (
          <>
            <span className="user-chip" title={user.email}>
              {user.name}
            </span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={async () => {
                await logout();
                nav('/');
              }}
            >
              Wyloguj
            </button>
          </>
        ) : (
          // w wizytówce bez kont klientów logowanie służy tylko firmie (panel) – firma wchodzi na /logowanie
          // bezpośrednio, a publiczne strony (np. 404) nie pokazują wejścia do ukrytego panelu
          FEATURES.accounts && (
            <>
              <Link className="btn btn-sm btn-ghost" to="/logowanie">
                Zaloguj
              </Link>
              <Link className="btn btn-sm btn-primary" to="/rejestracja">
                Załóż konto
              </Link>
            </>
          )
        )}
      </div>
    </header>
  );
}

// Strony „aplikacji” (logowanie, panel, 404) – główny punkt orientacyjny strony dla czytników ekranu. Podstrony
// wizytówki (PageShell, HomePage) i konfiguratory (Viewport) mają własny <main>. Wewnątrz elementu trasy, a nie wokół
// <Routes>: zmiana struktury drzewa przy przejściu wizytówka ↔ aplikacja przemontowałaby granicę Suspense (zamiast
// starej strony do czasu wczytania nowej mignąłby ekran „Ładowanie…”).
function AppMain({ children }) {
  return <main id="tresc">{children}</main>;
}

// Adres bez końcowych ukośników i wielkich liter: router dopasowuje /kontakt/ i /Kontakt do tej samej trasy,
// więc nawigacja i wygląd też muszą być te same.
const normalizePath = (pathname) => pathname.replace(/\/+$/, '').toLowerCase() || '/';

function Shell() {
  const { pathname } = useLocation();
  const normalized = normalizePath(pathname);
  const isHome = normalized === '/';
  const isSite = SITE_PATHS.has(normalized);
  const announcerRef = useRef(null);
  return (
    <>
      <RouteAnnouncer announcerRef={announcerRef} />
      {isSite ? <HomeNav /> : <Navbar />}
      <ScrollManager announcerRef={announcerRef} />
      <RouteErrorBoundary resetKey={pathname} home={isSite}>
        <Suspense
          fallback={
            isHome ? (
              <div className="home-fallback" aria-hidden="true" />
            ) : isSite ? (
              <div className="site-fallback" aria-hidden="true" />
            ) : (
              <div className="page-loading">Ładowanie…</div>
            )
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            {SITE_PAGES.map(([path, Page]) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
            {StudioPage && <Route path="/studio" element={<StudioPage />} />}
            {FilmExportPage && <Route path="/studio/film" element={<FilmExportPage />} />}
            <Route
              path="/logowanie"
              element={
                <AppMain>
                  <AuthPage mode="login" />
                </AppMain>
              }
            />
            {FEATURES.accounts && (
              <Route
                path="/rejestracja"
                element={
                  <AppMain>
                    <AuthPage mode="register" />
                  </AppMain>
                }
              />
            )}
            {FEATURES.configurator && <Route path="/konfigurator/kuchnia/:id?" element={<KitchenPage />} />}
            {FEATURES.configurator && <Route path="/konfigurator/szafa/:id?" element={<WardrobePage />} />}
            {FEATURES.accounts && (
              <Route
                path="/projekty"
                element={
                  <AppMain>
                    <RequireAuth>
                      <Projects />
                    </RequireAuth>
                  </AppMain>
                }
              />
            )}
            <Route
              path="/admin"
              element={
                <AppMain>
                  <RequireAuth admin>
                    <Admin />
                  </RequireAuth>
                </AppMain>
              }
            />
            <Route
              path="*"
              element={
                <AppMain>
                  <div className="page narrow">
                    <h1>Nie znaleziono strony</h1>
                    <Link to="/">Wróć na stronę główną</Link>
                  </div>
                </AppMain>
              }
            />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
