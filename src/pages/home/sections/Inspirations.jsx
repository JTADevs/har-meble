import './inspirations.css';
import { Link } from 'react-router-dom';
import { DECORS } from '../../../../shared/catalog.js';
import Carousel from './Carousel.jsx';
import { ArrowIcon, Img, LINKS, RENDERS, SectionHead } from '../ui.jsx';
import { FEATURES, ROUTES } from '../../../../shared/site.js';

// Kolory próbek: dekory z katalogu + okucia i lustro (nie są dekorami, więc mają własne gradienty).
const decor = (id) => DECORS[id]?.hex ?? 'transparent';
const FINISH = {
  mosiadz: 'linear-gradient(135deg, #e6cd94 0%, #b58c47 55%, #8e6a2e 100%)',
  czarny: decor('czarny'),
  alu: 'linear-gradient(135deg, #f2f3f4 0%, #bcc0c5 58%, #9da2a8 100%)',
  lustro: 'linear-gradient(135deg, #f5f8f9 0%, #c3ccd1 48%, #eef2f4 100%)',
};

// Style = gotowe zestawy konfiguratora (STYLE_PRESETS w shared/catalog.js). Link otwiera nowy projekt
// z tym zestawem: ?zestaw=<id zestawu>, a w szafie także ?drzwi=uchylne (obsługuje Configurator.jsx).
// „Dąb bielony – szafa” to domyślny projekt konfiguratora szaf (shared/wardrobe.js) – link bez parametrów.
const preset = (path, zestaw, extra = '') => `${path}?zestaw=${zestaw}${extra}`;

const STYLES = [
  {
    id: 'szalwia',
    name: 'Szałwia i\u00a0dąb',
    kind: 'Kuchnia',
    image: RENDERS.kuchniaSzalwia,
    to: preset(LINKS.kuchnia, 'szalwia'),
    materials: 'MDF mat szałwia · front ramowy · blat dąb naturalny · gałki mosiężne',
    swatches: [decor('szalwia'), decor('dab_naturalny'), FINISH.mosiadz],
  },
  {
    id: 'orzech',
    name: 'Ciepły orzech',
    kind: 'Kuchnia',
    image: RENDERS.kuchniaOrzech,
    to: preset(LINKS.kuchnia, 'orzech'),
    materials: 'Fornir orzech · front ryflowany · blat kwarc biały · czarne listwy',
    swatches: [decor('orzech'), decor('kwarc_bialy'), FINISH.czarny],
  },
  {
    id: 'butelkowa',
    name: 'Butelkowa zieleń',
    kind: 'Kuchnia',
    image: RENDERS.kuchniaZielen,
    to: preset(LINKS.kuchnia, 'butelkowa'),
    materials: 'MDF mat zieleń butelkowa · front ramowy · blat kwarcowy w\u00a0dekorze marmuru białego · gałki mosiężne',
    swatches: [decor('zielen'), decor('marmur_bialy'), FINISH.mosiadz],
  },
  {
    id: 'grafit',
    name: 'Nowoczesny grafit',
    kind: 'Kuchnia',
    image: RENDERS.kuchniaGrafit,
    to: preset(LINKS.kuchnia, 'grafit'),
    materials: 'MDF mat grafit · front gładki · blat beton jasny · bez uchwytów',
    swatches: [decor('grafit'), decor('beton_jasny')],
  },
  {
    id: 'skandynawski',
    name: 'Skandynawski',
    kind: 'Kuchnia',
    image: RENDERS.kuchniaSkandi,
    to: preset(LINKS.kuchnia, 'skandynawski'),
    materials: 'MDF mat biały · front gładki · blat dąb bielony · listwy aluminiowe',
    swatches: [decor('bialy'), decor('dab_bielony'), FINISH.alu],
  },
  {
    // nazwa jak zestaw w konfiguratorze („Szałwia i dąb”), z dopiskiem odróżniającym od karty kuchni
    id: 'szafa-szalwia',
    name: 'Szałwia i\u00a0dąb\u00a0– szafa',
    kind: 'Szafa',
    image: RENDERS.szafaSzalwia,
    to: preset(LINKS.szafa, 'szalwia', '&drzwi=uchylne'),
    materials: 'Drzwi uchylne · MDF mat szałwia · front ramowy · gałki mosiężne',
    swatches: [decor('szalwia'), FINISH.mosiadz],
  },
  {
    id: 'szafa-dab',
    name: 'Dąb bielony\u00a0– szafa',
    kind: 'Szafa',
    image: RENDERS.szafaDab,
    to: LINKS.szafa,
    materials: 'Drzwi przesuwne · płyta dąb bielony · lustro na co drugim skrzydle',
    swatches: [decor('dab_bielony'), FINISH.lustro],
  },
];

// Karta: clamp(300px, 44vw, 640px), zdjęcie 16:10 jak render – szerokość obrazu = szerokość karty.
const CARD_SIZES = '(max-width: 682px) 300px, (max-width: 1455px) 44vw, 640px';

// Cała karta jest klikalna (rozciągnięty link); próbki kolorów są dekoracją – materiały opisuje tekst.
// W wizytówce karta otwiera formularz wyceny z nazwą inspiracji i rodzajem mebla (bez konfiguratora).
const quoteLink = (name, kind) =>
  `${ROUTES.quote}?mebel=${encodeURIComponent(kind === 'Garderoba' ? 'Garderoba' : kind === 'Szafa' ? 'Szafa' : 'Kuchnia')}&inspiracja=${encodeURIComponent(name.replace(/\u00a0/g, ' '))}`;

function StyleCard({ name, kind, image, to, materials, swatches }) {
  return (
    <div className="h-insp-card">
      <div className="h-insp-card__media">
        <Img src={image.src} alt={image.alt} frameClass="h-insp-card__frame" sizes={CARD_SIZES} />
        <span className="h-insp-card__tag">{kind}</span>
      </div>
      <div className="h-insp-card__body">
        <div className="h-insp-card__row">
          <h3 className="h-insp-card__title">{name}</h3>
          <span className="h-insp-card__swatches" aria-hidden="true">
            {swatches.map((bg, i) => (
              <span key={i} className="h-insp-card__swatch" style={{ '--h-insp-sw': bg }} />
            ))}
          </span>
        </div>
        <p className="h-insp-card__materials">{materials}</p>
        <Link className="h-insp-card__cta" to={FEATURES.configurator ? to : quoteLink(name, kind)}>
          <span className="h-link">
            {FEATURES.configurator ? 'Otwórz konfigurator' : 'Zapytaj o podobny projekt'}
            <ArrowIcon size={15} />
          </span>
          <span className="h-visually-hidden"> – {name}</span>
        </Link>
      </div>
    </div>
  );
}

export default function Inspirations() {
  return (
    // tło --h-bg-2 (h-section--alt) przełamuje ciąg jasnych sekcji; obwódki próbek dopasowuje inspirations.css
    <section id="inspiracje" className="h-section h-section--alt h-insp">
      <Carousel
        label="Gotowe style"
        renderControls={(controls) => (
          <div className="h-container">
            <SectionHead
              eyebrow="Inspiracje"
              title={FEATURES.configurator ? ['Gotowe style ', 'z\u00a0naszego konfiguratora'] : ['Style, które ', 'zrobimy na wymiar']}
              lead={
                FEATURES.configurator
                  ? 'Każdy z\u00a0tych projektów zaczniesz od gotowego zestawu i\u00a0zmienisz po swojemu.'
                  : 'Zestawienia kolorów i\u00a0materiałów na początek rozmowy. Wybierz bliski Ci styl, a\u00a0dopasujemy go do Twojego wnętrza.'
              }
              action={controls}
            />
          </div>
        )}
      >
        {STYLES.map((s) => (
          <StyleCard key={s.id} {...s} />
        ))}
      </Carousel>
    </section>
  );
}
