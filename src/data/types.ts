export type PartijenType = 'makelaar' | 'eigenaar' | 'huurder'
export type ContactStatus = 'koud' | 'warm' | 'actief'
export type LocatieKlasse = 'A' | 'B' | 'C' | null

export interface Partij {
  id: string
  naam: string
  type: PartijenType
  contactStatus: ContactStatus
  locatieKlasse: LocatieKlasse
  pitch: string
  followUp: string
  suggestieProduct: string
}

// --- Marktdata ---

export interface HuurprijsBandwidth {
  min: number  // EUR/m²/jaar
  max: number
}

export interface Marktdata {
  peildatum: string                   // ISO-datum, bijv. '2025-01-01'
  totaalKantoorVvo: number            // m² verhuurbaar vloeroppervlak
  leegstandPercentage: number         // bijv. 12.5
  huurprijsBandwidth: HuurprijsBandwidth
  huurprijsGemiddeld?: number         // gem. EUR/m²/jaar (afgelopen 2 jaar, uit gebiedsanalyse)
  opnameVorigeJaar: number            // m² opgenomen vorig jaar
  beschikbaarAanbod: number           // m² direct beschikbaar
}

// --- Vastgoedmix ---

export interface VastgoedMix {
  kantoor: number   // percentage van totale vastgoedmix in het gebied
  retail: number
  wonen: number
  overig: number
}

// --- Panden in ontwikkeling ---

export type OntwikkelingFase =
  | 'planfase'
  | 'vergunning'
  | 'bouw'
  | 'oplevering'

export interface PandInOntwikkeling {
  id: string
  naam: string
  adres: string
  oppervlakte: number           // m² BVO/GBO kantoorruimte
  fase: OntwikkelingFase
  verwachteOplevering: string   // bijv. 'Q3 2026'
  ontwikkelaar?: string         // eigenaar of ontwikkelaar indien bekend
  toelichting: string
}

// --- Trends ---

export type TrendRichting = 'positief' | 'neutraal' | 'negatief'

export interface Trend {
  id: string
  omschrijving: string
  richting: TrendRichting
}

// --- Warme contacten ---

export interface WarmContact {
  id: string
  naam: string
  organisatie: string
  rol: string
  email: string
  telefoon: string
  datumLaatsteContact: string   // ISO-datum
  notitie: string
}

// --- Interview inzichten ---

export type InzichtCategorie =
  | 'marktdynamiek'   // marktstructuur, sweetspot, huurprijzen
  | 'acquisitie'      // hoe partijen te benaderen
  | 'samenwerking'    // hoe samenwerking tot stand komt
  | 'inrichting'      // fit-out, turnkey, afbouw

export interface InterviewInzicht {
  id: string
  bron: string          // naam geïnterviewde
  organisatie: string   // organisatienaam
  datum: string         // ISO datum interview
  inzicht: string       // 1-2 zinnen samengevat
  categorie: InzichtCategorie
}

// --- Interessante opdrachtgevers ---

export type OpdrachtgeverStatus = 'prospect' | 'in-gesprek' | 'gewonnen'

export interface InteressanteOpdrachtgever {
  id: string
  naam: string
  sector: string
  profiel: string               // korte omschrijving vastgoedvraag/bedrijfstype
  reden: string                 // waarom interessant voor Ditt.
  status: OpdrachtgeverStatus
}

// --- Gebied status ---

export type GebiedStatus = 'under-construction' | 'in-progress' | 'live'

// --- Kansrijke leads ---

export interface KansrijkeLead {
  id: string
  pandnaam: string          // naam van het pand/gebouw (bijv. 'Maastoren')
  adres: string             // volledig adres
  huurder: string           // naam van de vertrekkende huurder
  branche: string           // sector/branche huurder
  omvang: number            // m² kantoorruimte
  huurprijsPerM2?: number   // €/m²/jr indien bekend
  contractBegin: string     // 'YYYY-MM'
  eigenaar?: string         // eigenaar/verhuurder van het pand
  motivatie: string         // waarom past dit bij Ditt, data storytelling afsluiter
}

// --- Gebied (uitgebreid) ---

export interface Gebied {
  id: string
  naam: string
  status?: GebiedStatus   // undefined = 'live'; kan per gebied worden overschreven via beheer
  marktdata: Marktdata
  vastgoedMix: VastgoedMix
  pandenInOntwikkeling: PandInOntwikkeling[]
  trends: Trend[]
  warmeContacten: WarmContact[]
  interessanteOpdrachtgevers: InteressanteOpdrachtgever[]
  inzichten: InterviewInzicht[]
  partijen: Partij[]
  kansrijkeLeads?: KansrijkeLead[]
}

// --- Stad ---

export interface Stad {
  id: string
  naam: string
  gebieden: Gebied[]
}
