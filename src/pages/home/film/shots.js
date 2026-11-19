// Metadane ujęć filmu w hero – osobny lekki moduł (bez three.js), używany też przez interfejs hero.
export const SHOTS = [
  { key: 'detal', label: 'Detal', dur: 3.8, bg: '#ece5da' },
  { key: 'uklad', label: 'Układ', dur: 4.6, bg: '#f0d6ce' },
  { key: 'kolor', label: 'Kolor', dur: 4.8, bg: '#eee8de' },
  { key: 'dom', label: 'Wnętrze', dur: 5.4, bg: '#efe7da' },
];

export const FILM_LENGTH = SHOTS.reduce((a, s) => a + s.dur, 0);

export const shotStart = (i) => SHOTS.slice(0, i).reduce((a, s) => a + s.dur, 0);

export function filmAt(t) {
  let tt = ((t % FILM_LENGTH) + FILM_LENGTH) % FILM_LENGTH;
  for (let i = 0; i < SHOTS.length; i++) {
    if (tt < SHOTS[i].dur) return { shot: i, st: tt, p: tt / SHOTS[i].dur };
    tt -= SHOTS[i].dur;
  }
  // bez Array.prototype.at – Safari < 15.4 go nie ma, a build nie dodaje polyfilli
  const last = SHOTS[SHOTS.length - 1];
  return { shot: SHOTS.length - 1, st: last.dur, p: 1 };
}

// Zadanie w wolnej chwili przeglądarki (zapasowo setTimeout – Safari nie ma requestIdleCallback).
export function whenIdle(cb, timeout = 1500) {
  if (typeof window.requestIdleCallback === 'function') return { idle: window.requestIdleCallback(cb, { timeout }) };
  return { timer: window.setTimeout(cb, 48) };
}

export function cancelIdle(handle) {
  if (!handle) return;
  if (handle.idle !== undefined) window.cancelIdleCallback?.(handle.idle);
  if (handle.timer !== undefined) window.clearTimeout(handle.timer);
}
