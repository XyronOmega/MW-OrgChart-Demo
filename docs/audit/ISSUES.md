# Fehlerliste

Geprüft am 2026-07-31 gegen `main` = `9f830dc`, `gh-pages` und `fix/runtime-stability-audit` (PR #7).
Alle Angaben sind gemessen, sofern nicht ausdrücklich als **möglicher Risikofall** gekennzeichnet.

Legende Schweregrad: **Kritisch** · **Hoch** · **Mittel** · **Niedrig** · *Verbesserung* (kein Fehler)

---

## F-01 — Veröffentlichte Demo startet nicht · **Kritisch**

**Datei:** `navigation-shell.js` (Funktionen `rebuild`, `updateActivePresentation`, `observeNav`)
**Reproduktion:** `gh-pages`-Inhalt statisch ausliefern, Seite öffnen. `DOMContentLoaded` wird nie erreicht (Timeout nach 15 s).
**Auswirkung:** Ein neuer Nutzer sieht einen leeren Bildschirm. Die Demo ist unbrauchbar.
**Ursache:** Der Beobachter auf `#nav` horcht auf `class` und `hidden` — genau die Attribute, die dieselben Funktionen schreiben. Browser erzeugen auch bei **wertgleichen** Schreibvorgängen einen MutationRecord. Gemessenes Protokoll: `132 × ATTR hidden @ button = "" (vorher "")`, `66 × ATTR class @ #nav (vorher identisch)`. Da über `queueMicrotask` geplant wird, läuft die Microtask-Warteschlange nie leer.
**Lösung:** Behoben in **PR #7** (nur bei echter Änderung schreiben, keine Attributbeobachtung, Beobachter während eigener Schreibvorgänge trennen, Render-Signatur, Budget).
**Aufwand:** erledigt · **Risiko der Änderung:** gering (Commits einzeln rücknehmbar)
**Status:** behoben, **aber noch nicht veröffentlicht**.

---

## F-02 — `app.js` enthält keinen lesbaren Quelltext · **Hoch**

**Datei:** `app.js`
**Reproduktion:** Datei öffnen. Der Inhalt ist eine gzip- und base64-kodierte Zeichenkette, die zur Laufzeit über `new Function()` ausgeführt wird.
**Auswirkung:** Der Kern der Anwendung (Rollen, Organigramm, Profile, Verwaltungsansichten) ist nicht les-, review- oder diffbar. Jede Änderung ist Blindflug, jeder Code-Review wertlos.
**Ursache:** Historisch; vermutlich ein Auslieferungsartefakt, das versehentlich zur Quelle wurde.
**Lösung:** Entpacken (Skript liegt vor: base64 → gunzip), als lesbare Datei einchecken, gegen die gepackte Fassung auf Verhaltensgleichheit prüfen, anschließend in Module aufteilen.
**Aufwand:** 0,5 Tage für das Entpacken, mehrere Tage für die Aufteilung · **Risiko:** mittel — Verhaltensgleichheit muss belegt werden.

---

## F-03 — Leser sieht Zuordnungssteuerelemente · **Hoch**

**Datei:** `leadership-overlay.js`, `person-groups.js`
**Funktion:** Renderer der Ansichten „Leitungsfunktionen" und „Unterkategorien"
**Reproduktion:** Als **Leser** anmelden → „Organisation" → „Leitungsfunktionen". Es erscheinen Auswahllisten mit allen Personen und allen OrgEinheiten. Gleiches unter „Unterkategorien".
**Gemessen:** Die Ansicht enthält für die Rolle `viewer` sichtbare `<select>`-Elemente mit Personen- und Einheitenlisten.
**Auswirkung:** Ein Leser sieht Bedienelemente, die er nicht bedienen können sollte. Mindestens verwirrend; je nach Speicherverhalten ein Rechtefehler.
**Nicht abschließend geprüft:** ob eine Änderung über diese Listen tatsächlich gespeichert wird. **Möglicher Risikofall** — vor der Behebung verifizieren.
**Lösung:** Rechteprüfung in den Renderern beider Module; für Leser nur Lesedarstellung.
**Aufwand:** 0,5 Tage · **Risiko:** gering

---

## F-04 — Keine Versionierung und keine Migration der gespeicherten Daten · **Hoch**

**Dateien:** alle Module mit LocalStorage-Zugriff
**Reproduktion:** LocalStorage mit einer Struktur aus einer älteren Fassung befüllen, Seite laden. Die Daten werden unverändert übernommen.
**Auswirkung:** Nutzer mit Altdaten können widersprüchliche oder unvollständige Zustände erhalten. Der einzige Ausweg ist „Demo zurücksetzen", was der Nutzer erraten muss.
**Ursache:** Kein Schemaversionsfeld, keine Migrationsschicht, kein zentraler Lese- und Schreibpunkt. Neun Module lesen und schreiben dieselben Schlüssel unabhängig.
**Lösung:** Zentraler Zustand mit Versionsnummer und Migrationsketten; alle Module lesen nur noch darüber.
**Aufwand:** 2–3 Tage · **Risiko:** mittel — betrifft alle Module.

---

## F-05 — Personenprofil ohne Dialogsemantik · **Mittel** · WCAG 4.1.2 (A)

**Datei:** `app.js` (Funktion `openDrawer`), `index.html`
**Gemessen:** `#drawer` hat `aria-label="Personenprofil"`, aber **kein** `role="dialog"` und **kein** `aria-modal`.
**Auswirkung:** Screenreader kündigen den Bereich nicht als Dialog an; der Hintergrund bleibt in der Vorlesereihenfolge.
**Lösung:** `role="dialog"`, `aria-modal="true"`, Fokus beim Öffnen in den Dialog, Fokusrückgabe beim Schließen, Fokusfalle.
**Aufwand:** 0,5 Tage · **Risiko:** gering

---

## F-06 — Personenprofil schließt nicht mit `Escape` · **Mittel** · WCAG 2.1.2 (A)

**Datei:** `app.js` (Funktion `openDrawer`)
**Reproduktion:** Personenkarte anklicken → Profil öffnet → `Escape` drücken. **Gemessen: Das Profil bleibt geöffnet.**
**Auswirkung:** Tastaturnutzer haben keinen erwartbaren Weg heraus.
**Lösung:** `keydown`-Handler für `Escape` beim Öffnen registrieren, beim Schließen entfernen.
**Aufwand:** unter 1 Stunde · **Risiko:** sehr gering

---

## F-07 — Touch-Ziele unter der Mindestgröße · **Mittel** · WCAG 2.5.8 (AA)

**Datei:** `styles.css` und modulspezifische Stylesheets
**Gemessen:** bei 390 × 844 px unterschreiten **50 von 69** sichtbaren interaktiven Elementen 44 × 44 px; bei 360 × 800 px sind es **54**.
**Auswirkung:** Fehlbedienung auf Smartphones, besonders bei motorischen Einschränkungen.
**Lösung:** Mindesthöhe 44 px für Schaltflächen, Auswahllisten und Eingabefelder unterhalb 768 px Breite.
**Aufwand:** 1 Tag · **Risiko:** gering, aber Layoutwirkung prüfen.

---

## F-08 — Überschriftenstruktur und fehlendes Label · **Mittel** · WCAG 1.3.1 / 3.3.2 (A)

**Datei:** `index.html`, `app.js`
**Gemessen:** **zwei** `h1` auf einer Seite (Loginbereich und Kopfzeile); **ein** sichtbares Eingabefeld ohne zugehöriges Label oder `aria-label`. Positiv: keine Überschriftensprünge, alle 75 Schaltflächen haben einen zugänglichen Namen.
**Lösung:** Nur eine `h1` je Seitenzustand; fehlendes Label ergänzen.
**Aufwand:** 1 Stunde · **Risiko:** sehr gering

---

## F-09 — Mobile Ansicht ist eine verkleinerte Desktop-Seite · **Mittel**

**Dateien:** `mobile-ui-runtime.js`, `mobile-ui-core.js` (beide **nicht geladen**), `index.html`
**Gemessen:** Bei 390 × 844 px und 1920 × 1080 px ist die DOM-Knotenzahl identisch (582). Es wird derselbe Inhalt ausgeliefert; nur CSS skaliert.
**Auswirkung:** Keine mobile Bedienlogik — kein fokussierter Zweig, kein Organisationspfad, keine kompakte Leiste.
**Ursache:** Die mobile Laufzeit wurde im Hotfix `9f830dc` wegen einer DOM-Schleife deaktiviert.
**Lösung:** `mobile-ui-runtime.js` auf den zentralen Lebenszyklus aus PR #7 umstellen und wieder einbinden. Voraussetzung dafür ist mit PR #7 erfüllt.
**Aufwand:** 1–2 Tage · **Risiko:** mittel — die Datei enthält denselben globalen Beobachter, der F-01 verursacht hat.

---

## F-10 — Suche bei 1.200 Personen zu langsam · **Mittel**

**Datei:** `app.js` (`applySearch`), `orgchart-navigation.js`
**Gemessen:** mit 1.200 Personen dauert eine Suche rund **1,4 Sekunden**; der Wechsel des Hauptbereichs rund **1,56 Sekunden**. DOM-Knoten: **20.464**, davon **1.401** Organigramm-Karten gleichzeitig.
**Auswirkung:** Tippsuche unbrauchbar; spürbare Trägheit bei jedem Ansichtswechsel.
**Ursache:** Es wird bei jeder Eingabe über alle Knoten gefiltert und im DOM markiert; alle Personen stehen gleichzeitig im DOM.
**Lösung:** Suchindex einmalig aufbauen; schrittweise Zweignavigation statt vollständigem Baum.
**Aufwand:** 2–3 Tage · **Risiko:** mittel

---

## F-11 — Rollen doppelt und abweichend modelliert · **Niedrig**

**Dateien:** `app.js` (`roles`: viewer, editor, admin, superadmin) und `changeset-demo.js` (`rolePermissions` mit zusätzlich `AREA_EDITOR`)
**Auswirkung:** Dieselbe Rolle heißt an zwei Stellen unterschiedlich und hat unterschiedliche Rechte. Fehlerquelle bei jeder Rechteänderung.
**Lösung:** Eine Rollendefinition, von allen Modulen gelesen.
**Aufwand:** 0,5 Tage · **Risiko:** gering

---

## F-12 — Tote Dateien im Repository · **Niedrig**

**Dateien:** `organization-type-colors.js` / `.css` (nicht in `index.html` geladen), `mobile-ui-core.js`, `mobile-ui-runtime.js`, `mobile-ui.css` (nicht geladen)
**Auswirkung:** Verwirrung bei Wartung; `organization-type-colors.js` enthält zudem einen weiteren MutationObserver, der bei versehentlicher Wiedereinbindung Schleifen begünstigt. Die CI prüft die Syntax dieser Dateien, obwohl sie nie ausgeführt werden.
**Lösung:** Entfernen oder in `docs/` als bewusst inaktiv dokumentieren.
**Aufwand:** 1 Stunde · **Risiko:** sehr gering

---

## F-13 — Personenkarten beim Einstieg außerhalb des Sichtbereichs · **Niedrig**

**Datei:** `orgchart-navigation.js`, `app.js` (`renderChart`)
**Gemessen:** Nach dem Login meldet der Browser 9 vorhandene, aber nicht sichtbare Personenkarten. Sichtbar sind nur Unternehmens- und Sektionskarte.
**Auswirkung:** Ein neuer Nutzer sieht zunächst kaum Inhalt und muss ohne Hinweis scrollen.
**Lösung:** Beim Einstieg auf die eigene oder auf die erste besetzte OrgEinheit zentrieren; Zoomstufe „Alles einpassen" als Ausgangszustand.
**Aufwand:** 0,5 Tage · **Risiko:** gering

---

## Geprüft und **nicht** gefunden

Diese Punkte wurden gesucht und im korrigierten Stand nicht festgestellt:

- keine ungefangenen JavaScript-Fehler (0 Konsolenfehler in allen Rollen und Viewports)
- keine Unhandled Promise Rejections
- kein horizontaler Überlauf des Dokuments bei 360–1920 px
- keine wachsende DOM-Knotenzahl im Leerlauf (nach PR #7 stabil)
- keine Netzwerkaufrufe, keine `/api/`-Zugriffe (per CI abgesichert)
- keine echten personenbezogenen Daten
- Schaltflächen ohne zugänglichen Namen: 0
- Bilder ohne `alt`: 0

## Nicht geprüft

- Cross-Browser-Verhalten (Firefox, WebKit nicht verfügbar)
- Farbkontraste (kein Messwerkzeug verfügbar)
- Screenreader-Ausgabe
- Verhalten nach zehn Minuten Dauernutzung
- Zoom bis 200 %
- `prefers-reduced-motion`
