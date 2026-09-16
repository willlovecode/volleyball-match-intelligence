# ATV I · Match intelligence

Ein responsives Dashboard für die Volleyball-Statistik aus dem verlinkten Google Sheet.

## Starten

```bash
npm install
npm run dev
```

Die Anwendung lädt den öffentlichen CSV-Export des Sheets automatisch. Falls der Export nicht erreichbar ist, zeigt sie einen lokalen Fallback-Datensatz, damit die Oberfläche weiter nutzbar bleibt.

## Prüfen

```bash
npm test
npm run lint
npm run build
```

Die Radar-Charts sind als SVG-Komponente umgesetzt und unterstützen Team- sowie Spielerprofile. Filter für Rolle, Zeitraum und Ranglistenkennzahl aktualisieren die Auswertungen direkt in der Oberfläche.

## Weiteres Review

Für eine vertiefte technische und fachliche Bewertung mit einem stärkeren Modell:

```text
Lies AI_REVIEW_TEAM.md und arbeite nach dem dort beschriebenen Review-Team und der Definition of done.
```
