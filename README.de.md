# SwiftCoder

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Français](README.fr.md) | Deutsch

SwiftCoder ist ein leichtgewichtiger KI-Coding-Agent für macOS, unterstützt von [SwiftScale](https://swift-scale.com). Er überführt eine natürlichsprachliche Aufgabe in einen kontrollierten lokalen Arbeitsablauf: Repository verstehen, Arbeit planen, Dateien untersuchen und bearbeiten, Befehle ausführen, Änderungen prüfen und das Ergebnis verifizieren.

SwiftCoder kombiniert eine Electron-Desktop-Anwendung, eine fokussierte SolidJS-Arbeitsoberfläche und einen integrierten TypeScript Agent Server, der von OpenCode abgeleitet ist. Der Desktop-Client ist offen, nachvollziehbar und lokal ausgerichtet. SwiftScale stellt Identität, Kontoberechtigungen, Modellzugriff, Routing und kommerzielle KI-Dienste bereit.

## Positionierung

SwiftCoder ist der Desktop-Einstiegspunkt zu SwiftScale für Softwareentwickler. Das Produkt ist für reale Arbeit in vorhandenen Repositories gedacht, nicht für voneinander getrennte Frage-Antwort-Unterhaltungen.

SwiftCoder ist:

- ein AI Coding Agent, der Aufgaben von der Repository-Analyse bis zur Implementierung und Verifikation ausführen kann;
- eine macOS-Arbeitsoberfläche mit nativem Bediengefühl für Projekte, Coding-Sitzungen, eigenständige Chats, Diffs, Aufgaben und Terminalaktivitäten;
- ein konfigurationsfreier Zugang zu den Modellen und Kapazitäten eines SwiftScale-Kontos;
- ein Open-Source-Desktop-Client mit klaren Grenzen für lokale Ausführung und Berechtigungen.

SwiftCoder soll keine vollständige IDE ersetzen, autonome Aktionen verbergen oder ein allgemeiner Chat-Client werden. Editoren und IDEs bleiben die primäre Umgebung für detaillierte Codearbeit; SwiftCoder konzentriert sich auf das Delegieren und Überwachen vollständiger Engineering-Aufgaben.

## Produktprinzipien

- **Projekt zuerst.** Projekte und ihre Sitzungen sind zentrale Objekte. SwiftCoder beginnt mit dem Repository und seinem tatsächlichen Zustand, nicht mit einem leeren Chatfeld.
- **Agentisch, aber kontrolliert.** Der Agent kann mehrere Schritte bearbeiten. Sensible Datei-, Shell-, Netzwerk- und Systemaktionen bleiben sichtbar und unterliegen Berechtigungsrichtlinien.
- **Standardmäßig lokal.** Repository-Zugriff, Werkzeuge, Befehle, Diffs und Sitzungsstatus werden lokal verarbeitet. Nur der für die KI-Inferenz notwendige Kontext wird an SwiftScale gesendet.
- **Nachvollziehbare Arbeit.** Pläne, Werkzeugaufrufe, Befehle, Dateiänderungen, Fehler und Prüfergebnisse erscheinen in einer rückverfolgbaren Aufgaben-Zeitleiste.
- **Kontobezogener Modellzugriff.** Produktmodus und Modellkatalog stammen aus den Berechtigungen des angemeldeten SwiftScale-Kontos, nicht aus einer fest codierten Liste.
- **Fokussierter Produktumfang.** SwiftCoder bevorzugt einen kompakten Coding-Arbeitsablauf, statt sämtliche Anbieter, Modellparameter oder Upstream-Funktionen offenzulegen.

## Hauptfunktionen

- Lokale Projekte und projektbezogene Coding-Sitzungen organisieren, mit einem getrennten Bereich für eigenständige Chats.
- Ein Repository mithilfe von Dateisuche, Inhaltsanalyse, Projektanweisungen, Git-Status und Sitzungskontext verstehen.
- Mehrere Dateien erstellen und ändern, Diffs darstellen und die Prüfung oder das Zurücksetzen von Änderungen unterstützen.
- Terminalbefehle ausführen, Ausgaben streamen, lang laufende Arbeiten stoppen und Typprüfungen, Tests, Builds sowie weitere Prüfergebnisse zusammenfassen.
- Pläne, Fortschritt, Werkzeugaktivitäten, erzeugte Ergebnisse und handlungsorientierte Fehler in einer fokussierten Desktop-Oberfläche darstellen.
- Über SwiftScale OAuth anmelden und Zugangsdaten im macOS-Schlüsselbund speichern.
- Produktmodus und Modellauswahl an Coding Plan, API Services oder kombinierte Kontoberechtigungen anpassen. Die Modellverfügbarkeit wird von der SwiftScale-Steuerungsebene geliefert.
- Projekte und Chatverläufe auf dem lokalen Gerät nach angemeldetem Konto trennen.

## Vision

Den weltweit leichtgewichtigsten, elegantesten und intelligentesten KI-Programmierassistenten entwickeln.

SwiftCoder möchte Entwicklern eine neue KI-Coding-Erfahrung bieten:

- **Leichtgewichtig (Lightweight)**
- **Einfach (Simple)**
- **Zuverlässig (Reliable)**
- **Open Source (Open Source)**
- **Intelligent (Intelligent)**

SwiftCoder soll keine weitere, immer komplexer werdende IDE sein, sondern der AI Coding Agent, den Entwickler jeden Tag ganz selbstverständlich öffnen.

Unser Ziel ist, leistungsfähige Coding-Agenten für die tägliche Softwareentwicklung praktisch nutzbar zu machen: einfach zu starten, stark genug für bedeutungsvolle Arbeit und transparent genug für den vertrauensvollen Einsatz in echten Repositories.

SwiftCoder verbindet außerdem einen offenen Desktop-Agenten mit der SwiftScale-KI-Plattform. Während sich Modelle, Routing, Kapazitäten und Teamfunktionen weiterentwickeln, soll der Client einen konsistenten Zugang bieten, ohne dass Entwickler ihre Arbeitsabläufe für einzelne Anbieter neu aufbauen müssen. Erfolg bemisst sich nicht an der erzeugten Textmenge, sondern daran, wie zuverlässig aus einer Absicht geprüfter und verifizierter Code entsteht.

## Funktionsweise

```text
Entwickler
   |
   v
SwiftCoder Desktop (Projekte, Sitzungen, Zeitleiste, Diffs, Terminal)
   |
   +--> Lokaler Agent Server (Kontext, Werkzeuge, Berechtigungen, Persistenz)
   |         |
   |         +--> Lokaler Workspace / Git / Shell
   |
   +--> SwiftScale (Identität, Berechtigungen, Modellrouting, Inferenz)
```

## Voraussetzungen

- macOS 13 oder neuer
- Bun 1.3.14
- Node.js 22.19 oder neuer
- Xcode Command Line Tools

## Entwicklung

```bash
./tools/bootstrap.sh
./tools/check-phase0.sh
./tools/run-dev.sh
./tools/package-mac-dev.sh
```

Für reproduzierbare lokale Builds erkennen die Werkzeuge auch die Bun-Binärdatei im Repository unter `.tools/bun`.

Mit der bereitgestellten SwiftScale-Entwicklungsumgebung ausführen:

```bash
./tools/run-dev-cloud.sh
```

Renderer und integrierten Agent Server erstellen, ohne Electron zu starten:

```bash
SWIFTCODER_CHANNEL=prod bun run build
```

Die vollständige Prüfung der aktuellen Implementierung ausführen:

```bash
./tools/check-phase4.sh
```

## Open-Source-Veröffentlichungsprüfungen

Vor der Veröffentlichung von Quellcode oder Desktop-Artefakten das Lizenzinventar der Abhängigkeiten erzeugen und prüfen:

```bash
bun run licenses:generate
bun run check:open-source
bun run check:security
```

Generierte Binärdateien, Abhängigkeiten, lokale Zustände, Zugangsdaten, Protokolle, Testergebnisse und Signaturmaterial werden durch `.gitignore` ausgeschlossen. Diese Regeln dürfen nicht durch manuelles Hochladen des Verzeichnisses umgangen werden; Veröffentlichungen müssen aus einem geprüften Git-Index erfolgen.

Für eine signierte macOS-Veröffentlichung führt `bun run release:preflight` zuerst die Prüfungen für öffentlichen Quellcode und Abhängigkeitssicherheit aus und prüft anschließend die Apple-Signaturdaten.

Die produktive macOS-Anwendung mit den außerhalb des Repositories in `~/.config/swiftcoder/release.env` gespeicherten Zugangsdaten bauen, signieren, notarisieren und prüfen:

```bash
./tools/package-mac-release.sh
```

Einen intern verwendeten Test-Build mit Produktionskonfiguration, Ad-hoc-Signatur und ohne Apple-Notarisierung erstellen:

```bash
./tools/package-mac-release.sh prod --local-test
```

Lokale Testartefakte dürfen nicht in einem öffentlichen Update-Kanal bereitgestellt werden.

## Quellcode-Struktur

- `packages/desktop`: Electron-Hauptprozess, Preload, Paketierung und Renderer-Einstiegspunkt.
- `packages/app`: SolidJS-Workspace-Oberfläche.
- `packages/opencode`: integrierter TypeScript Agent Server aus der Upstream-Basis.
- `packages/core`, `packages/schema`, `packages/protocol`: gemeinsame Agent-Domäne und API-Verträge.
- `packages/ui`, `packages/session-ui`: UI- und Agent-Zeitleistenkomponenten.
- `tools`: Automatisierung für Entwicklung, Prüfung, Paketierung und Veröffentlichung.
- `script`: beibehaltene Upstream-Wartungswerkzeuge, deren Konsolidierung noch aussteht.
- `UPSTREAM_BASELINE.json`: genaue Upstream-Herkunft und Liste der beibehaltenen Pakete.

Der Build liest nicht aus `../opencode`; dieses Verzeichnis dient ausschließlich als Upstream-Referenz.

## Lizenz und Namensnennung

Der SwiftCoder-Quellcode wird unter der MIT License in `LICENSE` veröffentlicht. Wesentliche Teile sind von OpenCode abgeleitet und behalten den Upstream-Copyright- und MIT-Hinweis in `THIRD_PARTY_NOTICES.md` und `legal/OpenCode-LICENSE.txt` bei.

Lizenzen von Abhängigkeiten und Assets sind dokumentiert in:

- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_DEPENDENCIES.md`
- `legal/`
- `TRADEMARKS.md`

Die Quellcodelizenz gewährt kein Recht, die Marken SwiftScale oder SwiftCoder für eine veränderte Distribution zu verwenden.

## Sicherheit

Melden Sie vermutete Sicherheitslücken nicht in einem öffentlichen Issue. Befolgen Sie die vertraulichen Meldeanweisungen in `SECURITY.md`.

Richtlinien für Beiträge und Support sind in `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` und `SUPPORT.md` dokumentiert.
