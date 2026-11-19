import './categories.css';
import { Link } from 'react-router-dom';
import Carousel from './Carousel.jsx';
import { ArrowIcon, Img, LINKS, RENDERS, SectionHead } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';

// Kategorie mebli (ciemna sekcja #meble z karuzelą pionowych kart).
// mebel – rodzaj z FURNITURE_TYPES (shared/site.js): karta otwiera formularz wyceny z tym rodzajem.
// cfg – trasa konfiguratora 3D, używana tylko w pełnej wersji strony (karta dostaje wtedy plakietkę).
// pos – opcjonalne object-position kadru 4:5 wyciętego z renderu 16:10 (domyślnie środek). Kuchnie mają
// własne kadry, żeby nie powtarzać 1:1 ujęć z Inspiracji. W tekstach twarde spacje (\u00a0)
// po jednoliterowych słowach i przed półpauzą.
const CATEGORIES = [
  {
    id: 'kuchnie',
    title: 'Kuchnie',
    text: 'Układ szafek, fronty, blat i\u00a0wyposażenie dobrane do pomieszczenia i\u00a0codziennych przyzwyczajeń.',
    image: RENDERS.kuchniaSzalwia,
    pos: '0% 50%',
    mebel: 'Kuchnia',
    cfg: LINKS.kuchnia,
  },
  {
    id: 'szafy-przesuwne',
    title: 'Szafy przesuwne',
    text: 'Dopasowane do wnęki, z\u00a0lustrem lub bez\u00a0– z\u00a0wnętrzem zaplanowanym pod to, co chcesz przechowywać.',
    image: RENDERS.szafaDab,
    mebel: 'Szafa',
    cfg: LINKS.szafa,
  },
  {
    id: 'szafy-uchylne',
    title: 'Szafy z\u00a0drzwiami uchylnymi',
    text: 'Fronty gładkie, ramowe albo ryflowane\u00a0– z\u00a0listwami, gałkami lub bez uchwytów.',
    image: RENDERS.szafaSzalwia,
    mebel: 'Szafa',
    cfg: LINKS.szafa,
  },
  {
    id: 'garderoby',
    title: 'Garderoby',
    text: 'Drążki, półki i\u00a0szuflady dokładnie tam, gdzie ich potrzebujesz.',
    image: RENDERS.garderoba,
    mebel: 'Garderoba',
    cfg: LINKS.szafa,
  },
  {
    id: 'fornir-szklo-lustro',
    title: 'Drewno, fornir, szkło i\u00a0lustro',
    // zdanie z tekstów właścicielki („O nas”)
    text: 'Traktujemy je jako elementy spójnego projektu, dopasowanego do jego użytkowników.',
    image: RENDERS.kuchniaOrzech,
    pos: '30% 50%',
    mebel: 'Inne',
  },
  {
    id: 'kuchnie-nowoczesne',
    title: 'Kuchnie nowoczesne',
    text: 'Gładkie fronty bez uchwytów w\u00a0zestawieniu z\u00a0grafitem, betonem i\u00a0kamieniem.',
    image: RENDERS.kuchniaGrafit,
    pos: '80% 50%',
    mebel: 'Kuchnia',
    cfg: LINKS.kuchnia,
  },
  {
    id: 'na-zamowienie',
    title: 'Meble na indywidualne zamówienie',
    text: 'Regał, komoda czy szafka RTV\u00a0– opisz pomysł, a\u00a0zaprojektujemy go razem z\u00a0Tobą.',
    image: RENDERS.detal,
    mebel: 'Komoda, regał lub szafka RTV',
  },
];

// Karta 4:5 przycina render 16:10 (object-fit: cover), więc obraz ma w układzie 2× szerokość karty
// (karta: clamp(260px, 26vw, 360px)) – sizes musi to uwzględniać, inaczej przeglądarka weźmie za mały wariant.
const CARD_SIZES = '(max-width: 1000px) 520px, (max-width: 1385px) 52vw, 720px';

function CubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M8 1.75 13.5 4.9v6.2L8 14.25 2.5 11.1V4.9L8 1.75ZM2.5 4.9 8 8.05l5.5-3.15M8 8.05v6.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Cała karta jest klikalna (rozciągnięty link), a nazwa linku pozostaje krótka i jednoznaczna.
function CategoryCard({ title, text, image, mebel, cfg, pos }) {
  const inConfigurator = FEATURES.configurator && Boolean(cfg);
  const to = inConfigurator ? cfg : `${ROUTES.quote}?mebel=${encodeURIComponent(mebel)}`;
  return (
    <div className="h-cat-card">
      <div className="h-cat-card__media">
        <Img
          src={image.src}
          alt={image.alt}
          frameClass="h-cat-card__frame"
          className="h-cat-card__img"
          sizes={CARD_SIZES}
          style={pos ? { '--h-cat-pos': pos } : undefined}
        />
      </div>
      {inConfigurator && (
        <span className="h-cat-card__badge">
          <CubeIcon />
          Konfigurator 3D
        </span>
      )}
      <div className="h-cat-card__body">
        <h3 className="h-cat-card__title">{title}</h3>
        <p className="h-cat-card__text">{text}</p>
        <Link className="h-cat-card__cta" to={to}>
          <span className="h-link">
            {inConfigurator ? 'Zaprojektuj w 3D' : 'Zapytaj o wycenę'}
            <ArrowIcon size={15} />
          </span>
          <span className="h-visually-hidden"> – {title}</span>
        </Link>
      </div>
    </div>
  );
}

export default function Categories() {
  return (
    <section id="meble" className="h-section h-section--dark h-cat">
      <Carousel
        label="Kategorie mebli"
        theme="dark"
        renderControls={(controls) => (
          <div className="h-container">
            <SectionHead eyebrow="Meble na wymiar" title={['Kuchnie, szafy, garderoby\u00a0– ', 'każda na wymiar']} action={controls} />
          </div>
        )}
      >
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} {...c} />
        ))}
      </Carousel>
    </section>
  );
}
