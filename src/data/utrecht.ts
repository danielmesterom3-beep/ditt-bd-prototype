import type { Gebied, KansrijkeLead } from './types'

// Bronnen:
//   Leegstand kantoren Utrecht 2025: 165.591 m² (CBS / NVM Business / JLL Utrecht)
//   Huurprijzen Utrecht: JLL Dutch Office Market 2025

const utrecht: Gebied[] = [
  {
    id: 'utrecht-centrum',
    naam: 'Utrecht Centrum',
    marktdata: {
      peildatum: '2026-03-31',
      totaalKantoorVvo: 165591,
      leegstandPercentage: 8.5,
      huurprijsBandwidth: { min: 140, max: 310 },
      huurprijsGemiddeld: 220,
      opnameVorigeJaar: 32000,
      beschikbaarAanbod: 165591,
    },
    vastgoedMix: {
      kantoor: 30,
      retail: 18,
      wonen: 40,
      overig: 12,
    },
    pandenInOntwikkeling: [],
    trends: [
      {
        id: 'uc-trend-01',
        omschrijving: 'Utrecht groeit als kantoormarkt door centrale ligging en OV-knooppunt; hoge vraag naar A-locaties nabij station.',
        richting: 'positief',
      },
      {
        id: 'uc-trend-02',
        omschrijving: 'Leegstand concentreert zich in verouderde B/C-panden; flight to quality zet structureel door.',
        richting: 'neutraal',
      },
      {
        id: 'uc-trend-03',
        omschrijving: 'Stijgende bouwkosten en hoge grondprijzen remmen nieuwbouwontwikkeling in het centrumgebied.',
        richting: 'negatief',
      },
    ],
    warmeContacten: [],
    interessanteOpdrachtgevers: [
      {
        id: 'uc-og-01',
        naam: '',
        sector: 'Zakelijke dienstverlening',
        profiel: 'Middelgroot adviesbureau zoekt 500–1.500 m² nabij Utrecht CS, voorkeur A-label.',
        reden: 'Groeiende vraag vanuit consultancy en tech richting Utrecht als alternatief voor Amsterdam.',
        status: 'prospect',
      },
    ],
    inzichten: [],
    partijen: [
      { id: 'uc-01', naam: '', type: 'eigenaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'uc-02', naam: '', type: 'makelaar', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
      { id: 'uc-03', naam: '', type: 'huurder', contactStatus: 'koud', locatieKlasse: null, pitch: '', followUp: '', suggestieProduct: '' },
    ],
    kansrijkeLeads: [] satisfies KansrijkeLead[],
  },
]

export default utrecht
