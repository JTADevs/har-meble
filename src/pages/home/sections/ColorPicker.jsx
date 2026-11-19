// Sekcja „Twój kolor” (#kolory): trzy meble na żywym 3D, pod każdym próbnik dekorów.
// Ten plik trafia do głównego JS strony, więc renderuje wyłącznie DOM: karty, próbki i szkice 2D
// (zaślepki, które też zmieniają kolor). Scena 3D (three.js) to osobny moduł ładowany przez React.lazy,
// gdy sekcja jest ok. 300 px od ekranu i przeglądarka ma WebGL2; poza ekranem płótno jest wstrzymane
// (useInViewFrameloop), a w spoczynku nie rysuje (tryb „demand”).
// Bez WebGL2 albo po błędzie sceny zostają szkice 2D – sekcja działa dalej.
import './colorpicker.css';
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DECORS } from '../../../../shared/catalog.js';
import { ArrowIcon, LINKS, SectionHead, hasWebGL2, useInView, useInViewFrameloop, useReducedMotion } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';
import {
  COLOR_MODELS,
  DRAG_LIMIT,
  GL_EXTRA,
  ROTATE_STEP,
  SPRING_BUTTON,
  SPRING_DRAG,
  cancelIdle,
  idle,
  isWood,
  materialLabel,
  softDrag,
  tintAlpha,
  unsoftDrag,
} from './colorpicker/data.js';
import { ModelSketch } from './colorpicker/Sketches.jsx';

const ColorStage = lazy(() => import('./colorpicker/ColorStage.jsx'));

// Scena 3D tylko na komputerze (szeroki ekran i mysz). Telefony i tablety dostają szkice 2D, które też zmieniają kolor –
// bez ok. 250 kB JS (three.js, gzip) i pracy GPU przy przewijaniu; tak samo przy włączonym oszczędzaniu danych.
const RICH_3D = '(min-width: 900px) and (pointer: fine)';
const wantsRich3d = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.(RICH_3D).matches) && navigator.connection?.saveData !== true;

function useRich3d() {
  const [rich, setRich] = useState(wantsRich3d);
  useEffect(() => {
    const mq = window.matchMedia?.(RICH_3D);
    if (!mq) return undefined;
    const update = () => setRich(wantsRich3d());
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return rich;
}

const cx = (...names) => names.filter(Boolean).join(' ');

// Błąd sceny 3D (utrata kontekstu, nieudane pobranie modułu) nie może wywrócić strony – zostają szkice 2D.
class StageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9M13.5 8a5.5 5.5 0 0 1-9.4 3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.2 1.8v2.6H9.6M3.8 14.2v-2.6h2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Strzałka obrotu: ↻ (w prawo, zgodnie z ruchem wskazówek zegara) albo ↺ (w lewo).
function TurnIcon({ dir }) {
  const arc = dir > 0 ? 'M11.71 4.79A5.25 5.25 0 1 1 8 3.25' : 'M4.29 4.79A5.25 5.25 0 1 0 8 3.25';
  const head = dir > 0 ? 'M6.16 1.71 8 3.25 6.16 4.79' : 'M9.84 1.71 8 3.25 9.84 4.79';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d={arc} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d={head} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Próbnik: grupa radiowa z „wędrującym” tabindexem – Tab wchodzi na wybraną próbkę, strzałki zmieniają wybór.
function Swatches({ model, value, thumbs, onSelect, onIntent, onTipsReset }) {
  const refs = useRef([]);
  const ids = model.decors;
  const pick = (k) => {
    const idx = ((k % ids.length) + ids.length) % ids.length;
    onSelect(ids[idx]);
    refs.current[idx]?.focus();
  };
  const onKeyDown = (e) => {
    const i = Math.max(0, ids.indexOf(value));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pick(i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pick(i - 1);
    else if (e.key === 'Home') pick(0);
    else if (e.key === 'End') pick(ids.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div className="h-color-swatches" role="radiogroup" aria-label={`Kolor – ${model.name.toLowerCase()}`} onKeyDown={onKeyDown}>
      {ids.map((id, k) => {
        const d = DECORS[id];
        const on = id === value;
        const url = thumbs[id];
        const wood = isWood(id);
        // kursor albo fokus na próbce: schowany klawiszem Esc dymek wraca, a tekstura drewna szykuje się zawczasu
        const intent = () => {
          onTipsReset();
          if (wood) onIntent(id);
        };
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[k] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={d.name}
            tabIndex={on ? 0 : -1}
            className="h-color-sw"
            data-tip={d.name}
            onPointerEnter={intent}
            onFocus={intent}
            onPointerDown={wood ? () => onIntent(id) : undefined}
            onClick={() => onSelect(id)}
          >
            <span
              className="h-color-dot"
              style={url ? { backgroundColor: d.hex, backgroundImage: `url(${url})` } : { backgroundColor: d.hex }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ColorCard({ model, index, decor, thumbs, viewRef, rotatable, onSelect, onIntent, onTipsReset, onRotate, drag }) {
  const d = DECORS[decor];
  return (
    <li className="h-color-card" style={{ '--i': index }}>
      <div className="h-color-frame">
        <div
          ref={viewRef}
          className="h-color-view"
          role="img"
          aria-label={`${model.name} w dekorze ${d.name} – ${model.tag.toLowerCase()}`}
          style={{ '--h-color-fill': d.hex, '--h-color-tint': d.hex, '--h-color-tint-a': tintAlpha(d.hex) }}
          onPointerDown={drag.down}
          onPointerMove={drag.move}
          onPointerUp={drag.end}
          onPointerCancel={drag.end}
          onLostPointerCapture={drag.end}
        >
          <ModelSketch kind={model.id} />
          <span className="h-color-tag" aria-hidden="true">
            {model.tag}
          </span>
          <span className="h-color-hint" aria-hidden="true">
            <RotateIcon />
            Przeciągnij
          </span>
        </div>
        {/* obrót bez przeciągania (klik, dotyk, klawiatura) – poza elementem z role="img", nad płótnem 3D */}
        {rotatable && (
          <div className="h-color-rot" role="group" aria-label={`Obrót modelu – ${model.name.toLowerCase()}`}>
            <button type="button" className="h-color-rot__btn" aria-label="Obróć w lewo" onClick={() => onRotate(-1)}>
              <TurnIcon dir={-1} />
            </button>
            <button type="button" className="h-color-rot__btn" aria-label="Obróć w prawo" onClick={() => onRotate(1)}>
              <TurnIcon dir={1} />
            </button>
          </div>
        )}
      </div>

      <div className="h-color-body">
        <h3 className="h-color-name">{model.name}</h3>
        <p className="h-color-desc">{model.desc}</p>
        <Swatches model={model} value={decor} thumbs={thumbs} onSelect={onSelect} onIntent={onIntent} onTipsReset={onTipsReset} />
        <div className="h-color-foot">
          <p className="h-color-current">
            <span className="h-visually-hidden">Wybrany kolor: </span>
            {/* key – nazwa wjeżdża na nowo przy każdej zmianie */}
            <span key={decor} className="h-color-current__name">
              {d.name}
            </span>
            <span className="h-color-current__mat">{materialLabel(model, decor)}</span>
          </p>
          {!FEATURES.configurator || model.link === 'kontakt' ? (
            // wizytówka (albo mebel spoza konfiguratora) – formularz wyceny z rodzajem mebla i wybranym dekorem
            <Link
              className="h-link h-color-link"
              to={`${ROUTES.quote}?mebel=${encodeURIComponent(model.mebel)}&dekor=${encodeURIComponent(d.name)}`}
            >
              {FEATURES.configurator ? model.cta : 'Zapytaj o wycenę'}
              <span className="h-visually-hidden">
                {' '}
                – {model.name.toLowerCase()} w dekorze {d.name}
              </span>
              <ArrowIcon size={14} />
            </Link>
          ) : (
            // konfigurator otwiera się w wybranym dekorze (?dekor= – dobiera materiał frontu z tym dekorem)
            <Link className="h-link h-color-link" to={`${LINKS[model.link]}?dekor=${encodeURIComponent(decor)}`}>
              {model.cta}
              <span className="h-visually-hidden">
                {' '}
                {model.ctaHint} w dekorze {d.name}
              </span>
              <ArrowIcon size={14} />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ColorPicker() {
  const sectionRef = useRef(null);
  const railRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  // stała tablica refów do „okien” kart – scena 3D mierzy je w każdej klatce
  const viewRefs = useRef(COLOR_MODELS.map(() => ({ current: null }))).current;
  // stan obrotu współdzielony ze sceną bez re-renderów: drag – bieżący kąt [rad], hold – kąt z przycisków,
  // dragging, touched – był już obrót użytkownika, spring – sztywność powrotu do hold
  const interactRef = useRef(COLOR_MODELS.map(() => ({ drag: 0, hold: 0, dragging: false, touched: false, spring: SPRING_DRAG })));
  // most do sceny 3D (ustawia ColorStage): wake() – nowa klatka, prepare(id) – tekstura drewna zawczasu
  const stageApi = useRef(null);
  const gesture = useRef(null);

  const reduced = useReducedMotion();
  const rich3d = useRich3d();
  const near = useInView(trackRef, { rootMargin: '300px 0px 300px 0px', threshold: 0 });
  const shown = useInView(trackRef);
  const frameloop = useInViewFrameloop(trackRef);

  const [decors, setDecors] = useState(() => COLOR_MODELS.map((m) => m.initial));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [thumbs, setThumbs] = useState({});

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);
  const prepareDecor = useCallback((id) => stageApi.current?.prepare(id), []);
  const showTips = useCallback(() => {
    const el = sectionRef.current;
    if (el?.dataset.tips) delete el.dataset.tips;
  }, []);

  const select = (i, id) => setDecors((prev) => (prev[i] === id ? prev : prev.map((d, j) => (j === i ? id : d))));

  // three.js r176 wymaga WebGL2 – bez niego (albo na telefonie, patrz RICH_3D) scena się nie montuje, zostają szkice 2D
  const gl2 = near && rich3d && hasWebGL2();
  const live3d = ready && !failed;
  // obrót (mysz i przyciski) tylko na żywym 3D i bez ograniczenia ruchu
  const dragOn = live3d && !reduced;

  // Miniatury dekorów drewnianych do próbek: textures.js ciągnie three.js, więc ładujemy go dopiero przy
  // zbliżaniu się sekcji i generujemy po jednej miniaturze w wolnych chwilach (do tego czasu – kolor hex).
  useEffect(() => {
    if (!near) return undefined;
    let alive = true;
    let handle = 0;
    const woods = [...new Set(COLOR_MODELS.flatMap((m) => m.decors).filter(isWood))];
    import('../../../three/textures.js')
      .then(({ decorSwatchURL }) => {
        let i = 0;
        const step = () => {
          if (!alive) return;
          const id = woods[i++];
          if (!id) return;
          const url = decorSwatchURL(id);
          if (url) setThumbs((t) => ({ ...t, [id]: url }));
          handle = idle(step);
        };
        if (alive) handle = idle(step);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelIdle(handle);
    };
  }, [near]);

  // Pasek postępu karuzeli (telefon/tablet): szerokość = widoczna część, przesunięcie = postęp.
  useEffect(() => {
    const rail = railRef.current;
    const bar = barRef.current;
    if (!rail || !bar) return undefined;
    let raf = 0;
    let visible = 1;
    const update = () => {
      raf = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 1 ? rail.scrollLeft / max : 0;
      bar.style.transform = `translate3d(${(p * (1 / visible - 1) * 100).toFixed(2)}%, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      visible = rail.scrollWidth > 0 ? Math.min(1, rail.clientWidth / rail.scrollWidth) : 1;
      bar.style.width = `${(visible * 100).toFixed(2)}%`;
      onScroll();
    };
    onResize();
    rail.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(rail);
    return () => {
      rail.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Płótno 3D obejmuje tylko rząd okien (+ zapas na wjazd kart od dołu), bez części tekstowej kart – mniejszy
  // bufor WebGL. Wysokość z układu (offsetHeight nie zawiera transformacji wjazdu); okna mają te same proporcje.
  // Bez ResizeObservera zostaje wartość zapasowa z CSS (cały tor).
  useEffect(() => {
    const track = trackRef.current;
    const view = viewRefs[0].current;
    if (!track || !view || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const pad = parseFloat(getComputedStyle(track).paddingTop) || 0;
      track.style.setProperty('--h-color-gl-h', `${Math.ceil(pad + view.offsetHeight + GL_EXTRA)}px`);
    });
    ro.observe(view);
    return () => ro.disconnect();
  }, [viewRefs]);

  // Esc chowa dymek z nazwą dekoru (WCAG 1.4.13) – wraca po najechaniu na próbkę albo zmianie fokusu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && sectionRef.current) sectionRef.current.dataset.tips = 'off';
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Obrót myszą (±30°, z miękkim oporem). Tylko mysz/rysik: dotyk zostaje dla przewijania strony i karuzeli
  // (na dotyku i z klawiatury obracają przyciski w rogu okna). Ruch budzi płótno – rysuje ono tylko na żądanie.
  const dragFor = (i) => ({
    down: (e) => {
      if (!dragOn || e.button !== 0 || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
      const el = e.currentTarget;
      const st = interactRef.current[i];
      st.dragging = true;
      st.touched = true;
      gesture.current = { i, id: e.pointerId, x0: e.clientX, raw0: unsoftDrag(st.drag), w: Math.max(220, el.clientWidth) };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* przeglądarka bez przechwytywania – przeciąganie działa, dopóki kursor jest nad kartą */
      }
      el.dataset.dragging = 'true';
      if (trackRef.current) trackRef.current.dataset.dragged = 'true';
      e.preventDefault();
      stageApi.current?.wake();
    },
    move: (e) => {
      const g = gesture.current;
      if (!g || g.i !== i || g.id !== e.pointerId) return;
      const st = interactRef.current[i];
      st.drag = softDrag(g.raw0 + ((e.clientX - g.x0) / g.w) * Math.PI * 0.6);
      stageApi.current?.wake();
    },
    end: (e) => {
      const g = gesture.current;
      if (!g || g.i !== i || g.id !== e.pointerId) return;
      const st = interactRef.current[i];
      st.dragging = false;
      st.spring = SPRING_DRAG; // po puszczeniu wraca leniwie do kąta z przycisków (domyślnie spoczynek)
      gesture.current = null;
      delete e.currentTarget.dataset.dragging;
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* już zwolnione */
      }
      stageApi.current?.wake();
    },
  });

  // Przyciski obrotu: krok 15° w zakresie ±30°; kąt zostaje (to wybór użytkownika, nie chwilowe przeciągnięcie).
  const rotate = (i, dir) => {
    const st = interactRef.current[i];
    st.hold = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, st.hold + dir * ROTATE_STEP));
    st.spring = SPRING_BUTTON;
    st.touched = true;
    stageApi.current?.wake();
  };

  return (
    <section id="kolory" ref={sectionRef} className="h-section h-color">
      <div className="h-container">
        <SectionHead
          align="center"
          eyebrow="Twój kolor"
          title={['Wybierz kolor.', rich3d ? 'Zobacz go od razu w\u00a03D.' : 'Zobacz go od razu.']}
          lead={
            FEATURES.configurator
              ? 'Kliknij próbkę, a mebel zmieni wykończenie na Twoich oczach. Te same dekory dobierzesz w konfiguratorze kuchni i szaf – do własnych wymiarów, z ceną orientacyjną liczoną na bieżąco.'
              : 'Kliknij próbkę, a mebel zmieni wykończenie na Twoich oczach. Wybrany kolor dołączysz do zapytania o wycenę – a jeśli nie masz jeszcze wybranych materiałów, pomożemy Ci je dobrać.'
          }
        />
      </div>

      <div className="h-color-rail" ref={railRef}>
        <div ref={trackRef} className={cx('h-color-track', shown && 'is-in', live3d && 'is-3d', dragOn && 'is-drag')}>
          <ul className="h-color-grid" aria-label="Meble do wyboru koloru">
            {COLOR_MODELS.map((m, i) => (
              <ColorCard
                key={m.id}
                model={m}
                index={i}
                decor={decors[i]}
                thumbs={thumbs}
                viewRef={viewRefs[i]}
                rotatable={dragOn}
                onSelect={(id) => select(i, id)}
                onIntent={prepareDecor}
                onTipsReset={showTips}
                onRotate={(dir) => rotate(i, dir)}
                drag={dragFor(i)}
              />
            ))}
          </ul>

          {gl2 && !failed && (
            // Szkice chowa klasa is-3d (gdy scena gotowa), płótno pokazuje is-on. Przy ograniczonym ruchu karty są
            // widoczne od razu, więc płótno też – bez czekania na wjazd sekcji (inaczej okna byłyby chwilę puste).
            <div className={cx('h-color-gl', live3d && (shown || reduced) && 'is-on')} aria-hidden="true">
              <StageBoundary onError={onFail}>
                <Suspense fallback={null}>
                  <ColorStage
                    viewRefs={viewRefs}
                    decors={decors}
                    reduced={reduced}
                    frameloop={frameloop}
                    interactRef={interactRef}
                    play={shown}
                    apiRef={stageApi}
                    onReady={onReady}
                    onError={onFail}
                  />
                </Suspense>
              </StageBoundary>
            </div>
          )}
        </div>
      </div>

      <div className="h-container">
        <div className="h-progress h-color-progress" aria-hidden="true">
          <span className="h-progress__bar" ref={barRef} />
        </div>
        <p className="h-small h-color-note">
          Odcień na ekranie zależy od ustawień monitora – przed zamówieniem warto zobaczyć próbkę dekoru na żywo.
        </p>
      </div>
    </section>
  );
}
