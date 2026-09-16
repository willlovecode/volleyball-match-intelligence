# KI-Review-Team für das Volleyball-Dashboard

Diese Datei ist der Arbeitsauftrag für ein leistungsstärkeres Modell, das das
Projekt fachlich, technisch und visuell beurteilen und anschließend gezielt
verbessern soll.

## So wird die Datei verwendet

Lies diese Datei vollständig, bevor du Änderungen planst. Arbeite als
koordinierende Leitung eines kleinen Spezialistenteams. Die Rollen sind
gedankliche Review-Perspektiven innerhalb eines Modells; sie sollen nicht zu
unabhängigen Behauptungen ohne Beleg führen.

Beginne jedes Review mit einer Bestandsaufnahme der aktuellen Dateien und des
laufenden Verhaltens. Trenne klar zwischen:

- belegten Fakten aus Code, Tests, Sheet-Daten und offiziellen Spielseiten,
- plausiblen Annahmen,
- offenen Fragen, die nicht geraten werden dürfen.

Arbeite in kleinen, nachvollziehbaren Schritten. Vor jeder neuen Logik werden
die wichtigsten Tests formuliert. Nach Änderungen laufen Tests, Lint und Build;
bei Frontend-Änderungen folgt zusätzlich eine echte Browserprüfung mit
Screenshot oder einer gleichwertigen sichtbaren Verifikation.

## Projektkontext

- Produkt: interaktives Statistik-Dashboard für ATV Volkmarsdorf / ATV I.
- Stack: React, TypeScript, Vite, SVG-Diagramme, Lucide Icons, Vitest und ESLint.
- Zentrale Dateien:
  - `src/data.ts`: Datenmodelle, CSV-Parsing, Website-Katalog, Abgleich und Aggregation.
  - `src/App.tsx`: Seiten, Navigation, Filter, Breakdown-Ansichten, Radar und Teambuilder.
  - `src/styles.css`: Layout, Responsive Design und Light-/Darkmode.
  - `src/data.test.ts`: fachliche Tests für Parsing, Abgleich, Aggregation, Radar und Aufstellungsinitialisierung.
  - `README.md`: Start- und Prüfhinweise.
- Datenquellen:
  - Google Sheets mit den relevanten Tabs `SEASON 24/25`, `SEASON 25/26` und `SEASON 26/27`.
  - Offizielle Hobbyliga-Spielseiten für die Struktur des Spielkatalogs, Ergebnisse,
    Spieltage und Pokalrunden.
- Datenprinzip: Die offizielle Website bestimmt den Spielkatalog. Sheet-Zeilen
  werden nur passenden Katalogspielen zugeordnet. Ein Website-Spiel ohne
  Sheet-Zeile bleibt sichtbar, darf aber nicht in personenbezogene oder
  quotenbasierte Sheet-Berechnungen einfließen.

## Fachliche Leitplanken

Diese Regeln müssen bei jedem Review erhalten bleiben oder ausdrücklich als
bewusste Änderung begründet werden:

1. VfA Motor ist in Saison 26/27 das vierte Liga-/Punktspiel, kein Pokalspiel.
2. Pokalspiele zeigen die zugehörige Runde, wenn sie auf der offiziellen Seite
   verfügbar ist.
3. Zuspiel wird getrennt ausgewertet:
   - Gesamtzahl der Zuspiele,
   - Zuspielfehler,
   - positive Zuspielquote in Prozent,
   - Zuspielerfolgsquote in Prozent, wenn der anschließende Angriff ein Punkt war.
   Die Erfolgsquote darf nicht aus der bloßen Fehlerfreiheit abgeleitet werden.
4. Für Quoten werden nur passende Versuche/Aktionen aus vorhandenen
   Sheet-Spielerzeilen verwendet. Website-only-Spiele liefern Ergebnis-, Satz-
   und Kataloginformationen, aber keine erfundenen Detailwerte.
5. Kurzpositionen außerhalb von Spielansicht und Teambuilder sind `S`, `OH`,
   `MB`, `OP` und `L`. Nummerierte Positionen wie `OH2` oder `MB1` gehören in
   die Spiel-/Aufstellungsansicht.
6. Radarwerte sind aus realen aggregierten Statistiken abgeleitete Dimensionen.
   Sie dürfen nicht als fest geschriebene Beispielwerte im UI liegen. Die
   Dimensionen sollen unterschiedliche Volleyball-Aspekte abbilden und dürfen
   nicht einfach nur die Tabellen-Oberkategorien wiederholen.
7. Bei Spielerprofilen müssen die Kennzahlen zur Position passen:
   - Setter: Zuspielquote, Zuspiele insgesamt, Zuspielerfolgsquote und Punkte.
   - Libero: Annahme, Abwehr, Zuspiel und Punkte.
   - Middle: Block, Angriff und Punkte.
   - Opposite: Angriff, Abwehr und Punkte.
   - Outside Hitter: Angriff, Annahme und Punkte.
8. Gegnerfehler gehören in Spiel-Breakdowns sichtbar gekennzeichnet und in der
   Teamzusammenfassung nachvollziehbar ausgewiesen.

## Das Spezialistenteam

### 1. Technische Leitung und Produktarchitektur

Aufgabe: Das Gesamtbild halten und Änderungen priorisieren.

Prüffragen:

- Ist die Trennung zwischen Datenmodell, Berechnung, Darstellung und UI-Zustand
  noch verständlich?
- Gibt es doppelte Logik oder globale Zustände, die zu schwer nachvollziehbaren
  Seiteneffekten führen?
- Sind neue Funktionen in die bestehende Navigation und in die drei Saisons
  sinnvoll integriert?

Ergebnis: kurze Architekturdiagnose, priorisierte Änderungsreihenfolge und
Entscheidungen bei Zielkonflikten.

### 2. Volleyball-Datenanalyst

Aufgabe: Fachliche Korrektheit der Volleyball-Kennzahlen sicherstellen.

Prüffragen:

- Sind Nenner, Fehler, positive Aktionen und direkte Punkte je Statistik korrekt
  definiert?
- Werden Zuspielquote und Zuspielerfolgsquote wirklich unterschiedlich berechnet?
- Sind Rollen-, Positions- und Satzlogik konsistent?
- Werden kleine Stichproben und fehlende Sheet-Werte ehrlich behandelt?

Ergebnis: Kennzahlenkatalog mit Formel, Datenfeldern, Nenner und sinnvoller
Darstellung.

### 3. Datenintegration und Reconciliation

Aufgabe: Import aus Google Sheets und Website-Katalog robust halten.

Prüffragen:

- Werden nur die drei relevanten Season-Tabs geladen?
- Ist der Website-Katalog die führende Struktur, auch wenn Sheet-Daten fehlen?
- Sind Heim-/Auswärtsrichtung, Gegnernamen, Spieltag, Pokalrunde und Saison
  beim Abgleich stabil?
- Was passiert bei verschobenen Spielterminen, doppelten Gegnern oder einem
  unvollständigen Ergebnis?

Ergebnis: reproduzierbare Zuordnungsregeln, gezielte Tests für Sonderfälle und
eine Liste nicht automatisch zuordenbarer Spiele.

### 4. Statistik- und Visualisierungsdesign

Aufgabe: Aus Kennzahlen verständliche, nicht irreführende Aussagen machen.

Prüffragen:

- Sind Radarachsen aus belastbaren Komponenten abgeleitet und sinnvoll skaliert?
- Sind Trendlinien, Streudiagramme, Matrix- und Punkte-DNA-Ansichten lesbar und
  inhaltlich nützlich?
- Werden Werte über mehrere Spiele gewichtet aggregiert, statt unpassende
  Einzelquoten einfach zu mitteln?
- Sind fehlende Werte von echten Nullwerten unterscheidbar?

Ergebnis: Vorschläge für maximal wenige, aber aussagekräftige Visualisierungen
mit klarer Aussage und Datenbasis.

### 5. Frontend- und UX-Design

Aufgabe: Dashboard, Spiel-/Spieler-Breakdowns und Teambuilder als einheitliche
Arbeitsoberfläche weiterentwickeln.

Prüffragen:

- Sind Saisonwahl, Einstellungen, Filter und Auswahlfelder sichtbar wirksam?
- Funktionieren Darkmode, responsive Tabellen und horizontale Detailtabellen
  auf den vorgesehenen Bildschirmgrößen?
- Sind klickbare Spiele, Spielerprofile und der Teambuilder auffindbar und
  verständlich?
- Zeigt die zuletzt erfasste Aufstellung wirklich das letzte abgeschlossene
  Spiel mit Sheet-Werten?

Ergebnis: konkrete UI-Probleme mit reproduzierbarem Zustand, Screenshot und
kleinstem sinnvollen Änderungsvorschlag.

### 6. Accessibility- und Interaction-Review

Aufgabe: Bedienbarkeit ohne Maus und verständliche Rückmeldungen prüfen.

Prüffragen:

- Haben Navigation, Selects, Dialoge, Tabellenzeilen und Drag-and-drop-Ziele
  sinnvolle Namen und Fokuszustände?
- Sind Status, Fehler, fehlende Werte und aktive Filter nicht nur über Farbe
  erkennbar?
- Gibt es eine bedienbare Alternative zum Ziehen im Teambuilder?
- Sind Kontrast, Schriftgröße und Tabellen-Scroll auf Hell- und Dunkelgrund
  ausreichend?

Ergebnis: priorisierte Accessibility-Liste mit reproduzierbaren Prüfschritten.

### 7. Test- und Qualitätssicherung

Aufgabe: Regressionen verhindern und die wichtigsten Nutzerflüsse absichern.

Prüffragen:

- Decken Tests Parser, Reconciliation, Aggregation, Zuspieldefinitionen,
  Website-only-Spiele und Aufstellungsinitialisierung ab?
- Werden Änderungen zuerst durch einen gezielten fehlschlagenden Test beschrieben?
- Gibt es Browser-Smoke-Checks für Saisonwechsel, Darkmode, Einstellungen,
  Spieler-/Spielklicks, Tabelle und Teambuilder?
- Sind Fehlermeldungen beim Import nachvollziehbar?

Ergebnis: kleinste sinnvolle Testergänzung, danach grüner Test-/Lint-/Build-Lauf.

### 8. Performance, Sicherheit und Betrieb

Aufgabe: Stabilität im Alltag und verantwortungsvoller Umgang mit Daten prüfen.

Prüffragen:

- Werden CSV- und Website-Daten nur einmal oder unnötig oft geladen?
- Bleiben lokale Planungsdaten im Browser und werden keine privaten Inhalte
  versehentlich an externe Dienste übertragen?
- Sind Fehler bei Netzwerk, CORS, ungültigem CSV oder leerer Saison abgefangen?
- Bleiben Build-Größe, Initial-Render und große Matchtabellen vertretbar?

Ergebnis: nur Maßnahmen mit konkretem Nutzen; keine vorgezogenen Infrastruktur-
oder Refactoring-Projekte ohne Problembeleg.

## Zusammenarbeit des Teams

1. Die technische Leitung erstellt zuerst einen Befund mit maximal fünf
   priorisierten Problemen.
2. Datenanalyst und Datenintegration prüfen fachliche Fakten unabhängig von der
   UI. Bei Widerspruch gewinnt die belegte Datenquelle; unklare Fälle bleiben
   offen.
3. UX, Accessibility und Visualisierung bewerten denselben Zustand aus ihrer
   Perspektive. Sie sollen konkrete Beispiele statt allgemeiner Geschmacksurteile
   liefern.
4. Die Testrolle formuliert vor jeder Implementierung die Regressionstests.
5. Danach werden die kleinsten zusammenhängenden Änderungen umgesetzt. Jede
   Änderung nennt kurz Ursache, Entscheidung und betroffene Dateien.
6. Abschluss nur mit:
   - `npm test -- --run`
   - `npm run lint`
   - `npm run build`
   - sichtbarer Browserprüfung der geänderten Flows.

## Empfohlener Auftrag an das neue Modell

> Lies `AI_REVIEW_TEAM.md`, `README.md` und danach nur die für den ersten Befund
> relevanten Quelldateien. Prüfe das Dashboard als technischer Leiter mit den
> acht Review-Perspektiven aus dieser Datei. Beginne mit belegten Befunden und
> einer Priorisierung nach Nutzerwirkung und Fehlerrisiko. Prüfe besonders
> Website-first-Reconciliation, Zuspielquoten, VfA Motor als Liga-Spieltag 4,
> Website-only-Spiele, Darkmode, Tabellenlesbarkeit, Radarberechnung und den
> Teambuilder. Schreibe zuerst Tests für neue Logik, implementiere dann nur die
> priorisierten Verbesserungen und führe die Abschlussprüfungen aus.

## Definition of done

Eine Verbesserung gilt erst als abgeschlossen, wenn:

- die fachliche Aussage anhand der Datenquelle erklärbar ist,
- Website-only-Spiele keine erfundenen Sheet-Werte erzeugen,
- die relevanten Interaktionen tatsächlich Zustände ändern,
- Lightmode und Darkmode geprüft sind,
- die bestehende Testsuite plus neue Regressionstests grün sind,
- Lint und Build grün sind,
- keine generierten Artefakte oder temporären Prüfdateien im Projektroot liegen.

Die Wahl eines stärkeren Modells oder eines höheren Reasoning-/Effort-Levels
erfolgt außerhalb dieses Repositorys. Diese Datei liefert dafür den stabilen
Kontext und den Arbeitsauftrag.
