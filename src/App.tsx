import { useState, useEffect } from 'react'
import { useNavigation } from './context/NavigationContext'
import { loadRemoteEdits, SaveButton } from './components/EditableText'
import { GebiedStatusProvider } from './context/GebiedStatusContext'
import FilterSidebar from './components/FilterSidebar'
import MarktDashboard from './views/MarktDashboard'
import StadOverzichtView from './views/StadOverzichtView'
import GebiedDetailView from './views/GebiedDetailView'
import BeheerView from './views/BeheerView'
import Breadcrumb from './components/Breadcrumb'

type ViewMode = 'overzicht' | 'kaart'

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'overzicht', label: 'Stadsoverzicht' },
  { id: 'kaart',     label: 'Gebiedskaart'   },
]

function AppContent() {
  const { geselecteerdGebied } = useNavigation()
  const [viewMode, setViewMode] = useState<ViewMode>('overzicht')
  const [isBeheer, setIsBeheer] = useState(() => window.location.hash === '#beheer')

  useEffect(() => {
    const handler = () => setIsBeheer(window.location.hash === '#beheer')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function openBeheer() {
    window.location.hash = '#beheer'
  }

  function closeBeheer() {
    window.location.hash = ''
  }

  const showPartij = !!geselecteerdGebied
  const showMarkt  = !geselecteerdGebied

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 sticky top-0 z-20 flex items-center justify-between px-6"
        style={{ background: 'var(--c-black)', height: 52, borderBottom: '1px solid #1c1c1c' }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-white font-bold select-none"
            style={{ fontSize: 22, letterSpacing: '-0.04em' }}
          >
            ditt.
          </span>
          <div style={{ width: 1, height: 16, background: '#2a2a2a' }} />
          <span
            className="text-xs font-medium uppercase hidden sm:block"
            style={{ color: '#666', letterSpacing: '0.1em' }}
          >
            Marktintelligentie
          </span>
        </div>

        <div className="flex items-center gap-5">
          {!isBeheer && <Breadcrumb />}
          {isBeheer && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>
              Stadsbeheer
            </span>
          )}
          <span className="text-xs hidden md:block" style={{ color: '#444' }}>
            {new Date().toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          {/* Beheer button */}
          {isBeheer ? (
            <button
              onClick={closeBeheer}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 6,
                background: '#1c1c1c',
                color: '#9ca3af',
                border: '1px solid #2a2a2a',
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              ← Terug
            </button>
          ) : (
            <button
              onClick={openBeheer}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 6,
                background: '#1c1c1c',
                color: '#9ca3af',
                border: '1px solid #2a2a2a',
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              Beheer
            </button>
          )}
        </div>
      </header>

      {/* ── Beheer view ─────────────────────────────────────────────────── */}
      {isBeheer && (
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <BeheerView />
          </div>
        </main>
      )}

      {/* ── Normale app views ────────────────────────────────────────────── */}
      {!isBeheer && (
        <>
          {/* View-mode tab bar (only on main screen) */}
          {showMarkt && (
            <div
              className="shrink-0 flex"
              style={{
                background: 'var(--c-surface)',
                borderBottom: '1px solid var(--c-border)',
                paddingLeft: 24,
              }}
            >
              {VIEW_TABS.map(({ id, label }) => {
                const active = viewMode === id
                return (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    style={{
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--c-coral)' : 'var(--c-muted)',
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid var(--c-coral)' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      marginBottom: -1,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            <FilterSidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-6 max-w-7xl mx-auto">
                {showMarkt  && viewMode === 'overzicht' && <StadOverzichtView />}
                {showMarkt  && viewMode === 'kaart'     && <MarktDashboard />}
                {showPartij && <GebiedDetailView />}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    loadRemoteEdits()
  }, [])

  return (
    <GebiedStatusProvider>
      <AppContent />
      <SaveButton />
    </GebiedStatusProvider>
  )
}
