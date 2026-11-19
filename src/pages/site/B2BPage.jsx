// Podstrona „Usługi B2B” (/uslugi-b2b): obróbka materiałów i przygotowanie elementów dla stolarni i firm meblarskich.
// Układ: nagłówek z kartą faktów → siatka 7 usług (link do formularza z wybraną usługą) → ciemny pas „szerszy zakres”
// → „Jak zlecić usługę?” (lista do zapytania) → kontakt B2B. Zdjęć warsztatu jeszcze nie ma, więc strona stoi na
// typografii, kartach i ikonach liniowych – bez renderów kuchni udających warsztat.
// Teksty właścicielki dosłownie (tylko typografia: półpauzy, twarde spacje \u00a0 po jednoliterowych słowach
// i przed półpauzą); dane firmy i nazwy usług wyłącznie z shared/site.js.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { ArrowIcon, MaskLines, Reveal, SectionHead, useInView } from '../home/ui.jsx';
import { B2B_SERVICES, COMPANY, ROUTES } from '../../../shared/site.js';
import './b2b.css';

// --- typografia ----------------------------------------------------------------------------------------------

// Twarde spacje po jednoliterowych słowach w danych z shared/site.js (np. „Śląsk i Wielkopolska”).
// Podział na słowa zamiast jednego regexu – para „i w” też dostaje obie spacje.
function tie(text) {
  const words = text.split(' ');
  return words.map((word, i) => (i === words.length - 1 ? word : word + (/^[aiouwz]$/i.test(word) ? '\u00a0' : ' '))).join('');
}

// Adres e-mail łamie się tylko przed „@” (jak na stronie kontaktu), nigdy w przypadkowym miejscu.
function Email({ address }) {
  const at = address.indexOf('@');
  if (at < 1) return address;
  return (
    <>
      {address.slice(0, at)}
      <wbr />
      {address.slice(at)}
    </>
  );
}

const pad = (n) => String(n).padStart(2, '0');

// --- ikony liniowe 24 px (kreska 1.5, currentColor – jak w pasku zalet strony głównej) ------------------------

function LineIcon({ children, className = '' }) {
  return (
    <svg
      className={className}
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
      {children}
    </svg>
  );
}

const ICONS = {
  // tarcza piły z zębami – rozkrój
  saw: (
    <>
      <path d="M12 4.1L15.31 3.1L15.95 5.16L19.32 5.94L18.84 8.05L21.37 10.42L19.9 12L20.9 15.31L18.84 15.95L18.06 19.32L15.95 18.84L13.58 21.37L12 19.9L8.69 20.9L8.05 18.84L4.68 18.06L5.16 15.95L2.63 13.58L4.1 12L3.1 8.69L5.16 8.05L5.94 4.68L8.05 5.16L10.42 2.63Z" />
      <circle cx="12" cy="12" r="2.25" />
    </>
  ),
  // rolka obrzeża, z której taśma schodzi na krawędź płyty
  edge: (
    <>
      <circle cx="7.5" cy="7.25" r="4.5" />
      <circle cx="7.5" cy="7.25" r="1.25" />
      <path d="M7.5 11.75h13.75V14" />
      <path d="M2.75 14h18.5v5.25a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z" />
    </>
  ),
  // wiertło nad płytą z gotowym otworem
  drill: (
    <>
      <path d="M2.75 17.25h14.5l4-3.75H6.75Z" />
      <path d="M2.75 17.25v2.75h14.5v-2.75M17.25 20l4-3.75V13.5" />
      <ellipse cx="8" cy="15.4" rx="1.6" ry=".75" />
      <path d="M13.75 2.75h2v2.5h-2Z" />
      <path d="M14 5.25v5.25l.75 1.5.75-1.5V5.25" />
      <path d="m14 7.25 1.5 1" />
    </>
  ),
  // frez nad przekrojem płyty (kreskowanie) z rowkiem, wręgiem i zaokrągloną krawędzią
  router: (
    <>
      <path d="M2.75 20.25v-5a2.75 2.75 0 0 1 2.75-2.75h3.25v4.25h6.5V12.5h6v7.75Z" />
      <path d="M5.5 20.25l3-3M10.5 20.25l3-3M15.5 20.25l3-3" />
      <path d="M12 2.75v3.5" />
      <path d="M9.75 6.25h4.5v4.5h-4.5Z" />
    </>
  ),
  // gięty panel – łuk w perspektywie z liniami krzywizny
  bend: (
    <>
      <path d="M3.75 6Q12 10.75 20.25 6" />
      <path d="M3.75 17.5Q12 22.25 20.25 17.5" />
      <path d="M3.75 6v11.5M20.25 6v11.5" />
      <path d="M7.25 7.6v11.5M16.75 7.6v11.5" />
    </>
  ),
  // kostka szlifierska z ziarnem papieru na powierzchni
  sand: (
    <>
      <rect x="4.25" y="10.75" width="15.5" height="5.5" rx="1.5" />
      <path d="M7.75 10.75V9.5a2.75 2.75 0 0 1 2.75-2.75h3A2.75 2.75 0 0 1 16.25 9.5v1.25" />
      <path d="M2.75 19.5h18.5" />
      <path d="M6.5 18h.01M9.5 18h.01M12.5 18h.01M15.5 18h.01M18.5 18h.01" />
    </>
  ),
  // strug: rękojeść, skośny nóż i przednia gałka na desce
  plane: (
    <>
      <path d="M2 18h20" />
      <path d="M3.5 18v-2.75a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1V18" />
      <path d="M5 14.25c0-3 1-5.75 3.25-5.75 1 0 1.5.75 1.5 1.75v4" />
      <path d="m11.25 14.25 2.25-6.5 1.5.5-2 6" />
      <path d="M16.75 14.25v-1.5a1.5 1.5 0 0 1 3 0v1.5" />
    </>
  ),
  // teczka – współpraca z firmami
  briefcase: (
    <>
      <rect x="3" y="7.25" width="18" height="12.5" rx="2" />
      <path d="M8.75 7.25V5.75a1.5 1.5 0 0 1 1.5-1.5h3.5a1.5 1.5 0 0 1 1.5 1.5v1.5" />
      <path d="M3 12.25h18" />
      <path d="M10.5 12.25v1.5h3v-1.5" />
    </>
  ),
  // pinezka – obszar działania
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.25a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.75" r="2.5" />
    </>
  ),
  // koperta
  mail: (
    <>
      <rect x="3" y="5.25" width="18" height="13.5" rx="2" />
      <path d="m3.75 6.5 8.25 6.5 8.25-6.5" />
    </>
  ),
  // podkładka z ptaszkiem – potwierdzenie warunków przed przyjęciem zlecenia
  confirm: (
    <>
      <path d="M8.25 4.75H6.5A1.75 1.75 0 0 0 4.75 6.5v12.75A1.75 1.75 0 0 0 6.5 21h11a1.75 1.75 0 0 0 1.75-1.75V6.5a1.75 1.75 0 0 0-1.75-1.75h-1.75" />
      <rect x="8.25" y="3" width="7.5" height="3.5" rx="1" />
      <path d="m8.75 13.75 2.25 2.25 4.25-4.5" />
    </>
  ),
};

// --- treści ----------------------------------------------------------------------------------------------------

// Opisy usług (teksty właścicielki). Klucze = nazwy z B2B_SERVICES – te same wartości trafiają do formularza
// wyceny jako ?usluga=, więc kolejność i nazwy kart bierzemy z listy wspólnej, a nie z tego obiektu.
// suffix – dopisek w tytule karty („Heblowanie – struganie drewna”); wide – szeroka karta z planem rozkroju.
const DETAILS = {
  Cięcie: {
    icon: 'saw',
    wide: true,
    text: 'Rozkrój płyt meblowych i\u00a0elementów drewnianych na zadane wymiary, zgodnie z\u00a0przekazaną dokumentacją lub listą formatek.',
  },
  Oklejanie: {
    icon: 'edge',
    text: 'Wykańczanie krawędzi elementów meblowych obrzeżem dopasowanym do materiału i\u00a0projektu. Estetyczne zabezpieczenie krawędzi oraz przygotowanie formatek do kolejnych etapów pracy.',
  },
  Nawiercanie: {
    icon: 'drill',
    text: 'Wykonywanie otworów pod zawiasy, prowadnice, uchwyty, połączenia meblowe i\u00a0inne okucia według ustalonego schematu.',
  },
  Frezowanie: {
    icon: 'router',
    text: 'Wykonywanie rowków, wręg, wybrań, profili i\u00a0kształtowanie krawędzi. Obróbka elementów konstrukcyjnych oraz dekoracyjnych zgodnie z\u00a0projektem.',
  },
  Gięcie: {
    icon: 'bend',
    text: 'Przygotowanie elementów giętych i\u00a0zaokrąglonych do mebli oraz zabudów. Możliwość wykonania uzgadniamy indywidualnie na podstawie materiału, wymiarów i\u00a0promienia gięcia.',
  },
  Szlifowanie: {
    icon: 'sand',
    text: 'Wyrównywanie i\u00a0wygładzanie powierzchni oraz krawędzi. Przygotowanie elementów do dalszej obróbki i\u00a0wykończenia.',
  },
  Heblowanie: {
    icon: 'plane',
    suffix: 'struganie drewna',
    text: 'Wyrównywanie powierzchni drewna oraz obróbka do uzgodnionej grubości i\u00a0wymiarów.',
  },
};

const SERVICES = B2B_SERVICES.filter((name) => DETAILS[name]).map((name) => ({ name, ...DETAILS[name] }));

// „Jak zlecić usługę?” – pozycja z warunkiem to para [warunek, reszta]: warunek pogrubiony, żeby lista dała się
// przejrzeć wzrokiem (tekst bez zmian, łączy go półpauza).
const CHECKLIST = [
  'Rodzaj materiału i\u00a0informację, kto go dostarcza.',
  'Wymiary elementów w\u00a0milimetrach oraz liczbę sztuk.',
  'Zakres obróbki dla poszczególnych elementów.',
  'Rysunki, listę formatek i\u00a0wymagania dotyczące dokładności wykonania.',
  ['W\u00a0przypadku oklejania', 'oznaczenie krawędzi i\u00a0rodzaj obrzeża.'],
  ['W\u00a0przypadku nawiercania i\u00a0frezowania', 'położenie, średnice i\u00a0głębokości otworów lub wybrań.'],
  ['W\u00a0przypadku gięcia', 'oczekiwany kształt i\u00a0promień.'],
  'Oczekiwany termin oraz sposób odbioru lub dostawy.',
];

// Formularz wyceny z zaznaczonym typem B2B i konkretną usługą.
const quoteFor = (service) => `${ROUTES.quoteB2B}&usluga=${encodeURIComponent(service)}`;

// --- plan rozkroju (ozdobnik karty „Cięcie”) ---------------------------------------------------------------------
// Abstrakcyjna płyta 284×210 j. (proporcje formatu płyty meblowej): pasy cięte wzdłuż, w nich formatki w poprzek,
// między nimi rzaz, na brzegach i końcach pasów odpad (kreskowany). Liczone raz przy imporcie modułu.
const PLAN = (() => {
  const W = 284;
  const H = 210;
  const EDGE = 5; // obrzeże płyty odcinane przed rozkrojem
  const KERF = 3; // rzaz piły
  const strips = [
    { h: 72, widths: [86, 86, 86], accent: [1] },
    { h: 56, widths: [62, 62, 62, 62] },
    { h: 56, widths: [130, 99], accent: [0] },
  ];
  const parts = [];
  let y = EDGE;
  for (const { h, widths, accent = [] } of strips) {
    let x = EDGE;
    widths.forEach((w, i) => {
      parts.push({ x, y, w, h, kind: accent.includes(i) ? 'accent' : 'piece' });
      x += w + KERF;
    });
    if (W - EDGE - x > 2) parts.push({ x, y, w: W - EDGE - x, h, kind: 'offcut' });
    y += h + KERF;
  }
  if (H - EDGE - y > 2) parts.push({ x: EDGE, y, w: W - 2 * EDGE, h: H - EDGE - y, kind: 'offcut' });
  return { W, H, parts };
})();

function CutPlan() {
  return (
    <div className="s-b2b-plan" aria-hidden="true">
      <svg className="s-b2b-plan__svg" viewBox={`0 0 ${PLAN.W} ${PLAN.H}`} focusable="false">
        <defs>
          <pattern id="s-b2b-plan-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path className="s-b2b-plan__hatch" d="M0 0v6" />
          </pattern>
        </defs>
        <rect className="s-b2b-plan__board" x=".5" y=".5" width={PLAN.W - 1} height={PLAN.H - 1} rx="4" />
        {PLAN.parts.map((p, i) => (
          <rect
            key={`${p.x}-${p.y}`}
            className={`s-b2b-plan__part s-b2b-plan__part--${p.kind}`}
            style={{ '--i': i }}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            rx="2"
            fill={p.kind === 'offcut' ? 'url(#s-b2b-plan-hatch)' : undefined}
          />
        ))}
      </svg>
    </div>
  );
}

// --- nagłówek ----------------------------------------------------------------------------------------------------

function HeaderAside() {
  const cities = COMPANY.locations.map((loc) => loc.city).join(' · ');
  return (
    <div className="s-b2b-aside">
      <p className="s-b2b-aside__lead">
        Korzystamy z&nbsp;<strong>{COMPANY.experience.replace(/ /g, '\u00a0')} doświadczenia</strong> w&nbsp;stolarstwie, wspierając firmy przy
        pojedynczych zleceniach i&nbsp;stałej współpracy.
      </p>
      <ul className="s-b2b-aside__facts" role="list">
        <li className="s-b2b-aside__fact">
          <LineIcon className="s-b2b-aside__icon">{ICONS.briefcase}</LineIcon>
          <span>Pojedyncze zlecenia i&nbsp;stała współpraca</span>
        </li>
        <li className="s-b2b-aside__fact">
          <LineIcon className="s-b2b-aside__icon">{ICONS.pin}</LineIcon>
          <span>
            {tie(COMPANY.regions)}
            <span className="h-visually-hidden">: </span>
            <span className="s-b2b-aside__sub">{cities}</span>
          </span>
        </li>
        <li className="s-b2b-aside__fact">
          <LineIcon className="s-b2b-aside__icon">{ICONS.mail}</LineIcon>
          <span>
            Zapytania B2B:{' '}
            <a className="s-b2b-aside__link" href={`mailto:${COMPANY.emailB2B}`}>
              <Email address={COMPANY.emailB2B} />
            </a>
          </span>
        </li>
      </ul>
    </div>
  );
}

// --- zakres usług ------------------------------------------------------------------------------------------------

// Każda karta ma własny observer (wjeżdża, gdy sama jest w widoku); opóźnienie fali w rzędzie – w CSS wg kolumny.
function ServiceCard({ item, index }) {
  const ref = useRef(null);
  const shown = useInView(ref);
  const className = ['s-b2b-svc', 'h-reveal', shown && 'is-in', item.wide && 's-b2b-svc--wide'].filter(Boolean).join(' ');

  // Rząd z ikoną i numerem stoi poza treścią: w szerokiej karcie obejmuje obie kolumny (numer w rogu karty),
  // a pod nim treść i plan rozkroju stoją obok siebie.
  return (
    <li ref={ref} className={className}>
      <div className="s-b2b-svc__top">
        <span className="s-b2b-svc__icon">
          <LineIcon>{ICONS[item.icon]}</LineIcon>
        </span>
        <span className="s-b2b-svc__num" aria-hidden="true">
          {pad(index + 1)}
        </span>
      </div>
      <div className="s-b2b-svc__main">
        <h3 className="s-b2b-svc__title">
          {item.name}
          {item.suffix && <span className="s-b2b-svc__suffix">{`\u00a0– ${item.suffix}`}</span>}
        </h3>
        <p className="s-b2b-svc__text">{item.text}</p>
        {/* nazwa usługi dla czytników – siedem linków „Zapytaj o tę usługę” musi się różnić poza kontekstem karty */}
        <Link className="h-link s-b2b-svc__link" to={quoteFor(item.name)}>
          Zapytaj o&nbsp;tę usługę<span className="h-visually-hidden">: {item.name}</span>
          <ArrowIcon />
        </Link>
      </div>
      {item.wide && <CutPlan />}
    </li>
  );
}

function Services() {
  return (
    <section id="zakres-uslug" className="h-section s-b2b-services" aria-labelledby="s-b2b-services-title">
      <div className="h-container">
        <SectionHead eyebrow="Obróbka materiałów" title={<span id="s-b2b-services-title">Zakres usług</span>} />
        <ul className="s-b2b-services__grid" role="list">
          {SERVICES.map((item, i) => (
            <ServiceCard key={item.name} item={item} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// --- szerszy zakres prac -------------------------------------------------------------------------------------------

function WiderScope() {
  return (
    <section className="s-b2b-band" aria-labelledby="s-b2b-band-title">
      <div className="h-container">
        <div className="s-b2b-band__card">
          <div id="s-b2b-band-title" className="s-b2b-band__head">
            <MaskLines as="h2" className="h-title s-b2b-band__title" lines={['Potrzebujesz szerszego', 'zakresu prac?']} />
          </div>
          <div className="s-b2b-band__body">
            <Reveal as="p" className="h-lead s-b2b-band__lead" delay={120}>
              Prześlij zapytanie. Ustalimy, które etapy możemy wykonać i&nbsp;w&nbsp;jakiej formie przygotować elementy
              dla Twojej firmy.
            </Reveal>
            <Reveal className="s-b2b-band__actions" delay={200} y={16}>
              <Link className="h-btn h-btn--light" to={ROUTES.quoteB2B}>
                Wyślij zapytanie B2B
                <ArrowIcon />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- jak zlecić usługę ---------------------------------------------------------------------------------------------

function HowToOrder() {
  const listRef = useRef(null);
  const listIn = useInView(listRef, { threshold: 0.08 });

  return (
    <section id="jak-zlecic" className="h-section h-section--alt s-b2b-how" aria-labelledby="s-b2b-how-title">
      <div className="h-container s-b2b-how__grid">
        <div className="s-b2b-how__intro">
          <SectionHead
            eyebrow="Przygotowanie zlecenia"
            title={<span id="s-b2b-how-title">Jak zlecić usługę?</span>}
            lead={'Prześlij kompletny projekt techniczny lub szczegółowy opis z\u00a0wymiarami.'}
          />
        </div>

        <div className="s-b2b-how__main">
          <Reveal as="p" id="s-b2b-how-label" className="s-b2b-how__label" y={12}>
            W&nbsp;zapytaniu podaj:
          </Reveal>
          {/* role="list": Safari z VoiceOverem gubi semantykę listy przy list-style: none */}
          <ol
            ref={listRef}
            className={`s-b2b-how__list${listIn ? ' is-in' : ''}`}
            role="list"
            aria-labelledby="s-b2b-how-label"
            style={{ '--n': CHECKLIST.length }}
          >
            {CHECKLIST.map((item, i) => (
              <li key={i} className="s-b2b-how__item" style={{ '--i': i }}>
                <span className="s-b2b-how__num" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <span className="s-b2b-how__text">
                  {Array.isArray(item) ? (
                    <>
                      <span className="s-b2b-how__cond">{item[0]}</span>
                      {`\u00a0– ${item[1]}`}
                    </>
                  ) : (
                    item
                  )}
                </span>
              </li>
            ))}
          </ol>
          <Reveal className="s-b2b-how__note" delay={120} y={16}>
            <LineIcon className="s-b2b-how__note-icon">{ICONS.confirm}</LineIcon>
            <p className="s-b2b-how__note-text">
              Przed przyjęciem zlecenia potwierdzimy możliwości wykonania, zakres prac, cenę i&nbsp;termin realizacji.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// --- kontakt B2B -----------------------------------------------------------------------------------------------------

function ContactB2B() {
  return (
    <section id="kontakt-b2b" className="h-section s-b2b-contact" aria-labelledby="s-b2b-contact-title">
      <div className="h-container">
        <div className="s-b2b-contact__card">
          <div className="s-b2b-contact__head">
            <Reveal as="p" className="h-eyebrow" y={12}>
              Kontakt
            </Reveal>
            <div id="s-b2b-contact-title">
              <MaskLines as="h2" className="h-title s-b2b-contact__title" lines={['Napisz lub zadzwoń']} />
            </div>
          </div>

          <Reveal as="address" className="s-b2b-contact__address" delay={120} y={16}>
            <dl className="s-b2b-contact__list">
              <div className="s-b2b-contact__item">
                <dt className="s-b2b-contact__label">Zapytania B2B:</dt>
                <dd className="s-b2b-contact__value">
                  <a className="s-b2b-contact__big" href={`mailto:${COMPANY.emailB2B}`}>
                    <Email address={COMPANY.emailB2B} />
                  </a>
                </dd>
              </div>
              <div className="s-b2b-contact__item">
                <dt className="s-b2b-contact__label">Telefon:</dt>
                <dd className="s-b2b-contact__value">
                  <a className="s-b2b-contact__big s-b2b-contact__big--phone" href={COMPANY.phoneHref}>
                    {COMPANY.phone}
                  </a>
                </dd>
                <dd className="s-b2b-contact__note">Godziny kontaktu: {COMPANY.hours}</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal className="s-b2b-contact__actions" delay={200} y={16}>
            <Link className="h-btn" to={ROUTES.quoteB2B}>
              Wyślij zapytanie B2B
              <ArrowIcon />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// --- strona ----------------------------------------------------------------------------------------------------------

export default function B2BPage() {
  return (
    <PageShell
      eyebrow="Usługi B2B"
      title={['Wsparcie dla', 'Twojej stolarni']}
      lead={
        <>
          Prowadzisz stolarnię, produkujesz meble lub realizujesz zabudowy na wymiar? W&nbsp;
          <span className="s-b2b-nowrap">{COMPANY.brand}</span> oferujemy obróbkę materiałów i&nbsp;przygotowanie
          elementów do dalszej produkcji oraz montażu.
        </>
      }
      actions={
        <>
          {/* strzałka tylko w przycisku głównym – konwencja strony głównej */}
          <Link className="h-btn s-b2b-head-btn" to={ROUTES.quoteB2B}>
            Wyślij zapytanie B2B
            <ArrowIcon />
          </Link>
          <a className="h-btn h-btn--outline s-b2b-head-btn" href={`mailto:${COMPANY.emailB2B}`}>
            Napisz e-mail<span className="h-visually-hidden"> na adres {COMPANY.emailB2B}</span>
          </a>
        </>
      }
      aside={<HeaderAside />}
    >
      <Services />
      <WiderScope />
      <HowToOrder />
      <ContactB2B />
    </PageShell>
  );
}
