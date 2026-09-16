import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Database,
  Filter,
  Gauge,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  GripVertical,
  Moon,
  Sun,
  Trophy,
  Users,
  Volleyball,
} from 'lucide-react'
import {
  aggregateStats,
  assignLineupPlayer,
  builderSlotLabels,
  createInitialLineup,
  derivedRadarValue,
  fallbackMatches,
  loadSeasonDataset,
  positionCode,
  seasonConfigs,
  type MatchRecord,
  type PlayerAggregate,
  type RadarDimensionKey,
  type SeasonDataset,
  type SeasonId,
} from './data'

type PositionFilter = 'Alle' | 'Attacker' | 'Setter' | 'Middle' | 'Libero'
type MetricKey = 'points' | 'attackEfficiency' | 'serveEfficiency' | 'receiveEfficiency' | 'defenseEfficiency' | 'setterEfficiency' | 'setterSuccessEfficiency'
type RadarAxisKey = RadarDimensionKey
type RadarAxisConfig = { key: RadarAxisKey; label: string }
type CompetitionFilter = 'Alle' | 'Liga' | 'Pokal'
type StatsMode = 'Mit Statistik' | 'Alle Spiele'
type DashboardSettings = {
  defaultMetric: MetricKey
  trendMetric: MetricKey
  competition: CompetitionFilter
  statsMode: StatsMode
  minimumAttempts: number
  showTrendDelta: boolean
  showSourceHint: boolean
  showWebsiteOnly: boolean
  radarAxes: RadarAxisConfig[]
}

const positionFilters: PositionFilter[] = ['Alle', 'Attacker', 'Setter', 'Middle', 'Libero']
const metricOptions: Array<{ key: MetricKey; label: string; shortLabel: string }> = [
  { key: 'points', label: 'Punkte', shortLabel: 'Punkte' },
  { key: 'attackEfficiency', label: 'Angriffseffizienz', shortLabel: 'Angriff' },
  { key: 'serveEfficiency', label: 'Aufschlag', shortLabel: 'Aufschlag' },
  { key: 'receiveEfficiency', label: 'Annahme', shortLabel: 'Annahme' },
  { key: 'defenseEfficiency', label: 'Abwehr', shortLabel: 'Abwehr' },
  { key: 'setterEfficiency', label: 'Zuspielquote', shortLabel: 'Zuspiel' },
  { key: 'setterSuccessEfficiency', label: 'Zuspielerfolg', shortLabel: 'Erfolg' },
]
const radarMetricOptions: Array<{ key: RadarAxisKey; label: string }> = [
  { key: 'serveReceive', label: 'Serve-Receive-Sicherheit' },
  { key: 'attackImpact', label: 'Angriffsdruck' },
  { key: 'transition', label: 'Transition' },
  { key: 'netPresence', label: 'Netzpräsenz' },
  { key: 'servicePressure', label: 'Aufschlagdruck' },
  { key: 'playmaking', label: 'Spielaufbau' },
  { key: 'stability', label: 'Stabilität' },
  { key: 'coverage', label: 'Feldabdeckung' },
]
const defaultRadarAxes: RadarAxisConfig[] = [
  { key: 'serveReceive', label: 'Serve-Receive' },
  { key: 'attackImpact', label: 'Angriffsdruck' },
  { key: 'transition', label: 'Transition' },
  { key: 'netPresence', label: 'Netzpräsenz' },
  { key: 'servicePressure', label: 'Aufschlagdruck' },
  { key: 'playmaking', label: 'Spielaufbau' },
]
let activeRadarAxes: RadarAxisConfig[] = defaultRadarAxes
const playerColors = ['#ff735b', '#a78bfa', '#55c5a0', '#f4b942', '#4f8df7', '#f06ca9']

function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value)
}

function formatPercent(value: number) {
  return `${formatNumber(value)}%`
}

function getPlayerMetric(player: PlayerAggregate, key: MetricKey) {
  if (key === 'points') return player.points
  if (key === 'attackEfficiency') return player.attackEfficiency
  if (key === 'serveEfficiency') return player.serveAttempts ? (player.servePoints / player.serveAttempts) * 100 : 0
  if (key === 'receiveEfficiency') return player.receiveEfficiency
  if (key === 'setterEfficiency') return player.role === 'Setter' ? player.assistEfficiency : 0
  if (key === 'setterSuccessEfficiency') return player.role === 'Setter' ? player.assistSuccessEfficiency : 0
  return player.digEfficiency
}

function getPlayerAttempts(player: PlayerAggregate, key: MetricKey) {
  if (key === 'points') return player.matches
  if (key === 'attackEfficiency') return player.attacks
  if (key === 'serveEfficiency') return player.serveAttempts
  if (key === 'receiveEfficiency') return player.receiveAttempts
  if (key === 'setterEfficiency') return player.role === 'Setter' ? player.assists : 0
  if (key === 'setterSuccessEfficiency') return player.role === 'Setter' ? player.assists : 0
  return player.digAttempts
}

function hasRelevantMetric(player: PlayerAggregate, key: MetricKey) {
  return !['setterEfficiency', 'setterSuccessEfficiency'].includes(key) || player.role === 'Setter'
}

function formatMetric(value: number, key: MetricKey) {
  return key === 'points' ? formatNumber(value) : formatPercent(value)
}

function getRadarValue(summary: PlayerAggregate | ReturnType<typeof aggregateStats>, key: RadarAxisKey) {
  return derivedRadarValue(summary, key)
}

function resultLabel(result: MatchRecord['result']) {
  if (result === 'win') return 'Sieg'
  if (result === 'draw') return 'Unentschieden'
  if (result === 'scheduled') return 'Ausstehend'
  return 'Niederlage'
}

function sourceLabel(source: SeasonDataset['sourceBySeason'][SeasonId]) {
  if (source === 'live') return 'Website + Google Sheets'
  if (source === 'partial') return 'Teilimport'
  if (source === 'fallback') return 'Demo-Fallback'
  return 'Nicht verfügbar'
}

function metricLabel(key: MetricKey) {
  return metricOptions.find((option) => option.key === key)?.label ?? 'Kennzahl'
}

function getMatchMetric(match: MatchRecord, position: PositionFilter, key: MetricKey): number | null {
  const players = position === 'Alle' ? match.players : match.players.filter((player) => player.role === position)
  if (players.length === 0) return null
  if (key === 'points') return players.reduce((sum, player) => sum + player.points, 0)
  if (key === 'attackEfficiency') {
    const attempts = players.reduce((sum, player) => sum + player.attacks, 0)
    return attempts ? players.reduce((sum, player) => sum + player.attackPoints, 0) / attempts * 100 : null
  }
  if (key === 'serveEfficiency') {
    const attempts = players.reduce((sum, player) => sum + player.serveAttempts, 0)
    return attempts ? players.reduce((sum, player) => sum + player.servePoints, 0) / attempts * 100 : null
  }
  if (key === 'receiveEfficiency') {
    const attempts = players.reduce((sum, player) => sum + player.receiveAttempts, 0)
    return attempts ? players.reduce((sum, player) => sum + player.receiveEfficiency * player.receiveAttempts, 0) / attempts : null
  }
  if (key === 'setterEfficiency') {
    const setters = players.filter((player) => player.role === 'Setter')
    const attempts = setters.reduce((sum, player) => sum + player.assists, 0)
    return attempts ? setters.reduce((sum, player) => sum + player.assistEfficiency * player.assists, 0) / attempts : null
  }
  if (key === 'setterSuccessEfficiency') {
    const setters = players.filter((player) => player.role === 'Setter')
    const attempts = setters.reduce((sum, player) => sum + player.assists, 0)
    return attempts ? setters.reduce((sum, player) => sum + player.assistSuccessEfficiency * player.assists, 0) / attempts : null
  }
  const attempts = players.reduce((sum, player) => sum + player.digAttempts, 0)
  return attempts ? players.reduce((sum, player) => sum + player.digPositive, 0) / attempts * 100 : null
}

type ProfileKpi = { icon: ReactNode; label: string; value: string; detail: string; tone: string }

function assistSuccessRate(player: PlayerAggregate) {
  return player.assistSuccessEfficiency
}

function blockEfficiency(player: PlayerAggregate) {
  return player.blocks ? player.blockPoints / player.blocks * 100 : 0
}

function profileKpis(profile: PlayerAggregate): ProfileKpi[] {
  const position = profile.position.toUpperCase()
  const kpis: ProfileKpi[] = [{ icon: <Trophy size={17} />, label: 'Punkte insgesamt', value: formatNumber(profile.points), detail: `${profile.matches} Statistikspiele`, tone: 'coral' }]
  if (profile.role === 'Setter') {
    return [...kpis,
      { icon: <Activity size={17} />, label: 'Zuspielquote', value: formatPercent(profile.assistEfficiency), detail: `${profile.assists} Zuspiele`, tone: 'purple' },
      { icon: <BarChart3 size={17} />, label: 'Zuspiele insgesamt', value: formatNumber(profile.assists), detail: `${profile.assistErrors} Zuspielfehler`, tone: 'gold' },
      { icon: <ShieldCheck size={17} />, label: 'Zuspielerfolgsquote', value: formatPercent(assistSuccessRate(profile)), detail: `${formatNumber(profile.assistSuccessEfficiency / 100 * profile.assists)} Punkte nach Zuspiel`, tone: 'mint' },
    ]
  }
  if (profile.role === 'Libero') {
    return [...kpis,
      { icon: <Activity size={17} />, label: 'Annahme', value: formatPercent(profile.receiveEfficiency), detail: `${profile.receiveAttempts} Versuche`, tone: 'purple' },
      { icon: <ShieldCheck size={17} />, label: 'Abwehr', value: formatPercent(profile.digEfficiency), detail: `${profile.digAttempts} Bälle`, tone: 'mint' },
      { icon: <BarChart3 size={17} />, label: 'Zuspiel', value: formatNumber(profile.assists), detail: formatPercent(profile.assistEfficiency), tone: 'gold' },
    ]
  }
  if (profile.role === 'Middle') {
    return [...kpis,
      { icon: <ShieldCheck size={17} />, label: 'Block', value: formatPercent(blockEfficiency(profile)), detail: `${profile.blockPoints} Blockpunkte`, tone: 'mint' },
      { icon: <Activity size={17} />, label: 'Angriff', value: formatPercent(profile.attackEfficiency), detail: `${profile.attacks} Versuche`, tone: 'purple' },
      { icon: <Database size={17} />, label: 'Sätze', value: formatNumber(profile.sets), detail: `${profile.matches} Statistikspiele`, tone: 'gold' },
    ]
  }
  if (position.includes('OP')) {
    return [...kpis,
      { icon: <Activity size={17} />, label: 'Angriff', value: formatPercent(profile.attackEfficiency), detail: `${profile.attacks} Versuche`, tone: 'purple' },
      { icon: <ShieldCheck size={17} />, label: 'Abwehr', value: formatPercent(profile.digEfficiency), detail: `${profile.digAttempts} Bälle`, tone: 'mint' },
      { icon: <Database size={17} />, label: 'Sätze', value: formatNumber(profile.sets), detail: `${profile.matches} Statistikspiele`, tone: 'gold' },
    ]
  }
  return [...kpis,
    { icon: <Activity size={17} />, label: 'Angriff', value: formatPercent(profile.attackEfficiency), detail: `${profile.attacks} Versuche`, tone: 'purple' },
    { icon: <ShieldCheck size={17} />, label: 'Annahme', value: formatPercent(profile.receiveEfficiency), detail: `${profile.receiveAttempts} Versuche`, tone: 'mint' },
    { icon: <Database size={17} />, label: 'Sätze', value: formatNumber(profile.sets), detail: `${profile.matches} Statistikspiele`, tone: 'gold' },
  ]
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function RadarChart({ values, axes = activeRadarAxes, color = '#ff735b', compact = false }: { values: number[]; axes?: RadarAxisConfig[]; color?: string; compact?: boolean }) {
  const labels = axes.map((axis) => axis.label)
  const size = compact ? 210 : 320
  const center = size / 2
  const radius = compact ? 69 : 105
  const angleStep = (Math.PI * 2) / labels.length
  const point = (value: number, index: number, factor = 1) => {
    const angle = -Math.PI / 2 + index * angleStep
    const scaled = radius * Math.max(0, Math.min(value, 100)) / 100 * factor
    return [center + Math.cos(angle) * scaled, center + Math.sin(angle) * scaled]
  }
  const polygon = (factor: number) => labels.map((_, index) => point(100, index, factor).join(',')).join(' ')
  const dataPolygon = labels.map((_, index) => point(values[index] ?? 0, index).join(',')).join(' ')

  return <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radarprofil">
    {[0.2, 0.4, 0.6, 0.8, 1].map((factor) => <polygon key={factor} points={polygon(factor)} className="radar-grid" />)}
    {labels.map((label, index) => { const [x, y] = point(100, index); const [labelX, labelY] = point(100, index, 1.18); return <g key={index}><line x1={center} y1={center} x2={x} y2={y} className="radar-axis" />{!compact && <text x={labelX} y={labelY} className="radar-label" textAnchor={labelX < center - 6 ? 'end' : labelX > center + 6 ? 'start' : 'middle'}>{label}</text>}</g> })}
    <polygon points={dataPolygon} fill={color} fillOpacity="0.2" stroke={color} strokeWidth={compact ? 2 : 2.5} />
    {labels.map((_, index) => { const [x, y] = point(values[index] ?? 0, index); return <circle key={index} cx={x} cy={y} r={compact ? 2.5 : 3.5} fill={color} /> })}
  </svg>
}

function TrendChart({ matches, position, metric, statsOnly }: { matches: MatchRecord[]; position: PositionFilter; metric: MetricKey; statsOnly: boolean }) {
  const allPoints = matches.map((match) => ({ label: match.label, value: getMatchMetric(match, position, metric), score: `${match.score.team}:${match.score.opponent}`, opponent: match.opponent }))
  const points = statsOnly ? allPoints.filter((point) => point.value !== null) : allPoints
  const values = points.flatMap((point) => point.value === null ? [] : [point.value])
  if (points.length === 0 || values.length === 0) return <div className="trend-empty">Für diesen Zeitraum sind keine Sheet-Werte für die gewählte Kennzahl vorhanden.</div>
  const width = 740
  const height = 215
  const padding = { top: 19, right: 18, bottom: 32, left: 34 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const x = (index: number) => padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
  const scaleMax = metric === 'points' ? Math.max(10, Math.ceil(Math.max(...values) / 10) * 10) : 100
  const y = (value: number) => padding.top + plotHeight - (Math.max(0, Math.min(scaleMax, value)) / scaleMax) * plotHeight
  const segments: Array<Array<{ index: number; value: number }>> = []
  points.forEach((point, index) => { if (point.value !== null) { if (!segments.length || points[index - 1]?.value === null) segments.push([]); segments[segments.length - 1].push({ index, value: point.value }) } })
  return <div className="trend-wrap"><svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Verlauf: ${metricLabel(metric)}`}>
    {[0, 0.25, 0.5, 0.75, 1].map((factor) => { const tick = scaleMax * factor; return <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x={padding.left - 9} y={y(tick) + 4} textAnchor="end" className="chart-tick">{metric === 'points' ? formatNumber(tick) : `${formatNumber(tick)}%`}</text></g> })}
    {segments.map((segment) => { const line = segment.map((item) => `${x(item.index)},${y(item.value)}`).join(' '); const area = `${x(segment[0].index)},${height - padding.bottom} ${line} ${x(segment[segment.length - 1].index)},${height - padding.bottom}`; return <g key={line}><polygon points={area} className="trend-area" /><polyline points={line} className="trend-line" /></g> })}
    {points.map((item, index) => <g key={`${item.label}-${item.opponent}`}>{item.value === null ? <text x={x(index)} y={padding.top + plotHeight / 2} textAnchor="middle" className="chart-missing">n.a.</text> : <circle cx={x(index)} cy={y(item.value)} r="5" className="trend-dot" />}<text x={x(index)} y={height - 10} textAnchor="middle" className="chart-tick">{item.label.replace('Spiel ', '#')}</text><title>{`${item.label} gegen ${item.opponent}: ${item.value === null ? 'keine Sheet-Werte' : formatMetric(item.value, metric)} · ${item.score}`}</title></g>)}
  </svg></div>
}

function SeasonBalanceChart({ matches }: { matches: MatchRecord[] }) {
  const played = matches.filter((match) => match.result !== 'scheduled')
  const values = played.reduce<{ team: number[]; opponent: number[] }>((series, match) => {
    series.team.push((series.team.at(-1) ?? 0) + match.score.team)
    series.opponent.push((series.opponent.at(-1) ?? 0) + match.score.opponent)
    return series
  }, { team: [], opponent: [] })
  const width = 740
  const height = 250
  const padding = { top: 22, right: 18, bottom: 40, left: 42 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(1, ...values.team, ...values.opponent)
  const x = (index: number) => padding.left + (values.team.length <= 1 ? plotWidth / 2 : index / (values.team.length - 1) * plotWidth)
  const y = (value: number) => padding.top + plotHeight - value / maxValue * plotHeight
  const line = (points: number[]) => points.map((value, index) => `${x(index)},${y(value)}`).join(' ')

  return <article className="card analytics-chart season-balance-card"><div className="analytics-chart-head"><div><span className="eyebrow">Offizieller Katalog</span><h3>Satzverlauf</h3></div><div className="chart-legend"><span><i className="legend-swatch team" />ATV I</span><span><i className="legend-swatch opponent" />Gegner</span></div></div><p className="analytics-chart-description">Kumulierte Satzbilanz über alle abgeschlossenen Katalogspiele.</p>{values.team.length ? <svg className="line-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Kumulierte Satzbilanz"><polyline points={line(values.team)} className="season-line team" /><polyline points={line(values.opponent)} className="season-line opponent" />{[0, 0.5, 1].map((factor) => <g key={factor}><line x1={padding.left} x2={width - padding.right} y1={y(maxValue * factor)} y2={y(maxValue * factor)} className="chart-grid" /><text x={padding.left - 8} y={y(maxValue * factor) + 4} textAnchor="end" className="chart-tick">{formatNumber(maxValue * factor)}</text></g>)}{played.map((match, index) => <g key={match.id}><circle cx={x(index)} cy={y(values.team[index])} r="3.5" className="season-dot team" /><circle cx={x(index)} cy={y(values.opponent[index])} r="3.5" className="season-dot opponent" /><text x={x(index)} y={height - 10} textAnchor="middle" className="chart-tick">{match.label.replace('Spiel ', '#')}</text><title>{`${match.label} gegen ${match.opponent}: ${match.score.team}:${match.score.opponent}`}</title></g>)}</svg> : <EmptyState />}</article>
}

type ScatterPoint = { name: string; x: number; y: number }

function regression(points: ScatterPoint[]) {
  if (points.length < 2) return null
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0)
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0)
  if (denominator === 0) return null
  const slope = numerator / denominator
  return { slope, intercept: meanY - slope * meanX }
}

function ScatterChart({ title, description, xLabel, yLabel, points, color = '#4f8df7', yFormat = 'percent' }: { title: string; description: string; xLabel: string; yLabel: string; points: ScatterPoint[]; color?: string; yFormat?: 'percent' | 'number' }) {
  const width = 440
  const height = 250
  const padding = { top: 22, right: 18, bottom: 40, left: 42 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const maxX = Math.max(1, ...points.map((point) => point.x))
  const maxY = Math.max(1, ...points.map((point) => point.y))
  const x = (value: number) => padding.left + value / maxX * plotWidth
  const y = (value: number) => padding.top + plotHeight - Math.max(0, Math.min(maxY, value)) / maxY * plotHeight
  const line = regression(points)
  const lineStart = line ? Math.max(0, line.intercept) : 0
  const lineEnd = line ? Math.max(0, Math.min(maxY, line.slope * maxX + line.intercept)) : 0

  return <article className="card analytics-chart scatter-card"><div className="analytics-chart-head"><div><span className="eyebrow">Zusammenhang</span><h3>{title}</h3></div><span className="chart-trend-label">Trendlinie</span></div><p className="analytics-chart-description">{description}</p>{points.length ? <svg className="scatter-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>{[0, 0.5, 1].map((factor) => <g key={factor}><line x1={padding.left} x2={width - padding.right} y1={y(maxY * factor)} y2={y(maxY * factor)} className="chart-grid" /><text x={padding.left - 8} y={y(maxY * factor) + 4} textAnchor="end" className="chart-tick">{formatNumber(maxY * factor)}{yFormat === 'percent' ? '%' : ''}</text></g>)}<line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="chart-axis-line" /><line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} className="chart-axis-line" />{line && <line x1={x(0)} y1={y(lineStart)} x2={x(maxX)} y2={y(lineEnd)} className="scatter-trend-line" />}{points.map((point) => <g key={point.name}><circle cx={x(point.x)} cy={y(point.y)} r="4.5" fill={color} className="scatter-point" /><text x={x(point.x)} y={y(point.y) - 8} textAnchor="middle" className="scatter-label">{point.name}</text><title>{`${point.name}: ${formatNumber(point.x)} ${xLabel}, ${formatNumber(point.y)}${yFormat === 'percent' ? '%' : ''} ${yLabel}`}</title></g>)}<text x={width / 2} y={height - 10} textAnchor="middle" className="chart-axis-label">{xLabel}</text><text x="12" y={height / 2} transform={`rotate(-90 12 ${height / 2})`} textAnchor="middle" className="chart-axis-label">{yLabel}</text></svg> : <EmptyState />}</article>
}

function PointsDnaChart({ players }: { players: PlayerAggregate[] }) {
  const width = 880
  const height = 270
  const padding = { top: 34, right: 18, bottom: 54, left: 42 }
  const plotHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(10, ...players.map((player) => player.servePoints + player.attackPoints + player.blockPoints))
  const barWidth = players.length ? Math.min(42, (width - padding.left - padding.right) / players.length - 8) : 30
  const x = (index: number) => padding.left + index * ((width - padding.left - padding.right) / Math.max(1, players.length)) + 4
  const scale = (value: number) => value / maxValue * plotHeight
  return <article className="card analytics-chart points-dna-card"><div className="analytics-chart-head"><div><span className="eyebrow">Punkteverteilung</span><h3>Punkte-DNA</h3></div><div className="chart-legend"><span><i className="legend-swatch serve" />Aufschlag</span><span><i className="legend-swatch attack" />Angriff</span><span><i className="legend-swatch block" />Block</span></div></div>{players.length ? <svg className="points-dna-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Punkte-DNA je Spieler">{[0, 0.5, 1].map((factor) => <g key={factor}><line x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight - plotHeight * factor} y2={padding.top + plotHeight - plotHeight * factor} className="chart-grid" /><text x={padding.left - 8} y={padding.top + plotHeight - plotHeight * factor + 4} textAnchor="end" className="chart-tick">{formatNumber(maxValue * factor)}</text></g>)}{players.map((player, index) => { const values = [{ value: player.servePoints, className: 'serve' }, { value: player.attackPoints, className: 'attack' }, { value: player.blockPoints, className: 'block' }]; let offset = 0; return <g key={player.name}>{values.map((segment) => { const segmentHeight = scale(segment.value); const yPosition = padding.top + plotHeight - offset - segmentHeight; offset += segmentHeight; return <rect key={segment.className} x={x(index)} y={yPosition} width={barWidth} height={segmentHeight} className={`dna-segment ${segment.className}`}><title>{`${player.name}: ${formatNumber(segment.value)} ${segment.className === 'serve' ? 'Aufschlagpunkte' : segment.className === 'attack' ? 'Angriffspunkte' : 'Blockpunkte'}`}</title></rect> })}<text x={x(index) + barWidth / 2} y={height - 22} textAnchor="end" transform={`rotate(-35 ${x(index) + barWidth / 2} ${height - 22})`} className="chart-tick">{player.name}</text></g>})}</svg> : <EmptyState />}</article>
}

function AnalyticsSection({ players, matches }: { players: PlayerAggregate[]; matches: MatchRecord[] }) {
  const receivePoints = players.filter((player) => player.receiveAttempts > 0).map((player) => ({ name: player.name, x: player.receiveAttempts, y: player.receiveEfficiency }))
  const attackPoints = players.filter((player) => player.attacks > 0).map((player) => ({ name: player.name, x: player.attacks, y: player.attackEfficiency }))
  const riskPoints = players.filter((player) => player.points > 0).map((player) => ({ name: player.name, x: player.errors, y: player.points }))
  return <section className="analytics-section"><div className="section-heading"><div><span className="eyebrow">Spieler-Analytics</span><h2>Muster hinter den Kennzahlen</h2></div></div><div className="analytics-grid"><ScatterChart title="Annahme-Matrix" description="Volumen und Qualität der ersten Ballkontakte." xLabel="Annahmen" yLabel="Qualität" points={receivePoints} /><ScatterChart title="Angreifer-Profil" description="Wie viel Angriffsdruck aus den Versuchen entsteht." xLabel="Angriffe" yLabel="Effizienz" color="#ff735b" points={attackPoints} /><ScatterChart title="Risiko vs. Punkte" description="Eigene Fehler im Verhältnis zum Punktbeitrag." xLabel="Fehler" yLabel="Punkte" color="#a78bfa" points={riskPoints} yFormat="number" /><SeasonBalanceChart matches={matches} /><PointsDnaChart players={players} /></div></section>
}

function SeasonMenu({ value, onChange }: { value: SeasonId; onChange: (value: SeasonId) => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = seasonConfigs.find((config) => config.id === value) ?? seasonConfigs[2]
  useEffect(() => { const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])
  return <div className="season-menu" ref={menuRef}><button className="season-menu-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{selected.label}</span><ChevronDown size={15} /></button>{open && <div className="season-menu-popover" role="listbox" aria-label="Saison auswählen">{seasonConfigs.map((config) => <button key={config.id} role="option" aria-selected={config.id === value} className={`season-menu-option ${config.id === value ? 'selected' : ''}`} onClick={() => { onChange(config.id); setOpen(false) }}><span>{config.label}</span><small>{config.sheetName}</small>{config.id === value && <span className="season-check">●</span>}</button>)}</div>}</div>
}

function KpiCard({ icon, label, value, detail, tone = 'coral' }: { icon: ReactNode; label: string; value: string; detail: string; tone?: string }) {
  return <article className={`kpi-card ${tone}`}><div className="kpi-topline"><span className="kpi-icon">{icon}</span><span className="kpi-label">{label}</span></div><div className="kpi-value">{value}</div><div className="kpi-detail">{detail}</div></article>
}

function App() {
  const [dataset, setDataset] = useState<SeasonDataset>({ seasons: { '24/25': [], '25/26': [], '26/27': fallbackMatches }, sourceBySeason: { '24/25': 'unavailable', '25/26': 'unavailable', '26/27': 'fallback' } })
  const [seasonId, setSeasonId] = useState<SeasonId>('26/27')
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState<PositionFilter>('Alle')
  const [metric, setMetric] = useState<MetricKey>('points')
  const [selectedPlayer, setSelectedPlayer] = useState('William')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [range, setRange] = useState<'Alle Spiele' | 'Letzte 5'>('Alle Spiele')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => typeof window !== 'undefined' && window.localStorage.getItem('atv-dashboard-theme') === 'dark' ? 'dark' : 'light')
  const [settings, setSettings] = useState<DashboardSettings>({ defaultMetric: 'points', trendMetric: 'attackEfficiency', competition: 'Alle', statsMode: 'Mit Statistik', minimumAttempts: 0, showTrendDelta: true, showSourceHint: true, showWebsiteOnly: true, radarAxes: defaultRadarAxes.map((axis) => ({ ...axis })) })

  const refresh = () => { setLoading(true); void loadSeasonDataset().then((loadedDataset) => { setDataset(loadedDataset); setLoading(false) }) }
  useEffect(() => { refresh() }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem('atv-dashboard-theme', theme) }, [theme])

  const matches = useMemo(() => dataset.seasons[seasonId] ?? [], [dataset.seasons, seasonId])
  const dataSource = dataset.sourceBySeason[seasonId]
  const activeSeason = seasonConfigs.find((config) => config.id === seasonId) ?? seasonConfigs[2]
  const filteredMatches = useMemo(() => matches.filter((match) => (settings.competition === 'Alle' || match.competition === settings.competition) && (settings.showWebsiteOnly || match.catalogSource !== 'website')), [matches, settings.competition, settings.showWebsiteOnly])
  const visibleMatches = useMemo(() => range === 'Letzte 5' ? filteredMatches.slice(-5) : filteredMatches, [filteredMatches, range])
  const scopedMatches = useMemo(() => visibleMatches.map((match) => ({ ...match, players: position === 'Alle' ? match.players : match.players.filter((player) => player.role === position) })), [position, visibleMatches])
  const summary = useMemo(() => aggregateStats(scopedMatches), [scopedMatches])
  const allSummary = useMemo(() => aggregateStats(visibleMatches), [visibleMatches])
  const builderSummary = useMemo(() => aggregateStats(filteredMatches), [filteredMatches])
  const lastUsedMatch = useMemo(() => [...filteredMatches].reverse().find((match) => match.result !== 'scheduled' && match.players.length > 0), [filteredMatches])
  const lastUsedLineup = useMemo(() => lastUsedMatch ? aggregateStats([lastUsedMatch]).players : builderSummary.players, [builderSummary.players, lastUsedMatch])
  const selected = summary.players.find((player) => player.name === selectedPlayer) ?? summary.players[0]
  const leaders = useMemo(() => [...summary.players].filter((player) => hasRelevantMetric(player, metric) && getPlayerAttempts(player, metric) >= settings.minimumAttempts).sort((left, right) => getPlayerMetric(right, metric) - getPlayerMetric(left, metric)).slice(0, 6), [metric, settings.minimumAttempts, summary.players])
  const teamRadar = settings.radarAxes.map((axis) => getRadarValue(summary, axis.key))
  const selectedRadar = selected ? settings.radarAxes.map((axis) => getRadarValue(selected, axis.key)) : teamRadar
  const trendValues = visibleMatches.map((match) => getMatchMetric(match, position, settings.trendMetric)).filter((value): value is number => value !== null)
  const trendAverage = trendValues.length ? trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length : 0
  const trendDelta = trendValues.length > 1 ? trendValues[trendValues.length - 1] - trendValues[0] : 0
  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  const careerMatches = Object.values(dataset.seasons).flat()
  const navItems = [{ id: 'dashboard', label: 'Übersicht', icon: LayoutDashboard }, { id: 'players', label: 'Spieler', icon: Users }, { id: 'matches', label: 'Spiele', icon: Volleyball }, { id: 'builder', label: 'Teambuilder', icon: ClipboardList }]

  useEffect(() => { if (summary.players.length > 0 && !summary.players.some((player) => player.name === selectedPlayer)) setSelectedPlayer(summary.players[0].name) }, [selectedPlayer, summary.players])
  const setSeason = (value: SeasonId) => { setSeasonId(value); setRange('Alle Spiele'); setPosition('Alle'); setSelectedMatchId(null); setActiveSection('dashboard') }
  const navigate = (section: string) => { setSelectedMatchId(null); setActiveSection(section) }
  const openMatch = (matchId: string) => { setSelectedMatchId(matchId); setActiveSection('matches') }
  const openPlayer = (name: string) => { setSelectedPlayer(name); setActiveSection('player-detail') }
  const updateSetting = <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => { setSettings((current) => ({ ...current, [key]: value })); if (key === 'defaultMetric') setMetric(value as MetricKey) }
  const sectionLabel = activeSection === 'dashboard' ? 'Übersicht' : activeSection === 'player-detail' ? 'Spielerprofil' : navItems.find((item) => item.id === activeSection)?.label ?? 'Übersicht'
  const sourceText = loading ? 'Synchronisiere …' : sourceLabel(dataSource)

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><Volleyball size={20} strokeWidth={2.2} /></div><div><strong>ATV I</strong><span>Match intelligence</span></div></div><div className="season-switcher"><span className="eyebrow">Saison</span><SeasonMenu value={seasonId} onChange={setSeason} /></div><nav className="main-nav" aria-label="Hauptnavigation"><span className="nav-caption">Workspace</span>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeSection === id || (id === 'players' && activeSection === 'player-detail') ? 'active' : ''} onClick={() => navigate(id)}><Icon size={17} /><span>{label}</span>{id === 'players' && <span className="nav-count">{allSummary.players.length}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><CircleHelp size={16} /><span>Neue Spielwerte einfach in das Sheet eintragen.</span></div></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>ATV I</span><span>/</span><strong>{sectionLabel}</strong></div><div className="top-actions"><ThemeToggle theme={theme} onChange={setTheme} />{settings.showSourceHint && <span className={`data-status ${dataSource}`}><span className="status-dot" />{sourceText}</span>}<button className="icon-button" onClick={refresh} title="Daten aktualisieren" aria-label="Daten aktualisieren"><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div></header><div className="page-content">
      <section className="welcome-row"><div><div className="eyebrow coral-text"><span className="eyebrow-line" />Saison-Review</div><h1>Dein Spiel, klarer gelesen.</h1><p className="intro">Offizielle Spielstruktur, ergänzt mit unseren detaillierten Sheet-Werten.</p></div></section>
      {(activeSection === 'dashboard' || activeSection === 'players') && <section className="filter-bar"><div className="filter-group"><span className="filter-label"><Filter size={14} /> Ansicht</span><div className="segmented-control">{positionFilters.map((item) => <button key={item} className={position === item ? 'active' : ''} onClick={() => setPosition(item)}>{item}</button>)}</div></div><div className="filter-group range-filter"><span className="filter-label"><Activity size={14} /> Zeitraum</span><div className="segmented-control">{(['Alle Spiele', 'Letzte 5'] as const).map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></div><div className="filter-spacer" /><button className="customize-button" onClick={() => setSettingsOpen(true)}><Gauge size={15} /> Statistik konfigurieren</button></section>}
      {activeSection === 'dashboard' && matches.length === 0 && <SeasonEmptyState seasonLabel={activeSeason.label} source={dataSource} />}
      {activeSection === 'dashboard' && matches.length > 0 && <><section className="kpi-grid"><KpiCard icon={<Trophy size={17} />} label="Spiele gewonnen" value={`${summary.wins} / ${summary.matches}`} detail={`${summary.totalMatches} Katalogspiele · ${summary.scheduled} ausstehend`} tone="coral" /><KpiCard icon={<BarChart3 size={17} />} label="Satzbilanz" value={`${summary.setsWon} : ${summary.setsLost}`} detail={`${summary.pointDiff >= 0 ? '+' : ''}${summary.pointDiff} Sätze Differenz`} tone="purple" /><KpiCard icon={<ShieldCheck size={17} />} label="Angriffseffizienz" value={formatPercent(summary.attackEfficiency)} detail={`${summary.statsMatches} Spiele mit Sheet-Werten`} tone="mint" /><KpiCard icon={<Volleyball size={17} />} label="Team-Punkte" value={formatNumber(summary.teamPoints)} detail="nur erfasste Spielerwerte" tone="gold" /></section><section className="content-grid primary-grid"><article className="card trend-card"><div className="card-header"><div><span className="eyebrow">Zeitlicher Verlauf</span><h2>{metricLabel(settings.trendMetric)} im Verlauf</h2></div><div className="card-tools"><span className="legend-dot" /> {settings.statsMode} <button className="small-select">{range}<ChevronDown size={14} /></button></div></div><div className="trend-summary"><strong>{formatMetric(trendAverage, settings.trendMetric)}</strong>{settings.showTrendDelta && <><span className={trendDelta >= 0 ? 'positive-change' : 'negative-change'}>{trendDelta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {formatMetric(Math.abs(trendDelta), settings.trendMetric)}</span><small>letztes vs. erstes Statistikspiel</small></>}</div><TrendChart matches={visibleMatches} position={position} metric={settings.trendMetric} statsOnly={settings.statsMode === 'Mit Statistik'} /></article><article className="card radar-card"><div className="card-header"><div><span className="eyebrow">Teamprofil</span><h2>Unser Spiel in sechs Dimensionen</h2></div><RadarConfigurator axes={settings.radarAxes} onChange={(axes) => { activeRadarAxes = axes; setSettings((current) => ({ ...current, radarAxes: axes })) }} /></div><div className="radar-content"><RadarChart values={teamRadar} color="#ff735b" /><div className="radar-side-stats"><RadarStat label="Serve-Receive" value={getRadarValue(summary, 'serveReceive')} /><RadarStat label="Angriffsdruck" value={getRadarValue(summary, 'attackImpact')} /><RadarStat label="Transition" value={getRadarValue(summary, 'transition')} /><RadarStat label="Netzpräsenz" value={getRadarValue(summary, 'netPresence')} /></div></div></article></section><section className="content-grid secondary-grid"><article className="card ranking-card"><div className="card-header"><div><span className="eyebrow">Rangliste</span><h2>Wer macht den Unterschied?</h2></div><MetricSelect value={metric} onChange={setMetric} ariaLabel="Ranglistenstatistik" /></div><div className="ranking-list">{leaders.map((player, index) => { const value = getPlayerMetric(player, metric); const max = Math.max(...leaders.map((item) => getPlayerMetric(item, metric)), 1); return <button key={player.name} className={`ranking-row ${selected?.name === player.name ? 'selected' : ''}`} onClick={() => openPlayer(player.name)}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><span className="mini-avatar" style={{ background: playerColors[index % playerColors.length] }}>{initials(player.name)}</span><span className="rank-player"><strong>{player.name}</strong><small>{positionCode(player.position)} · {player.matches} Spiele</small></span><span className="rank-bar"><span style={{ width: `${value / max * 100}%`, background: playerColors[index % playerColors.length] }} /></span><span className="rank-value">{formatMetric(value, metric)}</span></button> })}</div>{leaders.length === 0 && <EmptyState />}</article><article className="card player-focus-card"><div className="card-header"><div><span className="eyebrow">Spielerprofil</span><h2>{selected?.name ?? '—'}</h2></div><button className="text-button" onClick={() => selected && openPlayer(selected.name)}>Details <ArrowUpRight size={14} /></button></div>{selected ? <><div className="player-focus-top"><div className="focus-avatar" style={{ background: playerColors[summary.players.indexOf(selected) % playerColors.length] }}>{initials(selected.name)}</div><div><div className="focus-meta"><span>{positionCode(selected.position)}</span><span>#{selected.number}</span></div><p>{selected.matches} Einsätze · {selected.sets} Sätze</p></div><div className="focus-score"><strong>{formatNumber(selected.points)}</strong><small>Punkte</small></div></div><div className="focus-body"><RadarChart values={selectedRadar} color="#a78bfa" compact /><div className="focus-stats"><FocusStat label="Angriff" value={selected.attackEfficiency} /><FocusStat label="Annahme" value={selected.receiveEfficiency} /><FocusStat label="Aufschlag" value={selected.serveAttempts ? selected.servePoints / selected.serveAttempts * 100 : 0} /><FocusStat label="Fehler" value={selected.errors} isPercent={false} /></div></div></> : <EmptyState />}</article></section><section className="content-grid bottom-grid"><article className="card match-card"><div className="card-header"><div><span className="eyebrow">Matchday</span><h2>Die letzten Spiele</h2></div><button className="text-button" onClick={() => navigate('matches')}>Alle Spiele <ArrowUpRight size={14} /></button></div><div className="match-list">{visibleMatches.slice().reverse().slice(0, 4).map((match) => <MatchRow key={match.id} match={match} onOpen={openMatch} />)}</div></article><CourtRoster players={lastUsedLineup} match={lastUsedMatch} onOpen={openPlayer} /></section></>}
       {activeSection === 'dashboard' && matches.length > 0 && <AnalyticsSection players={summary.players} matches={visibleMatches} />}
       {activeSection === 'players' && <PlayersView players={summary.players} metric={metric} setMetric={setMetric} selectedPlayer={selectedPlayer} onOpen={openPlayer} minimumAttempts={settings.minimumAttempts} />}
      {activeSection === 'builder' && <TeamBuilder matches={filteredMatches} players={builderSummary.players} />}
      {activeSection === 'player-detail' && <PlayerBreakdown playerName={selectedPlayer} seasonId={seasonId} seasonMatches={matches} careerMatches={careerMatches} onBack={() => navigate('players')} onOpenMatch={openMatch} />}
      {activeSection === 'matches' && selectedMatch && <MatchBreakdown match={selectedMatch} onBack={() => setSelectedMatchId(null)} onOpenPlayer={openPlayer} />}
      {activeSection === 'matches' && !selectedMatch && <MatchesView matches={visibleMatches} onOpen={openMatch} />}
      <footer className="page-footer"><span>ATV I · Saison {activeSeason.label.replace(' ', '')}</span></footer>
    </div></main>
    {settingsOpen && <SettingsDrawer settings={settings} onChange={updateSetting} onClose={() => setSettingsOpen(false)} />}
  </div>
}

function MetricSelect({ value, onChange, ariaLabel, large = false, includePoints = true }: { value: MetricKey; onChange: (value: MetricKey) => void; ariaLabel: string; large?: boolean; includePoints?: boolean }) {
  const options = metricOptions.filter((option) => includePoints || option.key !== 'points')
  const selectedValue = includePoints || value !== 'points' ? value : options[0]?.key ?? 'attackEfficiency'
  return <div className={`metric-select-wrap ${large ? 'large' : ''}`}><select value={selectedValue} onChange={(event) => onChange(event.target.value as MetricKey)} aria-label={ariaLabel}>{options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><ChevronDown size={14} /></div>
}

function RadarStat({ label, value }: { label: string; value: number }) {
  return <div className="radar-stat"><span>{label}</span><strong>{formatPercent(value)}</strong><div className="stat-bar"><span style={{ width: `${Math.min(100, value)}%` }} /></div></div>
}

function FocusStat({ label, value, isPercent = true }: { label: string; value: number; isPercent?: boolean }) {
  return <div className="focus-stat"><span>{label}</span><strong>{isPercent ? formatPercent(value) : formatNumber(value)}</strong></div>
}

function matchInfo(match: MatchRecord) {
  return [match.date, match.competition === 'Pokal' ? match.round ?? 'Pokalrunde' : match.matchday ? `${match.matchday}. Spieltag` : undefined, match.teamFirst ? 'Heimspiel' : 'Auswärts'].filter(Boolean).join(' · ')
}

function MatchRow({ match, onOpen }: { match: MatchRecord; onOpen: (matchId: string) => void }) {
  return <button className="match-row" onClick={() => onOpen(match.id)}><span className={`result-badge ${match.result}`}>{resultLabel(match.result)}</span><span className="match-opponent"><strong>{match.opponent}</strong><small>{matchInfo(match) || match.label}</small></span><span className="match-score"><strong>{match.score.team}</strong><small>:</small><span>{match.score.opponent}</span></span><ArrowUpRight size={15} className="match-arrow" /></button>
}

function CourtRoster({ players, match, onOpen }: { players: PlayerAggregate[]; match?: MatchRecord; onOpen: (name: string) => void }) {
  return <article className="card court-roster-card"><div className="card-header"><div><span className="eyebrow">Letzte Aufstellung</span><h2>{match ? `gegen ${match.opponent}` : 'Unser Team'}</h2></div><span className="roster-count">{match ? match.label : `${players.length} Spieler`}</span></div><div className="team-court"><span className="team-court-net" /><div className="team-court-label">{match ? `ATV I · ${match.label}` : 'ATV I'}</div><div className="court-player-grid">{players.map((player, index) => <button key={player.name} className="court-player" onClick={() => onOpen(player.name)}><span className="avatar-circle" style={{ background: playerColors[index % playerColors.length] }}>{initials(player.name)}</span><strong>{player.name}</strong><small>{positionCode(player.position)}</small></button>)}</div></div></article>
}

type BuilderLineups = Record<string, string[][]>

function TeamBuilder({ matches, players }: { matches: MatchRecord[]; players: PlayerAggregate[] }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? '')
  const [selectedPlayerName, setSelectedPlayerName] = useState('')
  const storageKey = `atv-builder-lineups-${matches[0]?.season ?? 'default'}`
  const [lineups, setLineups] = useState<BuilderLineups>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) as BuilderLineups : {}
    } catch {
      return {}
    }
  })

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(lineups)) }, [lineups, storageKey])

  useEffect(() => {
    if (matches.length && !matches.some((match) => match.id === selectedMatchId)) setSelectedMatchId(matches[0].id)
  }, [matches, selectedMatchId])

  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  if (!selectedMatch) return <section className="full-view builder-view"><div className="card empty-state">Für diese Saison gibt es noch kein Spiel im Katalog.</div></section>

  const setCount = selectedMatch.result === 'scheduled' ? 5 : Math.max(1, selectedMatch.score.team + selectedMatch.score.opponent)
  const currentLineup = lineups[selectedMatch.id] ?? createInitialLineup(selectedMatch, setCount)
  const updateSlot = (setIndex: number, slotIndex: number, playerName: string) => {
    setLineups((current) => {
      const nextLineup = assignLineupPlayer(current[selectedMatch.id] ?? createInitialLineup(selectedMatch, setCount), setIndex, slotIndex, playerName)
      return { ...current, [selectedMatch.id]: nextLineup }
    })
  }
  const clearSlot = (setIndex: number, slotIndex: number) => updateSlot(setIndex, slotIndex, '')
  const resetLineup = () => setLineups((current) => { const next = { ...current }; delete next[selectedMatch.id]; return next })
  const startDrag = (event: DragEvent, playerName: string) => event.dataTransfer.setData('text/plain', playerName)
  const statusText = selectedMatch.result === 'scheduled' ? 'Planung für ein kommendes Spiel' : selectedMatch.players.length ? 'Sheet-Kader vorgeschlagen · frei anpassbar' : 'Gespielt, aber noch ohne Sheet-Kader'

  return <section className="full-view builder-view"><div className="view-heading"><div><span className="eyebrow">Teambuilder</span><h1>Aufstellung pro Satz planen.</h1><p>Ziehe einen Spieler auf eine Position oder wähle ihn aus und klicke danach auf einen Slot. Bei vergangenen Spielen dient der Sheet-Kader als Vorschlag.</p></div><button className="text-button builder-reset" onClick={resetLineup}><RotateCcw size={14} /> Aufstellung zurücksetzen</button></div><div className="builder-toolbar card"><label><span className="eyebrow">Spiel auswählen</span><select aria-label="Spiel für Teambuilder auswählen" value={selectedMatch.id} onChange={(event) => { setSelectedMatchId(event.target.value); setSelectedPlayerName('') }}>{matches.map((match) => <option key={match.id} value={match.id}>{match.label} · ATV I vs. {match.opponent} · {match.competition}{match.round ? ` · ${match.round}` : ''}</option>)}</select></label><div className="builder-match-meta"><strong>{resultLabel(selectedMatch.result)} · {selectedMatch.score.team}:{selectedMatch.score.opponent}</strong><span>{matchInfo(selectedMatch) || selectedMatch.label}</span><small>{statusText}</small></div></div><div className="builder-layout"><div className="builder-sets">{currentLineup.map((set, setIndex) => <article className="card builder-set-card" key={setIndex}><div className="card-header"><div><span className="eyebrow">Satz {setIndex + 1}</span><h2>{selectedMatch.result === 'scheduled' ? 'Geplante Rotation' : 'Aufstellung'}</h2></div><span className="card-note">{set.filter(Boolean).length}/6 besetzt</span></div><div className="builder-slot-grid">{builderSlotLabels.map((slotLabel, slotIndex) => { const playerName = set[slotIndex]; const player = players.find((item) => item.name === playerName); return <button key={slotLabel} className={`builder-slot ${playerName ? 'filled' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const droppedName = event.dataTransfer.getData('text/plain'); if (droppedName) updateSlot(setIndex, slotIndex, droppedName) }} onClick={() => { if (selectedPlayerName) { updateSlot(setIndex, slotIndex, selectedPlayerName); setSelectedPlayerName('') } else if (playerName) clearSlot(setIndex, slotIndex) }} title={playerName ? `${playerName} entfernen` : `Position ${slotLabel} besetzen`}><span className="builder-slot-label">Pos. {slotLabel}</span>{player ? <span className="builder-slot-player" draggable onDragStart={(event) => startDrag(event, player.name)}><span className="avatar-circle" style={{ background: playerColors[players.indexOf(player) % playerColors.length] }}>{initials(player.name)}</span><strong>{player.name}</strong><small>#{player.number} · {positionCode(player.position)}</small></span> : <span className="builder-slot-empty"><GripVertical size={16} /> {selectedPlayerName ? 'Auswahl hier einsetzen' : 'Spieler hier ablegen'}</span>}</button> })}</div></article>)}</div><aside className="card builder-player-pool"><div className="card-header"><div><span className="eyebrow">Kader</span><h2>Spieler wählen</h2></div><span className="card-note">{players.length}</span></div><p className="builder-pool-note">Spieler anklicken und danach einen Slot wählen – oder direkt ziehen. Einen belegten Slot ohne Auswahl anklicken, um ihn zu leeren.</p><div className="builder-player-pool-list">{players.map((player, index) => <button type="button" className={`builder-player-chip ${selectedPlayerName === player.name ? 'selected' : ''}`} key={player.name} draggable onDragStart={(event) => startDrag(event, player.name)} onClick={() => setSelectedPlayerName((current) => current === player.name ? '' : player.name)} aria-pressed={selectedPlayerName === player.name}><span className="avatar-circle" style={{ background: playerColors[index % playerColors.length] }}>{initials(player.name)}</span><span><strong>{player.name}</strong><small>#{player.number} · {positionCode(player.position)}</small></span><GripVertical size={15} /></button>)}</div></aside></div></section>
}

function PlayersView({ players, metric, setMetric, selectedPlayer, onOpen, minimumAttempts }: { players: PlayerAggregate[]; metric: MetricKey; setMetric: (metric: MetricKey) => void; selectedPlayer: string; onOpen: (name: string) => void; minimumAttempts: number }) {
  const tableMetric = metric === 'points' ? 'attackEfficiency' : metric
  const visiblePlayers = players.filter((player) => hasRelevantMetric(player, tableMetric) && getPlayerAttempts(player, tableMetric) >= minimumAttempts)
  return <section className="full-view"><div className="view-heading"><div><span className="eyebrow">Spieler</span><h1>Die Profile hinter dem Spiel.</h1><p>Ranglisten und Detailwerte über alle Einsätze hinweg. Klicke einen Spieler für Saison- und Karrierewerte an.</p></div><MetricSelect value={tableMetric} onChange={setMetric} ariaLabel="Spielerstatistik" large includePoints={false} /></div><div className="player-table card"><div className="table-head"><span>Spieler</span><span>Nr.</span><span>Rolle</span><span>Spiele</span><span>Punkte</span><span>{metricLabel(tableMetric)}</span></div>{visiblePlayers.map((player, index) => <button key={player.name} className={`table-row ${selectedPlayer === player.name ? 'selected' : ''}`} onClick={() => onOpen(player.name)}><span className="table-player"><span className="mini-avatar" style={{ background: playerColors[index % playerColors.length] }}>{initials(player.name)}</span><strong>{player.name}</strong></span><span>{player.number}</span><span>{positionCode(player.position)}</span><span>{player.matches}</span><span className="table-points">{formatNumber(player.points)}</span><span className="table-highlight">{formatMetric(getPlayerMetric(player, tableMetric), tableMetric)}</span></button>)}</div>{visiblePlayers.length === 0 && <div className="empty-state">Kein Spieler erfüllt den Mindestwert.</div>}</section>
}

function MatchesView({ matches, onOpen }: { matches: MatchRecord[]; onOpen: (matchId: string) => void }) {
  const [query, setQuery] = useState('')
  const filtered = matches.filter((match) => match.opponent.toLowerCase().includes(query.toLowerCase()))
  const wins = matches.filter((match) => match.result === 'win').length
  const losses = matches.filter((match) => match.result === 'loss').length
  const draws = matches.filter((match) => match.result === 'draw').length
  const scheduled = matches.filter((match) => match.result === 'scheduled').length
  return <section className="full-view"><div className="view-heading"><div><span className="eyebrow">Spiele</span><h1>Jedes Match erzählt etwas.</h1><p>{wins} Siege, {losses} Niederlagen{draws ? `, ${draws} Unentschieden` : ''} · {matches.length} Katalogspiele{scheduled ? ` · ${scheduled} ausstehend` : ''}</p></div><label className="match-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gegner suchen" aria-label="Gegner suchen" /></label></div><div className="matches-grid">{filtered.map((match) => <button className="card match-detail" key={match.id} onClick={() => onOpen(match.id)}><div className="match-detail-top"><span className={`result-badge ${match.result}`}>{resultLabel(match.result)}</span><span>{matchInfo(match) || match.competition}</span></div><h3>ATV I <span>vs.</span> {match.opponent}</h3><div className="detail-score"><strong>{match.score.team}</strong><span>:</span><strong>{match.score.opponent}</strong></div><div className="detail-footer"><span>{match.players.length ? `${match.players.length} Spielerwerte` : 'Keine Sheet-Werte'} · {match.competition}</span><ArrowUpRight size={15} /></div></button>)}</div>{filtered.length === 0 && <div className="empty-state">Kein Gegner passt zu deiner Suche.</div>}</section>
}

function MatchBreakdown({ match, onBack, onOpenPlayer }: { match: MatchRecord; onBack: () => void; onOpenPlayer: (name: string) => void }) {
  const summary = aggregateStats(match.players.length ? [match] : [])
  const players = [...match.players].sort((left, right) => right.points - left.points)
  const cell = (main: string, sub?: string) => <span className="sheet-cell"><strong>{main}</strong>{sub && <small>{sub}</small>}</span>
  const resultClass = 'result-badge ' + match.result
  const roundLabel = match.round ? ' · ' + match.round : ''
  const metaLabel = [match.date, match.matchday ? String(match.matchday) + '. Spieltag' : undefined, match.teamFirst ? 'Heimspiel' : 'Auswärtsspiel'].filter(Boolean).join(' · ') || 'Spielkatalog'
  const catalogClass = 'catalog-chip ' + (match.catalogSource ?? 'sheet')

  return (
    <section className="detail-view match-breakdown-page">
      <button className="back-button" onClick={onBack}><ChevronLeft size={16} /> Zurück zu Spielen</button>
      <div className="detail-hero card">
        <div className="detail-hero-head">
          <div><span className={resultClass}>{resultLabel(match.result)}</span><span className="detail-kicker"> {match.competition + roundLabel}</span></div>
          {match.sourceUrl && <a className="source-link" href={match.sourceUrl} target="_blank" rel="noreferrer">Offizielle Quelle <ArrowUpRight size={14} /></a>}
        </div>
        <h1>ATV I <span>vs.</span> {match.opponent}</h1>
        <div className="detail-score-large"><strong>{match.score.team}</strong><span>:</span><strong>{match.score.opponent}</strong></div>
        <div className="detail-meta">{metaLabel}<span className={catalogClass}>{match.players.length ? 'Website + Sheet' : 'Nur Website'}</span></div>
      </div>
      <div className="detail-kpi-grid">
        <KpiCard icon={<Database size={17} />} label="Spielstatus" value={resultLabel(match.result)} detail={match.result === 'scheduled' ? 'noch ohne Ergebnis' : match.scoreSource === 'website' ? 'Ergebnis der Website' : match.scoreSource === 'sheet' ? 'Ergebnis aus dem Sheet' : 'Ergebnis vorhanden'} tone="coral" />
        <KpiCard icon={<BarChart3 size={17} />} label="Sheet-Abdeckung" value={match.players.length ? String(match.players.length) : '0'} detail="Spieler mit Detailwerten" tone="purple" />
        <KpiCard icon={<ShieldCheck size={17} />} label="Gegnerfehler" value={formatNumber(summary.opponentErrors)} detail="ATK Err + Srv Err" tone="mint" />
        <KpiCard icon={<Trophy size={17} />} label="Team-Punkte" value={formatNumber(summary.teamPoints)} detail="erfasste Spielerwerte" tone="gold" />
      </div>
      <article className="card sheet-breakdown-card">
        <div className="card-header"><div><span className="eyebrow">Sheet-Breakdown</span><h2>Alle Werte aus dem Match</h2></div><span className="card-note">{players.length ? 'Gruppierte Statistik wie im Team-Sheet' : 'Keine Daten im Sheet'}</span></div>
        {players.length ? (
          <div className="sheet-table-wrap">
            <table className="sheet-stats-table">
              <colgroup><col className="sheet-player-col" /><col className="sheet-position-col" />{Array.from({ length: 27 }, (_, index) => <col key={index} />)}</colgroup>
              <thead>
                <tr><th rowSpan={2}>Spieler</th><th rowSpan={2}>Pos.</th><th colSpan={2}>Punkte</th><th colSpan={3}>Aufschlag</th><th colSpan={4}>Annahme</th><th colSpan={3}>Abwehr</th><th colSpan={4}>Zuspiel</th><th colSpan={5}>Angriff</th><th colSpan={4}>Block</th><th colSpan={2}>Gegnerfehler</th></tr>
                <tr><th>Ges</th><th>G-V</th><th>Ges</th><th>Fhl</th><th>Pkt</th><th>Ges</th><th>Fhl</th><th>Pos</th><th>Eff%</th><th>Ges</th><th>Fhl</th><th>Eff%</th><th>Ges</th><th>Fhl</th><th>Pos%</th><th>Erf%</th><th>Ges</th><th>Fhl</th><th>Blo</th><th>Pkt</th><th>Eff%</th><th>Ges</th><th>Pos</th><th>Fhl</th><th>Pkt</th><th>ATK Err</th><th>Srv Err</th></tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={player.name}>
                    <td className="sheet-player-cell"><button onClick={() => onOpenPlayer(player.name)}><span className="mini-avatar" style={{ background: playerColors[index % playerColors.length] }}>{initials(player.name)}</span><span><strong>{player.name}</strong><small>#{player.number}</small></span><ArrowUpRight size={13} /></button></td>
                    <td>{player.position}</td>
                    <td>{cell(formatNumber(player.points))}</td><td>{cell(formatNumber(player.pointDiff))}</td>
                    <td>{cell(formatNumber(player.serveAttempts))}</td><td>{cell(formatNumber(player.serveErrors))}</td><td>{cell(formatNumber(player.servePoints))}</td>
                    <td>{cell(formatNumber(player.receiveAttempts))}</td><td>{cell(formatNumber(player.receiveErrors))}</td><td>{cell(formatNumber(player.receivePositive))}</td><td>{cell(formatPercent(player.receiveEfficiency))}</td>
                    <td>{cell(formatNumber(player.digAttempts))}</td><td>{cell(formatNumber(player.digErrors))}</td><td>{cell(formatPercent(player.digEfficiency))}</td>
                    <td>{cell(formatNumber(player.assists))}</td><td>{cell(formatNumber(player.assistErrors))}</td><td>{cell(formatPercent(player.assistPositiveEfficiency))}</td><td>{cell(formatPercent(player.assistSuccessEfficiency))}</td>
                    <td>{cell(formatNumber(player.attacks))}</td><td>{cell(formatNumber(player.attackErrors))}</td><td>{cell(formatNumber(player.attackBlocks))}</td><td>{cell(formatNumber(player.attackPoints))}</td><td>{cell(formatPercent(player.attackEfficiency))}</td>
                    <td>{cell(formatNumber(player.blocks))}</td><td>{cell(formatNumber(player.blockPositive))}</td><td>{cell(formatNumber(player.blockErrors))}</td><td>{cell(formatNumber(player.blockPoints))}</td>
                    <td className="opponent-error-cell">{cell(formatNumber(player.opponentAttackErrors))}</td><td className="opponent-error-cell">{cell(formatNumber(player.opponentServeErrors))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={29}><strong>Teamwerte</strong><span>{formatNumber(summary.teamPoints)} Punkte · {formatNumber(summary.opponentErrors)} Gegnerfehler insgesamt</span></td></tr></tfoot>
            </table>
          </div>
        ) : <EmptyState />}
      </article>
    </section>
  )
}

function PlayerBreakdown({ playerName, seasonId, seasonMatches, careerMatches, onBack, onOpenMatch }: { playerName: string; seasonId: SeasonId; seasonMatches: MatchRecord[]; careerMatches: MatchRecord[]; onBack: () => void; onOpenMatch: (matchId: string) => void }) {
  const [scope, setScope] = useState<'season' | 'career'>('season')
  const sourceMatches = scope === 'season' ? seasonMatches : careerMatches
  const matchRows = sourceMatches.map((match) => ({ match, player: match.players.find((item) => item.name === playerName) })).filter((row): row is { match: MatchRecord; player: NonNullable<typeof row.player> } => Boolean(row.player))
  const profile = matchRows.length ? aggregateStats(matchRows.map(({ match, player }) => ({ ...match, players: [player] }))).players[0] : undefined
  const radar = profile ? activeRadarAxes.map((axis) => getRadarValue(profile, axis.key)) : activeRadarAxes.map(() => 0)

  return <section className="detail-view player-breakdown-page">
    <button className="back-button" onClick={onBack}><ChevronLeft size={16} /> Zurück zu Spielern</button>
    <div className="profile-hero card">
      <div className="profile-identity">
        <div className="profile-avatar-large">{initials(playerName)}</div>
        <div><span className="eyebrow">Spielerprofil</span><h1>{playerName}</h1><p>{profile ? positionCode(profile.position) + ' · #' + profile.number : 'Keine Sheet-Werte in diesem Zeitraum'}</p></div>
      </div>
      <div className="profile-scope"><button className={scope === 'season' ? 'active' : ''} onClick={() => setScope('season')}>Saison {seasonId}</button><button className={scope === 'career' ? 'active' : ''} onClick={() => setScope('career')}>Karriere</button></div>
    </div>
    {profile ? <>
      <div className="detail-kpi-grid">{profileKpis(profile).map((kpi) => <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} detail={kpi.detail} tone={kpi.tone} />)}</div>
      <section className="content-grid profile-grid">
        <article className="card profile-radar-card">
          <div className="card-header"><div><span className="eyebrow">Profilradar</span><h2>{scope === 'season' ? 'Saison ' + seasonId : 'Gesamte Laufbahn'}</h2></div><span className="card-note">{matchRows.length} Spiele</span></div>
          <div className="profile-radar-content"><RadarChart values={radar} color="#a78bfa" /><div className="focus-stats"><FocusStat label="Abwehr" value={profile.digEfficiency} /><FocusStat label="Zuspielquote" value={profile.assistEfficiency} /><FocusStat label="Blockpunkte" value={profile.blockPoints} isPercent={false} /><FocusStat label="Fehler" value={profile.errors} isPercent={false} /></div></div>
        </article>
        <article className="card detail-table-card">
          <div className="card-header"><div><span className="eyebrow">Verlauf</span><h2>Match für Match</h2></div><span className="card-note">{matchRows.length} erfasst</span></div>
          <div className="profile-match-list">{matchRows.slice().reverse().map(({ match, player }) => <button className="profile-match-row" key={match.id + '-' + player.name} onClick={() => onOpenMatch(match.id)}><span><strong>{match.opponent}</strong><small>{match.season + ' · ' + (matchInfo(match) || match.label)}</small></span><span>{player.points} Pkt.</span><span>{formatPercent(player.attackEfficiency)}</span><ArrowUpRight size={14} /></button>)}</div>
          {matchRows.length < sourceMatches.length && <p className="missing-note">{sourceMatches.length - matchRows.length} Katalogspiele enthalten keinen persönlichen Sheet-Eintrag und werden deshalb nicht in die Spielerkennzahlen eingerechnet.</p>}
        </article>
      </section>
    </> : <div className="card profile-no-data"><Database size={22} /><h2>Noch keine Spielerwerte</h2><p>Für {playerName} gibt es in dieser Saison keine erfassten Sheet-Zeilen. Website-Ergebnisse bleiben im Spielkatalog sichtbar.</p></div>}
  </section>
}


function SeasonEmptyState({ seasonLabel, source }: { seasonLabel: string; source: SeasonDataset['sourceBySeason'][SeasonId] }) {
  const message = source === 'unavailable'
    ? 'Für diese Saison konnte weder der Website-Katalog noch der Sheet-Tab geladen werden.'
    : 'Für diese Saison sind im ausgewählten Katalog noch keine Spielblöcke vorhanden.'
  return <section className="season-empty card"><div className="empty-icon"><RefreshCw size={18} /></div><span className="eyebrow">Saison {seasonLabel}</span><h2>Noch keine geladenen Spiele</h2><p>{message}</p><button className="customize-button" onClick={() => window.location.reload()}><RefreshCw size={14} /> Import erneut versuchen</button></section>
}

function SettingsDrawer({ settings, onChange, onClose }: { settings: DashboardSettings; onChange: <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => void; onClose: () => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="settings-drawer" onClick={(event) => event.stopPropagation()}>
    <div className="drawer-header"><div><span className="eyebrow">Dashboard</span><h2>Einstellungen</h2></div><button className="more-button" onClick={onClose}>×</button></div>
    <p className="drawer-intro">Alle Auswahlfelder greifen sofort in Übersicht, Rangliste und zeitlichen Verlauf ein.</p>
    <div className="drawer-section"><span className="drawer-section-title">Kennzahlen</span>
      <label className="drawer-field"><span>Ranglisten-Kennzahl</span><select aria-label="Start-Kennzahl" value={settings.defaultMetric} onChange={(event) => onChange('defaultMetric', event.target.value as MetricKey)}>{metricOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <label className="drawer-field"><span>Trend-Kennzahl</span><select aria-label="Trend-Kennzahl" value={settings.trendMetric} onChange={(event) => onChange('trendMetric', event.target.value as MetricKey)}>{metricOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
    </div>
    <div className="drawer-section"><span className="drawer-section-title">Datenumfang</span>
      <label className="drawer-field"><span>Wettbewerb</span><select aria-label="Wettbewerb" value={settings.competition} onChange={(event) => onChange('competition', event.target.value as CompetitionFilter)}><option value="Alle">Liga + Pokal</option><option value="Liga">Nur Liga</option><option value="Pokal">Nur Pokal</option></select></label>
      <label className="drawer-field"><span>Trenddaten</span><select aria-label="Trenddaten" value={settings.statsMode} onChange={(event) => onChange('statsMode', event.target.value as StatsMode)}><option value="Mit Statistik">Nur Spiele mit Statistik</option><option value="Alle Spiele">Alle Katalogspiele</option></select></label>
      <label className="drawer-field"><span>Mindestversuche / Aktionen für Rangliste</span><input aria-label="Mindestversuche" type="number" min="0" max="1000" value={settings.minimumAttempts} onChange={(event) => onChange('minimumAttempts', Math.max(0, Number(event.target.value) || 0))} /><small>Blendet kleine Stichproben aus: Bei Punkte zählt der Wert als Spiele, bei Quoten als Versuche oder Aktionen.</small></label>
    </div>
    <div className="drawer-divider" />
    <label className="toggle-row"><span><strong>Website-only Spiele einblenden</strong><small>Offizielle Spiele ohne Sheet-Zeile im Katalog anzeigen</small></span><input type="checkbox" checked={settings.showWebsiteOnly} onChange={(event) => onChange('showWebsiteOnly', event.target.checked)} /><span className="toggle-switch" /></label>
    <label className="toggle-row"><span><strong>Trendvergleich zeigen</strong><small>Delta zwischen erstem und letztem Statistikspiel</small></span><input type="checkbox" checked={settings.showTrendDelta} onChange={(event) => onChange('showTrendDelta', event.target.checked)} /><span className="toggle-switch" /></label>
    <label className="toggle-row"><span><strong>Importquelle anzeigen</strong><small>Website-, Sheet- und Teilimportstatus im Header</small></span><input type="checkbox" checked={settings.showSourceHint} onChange={(event) => onChange('showSourceHint', event.target.checked)} /><span className="toggle-switch" /></label>
    <div className="drawer-source"><span className="online-dot" />Website-first · {settings.showWebsiteOnly ? 'Katalog vollständig' : 'Website-only ausgeblendet'}</div>
    <button className="drawer-done" onClick={onClose}>Fertig</button>
  </aside></div>
}

function EmptyState() {
  return <div className="empty-state">Noch keine Werte für diesen Filter.</div>
}

function RadarConfigurator({ axes, onChange }: { axes: RadarAxisConfig[]; onChange: (axes: RadarAxisConfig[]) => void }) {
  const [open, setOpen] = useState(false)
  const updateAxis = (index: number, patch: Partial<RadarAxisConfig>) => {
    const nextAxes = axes.map((axis, axisIndex) => axisIndex === index ? { ...axis, ...patch } : axis)
    onChange(nextAxes)
  }
  return <div className="radar-config"><button className="radar-config-trigger" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="radar-config-panel"><Settings2 size={15} /> Radar einstellen</button>{open && <div className="radar-config-panel" id="radar-config-panel"><div className="radar-config-header"><div><span className="eyebrow">Spinnendiagramm</span><strong>Achsen sinnvoll benennen</strong></div><button className="radar-config-close" onClick={() => setOpen(false)} aria-label="Radar-Einstellungen schließen">×</button></div><p>Wähle pro Achse die Berechnung aus. Zuspiel misst nur die Erfolgsquote von Zuspielern.</p>{axes.map((axis, index) => <div className="radar-axis-setting" key={index}><span>{index + 1}</span><input aria-label={`Radar-Achse-${index + 1}-Label`} value={axis.label} onChange={(event) => updateAxis(index, { label: event.target.value })} /><select aria-label={`Radar-Achse-${index + 1}-Metrik`} value={axis.key} onChange={(event) => updateAxis(index, { key: event.target.value as RadarAxisKey })}>{radarMetricOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div>)}</div>}</div>
}

function ThemeToggle({ theme, onChange }: { theme: 'light' | 'dark'; onChange: (theme: 'light' | 'dark') => void }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return <button className="theme-toggle" onClick={() => onChange(nextTheme)} aria-label={theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'} title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === 'dark' ? 'Hell' : 'Dunkel'}</span></button>
}

export default App
