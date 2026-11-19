// Formularz wyceny – API: POST /api/inquiries (multipart: pola + załączniki) i endpointy panelu firmy.
// Multipart bez dodatkowych zależności: parser FormData wbudowany w Node (undici). Trzyma całe żądanie w pamięci,
// dlatego rozmiar sprawdzamy przed parsowaniem (Content-Length), w trakcie liczymy bajty i części strumienia, a naraz
// odczytujemy najwyżej kilka formularzy (z jednego adresu – jeden). Pliki trafiają na dysk strumieniem.
// Pliki: data/inquiries/<id zapytania>/<losowe id>.<rozszerzenie z listy> – katalog data/ nie jest serwowany publicznie.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { db, save } from './db.js';
import { mailConfigured, sendInquiryMail } from './mailer.js';
import { COMPANY } from '../shared/site.js';
import {
  FILE_LIMITS,
  FILE_TYPES,
  INQUIRY_STATUSES,
  MIN_FILL_MS,
  cleanLine,
  cleanText,
  fileExtension,
  fileProblem,
  normalizeInquiry,
  validateInquiry,
} from '../shared/inquiry.js';

const MB = 1024 * 1024;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const DIR = path.resolve(import.meta.dirname, '../data/inquiries');
const MAX_BODY = FILE_LIMITS.total + 2 * MB; // załączniki + pola tekstowe i narzut multipart (ok. 27 MB)
const MAX_ENTRIES = 300; // pól w jednym formularzu jest kilkadziesiąt – więcej to nie nasz formularz
const LIST_FIELDS = new Set(['furniture', 'equipment', 'services']);
const NOTE_MAX = 2000;

const nowIso = () => new Date().toISOString();
const stamp = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');

// --- liczniki na klienta (formularz wyceny i logowanie; w pamięci procesu – po restarcie od zera) ------------
const MAX_KEYS = 10_000; // kluczy w jednym liczniku – przy zalewie nowych adresów wypadają najdawniej używane

// Licznik zdarzeń na klucz (adres, e-mail) w oknie czasu.
export function windowCounter(windowMs) {
  const map = new Map();
  let swept = 0;
  const live = (key, now) => {
    const list = (map.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length) map.set(key, list);
    else map.delete(key);
    return list;
  };
  return {
    count: (key, now) => live(key, now).length,
    // sekundy do wygaśnięcia najstarszego wpisu – do nagłówka Retry-After
    wait(key, now) {
      const [first] = live(key, now);
      return first === undefined ? 0 : Math.max(1, Math.ceil((first + windowMs - now) / 1000));
    },
    add(key, now) {
      const list = [...live(key, now), now];
      map.delete(key); // na koniec kolejki – przy przepełnieniu wypada nieaktywny klucz, nie ten
      map.set(key, list);
      // wpisy innych kluczy sprzątamy przy okazji (bez timera), najwyżej raz na minutę
      if (map.size > 2000 && now - swept > MINUTE) {
        swept = now;
        for (const k of [...map.keys()]) live(k, now);
      }
      while (map.size > MAX_KEYS) map.delete(map.keys().next().value);
    },
    // cofa ostatni wpis (np. próba logowania liczona z góry okazała się udana)
    undo(key) {
      const list = map.get(key);
      list?.pop();
      if (list && !list.length) map.delete(key);
    },
  };
}

// Klucz klienta do limitów: adres IPv4 albo prefiks /64 adresu IPv6 – łącze dostaje zwykle całą pulę /64, więc
// kolejny adres z niej nie daje nowego limitu.
export function clientKey(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  const [head, tail] = ip.split('%')[0].split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${groups.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16)).join(':')}::/64`;
}

// --- limity formularza ----------------------------------------------------------------------
const MAX_SENT = 5; // przyjętych zgłoszeń z jednego adresu w 10 minut (w tym odrzuconych po cichu jako spam)
const MAX_TRIES = 15; // wszystkich prób w 10 minut – chroni parser przed zasypywaniem błędnymi żądaniami
const MAX_SENT_DAY = 10; // przyjętych zgłoszeń z jednego adresu na dobę
const MAX_PARSING = 3; // formularzy odczytywanych naraz (każdy trzyma w pamięci do ok. 27 MB); z jednego adresu – jeden
const DAY_MAX = 100; // zapytań na dobę łącznie – ponad to formularz odsyła do e-maila i telefonu firmy
const DAY_MAX_BYTES = 1024 * MB; // załączników na dobę łącznie
const MIN_FREE_BYTES = 512 * MB; // zapas wolnego miejsca na dysku z data/
const sent = windowCounter(10 * MINUTE);
const tries = windowCounter(10 * MINUTE);
const sentDay = windowCounter(DAY);
const busy = new Set(); // klucze klientów, których formularz jest właśnie odczytywany i zapisywany

// Skąd przyjmujemy formularz: PUBLIC_ORIGIN (adres strony, kilka po przecinku), a poza produkcją także serwer Vite.
const ALLOWED_ORIGINS = new Set(
  String(process.env.PUBLIC_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      let origin = 'null';
      try {
        origin = new URL(s).origin;
      } catch {
        /* sprawdzone niżej */
      }
      if (/^https?:\/\//.test(origin)) return [origin];
      console.error(`PUBLIC_ORIGIN: pomijam nieprawidłowy adres „${s}” (podaj np. https://harmeble.pl).`);
      return [];
    }),
);
if (process.env.NODE_ENV !== 'production') ALLOWED_ORIGINS.add('http://localhost:5173').add('http://127.0.0.1:5173');

// Formularz wysyła tylko nasza strona. Przeglądarka podaje Sec-Fetch-Site (same-origin – ta sama strona) i Origin,
// a cudza strona nie może ich podmienić w przeglądarce odwiedzającego. Żądania bez obu nagłówków (curl, testy po
// stronie serwera) przechodzą – endpoint nie używa ciasteczek, więc nie ma tu czyichś uprawnień do wykorzystania.
function foreignOrigin(req) {
  const site = req.get('sec-fetch-site');
  const origin = req.get('origin');
  if (site === 'same-origin' || site === 'none') return false;
  if (origin && ALLOWED_ORIGINS.has(origin)) return false;
  if (site) return true; // same-site / cross-site spoza listy
  if (!origin) return false;
  // starsze przeglądarki bez Sec-Fetch-Site: Origin musi wskazywać host, pod który przyszło żądanie
  try {
    return new URL(origin).host !== req.host;
  } catch {
    return true;
  }
}

// Zapytania i bajty załączników z ostatniej doby – liczone z bazy, więc limit przetrwa restart, a usunięcie spamu
// w panelu go zwalnia.
function lastDay(now) {
  let count = 0;
  let bytes = 0;
  for (const inq of db.inquiries) {
    if (!(now - Date.parse(inq.createdAt) < DAY)) continue;
    count += 1;
    for (const f of inq.files || []) bytes += Number(f.size) || 0;
  }
  return { count, bytes };
}

// Wolne miejsce na dysku z danymi; null, gdy system go nie podaje (wtedy nie blokujemy formularza).
async function freeBytes() {
  try {
    const s = await fs.promises.statfs(path.dirname(DIR));
    return s.bavail * s.bsize;
  } catch {
    return null;
  }
}

// --- odczyt multipart -------------------------------------------------------------------
class BodyTooLarge extends Error {}
class TooManyParts extends Error {}

// Granica części z nagłówka Content-Type (RFC 2046: 1–70 znaków) albo null.
function boundaryOf(type) {
  const m = /;\s*boundary=(?:"([^"]{1,70})"|([^\s;"]{1,70}))\s*(?:;|$)/i.exec(type);
  return m ? m[1] || m[2] : null;
}

async function readMultipart(req, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  let seen = 0;
  let parts = 0;
  let tail = Buffer.alloc(0);
  const guard = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length;
      if (seen > MAX_BODY) return cb(new BodyTooLarge());
      // Granice części liczymy w locie (z końcówką poprzedniego kawałka, gdyby granica wypadła na styku) – tysiące
      // pustych części przerywamy od razu, zanim parser zablokuje serwer budowaniem z nich obiektów.
      const buf = tail.length ? Buffer.concat([tail, chunk]) : chunk;
      for (let i = buf.indexOf(delimiter); i !== -1; i = buf.indexOf(delimiter, i + delimiter.length)) parts += 1;
      if (parts > MAX_ENTRIES + 1) return cb(new TooManyParts());
      tail = Buffer.from(buf.subarray(Math.max(0, buf.length - delimiter.length + 1)));
      cb(null, chunk);
    },
  });
  req.on('error', (err) => guard.destroy(err));
  // zerwane połączenie: bez tego parser czekałby w nieskończoność i trzymał miejsce w limicie odczytów
  req.on('close', () => req.complete || guard.destroy(new Error('Połączenie przerwane.')));
  req.pipe(guard);
  const request = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': req.headers['content-type'] },
    body: Readable.toWeb(guard),
    duplex: 'half',
  });
  try {
    return await request.formData();
  } catch (err) {
    if (seen > MAX_BODY || err instanceof BodyTooLarge || err?.cause instanceof BodyTooLarge) throw new BodyTooLarge();
    if (err instanceof TooManyParts || err?.cause instanceof TooManyParts) throw new TooManyParts();
    throw err;
  }
}

// Nazwa do wyświetlenia (panel, e-mail, pobieranie): bez znaków sterujących i ukośników, rozszerzenie zostaje.
function displayName(name, ext) {
  let s = cleanLine(name).replace(/[\\/]/g, '_');
  if (s.length > 160) s = `${s.slice(0, 150)}….${ext}`;
  return s || `plik.${ext}`;
}

const UNREADABLE = 'Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie.';

const tooBig = (res) => {
  // połączenie zamykamy – reszty dużego żądania nie ma sensu czytać
  res.set('Connection', 'close');
  return res.status(413).json({ error: 'Załączniki są za duże – łącznie możesz wysłać do 25 MB.', field: 'files' });
};

const tooManyFields = (res) => {
  res.set('Connection', 'close');
  return res.status(400).json({ error: 'Formularz zawiera za dużo pól.' });
};

const limited = (res, status, seconds, error) => {
  res.set('Retry-After', String(seconds));
  return res.status(status).json({ error });
};

const fail = (res, errors) => {
  const [field, error] = Object.entries(errors)[0];
  return res.status(400).json({ error, field, fields: errors });
};

// Formularz chwilowo nieczynny (dobowy limit albo brak miejsca na dysku): klient dostaje e-mail i telefon firmy,
// a log serwera ostrzeżenie – najwyżej raz na godzinę, żeby zalew zgłoszeń nie zalał też logu.
const warnedAt = new Map();
function closed(res, type, reason) {
  const now = Date.now();
  if (now - (warnedAt.get(reason) || 0) > 60 * MINUTE) {
    warnedAt.set(reason, now);
    console.warn(
      reason === 'disk'
        ? `Formularz wyceny: mniej niż ${MIN_FREE_BYTES / MB} MB wolnego miejsca na dysku z data/ – zapytania są odrzucane.`
        : `Formularz wyceny: wyczerpany dobowy limit (${DAY_MAX} zapytań albo ${DAY_MAX_BYTES / MB} MB załączników) – zapytania są odrzucane.`,
    );
  }
  const email = type === 'b2b' ? COMPANY.emailB2B : COMPANY.email;
  return limited(res, 503, 3600, `Formularz chwilowo nie przyjmuje zapytań. Napisz do nas na ${email} albo zadzwoń: ${COMPANY.phone}.`);
}

// Widok dla panelu: bez nazw plików na dysku.
const view = (inq) => ({ ...inq, files: inq.files.map(({ stored, ...f }) => f) });

function inquiryDir(id) {
  const dir = path.join(DIR, id);
  if (path.dirname(dir) !== DIR) throw new Error('Nieprawidłowy identyfikator zapytania.');
  return dir;
}

function setMail(id, mail) {
  const inq = db.inquiries.find((x) => x.id === id);
  if (!inq) return; // zapytanie usunięte w trakcie wysyłki
  inq.mail = mail;
  save();
}

// E-mail wysyłamy po odpowiedzi dla klienta – wolny serwer SMTP nie wydłuża wysyłania formularza.
async function deliver(inq) {
  try {
    const info = await sendInquiryMail(inq, inquiryDir(inq.id));
    setMail(inq.id, { sent: true, at: nowIso(), messageId: info.messageId });
  } catch (err) {
    console.error(`Zapytanie ${inq.id}: e-mail nie wysłany – ${err.message}`);
    setMail(inq.id, { sent: false, error: String(err.message || err).slice(0, 300), at: nowIso() });
  }
}

// Odczyt, walidacja i zapis zgłoszenia – wołane, gdy klient ma już miejsce w limicie odczytów.
async function receive(req, res, ip, boundary) {
  let form;
  try {
    form = await readMultipart(req, boundary);
  } catch (err) {
    if (err instanceof BodyTooLarge) return tooBig(res);
    if (err instanceof TooManyParts) return tooManyFields(res);
    return res.status(400).json({ error: UNREADABLE });
  }

  // pola tekstowe (wartości list – tablice; plik podany w polu tekstowym jest ignorowany)
  const raw = {};
  let entries = 0;
  for (const [key, value] of form.entries()) {
    if (++entries > MAX_ENTRIES) return tooManyFields(res);
    if (typeof value !== 'string') continue;
    if (LIST_FIELDS.has(key)) (raw[key] ||= []).push(value);
    else if (!Object.hasOwn(raw, key)) raw[key] = value;
  }

  // pułapka na boty: ukryte pole wypełnione → udajemy sukces, nic nie zapisujemy
  if (String(raw.website || '').trim()) {
    sent.add(ip, Date.now());
    sentDay.add(ip, Date.now());
    console.warn('Formularz wyceny: zgłoszenie odrzucone po cichu (wypełnione ukryte pole).');
    return res.status(201).json({ ok: true, id: `${stamp()}-${crypto.randomBytes(4).toString('hex')}`, files: 0 });
  }
  const elapsed = Number(raw.elapsed);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return res.status(400).json({ error: 'Formularz został wysłany zbyt szybko. Odczekaj chwilę i spróbuj ponownie.' });
  }

  const data = normalizeInquiry({ ...raw, type: raw.typ });
  const errors = validateInquiry(data);

  // załączniki: pomijamy puste wpisy pola bez wybranego pliku
  const files = form.getAll('files').filter((f) => typeof f !== 'string' && (f.size > 0 || f.name));
  const size = files.reduce((sum, f) => sum + f.size, 0);
  if (files.length > FILE_LIMITS.count) errors.files = `Możesz dodać najwyżej ${FILE_LIMITS.count} plików.`;
  else {
    const problem = files.map((f) => fileProblem(f.name, f.size)).find(Boolean);
    if (problem) errors.files = problem;
    else if (size > FILE_LIMITS.total) errors.files = 'Łączny rozmiar załączników może wynosić najwyżej 25 MB.';
  }
  if (Object.keys(errors).length) return fail(res, errors);

  // dobowy limit całego formularza i wolne miejsce – po walidacji, gdy znamy już rozmiar załączników
  const day = lastDay(Date.now());
  if (day.count >= DAY_MAX || day.bytes + size > DAY_MAX_BYTES) return closed(res, data.type, 'limit');
  const free = await freeBytes();
  if (free !== null && free < size + MIN_FREE_BYTES) return closed(res, data.type, 'disk');

  const id = `${stamp()}-${crypto.randomBytes(4).toString('hex')}`;
  const dir = inquiryDir(id);
  const stored = [];
  try {
    if (files.length) await fs.promises.mkdir(dir, { recursive: true });
    for (const file of files) {
      const ext = fileExtension(file.name);
      const fileId = crypto.randomBytes(8).toString('hex');
      const storedName = `${fileId}.${ext}`;
      // strumieniem prosto z obiektu File – bez dodatkowej kopii całego pliku w pamięci
      await pipeline(Readable.fromWeb(file.stream()), fs.createWriteStream(path.join(dir, storedName), { flags: 'wx' }));
      stored.push({ id: fileId, name: displayName(file.name, ext), size: file.size, type: FILE_TYPES[ext], stored: storedName });
    }
  } catch (err) {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw err; // → 500 z globalnej obsługi błędów
  }

  const b2b = data.type === 'b2b';
  const inquiry = {
    id,
    createdAt: nowIso(),
    type: data.type,
    status: 'nowe',
    contact: { name: data.name, email: data.email, phone: data.phone, company: data.company, nip: data.nip, city: data.city },
    details: b2b
      ? {
          services: data.services,
          materialSource: data.materialSource,
          materialType: data.materialType,
          elements: data.elements,
          processing: data.processing,
          edging: data.edging,
          drilling: data.drilling,
          bending: data.bending,
          pickup: data.pickup,
        }
      : {
          furniture: data.furniture,
          project: data.project,
          dimensions: data.dimensions,
          materials: data.materials,
          equipment: data.equipment,
          equipmentOther: data.equipmentOther,
          transport: data.transport,
          assembly: data.assembly,
          deadline: data.deadline,
        },
    message: data.message,
    files: stored,
    mail: mailConfigured() ? { sent: false } : { sent: false, error: 'Brak konfiguracji SMTP' },
    note: '',
  };
  db.inquiries.push(inquiry);
  save();
  sent.add(ip, Date.now());
  sentDay.add(ip, Date.now());

  res.status(201).json({ ok: true, id, type: data.type, email: data.email, files: stored.length });

  if (mailConfigured()) deliver(inquiry);
  else console.log(`Zapytanie ${id} zapisane – e-mail nie wysłany (brak konfiguracji SMTP)`);
}

export function registerInquiryRoutes(app, { requireAuth, requireAdmin }) {
  app.post('/api/inquiries', async (req, res) => {
    if (foreignOrigin(req)) {
      return res.status(403).json({ error: 'Nie udało się potwierdzić, że formularz wysłano z naszej strony. Odśwież stronę i spróbuj ponownie.' });
    }
    const ip = clientKey(req);
    const now = Date.now();
    if (sent.count(ip, now) >= MAX_SENT || tries.count(ip, now) >= MAX_TRIES) {
      return limited(res, 429, 600, 'Wysłano zbyt wiele zapytań w krótkim czasie. Spróbuj ponownie za kilka minut.');
    }
    if (sentDay.count(ip, now) >= MAX_SENT_DAY) {
      const error = `Z tego adresu wysłano już ${MAX_SENT_DAY} zapytań w ciągu doby. Napisz do nas na ${COMPANY.email} albo spróbuj ponownie później.`;
      return limited(res, 429, sentDay.wait(ip, now), error);
    }
    const type = String(req.headers['content-type'] || '');
    if (!/^multipart\/form-data;/i.test(type)) {
      return res.status(415).json({ error: 'Nieprawidłowy format formularza. Odśwież stronę i spróbuj ponownie.' });
    }
    const boundary = boundaryOf(type);
    if (!boundary) return res.status(400).json({ error: UNREADABLE });
    if (Number(req.headers['content-length']) > MAX_BODY) return tooBig(res);
    // Jeden odczyt naraz z adresu (limity zgłoszeń liczą się wtedy dokładnie) i kilka na cały serwer (pamięć).
    if (busy.has(ip)) {
      return limited(res, 429, 30, 'Z tego adresu trwa już wysyłanie innego zapytania. Poczekaj, aż się zakończy, i spróbuj ponownie.');
    }
    if (busy.size >= MAX_PARSING) return limited(res, 503, 30, 'Serwer przyjmuje teraz kilka zapytań naraz. Spróbuj ponownie za chwilę.');
    if (lastDay(now).count >= DAY_MAX) return closed(res, '', 'limit');
    tries.add(ip, now);
    busy.add(ip);
    try {
      return await receive(req, res, ip, boundary);
    } finally {
      busy.delete(ip);
    }
  });

  // --- panel firmy ---------------------------------------------------------------------
  app.get('/api/admin/inquiries', requireAuth, requireAdmin, (_req, res) => {
    const list = [...db.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(view);
    res.json({ inquiries: list });
  });

  app.patch('/api/admin/inquiries/:id', requireAuth, requireAdmin, (req, res) => {
    const inq = db.inquiries.find((x) => x.id === req.params.id);
    if (!inq) return res.status(404).json({ error: 'Nie znaleziono zapytania.' });
    const { status, note } = req.body || {};
    if (status !== undefined && !Object.hasOwn(INQUIRY_STATUSES, status)) return res.status(400).json({ error: 'Nieprawidłowy status.' });
    if (note !== undefined && typeof note !== 'string') return res.status(400).json({ error: 'Nieprawidłowa notatka.' });
    const cleanNote = note === undefined ? undefined : cleanText(note);
    if (cleanNote !== undefined && cleanNote.length > NOTE_MAX) {
      return res.status(400).json({ error: `Notatka może mieć najwyżej ${NOTE_MAX} znaków.` });
    }
    if (status !== undefined) inq.status = status;
    if (cleanNote !== undefined) inq.note = cleanNote;
    inq.updatedAt = nowIso();
    save();
    res.json({ inquiry: view(inq) });
  });

  // usunięcie zapytania razem z załącznikami (np. na prośbę klienta – RODO)
  app.delete('/api/admin/inquiries/:id', requireAuth, requireAdmin, async (req, res) => {
    const inq = db.inquiries.find((x) => x.id === req.params.id);
    if (!inq) return res.status(404).json({ error: 'Nie znaleziono zapytania.' });
    await fs.promises.rm(inquiryDir(inq.id), { recursive: true, force: true });
    db.inquiries = db.inquiries.filter((x) => x.id !== inq.id);
    save();
    res.json({ ok: true });
  });

  // Pobranie załącznika. Panel loguje się tokenem w nagłówku (nie ciasteczkiem), więc front pobiera plik przez
  // fetch i zapisuje z blob URL. Zawsze jako załącznik + nosniff – plik od klienta nigdy nie otwiera się w kontekście strony.
  app.get('/api/admin/inquiries/:id/files/:fileId', requireAuth, requireAdmin, async (req, res) => {
    const inq = db.inquiries.find((x) => x.id === req.params.id);
    const file = inq?.files.find((f) => f.id === req.params.fileId);
    if (!file) return res.status(404).json({ error: 'Nie znaleziono pliku.' });
    const full = path.join(inquiryDir(inq.id), file.stored);
    if (path.dirname(full) !== inquiryDir(inq.id)) return res.status(404).json({ error: 'Nie znaleziono pliku.' });
    const stat = await fs.promises.stat(full).catch(() => null);
    if (!stat?.isFile()) return res.status(404).json({ error: 'Plik nie jest już dostępny na serwerze.' });
    res.attachment(file.name); // Content-Disposition z nazwą zakodowaną wg RFC 6266 (filename + filename*)
    res.set({
      'Content-Type': FILE_TYPES[fileExtension(file.stored)] || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    await pipeline(fs.createReadStream(full), res).catch(() => res.destroy());
  });
}
