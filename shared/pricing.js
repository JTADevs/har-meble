// Silnik wyceny: z konfiguracji + cennika liczy formatki, materiały, okucia,
// robociznę i cenę końcową. Ten sam kod działa w przeglądarce (podgląd na żywo)
// i na serwerze (cena zapisywana w zapytaniu ofertowym – nie da się jej podmienić).
import { CARCASS, COUNTERTOPS, DECORS, FRONTS, HANDLES, MODULES, normalizePricing } from './catalog.js';
import { layoutKitchen, sanitizeKitchen } from './kitchen.js';
import { wardrobeSpec, sanitizeWardrobe } from './wardrobe.js';

const r2 = (n) => Math.round(n * 100) / 100;
const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);

const GROUP_ORDER = ['Korpusy', 'Fronty', 'Blat', 'Okucia i akcesoria', 'Dodatki', 'Robocizna', 'Montaż i transport'];

function makeLines(marginPct) {
  const m = 1 + marginPct / 100;
  const lines = [];
  return {
    lines,
    add(group, label, qty, unit, unitCost) {
      qty = r2(qty);
      if (!qty || !unitCost) return;
      lines.push({
        group,
        label,
        qty,
        unit,
        unitCost: r2(unitCost),
        cost: r2(qty * unitCost),
        unitPrice: r2(unitCost * m),
        price: r2(qty * unitCost * m),
      });
    },
  };
}

function frontLabel(config) {
  const d = DECORS[config.frontDecor];
  return `${FRONTS[config.front].name} – ${d.name} (${d.code})`;
}

// Dopłata za frezowanie frontów ramowych / ryflowanych (liczona od m² frontów).
function addFrontStyle(L, P, config, frontM2) {
  if (config.frontStyle === 'gladki') return;
  const what = config.frontStyle === 'ramowy' ? 'ramka (front ramowy)' : 'ryflowanie (lamele)';
  L.add('Fronty', `Frezowanie frontów – ${what}`, frontM2, 'm²', P.frontStyle[config.frontStyle]);
}

function materialName(mat, config) {
  if (mat === 'carcass') return CARCASS[config.carcass].name;
  if (mat === 'hdf') return 'HDF 3 mm';
  if (mat === 'mirror') return 'Lustro srebrne 4 mm';
  return frontLabel(config);
}

const areaM2 = (panels) => sum(panels, (p) => (p.l * p.w * p.qty) / 1e6);
const edgeMb = (panels) => sum(panels, (p) => ((p.edgeL * p.l + p.edgeW * p.w) * p.qty) / 1000);

function finish(L, P, panels, config, extra) {
  const lines = L.lines;
  const cost = r2(sum(lines, (l) => l.cost));
  const net = r2(sum(lines, (l) => l.price));
  const vat = r2((net * P.vat) / 100);
  const groups = GROUP_ORDER.map((name) => {
    const gl = lines.filter((l) => l.group === name);
    return { name, lines: gl, price: r2(sum(gl, (l) => l.price)), cost: r2(sum(gl, (l) => l.cost)) };
  }).filter((g) => g.lines.length);
  const laborH = sum(lines.filter((l) => l.group === 'Robocizna'), (l) => l.qty);
  return {
    lines,
    groups,
    panels: panels.map((p) => ({ ...p, material: materialName(p.mat, config) })),
    totals: { cost, net, vat, gross: r2(net + vat), profit: r2(net - cost), vatPct: P.vat, marginPct: P.margin },
    stats: {
      boardM2: r2(areaM2(panels.filter((p) => p.mat === 'carcass'))),
      frontM2: r2(areaM2(panels.filter((p) => p.mat === 'front' || p.mat === 'mirror'))),
      panelsCount: sum(panels, (p) => p.qty),
      laborH: r2(laborH),
      leadWeeks: Math.ceil(laborH / 30) + 2,
      ...extra.stats,
    },
    warnings: extra.warnings || [],
  };
}

export function priceKitchen(rawConfig, rawPricing) {
  const config = sanitizeKitchen(rawConfig);
  const P = normalizePricing(rawPricing);
  const layout = layoutKitchen(config);
  const panels = [];
  const hw = { hinges: 0, drawers: 0, handles: 0, legs: 0, hangers: 0, small: 0, sink: 0, hob: 0, laborH: 0 };

  for (const p of layout.placed) {
    const s = p.spec;
    for (const pn of s.panels) panels.push({ ...pn, module: `${p.label} · ${MODULES[p.type].name} ${p.width} cm` });
    for (const k of ['hinges', 'drawers', 'handles', 'legs', 'hangers', 'small', 'sink', 'hob']) hw[k] += s.hw[k];
    hw.laborH += P.laborHours[s.hw.laborClass] + s.hw.drawers * P.laborHours.drawer;
  }

  const waste = 1 + P.waste / 100;
  const carc = panels.filter((p) => p.mat === 'carcass');
  const hdf = panels.filter((p) => p.mat === 'hdf');
  const fronts = panels.filter((p) => p.mat === 'front');
  const ctMb = sum(Object.values(layout.walls), (w) => sum(w.countertops, (c) => c.end - c.start)) / 100;

  const L = makeLines(P.margin);
  L.add('Korpusy', CARCASS[config.carcass].name, areaM2(carc) * waste, 'm²', P.carcass[config.carcass]);
  L.add('Korpusy', 'Płyta HDF 3 mm – plecy', areaM2(hdf) * waste, 'm²', P.hdf);
  L.add('Korpusy', 'Okleina ABS + oklejanie krawędzi', edgeMb(carc) * 1.1, 'mb', P.edge);
  L.add('Fronty', frontLabel(config), areaM2(fronts), 'm²', P.fronts[config.front]);
  addFrontStyle(L, P, config, areaM2(fronts));
  L.add('Blat', `${COUNTERTOPS[config.countertop].name} – ${DECORS[config.countertopDecor].name}`, ctMb, 'mb', P.countertops[config.countertop]);
  L.add('Blat', 'Wycięcie pod zlewozmywak', hw.sink, 'szt', P.countertopCutout[config.countertop]);
  L.add('Blat', 'Wycięcie pod płytę grzewczą', hw.hob, 'szt', P.countertopCutout[config.countertop]);
  L.add('Okucia i akcesoria', `Zawiasy (${config.hardware})`, hw.hinges, 'szt', P.hinge[config.hardware]);
  L.add('Okucia i akcesoria', `Szuflady z prowadnicami (${config.hardware})`, hw.drawers, 'szt', P.drawer[config.hardware]);
  L.add('Okucia i akcesoria', `Uchwyty: ${HANDLES[config.handle].name.toLowerCase()}`, hw.handles, 'szt', P.handles[config.handle]);
  L.add('Okucia i akcesoria', 'Nóżki meblowe regulowane', hw.legs, 'szt', P.leg);
  L.add('Okucia i akcesoria', 'Zawieszki szafek górnych', hw.hangers, 'kpl', P.hanger);
  L.add('Okucia i akcesoria', 'Drobne okucia (konfirmaty, kołki, podpórki)', hw.small, 'kpl', P.smallParts);
  L.add('Dodatki', 'Cokół z uszczelką', layout.plinthCm / 100, 'mb', P.plinth);
  if (config.led && layout.wallRowCm > 0) {
    L.add('Dodatki', 'Oświetlenie LED pod szafkami górnymi', layout.wallRowCm / 100, 'mb', P.led);
    L.add('Dodatki', 'Zasilacz LED', 1, 'szt', P.ledPsu);
  }
  L.add('Robocizna', 'Produkcja: rozkrój, oklejanie, wiercenie, składanie', hw.laborH, 'h', P.laborRate);
  if (config.montaz) {
    L.add('Montaż i transport', 'Montaż szafek u klienta', layout.placed.length, 'szt', P.assemblyPerModule);
    L.add('Montaż i transport', 'Montaż i docięcie blatu', ctMb, 'mb', P.assemblyCountertop);
  }
  if (layout.placed.length) {
    L.add('Montaż i transport', `Transport (${config.transportKm} km, w obie strony)`, 1, 'kurs', P.transportBase + config.transportKm * 2 * P.transportKm);
  }

  return finish(L, P, panels, config, {
    warnings: layout.warnings,
    stats: { modules: layout.placed.length, countertopMb: Math.round(ctMb * 100) / 100 },
  });
}

export function priceWardrobe(rawConfig, rawPricing) {
  const config = sanitizeWardrobe(rawConfig);
  const P = normalizePricing(rawPricing);
  const spec = wardrobeSpec(config);
  const panels = spec.panels.map((p) => ({ ...p, module: `Szafa ${config.width}×${config.height}×${config.depth} cm` }));
  const waste = 1 + P.waste / 100;
  const carc = panels.filter((p) => p.mat === 'carcass');
  const hw = spec.hw;
  const laborH =
    hw.sections * P.laborHours.wardrobeSection + hw.doors * P.laborHours.wardrobeDoor + hw.drawers * P.laborHours.drawer;

  const L = makeLines(P.margin);
  L.add('Korpusy', CARCASS[config.carcass].name, areaM2(carc) * waste, 'm²', P.carcass[config.carcass]);
  L.add('Korpusy', 'Płyta HDF 3 mm – plecy', areaM2(panels.filter((p) => p.mat === 'hdf')) * waste, 'm²', P.hdf);
  L.add('Korpusy', 'Okleina ABS + oklejanie krawędzi', edgeMb(carc) * 1.1, 'mb', P.edge);
  const frontM2 = areaM2(panels.filter((p) => p.mat === 'front'));
  L.add('Fronty', frontLabel(config), frontM2, 'm²', P.fronts[config.front]);
  if (config.doors === 'uchylne') addFrontStyle(L, P, config, frontM2);
  L.add('Fronty', 'Lustro srebrne 4 mm', areaM2(panels.filter((p) => p.mat === 'mirror')), 'm²', P.mirror);
  L.add('Fronty', 'System drzwi przesuwnych (profile, wózki)', hw.slidingDoors, 'skrzydło', P.slidingDoor);
  L.add('Fronty', 'Tory jezdne – górny i dolny', hw.trackMb, 'mb', P.slidingTrack);
  L.add('Okucia i akcesoria', `Zawiasy (${config.hardware})`, hw.hinges, 'szt', P.hinge[config.hardware]);
  L.add('Okucia i akcesoria', `Szuflady z prowadnicami (${config.hardware})`, hw.drawers, 'szt', P.drawer[config.hardware]);
  L.add('Okucia i akcesoria', `Uchwyty: ${HANDLES[config.handle].name.toLowerCase()}`, hw.handles, 'szt', P.handles[config.handle]);
  L.add('Okucia i akcesoria', 'Drążek na ubrania z mocowaniami', hw.rails, 'szt', P.rail);
  L.add('Okucia i akcesoria', 'Drobne okucia (konfirmaty, kołki, podpórki)', hw.sections, 'kpl', P.smallParts);
  if (config.led) {
    L.add('Dodatki', 'Oświetlenie LED wnętrza', config.width / 100, 'mb', P.led);
    L.add('Dodatki', 'Zasilacz LED z czujnikiem', 1, 'szt', P.ledPsu);
  }
  L.add('Robocizna', 'Produkcja: rozkrój, oklejanie, wiercenie, składanie', laborH, 'h', P.laborRate);
  if (config.montaz) L.add('Montaż i transport', 'Montaż szafy u klienta', config.width / 100, 'mb', P.assemblyWardrobe);
  L.add('Montaż i transport', `Transport (${config.transportKm} km, w obie strony)`, 1, 'kurs', P.transportBase + config.transportKm * 2 * P.transportKm);

  return finish(L, P, panels, config, { stats: { modules: hw.sections } });
}

export function priceProject(type, config, pricing) {
  return type === 'szafa' ? priceWardrobe(config, pricing) : priceKitchen(config, pricing);
}

export function sanitizeProjectConfig(type, config) {
  return type === 'szafa' ? sanitizeWardrobe(config) : sanitizeKitchen(config);
}

const plnFmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
const plnFmt2 = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 2 });
export const pln = (n) => plnFmt.format(n || 0);
export const pln2 = (n) => plnFmt2.format(n || 0);
export const num = (n, d = 2) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: d }).format(n || 0);

// Lista formatek do rozkroju w formacie CSV (separator ; – otwiera się w polskim Excelu).
export function panelsToCSV(panels) {
  const head = ['Szafka', 'Element', 'Materiał', 'Długość [mm]', 'Szerokość [mm]', 'Ilość', 'Okleina dł.', 'Okleina szer.'];
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = panels.map((p) => [p.module, p.name, p.material, p.l, p.w, p.qty, p.edgeL, p.edgeW].map(esc).join(';'));
  return '﻿' + [head.map(esc).join(';'), ...rows].join('\r\n');
}
