import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { DEV_TOOLS, SESSION_TTL_MS, db, hashPassword, load, pruneSessions, save, sessionExpired, sessionOf, verifyPassword } from './db.js';
import { DEFAULT_PRICING, STATUSES, normalizePricing, pricingForClient, uid } from '../shared/catalog.js';
import { priceProject, sanitizeProjectConfig } from '../shared/pricing.js';
import { FEATURES } from '../shared/site.js';
import { clientKey, registerInquiryRoutes, windowCounter } from './inquiries.js';

await load();
const app = express();

// Za reverse proxy (nginx, hosting) req.ip to adres proxy – TRUST_PROXY każe brać adres klienta z X-Forwarded-For
// (limity formularza wyceny i logowania liczone na IP). Wartości: liczba proxy przed serwerem (1 – nginx,
// 2 – Cloudflare + nginx), 'loopback' albo lista adresów/CIDR; brak, false, 0, no, off – wyłączone. 'true' odrzucamy:
// Express wziąłby wtedy pierwszy adres z X-Forwarded-For, który wpisuje sam klient (każde żądanie – nowe „IP”).
const trustProxy = String(process.env.TRUST_PROXY ?? '').trim();
if (trustProxy && !/^(false|0|no|off)$/i.test(trustProxy)) {
  let value = /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy;
  if (/^(true|yes|on)$/i.test(trustProxy)) {
    console.error(`TRUST_PROXY=${trustProxy} ufałoby X-Forwarded-For od każdego klienta – używam 'loopback'. Podaj liczbę proxy (np. 1) albo ich adresy.`);
    value = 'loopback';
  }
  try {
    app.set('trust proxy', value);
  } catch (err) {
    console.error(`TRUST_PROXY=${trustProxy}: nieprawidłowa wartość (${err.message}) – używam 'loopback'.`);
    app.set('trust proxy', 'loopback');
  }
} else if (!trustProxy && process.env.NODE_ENV === 'production') {
  // Bez TRUST_PROXY za proxy wszyscy klienci mają adres proxy i dzielą jeden limit – ostrzeżenie raz, przy pierwszym
  // żądaniu z nagłówkiem proxy (jawne TRUST_PROXY=0 je wyłącza).
  let warned = false;
  app.use((req, _res, next) => {
    if (!warned && (req.headers['x-forwarded-for'] || req.headers.forwarded)) {
      warned = true;
      console.warn('Żądania przychodzą przez proxy (X-Forwarded-For), a TRUST_PROXY nie jest ustawione – limity formularza i logowania liczą wszystkich klientów jako jeden adres. Ustaw TRUST_PROXY (np. 1).');
    }
    next();
  });
}

// Tylko `npm run dev` (DEV_TOOLS=1, nigdy w produkcji): zapis renderów ze studia (/studio) do public/renders i eksport
// filmu. Rejestrowane przed globalnym parserem JSON, bo obrazy są większe niż jego limit.
if (DEV_TOOLS) {
  // Tylko bezpośrednie połączenia z tego komputera, sprawdzane przed odczytem treści. Za reverse proxy na tym samym
  // hoście adres gniazda to też 127.0.0.1, ale proxy dokleja wtedy nagłówki z adresem klienta.
  const localOnly = (req, res, next) =>
    /^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '') &&
    !req.headers['x-forwarded-for'] &&
    !req.headers.forwarded &&
    !req.headers['x-real-ip']
      ? next()
      : res.status(403).json({ error: 'Tylko localhost.' });

  const rendersDir = path.resolve(import.meta.dirname, '../public/renders');
  app.post('/api/dev/render', localOnly, express.json({ limit: '40mb' }), (req, res) => {
    const name = String(req.body?.name || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
    const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
    if (!name || !m) return res.status(400).json({ error: 'Nieprawidłowe dane.' });
    fs.mkdirSync(rendersDir, { recursive: true });
    const file = path.join(rendersDir, `${name}.${m[1] === 'jpeg' ? 'jpg' : 'png'}`);
    fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
    res.json({ ok: true, file: path.relative(process.cwd(), file) });
  });

  // Eksport filmu z hero (/studio/film): surowe klatki RGBA z przeglądarki idą prosto do ffmpeg (bez plików pośrednich).
  const exportsDir = path.resolve(import.meta.dirname, '../exports');
  let rec = null; // { proc, file, w, h, frames, log, closed }

  app.post('/api/dev/film/start', localOnly, express.json(), (req, res) => {
    const name = String(req.body?.name || '').replace(/[^a-z0-9-]/g, '').slice(0, 60);
    const even = (v) => Math.round(Math.min(4096, Math.max(16, Number(v) || 0)) / 2) * 2;
    const w = even(req.body?.width);
    const h = even(req.body?.height);
    const fps = Math.min(120, Math.max(1, Math.round(Number(req.body?.fps) || 30)));
    if (!name) return res.status(400).json({ error: 'Brak nazwy.' });
    // wznowienie po przeładowaniu karty: ten sam eksport dalej żyje – strona kontynuuje od rec.frames
    if (req.body?.resume && rec && !rec.dead && rec.name === name && rec.w === w && rec.h === h && rec.fps === fps) {
      return res.json({ ok: true, file: path.relative(process.cwd(), rec.file), frames: rec.frames, resumed: true });
    }
    if (rec) rec.proc.kill('SIGKILL');
    fs.mkdirSync(exportsDir, { recursive: true });
    const file = path.join(exportsDir, `${name}.mp4`);
    const args = [
      '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-r', String(fps), '-i', 'pipe:0',
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', file,
    ];
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    const r = { proc, name, file, w, h, fps, frames: 0, log: '', dead: false, at: Date.now() };
    r.closed = new Promise((resolve) => proc.on('close', resolve));
    r.closed.then(() => (r.dead = true));
    proc.on('error', (e) => (r.log += `\n${e.message}`));
    proc.stderr.on('data', (d) => (r.log = (r.log + d).slice(-4000)));
    proc.stdin.on('error', () => {}); // ffmpeg zakończony – błąd zgłosi /end
    rec = r;
    res.json({ ok: true, file: path.relative(process.cwd(), file), frames: 0 });
  });

  // ?i= – numer klatki: duplikat (np. ponowione żądanie) jest pomijany, dziura w numeracji odrzucana
  app.post('/api/dev/film/frame', localOnly, express.raw({ type: 'application/octet-stream', limit: '80mb' }), (req, res) => {
    const r = rec;
    if (!r || r.dead) return res.status(409).json({ error: 'Eksport nie jest uruchomiony.' });
    if (!Buffer.isBuffer(req.body) || req.body.length !== r.w * r.h * 4) return res.status(400).json({ error: 'Zły rozmiar klatki.' });
    const i = Number(req.query.i);
    if (Number.isInteger(i) && i < r.frames) return res.json({ ok: true, frames: r.frames, skipped: true });
    if (Number.isInteger(i) && i > r.frames) return res.status(409).json({ error: `Oczekiwana klatka ${r.frames}, przyszła ${i}.`, frames: r.frames });
    r.frames += 1;
    r.at = Date.now();
    const done = () => res.json({ ok: true, frames: r.frames });
    if (r.proc.stdin.write(req.body)) done();
    else r.proc.stdin.once('drain', done);
  });

  app.get('/api/dev/film/status', localOnly, (_req, res) => {
    res.json(rec ? { active: !rec.dead, name: rec.name, frames: rec.frames, idleMs: Date.now() - rec.at } : { active: false });
  });

  app.post('/api/dev/film/end', localOnly, async (_req, res) => {
    const r = rec;
    if (!r) return res.status(409).json({ error: 'Eksport nie jest uruchomiony.' });
    r.proc.stdin.end();
    const code = await r.closed;
    rec = null;
    res.json({ ok: code === 0, frames: r.frames, file: path.relative(process.cwd(), r.file), log: code === 0 ? undefined : r.log });
  });
}

app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT) || 3001;
const nowIso = () => new Date().toISOString();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

// --- uwierzytelnianie ---------------------------------------------------------
app.use((req, _res, next) => {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  let session = sessionOf(token);
  if (session && sessionExpired(session)) {
    delete db.sessions[token];
    save();
    session = null;
  }
  const user = session ? db.users.find((u) => u.id === session.userId) : null;
  // wizytówka nie ma kont klientów – sesja klienta (np. sprzed przełączenia z trybu pelna) nie loguje
  req.user = user && (FEATURES.accounts || user.role === 'admin') ? user : null;
  req.token = token;
  next();
});

const requireAuth = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Zaloguj się, aby kontynuować.' }));
const requireAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Brak uprawnień.' }));

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  pruneSessions(now); // wygasłe sesje sprzątamy przy okazji logowania (bez timera)
  db.sessions[token] = { userId, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_TTL_MS).toISOString() };
  return token;
}

app.post('/api/auth/register', async (req, res) => {
  // wizytówka (etap 1) nie ma kont klientów – jedyne konto to panel firmy (ADMIN_EMAIL / seed demo)
  if (!FEATURES.accounts) return res.status(403).json({ error: 'Rejestracja kont jest wyłączona.' });
  const { name, email, password, phone } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !/^\S+@\S+\.\S+$/.test(em) || String(password || '').length < 6) {
    return res.status(400).json({ error: 'Podaj imię, poprawny e-mail i hasło (min. 6 znaków).' });
  }
  const taken = () => db.users.some((u) => u.email === em);
  if (taken()) return res.status(409).json({ error: 'Konto z tym adresem e-mail już istnieje.' });
  const hash = await hashPassword(password);
  // równoległe żądanie mogło założyć to konto w trakcie liczenia hasha
  if (taken()) return res.status(409).json({ error: 'Konto z tym adresem e-mail już istnieje.' });
  const user = {
    id: uid(),
    name: String(name).trim().slice(0, 80),
    email: em,
    phone: String(phone || '').slice(0, 30),
    role: 'client',
    password: hash,
    createdAt: nowIso(),
  };
  db.users.push(user);
  const token = createSession(user.id);
  save();
  res.json({ token, user: publicUser(user) });
});

// Limity nieudanych logowań w 15 minut: z jednego adresu i na jeden e-mail. Próbę liczymy z góry, zanim policzy się
// hash (inaczej równoległe żądania przeszłyby wszystkie przed zapisaniem pierwszej porażki), a udaną cofamy.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_IP = 20;
const LOGIN_MAX_PER_EMAIL = 10;
const loginFailsByIp = windowCounter(LOGIN_WINDOW_MS);
const loginFailsByEmail = windowCounter(LOGIN_WINDOW_MS);
// Hash do porównania, gdy konta nie ma – odpowiedź trwa tyle samo, więc czas nie zdradza, który e-mail ma konto.
const DUMMY_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const em = String(email || '').trim().toLowerCase();
  const ip = clientKey(req);
  const emailKey = em.slice(0, 254); // klucz licznika – bez megabajtowych „adresów” w pamięci
  const now = Date.now();
  const wait = Math.max(
    loginFailsByIp.count(ip, now) >= LOGIN_MAX_PER_IP ? loginFailsByIp.wait(ip, now) : 0,
    loginFailsByEmail.count(emailKey, now) >= LOGIN_MAX_PER_EMAIL ? loginFailsByEmail.wait(emailKey, now) : 0,
  );
  if (wait) {
    res.set('Retry-After', String(wait));
    return res.status(429).json({ error: 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za kilka minut.' });
  }
  loginFailsByIp.add(ip, now);
  loginFailsByEmail.add(emailKey, now);
  const user = db.users.find((u) => u.email === em);
  const ok = await verifyPassword(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
  loginFailsByIp.undo(ip);
  loginFailsByEmail.undo(emailKey);
  // wizytówka nie ma kont klientów – loguje się tylko panel firmy (bez zakładania sesji klienta)
  if (!FEATURES.accounts && user.role !== 'admin') return res.status(403).json({ error: 'Logowanie klientów jest wyłączone.' });
  const token = createSession(user.id);
  save();
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/logout', (req, res) => {
  if (sessionOf(req.token)) {
    delete db.sessions[req.token];
    save();
  }
  res.json({ ok: true });
});

// --- cennik -------------------------------------------------------------------
// Klient dostaje ceny z wliczoną marżą (bez kosztów stolarni), admin – pełny cennik.
app.get('/api/pricing', (req, res) => {
  const pricing = req.user?.role === 'admin' ? normalizePricing(db.pricing) : pricingForClient(db.pricing);
  res.json({ pricing });
});

app.put('/api/pricing', requireAuth, requireAdmin, (req, res) => {
  db.pricing = normalizePricing(req.body?.pricing);
  save();
  res.json({ pricing: db.pricing });
});

app.post('/api/pricing/reset', requireAuth, requireAdmin, (_req, res) => {
  db.pricing = structuredClone(DEFAULT_PRICING);
  save();
  res.json({ pricing: db.pricing });
});

// --- projekty klienta ----------------------------------------------------------
function computePrice(type, config) {
  const t = priceProject(type, config, db.pricing).totals;
  return { net: t.net, vat: t.vat, gross: t.gross, cost: t.cost };
}

function projectView(p, viewer) {
  const owner = db.users.find((u) => u.id === p.userId);
  const out = structuredClone({ ...p, owner: owner ? publicUser(owner) : null });
  if (viewer?.role !== 'admin') delete out.price.cost;
  return out;
}

function findOwned(req, res) {
  const p = db.projects.find((x) => x.id === req.params.id);
  if (!p || (p.userId !== req.user.id && req.user.role !== 'admin')) {
    res.status(404).json({ error: 'Nie znaleziono projektu.' });
    return null;
  }
  return p;
}

app.get('/api/projects', requireAuth, (req, res) => {
  const list = db.projects
    .filter((p) => p.userId === req.user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => projectView(p, req.user));
  res.json({ projects: list });
});

app.get('/api/projects/:id', requireAuth, (req, res) => {
  const p = findOwned(req, res);
  if (p) res.json({ project: projectView(p, req.user) });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const type = req.body?.type === 'szafa' ? 'szafa' : 'kuchnia';
  const config = sanitizeProjectConfig(type, req.body?.config);
  const p = {
    id: uid(),
    userId: req.user.id,
    type,
    name: String(req.body?.name || (type === 'szafa' ? 'Moja szafa' : 'Moja kuchnia')).slice(0, 100),
    config,
    price: computePrice(type, config),
    status: 'szkic',
    clientMessage: '',
    adminNote: '',
    offerPrice: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.projects.push(p);
  save();
  res.status(201).json({ project: projectView(p, req.user) });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const p = findOwned(req, res);
  if (!p) return;
  if (p.userId !== req.user.id) return res.status(403).json({ error: 'Możesz edytować tylko własne projekty.' });
  if (p.status !== 'szkic') return res.status(409).json({ error: 'Projekt został już wysłany – utwórz kopię, aby wprowadzić zmiany.' });
  if (req.body?.config) p.config = sanitizeProjectConfig(p.type, req.body.config);
  if (req.body?.name) p.name = String(req.body.name).slice(0, 100);
  p.price = computePrice(p.type, p.config);
  p.updatedAt = nowIso();
  save();
  res.json({ project: projectView(p, req.user) });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const p = findOwned(req, res);
  if (!p) return;
  db.projects = db.projects.filter((x) => x.id !== p.id);
  save();
  res.json({ ok: true });
});

app.post('/api/projects/:id/submit', requireAuth, (req, res) => {
  const p = findOwned(req, res);
  if (!p) return;
  if (p.userId !== req.user.id) return res.status(403).json({ error: 'To nie jest Twój projekt.' });
  if (p.status !== 'szkic') return res.status(409).json({ error: 'Ten projekt został już wysłany.' });
  p.status = 'wyslane';
  p.clientMessage = String(req.body?.message || '').slice(0, 2000);
  p.contactPhone = String(req.body?.phone || req.user.phone || '').slice(0, 30);
  p.price = computePrice(p.type, p.config);
  p.submittedAt = nowIso();
  p.updatedAt = nowIso();
  save();
  res.json({ project: projectView(p, req.user) });
});

// --- panel stolarni -----------------------------------------------------------
app.get('/api/admin/projects', requireAuth, requireAdmin, (req, res) => {
  const all = req.query.all === '1';
  const list = db.projects
    .filter((p) => all || p.status !== 'szkic')
    .sort((a, b) => (b.submittedAt || b.updatedAt).localeCompare(a.submittedAt || a.updatedAt))
    .map((p) => projectView(p, req.user));
  res.json({ projects: list, clients: db.users.filter((u) => u.role === 'client').length });
});

app.patch('/api/admin/projects/:id', requireAuth, requireAdmin, (req, res) => {
  const p = db.projects.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Nie znaleziono projektu.' });
  const { status, adminNote, offerPrice } = req.body || {};
  if (status !== undefined) {
    if (!Object.hasOwn(STATUSES, status)) return res.status(400).json({ error: 'Nieprawidłowy status.' });
    p.status = status;
  }
  if (adminNote !== undefined) p.adminNote = String(adminNote).slice(0, 2000);
  if (offerPrice !== undefined) {
    const n = Number(offerPrice);
    p.offerPrice = offerPrice === null || offerPrice === '' || !Number.isFinite(n) || n <= 0 ? null : Math.round(n * 100) / 100;
  }
  p.updatedAt = nowIso();
  save();
  res.json({ project: projectView(p, req.user) });
});

// --- formularz wyceny (/wycena): zapytania, załączniki, e-mail, panel ------------
registerInquiryRoutes(app, { requireAuth, requireAdmin });

app.use('/api', (_req, res) => res.status(404).json({ error: 'Nie ma takiego zasobu.' }));

// W trybie produkcyjnym serwer podaje też zbudowany frontend.
const dist = path.resolve(import.meta.dirname, '../dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist));
  // Brakujący plik zbudowanej aplikacji (np. chunk ze starej wersji po nowym wdrożeniu) to 404, nie index.html –
  // import takiego modułu kończy się wtedy czytelnym błędem, który obsługuje granica błędów tras w App.jsx.
  app.use('/assets', (_req, res) => res.status(404).type('text/plain').send('Nie ma takiego pliku.'));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Błąd serwera.' });
});

app.listen(PORT, () => console.log(`API stolarni działa na http://localhost:${PORT}`));
