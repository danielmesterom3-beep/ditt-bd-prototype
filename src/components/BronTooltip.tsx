import { useState } from 'react'

interface BronTooltipProps {
  bron: string
}

export default function BronTooltip({ bron }: BronTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 3 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: '#e2e8f0',
          color: '#64748b',
          fontSize: 9,
          fontWeight: 700,
          cursor: 'default',
          userSelect: 'none',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </span>
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#f1f5f9',
            fontSize: 10,
            lineHeight: 1.5,
            padding: '6px 10px',
            borderRadius: 6,
            whiteSpace: 'normal',
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 240,
            width: 'max-content',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'block', fontWeight: 700, marginBottom: 2, color: '#94a3b8', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Bron
          </span>
          {bron}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1e293b',
            }}
          />
        </span>
      )}
    </span>
  )
}
