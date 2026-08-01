/**
 * Einheitentests der Sammelmaske „Personen Unterkategorien zuordnen“ (Paket 3).
 *
 * Die frühere Einzelspeicherung bei jedem `change` ist entfallen. Geprüft
 * werden die fachlichen Regeln, die gesammelte Speicherung, die Rollenrechte
 * und die Trennung von Mitgliedschaft, Unterkategorie und Leitungsmandat.
 */
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../person-groups.js', import.meta.url), 'utf8')

const knoten = [
  { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen' },
  { id: 'pm', parent: 'mw', type: 'department', name: 'Personalmanagement' },
  { id: 'pa', parent: 'mw', type: 'department', name: 'Personaladministration' },
  { id: 'p1', parent: 'pm', type: 'person', name: 'Lea Beispiel', lastName: 'Beispiel', subcategoryId: null },
  { id: 'p2', parent: 'pm', type: 'person', name: 'Noah Muster', lastName: 'Muster', subcategoryId: 'g-recruiting' },
  { id: 'p3', parent: 'pm', type: 'person', name: 'Mila Demo', lastName: 'Demo', subcategoryId: null },
  { id: 'p9', parent: 'pa', type: 'person', name: 'Sofia Test', lastName: 'Test', subcategoryId: null },
]

const gruppen = [
  { id: 'g-recruiting', orgUnitId: 'pm', name: 'Recruiting', kind: 'CATEGORY', sortOrder: 10, active: true },
  { id: 'g-payroll', orgUnitId: 'pm', name: 'Entgelt', kind: 'CATEGORY', sortOrder: 20, active: true },
  { id: 'direct:pm', orgUnitId: 'pm', name: 'Direkt zugeordnet', kind: 'DIRECT', sortOrder: 30, active: true },
  { id: 'g-fremd', orgUnitId: 'pa', name: 'Fremde Kategorie', kind: 'CATEGORY', sortOrder: 10, active: true },
]

/**
 * Umgebung ohne echten Browser. `MWEditMask` ist eine Attrappe, die die
 * übergebene Maskenkonfiguration festhält – damit lässt sich prüfen, welche
 * Felder und Werte die Maske erhält, ohne zu rendern.
 */
const makeContext = ({ rolle = 'admin', nodes = knoten, groups = gruppen, assignments = [] } = {}) => {
  const store = new Map([
    ['mw-demo-nodes', JSON.stringify(nodes)],
    ['mw-demo-person-groups-v1', JSON.stringify(groups)],
    ['mw-demo-leadership-assignments', JSON.stringify(assignments)],
  ])
  const ereignisse = []
  const masken = []
  const roleSelect = { value: rolle }
  const context = {
    window: {
      addEventListener: () => {},
      dispatchEvent: (event) => { ereignisse.push(event.type); return true },
      MWEditMask: {
        open: (config) => { masken.push(config); return true },
        close: () => {},
        isOpen: () => false,
      },
    },
    document: {
      body: {},
      readyState: 'complete',
      getElementById: (id) => (id === 'roleSelect' ? roleSelect : null),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    CustomEvent: class { constructor(type) { this.type = type } },
    MutationObserver: class { observe() {} },
    requestAnimationFrame: (callback) => callback(),
    Date,
    console,
    setTimeout,
    clearTimeout,
  }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return {
    api: context.window.MWPersonGroups,
    masken,
    ereignisse,
    knotenJetzt: () => JSON.parse(store.get('mw-demo-nodes')),
    rohdaten: store,
  }
}

const gleich = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

/** Werte, wie die Maske sie liefert: unverändert für alle drei Personen. */
const ausgangswerte = {
  'person:p1': 'direct:pm',
  'person:p2': 'g-recruiting',
  'person:p3': 'direct:pm',
}

describe('Feldnamen der Sammelmaske', () => {
  test('führen eindeutig auf die Person zurück', () => {
    const { api } = makeContext()
    assert.equal(api.assignmentFieldName('p1'), 'person:p1')
    assert.equal(api.assignmentFieldPerson('person:p1'), 'p1')
    assert.equal(api.assignmentFieldPerson('name'), null, 'Fremde Felder gelten nicht als Zuordnung.')
  })
})

describe('Prüfung der Zuordnungen', () => {
  test('unveränderte Ausgangswerte sind gültig', () => {
    const { api } = makeContext()
    gleich(Object.keys(api.validatePersonAssignments(knoten, gruppen, 'pm', ausgangswerte)), [])
  })

  test('eine Unterkategorie einer anderen OrgEinheit wird abgelehnt', () => {
    const { api } = makeContext()
    const errors = api.validatePersonAssignments(knoten, gruppen, 'pm', {
      ...ausgangswerte, 'person:p1': 'g-fremd',
    })
    assert.match(errors['person:p1'], /gehört nicht zu dieser OrgEinheit/)
  })

  test('eine erfundene Unterkategorie wird abgelehnt', () => {
    const { api } = makeContext()
    const errors = api.validatePersonAssignments(knoten, gruppen, 'pm', {
      ...ausgangswerte, 'person:p2': 'g-gibt-es-nicht',
    })
    assert.match(errors['person:p2'], /gehört nicht zu dieser OrgEinheit/)
  })

  test('eine Person einer anderen OrgEinheit wird abgelehnt', () => {
    const { api } = makeContext()
    const errors = api.validatePersonAssignments(knoten, gruppen, 'pm', {
      ...ausgangswerte, 'person:p9': 'g-recruiting',
    })
    assert.match(errors['person:p9'], /nicht direkt zugeordnet/)
  })

  test('eine unbekannte Person wird abgelehnt', () => {
    const { api } = makeContext()
    const errors = api.validatePersonAssignments(knoten, gruppen, 'pm', {
      ...ausgangswerte, 'person:gibt-es-nicht': 'g-recruiting',
    })
    assert.match(errors['person:gibt-es-nicht'], /nicht vorhanden/)
  })

  test('eine OrgEinheit ist keine zuordenbare Person', () => {
    const { api } = makeContext()
    const errors = api.validatePersonAssignments(knoten, gruppen, 'pm', { 'person:pa': 'g-recruiting' })
    assert.match(errors['person:pa'], /nicht vorhanden/)
  })
})

describe('Zusammenfassung der Änderungen', () => {
  test('unveränderte Personen zählen nicht als Änderung', () => {
    const { api } = makeContext()
    gleich(api.personAssignmentChanges(knoten, gruppen, 'pm', ausgangswerte), [])
  })

  test('nennt bisherige und neue Unterkategorie je Änderung', () => {
    const { api } = makeContext()
    const changes = api.personAssignmentChanges(knoten, gruppen, 'pm', {
      ...ausgangswerte, 'person:p1': 'g-payroll', 'person:p2': 'direct:pm',
    })
    assert.equal(changes.length, 2)
    gleich(changes.map((change) => [change.personName, change.fromName, change.toName]), [
      ['Lea Beispiel', 'Direkt zugeordnet', 'Entgelt'],
      ['Noah Muster', 'Recruiting', 'Direkt zugeordnet'],
    ])
    assert.equal(changes[0].toId, 'g-payroll')
    assert.equal(changes[1].toId, null, '„Direkt zugeordnet“ muss als null gespeichert werden.')
  })
})

describe('Gesammeltes Speichern', () => {
  test('ändert mehrere Personen in einem Vorgang', () => {
    const { api, knotenJetzt, ereignisse } = makeContext()
    const result = api.savePersonAssignments('pm', {
      ...ausgangswerte, 'person:p1': 'g-recruiting', 'person:p3': 'g-payroll',
    })
    assert.equal(result.ok, true)
    assert.equal(result.changed, 2)
    const jetzt = knotenJetzt()
    assert.equal(jetzt.find((node) => node.id === 'p1').subcategoryId, 'g-recruiting')
    assert.equal(jetzt.find((node) => node.id === 'p3').subcategoryId, 'g-payroll')
    assert.ok(ereignisse.includes('mw-demo-nodes-changed'), 'Das Änderungsereignis fehlt.')
  })

  test('„Direkt zugeordnet“ wird als null gespeichert', () => {
    const { api, knotenJetzt } = makeContext()
    const result = api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p2': 'direct:pm' })
    assert.equal(result.ok, true)
    assert.equal(knotenJetzt().find((node) => node.id === 'p2').subcategoryId, null)
  })

  test('ohne Änderung wird nicht gespeichert', () => {
    const { api, rohdaten } = makeContext()
    const vorher = rohdaten.get('mw-demo-nodes')
    const result = api.savePersonAssignments('pm', ausgangswerte)
    assert.match(result.error, /keine Zuordnung geändert/)
    assert.equal(rohdaten.get('mw-demo-nodes'), vorher)
  })

  test('die Mitgliedschaft bleibt unverändert', () => {
    const { api, knotenJetzt } = makeContext()
    api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p1': 'g-payroll' })
    const betroffen = ['p1', 'p2', 'p3', 'p9']
    gleich(
      knotenJetzt().filter((node) => betroffen.includes(node.id)).map((node) => [node.id, node.parent]),
      [['p1', 'pm'], ['p2', 'pm'], ['p3', 'pm'], ['p9', 'pa']],
    )
  })

  test('Leitungsmandate bleiben unverändert', () => {
    const mandate = [{ id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' }]
    const { api, rohdaten } = makeContext({ assignments: mandate })
    const vorher = rohdaten.get('mw-demo-leadership-assignments')
    api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p1': 'g-payroll' })
    assert.equal(rohdaten.get('mw-demo-leadership-assignments'), vorher)
  })

  test('Personen anderer OrgEinheiten bleiben unberührt', () => {
    const { api, knotenJetzt } = makeContext()
    api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p1': 'g-payroll' })
    assert.equal(knotenJetzt().find((node) => node.id === 'p9').subcategoryId, null)
  })

  test('eingeschleuste Angaben werden nicht gespeichert', () => {
    const { api, rohdaten } = makeContext()
    const vorher = rohdaten.get('mw-demo-nodes')
    const result = api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p9': 'g-recruiting' })
    assert.equal(result.field, 'person:p9')
    assert.equal(rohdaten.get('mw-demo-nodes'), vorher)
  })

  test('eine unbekannte OrgEinheit wird abgelehnt', () => {
    const { api } = makeContext()
    assert.match(api.savePersonAssignments('gibt-es-nicht', ausgangswerte).error, /nicht vorhanden/)
  })

  test('eine Person ist keine OrgEinheit', () => {
    const { api } = makeContext()
    assert.match(api.savePersonAssignments('p1', ausgangswerte).error, /nicht vorhanden/)
  })
})

describe('Rollenrechte', () => {
  test('ein Leser kann über die Speicherfunktion nichts schreiben', () => {
    const { api, rohdaten } = makeContext({ rolle: 'viewer' })
    const vorher = rohdaten.get('mw-demo-nodes')
    const result = api.savePersonAssignments('pm', { ...ausgangswerte, 'person:p1': 'g-payroll' })
    assert.match(result.error, /darf Personenzuordnungen nicht ändern/)
    assert.equal(rohdaten.get('mw-demo-nodes'), vorher)
  })

  test('ein Leser erhält die Maske nicht', () => {
    const { api, masken } = makeContext({ rolle: 'viewer' })
    assert.equal(api.openAssignmentMask('pm'), false)
    assert.equal(masken.length, 0)
  })

  test('die Bearbeitungsrolle erhält die Maske', () => {
    const { api, masken } = makeContext({ rolle: 'editor' })
    assert.equal(api.openAssignmentMask('pm'), true)
    assert.equal(masken.length, 1)
  })
})

describe('Aufbau der Maske', () => {
  test('enthält genau die Personen der gewählten OrgEinheit', () => {
    const { api, masken } = makeContext()
    api.openAssignmentMask('pm')
    const felder = masken[0].sections.flatMap((section) => section.fields || [])
    gleich(felder.map((field) => field.name), ['person:p1', 'person:p3', 'person:p2'])
  })

  test('die bestehenden Zuordnungen sind vorbelegt', () => {
    const { api, masken } = makeContext()
    api.openAssignmentMask('pm')
    assert.equal(masken[0].values['person:p2'], 'g-recruiting')
    assert.equal(masken[0].values['person:p1'], 'direct:pm')
  })

  test('bietet nur Unterkategorien dieser OrgEinheit und „Direkt zugeordnet“ an', () => {
    const { api, masken } = makeContext()
    api.openAssignmentMask('pm')
    const feld = masken[0].sections.flatMap((section) => section.fields || [])[0]
    gleich(feld.options.map((option) => option.value), ['g-recruiting', 'g-payroll', 'direct:pm'])
  })

  test('die Zusammenfassung zählt nur echte Änderungen', () => {
    const { api, masken } = makeContext()
    api.openAssignmentMask('pm')
    const summary = masken[0].summary
    assert.equal(summary(ausgangswerte).lines.length, 0)
    assert.equal(summary(ausgangswerte).title, 'Keine Änderung')
    const geaendert = summary({ ...ausgangswerte, 'person:p1': 'g-payroll' })
    assert.equal(geaendert.title, '1 Person wird geändert')
    assert.match(geaendert.lines[0], /Lea Beispiel: „Direkt zugeordnet“ → „Entgelt“/)
  })

  test('weist auf die unveränderte Mitgliedschaft und Leitung hin', () => {
    const { api, masken } = makeContext()
    api.openAssignmentMask('pm')
    const hinweise = masken[0].sections.flatMap((section) => section.notes || []).join(' | ')
    assert.match(hinweise, /Mitgliedschaft\) wird nicht verändert/)
    assert.match(hinweise, /Leitungsmandate bleiben unberührt/)
  })

  test('ohne Personen wird keine Maske geöffnet', () => {
    const { api, masken } = makeContext({
      nodes: knoten.filter((node) => node.type !== 'person' || node.parent !== 'pm'),
    })
    assert.equal(api.openAssignmentMask('pm'), false)
    assert.equal(masken.length, 0)
  })
})
