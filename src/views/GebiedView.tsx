import { useNavigation } from '../context/NavigationContext'
import StadsKaart from '../components/StadsKaart'

export default function GebiedView() {
  const { geselecteerdeStad, setGebied, terug } = useNavigation()

  if (!geselecteerdeStad) return null

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={terug}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-fit"
      >
        ← Terug naar steden
      </button>

      <div>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--c-text)', marginBottom: 4 }}>
          {geselecteerdeStad.naam}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 16 }}>
          Klik op een buurt om de gebiedsdetails te openen.
        </p>
        <StadsKaart stad={geselecteerdeStad} onGebiedClick={setGebied} />
      </div>
    </div>
  )
}
