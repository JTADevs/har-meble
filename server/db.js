// Prosta baza w pliku JSON (wystarczy do prototypu; w produkcji: PostgreSQL).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { DEFAULT_PRICING, uid } from '../shared/catalog.js';
import { COMPANY, FEATURES } from '../shared/site.js';
import { defaultKitchen } from '../shared/kitchen.js';
import { defaultWardrobe } from '../shared/wardrobe.js';
import { priceProject } from '../shared/pricing.js';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
const FILE = path.join(DATA_DIR, 'db.json');

// Narzędzia deweloperskie (/api/dev/* – studio renderów, eksport filmu) i konta demo tylko na wyraźne życzenie:
// DEV_TOOLS=1 ustawia `npm run dev`. Samo zapomniane NODE_ENV=production na serwerze ich nie włącza.
export const DEV_TOOLS = process.env.NODE_ENV !== 'production' && /^(1|true)$/i.test(String(process.env.DEV_TOOLS || '').trim());
if (process.env.NODE_ENV === 'production' && process.env.DEV_TOOLS) console.warn('DEV_TOOLS jest ignorowane w produkcji.');

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // sesja panelu / konta ważna 14 dni od zalogowania
const TOKEN_RE = /^[0-9a-f]{64}$/;

// Konta demo z seeda – ich hasła są w README i w kodzie, więc w produkcji nie mogą działać.
const DEMO_PASSWORDS = { 'admin@stolarnia.pl': 'admin123', 'klient@demo.pl': 'demo123' };

export let db;

// scrypt asynchronicznie (pula wątków libuv) – liczenie hasha nie blokuje serwera na ok. 30 ms przy każdym logowaniu.
const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${(await scrypt(String(password), salt, 64)).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = await scrypt(String(password), salt, 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

// Sesja dla tokenu albo null. Format tokenu + Object.hasOwn: „constructor”, „__proto__” itp. nie są sesją.
export const sessionOf = (token) => (TOKEN_RE.test(String(token)) && Object.hasOwn(db.sessions, token) ? db.sessions[token] : null);

export const sessionExpired = (session, now = Date.now()) => !(Date.parse(session.expiresAt) > now);

// Usuwa sesje wygasłe, z błędnym tokenem i nieistniejących kont; starsze sesje (bez expiresAt) dostają 14 dni od
// utworzenia. Zwraca true, gdy coś zmieniło się w bazie.
export function pruneSessions(now = Date.now()) {
  let changed = false;
  for (const [token, s] of Object.entries(db.sessions)) {
    const exp = s?.expiresAt ? Date.parse(s.expiresAt) : Date.parse(s?.createdAt) + SESSION_TTL_MS;
    if (!TOKEN_RE.test(token) || !(exp > now) || !db.users.some((u) => u.id === s.userId)) {
      delete db.sessions[token];
      changed = true;
    } else if (!s.expiresAt) {
      s.expiresAt = new Date(exp).toISOString();
      changed = true;
    }
  }
  return changed;
}

const dropSessionsOf = (ids) => {
  for (const [token, s] of Object.entries(db.sessions)) if (ids.has(s?.userId)) delete db.sessions[token];
};

// Produkcja: pusta baza bez kont demo – konto panelu zakłada ensureAdminFromEnv() z ADMIN_EMAIL i ADMIN_PASSWORD.
function emptyDb() {
  return { users: [], sessions: {}, pricing: structuredClone(DEFAULT_PRICING), projects: [], inquiries: [] };
}

// Konto panelu firmy ze zmiennych środowiskowych – zmienne wygrywają z bazą przy każdym starcie: nowe ADMIN_PASSWORD
// zmienia hasło i wylogowuje sesje tego konta (np. po wycieku hasła wystarczy zmienić zmienną i zrestartować serwer).
async function ensureAdminFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return false;
  if (password.length < 12) {
    console.warn('ADMIN_PASSWORD ma mniej niż 12 znaków – konto panelu nie zostało utworzone ani zmienione.');
    return false;
  }
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    db.users.push({ id: uid(), name: `${COMPANY.brand} (panel)`, email, phone: '', role: 'admin', password: await hashPassword(password), createdAt: new Date().toISOString() });
    return true;
  }
  if (user.role === 'admin' && (await verifyPassword(password, user.password))) return false;
  user.role = 'admin';
  user.password = await hashPassword(password);
  dropSessionsOf(new Set([user.id]));
  console.log(`Konto panelu ${email}: hasło ustawione z ADMIN_PASSWORD, dotychczasowe sesje wylogowane.`);
  return true;
}

// Produkcja: konta demo, które wciąż mają hasło z README (baza skopiowana z komputera deweloperskiego albo pierwszy
// start bez NODE_ENV), usuwamy razem z ich sesjami i projektami.
async function removeDemoAccounts() {
  const ids = new Set();
  for (const u of db.users) {
    if (Object.hasOwn(DEMO_PASSWORDS, u.email) && (await verifyPassword(DEMO_PASSWORDS[u.email], u.password))) ids.add(u.id);
  }
  if (!ids.size) return false;
  const emails = db.users.filter((u) => ids.has(u.id)).map((u) => u.email);
  db.users = db.users.filter((u) => !ids.has(u.id));
  db.projects = db.projects.filter((p) => !ids.has(p.userId));
  dropSessionsOf(ids);
  console.warn(`Usunięto konta demo z bazy produkcyjnej: ${emails.join(', ')}. Nie kopiuj katalogu data/ z komputera deweloperskiego.`);
  return true;
}

// Dane demo (tylko `npm run dev`): konto stolarni, a w trybie z kontami klientów (pelna) także klient i dwa projekty.
async function seed() {
  if (!DEV_TOOLS) return emptyDb();
  const now = new Date().toISOString();
  const admin = { id: uid(), name: 'Stolarnia (admin)', email: 'admin@stolarnia.pl', phone: '', role: 'admin', password: await hashPassword(DEMO_PASSWORDS['admin@stolarnia.pl']), createdAt: now };
  if (!FEATURES.accounts) return { ...emptyDb(), users: [admin] };
  const client = { id: uid(), name: 'Anna Kowalska', email: 'klient@demo.pl', phone: '600 100 200', role: 'client', password: await hashPassword(DEMO_PASSWORDS['klient@demo.pl']), createdAt: now };
  const kitchen = defaultKitchen();
  const wardrobe = defaultWardrobe();
  const priced = (type, config) => {
    const t = priceProject(type, config, DEFAULT_PRICING).totals;
    return { net: t.net, vat: t.vat, gross: t.gross, cost: t.cost };
  };
  return {
    users: [admin, client],
    sessions: {},
    pricing: structuredClone(DEFAULT_PRICING),
    inquiries: [],
    projects: [
      {
        id: uid(),
        userId: client.id,
        type: 'kuchnia',
        name: 'Kuchnia – mieszkanie Mokotów',
        config: kitchen,
        price: priced('kuchnia', kitchen),
        status: 'wyslane',
        clientMessage: 'Dzień dobry, proszę o wycenę i termin pomiaru. Najlepiej popołudniami.',
        contactPhone: client.phone,
        adminNote: '',
        offerPrice: null,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
      },
      {
        id: uid(),
        userId: client.id,
        type: 'szafa',
        name: 'Szafa do sypialni',
        config: wardrobe,
        price: priced('szafa', wardrobe),
        status: 'szkic',
        clientMessage: '',
        adminNote: '',
        offerPrice: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export async function load() {
  let changed = false;
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } else {
    db = await seed();
    changed = true;
  }
  if (!Array.isArray(db.inquiries)) {
    db.inquiries = []; // zapytania z formularza wyceny (baza sprzed wizytówki ich nie miała)
    changed = true;
  }
  if (!db.sessions || typeof db.sessions !== 'object') {
    db.sessions = {};
    changed = true;
  }
  if (process.env.NODE_ENV === 'production' && (await removeDemoAccounts())) changed = true;
  if (await ensureAdminFromEnv()) changed = true;
  if (pruneSessions()) changed = true;
  if (changed) save();
  return db;
}
