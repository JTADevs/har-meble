// Dane firmy i tryb strony – jedno źródło dla frontu (nawigacja, stopka, kontakt, formularz wyceny, dane
// strukturalne) i serwera (adresaci zapytań). Teksty i dane od właścicielki HAR MEBLE (XI 2026).

// Tryb strony:
//  'wizytowka' – strona firmowa: oferta, usługi B2B, wycena przez formularz, kontakt (etap 1, domyślnie),
//  'pelna'     – do tego konfiguratory 3D z ceną na żywo, konta klientów i projekty w panelu (kolejne etapy).
// Front czyta VITE_SITE_MODE, serwer SITE_MODE – np. `VITE_SITE_MODE=pelna SITE_MODE=pelna npm run dev`.
const viteEnv = import.meta.env; // w przeglądarce obiekt od Vite, w Node undefined
const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
const RAW_MODE = viteEnv ? viteEnv.VITE_SITE_MODE : nodeEnv?.SITE_MODE;

export const SITE_MODE = RAW_MODE === 'pelna' ? 'pelna' : 'wizytowka';

export const FEATURES = {
  configurator: SITE_MODE === 'pelna', // konfiguratory 3D kuchni i szaf
  accounts: SITE_MODE === 'pelna', // rejestracja klientów, „Moje projekty”
};

export const COMPANY = {
  brand: 'HAR MEBLE',
  claim: 'doświadczenie, które widać w detalach',
  legalName: 'HAR-BUD Expert sp. z o.o.',
  nip: '954-290-72-73',
  invoiceAddress: { street: 'ul. Warszawska 30', postal: '40-008', city: 'Katowice' },
  phone: '517 495 246',
  phoneHref: 'tel:+48517495246',
  email: 'har.meble@gmail.com', // meble na wymiar i sprawy ogólne
  emailB2B: 'b2bhar.meble@gmail.com', // usługi dla firm: cięcie, oklejanie, nawiercanie, frezowanie, gięcie…
  hours: '8:00–17:00', // „Godziny kontaktu” (dni tygodnia do potwierdzenia z właścicielką)
  visitNote: 'Przed wizytą prosimy o kontakt, aby ustalić dogodny termin spotkania.',
  regions: 'Śląsk i Wielkopolska',
  experience: 'około 11 lat',
  locations: [
    {
      id: 'katowice',
      label: 'Siedziba firmy',
      region: 'Śląsk',
      street: 'ul. Warszawska 30',
      postal: '40-008',
      city: 'Katowice',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Warszawska%2030%2C%2040-008%20Katowice',
    },
    {
      id: 'wielkopolska',
      label: 'Oddział – Wielkopolska',
      region: 'Wielkopolska',
      street: 'Ligota 17',
      postal: '63-507',
      city: 'Kobyla Góra',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Ligota%2017%2C%2063-507%20Kobyla%20G%C3%B3ra',
    },
  ],
};

// Usługi B2B (kolejność i nazwy jak w tekstach właścicielki) – podstrona /uslugi-b2b i formularz wyceny.
export const B2B_SERVICES = ['Cięcie', 'Oklejanie', 'Nawiercanie', 'Frezowanie', 'Gięcie', 'Szlifowanie', 'Heblowanie'];

// Rodzaje mebli w formularzu wyceny – te same wartości w linkach ze strony głównej (/wycena?mebel=Kuchnia).
export const FURNITURE_TYPES = ['Kuchnia', 'Szafa', 'Garderoba', 'Zabudowa wnęki', 'Meble łazienkowe', 'Komoda, regał lub szafka RTV', 'Inne'];

// Trasy podstron wizytówki (używane w nawigacji, stopce i przyciskach).
export const ROUTES = {
  home: '/',
  b2b: '/uslugi-b2b',
  quote: '/wycena',
  quoteB2B: '/wycena?typ=b2b',
  contact: '/kontakt',
  privacy: '/polityka-prywatnosci',
  about: '/#o-nas',
  furniture: '/#meble',
};
