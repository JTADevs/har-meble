import { Component } from 'react';
import './home.css';
import HeroSection from './HeroSection.jsx';
import Statement from './sections/Statement.jsx';
import Categories from './sections/Categories.jsx';
import TrustBar from './sections/TrustBar.jsx';
import About from './sections/About.jsx';
import ColorPicker from './sections/ColorPicker.jsx';
import PromoBanner from './sections/PromoBanner.jsx';
import HowItWorks from './sections/HowItWorks.jsx';
import DecorMarquee from './sections/DecorMarquee.jsx';
import Inspirations from './sections/Inspirations.jsx';
import Quality from './sections/Quality.jsx';
import Faq from './sections/Faq.jsx';
import FinalCta from './sections/FinalCta.jsx';
import Footer from './sections/Footer.jsx';

// Błąd jednej sekcji nie kładzie całej strony: sekcja znika (błąd w konsoli), reszta działa dalej.
class SectionBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(`Sekcja „${this.props.name}” strony głównej wyłączona:`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SECTIONS = [
  ['Statement', Statement],
  ['Categories', Categories],
  ['TrustBar', TrustBar],
  ['About', About],
  ['ColorPicker', ColorPicker],
  ['PromoBanner', PromoBanner],
  ['HowItWorks', HowItWorks],
  ['DecorMarquee', DecorMarquee],
  ['Inspirations', Inspirations],
  ['Quality', Quality],
  ['Faq', Faq],
  ['FinalCta', FinalCta],
];

// Strona główna HAR MEBLE (wizytówka): film w hero + sekcje odsłaniane przy przewijaniu.
// <main id="tresc"> (cel linku „Przejdź do treści” w HomeNav) zaczyna się od hero z jedynym h1 i głównymi
// przyciskami; #start to treść pod filmem – cel wskaźnika „Przewiń do treści” w hero.
export default function HomePage() {
  return (
    <div className="h-page">
      <main id="tresc">
        <SectionBoundary name="Hero">
          <HeroSection />
        </SectionBoundary>
        <div id="start">
          {SECTIONS.map(([name, Section]) => (
            <SectionBoundary key={name} name={name}>
              <Section />
            </SectionBoundary>
          ))}
        </div>
      </main>
      <SectionBoundary name="Footer">
        <Footer />
      </SectionBoundary>
    </div>
  );
}
