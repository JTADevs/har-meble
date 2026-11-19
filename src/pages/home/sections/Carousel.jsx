// Wspólna karuzela strony głównej (Kategorie, Inspiracje; Jakość używa tych samych przycisków).
//
// Tor .h-scroller ze snapem zajmuje całą szerokość strony: pierwsza karta trzyma lewą linię .h-container,
// a kolejne uciekają do prawej krawędzi ekranu. Przeciąganie myszą (z „rzutem” i dociągnięciem do karty),
// przyciski poprzedni/następny, kciuk postępu i strzałki na klawiaturze. Stan przycisków i kciuka
// aktualizowany przez refy w requestAnimationFrame – przewijanie nie powoduje żadnych re-renderów.
//
// Najprościej:
//   <Carousel label="Kategorie mebli" theme="dark" renderControls={(controls) => <SectionHead … action={controls} />}>
//     {karty}
//   </Carousel>
// Pełna kontrola nad układem:
//   const car = useCarousel();
//   <CarouselButtons carousel={car} />  <CarouselTrack carousel={car} label="…">{karty}</CarouselTrack>  <CarouselProgress carousel={car} />
import './carousel.css';
import { Children, isValidElement, useId, useLayoutEffect, useState } from 'react';
import { useInView } from '../ui.jsx';

const DRAG_THRESHOLD = 5; // px – mniejszy ruch myszy to zwykły klik
const FLING_MS = 260; // jak daleko niesie „rzut” myszą: prędkość [px/ms] × czas
const EDGE = 1; // px tolerancji na krańcach toru (ułamkowe scrollLeft)

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const easeOutQuart = (t) => 1 - (1 - t) ** 4;
const prefersReducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// --- kontroler (bez stanu React – wszystko na refach) ---------------------------------

function createCarousel(id) {
  const trackRef = { current: null };
  const prevRef = { current: null };
  const nextRef = { current: null };
  const barRef = { current: null };
  const liveRef = { current: null };

  let frame = 0; // rAF aktualizacji przycisków i kciuka
  let anim = 0; // rAF animacji przewijania
  let animTarget = null; // docelowe scrollLeft trwającej animacji

  const slides = () => Array.from(trackRef.current?.children ?? []);
  const maxScroll = (el) => Math.max(0, el.scrollWidth - el.clientWidth);

  // Pozycje snapu = przesunięcie kart względem pierwszej. offsetLeft pomija transformacje (np. wjazd kart).
  const snapPoints = () => {
    const els = slides();
    const base = els[0]?.offsetLeft ?? 0;
    return els.map((s) => s.offsetLeft - base);
  };

  // Indeks pierwszej karty, której początek leży na linii kontenera lub za nią.
  const indexAt = (x, points) => {
    const i = points.findIndex((p) => p >= x - 2);
    return i === -1 ? points.length - 1 : i;
  };

  const currentIndex = () => {
    const el = trackRef.current;
    return el ? indexAt(animTarget ?? el.scrollLeft, snapPoints()) : 0;
  };

  // Krok przycisków: tyle kart, ile mieści się w całości w widocznej części toru (min. 1).
  const pageSize = () => {
    const el = trackRef.current;
    const [a, b] = slides();
    if (!el || !a || !b) return 1;
    const stride = b.offsetLeft - a.offsetLeft;
    if (stride <= 0) return 1;
    const gap = stride - a.offsetWidth;
    return Math.max(1, Math.floor((el.clientWidth - a.offsetLeft + gap) / stride));
  };

  const setDisabled = (btn, off) => {
    const v = String(off);
    if (btn && btn.getAttribute('aria-disabled') !== v) btn.setAttribute('aria-disabled', v);
  };

  // Przyciski na krańcach + kciuk: szerokość = widoczna część toru, przesunięcie = postęp przewinięcia.
  const update = () => {
    frame = 0;
    const el = trackRef.current;
    if (!el) return;
    const max = maxScroll(el);
    const x = el.scrollLeft;
    setDisabled(prevRef.current, x <= EDGE);
    setDisabled(nextRef.current, x >= max - EDGE);
    const bar = barRef.current;
    if (bar) {
      const ratio = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
      const width = `${(ratio * 100).toFixed(2)}%`;
      if (bar.style.width !== width) bar.style.width = width; // zmienia się tylko przy zmianie rozmiaru
      const p = max > 0 ? clamp(x / max, 0, 1) : 0;
      const shift = ratio < 1 ? (p * (1 - ratio) * 100) / ratio : 0; // % własnej szerokości kciuka
      bar.style.transform = `translate3d(${shift.toFixed(2)}%, 0, 0)`;
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const stop = () => {
    if (anim) cancelAnimationFrame(anim);
    anim = 0;
    animTarget = null;
    const el = trackRef.current;
    if (el) delete el.dataset.animating;
  };

  // Komunikat dla czytników ekranu po nawigacji przyciskami / klawiaturą (nie przy zwykłym przewijaniu).
  const announce = () => {
    const el = trackRef.current;
    const live = liveRef.current;
    if (!el || !live) return;
    const els = slides();
    const left = el.scrollLeft - 2;
    const right = el.scrollLeft + el.clientWidth + 2;
    const shown = [];
    els.forEach((s, i) => {
      if (s.offsetLeft >= left && s.offsetLeft + s.offsetWidth <= right) shown.push(i + 1);
    });
    if (!shown.length) return;
    const a = shown[0];
    const b = shown[shown.length - 1];
    live.textContent = a === b ? `Karta ${a} z ${els.length}` : `Karty ${a}–${b} z ${els.length}`;
  };

  // Płynne przewinięcie do x (krzywa ease-out). Na czas animacji snap jest wyłączony,
  // a cel to zawsze pozycja snapu – po włączeniu snapu nic nie przeskakuje.
  const scrollToX = (x, { speak = false } = {}) => {
    const el = trackRef.current;
    if (!el) return;
    stop();
    const target = clamp(x, 0, maxScroll(el));
    const from = el.scrollLeft;
    const dist = target - from;
    if (Math.abs(dist) < 1) return;
    if (prefersReducedMotion()) {
      el.scrollLeft = target;
      if (speak) announce();
      return;
    }
    const duration = clamp(420 + Math.abs(dist) * 0.3, 480, 950);
    const t0 = performance.now();
    el.dataset.animating = '';
    animTarget = target;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      el.scrollLeft = from + dist * easeOutQuart(t);
      if (t < 1) {
        anim = requestAnimationFrame(step);
        return;
      }
      anim = 0;
      animTarget = null;
      delete el.dataset.animating;
      if (speak) announce();
    };
    anim = requestAnimationFrame(step);
  };

  const goTo = (index, opts) => {
    const points = snapPoints();
    if (points.length) scrollToX(points[clamp(index, 0, points.length - 1)], opts);
  };
  const prev = () => goTo(currentIndex() - pageSize(), { speak: true });
  const next = () => goTo(currentIndex() + pageSize(), { speak: true });

  // Podpina zdarzenia do toru; zwraca sprzątanie. Wołane z CarouselTrack (useLayoutEffect).
  const bind = () => {
    const el = trackRef.current;
    if (!el) return undefined;
    const drag = { active: false, moved: false, x0: 0, s0: 0, samples: [] };
    let blockClick = false;
    let blockTimer = 0;

    const onScroll = () => schedule();
    // Użytkownik przejmuje przewijanie (gładzik w poziomie, palec) – przerwij animację przycisków.
    const onWheel = (e) => {
      if (anim && Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop();
    };
    const onTouchStart = () => {
      if (anim) stop();
    };

    const endDrag = (e) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      delete el.dataset.pressed;
      if (!drag.active) return;
      drag.active = false;
      if (!drag.moved) return;
      // Po przeciągnięciu puszczenie przycisku nad kartą nie może otworzyć linku.
      blockClick = true;
      clearTimeout(blockTimer);
      blockTimer = setTimeout(() => {
        blockClick = false;
      }, 120);
      // „Rzut”: prędkość z ostatnich ~100 ms przesuwa cel, potem dociągnięcie do najbliższej karty.
      let v = 0;
      if (e.type === 'pointerup') {
        const ref = drag.samples.find(([t]) => e.timeStamp - t <= 100) ?? drag.samples[drag.samples.length - 1];
        if (ref) v = clamp((e.clientX - ref[1]) / Math.max(16, e.timeStamp - ref[0]), -3, 3);
      }
      const projected = el.scrollLeft - v * FLING_MS;
      const points = snapPoints();
      let best = 0;
      points.forEach((p, i) => {
        if (Math.abs(p - projected) < Math.abs(points[best] - projected)) best = i;
      });
      scrollToX(points[best] ?? 0); // ustawia data-animating, zanim zdejmiemy data-dragging
      delete el.dataset.dragging;
      schedule();
    };

    const onMove = (e) => {
      if (!drag.active) return;
      if (!(e.buttons & 1)) {
        endDrag(e); // przycisk puszczony poza oknem
        return;
      }
      const dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        drag.moved = true;
        el.dataset.dragging = ''; // wyłącza snap i kliknięcia w karty na czas przeciągania
        window.getSelection?.()?.removeAllRanges();
      }
      el.scrollLeft = drag.s0 - dx;
      drag.samples.push([e.timeStamp, e.clientX]);
      if (drag.samples.length > 12) drag.samples.shift();
    };

    // Tylko mysz – dotyk i rysik przewijają natywnie.
    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stop();
      drag.active = true;
      drag.moved = false;
      drag.x0 = e.clientX;
      drag.s0 = el.scrollLeft;
      drag.samples = [[e.timeStamp, e.clientX]];
      el.dataset.pressed = '';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    };

    const onClickCapture = (e) => {
      if (!blockClick) return;
      blockClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const onDragStart = (e) => e.preventDefault(); // natywne „przeciągnij link/obraz” psułoby przeciąganie toru

    // Strzałki / Home / End, gdy fokus jest na samym torze.
    const onKeyDown = (e) => {
      if (e.target !== el || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      let to;
      if (e.key === 'ArrowRight') to = currentIndex() + 1;
      else if (e.key === 'ArrowLeft') to = currentIndex() - 1;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = slides().length - 1;
      else return;
      e.preventDefault();
      goTo(to, { speak: true });
    };

    // Po wjeździe kart zmienia się obszar przewijania (transformacje) – przelicz kciuk.
    const onTransitionEnd = (e) => {
      if (e.target.parentElement === el) schedule();
    };

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;
    if (ro) ro.observe(el);
    else window.addEventListener('resize', schedule);

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('transitionend', onTransitionEnd);
    update();

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', schedule);
      clearTimeout(blockTimer);
      if (anim) cancelAnimationFrame(anim);
      anim = 0;
      animTarget = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      delete el.dataset.animating;
      delete el.dataset.dragging;
      delete el.dataset.pressed;
    };
  };

  return { id, trackRef, prevRef, nextRef, barRef, liveRef, prev, next, goTo, refresh: update, bind };
}

// --- API -------------------------------------------------------------------------------

// Kontroler jednej karuzeli – stabilny przez cały cykl życia komponentu.
export function useCarousel() {
  const id = useId();
  const [carousel] = useState(() => createCarousel(id));
  return carousel;
}

// Tor karuzeli. Każde dziecko trafia do slajdu (snap, wjazd ze staggerem przy pierwszym pojawieniu w widoku).
export function CarouselTrack({ carousel, label, className = '', reveal = true, children }) {
  const inView = useInView(carousel.trackRef, { threshold: 0.12 });
  useLayoutEffect(() => carousel.bind(), [carousel]);
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <>
      <div
        ref={carousel.trackRef}
        id={carousel.id}
        className={`h-scroller h-car__track ${reveal && inView ? 'is-in' : ''} ${className}`.trim()}
        data-reveal={reveal ? '' : undefined}
        role="region"
        aria-roledescription="karuzela"
        aria-label={label}
        tabIndex={0}
      >
        {items.map((child, i) => (
          <div
            key={child.key ?? i}
            className="h-car__slide"
            role="group"
            aria-roledescription="slajd"
            aria-label={`${i + 1} z ${items.length}`}
            style={{ '--i': i }}
          >
            {child}
          </div>
        ))}
      </div>
      <div ref={carousel.liveRef} className="h-visually-hidden" aria-live="polite" aria-atomic="true" />
    </>
  );
}

// Strzałka przycisków karuzeli – eksportowana, żeby własne karuzele (np. Jakość) miały identyczne przyciski
// (.h-car-btns / .h-car-btn z carousel.css).
export function CarouselArrow({ dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path
        d={dir === 'prev' ? 'M16 10H4.5M9.25 5.25 4.5 10l4.75 4.75' : 'M4 10h11.5M10.75 5.25 15.5 10l-4.75 4.75'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Przyciski poprzedni/następny. Na krańcach dostają aria-disabled (zostają w kolejności Tab,
// więc fokus nie „ucieka”, gdy przycisk przestaje działać).
export function CarouselButtons({ carousel, theme = 'light', className = '' }) {
  useLayoutEffect(() => carousel.refresh(), [carousel]);
  return (
    <div className={`h-car-btns h-car-btns--${theme} ${className}`.trim()}>
      <button ref={carousel.prevRef} type="button" className="h-car-btn h-car-btn--prev" aria-label="Poprzednie karty" aria-controls={carousel.id} onClick={carousel.prev}>
        <CarouselArrow dir="prev" />
      </button>
      <button ref={carousel.nextRef} type="button" className="h-car-btn h-car-btn--next" aria-label="Następne karty" aria-controls={carousel.id} onClick={carousel.next}>
        <CarouselArrow dir="next" />
      </button>
    </div>
  );
}

// Kciuk postępu (dekoracyjny – stan przewinięcia widać też po samych kartach).
export function CarouselProgress({ carousel, className = '' }) {
  useLayoutEffect(() => carousel.refresh(), [carousel]);
  return (
    <div className={`h-progress h-car-progress ${className}`.trim()} aria-hidden="true">
      <div ref={carousel.barRef} className="h-progress__bar" />
    </div>
  );
}

// Gotowa karuzela: [renderControls(przyciski)] → tor → pasek postępu.
// Bez renderControls przyciski stoją w stopce obok paska postępu.
export default function Carousel({ label, theme = 'light', renderControls, progress = true, reveal = true, className = '', trackClassName = '', children }) {
  const carousel = useCarousel();
  const controls = <CarouselButtons carousel={carousel} theme={theme} />;
  return (
    <div className={`h-car h-car--${theme} ${className}`.trim()}>
      {renderControls ? renderControls(controls) : null}
      <CarouselTrack carousel={carousel} label={label} className={trackClassName} reveal={reveal}>
        {children}
      </CarouselTrack>
      {(progress || !renderControls) && (
        <div className="h-container h-car__foot">
          {progress && <CarouselProgress carousel={carousel} />}
          {!renderControls && controls}
        </div>
      )}
    </div>
  );
}
