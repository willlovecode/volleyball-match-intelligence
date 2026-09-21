# Volleyball Match Intelligence

Ein responsives TypeScript- und React-Dashboard für Volleyball-Matchdaten.
Die Anwendung verbindet einen öffentlichen CSV-Datenexport mit einer lokalen
Fallback-Datenquelle und macht Team- und Spielerprofile vergleichbar.

## Was das Projekt zeigt

- Datenimport mit Fallback, damit die Oberfläche auch ohne Netzwerk weiterläuft
- Radar-Charts als eigene SVG-Komponente
- Filter für Rolle, Zeitraum und Ranglistenkennzahl
- Team- und Spielerprofile in einer responsiven Oberfläche
- getrennte Tests, Linting und Produktions-Build

## Architektur

```text
öffentlicher CSV-Export
        │
        ├── erreichbar: aktuelle Matchdaten
        └── nicht erreichbar: lokaler Fallback-Datensatz
                         │
                         ▼
                 React-Dashboard
             Filter · Profile · Charts
```

## Stack

- React
- TypeScript
- Vite
- Vitest
- ESLint
- SVG-basierte Visualisierung

## Lokal starten

```bash
npm install
npm run dev
```

## Qualität prüfen

```bash
npm test
npm run lint
npm run build
```

## Daten und Datenschutz

Die Anwendung verwendet nur den vorgesehenen öffentlichen Datenexport. Es
werden keine Zugangsdaten oder privaten API-Schlüssel benötigt. Lokale
Ausgaben und temporäre Dateien gehören nicht in das Repository.

## Status

Das Dashboard ist ein funktionierender Prototyp für die Auswertung von
Volleyball-Matchdaten. Die fachliche Auswertung und die Datenquelle können
unabhängig voneinander weiterentwickelt werden.
