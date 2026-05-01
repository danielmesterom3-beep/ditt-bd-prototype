import type { NavItem } from '../types'

const navItems: { id: NavItem; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'pipeline', label: 'Pipeline', icon: '◈' },
  { id: 'contacten', label: 'Contacten', icon: '◉' },
  { id: 'activiteiten', label: 'Activiteiten', icon: '◷' },
]

interface SidebarProps {
  active: NavItem
  onChange: (item: NavItem) => void
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col min-h-screen shrink-0">
      <div className="px-5 py-6 border-b border-slate-700">
        <div className="text-white font-semibold text-lg tracking-tight leading-none">Ditt</div>
        <div className="text-slate-400 text-xs mt-1">Officemakers</div>
      </div>

      <div className="px-3 py-2 mt-2 text-[10px] uppercase tracking-widest text-slate-500 font-medium px-4">
        Verkoop
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full cursor-pointer ${
              active === item.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="text-base opacity-80">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-4 py-5 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            JK
          </div>
          <div className="min-w-0">
            <div className="text-slate-200 text-sm font-medium truncate">Joos Kanders</div>
            <div className="text-slate-500 text-xs">BD Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
