import { useState, useEffect } from 'react'
import { unzip } from 'fflate'
import { supabase } from '../lib/supabase'
import { useAllSteden } from '../context/CustomStedenContext'
import { queueChange } from './EditableText'
import type { WarmContact, KansrijkeLead, Trend, InteressanteOpdrachtgever, PandInOntwikkeling } from '../data/types'

// ── Entity type config ────────────────────────────────────────────────────────

type EntityType =
  | 'kansrijke-lead'
  | 'pand'
  | 'trend'
  | 'warm-contact'
  | 'inzicht'
  | 'opdrachtgever'
  | 'partij'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'month' | 'date' | 'select' | 'textarea'
  options?: string[]
  required?: boolean
  placeholder?: string
}

interface EntityTypeDef {
  type: EntityType
  label: string
  desc: string
  abbr: string
  color: string
  fields: FieldDef[]
}

const ENTITY_TYPES: EntityTypeDef[] = [
  {
    type: 'kansrijke-lead',
    label: 'Aflopend contract',
    desc: 'Huurder met aflopend contract, potentieel D&B project',
    abbr: 'AC',
    color: '#e11d48',
    fields: [
      { key: 'huurder', label: 'Huurder', type: 'text', required: true },
      { key: 'branche', label: 'Branche', type: 'text' },
      { key: 'pandnaam', label: 'Pandnaam', type: 'text' },
      { key: 'adres', label: 'Adres', type: 'text' },
      { key: 'omvang', label: 'Omvang (m²)', type: 'number', required: true },
      { key: 'huurprijsPerM2', label: 'Huurprijs (€/m²/jr)', type: 'number' },
      { key: 'contractBegin', label: 'Contract start', type: 'month' },
      { key: 'eigenaar', label: 'Eigenaar / verhuurder', type: 'text' },
      { key: 'motivatie', label: 'Motivatie', type: 'textarea' },
    ],
  },
  {
    type: 'pand',
    label: 'Pand in ontwikkeling',
    desc: 'Nieuwbouw of transformatie, monitor voor D&B kansen',
    abbr: 'PO',
    color: '#7c3aed',
    fields: [
      { key: 'naam', label: 'Pandnaam', type: 'text', required: true },
      { key: 'adres', label: 'Adres', type: 'text' },
      { key: 'oppervlakte', label: 'Oppervlakte (m²)', type: 'number' },
      { key: 'fase', label: 'Fase', type: 'select', options: ['planfase', 'vergunning', 'bouw', 'oplevering'] },
      { key: 'verwachteOplevering', label: 'Oplevering', type: 'text', placeholder: 'bijv. Q3 2026' },
      { key: 'ontwikkelaar', label: 'Ontwikkelaar', type: 'text' },
      { key: 'toelichting', label: 'Toelichting', type: 'textarea' },
    ],
  },
  {
    type: 'trend',
    label: 'Markttrend',
    desc: 'Signaal uit markt, rapport of gesprek',
    abbr: 'TR',
    color: '#0284c7',
    fields: [
      { key: 'omschrijving', label: 'Omschrijving', type: 'textarea', required: true },
      { key: 'richting', label: 'Richting', type: 'select', options: ['positief', 'neutraal', 'negatief'] },
    ],
  },
  {
    type: 'warm-contact',
    label: 'Warm contact',
    desc: 'Persoon om actief te benaderen of bij te houden',
    abbr: 'WC',
    color: '#d97706',
    fields: [
      { key: 'naam', label: 'Naam', type: 'text', required: true },
      { key: 'organisatie', label: 'Organisatie', type: 'text' },
      { key: 'rol', label: 'Rol / functie', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'telefoon', label: 'Telefoon', type: 'text' },
      { key: 'datumLaatsteContact', label: 'Laatste contact', type: 'date' },
      { key: 'notitie', label: 'Notitie', type: 'textarea' },
    ],
  },
  {
    type: 'inzicht',
    label: 'Interview inzicht',
    desc: 'Inzicht uit klantgesprek of interview',
    abbr: 'II',
    color: '#059669',
    fields: [
      { key: 'bron', label: 'Geïnterviewde', type: 'text', required: true },
      { key: 'organisatie', label: 'Organisatie', type: 'text' },
      { key: 'datum', label: 'Datum', type: 'date' },
      { key: 'inzicht', label: 'Inzicht', type: 'textarea', required: true },
      { key: 'categorie', label: 'Categorie', type: 'select', options: ['marktdynamiek', 'acquisitie', 'samenwerking', 'inrichting'] },
    ],
  },
  {
    type: 'opdrachtgever',
    label: 'Opdrachtgever',
    desc: 'Interessante organisatie als potentiële klant',
    abbr: 'OG',
    color: '#0f766e',
    fields: [
      { key: 'naam', label: 'Naam', type: 'text', required: true },
      { key: 'sector', label: 'Sector', type: 'text' },
      { key: 'profiel', label: 'Profiel', type: 'textarea' },
      { key: 'reden', label: 'Reden', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['prospect', 'in-gesprek', 'gewonnen'] },
    ],
  },
  {
    type: 'partij',
    label: 'Partij',
    desc: 'Makelaar, eigenaar of huurder om te volgen',
    abbr: 'MK',
    color: '#64748b',
    fields: [
      { key: 'naam', label: 'Naam', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['makelaar', 'eigenaar', 'huurder'] },
      { key: 'contactStatus', label: 'Contactstatus', type: 'select', options: ['koud', 'warm', 'actief'] },
      { key: 'locatieKlasse', label: 'Locatieklasse', type: 'select', options: ['A', 'B', 'C'] },
      { key: 'pitch', label: 'Pitch', type: 'textarea' },
      { key: 'followUp', label: 'Follow-up', type: 'text' },
      { key: 'suggestieProduct', label: 'Suggestie product', type: 'text' },
    ],
  },
]

// ── Storage ───────────────────────────────────────────────────────────────────

export interface ImportedItem {
  id: string
  type: EntityType
  typeLabel: string
  typeColor: string
  sourceFile: string
  createdAt: string
  stad?: string
  data: Record<string, string>
  /** First required-field value, used as display title */
  title: string
}

const IMPORT_KEY = 'document_imports'

// Local cache so UI stays snappy; Supabase is source of truth
let _cache: ImportedItem[] | null = null

export function getImportedItems(): ImportedItem[] {
  if (_cache !== null) return _cache
  try { return JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]') } catch { return [] }
}

async function persistToSupabase(items: ImportedItem[]) {
  const value = JSON.stringify(items)
  localStorage.setItem(IMPORT_KEY, value)   // local cache
  _cache = items
  try {
    await supabase
      .from('edits')
      .upsert({ key: IMPORT_KEY, value, updated_at: new Date().toISOString() })
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('document:import'))
}

export async function deleteImportedItem(id: string) {
  const items = getImportedItems().filter((i) => i.id !== id)
  await persistToSupabase(items)
}

async function saveItem(item: ImportedItem) {
  const items = [item, ...getImportedItems()]
  await persistToSupabase(items)
}

// ── Directe opslag in gebied-sectie ──────────────────────────────────────────

const GEBIED_KEY_MAP: Partial<Record<EntityType, string>> = {
  'warm-contact':   'added_wc_',
  'kansrijke-lead': 'added_leads_',
  'trend':          'added_trends_',
  'opdrachtgever':  'added_og_',
  'pand':           'added_panden_',
}

function saveToGebied(
  entityType: EntityType,
  formData: Record<string, string>,
  gebiedId: string,
): boolean {
  const prefix = GEBIED_KEY_MAP[entityType]
  if (!prefix) return false
  const storageKey = prefix + gebiedId
  const id = `imported-${Date.now()}`

  let item: unknown
  switch (entityType) {
    case 'warm-contact':
      item = {
        id, naam: formData.naam ?? '', organisatie: formData.organisatie ?? '',
        rol: formData.rol ?? '', email: formData.email ?? '', telefoon: formData.telefoon ?? '',
        datumLaatsteContact: formData.datumLaatsteContact || new Date().toISOString().slice(0, 10),
        notitie: formData.notitie ?? '',
      } satisfies WarmContact
      break
    case 'kansrijke-lead':
      item = {
        id, pandnaam: formData.pandnaam ?? '', adres: formData.adres ?? '',
        huurder: formData.huurder ?? '', branche: formData.branche ?? '',
        omvang: Number(formData.omvang) || 0,
        ...(formData.huurprijsPerM2 ? { huurprijsPerM2: Number(formData.huurprijsPerM2) } : {}),
        contractBegin: formData.contractBegin || new Date().toISOString().slice(0, 7),
        ...(formData.eigenaar ? { eigenaar: formData.eigenaar } : {}),
        motivatie: formData.motivatie ?? '',
      } satisfies KansrijkeLead
      break
    case 'trend':
      item = {
        id, omschrijving: formData.omschrijving ?? '',
        richting: (formData.richting as Trend['richting']) || 'neutraal',
      } satisfies Trend
      break
    case 'opdrachtgever':
      item = {
        id, naam: formData.naam ?? '', sector: formData.sector ?? '',
        profiel: formData.profiel ?? '', reden: formData.reden ?? '',
        status: (formData.status as InteressanteOpdrachtgever['status']) || 'prospect',
      } satisfies InteressanteOpdrachtgever
      break
    case 'pand':
      item = {
        id, naam: formData.naam ?? '', adres: formData.adres ?? '',
        oppervlakte: Number(formData.oppervlakte) || 0,
        fase: (formData.fase as PandInOntwikkeling['fase']) || 'planfase',
        verwachteOplevering: formData.verwachteOplevering ?? '',
        ...(formData.ontwikkelaar ? { ontwikkelaar: formData.ontwikkelaar } : {}),
        toelichting: formData.toelichting ?? '',
      } satisfies PandInOntwikkeling
      break
    default:
      return false
  }

  const existing: unknown[] = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
  const next = [...existing, item]
  const json = JSON.stringify(next)
  localStorage.setItem(storageKey, json)
  window.dispatchEvent(new CustomEvent('ditt-remote-edit', { detail: { key: storageKey, value: json } }))
  queueChange(storageKey, json)
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileTag(filename: string): { tag: string; bg: string; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')                           return { tag: 'PDF', bg: '#fef2f2', color: '#b91c1c' }
  if (['doc', 'docx'].includes(ext))           return { tag: 'DOC', bg: '#eff6ff', color: '#1d4ed8' }
  if (['xls', 'xlsx', 'csv'].includes(ext))    return { tag: 'XLS', bg: '#f0fdf4', color: '#15803d' }
  if (['ppt', 'pptx'].includes(ext))           return { tag: 'PPT', bg: '#fff7ed', color: '#c2410c' }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext))
                                               return { tag: 'IMG', bg: '#fdf4ff', color: '#7e22ce' }
  return { tag: 'FILE', bg: '#f8fafc', color: '#475569' }
}

function formatSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── AI extractie ─────────────────────────────────────────────────────────────

function fileExt(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function extractDocxText(buffer: ArrayBuffer): Promise<string | null> {
  return new Promise((resolve) => {
    unzip(new Uint8Array(buffer), (err, files) => {
      if (err || !files['word/document.xml']) return resolve(null)
      const xml = new TextDecoder().decode(files['word/document.xml'])
      const text = xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ').trim()
      resolve(text.length > 30 ? text : null)
    })
  })
}

async function extractText(file: File): Promise<string | null> {
  const ext = fileExt(file)
  if (['txt', 'md', 'csv'].includes(ext)) {
    return new Promise((resolve) => {
      const r = new FileReader()
      r.onload = (e) => resolve((e.target?.result as string) ?? null)
      r.onerror = () => resolve(null)
      r.readAsText(file)
    })
  }
  if (ext === 'docx') {
    return new Promise((resolve) => {
      const r = new FileReader()
      r.onload = (e) => {
        const buf = e.target?.result as ArrayBuffer
        if (!buf) return resolve(null)
        extractDocxText(buf).then(resolve)
      }
      r.onerror = () => resolve(null)
      r.readAsArrayBuffer(file)
    })
  }
  return null
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = (e) => resolve(((e.target?.result as string) ?? '').split(',')[1] ?? '')
    r.readAsDataURL(file)
  })
}

async function callClaude(
  file: File,
  text: string | null,
  fields: EntityTypeDef['fields'],
): Promise<Record<string, string>> {
  const apiKey = (import.meta.env as Record<string, string>).VITE_ANTHROPIC_API_KEY
  if (!apiKey) return {}

  const ext = fileExt(file)
  const fieldList = fields
    .map((f) =>
      f.type === 'select'
        ? `- ${f.key}: ${f.label} (kies uit: ${f.options?.join('/')})`
        : `- ${f.key}: ${f.label}${f.type === 'number' ? ' (getal)' : ''}${f.type === 'month' ? ' (YYYY-MM)' : ''}`,
    )
    .join('\n')

  const userPrompt = `Analyseer dit document en extraheer de volgende velden als JSON object.
Voeg alleen velden toe die duidelijk in het document staan. Lege/onzekere velden weglaten.
Geef ALLEEN geldige JSON terug, geen uitleg.

Te extraheren velden:
${fieldList}

Voorbeeld output: {"naam": "Jan de Vries", "organisatie": "ACME B.V."}`

  let content: unknown[]

  if (ext === 'pdf') {
    const b64 = await fileToBase64(file)
    content = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
      { type: 'text', text: userPrompt },
    ]
  } else if (text) {
    content = [{ type: 'text', text: `${userPrompt}\n\nDocumentinhoud:\n${text.slice(0, 6000)}` }]
  } else {
    return {}
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: 'Je bent een data-extractie assistent voor een vastgoed BD tool. Geef alleen JSON terug.',
        messages: [{ role: 'user', content }],
      }),
    })
    if (!res.ok) return {}
    const data = await res.json()
    const raw: string = data.content?.[0]?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return {}
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== null && v !== undefined && v !== '') result[k] = String(v)
    }
    return result
  } catch {
    return {}
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid #334155',
  background: '#1e293b',
  color: '#e2e8f0',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentDropzone() {
  const [dragDepth, setDragDepth]       = useState(0)
  const [droppedFile, setDroppedFile]   = useState<File | null>(null)
  const [step, setStep]                 = useState<'pick' | 'form'>('pick')
  const [selectedType, setSelectedType] = useState<EntityTypeDef | null>(null)
  const [formData, setFormData]         = useState<Record<string, string>>({})
  const [saved, setSaved]               = useState(false)
  const [analyzing, setAnalyzing]       = useState(false)
  const [stadId, setStadId]             = useState('')
  const [gebiedId, setGebiedId]         = useState('')
  const { allSteden }                   = useAllSteden()

  const geselecteerdeStad = allSteden.find((s) => s.id === stadId)
  const gebieden = geselecteerdeStad?.gebieden ?? []

  const hasApiKey = !!(import.meta.env as Record<string, string>).VITE_ANTHROPIC_API_KEY

  const isDragging = dragDepth > 0
  const isOpen     = droppedFile !== null

  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) setDragDepth((d) => d + 1)
    }
    function onLeave() {
      setDragDepth((d) => Math.max(0, d, 1))
    }
    function onOver(e: DragEvent) { e.preventDefault() }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      setDragDepth(0)
      const file = e.dataTransfer?.files[0]
      if (file) {
        setDroppedFile(file)
        setStep('pick')
        setSelectedType(null)
        setFormData({})
        setStadId('')
        setGebiedId('')
        setSaved(false)
      }
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  function close() {
    setDroppedFile(null)
    setStep('pick')
    setSelectedType(null)
    setFormData({})
    setSaved(false)
    setStadId('')
    setGebiedId('')
  }

  async function pickType(def: EntityTypeDef) {
    setSelectedType(def)
    const initial: Record<string, string> = {}
    def.fields.forEach((f) => {
      initial[f.key] = f.type === 'select' && f.options ? f.options[0] : ''
    })
    setFormData(initial)
    setStep('form')

    if (hasApiKey && droppedFile) {
      setAnalyzing(true)
      try {
        const text = await extractText(droppedFile)
        const extracted = await callClaude(droppedFile, text, def.fields)
        if (Object.keys(extracted).length > 0) {
          setFormData((prev) => ({ ...prev, ...extracted }))
        }
      } catch { /* ignore, user fills manually */ }
      setAnalyzing(false)
    }
  }

  async function handleSubmit() {
    if (!selectedType || !droppedFile) return
    const titleField = selectedType.fields.find((f) => f.required)
    const title = titleField ? (formData[titleField.key] || '(ongetiteld)') : '(ongetiteld)'

    // Sla op in gebied-sectie als mogelijk, anders in losse imports
    const savedToGebied = gebiedId
      ? saveToGebied(selectedType.type, formData, gebiedId)
      : false

    if (!savedToGebied) {
      const stadNaam = geselecteerdeStad?.naam
      const item: ImportedItem = {
        id:         `import-${Date.now()}`,
        type:       selectedType.type,
        typeLabel:  selectedType.label,
        typeColor:  selectedType.color,
        sourceFile: droppedFile.name,
        createdAt:  new Date().toISOString(),
        stad:       stadNaam,
        data:       formData,
        title,
      }
      await saveItem(item)
    }

    setSaved(true)
    setTimeout(close, 1400)
  }

  const isValid = !selectedType
    ? false
    : selectedType.fields.filter((f) => f.required).every((f) => formData[f.key]?.trim())

  const fileTag = droppedFile ? getFileTag(droppedFile.name) : null

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      {/* ── Drag overlay ───────────────────────────────────────────────────── */}
      {isDragging && !isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              border: '2px dashed #3b82f6',
              borderRadius: 20,
              padding: '56px 96px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v12m0 0-4-4m4 4 4-4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
              Document loslaten
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Kies daarna wat je wilt aanmaken in het dashboard
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={close}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 16,
              width: '100%',
              maxWidth: step === 'pick' ? 640 : 560,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {fileTag && (
                  <div
                    style={{
                      flexShrink: 0,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: fileTag.bg,
                      color: fileTag.color,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      border: `1px solid ${fileTag.color}30`,
                    }}
                  >
                    {fileTag.tag}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {droppedFile!.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    {formatSize(droppedFile!.size)}
                    {step === 'form' && selectedType && ` · ${selectedType.label}`}
                  </div>
                </div>
              </div>
              <button
                onClick={close}
                style={{
                  background: 'none', border: 'none', color: '#475569',
                  cursor: 'pointer', fontSize: 20, lineHeight: 1,
                  padding: '2px 6px', flexShrink: 0,
                  borderRadius: 4,
                }}
              >
                ×
              </button>
            </div>

            {/* ── Step 1: type picker ─────────────────────────────────────── */}
            {step === 'pick' && (
              <div style={{ padding: '16px 18px 20px', overflowY: 'auto' }}>
                <div
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    marginBottom: 12,
                  }}
                >
                  Wat wil je aanmaken?
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  {ENTITY_TYPES.map((et) => (
                    <TypeCard key={et.type} def={et} onClick={() => pickType(et)} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: form ────────────────────────────────────────────── */}
            {step === 'form' && selectedType && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                  {/* Back + analyze status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <button
                      onClick={() => setStep('pick')}
                      style={{
                        background: 'none', border: 'none', color: '#60a5fa',
                        fontSize: 12, cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      ← Terug
                    </button>
                    {analyzing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#60a5fa' }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                        Document analyseren...
                      </div>
                    )}
                    {!analyzing && hasApiKey && (
                      <div style={{ fontSize: 10, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>✓</span> AI-extractie actief
                      </div>
                    )}
                  </div>

                  {/* Stad + Gebied */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Stad</label>
                      <select
                        value={stadId}
                        onChange={(e) => { setStadId(e.target.value); setGebiedId('') }}
                        style={inputStyle}
                      >
                        <option value="">, kies stad, </option>
                        {allSteden.map((s) => (
                          <option key={s.id} value={s.id}>{s.naam}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Gebied
                        {gebiedId && GEBIED_KEY_MAP[selectedType.type] && (
                          <span style={{ color: '#34d399', marginLeft: 4 }}>→ direct geplaatst</span>
                        )}
                      </label>
                      <select
                        value={gebiedId}
                        onChange={(e) => setGebiedId(e.target.value)}
                        style={inputStyle}
                        disabled={!stadId}
                      >
                        <option value="">, kies gebied, </option>
                        {gebieden.map((g) => (
                          <option key={g.id} value={g.id}>{g.naam || g.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ height: 1, background: '#1e293b', marginBottom: 12 }} />

                  {/* Fields */}
                  {selectedType.fields.map((f) => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>
                        {f.label}
                        {f.required && (
                          <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>
                        )}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          value={formData[f.key] ?? ''}
                          onChange={(e) =>
                            setFormData((d) => ({ ...d, [f.key]: e.target.value }))
                          }
                          style={inputStyle}
                        >
                          {f.options!.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={formData[f.key] ?? ''}
                          onChange={(e) =>
                            setFormData((d) => ({ ...d, [f.key]: e.target.value }))
                          }
                          placeholder={f.placeholder}
                          rows={3}
                          style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
                        />
                      ) : (
                        <input
                          type={f.type}
                          value={formData[f.key] ?? ''}
                          onChange={(e) =>
                            setFormData((d) => ({ ...d, [f.key]: e.target.value }))
                          }
                          placeholder={f.placeholder}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  {saved ? (
                    <div
                      style={{
                        flex: 1, textAlign: 'center',
                        fontSize: 13, fontWeight: 600, color: '#34d399',
                        padding: '8px 0',
                      }}
                    >
                      Opgeslagen, zichtbaar in recente imports
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 8,
                          border: 'none',
                          background: isValid ? '#3b82f6' : '#1e293b',
                          color: isValid ? '#fff' : '#475569',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: isValid ? 'pointer' : 'default',
                          transition: 'background 0.15s',
                        }}
                      >
                        {selectedType.label} aanmaken
                      </button>
                      <button
                        onClick={close}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#94a3b8',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Annuleren
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── TypeCard subcomponent ─────────────────────────────────────────────────────

function TypeCard({ def, onClick }: { def: EntityTypeDef; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1a2540' : '#1e293b',
        border: `1px solid ${hovered ? def.color : '#334155'}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 8,
          background: def.color + '20',
          border: `1px solid ${def.color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: def.color,
          letterSpacing: '0.04em',
        }}
      >
        {def.abbr}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
          {def.label}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>
          {def.desc}
        </div>
      </div>
    </button>
  )
}
