# HAR MEBLE – strona firmowa (wizytówka) + konfigurator mebli 3D z wyceną

Strona stolarni HAR MEBLE (meble na wymiar i usługi B2B, Śląsk i Wielkopolska). Działa w dwóch trybach:

- **`wizytowka`** (domyślnie, etap 1): strona główna z filmem, podstrony **Usługi B2B** (`/uslugi-b2b`),
  **Wycena online** z formularzem i załącznikami (`/wycena`), **Kontakt** (`/kontakt`) i **Polityka prywatności**
  (`/polityka-prywatnosci`). Konfiguratory 3D, konta klientów i „Moje projekty” są wyłączone (trasy nie istnieją,
  serwer odrzuca rejestrację). Zostaje ukryty panel firmy `/admin` z zapytaniami z formularza.
- **`pelna`** (kolejne etapy): do tego konfiguratory kuchni i szaf 3D z ceną na żywo, konta klientów, projekty i cennik w panelu.

Tryb ustawia się zmiennymi: `VITE_SITE_MODE=pelna SITE_MODE=pelna npm run dev` (front czyta `VITE_SITE_MODE`, serwer
`SITE_MODE`). Dane firmy (adresy, telefony, e-maile, NIP), usługi B2B i trasy są w jednym pliku: `shared/site.js`.

## Uruchomienie

```bash
npm install
npm run dev
```

Otwórz http://localhost:5173

| Konto | E-mail | Hasło |
|---|---|---|
| Klient (demo, tylko tryb `pelna`) | `klient@demo.pl` | `demo123` |
| Panel firmy (admin) | `admin@stolarnia.pl` | `admin123` |

Konta demo i narzędzia deweloperskie (`/api/dev/*` – studio renderów, eksport filmu) działają tylko przy `npm run dev`,
który ustawia `DEV_TOOLS=1` (w produkcji ta zmienna jest ignorowana). W produkcji (`npm start`, `NODE_ENV=production`)
baza startuje pusta, a konto panelu zakładają zmienne `ADMIN_EMAIL` i `ADMIN_PASSWORD` (min. 12 znaków). Zmienne wygrywają
z bazą przy każdym starcie: nowe `ADMIN_PASSWORD` zmienia hasło i wylogowuje dotychczasowe sesje tego konta. Sesja panelu
wygasa po 14 dniach. Logowanie ma limit nieudanych prób (20 z jednego adresu i 10 na jeden e-mail w 15 minut).
W wizytówce (bez kont klientów) zalogować może się tylko konto panelu.

Dane trzymane są w `data/db.json` (zapytania z formularza: `data/inquiries/`). Usunięcie `db.json` przywraca stan demo
(przy następnym starcie `npm run dev`). **Nie kopiuj katalogu `data/` z komputera deweloperskiego na serwer** – produkcja
i tak usuwa przy starcie konta demo, które mają hasła z tej tabeli, ale baza deweloperska zawiera też testowe dane.

## Co jest w prototypie

- **Konfigurator kuchni 3D**: układ prosty (I) lub narożny (L), wymiary ścian, 10 typów szafek
  (dolne, szufladowe, zlewowa, piekarnikowa, zmywarka, górne, słupki na lodówkę/piekarnik/spiżarnię).
  Automatyczne rozmieszczenie (górne szafki omijają słupki), ostrzeżenia o przekroczeniu ściany,
  otwieranie frontów, zaznaczanie i edycja szafki kliknięciem.
  - **Przesuwanie myszką** (wzorowane na planerach typu „przeciągnij i upuść”): szafki górne wiszą swobodnie –
    przeciąganie w lewo/prawo i w górę/dół (martwa strefa w pionie, żeby ruch w bok nie zmieniał wysokości),
    przyciąganie do krawędzi sąsiadek, szafek dolnych, końców ściany i wysokości 145 cm (Alt – bez przyciągania),
    bez nakładania na inne szafki i słupki; w pełnym rzędzie szafka wsuwa się między sąsiadki (zamiana miejscami).
    Szafki dolne i słupki stoją w ciągłym rzędzie (wspólny blat) – przeciąganie zmienia ich kolejność.
  - **Niebieskie wymiary** przy zaznaczonej szafce górnej: odstęp do sąsiadek / końca ściany, nad blatem i do sufitu.
  - Pozycja w cm w karcie szafki (od lewej / od narożnika, wysokość dolnej krawędzi), „Dosuń”, „Nad szafkę dolną”,
    „Standardowa wysokość”; **Cofnij / Ponów** (przyciski i Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y);
    strzałki: przesunięcie o 1 cm (Shift – 10 cm), ↑/↓ – wysokość, Delete/Backspace – usuń, Esc – odznacz.
  - Pozycje szafek górnych (`x`, `y` w module) zapisują się w projekcie; stare projekty bez nich układają się jak dawniej.
    Logika: `shared/kitchen.js` (`moveWallModule`, `nudgeWallModule`, `reorderFloorModule`, `freezeWallRow`).
- **Konfigurator szaf 3D**: wymiary wnęki, 1–6 sekcji, wnętrze sekcji (drążki, półki, szuflady),
  drzwi przesuwne z lustrem / uchylne / bez frontów, podgląd wnętrza.
- **Dekory i tekstury**: 26 dekorów (12 kolorów, 6 rodzajów drewna, 8 kamieni i betonów: marmur, beton, terrazzo, kwarc, granit)
  generowane proceduralnie w przeglądarce (`src/three/textures.js`), bez plików graficznych. Tekstury mają realną
  skalę (UV w metrach), a każdy front dostaje inny fragment usłojenia. Każdy materiał ma tylko dekory, które
  da się z niego realnie wykonać, np. MDF lakierowany ma same kolory, a drewno lite same gatunki drewna.
- **Style frontów**: gładki, ramowy (frezowany, osobna geometria ramki) i ryflowany (lamele z mapy normalnych).
  Każdy styl ma dopłatę za m² w cenniku i jest dostępny tylko dla materiałów, z których da się go wykonać.
- **Gotowe zestawy**: 8 stylów (skandynawski, szałwia i dąb, butelkowa zieleń, grafit, orzech…), każdy ustawia
  front, blat, korpus i uchwyty jednym kliknięciem.
- Blaty: laminat, kompakt HPL, drewno lite, kwarc, granit. Uchwyty: listwy aluminiowe i czarne, gałki czarne
  i mosiężne, system „push”. Okucia standard i premium.
- Kody dekorów (K01, D05, S01…) to przykładowe kody wewnętrzne. W produkcji wpisuje się kody z katalogu
  hurtowni płyt, a proceduralne tekstury można zastąpić skanami dekorów od dostawcy (te same UV).
- **Realistyczny podgląd na żywo**: odbicia otoczenia (generowane lokalnie), cienie kontaktowe (ambient occlusion,
  N8AO), miękkie cienie, tone mapping „Neutral” (wierne kolory dekorów), zaokrąglone krawędzie frontów i blatów,
  aranżacja wnętrza (tynk, płytki nad blatem, listwy, podłoga z desek dębowych).
- **Render fotorealistyczny** (przycisk w widoku 3D): path tracing w przeglądarce (`three-gpu-pathtracer`),
  który daje światło odbite, miękkie cienie i odbicia w lustrach/połysku. Ok. 300 próbek w 1–2 min, z pobieraniem PNG.
  Wersja 0.0.23 jest przypięta do three r176. Jej `dispose()` ma błąd, który obchodzimy w `src/three/parts.jsx`.
- **Silnik wyceny** (`shared/pricing.js`): z geometrii liczy formatki (m² płyty, mb okleiny),
  fronty, blat z wycięciami, zawiasy, szuflady, nóżki, robociznę w godzinach, montaż, transport,
  marżę i VAT. Ten sam kod działa w przeglądarce (podgląd) i na serwerze, więc cena w zapytaniu
  jest liczona po stronie serwera i nie da się jej podmienić.
- **Lista formatek do rozkroju** dla każdego projektu z eksportem do CSV (Excel). Można ją wysłać do hurtowni lub na pilarkę.
- **Konta klientów**: rejestracja, logowanie, zapis projektów, „Moje projekty”, wysłanie zapytania.
  Niezalogowany może projektować, a przy zapisie konfiguracja przechodzi przez logowanie.
- **Panel stolarni**: lista zapytań z kosztem własnym i zyskiem, statusy, cena ofertowa i wiadomość
  dla klienta. Edytor cennika z podglądem wpływu zmian na cenę przykładowych projektów.
  Klient nigdy nie widzi kosztów ani marży (dostaje ceny z wliczoną marżą).

## Strona główna

- **Film w hero** (`src/pages/home/HeroSection.jsx`, pliki w `public/video/`): 3 szerokie ujęcia (kuchnia w szałwii
  z narożnikiem z frontem łamanym, salon z granatowym regałem, sypialnia z szafą) z Google Flow (Veo 3.1 Quality),
  zmontowane w pętlę bez szwu, bez dźwięku. Paski ujęć (kliknięcie przeskakuje), pauza, zatrzymanie poza ekranem,
  plakat = pierwsza klatka. Wersje: 1080p / 720p (komputer, zależnie od kadru w pikselach urządzenia i łącza) oraz
  **pionowy wycinek 608×1080 na telefon** (`hero-mobile.mp4`, ok. 2,5 MB zamiast 8,7 MB, z pionowym plakatem; przy obrocie
  telefonu film przełącza wersję od tego samego miejsca). Przy oszczędzaniu danych i łączu do 3G zostaje plakat; przy
  `prefers-reduced-motion` film nie startuje sam.
  - Jak powstał: szerokie zdjęcie wnętrza w Google Flow (Nano Banana, z dopiskiem o naturalnych niedoskonałościach) →
    klip 8 s (Veo 3.1 Quality, 100 pkt) → pobranie w 1080p (bezpłatne skalowanie). Klipy źródłowe: `exports/flow-veo/`
    (pliki z `0-` na początku to odrzucone wersje: zły narożnik kuchni, fotel wjeżdżający w kadr komody).
  - Montaż (ffmpeg): `npm run video:hero -- exports/flow-veo/1-kuchnia.mp4@0-6.8=Kuchnia exports/flow-veo/2-salon.mp4@0-5.6=Salon exports/flow-veo/3-sypialnia.mp4=Sypialnia`
    – 2–6 klipów, `@od-do` przycina klip (np. bez końcówki, w której kamera podjeżdża za blisko), po `=` podpis paska.
    Przenikania 0,8 s, 1080p (CRF 22, level 4.0) + 720p + wycinek na telefon (`HERO_MOBILE_X` – środek wycinka, domyślnie 0,6),
    klatki kluczowe na początkach ujęć, plakaty i `src/pages/home/heroVideo.json` (ujęcia, czasy na siatce klatek).
- **Film 3D** (`src/pages/home/film/`, dawniej w hero): te same 4 ujęcia liczone na żywo w three.js. Dziś źródło
  klatek startowych i eksportu do MP4 (`/studio/film`, niżej).
- **Sekcje** (`src/pages/home/sections/`), w wizytówce z tekstami właścicielki: manifest odsłaniany słowo po słowie,
  karuzela „Meble na wymiar” (`#meble`, karty prowadzą do formularza z wybranym rodzajem mebla), pasek konkretów,
  **O nas** (`#o-nas`), „wybierz kolor” (żywe 3D tylko na komputerze z myszą, na telefonie lekkie szkice 2D),
  baner **Usługi B2B** (w trybie `pelna` – baner konfiguratora), „Jak pracujemy”, próbnik dekorów, inspiracje,
  „Uważność na szczegóły”, FAQ, kontakt (oba oddziały) i stopka z dużym napisem HAR MEBLE.
- **Podstrony wizytówki** (`src/pages/site/`): wspólny układ `PageShell.jsx` (nagłówek z h1 + stopka, system projektowy
  strony głównej), `B2BPage.jsx`, `QuotePage.jsx` + `QuoteParts.jsx` (formularz; linki mogą go wypełnić:
  `/wycena?typ=b2b&usluga=Gięcie`, `?mebel=Kuchnia`, `&dekor=…`, `&inspiracja=…`), `ContactPage.jsx` (dane do faktury
  z kopiowaniem, JSON-LD), `PrivacyPage.jsx` (szablon do weryfikacji przez właścicielkę – data wejścia w życie
  w `EFFECTIVE_FROM`).
- **System projektowy**: `src/pages/home/home.css` (tokeny, typografia Inter Tight, przyciski, animacje wejścia)
  i `src/pages/home/ui.jsx` (`Reveal`, `MaskLines`, `SectionHead`, `Img`, hooki `useInView`, `useScrollProgress`…).
- **Zdjęcia do sekcji** (`public/renders/*.jpg`): rendery z path tracera przerobione w Google Flow (Nano Banana) na
  fotorealistyczne zdjęcia – ten sam kadr i mebel, naturalne drobiazgi i niedoskonałości; pobrane w 2K, przycięte do
  1600×1000. Kuchnie L (szałwia, biała, butelkowa zieleń) mają poprawiony narożnik (szafki narożne z frontem łamanym
  i blendy zamiast wciśniętej w róg szafki); poprzednie wersje: `exports/renders-photo-v1/`, oryginalne rendery:
  `exports/renders-cg/`. `b2b.jpg` (baner B2B) to zdjęcie **poglądowe** z Flow – do podmiany na zdjęcie z zakładu.
- **Rendery źródłowe** wygenerował nasz path tracer z odszumianiem w studiu, które działa
  tylko w trybie deweloperskim: `http://localhost:5173/studio?queue=all` (albo `?preset=kuchnia-szalwia`,
  podgląd kadru: `&preview=1`). Pliki zapisuje endpoint `POST /api/dev/render` (tylko dev i localhost).
- Warianty obrazów do `srcset` (480 i 800 px) tworzy `npm run renders:variants` (macOS `sips`). Uruchom po każdym nowym renderze.
- **Eksport filmu z hero do MP4** (tylko dev, wymaga `ffmpeg`): `http://localhost:5173/studio/film?auto=1`
  (`&format=9x16` – wersja pionowa 1080×1920, `&test=1` – próbne 2 s). Render offline klatka po klatce w stałym czasie
  filmu: 60 kl./s, 8 podklatek na klatkę (rozmycie ruchu – migawka 180° – i wygładzanie przez przesunięcie subpikselowe),
  uśrednianie w świetle liniowym, dithering, AO „ultra”, cienie 4096, przenikanie przez kolor przy cięciach jak w hero.
  Klatki RGBA trafiają przez `POST /api/dev/film/{start,frame,end}` prosto do ffmpeg (H.264, CRF 14) → `exports/*.mp4`.
  Karta musi być na wierzchu w trakcie renderu (ok. 0,3 s na klatkę na M1 Pro, czyli ok. 6 min na cały film).
- **Linki do konfiguratora z gotowym startem**: `/konfigurator/kuchnia?zestaw=orzech` (id z `STYLE_PRESETS`),
  `?dekor=szalwia` (dekor frontu, a materiał dobiera się sam) oraz dla szafy `&drzwi=uchylne|przesuwne|brak`.
  Działa dla nowego projektu (bez zapisanego szkicu). Korzystają z tego karty inspiracji i sekcja kolorów.
- Moduły 3D: `src/three/geometry.jsx` (lekki: bryły, fronty, uchwyty, odbicia otoczenia) i `src/three/parts.jsx`
  (konfigurator: płótno z efektami, path tracer). Strona główna importuje tylko lekki moduł.
- Dane kontaktowe na stronie pochodzą od właścicielki (`shared/site.js`); dni tygodnia przy „Godziny kontaktu 8:00–17:00”
  do potwierdzenia.

## Cennik

- `DEFAULT_PRICING` (`shared/catalog.js`) to koszty netto stolarni, skalibrowane w XI 2026 do cen rynkowych małych i średnich
  stolarni (raport z badaniem, źródłami i konfiguracjami kontrolnymi: `docs/badanie-cen-2026-11.md`). Marża i VAT doliczane
  osobno; administrator zmienia wszystko w panelu, a „Przywróć domyślne” wraca do tych wartości.
- VAT: zabudowa z montażem w mieszkaniu do 150 m² / domu do 300 m² często ma 8% – wtedy `vat: 8` i marża ok. 48%,
  żeby ceny brutto zostały na tym samym poziomie (decyzja właściciela stolarni).

## Formularz wyceny i e-maile

- **Strona `/wycena`** (`src/pages/site/QuotePage.jsx`): jeden formularz w dwóch trybach – meble na wymiar albo usługi B2B.
  Załączniki: do 10 plików, jeden do 15 MB, razem do 25 MB (zdjęcia z HEIC, PDF, DXF, DWG, CSV, XLS/XLSX, TXT, ZIP).
  Linki mogą otworzyć formularz z wyborem: `?typ=b2b`, `?usluga=Cięcie`, `?mebel=Kuchnia`, `?inspiracja=…`, `?dekor=…`.
- **API** `POST /api/inquiries` (`server/inquiries.js`, multipart bez dodatkowych bibliotek – parser FormData z Node,
  pliki zapisywane strumieniem prosto na dysk). Te same reguły walidacji co w przeglądarce (`shared/inquiry.js`),
  ukryte pole-pułapka na boty i minimalny czas wypełnienia (3 s). Ochrona przed zasypywaniem: z jednego adresu
  (IPv6 – pula /64) 5 zgłoszeń na 10 minut i 10 na dobę, jedna wysyłka naraz; najwyżej 3 formularze odczytywane
  jednocześnie na całym serwerze; dobowy limit całego formularza 100 zapytań i 1 GB załączników oraz zapas 512 MB
  wolnego miejsca na dysku (po przekroczeniu klient dostaje e-mail i telefon firmy). Formularz przyjmuje tylko
  wysyłki z naszej strony (`Origin` / `Sec-Fetch-Site`, adresy z `PUBLIC_ORIGIN`).
- **Zapis**: rekord w `data/db.json` (`inquiries`), pliki w `data/inquiries/<id>/` pod losowymi nazwami (`data/` nie jest serwowany).
- **Panel** `/admin` → „Formularz wyceny”: status, notatka, pobieranie załączników, odpowiedź e-mailem, usuwanie zapytania.
- **E-mail** (`server/mailer.js`, nodemailer): powiadomienie na adres z `shared/site.js` – meble na `COMPANY.email`, B2B na
  `COMPANY.emailB2B` – z „Odpowiedz do” ustawionym na klienta i z załącznikami. Wysyłka idzie po odpowiedzi dla klienta,
  a wynik zapisuje się przy zapytaniu. Bez `SMTP_HOST` e-mail nie wychodzi, zapytanie i tak trafia do panelu
  (w logu serwera: „e-mail nie wysłany (brak konfiguracji SMTP)”).

| Zmienna | Znaczenie |
|---|---|
| `SMTP_HOST` | serwer SMTP, np. `smtp.gmail.com` (bez tej zmiennej e-maile są wyłączone) |
| `SMTP_PORT` | port: `465` (SSL) albo `587` (STARTTLS, domyślnie) |
| `SMTP_SECURE` | `true` – szyfrowanie od początku połączenia (domyślnie tylko przy porcie 465) |
| `SMTP_USER`, `SMTP_PASS` | login i hasło SMTP; dla Gmaila hasło aplikacji (wymaga weryfikacji dwuetapowej) |
| `MAIL_FROM` | nadawca, np. `"Formularz HAR MEBLE" <har.meble@gmail.com>` (domyślnie `SMTP_USER`) |
| `MAIL_TO`, `MAIL_TO_B2B` | inni adresaci zapytań o meble / B2B niż adresy z `shared/site.js` |
| `MAIL_ATTACHMENTS_MAX_MB` | ile MB załączników dołączać do e-maila (domyślnie 18 – Gmail przyjmuje 25 MB po zakodowaniu); reszta tylko w panelu |
| `MAIL_ATTACHMENTS_DAY_MB` | dobowy budżet załączników w e-mailach (domyślnie 300 MB); ponad niego e-mail ma tylko listę plików, pliki są w panelu |
| `PUBLIC_ORIGIN` | adres strony, np. `https://harmeble.pl` (kilka – po przecinku; także wersja z `www`) – z niego formularz przyjmuje wysyłki; poza produkcją dochodzi `http://localhost:5173` |
| `TRUST_PROXY` | za reverse proxy: liczba proxy przed serwerem (`1` – nginx, `2` – Cloudflare + nginx), `loopback` albo adresy/CIDR; `true` jest odrzucane (pozwalałoby klientom podszywać się pod dowolny adres). Bez tej zmiennej za proxy wszyscy klienci dzielą jeden limit – serwer ostrzeże o tym w logu |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | konto panelu w produkcji (patrz „Uruchomienie”) |
| `DEV_TOOLS` | `1` – narzędzia deweloperskie i konta demo (ustawia `npm run dev`; w produkcji ignorowane) |

```bash
SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true \
SMTP_USER=har.meble@gmail.com SMTP_PASS='hasło aplikacji' npm run dev
```

## Architektura

```
shared/   katalog, geometria szafek, silnik wyceny (wspólne dla frontu i backendu)
server/   Express API: logowanie (scrypt + tokeny sesji), projekty, zapytania, cennik
src/      React + React Router, scena 3D: three.js / @react-three/fiber / drei
```

## Przed publikacją wizytówki (etap 1)

- Domena, hosting Node (np. VPS) z HTTPS, `npm start` (`NODE_ENV=production`), `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
  `PUBLIC_ORIGIN`, SMTP do wysyłki zapytań (sekcja „Formularz wyceny i e-maile”), `TRUST_PROXY` za reverse proxy,
  kopie zapasowe `data/` (świeża baza na serwerze – bez kopiowania `data/` z komputera deweloperskiego).
- Okres przechowywania zapytań z polityki prywatności (12 miesięcy) – usuwanie ręcznie w panelu („Usuń zapytanie”
  kasuje rekord i pliki); kopie w skrzynce Gmail trzeba usuwać osobno.
- `og:image`/`og:url` w `index.html` z pełnym adresem domeny, data wejścia w życie polityki prywatności
  (`COMPANY.privacyEffectiveFrom` w `shared/site.js`, format `RRRR-MM-DD`), potwierdzenie przez właścicielkę odbiorców
  danych (przy Google Workspace polityka może mówić o umowie powierzenia z Google – darmowy Gmail jej nie daje),
  ewentualnie numer KRS.
- Logo (wektor) i prawdziwe zdjęcia realizacji oraz zakładu (B2B) w miejsce zdjęć poglądowych.

## Czego brakuje do wersji produkcyjnej (konfigurator – kolejne etapy)

- Baza PostgreSQL zamiast pliku JSON, backupy, hosting, HTTPS, domena.
- Weryfikacja e-mail, reset hasła, regulamin dla kont klientów.
- Powiadomienia e-mail dla projektów z konfiguratora (oferta gotowa), oferta w PDF.
- Prawdziwy cennik i reguły technologiczne stolarni (do ustalenia z właścicielem). Ceny w prototypie są przykładowe.
- **Szafki narożne** (front łamany, karuzela, cargo) i blendy w narożnikach – dziś konfigurator stawia w rogu zwykłą
  szafkę (stąd poprawki zdjęć kuchni L), cokoły boczne, listwy, okapy, wysokości niestandardowe.
- Tekstury realnych dekorów płyt od dostawców, modele 3D AGD i uchwytów (GLB).
- Galeria realizacji i CMS do edycji treści (wizytówka ma treści w kodzie).
- Testy automatyczne, optymalizacja wydajności 3D na słabszych telefonach.
