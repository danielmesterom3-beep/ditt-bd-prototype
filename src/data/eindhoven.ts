import type { Gebied } from './types'

// Bronnen: Gebiedsanalyses Vastgoeddata.nl (29 april 2026); JLL Eindhoven Office Q1 2026 (© Jones Lang LaSalle IP, Inc. 2026)
// Peildatum gebiedskenmerken: 31 maart 2026 | Huurprijzen: gemiddelde afgelopen 2 jaar
// JLL Q1 2026 Eindhoven stadsbreed: leegstand 6,8% (↑ van 6,7%), prime rent €265/m²/jr (stabiel), YTD opname 3.300 m², aanbod 114.800 m²

const eindhoven: Gebied[] = [
  // ─────────────────────────────────────────────────────────────────
  // 1. CENTRUM EINDHOVEN (Stationsgebied / Kennedyplein / Vestdijk)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'centrum-eindhoven',
    naam: 'Centrum Eindhoven',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 265000, // schatting: stationsgebied + Vestdijk + Oude Stad; polygon was te groot
      leegstandPercentage: 6.5,
      huurprijsBandwidth: { min: 125, max: 320 },
      huurprijsGemiddeld: 258,
      opnameVorigeJaar: 15447, // 2025: <500m² 4.801 + >=500m² 10.646
      beschikbaarAanbod: 17200, // herschaald o.b.v. gecorrigeerde voorraad (leegstand 6.5%)
    },
    vastgoedMix: {
      kantoor: 9, // 567.325 / 6.592.828 m² totaal = 8,6%
      retail: 7,
      wonen: 67,
      overig: 17, // bijeenkomst 5%, onderwijs 3%, zorg 1%, overig
    },
    pandenInOntwikkeling: [
      {
        id: 'cent-dev-01',
        naam: 'EDGE Eindhoven',
        adres: 'Stationsweg 17, Centrum Eindhoven',
        oppervlakte: 25000,
        fase: 'oplevering',
        verwachteOplevering: '2025',
        ontwikkelaar: 'EDGE Technologies',
        toelichting: 'Kantoorgedeelte ca. 25.000 m² v.v.o. over 10 verdiepingen (vloeren 664–2.741 m²). Eigenaar kantoor: Bouwinvest Dutch Office Fund. Gebouwd door VolkerWessels. Mixed-use: restaurant, koffiebar, co-working, parkeergarage. Onderdeel Knoop XL. Verschuuren & Schreppers betrokken bij verhuur. Zeer relevant voor Ditt: multi-tenant met vloeren precies in Ditt\'s sweetspot (500–2.741 m²). Contactpersoon Constantijn Berning staat al in warme ingangen.',
      },
      {
        id: 'cent-dev-05',
        naam: 'Belle van Zuylenstraat 4',
        adres: 'Belle van Zuylenstraat 4, Centrum Eindhoven',
        oppervlakte: 13429,
        fase: 'vergunning',
        verwachteOplevering: '2026',
        toelichting: 'Nieuw kantoorproject centrumrand. Nog in vergunningsfase, tijd om vroeg in beeld te komen. Potentieel relevant als multi-tenant: meerdere inrichtingsprojecten mogelijk. Nog weinig publiek over eigenaar en concept, nader onderzoek nodig.',
      },
      {
        id: 'fell-dev-02',
        naam: 'Wassenaarstraat 1',
        adres: 'Wassenaarstraat 1, Centrum Eindhoven',
        oppervlakte: 3855,
        fase: 'oplevering',
        verwachteOplevering: '2025',
        toelichting: 'Kleinschalige kantoorontwikkeling nabij Kennedyplein. Beperkt relevant: past qua omvang in Ditt\'s range maar het is één pand. Eerder een fast fit-out kans dan een full design & build traject.',
      },
    ],
    trends: [
      {
        id: 'cent-trend-01',
        omschrijving: 'Huurprijzen kantoor stijgen structureel: van €145/m²/jr (2016) naar €245/m²/jr (2025), +69% in 9 jaar.',
        richting: 'positief',
      },
      {
        id: 'cent-trend-02',
        omschrijving: 'Sterk beleggingsvolume in 2024 (piek Q3 2024); institutionele interesse in centrumkantoren neemt toe.',
        richting: 'positief',
      },
      {
        id: 'cent-trend-03',
        omschrijving: 'Edge Eindhoven (35.351 m²) als katalysator: stationslocatie trekt zakelijke dienstverlening en advocatuur aan (Boels Zanders 917 m², €265/m²/jr).',
        richting: 'positief',
      },
      {
        id: 'cent-trend-04',
        omschrijving: 'Dominant woonfunctie (67%) beperkt ruimte voor kantooruitbreiding; transformatiedruk op resterende kantoorpanden neemt toe.',
        richting: 'negatief',
      },
      {
        id: 'cent-trend-05',
        omschrijving: 'Opname >=500m² volatiel (2025: 10.646 m², 2022: 6.724 m², 2021: 14.749 m²); vraag concentreert zich op A-locaties bij station.',
        richting: 'neutraal',
      },
      {
        id: 'fell-trend-01',
        omschrijving: 'Hoogste gemiddelde huurprijs van Eindhoven (€285/m²/jr); prime status neemt toe door TU/e-nabijheid en ASML-spillover.',
        richting: 'positief',
      },
      {
        id: 'fell-trend-02',
        omschrijving: 'Opname >=500m² daalde in 2025 naar 2.191 m² (van 6.905 in 2024); markt selectiever door beperkt aanbod op toplocaties.',
        richting: 'neutraal',
      },
      {
        id: 'fell-trend-03',
        omschrijving: 'Kleine, innovatieve bedrijven (life sciences, neurotechnology) vestigen zich rondom TU-terrein; cluster vergroot aantrekkingskracht.',
        richting: 'positief',
      },
      {
        id: 'fell-trend-04',
        omschrijving: 'Beperkte nieuwbouwpijplijn (20.852 m² in ontwikkeling, slechts 0,84% van voorraad); aanbodschaarste op korte termijn.',
        richting: 'neutraal',
      },
    ],
    warmeContacten: [
      {
        id: 'cent-wc-01',
        naam: 'Constantijn Berning',
        organisatie: 'Edge Eindhoven (Edge Technologies)',
        rol: 'Projectmanager / Development Manager',
        email: '',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'Edge Eindhoven op Stationsweg 17 (35.351 m²) is het grootste kantoorontwikkelingsproject in het centrum. Berning is contactpersoon voor het project. Kansen voor serviceconcepten, huurdersbegeleiding en facilitaire diensten.',
      },
      {
        id: 'fell-wc-01',
        naam: 'Wouter Cox',
        organisatie: 'HERE Technologies',
        rol: 'Facility / Real Estate Manager',
        email: '',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'HERE Technologies gevestigd op Kennedyplein 222. Grote tech-huurder; relevant als referentie en potentiële groeivraag.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'cent-og-01',
        naam: 'Boels Zanders Advocaten',
        sector: 'Juridische dienstverlening',
        profiel: 'Gehuurd 917 m² op Stationsweg 17 (€265/m²/jr, september 2026). Prime-huurder Edge Eindhoven.',
        reden: 'Meest recente grote transactie in het centrum; vestigingsstrategie gericht op toplocaties.',
        status: 'gewonnen',
      },
      {
        id: 'cent-og-02',
        naam: '',
        sector: 'Creatieve industrie / media',
        profiel: 'Stories.space gehuurd 412 m² op Vestdijk 23 (€218/m²/jr, maart 2026). Creatieve werkruimte-operator.',
        reden: 'Groeiend concept voor flexibele creatieve kantoorruimte; uitbreidingsvraag mogelijk.',
        status: 'prospect',
      },
      {
        id: 'cent-og-03',
        naam: 'Code for Good',
        sector: 'Tech / sociaal',
        profiel: 'Gehuurd 405 m² op Willemstraat 1A (€244/m²/jr, augustus 2025).',
        reden: 'Actieve huurder centrumlocatie; relevant voor maatschappelijk georiënteerde klantenpropositie.',
        status: 'prospect',
      },
      {
        id: 'fell-og-01',
        naam: 'Scherp Online',
        sector: 'Digitale marketing / tech',
        profiel: 'Gehuurd 728 m² op Professor Dr Dorgelolaan 14 (€181/m²/jr, juni 2025). Groeiend digitaal bureau.',
        reden: 'Recente huurder in het gebied; mogelijk uitbreidingsvraag op termijn.',
        status: 'prospect',
      },
      {
        id: 'fell-og-02',
        naam: '',
        sector: 'Life sciences / medtech',
        profiel: 'Open Mind Neuroscience gehuurd 303 m² op Bogert 1 (€150/m²/jr, mei 2025). Neurotechnology spin-off TU/e-omgeving.',
        reden: 'Snelgroeiend wetenschappelijk bedrijf in Brainport-ecosysteem; schaalvraag verwacht.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'cent-inz-01',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'inrichting',
        inzicht: 'Huurders beginnen vanaf de tweede bezichtiging na te denken over inrichting, zij willen weten wat de totale kosten inclusief afbouw zijn, want die moeten in de huurtermijn worden terugverdiend.',
      },
      {
        id: 'cent-inz-02',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'marktdynamiek',
        inzicht: 'Instapklare kantoren zijn populair bij het segment onder 750 m²; grotere huurders met langere contracten (10 jaar bij nieuwbouw zoals Edge Eindhoven) maken liever eigen inrichtingskeuzes.',
      },
      {
        id: 'cent-inz-03',
        bron: 'Renzo Goessens',
        organisatie: 'Tenzin Vastgoed',
        datum: '2026-02-14',
        categorie: 'acquisitie',
        inzicht: 'Voor advocatenkantoren en zakelijke dienstverleners, sterk vertegenwoordigd in het centrum, moet taalgebruik, kleding en inhoudelijke nadruk volledig worden aangepast op de gesprekspartner.',
      },
      {
        id: 'fell-inz-01',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'acquisitie',
        inzicht: 'Snelheid is in Eindhoven doorslaggevend: een testfit moet de volgende ochtend klaar liggen, anders is een partij al te laat. Zichtbaar snel schakelen is de beste introductie bij lokale makelaars.',
      },
      {
        id: 'fell-inz-02',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'marktdynamiek',
        inzicht: 'De Eindhovense markt is een vervangingsmarkt met een sweetspot van 500–600 m²; er zijn slechts circa tien actieve zoekers boven de 1.000 m², tegenover tachtig actieve zoekers onder die grens.',
      },
    ],
    partijen: [
      { id: 'cent-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'cent-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'cent-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'cent-lead-01',
        pandnaam: 'The Core',
        adres: 'The Core, Eindhoven',
        huurder: 'PNO Consultants',
        branche: 'Subsidie- / innovatieadvies',
        omvang: 729,
        huurprijsPerM2: 182,
        eigenaar: 'Braintown',
        contractBegin: '2022-07',
        motivatie: 'PNO Consultants, marktleider EU-subsidieadvies, huurt 729 m² in The Core. Contract loopt in juli 2027 af; dit is de grootste en meest profielrijke lead in het centrum, precies op de grens van Ditt.\'s sweetspot.',
      },
      {
        id: 'cent-lead-02',
        pandnaam: 'Parklaan 31',
        adres: 'Parklaan 31, Eindhoven',
        huurder: 'Van Lanschot',
        branche: 'Private banking / vermogensbeheer',
        omvang: 431,
        huurprijsPerM2: 348,
        contractBegin: '2022-11',
        motivatie: 'Van Lanschot betaalt met €348/m²/jr de hoogste huurprijs in het centrum, signaal van een opdrachtgever die representativiteit en kwaliteit prioriteert. 431 m² in de sweetspot, contract loopt november 2027 af.',
      },
      {
        id: 'cent-lead-03',
        pandnaam: 'Metz Point I',
        adres: 'Metz Point I, Eindhoven',
        huurder: 'Maandag Interim',
        branche: 'Interim management',
        omvang: 408,
        huurprijsPerM2: 145,
        eigenaar: 'Forma',
        contractBegin: '2022-07',
        motivatie: 'Interim-managementbureau in de zakelijke kern van het centrum; 408 m² in de sweetspot. Contract in juli 2027, ruim op tijd om een turnkey-propositie voor te leggen.',
      },
      {
        id: 'fell-lead-01',
        pandnaam: 'De Admirant',
        adres: 'Admirantweg, Eindhoven',
        huurder: '& Van de Laar',
        branche: 'Zakelijke dienstverlening',
        omvang: 307,
        contractBegin: '2022-01',
        motivatie: 'Zakelijke dienstverlener in prime centrumlocatie De Admirant; contract loopt per januari 2027 af, directe acquisitiekans in Ditt.\'s sweetspot.',
      },
      {
        id: 'fell-lead-02',
        pandnaam: 'Kennedyhuis',
        adres: 'Kennedyplein, Eindhoven',
        huurder: '3Dimerce',
        branche: 'E-commerce tech',
        omvang: 282,
        contractBegin: '2022-03',
        motivatie: 'Tech-huurder op het Kennedyhuis, meest zichtbare locatie van Fellenoord. Contract loopt in maart 2027 af; kans voor herhuisvesting met een passende tech-inrichting.',
      },
      {
        id: 'fell-lead-03',
        pandnaam: 'Eindhoven Tower',
        adres: 'Kennedyplein, Eindhoven',
        huurder: 'Unitas Software',
        branche: 'Software / IT',
        omvang: 336,
        contractBegin: '2022-06',
        motivatie: 'Software-huurder in het meest herkenbare kantoorgebouw van Fellenoord; 336 m² valt precies in de sweetspot. Loopt juni 2027 af, voldoende aanlooptijd voor een sterk voorstel.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. STRIJP-S
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'strijp-s',
    naam: 'Strijp-S',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 46000, // schatting: creatief district, 75% wonen, beperkt kantooraanbod (Bold, Ketelhuis e.o.); polygon was te groot
      leegstandPercentage: 4.2,
      huurprijsBandwidth: { min: 130, max: 270 },
      huurprijsGemiddeld: 200,
      opnameVorigeJaar: 1503, // 2025: alleen <500m² (1.503); >=500m² = 0
      beschikbaarAanbod: 1950, // herschaald o.b.v. gecorrigeerde voorraad (leegstand 4.2%)
    },
    vastgoedMix: {
      kantoor: 9, // 275.672 / 3.113.202 m² totaal
      retail: 3,
      wonen: 75,
      overig: 13, // ateliers, creatieve bedrijfsruimte, horeca
    },
    pandenInOntwikkeling: [
      {
        id: 'ss-dev-01',
        naam: 'Ir. De Broekertstraat 1',
        adres: 'Ir. De Broekertstraat 1, Strijp-S Eindhoven',
        oppervlakte: 21273,
        fase: 'oplevering',
        verwachteOplevering: '2025',
        ontwikkelaar: 'SDK Vastgoed / Park Strijp Beheer',
        toelichting: 'Grootste actieve ontwikkeling op Strijp-S. Mixed-use met kantoor en creatieve werkruimte. Onderdeel van fase 4. Relevant voor Ditt: groot volume nieuwe werkruimte waar huurders instromen die inrichting nodig hebben. Kanttekening: Strijp-S trekt vooral creatief mkb, projectomvang per huurder zal kleiner zijn dan bij EDGE.',
      },
    ],
    trends: [
      {
        id: 'ss-trend-01',
        omschrijving: 'Markt voor >=500m² drooggevallen in 2025 (0 m² opname); vraag overstijgt aanbod voor middelgrote units.',
        richting: 'negatief',
      },
      {
        id: 'ss-trend-02',
        omschrijving: 'Kleine units (<500m²) populair: opname hersteld naar 1.503 m² in 2025 na dip in 2024 (80 m²). Huurprijzen kleine units tot €266/m²/jr.',
        richting: 'positief',
      },
      {
        id: 'ss-trend-03',
        omschrijving: 'Stijgende koopprijs kantoorfunctie (verkocht gebruiksoppervlak kantoorfunctie: 123 eenheden in 2025, stabiel hoog).',
        richting: 'positief',
      },
      {
        id: 'ss-trend-04',
        omschrijving: 'Dominantie woonfunctie (75%) beperkt kantoorgroei; transformatie naar wonen zet door ten koste van beschikbaar werkoppervlak.',
        richting: 'negatief',
      },
      {
        id: 'ss-trend-05',
        omschrijving: 'Creatieve en techsector blijft aantrekken; communityeffect Bold-Eindhoven en Ketelhuis versterkt ecosysteem.',
        richting: 'positief',
      },
    ],
    warmeContacten: [
      {
        id: 'ss-wc-01',
        naam: 'Wesley Tegelaers',
        organisatie: 'Jamestown',
        rol: 'Property Manager, Bold Eindhoven',
        email: 'Wesley.Tegelaers@JamestownLP.com',
        telefoon: '+31618906030',
        datumLaatsteContact: '',
        notitie: 'Jamestown is eigenaar/beheerder van Bold Eindhoven op Strijp-S. Wesley Tegelaers is property manager. Bold Eindhoven is een van de meest prominente kantoor/creatieve werkruimteconcepten in Eindhoven. Kansen voor facilitaire samenwerking, huurdersdiensten en netwerktoegang tot tech-community.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'ss-og-01',
        naam: 'Balans Eindhoven',
        sector: 'Zorg / welzijn',
        profiel: 'Gehuurd 364 m² op Dr Cuyperslaan 74 (€207/m²/jr, november 2025). Zorgaanbieder in creatief gebied.',
        reden: 'Onconventionele vestigingskeuze voor zorgbranche, signaal van brede aantrekkingskracht Strijp-S.',
        status: 'prospect',
      },
      {
        id: 'ss-og-02',
        naam: 'Ultra Commerce',
        sector: 'E-commerce tech',
        profiel: 'Gehuurd 176 m² op Philitelaan 57 (€233/m²/jr, juni 2025). Tech-scale-up.',
        reden: 'Groeiend tech-bedrijf; kenmerkende huurder doelgroep Strijp-S.',
        status: 'prospect',
      },
      {
        id: 'ss-og-03',
        naam: 'Huidzorg 040',
        sector: 'Medische / beauty',
        profiel: 'Hoogste huurprijs in het gebied: €266/m²/jr voor 115 m² (Barth van Bassenstraat 2, sept. 2025).',
        reden: 'Bereidheid premium te betalen voor Strijp-S vestiging; aantrekkingskracht locatie bewezen.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'ss-inz-01',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'samenwerking',
        inzicht: 'Eindhoven heeft een overvloed aan lokale inrichtingspartijen (Hal2, King Kongs, VB Vastgoedinrichter, Dan Wack, Bureaubas) die snel en no-nonsense werken, passend bij de Brabantse bedrijfscultuur. Een nieuwkomer moet beginnen met één sterk referentieproject in de regio.',
      },
      {
        id: 'ss-inz-02',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'acquisitie',
        inzicht: 'Koude acquisitie via LinkedIn of directe mail werkt averechts. Netwerk via Dynamis-events (Provada) en wederkerigheid zijn de norm in Eindhoven.',
      },
    ],
    partijen: [
      { id: 'ss-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ss-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ss-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'ss-lead-01',
        pandnaam: 'Beukenlaan',
        adres: 'Beukenlaan, Eindhoven',
        huurder: 'Simbuka',
        branche: 'Tech / consultancy',
        omvang: 460,
        huurprijsPerM2: 138,
        eigenaar: 'Certitudo Capital',
        contractBegin: '2022-02',
        motivatie: 'Simbuka huurt 460 m² op Strijp-S, tech-consultancy in het creatieve hart van Eindhoven. Contract loopt in februari 2027 af: meest urgente lead in het gebied, met profiel dat naadloos aansluit op Ditt.\'s portfolio.',
      },
      {
        id: 'ss-lead-02',
        pandnaam: 'Scherpakkerweg',
        adres: 'Scherpakkerweg, Eindhoven',
        huurder: 'Recornect',
        branche: 'Zakelijke dienstverlening / tech',
        omvang: 360,
        huurprijsPerM2: 190,
        contractBegin: '2022-06',
        motivatie: 'Recornect huurt 360 m² aan de hogere kant van de Strijp-S huurprijsrange (€190/m²/jr), een huurder die kwaliteit waardeert. Contract loopt juni 2027 af; kans voor een creatieve herinrichting die past bij de Strijp-identiteit.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. AIRPORT EINDHOVEN (Flight Forum / Park Forum / Luchthavenweg)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'airport-ehv',
    naam: 'Airport / Flight Forum',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 205000, // schatting: Flight Forum + Park Forum businesspark; polygon iets te groot (incl. omliggend industriegebied)
      leegstandPercentage: 11.5,
      huurprijsBandwidth: { min: 80, max: 175 },
      huurprijsGemiddeld: 156,
      opnameVorigeJaar: 8751, // 2025: <500m² 1.729 + >=500m² 7.022
      beschikbaarAanbod: 23600, // herschaald o.b.v. gecorrigeerde voorraad (leegstand 11.5%)
    },
    vastgoedMix: {
      kantoor: 10, // 283.104 / 2.779.690 m² totaal
      retail: 1,
      wonen: 35,
      overig: 54, // bedrijfsmatig/logistiek dominant (1.368.040 m²)
    },
    pandenInOntwikkeling: [
      {
        id: 'ap-dev-01',
        naam: 'Park Forum 1207',
        adres: 'Park Forum 1207, 5657HK Eindhoven',
        oppervlakte: 11997,
        fase: 'bouw',
        verwachteOplevering: '2023 / afgerond',
        toelichting: 'Kantoorontwikkeling op Park Forum; prime zakelijk kantorenpark nabij luchthaven.',
      },
      {
        id: 'ap-dev-02',
        naam: 'Park Forum 1360',
        adres: 'Park Forum 1360, 5657HM Eindhoven',
        oppervlakte: 5028,
        fase: 'bouw',
        verwachteOplevering: '2024 / afgerond',
        toelichting: 'Kleinere kantoorontwikkeling op Park Forum.',
      },
      {
        id: 'ap-dev-03',
        naam: 'Habraken 2315',
        adres: 'Habraken 2315, 5507TK Veldhoven',
        oppervlakte: 15551,
        fase: 'bouw',
        verwachteOplevering: '2022 / afgerond',
        toelichting: 'Bedrijfspand met kantoorfunctie op Habraken-bedrijventerrein nabij luchthaven (Veldhoven).',
      },
    ],
    trends: [
      {
        id: 'ap-trend-01',
        omschrijving: 'Opname >=500m² hersteld in 2025 naar 7.022 m² (van 4.404 in 2024); grote huurders actief (Toi-Toys 4.260 m², PowerSlim 1.794 m²).',
        richting: 'positief',
      },
      {
        id: 'ap-trend-02',
        omschrijving: 'Bedrijfsruimtemarkt volatiel: 2022 piek (39.471 m²), daarna daling; 2025 herstel (4.190 m²). Logistiek vrijwel verdwenen.',
        richting: 'neutraal',
      },
      {
        id: 'ap-trend-03',
        omschrijving: 'Hoge leegstand oudere kantoorpanden op Flight Forum; kwaliteitsspreiding groot tussen A-locaties (Park Forum) en B/C-panden.',
        richting: 'negatief',
      },
      {
        id: 'ap-trend-04',
        omschrijving: 'Bedrijfsruimtevraag gedomineerd door middelgrote partijen (20-499 FTE); Airport-zone sterk als cost-effective alternatief voor centrum.',
        richting: 'positief',
      },
    ],
    warmeContacten: [
      {
        id: 'ap-wc-01',
        naam: '',
        organisatie: 'Regus (IWG)',
        rol: 'Centre Manager / Sales',
        email: '',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'Regus gevestigd op Flight Forum 40. Grote flex-workspace-operator; relevant als intermediair voor huurdersvraag en als benchmark voor serviceconcepten in het gebied.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'ap-og-01',
        naam: 'PowerSlim Nederland',
        sector: 'Gezondheid / e-commerce',
        profiel: 'Gehuurd 1.794 m² op Park Forum 1053 (€97/m²/jr, mei 2025). Snelgroeiend gezondheids- en voedingsbedrijf.',
        reden: 'Groeivraag aangetoond; nieuwe huurder A-locatie Park Forum.',
        status: 'prospect',
      },
      {
        id: 'ap-og-02',
        naam: 'Toi-Toys',
        sector: 'Consumer goods / distributie',
        profiel: 'Grootste transactie regio 2025: 4.260 m² op Luchthavenweg 48 (€156/m²/jr, september 2025). Speelgoedbedrijf met distributiecentrum.',
        reden: 'Grote huurder; kansen voor aanvullende kantoorvraag bij groei.',
        status: 'prospect',
      },
      {
        id: 'ap-og-03',
        naam: 'Pregis Nederland',
        sector: 'Verpakkingsindustrie',
        profiel: 'Gehuurd 968 m² op Park Forum 1053 (€139/m²/jr, mei 2025). Industrieel bedrijf in kantooromgeving.',
        reden: 'Actieve huurder Park Forum; potentieel voor uitbreiding.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'ap-inz-01',
        bron: 'Michiel Bijmolt',
        organisatie: 'Ditt. Officemakers, testmoment contactprotocol',
        datum: '2026-04-24',
        categorie: 'inrichting',
        inzicht: 'Op B-locaties zoals een bedrijventerrein draait de pitch volledig op basisgetallen en de base fit-out. Een fit-out van €1.000/m² is niet logisch als de huurder slechts €150/m²/jr betaalt over vijf jaar, de investering moet in verhouding staan tot het totaalplaatje van het object.',
      },
      {
        id: 'ap-inz-02',
        bron: 'Michiel Bijmolt',
        organisatie: 'Ditt. Officemakers, testmoment contactprotocol',
        datum: '2026-04-24',
        categorie: 'acquisitie',
        inzicht: 'Het eerste contactmoment is altijd telefonisch, een koude e-mail werkt te afstandelijk. Bellen geeft directe mogelijkheid om het gesprek te sturen op totale ontzorging: van A tot Z begeleiden, grip op prijs, kwaliteit en doorlooptijd.',
      },
    ],
    partijen: [
      { id: 'ap-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ap-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ap-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'ap-lead-01',
        pandnaam: 'Flight Forum',
        adres: 'Flight Forum, Eindhoven',
        huurder: 'TWC IT Solutions',
        branche: 'IT-dienstverlening',
        omvang: 714,
        huurprijsPerM2: 136,
        contractBegin: '2022-11',
        motivatie: 'TWC IT Solutions huurt 714 m² op Flight Forum, bovengrens van de sweetspot, IT-sector, en een huurder die gewend is aan een functionele maar professionele werkomgeving. Contract loopt november 2027 af.',
      },
      {
        id: 'ap-lead-02',
        pandnaam: 'Meerenakkerplein',
        adres: 'Meerenakkerplein, Eindhoven',
        huurder: 'Sempre Technology',
        branche: 'Technology',
        omvang: 360,
        huurprijsPerM2: 143,
        eigenaar: 'Profinn',
        contractBegin: '2022-09',
        motivatie: 'Sempre Technology huurt 360 m², midden in de sweetspot. Tech-huurder in de Airport-zone met contract tot september 2027; tijdig genoeg om een turnkey-inrichtingspropositie voor te bereiden.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. HTC / ASML (High Tech Campus, Veldhoven/Eindhoven)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'high-tech-campus',
    naam: 'High Tech Campus',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 115000, // schatting: extern toegankelijk kantooraandeel HTC + Veldhoven-cluster; campus intern veel groter maar gesloten; polygon incl. Veldhoven woonwijken
      leegstandPercentage: 2.5, // campus-managed; vrijwel geen vrije leegstand
      huurprijsBandwidth: { min: 175, max: 325 },
      huurprijsGemiddeld: 258,
      opnameVorigeJaar: 806, // 2025: <500m² 150 + >=500m² 656 (sterk gedaald t.o.v. 6.936 in 2024)
      beschikbaarAanbod: 2900, // herschaald o.b.v. gecorrigeerde voorraad (leegstand 2.5%)
    },
    vastgoedMix: {
      kantoor: 19, // 334.200 / 1.774.863 m² totaal
      retail: 5,
      wonen: 44, // woonwijken Veldhoven meegenomen in analyse
      overig: 32, // bedrijfsmatig/R&D (447.686 m²) dominant
    },
    pandenInOntwikkeling: [
      {
        id: 'htc-dev-01',
        naam: 'Bossebaan 292',
        adres: 'Bossebaan 292, 5503KC Veldhoven',
        oppervlakte: 5185,
        fase: 'bouw',
        verwachteOplevering: '2022 / afgerond',
        toelichting: 'Kantoor/R&D-pand op Bossebaan-cluster nabij HTC.',
      },
      {
        id: 'htc-dev-02',
        naam: 'Genderstroom 1',
        adres: 'Genderstroom 1, 5504DD Veldhoven',
        oppervlakte: 3800,
        fase: 'bouw',
        verwachteOplevering: '2022 / afgerond',
        toelichting: 'Onderdeel van Genderstroom-cluster; kantoor voor toeleveranciers HTC-ecosysteem.',
      },
      {
        id: 'htc-dev-03',
        naam: 'Genderstroom 200 & 400',
        adres: 'Genderstroom, 5504DD Veldhoven',
        oppervlakte: 5000, // 3.000 + 2.000
        fase: 'bouw',
        verwachteOplevering: '2023 / afgerond',
        toelichting: 'Twee kantoor/R&D-panden op Genderstroom-bedrijventerrein.',
      },
    ],
    trends: [
      {
        id: 'htc-trend-01',
        omschrijving: 'ASML en 2 andere >1.000-FTE-bedrijven verantwoordelijk voor 56,7% van alle 29.103 arbeidsplaatsen. Campusdominantie onveranderd sterk.',
        richting: 'positief',
      },
      {
        id: 'htc-trend-02',
        omschrijving: 'Kantooropname 2025 gedaald naar 806 m² (van 6.936 m² in 2024); campus absorbeert vraag intern via eigen vastgoedportefeuille ASML.',
        richting: 'neutraal',
      },
      {
        id: 'htc-trend-03',
        omschrijving: 'Toeleveranciers HTC die niet op de campus passen zoeken alternatieve vestiging in omgeving (Bossebaan, Genderstroom, Airport-zone).',
        richting: 'positief',
      },
      {
        id: 'htc-trend-04',
        omschrijving: 'Campustoegang strikt beheerd; niet alle bedrijven worden toegelaten. Spillover naar Fellenoord en Airport neemt toe.',
        richting: 'neutraal',
      },
      {
        id: 'htc-trend-05',
        omschrijving: 'Gem. huurprijs €258/m²/jr gelijk aan Centrum Eindhoven, reflectie van premium die tech-huurders bereid zijn te betalen voor campuslocatie.',
        richting: 'positief',
      },
    ],
    warmeContacten: [
      {
        id: 'htc-wc-01',
        naam: '',
        organisatie: 'High Tech Campus Eindhoven',
        rol: 'Campus Development / Real Estate',
        email: '',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'Campusmanagement beheert de toegang en verhuur op HTC streng. Kansen voor Ditt. liggen eerder bij toeleveranciers die buiten de campus huisvesting zoeken.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'htc-og-01',
        naam: '',
        sector: 'Semiconductor / precision tech',
        profiel: 'ASML-toeleverancier (100-500 FTE) zoekt 2.000-6.000 m² R&D/kantoor nabij campus; buiten campuspoort door capaciteitsgebrek HTC.',
        reden: 'Groei ASML-leveranciersketen structureel; krapte op campus drijft bedrijven naar omliggende gebieden.',
        status: 'prospect',
      },
      {
        id: 'htc-og-02',
        naam: '',
        sector: 'High tech systems / mechatronica',
        profiel: 'Scale-up (30-80 FTE) met groeicontract ASML/NXP zoekt flexibele ruimte met laboratoriumcomponent; voorkeur Veldhoven of Airport.',
        reden: 'Uitgroei incubator TU/e of HTC-startup; concrete vestigingsvraag.',
        status: 'in-gesprek',
      },
    ],
    inzichten: [
      {
        id: 'htc-inz-01',
        bron: 'Dirk Verberne',
        organisatie: 'Verschuuren & Scheppers Bedrijfsmakelaars',
        datum: '2026-03-06',
        categorie: 'acquisitie',
        inzicht: 'Grote corporates zijn voor een nieuwkomer moeilijk bereikbaar: zij hebben al vaste corporate makelaars en landelijke inrichtingspartners. De kansen voor Ditt. liggen eerder bij de toeleveranciers die buiten de campus huisvesting zoeken.',
      },
      {
        id: 'htc-inz-02',
        bron: 'Renzo Goessens',
        organisatie: 'Tenzin Vastgoed',
        datum: '2026-02-14',
        categorie: 'samenwerking',
        inzicht: 'In Eindhoven zijn Verschuuren & Scheppers de dominante regionale makelaar, zij zitten "heel diep in de projecten" en weten wat er speelt. Lokale grote makelaars zijn een effectievere ingang dan internationale kantoren met slechts een paar man ter plaatse.',
      },
    ],
    partijen: [
      { id: 'htc-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'htc-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
  },
]

export default eindhoven
