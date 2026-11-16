import { formatMt, sectorsAt, unitLabel, valueAt } from './emissions.js'

function Trend({ country, yearIndex, gas }) {
  const values = country.total.map((_, index) => valueAt(country, index, gas))
  const width = 280
  const height = 72
  const max = Math.max(...values, 1)
  const step = width / Math.max(values.length - 1, 1)
  const points = values
    .map((value, index) => {
      const x = index * step
      const y = height - 8 - ((value || 0) / max) * (height - 16)
      return `${x},${y}`
    })
    .join(' ')
  const markerX = yearIndex * step
  const markerY = height - 8 - ((values[yearIndex] || 0) / max) * (height - 16)

  return (
    <svg className="trend" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Emissions over time">
      <polyline points={points} />
      <circle cx={markerX} cy={markerY} r="3.5" />
    </svg>
  )
}

export default function SidePanel({
  data,
  countries,
  selected,
  onSelect,
  query,
  onQuery,
  yearIndex,
  gas,
  onMap,
}) {
  const country = countries.find((item) => item.code === selected)
  const matches = query.trim()
    ? countries.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  const total = country ? valueAt(country, yearIndex, gas) : null
  const sectors = country ? sectorsAt(country, yearIndex, gas, data.sectors) : []
  const gasLabel = gas === 'all' ? 'all greenhouse gases' : gas

  return (
    <aside className="panel">
      <label className="search">
        <span>Search for country</span>
        <input
          value={query}
          placeholder="Country name"
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      {matches.length > 0 && (
        <ul className="matches">
          {matches.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item.code)
                  onQuery('')
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {country && (
        <>
          <p className="eyebrow">{data.years[yearIndex]} · {gasLabel}</p>
          <h2>{country.name}</h2>
          {!onMap && <p className="note">This territory is too small to draw on the globe. The figures still apply.</p>}
          <p className="total">
            <span>Total</span>
            <strong>{formatMt(total)}</strong>
            <em>{unitLabel(gas)}</em>
          </p>
          {gas !== 'CO2' && (
            <p className="unit-note">
              Other gases are converted to the amount of CO₂ that would warm the planet by the same amount.
            </p>
          )}
          <Trend country={country} yearIndex={yearIndex} gas={gas} />
          <h3>Breakdown by sector</h3>
          <ul className="bars">
            {sectors.map((sector) => (
              <li key={sector.name}>
                <div className="bar-label">
                  <span>{sector.name}</span>
                  <span>{Math.round(sector.share * 100)}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(sector.share * 100, sector.value ? 1 : 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
