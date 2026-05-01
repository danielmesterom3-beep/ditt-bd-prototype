import { useState } from 'react'
import type { Contact } from '../types'

const SOURCE_LABEL: Record<Contact['source'], string> = {
  website: 'Website',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  event: 'Event',
  cold: 'Cold outreach',
}

const STATUS_STYLE: Record<Contact['status'], string> = {
  actief: 'bg-emerald-100 text-emerald-700',
  prospect: 'bg-amber-100 text-amber-700',
  inactief: 'bg-slate-100 text-slate-500',
}

interface ContactsTableProps {
  contacts: Contact[]
}

export default function ContactsTable({ contacts }: ContactsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'alle' | Contact['status']>('alle')

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'alle' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Zoek op naam, bedrijf of email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-colors"
        />
        <div className="flex gap-1">
          {(['alle', 'actief', 'prospect', 'inactief'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize cursor-pointer transition-colors ${
                statusFilter === s
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Naam</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Bedrijf</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Rol</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Bron</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Toegevoegd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">Geen contacten gevonden.</td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-slate-400 text-xs">{c.email}</div>
                </td>
                <td className="px-4 py-3.5 text-slate-600">{c.company}</td>
                <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{c.role}</td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {SOURCE_LABEL[c.source]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-400 text-xs hidden md:table-cell">{c.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        {filtered.length} van {contacts.length} contacten
      </div>
    </div>
  )
}
