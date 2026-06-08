import type { Gebied, KansrijkeLead } from './types'

// Bronnen:
//   Rdam.pdf           , Vastgoeddata.nl Gebiedsanalyse Rotterdam, 20 februari 2026 (32 pag.)
//   RDAM CLUSTER ANA.pdf, Cluster Analyse Rdam, 29 april 2026 (23 pag.)
//   Rdam JLL Insight.pdf, JLL Rotterdam Office Q1 2026 (© Jones Lang LaSalle IP, Inc. 2026)
//   RDAM KANTOREN STRATEGIE.pdf, Actualisatie Kantorenstr. MRDH 2025–2035
//
// Panden in ontwikkeling: uitsluitend objecten MET aantoonbare kantoorfunctie (Rdam.pdf p.18)
// Gefilterd op kantoor; UITGESLOTEN wegens geen kantoor:
//, De Sax, Antoine Platekade 901 (80.132 m²), havengebied/industrieel
//, Seguraweg 41, Europoort (43.585 m²)     , logistiek/Europoort
//, Chittagongpad 3 (29.051 m²)             , Waalhaven/logistiek
//
// Opname 2025 Rotterdam stad: kantoor <500m² 10.402 m² + >=500m² 37.485 m² = 47.887 m² (Vastgoeddata)
//                              54.500 m² (JLL Q4 2025), licht afwijkend door methodiek
// Leegstand Rotterdam Q1 2026: 5,8% stadsbreed (JLL Q1 2026, ↓ van 6,1% Q4 2025); 7,2% gemeente 2023 (MRDH)
// Prime rent Rotterdam Q1 2026: €360/m²/jr (JLL); stadsgem. gerealiseerd €209/m²/jr (JLL Q1 2026), YTD 2026 opname: 13.000 m²
// Opname 2025 cluster: 81.136 m²
// Top-5 huurtransacties 2025: Wilhelminakade 300 (3.500 m², €190, United Imaging Healthcare),
//   K.P. v/d Mandelelaan 62 (1.127 m², €201, V-NOM), Blaak 31 (1.040 m², €200, Post & Co),
//   Pegasusweg 200 (1.021 m², €145, Ballast Nedam), Westerstraat 5-9 (986 m², €150)
// Take-up 2025 primair gedreven door Rotterdam Centrum én Rotterdam Alexanderpolder (JLL)

const rotterdam: Gebied[] = [
  {
    id: 'kop-van-zuid',
    naam: 'Kop van Zuid',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 155000, // schatting: compact waterfront-cluster Wilhelminakade/Stieltjesplein; polygon incl. aangrenzende woonwijk
      leegstandPercentage: 4.5, // A-locatie waterfront; onder stadsgemiddelde 5,8% (JLL Q1 2026, ↓ van 4,8%); UIH-deal toont actieve vraag
      huurprijsBandwidth: { min: 185, max: 280 }, // min: UIH Wilhelminakade €190 (2025); max: Maastoren premium-segment
      huurprijsGemiddeld: 220, // o.b.v. transacties: UIH €190, De Rotterdam €225, WPC €255 (2024–2025)
      opnameVorigeJaar: 7500, // UIH 3.500 m² (mei 2025) grootste deal + kleinere transacties; totaal Rotterdam 47.887 m² (Vastgoeddata)
      beschikbaarAanbod: 7000, // 155.000 × 4,5% = 6.975 m² (JLL Q1 2026)
    },
    vastgoedMix: {
      kantoor: 32,
      retail: 10,
      wonen: 44,
      overig: 14,
    },
    // Geen kantoorpanden in de top-10 panden-in-ontwikkeling (Rdam.pdf p.18) voor dit deelgebied.
    // Feijenoord-wijk (incl. Kop van Zuid) heeft 9 panden / 164.013 m² in ontwikkeling totaal
    // maar geen specifieke kantoorobjecten haalden de top-10 drempel.
    pandenInOntwikkeling: [],
    trends: [
      {
        id: 'kvz-trend-01',
        omschrijving: 'Waterfront-locatie trekt internationale gebruikers; United Imaging Healthcare huurde 3.500 m² op Wilhelminakade 300 (€190/m²/jr, mei 2025), grootste kantoor­transactie Rotterdam vorig jaar.',
        richting: 'positief',
      },
      {
        id: 'kvz-trend-02',
        omschrijving: 'Institutionele beleggers (NSI, Bouwinvest) zetten in op duurzame transformatie van B-locaties richting A-kwaliteit; leegstand laagst van de vier gebieden.',
        richting: 'positief',
      },
      {
        id: 'kvz-trend-03',
        omschrijving: 'Hogere bouwkosten vertragen nieuwbouwplannen; druk op bestaand aanbod neemt toe.',
        richting: 'neutraal',
      },
    ],
    warmeContacten: [
      {
        id: 'kvz-wc-01',
        naam: 'Robin Senne',
        organisatie: 'NSI N.V.',
        rol: 'Commercial Formula Manager',
        email: 'Robin.Senne@nsi.nl',
        telefoon: '+31640636732',
        datumLaatsteContact: '',
        notitie: 'Contactpersoon Q-Port (NSI). Ditt realiseerde het kantoorconcept voor dit multi-tenant gebouw; huurders ervaren het als warm en onderscheidend. Warme ingang voor herhaalopdrachten of introducties binnen NSI-portefeuille Rotterdam.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'kvz-og-01',
        naam: '',
        sector: 'Financiële dienstverlening',
        profiel: 'Middelgrote bank zoekt representatieve kantoorlocatie 2.000–4.000 m², A-locatie, duurzaamheidslabel A.',
        reden: 'Actieve zoekende partij; huurcontract elders loopt af Q1 2026.',
        status: 'prospect',
      },
      {
        id: 'kvz-og-02',
        naam: '',
        sector: 'Tech / scale-up',
        profiel: 'Groeiend SaaS-bedrijf, 80–150 FTE, flexibele indeling, voorkeur voor waterfrontlocatie.',
        reden: 'Netwerk via gemeente Rotterdam; concrete huisvestingsvraag.',
        status: 'in-gesprek',
      },
    ],
    inzichten: [
      {
        id: 'kvz-inz-01',
        bron: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '2026-04-07',
        categorie: 'marktdynamiek',
        inzicht: 'Post-covid trek naar OV-knooppunten en "flight to quality": kwaliteit betekent niet alleen het gebouw maar ook de omgeving, de beleving bij aankomst en de beschikbaarheid van voorzieningen. Inspiratie en beleving zijn leidende begrippen voor huurders.',
      },
      {
        id: 'kvz-inz-02',
        bron: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '2026-04-07',
        categorie: 'samenwerking',
        inzicht: 'NSI is als beursgenoteerde belegger verplicht te tenderen, maar uitgenodigde partijen komen uit het bestaande netwerk (Provada, Fresh-netwerkclub, interieurarchitecten als brug naar leveranciers). Track record plus marktconforme prijs geeft bij een volgend project een streepje voor.',
      },
      {
        id: 'kvz-inz-03',
        bron: 'Robin Senne',
        organisatie: 'NSI N.V., Q-Port evaluatie',
        datum: '2026-04-07',
        categorie: 'samenwerking',
        inzicht: 'Q-Port is een recent Ditt-referentieproject bij NSI. Huurders ervaren het kantoor als warm en onderscheidend; het circulaire materiaalverhaal wordt gewaardeerd zodra het wordt uitgelegd. Directe warme ingang binnen NSI-portefeuille Rotterdam.',
      },
    ],
    partijen: [
      { id: 'kvz-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'kvz-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'kvz-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'kvz-lead-01',
        pandnaam: '',
        adres: 'Wilhelminakade 901-953, Rotterdam',
        huurder: 'Varo Energy Netherlands',
        branche: 'Energie / commodities',
        omvang: 2859,
        contractBegin: '2022-10',
        eigenaar: 'MEAG',
        motivatie: 'Varo Energy huurt 2.859 m² op de Wilhelminakade, pal aan het water op de Kop van Zuid. Een energiebedrijf op dit formaat ontvangt internationale klanten en investeert in een werkplek die die schaal uitstraalt. Contract afloop oktober 2027; eigenaar MEAG is een institutionele belegger met een brede portefeuille. Schaub & Partners was makelaar huurder, directe ingang via hun netwerk.',
      },
      {
        id: 'kvz-lead-02',
        pandnaam: '',
        adres: 'Boompjes 406, Rotterdam',
        huurder: 'VluchtelingenWerk Zuidwest-Nederland',
        branche: 'Non-profit / welzijn',
        omvang: 767,
        contractBegin: '2022-12',
        eigenaar: 'Grouwels Vastgoed',
        motivatie: 'VluchtelingenWerk Zuidwest-Nederland huurt 767 m² aan de Boompjes, een van de beste kantooradressen aan het Nieuwe Maas-water. Non-profit organisaties investeren steeds vaker in een werkplek die de kracht van de organisatie uitstraalt richting medewerkers en samenwerkingspartners. Contract afloop december 2027; eigenaar Grouwels Vastgoed is een Rotterdamse portefeuillepartij met meerdere panden in het gebied.',
      },
      {
        id: 'kvz-lead-03',
        pandnaam: '',
        adres: 'Wilhelminakade 19, Rotterdam',
        huurder: 'C.H. Robinson Europe',
        branche: 'Logistiek / supply chain',
        omvang: 447,
        huurprijsPerM2: 171,
        contractBegin: '2022-06',
        eigenaar: 'Havenbedrijf Rotterdam',
        motivatie: 'C.H. Robinson Europe is een van de grootste logistieke dienstverleners ter wereld en huurt 447 m² op de Wilhelminakade. Logistieke multinationals besteden bovengemiddeld aan een representatieve kantooromgeving voor internationale klanten. Eigenaar Havenbedrijf Rotterdam biedt een ingang naar meerdere kantoorpanden in de havenportefeuille. Contract afloop juni 2027.',
      },
      {
        id: 'kvz-lead-04',
        pandnaam: '',
        adres: 'Slaak 12, Rotterdam',
        huurder: 'Gemeente Rotterdam',
        branche: 'Overheid',
        omvang: 230,
        huurprijsPerM2: 130,
        contractBegin: '2022-08',
        motivatie: 'Gemeente Rotterdam huurt 230 m² aan het Slaak, nabij het stadhuis. Overheidsopdrachtgevers zijn aantrekkelijk vanwege de planmatige aanpak en voorspelbaarheid van het traject. Contract afloop augustus 2027, ruim de tijd om via het gemeentenetwerk warme contacten te leggen.',
      },
      {
        id: 'kvz-lead-05',
        pandnaam: '',
        adres: 'Wilhelminakade 147, Rotterdam',
        huurder: 'Most Wanted',
        branche: 'Creatieve industrie',
        omvang: 80,
        huurprijsPerM2: 180,
        contractBegin: '2021-09',
        motivatie: 'Most Wanted huurt 80 m² op de Wilhelminakade met een huurprijs van €180/m²/jr, bovengemiddeld voor dit formaat. Creatieve bureaus op premium locaties investeren relatief het meest per m² in hun kantooromgeving. Contract afloop september 2026: urgente lead, benadermoment is nú.',
      },
    ] satisfies KansrijkeLead[],
  },

  {
    id: 'rotterdam-centrum',
    naam: 'Rotterdam Centrum',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 520000, // schatting: WTC/Weena/Blaak/Scheepvaartkwartier; polygon was iets te groot
      leegstandPercentage: 8.1, // boven stadsgemiddelde 5,8% (JLL Q1 2026, ↓ van 8,5%) door oudere voorraad; MRDH: gemeente 7,2% (2023)
      huurprijsBandwidth: { min: 150, max: 360 }, // min: Westerstraat €150; max: JLL prime rent Rotterdam €360/m²/jr (WTC/Weena toplocatie)
      huurprijsGemiddeld: 209, // JLL Q1 2026 stadsgem. gerealiseerd €209/m²/jr (↑ van €195 Q4 2025); o.b.v. Blaak €200, Westerkade €215
      opnameVorigeJaar: 24000, // grootste aandeel citywide 47.887 m² (Vastgoeddata); JLL: centrum primaire driver take-up 2025
      beschikbaarAanbod: 42100, // 520.000 × 8,1% = 42.120 m² (JLL Q1 2026)
    },
    vastgoedMix: {
      kantoor: 28,
      retail: 22,
      wonen: 36,
      overig: 14,
    },
    // Bron: Rdam.pdf p.18, top-10 panden in ontwikkeling Rotterdam stad, gefilterd op kantoor
    pandenInOntwikkeling: [
      {
        id: 'rc-dev-01',
        naam: 'The Modernist',
        adres: 'Kruisplein 3, 3014DB Rotterdam',
        oppervlakte: 38728,
        fase: 'bouw',
        verwachteOplevering: 'Q3 2026',
        toelichting: 'Grootschalig gemengd project op Kruisplein; 38.728 m² met kantoor- en wooncomponent. Bouwjaar geregistreerd 2025. Bron: Rdam.pdf top-10 #4.',
      },
      {
        id: 'rc-dev-02',
        naam: 'RottaNova (gemengd)',
        adres: 'Binnenrotte 447, Rotterdam',
        oppervlakte: 29601,
        fase: 'bouw',
        verwachteOplevering: 'Q1 2027',
        toelichting: 'Gemengd project aan de Binnenrotte; 29.601 m² overwegend wonen (258 appartementen) met creatieve werkruimte en horeca op de begane grond. Oplevering verwacht Q4 2027. Beperkte kantoorfunctie.',
      },
      {
        id: 'rc-dev-03',
        naam: 'BaanTower',
        adres: 'Baan 74, 3011CD Rotterdam',
        oppervlakte: 26700,
        fase: 'bouw',
        verwachteOplevering: 'Q2 2027',
        toelichting: 'Voormalig KPN-gebouw aan de Baan; 26.700 m² herontwikkeling tot kantoor/mixed-use. Bron: Rdam.pdf top-10 #5.',
      },
      {
        id: 'rc-dev-04',
        naam: 'Rodezand 1',
        adres: 'Rodezand 1, Rotterdam',
        oppervlakte: 26468,
        fase: 'bouw',
        verwachteOplevering: 'Q4 2026',
        toelichting: 'Kantoor/mixed-use in het centrumgebied nabij Blaak; 26.468 m². Bouwjaar geregistreerd 2020. Bron: Rdam.pdf top-10 #8.',
      },
      {
        id: 'rc-dev-05',
        naam: 'Blaak 501',
        adres: 'Blaak 501, 3011GB Rotterdam',
        oppervlakte: 20921,
        fase: 'bouw',
        verwachteOplevering: 'Q1 2027',
        toelichting: 'Kantoorontwikkeling aan de Blaak; 20.921 m². Bouwjaar geregistreerd 2024. Bron: Rdam.pdf top-10 #10.',
      },
    ],
    trends: [
      {
        id: 'rc-trend-01',
        omschrijving: 'Verdere transformatie van verouderd kantooraanbod naar wonen; structurele krimp B/C-voorraad. Blaak 31 (Post & Co, 1.040 m², €200) en Westerstraat 5-9 (986 m², €150) laten tweedeling zien: A-locaties houden waarde.',
        richting: 'neutraal',
      },
      {
        id: 'rc-trend-02',
        omschrijving: 'Overheidsinstanties en semipublieke organisaties blijven geconcentreerd in centrumgebied; stabiele vraag vanuit publieke sector.',
        richting: 'positief',
      },
      {
        id: 'rc-trend-03',
        omschrijving: 'Hoge leegstand in verouderde panden trekt huurprijzen voor B-kwaliteit naar beneden; gem. markthuur kantoor daalde van €195 (2025) naar €174/m²/jr (YTD 2026).',
        richting: 'negatief',
      },
    ],
    warmeContacten: [
      {
        id: 'rc-wc-01',
        naam: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        rol: 'Directeur / Eigenaar',
        email: 'm.depeuter@schaub.nl',
        telefoon: '+31653284841',
        datumLaatsteContact: '',
        notitie: 'Regionaal makelaarskantoor gespecialiseerd in Groot-Rotterdam mkb. Geïnterviewd 12/03/26. Open voor samenwerking op basis van wederkerigheid: Ditt introduceert Schaub bij opdrachtgevers, Schaub introduceert Ditt bij huurders. Werkt al samen met Desque (vergelijkbaar met Ditt).',
      },
      {
        id: 'rc-wc-02',
        naam: 'Sander van Holland',
        organisatie: 'AroundTown Holdings',
        rol: 'Asset Manager / Contactpersoon Nederland',
        email: 'sander.vanholland@aroundtownholdings.nl',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'AroundTown is een van de grootste beursgenoteerde kantoorvastgoedeigenaren in Europa. Sander van Holland is contactpersoon voor de Nederlandse portefeuille. Relevante ingang voor huurdersbegeleiding en inrichtingsopdrachten bij Nederlandse objecten.',
      },
      {
        id: 'rc-wc-03',
        naam: 'Robin Senne',
        organisatie: 'NSI N.V.',
        rol: 'Commercial Formula Manager',
        email: 'Robin.Senne@nsi.nl',
        telefoon: '+31640636732',
        datumLaatsteContact: '',
        notitie: 'Contactpersoon Q-Port (NSI). Ditt realiseerde het kantoorconcept voor dit multi-tenant gebouw; huurders ervaren het als warm en onderscheidend. Warme ingang voor herhaalopdrachten of introducties binnen NSI-portefeuille Rotterdam.',
      },
      {
        id: 'rc-wc-04',
        naam: 'Wesley Tegelaers',
        organisatie: 'Jamestown',
        rol: 'Property Manager',
        email: 'Wesley.Tegelaers@JamestownLP.com',
        telefoon: '+31618906030',
        datumLaatsteContact: '',
        notitie: 'Jamestown is eigenaar/beheerder van Bold Eindhoven (Strijp-S). Wesley Tegelaers beheert het vastgoedportfolio; relevant als warme ingang voor Jamestown-objecten in Rotterdam en als referentie vanuit de Eindhovense samenwerking.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'rc-og-01',
        naam: '',
        sector: 'Overheid / semipubliek',
        profiel: 'Uitvoeringsorganisatie zoekt 3.000–6.000 m² functionele kantoorruimte, voorkeur centrumligging.',
        reden: 'Bestaande huisvesting niet meer passend; lopend traject.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'rc-inz-01',
        bron: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '2026-03-12',
        categorie: 'marktdynamiek',
        inzicht: 'Rotterdam is een mkb-stad: circa 80% van de transacties zit qua aantallen onder de 500 m². Het merendeel betreft verplaatsingen binnen de stad, weinig nieuwe toetreders van buiten. Mkb-klanten groeien mee van 200 naar 500, 1.000 of 1.500 m² bij een goede relatie.',
      },
      {
        id: 'rc-inz-02',
        bron: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '2026-03-12',
        categorie: 'samenwerking',
        inzicht: 'Wederkerigheid is de sleutel bij makelaars: een inrichtingspartij die de makelaar introduceert bij opdrachtgevers creëert een morele verplichting voor een warme introductie terug. Partijen die alleen "halen" krijgen een kopje koffie maar geen leads.',
      },
      {
        id: 'rc-inz-03',
        bron: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '2026-03-12',
        categorie: 'inrichting',
        inzicht: 'Casco-klaar maken (pvc vloer, goed plafond, verlichting, geschilderde wanden à €200–300/m²) maakt aanzienlijk verschil in de huurprijs die een eigenaar kan realiseren. Smart Moves als proactieve leegstandsanalyse is een effectieve ingang richting verhuurders.',
      },
    ],
    partijen: [
      { id: 'rc-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'rc-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'rc-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'rc-lead-01',
        pandnaam: 'WTC Rotterdam',
        adres: 'Weena 505, Rotterdam',
        huurder: 'Markel Insurance',
        branche: 'Verzekering / financieel',
        omvang: 1410,
        contractBegin: '2022-11',
        eigenaar: 'CBRE Investment Management',
        motivatie: 'Markel Insurance huurt 1.410 m² in het WTC Rotterdam aan de Weena, het meest prestigieuze kantooradres van Rotterdam. Een internationaal verzekeraar op dit formaat heeft een werkplek nodig die institutioneel vertrouwen uitstraalt. Contract afloop november 2027. Eigenaar CBRE Investment Management is een van de grootste institutionele vastgoedinvesteerders van Europa; een referentieproject hier opent de deur naar de bredere CBRE-portefeuille.',
      },
      {
        id: 'rc-lead-weena-02',
        pandnaam: 'WTC Rotterdam',
        adres: 'Weena 505, Rotterdam',
        huurder: 'W. Heeren Makelaardij',
        branche: 'Vastgoed / makelaardij',
        omvang: 1410,
        contractBegin: '2022-12',
        eigenaar: 'CBRE Dutch Office Fund',
        motivatie: 'W. Heeren Makelaardij huurt 1.410 m² in het WTC Rotterdam. Een makelaarskantoor op de meest prominente locatie van Rotterdam investeert bewust in uitstraling, hun kantoor is hun visitekaartje richting opdrachtgevers en huurders. Contract afloop december 2027. Schaub & Partners was makelaar verhuurder; via dit gedeeld netwerk is een warme introductie realiseerbaar.',
      },
      {
        id: 'rc-lead-scheepsmak-01',
        pandnaam: '',
        adres: 'Scheepmakershaven 27, Rotterdam',
        huurder: 'Atlas Sales Agency',
        branche: 'Sales / commerciële dienstverlening',
        omvang: 800,
        contractBegin: '2022-07',
        eigenaar: 'Stebru Ontwikkeling',
        motivatie: 'Atlas Sales Agency breidde in 2022 uit naar 800 m² aan het Scheepmakershaven, na een eerder contract van 200 m² in hetzelfde pand. Dit is een groeibedrijf dat kantoor actief inzet als groei-instrument. Contract afloop juli 2027; eigenaar Stebru Ontwikkeling is de vaste ingang voor dit pand.',
      },
      {
        id: 'rc-lead-02',
        pandnaam: 'HNK Rotterdam Scheepvaartkwartier',
        adres: 'Vasteland 78, Rotterdam',
        huurder: 'Sovib',
        branche: 'Financiële dienstverlening / verzekering',
        omvang: 500,
        contractBegin: '2022-11',
        eigenaar: 'NSI',
        motivatie: 'Sovib huurt 500 m² in het HNK Scheepvaartkwartier, eigendom van NSI. NSI is de eigenaar waarmee Ditt al een warme ingang heeft via Stefan Suurmond. NSI loopt een actieve pilot om het 200–500 m²-segment turnkey in te richten, dit pand valt direct in die categorie. Contract afloop november 2027: de combinatie van bekende eigenaar, premium locatie en financiële dienstverlener maakt dit de meest strategisch waardevolle lead.',
      },
      {
        id: 'rc-lead-03',
        pandnaam: '',
        adres: 'Parklaan 32, Rotterdam',
        huurder: 'Navara Consulting Services',
        branche: 'Management consultancy',
        omvang: 359,
        huurprijsPerM2: 217,
        contractBegin: '2022-10',
        motivatie: 'Navara Consulting Services huurt 359 m² aan de Parklaan voor €217/m²/jr, een van de meest prestigieuze kantoorstraten van het Scheepvaartkwartier. Consultancybureaus ontvangen dagelijks beslissers en investeren consistent in een representatieve werkomgeving. Contract afloop oktober 2027.',
      },
      {
        id: 'rc-lead-04',
        pandnaam: '',
        adres: 'Westerkade 5, Rotterdam',
        huurder: 'Advanced Interim Management',
        branche: 'Management consultancy / interim',
        omvang: 356,
        huurprijsPerM2: 215,
        contractBegin: '2022-03',
        motivatie: 'Advanced Interim Management huurt 356 m² in het Scheepvaartkwartier voor €215/m²/jr, een huurprijs die hoge investeringsbereidheid aantoont. Management consultants ontvangen dagelijks beslissers en zijn een van de meest representatiebewuste sectoren. Contract afloop maart 2027.',
      },
      {
        id: 'rc-lead-05',
        pandnaam: '',
        adres: 'Schiedam 189, Rotterdam',
        huurder: 'Niet bekendgemaakt',
        branche: 'Onbekend',
        omvang: 215,
        huurprijsPerM2: 100,
        contractBegin: '2021-02',
        motivatie: 'Een huurder aan de Schiekade op de grens van het centrum en het Scheepvaartkwartier. Contract afloop februari 2026, urgente lead, benadermoment is nú. Benadering via Schaub & Partners als gedeelde makelaar.',
      },
      {
        id: 'rc-lead-06',
        pandnaam: '',
        adres: 'Westerkade 7, Rotterdam',
        huurder: 'HVK Stevens & Reigersberg',
        branche: 'Fiscaal advies / juridisch',
        omvang: 201,
        contractBegin: '2022-12',
        motivatie: 'HVK Stevens & Reigersberg is een gespecialiseerd fiscaal- en vermogensadviesbureau aan de Westerkade. Fiscale adviseurs werken voor vermogende klanten en beslissers, hun kantooromgeving moet dat vertrouwen uitstralen. Contract afloop december 2027. Buurpand van Westerkade 5: één eigenaarsbenadering opent twee gesprekken.',
      },
      {
        id: 'rc-lead-07',
        pandnaam: '',
        adres: 'Scheepmakershaven 27, Rotterdam',
        huurder: 'Atlas Sales Agency',
        branche: 'Sales / commerciële dienstverlening',
        omvang: 200,
        huurprijsPerM2: 77,
        contractBegin: '2021-04',
        eigenaar: 'Stebru Ontwikkeling',
        motivatie: 'Atlas Sales Agency huurde in 2021 200 m² aan het Scheepmakershaven en breidde in 2022 uit naar 800 m² in hetzelfde pand. Dit vroegste contract loopt af april 2026, urgente lead. Het groeipad van dit bedrijf maakt actieve benadering nú essentieel.',
      },
      {
        id: 'rc-lead-08',
        pandnaam: '',
        adres: 'Van Vollenhovenstraat 31, Rotterdam',
        huurder: 'Auréus Group',
        branche: 'Vermogensbeheer / financieel',
        omvang: 200,
        contractBegin: '2022-10',
        motivatie: 'Auréus Group huurt 200 m² aan de Van Vollenhovenstraat in het Scheepvaartkwartier. Vermogensadviesbureaus zijn een van de sectoren met de hoogste investeringsbereidheid per m² kantoorinrichting, hun pand is hun positionering richting vermogende klanten. Contract afloop oktober 2027.',
      },
      {
        id: 'rc-lead-09',
        pandnaam: '',
        adres: 'Nieuwe Binnenweg 19, Rotterdam',
        huurder: 'XS Direct',
        branche: 'Direct marketing',
        omvang: 140,
        huurprijsPerM2: 150,
        contractBegin: '2021-03',
        motivatie: 'XS Direct huurt 140 m² aan de Nieuwe Binnenweg. Contract afloop maart 2026, urgente lead. Een direct-marketingbureau op de grens van centrum en Rotterdam-West zoekt een werkplek die creativiteit en bereikbaarheid combineert.',
      },
      {
        id: 'rc-lead-10',
        pandnaam: '',
        adres: 'Calandstraat 62, Rotterdam',
        huurder: 'ARE investments',
        branche: 'Beleggingen / vastgoed',
        omvang: 65,
        huurprijsPerM2: 162,
        contractBegin: '2022-02',
        motivatie: 'ARE investments huurt 65 m² aan de Calandstraat voor €162/m²/jr, een premium huurprijs voor dit formaat. Een investeringsmaatschappij op een compacte locatie investeert relatief veel per m² in uitstraling richting klanten en partners. Contract afloop februari 2027.',
      },
      {
        id: 'rc-lead-11',
        pandnaam: 'Van Nelle Ontwerpfabriek',
        adres: 'Van Nelleweg 1, Rotterdam',
        huurder: 'UNLP',
        branche: 'Tech / creatief',
        omvang: 353,
        huurprijsPerM2: 115,
        contractBegin: '2022-02',
        motivatie: 'UNLP huurt 353 m² in het Van Nelle complex, een van de meest iconische gebouwen van Rotterdam (UNESCO Werelderfgoed), gelegen in Rotterdam-West/Overschie. Tech- en creatieve bedrijven in dit gebouw investeren in kantoorconcepten die hun employer brand versterken. Contract afloop februari 2027.',
      },
      {
        id: 'rc-lead-12',
        pandnaam: '',
        adres: 'Kaatsbaan 8, Rotterdam',
        huurder: 'De Rotterdamsche Werkplaats',
        branche: 'Zakelijke dienstverlening',
        omvang: 345,
        huurprijsPerM2: 150,
        contractBegin: '2021-08',
        motivatie: 'De Rotterdamsche Werkplaats huurt 345 m² aan de Kaatsbaan in het Waalhaven-gebied. Contract afloop augustus 2026, urgente lead, benadermoment is nú. Een zakelijke dienstverlener op dit formaat staat op het punt een nieuwe kantoorrichting te kiezen.',
      },
      {
        id: 'rc-lead-13',
        pandnaam: '',
        adres: 'Waalhaven Z.z. 19, Rotterdam',
        huurder: 'C.H. Robinson Europe',
        branche: 'Logistiek / supply chain',
        omvang: 447,
        huurprijsPerM2: 171,
        contractBegin: '2022-06',
        eigenaar: 'Havenbedrijf Rotterdam',
        motivatie: 'C.H. Robinson Europe huurt 447 m² aan de Waalhaven, direct aan de grootste haven van Europa. Eigenaar Havenbedrijf Rotterdam biedt een ingang naar meerdere kantoorobjecten in de havenportefeuille. Contract afloop juni 2027.',
      },
      {
        id: 'rc-lead-14',
        pandnaam: '',
        adres: 'Waalhaven Z.z. 12, Rotterdam',
        huurder: 'Randstad Groep Nederland',
        branche: 'HR / uitzendbureau',
        omvang: 340,
        huurprijsPerM2: 134,
        contractBegin: '2022-05',
        motivatie: 'Randstad Groep Nederland huurt 340 m² aan de Waalhaven. Randstad werkt met veel fysieke klantcontacten, hun kantooromgeving is een cruciaal onderdeel van het wervingsproces voor kandidaten en opdrachtgevers. Contract afloop mei 2027.',
      },
      {
        id: 'rc-lead-15',
        pandnaam: '',
        adres: 'Cairostraat 125, Rotterdam',
        huurder: 'Trend Advies & Management',
        branche: 'Management advies',
        omvang: 222,
        huurprijsPerM2: 97,
        contractBegin: '2022-02',
        eigenaar: 'Pensioenfonds Rail & Openbaar Vervoer',
        motivatie: 'Trend Advies & Management huurt 222 m² aan de Cairostraat in het Waalhaven-gebied. Eigenaar Pensioenfonds Rail & OV is een institutionele belegger met een brede vastgoedportefeuille. Schaub & Partners en De Mik Real Estate Partners waren beiden makelaar verhuurder. Contract afloop februari 2027.',
      },
    ] satisfies KansrijkeLead[],
  },

  {
    id: 'brainpark-alexander',
    naam: 'Brainpark & Alexander',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 370000, // schatting: Brainpark I+II+III + Alexander kantorenpark; polygon incl. omliggend woongebied
      leegstandPercentage: 13.8, // suburbane snelweglocatie; boven stadsgemiddelde 5,8% (JLL Q1 2026, ↓ van 14,5%); MRDH bevestigt polarisatie
      huurprijsBandwidth: { min: 120, max: 200 }, // min: basisaanbod corridor; max: V-NOM K.P.v/d Mandelelaan €201 (nov 2025, Parc Makelaars)
      huurprijsGemiddeld: 165, // o.b.v. transacties: Fascinatio €195, V-NOM €201; mix A/B-panden drukt gemiddelde
      opnameVorigeJaar: 13000, // Alexanderpolder vermeld als medeprimaire driver take-up 2025 (JLL); V-NOM 1.127 m² + overige deals
      beschikbaarAanbod: 51100, // 370.000 × 13,8% = 51.060 m² (JLL Q1 2026)
    },
    vastgoedMix: {
      kantoor: 22,
      retail: 5,
      wonen: 58,
      overig: 15,
    },
    // Bron: Rdam.pdf p.18 top-10 #2 en #9, beide bevestigd kantoorgebied Brainpark
    pandenInOntwikkeling: [
      {
        id: 'ba-dev-01',
        naam: 'K.P. van der Mandelelaan 3',
        adres: 'K.P. van der Mandelelaan 3, Rotterdam',
        oppervlakte: 58016,
        fase: 'bouw',
        verwachteOplevering: 'Q4 2026',
        toelichting: 'Grootste kantoorontwikkeling in Brainpark; 58.016 m². Bouwjaar geregistreerd 2024. V-NOM huurde aanpalend nr. 62 voor 1.127 m² à €201/m²/jr (nov 2025 via Parc Makelaars). Bron: Rdam.pdf top-10 #2.',
      },
      {
        id: 'ba-dev-02',
        naam: 'K.P. van der Mandelelaan 126',
        adres: 'K.P. van der Mandelelaan 126, Rotterdam',
        oppervlakte: 21742,
        fase: 'bouw',
        verwachteOplevering: 'Q2 2027',
        toelichting: 'Kantoorontwikkeling 21.742 m² in Brainpark-cluster. Bouwjaar geregistreerd 2023. Bron: Rdam.pdf top-10 #9.',
      },
    ],
    trends: [
      {
        id: 'ba-trend-01',
        omschrijving: 'Hoge leegstand (17%+) dwingt eigenaren tot doorontwikkeling en prijsconcessies; aanbod K.P. van der Mandelelaan is omvangrijkst van Rotterdam-Oost.',
        richting: 'negatief',
      },
      {
        id: 'ba-trend-02',
        omschrijving: 'Bereikbaarheid per OV verbetert met uitbreiding metro Alexanderlijn; voorzichtig herstel aantrekkingskracht. Transactie V-NOM op €201/m²/jr toont dat prime-objecten marktwaarde behouden.',
        richting: 'positief',
      },
      {
        id: 'ba-trend-03',
        omschrijving: 'Vraag vanuit ICT en zakelijke dienstverlening (incl. uitzend­bureaus, 12% van arbeidsplaatsen Rotterdam) neemt leegstaande kantoorruimte gedeeltelijk over.',
        richting: 'neutraal',
      },
    ],
    warmeContacten: [
      {
        id: 'ba-wc-01',
        naam: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        rol: 'Makelaar / Adviseur',
        email: '',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'Gevestigd op Brainpark II; actief in verhuur, verkoop, beleggingen en taxaties én recent een design & projectmanagement tak. Vaste partner voor design & build is Plan@Office. Geïnterviewd 19/03/26. Doorslaggevend voor samenwerking: gevoel dat afspraken worden nagekomen.',
      },
      {
        id: 'ba-wc-02',
        naam: 'Sander van Holland',
        organisatie: 'AroundTown Holdings',
        rol: 'Asset Manager / Contactpersoon Nederland',
        email: 'sander.vanholland@aroundtownholdings.nl',
        telefoon: '',
        datumLaatsteContact: '',
        notitie: 'AroundTown heeft kantoorobjecten in de Brainpark/Alexander-corridor. Sander van Holland is contactpersoon voor de Nederlandse portefeuille. Directe ingang voor huurdersbegeleiding en D&B-opdrachten bij leegkomende units.',
      },
      {
        id: 'ba-wc-03',
        naam: 'Robin Senne',
        organisatie: 'NSI N.V.',
        rol: 'Commercial Formula Manager',
        email: 'Robin.Senne@nsi.nl',
        telefoon: '+31640636732',
        datumLaatsteContact: '',
        notitie: 'NSI bezit meerdere objecten in de Alexander-corridor waaronder HNK Rotterdam Alexander. Robin Senne is de warme ingang binnen NSI; Ditt heeft via Q-Port al een bewezen track record bij deze eigenaar.',
      },
    ],
    interessanteOpdrachtgevers: [
      {
        id: 'ba-og-01',
        naam: '',
        sector: 'ICT / zakelijke dienstverlening',
        profiel: 'Middelgroot IT-bedrijf zoekt 1.500–3.000 m² met ruime parkeerverhouding.',
        reden: 'Parkeer- en kosteneisen passen bij dit deelgebied; prijs-kwaliteitverhouding is USP.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'ba-inz-01',
        bron: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '2026-03-19',
        categorie: 'samenwerking',
        inzicht: 'De Mik werkt met Plan@Office als vaste design & build-partner, puur op vertrouwen en eerdere positieve ervaringen. Het doorslaggevende moment was niet een portfolio of presentatie, maar het gevoel dat afspraken werden nagekomen.',
      },
      {
        id: 'ba-inz-02',
        bron: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '2026-03-19',
        categorie: 'acquisitie',
        inzicht: 'Een lokale vestiging is geen principieel vereiste, maar snelheid en beschikbaarheid wegen zwaar. Een betrouwbare partij van buiten Rotterdam is welkom, mits dezelfde responsiviteit als een lokale partij wordt geboden.',
      },
      {
        id: 'ba-inz-03',
        bron: 'Marcel Naaktgeboren',
        organisatie: 'De Mik Real Estate Partners',
        datum: '2026-03-19',
        categorie: 'inrichting',
        inzicht: 'Het Finest Offices Complex werkt met een BDA-concept (afbouwconcept) waarmee gebouwen aantrekkelijker worden voor huurders. De Mik begeleidt herpositionering en revitalisatie; zij brengen uitvoerende partijen in beeld maar de keuze wordt met de opdrachtgever gemaakt.',
      },
    ],
    partijen: [
      { id: 'ba-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ba-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ba-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'ba-lead-01',
        pandnaam: '',
        adres: 'K.P. van der Mandelelaan 110, Rotterdam',
        huurder: 'Transit Services',
        branche: 'Transport / logistieke dienstverlening',
        omvang: 145,
        huurprijsPerM2: 141,
        contractBegin: '2021-04',
        motivatie: 'Transit Services huurt 145 m² aan de K.P. van der Mandelelaan, midden in het Brainpark-cluster. Een logistieke dienstverlener op Brainpark werkt voor internationale opdrachtgevers en investeert in een professionele werkomgeving als onderdeel van hun servicepresentatie. Contract afloop april 2026: urgente lead, benadermoment is nú. Schaub & Partners was makelaar verhuurder, ingang via hun netwerk.',
      },
    ] satisfies KansrijkeLead[],
  },

  {
    id: 'airport-rtm',
    naam: 'Rotterdam Airport',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 82000, // schatting: Pegasusweg-corridor + directe omgeving luchthaven; kleine zone
      leegstandPercentage: 9.0, // speciale locatie (haven/luchthaven) per MRDH; licht boven stadsgemiddelde 5,8% (JLL Q1 2026); ↓ van 9,5%
      huurprijsBandwidth: { min: 125, max: 160 }, // Ballast Nedam Pegasusweg €145 (2025) als benchmark; functionele corridor
      huurprijsGemiddeld: 145, // o.b.v. transactie Ballast Nedam Pegasusweg €145 (jul 2025)
      opnameVorigeJaar: 5500, // kleine zone; Ballast Nedam 1.021 m² hoofdtransactie 2025 + kleinere deals
      beschikbaarAanbod: 7400, // 82.000 × 9,0% = 7.380 m² (JLL Q1 2026)
    },
    vastgoedMix: {
      kantoor: 18,
      retail: 3,
      wonen: 8,
      overig: 71, // logistiek, luchthavengerelateerd
    },
    // Geen kantoorpanden in de top-10 panden-in-ontwikkeling (Rdam.pdf p.18) voor dit deelgebied.
    // Pegasusweg 200 is een huurtransactie (Ballast Nedam, 1.021 m², €145, jul 2025),
    // geen bevestigd nieuwbouw/herontwikkelingsproject in de brondata.
    pandenInOntwikkeling: [],
    trends: [
      {
        id: 'ra-trend-01',
        omschrijving: 'Groeiende vraag vanuit luchtvaart- en logistieke sector naar representatieve kantoorruimte nabij luchthaven; 3,2% van Rotterdamse arbeidsplaatsen zit in goederenvervoer.',
        richting: 'positief',
      },
      {
        id: 'ra-trend-02',
        omschrijving: 'Concurrentie met Schiedam-corridor en Schiphol-regio beperkt internationale bedrijfsvestigingen; huurprijs blijft lager dan stadscentrum (€145–185 vs. €195 gemiddeld).',
        richting: 'negatief',
      },
      {
        id: 'ra-trend-03',
        omschrijving: 'Bedrijfsruimtemarkt rondom airport blijft actief; gem. huurprijs bedrijfsruimte Rotterdam €83/m²/jr (2026 YTD), historisch laag, kans voor herpositionering naar hoger segment.',
        richting: 'neutraal',
      },
    ],
    warmeContacten: [],
    interessanteOpdrachtgevers: [
      {
        id: 'ra-og-01',
        naam: '',
        sector: 'Luchtvaart / logistiek',
        profiel: 'Grondafhandelingsbedrijf zoekt operationele kantoorruimte 800–1.500 m² dicht bij apron.',
        reden: 'Uitbreidingsvraag; bestaand contract loopt af.',
        status: 'prospect',
      },
    ],
    inzichten: [
      {
        id: 'ra-inz-01',
        bron: 'Maurits de Peuter',
        organisatie: 'Schaub & Partners Bedrijfshuisvesting',
        datum: '2026-03-12',
        categorie: 'inrichting',
        inzicht: 'Casco-klaar maken (pvc vloer, goed plafond, verlichting, geschilderde wanden à €200–300/m²) maakt aanzienlijk verschil in de huurprijs die een eigenaar kan realiseren. Een standaard basisrenovatieconcept met vaste leveranciers is het effectiefste verhuurelement voor dit segment.',
      },
      {
        id: 'ra-inz-02',
        bron: 'Stefan Suurmond',
        organisatie: 'NSI N.V.',
        datum: '2026-04-07',
        categorie: 'marktdynamiek',
        inzicht: 'De vraag naar turnkey kantoorruimte groeit maar huurders schrikken terug bij het prijskaartje. NSI startte een pilot waarbij ook het 200–500 m² segment turnkey wordt ingericht, een trend die vanuit Londen via Amsterdam naar de rest van Nederland uitwaait.',
      },
    ],
    partijen: [
      { id: 'ra-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'ra-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [
      {
        id: 'ra-lead-01',
        pandnaam: '',
        adres: 'Albert Plesmanweg 35, Rotterdam',
        huurder: 'Safetmade Europe',
        branche: 'Veiligheid / industrie',
        omvang: 312,
        huurprijsPerM2: 104,
        contractBegin: '2022-11',
        motivatie: 'Safetmade Europe huurt 312 m² aan de Albert Plesmanweg, de meest actieve kantoorstraat rondom Rotterdam Airport. Industriële dienstverleners op deze locatie ontvangen steeds vaker internationale klanten en investeren in een representatief kantoor. Contract afloop november 2027.',
      },
      {
        id: 'ra-lead-02',
        pandnaam: '',
        adres: 'Albert Plesmanweg 39, Rotterdam',
        huurder: 'Scan Global Logistics',
        branche: 'Internationale logistiek / forwarding',
        omvang: 238,
        huurprijsPerM2: 125,
        contractBegin: '2022-09',
        motivatie: 'Scan Global Logistics is een internationale logistieke dienstverlener met een kantoor aan de Albert Plesmanweg, op korte afstand van Rotterdam Airport. Luchthavengerelateerde logistiek vraagt steeds vaker om een representatieve kantooromgeving voor luchtvaartklanten en vrachtpartners. Contract afloop september 2027.',
      },
    ] satisfies KansrijkeLead[],
  },
]

export default rotterdam
