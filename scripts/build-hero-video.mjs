#!/usr/bin/env node
// Montaż filmu do hero strony głównej z klipów wygenerowanych w Google Flow (2–6 ujęć po ok. 8 s).
// Użycie:  npm run video:hero -- kuchnia.mp4=Kuchnia salon.mp4@0-5.6=Salon sypialnia.mp4=Sypialnia
//          po „=” podpis paska ujęcia w hero (bez niego – nazwa pliku bez numeru, np. „2-regal.mp4” → „Regal”),
//          „@od-do” (sekundy) – fragment klipu, np. bez końcówki, w której kamera podjeżdża za blisko.
// Wynik:   public/video/hero-1080.mp4, hero-720.mp4, hero-poster.jpg,
//          hero-mobile.mp4 + hero-poster-mobile.jpg – pionowy wycinek 608×1080 na telefony (HERO_MOBILE_X – środek wycinka, 0–1)
//          src/pages/home/heroVideo.json – ujęcia (klucz, podpis) i ich czasy dla pasków w hero
//
// Pętla bez szwu: film zaczyna się od klipu 1 przesuniętego o XF sekund, a kończy przenikaniem ostatniego ujęcia
// w pierwsze XF sekund klipu 1 – po zapętleniu obraz płynnie przechodzi w początek filmu.
// Dźwięk jest usuwany (modele wideo dokładają muzykę).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const XF = 0.8; // długość przenikania między ujęciami (s)
// jakość 1080p: CRF 22 (klipy z Veo 3.1 Quality mają dużo detalu, wyższy CRF rozmywał faktury drewna i tkanin)
const CRF_1080 = Number(process.env.HERO_CRF_1080) || 22;
// Telefon trzymany pionowo widzi ok. 1/3 szerokości kadru 16:9 – dostaje sam ten wycinek (608×1080, ta sama gęstość
// pikseli co 1080p w widocznej części, plik ok. 3× mniejszy). Meble w ujęciach stoją zwykle w prawej części kadru.
const MOBILE_CX = Number(process.env.HERO_MOBILE_X) || 0.6;
const MW = 608;
const MX = Math.max(0, Math.min(1920 - MW, Math.round((1920 * MOBILE_CX - MW / 2) / 2) * 2));
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/video');
const JSON_OUT = path.join(ROOT, 'src/pages/home/heroVideo.json');

const args = process.argv.slice(2);
if (args.length < 2 || args.length > 6) {
  console.error('Podaj od 2 do 6 klipów w kolejności ujęć, np.: kuchnia.mp4=Kuchnia salon.mp4=Salon');
  process.exit(1);
}
const clips = args.map((arg) => {
  const m = /^(.*?\.(?:mp4|mov|webm|mkv))(?:@(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?))?(?:=(.+))?$/i.exec(arg);
  if (!m) throw new Error(`Nieobsługiwany argument: ${arg}`);
  const file = m[1];
  if (!fs.existsSync(file)) throw new Error(`Brak pliku: ${file}`);
  const key = path.basename(file).replace(/\.[^.]+$/, '').replace(/^[\d\s._-]+/, '').toLowerCase() || 'ujecie';
  const label = (m[4] || key.charAt(0).toUpperCase() + key.slice(1)).trim();
  const cut = m[2] !== undefined ? { from: Number(m[2]), to: Number(m[3]) } : null;
  if (cut && !(cut.to - cut.from > 2 * XF)) throw new Error(`Za krótki fragment: ${arg}`);
  return { file, key, label, cut };
});
const N = clips.length;

const probe = (file, entries) =>
  execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'json', file], { encoding: 'utf8' });

const info = clips.map(({ file, cut }) => {
  const j = JSON.parse(probe(file, 'stream=width,height,r_frame_rate,duration:format=duration'));
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  const full = Number(s.duration || j.format.duration);
  // fragment klipu (@od-do) – długość liczona z przyciętego zakresu
  const dur = cut ? Math.min(full, cut.to) - cut.from : full;
  return { file, w: s.width, h: s.height, fps: n / d, dur };
});
info.forEach((c, i) => console.log(`klip ${i + 1}: ${c.w}×${c.h}, ${c.fps.toFixed(2)} kl./s, ${c.dur.toFixed(2)} s – ${path.basename(c.file)}`));

const fps = Math.round(info[0].fps * 1000) / 1000;
const r3 = (v) => Math.round(v * 1000) / 1000;
// długości segmentów: klip 1 bez pierwszych XF s, klipy 2…N w całości, na końcu XF s początku klipu 1
const lens = [info[0].dur - XF, ...info.slice(1).map((c) => c.dur), XF];
const offsets = [];
let acc = lens[0];
for (let i = 1; i < lens.length; i++) {
  offsets.push(acc - XF);
  acc = acc - XF + lens[i];
}
// Ta sama siatka klatek co w xfade/trim (zweryfikowane klatka po klatce): przenikanie zaczyna się w klatce round(offset·fps)
// i trwa round(XF·fps) klatek; pierwsza czysta klatka ujęcia = koniec przenikania.
const F = (s) => Math.round(s * fps);
const offF = offsets.map((o) => F(r3(o)));
const durF = F(XF);
const cleanF = offF.slice(0, N - 1).map((o) => o + durF); // ujęcia 2…N
const totalFrames = offF[N - 1] + durF; // ostatnie przenikanie kończy się pierwszą klatką po XF s klipu 1
const total = totalFrames / fps;

const trimOf = (i) => (clips[i].cut ? `trim=start=${clips[i].cut.from}:end=${clips[i].cut.to},setpts=PTS-STARTPTS,` : '');
const norm = (i) =>
  `[${i}:v]${trimOf(i)}settb=AVTB,fps=${fps},scale=1920:1080:flags=lanczos:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,format=yuv420p`;
// segmenty: s0 = klip 1 od XF s, s1…s(N-1) = klipy 2…N, sN = pierwsze XF s klipu 1 (domknięcie pętli)
const xfades = offsets.map((o, i) => {
  const from = i === 0 ? '[s0]' : `[x${i}]`;
  const to = i === N - 1 ? ',split=3[o1080][o][om]' : `[x${i + 1}]`;
  return `${from}[s${i + 1}]xfade=transition=fade:duration=${XF}:offset=${r3(o)}${to}`;
});
const graph = [
  `${norm(0)},split[c1a][c1b]`,
  // fps po setpts: ffmpeg 7 oznacza wtedy strumień jako VFR, a xfade wymaga stałej liczby klatek
  `[c1a]trim=start=${XF},setpts=PTS-STARTPTS,fps=${fps}[s0]`,
  `[c1b]trim=end=${XF},setpts=PTS-STARTPTS,fps=${fps}[s${N}]`,
  ...clips.slice(1).map((_, i) => `${norm(i + 1)}[s${i + 1}]`),
  ...xfades,
  `[o]scale=1280:720:flags=lanczos[o720]`,
  `[om]crop=${MW}:1080:${MX}:0,setsar=1[omob]`,
].join(';');

fs.mkdirSync(OUT, { recursive: true });
// Klatki kluczowe na pierwszych czystych klatkach ujęć – przeskok z paska dekoduje jedną klatkę zamiast kilkudziesięciu.
const keyTimes = ['0', ...cleanF.map((f) => (f / fps).toFixed(6))].join(',');
// level 4.0 dla 1080p: preset slow podnosi go sam do 5.0 (więcej klatek referencyjnych), czego nie dekodują starsze telefony i TV
const enc = (crf, level) => [
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', ...(level ? ['-level:v', level] : []),
  '-force_key_frames', keyTimes, '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
];
const v1080 = path.join(OUT, 'hero-1080.mp4');
const v720 = path.join(OUT, 'hero-720.mp4');
const vMob = path.join(OUT, 'hero-mobile.mp4');
execFileSync(
  'ffmpeg',
  ['-v', 'error', '-y', ...clips.flatMap((c) => ['-i', c.file]), '-filter_complex', graph, '-map', '[o1080]', ...enc(CRF_1080, '4.0'), v1080, '-map', '[o720]', ...enc(23), v720, '-map', '[omob]', ...enc(23, '4.0'), vMob],
  { stdio: 'inherit' },
);

// plakat = pierwsza klatka filmu (ta sama, od której startuje odtwarzanie – bez skoku po wczytaniu)
const poster = path.join(OUT, 'hero-poster.jpg');
// Jeden plakat 1920 px: hero ma min. 620 px wysokości i object-fit: cover, więc mniejszy wariant zawsze byłby rozciągany.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', v1080, '-frames:v', '1', '-q:v', '3', poster]);
const posterMobile = path.join(OUT, 'hero-poster-mobile.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', vMob, '-frames:v', '1', '-q:v', '3', posterMobile]);
fs.rmSync(path.join(OUT, 'hero-poster-800.jpg'), { force: true });

// Czasy dla pasków ujęć: granica = środek przenikania; „clean” = środek pierwszej czystej klatki (cel przeskoku –
// środek klatki, żeby zaokrąglenie czasu w przeglądarce nie trafiło w ostatnią klatkę przenikania).
const timing = {
  duration: r3(total),
  fps,
  shots: clips.map(({ key, label }) => ({ key, label })),
  crossfade: XF,
  starts: [0, ...offF.slice(0, N - 1).map((o) => r3((o + durF / 2) / fps))],
  clean: [0, ...cleanF.map((f) => r3((f + 0.5) / fps))],
  loopFrom: r3((offF[N - 1] + durF / 2) / fps),
  src: { 1080: '/video/hero-1080.mp4', 720: '/video/hero-720.mp4', mobile: '/video/hero-mobile.mp4' },
  poster: '/video/hero-poster.jpg',
  posterMobile: '/video/hero-poster-mobile.jpg',
  mobileCrop: { x: MX, width: MW }, // wycinek pionowy w pikselach kadru 1920×1080
};
fs.writeFileSync(JSON_OUT, `${JSON.stringify(timing, null, 2)}\n`);

const kb = (f) => `${Math.round(fs.statSync(f).size / 1024)} KB`;
console.log(`film: ${total.toFixed(3)} s (${totalFrames} klatek) · 1080p ${kb(v1080)} · 720p ${kb(v720)} · telefon ${kb(vMob)} · plakat ${kb(poster)} / ${kb(posterMobile)}`);
console.log(`czasy ujęć → ${path.relative(ROOT, JSON_OUT)}:`, JSON.stringify({ starts: timing.starts, clean: timing.clean, loopFrom: timing.loopFrom }));
