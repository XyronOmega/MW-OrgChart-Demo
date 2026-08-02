# Stand der Umsetzung

Der Audit in diesem Verzeichnis ist eine **Momentaufnahme vom 2026-07-31**,
erhoben gegen `main` = `9f830dc`. Seither wurden mehrere Pakete gemergt. Diese
Datei ordnet jeden Befund dem aktuellen Stand zu, damit der Audit nicht als
offene Mängelliste missverstanden wird.

**Stand dieser Datei:** `main` = `111db8e` (nach dem Merge von PR #12).
Die Befunde selbst bleiben unverändert — sie dokumentieren, was am 31.07.
gemessen wurde. Geändert wird ausschließlich diese Einordnung.

## Seither gemergt

| PR | Inhalt | Merge-Commit |
|---|---|---|
| #7 | Laufzeitfehler der Unternavigation behoben | `8a3472f` |
| #9 | Leser-Rechte, Barrierefreiheit, Rollenvokabular | `c078b47` |
| #10 | Gemeinsame Maskenarchitektur, Referenzfall Unterkategorien | `292ad17` |
| #11 | `app.js` dauerhaft als lesbarer Quelltext | `5e458b8` |
| #12 | Personen, Organisationseinheiten und Profil auf feste Masken | `111db8e` |

Nicht in dieser Aufstellung: PR #13 (Leitungsfunktionen und Personenzuordnung).
Er ist zum Zeitpunkt dieser Datei noch nicht gemergt und wird deshalb nirgends
als erledigt geführt.

## Befunde im Einzelnen

| Befund | Schwere | Stand | Beleg |
|---|---|---|---|
| **F-01** Veröffentlichte Demo startet nicht | Kritisch | **erledigt und veröffentlicht** | PR #7; der Audit vermerkte „behoben, aber noch nicht veröffentlicht“ |
| **F-02** `app.js` ohne lesbaren Quelltext | Hoch | **erledigt** | PR #11: entpackt, als lesbare Datei geführt, Verhaltensgleichheit über AST-Vergleich belegt; `test/app-source.test.js` erzwingt den Zustand |
| **F-03** Leser sieht Zuordnungssteuerelemente | Hoch | **erledigt** | PR #9: beide Ansichten liefern für Leser eine reine Lesedarstellung. Der im Audit offengelassene Punkt wurde geprüft: Ein Leser konnte **nicht** schreiben — es war ein Anzeigefehler, kein Rechtebruch. Die Schreibfunktionen prüfen ihr Recht seither zusätzlich selbst. |
| **F-04** Keine Versionierung und Migration der Daten | Hoch | **offen** | bewusst zurückgestellt: Datenmodell und Schema-Versionierung sind von den Maskenpaketen ausdrücklich ausgenommen |
| **F-05** Personenprofil ohne Dialogsemantik | Mittel | **erledigt** | PR #9: `role="dialog"`, `aria-modal`, Fokusführung und Fokusfalle; Browsertests in `test/e2e/roles-accessibility.spec.mjs` |
| **F-06** Personenprofil schließt nicht mit `Escape` | Mittel | **erledigt** | PR #9, mit Browsertest |
| **F-07** Touch-Ziele unter der Mindestgröße | Mittel | **erledigt** | PR #9: Browsertests prüfen 44 × 44 px bei 1440, 768, 390 und 360 px |
| **F-08** Überschriftenstruktur und fehlendes Label | Mittel | **erledigt** | PR #9: genau eine `h1` je Seitenzustand, jedes sichtbare Feld hat einen zugänglichen Namen — beides als Browsertest |
| **F-09** Mobile Ansicht ist eine verkleinerte Desktop-Seite | Mittel | **offen** | bewusst zurückgestellt: Die mobile Zweigansicht wird in den Maskenpaketen ausdrücklich nicht reaktiviert |
| **F-10** Suche bei 1.200 Personen zu langsam | Mittel | **offen** | nicht Gegenstand der bisherigen Pakete |
| **F-11** Rollen doppelt und abweichend modelliert | Niedrig | **teilweise erledigt** | PR #9: `roles.js` führt das gemeinsame Vokabular, `changeset-demo.js` liest daraus, das zusätzliche `AREA_EDITOR` ist entfallen. `app.js` führt weiterhin eine eigene `roles`-Struktur mit Ansichten und Demo-Benutzern; ein Test in `test/roles.test.js` erzwingt, dass die Bezeichnungen übereinstimmen. Die Doppelung besteht damit fort, ein Auseinanderlaufen fällt aber sofort auf. |
| **F-12** Tote Dateien im Repository | Niedrig | **teilweise erledigt** | PR #12 hat `organization-unit-editor.js` und `.css` ersatzlos entfernt. `organization-type-colors.js`, `mobile-ui-core.js`, `mobile-ui-runtime.js` und `mobile-ui.css` liegen weiterhin ungenutzt im Repository; sie sind in `docs/edit-masks/BESTAND-EINGABEWEGE.md` als bewusst nicht eingebunden dokumentiert. |
| **F-13** Personenkarten beim Einstieg außerhalb des Sichtbereichs | Niedrig | **offen** | nicht Gegenstand der bisherigen Pakete |

**Zusammenfassung:** 8 von 13 Befunden erledigt, 2 teilweise, 3 offen. Von den
offenen Punkten sind zwei (F-04, F-09) bewusst zurückgestellt.

## Roadmap

`ROADMAP.md` beschreibt den Planungsstand vom 31.07. Der Abschnitt „P0 —
Sofort“ ist vollständig erledigt: PR #7 ist gemergt, veröffentlicht und im
Browser gegengeprüft. Die weitere Reihenfolge hat sich seither an den
Maskenpaketen 1 bis 5 ausgerichtet; maßgeblich dafür ist
`docs/edit-masks/BESTAND-EINGABEWEGE.md`.

## Einschränkungen, die weiterhin gelten

Die Abschnitte „Nicht geprüft“ in `ISSUES.md` und `EXPERT-LIVE-REVIEW.md`
gelten unverändert: Cross-Browser-Verhalten, Farbkontraste,
Screenreader-Ausgabe, Dauernutzung, Zoom bis 200 % und
`prefers-reduced-motion` sind weiterhin nicht gemessen. Es steht nach wie vor
nur Chromium zur Verfügung.
