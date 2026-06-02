import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import staticSteden from '../data/steden'
import type { Stad, Gebied } from '../data/types'

const CUSTOM_STEDEN_KEY = 'custom_steden'

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
}

const CustomStedenContext = createContext<CustomStedenContextValue | null>(null)

async function fetchCustomSteden(): Promise<Stad[]> {
  try {
    const { data } = await supabase
      .from('edits')
      .select('value')
      .eq('key', CUSTOM_STEDEN_KEY)
      .maybeSingle()
    if (data?.value) return JSON.parse(data.value) as Stad[]
  } catch { /* ignore */ }
  return []
}

export function CustomStedenProvider({ children }: { children: ReactNode }) {
  const [customSteden, setCustomSteden] = useState<Stad[]>([])

  useEffect(() => {
    fetchCustomSteden().then(setCustomSteden)

    const channel = supabase
      .channel('custom-steden-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edits' }, (payload) => {
        const key = (payload.new as Record<string, string>)?.key ?? (payload.old as Record<string, string>)?.key
        if (key === CUSTOM_STEDEN_KEY) {
          fetchCustomSteden().then(setCustomSteden)
        }
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

  return (
    <CustomStedenContext.Provider value={{ allSteden: [...staticSteden, ...customSteden], customSteden, addStad, removeStad }}>
      {children}
    </CustomStedenContext.Provider>
  )
}

export function useAllSteden() {
  const ctx = useContext(CustomStedenContext)
  if (!ctx) throw new Error('useAllSteden moet binnen CustomStedenProvider gebruikt worden')
  return ctx
}
