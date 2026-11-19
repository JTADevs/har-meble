// Kadrowanie kamery filmu w hero – czysta matematyka (bez three.js), wołana co klatkę bez alokacji.
// Osobny moduł, żeby kadry dało się sprawdzić poza przeglądarką (rzutowanie dla różnych proporcji ekranu).

// Klatki kluczowe kamery (metry): at = postęp ujęcia 0..1, fov = kąt widzenia w pionie (°).
// Kadry są ułożone dla proporcji DESIGN_ASPECT – na węższych ekranach kamera się oddala, na pionowych dodatkowo
// przesuwa obiektyw, żeby mebel trafił w wolny pas nad tekstem hero.
export const CAMERA = [
  [
    { at: 0, pos: [1.02, 0.79, 0.98], target: [0.8, 0.7, 0.57], fov: 28 },
    { at: 0.5, pos: [0.94, 0.86, 1.06], target: [0.76, 0.72, 0.56], fov: 30 },
    { at: 1, pos: [0.52, 1.02, 1.2], target: [0.7, 0.77, 0.5], fov: 34 },
  ],
  'topdown',
  [
    { at: 0, pos: [0.95, 1.02, 3.45], target: [0.05, 0.98, 0], fov: 36 },
    { at: 1, pos: [0.42, 1.14, 2.85], target: [0, 1.0, 0], fov: 36 },
  ],
  [
    { at: 0, pos: [0.15, 3.45, 0.95], target: [0.05, 0.32, 0.36], fov: 38 },
    { at: 0.62, pos: [0.78, 1.5, 2.62], target: [0.05, 0.76, 0.05], fov: 36 },
    // ostatni (spokojny) kadr – też nieruchomy kadr przy ograniczonym ruchu: cała komoda z nóżkami i roślina w kadrze 16:9
    { at: 1, pos: [1.0, 1.16, 3.25], target: [0.04, 0.68, 0], fov: 35 },
  ],
];

export const DESIGN_ASPECT = 1.5; // kompozycje mieszczą się w szerokości kadru 3:2
const DOLLY_SHARE = 0.6; // część pomniejszenia robiona odsunięciem kamery (reszta – szerszym kątem, jak w aparacie telefonu)
const MIN_BAND = 0.3; // najmniejsza wysokość kompozycji w pionowym kadrze (ułamek wysokości)
const MAX_BAND = 0.62;
const MAX_K = 4;

const inOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DEG = Math.PI / 180;

/** Pusty wynik dla frameCamera (alokowany raz, potem nadpisywany). */
export const createFrame = () => ({ pos: [0, 0, 0], target: [0, 0, 0], fov: 34, k: 1, lift: 0 });

/**
 * Kamera ujęcia `shot` w postępie `p` (0..1) dla proporcji `aspect` (szerokość / wysokość płótna).
 * safe – wolny pas nad tekstem hero w ułamkach wysokości od góry { top, bottom } (mierzony w HeroSection; może nie być).
 * Wynik w `out`: pos, target, fov, k (pomniejszenie kompozycji), lift (przesunięcie obiektywu w górę, ułamek wysokości –
 * dla camera.setViewOffset; 0 = kadr symetryczny).
 */
export function frameCamera(shot, p, aspect, safe, out) {
  const keys = CAMERA[shot];
  const pos = out.pos;
  const target = out.target;
  if (keys === 'topdown') {
    const e = inOutCubic(p);
    const az = -0.14 + e * 0.26;
    const h = 4.3 - e * 0.6; // wysoko: cała kompozycja z rekwizytami w kadrze
    target[0] = 0;
    target[1] = 0;
    target[2] = 0;
    pos[0] = Math.sin(az) * 0.03;
    pos[1] = h;
    pos[2] = Math.cos(az) * 0.03;
    out.fov = 34;
  } else {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].at) i += 1;
    const a = keys[i];
    const b = keys[i + 1];
    const t = inOutCubic(clamp((p - a.at) / (b.at - a.at), 0, 1));
    for (let j = 0; j < 3; j++) {
      pos[j] = a.pos[j] + (b.pos[j] - a.pos[j]) * t;
      target[j] = a.target[j] + (b.target[j] - a.target[j]) * t;
    }
    out.fov = a.fov + (b.fov - a.fov) * t;
  }

  // Węższy ekran niż kadr projektowy: kompozycja ma się zmieścić w szerokości → pomniejszamy ją k razy.
  const asp = Math.max(0.2, aspect || DESIGN_ASPECT);
  let k = Math.max(1, DESIGN_ASPECT / asp);
  let center = 0.5; // gdzie w pionie ląduje punkt docelowy (ułamek wysokości od góry)
  // Ekran pionowy: tekst hero zajmuje dół kadru – kompozycja idzie do wolnego pasa pod nawigacją
  // (płynne przejście między proporcjami 1 a 0,8, żeby obracanie/zmiana okna nie dawały skoku).
  const w = clamp((1 - asp) / 0.2, 0, 1);
  if (w > 0) {
    const top = clamp(safe?.top ?? 0.1, 0, 0.3);
    const bottom = clamp(safe?.bottom ?? 0.5, top, 1);
    const band = clamp(bottom - top, MIN_BAND, MAX_BAND);
    k = Math.max(k, 1 + (1 / band - 1) * w);
    center = 0.5 + (top + band / 2 - 0.5) * w;
  }
  k = Math.min(k, MAX_K);

  // pomniejszenie: część odsunięciem kamery wzdłuż osi widzenia, reszta szerszym kątem
  const dolly = k ** DOLLY_SHARE;
  for (let j = 0; j < 3; j++) pos[j] = target[j] + (pos[j] - target[j]) * dolly;
  out.fov = (2 * Math.atan(Math.tan((out.fov * DEG) / 2) * (k / dolly))) / DEG;
  out.k = k;
  out.lift = 0.5 - center;
  return out;
}
