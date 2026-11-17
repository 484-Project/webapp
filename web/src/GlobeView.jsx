import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { emissionColor, formatMt, unitLabel } from './emissions.js'

export default function GlobeView({
  features,
  valueByIso,
  maxValue,
  namesByIso,
  selected,
  onSelect,
  gas,
}) {
  const wrapRef = useRef(null)
  const globeRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 700 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const feature = features.find((item) => item.properties.iso === selected)
    if (!feature || !globeRef.current) return
    globeRef.current.pointOfView(
      { lat: feature.properties.lat, lng: feature.properties.lng, altitude: 2.35 },
      700,
    )
  }, [features, selected])

  const polygons = useMemo(
    () =>
      features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          value: valueByIso.get(feature.properties.iso) ?? null,
        },
      })),
    [features, valueByIso],
  )

  return (
    <div className="globe-wrap" ref={wrapRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="#02040a"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg"
        atmosphereColor="#8fb8c9"
        atmosphereAltitude={0.18}
        polygonsData={polygons}
        polygonAltitude={(feature) => {
          const iso = feature.properties.iso
          if (iso === hover) return 0.09
          if (iso === selected) return 0.045
          return 0.01
        }}
        polygonCapColor={(feature) => emissionColor(feature.properties.value, maxValue)}
        polygonSideColor={() => 'rgba(12, 18, 22, 0.55)'}
        polygonStrokeColor={() => 'rgba(244, 241, 234, 0.35)'}
        polygonLabel={(feature) => {
          const iso = feature.properties.iso
          const name = namesByIso.get(iso) || feature.properties.name
          const value = feature.properties.value
          const amount = value == null ? 'No emissions record' : `${formatMt(value)} ${unitLabel(gas)}`
          return `<div class="globe-tip"><strong>${name}</strong><span>${amount}</span></div>`
        }}
        onPolygonHover={(feature) => setHover(feature ? feature.properties.iso : null)}
        onPolygonClick={(feature) => {
          if (feature && valueByIso.has(feature.properties.iso)) onSelect(feature.properties.iso)
        }}
        polygonsTransitionDuration={250}
      />
    </div>
  )
}
