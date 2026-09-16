export type Score = {
  team: number
  opponent: number
}

export type MatchResult = 'win' | 'loss' | 'draw' | 'scheduled'
export type SeasonId = '24/25' | '25/26' | '26/27'
export type Competition = 'Liga' | 'Pokal'

export type PlayerMatchStats = {
  number: number
  name: string
  position: string
  role: string
  sets: number
  points: number
  pointDiff: number
  serveAttempts: number
  serveErrors: number
  servePoints: number
  receiveAttempts: number
  receiveErrors: number
  receivePositive: number
  receiveEfficiency: number
  digAttempts: number
  digErrors: number
  digPositive: number
  digEfficiency: number
  assists: number
  assistErrors: number
  assistPositiveEfficiency: number
  assistSuccessEfficiency: number
  assistEfficiency: number
  attacks: number
  attackErrors: number
  attackBlocks: number
  attackPoints: number
  attackEfficiency: number
  blocks: number
  blockPositive: number
  blockErrors: number
  blockPoints: number
  transitionErrors: number
  netErrors: number
  attackServeErrors: number
  generalErrors: number
  opponentAttackErrors: number
  opponentServeErrors: number
}

export type MatchRecord = {
  id: string
  label: string
  season: SeasonId
  competition: Competition
  title: string
  opponent: string
  teamFirst: boolean
  score: Score
  result: MatchResult
  date?: string
  matchday?: number
  round?: string
  sourceUrl?: string
  scoreSource?: 'website' | 'sheet'
  catalogSource?: 'website' | 'sheet' | 'merged'
  players: PlayerMatchStats[]
}

export const builderSlotLabels = ['1', '6', '5', '4', '3', '2'] as const

export function createInitialLineup(match: MatchRecord, setCount: number): string[][] {
  const names = match.players.slice(0, builderSlotLabels.length).map((player) => player.name)
  return Array.from({ length: Math.max(1, setCount) }, () => builderSlotLabels.map((_, index) => names[index] ?? ''))
}

export function assignLineupPlayer(lineups: string[][], setIndex: number, slotIndex: number, playerName: string): string[][] {
  return lineups.map((lineup, currentSetIndex) => currentSetIndex !== setIndex
    ? [...lineup]
    : lineup.map((name, currentSlotIndex) => {
      if (currentSlotIndex === slotIndex) return playerName
      if (playerName && name === playerName) return ''
      return name
    }))
}

export type PlayerAggregate = {
  name: string
  number: number
  position: string
  role: string
  matches: number
  sets: number
  points: number
  pointDiff: number
  serveAttempts: number
  serveErrors: number
  servePoints: number
  receiveAttempts: number
  receiveErrors: number
  receivePositive: number
  receiveEfficiency: number
  digAttempts: number
  digErrors: number
  digPositive: number
  digEfficiency: number
  assists: number
  assistErrors: number
  assistPositiveEfficiency: number
  assistSuccessEfficiency: number
  assistEfficiency: number
  attacks: number
  attackErrors: number
  attackBlocks: number
  attackPoints: number
  attackEfficiency: number
  blocks: number
  blockPositive: number
  blockErrors: number
  blockPoints: number
  errors: number
  opponentErrors: number
}

export type TeamSummary = {
  matches: number
  totalMatches: number
  scheduled: number
  wins: number
  losses: number
  draws: number
  statsMatches: number
  setsWon: number
  setsLost: number
  pointDiff: number
  teamPoints: number
  attackEfficiency: number
  serveEfficiency: number
  receiveEfficiency: number
  defenseEfficiency: number
  assistEfficiency: number
  assistSuccessEfficiency: number
  setterEfficiency: number
  setterSuccessEfficiency: number
  blockEfficiency: number
  opponentErrors: number
  players: PlayerAggregate[]
}

export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1zbQCIsrRCE5x84OewYnfTxy5gbQIRiX01S5dqNWe5-c/export?format=csv&gid=873378130'

export const seasonConfigs: Array<{
  id: SeasonId
  label: string
  sheetName: string
  gid: string
  leagueUrl: string
  cupUrl: string
}> = [
  {
    id: '24/25',
    label: '2024 / 25',
    sheetName: 'SEASON 24/25',
    gid: '76905820',
    leagueUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2025.html',
    cupUrl: 'https://www.hobbyliga-leipzig.de/Pokal2025.html',
  },
  {
    id: '25/26',
    label: '2025 / 26',
    sheetName: 'SEASON 25/26',
    gid: '895834905',
    leagueUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html',
    cupUrl: 'https://www.hobbyliga-leipzig.de/Pokal2026.html',
  },
  {
    id: '26/27',
    label: '2026 / 27',
    sheetName: 'SEASON 26/27',
    gid: '873378130',
    leagueUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html',
    cupUrl: 'https://www.hobbyliga-leipzig.de/ErgebPokal.html',
  },
]

const clean = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

export function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += character
    }
  }

  cells.push(cell)
  return cells
}

function numberFromCell(value: string | undefined): number {
  const normalized = clean(value).replace('%', '').replace(',', '.')
  if (!normalized || normalized === '#DIV/0!') return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function percentFromCell(value: string | undefined): number {
  const parsed = numberFromCell(value)
  return !clean(value).includes('%') && parsed > 0 && parsed <= 1 ? parsed * 100 : parsed
}

export function parseScore(input: string): Score {
  const scoreMatch = input.match(/(\d+)\s*:\s*(\d+)/)
  if (!scoreMatch) return { team: 0, opponent: 0 }

  const first = Number(scoreMatch[1])
  const second = Number(scoreMatch[2])
  const beforeVs = input.split(/\bvs\b/i)[0] ?? ''
  const teamStarts = isTeamName(beforeVs)

  return teamStarts ? { team: first, opponent: second } : { team: second, opponent: first }
}

export function resultFromScore(score: Score): MatchResult {
  if (score.team === 0 && score.opponent === 0) return 'scheduled'
  if (score.team === score.opponent) return 'draw'
  return score.team > score.opponent ? 'win' : 'loss'
}

export function normalizeRole(position: string): string {
  const value = clean(position).toUpperCase()
  if (value === 'L' || value.includes('LIBERO')) return 'Libero'
  if (value.includes('MB')) return 'Middle'
  if (value.includes('S')) return 'Setter'
  if (value.includes('OH') || value.includes('OP')) return 'Attacker'
  return 'Other'
}

export function positionCode(position: string): string {
  const value = clean(position).toUpperCase()
  if (value.startsWith('MB')) return 'MB'
  if (value.startsWith('OH')) return 'OH'
  if (value.startsWith('OP')) return 'OP'
  if (value.startsWith('S')) return 'S'
  if (value.startsWith('L')) return 'L'
  return value || '—'
}

function isTeamName(value: string): boolean {
  return /\batv(?:\s+i)?\b/i.test(value) && !/\batv\s+1845/i.test(value)
}

type DataSchema = 'legacy' | 'mid' | 'current'

function getDataSchema(header: string[]): DataSchema {
  if (clean(header[3]).toLowerCase() === 'note') return 'legacy'
  if (header.length >= 34 || clean(header[24]).toLowerCase() === 'eff%') return 'current'
  return 'mid'
}

function parsePlayerRow(row: string[], header: string[], defaultSets: number): PlayerMatchStats {
  const schema = getDataSchema(header)
  const legacy = schema === 'legacy'
  const current = schema === 'current'
  const sets = legacy ? defaultSets : numberFromCell(row[3])
  const receiveAttemptsIndex = legacy ? 10 : 9
  const receiveErrorsIndex = legacy ? 11 : 10
  const receiveEfficiencyIndex = legacy ? 13 : current ? 12 : 11
  const digAttemptsIndex = legacy ? 14 : current ? 13 : 12
  const digErrorsIndex = legacy ? 15 : current ? 14 : 13
  const digEfficiencyIndex = legacy ? 17 : current ? 15 : 14
  const assistAttemptsIndex = legacy ? -1 : current ? 16 : 15
  const assistErrorsIndex = legacy ? -1 : current ? 17 : 16
  const assistPositiveEfficiencyIndex = current ? 18 : -1
  const assistSuccessEfficiencyIndex = legacy ? -1 : current ? 19 : 17
  const attackAttemptsIndex = legacy ? 18 : current ? 20 : 18
  const attackErrorsIndex = legacy ? 19 : current ? 21 : 19
  const attackBlocksIndex = legacy ? 20 : current ? 22 : 20
  const attackPointsIndex = legacy ? 21 : current ? 23 : 21
  const attackEfficiencyIndex = legacy ? 22 : current ? 24 : 22

  const receiveAttempts = numberFromCell(row[receiveAttemptsIndex])
  const receiveEfficiency = percentFromCell(row[receiveEfficiencyIndex])
  const digAttempts = numberFromCell(row[digAttemptsIndex])
  const digEfficiency = percentFromCell(row[digEfficiencyIndex])
  const assists = assistAttemptsIndex < 0 ? 0 : numberFromCell(row[assistAttemptsIndex])
  const assistErrors = assistErrorsIndex < 0 ? 0 : numberFromCell(row[assistErrorsIndex])
  const assistPositiveEfficiency = assistPositiveEfficiencyIndex >= 0 && clean(row[assistPositiveEfficiencyIndex])
    ? percentFromCell(row[assistPositiveEfficiencyIndex])
    : efficiency(assists - assistErrors, assists)
  const assistSuccessEfficiency = assistSuccessEfficiencyIndex < 0 ? 0 : percentFromCell(row[assistSuccessEfficiencyIndex])
  const role = normalizeRole(row[2] ?? '')
  return {
    number: numberFromCell(row[0]),
    name: clean(row[1]) || 'Unbekannt',
    position: clean(row[2]) || '—',
    role,
    sets,
    points: numberFromCell(row[4]),
    pointDiff: numberFromCell(row[legacy ? 6 : 5]),
    serveAttempts: numberFromCell(row[legacy ? 7 : 6]),
    serveErrors: numberFromCell(row[legacy ? 8 : 7]),
    servePoints: numberFromCell(row[legacy ? 9 : 8]),
    receiveAttempts,
    receiveErrors: numberFromCell(row[receiveErrorsIndex]),
    receivePositive: current ? numberFromCell(row[11]) : (receiveAttempts * receiveEfficiency) / 100,
    receiveEfficiency,
    digAttempts,
    digErrors: numberFromCell(row[digErrorsIndex]),
    digPositive: digAttempts * digEfficiency / 100,
    digEfficiency,
    assists,
    assistErrors,
    assistPositiveEfficiency,
    assistSuccessEfficiency,
    assistEfficiency: assistPositiveEfficiency,
    attacks: numberFromCell(row[attackAttemptsIndex]),
    attackErrors: numberFromCell(row[attackErrorsIndex]),
    attackBlocks: numberFromCell(row[attackBlocksIndex]),
    attackPoints: numberFromCell(row[attackPointsIndex]),
    attackEfficiency: percentFromCell(row[attackEfficiencyIndex]),
    blocks: legacy ? numberFromCell(row[23]) : current ? numberFromCell(row[25]) : numberFromCell(row[23]),
    blockPositive: current ? numberFromCell(row[26]) : 0,
    blockErrors: current ? numberFromCell(row[27]) : schema === 'mid' ? numberFromCell(row[25]) : 0,
    blockPoints: current ? numberFromCell(row[28]) : schema === 'mid' ? numberFromCell(row[26]) : numberFromCell(row[23]),
    transitionErrors: current ? numberFromCell(row[29]) : schema === 'mid' ? numberFromCell(row[27]) : 0,
    netErrors: current ? numberFromCell(row[30]) : schema === 'mid' ? numberFromCell(row[28]) : 0,
    attackServeErrors: current ? numberFromCell(row[32]) : 0,
    generalErrors: current ? numberFromCell(row[34]) : 0,
    opponentAttackErrors: current ? numberFromCell(row[32]) : 0,
    opponentServeErrors: current ? numberFromCell(row[33]) : 0,
  }
}

function opponentFromTitle(title: string): string {
  const sides = title.split(/\bvs\b/i).map((side) => clean(side.replace(/\d+\s*:\s*\d+/, '')))
  if (sides.length < 2) return 'Gegner'
  return isTeamName(sides[0]) ? sides[1] : sides[0]
}

export function parseMatchBlocks(csv: string, season: SeasonId = '26/27', competition: Competition = 'Liga'): MatchRecord[] {
  const lines = csv.split(/\r?\n/)
  const matches: MatchRecord[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const titleCells = parseCsvLine(lines[index] ?? '')
    const rawTitle = clean(titleCells[0])
    if (!rawTitle || !/\bvs\b/i.test(rawTitle) || rawTitle === 'Nr.') continue

    const header = parseCsvLine(lines[index + 1] ?? '')
    const score = parseScore(`${rawTitle} ${clean(titleCells[3])}`)
    const defaultSets = score.team + score.opponent
    const players: PlayerMatchStats[] = []
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = parseCsvLine(lines[rowIndex] ?? '')
      const firstCell = clean(row[0])
      if (!firstCell || firstCell === 'Gesamt' || !/^\d+$/.test(firstCell)) break
      players.push(parsePlayerRow(row, header, defaultSets))
      index = rowIndex
    }

    matches.push({
      id: `match-${matches.length + 1}`,
      label: `Spiel ${String(matches.length + 1).padStart(2, '0')}`,
      season,
      competition,
      title: rawTitle,
      opponent: opponentFromTitle(rawTitle),
      teamFirst: isTeamName(rawTitle.split(/\bvs\b/i)[0] ?? ''),
      score,
      result: resultFromScore(score),
      scoreSource: 'sheet',
      players,
    })
  }

  return matches
}

function efficiency(success: number, attempts: number): number {
  return attempts > 0 ? (success / attempts) * 100 : 0
}

export type RadarDimensionKey = 'serveReceive' | 'attackImpact' | 'transition' | 'netPresence' | 'servicePressure' | 'playmaking' | 'stability' | 'coverage'

type RadarSource = PlayerAggregate | TeamSummary

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function blend(left: number, right: number, leftWeight = 0.5) {
  return clampPercent(left * leftWeight + right * (1 - leftWeight))
}

export function derivedRadarValue(source: RadarSource, dimension: RadarDimensionKey): number {
  const players = 'players' in source ? source.players : [source]
  const weighted = (value: (player: PlayerAggregate) => number, volume: (player: PlayerAggregate) => number) => {
    const totalVolume = players.reduce((sum, player) => sum + volume(player), 0)
    return totalVolume ? players.reduce((sum, player) => sum + value(player) * volume(player), 0) / totalVolume : 0
  }
  const total = (value: (player: PlayerAggregate) => number) => players.reduce((sum, player) => sum + value(player), 0)
  const serveAttempts = total((player) => player.serveAttempts)
  const assistAttempts = total((player) => player.assists)
  const attackAttempts = total((player) => player.attacks)
  const matches = Math.max(1, source.matches)
  const serveQuality = efficiency(total((player) => player.serveAttempts - player.serveErrors), serveAttempts)
  const receiveQuality = weighted((player) => player.receiveEfficiency, (player) => player.receiveAttempts)
  const defenseQuality = weighted((player) => player.digEfficiency, (player) => player.digAttempts)
  const attackQuality = weighted((player) => player.attackEfficiency, (player) => player.attacks)
  const blockQuality = weighted((player) => efficiency(player.blockPoints, player.blocks), (player) => player.blocks)
  const assistQuality = weighted((player) => player.assistEfficiency, (player) => player.assists)
  const assistSuccessQuality = weighted((player) => player.assistSuccessEfficiency, (player) => player.assists)
  const attackVolume = clampPercent(attackAttempts / (matches * 24) * 100)
  const assistVolume = clampPercent(assistAttempts / (matches * 18) * 100)
  const actionCount = total((player) => player.serveAttempts + player.receiveAttempts + player.digAttempts + player.assists + player.attacks)
  const ownErrors = total((player) => player.errors)
  const stability = efficiency(actionCount - ownErrors, actionCount)

  if (dimension === 'serveReceive') return blend(receiveQuality, serveQuality, 0.65)
  if (dimension === 'attackImpact') return clampPercent((attackQuality * 0.82 + attackVolume * 0.18) * 1.08)
  if (dimension === 'transition') return clampPercent((attackQuality * 0.5 + receiveQuality * 0.25 + stability * 0.15 + attackVolume * 0.1) * 1.08)
  if (dimension === 'netPresence') return clampPercent((attackQuality * 0.65 + blockQuality * 0.35) * 1.12)
  if (dimension === 'servicePressure') return blend(efficiency(total((player) => player.servePoints), serveAttempts), serveQuality, 0.6)
  if (dimension === 'playmaking') return clampPercent(assistQuality * 0.55 + assistSuccessQuality * 0.25 + assistVolume * 0.2)
  if (dimension === 'stability') return stability
  return blend(receiveQuality, defenseQuality, 0.5)
}

export function aggregateStats(matches: MatchRecord[]): TeamSummary {
  const players = new Map<string, PlayerAggregate>()
  let teamPoints = 0
  let attackAttempts = 0
  let attackSuccess = 0
  let serveAttempts = 0
  let servePoints = 0
  let receiveAttempts = 0
  let receiveEfficiencySum = 0
  let digAttempts = 0
  let digEfficiencySum = 0
  let assistAttempts = 0
  let assistPositive = 0
  let assistSuccess = 0
  let setterAttempts = 0
  let setterPositive = 0
  let setterSuccess = 0
  let blockAttempts = 0
  let blockSuccess = 0
  let opponentErrors = 0

  for (const match of matches) {
    for (const player of match.players) {
      const current = players.get(player.name) ?? {
        name: player.name,
        number: player.number,
        position: player.position,
        role: player.role,
        matches: 0,
        sets: 0,
        points: 0,
        pointDiff: 0,
        serveAttempts: 0,
        serveErrors: 0,
        servePoints: 0,
        receiveAttempts: 0,
        receiveErrors: 0,
        receivePositive: 0,
        receiveEfficiency: 0,
        digAttempts: 0,
        digErrors: 0,
        digPositive: 0,
        digEfficiency: 0,
        assists: 0,
        assistErrors: 0,
        assistPositiveEfficiency: 0,
        assistSuccessEfficiency: 0,
        assistEfficiency: 0,
        attacks: 0,
        attackErrors: 0,
        attackBlocks: 0,
        attackPoints: 0,
        attackEfficiency: 0,
        blocks: 0,
        blockPositive: 0,
        blockErrors: 0,
        blockPoints: 0,
        errors: 0,
        opponentErrors: 0,
      }

      current.matches += 1
      current.sets += player.sets
      current.points += player.points
      current.pointDiff += player.pointDiff
      current.serveAttempts += player.serveAttempts
      current.serveErrors += player.serveErrors
      current.servePoints += player.servePoints
      const previousReceiveAttempts = current.receiveAttempts
      current.receiveAttempts += player.receiveAttempts
      current.receiveErrors += player.receiveErrors
      current.receivePositive += player.receivePositive
      current.receiveEfficiency = current.receiveAttempts
        ? ((current.receiveEfficiency * previousReceiveAttempts) + (player.receiveEfficiency * player.receiveAttempts)) / current.receiveAttempts
        : player.receiveEfficiency
      const previousDigAttempts = current.digAttempts
      current.digAttempts += player.digAttempts
      current.digErrors += player.digErrors
      current.digPositive += player.digPositive
      current.digEfficiency = current.digAttempts
        ? ((current.digEfficiency * previousDigAttempts) + (player.digEfficiency * player.digAttempts)) / current.digAttempts
        : player.digEfficiency
      const previousAssistAttempts = current.assists
      current.assists += player.assists
      current.assistErrors += player.assistErrors
      current.assistEfficiency = current.assists
        ? ((current.assistEfficiency * previousAssistAttempts) + (player.assistEfficiency * player.assists)) / current.assists
        : player.assistEfficiency
      current.assistPositiveEfficiency = current.assistEfficiency
      current.assistSuccessEfficiency = current.assists
        ? ((current.assistSuccessEfficiency * previousAssistAttempts) + (player.assistSuccessEfficiency * player.assists)) / current.assists
        : player.assistSuccessEfficiency
      current.attacks += player.attacks
      current.attackErrors += player.attackErrors
      current.attackBlocks += player.attackBlocks
      current.attackPoints += player.attackPoints
      current.attackEfficiency = efficiency(current.attackPoints, current.attacks)
      current.blocks += player.blocks
      current.blockPositive += player.blockPositive
      current.blockErrors += player.blockErrors
      current.blockPoints += player.blockPoints
      current.errors += player.serveErrors + player.receiveErrors + player.digErrors + player.assistErrors + player.attackErrors + player.blockErrors + player.transitionErrors + player.netErrors + player.generalErrors
      current.opponentErrors += player.opponentAttackErrors + player.opponentServeErrors
      players.set(player.name, current)

      teamPoints += player.points
      attackAttempts += player.attacks
      attackSuccess += player.attackPoints
      serveAttempts += player.serveAttempts
      servePoints += player.servePoints
      receiveAttempts += player.receiveAttempts
      receiveEfficiencySum += player.receiveEfficiency * player.receiveAttempts
      digAttempts += player.digAttempts
      digEfficiencySum += player.digEfficiency * player.digAttempts
      assistAttempts += player.assists
      assistPositive += player.assistEfficiency / 100 * player.assists
      assistSuccess += player.assistSuccessEfficiency / 100 * player.assists
      blockAttempts += player.blocks
      blockSuccess += player.blockPoints
      if (player.role === 'Setter') {
        setterAttempts += player.assists
        setterPositive += player.assistEfficiency / 100 * player.assists
        setterSuccess += player.assistSuccessEfficiency / 100 * player.assists
      }
      opponentErrors += player.opponentAttackErrors + player.opponentServeErrors
    }
  }

  const playedMatches = matches.filter((match) => match.result !== 'scheduled')
  const wins = playedMatches.filter((match) => match.result === 'win').length
  const losses = playedMatches.filter((match) => match.result === 'loss').length
  const draws = playedMatches.filter((match) => match.result === 'draw').length
  const setsWon = playedMatches.reduce((sum, match) => sum + match.score.team, 0)
  const setsLost = playedMatches.reduce((sum, match) => sum + match.score.opponent, 0)

  return {
    matches: playedMatches.length,
    totalMatches: matches.length,
    scheduled: matches.length - playedMatches.length,
    wins,
    losses,
    draws,
    statsMatches: matches.filter((match) => match.players.length > 0).length,
    setsWon,
    setsLost,
    pointDiff: matches.reduce((sum, match) => sum + match.score.team - match.score.opponent, 0),
    teamPoints,
    attackEfficiency: efficiency(attackSuccess, attackAttempts),
    serveEfficiency: efficiency(servePoints, serveAttempts),
    receiveEfficiency: receiveAttempts > 0 ? receiveEfficiencySum / receiveAttempts : 0,
    defenseEfficiency: digAttempts > 0 ? digEfficiencySum / digAttempts : 0,
    assistEfficiency: efficiency(assistPositive, assistAttempts),
    assistSuccessEfficiency: efficiency(assistSuccess, assistAttempts),
    setterEfficiency: efficiency(setterPositive, setterAttempts),
    setterSuccessEfficiency: efficiency(setterSuccess, setterAttempts),
    blockEfficiency: efficiency(blockSuccess, blockAttempts),
    opponentErrors,
    players: [...players.values()].sort((left, right) => right.points - left.points),
  }
}

const fallbackRoster: Array<Pick<PlayerMatchStats, 'number' | 'name' | 'position' | 'role'>> = [
  { number: 11, name: 'William', position: 'OH1', role: 'Attacker' },
  { number: 22, name: 'Niklas', position: 'OH2', role: 'Attacker' },
  { number: 23, name: 'Julian', position: 'OP', role: 'Attacker' },
  { number: 42, name: 'Levi', position: 'MB1', role: 'Middle' },
  { number: 26, name: 'Abdul', position: 'S1', role: 'Setter' },
  { number: 10, name: 'Minh', position: 'S2', role: 'Setter' },
  { number: 12, name: 'Toni', position: 'L', role: 'Libero' },
]

const fallbackOpponents = [
  ['Hurricane', { team: 3, opponent: 0 }],
  ['Milbomation 13', { team: 3, opponent: 0 }],
  ['TSG 1861 Taucha', { team: 3, opponent: 1 }],
  ['Bullshit Dölzig', { team: 3, opponent: 0 }],
  ['Gandhis Enkel', { team: 3, opponent: 1 }],
  ['LVB Volleys', { team: 3, opponent: 0 }],
  ['VfA Motor', { team: 3, opponent: 0 }],
] as const

function makeFallbackPlayer(
  player: (typeof fallbackRoster)[number],
  matchIndex: number,
): PlayerMatchStats {
  const isLibero = player.role === 'Libero'
  const isMiddle = player.role === 'Middle'
  const isSetter = player.role === 'Setter'
  const points = isLibero ? 0 : 4 + ((matchIndex + player.number) % 9)
  const attacks = isLibero ? 0 : 8 + ((matchIndex * 3 + player.number) % 17)
  const attackPoints = isLibero ? 0 : Math.max(1, Math.round(attacks * (0.25 + ((player.number + matchIndex) % 22) / 100)))
  const attackErrors = isLibero ? 0 : (player.number + matchIndex) % 4
  const attackBlocks = isLibero ? 0 : isMiddle ? (matchIndex + 1) % 3 : matchIndex % 2
  const serveAttempts = isLibero ? 10 + matchIndex * 2 : isSetter ? 12 + matchIndex : 4 + matchIndex
  const receiveAttempts = isLibero ? 22 + matchIndex * 3 : 4 + ((player.number + matchIndex) % 9)
  const receivePositive = Math.round(receiveAttempts * (isLibero ? 0.7 + (matchIndex % 4) / 20 : 0.48 + ((player.number + matchIndex) % 6) / 20))
  const assists = isSetter ? 28 + matchIndex * 2 : isLibero ? 0 : (player.number + matchIndex) % 7

  return {
    ...player,
    sets: 3,
    points,
    pointDiff: points - (1 + ((player.number + matchIndex) % 4)),
    serveAttempts,
    serveErrors: (player.number + matchIndex) % 3 === 0 ? 2 : 1,
    servePoints: isLibero ? 0 : (player.number + matchIndex) % 4,
    receiveAttempts,
    receiveErrors: Math.max(0, Math.round(receiveAttempts * 0.08)),
    receivePositive,
    receiveEfficiency: efficiency(receivePositive, receiveAttempts),
    digAttempts: isLibero ? 38 + matchIndex * 2 : 4 + ((player.number + matchIndex) % 8),
    digErrors: isLibero ? 1 : matchIndex % 2,
    digPositive: isLibero ? 72 + (matchIndex % 4) * 4 : 48 + ((player.number + matchIndex) % 7) * 5,
    digEfficiency: isLibero ? 72 + (matchIndex % 4) * 4 : 48 + ((player.number + matchIndex) % 7) * 5,
    assists,
    assistErrors: isSetter ? 2 + (matchIndex % 2) : 0,
    assistPositiveEfficiency: isSetter ? efficiency(assists - (2 + (matchIndex % 2)), assists) : 0,
    assistSuccessEfficiency: isSetter ? 88 : 0,
    assistEfficiency: isSetter ? efficiency(assists - (2 + (matchIndex % 2)), assists) : 0,
    attacks,
    attackErrors,
    attackBlocks,
    attackPoints,
    attackEfficiency: efficiency(attackPoints, attacks),
    blocks: isMiddle ? 8 + matchIndex : 2,
    blockPositive: isMiddle ? 3 + (matchIndex % 3) : 0,
    blockErrors: isMiddle ? matchIndex % 2 : 0,
    blockPoints: isMiddle ? 1 + (matchIndex % 2) : 0,
    transitionErrors: matchIndex % 2,
    netErrors: 0,
    attackServeErrors: attackErrors,
    generalErrors: 0,
    opponentAttackErrors: 0,
    opponentServeErrors: 0,
  }
}

export const fallbackMatches: MatchRecord[] = fallbackOpponents.map(([opponent, score], index) => ({
  id: `fallback-${index + 1}`,
  label: `Spiel ${String(index + 1).padStart(2, '0')}`,
  season: '26/27',
  competition: 'Liga',
  title: `ATV I vs ${opponent}`,
  opponent,
  teamFirst: true,
  score,
  result: 'win',
  players: fallbackRoster.map((player) => makeFallbackPlayer(player, index)),
}))

export type ExternalFixture = {
  opponent: string
  score: Score
  competition: Competition
  teamFirst?: boolean
  date?: string
  matchday?: number
  round?: string
  scoreKnown?: boolean
  sourceUrl: string
}

export type DataSource = 'live' | 'partial' | 'fallback' | 'unavailable'

export type SeasonDataset = {
  seasons: Record<SeasonId, MatchRecord[]>
  sourceBySeason: Record<SeasonId, DataSource>
}

export const fixtureHints: Partial<Record<SeasonId, ExternalFixture[]>> = {
  '24/25': [
    { opponent: 'SVM04', score: { team: 2, opponent: 2 }, competition: 'Pokal', teamFirst: true, round: 'Qualifikationsrunde (08.04. - 12.04.2024)', sourceUrl: 'https://www.hobbyliga-leipzig.de/Pokal2025.html' },
    { opponent: 'L.E. Quereinsteiger', score: { team: 1, opponent: 3 }, competition: 'Liga', teamFirst: true, matchday: 1, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/1.STC.pdf' },
    { opponent: 'TSG Markkleeberg IV', score: { team: 0, opponent: 3 }, competition: 'Liga', teamFirst: false, matchday: 2, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/2.STC.pdf' },
    { opponent: 'SG Clara Zetkin', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, matchday: 3, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/3.STC.pdf' },
    { opponent: 'Pisa', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: false, matchday: 4, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/4.STC.pdf' },
    { opponent: 'Team VNG', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, matchday: 5, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/5.STC.pdf' },
    { opponent: 'L.E. Quereinsteiger', score: { team: 3, opponent: 2 }, competition: 'Liga', teamFirst: false, matchday: 6, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/6.STC.pdf' },
    { opponent: 'TSG Markkleeberg IV', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, matchday: 7, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/7.STC.pdf' },
    { opponent: 'SG Clara Zetkin', score: { team: 2, opponent: 2 }, competition: 'Liga', teamFirst: false, matchday: 8, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/8.STC.pdf' },
    { opponent: 'Pisa', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, matchday: 9, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/9.STC.pdf' },
    { opponent: 'Team VNG', score: { team: 0, opponent: 3 }, competition: 'Liga', teamFirst: false, matchday: 10, sourceUrl: 'https://www.hobbyliga-leipzig.de/spieltage/2025/10.STC.pdf' },
  ],
  '25/26': [
    { opponent: 'L.E. Quereinsteiger', score: { team: 0, opponent: 3 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'VVC 90 II', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Leipziger SEV I', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Geckos Engelsdorf', score: { team: 0, opponent: 3 }, competition: 'Pokal', teamFirst: true, round: '1. Runde (11.08. - 15.08.2025)', sourceUrl: 'https://www.hobbyliga-leipzig.de/Pokal2026.html' },
    { opponent: 'Leipzig 2000', score: { team: 3, opponent: 2 }, competition: 'Liga', teamFirst: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Gandhis Enkel', score: { team: 3, opponent: 2 }, competition: 'Liga', teamFirst: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'LE Volleys', score: { team: 1, opponent: 3 }, competition: 'Liga', teamFirst: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'VVC 90 II', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Leipziger SEV I', score: { team: 3, opponent: 1 }, competition: 'Liga', teamFirst: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Leipzig 2000', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'Gandhis Enkel', score: { team: 3, opponent: 2 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
    { opponent: 'LVB Volleys', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, sourceUrl: 'https://www.hobbyliga-leipzig.de/Ergebnisse2026.html' },
  ],
  '26/27': [
    { opponent: 'Hurricane', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: false, date: '13.04.2026', matchday: 1, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'TSG 1861 Taucha', score: { team: 3, opponent: 1 }, competition: 'Liga', teamFirst: true, date: '02.06.2026', matchday: 2, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Bullshit Dölzig', score: { team: 3, opponent: 0 }, competition: 'Liga', date: '09.06.2026', matchday: 3, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Milbomation 13', score: { team: 3, opponent: 0 }, competition: 'Pokal', teamFirst: false, round: 'Qualifikationsrunde (04.05. - 08.05.2026)', sourceUrl: 'https://www.hobbyliga-leipzig.de/ErgebPokal.html' },
    { opponent: 'Gandhis Enkel', score: { team: 3, opponent: 1 }, competition: 'Pokal', teamFirst: false, round: '1. Runde (29.06. - 03.07.2026)', sourceUrl: 'https://www.hobbyliga-leipzig.de/ErgebPokal.html' },
    { opponent: 'VfA Motor', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: true, date: '08.09.2026', matchday: 4, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Grünau Bulls', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: false, date: '21.09.2026', matchday: 5, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Hurricane', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: true, date: '27.10.2026', matchday: 6, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'TSG 1861 Taucha', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: false, date: '09.11.2026', matchday: 7, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Bullshit Dölzig', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: true, date: '24.11.2026', matchday: 8, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'VfA Motor', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: false, date: '11.01.2027', matchday: 9, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'Grünau Bulls', score: { team: 0, opponent: 0 }, competition: 'Liga', teamFirst: true, date: '26.01.2027', matchday: 10, scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/SpieltagC7.html' },
    { opponent: 'SV Einheit Borna', score: { team: 0, opponent: 0 }, competition: 'Pokal', teamFirst: true, round: '2. Runde (05.10. - 09.10.2026)', scoreKnown: false, sourceUrl: 'https://www.hobbyliga-leipzig.de/ErgebPokal.html' },
  ],
}

function canonicalTeamName(value: string): string {
  const normalized = clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
  const aliases: Record<string, string> = {
    atv: 'atv volkmarsdorf',
    'atv i': 'atv volkmarsdorf',
    svm04: 'sv molkau 04',
    'sv molkau 04': 'sv molkau 04',
    le: 'l e quereinsteiger',
    'le quereinsteiger': 'l e quereinsteiger',
    'l e quereinsteiger': 'l e quereinsteiger',
    mkb: 'tsg markkleeberg iv',
    sgcz: 'sg clara zetkin',
    vng: 'team vng',
    'ghandis enkel': 'gandhis enkel',
    'geckos (ps)': 'geckos engelsdorf',
    vvc: 'vvc 90 ii',
    'vvc ii': 'vvc 90 ii',
    'sev i': 'leipziger sev i',
    'leipziger sev': 'leipziger sev i',
  }
  return aliases[normalized] ?? normalized
}

function isScore(value: string): boolean {
  return /^\d+\s*:\s*\d+$/.test(clean(value))
}

function isOpponentCell(value: string): boolean {
  return Boolean(clean(value)) && !/^\d+$/.test(clean(value)) && !isScore(value) && /[A-Za-zÄÖÜäöüß]/.test(value)
}

export function parseExternalFixtures(html: string, season: SeasonId, competition: Competition, sourceUrl: string): ExternalFixture[] {
  if (typeof DOMParser === 'undefined') return []
  const document = new DOMParser().parseFromString(html, 'text/html')
  const fixtures: ExternalFixture[] = []
  let matchday: number | undefined
  let round: string | undefined
  const elements = [...document.querySelectorAll('h1, h2, h3, h4, tr')]

  for (const element of elements) {
    const heading = clean(element.textContent ?? '')
    const dayMatch = heading.match(/(\d+)\.\s*Spieltag/i)
    const roundMatch = heading.match(/(Qualifikationsrunde|\d+\.\s*Runde|Pokalendrunde)(?:\s*\([^)]*\))?/i)
    if (dayMatch && element.tagName !== 'TR') {
      matchday = Number(dayMatch[1])
    }
    if (roundMatch && element.tagName !== 'TR') {
      round = roundMatch[0]
    }
    if ((dayMatch || roundMatch) && element.tagName !== 'TR') {
      continue
    }
    if (element.tagName !== 'TR') continue

    const cells = [...element.querySelectorAll('td, th')].map((cell) => clean(cell.textContent ?? ''))
    const teamIndex = cells.findIndex((cell) => isTeamName(cell))
    const dateIndex = cells.findIndex((cell) => /^\d{2}\.\d{2}\.\d{4}$/.test(cell))
    const scoreIndex = cells.findIndex((cell) => isScore(cell))
    if (teamIndex < 0 || scoreIndex < 0) continue

    const opponentCell = cells[teamIndex === 0 ? 1 : 0]
    if (!isOpponentCell(opponentCell)) continue
    const rawScore = cells[scoreIndex].split(':').map(Number)
    const teamFirst = teamIndex === 0
    fixtures.push({
      opponent: opponentCell,
      score: teamFirst ? { team: rawScore[0], opponent: rawScore[1] } : { team: rawScore[1], opponent: rawScore[0] },
      competition,
      teamFirst,
      date: dateIndex >= 0 ? cells[dateIndex] : undefined,
      matchday,
      round,
      scoreKnown: rawScore[0] + rawScore[1] > 0,
      sourceUrl,
    })
  }

  return fixtures
}

export function reconcileMatches(matches: MatchRecord[], fixtures: ExternalFixture[]): MatchRecord[] {
  return matches.map((match) => {
    const matchTeamFirst = isTeamName(match.title.split(/\bvs\b/i)[0] ?? '')
    const fixture = fixtures.find(
      (candidate) =>
        canonicalTeamName(candidate.opponent) === canonicalTeamName(match.opponent) &&
        (candidate.teamFirst === undefined || candidate.teamFirst === matchTeamFirst) &&
        ((candidate.score.team === match.score.team && candidate.score.opponent === match.score.opponent) ||
          (match.score.team === 0 && match.score.opponent === 0)),
    )
    if (!fixture) return match

    const score = match.score.team === 0 && match.score.opponent === 0 ? fixture.score : match.score
    const sets = score.team + score.opponent
    const players = match.players.some((player) => player.sets === 0) && sets > 0
      ? match.players.map((player) => player.sets === 0 ? { ...player, sets } : player)
      : match.players
    const scoreSource = hasKnownScore(score) ? (hasKnownScore(match.score) ? match.scoreSource ?? 'sheet' : 'website') : undefined
    return { ...match, competition: fixture.competition, date: fixture.date, matchday: fixture.matchday, sourceUrl: fixture.sourceUrl, score, scoreSource, result: resultFromScore(score), players }
  })
}

function hasKnownScore(score: Score): boolean {
  return score.team + score.opponent > 0
}

function fixtureMatchesSheet(fixture: ExternalFixture, match: MatchRecord, requireCompetition: boolean, requireScore: boolean): boolean {
  const sameOpponent = canonicalTeamName(fixture.opponent) === canonicalTeamName(match.opponent)
  const sameDirection = fixture.teamFirst === undefined || fixture.teamFirst === match.teamFirst
  const sameCompetition = fixture.competition === match.competition
  const sameScore = hasKnownScore(fixture.score) && hasKnownScore(match.score) && fixture.score.team === match.score.team && fixture.score.opponent === match.score.opponent
  return sameOpponent && sameDirection && (!requireCompetition || sameCompetition) && (!requireScore || sameScore)
}

function findSheetMatch(fixture: ExternalFixture, remaining: MatchRecord[]): MatchRecord | undefined {
  return remaining.find((match) => fixtureMatchesSheet(fixture, match, true, true))
    ?? remaining.find((match) => fixtureMatchesSheet(fixture, match, true, false))
    ?? remaining.find((match) => fixtureMatchesSheet(fixture, match, false, true))
    ?? remaining.find((match) => fixtureMatchesSheet(fixture, match, false, false))
}

function sameFixtureEvent(left: ExternalFixture, right: ExternalFixture): boolean {
  if (canonicalTeamName(left.opponent) !== canonicalTeamName(right.opponent) || left.competition !== right.competition) return false
  if (left.teamFirst !== undefined && right.teamFirst !== undefined && left.teamFirst !== right.teamFirst) return false
  if (left.matchday !== undefined && right.matchday !== undefined) return left.matchday === right.matchday
  if (left.round && right.round) return clean(left.round).toLowerCase() === clean(right.round).toLowerCase()
  if (left.date && right.date) return left.date === right.date

  const leftKnown = left.scoreKnown ?? hasKnownScore(left.score)
  const rightKnown = right.scoreKnown ?? hasKnownScore(right.score)
  return !leftKnown || !rightKnown || (left.score.team === right.score.team && left.score.opponent === right.score.opponent)
}

function mergeFixtureDetails(current: ExternalFixture, incoming: ExternalFixture): ExternalFixture {
  const currentKnown = current.scoreKnown ?? hasKnownScore(current.score)
  const incomingKnown = incoming.scoreKnown ?? hasKnownScore(incoming.score)
  return {
    ...current,
    ...incoming,
    score: incomingKnown || !currentKnown ? incoming.score : current.score,
    scoreKnown: incomingKnown || currentKnown,
    teamFirst: incoming.teamFirst ?? current.teamFirst,
    date: incoming.date ?? current.date,
    matchday: incoming.matchday ?? current.matchday,
    round: incoming.round ?? current.round,
  }
}

function deduplicateFixtures(fixtures: ExternalFixture[]): ExternalFixture[] {
  const unique: ExternalFixture[] = []
  for (const fixture of fixtures) {
    const duplicateIndex = unique.findIndex((current) => sameFixtureEvent(current, fixture))
    if (duplicateIndex < 0) unique.push(fixture)
    else unique[duplicateIndex] = mergeFixtureDetails(unique[duplicateIndex], fixture)
  }
  return unique
}

export function mergeWebsiteWithSheet(fixtures: ExternalFixture[], sheetMatches: MatchRecord[], season: SeasonId): MatchRecord[] {
  const remaining = [...sheetMatches]
  const websiteMatches: MatchRecord[] = deduplicateFixtures(fixtures).map((fixture, index) => {
    const sheetMatch = findSheetMatch(fixture, remaining)
    if (sheetMatch) remaining.splice(remaining.indexOf(sheetMatch), 1)

    const teamFirst = fixture.teamFirst ?? sheetMatch?.teamFirst ?? true
    const websiteScoreKnown = fixture.scoreKnown ?? hasKnownScore(fixture.score)
    const sheetScoreKnown = sheetMatch ? hasKnownScore(sheetMatch.score) : false
    const score = websiteScoreKnown ? fixture.score : sheetScoreKnown && sheetMatch ? sheetMatch.score : fixture.score
    const scoreSource = websiteScoreKnown ? 'website' as const : sheetScoreKnown ? 'sheet' as const : undefined
    const result = websiteScoreKnown || sheetScoreKnown ? resultFromScore(score) : 'scheduled'
    const title = teamFirst ? `ATV I vs ${fixture.opponent}` : `${fixture.opponent} vs ATV I`
    return {
      id: `${season}-website-${index + 1}`,
      label: `Spiel ${String(index + 1).padStart(2, '0')}`,
      season,
      competition: fixture.competition,
      title,
      opponent: fixture.opponent,
      teamFirst,
      score,
      scoreSource,
      result,
      date: fixture.date,
      matchday: fixture.matchday,
      round: fixture.round,
      sourceUrl: fixture.sourceUrl,
      catalogSource: sheetMatch ? 'merged' : 'website',
      players: sheetMatch?.players ?? [],
    }
  })

  const sheetOnlyMatches = remaining.map((match, index) => ({
    ...match,
    id: `${season}-sheet-${index + 1}`,
    label: `Spiel ${String(websiteMatches.length + index + 1).padStart(2, '0')}`,
    season,
    catalogSource: 'sheet' as const,
  }))
  return [...websiteMatches, ...sheetOnlyMatches]
}

async function loadExternalFixtures(config: (typeof seasonConfigs)[number]): Promise<ExternalFixture[]> {
  const fixtures = [...(fixtureHints[config.id] ?? [])]
  const pages = [
    { url: config.leagueUrl, competition: 'Liga' as const },
    { url: config.cupUrl, competition: 'Pokal' as const },
  ]
  const pageResults = await Promise.allSettled(pages.map(async (page) => {
    const response = await fetch(page.url)
    if (!response.ok) throw new Error(`Website request failed: ${response.status}`)
    return parseExternalFixtures(await response.text(), config.id, page.competition, page.url)
  }))
  for (const result of pageResults) {
    if (result.status === 'fulfilled') fixtures.push(...result.value)
  }
  return deduplicateFixtures(fixtures)
}

async function loadSheetMatches(config: (typeof seasonConfigs)[number]): Promise<MatchRecord[]> {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/1zbQCIsrRCE5x84OewYnfTxy5gbQIRiX01S5dqNWe5-c/export?format=csv&gid=${config.gid}`)
  if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`)
  const matches = parseMatchBlocks(await response.text(), config.id)
  if (matches.length === 0) throw new Error(`No match blocks found in ${config.sheetName}`)
  return matches
}

async function loadSeason(config: (typeof seasonConfigs)[number]): Promise<{ season: SeasonId; matches: MatchRecord[]; source: DataSource }> {
  const [websiteResult, sheetResult] = await Promise.allSettled([loadExternalFixtures(config), loadSheetMatches(config)])
  const websiteFixtures = websiteResult.status === 'fulfilled' ? websiteResult.value : []
  const sheetMatches = sheetResult.status === 'fulfilled' ? sheetResult.value : []

  if (websiteFixtures.length > 0 || sheetMatches.length > 0) {
    return {
      season: config.id,
      matches: mergeWebsiteWithSheet(websiteFixtures, sheetMatches, config.id),
      source: websiteFixtures.length > 0 && sheetMatches.length > 0 ? 'live' : 'partial',
    }
  }

  if (config.id === '26/27') return { season: config.id, matches: fallbackMatches, source: 'fallback' }
  return { season: config.id, matches: [], source: 'unavailable' }
}

export async function loadSeasonDataset(): Promise<SeasonDataset> {
  const loadedSeasons = await Promise.all(seasonConfigs.map(loadSeason))
  return {
    seasons: Object.fromEntries(loadedSeasons.map((item) => [item.season, item.matches])) as Record<SeasonId, MatchRecord[]>,
    sourceBySeason: Object.fromEntries(loadedSeasons.map((item) => [item.season, item.source])) as Record<SeasonId, DataSource>,
  }
}

export async function loadMatches(): Promise<{ matches: MatchRecord[]; source: 'live' | 'fallback' }> {
  const dataset = await loadSeasonDataset()
  const source = dataset.sourceBySeason['26/27']
  return { matches: dataset.seasons['26/27'], source: source === 'live' ? 'live' : 'fallback' }
}
