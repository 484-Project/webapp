import { useEffect, useMemo, useState } from 'react'
import GlobeView from './GlobeView.jsx'
import SidePanel from './SidePanel.jsx'
import { valueAt } from './emissions.js'

const GASES = [
  { id: 'all', label: 'All gases' },
  { id: 'CO2', label: 'CO2' },
  { id: 'CH4', label: 'CH4' },
  { id: 'N2O', label: 'N2O' },
  { id: 'F-gases', label: 'F-gases' },
]

export default function App() {
  const [data, setData] = useState(null)
  const [features, setFeatures] = useState([])
  const [error, setError] = useState('')
  const [yearIndex, setYearIndex] = useState(0)
  const [gas, setGas] = useState('all')
  const [selected, setSelected] = useState('CHN')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/data/emissions.json').then((response) => response.json()),
      fetch('/data/countries.geojson').then((response) => response.json()),
    ])
      .then(([emissions, geo]) => {
        if (cancelled) return
        setData(emissions)
        setFeatures(geo.features)
        setYearIndex(emissions.years.length - 1)
      })
      .catch(() => {
        if (!cancelled) setError('The emissions files could not be loaded.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const countries = data?.countries ?? []
  const byCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries])

  const valueByIso = useMemo(() => {
    const values = new Map()
    if (!data) return values
    for (const country of countries) {
      values.set(country.code, valueAt(country, yearIndex, gas))
    }
    return values
  }, [countries, data, gas, yearIndex])

  const maxValue = useMemo(() => {
    let max = 0
    for (const value of valueByIso.values()) max = Math.max(max, value || 0)
    return max
  }, [valueByIso])

  const namesByIso = useMemo(
    () => new Map(countries.map((country) => [country.code, country.name])),
    [countries],
  )

  const onMap = features.some((feature) => feature.properties.iso === selected)

  if (error) {
    return <p className="status">{error}</p>
  }
  if (!data) {
    return <p className="status">Loading emissions…</p>
  }

  return (
    <div className="app">
      <header>
        <div>
          <p className="eyebrow">EDGAR 2026</p>
          <h1>Who emits the most</h1>
        </div>
        <div className="filters">
          <label>
            Year
            <input
              type="range"
              min="0"
              max={data.years.length - 1}
              value={yearIndex}
              onChange={(event) => setYearIndex(Number(event.target.value))}
            />
            <strong>{data.years[yearIndex]}</strong>
          </label>
          <div className="gases" role="group" aria-label="Gas">
            {GASES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={gas === item.id ? 'active' : ''}
                onClick={() => setGas(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main>
        <GlobeView
          features={features}
          valueByIso={valueByIso}
          maxValue={maxValue}
          namesByIso={namesByIso}
          selected={selected}
          onSelect={setSelected}
          gas={gas}
        />
        <SidePanel
          data={data}
          countries={countries}
          selected={selected}
          onSelect={setSelected}
          query={query}
          onQuery={setQuery}
          yearIndex={yearIndex}
          gas={gas}
          onMap={onMap && byCode.has(selected)}
        />
      </main>
    </div>
  )
}
