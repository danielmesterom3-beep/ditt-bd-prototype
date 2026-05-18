import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet'
import type { Gebied } from '../data/types'
import type { Stad } from '../data/types'

interface GeoFeature {
  type: 'Feature'
  properties: { id: string; naam: string; stad: string; center: [number, number] }
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

interface GeoData {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

const STAD_CONFIG: Record<string, { center: [number, number]; zoom: number }> = {
  eindhoven: { center: [51.435, 5.455], zoom: 12 },
  rotterdam: { center: [51.918, 4.476], zoom: 12 },
}

function polygonColors(gebied: Gebied) {
  const actief = gebied.partijen.filter(p => p.contactStatus === 'actief').length
  const warm   = gebied.partijen.filter(p => p.contactStatus === 'warm').length
  if (actief > 0) return { color: '#059669', fillColor: '#d1fae5', fillOpacity: 0.45 }
  if (warm > 0)   return { color: '#d97706', fillColor: '#fef3c7', fillOpacity: 0.45 }
  return            { color: '#6366f1', fillColor: '#e0e7ff', fillOpacity: 0.38 }
}

interface Props {
  stad: Stad
  onGebiedClick: (gebied: Gebied) => void
}

export default function StadsKaart({ stad, onGebiedClick }: Props) {
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/geo/gebieden.json')
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => setError(true))
  }, [])

  const config = STAD_CONFIG[stad.id] ?? { center: [52.0, 5.0] as [number, number], zoom: 11 }
  const features = geoData?.features.filter(f => f.properties.stad === stad.id) ?? []

  if (error) return (
    <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f7', borderRadius: 12, color: '#999', fontSize: 13 }}>
      Kaart kon niet worden geladen
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={config.center}
        zoom={config.zoom}
        style={{ height: 480, borderRadius: 12, zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {features.map(feature => {
          const gebied = stad.gebieden.find(g => g.id === feature.properties.id)
          if (!gebied) return null

          // GeoJSON [lng, lat] → Leaflet [lat, lng]
          const positions = feature.geometry.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number]
          )
          const colors = polygonColors(gebied)
          const actiefCount = gebied.partijen.filter(p => p.contactStatus === 'actief').length
          const warmCount   = gebied.partijen.filter(p => p.contactStatus === 'warm').length
          const koudCount   = gebied.partijen.filter(p => p.contactStatus === 'koud').length

          return (
            <Polygon
              key={gebied.id}
              positions={positions}
              pathOptions={{ ...colors, weight: 2 }}
              eventHandlers={{
                click: () => onGebiedClick(gebied),
                mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.7, weight: 3 }) },
                mouseout:  (e) => { e.target.setStyle({ fillOpacity: colors.fillOpacity, weight: 2 }) },
              }}
            >
              <Tooltip sticky>
                <div style={{ minWidth: 170 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#1a1a1a' }}>
                    {gebied.naam}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', lineHeight: 1.9 }}>
                    <div>Leegstand: <b>{gebied.marktdata.leegstandPercentage}%</b></div>
                    <div>
                      Huurprijs: <b>€{gebied.marktdata.huurprijsBandwidth.min}–{gebied.marktdata.huurprijsBandwidth.max}/m²</b>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                      {actiefCount > 0 && <span style={{ color: '#059669' }}>● {actiefCount} actief</span>}
                      {warmCount   > 0 && <span style={{ color: '#d97706' }}>● {warmCount} warm</span>}
                      {koudCount   > 0 && <span style={{ color: '#94a3b8' }}>● {koudCount} koud</span>}
                    </div>
                  </div>
                  <div style={{ marginTop: 7, fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                    Klik om te openen →
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          )
        })}
      </MapContainer>

      {/* Legenda */}
      <div style={{
        position: 'absolute', bottom: 24, left: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '8px 12px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.12)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontWeight: 700, color: '#444', marginBottom: 2 }}>Status</div>
        {[
          { color: '#d1fae5', stroke: '#059669', label: 'Actief contact' },
          { color: '#fef3c7', stroke: '#d97706', label: 'Warm contact' },
          { color: '#e0e7ff', stroke: '#6366f1', label: 'Koud / oriëntatie' },
        ].map(({ color, stroke, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: color, border: `2px solid ${stroke}`, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: '#555' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
