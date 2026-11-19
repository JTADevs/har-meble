// Sekcja końcowa (#kontakt): ciemna karta z zachętą do rozmowy o projekcie (tekst właścicielki), przyciskiem do
// formularza wyceny, danymi kontaktowymi obu oddziałów i „stemplem”, który obraca się razem z przewijaniem strony
// (brak obrotu przy reduced motion).
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, LINKS, MaskLines, Reveal, useInView, useReducedMotion, useScrollProgress } from '../ui.jsx';
import { COMPANY, FEATURES, ROUTES } from '../../../../shared/site.js';
import './finalcta.css';

// Dane kontaktowe z shared/site.js (teksty właścicielki HAR MEBLE) – jedno źródło dla stopki, kontaktu i formularza.
export const CONTACT = {
  phone: COMPANY.phone,
  phoneHref: COMPANY.phoneHref,
  email: COMPANY.email,
  street: COMPANY.locations[0].street,
  city: `${COMPANY.locations[0].postal} ${COMPANY.locations[0].city}`,
  hours: COMPANY.hours,
};

// Tekst na okręgu (r = 74 → obwód ≈ 465 j.). Na końcu twarda spacja – zwykła zostałaby obcięta,
// a potrzebny jest odstęp na „szwie” między ostatnią kropką a pierwszą literą.
const STAMP_TEXT = FEATURES.configurator ? 'CENA ORIENTACYJNA NA ŻYWO • PROJEKT 3D •\u00A0' : 'MEBLE NA WYMIAR • USŁUGI B2B • HAR MEBLE •\u00A0';

// Obrót pierścienia na cały przejazd karty przez ekran (od wjazdu dołem do wyjazdu górą). Ruch tylko razem
// z przewijaniem: stempel nie kręci się sam w nieskończoność obok treści (WCAG 2.2.2 – bez przycisku pauzy).
const STAMP_TURN = 220; // stopnie

function Stamp() {
  return (
    <span className="h-cta-stamp" aria-hidden="true">
      <svg className="h-cta-stamp-ring" viewBox="0 0 200 200" focusable="false">
        <defs>
          <path id="h-cta-stamp-path" d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0" />
        </defs>
        <text className="h-cta-stamp-text">
          <textPath href="#h-cta-stamp-path" textLength="464" lengthAdjust="spacing">
            {STAMP_TEXT}
          </textPath>
        </text>
      </svg>
      <svg className="h-cta-stamp-core" viewBox="0 0 200 200" focusable="false">
        <circle className="h-cta-stamp-rule" cx="100" cy="100" r="62" />
        <circle className="h-cta-stamp-disc" cx="100" cy="100" r="40" />
        {/* sześcian – „projekt 3D” */}
        <path className="h-cta-stamp-cube" d="M100 80l17.3 10v20L100 120l-17.3-10V90zM82.7 90 100 100l17.3-10M100 100v20" />
      </svg>
    </span>
  );
}

export default function FinalCta() {
  const cardRef = useRef(null);
  const turn = useRef(NaN);
  const shown = useInView(cardRef, { threshold: 0.2 });
  const reduced = useReducedMotion();

  // Kąt stempla z postępu przewijania (rAF, zmienna CSS na karcie – bez re-renderów React). Zapis tylko przy zmianie:
  // poza ekranem postęp stoi na 0 albo 1.
  useScrollProgress(cardRef, (progress) => {
    const card = cardRef.current;
    if (!card || reduced) return; // przy ograniczonym ruchu CSS i tak wyłącza obrót
    const deg = Math.round(progress * STAMP_TURN * 10) / 10;
    if (deg === turn.current) return;
    turn.current = deg;
    card.style.setProperty('--h-cta-turn', `${deg}deg`);
  });

  return (
    <section id="kontakt" className="h-section h-cta-section" aria-labelledby="h-cta-title-1 h-cta-title-2">
      <div className="h-container">
        <div ref={cardRef} className={`h-cta-card${shown ? ' is-in' : ''}`}>
          <Stamp />

          <Reveal as="span" className="h-eyebrow h-cta-eyebrow" y={12}>
            Pierwszy krok
          </Reveal>
          {/* tytuł i lead z tekstów właścicielki („Chcesz porozmawiać o swoim projekcie? Opowiedz nam…”) */}
          <MaskLines
            as="h2"
            className="h-display h-cta-title"
            lines={[
              <span id="h-cta-title-1" key="1">
                Chcesz porozmawiać{' '}
              </span>,
              <span id="h-cta-title-2" key="2">
                o&nbsp;swoim projekcie?
              </span>,
            ]}
          />

          <div className="h-cta-body">
            <div className="h-cta-main">
              <Reveal as="p" className="h-lead h-cta-lead" delay={140}>
                Opowiedz nam, czego potrzebujesz&nbsp;– wspólnie poszukamy odpowiednich rozwiązań. Prześlij opis projektu,
                orientacyjne wymiary oraz zdjęcia lub inspiracje i&nbsp;zaznacz, czy interesują Cię meble na wymiar, czy usługi
                B2B.
              </Reveal>
              {/* strzałka tylko w przycisku głównym – ta sama konwencja co w hero i banerze */}
              <Reveal className="h-cta-actions" delay={220} y={16}>
                {FEATURES.configurator ? (
                  <>
                    <Link className="h-btn h-btn--light" to={LINKS.kuchnia}>
                      Zaprojektuj kuchnię
                      <ArrowIcon />
                    </Link>
                    <Link className="h-btn h-btn--outline-light" to={ROUTES.quote}>
                      Zapytaj o wycenę
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="h-btn h-btn--light" to={ROUTES.quote}>
                      Zapytaj o wycenę
                      <ArrowIcon />
                    </Link>
                    <Link className="h-btn h-btn--outline-light" to={ROUTES.quoteB2B}>
                      Zapytanie B2B
                    </Link>
                  </>
                )}
              </Reveal>
            </div>

            <Reveal className="h-cta-contact" delay={300} y={16}>
              <p className="h-cta-contact-title">Wolisz zadzwonić lub napisać?</p>
              <address className="h-cta-address">
                <dl className="h-cta-list">
                  <div className="h-cta-row">
                    <dt className="h-cta-label">Telefon</dt>
                    <dd className="h-cta-value">
                      <a className="h-cta-link" href={COMPANY.phoneHref}>
                        {COMPANY.phone}
                      </a>
                      <br />
                      <span className="h-cta-note">Godziny kontaktu: {COMPANY.hours}</span>
                    </dd>
                  </div>
                  <div className="h-cta-row">
                    <dt className="h-cta-label">E-mail</dt>
                    <dd className="h-cta-value">
                      <a className="h-cta-link" href={`mailto:${COMPANY.email}`}>
                        {COMPANY.email}
                      </a>
                    </dd>
                  </div>
                  <div className="h-cta-row">
                    <dt className="h-cta-label">B2B</dt>
                    <dd className="h-cta-value">
                      <a className="h-cta-link" href={`mailto:${COMPANY.emailB2B}`}>
                        {COMPANY.emailB2B}
                      </a>
                    </dd>
                  </div>
                  {COMPANY.locations.map((loc) => (
                    <div className="h-cta-row" key={loc.id}>
                      <dt className="h-cta-label">{loc.region}</dt>
                      <dd className="h-cta-value">
                        {loc.street}
                        <br />
                        {loc.postal} {loc.city}
                      </dd>
                    </div>
                  ))}
                </dl>
              </address>
              <p className="h-cta-visit">{COMPANY.visitNote}</p>
              <Link className="h-cta-link h-cta-more" to={ROUTES.contact}>
                Wszystkie dane kontaktowe i&nbsp;do faktury
                <ArrowIcon size={14} />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
