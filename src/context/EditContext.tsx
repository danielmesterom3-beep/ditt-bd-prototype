import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// PIN to unlock edit mode ,  change here to rotate.
const EDIT_PIN = 'ditt2026'
const UNLOCK_KEY = 'ditt_edit_unlocked'

interface EditContextValue {
  isEditMode: boolean
  unlock: (pin: string) => boolean
  lock: () => void
}

const EditContext = createContext<EditContextValue>({
  isEditMode: false,
  unlock: () => false,
  lock: () => {},
})

export function EditProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(() => {
    try { return localStorage.getItem(UNLOCK_KEY) === '1' } catch { return false }
  })

  function unlock(pin: string): boolean {
    if (pin === EDIT_PIN) {
      setIsEditMode(true)
      try { localStorage.setItem(UNLOCK_KEY, '1') } catch {}
      return true
    }
    return false
  }

  function lock() {
    setIsEditMode(false)
    try { localStorage.removeItem(UNLOCK_KEY) } catch {}
  }

  return (
    <EditContext.Provider value={{ isEditMode, unlock, lock }}>
      {children}
    </EditContext.Provider>
  )
}

export function useEditMode() { return useContext(EditContext) }
