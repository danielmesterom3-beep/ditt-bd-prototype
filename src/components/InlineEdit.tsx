import { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: number
  format: (n: number) => string
  onSave: (value: number) => void
  style?: React.CSSProperties
  inputWidth?: string
}

export default function InlineEdit({ value, format, onSave, style, inputWidth = '6ch' }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(String(value))
    setEditing(true)
  }

  function commit() {
    const parsed = parseFloat(draft.replace(',', '.'))
    if (!isNaN(parsed) && parsed !== value) onSave(parsed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation()
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          border: 'none',
          borderBottom: '2px solid var(--c-coral)',
          background: 'transparent',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          outline: 'none',
          width: inputWidth,
          padding: 0,
          ...style,
        }}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      title="Klik om te bewerken"
      style={{
        cursor: 'text',
        borderBottom: '1px dashed transparent',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = '#ff7f5088')}
      onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {format(value)}
    </span>
  )
}
