// Formularz wyceny – API: POST /api/inquiries (multipart: pola + załączniki) i endpointy panelu firmy.
// Multipart bez dodatkowych zależności: parser FormData wbudowany w Node (undici). Trzyma całe żądanie w pamięci,
// dlatego rozmiar sprawdzamy przed parsowaniem (Content-Length) i w trakcie (licznik bajtów strumienia).
// Pliki: data/inquiries/<id zapytania>/<losowe id>.<rozszerzenie z listy> – katalog data/ nie jest serwowany publicznie.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { db, save } from './db.js';
import { mailConfigured, sendInquiryMail } from './mailer.js';
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

const DIR = path.resolve(import.meta.dirname, '../data/inquiries');
const MAX_BODY = FILE_LIMITS.total + 2 * 1024 * 1024; // załączniki + pola tekstowe i narzut multipart (ok. 27 MB)
const MAX_ENTRIES = 300; // pól w jednym formularzu jest kilkadziesiąt – więcej to nie nasz formularz
const LIST_FIELDS = new Set(['furniture', 'equipment', 'services']);
const NOTE_MAX = 2000;

const nowIso = () => new Date().toISOString();
const stamp = () => new Date().toISOString().slice(0, 10).replaceAll('-', '');

// --- limit zgłoszeń na IP (w pamięci procesu; po restarcie liczniki od zera) ----------------
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SENT = 5; // przyjętych zgłoszeń w oknie (w tym odrzuconych po cichu jako spam)
const MAX_TRIES = 15; // wszystkich prób – chroni parser przed zasypywaniem błędnymi żądaniami
const sent = new Map();
const tries = new Map();

function recent(map, key, now) {
  const list = (map.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length) map.set(key, list);
  else map.delete(key);
  return list;
}

function remember(map, key, now) {
  map.set(key, [...recent(map, key, now), now]);
  // stare wpisy innych adresów sprzątamy przy okazji (bez timera)
  if (map.size > 2000) for (const k of [...map.keys()]) recent(map, k, now);
}

// --- odczyt multipart -------------------------------------------------------------------
class BodyTooLarge extends Error {}

async function readMultipart(req) {
  let seen = 0;
  const guard = new Transform({
    transform(chunk, _enc, cb) {
      seen += chunk.length;
      if (seen > MAX_BODY) cb(new BodyTooLarge());
      else cb(null, chunk);
    },
  });
  req.on('error', (err) => guard.destroy(err));
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
    throw err;
  }
}

// Nazwa do wyświetlenia (panel, e-mail, pobieranie): bez znaków sterujących i ukośników, rozszerzenie zostaje.
function displayName(name, ext) {
  let s = cleanLine(name).replace(/[\\/]/g, '_');
  if (s.length > 160) s = `${s.slice(0, 150)}….${ext}`;
  return s || `plik.${ext}`;
}

const tooBig = (res) => {
  // połączenie zamykamy – reszty dużego żądania nie ma sensu czytać
  res.set('Connection', 'close');
  return res.status(413).json({ error: 'Załączniki są za duże\u00a0– łącznie możesz wysłać do 25 MB.', field: 'files' });
};

const fail = (res, errors) => {
  const [field, error] = Object.entries(errors)[0];
  return res.status(400).json({ error, field, fields: errors });
};

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

export function registerInquiryRoutes(app, { requireAuth, requireAdmin }) {
  app.post('/api/inquiries', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    const now = Date.now();
    if (recent(sent, ip, now).length >= MAX_SENT || recent(tries, ip, now).length >= MAX_TRIES) {
      res.set('Retry-After', '600');
      return res.status(429).json({ error: 'Wysłano zbyt wiele zapytań w\u00a0krótkim czasie. Spróbuj ponownie za kilka minut.' });
    }
    if (!/^multipart\/form-data;/i.test(req.headers['content-type'] || '')) {
      return res.status(415).json({ error: 'Nieprawidłowy format formularza. Odśwież stronę i\u00a0spróbuj ponownie.' });
    }
    if (Number(req.headers['content-length']) > MAX_BODY) return tooBig(res);
    remember(tries, ip, now);

    let form;
    try {
      form = await readMultipart(req);
    } catch (err) {
      if (err instanceof BodyTooLarge) return tooBig(res);
      return res.status(400).json({ error: 'Nie udało się odczytać formularza. Odśwież stronę i\u00a0spróbuj ponownie.' });
    }

    // pola tekstowe (wartości list – tablice; plik podany w polu tekstowym jest ignorowany)
    const raw = {};
    let entries = 0;
    for (const [key, value] of form.entries()) {
      if (++entries > MAX_ENTRIES) return res.status(400).json({ error: 'Formularz zawiera za dużo pól.' });
      if (typeof value !== 'string') continue;
      if (LIST_FIELDS.has(key)) (raw[key] ||= []).push(value);
      else if (!Object.hasOwn(raw, key)) raw[key] = value;
    }

    // pułapka na boty: ukryte pole wypełnione → udajemy sukces, nic nie zapisujemy
    if (String(raw.website || '').trim()) {
      remember(sent, ip, now);
      console.warn('Formularz wyceny: zgłoszenie odrzucone po cichu (wypełnione ukryte pole).');
      return res.status(201).json({ ok: true, id: `${stamp()}-${crypto.randomBytes(4).toString('hex')}`, files: 0 });
    }
    const elapsed = Number(raw.elapsed);
    if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
      return res.status(400).json({ error: 'Formularz został wysłany zbyt szybko. Odczekaj chwilę i\u00a0spróbuj ponownie.' });
    }

    const data = normalizeInquiry({ ...raw, type: raw.typ });
    const errors = validateInquiry(data);

    // załączniki: pomijamy puste wpisy pola bez wybranego pliku
    const files = form.getAll('files').filter((f) => typeof f !== 'string' && (f.size > 0 || f.name));
    if (files.length > FILE_LIMITS.count) errors.files = `Możesz dodać najwyżej ${FILE_LIMITS.count} plików.`;
    else {
      const problem = files.map((f) => fileProblem(f.name, f.size)).find(Boolean);
      if (problem) errors.files = problem;
      else if (files.reduce((sum, f) => sum + f.size, 0) > FILE_LIMITS.total) {
        errors.files = 'Łączny rozmiar załączników może wynosić najwyżej 25 MB.';
      }
    }
    if (Object.keys(errors).length) return fail(res, errors);

    const id = `${stamp()}-${crypto.randomBytes(4).toString('hex')}`;
    const dir = inquiryDir(id);
    const stored = [];
    try {
      if (files.length) await fs.promises.mkdir(dir, { recursive: true });
      for (const file of files) {
        const ext = fileExtension(file.name);
        const fileId = crypto.randomBytes(8).toString('hex');
        const storedName = `${fileId}.${ext}`;
        await fs.promises.writeFile(path.join(dir, storedName), Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
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
    remember(sent, ip, now);

    res.status(201).json({ ok: true, id, type: data.type, email: data.email, files: stored.length });

    if (mailConfigured()) deliver(inquiry);
    else console.log(`Zapytanie ${id} zapisane – e-mail nie wysłany (brak konfiguracji SMTP)`);
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
