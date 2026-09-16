import { describe, expect, it } from 'vitest'
import { aggregateStats, assignLineupPlayer, createInitialLineup, derivedRadarValue, fixtureHints, mergeWebsiteWithSheet, parseMatchBlocks, parseScore, positionCode, reconcileMatches, resultFromScore, type ExternalFixture } from './data'

const csv = [
  'ATV I vs Test Team,,,3 : 1',
  'Nr.,Name,Position,Sets,Ges,G-V,Ges,Fhl,Pkt,Ges,Fhl,Pos,Eff%,Ges,Fhl,Pos%,Ges,Fhl,,Erf%,Ges,Fhl,Blo,Pkt,Eff%,Ges,Pos,Fhl,Pkt,Übertritt,Netz,,ATK Err,Srv Err,',
  '7,Alex,OH,4,12,5,20,2,14,10,1,8,60%,10,2,80%,3,0,,25%,25,3,1,8,32%,5,3,1,2,0,0,,1,2,',
  '8,Sam,L,4,2,-1,1,1,12,1,8,58%,20,2,85%,18,1,4,1,0,0,0,0,0%,0,0,0,0,0,0,0,1',
  '',
].join('\n')

const legacyCsv = [
  'ATV vs SVM04,,,,',
  'Nr.,Name,Position,Note,Ges.,BP,G-V,Ges.,Fhl,Pkt,Ges.,Fhl,Pos%,(Prf%),Ges.,Fhl,Pos%,(Prf%),Ges.,Fhl,Blo,Pkt,Pkt%,Pkt,,,,,,',
  '24,Felix,S2,-,6,-,3,12,1,2,10,1,80%,70%,8,1,75%,60%,20,2,1,7,35%,2',
  '',
].join('\n')

const midCsv = [
  'ATV I vs VVC 0 : 3,,,,',
  'Nr.,Name,Position,Sets,Ges,G-V,Ges,Fhl,Pkt,Ges,Fhl,Pos%,Ges,Fhl,Pos%,Ges,Fhl,Erf%,Ges,Fhl,Blo,Pkt,Pkt%,Ges,,Fhl,Pkt,Übertritt,Netz',
  '11,William,OH1,3,8,4,18,2,3,12,2,75%,8,1,70%,4,1,100%,20,2,1,8,40%,2,,0,1,0,0',
  '',
].join('\n')

describe('Volleyball-Daten', () => {
  it('liest Spielblöcke und Spielstand aus dem Sheet-CSV', () => {
    const matches = parseMatchBlocks(csv)

    expect(matches).toHaveLength(1)
    expect(matches[0].opponent).toBe('Test Team')
    expect(matches[0].score).toEqual({ team: 3, opponent: 1 })
    expect(matches[0].players).toHaveLength(2)
  })

  it('interpretiert Spielstände in beide Richtungen', () => {
    expect(parseScore('Hurricane vs ATV I, 0 : 3')).toEqual({ team: 3, opponent: 0 })
    expect(parseScore('ATV I vs Bullshit Dölzig, 3 : 0')).toEqual({ team: 3, opponent: 0 })
  })

  it('erkennt Siege, Niederlagen und Unentschieden', () => {
    expect(resultFromScore({ team: 3, opponent: 1 })).toBe('win')
    expect(resultFromScore({ team: 1, opponent: 3 })).toBe('loss')
    expect(resultFromScore({ team: 2, opponent: 2 })).toBe('draw')
    expect(resultFromScore({ team: 0, opponent: 0 })).toBe('scheduled')
  })

  it('ordnet gleiche Gegner über die Heim-/Auswärtsrichtung zu', () => {
    const block = legacyCsv.split('\n').slice(1, 3).join('\n')
    const matches = parseMatchBlocks(['ATV vs SGCZ,,,,', block, 'SGCZ vs ATV,,,,', block].join('\n'), '24/25')
    const fixtures: ExternalFixture[] = [
      { opponent: 'SG Clara Zetkin', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, sourceUrl: 'test' },
      { opponent: 'SG Clara Zetkin', score: { team: 2, opponent: 2 }, competition: 'Liga', teamFirst: false, sourceUrl: 'test' },
    ]
    const reconciled = reconcileMatches(matches, fixtures)

    expect(reconciled.map((match) => match.score)).toEqual([{ team: 3, opponent: 0 }, { team: 2, opponent: 2 }])
    expect(reconciled[1].players[0].sets).toBe(4)
  })

  it('baut den Spielkatalog aus der Website und ergänzt Sheet-Werte optional', () => {
    const sheetMatches = parseMatchBlocks(csv, '26/27')
    const websiteFixtures: ExternalFixture[] = [
      { opponent: 'Missing Team', score: { team: 3, opponent: 0 }, competition: 'Liga', teamFirst: true, matchday: 1, sourceUrl: 'website' },
      { opponent: 'Test Team', score: { team: 1, opponent: 3 }, competition: 'Liga', teamFirst: true, matchday: 2, sourceUrl: 'website' },
    ]
    const matches = mergeWebsiteWithSheet(websiteFixtures, sheetMatches, '26/27')

    expect(matches).toHaveLength(2)
    expect(matches[0].players).toHaveLength(0)
    expect(matches[0].catalogSource).toBe('website')
    expect(matches[1].players[0].name).toBe('Alex')
    expect(matches[1].catalogSource).toBe('merged')
  })

  it('ersetzt einen geplanten Website-Eintrag durch das spaeter gemeldete Ergebnis', () => {
    const fixtures: ExternalFixture[] = [
      { opponent: 'VfA Motor', score: { team: 0, opponent: 0 }, scoreKnown: false, competition: 'Liga', teamFirst: true, matchday: 4, date: '08.09.2026', sourceUrl: 'hint' },
      { opponent: 'VfA Motor', score: { team: 3, opponent: 0 }, scoreKnown: true, competition: 'Liga', teamFirst: true, matchday: 4, date: '08.09.2026', sourceUrl: 'website' },
    ]

    const matches = mergeWebsiteWithSheet(fixtures, [], '26/27')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ matchday: 4, competition: 'Liga', score: { team: 3, opponent: 0 }, result: 'win', sourceUrl: 'website' })
  })

  it('kennzeichnet ein Sheet-Ergebnis bei noch offenem Website-Spielstand', () => {
    const sheetMatches = parseMatchBlocks(csv.replace('Test Team', 'VfA Motor'), '26/27')
    const fixtures: ExternalFixture[] = [
      { opponent: 'VfA Motor', score: { team: 0, opponent: 0 }, scoreKnown: false, competition: 'Liga', teamFirst: true, matchday: 4, sourceUrl: 'website' },
    ]

    const matches = mergeWebsiteWithSheet(fixtures, sheetMatches, '26/27')

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ matchday: 4, competition: 'Liga', score: { team: 3, opponent: 1 }, scoreSource: 'sheet' })
  })

  it('zählt geplante Website-Spiele nicht als gespielt oder Statistikspiel', () => {
    const sheetMatches = parseMatchBlocks(csv, '26/27')
    const websiteFixtures: ExternalFixture[] = [
      { opponent: 'Test Team', score: { team: 1, opponent: 3 }, competition: 'Liga', teamFirst: true, sourceUrl: 'website' },
      { opponent: 'Future Team', score: { team: 0, opponent: 0 }, competition: 'Pokal', teamFirst: true, round: '2. Runde', sourceUrl: 'website' },
    ]
    const summary = aggregateStats(mergeWebsiteWithSheet(websiteFixtures, sheetMatches, '26/27'))

    expect(summary.matches).toBe(1)
    expect(summary.scheduled).toBe(1)
    expect(summary.statsMatches).toBe(1)
    expect(summary.attackEfficiency).toBe(32)
  })

  it('aggregiert Team- und Spielerwerte über mehrere Spiele', () => {
    const matches = parseMatchBlocks(csv)
    const summary = aggregateStats(matches)

    expect(summary.matches).toBe(1)
    expect(summary.wins).toBe(1)
    expect(summary.players.find((player) => player.name === 'Alex')?.points).toBe(12)
    expect(summary.players.find((player) => player.name === 'Alex')?.attackEfficiency).toBe(32)
  })

  it('aggregiert die ausgewiesene Annahmeeffizienz statt Positiv durch Gesamt neu zu deuten', () => {
    const match = parseMatchBlocks(csv, '26/27')[0]
    const summary = aggregateStats([{ ...match, players: [match.players[0]] }])

    expect(summary.players[0].receiveEfficiency).toBe(60)
    expect(summary.receiveEfficiency).toBe(60)
  })

  it('liest Zuspiel in Gesamt, Fehler, Positiv- und Erfolgsquote getrennt', () => {
    const setterMatch = parseMatchBlocks(csv.replace(',OH,', ',S1,'), '26/27')[0]
    const summary = aggregateStats([setterMatch])
    const alex = summary.players.find((player) => player.name === 'Alex')

    expect(alex).toMatchObject({ assists: 3, assistErrors: 0, assistEfficiency: 100, assistSuccessEfficiency: 25 })
    expect(summary.setterEfficiency).toBe(100)
    expect(summary.setterSuccessEfficiency).toBe(25)
    expect(summary.opponentErrors).toBe(3)
    expect(alex?.opponentErrors).toBe(3)
  })

  it('speichert positive Abwehraktionen als Anzahl statt als Prozentwert', () => {
    const match = parseMatchBlocks(csv, '26/27')[0]
    const player = match.players[0]

    expect(player.digAttempts).toBe(10)
    expect(player.digEfficiency).toBe(80)
    expect(player.digPositive).toBe(8)
  })

  it('interpretiert eine nackte Eins in Prozentfeldern als 100 Prozent', () => {
    const match = parseMatchBlocks(csv.replace('10,2,80%', '10,2,1'), '26/27')[0]
    const player = match.players[0]

    expect(player.digEfficiency).toBe(100)
    expect(player.digPositive).toBe(10)
  })

  it('beruecksichtigt alle eigenen Fehler in Stabilitaet und Spielerprofil', () => {
    const match = parseMatchBlocks(csv, '26/27')[0]
    const player = {
      ...match.players[0],
      serveErrors: 1,
      receiveErrors: 2,
      digErrors: 3,
      assistErrors: 4,
      attackErrors: 5,
      blockErrors: 6,
      transitionErrors: 7,
      netErrors: 8,
      generalErrors: 9,
    }
    const profile = aggregateStats([{ ...match, players: [player] }]).players[0]

    expect(profile.errors).toBe(45)
    expect(derivedRadarValue(profile, 'stability')).toBeLessThan(100)
  })

  it('liest auch ältere Sheet-Formate mit abweichenden Spalten', () => {
    const legacy = parseMatchBlocks(legacyCsv, '24/25')[0]
    const mid = parseMatchBlocks(midCsv, '25/26')[0]

    expect(legacy.players[0]).toMatchObject({ serveAttempts: 12, attackEfficiency: 35, sets: 0 })
    expect(mid.players[0]).toMatchObject({ assists: 4, assistEfficiency: 75, assistSuccessEfficiency: 100, attackEfficiency: 40 })
  })
  it('berechnet Radarwerte aus abgeleiteten Volleyball-Dimensionen', () => {
    const summary = aggregateStats(parseMatchBlocks(csv))
    const alex = summary.players.find((player) => player.name === 'Alex')
    const sam = summary.players.find((player) => player.name === 'Sam')

    expect(alex).toBeDefined()
    expect(sam).toBeDefined()
    expect(derivedRadarValue(alex!, 'attackImpact')).not.toBe(alex?.attackEfficiency)
    expect(derivedRadarValue(alex!, 'transition')).toBeLessThan(100)
    expect(derivedRadarValue(alex!, 'transition')).not.toBe(derivedRadarValue(sam!, 'transition'))
    expect(derivedRadarValue(summary, 'serveReceive')).toBeGreaterThanOrEqual(0)
    expect(derivedRadarValue(summary, 'serveReceive')).toBeLessThanOrEqual(100)
  })

  it('vereinheitlicht Positionscodes und führt VfA Motor als viertes Ligaspiel', () => {
    expect(positionCode('OH2')).toBe('OH')
    expect(positionCode('S1')).toBe('S')
    expect(positionCode('MB3')).toBe('MB')
    expect(positionCode('L')).toBe('L')

    const vfaFixtures = fixtureHints['26/27']?.filter((fixture) => fixture.opponent === 'VfA Motor') ?? []
    expect(vfaFixtures.filter((fixture) => fixture.competition === 'Pokal')).toHaveLength(0)
    expect(vfaFixtures.find((fixture) => fixture.matchday === 4)).toMatchObject({ competition: 'Liga' })
  })

  it('stellt vergangene Aufstellungen vor und lässt zukünftige leer', () => {
    const played = parseMatchBlocks(csv, '26/27')[0]
    const future = { ...played, result: 'scheduled' as const, score: { team: 0, opponent: 0 }, players: [] }

    expect(createInitialLineup(played, 4)[0]).toEqual(['Alex', 'Sam', '', '', '', ''])
    expect(createInitialLineup(future, 5).every((set) => set.every((player) => player === ''))).toBe(true)
  })

  it('setzt Spieler per Klick ohne Duplikat in einen Satz', () => {
    const lineups = [['Alex', 'Sam', '', '', '', ''], ['', '', '', '', '', '']]

    const updated = assignLineupPlayer(lineups, 0, 2, 'Alex')

    expect(updated[0]).toEqual(['', 'Sam', 'Alex', '', '', ''])
    expect(updated[1]).toEqual(lineups[1])
    expect(lineups[0]).toEqual(['Alex', 'Sam', '', '', '', ''])
  })
})
