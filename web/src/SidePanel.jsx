import { formatMt, sectorsAt, unitLabel, valueAt } from './emissions.js'

function Trend({ country, years, yearIndex, gas }) {
  const values = country.total.map((_, index) => valueAt(country, index, gas))
  const width = 320
  const height = 170
  const pad = { top: 8, right: 10, bottom: 38, left: 52 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const max = Math.max(...values, 1)
  const step = plotW / Math.max(values.length - 1, 1)
  const xAt = (index) => pad.left + index * step
  const yAt = (value) => pad.top + plotH - ((value || 0) / max) * plotH
  const points = values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')
  const xTicks = years.map((year, index) => ({ year, index })).filter(({ year }) => year % 5 === 0)
  const yTicks = [0, 0.5, 1].map((fraction) => fraction * max)

  return (
    <figure className="trend-figure">
      <figcaption>Emissions over time</figcaption>
      <svg className="trend" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Emissions over time">
        {yTicks.map((value) => (
          <g key={value} className="tick">
            <line className="grid" x1={pad.left} x2={width - pad.right} y1={yAt(value)} y2={yAt(value)} />
            <text x={pad.left - 6} y={yAt(value)} textAnchor="end" dominantBaseline="middle">
              {formatMt(Math.round(value))}
            </text>
          </g>
        ))}
        {xTicks.map(({ year, index }) => (
          <g key={year} className="tick">
            <line x1={xAt(index)} x2={xAt(index)} y1={pad.top + plotH} y2={pad.top + plotH + 4} />
            <text
              x={xAt(index)}
              y={pad.top + plotH + 8}
              textAnchor="end"
              dominantBaseline="middle"
              transform={`rotate(-45 ${xAt(index)} ${pad.top + plotH + 8})`}
            >
              {year}
            </text>
          </g>
        ))}
        <line className="axis" x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} />
        <line className="axis" x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} />
        <polyline points={points} />
        <circle cx={xAt(yearIndex)} cy={yAt(values[yearIndex])} r="3.5" />
        <text className="axis-label" x={pad.left + plotW / 2} y={height - 2} textAnchor="middle">
          Year
        </text>
        <text
          className="axis-label"
          x={-(pad.top + plotH / 2)}
          y={11}
          transform="rotate(-90)"
          textAnchor="middle"
        >
          Million tonnes of CO₂{gas === 'CO2' ? '' : 'e'}
        </text>
      </svg>
    </figure>
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
      <section className="panel-section">
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
      </section>

      {country && (
        <>
          <section className="panel-section">
            <p className="eyebrow">{data.years[yearIndex]} · {gasLabel}</p>
            <h2>{country.name}</h2>
            {!onMap && <p className="note">This territory is too small to draw on the globe. The figures still apply.</p>}
          </section>
          <section className="panel-section">
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
          </section>
          <Trend country={country} years={data.years} yearIndex={yearIndex} gas={gas} />
          <section className="panel-section">
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
          </section>
        </>
      )}
    </aside>
  )
}
