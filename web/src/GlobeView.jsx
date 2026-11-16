import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'
import { emissionColor, formatMt, unitLabel } from './emissions.js'

// Equatorial radii in km. Sizes below are real ratios, with Jupiter as the reference
// so the Sun and gas giants fit beside the interactive Earth instead of covering it.
const RADIUS_KM = {
  Sun: 696340,
  Mercury: 2439.7,
  Venus: 6051.8,
  Mars: 3389.5,
  Jupiter: 69911,
  Saturn: 58232,
  Uranus: 25362,
  Neptune: 24622,
}
const JUPITER_SIZE = 16

const PLANETS = [
  { name: 'Sun', color: '#ffe3a3', emissive: '#ffb347', side: -1.85, lift: 1.55, spin: 0.003 },
  { name: 'Mercury', color: '#c8c4ba', side: -0.92, lift: 0.42, spin: 0.02 },
  { name: 'Venus', color: '#ead7a4', side: -1.02, lift: -0.72, spin: 0.012 },
  { name: 'Mars', color: '#c4552a', side: 0.92, lift: 0.58, spin: 0.016 },
  { name: 'Jupiter', color: '#d8b48a', side: 1.22, lift: 0.08, spin: 0.02, bands: true },
  { name: 'Saturn', color: '#ead9b0', side: 1.12, lift: -0.82, spin: 0.018, rings: true },
  { name: 'Uranus', color: '#b7e4e6', side: -1.18, lift: 0.95, spin: 0.014 },
  { name: 'Neptune', color: '#3d5ad6', side: 1.28, lift: 0.92, spin: 0.013 },
].map((planet) => ({
  ...planet,
  size: (RADIUS_KM[planet.name] / RADIUS_KM.Jupiter) * JUPITER_SIZE,
}))

function bandTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  const stripes = ['#e6c89a', '#c9956a', '#f0d7b4', '#b7835c', '#e7cba0', '#d7a57a']
  stripes.forEach((color, index) => {
    context.fillStyle = color
    context.fillRect(0, (canvas.height / stripes.length) * index, canvas.width, canvas.height / stripes.length + 1)
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildSolarSystem(scene) {
  const up = new THREE.Vector3()
  const right = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const bodies = PLANETS.map((planet, index) => {
    const material = planet.emissive
      ? new THREE.MeshBasicMaterial({ color: planet.emissive })
      : new THREE.MeshStandardMaterial({
          color: planet.color,
          map: planet.bands ? bandTexture() : null,
          roughness: 0.85,
        })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 32, 24), material)
    const group = new THREE.Group()
    group.add(mesh)
    if (planet.rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(planet.size * 1.15, planet.size * 2.3, 64),
        new THREE.MeshBasicMaterial({ color: '#e6d3a2', side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
      )
      ring.rotation.x = Math.PI * 0.52
      group.add(ring)
    }
    scene.add(group)
    return { ...planet, group, phase: index * 0.7 }
  })

  return (camera, time) => {
    const distance = camera.position.length()
    forward.copy(camera.position).multiplyScalar(-1).normalize()
    right.crossVectors(forward, camera.up).normalize()
    if (right.lengthSq() < 0.01) right.set(1, 0, 0)
    up.crossVectors(right, forward).normalize()
    bodies.forEach((planet) => {
      const drift = Math.sin(time * 0.15 + planet.phase) * 6
      const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance * 0.94
      const halfWidth = halfHeight * camera.aspect
      planet.group.position
        .copy(camera.position)
        .addScaledVector(forward, distance * 0.94)
        .addScaledVector(right, planet.side * halfWidth * 0.72 + drift)
        .addScaledVector(up, planet.lift * halfHeight * 0.72)
      planet.group.rotation.y += planet.spin
    })
  }
}

function makeStarfield() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const context = canvas.getContext('2d')
  const sky = context.createLinearGradient(0, 0, 0, canvas.height)
  sky.addColorStop(0, '#050816')
  sky.addColorStop(0.5, '#0a1024')
  sky.addColorStop(1, '#050816')
  context.fillStyle = sky
  context.fillRect(0, 0, canvas.width, canvas.height)

  const band = context.createLinearGradient(0, 280, 0, 760)
  band.addColorStop(0, 'rgba(10, 16, 36, 0)')
  band.addColorStop(0.45, 'rgba(88, 72, 140, 0.28)')
  band.addColorStop(0.55, 'rgba(150, 120, 170, 0.22)')
  band.addColorStop(1, 'rgba(10, 16, 36, 0)')
  context.fillStyle = band
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 1800; index += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const bright = Math.random()
    const radius = bright > 0.97 ? 1.8 : bright > 0.85 ? 1.1 : 0.6
    context.fillStyle = `rgba(255, 255, 255, ${0.35 + bright * 0.65})`
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  return canvas.toDataURL('image/jpeg', 0.85)
}

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
  const starfield = useMemo(() => makeStarfield(), [])

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

  useEffect(() => () => globeRef.stopSolar?.(), [])

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
        backgroundImageUrl={starfield}
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
        onGlobeReady={() => {
          const globe = globeRef.current
          if (!globe || globeRef.solar) return
          const step = buildSolarSystem(globe.scene())
          globeRef.solar = step
          let frame = 0
          const started = performance.now()
          const tick = (now) => {
            step(globe.camera(), (now - started) / 1000)
            frame = requestAnimationFrame(tick)
          }
          frame = requestAnimationFrame(tick)
          globeRef.stopSolar = () => cancelAnimationFrame(frame)
        }}
      />
    </div>
  )
}
