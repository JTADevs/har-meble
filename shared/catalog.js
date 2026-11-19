// Katalog: materiały, typy szafek, domyślny cennik.
// Plik współdzielony przez frontend (Vite) i backend (Node) – jedno źródło prawdy.

export const T = 1.8; // grubość płyty [cm]
export const GAP = 0.3; // szczelina między frontami [cm]
export const FT = 1.8; // grubość frontu [cm]

export const DIM = {
  plinth: 10, // wysokość cokołu
  base: { height: 72, depth: 56 },
  wall: { height: 72, depth: 32, bottom: 145 },
  tall: { height: 207, depth: 56 },
  countertopDepth: 62,
  roomHeight: 260,
};

export const MODULES = {
  dolna_drzwi: { name: 'Szafka dolna z drzwiami', row: 'base', widths: [30, 40, 45, 50, 60, 80, 90], defaultWidth: 60 },
  dolna_szuflady: { name: 'Szafka dolna z 3 szufladami', row: 'base', widths: [40, 45, 50, 60, 80, 90], defaultWidth: 60 },
  zlewowa: { name: 'Szafka zlewozmywakowa', row: 'base', widths: [60, 80, 90], defaultWidth: 80 },
  piekarnik: { name: 'Szafka pod piekarnik + płyta grzewcza', row: 'base', widths: [60], defaultWidth: 60 },
  zmywarka: { name: 'Zmywarka do zabudowy (front)', row: 'base', widths: [45, 60], defaultWidth: 60 },
  gorna_drzwi: { name: 'Szafka górna z drzwiami', row: 'wall', widths: [30, 40, 45, 50, 60, 80, 90], defaultWidth: 60 },
  gorna_otwarta: { name: 'Szafka górna otwarta', row: 'wall', widths: [30, 40, 60, 80], defaultWidth: 40 },
  slupek_lodowka: { name: 'Słupek na lodówkę do zabudowy', row: 'tall', widths: [60], defaultWidth: 60 },
  slupek_ag: { name: 'Słupek na piekarnik i mikrofalę', row: 'tall', widths: [60], defaultWidth: 60 },
  slupek_spizarnia: { name: 'Słupek spiżarniany', row: 'tall', widths: [40, 50, 60], defaultWidth: 60 },
};

export const ROW_LABELS = { base: 'Szafki dolne', wall: 'Szafki górne', tall: 'Słupki (wysokie)' };

// --- Dekory -------------------------------------------------------------------
// code: kod dekoru. W produkcji wpisuje się tu kody z katalogu hurtowni płyt, z której kupuje stolarnia.
// tex: parametry proceduralnej tekstury (generowanej w przeglądarce, bez plików graficznych).
export const DECOR_GROUPS = { kolor: 'Kolory', drewno: 'Drewno', kamien: 'Kamień i beton' };

export const DECORS = {
  bialy: { code: 'K01', name: 'Biały', group: 'kolor', hex: '#f3f2ee' },
  kosc: { code: 'K02', name: 'Kość słoniowa', group: 'kolor', hex: '#ece5d6' },
  kaszmir: { code: 'K03', name: 'Kaszmir', group: 'kolor', hex: '#d8cbb8' },
  szary_jasny: { code: 'K04', name: 'Szary jasny', group: 'kolor', hex: '#c8c8c4' },
  szalwia: { code: 'K05', name: 'Szałwia', group: 'kolor', hex: '#9dab95' },
  zielen: { code: 'K06', name: 'Zieleń butelkowa', group: 'kolor', hex: '#2f4a3b' },
  granat: { code: 'K07', name: 'Granat', group: 'kolor', hex: '#27344a' },
  grafit: { code: 'K08', name: 'Grafit', group: 'kolor', hex: '#46494e' },
  czarny: { code: 'K09', name: 'Czarny mat', group: 'kolor', hex: '#1e1e1f' },
  roz: { code: 'K10', name: 'Róż pudrowy', group: 'kolor', hex: '#d9aea6' },
  musztarda: { code: 'K11', name: 'Musztarda', group: 'kolor', hex: '#d2a13c' },
  terakota: { code: 'K12', name: 'Terakota', group: 'kolor', hex: '#b5633e' },
  dab_naturalny: { code: 'D01', name: 'Dąb naturalny', group: 'drewno', hex: '#c69c6d', tex: { kind: 'wood', base: '#c99f70', dark: '#8b5c33', light: '#e4c79f', cathedral: 0.7, pores: 0.8 } },
  dab_bielony: { code: 'D02', name: 'Dąb bielony', group: 'drewno', hex: '#ddd1be', tex: { kind: 'wood', base: '#e0d5c3', dark: '#a6927a', light: '#f5efe4', cathedral: 0.6, pores: 0.7 } },
  dab_miodowy: { code: 'D03', name: 'Dąb miodowy', group: 'drewno', hex: '#b9843f', tex: { kind: 'wood', base: '#bc8846', dark: '#77461b', light: '#dcab68', cathedral: 0.7, pores: 0.8 } },
  dab_wedzony: { code: 'D04', name: 'Dąb wędzony', group: 'drewno', hex: '#6f5440', tex: { kind: 'wood', base: '#745944', dark: '#3a2718', light: '#9b7d62', cathedral: 0.6, pores: 0.7 } },
  orzech: { code: 'D05', name: 'Orzech amerykański', group: 'drewno', hex: '#6d4b34', tex: { kind: 'wood', base: '#73513a', dark: '#382114', light: '#987352', cathedral: 1, pores: 0.4 } },
  jesion: { code: 'D06', name: 'Jesion jasny', group: 'drewno', hex: '#dac8a8', tex: { kind: 'wood', base: '#dccbab', dark: '#98805c', light: '#f0e5cf', cathedral: 0.8, pores: 1 } },
  marmur_bialy: { code: 'S01', name: 'Marmur biały', group: 'kamien', hex: '#eeeeeb', tex: { kind: 'marble', base: '#f0f0ed', vein: '#7d838b', cloud: '#d6d8da' } },
  marmur_czarny: { code: 'S02', name: 'Marmur czarny', group: 'kamien', hex: '#1f2022', tex: { kind: 'marble', base: '#1d1e20', vein: '#d9d6cf', cloud: '#2d2e31' } },
  beton_jasny: { code: 'S03', name: 'Beton jasny', group: 'kamien', hex: '#b7b4ae', tex: { kind: 'concrete', base: '#b9b6b0' } },
  beton_ciemny: { code: 'S04', name: 'Beton ciemny', group: 'kamien', hex: '#5d5e60', tex: { kind: 'concrete', base: '#606163' } },
  terrazzo: { code: 'S05', name: 'Terrazzo', group: 'kamien', hex: '#e6e1d8', tex: { kind: 'terrazzo', base: '#e9e4dc' } },
  kwarc_bialy: { code: 'S06', name: 'Kwarc biały z drobinką', group: 'kamien', hex: '#ecebe7', tex: { kind: 'speckle', base: '#edece8' } },
  kwarc_szary: { code: 'S07', name: 'Kwarc szary', group: 'kamien', hex: '#8e8d8a', tex: { kind: 'speckle', base: '#908f8c' } },
  granit_czarny: { code: 'S08', name: 'Granit czarny', group: 'kamien', hex: '#202123', tex: { kind: 'speckle', base: '#1f2022', coarse: true } },
};

const SOLIDS = ['bialy', 'kosc', 'kaszmir', 'szary_jasny', 'szalwia', 'zielen', 'granat', 'grafit', 'czarny', 'roz', 'musztarda', 'terakota'];
const WOODS = ['dab_naturalny', 'dab_bielony', 'dab_miodowy', 'dab_wedzony', 'orzech', 'jesion'];

export const FRONT_STYLES = {
  gladki: { name: 'Gładki' },
  ramowy: { name: 'Ramowy (frezowany)' },
  ryflowany: { name: 'Ryflowany (lamele)' },
};

// decors / styles – tylko to, co da się realnie wykonać z danego materiału
// (np. płyty laminowanej nie frezuje się w ramkę, MDF lakierowany nie ma usłojenia).
export const FRONTS = {
  laminat: { name: 'Płyta laminowana 18 mm', finish: 'mat', decors: ['bialy', 'kaszmir', 'szary_jasny', 'szalwia', 'grafit', 'czarny', ...WOODS], styles: ['gladki'] },
  mdf_mat: { name: 'MDF lakierowany – mat', finish: 'mat', decors: SOLIDS, styles: ['gladki', 'ramowy', 'ryflowany'] },
  mdf_polysk: { name: 'MDF lakierowany – połysk', finish: 'gloss', decors: SOLIDS, styles: ['gladki', 'ramowy'] },
  fornir: { name: 'Fornir naturalny olejowany', finish: 'oil', decors: ['dab_naturalny', 'dab_bielony', 'dab_wedzony', 'orzech', 'jesion'], styles: ['gladki', 'ryflowany'] },
  lite: { name: 'Drewno lite', finish: 'oil', decors: ['dab_naturalny', 'dab_miodowy', 'orzech', 'jesion'], styles: ['gladki', 'ramowy'] },
};

export const CARCASS = {
  lam_bialy: { name: 'Płyta laminowana 18 mm – biała', decor: 'bialy' },
  lam_szary: { name: 'Płyta laminowana 18 mm – szara', decor: 'szary_jasny' },
  lam_grafit: { name: 'Płyta laminowana 18 mm – grafit', decor: 'grafit' },
  lam_dab: { name: 'Płyta laminowana 18 mm – dąb naturalny', decor: 'dab_naturalny' },
  lam_dab_bielony: { name: 'Płyta laminowana 18 mm – dąb bielony', decor: 'dab_bielony' },
};

export const COUNTERTOPS = {
  laminat: { name: 'Blat laminowany 38 mm', thickness: 3.8, finish: 'mat', decors: ['dab_naturalny', 'dab_bielony', 'orzech', 'beton_jasny', 'beton_ciemny', 'marmur_bialy', 'marmur_czarny', 'terrazzo'] },
  kompakt: { name: 'Kompakt HPL 12 mm', thickness: 1.2, finish: 'mat', decors: ['czarny', 'bialy', 'beton_ciemny', 'marmur_bialy'] },
  lite: { name: 'Drewno lite 40 mm', thickness: 4, finish: 'oil', decors: ['dab_naturalny', 'dab_miodowy', 'orzech', 'jesion'] },
  kwarc: { name: 'Konglomerat kwarcowy 20 mm', thickness: 2, finish: 'polished', decors: ['kwarc_bialy', 'kwarc_szary', 'marmur_bialy', 'marmur_czarny', 'terrazzo'] },
  granit: { name: 'Granit naturalny 30 mm', thickness: 3, finish: 'polished', decors: ['granit_czarny'] },
};

export const HANDLES = {
  listwa: { name: 'Listwa – aluminium', shape: 'bar', finish: 'alu' },
  listwa_czarna: { name: 'Listwa – czarny mat', shape: 'bar', finish: 'black' },
  galka: { name: 'Gałka – czarny mat', shape: 'knob', finish: 'black' },
  galka_mosiadz: { name: 'Gałka – mosiądz', shape: 'knob', finish: 'brass' },
  bezuchwytowe: { name: 'Bezuchwytowe – system „push”', shape: 'none' },
};

// Gotowe zestawy wykończenia – cały styl jednym kliknięciem.
export const STYLE_PRESETS = [
  { id: 'skandynawski', name: 'Skandynawski', desc: 'biały mat, blat dąb bielony', set: { front: 'mdf_mat', frontDecor: 'bialy', frontStyle: 'gladki', countertop: 'laminat', countertopDecor: 'dab_bielony', carcass: 'lam_bialy', handle: 'listwa' } },
  { id: 'szalwia', name: 'Szałwia i dąb', desc: 'fronty ramowe, mosiężne gałki', set: { front: 'mdf_mat', frontDecor: 'szalwia', frontStyle: 'ramowy', countertop: 'laminat', countertopDecor: 'dab_naturalny', carcass: 'lam_bialy', handle: 'galka_mosiadz' } },
  { id: 'butelkowa', name: 'Butelkowa zieleń', desc: 'ramowe fronty, blat marmur', set: { front: 'mdf_mat', frontDecor: 'zielen', frontStyle: 'ramowy', countertop: 'kwarc', countertopDecor: 'marmur_bialy', carcass: 'lam_bialy', handle: 'galka_mosiadz' } },
  { id: 'grafit', name: 'Nowoczesny grafit', desc: 'grafit i beton, bez uchwytów', set: { front: 'mdf_mat', frontDecor: 'grafit', frontStyle: 'gladki', countertop: 'laminat', countertopDecor: 'beton_jasny', carcass: 'lam_grafit', handle: 'bezuchwytowe' } },
  { id: 'orzech', name: 'Ciepły orzech', desc: 'fornir ryflowany, kwarc', set: { front: 'fornir', frontDecor: 'orzech', frontStyle: 'ryflowany', countertop: 'kwarc', countertopDecor: 'kwarc_bialy', carcass: 'lam_bialy', handle: 'listwa_czarna' } },
  { id: 'jasny_dab', name: 'Jasny dąb', desc: 'dąb, blat terrazzo', set: { front: 'laminat', frontDecor: 'dab_naturalny', frontStyle: 'gladki', countertop: 'laminat', countertopDecor: 'terrazzo', carcass: 'lam_dab', handle: 'listwa_czarna' } },
  { id: 'bialy_polysk', name: 'Biały połysk', desc: 'połysk i czarny granit', set: { front: 'mdf_polysk', frontDecor: 'bialy', frontStyle: 'gladki', countertop: 'granit', countertopDecor: 'granit_czarny', carcass: 'lam_bialy', handle: 'bezuchwytowe' } },
  { id: 'granat', name: 'Granat i marmur', desc: 'ramowe fronty, czarne gałki', set: { front: 'mdf_mat', frontDecor: 'granat', frontStyle: 'ramowy', countertop: 'kwarc', countertopDecor: 'marmur_bialy', carcass: 'lam_bialy', handle: 'galka' } },
];

// Dopasowuje dekor i styl do wybranego materiału frontu / blatu.
export function fitFront(c, front) {
  const F = FRONTS[front];
  return {
    ...c,
    front,
    frontDecor: F.decors.includes(c.frontDecor) ? c.frontDecor : F.decors[0],
    frontStyle: F.styles.includes(c.frontStyle) ? c.frontStyle : 'gladki',
  };
}

export function fitCountertop(c, type) {
  const C = COUNTERTOPS[type];
  return { ...c, countertop: type, countertopDecor: C.decors.includes(c.countertopDecor) ? c.countertopDecor : C.decors[0] };
}

const OLD_FRONTS = { fornir_dab: 'fornir', lite_dab: 'lite' };
const OLD_COUNTERTOPS = {
  lam_dab: ['laminat', 'dab_naturalny'],
  lam_beton: ['laminat', 'beton_jasny'],
  kompakt_czarny: ['kompakt', 'czarny'],
  dab_lity: ['lite', 'dab_naturalny'],
  kwarc_bialy: ['kwarc', 'kwarc_bialy'],
};

// Walidacja wykończenia (+ migracja projektów zapisanych w starszym formacie).
export function sanitizeFinish(c, d, { countertop = true } = {}) {
  const has = (obj, k) => typeof k === 'string' && Object.hasOwn(obj, k);
  let front = OLD_FRONTS[c.front] || c.front;
  if (!has(FRONTS, front)) front = d.front;
  const F = FRONTS[front];
  const wantDecor = c.frontDecor ?? c.frontColor;
  const out = {
    carcass: has(CARCASS, c.carcass) ? c.carcass : d.carcass,
    front,
    frontDecor: F.decors.includes(wantDecor) ? wantDecor : F.decors.includes(d.frontDecor) ? d.frontDecor : F.decors[0],
    frontStyle: F.styles.includes(c.frontStyle) ? c.frontStyle : 'gladki',
    handle: has(HANDLES, c.handle) ? c.handle : d.handle,
  };
  if (countertop) {
    let [type, decor] = OLD_COUNTERTOPS[c.countertop] || [c.countertop, c.countertopDecor];
    if (!has(COUNTERTOPS, type)) [type, decor] = [d.countertop, d.countertopDecor];
    const C = COUNTERTOPS[type];
    out.countertop = type;
    out.countertopDecor = C.decors.includes(decor) ? decor : C.decors[0];
  }
  return out;
}

export const HARDWARE = {
  standard: { name: 'Standard' },
  premium: { name: 'Premium – cichy domyk, pełny wysuw' },
};

export const WARDROBE_INTERIORS = {
  drazek: { name: 'Drążek + półka' },
  drazek_podwojny: { name: 'Dwa drążki' },
  polki: { name: 'Półki' },
  szuflady: { name: 'Szuflady + półki' },
};

export const WARDROBE_DOORS = {
  przesuwne: { name: 'Drzwi przesuwne' },
  uchylne: { name: 'Drzwi uchylne' },
  brak: { name: 'Bez frontów (garderoba)' },
};

export const STATUSES = {
  szkic: { name: 'Szkic', tone: 'muted' },
  wyslane: { name: 'Wysłane – czeka na wycenę', tone: 'info' },
  wycenione: { name: 'Oferta gotowa', tone: 'accent' },
  zaakceptowane: { name: 'Zaakceptowane', tone: 'ok' },
  w_realizacji: { name: 'W realizacji', tone: 'ok' },
  odrzucone: { name: 'Odrzucone', tone: 'bad' },
};

// Ceny netto w PLN (koszt stolarni, przed marżą). Edytowalne w panelu admina.
// Koszty netto stolarni w zł (marża i VAT doliczane osobno). Skalibrowane XI 2026 do cen rynkowych małych i średnich
// stolarni w Polsce (poza największymi miastami): badanie cenników stolarni, lakierni, hurtowni płyt i okuć, sieci
// (KB.pl, Muczyn, WIP/Stylfront, Egger, GTV, Blum, Castorama, Oferteo i in.). Kontrola: kuchnia L 360+260 ≈ 24,6 tys.,
// kuchnia 3 m laminat ≈ 9,1 tys., MDF + kwarc ≈ 14,5 tys., szafa przesuwna 250×260 ≈ 7,1 tys. zł brutto (VAT 23%).
// Uwaga: zabudowa z montażem w mieszkaniu do 150 m² / domu do 300 m² może mieć VAT 8% – wtedy vat: 8 i marża ok. 48%,
// żeby ceny brutto zostały na tym samym poziomie.
export const DEFAULT_PRICING = {
  carcass: { lam_bialy: 48, lam_szary: 54, lam_grafit: 56, lam_dab: 60, lam_dab_bielony: 60 }, // płyta 18 mm z cięciem, zł/m²
  hdf: 16,
  edge: 4.5,
  waste: 12,
  fronts: { laminat: 120, mdf_mat: 450, mdf_polysk: 560, fornir: 600, lite: 1100 }, // zł/m²; MDF – lakier dwustronny w kolorze
  frontStyle: { gladki: 0, ramowy: 130, ryflowany: 200 },
  mirror: 220,
  countertops: { laminat: 170, kompakt: 480, lite: 380, kwarc: 720, granit: 700 }, // zł/mb (gł. 60–62 cm)
  countertopCutout: { laminat: 90, kompakt: 200, lite: 120, kwarc: 300, granit: 300 },
  hinge: { standard: 5, premium: 13 }, // GTV / Blum z cichym domykiem
  drawer: { standard: 80, premium: 210 }, // GTV Modern Box / Blum Tandembox–Legrabox z dnem i tyłem
  leg: 4,
  hanger: 14,
  smallParts: 15,
  handles: { listwa: 18, listwa_czarna: 20, galka: 10, galka_mosiadz: 28, bezuchwytowe: 40 },
  plinth: 30,
  led: 100,
  ledPsu: 90,
  rail: 30,
  slidingDoor: 200,
  slidingTrack: 50,
  laborRate: 85, // koszt godziny pracy; klient płaci z marżą ok. 110 zł/h
  laborHours: { base: 2, wall: 1.5, tall: 4.5, appliance: 0.5, drawer: 0.4, wardrobeSection: 2, wardrobeDoor: 0.4 },
  assemblyPerModule: 75,
  assemblyCountertop: 70,
  assemblyWardrobe: 150,
  transportBase: 120,
  transportKm: 2,
  margin: 30,
  vat: 23,
};

const mapFields = (obj, prefix, unit, labelPrefix = '') =>
  Object.entries(obj).map(([k, v]) => ({ key: `${prefix}.${k}`, label: labelPrefix + v.name, unit }));

// Opis pól cennika – z niego generowany jest formularz w panelu admina.
export const PRICING_SCHEMA = [
  {
    group: 'Płyty i obrzeża',
    fields: [
      ...mapFields(CARCASS, 'carcass', 'zł/m²'),
      { key: 'hdf', label: 'Płyta HDF 3 mm (plecy)', unit: 'zł/m²' },
      { key: 'edge', label: 'Okleina ABS z oklejaniem', unit: 'zł/mb' },
      { key: 'waste', label: 'Naddatek na odpad przy rozkroju', unit: '%' },
    ],
  },
  {
    group: 'Fronty',
    fields: [
      ...mapFields(FRONTS, 'fronts', 'zł/m²'),
      { key: 'frontStyle.ramowy', label: 'Dopłata: front ramowy (frezowany)', unit: 'zł/m²' },
      { key: 'frontStyle.ryflowany', label: 'Dopłata: front ryflowany (lamele)', unit: 'zł/m²' },
      { key: 'mirror', label: 'Lustro 4 mm (drzwi szafy)', unit: 'zł/m²' },
    ],
  },
  {
    group: 'Blaty',
    fields: [
      ...mapFields(COUNTERTOPS, 'countertops', 'zł/mb'),
      ...mapFields(COUNTERTOPS, 'countertopCutout', 'zł/szt', 'Wycięcie – '),
    ],
  },
  {
    group: 'Okucia i akcesoria',
    fields: [
      { key: 'hinge.standard', label: 'Zawias – standard', unit: 'zł/szt' },
      { key: 'hinge.premium', label: 'Zawias – premium (cichy domyk)', unit: 'zł/szt' },
      { key: 'drawer.standard', label: 'Szuflada z prowadnicami – standard', unit: 'zł/szt' },
      { key: 'drawer.premium', label: 'Szuflada systemowa – premium', unit: 'zł/szt' },
      ...mapFields(HANDLES, 'handles', 'zł/szt'),
      { key: 'leg', label: 'Nóżka meblowa regulowana', unit: 'zł/szt' },
      { key: 'hanger', label: 'Zawieszki szafki górnej', unit: 'zł/kpl' },
      { key: 'smallParts', label: 'Drobne okucia na szafkę', unit: 'zł/kpl' },
      { key: 'plinth', label: 'Cokół z uszczelką', unit: 'zł/mb' },
      { key: 'led', label: 'Oświetlenie LED (profil + taśma)', unit: 'zł/mb' },
      { key: 'ledPsu', label: 'Zasilacz LED', unit: 'zł/szt' },
      { key: 'rail', label: 'Drążek do szafy z mocowaniami', unit: 'zł/szt' },
      { key: 'slidingDoor', label: 'System drzwi przesuwnych (na skrzydło)', unit: 'zł/szt' },
      { key: 'slidingTrack', label: 'Tor jezdny drzwi przesuwnych', unit: 'zł/mb' },
    ],
  },
  {
    group: 'Robocizna i usługi',
    fields: [
      { key: 'laborRate', label: 'Stawka roboczogodziny w stolarni', unit: 'zł/h' },
      { key: 'laborHours.base', label: 'Czas produkcji – szafka dolna', unit: 'h' },
      { key: 'laborHours.wall', label: 'Czas produkcji – szafka górna', unit: 'h' },
      { key: 'laborHours.tall', label: 'Czas produkcji – słupek', unit: 'h' },
      { key: 'laborHours.appliance', label: 'Czas – front AGD do zabudowy', unit: 'h' },
      { key: 'laborHours.drawer', label: 'Czas – dodatkowo na szufladę', unit: 'h' },
      { key: 'laborHours.wardrobeSection', label: 'Czas – sekcja szafy', unit: 'h' },
      { key: 'laborHours.wardrobeDoor', label: 'Czas – drzwi szafy', unit: 'h' },
      { key: 'assemblyPerModule', label: 'Montaż u klienta – szafka', unit: 'zł/szt' },
      { key: 'assemblyCountertop', label: 'Montaż blatu', unit: 'zł/mb' },
      { key: 'assemblyWardrobe', label: 'Montaż szafy', unit: 'zł/mb' },
      { key: 'transportBase', label: 'Transport – opłata stała', unit: 'zł' },
      { key: 'transportKm', label: 'Transport – za kilometr', unit: 'zł/km' },
    ],
  },
  {
    group: 'Marża i podatek',
    fields: [
      { key: 'margin', label: 'Marża stolarni', unit: '%' },
      { key: 'vat', label: 'Stawka VAT', unit: '%' },
    ],
  },
];

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const copy = structuredClone(obj);
  let o = copy;
  keys.slice(0, -1).forEach((k) => {
    o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
    o = o[k];
  });
  o[keys.at(-1)] = value;
  return copy;
}

// Uzupełnia brakujące pola cennika wartościami domyślnymi i odrzuca śmieci.
export function normalizePricing(input) {
  const walk = (def, val) => {
    if (typeof def === 'number') {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 ? n : def;
    }
    const out = {};
    for (const k of Object.keys(def)) out[k] = walk(def[k], val?.[k]);
    return out;
  };
  return walk(DEFAULT_PRICING, input || {});
}

// Wersja cennika dla klienta: marża wliczona w ceny jednostkowe, bez ujawniania kosztów.
export function pricingForClient(pricing) {
  const p = normalizePricing(pricing);
  const m = 1 + p.margin / 100;
  const skip = new Set(['waste', 'margin', 'vat', 'laborHours']);
  const walk = (v) => (typeof v === 'number' ? v * m : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])));
  const out = {};
  for (const [k, v] of Object.entries(p)) out[k] = skip.has(k) ? v : walk(v);
  out.margin = 0;
  return out;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
