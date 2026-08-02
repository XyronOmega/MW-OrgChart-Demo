# Priorisierte Maßnahmen und Roadmap

> **Momentaufnahme vom 2026-07-31.** Mehrere Befunde sind seither behoben.
> Der aktuelle Stand je Befund steht in [`STATUS.md`](STATUS.md); die Angaben
> unten bleiben bewusst unverändert, weil sie den damaligen Messstand
> dokumentieren.

Aufwand in Personentagen, grob geschätzt. Risiko = Risiko der Änderung selbst.

---

## P0 — Sofort

| # | Maßnahme | Problem | Nutzen | Aufwand | Risiko | Abhängigkeit |
|---|---|---|---|---|---|---|
| 1 | **PR #7 mergen und veröffentlichen** | Demo startet nicht (F-01) | Demo überhaupt benutzbar | 0 (fertig) | gering | — |
| 2 | Veröffentlichten Stand im Browser gegenprüfen | Bestätigung, dass die Live-URL wieder lädt | Gewissheit | 0,25 | keins | 1 |

**Reihenfolge:** 1 → 2. Ohne Schritt 1 ist jede weitere Arbeit an der Demo folgenlos.

---

## P1 — Vor weiterem Funktionsausbau

| # | Maßnahme | Problem | Nutzen | Aufwand | Risiko | Abhängigkeit |
|---|---|---|---|---|---|---|
| 3 | **`app.js` entpacken** und als Quelltext einchecken | F-02 | Kern wird les- und änderbar | 0,5 | mittel | 1 |
| 4 | Leser-Rechte in Leitungsfunktionen/Unterkategorien | F-03 | korrekte Rechtetrennung | 0,5 | gering | 3 |
| 5 | **Zentraler Zustand** mit Versionierung und Migration | F-04 | kein Datenverlust, eine Schreibstelle | 3 | mittel | 3 |
| 6 | Eine Rollendefinition statt zweier | F-11 | Rechteänderungen wirken überall | 0,5 | gering | 5 |
| 7 | Sender der CustomEvents nachrüsten | verbleibende DOM-Beobachtung | Renderzyklus vollständig ereignisgesteuert | 1 | gering | 5 |
| 8 | **Mitgliedschaft als eigenes Objekt** mit Gültigkeit | größter fachlicher Mangel | Historie, geplante Stände, Mehrfachzuordnung möglich | 3–5 | **hoch** | 5 |

**Reihenfolge:** 3 → 5 → 6 → 4 → 7 → 8. Maßnahme 3 ist der Türöffner; ohne sie sind 5 und 8 nicht sauber umsetzbar.

---

## P2 — Nächste Entwicklungsphase

| # | Maßnahme | Problem | Nutzen | Aufwand | Risiko |
|---|---|---|---|---|---|
| 9 | Dialogsemantik + `Escape` am Personenprofil | F-05, F-06 | WCAG A erfüllt | 0,5 | gering |
| 10 | Touch-Ziele auf 44 px | F-07 | mobil bedienbar | 1 | gering |
| 11 | `h1` und Label korrigieren | F-08 | WCAG A erfüllt | 0,25 | sehr gering |
| 12 | **Informationsarchitektur umbauen** | Abschnitt 7 des Hauptberichts | Leser sieht 3 statt 6 Punkte | 2 | mittel |
| 13 | Brotkrumennavigation mit Organisationspfad | fehlende Orientierung | „Wo bin ich?" beantwortet | 1 | gering |
| 14 | Einstieg auf eigene OrgEinheit zentrieren | F-13 | sinnvoller Startpunkt | 0,5 | gering |
| 15 | **Suchindex** statt Filterung über alle Knoten | F-10 | Tippsuche wird nutzbar | 2 | mittel |
| 16 | **Schrittweise Zweignavigation** | F-10 | DOM von 20.000 auf wenige hundert | 3 | mittel |
| 17 | Mobile Laufzeit reaktivieren | F-09 | echte mobile Bedienung | 1–2 | mittel |
| 18 | Erklärtexte für „Unterkategorie" und „Direkt zugeordnet" | Begriffe unverständlich | weniger Rückfragen | 0,5 | keins |
| 19 | Gefährliche Aktionen visuell abheben | UI-Bewertung | weniger Fehlbedienung | 0,5 | gering |
| 20 | Werkzeugleiste des Organigramms entlasten | 12 Elemente in zwei Leisten | klarere Bedienung | 1 | gering |
| 21 | Tote Dateien entfernen | F-12 | weniger Verwirrung | 0,25 | sehr gering |
| 22 | Firefox und WebKit in die CI | ungeprüftes Risiko | Cross-Browser-Sicherheit | 0,5 | gering |

**Reihenfolge:** 11 → 9 → 21 → 14 → 18 → 19 → 10 → 13 → 12 → 15 → 16 → 17 → 20 → 22.
Begründung: erst die billigen Korrekturen mit direkter Wirkung, dann die Architekturthemen Suche und Zweignavigation, zuletzt Mobile — das baut auf 16 auf.

---

## P3 — Spätere Ausbaustufe

| # | Erweiterung | Nutzermehrwert | Fachlich nötig | Komplexität | Datenschutz | Stufe |
|---|---|---|---|---|---|---|
| 23 | Organigramm-Stichtag / historische Ansicht | **hoch** | ja | hoch | unkritisch | nach P1-8 |
| 24 | Vertretungsübersicht | hoch | ja | gering | unkritisch | MVP+ |
| 25 | Offene Leitungsfunktionen / Vakanzen | hoch | ja | mittel | unkritisch | nach P1-8 |
| 26 | Datenqualitäts-Dashboard | mittel | ja | mittel | unkritisch | MVP+ |
| 27 | Konfliktprüfung zwischen Änderungspaketen | **hoch** | ja | hoch | unkritisch | nach P1-8 |
| 28 | Druckansicht | hoch | nein | gering | unkritisch | MVP+ |
| 29 | Export als PDF / Bild | mittel | nein | mittel | **prüfen** | später |
| 30 | Export als Excel | mittel | nein | gering | **prüfen** | später |
| 31 | Globale Suche über alle Ansichten | hoch | nein | mittel | unkritisch | nach P2-15 |
| 32 | Persönliche Startseite | **hoch** | nein | mittel | unkritisch | nach P2-12 |
| 33 | Favoriten / zuletzt besucht | mittel | nein | gering | unkritisch | später |
| 34 | Standort- und Kostenstellenansicht | mittel | ja (Kostenstelle fehlt) | mittel | unkritisch | nach P1-8 |
| 35 | Mitarbeiterverzeichnis | mittel | nein | gering | **prüfen** | später |
| 36 | Benachrichtigungen bei Freigabebedarf | mittel | nein | hoch | unkritisch | braucht Backend |
| 37 | Kommentierung an Änderungspaketen | mittel | nein | mittel | unkritisch | später |
| 38 | Import aus SAP / HR-Synchronisation | hoch | ja (produktiv) | **sehr hoch** | **hoch** | Produktivphase |
| 39 | API | — | ja (produktiv) | hoch | hoch | Produktivphase |
| 40 | Single Sign-on | — | ja (produktiv) | mittel | mittel | Produktivphase |
| 41 | Mehrsprachigkeit | gering | nein | mittel | unkritisch | später |
| 42 | PWA / mobile App | gering | nein | hoch | mittel | später |

### Ausdrücklich **nicht** empfohlen

| Vorschlag | Begründung |
|---|---|
| Prozentuale Zuordnungen | Nur bei Stellenplanung sinnvoll; erhöht die Pflegelast erheblich, ohne dass ein Organigramm davon profitiert. Erst wenn Stellen und Planstellen eingeführt werden. |
| Neuentwicklung auf einem Framework | Würde ohne geklärtes Datenmodell in dieselbe Struktur zurückführen — mit mehr Abhängigkeiten. Erst nach P1. |
| Gültigkeitszeiträume für Unterkategorien | Unterkategorien sind Ordnungsmittel, keine fachlichen Objekte. Aufwand ohne erkennbaren Nutzen. |
| Eigene mobile App | Eine gut gemachte responsive Anwendung deckt den Bedarf; eine App verdoppelt die Pflege. |

---

## Empfohlener nächster Entwicklungsschritt

**Genau einer, in dieser Reihenfolge:**

1. **PR #7 mergen und veröffentlichen.** Bis dahin ist die Demo unbrauchbar und jede weitere Diskussion theoretisch.
2. **`app.js` entpacken.** Alles Weitere hängt davon ab, dass der Kern lesbar ist.
3. **Zentraler Zustand mit Versionierung.** Danach ist das System erweiterbar, ohne dass jede Änderung neue Wechselwirkungen erzeugt.

Erst danach neue Funktionen. Der Freigabeprozess und die fachliche Modellierung sind gut genug, um darauf aufzubauen — die Laufzeitarchitektur ist es noch nicht.
