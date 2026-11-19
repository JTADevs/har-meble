// Polityka prywatności (/polityka-prywatnosci) – RODO, dane firmy z shared/site.js, spis treści z kotwicami.
// UWAGA: to SZABLON opisujący działanie wizytówki (formularz wyceny, brak analityki i reklam, pamięć przeglądarki
// tylko przy logowaniu do panelu). Przed publikacją musi go zweryfikować właścicielka (najlepiej z prawnikiem):
// datę „Obowiązuje od”, okresy przechowywania, listę odbiorców (np. biuro rachunkowe, jeśli dostaje faktury)
// i umowę powierzenia z Google – darmowe konto Gmail jej nie obejmuje (umowę powierzenia daje Google Workspace).
// W trybie 'pelna' (konta klientów, projekty, konfiguratory 3D) politykę trzeba rozszerzyć.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from './PageShell.jsx';
import { Reveal } from '../home/ui.jsx';
import { COMPANY, ROUTES } from '../../../shared/site.js';
import './privacy.css';

// Data wejścia w życie – do wpisania przy publikacji; do tego czasu widoczna jako placeholder w nawiasie.
const EFFECTIVE_FROM = '[data publikacji strony]';

// „sp. z o.o.” bez łamania wiersza w środku
const LEGAL_NAME = COMPANY.legalName.replace('sp. z o.o.', 'sp. z o.o.');
const { street, postal, city } = COMPANY.invoiceAddress;

// podstawa prawna: „art. 6 ust. 1 lit. b RODO” bez łamania między skrótem a numerem
const art = (letter) => `art. 6 ust. 1 lit. ${letter} RODO`;

const BASES = [
  ['Przygotowanie wyceny i kontakt w sprawie zapytania', `${art('b')} – działania podejmowane na Twoje żądanie przed zawarciem umowy`],
  ['Zawarcie i wykonanie umowy', `${art('b')} – wykonanie umowy, której jesteś stroną`],
  ['Wystawianie faktur, księgowość i rozliczenia podatkowe', `${art('c')} – obowiązki wynikające z przepisów podatkowych i o rachunkowości`],
  ['Ustalenie, dochodzenie lub obrona roszczeń', `${art('f')} – nasz prawnie uzasadniony interes, czyli ochrona naszych praw`],
  [
    'Bieżący kontakt z klientami firmowymi i osobami, które je reprezentują',
    `${art('f')} – nasz prawnie uzasadniony interes, czyli sprawna współpraca z kontrahentami`,
  ],
];

const NEW_TAB = <span className="h-visually-hidden"> (otwiera się w&nbsp;nowej karcie)</span>;

// Rozdziały: id = kotwica w spisie treści (bez polskich znaków), title = nagłówek h2, body = treść.
const SECTIONS = [
  {
    id: 'administrator',
    title: 'Administrator danych',
    body: (
      <>
        <p>
          Administratorem Twoich danych osobowych jest <strong>{LEGAL_NAME}</strong> z&nbsp;siedzibą pod adresem: {street},{' '}
          {postal} {city}, NIP: <span className="s-privacy-nowrap">{COMPANY.nip}</span>, prowadząca działalność pod marką{' '}
          {COMPANY.brand} (dalej: „my”).
        </p>
        <p>W&nbsp;sprawach dotyczących danych osobowych możesz się z&nbsp;nami skontaktować:</p>
        <ul role="list">
          <li>
            e-mailem: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>,
          </li>
          <li>
            telefonicznie: <a href={COMPANY.phoneHref}>{COMPANY.phone}</a> (godziny kontaktu: {COMPANY.hours}),
          </li>
          <li>listownie: na adres siedziby podany wyżej.</li>
        </ul>
        <p>
          Wszystkie dane kontaktowe znajdziesz też na stronie <Link to={ROUTES.contact}>Kontakt</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'zakres-danych',
    title: 'Jakie dane przetwarzamy',
    body: (
      <>
        <p>Przetwarzamy tylko te dane, które nam przekazujesz:</p>
        <ul role="list">
          <li>
            <strong>w&nbsp;formularzu wyceny</strong>&nbsp;– imię i&nbsp;nazwisko lub nazwę firmy, adres e-mail, numer telefonu,
            miejscowość realizacji, NIP (jeśli zapytanie wysyła firma), treść zapytania oraz załączniki, np. zdjęcia, rysunki
            lub inspiracje;
          </li>
          <li>
            <strong>w&nbsp;korespondencji e-mailowej i&nbsp;rozmowach telefonicznych</strong>&nbsp;– dane, które podajesz,
            kontaktując się z&nbsp;nami: zwykle imię i&nbsp;nazwisko, adres e-mail lub numer telefonu i&nbsp;informacje
            o&nbsp;projekcie;
          </li>
          <li>
            <strong>gdy zawieramy umowę</strong>&nbsp;– dane potrzebne do jej wykonania i&nbsp;rozliczenia, np. adres realizacji
            i&nbsp;dane do faktury.
          </li>
        </ul>
        <p>Na zdjęciach pomieszczeń postaraj się nie pokazywać osób ani dokumentów&nbsp;– do wyceny nie są potrzebne.</p>
      </>
    ),
  },
  {
    id: 'cele-i-podstawy',
    title: 'Cele i podstawy prawne',
    body: (
      <>
        <p>Twoje dane przetwarzamy w&nbsp;następujących celach i&nbsp;na następujących podstawach prawnych:</p>
        <dl className="s-privacy-basis">
          {BASES.map(([purpose, basis]) => (
            <div className="s-privacy-basis__row" key={purpose}>
              <dt>{purpose}</dt>
              <dd>{basis}</dd>
            </div>
          ))}
        </dl>
        <p>
          RODO to ogólne rozporządzenie o&nbsp;ochronie danych, czyli rozporządzenie Parlamentu Europejskiego i&nbsp;Rady
          (UE) 2016/679.
        </p>
      </>
    ),
  },
  {
    id: 'okres-przechowywania',
    title: 'Jak długo przechowujemy dane',
    body: (
      <>
        <ul role="list">
          <li>
            <strong>Zapytania, które nie zakończyły się umową</strong>&nbsp;– do 12&nbsp;miesięcy od ostatniego kontaktu.
          </li>
          <li>
            <strong>Dane związane z&nbsp;umową</strong>&nbsp;– przez okres wymagany przepisami podatkowymi i&nbsp;o&nbsp;rachunkowości
            (zwykle 5&nbsp;lat, licząc od końca roku, w&nbsp;którym upłynął termin zapłaty podatku), a&nbsp;także do upływu
            terminów przedawnienia roszczeń z&nbsp;umowy.
          </li>
        </ul>
        <p>Po tym czasie dane usuwamy.</p>
      </>
    ),
  },
  {
    id: 'odbiorcy',
    title: 'Komu przekazujemy dane',
    body: (
      <>
        <p>
          Twoje dane mogą otrzymać firmy, które pomagają nam prowadzić stronę i&nbsp;obsługiwać zapytania. Przetwarzają je
          tylko na nasze polecenie, na podstawie umów powierzenia przetwarzania danych:
        </p>
        <ul role="list">
          <li>dostawca hostingu, na którego serwerach działa strona i&nbsp;formularz wyceny,</li>
          <li>dostawca poczty e-mail&nbsp;– Google (Gmail), przez którego wymieniamy z&nbsp;Tobą wiadomości,</li>
          <li>firmy, które wspierają nas w&nbsp;obsłudze informatycznej.</li>
        </ul>
        <p>Poza tym przekazujemy dane tylko wtedy, gdy wymagają tego przepisy prawa&nbsp;– np. na żądanie sądu lub urzędu.</p>
      </>
    ),
  },
  {
    id: 'poza-eog',
    title: 'Przekazywanie danych poza EOG',
    body: (
      <p>
        Google może przetwarzać dane także poza Europejskim Obszarem Gospodarczym (EOG), m.in. w&nbsp;Stanach Zjednoczonych.
        Odbywa się to na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony danych
        w&nbsp;ramach programu EU-U.S. Data Privacy Framework albo na podstawie standardowych klauzul umownych
        zatwierdzonych przez Komisję Europejską. Na Twoją prośbę przekażemy informacje o&nbsp;tych zabezpieczeniach
        i&nbsp;o&nbsp;tym, jak uzyskać ich kopię.
      </p>
    ),
  },
  {
    id: 'twoje-prawa',
    title: 'Twoje prawa',
    body: (
      <>
        <p>W&nbsp;związku z&nbsp;przetwarzaniem danych masz prawo do:</p>
        <ul role="list">
          <li>dostępu do swoich danych i&nbsp;otrzymania ich kopii,</li>
          <li>sprostowania, czyli poprawienia lub uzupełnienia danych,</li>
          <li>usunięcia danych&nbsp;– jeśli nie musimy ich dłużej przechowywać, np. ze względu na przepisy podatkowe,</li>
          <li>ograniczenia przetwarzania,</li>
          <li>przenoszenia danych przetwarzanych w&nbsp;związku z&nbsp;zapytaniem o&nbsp;wycenę lub umową,</li>
          <li>sprzeciwu wobec przetwarzania danych na podstawie naszego prawnie uzasadnionego interesu ({art('f')}).</li>
        </ul>
        <p>
          Aby skorzystać z&nbsp;tych praw, napisz na <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> albo zadzwoń pod
          numer <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>. Odpowiemy bez zbędnej zwłoki&nbsp;– co do zasady
          w&nbsp;ciągu miesiąca.
        </p>
        <p>
          Jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z&nbsp;prawem, możesz złożyć skargę do Prezesa Urzędu Ochrony
          Danych Osobowych (ul.&nbsp;Stawki&nbsp;2, 00-193 Warszawa,{' '}
          <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer">
            uodo.gov.pl
            {NEW_TAB}
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: 'dobrowolnosc',
    title: 'Dobrowolność podania danych',
    body: (
      <p>
        Podanie danych jest dobrowolne, ale bez danych kontaktowych nie przygotujemy wyceny ani nie odpowiemy na Twoje
        zapytanie. Jeśli zawieramy umowę, potrzebujemy też danych niezbędnych do jej wykonania i&nbsp;wystawienia faktury.
      </p>
    ),
  },
  {
    id: 'profilowanie',
    title: 'Profilowanie',
    body: <p>Twoich danych nie wykorzystujemy do zautomatyzowanego podejmowania decyzji ani do profilowania.</p>,
  },
  {
    id: 'cookies',
    title: 'Pliki cookies i pamięć przeglądarki',
    // zgodne z kodem: token logowania w localStorage (src/api.js), znacznik odświeżenia w sessionStorage (App.jsx),
    // film hero z public/video, czcionka z @fontsource (pliki w paczce strony)
    body: (
      <>
        <p>
          Strona nie używa plików cookies analitycznych ani marketingowych i&nbsp;nie korzysta z&nbsp;narzędzi śledzących
          innych firm&nbsp;– nie ma na niej np. Google Analytics ani pikseli reklamowych. Film na stronie głównej
          i&nbsp;czcionki wczytują się z&nbsp;naszego serwera, a&nbsp;nie z&nbsp;zewnętrznych serwisów.
        </p>
        <p>
          Nie osadzamy też map ani filmów z&nbsp;innych serwisów. Link „Pokaż na mapie” na stronie kontaktu otwiera Mapy
          Google w&nbsp;nowej karcie&nbsp;– od tej chwili obowiązują zasady prywatności Google.
        </p>
        <p>
          W&nbsp;pamięci przeglądarki (localStorage) zapisujemy dane tylko wtedy, gdy nasz pracownik loguje się do panelu
          firmy: jest to techniczny identyfikator sesji, który usuwamy przy wylogowaniu. Jeśli nie logujesz się do panelu,
          strona nic tam nie zapisuje.
        </p>
        <p>
          Gdy nie uda się wczytać fragmentu strony (np. tuż po jej aktualizacji), w&nbsp;pamięci sesji przeglądarki
          (sessionStorage) zapisujemy na chwilę znacznik czasu, żeby strona odświeżyła się automatycznie tylko raz,
          a&nbsp;nie w&nbsp;kółko. Pamięć sesji znika po zamknięciu karty.
        </p>
        <p>
          To wyłącznie informacje niezbędne do działania strony, dlatego nie prosimy o&nbsp;zgodę na ich zapisanie. Możesz
          je w&nbsp;każdej chwili usunąć w&nbsp;ustawieniach przeglądarki.
        </p>
      </>
    ),
  },
  {
    id: 'zmiany',
    title: 'Zmiany polityki prywatności',
    body: (
      <p>
        Politykę możemy aktualizować&nbsp;– np. gdy zmienią się przepisy, nasi dostawcy albo funkcje strony. Aktualna wersja
        jest zawsze dostępna na tej stronie, a&nbsp;data na jej początku pokazuje, od kiedy obowiązuje.
      </p>
    ),
  },
];

const SECTION_IDS = SECTIONS.map((section) => section.id);

// Spis treści podświetla czytany rozdział: aktywny jest pierwszy rozdział przecinający pas pod nawigacją
// (od ok. 110 px od góry do 40% wysokości okna). Nad pierwszym rozdziałem (nagłówek strony) – żaden.
function useActiveSection(ids) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
        const first = ids.find((id) => visible.has(id));
        if (first) {
          setActive(first);
          return;
        }
        const top = document.getElementById(ids[0])?.getBoundingClientRect().top;
        if (top !== undefined && top > window.innerHeight * 0.4) setActive(null);
      },
      { rootMargin: '-110px 0px -60% 0px', threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

export default function PrivacyPage() {
  const active = useActiveSection(SECTION_IDS);

  return (
    <PageShell
      eyebrow="Informacje prawne"
      title={['Polityka', 'prywatności']}
      lead={
        <>
          Wyjaśniamy, kto odpowiada za Twoje dane osobowe, jakie dane zbieramy, w&nbsp;jakim celu i&nbsp;jak długo je
          przechowujemy oraz jakie prawa Ci przysługują.
          <span className="s-privacy-date">Obowiązuje od: {EFFECTIVE_FROM}</span>
        </>
      }
    >
      <div className="h-section s-privacy">
        <div className="h-container s-privacy-grid">
          {/* przyklejony spis treści na desktopie – przyklejony jest sam element siatki (rodzic ma wysokość treści) */}
          <Reveal className="s-privacy-side" y={16}>
            <nav className="s-privacy-toc" aria-labelledby="s-privacy-toc-title">
              <h2 id="s-privacy-toc-title" className="s-privacy-toc__title">
                Spis treści
              </h2>
              <ol className="s-privacy-toc__list" role="list">
                {SECTIONS.map(({ id, title }) => (
                  <li key={id} className="s-privacy-toc__item">
                    <a className="s-privacy-toc__link" href={`#${id}`} aria-current={active === id ? 'true' : undefined}>
                      {title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </Reveal>

          <div className="s-prose s-privacy-prose">
            {/* tylko w trybie deweloperskim (npm run dev) – w buildzie produkcyjnym blok znika z paczki */}
            {import.meta.env.DEV && (
              <p className="s-privacy-dev" role="note">
                Szablon&nbsp;– do weryfikacji przez właścicielkę przed publikacją
              </p>
            )}
            {SECTIONS.map(({ id, title, body }, i) => (
              <Reveal as="section" key={id} id={id} className="s-privacy-section" y={16}>
                <h2>{`${i + 1}. ${title}`}</h2>
                {body}
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
