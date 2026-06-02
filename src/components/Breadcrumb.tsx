import { useNavigation } from '../context/NavigationContext'
import { getEditableText } from './EditableText'

export default function Breadcrumb() {
  const { geselecteerdeStad, geselecteerdGebied, terug } = useNavigation()

  if (!geselecteerdGebied) return null

  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      <button
        onClick={terug}
        className="font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--c-coral)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        {geselecteerdeStad?.naam ?? 'Marktoverzicht'}
      </button>
      <span style={{ color: '#333' }}>/</span>
      <span className="font-medium" style={{ color: '#ffffff' }}>
        {getEditableText(`gebied.${geselecteerdGebied.id}.naam`, geselecteerdGebied.naam) || 'Naamloos gebied'}
      </span>
    </nav>
  )
}
