export function valueAt(country, yearIndex, gas) {
  if (!country) return null
  if (gas === 'all') return country.total[yearIndex]
  return Object.values(country.series).reduce(
    (sum, gases) => sum + (gases[gas]?.[yearIndex] || 0),
    0,
  )
}

export function sectorsAt(country, yearIndex, gas, sectorNames) {
  const rows = sectorNames.map((name) => {
    const gases = country.series[name]
    const value =
      gas === 'all'
        ? Object.values(gases).reduce((sum, series) => sum + (series[yearIndex] || 0), 0)
        : gases[gas]?.[yearIndex] || 0
    return { name, value }
  })
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return rows
    .map((row) => ({ ...row, share: total ? row.value / total : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function formatMt(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function unitLabel(gas) {
  if (gas === 'CO2') return 'million tonnes of CO₂'
  return 'million tonnes of CO₂ equivalent'
}

export function emissionColor(value, max) {
  if (value == null || value <= 0 || !max) return 'rgba(86, 98, 108, 0.72)'
  const t = Math.min(1, Math.log1p(value) / Math.log1p(max))
  const stops = [
    [28, 78, 92],
    [47, 143, 122],
    [232, 176, 74],
    [196, 78, 42],
  ]
  const scaled = t * (stops.length - 1)
  const index = Math.min(stops.length - 2, Math.floor(scaled))
  const local = scaled - index
  const [r1, g1, b1] = stops[index]
  const [r2, g2, b2] = stops[index + 1]
  const channel = (from, to) => Math.round(from + (to - from) * local)
  return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`
}
