import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import staticSteden from '../data/steden'
import type { Stad, Gebied } from '../data/types'

const CUSTOM_STEDEN_KEY = 'custom_steden'
const EXTRA_GEBIEDEN_KEY = 'extra_gebieden'

function blankGebied(id: string, naam: string): Gebied {
  return {
    id,
    naam,
    status: 'under-construction',
    marktdata: {
      peildatum: '',
      totaalKantoorVvo: 0,
      leegstandPercentage: 0,
      huurprijsBandwidth: { min: 0, max: 0 },
      opnameVorigeJaar: 0,
      beschikbaarAanbod: 0,
    },
    vastgoedMix: { kantoor: 0, retail: 0, wonen: 0, overig: 0 },
    pandenInOntwikkeling: [],
    trends: [],
    warmeContacten: [],
    interessanteOpdrachtgevers: [],
    inzichten: [],
    partijen: [],
  }
}

function createBlankStad(naam: string): Stad {
  const id = naam
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return {
    id,
    naam,
    gebieden: [
      blankGebied(`${id}-gebied-1`, ''),
      blankGebied(`${id}-gebied-2`, ''),
      blankGebied(`${id}-gebied-3`, ''),
      blankGebied(`${id}-gebied-4`, ''),
    ],
  }
}

interface CustomStedenContextValue {
  allSteden: Stad[]
  customSteden: Stad[]
  addStad: (naam: string) => Promise<void>
  removeStad: (id: string) => Promise<void>
  addGebied: (stadId: string, naam: string) => Promise<void>
  removeGebied: (stadId: string, gebiedId: string) => Promise<void>
  isExtraGebied: (stadId: string, gebiedId: string) => boolean
}

const CustomStedenContext = createContext<CustomStedenContextValue | null>(null)

// Normalize a Gebied loaded from JSON to ensure all required fields exist
function normalizeGebied(g: Partial<Gebied> & { id: string; naam: string }): Gebied {
  const blank = blankGebied(g.id, g.naam)
  return {
    ...blank,
    ...g,
    marktdata: {
      ...blank.marktdata,
      ...(g.marktdata ?? {}),
      huurprijsBandwidth: {
        min: g.marktdata?.huurprijsBandwidth?.min ?? 0,
        max: g.marktdata?.huurprijsBandwidth?.max ?? 0,
      },
    },
    vastgoedMix: { ...blank.vastgoedMix, ...(g.vastgoedMix ?? {}) },
    pandenInOntwikkeling: g.pandenInOntwikkeling ?? [],
    trends: g.trends ?? [],
    warmeContacten: g.warmeContacten ?? [],
    interessanteOpdrachtgevers: g.interessanteOpdrachtgevers ?? [],
    inzichten: g.inzichten ?? [],
    partijen: g.partijen ?? [],
    kansrijkeLeads: g.kansrijkeLeads ?? [],
  }
}

function normalizeStad(s: Partial<Stad> & { id: string; naam: string }): Stad {
  return {
    id: s.id,
    naam: s.naam,
    gebieden: (s.gebieden ?? []).map((g) => normalizeGebied(g as Parameters<typeof normalizeGebied>[0])),
  }
}

async function fetchCustomSteden(): Promise<Stad[]> {
  try {
    const { data } = await supabase
      .from('edits')
      .select('value')
      .eq('key', CUSTOM_STEDEN_KEY)
      .maybeSingle()
    if (data?.value) {
      const raw = JSON.parse(data.value) as Partial<Stad>[]
      return raw.map((s) => normalizeStad(s as Parameters<typeof normalizeStad>[0]))
    }
  } catch { /* ignore */ }
  return []
}

async function fetchExtraGebieden(): Promise<Record<string, Gebied[]>> {
  try {
    const { data } = await supabase
      .from('edits')
      .select('value')
      .eq('key', EXTRA_GEBIEDEN_KEY)
      .maybeSingle()
    if (data?.value) {
      const raw = JSON.parse(data.value) as Record<string, Partial<Gebied>[]>
      const result: Record<string, Gebied[]> = {}
      for (const [stadId, gebieden] of Object.entries(raw)) {
        result[stadId] = gebieden.map((g) => normalizeGebied(g as Parameters<typeof normalizeGebied>[0]))
      }
      return result
    }
  } catch { /* ignore */ }
  return {}
}

export function CustomStedenProvider({ children }: { children: ReactNode }) {
  const [customSteden, setCustomSteden] = useState<Stad[]>([])
  const [extraGebieden, setExtraGebieden] = useState<Record<string, Gebied[]>>({})

  useEffect(() => {
    fetchCustomSteden().then(setCustomSteden)
    fetchExtraGebieden().then(setExtraGebieden)

    const channel = supabase
      .channel('custom-steden-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edits' }, (payload) => {
        const key = (payload.new as Record<string, string>)?.key ?? (payload.old as Record<string, string>)?.key
        if (key === CUSTOM_STEDEN_KEY) fetchCustomSteden().then(setCustomSteden)
        if (key === EXTRA_GEBIEDEN_KEY) fetchExtraGebieden().then(setExtraGebieden)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function persist(next: Stad[]) {
    const value = JSON.stringify(next)
    try {
      await supabase.from('edits').upsert({ key: CUSTOM_STEDEN_KEY, value, updated_at: new Date().toISOString() })
    } catch { /* ignore */ }
  }

  async function persistExtra(next: Record<string, Gebied[]>) {
    const value = JSON.stringify(next)
    try {
      await supabase.from('edits').upsert({ key: EXTRA_GEBIEDEN_KEY, value, updated_at: new Date().toISOString() })
    } catch { /* ignore */ }
  }

  async function addStad(naam: string) {
    const newStad = createBlankStad(naam)
    const next = [...customSteden, newStad]
    setCustomSteden(next)
    await persist(next)
  }

  async function removeStad(id: string) {
    const next = customSteden.filter((s) => s.id !== id)
    setCustomSteden(next)
    await persist(next)
  }

  async function addGebied(stadId: string, naam: string) {
    const newGebied = blankGebied(`${stadId}-${Date.now()}`, naam)
    const isCustom = customSteden.some((s) => s.id === stadId)
    if (isCustom) {
      const next = customSteden.map((s) =>
        s.id === stadId ? { ...s, gebieden: [...s.gebieden, newGebied] } : s
      )
      setCustomSteden(next)
      await persist(next)
    } else {
      const next = { ...extraGebieden, [stadId]: [...(extraGebieden[stadId] ?? []), newGebied] }
      setExtraGebieden(next)
      await persistExtra(next)
    }
  }

  async function removeGebied(stadId: string, gebiedId: string) {
    const isCustom = customSteden.some((s) => s.id === stadId)
    if (isCustom) {
      const next = customSteden.map((s) =>
        s.id === stadId ? { ...s, gebieden: s.gebieden.filter((g) => g.id !== gebiedId) } : s
      )
      setCustomSteden(next)
      await persist(next)
    } else {
      const next = {
        ...extraGebieden,
        [stadId]: (extraGebieden[stadId] ?? []).filter((g) => g.id !== gebiedId),
      }
      setExtraGebieden(next)
      await persistExtra(next)
    }
  }

  function isExtraGebied(stadId: string, gebiedId: string): boolean {
    const isCustom = customSteden.some((s) => s.id === stadId)
    if (isCustom) return true
    return (extraGebieden[stadId] ?? []).some((g) => g.id === gebiedId)
  }

  const allSteden: Stad[] = [
    ...staticSteden.map((s) => ({
      ...s,
      gebieden: [...s.gebieden, ...(extraGebieden[s.id] ?? [])],
    })),
    ...customSteden,
  ]

  return (
    <CustomStedenContext.Provider value={{ allSteden, customSteden, addStad, removeStad, addGebied, removeGebied, isExtraGebied }}>
      {children}
    </CustomStedenContext.Provider>
  )
}

export function useAllSteden() {
  const ctx = useContext(CustomStedenContext)
  if (!ctx) throw new Error('useAllSteden moet binnen CustomStedenProvider gebruikt worden')
  return ctx
}
