// Sekcja FAQ (#faq): nagłówek z odnośnikiem do kontaktu + akordeon najczęstszych pytań.
// Akordeon wg wzorca WAI-ARIA: przycisk w nagłówku h3 (aria-expanded / aria-controls), strzałki góra/dół
// oraz Home/End przenoszą fokus między pytaniami. Panele bez role="region" – przy 7 niezależnie otwieranych
// pytaniach tworzyłyby do 7 punktów orientacyjnych (APG odradza to powyżej ~6 paneli); powiązanie z pytaniem
// dają aria-controls i aria-expanded przycisku. Wysokość panelu animowana przez grid-template-rows 0fr → 1fr;
// zamknięty panel dostaje visibility: hidden dopiero po zwinięciu (znika wtedy z drzewa dostępności i z kolejności Tab).
import { useRef, useState } from 'react';
import { ArrowIcon, Reveal, SectionHead, useInView } from '../ui.jsx';
import { COMPANY, FEATURES } from '../../../../shared/site.js';
import './faq.css';

// Wizytówka: odpowiedzi z tekstów właścicielki (wstępna wycena z formularza, co przygotować, regiony, usługi B2B).
const L1 = COMPANY.locations[0];
const L2 = COMPANY.locations[1];
const SITE_QUESTIONS = [
  {
    q: 'Czy wycena z\u00a0formularza jest ostateczna?',
    a: 'Nie\u00a0– przesłane informacje posłużą do przygotowania wstępnej wyceny. Ostateczną cenę potwierdzimy po uzgodnieniu szczegółów i\u00a0weryfikacji wymiarów.',
  },
  {
    q: 'Co przygotować do zapytania o\u00a0wycenę?',
    a: 'Rodzaj mebli i\u00a0zakres prac, wymiary (najlepiej w\u00a0milimetrach), preferowane materiały, kolory i\u00a0wykończenia, oczekiwane wyposażenie, np. szuflady, oświetlenie, lustra lub przeszklenia, miejscowość realizacji z\u00a0informacją, czy potrzebujesz transportu i\u00a0montażu, preferowany termin oraz dane kontaktowe. Im dokładniejsze informacje, tym precyzyjniej przygotujemy wycenę.',
  },
  {
    q: 'Nie mam projektu. Co zrobić?',
    a: 'Przygotuj opis mebli i\u00a0ich przeznaczenia. Podaj szerokość, wysokość i\u00a0głębokość planowanej zabudowy oraz oczekiwany układ szafek, półek i\u00a0szuflad. Możesz dołączyć odręczny szkic z\u00a0wymiarami, zdjęcia pomieszczenia i\u00a0inspiracje. Jeśli nie masz jeszcze wybranych materiałów lub rozwiązań, pomożemy Ci je dobrać.',
  },
  {
    q: 'Gdzie działacie?',
    a: `Na Śląsku i\u00a0w\u00a0Wielkopolsce. Siedziba firmy: ${L1.street}, ${L1.postal} ${L1.city}; oddział: ${L2.street}, ${L2.postal} ${L2.city}. ${COMPANY.visitNote}`,
  },
  {
    q: 'Czy wykonujecie usługi dla firm?',
    a: `Tak. Stolarniom, producentom mebli i\u00a0firmom realizującym zabudowy oferujemy cięcie, oklejanie, nawiercanie, frezowanie, gięcie, szlifowanie i\u00a0heblowanie\u00a0– przy pojedynczych zleceniach i\u00a0stałej współpracy. Zapytania B2B: ${COMPANY.emailB2B} albo formularz wyceny.`,
  },
  {
    q: 'W\u00a0jakich jednostkach podawać wymiary?',
    a: 'Najlepiej w\u00a0milimetrach\u00a0– zarówno przy meblach na wymiar, jak i\u00a0przy zleceniach B2B, gdzie podajesz też liczbę sztuk każdego elementu.',
  },
  {
    q: 'Z\u00a0jakich materiałów wykonujecie meble?',
    a: 'Dobieramy je do projektu i\u00a0jego użytkowników. Drewno, fornir, szkło czy lustro traktujemy jako elementy spójnego projektu. Jeśli nie masz jeszcze wybranych materiałów, pomożemy Ci je dobrać.',
  },
  {
    q: 'Ile trwa realizacja?',
    a: 'To zależy od zakresu prac. Termin realizacji potwierdzamy razem z\u00a0ceną\u00a0– po uzgodnieniu szczegółów i\u00a0weryfikacji wymiarów. W\u00a0zapytaniu możesz podać preferowany termin.',
  },
];

// Pełna wersja (z konfiguratorem) – odpowiedzi zgodne z działaniem aplikacji: cena orientacyjna liczona z cennika (ostateczna po pomiarze),
// orientacyjny czas realizacji w podsumowaniu wyceny, zapis projektów i oferta w „Moich projektach”
// (wysłany projekt jest zablokowany, można zrobić kopię), montaż jako opcja z kosztem widocznym w wycenie.
// W tekstach twarde spacje (\u00a0) po jednoliterowych słowach i przed półpauzą.
const CONFIGURATOR_QUESTIONS = [
  {
    q: 'Czy cena z\u00a0konfiguratora jest ostateczna?',
    a: 'Nie\u00a0– to cena orientacyjna, liczona na żywo z\u00a0naszego cennika. Obejmuje materiały, okucia, robociznę i\u00a0dojazd, a\u00a0jeśli zaznaczysz montaż\u00a0– także jego koszt. Ostateczną cenę podajemy w\u00a0ofercie po pomiarze na miejscu, kiedy znamy już wszystkie wymiary i\u00a0szczegóły.',
  },
  {
    q: 'Ile trwa realizacja?',
    a: 'To zależy od zakresu\u00a0– inaczej powstaje jedna szafa, a\u00a0inaczej cała kuchnia. Konfigurator pokazuje orientacyjny czas realizacji dla Twojego projektu, a\u00a0dokładny termin produkcji i\u00a0montażu potwierdzamy w\u00a0ofercie.',
  },
  {
    q: 'Czy przyjeżdżacie na pomiar?',
    // DO POTWIERDZENIA z właścicielem stolarni: czy pomiar jest bezpłatny. Jeśli tak – dopisać tu
    // „Pomiar jest bezpłatny” i pokazać to spójnie (TrustBar, krok 2 w „Jak to działa”); do tego czasu bez tej obietnicy.
    a: 'Tak. Zanim cokolwiek trafi do produkcji, zawsze mierzymy pomieszczenie na miejscu\u00a0– sprawdzamy ściany, kąty i\u00a0podejścia instalacji. Termin pomiaru ustalamy po otrzymaniu Twojego zapytania.',
  },
  {
    q: 'Z\u00a0jakich materiałów robicie meble?',
    a: 'Korpusy powstają z\u00a0płyty laminowanej. Na fronty do wyboru są: płyta laminowana, MDF lakierowany na mat lub na połysk, naturalny fornir i\u00a0drewno lite. Okucia oferujemy w\u00a0dwóch wersjach\u00a0– standard oraz premium z\u00a0cichym domykiem i\u00a0pełnym wysuwem szuflad. Wszystkie warianty porównasz w\u00a0konfiguratorze, a\u00a0cena orientacyjna sama się przeliczy.',
  },
  {
    q: 'Czy mogę zapisać projekt i\u00a0wrócić do niego później?',
    a: 'Tak. Po założeniu konta projekt zapisuje się w\u00a0„Moich projektach”\u00a0– możesz do niego wrócić i\u00a0dalej go zmieniać, a\u00a0gdy będzie gotowy, wysłać zapytanie do stolarni. Tam też zobaczysz jego status i\u00a0naszą ofertę. Wysłany projekt blokujemy do edycji, ale zawsze możesz zrobić jego kopię.',
  },
  {
    q: 'Czy robicie meble nietypowe?',
    // „nietypowe wnęki” – zwykłą wnękę (80–400 cm) zabudujesz w konfiguratorze szaf
    a: 'Tak. Skosy, nietypowe wnęki i\u00a0wymiary oraz meble, których nie ma w\u00a0konfiguratorze, wyceniamy indywidualnie. Zacznij od najbardziej zbliżonego projektu i\u00a0opisz różnice w\u00a0treści zapytania\u00a0– albo po prostu do nas napisz.',
  },
  {
    q: 'Jak wygląda montaż?',
    a: 'Meble montują nasi stolarze. Ustawiają i\u00a0poziomują korpusy, w\u00a0kuchni docinają blat, regulują fronty i\u00a0szuflady, a\u00a0na koniec sprzątają po sobie. Montaż zaznaczasz w\u00a0konfiguratorze\u00a0– jego koszt zobaczysz w\u00a0wycenie.',
  },
];

const QUESTIONS = FEATURES.configurator ? CONFIGURATOR_QUESTIONS : SITE_QUESTIONS;

export default function Faq() {
  // Pierwsze pytanie otwarte od startu – od razu widać, że to akordeon. Pozycje otwierają się niezależnie
  // (bez zamykania innych), więc klikany wiersz nie „ucieka” w górę.
  const [open, setOpen] = useState(() => new Set([0]));
  const listRef = useRef(null);
  const buttons = useRef([]);
  const inView = useInView(listRef, { threshold: 0.08 });

  const toggle = (i) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const onKeyDown = (e) => {
    const i = buttons.current.indexOf(e.target);
    if (i === -1) return;
    const last = QUESTIONS.length - 1;
    const target = { ArrowDown: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    buttons.current[target]?.focus();
  };

  return (
    <section id="faq" className="h-section h-faq-section" aria-labelledby="h-faq-title">
      <div className="h-container h-faq-grid">
        <div className="h-faq-intro">
          <SectionHead eyebrow="Pytania i odpowiedzi" title={<span id="h-faq-title">Najczęstsze pytania</span>} />
          <Reveal className="h-faq-help" delay={160} y={16}>
            <p className="h-faq-help-text">
              Zebraliśmy odpowiedzi na pytania, które słyszymy najczęściej&nbsp;– o&nbsp;wycenę, wymiary, materiały i&nbsp;usługi
              dla firm. Nie ma tu Twojego? Napisz albo zadzwoń, chętnie pomożemy.
            </p>
            <a className="h-link h-faq-help-link" href="#kontakt">
              Skontaktuj się z nami
              <ArrowIcon />
            </a>
          </Reveal>
        </div>

        {/* onKeyDown delegowany z przycisków (nawigacja strzałkami między pytaniami) */}
        <div
          ref={listRef}
          className={`h-faq-list${inView ? ' is-in' : ''}`}
          style={{ '--faq-n': QUESTIONS.length }}
          onKeyDown={onKeyDown}
        >
          {QUESTIONS.map(({ q, a }, i) => {
            const isOpen = open.has(i);
            const btnId = `h-faq-q-${i + 1}`;
            const panelId = `h-faq-a-${i + 1}`;
            return (
              <div key={q} className={`h-faq-item${isOpen ? ' is-open' : ''}`} style={{ '--faq-i': i }}>
                <div className="h-faq-item-inner">
                  <h3 className="h-faq-q">
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      id={btnId}
                      type="button"
                      className="h-faq-btn"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(i)}
                    >
                      <span className="h-faq-num" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="h-faq-q-text">{q}</span>
                      <span className="h-faq-icon" aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={panelId} className="h-faq-panel">
                    <div className="h-faq-panel-inner">
                      <p className="h-faq-a">{a}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
