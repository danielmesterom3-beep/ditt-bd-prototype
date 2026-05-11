import { useViewMode, type DashboardViewMode } from '../context/ViewModeContext'

const MODES: { value: DashboardViewMode; label: string; sub: string }[] = [
  {
    value: 'informatie',
    label: 'Informatie',
    sub: 'Marktdata, concurrenten & KPIs',
  },
  {
    value: 'actie',
    label: 'Actie',
    sub: 'Status, prioriteit & volgende stap',
  },
]

export default function ViewModeSidebar() {
  const { viewMode, setViewMode } = useViewMode()

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
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--c-subtle)',
          marginBottom: 6,
        }}
      >
        Weergave
      </div>

      {MODES.map(({ value, label, sub }) => {
        const active = viewMode === value
        return (
          <button
            key={value}
            onClick={() => setViewMode(value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 3,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${active ? '#6366f1' : 'var(--c-border)'}`,
              background: active ? '#eef2ff' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#4338ca' : 'var(--c-text)',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: active ? '#6366f1' : 'var(--c-subtle)',
                lineHeight: 1.4,
              }}
            >
              {sub}
            </span>
          </button>
        )
      })}

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
