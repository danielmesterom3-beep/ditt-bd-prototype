import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Stad, Gebied } from '../data/types'

interface NavigationState {
  geselecteerdeStad: Stad | null
  geselecteerdGebied: Gebied | null
}

interface NavigationContextValue extends NavigationState {
  setStad: (stad: Stad) => void
  setGebied: (gebied: Gebied) => void
  terug: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    geselecteerdeStad: null,
    geselecteerdGebied: null,
  })

  function setStad(stad: Stad) {
    setState({ geselecteerdeStad: stad, geselecteerdGebied: null })
  }

  function setGebied(gebied: Gebied) {
    setState((prev) => ({ ...prev, geselecteerdGebied: gebied }))
  }

  function terug() {
    setState((prev) => {
      if (prev.geselecteerdGebied) return { ...prev, geselecteerdGebied: null }
      if (prev.geselecteerdeStad)  return { ...prev, geselecteerdeStad: null }
      return prev
    })
  }

  return (
    <NavigationContext.Provider value={{ ...state, setStad, setGebied, terug }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation moet binnen NavigationProvider gebruikt worden')
  return ctx
}
