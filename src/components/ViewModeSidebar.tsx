import { useViewMode } from '../context/ViewModeContext'

export default function ViewModeSidebar() {
  const { viewMode, setViewMode } = useViewMode()
  const actieActive = viewMode === 'actie'
  const infoActive  = viewMode === 'informatie'

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--c-subtle)',
          marginBottom: 8,
        }}
      >
        Weergave
      </div>

      {/* ── Actie, primaire weergave ── */}
      <button
        onClick={() => setViewMode('actie')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          padding: '14px 14px',
          borderRadius: 12,
          border: `1.5px solid ${actieActive ? '#f97316' : '#e5e7eb'}`,
          background: actieActive
            ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
            : '#fafaf9',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s',
          boxShadow: actieActive ? '0 2px 8px rgba(249,115,22,0.15)' : 'none',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: actieActive ? '#c2410c' : 'var(--c-text)',
            letterSpacing: '-0.01em',
          }}
        >
          Actiepagina
        </span>
        <span
          style={{
            fontSize: 10,
            color: actieActive ? '#ea580c' : 'var(--c-muted)',
            lineHeight: 1.5,
          }}
        >
          Begeleidt je van marktinzicht naar acquisitiegesprek
        </span>
      </button>

      {/* ── Informatie, naslag-laag ── */}
      <button
        onClick={() => setViewMode('informatie')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 3,
          padding: '10px 12px',
          borderRadius: 10,
          border: `1px solid ${infoActive ? '#d1d5db' : 'transparent'}`,
          background: infoActive ? '#f3f4f6' : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: infoActive ? 600 : 400,
            color: infoActive ? 'var(--c-text)' : 'var(--c-muted)',
          }}
        >
          Informatiepagina
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--c-subtle)',
            lineHeight: 1.4,
          }}
        >
          Naslag, marktdata, concurrenten, vastgoeddata
        </span>
      </button>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid var(--c-border)',
        }}
      >
        <div style={{ fontSize: 10, color: 'var(--c-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Peildatum</div>
          <div>29 april 2026</div>
          <div style={{ color: '#bbb', marginTop: 2 }}>Bron: Vastgoeddata.nl</div>
        </div>
      </div>
    </aside>
  )
}
