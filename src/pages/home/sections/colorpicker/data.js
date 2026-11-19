// Dane sekcji „Twój kolor” – wspólne dla DOM (ColorPicker.jsx, główny plik strony) i sceny 3D
// (ColorStage.jsx, ładowanej leniwie). Celowo bez three.js, żeby nie powiększać głównego pliku JS.
import { DECORS, FRONTS } from '../../../../../shared/catalog.js';

// Kolejność = kolejność kolumn. woodFront – materiał frontu dla dekorów drewnianych (fronty ramowe da się
// zrobić tylko z drewna litego, ryflowane i gładkie – z forniru).
// link – klucz z LINKS w ui.jsx: trasa konfiguratora dostaje ?dekor=<id> (otwiera się w wybranym kolorze),
// 'kontakt' – kotwica formularza. cta – tekst linku, ctaHint – dopowiedzenie dla czytników ekranu.
export const COLOR_MODELS = [
  {
    id: 'kuchnia',
    name: 'Kuchnia',
    tag: 'Fronty ramowe',
    desc: 'Szafki dolne z blatem z dębu i szafka wisząca.',
    link: 'kuchnia',
    mebel: 'Kuchnia', // rodzaj w formularzu wyceny (FURNITURE_TYPES w shared/site.js)
    cta: 'Otwórz konfigurator',
    ctaHint: 'kuchni',
    decors: ['szalwia', 'zielen', 'granat', 'grafit', 'kaszmir', 'bialy', 'dab_naturalny', 'orzech'],
    initial: 'szalwia',
    woodFront: 'lite',
  },
  {
    id: 'szafa',
    name: 'Szafa',
    tag: 'Fronty ryflowane',
    desc: 'Wysoka, dwudrzwiowa, z czarnymi uchwytami.',
    link: 'szafa',
    mebel: 'Szafa',
    cta: 'Otwórz konfigurator',
    ctaHint: 'szafy',
    decors: ['bialy', 'dab_bielony', 'szary_jasny', 'grafit', 'roz', 'terakota', 'musztarda'],
    initial: 'dab_bielony',
    woodFront: 'fornir',
  },
  {
    id: 'komoda',
    name: 'Komoda',
    tag: 'Fronty gładkie',
    desc: 'Trzy szuflady na smukłych dębowych nóżkach.',
    // komody nie zbudujesz w konfiguratorze (szafy mają min. 180 cm wysokości) – projektujemy ją razem z klientem
    link: 'kontakt',
    mebel: 'Komoda, regał lub szafka RTV',
    cta: 'Zapytaj o komodę',
    ctaHint: 'na wymiar',
    decors: ['musztarda', 'terakota', 'roz', 'czarny', 'orzech', 'jesion', 'szalwia', 'bialy'],
    initial: 'musztarda',
    woodFront: 'fornir',
  },
];

// Dekory z teksturą (drewno) – zmiana na nie i z nich idzie przez „przysiad”, kolory przechodzą płynnie.
export const isWood = (id) => Boolean(DECORS[id]?.tex);

// Wykończenie jak w konfiguratorze: lakier MDF mat dla kolorów, olej dla drewna litego i forniru.
export const finishFor = (id) => (isWood(id) ? 'oil' : 'mat');

// Nazwa materiału frontu dla wybranego dekoru (z katalogu – te same nazwy co w konfiguratorze).
export function materialLabel(model, id) {
  return FRONTS[isWood(id) ? model.woodFront : 'mdf_mat'].name;
}

// Siła tła karty zabarwionego kolorem dekoru: jasne dekory mocniej, ciemne delikatniej (żeby tło nie szarzało).
export function tintAlpha(hex) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return (0.06 + 0.12 * l).toFixed(3);
}

// Obrót: miękki limit ±30° (tanh) – im dalej, tym większy opór, bez twardego zatrzymania.
export const DRAG_LIMIT = (30 * Math.PI) / 180;
export const softDrag = (raw) => DRAG_LIMIT * Math.tanh(raw / DRAG_LIMIT);
export const unsoftDrag = (v) => DRAG_LIMIT * Math.atanh(Math.max(-0.995, Math.min(0.995, v / DRAG_LIMIT)));
// Krok przycisków „Obróć w lewo / w prawo” (alternatywa dla przeciągania: klik, dotyk, klawiatura).
export const ROTATE_STEP = (15 * Math.PI) / 180;
// Sztywność powrotu do ustawionego kąta: po puszczeniu myszy – leniwie, po przycisku – sprawniej.
export const SPRING_DRAG = 2.2;
export const SPRING_BUTTON = 6;

// Zapas wysokości płótna 3D pod rzędem okien: na desktopie karty wjeżdżają od dołu o 36 px (colorpicker.css).
export const GL_EXTRA = 40;

// Zadania w wolnych chwilach przeglądarki (z zapasowym setTimeout, np. dla Safari).
export function idle(cb, timeout = 1500) {
  if (typeof window.requestIdleCallback === 'function') return window.requestIdleCallback(cb, { timeout });
  return window.setTimeout(cb, 48);
}

export function cancelIdle(handle) {
  if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle);
  else window.clearTimeout(handle);
}
