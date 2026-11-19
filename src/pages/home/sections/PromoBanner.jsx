// Duży baner ze zdjęciem: w wizytówce – usługi B2B dla stolarni, w pełnej wersji – konfigurator 3D.
// Przy wjeżdżaniu w ekran karta „rozkłada się”
// (clip-path rośnie od wcięcia do pełnej karty), a zdjęcie przesuwa się wolniej niż strona (parallaxa).
// Postęp liczy useScrollProgress w rAF, a wynik trafia do zmiennych CSS na karcie – bez re-renderów React.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, Img, LINKS, MaskLines, RENDERS, Reveal, useReducedMotion, useScrollProgress } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';
import './promo.css';

// B2B: tymczasowo zdjęcie zabudowy – docelowo zdjęcie z warsztatu HAR MEBLE (formatki, piła, okleiniarka).
const IMAGE = FEATURES.configurator ? RENDERS.kuchniaZielen : (RENDERS.b2b ?? RENDERS.kuchniaZielen);

// Szerokość obrazu w układzie: karta na całą szerokość kontenera, zdjęcie w skali 1.12 (parallaxa).
// Na telefonie karta jest wysoka (min. 440 px), więc kadr 16:10 skaluje się do wysokości – obraz ma ~800 px szerokości.
const IMAGE_SIZES = '(max-width: 699px) 800px, (max-width: 1360px) 100vw, 1360px';

// Postęp przejazdu karty przez ekran (0–1), przy którym jest już w pełni rozłożona.
// 0,5 = środek karty na środku ekranu, więc karta kończy się rozkładać tuż po wycentrowaniu.
const REVEAL_UNTIL = 0.55;

const round3 = (value) => Math.round(value * 1000) / 1000;

export default function PromoBanner() {
  const cardRef = useRef(null);
  const last = useRef({ reveal: NaN, shift: NaN });
  const reduced = useReducedMotion();

  useScrollProgress(cardRef, (progress) => {
    const card = cardRef.current;
    // Przy ograniczonym ruchu CSS i tak wyłącza clip-path i parallaxę – nie ma czego liczyć.
    if (!card || reduced) return;
    const t = Math.min(1, progress / REVEAL_UNTIL);
    const reveal = round3(t * (2 - t)); // ease-out: wyraźny start, miękkie dojście do pełnej karty
    const shift = round3(progress * 2 - 1); // −1 karta wjeżdża od dołu … 1 karta wyjeżdża górą
    const prev = last.current;
    // Zapis tylko przy zmianie – poza ekranem postęp stoi na 0 lub 1, więc styl nie jest unieważniany.
    if (reveal !== prev.reveal) {
      prev.reveal = reveal;
      card.style.setProperty('--h-promo-reveal', String(reveal));
    }
    if (shift !== prev.shift) {
      prev.shift = shift;
      card.style.setProperty('--h-promo-shift', String(shift));
    }
  });

  return (
    <section className="h-promo">
      <div className="h-container">
        <div ref={cardRef} className="h-promo-card">
          <div className="h-promo-media">
            <Img src={IMAGE.src} alt={IMAGE.alt} frameClass="h-promo-frame" sizes={IMAGE_SIZES} />
          </div>
          <span className="h-promo-shade" aria-hidden="true" />

          <div className="h-promo-content">
            {FEATURES.configurator ? (
              <>
                <Reveal as="span" className="h-eyebrow h-promo-eyebrow" y={12}>
                  Konfigurator 3D
                </Reveal>
                <MaskLines
                  as="h2"
                  className="h-title h-promo-title"
                  lines={['Kuchnia w\u00a03D', 'w\u00a0kilkanaście minut']}
                  delay={60}
                />
                {/* 26 dekorów to fronty i blaty razem (kamień i beton są tylko na blat) */}
                <Reveal as="p" className="h-lead h-promo-lead" delay={160}>
                  Ułóż szafki w&nbsp;układzie I&nbsp;lub L, dobierz fronty i&nbsp;blat spośród 26&nbsp;dekorów. Cena
                  orientacyjna przelicza się przy każdej zmianie.
                </Reveal>
                <Reveal className="h-promo-actions" delay={260} y={16}>
                  <Link to={LINKS.kuchnia} className="h-btn h-btn--light">
                    Zaprojektuj kuchnię
                    <ArrowIcon />
                  </Link>
                  <Link to={LINKS.szafa} className="h-btn h-btn--outline-light">
                    Zaprojektuj szafę
                  </Link>
                </Reveal>
              </>
            ) : (
              <>
                <Reveal as="span" className="h-eyebrow h-promo-eyebrow" y={12}>
                  Usługi B2B
                </Reveal>
                <MaskLines as="h2" className="h-title h-promo-title" lines={['Wsparcie', 'dla Twojej stolarni']} delay={60} />
                {/* zdania z tekstów właścicielki o usługach B2B */}
                <Reveal as="p" className="h-lead h-promo-lead" delay={160}>
                  Obróbka materiałów i&nbsp;przygotowanie elementów do dalszej produkcji oraz montażu: cięcie, oklejanie, nawiercanie,
                  frezowanie, gięcie, szlifowanie i&nbsp;heblowanie. Przy pojedynczych zleceniach i&nbsp;stałej współpracy.
                </Reveal>
                <Reveal className="h-promo-actions" delay={260} y={16}>
                  <Link to={ROUTES.b2b} className="h-btn h-btn--light">
                    Zobacz usługi B2B
                    <ArrowIcon />
                  </Link>
                  <Link to={ROUTES.quoteB2B} className="h-btn h-btn--outline-light">
                    Wyślij zapytanie B2B
                  </Link>
                </Reveal>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
