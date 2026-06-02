import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { GebiedStatus } from '../data/types'

const STORAGE_KEY = 'ditt-gebied-status-overrides'

type Overrides = Record<string, GebiedStatus>

interface GebiedStatusContextValue {
  getStatus: (gebiedId: string, defaultStatus?: GebiedStatus) => GebiedStatus
  setStatus: (gebiedId: string, status: GebiedStatus) => void
  overrides: Overrides
}

const GebiedStatusContext = createContext<GebiedStatusContextValue | null>(null)

function loadLocal(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

async function fetchRemoteOverrides(): Promise<Overrides> {
  try {
    const { data } = await supabase
      .from('edits')
      .select('value')
      .eq('key', STORAGE_KEY)
      .maybeSingle()
    if (data?.value) return JSON.parse(data.value) as Overrides
  } catch { /* ignore */ }
  return {}
}

export function GebiedStatusProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>(loadLocal)

  useEffect(() => {
    fetchRemoteOverrides().then((remote) => {
      if (Object.keys(remote).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
        setOverrides(remote)
      }
    })

    const channel = supabase
      .channel('gebied-status-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edits' }, (payload) => {
        const key = (payload.new as Record<string, string>)?.key ?? (payload.old as Record<string, string>)?.key
        if (key === STORAGE_KEY) {
          fetchRemoteOverrides().then((remote) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
            setOverrides(remote)
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function getStatus(gebiedId: string, defaultStatus: GebiedStatus = 'live'): GebiedStatus {
    return overrides[gebiedId] ?? defaultStatus
  }

  function setStatus(gebiedId: string, status: GebiedStatus) {
    setOverrides((prev) => {
      const next = { ...prev, [gebiedId]: status }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      void supabase.from('edits').upsert({
        key: STORAGE_KEY,
        value: JSON.stringify(next),
        updated_at: new Date().toISOString(),
      })
      return next
    })
  }

  return (
    <GebiedStatusContext.Provider value={{ getStatus, setStatus, overrides }}>
      {children}
    </GebiedStatusContext.Provider>
  )
}

export function useGebiedStatus() {
  const ctx = useContext(GebiedStatusContext)
  if (!ctx) throw new Error('useGebiedStatus moet binnen GebiedStatusProvider gebruikt worden')
  return ctx
}
