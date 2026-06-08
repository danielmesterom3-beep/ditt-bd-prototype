import { useFilters, type KlasseFilter } from '../context/FilterContext'

const KLASSEN: { value: KlasseFilter; label: string; activeColor: string; activeBg: string; activeBorder: string }[] = [
  { value: 'A', label: 'A-locatie', activeColor: '#065f46', activeBg: '#d1fae5', activeBorder: '#6ee7b7' },
  { value: 'B', label: 'B-locatie', activeColor: '#92400e', activeBg: '#fef3c7', activeBorder: '#fcd34d' },
  { value: 'C', label: 'C-locatie', activeColor: '#991b1b', activeBg: '#fee2e2', activeBorder: '#fca5a5' },
]

function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FilterSidebar() {
  const { filters, toggleKlasse, setAlleenMetOntwikkeling, reset, isActive } = useFilters()

  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto"
      style={{
        width: 240,
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        padding: '20px 16px',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--c-subtle)', letterSpacing: '0.1em' }}
        >
          Filters
        </span>
        {isActive && (
          <button
            onClick={reset}
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--c-coral)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            Wis alles
          </button>
        )}
      </div>

      {/* Locatieklasse */}
      <div className="mb-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
          style={{ color: 'var(--c-subtle)' }}
        >
          Locatieklasse
        </div>
        <div className="flex flex-col gap-1.5">
          {KLASSEN.map(({ value, label, activeColor, activeBg, activeBorder }) => {
            const active = filters.klassen.has(value)
            return (
              <button
                key={value}
                onClick={() => toggleKlasse(value)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
                style={{
                  background: active ? activeBg : 'transparent',
                  border: `1px solid ${active ? activeBorder : 'var(--c-border)'}`,
                  cursor: 'pointer',
                }}
              >
                <span
                  className="text-xs font-bold rounded shrink-0"
                  style={{
                    background: active ? activeColor : 'var(--c-subtle)',
                    color: '#fff',
                    padding: '1px 6px',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {value}
                </span>
                <span className="text-sm" style={{ color: active ? activeColor : 'var(--c-text)' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Panden in ontwikkeling */}
      <div className="mb-6">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
          style={{ color: 'var(--c-subtle)' }}
        >
          Activiteit
        </div>
        <label
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
          style={{
            background: filters.alleenMetOntwikkeling ? '#fff7ed' : 'transparent',
            border: `1px solid ${filters.alleenMetOntwikkeling ? '#fed7aa' : 'var(--c-border)'}`,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.alleenMetOntwikkeling}
            onChange={(e) => setAlleenMetOntwikkeling(e.target.checked)}
            className="sr-only"
          />
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: filters.alleenMetOntwikkeling ? 'var(--c-coral)' : 'transparent',
              border: `1.5px solid ${filters.alleenMetOntwikkeling ? 'var(--c-coral)' : '#ccc'}`,
            }}
          >
            {filters.alleenMetOntwikkeling && <CheckIcon />}
          </div>
          <span className="text-sm" style={{ color: filters.alleenMetOntwikkeling ? '#c2410c' : 'var(--c-text)' }}>
            Panden in ontwikkeling
          </span>
        </label>
      </div>

      {/* Footer, peildatum */}
      <div
        className="mt-auto pt-4"
        style={{ borderTop: '1px solid var(--c-border)' }}
      >
        <div className="text-[11px]" style={{ color: 'var(--c-subtle)' }}>
          <div className="font-semibold mb-0.5">Peildatum</div>
          <div>29 april 2026</div>
          <div className="mt-1" style={{ color: '#bbb' }}>Bron: Vastgoeddata.nl</div>
        </div>
      </div>
    </aside>
  )
}
