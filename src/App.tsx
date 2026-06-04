import { useState, useEffect, useRef } from 'react'
import { useNavigation } from './context/NavigationContext'
import { loadRemoteEdits, setupRealtimeEdits, SaveButton, canUndo, undo, subscribeToUndo } from './components/EditableText'
import { GebiedStatusProvider } from './context/GebiedStatusContext'
import { CustomStedenProvider } from './context/CustomStedenContext'
import { EditProvider, useEditMode } from './context/EditContext'
import ViewModeSidebar from './components/ViewModeSidebar'
import DocumentDropzone from './components/DocumentDropzone'
import MarktDashboard from './views/MarktDashboard'
import StadOverzichtView from './views/StadOverzichtView'
import GebiedDetailView from './views/GebiedDetailView'
import BeheerView from './views/BeheerView'
import Breadcrumb from './components/Breadcrumb'
import NieuwsFeed from './components/NieuwsFeed'

// ── UndoButton ────────────────────────────────────────────────────────────────

function UndoButton() {
  const { isEditMode } = useEditMode()
  const [hasUndo, setHasUndo] = useState(false)

  useEffect(() => {
    setHasUndo(canUndo())
    return subscribeToUndo(() => setHasUndo(canUndo()))
  }, [])

  if (!isEditMode || !hasUndo) return null

  return (
    <button
      onClick={undo}
      title="Ongedaan maken (laatste tekstwijziging)"
      style={{
        fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
        background: '#1c1c1c', color: '#9ca3af',
        border: '1px solid #2a2a2a',
        cursor: 'pointer', letterSpacing: '0.03em',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      <span style={{ fontSize: 13 }}>↩</span> Ongedaan
    </button>
  )
}

// ── EditModeButton ────────────────────────────────────────────────────────────

function EditModeButton() {
  const { isEditMode, unlock, lock } = useEditMode()
  const [showDialog, setShowDialog] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showDialog) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showDialog])

  function handleUnlock() {
    if (unlock(pin)) {
      setShowDialog(false)
      setPin('')
      setError(false)
    } else {
      setError(true)
      setPin('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleUnlock()
    if (e.key === 'Escape') { setShowDialog(false); setPin(''); setError(false) }
  }

  return (
    <>
      <button
        onClick={() => isEditMode ? lock() : setShowDialog(true)}
        style={{
          fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
          background: isEditMode ? '#1a3a1a' : '#1c1c1c',
          color: isEditMode ? '#4ade80' : '#9ca3af',
          border: `1px solid ${isEditMode ? '#166534' : '#2a2a2a'}`,
          cursor: 'pointer', letterSpacing: '0.03em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ fontSize: 10 }}>{isEditMode ? '●' : '○'}</span>
        {isEditMode ? 'Bewerken aan' : 'Vergrendeld'}
      </button>

      {showDialog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowDialog(false); setPin(''); setError(false) }}
        >
          <div
            style={{
              background: '#111', border: '1px solid #2a2a2a', borderRadius: 12,
              padding: '28px 32px', minWidth: 320,
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', marginBottom: 6 }}>
              Bewerkingsmodus ontgrendelen
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
              Voer het wachtwoord in om aanpassingen te kunnen maken.
            </div>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false) }}
              onKeyDown={handleKeyDown}
              placeholder="Wachtwoord"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: '#1c1c1c', border: `1px solid ${error ? '#dc2626' : '#2a2a2a'}`,
                color: '#f9fafb', fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
                Onjuist wachtwoord. Probeer opnieuw.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleUnlock}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: '#ff7f50', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Ontgrendelen
              </button>
              <button
                onClick={() => { setShowDialog(false); setPin(''); setError(false) }}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  background: '#1c1c1c', color: '#9ca3af',
                  border: '1px solid #2a2a2a', fontSize: 13, cursor: 'pointer',
                }}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type ViewMode = 'overzicht' | 'kaart' | 'nieuws'

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'overzicht', label: 'Stadsoverzicht' },
  { id: 'kaart',     label: 'Gebiedskaart'   },
  { id: 'nieuws',    label: 'Nieuws'          },
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
          {/* Undo button */}
          <UndoButton />
          {/* Edit mode toggle */}
          <EditModeButton />

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
            <ViewModeSidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-6 max-w-7xl mx-auto">
                {showMarkt  && viewMode === 'overzicht' && <StadOverzichtView />}
                {showMarkt  && viewMode === 'kaart'     && <MarktDashboard />}
                {showMarkt  && viewMode === 'nieuws'    && (
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 16 }}>
                      Marktnieuws
                    </h2>
                    <NieuwsFeed />
                  </div>
                )}
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
    setupRealtimeEdits()
  }, [])

  return (
    <EditProvider>
      <GebiedStatusProvider>
        <CustomStedenProvider>
          <AppContent />
          <SaveButton />
          <DocumentDropzone />
        </CustomStedenProvider>
      </GebiedStatusProvider>
    </EditProvider>
  )
}
