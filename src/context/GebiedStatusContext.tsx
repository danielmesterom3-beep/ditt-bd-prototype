import { createContext, useContext, useState, type ReactNode } from 'react'
import type { GebiedStatus } from '../data/types'

const STORAGE_KEY = 'ditt-gebied-status-overrides'

type Overrides = Record<string, GebiedStatus>

interface GebiedStatusContextValue {
  getStatus: (gebiedId: string, defaultStatus?: GebiedStatus) => GebiedStatus
  setStatus: (gebiedId: string, status: GebiedStatus) => void
  overrides: Overrides
}

const GebiedStatusContext = createContext<GebiedStatusContextValue | null>(null)

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function GebiedStatusProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides)

  function getStatus(gebiedId: string, defaultStatus: GebiedStatus = 'live'): GebiedStatus {
    return overrides[gebiedId] ?? defaultStatus
  }

  function setStatus(gebiedId: string, status: GebiedStatus) {
    setOverrides((prev) => {
      const next = { ...prev, [gebiedId]: status }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
