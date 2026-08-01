# Bestand aller Eingabewege

Stand: Branch `refactor/edit-masks-leadership-person-groups`, ausgehend von
`main` (`111db8e`, nach dem Merge von Paket 2).

Erfasst wurden alle Stellen, an denen Daten erzeugt oder verändert werden. Als
Eingabeweg zählt jede Interaktion, die den `localStorage` beschreibt, sowie jede
Rückfrage, die einer Eingabe vorausgeht.

Grundlage: statische Durchsicht aller in `index.html` eingebundenen Skripte
sowie von `app.js`. Der Bestand wurde ursprünglich am entpackten Inhalt erhoben;
seit PR #11 liegt `app.js` als lesbarer Quelltext vor und wird unmittelbar geprüft.

**Zusammenfassung**

| Kategorie | Anfangs | Paket 1 | Paket 2 | Paket 3 | noch offen |
|---|---|---|---|---|---|
| Systemdialoge (`alert`, `prompt`, `confirm`) | 13 | 1 | 2 | 1 | **9** |
| Modale beziehungsweise schwebende Formulare | 1 | 0 | 1 | 0 | **0** |
| Inline-Bearbeitung ohne eigenen Seitenzustand | 15 | 3 | 3 | 2 | **7** |
| **Gesamt** | **29** | **4** | **6** | **3** | **16** |

Paket 2 hat außerdem drei Altmechanismen ersatzlos entfernt, die in keiner der
drei Kategorien geführt wurden: `window.location.reload()`, zwei
`setInterval`-Poll-Schleifen und die simulierte erneute Anmeldung. Paket 3 hat
die Sofortspeicherung bei `change` beseitigt – ebenfalls keine der drei
Kategorien, aber dieselbe Ursache für stille Datenänderungen.

Nicht eingebunden und deshalb nicht Teil des Bestands: `mobile-ui-core.js`,
`mobile-ui-runtime.js`, `organization-type-colors.js`. Sie liegen im
Repository, werden von `index.html` aber nicht geladen.

---

## A. Modale und schwebende Formulare

### A-01 ~~Organisationseinheit anlegen und bearbeiten~~ — in Paket 2 umgestellt

> **Erledigt.** `organization-unit-editor.js` und `organization-unit-editor.css`
> wurden ersatzlos entfernt. An ihre Stelle tritt `openUnitMask()` im
> Anwendungskern: ein Seitenzustand in `#content` mit den Bereichen
> *Einordnung*, *Stammdaten*, *Kontakt* und *Auswirkungen*. Der Neuladevorgang,
> die beiden Poll-Schleifen und die simulierte Anmeldung sind entfallen.
> Sämtliche Felder des früheren Modals sind erhalten geblieben.

Ursprünglicher Befund:

| | |
|---|---|
| **Funktion** | Vollständiges Anlegen und Bearbeiten einer OrgEinheit: Typ, übergeordnete Einheit, Name, Kurzbezeichnung, Standort, Funktionspostfach, Telefon, Status, Beschreibung |
| **Rolle** | Bereichsredaktion, Administrator, Superadministrator |
| **Auslösendes Element** | `#addUnit` („Organisationseinheit anlegen“) und die je Tabellenzeile nachgerüstete Schaltfläche „Vollständig bearbeiten“ |
| **Datei** | `organization-unit-editor.js:144` (`openEditor`) |
| **Darstellungsmechanismus** | `<div class="demo-unit-editor-backdrop">` wird an `document.body` gehängt; darin `<section role="dialog" aria-modal="true">`. **Echtes modales Fenster über dem Inhalt.** |
| **Gespeicherte Daten** | `mw-demo-nodes` |
| **Validierung** | Pflichtfelder Typ, übergeordnete Einheit, Name; Namensdublette auf derselben Ebene; zyklische Zuordnung wird über `descendantsOf` ausgeschlossen. Meldung erscheint gesammelt in einer Zeile am Formularende, nicht am Feld. |
| **Abbruchverhalten** | „Abbrechen“ und „Schließen“ entfernen den Backdrop ersatzlos, **ohne Rückfrage**. |
| **Risiko eines Datenverlusts** | **Hoch.** Kein Schutz vor versehentlichem Verlassen. Nach dem Speichern folgt `window.location.reload()`; die Rückkehr in die Ansicht läuft über `sessionStorage` und zwei Poll-Schleifen (`setInterval`, 50 ms, bis zu 80 Versuche), die eine erneute Anmeldung simulieren. Schlägt eine davon fehl, landet der Nutzer auf der Anmeldeseite. |
| **Empfohlene Zielmaske** | Maske „Organisationseinheit“ mit den Bereichen *Einordnung*, *Stammdaten*, *Kontakt*, *Status* und einem Bestätigungsbereich für das Archivieren. Der Neuladevorgang entfällt. **Paket 2.** |

---

## B. Systemdialoge

| Kennung | Funktion | Rolle | Auslöser | Datei | Mechanismus | Daten | Validierung | Abbruch | Datenverlust | Zielmaske |
|---|---|---|---|---|---|---|---|---|---|---|
| **B-01** | Gespeicherte Organigramm-Ansicht benennen | alle | „Ansicht speichern“ | `orgchart-navigation.js:624` | `window.prompt` | `mw-demo-org-views` | keine – ein leerer Name bricht nur ab | Abbruch verwirft die Eingabe | gering | Maske „Ansicht speichern“ mit Name, Startansicht-Kennzeichen. **Paket 5** |
| **B-02** | Gespeicherte Ansicht löschen | alle | „Löschen“ | `orgchart-navigation.js:667` | `window.confirm` | `mw-demo-org-views` | – | Abbruch bricht ab | gering | Bestätigungsbereich in derselben Maske. **Paket 5** |
| **B-03** | Änderungspaket anlegen | Bereichsredaktion und höher | „Neues Änderungspaket“ | `changeset-demo.js:290` | `prompt` | `mw-demo-changesets`, `mw-demo-changeset-events` | nur „nicht leer“ | Abbruch verwirft | mittel – nur der Titel geht verloren | Maske „Änderungspaket“ mit Titel, Beschreibung, geplantem Gültigkeitsdatum. **Paket 4** |
| **B-04** | Fehlende Begründung bei Ablehnung | Administrator und höher | „Ablehnen“ | `changeset-demo.js:342` | `alert` | – | Begründung ist Pflicht | – | gering | Meldung am Feld „Kommentar“ in der Freigabemaske. **Paket 4** |
| **B-05** | ~~Leitungsfunktion entfernen~~ **(Paket 3: sichtbarer Bestätigungsbereich)** | Bereichsredaktion und höher | „Entfernen“ auf der Mandatskarte | `leadership-overlay.js:384` | `window.confirm` | `mw-demo-leadership-assignments` | – | Abbruch bricht ab | **hoch** – die Auswirkungen auf Stellvertretung und Personalunion werden nicht genannt | **In Paket 3 umgestellt** → Bestätigungsbereich in der Maske „Leitungsfunktion“ mit neun Auswirkungszeilen |
| **B-06** | ~~Unterkategorie löschen~~ | Bereichsredaktion und höher | „Löschen“ in der Zeile | `person-groups.js:476` | `window.confirm` | `mw-demo-person-groups-v1`, `mw-demo-nodes` | – | Abbruch bricht ab | hoch – betroffene Personen wurden nicht genannt | **In Paket 1 umgestellt** → sichtbarer Bestätigungsbereich |
| **B-07** | Demo zurücksetzen | alle | „Demo zurücksetzen“ | `app.js` (`resetBtn`) | `confirm` | alle Schlüssel | – | Abbruch bricht ab | **sehr hoch** – löscht den gesamten lokalen Stand | Bestätigungsbereich in einer Maske „Demo zurücksetzen“ mit Auflistung der betroffenen Bereiche. **Paket 5** |
| **B-08** | ~~Unzulässige Verschiebung im Organigramm~~ **(Paket 2: sichtbarer Hinweis in der Seite)** | Bereichsredaktion und höher | Drag-and-drop einer Karte | `app.js` (`wireNodes`) | `alert` | – | Zyklen und Personen als Ziel werden abgelehnt | – | gering | Meldung als Hinweisstreifen im Organigramm. **Paket 2** |
| **B-09** | Standort anlegen (Name) | Administrator und höher | „Standort hinzufügen“ | `app.js` (`renderLocations`) | `prompt` | `mw-demo-locations` | nur „nicht leer“ | Abbruch verwirft alles | **hoch** – zwei aufeinanderfolgende Dialoge, der Abbruch des zweiten legt trotzdem an | Maske „Standort“ mit Name, Adresse, Status. **Paket 5** |
| **B-10** | Standort anlegen (Adresse) | Administrator und höher | derselbe Ablauf | `app.js` (`renderLocations`) | `prompt` | `mw-demo-locations` | keine – Abbruch ergibt „Keine Adresse“ | – | **hoch** | wie B-09 |
| **B-11** | Zusatzfunktion anlegen (Name) | Administrator und höher | „Funktion hinzufügen“ | `app.js` (`renderFunctions`) | `prompt` | `mw-demo-functions` | nur „nicht leer“ | Abbruch verwirft | hoch | Maske „Zusatzfunktion“ mit Name, Kategorie (Auswahlliste), Symbol. **Paket 5** |
| **B-12** | Zusatzfunktion anlegen (Kategorie) | Administrator und höher | derselbe Ablauf | `app.js` (`renderFunctions`) | `prompt` mit Vorgabe `project` | `mw-demo-functions` | **keine** – jede Eingabe wird übernommen, auch unbekannte Kategorien | – | **hoch** – erzeugt ungültige Kategorien | wie B-11, dort als Auswahlliste |
| **B-13** | ~~Organisationseinheit umbenennen~~ **(Paket 2: über die Maske)** | Bereichsredaktion und höher | „Umbenennen“ in der Tabelle | `app.js` (`renderUnits`) | `prompt` | `mw-demo-nodes` | **keine** – auch Dubletten werden übernommen | Abbruch bricht ab | mittel | entfällt zugunsten der Maske aus A-01. **Paket 2** |

---

## C. Inline-Bearbeitung ohne eigenen Seitenzustand

Gemeinsames Merkmal: Das Formular erscheint innerhalb der Liste, die es
bearbeitet. Es gibt keinen eigenen Seitentitel, keinen erkennbaren Wechsel
zwischen Lesen und Bearbeiten und keine Warnung bei ungespeicherten Änderungen.

| Kennung | Funktion | Rolle | Auslöser | Datei | Mechanismus | Daten | Validierung | Abbruch | Datenverlust | Zielmaske |
|---|---|---|---|---|---|---|---|---|---|---|
| **C-01** | ~~Person anlegen und bearbeiten~~ **(Paket 2: Maske „Person“)** | Bereichsredaktion und höher | „Person anlegen“, „Bearbeiten“ | `app.js` (`personBuilderHtml`, `wirePersonBuilder`) | Baukasten wird über der Tabelle eingeblendet (`personDraft`); die Liste bleibt darunter sichtbar | `mw-demo-nodes` | Pflichtfelder Name, Aufgabe, OrgEinheit; Meldung gesammelt | kein Abbrechen – nur ein Ansichtswechsel, der den Entwurf verwirft | **hoch** | Maske „Person“ mit *Stammdaten*, *Organisatorische Zuordnung*, *Kontakt*, *Zusatzfunktionen*. **Paket 2** |
| **C-02** | ~~Organisationseinheit anlegen (einfach)~~ **(Paket 2: entfallen zugunsten der Maske aus A-01)** | Bereichsredaktion und höher | „Organisationseinheit anlegen“ (Grundvariante) | `app.js` (`unitBuilderHtml`, `wireUnitBuilder`) | Baukasten über der Tabelle (`unitDraft`) | `mw-demo-nodes` | Typ, übergeordnete Einheit, Name | kein Abbrechen | hoch | entfällt zugunsten der Maske aus A-01. **Paket 2** |
| **C-03** | ~~Eigenes Profil bearbeiten~~ **(Paket 2: Maske „Mein Profil“)** | alle | Ansicht „Mein Profil“ | `app.js` (`renderProfile`) | Formular unmittelbar in der Ansicht, Schaltfläche „Profil lokal speichern“ | `mw-demo-profile` | keine | keines | mittel – ein Ansichtswechsel verwirft ohne Hinweis | Maske „Mein Profil“ mit Lese- und Bearbeitungsmodus. **Paket 2** |
| **C-04** | ~~Leitungsfunktion anlegen und bearbeiten~~ **(Paket 3: Maske „Leitungsfunktion“)** | Bereichsredaktion und höher | „Neue Leitungsfunktion“, „Bearbeiten“ | `leadership-overlay.js:311` (`renderForm`) | Formular am Seitenende derselben Ansicht; „Bearbeiten“ füllt es und lässt die Liste stehen | `mw-demo-leadership-assignments` | Pflichtfelder, Zeitraumprüfung, Prüfung auf Doppelmandat; Meldung gesammelt in einer Zeile | „Abbrechen“ nur beim Bearbeiten, kein Hinweis auf Änderungen | **hoch** – der Wechsel der Person im Auswahlfeld setzt das Formular zurück | **In Paket 3 umgestellt** → Maske mit *Person und Organisation*, *Ausübungsart*, *Gültigkeit*, *Ergänzende Angaben* |
| **C-05** | Perspektive „Person“ wechseln | alle | Auswahlfeld | `leadership-overlay.js` | Auswahlfeld mit sofortigem Neuaufbau | – (nur Anzeige) | – | – | keines | bleibt als Filter erhalten |
| **C-06** | Perspektive „OrgEinheit“ wechseln | alle | Auswahlfeld | `leadership-overlay.js` | wie C-05 | – | – | – | keines | bleibt als Filter erhalten |
| **C-07** | ~~Unterkategorie umbenennen~~ | Bereichsredaktion und höher | Eingabefeld in der Zeile | `person-groups.js` | Eingabefeld direkt in der Liste, `change` schreibt sofort | `mw-demo-person-groups-v1` | **keine** | keines – ein Klick daneben speichert | hoch | **In Paket 1 umgestellt** → Maske mit Prüfung |
| **C-08** | ~~Unterkategorie anlegen~~ | Bereichsredaktion und höher | Formular am Seitenende | `person-groups.js` | Formular unterhalb der Liste | `mw-demo-person-groups-v1` | Pflichtfeld und Dublette, Meldung am Formular | keines | mittel | **In Paket 1 umgestellt** → Maske |
| **C-09** | ~~Person einer Unterkategorie zuordnen~~ **(Paket 3: Sammelmaske)** | Bereichsredaktion und höher | Auswahlfeld je Person | `person-groups.js` | Auswahlfeld in der Liste, `change` schreibt sofort | `mw-demo-nodes` | keine | keines | mittel – keine Rückmeldung, kein Rückgängig | **In Paket 3 umgestellt** → Maske „Personen Unterkategorien zuordnen“ mit mitlaufender Zusammenfassung und gesammelter Speicherung |
| **C-10** | Reihenfolge per Pfeiltasten | Bereichsredaktion und höher | „↑“ und „↓“ | `person-groups.js` | Direktaktion, schreibt sofort | `mw-demo-person-groups-v1` | – | keines | gering | bleibt Direktaktion; keine Maske erforderlich |
| **C-11** | Reihenfolge per Drag-and-drop | Bereichsredaktion und höher | Ziehen einer Zeile | `person-groups.js` | Direktaktion, schreibt sofort | `mw-demo-person-groups-v1` | – | keines | gering | bleibt Direktaktion |
| **C-12** | Organisationstyp bearbeiten | Superadministrator | Felder je Typkarte | `platform-admin.js:225` | Eingabefelder direkt auf der Karte, sofortiges Speichern | `mw-demo-organization-types` | keine | keines | mittel | Maske „Organisationstyp“. **Paket 5** |
| **C-13** | Organisationstyp anlegen | Superadministrator | Karte „Neuer Typ“ | `platform-admin.js:244` | Formular zwischen den Karten | `mw-demo-organization-types` | Name ist Pflicht, stille Rückkehr bei Leerwert | keines | mittel | wie C-12 |
| **C-14** | Systemeinstellungen | Superadministrator | Ansicht „System“ | `platform-admin.js:319` | `<form>` unmittelbar in der Ansicht | `mw-demo-system-settings` | HTML-`required`, keine eigene Rückmeldung | „Zurücksetzen“ ohne Rückfrage | mittel | Maske „Systemeinstellungen“ mit *Bezeichnungen*, *Farben*, *Formen*, *Bilder*. **Paket 5** |
| **C-15** | Kommentar zu einer Freigabeentscheidung | Administrator und höher | Textfeld in der Paketansicht | `changeset-demo.js:321` | Textfeld in der Detailansicht, Schaltflächen wirken sofort | `mw-demo-changeset-events` | Begründung nur bei Ablehnung (per `alert`) | keines | mittel | Maske „Freigabeentscheidung“ mit Entscheidung und Begründung. **Paket 4** |
| **C-16** | Benutzerrolle ändern | Administrator und höher | Auswahlfeld je Benutzer | `changeset-demo.js:381` | Auswahlfeld in der Liste, `change` schreibt sofort | `mw-demo-users` | keine | keines | **hoch** – eine Rechteänderung ohne Rückfrage | Maske „Benutzer“ mit Rolle, Status und Bestätigungsbereich für Sperrung. **Paket 5** |
| **C-17** | Kontostatus ändern | Administrator und höher | „Aktivieren“, „Sperren“, „Deaktivieren“ | `changeset-demo.js:388` | Direktaktion, schreibt sofort | `mw-demo-users` | keine | keines | **hoch** | wie C-16 |
| **C-18** | Kartenstil wählen | alle | „Als Demo-Stil wählen“ | `app.js` (`renderStyles`) | Direktaktion | nur Sitzungszustand | – | – | keines | bleibt Direktaktion |
| **C-19** | Standort aktivieren oder deaktivieren | Administrator und höher | Schaltfläche in der Tabelle | `app.js` (`renderLocations`) | Direktaktion, schreibt sofort | `mw-demo-locations` | keine | keines | mittel | Statusfeld in der Maske aus B-09. **Paket 5** |

Die Nummerierung in der Tabelle folgt der Reihenfolge der Durchsicht; C-05,
C-06, C-10, C-11 und C-18 sind reine Anzeige- oder Direktaktionen ohne Formular
und bleiben bewusst erhalten.

---

## Zielarchitektur

Jede Maske ist ein eigener Ansichtszustand in `#content` und wird über
`window.MWEditMask.open(config)` erzeugt. Der Rahmen (`edit-mask.js`) stellt die
fünfzehn geforderten Eigenschaften bereit; das aufrufende Modul liefert nur
Felder, Prüfung und Speicherfunktion.

```js
window.MWEditMask.open({
  id: 'person-group',
  eyebrow: 'Organisation · Unterkategorien',
  title: 'Neue Unterkategorie anlegen',
  description: '…',
  breadcrumb: [{ label: 'Organisation' }, { label: 'Unterkategorien', onSelect: zurueck }, { label: '…' }],
  sections: [{ title: 'Bezeichnung', description: '…', fields: [{ name, label, type, required, hint, maxLength, wide }] }],
  values: { name: '' },
  validate: (values) => ({ name: 'Meldung oder null' }),
  onSave: (values) => true,          // oder { error, field }
  onCancel: zurueck,
  summary: (values) => ({ title, lines: [], empty }),   // mitlaufend, für Sammelmasken
  danger: { title, description, label, question, impact: [], note, confirmLabel, onConfirm },
  dangerOpen: false,                 // Bestätigungsbereich sofort einblenden
})
```

Paket 3 hat den Rahmen um zwei Eigenschaften ergänzt:

* `summary` – eine mitlaufende Zusammenfassung vor dem Speichern. Sie wird bei
  jeder Eingabe nachgeführt und zeigt, was ein Klick auf „Speichern“ bewirken
  würde. Sammelmasken brauchen das; Einzelmasken lassen die Eigenschaft weg.
* `dangerOpen` – blendet den Bestätigungsbereich unmittelbar ein, wenn der
  Einstieg ausdrücklich auf das Entfernen zielt. Der Fokus liegt dabei auf der
  sicheren Vorbelegung „Abbrechen“.

Wichtig: Die Maske schreibt selbst nichts. `onSave` und `onConfirm` rufen die
Speicherfunktionen des jeweiligen Moduls auf, die bereits die Rechteprüfung
tragen. Rollen, Rechte und der Freigabeprozess bleiben dadurch unberührt.

---

## Fortschrittskontrolle

`test/legacy-input-paths.test.js` führt den Bestand maschinenlesbar. Jede noch
offene Stelle steht dort namentlich. Der Test schlägt fehl, wenn

* ein neuer Systemdialog oder ein neues schwebendes Formular hinzukommt,
* eine bereits umgestellte Datei wieder einen Systemdialog verwendet,
* der geführte Bestand großzügiger gesetzt ist als der tatsächliche Stand.

Mit jedem Paket schrumpfen die Listen. Sind sie leer, erzwingt der Test den
Zustand dauerhaft.

---

## Was Paket 2 zusätzlich beseitigt hat

Diese Mechanismen standen in keiner der drei Kategorien, waren aber die
eigentliche Ursache für das Risiko eines Datenverlusts bei A-01:

| Mechanismus | Fundstelle | Ersatz |
|---|---|---|
| `window.location.reload()` nach dem Speichern | `organization-unit-editor.js` | `renderUnits()` baut nur die betroffene Ansicht neu auf |
| `setInterval` (50 ms, bis zu 80 Versuche) zur Wiederherstellung der Anmeldung | `organization-unit-editor.js` | entfällt – die Rolle bleibt erhalten |
| `setInterval` (50 ms, bis zu 80 Versuche) zur Wiederherstellung der Ansicht | `organization-unit-editor.js` | entfällt – die Navigation bleibt erhalten |
| Simulierte erneute Anmeldung über `loginButton.click()` | `organization-unit-editor.js` | entfällt |
| Nachträgliche DOM-Manipulation der Tabelle (`enhanceUnitsView`) | `organization-unit-editor.js` | `renderUnits()` erzeugt die Schaltflächen selbst |
| `alert('Diese Verschiebung ist nicht möglich.')` | `app.js` (`wireNodes`) | `showViewNotice()` – Hinweis mit `role="status"` in der Seite |

`test/legacy-input-paths.test.js` und `test/app-source.test.js` halten diesen
Zustand fest: Der Lauf schlägt fehl, sobald `location.reload`, `setInterval`
oder ein programmgesteuerter Klick auf die Anmeldung zurückkehrt.

---

## Was Paket 3 zusätzlich beseitigt hat

| Mechanismus | Fundstelle | Ersatz |
|---|---|---|
| Formular am Seitenende der Leitungsansicht (`renderForm`) | `leadership-overlay.js` | `openLeadershipMask()` – eigener Seitenzustand in `#content` |
| `window.confirm` beim Entfernen eines Leitungsmandats | `leadership-overlay.js` | sichtbarer Bestätigungsbereich mit neun Auswirkungszeilen |
| Auswahlfeld je Person mit sofortiger Speicherung bei `change` | `person-groups.js` (`assignPerson`) | `openAssignmentMask()` – gesammelte Erfassung, ein Speichervorgang |
| Gesammelte Fehlermeldung in einer Zeile am Formularende | `leadership-overlay.js` | Meldung unmittelbar am betroffenen Feld |
| Stille Ersetzung einer unbekannten Ausübungsart durch `REGULAR` | `leadership-overlay.js` (`normalizeAssignment`) | Prüfung gegen die Rohwerte; unbekannte Kennungen werden abgelehnt |

Zusätzlich wurde eine Bedienschwäche der gemeinsamen Maske behoben, die alle
Masken betraf: Die Zeile für die Feldmeldung stand nur bei einer vorhandenen
Meldung im Layout. Erschien die Meldung erst beim Verlassen des Feldes,
verschob sich alles darunter – auch die Schaltfläche „Speichern“. Ein Klick
unmittelbar nach der Eingabe kam dadurch nicht zustande. Die Zeile bleibt jetzt
dauerhaft im Layout und wird nur visuell ausgeblendet.

---

## Bewusst erhaltene Direktaktionen

Diese Bedienhandlungen bleiben ohne Maske, weil sie keine Formularerfassung
sind, sondern unmittelbare Bedienung:

| Kennung | Funktion | Datei |
|---|---|---|
| C-05 | Perspektivfilter „Person“ | `leadership-overlay.js` |
| C-06 | Perspektivfilter „OrgEinheit“ | `leadership-overlay.js` |
| C-10 | Reihenfolge der Unterkategorien per Pfeiltasten | `person-groups.js` |
| C-11 | Reihenfolge der Unterkategorien per Drag-and-drop | `person-groups.js` |
| C-18 | Kartenstil wählen | `app.js` |
| – | Organigramm-Navigation, Suche und Filter | `orgchart-navigation.js` |

Auch die Auswahl der OrgEinheit in der Ansicht „Unterkategorien“ bleibt ein
Perspektivfilter. Die Sammelmaske übernimmt die dort gewählte OrgEinheit und
weist sie im ersten Bereich aus; ein Wechsel erfolgt in der Liste.
