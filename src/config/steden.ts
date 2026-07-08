export interface StadConfig {
  id: string       // lowercase, geen spaties — gebruikt als filter key
  naam: string     // display naam
  zoektermen: string[]
  googleNewsQuery: string
  kleur: string
}

export const STEDEN: StadConfig[] = [
  {
    id: 'rotterdam',
    naam: 'Rotterdam',
    zoektermen: [
      'rotterdam', 'kop van zuid', 'wilhelminapier', 'wilhelminakade',
      'coolsingel', 'weena', 'hofplein', 'blaak', 'alexandrium',
      'katendrecht', 'schiekade',
    ],
    googleNewsQuery: 'kantoor+Rotterdam+verhuur+OR+transactie+OR+huurder+OR+leegstand',
    kleur: '#1e40af',
  },
  {
    id: 'eindhoven',
    naam: 'Eindhoven',
    zoektermen: [
      'eindhoven', 'knoop xl', 'fellenoord', 'strijp-s', 'strijp s', 'strijp',
      'flight forum', 'brainport', 'high tech campus', 'park forum',
      'kennedyplein', 'meerhoven', 'woensel',
    ],
    googleNewsQuery: 'kantoor+Eindhoven+verhuur+OR+transactie+OR+huurder+OR+leegstand',
    kleur: '#dc2626',
  },
]

// Om een nieuwe stad toe te voegen, voeg een object toe aan dit array:
// {
//   id: 'den-haag',
//   naam: 'Den Haag',
//   zoektermen: ['den haag', 'beatrixkwartier', 'binckhorst', 'station cs'],
//   googleNewsQuery: 'kantoor+Den+Haag+verhuur+OR+transactie+OR+huurder+OR+leegstand',
//   kleur: '#059669',
// }
