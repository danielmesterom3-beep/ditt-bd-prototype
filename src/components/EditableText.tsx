import { useRef, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useEditMode } from '../context/EditContext'

interface EditableTextProps {
  storageKey: string
  defaultValue: string
  style?: React.CSSProperties
  className?: string
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p'
  onClick?: (e: React.MouseEvent) => void
  multiline?: boolean
}

export const STORAGE_PREFIX = 'ditt_txt_'

// Pending changes waiting to be saved to Supabase
const pendingChanges = new Map<string, string | null>() // null = delete
const changeListeners = new Set<() => void>()

function notifyListeners() {
  changeListeners.forEach(fn => fn())
}

// Auto-flush: sync to Supabase 500ms after last edit
let autoFlushTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoFlush() {
  if (autoFlushTimer) clearTimeout(autoFlushTimer)
  autoFlushTimer = setTimeout(() => {
    autoFlushTimer = null
    flushPendingChanges()
  }, 500)
}

// Also flush when tab loses focus or user navigates away
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pendingChanges.size > 0) {
      flushPendingChanges()
    }
  })
}

export function queueChange(key: string, value: string | null) {
  pendingChanges.set(key, value)
  notifyListeners()
  scheduleAutoFlush()
}

export function subscribeToPending(fn: () => void): () => void {
  changeListeners.add(fn)
  return () => { changeListeners.delete(fn) }
}

export function hasPendingChanges() {
  return pendingChanges.size > 0
}

// ── Undo stack ────────────────────────────────────────────────────────────────

interface UndoEntry { key: string; oldValue: string | null }
const undoStack: UndoEntry[] = []
const undoListeners = new Set<() => void>()

function notifyUndoListeners() {
  undoListeners.forEach(fn => fn())
}

export function subscribeToUndo(fn: () => void): () => void {
  undoListeners.add(fn)
  return () => { undoListeners.delete(fn) }
}

export function canUndo() { return undoStack.length > 0 }

export function undo() {
  const entry = undoStack.pop()
  notifyUndoListeners()
  if (!entry) return
  const { key, oldValue } = entry
  const fullKey = STORAGE_PREFIX + key
  if (oldValue === null) {
    localStorage.removeItem(fullKey)
  } else {
    localStorage.setItem(fullKey, oldValue)
  }
  queueChange(key, oldValue)
  window.dispatchEvent(new CustomEvent('ditt-remote-edit', { detail: { key, value: oldValue } }))
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

// Load all edits from Supabase into localStorage on app start.
// Always overwrites local values so multi-user edits are synced on page load.
// Writes both prefixed (for EditableText) and raw (for hooks like useDeletedItems, useLocalContacts).
let loaded = false
export async function loadRemoteEdits() {
  if (loaded) return
  loaded = true
  try {
    const { data } = await supabase.from('edits').select('key, value')
    if (data) {
      data.forEach(({ key, value }) => {
        localStorage.setItem(STORAGE_PREFIX + key, value)
        localStorage.setItem(key, value)
      })
    }
  } catch {
    // Supabase not available, fall back to localStorage only
  }
}

// Realtime: push remote edits to localStorage + notify mounted EditableText components.
let realtimeSetup = false
export function setupRealtimeEdits() {
  if (realtimeSetup) return
  realtimeSetup = true
  supabase
    .channel('edits-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'edits' }, (payload) => {
      const key = (payload.new as Record<string, string>)?.key ?? (payload.old as Record<string, string>)?.key
      if (!key) return
      const value: string | null = (payload.new as Record<string, string>)?.value ?? null
      if (value !== null) {
        localStorage.setItem(STORAGE_PREFIX + key, value)
        localStorage.setItem(key, value)
      } else {
        localStorage.removeItem(STORAGE_PREFIX + key)
        localStorage.removeItem(key)
      }
      window.dispatchEvent(new CustomEvent('ditt-remote-edit', { detail: { key, value } }))
    })
    .subscribe()
}

// ── Rich text toolbar ─────────────────────────────────────────────────────────

const TOOLBAR_BTNS = [
  { cmd: 'bold',      label: 'B', title: 'Vet (Ctrl+B)',          style: { fontWeight: 800 } },
  { cmd: 'italic',    label: 'I', title: 'Cursief (Ctrl+I)',      style: { fontStyle: 'italic' as const } },
  { cmd: 'underline', label: 'U', title: 'Onderlijnen (Ctrl+U)',  style: { textDecoration: 'underline' as const } },
]

function insertBulletPoint() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  // Check if we're already in a list item ,  if so, just insert a newline + bullet via execCommand
  const anchor = sel.anchorNode
  let inList = false
  let node: Node | null = anchor
  while (node) {
    if (node.nodeName === 'LI' || node.nodeName === 'UL') { inList = true; break }
    node = node.parentNode
  }
  if (inList) {
    document.execCommand('insertUnorderedList', false)
  } else {
    range.deleteContents()
    const ul = document.createElement('ul')
    ul.style.margin = '0'
    ul.style.paddingLeft = '1.4em'
    const li = document.createElement('li')
    li.appendChild(document.createTextNode('\u200B'))
    ul.appendChild(li)
    range.insertNode(ul)
    // Move cursor inside the li
    const newRange = document.createRange()
    newRange.setStart(li, 1)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }
}

function RichToolbar() {
  function run(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
  }

  const btnStyle: React.CSSProperties = {
    width: 26, height: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#e5e7eb', borderRadius: 4, fontSize: 12,
    flexShrink: 0,
  }

  return (
    <div
      style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, zIndex: 9000,
        display: 'flex', alignItems: 'center', gap: 2,
        background: '#18181b', borderRadius: 7, padding: '4px 6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        border: '1px solid #2d2d2d',
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {TOOLBAR_BTNS.map(btn => (
        <button
          key={btn.cmd}
          title={btn.title}
          onMouseDown={(e) => { e.preventDefault(); run(btn.cmd) }}
          style={{ ...btnStyle, ...btn.style }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d2d2d')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          {btn.label}
        </button>
      ))}

      {/* Bullet list */}
      <button
        title="Opsomming (bullet)"
        onMouseDown={(e) => { e.preventDefault(); insertBulletPoint() }}
        style={{ ...btnStyle }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2d2d2d')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        ≡
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: '#2d2d2d', margin: '0 2px' }} />

      {/* Witregel */}
      <button
        title="Witregel invoegen"
        onMouseDown={(e) => { e.preventDefault(); run('insertHTML', '<br><br>') }}
        style={{ ...btnStyle, fontSize: 11, color: '#9ca3af' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2d2d2d')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        ¶
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: '#2d2d2d', margin: '0 2px' }} />

      {/* Font size */}
      {(['S', 'M', 'L'] as const).map((size) => {
        const px = size === 'S' ? '10px' : size === 'M' ? '13px' : '16px'
        return (
          <button
            key={size}
            title={`Tekstgrootte ${size} (${px})`}
            onMouseDown={(e) => {
              e.preventDefault()
              const sel = window.getSelection()
              if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                document.execCommand('insertHTML', false, `<span style="font-size:${px}">${sel.toString()}</span>`)
              } else {
                document.execCommand('fontSize', false, '3')
                // fallback: wrap selection
              }
            }}
            style={{ ...btnStyle, fontSize: 11, color: '#9ca3af', width: 20 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2d2d2d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {size}
          </button>
        )
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: '#2d2d2d', margin: '0 2px' }} />

      {/* Clear formatting */}
      <button
        title="Opmaak wissen"
        onMouseDown={(e) => { e.preventDefault(); run('removeFormat') }}
        style={{ ...btnStyle, fontSize: 10, color: '#9ca3af' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2d2d2d')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        ✕
      </button>
    </div>
  )
}

// ── EditableText ──────────────────────────────────────────────────────────────

export default function EditableText({
  storageKey,
  defaultValue,
  style,
  className,
  tag: Tag = 'span',
  onClick,
  multiline = false,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  const fullKey = STORAGE_PREFIX + storageKey
  const [focused, setFocused] = useState(false)
  const { isEditMode } = useEditMode()
  const valueBeforeEdit = useRef<string | null>(null)

  useEffect(() => {
    if (ref.current) {
      const stored = localStorage.getItem(fullKey)
      if (multiline) {
        ref.current.innerHTML = stored ?? defaultValue
      } else {
        ref.current.textContent = stored ?? defaultValue
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for remote edits pushed by the realtime subscription
  useEffect(() => {
    function handleRemoteEdit(e: Event) {
      const { key, value } = (e as CustomEvent<{ key: string; value: string | null }>).detail
      if (key !== storageKey) return
      if (!ref.current || focused) return
      const content = value ?? defaultValue
      if (multiline) {
        ref.current.innerHTML = content
      } else {
        ref.current.textContent = content
      }
    }
    window.addEventListener('ditt-remote-edit', handleRemoteEdit)
    return () => window.removeEventListener('ditt-remote-edit', handleRemoteEdit)
  }, [storageKey, defaultValue, multiline, focused])

  // Multiline: re-populate when edit mode turns on (ref is newly attached to DOM)
  useEffect(() => {
    if (!multiline || !isEditMode) return
    if (ref.current) {
      const stored = localStorage.getItem(fullKey)
      ref.current.innerHTML = stored ?? defaultValue
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    setFocused(true)
    valueBeforeEdit.current = localStorage.getItem(fullKey) ?? null
    e.currentTarget.style.background = 'rgba(255,127,80,0.07)'
    e.currentTarget.style.outline = '1px solid rgba(255,127,80,0.35)'
    e.currentTarget.style.borderRadius = '3px'
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    setFocused(false)
    e.currentTarget.style.background = ''
    e.currentTarget.style.outline = ''

    if (multiline) {
      const html = e.currentTarget.innerHTML ?? ''
      const stripped = html.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').trim()
      if (!stripped) {
        e.currentTarget.innerHTML = defaultValue
        localStorage.removeItem(fullKey)
        pendingChanges.set(storageKey, null)
      } else {
        localStorage.setItem(fullKey, html)
        pendingChanges.set(storageKey, html)
      }
      scheduleAutoFlush()
    } else {
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
      scheduleAutoFlush()
    }
    notifyListeners()
    // Push to undo stack if value actually changed
    const newValue = localStorage.getItem(fullKey) ?? null
    if (newValue !== valueBeforeEdit.current) {
      undoStack.push({ key: storageKey, oldValue: valueBeforeEdit.current })
      notifyUndoListeners()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    e.stopPropagation()
    if (multiline) {
      if (e.key === 'Escape') {
        const stored = localStorage.getItem(fullKey)
        if (ref.current) {
          ref.current.innerHTML = stored ?? defaultValue
        }
        ref.current?.blur()
      }
      // Enter: browser default in contentEditable inserts <br> or <div> ,  allow it
    } else {
      if (e.key === 'Enter') {
        e.preventDefault()
        ref.current?.blur()
      }
      if (e.key === 'Escape') {
        if (ref.current) ref.current.textContent = localStorage.getItem(fullKey) ?? defaultValue
        ref.current?.blur()
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (multiline) {
      // Preserve line breaks as <br>
      const html = text.replace(/\r?\n/g, '<br>')
      document.execCommand('insertHTML', false, html)
    } else {
      document.execCommand('insertText', false, text.replace(/\r?\n/g, ' '))
    }
  }

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation()
    onClick?.(e)
  }

  // ── Multiline + edit mode: wrap with toolbar ────────────────────────────────
  if (multiline) {
    const editableStyle: React.CSSProperties = {
      outline: 'none',
      lineHeight: 1.7,
      minHeight: '1.5em',
      transition: 'background 0.1s, outline 0.1s',
      cursor: isEditMode ? 'text' : 'default',
      ...style,
    }

    if (isEditMode) {
      return (
        <div style={{ position: 'relative' }} className={className}>
          {focused && <RichToolbar />}
          <div
            ref={ref as React.RefObject<HTMLDivElement>}
            contentEditable
            suppressContentEditableWarning
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            style={editableStyle}
          />
        </div>
      )
    }

    // Read-only multiline: render stored HTML
    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{
          __html: localStorage.getItem(fullKey) ?? defaultValue,
        }}
      />
    )
  }

  // ── Single-line ────────────────────────────────────────────────────────────
  const singleStyle: React.CSSProperties = {
    cursor: isEditMode ? 'text' : 'default',
    outline: 'none',
    minWidth: '1ch',
    display: Tag === 'span' ? 'inline-block' : undefined,
    transition: 'background 0.1s, outline 0.1s',
    ...style,
  }

  return (
    <Tag
      ref={ref as unknown as never}
      contentEditable={isEditMode}
      suppressContentEditableWarning={isEditMode}
      onFocus={isEditMode ? handleFocus : undefined}
      onBlur={isEditMode ? handleBlur : undefined}
      onKeyDown={isEditMode ? handleKeyDown : undefined}
      onPaste={isEditMode ? handlePaste : undefined}
      onClick={isEditMode ? handleClick : (onClick ?? undefined)}
      style={singleStyle}
      className={className}
    />
  )
}

// ── SaveButton ─────────────────────────────────────────────────────────────────

export function SaveButton() {
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { isEditMode } = useEditMode()

  useEffect(() => {
    // Alleen dirty=true zetten als er wijzigingen binnenkomen ,  nooit automatisch resetten
    const unsub = subscribeToPending(() => {
      if (hasPendingChanges()) { setDirty(true); setSaved(false) }
    })
    return () => unsub()
  }, [])

  async function handleSave() {
    setSaving(true)
    await flushPendingChanges()
    setSaving(false)
    setSaved(true)
    // Alleen dirty resetten als er geen nieuwe wijzigingen binnenkwamen tijdens opslaan
    if (!hasPendingChanges()) setDirty(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (!isEditMode || (!dirty && !saved)) return null

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
