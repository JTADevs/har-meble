// Wspólne klocki strony głównej: hooki animacji, odsłanianie przy przewijaniu, nagłówki sekcji, obrazy.
import { createElement, useEffect, useRef, useState } from 'react';

// --- preferencje i widoczność --------------------------------------------------

export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return Boolean(reduced);
}

// true, gdy element jest w widoku. once=true – zostaje true po pierwszym pojawieniu.
export function useInView(ref, { once = true, rootMargin = '0px 0px -12% 0px', threshold = 0.15 } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, rootMargin, threshold]);
  return inView;
}

// three.js r176 wymaga WebGL2. Sprawdzenie synchroniczne (bez SSR), testowy kontekst od razu zwalniany.
let webgl2Cache;
export function hasWebGL2() {
  if (webgl2Cache !== undefined) return webgl2Cache;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    webgl2Cache = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Cache = false;
  }
  return webgl2Cache;
}

// Dla płócien 3D: renderuj tylko, gdy są (prawie) na ekranie – oszczędza GPU i baterię.
export function useInViewFrameloop(ref) {
  const visible = useInView(ref, { once: false, rootMargin: '200px 0px 200px 0px', threshold: 0 });
  return visible ? 'always' : 'never';
}

// Postęp elementu przez ekran: 0 = góra elementu przy dolnej krawędzi ekranu, 1 = dół elementu przy górnej.
// onProgress wołane w requestAnimationFrame (bez re-renderów React) – idealne do efektów scroll-linked.
export function useScrollProgress(ref, onProgress, { start = 1, end = 0 } = {}) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const from = vh * start; // pozycja top elementu, przy której p = 0
      const to = vh * end - r.height; // pozycja top elementu, przy której p = 1
      const p = (from - r.top) / (from - to);
      cb.current(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, start, end]);
}

// --- komponenty -----------------------------------------------------------------

// Element, który wjeżdża (fade + przesunięcie) przy pierwszym pojawieniu w widoku.
export function Reveal({ as = 'div', delay = 0, y = 28, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return createElement(
    as,
    {
      ref,
      className: `h-reveal ${inView ? 'is-in' : ''} ${className}`.trim(),
      style: { '--reveal-delay': `${delay}ms`, '--reveal-y': `${y}px`, ...style },
      ...rest,
    },
    children,
  );
}

// Tekst wjeżdżający linia po linii spod maski. lines: tablica stringów (każdy = osobna linia).
// play: wymuszenie startu (np. hero po załadowaniu); domyślnie start przy wejściu w widok.
export function MaskLines({ lines, as = 'h2', className = '', stagger = 90, delay = 0, play }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const on = play ?? inView;
  return createElement(
    as,
    { ref, className: `h-lines ${on ? 'is-in' : ''} ${className}`.trim() },
    lines.map((line, i) => (
      <span className="h-lines__line" key={i}>
        <span className="h-lines__inner" style={{ '--line-delay': `${delay + i * stagger}ms` }}>
          {line}
        </span>
        {/* spacja między liniami – bez niej czytniki ekranu i kopiowanie sklejają słowa („montażuw”) */}
        {i < lines.length - 1 ? ' ' : null}
      </span>
    )),
  );
}

// Nagłówek sekcji: eyebrow + tytuł (+ lead) i opcjonalna akcja po prawej (np. przycisk „Zobacz wszystko”).
export function SectionHead({ eyebrow, title, lead, align = 'left', action, titleClass = 'h-title' }) {
  return (
    <div className={`h-head ${align === 'center' ? 'h-head--center' : ''}`}>
      <div className="h-head__text">
        {eyebrow && (
          <Reveal as="span" className="h-eyebrow" y={12}>
            {eyebrow}
          </Reveal>
        )}
        <MaskLines as="h2" className={titleClass} lines={Array.isArray(title) ? title : [title]} />
        {lead && (
          <Reveal as="p" className="h-lead" delay={120}>
            {lead}
          </Reveal>
        )}
      </div>
      {action && (
        <Reveal delay={160} y={12}>
          {action}
        </Reveal>
      )}
    </div>
  );
}

// Warianty renderów (npm run renders:variants): plik.jpg (1600 px) + plik-800.jpg + plik-480.jpg.
export function rendersSrcSet(src) {
  if (!/^\/renders\/[^/]+\.jpg$/.test(src) || /-\d+\.jpg$/.test(src)) return undefined;
  const base = src.slice(0, -4);
  return `${base}-480.jpg 480w, ${base}-800.jpg 800w, ${src} 1600w`;
}

// Obraz z leniwym ładowaniem i płynnym pojawieniem się (ramka ma kolor tła, zanim obraz się wczyta).
// sizes – szerokość obrazu w układzie (np. '(max-width: 640px) 260px, 360px'); dla renderów srcSet dobierany jest sam.
export function Img({ src, alt, className = '', frameClass = '', style, sizes = '(max-width: 700px) 92vw, 46vw', eager = false }) {
  const [loaded, setLoaded] = useState(false);
  const srcSet = rendersSrcSet(src);
  return (
    <span className={`h-img-frame ${frameClass}`.trim()} style={{ display: 'block', ...style }}>
      <img
        src={src}
        srcSet={srcSet}
        alt={alt}
        sizes={srcSet ? sizes : undefined}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-img ${loaded ? 'is-loaded' : ''} ${className}`.trim()}
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete && el.naturalWidth && !loaded) setLoaded(true);
        }}
      />
    </span>
  );
}

export function ArrowIcon({ size = 16 }) {
  return (
    <svg className="h-btn__arrow" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- treści współdzielone --------------------------------------------------------

// Zdjęcia mebli (public/renders, 1600×1000 px, JPG): rendery z naszego path tracera przerobione na fotorealistyczne
// w Google Flow (Nano Banana, ten sam kadr i mebel, naturalne drobiazgi). Oryginalne rendery: exports/renders-cg/.
export const RENDERS = {
  kuchniaSzalwia: { src: '/renders/kuchnia-szalwia.jpg', alt: 'Kuchnia w kolorze szałwii z frontami ramowymi i dębowym blatem' },
  kuchniaOrzech: { src: '/renders/kuchnia-orzech.jpg', alt: 'Kuchnia z ryflowanymi frontami z forniru orzechowego i jasnym blatem kwarcowym' },
  kuchniaZielen: { src: '/renders/kuchnia-zielen.jpg', alt: 'Kuchnia w butelkowej zieleni z marmurowym blatem i mosiężnymi gałkami' },
  kuchniaGrafit: { src: '/renders/kuchnia-grafit.jpg', alt: 'Nowoczesna grafitowa kuchnia bez uchwytów z betonowym blatem' },
  kuchniaSkandi: { src: '/renders/kuchnia-skandi.jpg', alt: 'Biała kuchnia w stylu skandynawskim z blatem z bielonego dębu' },
  szafaDab: { src: '/renders/szafa-dab.jpg', alt: 'Szafa z drzwiami przesuwnymi w dekorze dębu bielonego z lustrem' },
  szafaSzalwia: { src: '/renders/szafa-szalwia.jpg', alt: 'Szafa z frontami ramowymi w kolorze szałwii i mosiężnymi gałkami' },
  garderoba: { src: '/renders/garderoba.jpg', alt: 'Otwarta garderoba z drążkami, półkami i szufladami' },
  detal: { src: '/renders/detal.jpg', alt: 'Zbliżenie na front ramowy w kolorze szałwii z mosiężną gałką' },
  // zdjęcie poglądowe (Google Flow) do banera usług B2B – do podmiany na prawdziwe zdjęcie z zakładu HAR MEBLE
  b2b: { src: '/renders/b2b.jpg', alt: 'Hala stolarni z okleiniarką, centrum CNC i wózkiem z dociętymi formatkami' },
};

export const LINKS = {
  kuchnia: '/konfigurator/kuchnia',
  szafa: '/konfigurator/szafa',
  projekty: '/projekty',
  rejestracja: '/rejestracja',
  kontakt: '#kontakt',
};
