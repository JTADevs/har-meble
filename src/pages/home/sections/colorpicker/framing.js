// Kadrowanie mebla w prostokącie karty (czysta matematyka, bez zależności).
//
// Kamera patrzy na środek bryły pod stałym kątem (pitch). Szukamy najmniejszej odległości, przy której
// wszystkie narożniki bryły – w całym zakresie obrotu (spoczynek ± range) – mieszczą się w kadrze
// z marginesami, a środek podstawy (punkt na podłodze) wypada zawsze na tej samej wysokości kadru
// (anchor, w NDC). Pionowe przesunięcie kadru robimy jak obiektyw shift (setViewOffset), więc linie
// pionowe mebla się nie przechylają, a meble w trzech kartach „stoją” na jednej linii.

const DEG = Math.PI / 180;

export function solveFraming(frame, aspect) {
  const {
    W, // szerokość, głębokość, wysokość bryły [m] (podstawa wyśrodkowana w 0,0,0)
    D,
    H,
    pitch = 8, // nachylenie kamery w dół [°]
    fov = 24, // pionowe pole widzenia [°] – długa ogniskowa, mało zniekształceń
    yaw = 0, // obrót w spoczynku [°]
    range = 30, // zakres obrotu wokół spoczynku [°] (kołysanie + przeciąganie)
    anchor = -0.62, // wysokość środka podstawy w kadrze (NDC: -1 dół, 1 góra)
    top = 0.86,
    bottom = -0.92,
    side = 0.84,
  } = frame;
  const tanV = Math.tan((fov * DEG) / 2);
  const tanH = tanV * aspect;
  const phi = pitch * DEG;
  const sp = Math.sin(phi);
  const cp = Math.cos(phi);
  const aimY = H / 2;

  // narożniki bryły dla kilku kątów z zakresu obrotu (+1,5% zapasu na „przysiad”)
  const w = (W * 1.015) / 2;
  const d = (D * 1.015) / 2;
  const h = H * 1.01;
  const pts = [];
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const a = (yaw - range + (2 * range * k) / N) * DEG;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const x of [-w, w]) {
      for (const z of [-d, d]) {
        const xr = x * c + z * s;
        const zr = -x * s + z * c;
        pts.push(xr, 0, zr, xr, h, zr);
      }
    }
  }

  // rzut punktu (x, y, z) dla kamery w odległości dist od punktu celowania (0, aimY, 0)
  const q = [0, 0, 0];
  const project = (x, y, z, dist) => {
    const py = y - aimY;
    const depth = dist - (py * sp + z * cp);
    q[0] = x / (depth * tanH);
    q[1] = (py * cp - z * sp) / (depth * tanV);
    q[2] = depth;
  };

  const fits = (dist) => {
    project(0, 0, 0, dist);
    if (q[2] <= 0.05) return false;
    const shift = anchor - q[1];
    for (let i = 0; i < pts.length; i += 3) {
      project(pts[i], pts[i + 1], pts[i + 2], dist);
      if (q[2] <= 0.05) return false;
      const y = q[1] + shift;
      if (y > top || y < bottom || Math.abs(q[0]) > side) return false;
    }
    return true;
  };

  // im dalej kamera, tym mniejszy mebel – bisekcja po odległości
  let lo = 0.2;
  let hi = 80;
  for (let i = 0; i < 36; i++) {
    const mid = 0.5 * (lo + hi);
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  project(0, 0, 0, hi);
  return { distance: hi, shift: anchor - q[1], aimY, phi, fov };
}

// Ustawia kamerę perspektywiczną three.js dla prostokąta w×h (px CSS).
export function fitCamera(camera, frame, w, h) {
  const f = solveFraming(frame, w / h);
  camera.fov = f.fov;
  camera.near = 0.1;
  camera.far = f.distance + 12;
  camera.position.set(0, f.aimY + f.distance * Math.sin(f.phi), f.distance * Math.cos(f.phi));
  camera.lookAt(0, f.aimY, 0);
  // przesunięcie kadru w pionie o f.shift (NDC); setViewOffset ustawia też aspect i macierz rzutowania
  camera.setViewOffset(w, h, 0, (f.shift * h) / 2, w, h);
}
