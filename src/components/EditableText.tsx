import { useRef, useEffect } from 'react'

interface EditableTextProps {
  storageKey: string
  defaultValue: string
  style?: React.CSSProperties
  className?: string
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p'
  onClick?: (e: React.MouseEvent) => void
}

const STORAGE_PREFIX = 'ditt_txt_'

export function getEditableText(storageKey: string, defaultValue: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + storageKey) ?? defaultValue
  } catch {
    return defaultValue
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

  // Set content on mount only — never let React touch the DOM content again
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
    // Select all on focus
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
    } else if (text !== defaultValue) {
      localStorage.setItem(fullKey, text)
    } else {
      localStorage.removeItem(fullKey)
    }
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
