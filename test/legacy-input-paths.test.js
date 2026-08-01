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
  'leadership-overlay.js': 1, // Leitungsfunktion entfernen (confirm)
  // app.js: Demo zurücksetzen (confirm), unzulässige Verschiebung (alert),
  // Standort + Adresse (prompt), Funktion + Kategorie (prompt),
  // Einheit umbenennen (prompt)
  'app.js': 7,
}

/** Noch offene modale beziehungsweise schwebende Bearbeitungsformulare. */
const REMAINING_FLOATING_EDITORS = {
  'organization-unit-editor.js': ['demo-unit-editor-backdrop'],
}

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
    // person-groups.js wurde im Referenzfall von Paket 1 umgestellt.
    const umgestellt = ['person-groups.js', 'edit-mask.js', 'roles.js', 'accessibility.js', 'ui-lifecycle.js', 'navigation-shell.js']
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
