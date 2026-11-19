// Klocki strony wyceny (/wycena): ikony, pola formularza (etykieta, podpowiedź, błąd), wybór „chipami”,
// strefa załączników, wskazówki (kolumna boczna na desktopie, rozwijane wiersze na telefonie) i teksty właścicielki.
// W tekstach twarde spacje (\u00a0) po jednoliterowych słowach i przed półpauzą.
import { useState } from 'react';
import { Reveal } from '../home/ui.jsx';
import { B2B_SERVICES, COMPANY } from '../../../shared/site.js';
import { FILE_ACCEPT, FILE_FORMATS_TEXT, FILE_LIMITS, fileExtension, formatBytes, plural } from '../../../shared/inquiry.js';

// --- teksty (właścicielka HAR MEBLE, XI 2026) ----------------------------------------------
export const LEAD =
  'Chcesz poznać koszt wykonania mebli? Prześlij nam kompletny projekt lub szczegółowy opis zabudowy z\u00a0wymiarami. Im dokładniejsze informacje otrzymamy, tym precyzyjniej przygotujemy wstępną wycenę.';

export const FORM_INTRO =
  'Prześlij opis projektu, orientacyjne wymiary oraz zdjęcia lub inspiracje. Podaj miejscowość realizacji i\u00a0zaznacz, czy interesują Cię meble na wymiar, czy usługi B2B: cięcie, frezowanie lub gięcie.';

export const PROJECT_CARDS = [
  {
    id: 'gotowy',
    icon: 'plan',
    title: 'Masz gotowy projekt?',
    text: 'Dołącz kompletną dokumentację: rzuty, widoki i\u00a0wymiary oraz informacje o\u00a0materiałach, wykończeniu i\u00a0wyposażeniu. Jeśli projekt obejmuje kilka pomieszczeń, zaznacz, które elementy mamy wycenić.',
  },
  {
    id: 'opis',
    icon: 'sketch',
    title: 'Nie masz projektu?',
    text: 'Przygotuj opis mebli i\u00a0ich przeznaczenia. Podaj szerokość, wysokość i\u00a0głębokość planowanej zabudowy oraz oczekiwany układ szafek, półek i\u00a0szuflad. Możesz dołączyć odręczny szkic z\u00a0wymiarami, zdjęcia pomieszczenia i\u00a0inspiracje.',
  },
];

// Podpowiedź pod wyborem „Czy masz gotowy projekt?” – zdania z kart powyżej.
export const PROJECT_TIPS = {
  gotowy: 'Dołącz kompletną dokumentację: rzuty, widoki i\u00a0wymiary oraz informacje o\u00a0materiałach, wykończeniu i\u00a0wyposażeniu.',
  opis: 'Możesz dołączyć odręczny szkic z\u00a0wymiarami, zdjęcia pomieszczenia i\u00a0inspiracje.',
};

export const MATERIALS_NOTE = 'Jeśli nie masz jeszcze wybranych materiałów lub rozwiązań, napisz o\u00a0tym\u00a0– pomożemy Ci je dobrać.';

export const FINAL_NOTE =
  'Przesłane informacje posłużą do przygotowania wstępnej wyceny. Ostateczną cenę potwierdzimy po uzgodnieniu szczegółów i\u00a0weryfikacji wymiarów.';

export const B2B_NOTE = 'Przed przyjęciem zlecenia potwierdzimy możliwości wykonania, zakres prac, cenę i\u00a0termin realizacji.';

const CHECKLIST = {
  meble: [
    'Rodzaj mebli i\u00a0zakres prac.',
    'Wymiary, najlepiej podane w\u00a0milimetrach.',
    'Preferowane materiały, kolory i\u00a0wykończenia.',
    'Oczekiwane wyposażenie, np. szuflady, oświetlenie, lustra lub przeszklenia.',
    'Miejscowość realizacji oraz informację, czy potrzebujesz transportu i\u00a0montażu.',
    'Preferowany termin realizacji.',
    'Dane kontaktowe.',
  ],
  // lista właścicielki dla zleceń B2B (dosłownie z jej tekstu „Jak zlecić usługę?”)
  b2b: [
    'Rodzaj materiału i\u00a0informację, kto go dostarcza.',
    'Wymiary elementów w\u00a0milimetrach oraz liczbę sztuk.',
    'Zakres obróbki dla poszczególnych elementów.',
    'Rysunki, listę formatek i\u00a0wymagania dotyczące dokładności wykonania.',
    'W\u00a0przypadku oklejania\u00a0– oznaczenie krawędzi i\u00a0rodzaj obrzeża.',
    'W\u00a0przypadku nawiercania i\u00a0frezowania\u00a0– położenie, średnice i\u00a0głębokości otworów lub wybrań.',
    'W\u00a0przypadku gięcia\u00a0– oczekiwany kształt i\u00a0promień.',
    'Oczekiwany termin oraz sposób odbioru lub dostawy.',
  ],
};

export const MODES = [
  { id: 'meble', icon: 'cabinet', title: 'Meble na wymiar', sub: 'Kuchnie, szafy, garderoby i\u00a0zabudowy' },
  { id: 'b2b', icon: 'saw', title: 'Usługi B2B', sub: B2B_SERVICES.map((s, i) => (i ? s.toLowerCase() : s)).join(', ') },
];

export const emailFor = (mode) => (mode === 'b2b' ? COMPANY.emailB2B : COMPANY.email);

// --- ikony liniowe 24 px (obrys 1.5, currentColor) – jak w pasku zalet strony głównej -----------
const PATHS = {
  // szafka z dwojgiem drzwi
  cabinet: (
    <>
      <rect x="4" y="3.75" width="16" height="15.5" rx="1.75" />
      <path d="M12 3.75v15.5M9.5 10.25v2.5M14.5 10.25v2.5M6.25 19.25v1.5M17.75 19.25v1.5" />
    </>
  ),
  // tarcza piły
  saw: (
    <>
      <path d="M12 5 17.55 4.6 16.55 6.68 16.95 7.05 21.16 10.7 18.98 11.45 19 12 19.4 17.55 17.32 16.55 16.95 16.95 13.3 21.16 12.55 18.98 12 19 6.45 19.4 7.45 17.32 7.05 16.95 2.84 13.3 5.02 12.55 5 12 4.6 6.45 6.68 7.45 7.05 7.05 10.7 2.84 11.45 5.02Z" />
      <circle cx="12" cy="12" r="2.25" />
    </>
  ),
  // rzut pomieszczenia
  plan: (
    <>
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="1.75" />
      <path d="M3.75 11.25H9M12.75 11.25h7.5M12.75 11.25v9M9.75 3.75v4.5" />
    </>
  ),
  // ołówek – szkic odręczny
  sketch: (
    <>
      <path d="m14.06 5.44 4.5 4.5L8.5 20H4v-4.5L14.06 5.44Z" />
      <path d="m12.25 7.25 4.5 4.5" />
    </>
  ),
  // próbnik kolorów
  swatch: (
    <>
      <rect x="3.75" y="3.75" width="6.5" height="16.5" rx="3.25" />
      <path d="M10.25 8.4 13.6 5.05a2.1 2.1 0 0 1 2.97 0l1.63 1.63a2.1 2.1 0 0 1 0 2.97l-7.95 7.95" />
      <path d="M12.6 20.25H18a2.25 2.25 0 0 0 2.25-2.25v-2.3A2.25 2.25 0 0 0 18 13.45h-1.4" />
      <path d="M7 16.75h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  upload: (
    <>
      <path d="M12 15V4.75M7.75 9 12 4.75 16.25 9" />
      <path d="M4.5 14.25v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5" />
    </>
  ),
  close: <path d="M7 7l10 10M17 7 7 17" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v5M12 16.1v.15" />
    </>
  ),
  mail: (
    <>
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.25" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

export function Icon({ name, size = 24, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

// --- pola ---------------------------------------------------------------------------------------
export const describedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined;

export function FieldError({ id, children }) {
  return (
    <p className="s-quote-error" id={id}>
      <Icon name="alert" size={16} />
      <span>{children}</span>
    </p>
  );
}

function RequiredMark() {
  // gwiazdka tylko wizualnie – czytnik ekranu dostaje „wymagane” z atrybutu required
  return (
    <span className="s-quote-req" aria-hidden="true">
      *
    </span>
  );
}

// Pole tekstowe (input albo textarea) z etykietą, podpowiedzią nad polem i komunikatem błędu pod nim.
export function TextField({ name, label, hint, error, required, multiline, rows = 5, short, className = '', ...input }) {
  const id = `s-quote-${name}`;
  const props = {
    id,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(hint && `${id}-hint`, error && `${id}-error`),
    ...input,
  };
  return (
    <div className={`s-quote-field ${className}`.trim()}>
      <label className="s-quote-label" htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </label>
      {hint && (
        <p className="s-quote-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea className={`s-quote-input s-quote-input--area${short ? ' s-quote-input--short' : ''}`} rows={rows} {...props} />
      ) : (
        <input className="s-quote-input" type="text" {...props} />
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

// Grupa „chipów”: checkboxy (wiele odpowiedzi) albo radio (jedna). Natywny input przykrywa cały chip
// (przezroczysty) – klik, dotyk, Tab/spacja i strzałki w grupie radio działają jak w zwykłym formularzu.
export function Choices({ name, legend, hint, error, required, type = 'checkbox', options, isChecked, onToggle, children }) {
  const id = `s-quote-${name}`;
  return (
    <fieldset className="s-quote-group" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="s-quote-label">
        {legend}
        {required && <RequiredMark />}
      </legend>
      {hint && (
        <p className="s-quote-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <div className="s-quote-chips">
        {options.map((option, i) => (
          <label key={option.value} className={`s-quote-chip${type === 'radio' ? ' s-quote-chip--radio' : ''}`}>
            <input
              className="s-quote-chip__input"
              type={type}
              name={name}
              id={i === 0 ? id : undefined}
              value={option.value}
              checked={isChecked(option.value)}
              onChange={() => onToggle(option.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            <span className="s-quote-chip__face">
              <span className="s-quote-chip__mark" aria-hidden="true">
                {type === 'radio' ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" focusable="false">
                    <circle cx="4" cy="4" r="4" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" focusable="false">
                    <path d="m2.5 6.25 2.25 2.25L9.5 3.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {children}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </fieldset>
  );
}

// --- załączniki -----------------------------------------------------------------------------------
// Strefa upuszczania: natywny <input type="file"> przykrywa całą strefę (przezroczysty) – jeden przystanek Tab,
// klik w dowolnym miejscu otwiera okno wyboru, a przeciągnięte pliki obsługuje onDrop (dopisuje do listy).
export function FileDrop({ hint, files, issues, error, onAdd, onRemove, inputRef, removeRefs }) {
  const id = 's-quote-files';
  const [drag, setDrag] = useState(false);
  const total = files.reduce((sum, f) => sum + f.file.size, 0);
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  return (
    <div className="s-quote-field">
      <label className="s-quote-label" id={`${id}-label`} htmlFor={id}>
        Załączniki
      </label>
      <p className="s-quote-hint" id={`${id}-hint`}>
        {hint} Możesz dodać {FILE_FORMATS_TEXT}&nbsp;– do {FILE_LIMITS.count} plików, jeden do {formatBytes(FILE_LIMITS.size)}, razem
        do {formatBytes(FILE_LIMITS.total)}.
      </p>
      <div
        className={`s-quote-drop${drag ? ' is-drag' : ''}${error ? ' is-invalid' : ''}`}
        onDragEnter={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDrag(false);
          onAdd(e.dataTransfer.files);
        }}
      >
        {/* nazwa = etykieta + widoczny napis „Wybierz pliki” (sterowanie głosem: „kliknij Wybierz pliki”); napis leży
            w ukrytej warstwie, ale aria-labelledby wskazuje go wprost, więc wchodzi do nazwy */}
        <input
          ref={inputRef}
          id={id}
          className="s-quote-drop__input"
          type="file"
          multiple
          accept={FILE_ACCEPT}
          aria-labelledby={`${id}-label ${id}-cta`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(`${id}-hint`, issues.length > 0 && `${id}-issues`, error && `${id}-error`)}
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = ''; // ten sam plik można dodać ponownie po usunięciu
          }}
        />
        <span className="s-quote-drop__face" aria-hidden="true">
          <span className="s-quote-drop__icon">
            <Icon name="upload" />
          </span>
          <span className="s-quote-drop__title">Przeciągnij pliki tutaj</span>
          <span className="s-quote-drop__title s-quote-drop__title--touch">Dodaj zdjęcia lub pliki</span>
          <span className="s-quote-drop__or">albo</span>
          <span className="s-quote-drop__btn" id={`${id}-cta`}>
            Wybierz pliki
          </span>
        </span>
      </div>

      {/* odrzucone pliki – region ogłaszany od razu po wyborze */}
      <div id={`${id}-issues`} aria-live="polite">
        {issues.length > 0 && (
          <ul className="s-quote-issues">
            {issues.map((text) => (
              <li key={text}>
                <Icon name="alert" size={16} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}

      {files.length > 0 && (
        <>
          <p className="s-quote-files__sum">
            {files.length} {plural(files.length, ['plik', 'pliki', 'plików'])} · {formatBytes(total)} z&nbsp;{formatBytes(FILE_LIMITS.total)}
          </p>
          <ul className="s-quote-files" aria-label="Dodane pliki">
            {files.map(({ id: fileId, file }) => (
              <li key={fileId} className="s-quote-file">
                <span className="s-quote-file__ext" aria-hidden="true">
                  {fileExtension(file.name) || 'plik'}
                </span>
                <span className="s-quote-file__meta">
                  <span className="s-quote-file__name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="s-quote-file__size">{formatBytes(file.size)}</span>
                </span>
                <button
                  ref={(el) => {
                    if (el) removeRefs.current[fileId] = el;
                    else delete removeRefs.current[fileId];
                  }}
                  type="button"
                  className="s-quote-file__remove"
                  aria-label={`Usuń plik ${file.name}`}
                  onClick={() => onRemove(fileId)}
                >
                  <Icon name="close" size={20} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// --- wskazówki ------------------------------------------------------------------------------------
function MailLine({ mode, className }) {
  const email = emailFor(mode);
  return (
    <p className={className}>
      <Icon name="mail" size={20} />
      <span>
        Prześlij zapytanie przez formularz lub napisz na <a href={`mailto:${email}`}>{email}</a>.
      </span>
    </p>
  );
}

function Checklist({ mode, className }) {
  return (
    <ul className={className}>
      {CHECKLIST[mode].map((item) => (
        <li key={item}>
          <Icon name="check" size={20} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Desktop: kolumna obok formularza. Karty „Masz / Nie masz projektu?” przewijają się ze stroną, a lista
// „W zapytaniu uwzględnij” zostaje przyklejona obok wypełnianych pól (na niskich ekranach – bez przyklejania).
export function GuideAside({ mode }) {
  return (
    <aside className="s-quote-aside" aria-labelledby="s-quote-guide-title">
      <h2 id="s-quote-guide-title" className="h-visually-hidden">
        Jak przygotować zapytanie
      </h2>
      {mode === 'meble' && (
        <div className="s-quote-aside__cards">
          {PROJECT_CARDS.map((card, i) => (
            <Reveal key={card.id} className="s-quote-tipcard" delay={i * 90} y={20}>
              <span className="s-quote-tipcard__icon">
                <Icon name={card.icon} />
              </span>
              <h3 className="s-quote-tipcard__title">{card.title}</h3>
              <p className="s-quote-tipcard__text">{card.text}</p>
            </Reveal>
          ))}
          <Reveal as="p" className="s-quote-note" delay={180} y={16}>
            <Icon name="swatch" />
            <span>{MATERIALS_NOTE}</span>
          </Reveal>
        </div>
      )}
      <div className="s-quote-aside__sticky">
        <Reveal className="s-quote-checklist" delay={mode === 'meble' ? 240 : 0} y={20}>
          <p className="s-quote-checklist__eyebrow">{mode === 'b2b' ? 'Usługi B2B' : 'Meble na wymiar'}</p>
          <h3 className="s-quote-checklist__title">W&nbsp;zapytaniu uwzględnij</h3>
          <Checklist mode={mode} className="s-quote-checklist__list" />
          {mode === 'b2b' && <p className="s-quote-checklist__note">{B2B_NOTE}</p>}
          <MailLine mode={mode} className="s-quote-checklist__mail" />
        </Reveal>
      </div>
    </aside>
  );
}

// Telefon i tablet: te same wskazówki jako rozwijane wiersze nad polami formularza (zwinięte – formularz od razu widać).
export function GuideCompact({ mode }) {
  const items =
    mode === 'b2b'
      ? [
          {
            id: 'lista',
            title: 'W\u00a0zapytaniu uwzględnij',
            body: (
              <>
                <Checklist mode="b2b" className="s-quote-list" />
                <p>{B2B_NOTE}</p>
              </>
            ),
          },
        ]
      : [
          { id: 'gotowy', title: PROJECT_CARDS[0].title, body: <p>{PROJECT_CARDS[0].text}</p> },
          {
            id: 'opis',
            title: PROJECT_CARDS[1].title,
            body: (
              <>
                <p>{PROJECT_CARDS[1].text}</p>
                <p>{MATERIALS_NOTE}</p>
              </>
            ),
          },
          { id: 'lista', title: 'W\u00a0zapytaniu uwzględnij', body: <Checklist mode="meble" className="s-quote-list" /> },
        ];
  return (
    <div className="s-quote-tips">
      <h3 className="h-visually-hidden">Jak przygotować zapytanie</h3>
      {items.map((item) => (
        <details key={`${mode}-${item.id}`} className="s-quote-tip">
          <summary className="s-quote-tip__summary">
            <span>{item.title}</span>
            <span className="s-quote-tip__icon" aria-hidden="true" />
          </summary>
          <div className="s-quote-tip__body">{item.body}</div>
        </details>
      ))}
      <MailLine mode={mode} className="s-quote-tips__mail" />
    </div>
  );
}
