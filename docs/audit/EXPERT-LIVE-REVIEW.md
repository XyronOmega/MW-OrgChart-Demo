# Experten-Review MW OrgChart Demo

Unabhängige Analyse aus vier Perspektiven: technische Qualität, fachliche Eignung, Nutzerfreundlichkeit, Live-Betrieb.

**Geprüfter Stand:** `main` = `9f830dc`, veröffentlichter Branch `gh-pages`, Korrekturbranch `fix/runtime-stability-audit` (PR #7).
**Datum:** 2026-07-31 · **Methode:** automatisierte Browsermessung (Chromium), Codeanalyse, statischer Server.

---

## 0. Zwei Einschränkungen dieses Audits

Damit die Ergebnisse richtig eingeordnet werden:

1. **Die Live-URL war aus der Prüfumgebung nicht erreichbar.** `https://xyronomega.github.io/MW-OrgChart-Demo/` liefert HTTP 000, der Netzwerk-Proxy blockiert `github.io` (403 beim CONNECT). Ersatzweise wurde der **exakte Inhalt des `gh-pages`-Branches** lokal ausgeliefert — also byteweise dieselben Dateien, die GitHub Pages ausliefert. Aussagen über „die Live-Demo" beruhen auf dieser Gleichsetzung, nicht auf einem echten Abruf der URL.
2. **Nur Chromium stand zur Verfügung.** Firefox und WebKit sind in der Umgebung nicht installiert. Alle Browserangaben gelten für Chromium. Cross-Browser-Verhalten ist **ungeprüft** und bleibt ein offenes Risiko.

---

## 1. Management Summary

**Die veröffentlichte Demo ist derzeit nicht benutzbar.** Ein neuer Nutzer sieht einen leeren Bildschirm; die Seite erreicht nicht einmal `DOMContentLoaded`. Das ist kein Darstellungsfehler, sondern ein blockierter Haupt-Thread. Ursache und Behebung sind in PR #7 dokumentiert und dort behoben, aber **noch nicht veröffentlicht**.

Bewertet man den korrigierten Stand, zeigt sich ein **fachlich überraschend weit gediehenes, technisch aber fragiles System**. Die fachliche Modellierung — Trennung von Leitung und Mitgliedschaft, Unterkategorien ohne eigene Leitung, Änderungspakete mit Vier-Augen-Prinzip — ist durchdacht und für ein Organigramm-System der richtige Ansatz. Die technische Umsetzung trägt diesen Anspruch jedoch nicht: Neun Skripte schreiben ohne klare Zuständigkeit in dieselben DOM-Bereiche, der Kern (`app.js`) liegt nur als gepackter Block ohne lesbaren Quelltext vor, und es gibt keine zentrale Zustandsverwaltung.

**Kernaussage:** Die fachliche Substanz ist erhaltenswert. Die Laufzeitarchitektur ist es nicht. Vor jedem weiteren Funktionsausbau muss die Modulordnung geklärt werden, sonst wächst die Fehlerrate schneller als der Funktionsumfang.

---

## 2. Gesamtbewertung

| Dimension | Bewertung | Begründung |
|---|---|---|
| Technische Qualität | **mangelhaft** | veröffentlichte Fassung startet nicht; kein lesbarer Kernquelltext; konkurrierende DOM-Schreiber |
| Fachliche Eignung | **gut** | Modellierung von Leitung, Mitgliedschaft, Unterkategorien und Workflow ist tragfähig |
| Nutzerfreundlichkeit | **befriedigend** | verständlich aufgebaut, aber Orientierung, Einstieg und Mobilbedienung schwach |
| Live-Betrieb | **mangelhaft** | Veröffentlichung funktioniert, liefert aber einen defekten Stand aus; kein Monitoring |
| Barrierefreiheit | **ausreichend** | Grundgerüst vorhanden, Dialogsemantik und Touch-Ziele mangelhaft |
| Skalierbarkeit | **grenzwertig** | 1.200 Personen darstellbar, aber alle gleichzeitig im DOM |

---

## 3. Technische Architektur

Siehe `ARCHITECTURE-REVIEW.md` für die vollständige Bestandsaufnahme.

**Kurzfassung:** 13 JavaScript-Dateien, davon 10 geladen. Kein Build, kein Modulsystem, keine Abhängigkeitsdeklaration — die Ladereihenfolge in `index.html` ist der einzige Vertrag. Module kommunizieren über den LocalStorage und über direkte DOM-Manipulation. Es gibt keinen zentralen Zustand und keinen definierten Renderzyklus.

Der schwerwiegendste strukturelle Befund: **`app.js` enthält keinen lesbaren Quelltext.** Der eigentliche Code liegt gzip- und base64-kodiert in einer Zeichenkette und wird zur Laufzeit über `new Function()` ausgeführt. Damit ist der Kern der Anwendung weder les- noch review- noch diffbar. Jede Änderung daran ist Blindflug.

---

## 4. Fachliche Bewertung

Siehe Abschnitt 8 sowie `ARCHITECTURE-REVIEW.md`.

**Was gut gelöst ist:**
- Leitung und Mitgliedschaft sind getrennte Sachverhalte — fachlich korrekt und im Organigramm-Kontext keineswegs selbstverständlich.
- Unterkategorien sind bewusst **keine** OrgEinheiten und erhalten keine eigenen Karten. Das verhindert die häufigste Fehlmodellierung in Organigramm-Systemen.
- Änderungspakete mit Statuskette und Vier-Augen-Prinzip bilden einen realen Redaktionsprozess ab.

**Was fachlich fehlt** (Details in Abschnitt 8): Gültigkeitszeiträume für Mitgliedschaften, Mehrfachzuordnungen, Trennung fachlicher und disziplinarischer Leitung, Vakanzen, Stellen- und Planstellenbezug, historische Stände.

---

## 5. Nutzerbewertung

Siehe `UX-REVIEW.md`.

**Der Einstieg ist der schwächste Punkt.** Nach dem Login landet der Nutzer im Organigramm, das horizontal und vertikal scrollt und dessen Personenkarten außerhalb des sichtbaren Bereichs liegen — messbar: Playwright meldet 9 Personenkarten als vorhanden, aber nicht sichtbar. Ein neuer Nutzer sieht zunächst nur die Unternehmenskarte und muss scrollen, ohne dass ihm gesagt wird, wohin.

Es fehlt eine **persönliche Startseite** oder wenigstens ein Einstiegspunkt, der die Frage „Wo bin ich in dieser Organisation?" beantwortet.

---

## 6. Rollenbewertung

Gemessen im korrigierten Stand:

| Rolle | Hauptbereiche | Ansichten | Auffälligkeit |
|---|---|---|---|
| Leser | 3 | 6 | **sieht Zuordnungssteuerelemente** (siehe F-03) |
| Bereichsredaktion | 3 | 9 | plausibel |
| Administrator | 4 | 13 | plausibel |
| Superadministrator | 4 | 15 | plausibel |

Die Rollenstaffelung ist grundsätzlich sinnvoll aufgebaut. Der Befund F-03 (Leser sieht Auswahllisten in „Leitungsfunktionen" und „Unterkategorien") ist der einzige klare Rechtefehler.

**Benennung:** „Leser", „Bereichsredaktion", „Administrator", „Superadministrator" sind verständlich. Allerdings heißt dieselbe Rolle in `changeset-demo.js` intern `editor`, wird aber als „Bereichsredaktion" angezeigt — und die Rechtetabelle dort unterscheidet zusätzlich `EDITOR` von `AREA_EDITOR`. Diese Doppelung ist verwirrend und sollte vereinheitlicht werden.

---

## 7. Navigation und Informationsarchitektur

Die vierteilige Hauptstruktur ist **richtig gewählt**: Organigramm, Organisation, Änderungen, Administration entsprechen den vier Tätigkeitsfeldern der Zielgruppen.

Die Zuordnung der Unterpunkte ist teilweise unstimmig:

| Ansicht | derzeit | besser | Begründung |
|---|---|---|---|
| Mein Profil | Organisation | eigener Ort (Kopfzeile) | persönliche Daten sind kein Organisationsthema |
| Standorte | Organisation | Administration | Stammdatenpflege, kein Tagesgeschäft |
| Zusatzfunktionen | Organisation | Administration | dito |
| Datenqualität | Organisation | Änderungen | gehört zum Redaktionsprozess |
| Kartenstile | Administration | Administration | korrekt |

**Empfohlene Zielstruktur:**

```
Organigramm      Struktur · Suche · gespeicherte Ansichten
Organisation     Personen · OrgEinheiten · Leitungsfunktionen · Unterkategorien
Änderungen       Änderungspakete · Vorschau · Datenqualität
Administration   Benutzer · Rollen · Organisationstypen · Standorte · Zusatzfunktionen · Kartenstile · System
[Kopfzeile]      Mein Profil · Rolle wechseln · Demo zurücksetzen
```

Damit sinkt die Zahl der Unterpunkte für Leser von 6 auf 3 und die Navigation wird für Administratoren vollständig, ohne den Leser zu überfordern.

**Breadcrumbs werden benötigt.** Der Organisationspfad ist derzeit nur in der Kartendarstellung erkennbar, nicht als Navigationselement.

---

## 8. Fachliche Bewertung des Organigramm-Modells

| Frage | Status | Bewertung |
|---|---|---|
| Trennung Person / Mitgliedschaft / Leitung | vorhanden | **richtig und beizubehalten** |
| Trennung OrgEinheit / Unterkategorie | vorhanden | **richtig**; verhindert Wildwuchs im Baum |
| Eine Unterkategorie je Zuordnung | vorhanden | ausreichend für den Regelfall |
| Mehrfachzuordnung Person → mehrere OrgEinheiten | **fehlt** | **wird benötigt**; real bei Matrix- und Projektorganisation |
| Haupt- und Nebenzuordnung | **fehlt** | wird benötigt, sobald Mehrfachzuordnung existiert |
| Prozentuale Zuordnung | fehlt | nur bei Stellenplanung nötig; **später** |
| Temporäre Zuordnung / Projektzuordnung | **fehlt** | wird benötigt |
| Fachliche vs. disziplinarische Leitung | **fehlt** | **wird benötigt**; in der Praxis regelmäßig verschieden |
| Assistenz / Stabsstelle separat | teilweise (Zusatzfunktionen) | als eigener Zuordnungstyp sauberer |
| Stellvertretung | vorhanden | korrekt modelliert |
| Personalunion | vorhanden | korrekt |
| Kommissarische Leitung | vorhanden | korrekt |
| Vakanz / unbesetzte Leitung | **fehlt** | **wird benötigt**; „Nicht hinterlegt" ist kein Vakanzstatus |
| Geplante zukünftige Besetzung | teilweise (Änderungspakete) | tragfähig |
| Historische Stände | **fehlt** | wird benötigt für Nachvollziehbarkeit |
| Gültigkeitszeiträume OrgEinheit | **fehlt** | wird benötigt |
| Gültigkeitszeiträume Mitgliedschaft | **fehlt** | **wird benötigt** — der größte fachliche Mangel |
| Gültigkeitszeiträume Unterkategorie | fehlt | niedrige Priorität |
| Standortzuordnung | vorhanden | ausreichend |
| Kostenstelle | **fehlt** | wird benötigt für Controlling-Sichten |
| Stellen / Planstellen | fehlt | eigene Ausbaustufe |
| Funktions- vs. Stellenbezeichnung | vermischt | **trennen**; heute ist `role` beides |

**Wichtigste fachliche Empfehlung:** Die Mitgliedschaft muss ein eigenes Objekt mit Gültigkeitszeitraum werden, nicht ein `parent`-Feld an der Person. Ohne das sind weder Historie noch geplante Stände noch Mehrfachzuordnungen möglich — und alle drei werden gebraucht.

---

## 9. Mobile Bewertung

**Messergebnis: Die mobile Ansicht ist keine mobile Bedienung, sondern eine verkleinerte Desktop-Seite.**

Beleg: Bei 390 × 844 px und bei 1920 × 1080 px ist die DOM-Knotenzahl identisch (582). Es wird also derselbe Inhalt mit derselben Struktur ausgeliefert; nur CSS skaliert. `mobile-ui-runtime.js` und `mobile-ui-core.js` liegen im Repository, werden aber **nicht geladen** (Hotfix `9f830dc`).

Positiv: Es gibt bei keiner geprüften Breite (360–1920 px) einen horizontalen Überlauf des Dokuments.

Negativ: 50 bzw. 54 interaktive Elemente unterschreiten bei 390 px bzw. 360 px die 44-px-Mindestgröße für Touch-Ziele.

---

## 10. Barrierefreiheit

Siehe `ISSUES.md` (F-05 bis F-08) für Details. Zusammengefasst nach WCAG-Relevanz:

| Befund | WCAG | Stufe | Status |
|---|---|---|---|
| Personenprofil ohne `role="dialog"` und `aria-modal` | 4.1.2 | A | **verletzt** |
| Personenprofil schließt nicht mit `Escape` | 2.1.2 | A | **verletzt** (gemessen) |
| Zwei `h1` auf einer Seite | 1.3.1 | A | verletzt |
| Ein Eingabefeld ohne Label | 3.3.2 / 4.1.2 | A | verletzt |
| Touch-Ziele unter 44 px (50 Stück bei 390 px) | 2.5.8 | AA | verletzt |
| Sichtbarer Tastaturfokus | 2.4.7 | AA | **erfüllt** |
| Landmarks (`nav`, `main`, `header`) | 1.3.1 | A | erfüllt |
| `lang="de"` gesetzt | 3.1.1 | A | erfüllt |
| Schaltflächen mit zugänglichem Namen | 4.1.2 | A | erfüllt (0 ohne Namen) |

Nicht geprüft (Werkzeug fehlte): Farbkontraste, Screenreader-Ausgabe, `prefers-reduced-motion`, Zoom 200 %.

---

## 11. Performance und Skalierbarkeit

Gemessen mit **1.200 Personen und 200 OrgEinheiten** (synthetisch in den LocalStorage eingespielt):

| Messgröße | Wert | Bewertung |
|---|---|---|
| Laden bis `DOMContentLoaded` | 78 ms | sehr gut |
| Zeit bis Organigramm bedienbar | 1.900 ms | grenzwertig |
| DOM-Knoten | **20.464** | zu hoch |
| Karten gleichzeitig im DOM | **1.401** | **alle** — keine Virtualisierung |
| Suchdauer | ~1.400 ms | zu langsam für Tippsuche |
| Wechsel des Hauptbereichs | ~1.560 ms | spürbar träge |

Zum Vergleich Demodaten (23 Personen): 582 DOM-Knoten, Ansichtswechsel unter 100 ms.

**Bewertung:** Das System *funktioniert* bei 1.200 Personen, aber es arbeitet an der Grenze. Alle Personen stehen gleichzeitig im DOM — bei weiterem Wachstum oder auf schwächeren Endgeräten kippt das. Die Suche über 1,4 Sekunden ist für eine Tippsuche unbrauchbar.

**Empfehlung, in dieser Reihenfolge:**
1. **Schrittweise Zweignavigation** — nur der aufgeklappte Ast wird gerendert. Größter Effekt, geringste Komplexität.
2. **Suchindex** beim Laden einmal aufbauen statt bei jeder Eingabe über alle Knoten zu filtern.
3. **Virtualisierung** der Listen- und Tabellenansichten.
4. Zentrale Zustandsverwaltung als Voraussetzung für 1–3.

---

## 12. Datenmodell

Siehe `ARCHITECTURE-REVIEW.md`, Abschnitt „Datenmodell".

**Kritischster Punkt:** Es gibt **keine Versionierung und keine Migration** der LocalStorage-Daten. Ein Nutzer mit Daten aus einer älteren Fassung lädt diese unverändert in eine neuere Anwendung. Da mehrere Module dieselben Schlüssel schreiben und die Struktur sich über die Entwicklung mehrfach geändert hat, ist Datenbeschädigung möglich. Der einzige Ausweg ist derzeit „Demo zurücksetzen" — was der Nutzer erraten muss.

---

## 13. Sicherheit und Datenschutz

| Punkt | Demo-Risiko | Produktivrisiko |
|---|---|---|
| Rechteprüfung nur im UI | gering | **hoch** — muss serverseitig erfolgen |
| Manipulation über LocalStorage | gering (nur eigene Sicht) | **hoch** |
| `innerHTML` mit Daten | gering, `esc()` wird konsistent verwendet | mittel |
| Keine personenbezogenen Daten | **erfüllt** — alle Daten erfunden | — |
| Kein Audit-Log über Rechteänderungen | gering | **hoch** |
| Kein Löschkonzept, keine Aufbewahrungsfristen | entfällt | **hoch** |

Positiv: Die Demo hält ihre eigene Zusage ein — es werden ausschließlich erfundene Daten verwendet, `example.org`-Adressen, keine Netzwerkaufrufe. Das wurde in der CI durch eine Prüfung auf `fetch(`, `XMLHttpRequest` und `/api/` abgesichert.

---

## 14. Fehlerliste

Vollständig in `ISSUES.md`. Übersicht:

| Nr. | Schweregrad | Kurzbeschreibung |
|---|---|---|
| F-01 | **Kritisch** | Veröffentlichte Demo startet nicht (Endlosschleife) |
| F-02 | **Hoch** | `app.js` ohne lesbaren Quelltext |
| F-03 | **Hoch** | Leser sieht Zuordnungssteuerelemente |
| F-04 | **Hoch** | Keine Versionierung/Migration der LocalStorage-Daten |
| F-05 | Mittel | Personenprofil ohne Dialogsemantik |
| F-06 | Mittel | Personenprofil schließt nicht mit `Escape` |
| F-07 | Mittel | 50 Touch-Ziele unter 44 px |
| F-08 | Mittel | Zwei `h1`, ein Feld ohne Label |
| F-09 | Mittel | Mobile Ansicht ist skalierter Desktop |
| F-10 | Mittel | Suche bei 1.200 Personen ~1,4 s |
| F-11 | Niedrig | Rollenbezeichnungen doppelt modelliert |
| F-12 | Niedrig | Tote Dateien im Repository |
| F-13 | Niedrig | Personenkarten beim Einstieg außerhalb des Sichtbereichs |

---

## 15. Verbesserungen und 16. Erweiterungen

Siehe `ROADMAP.md` mit Bewertung je Vorschlag nach Nutzen, Aufwand, Risiko und Ausbaustufe.

---

## 17. Technische Schulden

1. **`app.js` als gepackter Block** — blockiert jede Weiterentwicklung des Kerns.
2. **Kein zentraler Zustand** — jedes Modul liest und schreibt den LocalStorage selbst.
3. **Neun Module ohne Zuständigkeitsgrenzen** auf denselben DOM-Bereichen.
4. **Keine Datenversionierung.**
5. **Doppelte Hilfsfunktionen** (`esc`, `unitPath`, `initials` mehrfach vorhanden).
6. **Tote Dateien** (`organization-type-colors.js`, `mobile-ui-*.js`) im Repository und teils in der CI-Syntaxprüfung.

---

## 18. Risiken

| Risiko | Eintritt | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Weiterer Funktionsausbau auf instabiler Basis | hoch | neue Schleifen, wachsende Fehlerrate | erst Architektur klären (P1) |
| Datenverlust bei Nutzern mit Altdaten | mittel | Vertrauensverlust | Versionierung + Migration (F-04) |
| `app.js` muss geändert werden | hoch | nicht durchführbar | entpacken (F-02) |
| Cross-Browser-Fehler unentdeckt | mittel | Ausfall bei Vorführung | Firefox/WebKit in CI |
| Live-Demo bleibt defekt | **eingetreten** | Demo unbrauchbar | PR #7 mergen und veröffentlichen |

---

## 19. Quick Wins

Geringer Aufwand, sofort spürbar:

1. **PR #7 mergen und veröffentlichen** — behebt F-01, macht die Demo überhaupt erst benutzbar.
2. `role="dialog"` + `aria-modal="true"` + `Escape`-Handler am Personenprofil (F-05, F-06) — unter einer Stunde.
3. Leser-Rechte in „Leitungsfunktionen"/„Unterkategorien" korrigieren (F-03).
4. Zweites `h1` entfernen, fehlendes Label ergänzen (F-08).
5. Tote Dateien entfernen oder als solche kennzeichnen (F-12).
6. Beim Einstieg auf die eigene OrgEinheit zentrieren statt auf die Wurzel (F-13).

---

## 20. Empfohlene Zielarchitektur

**Beibehalten:**
- Statische Auslieferung ohne Backend für die Demo — richtig und tragfähig.
- Fachliches Modell: Trennung Leitung/Mitgliedschaft, Unterkategorien ohne eigene Leitung.
- Änderungspakete mit Vier-Augen-Prinzip.
- Der zentrale UI-Lebenszyklus aus PR #7 als Grundmuster.

**Überarbeiten:**
- **Ein zentraler Zustand** (`store.js`): einzige Schreibstelle für den LocalStorage, Versionsnummer, Migration, Änderungsereignisse. Alle Module lesen daraus und schreiben nur über ihn.
- **Ein Besitzer je Ansicht.** Heute schreiben mehrere Module in `#content`. Künftig registriert jede Ansicht genau einen Renderer.
- **`app.js` entpacken** und in Module aufteilen.
- **Mitgliedschaft als eigenes Objekt** mit Gültigkeitszeitraum.

**Nicht empfohlen:** eine Neuentwicklung auf einem Framework, bevor Datenmodell und Zuständigkeiten geklärt sind. Der Aufwand würde in dieselbe Struktur zurückführen.

---

## 21. Empfohlene Produkt-Roadmap

Siehe `ROADMAP.md`. Kurzfassung:

- **P0 (sofort):** PR #7 veröffentlichen.
- **P1 (vor Funktionsausbau):** zentraler Zustand mit Versionierung, `app.js` entpacken, Leser-Rechte, Mitgliedschaft mit Gültigkeit.
- **P2 (nächste Phase):** Informationsarchitektur, echte mobile Bedienung, Barrierefreiheit, Zweignavigation und Suchindex.
- **P3 (später):** Exporte, Stichtagsansicht, Integrationen, Mehrsprachigkeit.

---

## 22. Testprotokoll

Siehe `LIVE-TEST-RESULTS.md`.

---

## 23. Screenshots

Im Verzeichnis `screenshots/`:

| Datei | Inhalt |
|---|---|
| `a-fix-login.png` | Loginseite mit Rollenauswahl |
| `a-fix-chart-desktop.png` | Organigramm, 1440 × 900, Administrator |
| `a-fix-chart-mobile.png` | Organigramm, 390 × 844 |
| `a-fix-profil.png` | Personenprofil (Drawer) |
| `a-scale-1200.png` | Organigramm mit 1.200 Personen |

Für den **veröffentlichten** Stand konnte kein Screenshot erzeugt werden — die Seite rendert nicht und der Screenshot-Aufruf läuft in einen Timeout. Das ist selbst der Befund.

---

## 24. Offene Fragen

1. **Wer ist fachlicher Eigentümer der Rollendefinition?** `changeset-demo.js` und `app.js` definieren Rollen unterschiedlich.
2. **Soll die Demo dauerhaft ohne Backend bleiben?** Davon hängt ab, ob sich Investitionen in LocalStorage-Migrationen lohnen.
3. **Gibt es einen Quelltext von `app.js` außerhalb des Repositories?** Falls ja, sollte er eingecheckt werden.
4. **Werden Mehrfachzuordnungen fachlich benötigt?** Bestimmt maßgeblich das Zieldatenmodell.
5. **Welche Browser müssen unterstützt werden?** Bisher ist nur Chromium geprüft.
6. **Ist die Zielgröße 1.200 Personen oder wächst sie?** Bei deutlichem Wachstum ist Virtualisierung Pflicht, nicht Kür.
