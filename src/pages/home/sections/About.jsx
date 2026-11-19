// Sekcja „O nas” (#o-nas): tekst właścicielki HAR MEBLE, krótkie fakty i zachęta do rozmowy o projekcie.
// Tytuł inny niż hasło w hero („Doświadczenie, które widać w detalach”) i manifest („Udana zabudowa zaczyna się
// od rozmowy”) – strona się nie powtarza; wszystkie zdania akapitów pochodzą z tekstów właścicielki.
import { Link } from 'react-router-dom';
import { ArrowIcon, Img, MaskLines, RENDERS, Reveal } from '../ui.jsx';
import { COMPANY, ROUTES } from '../../../../shared/site.js';
import './about.css';

const FACTS = [
  { value: 'ok. 11 lat', label: 'doświadczenia w stolarstwie' },
  { value: '2 regiony', label: 'Śląsk i Wielkopolska' },
  { value: 'Meble na wymiar', label: 'dla klientów indywidualnych i firm' },
  { value: 'Usługi B2B', label: 'cięcie, oklejanie, nawiercanie, frezowanie, gięcie' },
];

export default function About() {
  return (
    <section id="o-nas" className="h-section h-about" aria-labelledby="h-about-title">
      <div className="h-container h-about__grid">
        <div className="h-about__intro">
          <Reveal as="p" className="h-eyebrow" y={12}>
            O nas
          </Reveal>
          <div id="h-about-title">
            <MaskLines as="h2" className="h-title h-about__title" lines={[`W ${COMPANY.brand}`, 'dbamy o całość']} />
          </div>
          <Reveal className="h-about__media" delay={120}>
            <Img
              src={RENDERS.kuchniaSkandi.src}
              alt={RENDERS.kuchniaSkandi.alt}
              frameClass="h-about__frame"
              className="h-about__img"
              sizes="(max-width: 900px) 92vw, 40vw"
            />
          </Reveal>
        </div>

        <div className="h-about__body">
          <Reveal as="p" className="h-about__lede">
            Od około 11&nbsp;lat zajmujemy się stolarstwem, łącząc wiedzę o&nbsp;materiałach z&nbsp;praktyką wykonania mebli na wymiar. Przez ten czas
            nauczyliśmy się, że udana zabudowa zaczyna się od rozmowy&nbsp;– o&nbsp;potrzebach, codziennych przyzwyczajeniach i&nbsp;przestrzeni,
            w&nbsp;której ma służyć.
          </Reveal>
          <Reveal as="p" className="h-about__text" delay={80}>
            W&nbsp;{COMPANY.brand} dbamy o&nbsp;całość: proporcje, dobór materiałów, funkcjonalność i&nbsp;staranne wykończenie. Lubimy naturalne
            faktury, przemyślane połączenia i&nbsp;detale, które nadają wnętrzom charakter. Drewno, fornir, szkło czy lustro traktujemy jako
            elementy spójnego projektu, dopasowanego do jego użytkowników.
          </Reveal>
          <Reveal as="p" className="h-about__text" delay={120}>
            Współpracujemy z&nbsp;klientami indywidualnymi oraz firmami. Obok mebli na wymiar rozwijamy usługi stolarskie obejmujące cięcie,
            frezowanie i&nbsp;gięcie. W&nbsp;każdej realizacji stawiamy na jasne ustalenia i&nbsp;uważność na szczegóły.
          </Reveal>

          <dl className="h-about__facts">
            {FACTS.map((f, i) => (
              <Reveal key={f.value} className="h-about__fact" delay={i * 70} y={16}>
                <dt className="h-about__fact-value">{f.value}</dt>
                <dd className="h-about__fact-label">{f.label}</dd>
              </Reveal>
            ))}
          </dl>

          <Reveal className="h-about__cta" delay={120} y={16}>
            <div className="h-about__cta-text">
              <p className="h-about__cta-title">Chcesz porozmawiać o&nbsp;swoim projekcie?</p>
              <p className="h-about__cta-lead">Opowiedz nam, czego potrzebujesz&nbsp;– wspólnie poszukamy odpowiednich rozwiązań.</p>
            </div>
            <div className="h-about__cta-actions">
              <Link className="h-btn" to={ROUTES.quote}>
                Zapytaj o wycenę
                <ArrowIcon />
              </Link>
              <Link className="h-btn h-btn--outline" to={ROUTES.contact}>
                Kontakt
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
