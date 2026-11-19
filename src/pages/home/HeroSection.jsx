import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, MaskLines, useInView, useReducedMotion } from './ui.jsx';
import { cancelIdle, whenIdle } from './film/shots.js';
import TIMING from './heroVideo.json';
import { COMPANY, ROUTES } from '../../../shared/site.js';
import './hero.css';

// Film w hero: realistyczne ujęcia (klipy z Google Flow) zmontowane w pętlę bez szwu skryptem `npm run video:hero` –
// on też zapisuje listę ujęć i ich czasy do heroVideo.json (na siatce klatek filmu).
// (Dawny film liczony na żywo w 3D – ./film/HeroFilm.jsx – służy dziś do eksportu w /studio/film.)
const SHOTS = TIMING.shots.map((s, i) => ({ ...s, from: TIMING.starts[i], clean: TIMING.clean[i], to: TIMING.starts[i + 1] ?? TIMING.loopFrom }));

// Opisy ujęć dla czytników ekranu (wideo i plakat są ukryte) – klucz = nazwa klipu bez numeru.
const SHOT_DESCRIPTIONS = {
  kuchnia: 'kuchnia w kolorze szałwii z dębowym blatem, widziana z głębi jasnego pomieszczenia ze stołem',
  salon: 'salon z granatowym regałem na wymiar, sofą i oknem',
  sypialnia: 'sypialnia z szafą w kolorze szałwii z frontami ramowymi',
  // ujęcia z poprzednich wersji filmu (gdyby wróciły do montażu)
  uklad: 'różowa komoda z szufladami i półkami widziana z góry',
  regal: 'granatowy regał z książkami i ceramiką',
  wnetrze: 'musztardowa ryflowana komoda w jasnym wnętrzu',
};
const plural = (n) => (n === 1 ? 'ujęcie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'ujęcia' : 'ujęć');
const described = SHOTS.map((s) => SHOT_DESCRIPTIONS[s.key]).filter(Boolean);
const FILM_DESCRIPTION = `Film bez dźwięku, ${SHOTS.length} ${plural(SHOTS.length)}${described.length ? `: ${described.join(', ')}` : ''}.`;

// Oszczędzanie danych albo wolne łącze (do 3G): zostaje plakat – film to kilka MB.
function connectionInfo() {
  const c = typeof navigator === 'undefined' ? null : navigator.connection;
  return {
    off: c?.saveData === true || /^(slow-2g|2g|3g)$/.test(c?.effectiveType || ''),
    downlink: typeof c?.downlink === 'number' ? c.downlink : null, // Mb/s (tylko Chromium)
  };
}

// Telefon (i wąskie okno) w pionie widzi tylko ok. 1/3 szerokości kadru 16:9: dostaje pionowy wycinek filmu 608×1080
// z częścią kadru, w której stoją meble – ta sama gęstość pikseli co 1080p na ekranie, plik ok. 3× mniejszy.
const PORTRAIT = '(max-aspect-ratio: 4/5)';
const isPortrait = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(PORTRAIT).matches);

// Pozostałe ekrany: 1080p, gdy kadr ma na ekranie > ~900 px wysokości w pikselach urządzenia, a łącze to uniesie
// (przy object-fit: cover kadr jest wyższy od hero w oknie szerszym niż 16:9), w innym razie 720p.
function pickSource(downlink) {
  if (TIMING.src.mobile && isPortrait()) return TIMING.src.mobile;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const heroH = Math.min(1200, Math.max(620, window.innerHeight));
  const frameH = Math.max(heroH, (document.documentElement.clientWidth * 9) / 16) * dpr;
  const fast = downlink == null || downlink >= 3.5;
  return frameH > 900 && fast ? TIMING.src['1080'] : TIMING.src['720'];
}

export default function HeroSection() {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const fills = useRef([]);
  const shotButtons = useRef([]);
  const painted = useRef({ shot: -1, bars: [] });
  const pendingSeek = useRef(null); // przeskok kliknięty, zanim film miał metadane
  const visible = useInView(sectionRef, { once: false, rootMargin: '0px', threshold: 0.02 });
  const [net] = useState(connectionInfo);
  const [src, setSrc] = useState(null); // ustawiane dopiero, gdy film ma grać (albo po kliknięciu) – bez zbędnych MB
  const [ready, setReady] = useState(false); // pierwsza klatka filmu gotowa → film przykrywa plakat
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true); // zamiar: odtwarzanie / pauza (przycisk, ograniczony ruch)
  const [intro, setIntro] = useState(false);
  const showVideo = !net.off && !failed;

  // start animacji wejścia po pierwszym malowaniu strony
  useEffect(() => {
    const id = requestAnimationFrame(() => setIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ograniczony ruch: bez autoodtwarzania – plakat i przycisk „Odtwórz film” (WCAG 2.2.2)
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  // automatyczny start: film dopiero po fontach i w wolnej chwili, i tylko gdy ma grać w widoku
  // (wejście na /#kontakt albo ograniczony ruch nie pobierają filmu)
  const wantsAutoplay = showVideo && !src && playing && visible;
  useEffect(() => {
    if (!wantsAutoplay) return undefined;
    let alive = true;
    let handle = null;
    const start = () => {
      if (!alive || handle) return;
      handle = whenIdle(() => alive && setSrc(pickSource(net.downlink)), 1500);
    };
    const fonts = typeof document !== 'undefined' ? document.fonts?.ready : null;
    if (fonts) fonts.then(start, start);
    else start();
    const fallback = window.setTimeout(start, 2000); // gdyby fonty wczytywały się bardzo długo
    return () => {
      alive = false;
      window.clearTimeout(fallback);
      cancelIdle(handle);
    };
  }, [wantsAutoplay, net.downlink]);

  // paski ujęć i aria-current – zapis do DOM tylko przy zmianie (bez re-renderów React)
  const paint = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime || 0;
    const looping = t >= TIMING.loopFrom; // końcowe przenikanie w pierwsze ujęcie – paski od zera
    let shot = SHOTS.findIndex((s) => t >= s.from && t < s.to);
    if (shot < 0) shot = 0;
    const p = painted.current;
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i];
      const val = looping ? 0 : i < shot ? 1 : i > shot ? 0 : Math.min(1, Math.max(0, (t - s.from) / (s.to - s.from)));
      const el = fills.current[i];
      if (el && p.bars[i] !== val) {
        p.bars[i] = val;
        el.style.transform = `scaleX(${val})`;
      }
    }
    if (shot !== p.shot) {
      p.shot = shot;
      shotButtons.current.forEach((el, i) => {
        if (!el) return;
        if (i === shot) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
      });
    }
  }, []);

  // odtwarzanie tylko, gdy nie ma pauzy i hero jest na ekranie (poza widokiem film stoi – oszczędza baterię)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.muted = true; // iOS/Safari: autoodtwarzanie wyłącznie bez dźwięku (film i tak nie ma ścieżki audio)
    v.defaultMuted = true;
    if (playing && visible) {
      const p = v.play();
      // tylko prawdziwa blokada (np. tryb oszczędzania energii w Safari) zmienia zamiar na pauzę;
      // AbortError = play() przerwane przez pause() przy zjechaniu z ekranu – zamiar odtwarzania zostaje
      if (p) p.catch((e) => e?.name === 'NotAllowedError' && setPlaying(false));
    } else {
      v.pause();
    }
  }, [playing, visible, src]);

  // paski w rytmie klatek filmu: requestVideoFrameCallback (24 Hz, także po zapętleniu i przewinięciu, sam staje przy pauzie);
  // starsze przeglądarki – rAF, który działa, dopóki film gra (zapętlenie w Firefoksie nie wysyła 'playing')
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return undefined;
    const vfc = typeof v.requestVideoFrameCallback === 'function';
    let id = 0;
    const tick = () => {
      id = 0;
      paint();
      schedule();
    };
    function schedule() {
      if (id || v.paused) return;
      id = vfc ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    }
    const cancel = () => {
      if (!id) return;
      if (vfc) v.cancelVideoFrameCallback(id);
      else cancelAnimationFrame(id);
      id = 0;
    };
    const onStop = () => {
      cancel();
      paint();
    };
    const onSeeked = () => {
      paint();
      schedule();
    };
    v.addEventListener('play', schedule);
    v.addEventListener('playing', schedule);
    v.addEventListener('pause', onStop);
    v.addEventListener('seeked', onSeeked);
    schedule();
    return () => {
      cancel();
      v.removeEventListener('play', schedule);
      v.removeEventListener('playing', schedule);
      v.removeEventListener('pause', onStop);
      v.removeEventListener('seeked', onSeeked);
    };
  }, [src, paint]);

  // obrót telefonu (albo zmiana proporcji okna): druga wersja filmu – pionowy wycinek ↔ pełny kadr – od tego samego
  // miejsca; do wczytania nowej wersji widać plakat w pasujących proporcjach (bez czarnej klatki)
  useEffect(() => {
    if (!src || !TIMING.src.mobile || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PORTRAIT);
    const onChange = () => {
      const next = pickSource(net.downlink);
      if (next === src) return;
      const v = videoRef.current;
      if (v && v.readyState >= 1) pendingSeek.current = v.currentTime;
      setReady(false);
      setSrc(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [src, net.downlink]);

  // wyjście ze strony głównej w trakcie buforowania: odłączony element nie pobiera dalej filmu
  // (nie konkuruje o łącze z podstronami, do których prowadzą przyciski hero). Przy zmianie wersji filmu element
  // zostaje w dokumencie z nowym src – wtedy nic nie robimy (React podmienił już atrybut).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return undefined;
    return () => {
      if (v.isConnected) return;
      v.pause();
      v.removeAttribute('src');
      v.load();
    };
  }, [src]);

  // przycisk pauzy; przy ograniczonym ruchu film pobiera się dopiero teraz
  const togglePlay = () => {
    if (!src && showVideo) setSrc(pickSource(net.downlink));
    setPlaying((p) => !p);
  };

  // przeskok do ujęcia: środek pierwszej czystej klatki (klatka kluczowa); pauza zostaje pauzą (pokazuje kadr ujęcia)
  const jumpTo = (i) => {
    const t = SHOTS[i].clean;
    const v = videoRef.current;
    if (!src && showVideo) {
      pendingSeek.current = t;
      setSrc(pickSource(net.downlink));
      return;
    }
    if (!v) return;
    if (v.readyState >= 1) v.currentTime = t;
    else pendingSeek.current = t;
    paint();
  };

  return (
    <section ref={sectionRef} className={`h-hero ${intro ? 'is-intro' : ''} ${ready ? 'is-ready' : ''}`} aria-labelledby="hero-title">
      {/* plakat = pierwsza klatka filmu: widoczny od razu (LCP), film płynnie go przykrywa po wczytaniu;
          w pionie – pierwsza klatka pionowego wycinka (ten sam kadr co film na telefonie, ok. 3× mniejszy plik) */}
      <picture>
        {TIMING.posterMobile && <source media={PORTRAIT} srcSet={TIMING.posterMobile} />}
        <img className="h-hero__poster" src={TIMING.poster} alt="" fetchPriority="high" decoding="async" />
      </picture>
      {showVideo && (
        <div className="h-hero__media">
          <video
            ref={videoRef}
            className="h-hero__video"
            src={src ?? undefined}
            muted
            loop
            playsInline
            preload={playing ? 'auto' : 'metadata'}
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={(e) => {
              if (pendingSeek.current != null) {
                e.currentTarget.currentTime = pendingSeek.current;
                pendingSeek.current = null;
              }
            }}
            onLoadedData={() => {
              setReady(true);
              paint();
            }}
            onError={() => {
              if (src) setFailed(true);
            }}
          />
        </div>
      )}
      <div className="h-hero__shade" aria-hidden="true" />

      <div className="h-hero__content">
        <div className="h-container">
          {/* blok tekstu z własnym przyciemnieniem (::before) – kontrast niezależny od kadru filmu */}
          <div className="h-hero__copy">
            <span className="h-hero__eyebrow">{COMPANY.brand} · meble na wymiar i usługi stolarskie</span>
            {/* wersja wizualna (animowana linia po linii) + jeden prawdziwy nagłówek h1 dla czytników ekranu;
                hasło firmy z tekstów właścicielki: „doświadczenie, które widać w detalach” */}
            <div aria-hidden="true">
              <MaskLines as="div" className="h-hero__title" lines={['Doświadczenie,', 'które widać w\u00a0detalach']} play={intro} delay={260} stagger={120} />
            </div>
            <h1 id="hero-title" className="h-visually-hidden">
              {COMPANY.brand} – doświadczenie, które widać w detalach. Meble na wymiar i usługi stolarskie.
            </h1>
            <p className="h-hero__lead">
              Od około 11&nbsp;lat zajmujemy się stolarstwem: meble na wymiar dla klientów indywidualnych i&nbsp;firm oraz usługi stolarskie&nbsp;–
              cięcie, oklejanie, frezowanie i&nbsp;gięcie.
            </p>
            <div className="h-hero__actions">
              <Link className="h-btn h-btn--light" to={ROUTES.quote}>
                Zapytaj o wycenę <ArrowIcon />
              </Link>
              <Link className="h-btn h-btn--outline-light" to={ROUTES.b2b}>
                Usługi B2B
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="h-hero__controls" hidden={!showVideo}>
        {/* opis filmu dla czytników ekranu (wideo i plakat są ukryte) – znika razem z kontrolkami */}
        <p className="h-visually-hidden">{FILM_DESCRIPTION}</p>
        <ol className="h-hero__shots" aria-label="Ujęcia filmu">
          {SHOTS.map((s, i) => (
            <li key={s.key}>
              {/* aria-current na bieżącym ujęciu ustawia paint() (jak wypełnienie pasków) */}
              <button
                type="button"
                className="h-hero__shot"
                ref={(el) => (shotButtons.current[i] = el)}
                onClick={() => jumpTo(i)}
                aria-label={`Przejdź do ujęcia: ${s.label}`}
              >
                <span className="h-hero__shot-label">{s.label}</span>
                <span className="h-hero__shot-track">
                  <span className="h-hero__shot-fill" ref={(el) => (fills.current[i] = el)} />
                </span>
              </button>
            </li>
          ))}
        </ol>
        {/* stan wyrażony etykietą (bez aria-pressed – razem dawały sprzeczny komunikat) */}
        <button type="button" className="h-hero__pause" aria-label={playing ? 'Wstrzymaj film' : 'Odtwórz film'} onClick={togglePlay}>
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="3" y="2" width="2.4" height="10" rx="1" fill="currentColor" />
              <rect x="8.6" y="2" width="2.4" height="10" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M4 2.5v9a.6.6 0 0 0 .9.5l7.4-4.5a.6.6 0 0 0 0-1L4.9 2a.6.6 0 0 0-.9.5Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      <a className="h-hero__scroll" href="#start" aria-label="Przewiń do treści">
        <span />
      </a>
    </section>
  );
}
