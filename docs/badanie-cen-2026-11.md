# Badanie cen mebli na wymiar – listopad 2026

Cel: ceny w konfiguratorze zbliżone do rynku małej/średniej stolarni w Polsce (poza największymi miastami).
Metoda: 5 niezależnych badaczy (kuchnie, szafy, materiały i okucia, robocizna, sieci i sklepy online) → synteza z przeliczeniem
konfiguracji silnikiem wyceny (`shared/pricing.js`) → 2 krytyków (źródła/jednostki, rachunek). Wartości w cenniku to koszty netto
stolarni; marża 30% i VAT 23% doliczane osobno. Wdrożone w `shared/catalog.js` (`DEFAULT_PRICING`).

## Konfiguracje kontrolne (brutto, VAT 23%)

| Konfiguracja | Przed | Rynek | Po |
|---|---:|---:|---:|
| a) Domyślna kuchnia (defaultKitchen) | 32 762 zł | 20 000–30 000 zł | 24 623 zł |
| b) Kuchnia prosta 3 m – laminat, blat laminowany | 12 334 zł | 7 500–11 500 zł | 9 098 zł |
| c1) Kuchnia prosta 3 m – MDF lakierowany mat, blat kwarcowy | 24 801 zł | 12 000–18 000 zł | 14 476 zł |
| c2) Kuchnia prosta 3 m – MDF lakierowany mat, blat z litego dębu | 19 605 zł | 10 500–15 500 zł | 12 270 zł |
| d) Szafa 250×260×60 z drzwiami przesuwnymi | 11 095 zł | 5 000–9 000 zł | 7 104 zł |
| e) Szafa 250×260×60 z drzwiami uchylnymi z MDF lakierowanego | 13 309 zł | 6 500–10 500 zł | 9 367 zł |

Dodatkowo: kuchnia 3 m MDF + blat laminowany ≈ 11 166 zł, mała kuchnia 2,4 m (laminat) ≈ 7 811 zł.

## Zakresy rynkowe (synteza)

| Pozycja | Jednostka | Nisko | Środek | Wysoko | VAT | Podstawa |
|---|---|---:|---:|---:|---|---|
| Kuchnia na wymiar – fronty z płyty laminowanej (obrzeże PCV), zabudowa dół+góra | zł/mb | 1 500 | 2 300 | 2 600 | mieszane: KB.pl netto (brutto = netto×1,08), stolarnie zwykle podają cenę końcową | KB.pl 2026 (6 miast) 2190–2620 netto, mediana 2325; Grand Kuchnie 1500–2200 bez blatu; stolarzkrakow.eu 1500–2400 z blatem i montażem; DobrzeMieszkaj 1600–2400. Wyżej: Da |
| Kuchnia na wymiar – MDF lakierowany mat (połysk +15–25% ceny frontu) | zł/mb | 2 400 | 3 000 | 3 500 | mieszane (KB.pl netto) | KB.pl 2960–3390 netto (mediana 3070); Grand mat 2500–3500, połysk 3000–4000; stolarzkrakow mat od 2400, połysk od 3400; DobrzeMieszkaj 2400–3500. CenaUslug średnio 5220,  |
| Kuchnia na wymiar – fornir | zł/mb | 2 600 | 3 200 | 4 500 | mieszane | KB.pl mat 2610–2870, połysk 3130–3700 netto; Grand 3000–4500; stolarzkrakow od 2900. |
| Kuchnia na wymiar – drewno lite (dąb) | zł/mb | 4 500 | 5 000 | 7 000 | mieszane | KB.pl dąb 4590–5170 netto (mediana 4820, czyli +57% do MDF); stolarzkrakow dąb 5400; Grand lite 4500–7000. |
| Kuchnia prosta ok. 3 m – laminat, blat laminowany, montaż | zł/kuchnia | 7 500 | 9 500 | 11 500 | cena końcowa (VAT 8% lub nieznany) | Indekscen 8300–11 000 (typowo 9800); MeblowePorady 3 mb ekonomiczny 7500–10 500; synteza badania dla 3–4 m: 8–14 tys.; KB.pl 2325 netto/mb ×3 + blat i montaż ≈ 8,5–9,1 ty |
| Kuchnia L ok. 5,5–6 mb – MDF lakierowany | zł/kuchnia | 18 000 | 24 000 | 30 000 | cena końcowa | Synteza badania 18–30 tys.; Grand L 5 mb średni standard 21 600; Formanufaktura narożna 4,2 mb 23 250 brutto; KB.pl: 3 wyceny stolarzy 25–30 tys.; Darmax L 4–6 mb 15–30 t |
| IKEA METOD (punkt odniesienia: sieć modułowa) | zł/mb | 1 559 | 1 780 | 2 215 | brutto 23% | ikea.com/pl, 18.11.2026: z blatem, bez montażu i uchwytów. Z montażem (210 zł za szafkę) i dostawą 2400–3050 zł/mb. |
| Blat z konglomeratu kwarcowego 20 mm (cena dla klienta, z montażem) | zł/mb | 800 | 1 200 | 1 600 | nieznane | Grand 800–1500; Darmax 800–1500 z montażem; E-Stone od 1500 zł/m² (≈930 zł/mb); stolarzkrakow od 900; Kuchnia od Stolarza 800–1500; Gres od 1600. Otwór pod zlew 300–500 n |
| Blat z drewna litego (dąb), oferta stolarni | zł/mb | 300 | 450 | 700 | nieznane | Grand 300–600; Murator 350–700. Sam materiał w Castoramie: 27–40 mm za 223–433 zł brutto. Montaż 80–150 zł/mb (WP Dom). |
| Blat laminowany 38 mm (materiał) | zł/mb | 98 | 130 | 200 | brutto | Castorama 98–199 (typowo 127); Egger 38 mm, gł. 600: 157–163 (meble.pl). Stolarnie sprzedają za 150–400 zł/mb. Montaż 61–76 netto/mb, otwór 105–126 netto (KB.pl). |
| Szafa wnękowa na wymiar – standard (laminat, drzwi przesuwne) | zł/mb | 1 400 | 2 000 | 2 800 | mieszane | Oferteo standard średni 1500–2500 (miasta poniżej 100 tys. 1400–1900, Warszawa 2200–2800); stolarzkrakow średnia klasa od 1500 brutto z montażem; Rydzewo od 2000 brutto;  |
| Szafa premium (MDF lakierowany, Blum, LED) | zł/mb | 2 500 | 3 200 | 4 500 | brutto lub nieznane | stolarzkrakow 2500–4000 brutto z montażem (dopłata za lakier wobec płyty +1000–1500 zł/mb); Oferteo premium 2500–4000; jonatanmeble 3500–4500+. |
| Szafa przesuwna ok. 250×260 z dodatkami (lustro, szuflady) | zł/szt. | 5 000 | 7 000 | 9 000 | nieznane lub brutto | Oferteo 250×260: podstawowa 4000–6000, z dodatkami 7000–12 000, przykład z Poznania 7850 (7450 bez LED); bellaneva 2 m laminat 4000–5500; alleremont 2,7 m ok. 7600; KB.pl |
| Dopłata za lustro na skrzydle (u stolarza) | zł/skrzydło | 300 | 450 | 700 | nieznane | Oferteo +600; alleremont 300–600 (typowo 450); drewnianymajster 300–600. U producentów drzwi tylko +60–170 (Kolm, Glassing). |
| Kompletne skrzydło drzwi przesuwnych (Glassing/Sevroll, płyta Egger, do 2,7 m) | zł/skrzydło | 401 | 492 | 565 | netto | glassing.pl; tory górny + dolny 100 zł/mb netto. Komplety 3 skrzydeł Kolm i SuperSzafy: 2470–2880 zł brutto. |
| Płyta laminowana 18 mm (Kronospan/Egger) | zł/m² | 29 | 49 | 90 | brutto | meble.pl i Castorama, 18.11.2026: Kronospan biała 29–38, Egger 39–90 (ST10 ok. 49). Cięcie 42–56 zł za arkusz albo 1,1–3 zł/mb. |
| Oklejanie obrzeżem 22×1–22×2 (usługa z obrzeżem) | zł/mb | 3 | 4 | 5 | netto | Mebrandt 3,10–4,00; Komandor 4,50–4,64; M-Styl 1,90–2,50 brutto (klej EVA) i 3,80–4,30 (PUR). |
| Front MDF lakierowany mat 18 mm (lakiernie B2B) | zł/m² | 270 | 390 | 440 | netto | Muczyn 390–440 (cennik od 06.2026); Lakierowane.pl 270–300; Juka 297–380 (niezweryfikowane); Format od 310; KB.pl 270–450 brutto. Sklepy B2C: 700–880 brutto. |
| Front fornirowany (B2B) | zł/m² | 465 | 490 | 812 | netto | WIP/Stylfront, IV 2025: dąb 465–493, dąb frezowany 601, orzech 686–812; KB.pl 500–900 brutto. |
| Front z drewna litego | zł/m² | 600 | 850 | 1 100 | brutto (8%) | KB.pl, cennik frontów (sam materiał); Darmax 800–1500 (cena dla klienta). |
| Zawias z cichym domykiem | zł/szt. | 3 | 12 | 16 | brutto | GTV 3,08–3,70; Hettich Sensys 11,75; Blum CLIP top BLUMOTION z prowadnikiem 13,34 (promocja) – 16,08 (cena regularna). |
| Szuflada systemowa 500 mm (komplet bez frontu) | zł/kpl | 68 | 160 | 367 | brutto | GTV Modern Box 68; Tandembox antaro 147–214 (dno i tył osobno 45); Merivobox 161–267; Legrabox 188–367. |
| Uchwyt meblowy | zł/szt. | 11 | 20 | 105 | brutto | Belmeb (większość 12–37 zł); uchwyty „złoty mosiądz” ze stopu ZnAl 23–140 zł (UchwytyMeblowe24). |
| LED – materiał (taśma, profil, klosz) | zł/mb | 20 | 27 | 33 | brutto | Belmeb: taśma 6,89–12,44, profil 10,76–15,94, klosz 2,80–4,21; zasilacz 18–107 zł. Dla klienta 100–300 zł/mb (Grand), 200 zł/mb (Oferteo). |
| Stawka godzinowa stolarza (dla klienta) | zł/h | 80 | 110 | 150 | netto | alleremont, WP Dom, DobrzeMieszkaj (2026): 80–150; Warszawa 110–150, wschód 80–110. KB.pl: montaż 79–99 brutto (VAT 8%). |
| Wynagrodzenie stolarza meblowego (bez narzutów pracodawcy) | zł/h | 31 | 35 | 41 | brutto płacowe (nie VAT) | Ogłoszenia na Pracuj.pl (tylko z wyników wyszukiwania); płaca minimalna 2026: 31,40 zł/h; mediana GUS dla stolarzy meblowych 5275 zł miesięcznie. |
| Montaż kuchni zlecany osobno | % wartości | 8 | 12 | 20 | mieszane | Stolarnie: bez montażu taniej o 8–12% (Krystian), transport z montażem 8–12% (MeblowePorady). Firmy instalacyjne 12–20% brutto (KB.pl). Castorama 15–25%. Za mb: 420–650 z |
| Montaż dużej szafy | zł/szt. | 250 | 450 | 700 | brutto lub nieznane | KB.pl, firmy montażowe 250–500 brutto; bellaneva 300–700; poradniki 300–1000. |
| Transport i dojazd poza strefą | zł/km | 2 | 4 | 6 | mieszane | 4MEB: 200 zł + 4 zł/km powyżej 30 km; Castorama 3,50 zł/km; No Problem 3,50 zł/km netto w obie strony; Muratordom 3–6 zł/km. Transport w mieście 100–500 zł. |
| Koszty stałe i zysk w cenie netto kuchni | % ceny netto | 15 | 20 | 25 | netto | DrewnianyMajster (model blogowy): materiały 35–50%, okucia 10–15%, robocizna 20–30%, koszty stałe i zysk 15–25%. Cena netto ≈ 1,7–2,5 × koszt materiałów i okuć. |
| Różnica cen: duże miasta wobec mniejszych miejscowości | % | 15 | 20 | 30 | n/d | KB.pl 20–30% (w cennikach miejskich Warszawa +10–20%); Oferteo 15–25%; Murator 20–30%; MeblowePorady ok. 20%. |

## Zmiany w cenniku (koszt netto)

| Pole | Było | Jest | Uzasadnienie (skrót) |
|---|---:|---:|---|
| `carcass.lam_bialy` | 72 | 48 | Płyta biała 18 mm z cięciem, bez obrzeża i odpadu, które liczą osobne pola. Egger W960 SM kosztuje 185 zł netto za arkusz (32 zł/m²), W1000 ST9 324 zł (56 zł/m²), Kronospan 24–31 zł/m² netto. Cięcie 42–56 zł za arkusz to ok. 8 zł/ |
| `carcass.lam_szary` | 82 | 54 | Egger U708 ST9 37 zł/m² netto, U702 ST9 49 zł/m², do tego cięcie ok. 8 zł/m². Dopłata wobec białej zostaje jak dotąd (+12%). |
| `carcass.lam_grafit` | 86 | 56 | Egger U999 ST7 i ciemne uni ST9 39–49 zł/m² netto plus cięcie. Dopłata wobec białej zostaje jak dotąd (+17%). |
| `carcass.lam_dab` | 92 | 60 | Dekory drewnopodobne: Egger H1145 ST10 40 zł/m² netto, H3730 ST10 67 zł/m², plus cięcie. Dopłata wobec białej zostaje jak dotąd (+25%). |
| `carcass.lam_dab_bielony` | 92 | 60 | Jak lam_dab: dekor drewnopodobny ST10/ST22. |
| `fronts.laminat` | 210 | 120 | Front z płyty laminowanej robiony w stolarni: płyta 40–60 zł/m², obrzeże ABS 2 mm na 4 krawędziach (4–4,6 zł/mb × ok. 6 mb/m²) i odpad dają 100–125 zł/m². Labi sprzedaje klientom front laminowany mat za 169 zł/m². |
| `fronts.mdf_mat` | 620 | 450 | Ceny lakierni B2B netto: Muczyn mat biały 390, kolor 410 (cennik od 06.2026), Juka 297–380, Format od 310, Lakierowane.pl 270; KB.pl 270–450 brutto. 400 obejmuje kolor, nawiercenia i dopłaty za małe zamówienia. Obecne 620 to pozio |
| `fronts.mdf_polysk` | 820 | 560 | Połysk to +15–25% ceny frontu (Krystian). W lakierniach połysk kosztuje 420–440 (Muczyn), 330–360 (Juka) i 300 netto (Lakierowane.pl). Proponuję mat +25%. |
| `fronts.fornir` | 980 | 600 | Cennik B2B WIP/Stylfront (IV 2025): dąb 465–493, jesion 465, orzech 686–812 netto; KB.pl 500–900 brutto. 560 to średnia dla dekorów z katalogu. W kuchni daje to +9% za mb wobec MDF, rynek podaje 0–25% (Grand, stolarzkrakow, KB.pl) |
| `fronts.lite` | 1450 | 1100 | KB.pl: fronty z drewna 600–1100 zł/m² brutto (sam materiał), do tego olejowanie i ramiaki w stolarni. Przy 1300 kuchnia z litego dębu wychodzi ok. +59% za mb wobec MDF, KB.pl podaje +57% (4820 wobec 3070 netto/mb). Przy niższej ce |
| `frontStyle.ramowy` | 190 | 130 | Dopłata za front frezowany w ramkę: Lakierowane.pl klasyczne 370/470 wobec prostych 270/300 (+100–170), WIP dąb frezowany 601 wobec 465–493 (+108–136), Juka strukturalne +80–120 netto. |
| `frontStyle.ryflowany` | 280 | 200 | Brak twardych danych dla frontów ryflowanych. Obniżam proporcjonalnie do nowych cen frontów; ryflowanie zostaje ok. 1,5× droższe od ramki, bo to frezowanie wielu rowków i ich lakierowanie. |
| `mirror` | 260 | 220 | Lustro 4 mm z folią kosztuje 150–300 zł/m² (materiał). Przy 220 dopłata za lustro wobec płyty to ok. 300 zł brutto za skrzydło. To dolna granica dopłat u stolarzy (300–700, Oferteo +600) i więcej niż u producentów drzwi (+60–170). |
| `countertops.laminat` | 230 | 170 | Egger 38 mm, gł. 600: 157–163 zł/mb brutto (128–132 netto); Castorama typowo 127 brutto. Do tego ok. 25% odpadu na długości (płyty 4,1 m) i obrzeże 42×2 na czołach. Klient zapłaci ok. 221 zł/mb netto plus montaż, w widełkach stola |
| `countertops.kompakt` | 950 | 480 | Formanufaktura: blat kompakt HPL z otworami 3800 zł brutto w kuchni 4,2 mb, czyli ok. 1050 zł/mb dla klienta. Grand: 250–500 zł/mb za sam materiał. 650 to koszt z obróbką CNC. |
| `countertops.lite` | 1150 | 380 | Blat dębowy 37–40 mm: Castorama 266–433 zł/mb brutto (216–352 netto), DotWood 346 brutto. Stolarnie sprzedają za 300–700 zł/mb. 450 obejmuje olejowanie, odpad i rezerwę na droższy orzech. Obecne 1150 to 2–3× rynek. |
| `countertops.kwarc` | 2100 | 720 | Konglomerat 2 cm: kb.pl 700–2000 zł/m² netto (434–1240 zł/mb), Pamir 850 zł/m² netto. Klient płaci 800–1600 zł/mb z montażem (Grand, Darmax, E-Stone ok. 930, stolarzkrakow od 900, Gres od 1600). Przy 850 klient zapłaci ok. 1470 zł |
| `countertops.granit` | 1900 | 700 | Granit: Grand 600–1200 zł/mb, E-Stone od 1500 zł/m² (ok. 930 zł/mb), Gres od 1400 zł/mb; czarny 3 cm jest droższy. Zostawiam relację granit < kwarc z obecnego cennika. |
| `countertopCutout.lite` | 180 | 120 | Otwór w blacie drewnianym kosztuje tyle co w laminowanym: 105–137 zł (KB.pl podaje te pozycje razem). Doliczam ok. 30 zł na zabezpieczenie krawędzi. |
| `countertopCutout.kwarc` | 380 | 300 | Klient płaci 300–500 zł netto za otwór pod zlew w konglomeracie (kb.pl). 300 to koszt u kamieniarza; po marży klient zapłaci ok. 390 zł netto. |
| `countertopCutout.granit` | 380 | 300 | Jak dla kwarcu: obróbka kamienia u kamieniarza. |
| `hinge.standard` | 11 | 5 | Zawias z cichym domykiem marki budżetowej: GTV 3,08–3,70 zł brutto z prowadnikiem lub bez. Obecne 11 zł to cena Blum lub Hettich, czyli poziom premium. |
| `hinge.premium` | 27 | 13 | Blum CLIP top BLUMOTION 71B3550 z prowadnikiem: 13,34 zł brutto w promocji, 16,08 regularnie (ok. 13 netto). Hettich Sensys 11,75 brutto. |
| `drawer.standard` | 110 | 80 | GTV Modern Box L500 z cichym domykiem kosztuje 67,81 brutto (55 netto), wyższe wersje 80–104 brutto. Z dnem i tyłem z płyty wychodzi ok. 70–100 netto. |
| `drawer.premium` | 290 | 210 | Tandembox antaro 500 kosztuje 147–214 brutto plus dno i tył 45 brutto; Legrabox M 188–206, C i F 262–367 brutto. Średnio na szufladę kuchenną (2 wysokie i 1 niska) to ok. 190–250 netto. |
| `handles.listwa` | 38 | 18 | Uchwyty aluminiowe 128–192 mm kosztują 11–25 zł brutto (w Belmeb większość 12–37). |
| `handles.listwa_czarna` | 42 | 20 | Czarny mat 128 mm od 10,69 zł brutto, dłuższe 20–35 zł. |
| `handles.galka` | 19 | 10 | Gałki czarne kosztują typowo 6–15 zł brutto. Dane są pośrednie, bo lista Belmeb to głównie uchwyty listwowe. |
| `handles.galka_mosiadz` | 34 | 28 | Gałki w kolorze mosiądzu (ZnAl z powłoką) kosztują 15–40 zł brutto. Uchwytów z litego mosiądzu w polskich sklepach nie znaleziono. |
| `handles.bezuchwytowe` | 52 | 40 | Mechanizm push do drzwi to ok. 20 zł, a TIP-ON do szuflad Tandembox kosztuje ok. 80–100 zł więcej niż zwykły komplet (WIP: 245,70 wobec 146,60). Przy ok. 1/3 szuflad średnio wychodzi ok. 40 zł na front. |
| `plinth` | 48 | 30 | Cokół aluminiowy 150 mm kosztuje 19,42 zł/mb brutto, laminowany 25–66 zł/mb, do tego uszczelka. |
| `led` | 160 | 100 | Taśma, profil i klosz kosztują 20–33 zł/mb brutto, frezowanie rowka 5–12 zł/mb, do tego montaż. Klient zapłaci ok. 160 zł/mb brutto; rynek to 100–300 zł/mb (Grand) i 200 zł/mb (Oferteo). |
| `ledPsu` | 140 | 90 | Zasilacz 24 V 15–100 W kosztuje 18–107 zł brutto, do tego włącznik lub czujnik. |
| `rail` | 55 | 30 | Drążek owalny 100 cm z mocowaniami kosztuje 27,29 zł brutto (cena z wyników wyszukiwania, niezweryfikowana na stronie). |
| `slidingDoor` | 380 | 200 | Okucia Laguna na skrzydło: wózki FAST50 ok. 52 zł brutto, profile uchwytowe 2,7 m po 22–107 zł (2 na skrzydło), profile poziome i szczotki. Razem 140–220 zł netto. Kontrola: skrzydło w konfiguratorze (wypełnienie 272 + system 200  |
| `slidingTrack` | 140 | 50 | Glassing liczy 100 zł/mb netto za zestaw tor górny + dolny. Silnik liczy 2 × szerokość (każdy tor osobno), więc na jeden tor wychodzi 50 zł/mb. |
| `laborRate` | 110 | 85 | Stawka też dostaje marżę 30%, więc klient płacił 143 zł/h, czyli górną granicę rynku (80–150 netto, Warszawa 110–150). Przy 85 klient płaci 110,5 zł/h, środek rynku. 85 zł/h kosztu to płaca 35–41 zł/h brutto, ok. 20% narzutów prac |
| `laborHours.wardrobeSection` | 2.5 | 2 | Przy kuchniach w środku rynku szafy wychodziły powyżej środka. Sekcja szafy z formatek ciętych i oklejanych w hurtowni to ok. 2 h pracy, szafa 250 cm z 3 sekcjami ok. 8,4 h. Twardych danych o czasie pracy brak. |
| `assemblyWardrobe` | 180 | 150 | Montaż dużej szafy kosztuje 250–500 zł brutto (KB.pl) albo 300–700 zł (bellaneva). Przy 150 zł/mb szafa 2,5 m kosztuje klienta ok. 600 zł brutto, w środku widełek. |
| `transportBase` | 150 | 120 | Transport w mieście kosztuje 100–500 zł (Krisstol, martelle, Oferteo 200–500). Przy 25 km klient zapłaci ok. 350 zł brutto zamiast ok. 500. Wiele stolarni wlicza dojazd do 30–50 km w cenę. |
| `transportKm` | 3.2 | 2 | Silnik liczy kilometry × 2 (w obie strony). 2 zł/km kosztu to 2,6 zł netto za km jazdy, czyli 5,2 zł za km odległości. Rynek: 3–6 zł/km (Muratordom), 4 zł/km (4MEB), 3,50 zł/km (Castorama). |

Poprawki po krytyce (zbieżne uwagi obu krytyków): fronty laminowane 120 (w propozycji 130), MDF mat/połysk 450/560
(lakier dwustronny w kolorze), fornir 600, drewno lite 1100; blaty: kwarc 720, granit 700, dąb lity 380, kompakt 480,
wycięcie w kompakcie 200; słupek 4,5 h pracy; montaż szafki 75 zł.

## Zastrzeżenia

1) Rozrzut cen jest duży: źródła różnią się o 30–50%. Wiele poradników z 2026 to treści SEO lub pisane z pomocą AI i są wewnętrznie sprzeczne (CenaUslug, MeblowePorady, część Muratora). Ceny „od” (stolarzkrakow, Rydzewo, Komandor) zaniżają rynek. Zakresy dla konfiguracji referencyjnych to moja synteza, więc mają charakter orientacyjny. Wszystkie wyniki po zmianie mieszczą się w ±5% od środka tych zakresów.
2) VAT. Konfigurator dolicza 23% do wszystkiego. Kuchnie i szafy na wymiar z montażem w mieszkaniach (do 150 m²) i domach (do 300 m²) rynek zwykle wycenia z VAT 8% (KB.pl: brutto = netto × 1,08). Propozycja zostawia vat = 23 i dopasowuje ceny brutto do cen końcowych z rynku. Przy 8% te same konfiguracje byłyby o ok. 12% tańsze brutto: a 21 077, b 8184, c1 13 124, c2 10 934, d 6296, e 7786. Żeby przy 8% zostać w środku rynku, marżę trzeba by podnieść do ok. 48% (1,30 × 1,23/1,08). Przełącznik 8%/23% zależny od montażu albo opcja „zwolniony z VAT” (obrót do 240 tys. zł rocznie) wymagają zmiany kodu, więc są poza zakresem tego zadania.
3) Regiony. Propozycja celuje w małą lub średnią stolarnię poza Warszawą. W Warszawie, Krakowie i Wrocławiu ceny są wyższe o 15–30%. W tym modelu odpowiada to marży ok. 50–70% zamiast 30% (albo wyższej stawce robocizny i montażu).
4) Koszty materiałów pochodzą ze stron sklepów i hurtowni odczytanych 18.11.2026. Część cen to promocje, które mogą zaniżać koszt o 10–20% (np. zawias Blum 13,34 zamiast 16,08 zł, Tandembox D 166,74 zamiast 213,77 zł). Cennika Juka nie udało się sprawdzić (PDF zwraca 404). Strony Leroy Merlin i PSB blokowały pobieranie. Ceny kwarcu pochodzą tylko z portali i z cen „od” u kamieniarzy. Brakuje zweryfikowanych cen B2B dla frontów z litego drewna, frontów ryflowanych, zatrzasków push do drzwi i koszy cargo.
5) Model ma jedną cenę na materiał niezależnie od dekoru. Tymczasem orzech jest 1,5–2× droższy od dębu w fornirze i blatach, a intensywne kolory lakieru kosztują ok. +50%.
6) Słupki. Brak danych źródłowych. W modelu słupek lodówki 60 kosztuje ok. 0,93× tyle co para szafek dolna i górna 60 cm (bez udziału blatu ok. 1,05×). Reguła z badania mówi o 1,5–2× (słabe źródło). Warto ustalić ze stolarzem, czy podnieść laborHours.tall, np. do 4,5–5 h. Celowo tego pola nie ruszałem.
7) Czasy pracy (laborHours) nie są sprawdzone w żadnej konkretnej stolarni. Model zakłada, że formatki są cięte i oklejane w hurtowni (pole edge to „okleina z oklejaniem”). Model DrewnianyMajster podaje 45 h pracy w warsztacie na kuchnię L 5 mb, a domyślna kuchnia ma tu 32,8 h. Jeśli stolarnia tnie i okleja sama, godziny trzeba podnieść.
8) Marża 30% nalicza się na każdą pozycję, także na blaty kamienne kupowane u kamieniarza i na transport. Dlatego konfiguracje z kwarcem lub granitem są relatywnie drogie, np. preset „orzech” kosztuje 31,9 tys.
9) Konfiguracje b–e liczyłem z okuciami „standard”. Rynkowe kuchnie z MDF zwykle mają Blum z cichym domykiem. Wariant c1 z okuciami premium kosztuje 16 008, nadal w zakresie.
10) Ceny zabudów rosną o 8–15% rocznie (KB.pl), więc cennik trzeba przeglądać co 6–12 miesięcy.
11) Wdrożenie. Serwer przy pierwszym starcie kopiuje DEFAULT_PRICING do data/db.json. Sama zmiana DEFAULT_PRICING nie zmieni więc działającej wyceny bez POST /api/pricing/reset (reset w panelu admina) albo usunięcia data/db.json. Ceny zapisane w projektach demo też zostaną stare.
12) Nie zmieniałem: hdf 16, edge 4,5, waste 12, leg 4, hanger 14, smallParts 15, countertopCutout.laminat 90, countertopCutout.kompakt 280, laborHours (base, wall, tall, appliance, drawer, wardrobeDoor), assemblyPerModule 85, assemblyCountertop 70, margin 30, vat 23. Te wartości są na poziomie rynku albo brak lepszych danych.
13) Nie edytowałem żadnych plików projektu.

## Źródła (z badania)

- KB.pl – cenniki miejskie mebli kuchennych 2026 (E. Pietryka), szacunki z ofert internetowych; 6 miast – https://kb.pl/cenniki/miejskie/meble-kuchenne/warszawa/ (2026-04-29)
- KB.pl – Ceny mebli na wymiar w 2026 (E. Pietryka), ceny wykonawców ze średniej półki – https://kb.pl/aktualnosci/wnetrza/ceny-mebli-na-wymiar-w-2026/ (2026-02-08)
- KB.pl – Ceny mebli kuchennych zachowują się dziwnie… (B. Ochman) – https://kb.pl/aktualnosci/dom/ceny-mebli-kuchennych-na-wymiar-2025/ (2025-02-07)
- KB.pl – Poszła po tanią kuchnię do sieciówki… (B. Ochman) – https://kb.pl/aktualnosci/listy-i-historie/cena-mebli-na-wymiar/ (2026-01-31)
- Oferteo.pl – cennik krajowy na podstawie 1150 wycen – https://www.oferteo.pl/kuchnie-na-wymiar (stan na: listopad 2026)
- Oferteo.pl – Meble na wymiar czy gotowe? [2025] – https://www.oferteo.pl/artykuly/meble-na-wymiar-czy-gotowe (2025-09-07)
- CenaUslug.pl – wykonanie mebli kuchennych na wymiar (laminat) – https://cenauslug.pl/dom-i-ogrod/wykonanie-mebli-kuchennych-na-wymiar-laminat (2026-05-12)
- CenaUslug.pl – meble kuchenne lakierowane na wymiar – https://cenauslug.pl/dom-i-ogrod/wykonanie-mebli-kuchennych-na-wymiar-lakier (2026-05-12)
- CenaUslug.pl – meble fornirowane na wymiar – https://cenauslug.pl/dom-i-ogrod/wykonanie-mebli-kuchennych-na-wymiar-fornir (2026-05-12)
- CenaUslug.pl – drewniane meble kuchenne na wymiar – https://cenauslug.pl/dom-i-ogrod/wykonanie-mebli-kuchennych-na-wymiar-drewno (2026-06-23)
- Indekscen.pl (Online Marketing Help sp. z o.o.) – https://indekscen.pl/blog/ile-kosztuje-kuchnia-na-wymiar/ (2026-09-30 (indeks z 2026-11-05))
- DobrzeMieszkaj.pl (P. Komendarczuk) – https://www.dobrzemieszkaj.pl/kuchnia_i_jadalnia/meble/105/meble_na_wymiar_ile_kosztuje_kuchnia_u_stolarza_i_co_podbija_cene,321716.html (2026-11-01)
- MeblowePorady.pl (E. Roszkowska) – https://mebloweporady.pl/ile-kosztuje-kuchnia-na-wymiar/ (aktualizacja 2026-08-29)
- Murator / muratordom.pl (P. Wiktor) – https://muratordom.pl/wnetrza/prace-wykonczeniowe/na-co-zwrocic-uwage-zamawiajac-meble-na-wymiar-u-stolarza-ceny-zabudowy-kuchennej-i-szaf-2025-aa-bhdv-NjPf-x6M5.html (2025-08-18)
- Murator – Ceny blatów laminowanych w lutym 2026 (redakcja, z użyciem AI) – https://muratordom.pl/cenniki-budowlane/ceny-blatow-laminowanych-w-lutym-2026-ekonomiczne-rozwiazanie-do-kuchni-aa-JfcN-TfGR-aMen.html (2026-02-11)
- stolarzkrakow.eu – stolarnia, Kraków – https://www.stolarzkrakow.eu/kuchnie-na-wymiar-krakow (brak daty cennika (strona aktualna w 2026; blog 2026-08-20))
- Grand Kuchnie (MebleSystem), Toruń – blog cenowy – https://www.grandkuchnie.pl/blog/ile-kosztuje-kuchnia-na-wymiar/ (2026-01-19)
- DARMAX Usługi i Produkcja Mebli, Łódź – poradnik cenowy – https://www.darmax.pl/kuchnia-na-wymiar-ile-kosztuje-i-jak-zaplanowac/ (brak daty (ceny opisane jako obowiązujące w 2026))
- Krystian Meble na Wymiar, Biłgoraj (pracownia) – https://krystianmeblenawymiar.pl/ile-kosztuja-meble-kuchenne-na-wymiar/ (brak daty (ceny opisane jako 2026))
- KS Meble (K. Szewczyk), Frydrychowice, Małopolska – szacunki rynkowe (nie cennik firmy) – https://ksmeble.pl/blog/poradniki/ile-kosztuje-kuchnia-na-wymiar/ (2026-10-04)
- Formanufaktura (DMGF Sp. z o.o.), Brwinów k. Warszawy – https://formanufaktura.com/ile-kosztuja-meble-na-wymiar-cena-zabudowy-2026/ (2026-01-06)
- Metr Meble (Metr Sp. z o.o.), Wrocław i Warszawa – cennik 2026 – https://metrmeble.pl/cennik-kuchni-na-wymiar (Cennik 2026 (bez dokładnej daty))
- Kuchnia od Stolarza (M-COMPACT INVEST GROUP), Warszawa – https://kuchniaodstolarza.pl/blog/ile-kosztuje-kuchnia-na-wymiar-warszawa/ (2026-06-15)
- Urzadzeni.com, Poznań (J. Jarzyński) – https://urzadzeni.com/en/ile-kosztuja-meble-kuchenne-na-wymiar-aktualne-ceny-i-przyklady-wyliczen/ (2026-07-13)
- martelle-studio.com.pl – poradnik (autorka Daria; firma i miasto nieznane) – https://martelle-studio.com.pl/ile-kosztuje-kuchnia-na-wymiar/ (2026-03-06 (akt. 2026-05-19))
- meble-kuchenne.warszawa.pl (Meble Kuchenne Warszawa) – https://meble-kuchenne.warszawa.pl/wycena-online-mebli-kuchennych/ (stopka 2024 (brak daty aktualizacji))
- Gres Design, Częstochowa – https://gresdesign.com/ (brak daty (© 2026))
- E-Stone, Gdańsk/Skowarcz – https://e-stone.pl/ile-kosztuje-blat-z-kamienia/ (stan cen: październik 2026)
- Danstone (blaty-kuchenne.waw.pl), Warszawa – https://www.blaty-kuchenne.waw.pl/ile-kosztuje-blat-kuchenny-w-2026-roku/ (2026-04-12)
- KB.pl – Cennik blatów kuchennych 2026 (E. Pietryka) – https://kb.pl/kuchnie/blaty-kuchenne/cennik-blatow-kuchennych-ile-kosztuja-blaty-i-ich-montaz (2026-01-07)
- Castorama.pl (sprzedawca DREWMEX) – https://www.castorama.pl/departments/blat-drewniany-dotwood-mikrowczep-150-x-62-x-4-cm-d-b-surowy-1-szt-/5907377043614_CAPL.prd (odczyt 2026-11-18)
- Murator – Ceny blatów kuchennych i łazienkowych 2026 (redakcja, z użyciem AI) – https://muratordom.pl/cenniki-budowlane/ceny-blatow-kuchennych-i-lazienkowych-2026-praktyczne-porownanie-materialow-aa-3uZw-WTBm-M6o2.html (2026-06-09)
- Intar.pl (sklep z okuciami) – https://www.intar.pl/karta-produktu/424380,20710 (odczyt 2026-11-18)
- Meblownia.pl – https://meblownia.pl/blum-szuflada-legrabox-500-m-biala-40-kg.html (odczyt 2026-11-18)
- Meblownia.pl / Intar.pl – https://meblownia.pl/blum-zawias-clip-z-blumotion-0.html (odczyt 2026-11-18 (ceny z wyników wyszukiwania))
- Intar.pl / Meblownia.pl – https://www.intar.pl/karta-produktu/420084,10626 (odczyt 2026-11-18 (ceny z wyników wyszukiwania))
- Belmeb.pl – https://www.belmeb.pl/8838-kosz-cargo-30-mini-prestige-dwupoziomowy-srebrny.html (odczyt 2026-11-18)
- Meblownia.pl – kategoria wysokie kosze cargo – https://meblownia.pl/category/wysokie-kosze-cargo (odczyt 2026-11-18)
- Belmeb.pl – https://www.belmeb.pl/5464-magic-corner-standard-900-450-mm-prawy.html (odczyt 2026-11-18)
- Meble.pl S.A. – konfigurator mebli na wymiar – https://www.meble.pl/na-wymiar/szafki-kuchenne/slupek-do-zabudowy-lodowki-z-gorna-szafka.html (odczyt 2026-11-18)
- Castorama.pl – https://www.castorama.pl/plyta-laminowana-kronospan-biel-alpejska-8685sm-2800-x-2070-x-18-mm/5907555428516_CAPL.prd (odczyt 2026-11-18)
- Labi – fronty meblowe na wymiar (Piła/Poznań) – https://labi.pl/fronty-wysoki-polysk/ (brak daty (odczyt 2026-11-18))
- TwojeFronty.pl (Zielona Okiennica Łukasz Kwiatkowski) – https://twojefronty.pl/produkt/fronty-lakierowane-mdf-gladkie-mat-kolor/ (brak daty (odczyt 2026-11-18))
- Stylfront / WIP (dystrybucja okuć i płyt), Elbląg – cennik frontów z okleiny naturalnej – https://wiprumia.pl/wp-content/uploads/2025/04/Cennik-frontow-fornirowanych-01.04.25-WIP.pdf (2025-04-01)
- KB.pl – Cennik frontów kuchennych (E. Pietryka) – https://kb.pl/cenniki/produkty/fronty-kuchenne/ (publ. 2025-06-24; tabela akt. 2026-01-07)
- KB.pl – Cennik usług stolarskich 2026 (E. Pietryka) – https://kb.pl/meble/inne-meble/cennik-uslug-stolarskich-porownanie-cen-w-calej-polsce/ (2026-01-07)
- KB.pl – Cennik montażu mebli (E. Pietryka) – https://kb.pl/meble/inne-meble/cennik-skladania-mebli-zobacz-ile-kosztuje-montaz-mebli-w-calej-polsce/ (publ. 2025-01-23; tabela instalatorów 2026-01-07)
- Stolarnia Rydzewo (stolarnia, Mazury) – Meble na wymiar Ełk – https://stolarniarydzewo.com/meble-na-wymiar-elk (brak daty (stopka © 2026); odczyt 2026-11-18)
- stolarzkrakow.eu (Stolarze z Krakowa) – Cennik szaf na wymiar Kraków 2026 – https://www.stolarzkrakow.eu/cennik/szafy-na-wymiar (2026 (brak dokładnej daty); odczyt 2026-11-18)
- KONCEPT s.j. (Szafy–Wnęki–Garderoby, Zielona Góra) – Szafa wnękowa na wymiar 2026 – https://koncept-szafy.pl/szafa-wnekowa-na-wymiar-2026/ (2026-06-02)
- Oferteo.pl – Meble na wymiar – ceny 2025 – https://www.oferteo.pl/artykuly/meble-na-wymiar-cennik (2025-09-01)
- Oferteo.pl – Szafa na wymiar – cena 2025 – https://www.oferteo.pl/artykuly/ile-kosztuje-szafa-na-wymiar-cennik (akt. 2025-09-03 (publ. 2023-11-17))
- Oferteo.pl – Projekt szafy na wymiar 2025 – https://www.oferteo.pl/artykuly/projekt-szafy-na-wymiar (2025-09-05)
- alleremont.pl – Cennik stolarza 2026 – https://alleremont.pl/poradniki/stolarz-cennik-2026.html (akt. 2026-06)
- mmstolarz.pl (redakcja; autor prowadził zakład stolarski) – Szafa na wymiar cena – https://mmstolarz.pl/ile-kosztuje-szafa-na-wymiar-u-stolarza/ (2026-05-13)
- drewnianymajster.pl – Ile kosztuje szafa wnękowa – https://drewnianymajster.pl/ile-kosztuje-szafa-wnekowa/ (2026-01-04)
- bellaneva.pl – Ile kosztuje szafa wnękowa na wymiar (przewodnik 2026) – https://bellaneva.pl/meble/ile-kosztuje-szafa-wnekowa-na-wymiar-przewodnik/ (2026-09-07)
- jonatanmeble.pl (treść sponsorowana) – Ile kosztuje szafa wnękowa – https://jonatanmeble.pl/ile-kosztuje-szafa-wnekowa/ (2026-04-25)
- Krisstol.pl (firma meblowa, Wrocław) – Ile kosztuje szafa na wymiar? – https://www.krisstol.pl/ile-kosztuje-szafa-na-wymiar/ (brak daty (odwołania do 2025; © 2008–2026))
- CenaUslug.pl – Wykonanie szafy przesuwnej na wymiar – https://cenauslug.pl/dom-i-ogrod/wykonanie-szafy-przesuwnej-na-wymiar (2026-05-12)
- CenaUslug.pl – Szafy i zabudowy wnękowe na wymiar (przewodnik 2026) – https://cenauslug.pl/przewodnik/szafy-i-zabudowy-wnekowe-na-wymiar (akt. 2026-09)
- CenaUslug.pl – Wykonanie garderoby na zamówienie – https://cenauslug.pl/dom-i-ogrod/wykonanie-garderoby-na-zamowienie (2026-05-12)
- CenaUslug.pl – Wykonanie szafki RTV na zamówienie – https://cenauslug.pl/dom-i-ogrod/wykonanie-szafki-rtv-na-zamowienie (2026-05-12)
- CenaUslug.pl – Wykonanie regału na wymiar – https://cenauslug.pl/dom-i-ogrod/wykonanie-regalu-na-ksiazki-na-wymiar (2026-05-14)
- CenaUslug.pl – Montaż oświetlenia LED w szafie – https://cenauslug.pl/budowa-i-remont/montaz-oswietlenia-wewnatrz-szafy-led (2026-05-26)
- CenaUslug.pl – Montaż drzwi przesuwnych do wnęki – https://cenauslug.pl/dom-i-ogrod/montaz-drzwi-przesuwnych-do-wneki (2026-05-19)
- General Design (Chechło, woj. śląskie) – profil firmy na Oferteo – https://www.oferteo.pl/general-design/firma/85978 (brak daty; odczyt 2026-11-18)
- wspolnydom-wilga.pl – Ile kosztują drzwi przesuwne do szafy (2026) – https://wspolnydom-wilga.pl/ile-kosztuja-drzwi-przesuwne-do-szafy (akt. 2026-08-13 (stopka: dane 2023–2024))
- jakaszafa.pl – Drzwi do szafy na wymiar – https://jakaszafa.pl/drzwi-do-szafy-na-wymiar (akt. 2026-06-21)
- jakaszafa.pl – Szafy na wymiar cennik 2026 – https://jakaszafa.pl/szafy-na-wymiar-cennik (akt. 2026-04-26)
- Glassing – Cennik drzwi przesuwnych (system Sevroll) – https://www.glassing.pl/cennik-drzwi-przesuwnych/ (brak daty; odczyt 2026-11-18)
- Kolm.pl – Drzwi przesuwne do szaf na wymiar – https://kolm.pl/drzwi-przesuwne-na-wymiar (brak daty; odczyt 2026-11-18)
- SuperSzafy.pl – karta produktu – https://www.superszafy.pl/produkt/drzwi-przesuwne-265x236-240cm-3x-lustro-srebrne-bezpieczne/ (brak daty; odczyt 2026-11-18)
- FORPŁYT Sp.j. – sklep internetowy, systemy przesuwne Laguna – https://sklep.forplyt.pl/pl/c/Systemy-przesuwne/63/2/default/2/f_producer_38/1 (brak daty; odczyt 2026-11-18)
- Marecki.pl – rączki do systemów przesuwnych Laguna/GTV – https://marecki.pl/produkty/akcesoria-meblowe-okucia-uchwyty/systemy-przesuwne-do-szaf-gtv-laguna/systemy-przesuwne-raczki/2-38008 (brak daty; odczyt 2026-11-18)
- KAMA System (Kamienna Góra) – Drzwi lustrzane – https://kamasystem.eu/drzwi-lustrzane/ (2026-07-20)
- Muczyn Meble – cennik lakierowania frontów – https://muczyn-meble.pl/uslugi/fronty-meblowe/ (cennik obowiązuje od 2026-06-01)
- Lakierowane.pl – cennik frontów lakierowanych – https://lakierowane.pl/informacje,cennik_frontow_lakierowanych,2,1.html (brak daty; odczyt 2026-11-18)
- Meblownia.pl – karta produktu – https://meblownia.pl/blum-szuflada-tandembox-antaro-500-m-szara-65-kg.html (brak daty; odczyt 2026-11-18)
- e-katalog.pl – porównywarka cen (GTV) – https://e-katalog.pl/list/915/gtv/ (brak daty; dane z wyniku wyszukiwania, strona zwraca 403 – niezweryfikowane)
- Leroy Merlin – karta produktu – https://www.leroymerlin.pl/produkty/drazek-owalny-z-mocowaniami-100-cm-44423960.html (brak daty; dane z wyniku wyszukiwania, strona zwraca 403 – niezweryfikowane)
- KB.pl – Cennik montażu mebli – https://kb.pl/cenniki/uslugi/montaz-mebli-kuchennych/ (tabela akt. 2026-01-07 (publ. 2025-01-23))
- Murator (muratordom.pl) – Usługa montażu mebli 2026 – https://muratordom.pl/cenniki-budowlane/usluga-montazu-mebli-ile-zaplacisz-w-2026-roku-cennik-montazu-mebli-aa-eHrs-VUWc-LcnH.html (2026-02-13)
- Komandor (producent) – blog: Ile kosztuje szafa na wymiar w 2026 roku – https://www.komandor.pl/blog/ile-kosztuje-szafa-na-wymiar-w-2026-roku-ceny-przedzialy-i-co-naprawde-wchodzi-w-sklad-wyceny (2026-04-23 (akt. 2026-05-18))
- Komandor Oświęcim (salon) – Szafy na wymiar – https://www.esomedia.pl/szafy-komandor/ (brak daty; dane z wyniku wyszukiwania, strona niedostępna (błąd certyfikatu) – niezweryfikowane)
- KB.pl – Cennik szaf na wymiar w Warszawie 2026 – https://kb.pl/cenniki/miejskie/szafy-na-wymiar/warszawa/ (2026-04-29)
- KB.pl – Cennik szafy na wymiar 2026 w ponad 300 miastach – https://kb.pl/cenniki/szafy-na-wymiar/ (2026-04-29)
- KB.pl – Meble i szafy na wymiar – cennik 2026 po województwach – https://kb.pl/meble/szafy/meble-i-szafy-na-wymiar-cennik-po-wojewodztwach/ (2026-01-07)
- KB.pl – Tak drożeją meble na wymiar – https://kb.pl/aktualnosci/remonty/dlaczego-meble-na-wymiar-drozeja/ (2026-03-21)
- FindMe (find-me.pl) – Ile kosztuje szafa na wymiar? Cennik za m² 2026 – https://find-me.pl/ile-kosztuje-szafa-na-wymiar (2026-09-04)
- KB.pl – Drogie meble na wymiar to mit – https://kb.pl/aktualnosci/wnetrza/ile-kosztuja-meble-na-wymiar/ (2025-02-17)
- Leroy Merlin – karta produktu – https://www.leroymerlin.pl/produkty/plyta-meblowa-laminowana-biala-u511-18-mm-280x207-cm-swiss-krono-41349882.html (opinie IV–VI 2026; dane z wyniku wyszukiwania, strona zwraca 403 – niezweryfikowane)
- meble.pl – sklep, płyty Egger 18 mm – https://www.meble.pl/plyty-meblowe/egger,18-mm/ (brak daty; odczyt 2026-11-18)
- KB.pl – Cennik cięcia płyt meblowych – https://kb.pl/meble/inne-meble/cennik-ciecia-plyt-meblowych-zobacz-ile-zaplacisz-za-usluge/ (publ. 2024-01-21 (tekst odnosi się do cen 2026))
- stolarnia-online.pl – płyta meblowa na wymiar Egger W960 SM – https://stolarnia-online.pl/produkt/plyta-meblowa-na-wymiar-egger-biala-gladka-w960sm/ (brak daty; dane z wyniku wyszukiwania, domena nieosiągalna przy weryfikacji – niezweryfikowane)
- Meble.pl S.A. (Rzeszów) – sklep/hurtownia płyt (regulamin: ceny brutto) – https://www.meble.pl/plyty-meblowe/ (stan na 18.11.2026 (data odczytu))
- Meble.pl S.A. (Rzeszów) – https://www.meble.pl/plyty-meblowe/egger,kronospan/ (stan na 18.11.2026 (data odczytu))
- Meble.pl S.A. – karta produktu Egger H1145 ST10 (2070×2800 mm, 5,80 m², 283,80 zł brutto) – https://www.meble.pl/p67898,plyta-meblowa-egger-h1145-st10-dab-bardolino-naturalny-18-mm.html (stan na 18.11.2026 (data odczytu))
- kb.pl – Cennik płyt OSB, MDF i innych (dane ze sklepów Leroy Merlin) – https://kb.pl/cenniki/produkty/plyty-osb-mdf-ceny/ (aktualizacja tabeli 26.05.2025)
- kb.pl – poradnik 'Wybieramy płyty laminowane' (przykładowe ceny, sklep niepodany) – https://kb.pl/porady/wybieramy-plyty-laminowane-rodzaje-ceny-zastosowanie-opinie-porady (publikacja 01.12.2023 (brak aktualizacji))
- Castorama Polska (sklep detaliczny) – https://www.castorama.pl/drewno-i-plyty/plyty-mdf-i-hdf.cat (stan na 18.11.2026 (data odczytu))
- Meble.pl S.A. (Rzeszów) – https://www.meble.pl/plyty/plyta-hdf/ (stan na 18.11.2026 (data odczytu))
- Komandor Hurt Poznań – cennik obróbki płyt – https://www.komandorhurtownia.pl/uslugi/obrobka-plyt/ (brak daty cennika; stan na 18.11.2026 (data odczytu))
- M-Styl Dobczyce – usługi stolarskie – https://www.mstylmeble.pl/uslugi-stolarskie (brak daty; stan na 18.11.2026)
- Artekon – cennik rozkroju – https://artekon.pl/uslugii/rozkroj/ (brak daty; stan na 18.11.2026)
- Demar Meble (Białystok) – cennik usług – https://demar-meble.eu/cennik/ (brak daty; stan na 18.11.2026)
- Mebrandt Patryk Brandt (Kozery k. Warszawy) – cennik cięcia i oklejania – https://mebrandt.pl/cennik (brak daty; stopka 2026; stan na 18.11.2026)
- Juka (Jaworzno) – 'Cennik Zbiorczy 2025.09.26' (PDF) – https://juka.jaworzno.pl/wp-content/uploads/2025/09/Cennik-Zbiorczy-2025.09.26.pdf (cennik 26.09.2025 (wersja '2025.10'); plik usunięty – 404 przy odczycie 18.11.2026)
- P.P.H.U. Format Jezierski Sp.j. (Sztum) – https://format-sztum.pl/fronty-lakierowane-na-wymiar/ (brak daty; stan na 18.11.2026)
- Castorama Polska – blaty laminowane – https://www.castorama.pl/kuchnia/blaty-i-obrzeza-kuchenne/blaty-laminowane.cat (stan na 18.11.2026 (data odczytu))
- Meble.pl S.A. (Rzeszów) – blaty Egger – https://www.meble.pl/blaty/ (stan na 18.11.2026 (data odczytu))
- Castorama Polska – blaty drewniane (Drewmex, GoodHome, DotWood) – https://www.castorama.pl/kuchnia/blaty-i-obrzeza-kuchenne/blaty-drewniane.cat (stan na 18.11.2026 (data odczytu))
- kb.pl – 'Cena konglomeratu kwarcowego' – https://kb.pl/kuchnie/blaty-kuchenne/cena-konglomeratu-kwarcowego-zobacz-ile-kosztuja-blaty-kuchenne-z-konglomeratu/ (publikacja 01.12.2023 (brak aktualizacji – możliwy wzrost cen))
- kb.pl – 'Blat z konglomeratu w kuchni – ceny' (Pamir, Santa Margherita) – https://kb.pl/kuchnie/blaty-kuchenne/blat-z-konglomeratu-w-kuchni-ceny-opinie-wlasciwosci/ (publikacja 01.12.2023)
- Murator (muratordom.pl) – 'Ceny kamiennych blatów do kuchni w październiku 2025' – https://muratordom.pl/wnetrza/kuchnia/ceny-kuchennych-blatow-kamiennych-2025-granit-marmur-i-konglomerat-kwarcowy-ak-k8nc-aQfM-5LGN.html (publikacja 01.10.2025 (ceny z 08.2025; tekst przygotowany z użyciem AI))
- kb.pl – 'Cennik blatów kuchennych 2026' – https://kb.pl/porady/cennik-blatow-kuchennych-ile-kosztuja-blaty-i-ich-montaz/ (publikacja 07.01.2026 (tabela Warszawa 29.04.2026))
- Belmeb.pl (Izdebnik); porównawczo UchwytyMeblowe24.pl – https://www.belmeb.pl/3684-zawias-clip-top-blumotion-110-71b3550.html (stan na 18.11.2026 (cena promocyjna; przed obniżką 15,22 zł))
- DiM Rzeszów (akcesoriameble24.pl) – https://akcesoriameble24.pl/product/zawias-sensys-8645i-nakladany-110/ (stan na 18.11.2026)
- Bagart.pl (GTV Prestige); Meblownia.pl (GTV Solid DCHC) – https://bagart.pl/zawiasy-meblowe/1403-zawias-gtv-nakladany-cichy-domyk-prestige-5908231393531.html (stan na 18.11.2026 (Bagart: najniższa cena 30 dni 3,70 zł z 18.11.2026))
- MF-akcesoria.pl – https://mf-akcesoria.pl/polecane-produkty/1971-blum-szuflada-tandembox-antaro-500-m-biala-niska-komplet.html (stan na 18.11.2026)
- Wiór (wior.pl) – https://wior.pl/szuflady-tandembox-antaro/1145-kompletny-tandembox-antaro-blum-bialy-l-500-wysokosc-d.html (stan na 18.11.2026 (promocja -22%; cena regularna 213,77 zł))
- WIP Rumia – https://wiprumia.pl/produkt/x-tbx-b-500-tbl-wkret-m-30/ (stan na 18.11.2026 (najniższa cena 30 dni 245,70 zł))
- Meblownia.pl – https://meblownia.pl/blum-szuflada-merivobox-500-m-antracyt-40-kg.html (stan na 18.11.2026)
- MF-akcesoria.pl – kategoria Merivobox – https://mf-akcesoria.pl/236-blum-merivobox (stan na 18.11.2026)
- Belmeb.pl – szuflady Blum Legrabox – https://www.belmeb.pl/p/szuflady-blum-legrabox (stan na 18.11.2026)
- Viyar.pl (H139, 273,06 zł) i Ekorex.pl (H251, 307,64 zł brutto) – https://viyar.pl/catalog/zestaw-szuflad-avantech-you-l-500-h-139-bialy-hettich/ (stan na 18.11.2026)
- Domator (Przemyśl) – sklep.domator.eu – https://sklep.domator.eu/5213,szuflada-gtv-modern-box-h-83-mm-l-500-mm-cichy-domyk-szary-pb-d-kpl500a.html (stan na 18.11.2026 (wyprzedaż; najniższa cena 30 dni 68,50 zł))
- Belmeb.pl – prowadnice do szuflad – https://www.belmeb.pl/149-prowadnice-do-szuflad (stan na 18.11.2026)
- Ekorex.pl – https://ekorex.pl/podnosniki-do-frontow/53304-podnosnik-blum-aventos-hk-xs-mocny-20k1501 (stan na 18.11.2026)
- Belmeb.pl – https://www.belmeb.pl/19017-aventos-hk-top-22k2500-silownik-wspolczynnik-mocy-930-2800-przy-2-szt-eclipse-black.html (stan na 18.11.2026)
- MF-akcesoria.pl (415,08–465,90); PHU Gral (381,26) – https://mf-akcesoria.pl/173-aventos-blum (stan na 18.11.2026)
- Belmeb.pl – zestawy podnośników – https://www.belmeb.pl/275-zestawy-podnosnikow (stan na 18.11.2026)
- Belmeb.pl – nogi i nóżki – https://www.belmeb.pl/37-nogi-nozki (stan na 18.11.2026)
- Belmeb.pl – listwy, cokoły, uszczelki – https://www.belmeb.pl/34-listwy-cokoly-uszczelki (stan na 18.11.2026)
- Castorama Polska – cokoły (GoodHome) – https://www.castorama.pl/kuchnia/meble-kuchenne/cokoly.cat (stan na 18.11.2026)
- Belmeb.pl – wszystkie uchwyty (strona 1 z 20) – https://www.belmeb.pl/211-wszystkie-uchwyty (stan na 18.11.2026)
- UchwytyMeblowe24.pl – uchwyty złote – https://uchwytymeblowe24.pl/pl/c/Uchwyty-zlote/181 (stan na 18.11.2026)
- Belmeb.pl – taśmy LED – https://www.belmeb.pl/110-tasmy-led (stan na 18.11.2026 (część cen w promocji))
- Belmeb.pl – profile do taśm LED – https://www.belmeb.pl/109-profile-do-tasm-led (stan na 18.11.2026)
- Belmeb.pl – zasilacze LED – https://www.belmeb.pl/112-zasilacze-led (stan na 18.11.2026)
- KB.pl – Cennik montażu mebli 2026 w ponad 300 miastach – https://kb.pl/cenniki/montaz-mebli/ (29.04.2026)
- Muratordom – Aktualny cennik skręcania mebli 2026 – https://muratordom.pl/cenniki-budowlane/aktualny-cennik-skrecania-mebli-2026-porownanie-cen-w-sklepach-i-u-niezaleznych-monterow-aa-PH5K-moFx-5LhN.html (26.02.2026)
- No Problem (montazmebli24.pl), Warszawa – cennik – https://www.montazmebli24.pl/cennik (brak daty na stronie; odczyt 18.11.2026)
- WP Dom – Meble na wymiar w 2026 r. Ile może kosztować stolarz i montaż? – https://dom.wp.pl/meble-na-wymiar-w-2026-r-ile-moze-kosztowac-stolarz-i-montaz-7344874385627232a (28.10.2026)
- Daibau.pl – Montaż mebli, kuchnie – ceny – https://www.daibau.pl/ceny/montaz_mebli_kuchnie (2026, brak dokładnej daty)
- Cenauslug.pl – Rynek usług w sektorze mebli i zabudów w 2026 roku – https://cenauslug.pl/przewodniki/dom-i-ogrod/meble-i-zabudowy (aktualizacja 24.09.2026)
- DrewnianyMajster.pl – Ile stolarz zarabia na kuchni w 2025? – https://drewnianymajster.pl/ile-stolarz-zarabia-na-kuchni/ (01.03.2026)
- Finwire.pl na podstawie GUS 'Struktura wynagrodzeń według zawodów' (X 2024) – https://finwire.pl/zarobki/zawod/stolarz (dane za X 2024; publikacja GUS 10.02.2026)
- Bankier.pl – Płaca minimalna w górę od stycznia 2026 (rozporządzenie Rady Ministrów) – https://www.bankier.pl/wiadomosc/Placa-minimalna-w-gore-od-stycznia-2026-Znamy-stawke-9009373.html (rozporządzenie opublikowane 15.09.2025; obowiązuje od 01.01.2026)
- Pracuj.pl – oferta F.P.H.U. LUKAS, Wanaty (pow. częstochowski) – https://www.pracuj.pl/praca/stolarz-meblowy-meble-na-wymiar-wanaty-pow-czestochowski,oferta,1004946917 (oferta widoczna w wyszukiwarce w XI 2026; data publikacji niezweryfikowana (strona zwraca 403))
- Pracuj.pl – oferta Mwh Meble, Zator – https://www.pracuj.pl/praca/stolarz-meblowy-k-m-zator-wladyslawa-grabskiego-17,oferta,1004977713 (oferta widoczna w wyszukiwarce w XI 2026; data publikacji niezweryfikowana (403))
- Pracuj.pl – profil pracodawcy Meble Wojtar – https://pracodawcy.pracuj.pl/company/1074244960 (oferta widoczna w wyszukiwarce w XI 2026; data publikacji niezweryfikowana)
- Castorama.pl – Projektowanie kuchni: często zadawane pytania – https://www.castorama.pl/projektowanie-kuchni/czesto-zadawane-pytania (stan na 18.11.2026 (data cennika nie podana))
- Castorama.pl – Usługa wymiarowania i montażu kuchni – https://www.castorama.pl/projektowanie-kuchni/usluga-wymiarowania-i-montazu (stan na 18.11.2026)
- Cenauslug.pl – Montaż aneksu kuchennego – https://cenauslug.pl/dom-i-ogrod/montaz-aneksu-kuchennego (23.06.2026)
- LocaYo Blog – Ile kosztuje montaż mebli IKEA, cennik 2026 – https://www.locayo.app/pl/blog/ile-kosztuje-montaz-mebli-ikea-cennik-2026 (20.10.2026 (aktualizacja))
- Markowski Meble (Kraków) – Ile kosztuje kuchnia na wymiar w 2026 – https://markowskimeble.pl/blog/ile-kosztuje-kuchnia-na-wymiar/ (04.08.2026)
- IKEA Polska – Usługa montażu – https://www.ikea.com/pl/pl/customer-service/services/assembly/ (stan na 18.11.2026 (data cennika nie podana))
- SM-Bud.pl – Ile kosztuje wniesienie mebli? Przewodnik 2026 – https://sm-bud.pl/ile-kosztuje-wniesienie-mebli/ (29.08.2026)
- 4MEB (Jastrzębie-Zdrój) – Cennik mebli na wymiar – https://meble4meb.pl/cennik (aktualizacja 26.06.2026)
- Stolarnia Rydzewo (k. Giżycka) – Meble na wymiar – https://stolarniarydzewo.com/meble-na-wymiar (brak daty (stopka © 2026))
- Meblex II (Kraków) – Wycena – https://kuchnie-meblex2.pl/wycena/ (brak daty (stopka 1997–2026))
- Agata Meble – Montaż mebli kuchennych i sprzętu AGD (fragment z wyników wyszukiwania) – https://www.agatameble.pl/montaz-mebli-kuchennych (niezweryfikowana: strona zwraca 403)
- Wermont – Meble Na Wymiar (Skorzewo) – Projektowanie mebli – https://wermont.eu/projektowanie-mebli/ (brak daty)
- Kuchnia od Stolarza – FAQ – https://kuchniaodstolarza.pl/faq/ (brak daty (stopka © 2026))
- Kuchnia od Stolarza – Legionowo – https://kuchniaodstolarza.pl/legionowo/ (brak daty (stopka © 2026))
- Qchnie.pl (Warszawa-Ursynów) – Kuchnie na wymiar Mokotów – https://meblowanie.com.pl/kuchnie-na-wymiar-mokotow/ (brak daty (stopka © 2026))
- Meble Korona (woj. łódzkie) – Projektowanie mebli – https://www.meblekorona.pl/projektowanie-mebli/ (brak daty)
- Bezprawnik.pl – Usługa wymiarowania ściany kuchennej w IKEA – https://bezprawnik.pl/usluga-wymiarowania-sciany-kuchennej-w-ikea/ (15.11.2026)
- Cenauslug.pl – Zabudowy kuchenne i łazienkowe na wymiar 2026 – https://cenauslug.pl/przewodnik/zabudowy-kuchenne-i-lazienkowe-na-wymiar (aktualizacja 09.2026)
- Oferteo – Stolarz do mebli na wymiar – jak wybrać wykonawcę? [2025] – https://www.oferteo.pl/artykuly/stolarz-do-mebli-na-wymiar (10.09.2025)
- KB.pl – Ile zarabia stolarz – https://kb.pl/aktualnosci/ciekawostki/ile-zarabia-stolarz/ (09.06.2026)
- Przestrzeń z Pasją (Warszawa) – https://przestrzenzpasja.pl/ (brak daty (stopka © 2026))
- Castorama – Kompleksowa usługa montażu (przypis do '-12%') – https://www.castorama.pl/uslugi/kompleksowa-usluga-montazu (OWU z 29.05.2025; strona odczytana 18.11.2026)
- Interpretacja ogólna Ministra Finansów nr PT3.8101.2.2020 z 27.05.2020 (Dz. Urz. MF 2020 poz. 69), tekst w Infor.pl – https://www.infor.pl/akt-prawny/U02.2020.045.0000069,interpretacja-ogolna-nr-pt3810122020-ministra-finansow-w-sprawie-opodatkowania-wlasciwa-stawka-podatku-od-towarow-i-uslug-swiadczenia-polegajacego-na-wykonaniu-trwalej-zabudowy-meblowej-w-obiektach-bu.html (27.05.2020 (obowiązuje; nie znaleziono zmian w 2025–2026))
- Akademia LTCA – Jak bezpiecznie stosować 8% VAT? Przewodnik po umowach na montaż zabudowy i blatów – https://akademialtca.pl/blog/jak-bezpiecznie-stosowac-8-vat-kompletny-przewodnik-po-umowach-na-montaz-zabudowy-i-blatow (30.01.2026)
- Infor.pl – Stawka VAT 8% w budownictwie mieszkaniowym a powierzchnia użytkowa (art. 41 ust. 12a–12c) – https://ksiegowosc.infor.pl/podatki/vat/stawki-vat/5599477,stawka-vat-8-w-budownictwie-mieszkaniowym-a-powierzchnia-uzytkowa.html (26.10.2022; przepis nadal obowiązuje (te same limity podaje Akademia LTCA 30.01.2026))
- Podatki.biz – Nowy limit zwolnienia podmiotowego z VAT w 2026 r. (ustawa z 24.06.2025, Dz.U. poz. 896) – https://www.podatki.biz/artykuly/nowy-limit-zwolnienia-podmiotowego-z-vat-w-2026-r-mf-o-przepisach-przejsciowych_4_60302.htm (obowiązuje od 01.01.2026)
- IKEA Polska – kategoria 'Kombinacje kuchni METOD' (6 produktów); przeliczenie zł/mb własne – https://www.ikea.com/pl/pl/cat/kombinacje-kuchni-metod-50005/ (stan na 18.11.2026 (odczyt strony; brak oznaczeń promocji przy produktach; ogólny kupon 100 zł za każde 800 zł na kuchnie METOD 04.11–01.12 nieuwzględniony))
- IKEA Polska – karta produktu 496.149.17 – https://www.ikea.com/pl/pl/p/metod-kuchnia-bialy-veddinge-bialy-s49614917/ (stan na 18.11.2026)
- IKEA Polska – karta produktu 696.149.16 – https://www.ikea.com/pl/pl/p/metod-kuchnia-bialy-veddinge-bialy-s69614916/ (stan na 18.11.2026)
- IKEA Polska – karty produktów 395.811.30 (220 cm) i 196.149.47 (240 cm); przeliczenie własne – https://www.ikea.com/pl/pl/p/knoxhult-kuchnia-bialy-s19614947/ (stan na 18.11.2026)
- Obliczenie własne: ceny kombinacji METOD (ikea.com/pl) + 'Cennik usług w IKEA' od 07.11.2026 – https://www.ikea.com/pl/pl/local-apps/pdf/regulaminy/2019/Cennik_uslug_w_IKEA_Retail_sp_z_o_o.pdf (stan na 18.11.2026)
- IKEA Polska – kategoria 'Szafy z drzwiami przesuwnymi' (76 produktów) + karty produktów; przeliczenie własne – https://www.ikea.com/pl/pl/cat/szafy-z-drzwiami-przesuwnymi-43635/ (stan na 18.11.2026)
- IKEA Polska – karta produktu 804.581.94 – https://www.ikea.com/pl/pl/p/pax-obudowa-drzwi-przes-z-prowadnicami-bialy-80458194/ (stan na 18.11.2026)
- Black Red White (brw.pl) – kategoria 'Zestawy mebli kuchennych 240 cm' (71 produktów) i karta Sara Line; przeliczenie wł – https://www.brw.pl/meble/meble-kuchenne/zestawy-kuchenne/zestawy-240-cm/ (stan na 18.11.2026 (oznaczenia 'Stale niska cena'))
- Black Red White – karta produktu K24-JUNONA_MODUL_WER_2/240_ZBL – https://www.brw.pl/komplet-kuchenny-junona-line-240-cm-z-blatem-bialy-dab-delano-jasny,155026 (stan na 18.11.2026)
- Black Red White – karty produktów Semi Line (45443, 45442, 38629, 29462); przeliczenie własne – https://www.brw.pl/semi-line,45443 (karty oglądane 18.11.2026, wszystkie oznaczone 'Produkt został wyprzedany')
- Black Red White – karta produktu K24-BLAT/240/A-DCRZ – https://www.brw.pl/blat-240-junona-line,58001 (stan na 18.11.2026)
- Black Red White – kategoria 'Szafy przesuwne' (2006 produktów, także partnerzy); przeliczenie własne, liczba w nazwie pr – https://www.brw.pl/meble/szafy/szafy-przesuwne/ (stan na 18.11.2026 (wiele cen promocyjnych))
- Castorama Polska – kategoria 'Gotowe zestawy mebli kuchennych' (1118 produktów); przeliczenie własne – https://www.castorama.pl/kuchnia/meble-kuchenne/gotowe-zestawy-mebli-kuchennych.cat (stan na 18.11.2026)
- Castorama Polska – karta produktu 5902012164679 – https://www.castorama.pl/gotowy-zestaw-mebli-kuchennych-romantica-240-cm-dab-craft-zloty/5902012164679_CAPL.prd (stan na 18.11.2026)
- Castorama Polska – karta produktu 3663602637455 – https://www.castorama.pl/korpus-szafki-kuchennej-dolnej-goodhome-caraway-60-cm/3663602637455_CAPL.prd (stan na 18.11.2026)
- Castorama Polska – karta produktu 3663602637639 – https://www.castorama.pl/korpus-szafki-kuchennej-wiszacej-goodhome-caraway-60-cm/3663602637639_CAPL.prd (stan na 18.11.2026)
- Castorama Polska – karty produktów 5063022522702 i 5063022721808; przeliczenie własne – https://www.castorama.pl/front-kuchenny-do-szafki-goodhome-stevia-60-cm-bialy-mat/5063022522702_CAPL.prd (stan na 18.11.2026)
- Castorama Polska – wynik wyszukiwarki dla karty 3663602643784 (karty nie pobierałem) – https://www.castorama.pl/zawias-cichy-domyk-goodhome-kombu-110-/3663602643784_CAPL.prd (odczyt z wyników wyszukiwarki 18.11.2026; brak daty)
- Castorama Polska – wyniki wyszukiwarki dla kart blatów (Berberis, Algiata, Kala) – https://www.castorama.pl/kuchnia/blaty-i-obrzeza-kuchenne/blaty-laminowane.cat?Marka=GoodHome&p=0 (odczyt z wyników wyszukiwarki 18.11.2026; brak daty)
- Leroy Merlin Polska – wyniki wyszukiwarki dla kart produktów (Soul, Vinto, Acari Long, Shiran 2); strona blokuje bezpośr – https://www.leroymerlin.pl/produkty/kuchnia-i-jadalnia/meble-kuchenne/zestawy-mebli-kuchennych/zestawy-mebli/meble-kuchenne-240-cm-p.html (odczyt z wyników wyszukiwarki 18.11.2026; brak daty; niezweryfikowane bezpośrednio)
- Leroy Merlin Polska – wyniki wyszukiwarki dla kart produktów; strona blokuje pobranie – https://www.leroymerlin.pl/produkty/kuchnia-i-jadalnia/meble-kuchenne/zestawy-mebli-kuchennych/zestawy-mebli/zestawy-mebli-kuchennych-z-blatem-p.html (odczyt z wyników wyszukiwarki 18.11.2026; brak daty; niezweryfikowane)
- Leroy Merlin Polska – wyniki wyszukiwarki dla kart Delinia iD; strona blokuje pobranie – https://www.leroymerlin.pl/produkty/kuchnia-i-jadalnia/meble-kuchenne-modulowe-delinia-id/ (odczyt z wyników wyszukiwarki 18.11.2026; część stron indeksowana ok. 266 dni wcześniej; niezweryfikowane)
- OBI Polska – wyniki wyszukiwarki dla kart produktów; obi.pl zwraca błąd przy pobieraniu – https://www.obi.pl/search/meble%20kuchenne%20240%20cm/ (odczyt z wyników wyszukiwarki 18.11.2026; brak daty; niezweryfikowane)
- OBI Polska – wyniki wyszukiwarki; niezweryfikowane – https://www.obi.pl/search/blaty%20kuchenne/ (odczyt z wyników wyszukiwarki 18.11.2026; jedna z ofert w promocji 07.10–04.11.2026)
- VOX – artykuł 'Szafy na wymiar – ceny' z listą produktów Stor; przeliczenie własne – https://vox.pl/inspirations/ideas/szafy-na-wymiar-ceny (stan na 18.11.2026 (ceny 'od' w promocji Black Week; artykuł bez daty))
- Tylko (tylko.com/pl-pl) – wyniki wyszukiwarki dla stron produktów i linii; strona blokuje pobranie (HTTP 403) – https://tylko.com/pl-pl/product-lines/wardrobe (odczyt z wyników wyszukiwarki 18.11.2026; brak daty; promocje -35 do -41%; niezweryfikowane)
- KB.pl – 'Meble kuchenne na zamówienie czy z sieciówki? Porównujemy ceny' – https://kb.pl/kuchnie/meble-kuchenne/meble-kuchenne-na-zamowienie-czy-z-sieciowki-porownujemy-ceny/ (publikacja 27.02.2024; ceny sieciówek z 17.02.2024)
- Murator Dom – 'Aktualny cennik skręcania mebli 2026' – https://muratordom.pl/wnetrza/prace-wykonczeniowe/aktualny-cennik-skrecania-mebli-2026-porownanie-cen-w-sklepach-i-u-niezaleznych-monterow-aa-PH5K-moFx-5LhN.html (publikacja 26.02.2026)
