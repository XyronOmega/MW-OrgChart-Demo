import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Fortschrittskontrolle für die Umstellung auf feste Bearbeitungsmasken.
 *
 * Die verbindliche UX-Vorgabe verbietet für Erfassung und Bearbeitung
 * Systemdialoge (`alert`, `prompt`, `confirm`), modale Fenster, schwebende
 * Formulare und Bearbeitungs-Drawer.
 *
 * Der Bestand wird hier maschinenlesbar geführt. Jeder noch offene Eingabeweg
 * steht namentlich in einer der Listen. Zwei Richtungen werden geprüft:
 *
 *   - Kein neuer Eingabeweg darf hinzukommen (die Listen sind vollständig).
 *   - Kein bereits umgestellter Eingabeweg darf zurückkehren.
 *
 * Mit jedem Maskenpaket schrumpfen die Listen. Sind sie leer, ist die
 * Umstellung abgeschlossen und der Test erzwingt den Zustand dauerhaft.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const read = (name) => readFileSync(join(root, name), 'utf8')

/** Alle ausgelieferten Skripte. */
const shippedScripts = () => {
  const html = read('index.html')
  return [...html.matchAll(/<script src="([^"?]+)/g)].map((match) => match[1])
}

/**
 * Noch offene Systemdialoge, nach Datei und Anzahl.
 * Paket 1 hat `person-groups.js` vollständig davon befreit.
 */
const REMAINING_SYSTEM_DIALOGS = {
  'orgchart-navigation.js': 2, // Ansicht speichern (prompt), Ansicht löschen (confirm)
  'changeset-demo.js': 2, // Paket anlegen (prompt), fehlende Begründung (alert)
  // In Paket 3 entfallen: „Leitungsfunktion entfernen“ (confirm). Deshalb
  // steht leadership-overlay.js nicht mehr im Bestand, sondern unten in der
  // Liste der umgestellten Dateien.
  // app.js: Demo zurücksetzen (confirm), Standort + Adresse (prompt),
  // Funktion + Kategorie (prompt).
  // In Paket 2 entfallen: unzulässige Verschiebung (alert) und
  // Einheit umbenennen (prompt).
  'app.js': 5,
}

/**
 * Noch offene modale beziehungsweise schwebende Bearbeitungsformulare.
 * Leer, seit Paket 2 `organization-unit-editor.js` ersatzlos entfernt hat.
 */
const REMAINING_FLOATING_EDITORS = {}

/** Entfernt Kommentare, damit Beschreibungen nicht als Code zählen. */
const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const countDialogs = (source) => {
  // Zählt alarm/prompt/confirm als Funktionsaufruf, nicht als Wortbestandteil.
  const matches = source.match(/(?<![\w.$])(?:window\s*\.\s*)?(?:alert|prompt|confirm)\s*\(/g)
  return matches ? matches.length : 0
}

describe('Systemdialoge in Erfassung und Bearbeitung', () => {
  test('kein ausgeliefertes Skript verwendet unerfasste Systemdialoge', () => {
    const abweichungen = []
    shippedScripts().forEach((name) => {
      const gefunden = countDialogs(read(name))
      const erwartet = REMAINING_SYSTEM_DIALOGS[name] || 0
      if (gefunden > erwartet) abweichungen.push(`${name}: ${gefunden} statt höchstens ${erwartet}`)
    })
    assert.deepEqual(abweichungen, [], 'Neue Systemdialoge: ' + abweichungen.join(' | '))
  })

  test('bereits umgestellte Dateien bleiben frei von Systemdialogen', () => {
    // person-groups.js wurde im Referenzfall von Paket 1 umgestellt,
    // leadership-overlay.js in Paket 3.
    const umgestellt = ['person-groups.js', 'leadership-overlay.js', 'edit-mask.js', 'roles.js', 'accessibility.js', 'ui-lifecycle.js', 'navigation-shell.js']
    umgestellt.forEach((name) => {
      assert.equal(countDialogs(read(name)), 0, `${name} verwendet wieder einen Systemdialog.`)
    })
  })

  test('der geführte Bestand nennt nur Dateien, die es auch gibt', () => {
    const vorhanden = new Set(readdirSync(root).filter((name) => name.endsWith('.js')))
    Object.keys(REMAINING_SYSTEM_DIALOGS).forEach((name) => {
      assert.ok(vorhanden.has(name), `${name} steht im Bestand, existiert aber nicht mehr.`)
    })
  })

  test('der Bestand ist nicht zu großzügig gesetzt', () => {
    // Steht eine Datei mit einer höheren Zahl im Bestand, als sie tatsächlich
    // enthält, wäre eine Rückkehr unbemerkt möglich.
    const zuHoch = []
    Object.entries(REMAINING_SYSTEM_DIALOGS).forEach(([name, erwartet]) => {
      const gefunden = countDialogs(read(name))
      if (gefunden < erwartet) zuHoch.push(`${name}: nur noch ${gefunden} statt ${erwartet} – Bestand bitte senken`)
    })
    assert.deepEqual(zuHoch, [], zuHoch.join(' | '))
  })
})

describe('Schwebende Bearbeitungsformulare', () => {
  test('nur der bekannte Bestand erzeugt Formulare außerhalb des Inhaltsbereichs', () => {
    const abweichungen = []
    shippedScripts().forEach((name) => {
      const source = read(name)
      // Ein Formular gilt als schwebend, wenn es an document.body gehängt oder
      // als aria-modal ausgezeichnet wird und Eingabefelder enthält.
      const modal = /aria-modal\s*=\s*["']true["']/.test(source)
      const anBody = /document\.body\.(append|appendChild)/.test(source)
      const mitFeldern = /<input|<textarea|<select/.test(source)
      if (!(modal || anBody) || !mitFeldern) return
      const erlaubt = REMAINING_FLOATING_EDITORS[name]
      if (!erlaubt) abweichungen.push(`${name}: modales oder schwebendes Formular ohne Eintrag im Bestand`)
    })
    assert.deepEqual(abweichungen, [], abweichungen.join(' | '))
  })

  test('die gemeinsame Maske hängt sich nicht an document.body', () => {
    const source = read('edit-mask.js')
    assert.ok(!/document\.body\.(append|appendChild)/.test(source),
      'Die Bearbeitungsmaske muss im Hauptinhaltsbereich bleiben.')
    assert.ok(source.includes("getElementById('content')"),
      'Die Bearbeitungsmaske muss in #content rendern.')
  })

  test('person-groups.js erzeugt kein schwebendes Formular mehr', () => {
    const source = read('person-groups.js')
    assert.ok(!/document\.body\.(append|appendChild)/.test(source))
    assert.ok(!/aria-modal/.test(source))
  })
})

describe('Referenzfall ist auf die Maske umgestellt', () => {
  const source = read('person-groups.js')

  test('die Bearbeitung läuft über die gemeinsame Maske', () => {
    assert.ok(source.includes('window.MWEditMask.open('), 'Der Referenzfall öffnet keine Maske.')
  })

  test('das Eingabefeld in der Listenzeile ist entfallen', () => {
    assert.ok(!source.includes('data-person-group-name='),
      'Die Bezeichnung darf nicht mehr direkt in der Liste bearbeitet werden.')
  })

  test('das Formular am Seitenende ist entfallen', () => {
    assert.ok(!source.includes('data-person-group-add'),
      'Das Anlegen darf nicht mehr über ein Formular am Seitenende laufen.')
  })

  test('das Löschen wird nicht mehr über einen Systemdialog bestätigt', () => {
    assert.ok(!source.includes('data-person-group-delete'),
      'Die Löschschaltfläche in der Zeile gehört in den Bestätigungsbereich der Maske.')
    assert.ok(source.includes('confirmLabel'), 'Es fehlt der sichtbare Bestätigungsbereich.')
  })

  test('die Maske wird nur mit Bearbeitungsrecht geöffnet', () => {
    assert.match(source, /openCategoryMask\s*=\s*\([^)]*\)\s*=>\s*\{\s*\n?\s*if\s*\(!canEdit\(\)/,
      'Die Maske muss die Rechteprüfung an erster Stelle führen.')
  })
})

describe('Abgelöste Altmechanismen', () => {
  test('das modale OrgEinheiten-Formular ist entfernt', () => {
    const vorhanden = readdirSync(root).includes('organization-unit-editor.js')
    assert.equal(vorhanden, false, 'organization-unit-editor.js ist zurückgekehrt.')
    assert.ok(!read('index.html').includes('organization-unit-editor'),
      'index.html bindet das entfernte Modul wieder ein.')
  })

  test('kein ausgeliefertes Skript lädt die Seite neu oder pollt', () => {
    const auffaellig = []
    shippedScripts().forEach((name) => {
      const inhalt = withoutComments(read(name))
      if (/location\s*\.\s*reload\s*\(/.test(inhalt)) auffaellig.push(`${name}: location.reload`)
      if (/setInterval\s*\(/.test(inhalt)) auffaellig.push(`${name}: setInterval`)
      if (/loginBtn\s*\.\s*click\s*\(/.test(inhalt)) auffaellig.push(`${name}: simulierte Anmeldung`)
    })
    assert.deepEqual(auffaellig, [], 'Altmechanismen: ' + auffaellig.join(' | '))
  })

  test('Personen und Organisationseinheiten laufen über die Maske', () => {
    const source = withoutComments(read('app.js'))
    assert.ok(source.includes('openPersonMask'), 'Die Personenmaske fehlt.')
    assert.ok(source.includes('openUnitMask'), 'Die Maske für Organisationseinheiten fehlt.')
    assert.ok(source.includes('openProfileMask'), 'Die Profilmaske fehlt.')
    assert.ok(!/data-rename=/.test(source), 'Das Umbenennen per Systemdialog ist zurückgekehrt.')
  })

  test('Leitungsfunktionen laufen über die Maske', () => {
    const source = withoutComments(read('leadership-overlay.js'))
    assert.ok(source.includes('openLeadershipMask'), 'Die Maske für Leitungsfunktionen fehlt.')
    assert.ok(source.includes('window.MWEditMask.open('), 'Die gemeinsame Maske wird nicht verwendet.')
    assert.ok(!/data-leadership-form/.test(source),
      'Das Formular am Seitenende ist zurückgekehrt.')
    assert.ok(!/new FormData\(/.test(source),
      'Die Erfassung läuft wieder über ein eigenes Formular statt über die Maske.')
    assert.ok(source.includes('confirmLabel'), 'Es fehlt der sichtbare Bestätigungsbereich für das Entfernen.')
  })

  test('Personen werden gesammelt zugeordnet, nicht bei jedem change', () => {
    const source = withoutComments(read('person-groups.js'))
    assert.ok(source.includes('openAssignmentMask'), 'Die Sammelmaske für Personenzuordnungen fehlt.')
    assert.ok(source.includes('savePersonAssignments'), 'Die gesammelte Speicherfunktion fehlt.')
    assert.ok(!/data-person-subcategory-person/.test(source),
      'Das Auswahlfeld je Person mit sofortiger Speicherung ist zurückgekehrt.')
    assert.ok(!/const assignPerson\b/.test(source),
      'Die Einzelspeicherung je Person ist zurückgekehrt.')
  })

  test('die Schreibfunktionen prüfen ihr Recht an erster Stelle', () => {
    const stellen = [
      ['leadership-overlay.js', /saveAssignmentValues\s*=\s*\([^)]*\)\s*=>\s*\{\s*\n?\s*if\s*\(!canEdit\(\)/],
      ['leadership-overlay.js', /removeAssignmentById\s*=\s*\([^)]*\)\s*=>\s*\{\s*\n?\s*if\s*\(!canEdit\(\)/],
      ['person-groups.js', /savePersonAssignments\s*=\s*\([^)]*\)\s*=>\s*\{\s*\n?\s*if\s*\(!canEdit\(\)/],
    ]
    stellen.forEach(([name, muster]) => {
      assert.match(withoutComments(read(name)), muster,
        `${name}: Die Rechteprüfung steht nicht an erster Stelle.`)
    })
  })
})
