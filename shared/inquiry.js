// Formularz wyceny (/wycena) – wspólne reguły frontu i serwera: pola i etykiety, limity długości, dozwolone
// załączniki, czyszczenie i walidacja z komunikatami po polsku oraz zestawienie pól do panelu i e-maila.
// Front waliduje tym samym kodem co serwer, więc komunikaty przy polach zgadzają się z odpowiedzią API.
import { B2B_SERVICES, COMPANY, FURNITURE_TYPES } from './site.js';

export const INQUIRY_TYPES = { meble: 'Meble na wymiar', b2b: 'Usługi B2B' };
export const INQUIRY_STATUSES = { nowe: 'Nowe', w_toku: 'W toku', zamkniete: 'Zamknięte' };

export const PROJECT_OPTIONS = { gotowy: 'Mam gotowy projekt', opis: 'Mam opis lub szkic' };
export const EQUIPMENT = ['Szuflady', 'Oświetlenie', 'Lustra', 'Przeszklenia'];
export const MATERIAL_SOURCES = {
  powierzony: 'Materiał powierzony (dostarcza klient)',
  firma: `Materiał po stronie ${COMPANY.brand}`,
  do_ustalenia: 'Do ustalenia',
};

// Pola B2B pokazywane (i zapisywane) tylko przy zaznaczonej usłudze, której dotyczą.
export const B2B_CONDITIONAL = {
  edging: ['Oklejanie'],
  drilling: ['Nawiercanie', 'Frezowanie'],
  bending: ['Gięcie'],
};
export const conditionalActive = (field, services) => B2B_CONDITIONAL[field].some((s) => services.includes(s));

// Etykiety pól – te same w formularzu, panelu i e-mailu (twarde spacje po jednoliterowych słowach).
export const LABELS = {
  name: 'Imię i\u00a0nazwisko',
  nameB2B: 'Imię i\u00a0nazwisko lub nazwa firmy',
  email: 'E-mail',
  phone: 'Telefon',
  city: 'Miejscowość realizacji',
  message: 'Opis projektu',
  messageB2B: 'Opis zlecenia',
  furniture: 'Rodzaj mebli',
  project: 'Czy masz gotowy projekt?',
  dimensions: 'Wymiary',
  materials: 'Materiały, kolory i\u00a0wykończenia',
  equipment: 'Wyposażenie',
  equipmentOther: 'Inne wyposażenie',
  transport: 'Transport',
  assembly: 'Montaż',
  deadline: 'Preferowany termin realizacji',
  company: 'Firma',
  nip: 'NIP',
  services: 'Usługi',
  materialSource: 'Materiał',
  materialType: 'Rodzaj materiału',
  elements: 'Elementy: wymiary w\u00a0mm i\u00a0liczba sztuk',
  processing: 'Zakres obróbki / wymagania dokładności',
  edging: 'Oznaczenie krawędzi i\u00a0rodzaj obrzeża',
  drilling: 'Położenie, średnice i\u00a0głębokości otworów lub wybrań',
  bending: 'Oczekiwany kształt i\u00a0promień',
  pickup: 'Termin oraz sposób odbioru lub dostawy',
  files: 'Załączniki',
};

export const MAX_LENGTH = {
  name: 120,
  email: 160,
  phone: 40,
  city: 120,
  message: 5000,
  company: 160,
  nip: 20,
  dimensions: 1000,
  materials: 1000,
  equipmentOther: 200,
  deadline: 200,
  materialType: 300,
  elements: 5000,
  processing: 3000,
  edging: 1000,
  drilling: 1000,
  bending: 1000,
  pickup: 300,
};

// --- załączniki ------------------------------------------------------------------
const MB = 1024 * 1024;
export const FILE_LIMITS = { count: 10, size: 15 * MB, total: 25 * MB };

// Rozszerzenie → typ MIME (tylko z tej listy; nazwa pliku od klienta nigdy nie trafia do ścieżki na dysku).
export const FILE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  pdf: 'application/pdf',
  dxf: 'image/vnd.dxf',
  dwg: 'image/vnd.dwg',
  csv: 'text/csv',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  zip: 'application/zip',
};

// accept dla <input type="file">: rozszerzenia + typy MIME zdjęć i PDF (telefony pokazują wtedy galerię i aparat)
export const FILE_ACCEPT = [
  ...Object.keys(FILE_TYPES).map((ext) => `.${ext}`),
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
].join(',');

export const FILE_FORMATS_TEXT = 'zdjęcia (JPG, PNG, HEIC), PDF, DXF, DWG, CSV, XLS/XLSX, TXT lub ZIP';

// Minimalny czas od wyświetlenia formularza do wysłania (boty wysyłają od razu).
export const MIN_FILL_MS = 3000;

export function fileExtension(name) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(name || '').trim());
  return m ? m[1].toLowerCase() : '';
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < MB) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / MB).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} MB`;
}

// Odmiana liczebników: 1 plik, 2–4 pliki, 5 plików (12–14 plików, 22–24 pliki).
export function plural(n, [one, few, many]) {
  if (n === 1) return one;
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}

// Długie nazwy w komunikatach skracamy w środku (widać początek i rozszerzenie).
const shortName = (name) => {
  const s = String(name || 'bez nazwy');
  return s.length > 48 ? `${s.slice(0, 30)}…${s.slice(-14)}` : s;
};

// Problem z pojedynczym plikiem (format, pusty, za duży) albo null. Limity liczby i sumy sprawdza wołający.
export function fileProblem(name, size) {
  const label = `„${shortName(name)}”`;
  if (!Object.hasOwn(FILE_TYPES, fileExtension(name))) {
    return `Plik ${label} ma nieobsługiwany format. Dodaj ${FILE_FORMATS_TEXT}.`;
  }
  if (!size) return `Plik ${label} jest pusty.`;
  if (size > FILE_LIMITS.size) {
    return `Plik ${label} jest za duży (${formatBytes(size)})\u00a0– jeden plik może mieć najwyżej ${formatBytes(FILE_LIMITS.size)}.`;
  }
  return null;
}

// --- czyszczenie tekstu ----------------------------------------------------------------
// Znaki sterujące (C0 bez tabulatora i końca linii, C1), separatory linii, znaki zerowej szerokości i sterujące
// kierunkiem tekstu (podmiana kolejności liter w nazwach plików) – usuwane ze wszystkich pól.
const CONTROL = /[\u{0}-\u{8}\u{B}\u{C}\u{E}-\u{1F}\u{7F}-\u{9F}\u{200B}-\u{200F}\u{2028}-\u{202E}\u{2060}-\u{2069}\u{FEFF}]/gu;

export function cleanLine(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(CONTROL, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tekst wielowierszowy: końce linii ujednolicone do \n PRZED liczeniem długości (formularz wysyła \r\n).
export function cleanText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

const uniq = (list) => [...new Set(list)];

// Surowe dane (stan formularza albo pola multipart) → czyste dane jednego trybu; pola drugiego trybu puste.
export function normalizeInquiry(raw = {}) {
  const type = raw.type === 'b2b' || raw.type === 'meble' ? raw.type : '';
  const line = (k) => cleanLine(raw[k]);
  const text = (k) => cleanText(raw[k]);
  const list = (k) => {
    const v = raw[k];
    return uniq((Array.isArray(v) ? v : v ? [v] : []).map(cleanLine).filter(Boolean));
  };
  const flag = (k) => raw[k] === true || ['tak', 'true', 'on', '1'].includes(String(raw[k] ?? '').toLowerCase());

  const d = {
    type,
    name: line('name'),
    email: line('email'),
    phone: line('phone'),
    message: text('message'),
    city: '',
    company: '',
    nip: '',
    furniture: [],
    project: '',
    dimensions: '',
    materials: '',
    equipment: [],
    equipmentOther: '',
    transport: false,
    assembly: false,
    deadline: '',
    services: [],
    materialSource: '',
    materialType: '',
    elements: '',
    processing: '',
    edging: '',
    drilling: '',
    bending: '',
    pickup: '',
  };

  if (type === 'meble') {
    Object.assign(d, {
      city: line('city'),
      furniture: list('furniture'),
      project: line('project'),
      dimensions: text('dimensions'),
      materials: text('materials'),
      equipment: list('equipment'),
      equipmentOther: line('equipmentOther'),
      transport: flag('transport'),
      assembly: flag('assembly'),
      deadline: line('deadline'),
    });
  } else if (type === 'b2b') {
    Object.assign(d, {
      company: line('company'),
      nip: line('nip'),
      services: list('services'),
      materialSource: line('materialSource'),
      materialType: line('materialType'),
      elements: text('elements'),
      processing: text('processing'),
      pickup: line('pickup'),
    });
    for (const field of Object.keys(B2B_CONDITIONAL)) d[field] = conditionalActive(field, d.services) ? text(field) : '';
  }
  return d;
}

// --- walidacja ------------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

export const isEmail = (v) => EMAIL_RE.test(String(v || ''));

function isPhone(v) {
  if (!/^\+?[0-9\s().\-/]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

// Lekka kontrola: polski NIP to 10 cyfr (spacje, kreski i prefiks PL dozwolone); numer VAT UE – prefiks kraju.
function isNip(v) {
  const s = v.replace(/[\s.-]/g, '').toUpperCase();
  return /^(PL)?\d{10}$/.test(s) || /^(?!PL)[A-Z]{2}[0-9A-Z+*]{2,13}$/.test(s);
}

// Dane po normalizeInquiry → { pole: komunikat }. Pusty obiekt = wszystko w porządku.
export function validateInquiry(d) {
  const e = {};
  const b2b = d.type === 'b2b';
  if (!Object.hasOwn(INQUIRY_TYPES, d.type)) e.type = 'Wybierz, czego dotyczy zapytanie: meble na wymiar czy usługi B2B.';

  if (b2b) {
    if (!d.services.length) e.services = 'Zaznacz co najmniej jedną usługę.';
    else if (d.services.some((s) => !B2B_SERVICES.includes(s))) e.services = 'Wybierz usługi z\u00a0listy.';
    if (d.materialSource && !Object.hasOwn(MATERIAL_SOURCES, d.materialSource)) e.materialSource = 'Wybierz jedną z\u00a0opcji.';
  } else {
    if (d.furniture.some((t) => !FURNITURE_TYPES.includes(t))) e.furniture = 'Wybierz rodzaj mebli z\u00a0listy.';
    if (d.project && !Object.hasOwn(PROJECT_OPTIONS, d.project)) e.project = 'Wybierz jedną z\u00a0opcji.';
    if (d.equipment.some((t) => !EQUIPMENT.includes(t))) e.equipment = 'Wybierz wyposażenie z\u00a0listy.';
  }

  if (!d.message) e.message = b2b ? 'Opisz krótko zlecenie.' : 'Opisz krótko projekt.';
  if (!b2b && !d.city) e.city = 'Podaj miejscowość realizacji.';
  if (!d.name) e.name = b2b ? 'Podaj imię i\u00a0nazwisko lub nazwę firmy.' : 'Podaj imię i\u00a0nazwisko.';
  if (b2b && d.nip && !isNip(d.nip)) e.nip = 'Sprawdź NIP\u00a0– polski NIP ma 10 cyfr.';
  if (!d.email) e.email = 'Podaj adres e-mail\u00a0– na niego wyślemy odpowiedź.';
  else if (!isEmail(d.email)) e.email = 'Wpisz poprawny adres e-mail, np. nazwa@domena.pl.';
  if (d.phone && !isPhone(d.phone)) e.phone = 'Sprawdź numer telefonu albo zostaw to pole puste.';

  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (!e[field] && typeof d[field] === 'string' && d[field].length > max) {
      e[field] = `Ten tekst jest za długi\u00a0– najwyżej ${max} znaków.`;
    }
  }
  return e;
}

// --- prezentacja (panel firmy, e-mail) -------------------------------------------------------
// Zakres zapytania w jednym wierszu: usługi B2B albo rodzaje mebli.
export function inquiryScope(inq) {
  const d = inq?.details || {};
  return (inq?.type === 'b2b' ? d.services : d.furniture)?.join(', ') || '';
}

export function inquirySubject(inq) {
  const c = inq.contact || {};
  const s =
    inq.type === 'b2b'
      ? `Zapytanie B2B: ${inquiryScope(inq) || 'usługi'} – ${c.company || c.name}`
      : `Zapytanie o wycenę: ${inquiryScope(inq) || 'meble na wymiar'} – ${c.name}${c.city ? `, ${c.city}` : ''}`;
  return s.length > 180 ? `${s.slice(0, 179)}…` : s;
}

// Wiersze [etykieta, wartość] (bez pustych) – kontakt i szczegóły zapytania danego trybu.
export function inquiryRows(inq) {
  const b2b = inq.type === 'b2b';
  const c = inq.contact || {};
  const d = inq.details || {};
  const yesNo = (v) => (v ? 'tak' : 'nie');
  const contact = [
    [b2b ? LABELS.nameB2B : LABELS.name, c.name],
    b2b && [LABELS.company, c.company],
    b2b && [LABELS.nip, c.nip],
    [LABELS.email, c.email],
    [LABELS.phone, c.phone],
    !b2b && [LABELS.city, c.city],
  ];
  const details = b2b
    ? [
        [LABELS.services, (d.services || []).join(', ')],
        [LABELS.materialSource, MATERIAL_SOURCES[d.materialSource]],
        [LABELS.materialType, d.materialType],
        ['Elementy (wymiary w\u00a0mm, liczba sztuk)', d.elements],
        [LABELS.processing, d.processing],
        [LABELS.edging, d.edging],
        [LABELS.drilling, d.drilling],
        [LABELS.bending, d.bending],
        [LABELS.pickup, d.pickup],
      ]
    : [
        [LABELS.furniture, (d.furniture || []).join(', ')],
        ['Projekt', PROJECT_OPTIONS[d.project]],
        [LABELS.dimensions, d.dimensions],
        [LABELS.materials, d.materials],
        [LABELS.equipment, [...(d.equipment || []), d.equipmentOther && `inne: ${d.equipmentOther}`].filter(Boolean).join(', ')],
        [LABELS.transport, yesNo(d.transport)],
        [LABELS.assembly, yesNo(d.assembly)],
        [LABELS.deadline, d.deadline],
      ];
  const keep = (rows) => rows.filter((row) => row && row[1]);
  return { contact: keep(contact), details: keep(details) };
}
