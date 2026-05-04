export type DealStage = 'lead' | 'gekwalificeerd' | 'voorstel' | 'onderhandeling' | 'gewonnen' | 'verloren'

export interface Deal {
  id: string
  company: string
  contact: string
  email: string
  phone: string
  value: number
  stage: DealStage
  probability: number
  sqm: number
  location: string
  createdAt: string
  expectedClose: string
  lastActivity: string
  notes: string
}

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'tour'
  dealId: string
  company: string
  contact: string
  description: string
  date: string
  done: boolean
}

export interface Contact {
  id: string
  name: string
  company: string
  email: string
  phone: string
  role: string
  source: 'website' | 'referral' | 'linkedin' | 'event' | 'cold'
  status: 'actief' | 'inactief' | 'prospect'
  createdAt: string
}

export type NavItem = 'dashboard' | 'pipeline' | 'contacten' | 'activiteiten'
