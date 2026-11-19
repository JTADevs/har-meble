import './quality.css';
import { useEffect, useRef } from 'react';
import { ArrowIcon, LINKS, MaskLines, Reveal, useInView, useReducedMotion } from '../ui.jsx';
import { CarouselArrow } from './Carousel.jsx'; // te same przyciski co w karuzelach Kategorii i Inspiracji (+ carousel.css)

// Sekcja „Jakość”: organiczny, wolno dryfujący gradient w barwach naszych dekorów (plamy + ziarno)
// i szklane karty z tym, co wyróżnia stolarnię. Na telefonie karty przewija się palcem, od 720 px – siatka.
// W tekstach twarde spacje (\u00a0) po jednoliterowych słowach i przed półpauzą.

// Spacja na końcu pierwszej linii: linie MaskLines to osobne bloki, a bez niej nazwa dostępna
// nagłówka sklejałaby się w „któreZostają”. Wizualnie spacja na końcu wiersza znika.
const TITLE = ['Uważność ', 'na szczegóły'];

// Kolejność = kolejność malowania: ciemna plama pod spodem, jasne i nasycone na wierzchu
// (zieleń butelkowa jest w bazowym gradiencie tła).
const BLOBS = ['navy', 'sage', 'terra', 'cashmere', 'mustard'];

// Karty z tekstów właścicielki HAR MEBLE (rozmowa na start, dbałość o całość, naturalne materiały,
// usługi stolarskie dla firm, jasne ustalenia) – bez obietnic, których firma nie składa.
const ITEMS = [
  {
    id: 'rozmowa',
    icon: 'chat',
    title: 'Zaczynamy od rozmowy',
    text: 'Udana zabudowa zaczyna się od rozmowy\u00a0– o\u00a0potrzebach, codziennych przyzwyczajeniach i\u00a0przestrzeni, w\u00a0której ma służyć.',
    steps: ['Rozmowa', 'Wycena', 'Realizacja'],
    stepsLabel: 'Od rozmowy do realizacji',
  },
  {
    id: 'calosc',
    icon: 'layers',
    title: 'Dbamy o\u00a0całość',
    text: 'Proporcje, dobór materiałów, funkcjonalność i\u00a0staranne wykończenie składają się u\u00a0nas na jeden, spójny projekt.',
  },
  {
    id: 'faktury',
    icon: 'leaf',
    title: 'Naturalne faktury',
    text: 'Lubimy przemyślane połączenia i\u00a0detale, które nadają wnętrzom charakter. Drewno, fornir, szkło czy lustro dobieramy do użytkowników mebla.',
  },
  {
    id: 'uslugi',
    icon: 'square',
    title: 'Cięcie, frezowanie, gięcie',
    text: 'Obok mebli na wymiar rozwijamy usługi stolarskie dla firm: rozkrój, oklejanie, nawiercanie, frezowanie, gięcie, szlifowanie i\u00a0heblowanie.',
  },
  {
    id: 'ustalenia',
    icon: 'check',
    title: 'Jasne ustalenia',
    text: 'W\u00a0każdej realizacji stawiamy na jasne ustalenia. Ostateczną cenę potwierdzamy po uzgodnieniu szczegółów i\u00a0weryfikacji wymiarów.',
  },
];

// Ikony liniowe 24×24 (obrys 1.5, currentColor).
const ICONS = {
  // dymek rozmowy – projekt zaczyna się od rozmowy
  chat: (
    <>
      <path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v8.5A1.75 1.75 0 0 1 18.25 16H10l-4.25 3.5V16h0A1.75 1.75 0 0 1 4 14.25Z" />
      <path d="M8 8.75h8M8 11.75h5" />
    </>
  ),
  // dokument z ptaszkiem – jasne ustalenia
  check: (
    <>
      <path d="M6.75 3.75h7.5l4 4v11.5a1 1 0 0 1-1 1H6.75a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
      <path d="M14 3.75V8h4.25M9 13.75l2 2 4-4.25" />
    </>
  ),
  // pinezka – stolarnia na miejscu
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.25a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.75" r="2.5" />
    </>
  ),
  // warstwy płyt
  layers: (
    <>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16 8.5 4.5 8.5-4.5" />
    </>
  ),
  // liść – bez marnowania
  leaf: (
    <>
      <path d="M5 19C4 11 10 4.5 20 4c.5 9-5.5 15.5-15 15Z" />
      <path d="m4 20 9-9" />
    </>
  ),
  // kątownik stolarski z podziałką
  square: (
    <>
      <path d="M4 4h5v11h11v5H4Z" />
      <path d="M9 7.5H6.5M9 11H6.5M12.5 15v2.5M16 15v2.5" />
    </>
  ),
  // klucz płaski – regulacje
  wrench: (
    <path d="M19.68 6.58A4.6 4.6 0 0 1 13.49 12.64L6.56 19.56A1.5 1.5 0 0 1 4.44 17.44L11.36 10.51A4.6 4.6 0 0 1 17.42 4.32L15.22 6.52L17.48 8.78Z" />
  ),
};

function QualIcon({ name }) {
  return (
    <svg
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
      {ICONS[name]}
    </svg>
  );
}

// Szklana karta. Sama karta jest elementem „reveal” (klasy .h-reveal/.is-in z systemu) – NIE owijamy jej
// w <Reveal>, bo will-change: opacity na rodzicu tworzy „backdrop root” i backdrop-filter przestaje widzieć tło.
function QualityCard({ item, index, shown }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Miękka poświata podąża za kursorem (tylko mysz): pozycja przez transform, najwyżej raz na klatkę.
  const placeGlow = () => {
    frame.current = 0;
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const r = card.getBoundingClientRect();
    const x = (pointer.current.x - r.left).toFixed(1);
    const y = (pointer.current.y - r.top).toFixed(1);
    glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const onPointer = (event) => {
    if (event.pointerType !== 'mouse') return;
    pointer.current.x = event.clientX;
    pointer.current.y = event.clientY;
    if (!frame.current) frame.current = requestAnimationFrame(placeGlow);
  };

  const wide = Boolean(item.steps);
  const className = ['h-qual-card', 'h-reveal', shown && 'is-in', wide && 'h-qual-card--wide'].filter(Boolean).join(' ');

  return (
    <li
      ref={cardRef}
      className={className}
      style={{ '--reveal-delay': `${index * 80}ms`, '--reveal-y': '32px' }}
      onPointerEnter={onPointer}
      onPointerMove={onPointer}
    >
      <span ref={glowRef} className="h-qual-card__glow" aria-hidden="true" />
      <div className="h-qual-card__head">
        <span className="h-qual-card__icon">
          <QualIcon name={item.icon} />
        </span>
        <span className="h-qual-card__num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="h-qual-card__body">
        <h3 className="h-qual-card__title">{item.title}</h3>
        <p className="h-qual-card__text">{item.text}</p>
        {wide && (
          <ol className="h-qual-steps" role="list" aria-label={item.stepsLabel}>
            {item.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

export default function Quality() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const reduced = useReducedMotion();

  // Plamy dryfują tylko, gdy sekcja jest (prawie) na ekranie – poza nim animacje są wstrzymane.
  const live = useInView(sectionRef, { once: false, rootMargin: '200px 0px', threshold: 0 });
  // Karty wjeżdżają razem ze staggerem, gdy lista pojawi się w widoku – także te ukryte
  // w przewijanym pasku (osobny observer na karcie nie zadziałałby dla kart przyciętych poziomo).
  const cardsIn = useInView(trackRef, { threshold: 0.1 });

  // Pasek postępu i stan strzałek karuzeli (tryb < 720 px). Bez setState – zapis wprost do DOM w rAF.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let raf = 0;
    let lastRatio = -1;
    let lastStart = null;
    let lastEnd = null;

    const update = () => {
      raf = 0;
      const { scrollWidth, clientWidth, scrollLeft } = track;
      const max = Math.max(0, scrollWidth - clientWidth);
      const ratio = scrollWidth > 0 ? Math.min(1, clientWidth / scrollWidth) : 1;
      const p = max > 1 ? Math.min(1, Math.max(0, scrollLeft / max)) : 0;

      const bar = barRef.current;
      if (bar) {
        if (Math.abs(ratio - lastRatio) > 0.0005) {
          bar.style.width = `${(ratio * 100).toFixed(2)}%`;
          lastRatio = ratio;
        }
        const shift = ratio > 0 ? ((1 - ratio) / ratio) * p * 100 : 0;
        bar.style.transform = `translate3d(${shift.toFixed(2)}%, 0, 0)`;
      }

      // aria-disabled zamiast disabled: przycisk nie gubi fokusu, gdy dojedziemy do końca.
      const atStart = max <= 1 || scrollLeft <= 2;
      const atEnd = max <= 1 || scrollLeft >= max - 2;
      if (atStart !== lastStart) {
        prevRef.current?.setAttribute('aria-disabled', String(atStart));
        lastStart = atStart;
      }
      if (atEnd !== lastEnd) {
        nextRef.current?.setAttribute('aria-disabled', String(atEnd));
        lastEnd = atEnd;
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(track);

    return () => {
      track.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // W trybie karuzeli lista jest przewijalnym obszarem – musi być osiągalna klawiaturą (strzałki przewijają).
  // W trybie siatki nie ma czego przewijać, więc nie dokładamy zbędnego przystanku Tab.
  useEffect(() => {
    const track = trackRef.current;
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 719.98px)') : null;
    if (!track || !mq) return undefined;
    const sync = () => {
      if (mq.matches) track.setAttribute('tabindex', '0');
      else track.removeAttribute('tabindex');
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const go = (dir) => (event) => {
    if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
    const delta = first ? first.offsetWidth + gap : track.clientWidth * 0.85;
    track.scrollBy({ left: dir * delta, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      id="jakosc"
      className={`h-qual-section${live ? ' is-live' : ''}`}
      aria-labelledby="h-qual-title"
    >
      {/* Tło: dryfujące plamy (3 zagnieżdżone warstwy transform na plamę), przyciemnienie i ziarno. */}
      <div className="h-qual-bg" aria-hidden="true">
        {BLOBS.map((name) => (
          <span key={name} className={`h-qual-blob h-qual-blob--${name}`}>
            <span className="h-qual-blob__drift">
              <span className="h-qual-blob__shape" />
            </span>
          </span>
        ))}
        <span className="h-qual-scrim" />
        <span className="h-qual-grain" />
      </div>

      <div className="h-container h-qual-inner">
        <div className="h-qual-copy">
          <Reveal as="span" className="h-eyebrow h-qual-eyebrow" y={12}>
            Nasze podejście
          </Reveal>
          <div id="h-qual-title">
            <MaskLines as="h2" className="h-title h-qual-title" lines={TITLE} delay={60} />
          </div>
          {/* Lead nie powtarza kart: „projekt, produkcja i montaż w jednych rękach” mówi karta 1 (z kapsułą kroków),
              dobór materiałów – karta 2. */}
          <Reveal as="p" className="h-lead h-qual-lead" delay={140}>
            Łączymy wiedzę o&nbsp;materiałach z&nbsp;praktyką wykonania mebli na wymiar&nbsp;– i&nbsp;pilnujemy detali, które nadają
            wnętrzom charakter.
          </Reveal>
          <Reveal className="h-qual-cta" delay={220} y={16}>
            <a className="h-btn h-btn--outline-light" href={LINKS.kontakt}>
              Porozmawiaj z nami
              <ArrowIcon />
            </a>
          </Reveal>
        </div>

        <div className="h-qual-cards">
          <ul ref={trackRef} id="h-qual-track" className="h-scroller h-qual-track" role="list" aria-label="Co nas wyróżnia">
            {ITEMS.map((item, i) => (
              <QualityCard key={item.id} item={item} index={i} shown={cardsIn} />
            ))}
          </ul>

          <div className="h-qual-controls">
            <div className="h-progress h-qual-progress" aria-hidden="true">
              <span ref={barRef} className="h-progress__bar" />
            </div>
            {/* przyciski jak w karuzelach Kategorii/Inspiracji (carousel.css): na telefonie dotykowym ukryte – przewija się palcem */}
            <div className="h-car-btns h-car-btns--dark">
              <button
                ref={prevRef}
                type="button"
                className="h-car-btn h-car-btn--prev"
                aria-label="Poprzednia karta"
                aria-controls="h-qual-track"
                onClick={go(-1)}
              >
                <CarouselArrow dir="prev" />
              </button>
              <button
                ref={nextRef}
                type="button"
                className="h-car-btn h-car-btn--next"
                aria-label="Następna karta"
                aria-controls="h-qual-track"
                onClick={go(1)}
              >
                <CarouselArrow dir="next" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
