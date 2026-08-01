import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(join(here, '..', name), 'utf8')

/**
 * Lädt die reinen Anteile der Maskenarchitektur ohne DOM. Das Modul erkennt
 * das fehlende `document` und stellt dann nur `MWEditMaskCore` bereit.
 */
const core = (() => {
  const context = { console, JSON, Object, String, Boolean, Number, Array, Error }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(read('edit-mask.js'), context)
  return context.globalThis.MWEditMaskCore
})()

const sections = [
  {
    title: 'Bezeichnung',
    fields: [
      { name: 'name', label: 'Bezeichnung', type: 'text', required: true },
      { name: 'note', label: 'Hinweis', type: 'textarea' },
      { name: 'active', label: 'Aktiv', type: 'checkbox' },
    ],
  },
  {
    title: 'Einordnung',
    fields: [{ name: 'unit', label: 'OrgEinheit', type: 'select', required: true, options: [] }],
  },
]

describe('Feldsammlung', () => {
  test('führt die Felder aller Bereiche in der Reihenfolge der Bereiche zusammen', () => {
    assert.deepEqual(core.allFields(sections).map((field) => field.name), ['name', 'note', 'active', 'unit'])
  })

  test('erzeugt je Maske und Feld eine eindeutige Kennung', () => {
    assert.equal(core.fieldId('person-group', 'name'), 'mw-mask-person-group-name')
    assert.notEqual(core.fieldId('person-group', 'name'), core.fieldId('unit', 'name'))
  })
})

describe('Werteaufbereitung', () => {
  test('Kontrollkästchen werden zu Wahrheitswerten', () => {
    const field = { type: 'checkbox' }
    assert.equal(core.normalizeValue(field, true), true)
    assert.equal(core.normalizeValue(field, undefined), false)
    assert.equal(core.normalizeValue(field, 'ja'), true)
  })

  test('fehlende Textwerte werden zur leeren Zeichenkette', () => {
    const field = { type: 'text' }
    assert.equal(core.normalizeValue(field, undefined), '')
    assert.equal(core.normalizeValue(field, null), '')
    assert.equal(core.normalizeValue(field, 42), '42')
  })
})

describe('Prüfung der Eingaben', () => {
  test('leere Pflichtfelder werden gemeldet', () => {
    const errors = core.validateValues(sections, { name: '', note: '', active: false, unit: '' })
    assert.equal(errors.name, core.REQUIRED_MESSAGE)
    assert.equal(errors.unit, core.REQUIRED_MESSAGE)
    assert.equal(errors.note, undefined)
  })

  test('Leerzeichen allein erfüllen kein Pflichtfeld', () => {
    const errors = core.validateValues(sections, { name: '   ', unit: 'pm' })
    assert.equal(errors.name, core.REQUIRED_MESSAGE)
    assert.equal(errors.unit, undefined)
  })

  test('ein nicht angehaktes Pflicht-Kontrollkästchen wird gemeldet', () => {
    const pflicht = [{ title: 'x', fields: [{ name: 'ok', label: 'Zustimmung', type: 'checkbox', required: true }] }]
    assert.equal(core.validateValues(pflicht, { ok: false }).ok, core.REQUIRED_MESSAGE)
    assert.equal(core.validateValues(pflicht, { ok: true }).ok, undefined)
  })

  test('eine eigene Meldung ersetzt den Standardtext', () => {
    const eigen = [{ title: 'x', fields: [{ name: 'a', label: 'A', type: 'text', required: true, requiredMessage: 'Bitte A angeben.' }] }]
    assert.equal(core.validateValues(eigen, { a: '' }).a, 'Bitte A angeben.')
  })

  test('die fachliche Prüfung des Moduls kommt hinzu', () => {
    const errors = core.validateValues(sections, { name: 'Recruiting', unit: 'pm' },
      (values) => ({ name: values.name === 'Recruiting' ? 'Bereits vorhanden.' : null }))
    assert.equal(errors.name, 'Bereits vorhanden.')
  })

  test('die fachliche Prüfung überschreibt die Pflichtfeldmeldung nicht mit null', () => {
    const errors = core.validateValues(sections, { name: '', unit: 'pm' }, () => ({ name: null }))
    assert.equal(errors.name, core.REQUIRED_MESSAGE, 'Die Pflichtfeldmeldung darf nicht verloren gehen.')
  })

  test('gültige Angaben erzeugen keine Meldung', () => {
    assert.deepEqual(Object.keys(core.validateValues(sections, { name: 'Recruiting', unit: 'pm' })), [])
  })
})

describe('Erkennung ungespeicherter Änderungen', () => {
  test('gleiche Werte gelten nicht als Änderung', () => {
    assert.equal(core.isChanged({ name: 'A', active: true }, { name: 'A', active: true }), false)
  })

  test('ein geänderter Wert wird erkannt', () => {
    assert.equal(core.isChanged({ name: 'A' }, { name: 'B' }), true)
  })

  test('auch ein zurückgesetztes Feld gilt wieder als unverändert', () => {
    const start = { name: 'A' }
    const jetzt = { name: 'B' }
    assert.equal(core.isChanged(start, jetzt), true)
    jetzt.name = 'A'
    assert.equal(core.isChanged(start, jetzt), false)
  })

  test('Datentypen werden unterschieden', () => {
    assert.equal(core.isChanged({ aktiv: false }, { aktiv: '' }), true)
  })
})

/**
 * Bezeichnungsprüfung des Referenzfalls. Beim Umbenennen fand zuvor überhaupt
 * keine Prüfung statt; jetzt gilt dieselbe Regel wie beim Anlegen.
 */
describe('Referenzfall: Bezeichnung einer Unterkategorie', () => {
  const api = (() => {
    const context = { window: {}, Date, console, JSON, Intl }
    context.globalThis = context
    vm.createContext(context)
    vm.runInContext(read('person-groups.js'), context)
    return context.window.MWPersonGroups
  })()

  const groups = [
    { id: 'direct:pm', orgUnitId: 'pm', name: 'Direkt zugeordnet', kind: 'DIRECT', sortOrder: 10 },
    { id: 'g1', orgUnitId: 'pm', name: 'Recruiting', kind: 'CATEGORY', sortOrder: 20 },
    { id: 'g2', orgUnitId: 'pa', name: 'Recruiting', kind: 'CATEGORY', sortOrder: 10 },
  ]

  test('eine leere Bezeichnung wird abgelehnt', () => {
    assert.match(api.validateCategoryName(groups, 'pm', '   '), /Bezeichnung/)
  })

  test('eine bestehende Bezeichnung derselben OrgEinheit wird abgelehnt', () => {
    assert.match(api.validateCategoryName(groups, 'pm', 'Recruiting'), /bereits/)
  })

  test('die Prüfung ignoriert Groß- und Kleinschreibung sowie Umlautschreibweisen', () => {
    assert.ok(api.validateCategoryName(groups, 'pm', '  recruiting '))
  })

  test('dieselbe Bezeichnung in einer anderen OrgEinheit ist zulässig', () => {
    assert.equal(api.validateCategoryName(groups, 'pe', 'Recruiting'), null)
  })

  test('beim Umbenennen zählt die eigene Bezeichnung nicht als Dublette', () => {
    assert.equal(api.validateCategoryName(groups, 'pm', 'Recruiting', 'g1'), null)
  })

  test('zu lange Bezeichnungen werden abgelehnt', () => {
    assert.match(api.validateCategoryName(groups, 'pm', 'x'.repeat(61)), /60 Zeichen/)
  })

  test('eine gültige neue Bezeichnung wird angenommen', () => {
    assert.equal(api.validateCategoryName(groups, 'pm', 'Onboarding'), null)
  })

  test('die betroffenen Personen einer Unterkategorie werden ermittelt', () => {
    const nodes = [
      { id: 'p1', type: 'person', parent: 'pm', name: 'Lea Beispiel', subcategoryId: 'g1' },
      { id: 'p2', type: 'person', parent: 'pm', name: 'Noah Muster', subcategoryId: null },
      { id: 'p3', type: 'person', parent: 'pa', name: 'Mila Demo', subcategoryId: 'g1' },
    ]
    assert.equal(JSON.stringify(api.peopleInCategory(nodes, groups, 'g1').map((person) => person.name)), '["Lea Beispiel"]')
  })

  test('der Systembereich „Direkt zugeordnet“ hat keine betroffenen Personen', () => {
    assert.equal(api.peopleInCategory([], groups, 'direct:pm').length, 0)
  })
})
