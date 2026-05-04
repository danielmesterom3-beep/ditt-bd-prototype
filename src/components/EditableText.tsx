import { useRef, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface EditableTextProps {
  storageKey: string
  defaultValue: string
  style?: React.CSSProperties
  className?: string
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p'
  onClick?: (e: React.MouseEvent) => void
}

const STORAGE_PREFIX = 'ditt_txt_'

// Pending changes waiting to be saved to Supabase
const pendingChanges = new Map<string, string | null>() // null = delete
const changeListeners = new Set<() => void>()

function notifyListeners() {
  changeListeners.forEach(fn => fn())
}

export function subscribeToPending(fn: () => void) {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}

export function hasPendingChanges() {
  return pendingChanges.size > 0
}

export async function flushPendingChanges() {
  const entries = [...pendingChanges.entries()]
  pendingChanges.clear()
  notifyListeners()
  for (const [key, value] of entries) {
    try {
      if (value === null) {
        await supabase.from('edits').delete().eq('key', key)
      } else {
        await supabase.from('edits').upsert({ key, value, updated_at: new Date().toISOString() })
      }
    } catch {
      // Ignore
    }
  }
}

export function getEditableText(storageKey: string, defaultValue: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + storageKey) ?? defaultValue
  } catch {
    return defaultValue
  }
}

// Load all edits from Supabase into localStorage on app start
let loaded = false
export async function loadRemoteEdits() {
  if (loaded) return
  loaded = true
  try {
    const { data } = await supabase.from('edits').select('key, value')
    if (data) {
      data.forEach(({ key, value }) => {
        localStorage.setItem(STORAGE_PREFIX + key, value)
      })
    }
  } catch {
    // Supabase not available, fall back to localStorage only
  }
}

export default function EditableText({
  storageKey,
  defaultValue,
  style,
  className,
  tag: Tag = 'span',
  onClick,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  const fullKey = STORAGE_PREFIX + storageKey

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = localStorage.getItem(fullKey) ?? defaultValue
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.background = 'rgba(255,127,80,0.08)'
    e.currentTarget.style.outline = '1px solid rgba(255,127,80,0.35)'
    e.currentTarget.style.borderRadius = '3px'
    const range = document.createRange()
    range.selectNodeContents(e.currentTarget)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.background = ''
    e.currentTarget.style.outline = ''
    const text = e.currentTarget.textContent?.trim() ?? ''
    if (!text) {
      e.currentTarget.textContent = defaultValue
      localStorage.removeItem(fullKey)
      pendingChanges.set(storageKey, null)
    } else if (text !== defaultValue) {
      localStorage.setItem(fullKey, text)
      pendingChanges.set(storageKey, text)
    } else {
      localStorage.removeItem(fullKey)
      pendingChanges.set(storageKey, null)
    }
    notifyListeners()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      ref.current?.blur()
    }
    if (e.key === 'Escape') {
      if (ref.current) ref.current.textContent = localStorage.getItem(fullKey) ?? defaultValue
      ref.current?.blur()
    }
  }

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    onClick?.(e)
  }

  return (
    <Tag
      ref={ref as unknown as never}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      style={{
        cursor: 'text',
        outline: 'none',
        minWidth: '1ch',
        display: Tag === 'span' ? 'inline-block' : undefined,
        transition: 'background 0.1s, outline 0.1s',
        ...style,
      }}
      className={className}
    />
  )
}

export function SaveButton() {
  const [pending, setPending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const unsub = subscribeToPending(() => {
      setPending(hasPendingChanges())
      setSaved(false)
    })
    return unsub
  }, [])

  async function handleSave() {
    setSaving(true)
    await flushPendingChanges()
    setSaving(false)
    setPending(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!pending && !saved) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: saved ? '#16a34a' : '#ff7f50',
        color: '#fff',
        borderRadius: 10,
        padding: '10px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        fontSize: 13,
        fontWeight: 600,
        cursor: saved ? 'default' : 'pointer',
        transition: 'background 0.2s',
        userSelect: 'none',
      }}
      onClick={saved ? undefined : handleSave}
    >
      {saving && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )}
      {saved ? 'Opgeslagen' : saving ? 'Opslaan...' : 'Aanpassingen opslaan'}
    </div>
  )
}
