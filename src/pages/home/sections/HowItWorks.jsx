// „Jak pracujemy” (#jak-to-dziala): cztery kroki od zapytania do montażu (w pełnej wersji – od projektu w konfiguratorze).
// Desktop (≥ 900 px): poziomy akordeon. Aktywny panel rozszerza się (flex-grow), pozostałe są wąskie, z numerem
// w kółku i pionowym tytułem. Panele przełączają się same co ~5,5 s przez jeden pełny cykl, potem stoją na kroku 1.
// Czas odmierza animacja CSS paska postępu: jej koniec (animationend) włącza następny krok, więc pauza to po prostu
// animation-play-state: paused – bez timerów, które rozjeżdżałyby się z paskiem.
// Przycisk „Wstrzymaj / Wznów” stoi w nagłówku sekcji, przed akordeonem w kolejności Tab i czytania (wzorzec
// karuzeli APG) – czytnik w trybie przeglądania trafia na niego, zanim dojdzie do zmieniających się paneli.
// Przełączanie wstrzymuje też każdy fokus w akordeonie (nie tylko z klawiatury) i najechanie na niego myszą.
// Fokus na samym przycisku nie blokuje ruchu – inaczej „Wznów” kliknięte myszą nic by nie zmieniło.
// Mobile (< 900 px): pionowa lista kart, bez automatycznego przełączania.
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, Img, RENDERS, Reveal, SectionHead, useInView, useReducedMotion } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';
import './howitworks.css';

// Zdjęcia kroków to rendery gotowych mebli (ujęć procesu jeszcze nie ma); dobrane tak, żeby nie dublować
// kadrów z sąsiednich sekcji: krok 3 – detal frontu (rzemiosło), krok 4 – skończona kuchnia (odbiór).
// W tekstach twarde spacje (\u00a0) po jednoliterowych słowach i przed półpauzą.
// Wizytówka: kroki z tekstów właścicielki (zapytanie z opisem i wymiarami → wstępna wycena → uzgodnienie szczegółów
// i weryfikacja wymiarów → wykonanie, transport i montaż).
const SITE_STEPS = [
  {
    title: 'Zapytanie i\u00a0rozmowa',
    text: 'Prześlij opis projektu, orientacyjne wymiary oraz zdjęcia lub inspiracje\u00a0– albo gotową dokumentację. Udana zabudowa zaczyna się od rozmowy o\u00a0potrzebach i\u00a0przestrzeni.',
    image: RENDERS.szafaSzalwia,
  },
  {
    title: 'Wstępna wycena',
    text: 'Na podstawie przesłanych informacji przygotowujemy wstępną wycenę. Jeśli nie masz jeszcze wybranych materiałów lub rozwiązań, pomożemy Ci je dobrać.',
    image: RENDERS.garderoba,
  },
  {
    title: 'Ustalenia i\u00a0wymiary',
    text: 'Uzgadniamy szczegóły i\u00a0weryfikujemy wymiary. Ostateczną cenę i\u00a0termin realizacji potwierdzamy po jasnych ustaleniach.',
    image: RENDERS.detal,
  },
  {
    title: 'Wykonanie i\u00a0montaż',
    text: 'Dbamy o\u00a0całość: proporcje, dobór materiałów, funkcjonalność i\u00a0staranne wykończenie. Transport i\u00a0montaż ustalamy razem z\u00a0Tobą.',
    image: RENDERS.kuchniaOrzech,
  },
];

// Pełna wersja (z konfiguratorem): projekt online → pomiar → produkcja → montaż.
const CONFIGURATOR_STEPS = [
  {
    title: 'Projekt online',
    text: 'W\u00a0konfiguratorze 3D ustawiasz szafki, fronty i\u00a0dekory, a\u00a0cenę orientacyjną widzisz na bieżąco. Gotowy projekt zapisujesz na koncie i\u00a0wysyłasz nam jako zapytanie.',
    image: RENDERS.kuchniaSkandi,
  },
  {
    title: 'Pomiar u\u00a0Ciebie',
    text: 'Przyjeżdżamy, mierzymy pomieszczenie i\u00a0razem z\u00a0Tobą dopracowujemy projekt. Ostateczną cenę podajemy po pomiarze.',
    image: RENDERS.garderoba,
  },
  {
    title: 'Produkcja w\u00a0naszej stolarni',
    text: 'Projekt zamieniamy w\u00a0listę formatek. Potem rozkrój, oklejanie krawędzi i\u00a0składanie\u00a0– każdy element powstaje na wymiar.',
    image: RENDERS.detal,
  },
  {
    title: 'Montaż i\u00a0odbiór',
    text: 'Montujemy zabudowę, regulujemy fronty i\u00a0zawiasy, a\u00a0po pracy zostawiamy porządek. Na koniec razem sprawdzamy każdy detal.',
    image: RENDERS.kuchniaOrzech,
  },
];

const STEPS = FEATURES.configurator ? CONFIGURATOR_STEPS : SITE_STEPS;

const DESKTOP_QUERY = '(min-width: 900px)';

// Szerokość obrazów w układzie (Img dobiera wariant 480/800/1600). Akordeon: zdjęcie ma szerokość rozwiniętego
// panelu (~650–900 px przy 900–1440 px ekranu); mobile: karta na całą szerokość albo w dwóch kolumnach od 600 px.
const ACCORDION_SIZES = '(max-width: 1285px) 70vw, 900px';
const CARD_SIZES = '(max-width: 599px) 92vw, 46vw';

const pad = (n) => String(n).padStart(2, '0');

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

// false, gdy karta przeglądarki jest w tle – wtedy nie przełączamy kroków.
function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="2.25" y="1.5" width="2.5" height="9" rx="0.9" />
      <rect x="7.25" y="1.5" width="2.5" height="9" rx="0.9" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M3.5 2.1v7.8a.7.7 0 0 0 1.06.6l6.3-3.9a.7.7 0 0 0 0-1.2l-6.3-3.9a.7.7 0 0 0-1.06.6Z" />
    </svg>
  );
}

// --- desktop: poziomy akordeon ------------------------------------------------------------------

// paused – wstrzymane przyciskiem (albo po pełnym cyklu); onAdvance – po każdym automatycznym przełączeniu.
function StepsAccordion({ steps, autoplay, paused, onAdvance }) {
  const uid = useId();
  const listRef = useRef(null);
  const triggers = useRef([]);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const shown = useInView(listRef); // jednorazowe wejście paneli
  const onScreen = useInView(listRef, { once: false, rootMargin: '0px', threshold: 0.35 });
  const pageVisible = usePageVisible();
  const count = steps.length;
  const running = autoplay && !paused && onScreen && pageVisible && !hovered && !focused;

  // Klawiatura (wzorzec akordeonu WAI-ARIA): strzałki/Home/End przenoszą fokus między nagłówkami,
  // Enter i spacja aktywują panel natywnie (to zwykłe przyciski).
  const onTriggerKeyDown = (event, index) => {
    let target;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        target = (index + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        target = (index - 1 + count) % count;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    triggers.current[target]?.focus();
  };

  // Każdy fokus w akordeonie (Tab, kliknięcie, czytnik w trybie formularza) wstrzymuje przełączanie,
  // dopóki fokus nie wyjdzie poza akordeon – czytany panel nie znika spod kursora.
  const onFocus = () => setFocused(true);
  const onBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };
  // Tylko prawdziwa mysz – na tabletach dotyk nie wysyła pointerleave po stuknięciu i pauza by „wisiała”.
  const onPointerEnter = (event) => {
    if (event.pointerType === 'mouse') setHovered(true);
  };
  const onPointerLeave = (event) => {
    if (event.pointerType === 'mouse') setHovered(false);
  };

  const onProgressEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    setActive((index) => (index + 1) % count);
    onAdvance?.();
  };

  const classes = ['h-how-accordion', shown && 'is-in', running && 'is-running'].filter(Boolean).join(' ');

  return (
    <ol
      ref={listRef}
      className={classes}
      style={{ '--h-how-count': count }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {steps.map((step, i) => {
        const isActive = i === active;
        const triggerId = `${uid}-trigger-${i}`;
        const regionId = `${uid}-region-${i}`;
        return (
          <li key={step.title} className={`h-how-panel${isActive ? ' is-active' : ''}`} style={{ '--h-how-i': i }}>
            {/* zdjęcie ilustracyjne – treść kroku niesie tekst, więc alt jest pusty */}
            <div className="h-how-media">
              <Img src={step.image.src} alt="" frameClass="h-how-frame" sizes={ACCORDION_SIZES} />
            </div>
            <span className="h-how-shade" aria-hidden="true" />
            <span className="h-how-grad" aria-hidden="true" />
            <span className="h-how-num" aria-hidden="true">
              <span>{pad(i + 1)}</span>
            </span>
            {/* wygląd zwiniętego panelu: numer w kółku i pionowy tytuł */}
            <span className="h-how-rail" aria-hidden="true">
              <span className="h-how-badge">{pad(i + 1)}</span>
              <span className="h-how-vtitle">{step.title}</span>
            </span>

            <div className="h-how-body">
              <h3 className="h-how-heading">
                <button
                  ref={(el) => {
                    triggers.current[i] = el;
                  }}
                  id={triggerId}
                  type="button"
                  className="h-how-trigger"
                  aria-expanded={isActive}
                  aria-controls={regionId}
                  aria-disabled={isActive || undefined}
                  onClick={() => setActive(i)}
                  onKeyDown={(event) => onTriggerKeyDown(event, i)}
                >
                  <span className="h-visually-hidden">Krok {i + 1}: </span>
                  <span className="h-how-title">{step.title}</span>
                </button>
              </h3>
              <div id={regionId} role="region" aria-labelledby={triggerId} className="h-how-region">
                <p className="h-how-desc">{step.text}</p>
                {autoplay && (
                  <div className="h-how-controls" aria-hidden="true">
                    <span className="h-how-track">
                      <span className="h-how-bar" onAnimationEnd={onProgressEnd} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- mobile: pionowa lista kart -------------------------------------------------------------------

function StepsList({ steps }) {
  return (
    <ol className="h-how-cards">
      {steps.map((step, i) => (
        <Reveal as="li" key={step.title} className="h-how-card" delay={(i % 2) * 90}>
          <div className="h-how-card-media">
            <Img src={step.image.src} alt="" frameClass="h-how-card-frame" sizes={CARD_SIZES} />
            <span className="h-how-card-badge" aria-hidden="true">
              {pad(i + 1)}
            </span>
          </div>
          <h3 className="h-how-card-title">
            <span className="h-visually-hidden">Krok {i + 1}: </span>
            {step.title}
          </h3>
          <p className="h-how-card-desc">{step.text}</p>
        </Reveal>
      ))}
    </ol>
  );
}

export default function HowItWorks() {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const reduced = useReducedMotion();
  const autoplay = desktop && !reduced;
  const [stopped, setStopped] = useState(false); // wstrzymane przyciskiem albo po pełnym cyklu
  const advances = useRef(0); // automatyczne przełączenia od startu / wznowienia

  // Jeden pełny cykl (powrót do kroku 1) i koniec – dalej użytkownik przełącza sam albo wznawia przyciskiem.
  const onAdvance = () => {
    advances.current += 1;
    if (advances.current >= STEPS.length) {
      advances.current = 0;
      setStopped(true);
    }
  };

  const toggleAutoplay = () => {
    advances.current = 0;
    setStopped((value) => !value);
  };

  return (
    // tło --h-bg-2 (h-section--alt) przełamuje ciąg jasnych sekcji
    <section id="jak-to-dziala" className="h-section h-section--alt h-how">
      <div className="h-container">
        <SectionHead
          eyebrow={FEATURES.configurator ? 'Jak to działa' : 'Jak pracujemy'}
          title={FEATURES.configurator ? ['Od projektu do montażu', 'w\u00a0czterech krokach'] : ['Od rozmowy do montażu', 'w\u00a0czterech krokach']}
          lead={
            FEATURES.configurator
              ? 'Projekt zaczynasz samodzielnie, w\u00a0przeglądarce. Dalej prowadzimy go razem z\u00a0Tobą\u00a0– aż do ostatniej regulacji frontów.'
              : 'Zaczynamy od Twojego opisu i\u00a0wymiarów. Dalej prowadzimy projekt razem z\u00a0Tobą\u00a0– z\u00a0jasnymi ustaleniami na każdym etapie.'
          }
          action={
            <div className="h-how-actions">
              <Link className="h-link" to={ROUTES.quote}>
                Zapytaj o&nbsp;wycenę
                <ArrowIcon />
              </Link>
              {autoplay && (
                <button type="button" className="h-how-toggle" onClick={toggleAutoplay}>
                  {stopped ? <PlayIcon /> : <PauseIcon />}
                  <span>{stopped ? 'Wznów' : 'Wstrzymaj'}</span>
                  <span className="h-visually-hidden"> automatyczne przełączanie kroków</span>
                </button>
              )}
            </div>
          }
        />
        {desktop ? (
          <StepsAccordion steps={STEPS} autoplay={autoplay} paused={stopped} onAdvance={onAdvance} />
        ) : (
          <StepsList steps={STEPS} />
        )}
      </div>
    </section>
  );
}
