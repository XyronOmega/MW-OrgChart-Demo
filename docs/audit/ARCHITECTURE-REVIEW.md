# Architekturbewertung

> **Momentaufnahme vom 2026-07-31.** Mehrere Befunde sind seither behoben.
> Der aktuelle Stand je Befund steht in [`STATUS.md`](STATUS.md); die Angaben
> unten bleiben bewusst unverändert, weil sie den damaligen Messstand
> dokumentieren.

Stand `main` = `9f830dc`. Ergänzungen aus `fix/runtime-stability-audit` (PR #7) sind gekennzeichnet.

---

## 1. Modulübersicht

| Modul | Größe | Geladen | Verantwortung | Bewertung |
|---|---|---|---|---|
| `app.js` | 12,9 kB | ja | Kern: Rollen, Zustand, Organigramm, Profile, Standorte, Zusatzfunktionen, Kartenstile, Personen, Einheiten, Datenqualität | **gepackt, kein Quelltext** |
| `leadership-overlay.js` | 29,0 kB | ja | Leitungszuordnungen, Leitungsansicht, Ergänzungen im Profil | stabil, aber DOM-invasiv |
| `platform-admin.js` | 25,2 kB | ja | Organisationstypen, Systemeinstellungen | stabil |
| `organization-unit-editor.js` | 18,0 kB | ja | Anlegen und Pflegen von OrgEinheiten | stabil |
| `changeset-demo.js` | 31,3 kB | ja | Änderungspakete, Vier-Augen-Prinzip, Vorschau, Benutzerverwaltung | stabil, eigener enger Beobachter |
| `orgchart-navigation-bootstrap.js` | 1,4 kB | ja | Startpunkt für die Organigrammnavigation | klein, unkritisch |
| `orgchart-navigation.js` | 41,3 kB | ja | Zoom, gespeicherte Ansichten, Suche, Zweignavigation | **größtes Modul**, hohe Kopplung |
| `person-groups.js` | 34,0 kB | ja | Unterkategorien, Sortierung, Zuordnung | stabil |
| `navigation-shell.js` | 10,5 kB | ja | zweistufige Hauptnavigation | **Ursache von F-01**, in PR #7 überarbeitet |
| `ui-lifecycle.js` | 4,3 kB | ja (PR #7) | zentraler Renderzyklus | neu, empfohlen als Grundmuster |
| `organization-type-colors.js` | 6,9 kB | **nein** | Farbzuordnung je Typ | tot |
| `mobile-ui-core.js` | 8,5 kB | **nein** | mobile Hilfsfunktionen | deaktiviert |
| `mobile-ui-runtime.js` | 16,7 kB | **nein** | mobile Bedienlogik | deaktiviert (Hotfix) |

**Summe geladener JavaScript-Quelltext: rund 208 kB, unkomprimiert, ohne Build.**

---

## 2. Wer schreibt in welchen DOM-Bereich?

Das ist der Kern des Architekturproblems.

| DOM-Bereich | Schreibende Module |
|---|---|
| `#content` | `app.js`, `leadership-overlay.js`, `platform-admin.js`, `organization-unit-editor.js`, `person-groups.js`, `changeset-demo.js`, `orgchart-navigation.js` — **sieben** |
| `#nav` | `app.js`, `changeset-demo.js`, `platform-admin.js`, `leadership-overlay.js`, `navigation-shell.js` — **fünf** |
| `#drawer` | `app.js`, `leadership-overlay.js` — zwei |

**Es gibt keinen definierten Besitzer je Bereich.** Jedes Modul prüft beim Rendern selbst, ob „seine" Ansicht gerade aktiv ist, und schreibt gegebenenfalls hinein. Wer zuletzt schreibt, gewinnt. Das ist die strukturelle Ursache dafür, dass eine Änderung an einem Modul Schleifen in einem anderen auslösen kann.

---

## 3. MutationObserver

| Modul | Ziel | Typen | Löst aus | Schreibt selbst | Rückkopplung |
|---|---|---|---|---|---|
| `navigation-shell.js` (vorher) | `#nav` | childList, subtree, **attributes(class,hidden)** | `scheduleRebuild` | `class`, `hidden`, DOM-Position | **ja, direkt → F-01** |
| `navigation-shell.js` (vorher) | `document.body` | childList, subtree | `scheduleRebuild` | wie oben | ja |
| `leadership-overlay.js` | `document.body` | childList, subtree | `scheduleEnhance` | `#content` | ja, modulübergreifend |
| `organization-unit-editor.js` | `document.body` | childList, subtree | `scheduleEnhance` | `#content` | ja |
| `person-groups.js` | `document.body` | childList, subtree | `scheduleEnhance` | `#content` | ja |
| `platform-admin.js` | `document.body` | childList, subtree | `scheduleEnhance` | `#content`, `#nav` | ja |
| `orgchart-navigation.js` | `document.body` | childList, subtree | `enhanceChart` | `#content` | ja |
| `changeset-demo.js` | `#nav` | childList | `injectNav` | fügt Buttons an | nein |
| `organization-type-colors.js` | — | — | — | — | nicht geladen |
| `mobile-ui-runtime.js` | `document.body` | childList, subtree | `scheduleEnhance` | `#content` | nicht geladen |

**Sechs von sieben aktiven Beobachtern horchten auf `document.body` mit `subtree`.** Jeder Schreibvorgang eines Moduls löste alle anderen aus. In PR #7 sind sie durch **einen** Beobachter auf `#content`, `#drawer` und `#nav` ersetzt — jeweils nur `childList`, ohne `subtree`, mit ruhiger Phase während eigener Schreibvorgänge.

---

## 4. Datenmodell

### LocalStorage-Schlüssel

| Schlüssel | Geschrieben von | Inhalt |
|---|---|---|
| `mw-demo-nodes` | `app.js`, `organization-unit-editor.js`, `platform-admin.js` | **alle** Knoten: Unternehmen, Sektion, Abteilung, Team, Person |
| `mw-demo-locations` | `app.js` | Standorte |
| `mw-demo-functions` | `app.js` | Zusatzfunktionen |
| `mw-demo-profile` | `app.js` | eigenes Profil |
| `mw-demo-organization-types` | `platform-admin.js` | Organisationstypen |
| `mw-demo-system-settings` | `platform-admin.js` | Systemeinstellungen |
| `mw-demo-changesets` | `changeset-demo.js` | Änderungspakete |
| `mw-demo-changeset-events` | `changeset-demo.js` | Workflow-Verlauf |
| `mw-demo-users` | `changeset-demo.js` | Benutzer mit Kontostatus |
| `mw-demo-organization-type-colors` | (Altschlüssel) | Farben, abgelöst |

### SessionStorage

| Schlüssel | Modul | Inhalt |
|---|---|---|
| `mw-demo-active-main-navigation-v1` | `navigation-shell.js` | aktiver Hauptbereich |
| `mw-demo-last-subview-by-group-v1` | `navigation-shell.js` | zuletzt genutzte Unteransicht je Bereich |

### Kernentität `node`

```js
{ id, parent, type: 'company'|'section'|'department'|'team'|'person',
  name, subtitle, role, email, phone, location, functions[], status, accent }
```

**Bewertung:**

| Anforderung | Status |
|---|---|
| Stabile IDs | ja, aber generiert aus `Date.now()` — Kollisionsrisiko |
| Referenzielle Integrität | **nein** — `parent` wird nicht geprüft |
| Bereinigung gelöschter Referenzen | **nein** |
| Eindeutige Datumswerte | teilweise, gemischte Formate (`2026-11-30T23:00` und ISO) |
| Definierte Statuswerte | für Änderungspakete ja, für Personen frei (`status: 'Aktiv'` als Text) |
| Versionierung | **nein** |
| Migrationen | **nein** |
| Zentrale Validierung | **nein** |
| Zyklenschutz | teilweise — `isDescendant` beim Verschieben, aber nicht beim Laden |

**Der schwerwiegendste Modellfehler:** Die Mitgliedschaft ist kein eigenes Objekt, sondern ein `parent`-Feld an der Person. Damit sind Mehrfachzuordnung, Gültigkeitszeiträume und Historie strukturell unmöglich.

---

## 5. Ereignisse

**Vorhanden:** keine anwendungseigenen Ereignisse in `main`.
**Neu in PR #7:** `ui-lifecycle.js` hört auf `mw-demo-view-changed`, `mw-demo-role-changed`, `mw-demo-nodes-changed`, `mw-demo-person-groups-changed`, `mw-demo-leadership-changed`, `mw-demo-content-rendered`.

**Wichtig:** Diese Ereignisse werden derzeit von **keinem Modul ausgelöst**. Die Empfängerseite ist vorbereitet, die Senderseite fehlt. Solange das so bleibt, ist die verbleibende `childList`-Beobachtung der eigentliche Auslöser. Das Nachrüsten der Sender ist der nächste sinnvolle Schritt.

---

## 6. Renderzyklen

| Zyklus | Auslöser | Bewertung |
|---|---|---|
| `renderShell` → `renderView` | Login, Navigationsklick | klar, in `app.js` |
| `scheduleEnhance` je Modul | bisher DOM-Mutation, jetzt Lebenszyklus | war die Fehlerquelle |
| `rebuild` der Navigation | `#nav`-Änderung | in PR #7 mit Signatur abgesichert |
| `enhanceChart` | Inhaltswechsel | teuer bei vielen Knoten |

Es gibt **keinen definierten Gesamtlebenszyklus**: kein „Ansicht wird verlassen", kein Aufräumen registrierter Handler. Event-Listener werden teils über `onclick =` gesetzt (überschreibt, kein Leck), teils über `addEventListener` mit `dataset`-Flags gegen Mehrfachregistrierung. Das ist inkonsistent, aber im geprüften Umfang nicht leckbehaftet.

---

## 7. Doppelte Funktionen

| Funktion | Vorkommen |
|---|---|
| `esc` / `escapeHtml` | `app.js`, `changeset-demo.js`, `leadership-overlay.js`, `person-groups.js`, `platform-admin.js` |
| `unitPath` | `app.js`, `organization-unit-editor.js`, `person-groups.js` |
| `initials` | `app.js`, `leadership-overlay.js` |
| `load` / `read` (LocalStorage mit Fallback) | in **jedem** Modul eigenständig |
| Rollendefinition | `app.js` und `changeset-demo.js`, **abweichend** |

---

## 8. Veröffentlichung

- `publish-demo.yml` kopiert `main` unverändert nach `gh-pages`; GitHub Pages liefert von dort aus. **Der Mechanismus funktioniert** — geprüft: `gh-pages` entspricht dem Stand von `main`.
- **Folge:** Da `main` derzeit den defekten Stand trägt, ist auch die Live-Demo defekt.
- Cache: Versionsparameter (`?v=`) werden verwendet, wurden aber vor PR #7 bei Inhaltsänderungen nicht immer erhöht. In PR #7 nachgezogen.
- Kein Service Worker, keine eigenen Cache-Control-Regeln — es gilt die Voreinstellung von GitHub Pages.

---

## 9. Was beibehalten werden kann

1. **Statische Auslieferung ohne Backend.** Für eine Demo richtig; erzwingt Klarheit über den Datenfluss.
2. **Modulare Aufteilung nach Fachthemen.** Die Schnitte (Leitung, Unterkategorien, Einheiten, Änderungspakete) sind fachlich sinnvoll.
3. **Fachliches Modell** für Leitung, Mitgliedschaft und Unterkategorien.
4. **Der zentrale Lebenszyklus aus PR #7** als Muster für alle künftigen Module.
5. **Testaufbau ohne Framework** über den Node-Test-Runner — schlank und wartbar.

## 10. Was überarbeitet werden muss

1. **`app.js` entpacken.** Ohne lesbaren Kern ist alles Weitere Symptombehandlung.
2. **Zentraler Zustand** mit Versionierung, Migration und Änderungsereignissen als einzige Schreibstelle.
3. **Ein Besitzer je Ansicht.** Ein Renderer registriert sich für eine Ansicht; kein Modul schreibt mehr ungefragt in `#content`.
4. **Mitgliedschaft als eigenes Objekt** mit Gültigkeitszeitraum.
5. **Eine Rollendefinition** statt zweier.
6. **Sender der CustomEvents nachrüsten**, dann die verbleibende DOM-Beobachtung entfernen.

## 11. Ausdrücklich nicht empfohlen

**Eine Neuentwicklung auf einem Framework, bevor Datenmodell und Zuständigkeiten geklärt sind.** Der Aufwand wäre erheblich und würde ohne geklärtes Modell in dieselbe Struktur zurückführen — nur mit mehr Abhängigkeiten. Die richtige Reihenfolge ist: Kern lesbar machen → Zustand zentralisieren → Modell erweitern → erst dann über Technologiewechsel entscheiden.
