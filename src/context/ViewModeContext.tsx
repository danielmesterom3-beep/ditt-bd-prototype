import { createContext, useContext, useState, type ReactNode } from 'react'

export type DashboardViewMode = 'informatie' | 'actie'

interface ViewModeContextValue {
  viewMode: DashboardViewMode
  setViewMode: (mode: DashboardViewMode) => void
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null)

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('actie')
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext)
  if (!ctx) throw new Error('useViewMode moet binnen ViewModeProvider gebruikt worden')
  return ctx
}
