// Wspólny układ podstron wizytówki (Usługi B2B, Wycena, Kontakt, Polityka prywatności): ten sam system projektowy
// co strona główna (home.css – tokeny, typografia, przyciski, animacje), nagłówek strony z jedynym h1 i stopka.
// Nawigacja (HomeNav) pływa nad treścią – nagłówek zaczyna się pod nią. Treść podstrony = children (sekcje).
import { useEffect, useState } from 'react';
import '../home/home.css';
import './site.css';
import { MaskLines, Reveal } from '../home/ui.jsx';
import Footer from '../home/sections/Footer.jsx';

/**
 * eyebrow – krótki nadtytuł; title – string albo tablica linii (animowane spod maski, czytniki dostają całość);
 * lead – akapit pod tytułem; actions – przyciski; aside – prawa kolumna nagłówka (np. karta z kontaktem);
 * tone – 'light' (domyślnie) albo 'dark' (ciemny nagłówek jak sekcje kategorii i jakości).
 */
export default function PageShell({ eyebrow, title, lead, actions, aside, tone = 'light', children }) {
  const [intro, setIntro] = useState(false);
  const lines = Array.isArray(title) ? title : [title];

  // animacja tytułu po pierwszym malowaniu (jak w hero) – bez czekania na przewinięcie
  useEffect(() => {
    const id = requestAnimationFrame(() => setIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`h-page s-page s-page--${tone}`}>
      <main id="tresc">
        <header className={`s-head${aside ? ' s-head--aside' : ''}`}>
          <div className="h-container s-head__inner">
            <div className="s-head__text">
              {eyebrow && (
                <Reveal as="p" className="h-eyebrow s-head__eyebrow" y={12}>
                  {eyebrow}
                </Reveal>
              )}
              <MaskLines as="h1" className="h-display s-head__title" lines={lines} play={intro} delay={120} stagger={110} />
              {lead && (
                <Reveal as="p" className="h-lead s-head__lead" delay={220}>
                  {lead}
                </Reveal>
              )}
              {actions && (
                <Reveal className="s-head__actions" delay={300} y={16}>
                  {actions}
                </Reveal>
              )}
            </div>
            {aside && (
              <Reveal className="s-head__aside" delay={260} y={20}>
                {aside}
              </Reveal>
            )}
          </div>
        </header>
        {children}
      </main>
      <Footer />
    </div>
  );
}
