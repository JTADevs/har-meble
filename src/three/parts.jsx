import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { DenoiseMaterial, WebGLPathTracer } from 'three-gpu-pathtracer';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { STATIC } from './materials.js';
import { RoomEnvironmentMap } from './geometry.jsx';

// Ciężki moduł konfiguratora: płótno z efektami, kamera, tryb fotorealistyczny (path tracing).
// Klocki geometrii są w lekkim ./geometry.jsx – re-eksport poniżej, żeby stare importy działały.
export { Box, Door, Drawer, Flap, FrontPanel, Handle, Outline, RoomEnvironmentMap, handleSpec } from './geometry.jsx';

let rectAreaReady = false;
function ensureRectAreaLights() {
  if (!rectAreaReady) {
    RectAreaLightUniformsLib.init(); // tablice LTC dla świateł powierzchniowych – tylko gdy naprawdę potrzebne
    rectAreaReady = true;
  }
}

// Ustawia kamerę; przy wąskim widoku odsuwa ją, żeby całe meble zmieściły się w kadrze.
function CameraRig({ position, target, resetKey }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const k = Math.min(1.8, Math.max(1, 1.15 / aspect));
    const t = new THREE.Vector3(...target);
    camera.position.copy(new THREE.Vector3(...position).sub(t).multiplyScalar(k).add(t));
    if (controls) {
      controls.target.set(...target);
      controls.update();
    } else {
      camera.lookAt(...target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, controls, camera, aspect > 1.3 ? 1.3 : Math.round(aspect * 10)]);
  return null;
}

// Odbicia otoczenia: wnętrze „studyjne” generowane lokalnie (bez pobierania HDRI).
// Dla podglądu – PMREM, dla path tracera – cube mapa tego samego pomieszczenia.

// Tryb fotorealistyczny: path tracing (światło odbite, miękkie cienie, odbicia) liczony progresywnie.
function PathTracer({ cubeRef, onProgress, maxSamples = 300 }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  const ptRef = useRef(null);
  const denoiseRef = useRef(null);
  const lastRef = useRef(-1);
  useEffect(() => {
    const prevEnv = scene.environment;
    const prevEnvIntensity = scene.environmentIntensity;
    const prevTone = gl.toneMapping;
    const prevExposure = gl.toneMappingExposure;
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 0.8; // światło odbite rozjaśnia scenę – kompensujemy ekspozycję
    if (cubeRef.current) scene.environment = cubeRef.current;
    scene.environmentIntensity = 0.3;
    ensureRectAreaLights();
    // miękkie światło sufitowe nad meblami
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const area = new THREE.RectAreaLight('#fff1dc', 3, Math.min(3.5, box.max.x - box.min.x), 1.4);
    area.position.set(c.x, 2.55, Math.max(0.9, c.z * 0.6));
    area.lookAt(c.x, 0, Math.max(0.9, c.z * 0.6));
    scene.add(area);
    // Listwy LED to bardzo małe emitery – w path tracingu dają dużo szumu. Na czas renderu przyciemniamy je
    // (listwa nadal wygląda na jasną, ale prawie nie oświetla sceny).
    const prevLed = STATIC.led.emissiveIntensity;
    STATIC.led.emissiveIntensity = 0.5;
    const pt = new WebGLPathTracer(gl);
    pt.tiles.set(2, 2);
    pt.bounces = 5;
    pt.filterGlossyFactor = 0.5;
    pt.minSamples = 1;
    pt.renderDelay = 0;
    pt.fadeDuration = 0;
    pt.textureSize.set(1024, 1024);
    // odszumianie („smart denoise” z krawędziami) przy wyświetlaniu – płaskie ściany bez ziarna, ostre krawędzie mebli
    const denoise = new FullScreenQuad(
      new DenoiseMaterial({ map: null, blending: THREE.NoBlending, premultipliedAlpha: gl.getContextAttributes().premultipliedAlpha }),
    );
    denoise.material.sigma = 4;
    denoise.material.kSigma = 1.0;
    denoise.material.threshold = 0.2;
    denoiseRef.current = denoise;
    pt.renderToCanvasCallback = (target, renderer) => {
      denoise.material.map = target.texture;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      denoise.render(renderer);
      renderer.autoClear = autoClear;
    };
    pt.setScene(scene, camera);
    ptRef.current = pt;
    return () => {
      ptRef.current = null;
      // WebGLPathTracer.dispose() w wersji 0.0.23 ma literówkę (_renderQuad) – sprzątamy ręcznie
      pt._quad?.material?.dispose();
      pt._quad?.dispose();
      pt._pathTracer?.dispose();
      pt._lowResPathTracer?.dispose();
      denoise.material.dispose();
      denoise.dispose();
      scene.remove(area);
      area.dispose?.();
      STATIC.led.emissiveIntensity = prevLed;
      scene.environment = prevEnv;
      scene.environmentIntensity = prevEnvIntensity;
      gl.toneMapping = prevTone;
      gl.toneMappingExposure = prevExposure;
    };
  }, [gl, scene, camera, cubeRef]);
  useFrame(() => {
    const pt = ptRef.current;
    if (!pt || pt.samples >= maxSamples) return; // obraz zostaje na płótnie (preserveDrawingBuffer)
    // próg krawędzi proporcjonalny do poziomu szumu (~1/√próbek): na starcie mocno wygładza, potem coraz delikatniej
    if (denoiseRef.current) denoiseRef.current.material.threshold = Math.min(0.2, Math.max(0.045, 0.62 / Math.sqrt(Math.max(1, pt.samples))));
    pt.renderSample();
    const n = Math.floor(pt.samples);
    if (n !== lastRef.current && (n % 4 === 0 || n < 4)) {
      lastRef.current = n;
      onProgress?.(n);
    }
  }, 1);
  return null;
}

// Podgląd na żywo: cienie kontaktowe (ambient occlusion), lekki bloom LED, tone mapping „Neutral”
// (wierne kolory dekorów – ważne, żeby klient widział prawdziwy odcień frontu).
export function Effects({ ao = true, vignette = true }) {
  return (
    <EffectComposer multisampling={4}>
      {ao ? <N8AO aoRadius={0.45} distanceFalloff={0.6} intensity={3} quality="medium" halfRes /> : <></>}
      <Bloom intensity={0.35} luminanceThreshold={1.1} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {vignette ? <Vignette offset={0.3} darkness={0.4} /> : <></>}
    </EffectComposer>
  );
}

// Wspólna scena: światło, odbicia, efekty, kamera, sterowanie i tryb fotorealistyczny.
// interactive=false – bez obracania myszą (np. sekcje strony głównej); frameloop='never' wstrzymuje render
// (np. gdy płótno jest poza ekranem); photoSamples – liczba próbek w trybie fotorealistycznym.
export function SceneShell({
  children,
  camera,
  target,
  resetKey,
  onMissed,
  photo = false,
  onPhotoProgress,
  photoSamples = 300,
  glRef,
  interactive = true,
  background = '#e7e2da',
  frameloop = 'always',
  dpr = [1, 2],
  effects = true,
  fov = 40,
}) {
  const cubeRef = useRef(null);
  return (
    <Canvas
      shadows="soft"
      dpr={dpr}
      frameloop={frameloop}
      camera={{ position: camera, fov: fov ?? 40, near: 0.05, far: 60 }}
      onPointerMissed={onMissed}
      gl={{ preserveDrawingBuffer: true, antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1;
        if (glRef) glRef.current = gl;
      }}
    >
      <color attach="background" args={[background]} />
      <RoomEnvironmentMap cubeRef={cubeRef} />
      <hemisphereLight args={['#fff8ee', '#a8977e', 0.25]} />
      <directionalLight
        castShadow
        position={[3.2, 5, 4.2]}
        intensity={2.2}
        color="#fff1df"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
      />
      <directionalLight position={[-4, 3, 2]} intensity={0.3} color="#e3ebfb" />
      {children}
      {interactive && (
        <OrbitControls makeDefault enabled={!photo} enableDamping minDistance={0.8} maxDistance={12} maxPolarAngle={Math.PI / 2 - 0.03} />
      )}
      <CameraRig position={camera} target={target} resetKey={resetKey} />
      {photo ? <PathTracer cubeRef={cubeRef} onProgress={onPhotoProgress} maxSamples={photoSamples} /> : effects ? <Effects /> : null}
    </Canvas>
  );
}
