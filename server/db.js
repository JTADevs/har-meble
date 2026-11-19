// Prosta baza w pliku JSON (wystarczy do prototypu; w produkcji: PostgreSQL).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_PRICING, uid } from '../shared/catalog.js';
import { COMPANY } from '../shared/site.js';
import { defaultKitchen } from '../shared/kitchen.js';
import { defaultWardrobe } from '../shared/wardrobe.js';
import { priceProject } from '../shared/pricing.js';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
const FILE = path.join(DATA_DIR, 'db.json');

export let db;

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(String(password), salt, 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

// Produkcja: pusta baza bez kont demo – konto panelu zakłada ensureAdminFromEnv() z ADMIN_EMAIL i ADMIN_PASSWORD.
function emptyDb() {
  return { users: [], sessions: {}, pricing: structuredClone(DEFAULT_PRICING), projects: [], inquiries: [] };
}

// Konto panelu firmy ze zmiennych środowiskowych (przy pierwszym starcie z danym adresem; hasło zmienia się
// potem w bazie – zmienna nie nadpisuje istniejącego konta).
function ensureAdminFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return false;
  if (password.length < 12) {
    console.warn('ADMIN_PASSWORD ma mniej niż 12 znaków – konto panelu nie zostało utworzone.');
    return false;
  }
  if (db.users.some((u) => u.email === email)) return false;
  db.users.push({ id: uid(), name: `${COMPANY.brand} (panel)`, email, phone: '', role: 'admin', password: hashPassword(password), createdAt: new Date().toISOString() });
  return true;
}

// Dane demo (tylko poza produkcją): konto stolarni, klient i dwa projekty.
function seed() {
  if (process.env.NODE_ENV === 'production') return emptyDb();
  const now = new Date().toISOString();
  const admin = { id: uid(), name: 'Stolarnia (admin)', email: 'admin@stolarnia.pl', phone: '', role: 'admin', password: hashPassword('admin123'), createdAt: now };
  const client = { id: uid(), name: 'Anna Kowalska', email: 'klient@demo.pl', phone: '600 100 200', role: 'client', password: hashPassword('demo123'), createdAt: now };
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

export function load() {
  let changed = false;
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } else {
    db = seed();
    changed = true;
  }
  if (!Array.isArray(db.inquiries)) {
    db.inquiries = []; // zapytania z formularza wyceny (baza sprzed wizytówki ich nie miała)
    changed = true;
  }
  if (ensureAdminFromEnv()) changed = true;
  if (changed) save();
  return db;
}
