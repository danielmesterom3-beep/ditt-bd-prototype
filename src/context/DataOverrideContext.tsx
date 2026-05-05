import { createContext, useContext, useState, useEffect } from 'react'
import type { Marktdata } from '../data/types'

interface GebiedOverrides {
  leegstandPercentage?: number
  huurprijsMin?: number
  huurprijsMax?: number
  huurprijsGemiddeld?: number
  totaalKantoorVvo?: number
  beschikbaarAanbod?: number
  opnameVorigeJaar?: number
}

type AllOverrides = Record<string, GebiedOverrides>

interface DataOverrideContextValue {
  getMarktdata: (gebiedId: string, original: Marktdata) => Marktdata
  setField: (gebiedId: string, field: keyof GebiedOverrides, value: number) => void
  resetGebied: (gebiedId: string) => void
  hasOverrides: (gebiedId: string) => boolean
}

const DataOverrideContext = createContext<DataOverrideContextValue | null>(null)

const STORAGE_KEY = 'ditt_data_overrides_v1'

export function DataOverrideProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<AllOverrides>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  }, [overrides])

  function getMarktdata(gebiedId: string, original: Marktdata): Marktdata {
    const o = overrides[gebiedId]
    if (!o) return original
    return {
      ...original,
      leegstandPercentage: o.leegstandPercentage ?? original.leegstandPercentage,
      totaalKantoorVvo: o.totaalKantoorVvo ?? original.totaalKantoorVvo,
      beschikbaarAanbod: o.beschikbaarAanbod ?? original.beschikbaarAanbod,
      opnameVorigeJaar: o.opnameVorigeJaar ?? original.opnameVorigeJaar,
      huurprijsBandwidth: {
        min: o.huurprijsMin ?? original.huurprijsBandwidth.min,
        max: o.huurprijsMax ?? original.huurprijsBandwidth.max,
      },
      huurprijsGemiddeld: o.huurprijsGemiddeld ?? original.huurprijsGemiddeld,
    }
  }

  function setField(gebiedId: string, field: keyof GebiedOverrides, value: number) {
    setOverrides((prev) => ({
      ...prev,
      [gebiedId]: { ...prev[gebiedId], [field]: value },
    }))
  }

  function resetGebied(gebiedId: string) {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[gebiedId]
      return next
    })
  }

  function hasOverrides(gebiedId: string) {
    return gebiedId in overrides && Object.keys(overrides[gebiedId]).length > 0
  }

  return (
    <DataOverrideContext.Provider value={{ getMarktdata, setField, resetGebied, hasOverrides }}>
      {children}
    </DataOverrideContext.Provider>
  )
}

export function useDataOverride() {
  const ctx = useContext(DataOverrideContext)
  if (!ctx) throw new Error('useDataOverride must be used inside DataOverrideProvider')
  return ctx
}
