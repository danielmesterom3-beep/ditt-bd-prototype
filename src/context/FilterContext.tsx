import { createContext, useContext, useState, type ReactNode } from 'react'
import type { LocatieKlasse } from '../data/types'

export type KlasseFilter = NonNullable<LocatieKlasse>

interface FilterState {
  klassen: Set<KlasseFilter>
  alleenMetOntwikkeling: boolean
}

interface FilterContextValue {
  filters: FilterState
  toggleKlasse: (k: KlasseFilter) => void
  setAlleenMetOntwikkeling: (v: boolean) => void
  reset: () => void
  isActive: boolean
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    klassen: new Set<KlasseFilter>(),
    alleenMetOntwikkeling: false,
  })

  function toggleKlasse(k: KlasseFilter) {
    setFilters(prev => {
      const next = new Set(prev.klassen)
      next.has(k) ? next.delete(k) : next.add(k)
      return { ...prev, klassen: next }
    })
  }

  function setAlleenMetOntwikkeling(v: boolean) {
    setFilters(prev => ({ ...prev, alleenMetOntwikkeling: v }))
  }

  function reset() {
    setFilters({ klassen: new Set<KlasseFilter>(), alleenMetOntwikkeling: false })
  }

  const isActive = filters.klassen.size > 0 || filters.alleenMetOntwikkeling

  return (
    <FilterContext.Provider value={{ filters, toggleKlasse, setAlleenMetOntwikkeling, reset, isActive }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters moet binnen FilterProvider gebruikt worden')
  return ctx
}
