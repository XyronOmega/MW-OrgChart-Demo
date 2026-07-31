# Testprotokoll

**Datum:** 2026-07-31 · **Tester:** unabhängiger Fachberater
**Werkzeug:** Chromium über Playwright, statischer Dateiserver
**Prüfgegenstände:** `gh-pages` (veröffentlicht) und `fix/runtime-stability-audit` (PR #7)

## Vorbemerkung zur Testabdeckung

| Punkt | Status |
|---|---|
| Live-URL `https://xyronomega.github.io/MW-OrgChart-Demo/` | **nicht abrufbar** — HTTP 000, Proxy blockiert `github.io` (403 beim CONNECT) |
| Ersatz | exakter `gh-pages`-Inhalt lokal ausgeliefert — byteweise identisch mit der Veröffentlichung |
| Chromium | geprüft |
| Firefox | **nicht verfügbar** |
| WebKit | **nicht verfügbar** |

---

## T-01 · Erster Aufruf, veröffentlichter Stand

| | |
|---|---|
| Rolle | keine (neuer Nutzer) |
| Gerät / Größe | Desktop 1440 × 900 |
| Ausgangssituation | leerer Browser, leerer LocalStorage |
| Aktion | Seite öffnen |
| Erwartet | Loginseite mit Rollenauswahl |
| **Tatsächlich** | **Seite erreicht `DOMContentLoaded` nicht (Timeout 15 s). Bildschirm bleibt leer.** |
| Bewertung | **Durchgefallen** |
| Fehlernummer | F-01 |
| Schweregrad | **Kritisch** |
| Screenshot | nicht erzeugbar — Screenshot-Aufruf läuft ebenfalls in einen Timeout |
| Verbesserung | PR #7 veröffentlichen |

---

## T-02 · Erster Aufruf, korrigierter Stand

| | |
|---|---|
| Größe | 1440 × 900 |
| Aktion | Seite öffnen |
| Erwartet | Loginseite |
| **Tatsächlich** | Loginseite nach **103 ms**, 88 DOM-Knoten, 4 Rollen zur Auswahl, keine Konsolenfehler |
| Bewertung | **Bestanden** |
| Screenshot | `screenshots/a-fix-login.png` |

---

## T-03 bis T-06 · Rollen

Alle bei 1440 × 900, korrigierter Stand.

| Rolle | Hauptbereiche | Ansichten | Konsolenfehler | Bewertung |
|---|---|---|---|---|
| Leser | Organigramm, Organisation, Änderungen | 6 | keine | **Anmerkung** — siehe F-03 |
| Bereichsredaktion | Organigramm, Organisation, Änderungen | 9 | keine | Bestanden |
| Administrator | alle 4 | 13 | keine | Bestanden |
| Superadministrator | alle 4 | 15 | keine | Bestanden |

**Ansichten Leser:** Organigramm, Mein Profil, Leitungsfunktionen, Unterkategorien, Änderungspakete, Vorschau
**Ansichten Superadministrator:** zusätzlich Standorte, Zusatzfunktionen, Personen, Organisationseinheiten, Datenqualität, Admin-Center, Organisationstypen, Benutzerverwaltung, System

---

## T-07 · Rechteprüfung Leser

| | |
|---|---|
| Rolle | Leser |
| Aktion | „Organisation" → „Leitungsfunktionen"; danach „Unterkategorien" |
| Erwartet | reine Lesedarstellung |
| **Tatsächlich** | **Auswahllisten mit allen Personen und allen OrgEinheiten sichtbar** |
| Bewertung | **Durchgefallen** |
| Fehlernummer | F-03 · Schweregrad **Hoch** |
| Einschränkung | Ob eine Änderung tatsächlich gespeichert wird, wurde nicht abschließend geprüft — **möglicher Risikofall** |

---

## T-08 · Viewports

Rolle Administrator, korrigierter Stand.

| Größe | Horizontaler Überlauf | DOM-Knoten | Interaktive Elemente | davon < 44 px |
|---|---|---|---|---|
| 1920 × 1080 | nein | 582 | 69 | 49 |
| 1440 × 900 | nein | 582 | 69 | 49 |
| 1366 × 768 | nein | 582 | 69 | 49 |
| 1024 × 768 | nein | 582 | 69 | 49 |
| 768 × 1024 | nein | 582 | 69 | 49 |
| 412 × 915 | nein | 582 | 69 | 50 |
| 390 × 844 | nein | 582 | 69 | 50 |
| 360 × 800 | nein | 582 | 69 | **54** |

**Bewertung:** Layout bricht bei keiner Breite — bestanden. Touch-Ziele durchgefallen (F-07). **Die identische DOM-Knotenzahl über alle Breiten belegt, dass es keine eigene mobile Darstellung gibt** (F-09).

Screenshots: `a-fix-chart-desktop.png` (1440), `a-fix-chart-mobile.png` (390)

---

## T-09 · Personenprofil

| | |
|---|---|
| Aktion | Personenkarte anklicken, dann `Escape` |
| Erwartet | Profil öffnet; `Escape` schließt |
| **Tatsächlich** | Profil öffnet korrekt. `role="dialog"` **fehlt**, `aria-modal` **fehlt**, `aria-label="Personenprofil"` vorhanden. **`Escape` schließt das Profil nicht.** |
| Bewertung | teilweise durchgefallen |
| Fehlernummern | F-05, F-06 · Schweregrad **Mittel** |
| Screenshot | `a-fix-profil.png` |

---

## T-10 · Barrierefreiheit, automatisiert

| Prüfpunkt | Ergebnis | Bewertung |
|---|---|---|
| Überschriften gesamt | 3 | — |
| `h1` je Seite | **2** | durchgefallen (F-08) |
| Überschriftensprünge | 0 | bestanden |
| Eingabefelder ohne Label | **1 von 2** | durchgefallen (F-08) |
| Schaltflächen ohne zugänglichen Namen | 0 von 75 | **bestanden** |
| Bilder ohne `alt` | 0 | bestanden |
| Landmarks `nav`/`main`/`header` | je 1 | bestanden |
| `lang`-Attribut | `de` | bestanden |
| Sichtbarer Tastaturfokus | vorhanden | **bestanden** |

---

## T-11 · Skalierung mit 1.200 Personen

Synthetisch erzeugt: 1.200 Personen, 200 OrgEinheiten (10 Sektionen × 19 Abteilungen), in den LocalStorage eingespielt.

| Messgröße | Wert | Bewertung |
|---|---|---|
| Laden bis `DOMContentLoaded` | 78 ms | gut |
| Zeit bis Organigramm bedienbar | **1.900 ms** | grenzwertig |
| DOM-Knoten | **20.464** | zu hoch |
| Organigramm-Karten gleichzeitig im DOM | **1.401** | **alle** — keine Virtualisierung |
| Suche nach „Testperson 0999" | **~1.400 ms**, 1 Treffer korrekt | zu langsam |
| Wechsel des Hauptbereichs | **~1.560 ms** | spürbar träge |
| Konsolenfehler | keine | bestanden |

**Bewertung:** funktionsfähig, aber an der Grenze. Fehlernummer F-10.
Screenshot: `a-scale-1200.png`

---

## T-12 · Leerlaufstabilität

| | |
|---|---|
| Aktion | Login, dann 3 s ohne Eingabe |
| Erwartet | keine weitere Aktivität |
| **Tatsächlich (veröffentlicht)** | nicht messbar — Seite lädt nicht |
| **Tatsächlich (korrigiert)** | 0 zusätzliche Beobachteraufrufe, 0 `requestAnimationFrame`, DOM unverändert (582 → 582) |
| Bewertung | korrigierter Stand **bestanden** |

---

## T-13 · Reset und Rollenwechsel

| | |
|---|---|
| Aktion | „Demo zurücksetzen" bestätigen; anschließend Rolle wechseln |
| Erwartet | Ausgangszustand, keine Schleife |
| **Tatsächlich** | Ausgangszustand wiederhergestellt, keine Konsolenfehler, keine anhaltenden Renderzyklen |
| Bewertung | **Bestanden** |

---

## Zusammenfassung

| | Anzahl |
|---|---|
| Testfälle gesamt | 13 |
| Bestanden | 7 |
| Teilweise bestanden | 2 |
| Durchgefallen | 3 |
| Nicht durchführbar | 1 (Live-URL) |

**Der einzige kritische Befund ist T-01:** Die veröffentlichte Demo startet nicht. Alle übrigen Befunde betreffen den korrigierten Stand und sind Mittel oder darunter — mit Ausnahme des Rechtefehlers T-07.
