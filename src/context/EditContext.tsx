import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

// Fallback PIN — alleen gebruikt als er geen custom PIN in Supabase staat.
const FALLBACK_PIN = 'ditt2026'
const UNLOCK_KEY   = 'ditt_edit_unlocked'
const PIN_CACHE_KEY = 'ditt_custom_pin_cache'
const SUPABASE_PIN_KEY = 'edit_pin'

interface EditContextValue {
  isEditMode: boolean
  unlock: (pin: string) => boolean
  lock: () => void
  changePin: (huidigPin: string, nieuwPin: string) => Promise<{ ok: boolean; fout?: string }>
}

const EditContext = createContext<EditContextValue>({
  isEditMode: false,
  unlock: () => false,
  lock: () => {},
  changePin: async () => ({ ok: false }),
})

export function EditProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(() => {
    try { return localStorage.getItem(UNLOCK_KEY) === '1' } catch { return false }
  })

  // Huidig actieve PIN: laden uit Supabase op start, gecached in localStorage
  const [activePin, setActivePin] = useState<string>(() => {
    try { return localStorage.getItem(PIN_CACHE_KEY) ?? FALLBACK_PIN } catch { return FALLBACK_PIN }
  })

  useEffect(() => {
    async function loadPin() {
      try {
        const { data } = await supabase
          .from('edits')
          .select('value')
          .eq('key', SUPABASE_PIN_KEY)
          .maybeSingle()
        if (data?.value) {
          const pin = JSON.parse(data.value) as string
          setActivePin(pin)
          localStorage.setItem(PIN_CACHE_KEY, pin)
        }
      } catch { /* gebruik fallback */ }
    }
    loadPin()
  }, [])

  function unlock(pin: string): boolean {
    if (pin === activePin) {
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

  async function changePin(huidigPin: string, nieuwPin: string): Promise<{ ok: boolean; fout?: string }> {
    if (huidigPin !== activePin) return { ok: false, fout: 'Huidig wachtwoord is onjuist.' }
    if (nieuwPin.length < 4) return { ok: false, fout: 'Nieuw wachtwoord moet minimaal 4 tekens zijn.' }
    try {
      await supabase.from('edits').upsert({
        key: SUPABASE_PIN_KEY,
        value: JSON.stringify(nieuwPin),
        updated_at: new Date().toISOString(),
      })
      setActivePin(nieuwPin)
      localStorage.setItem(PIN_CACHE_KEY, nieuwPin)
      return { ok: true }
    } catch (err) {
      return { ok: false, fout: err instanceof Error ? err.message : 'Opslaan mislukt.' }
    }
  }

  return (
    <EditContext.Provider value={{ isEditMode, unlock, lock, changePin }}>
      {children}
    </EditContext.Provider>
  )
}

export function useEditMode() { return useContext(EditContext) }
