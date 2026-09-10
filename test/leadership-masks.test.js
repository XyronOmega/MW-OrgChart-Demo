/**
 * Einheitentests der Leitungsmaske (Paket 3).
 *
 * Geprüft werden die fachlichen Regeln und die schreibenden Funktionen von
 * `leadership-overlay.js`: Prüfung je Feld, Hauptleitungsfunktion, Entfernen,
 * Rollenrechte und die Trennung von Leitung und Mitgliedschaft.
 */
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../leadership-overlay.js', import.meta.url), 'utf8')

/**
 * Baut eine Umgebung ohne echten Browser. `rolle` steuert die Rechteprüfung
 * über `#roleSelect`, genau wie in der Anwendung.
 */
const makeContext = ({ rolle = 'admin', assignments = null, nodes = null } = {}) => {
  const store = new Map()
  if (assignments) store.set('mw-demo-leadership-assignments', JSON.stringify(assignments))
  if (nodes) store.set('mw-demo-nodes', JSON.stringify(nodes))
  const ereignisse = []
  const roleSelect = { value: rolle }
  const document = {
    body: {},
    getElementById: (id) => (id === 'roleSelect' ? roleSelect : null),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
  }
  const context = {
    window: {
      addEventListener: () => {},
      dispatchEvent: (event) => { ereignisse.push(event.type); return true },
    },
    document,
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
    api: context.window.MWLeadershipDemo,
    ereignisse,
    roleSelect,
    gespeichert: () => JSON.parse(store.get('mw-demo-leadership-assignments') || 'null'),
    rohdaten: store,
  }
}

/** Prototypen aus der vm-Umgebung machen deepEqual unbrauchbar. */
const gleich = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

const grundKnoten = [
  { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen' },
  { id: 'pm', parent: 'mw', type: 'department', name: 'Personalmanagement' },
  { id: 'pm-sb', parent: 'pm', type: 'team', name: 'Sachbearbeitung' },
  { id: 'p1', parent: 'pm-sb', type: 'person', name: 'Lea Beispiel' },
  { id: 'p2', parent: 'pm-sb', type: 'person', name: 'Noah Muster' },
]

const mandat = (overrides = {}) => ({
  personId: 'p1',
  orgUnitId: 'pm',
  leadershipRole: 'Abteilungsleitung',
  exerciseType: 'REGULAR',
  validFrom: '2026-01-01',
  validTo: '',
  primaryLeadership: false,
  note: '',
  ...overrides,
})

describe('Prüfung eines Leitungsmandats', () => {
  test('meldet fehlende Pflichtangaben am jeweiligen Feld', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues({}, { assignments: [] })
    assert.match(errors.personId, /Person/)
    assert.match(errors.orgUnitId, /OrgEinheit/)
    assert.match(errors.leadershipRole, /Leitungsfunktion/)
  })

  test('weist eine eingeschleuste, nicht vorhandene Person zurück', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(mandat({ personId: 'gibt-es-nicht' }), {
      assignments: [], nodes: grundKnoten,
    })
    assert.match(errors.personId, /nicht vorhanden/)
  })

  test('weist eine OrgEinheit als Person zurück', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(mandat({ personId: 'pm' }), {
      assignments: [], nodes: grundKnoten,
    })
    assert.match(errors.personId, /keine Person/)
  })

  test('weist eine eingeschleuste, nicht vorhandene OrgEinheit zurück', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(mandat({ orgUnitId: 'unbekannt' }), {
      assignments: [], nodes: grundKnoten,
    })
    assert.match(errors.orgUnitId, /nicht vorhanden/)
  })

  test('eine Person ist keine zulässige OrgEinheit', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(mandat({ orgUnitId: 'p2' }), {
      assignments: [], nodes: grundKnoten,
    })
    assert.match(errors.orgUnitId, /keine OrgEinheit/)
  })

  test('weist eine unbekannte Ausübungsart zurück, statt sie zu ersetzen', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(mandat({ exerciseType: 'CHEF' }), {
      assignments: [], nodes: grundKnoten,
    })
    assert.match(errors.exerciseType, /unbekannt/)
  })

  test('alle fünf Ausübungsarten sind zulässig', () => {
    const { api } = makeContext()
    const arten = ['REGULAR', 'PERSONAL_UNION', 'ACTING', 'DEPUTY', 'FUNCTIONAL']
    gleich(arten.map((art) => api.exerciseTypeLabels[art] !== undefined), arten.map(() => true))
    arten.forEach((exerciseType) => {
      const errors = api.validateAssignmentValues(mandat({ exerciseType }), {
        assignments: [], nodes: grundKnoten,
      })
      assert.equal(errors.exerciseType, undefined, `${exerciseType} wurde abgelehnt.`)
    })
  })

  test('das Enddatum darf nicht vor dem Startdatum liegen', () => {
    const { api } = makeContext()
    const errors = api.validateAssignmentValues(
      mandat({ validFrom: '2026-08-02', validTo: '2026-08-01' }),
      { assignments: [], nodes: grundKnoten },
    )
    assert.match(errors.validTo, /Gültig-bis/)
  })

  test('ein überschneidendes Doppelmandat wird abgelehnt', () => {
    const { api } = makeContext()
    const bestehend = [api.normalizeAssignment({ ...mandat(), id: 'a' })]
    const errors = api.validateAssignmentValues(
      mandat({ leadershipRole: 'abteilungsleitung', validFrom: '2026-06-01' }),
      { assignments: bestehend, nodes: grundKnoten },
    )
    assert.match(errors.leadershipRole, /überschneidender Zeitraum/)
  })

  test('das bearbeitete Mandat gilt nicht als eigene Dublette', () => {
    const { api } = makeContext()
    const bestehend = [api.normalizeAssignment({ ...mandat(), id: 'a' })]
    const errors = api.validateAssignmentValues(mandat({ note: 'neu' }), {
      assignments: bestehend, nodes: grundKnoten, editingId: 'a',
    })
    gleich(Object.keys(errors), [])
  })

  test('dieselbe Person darf verschiedene OrgEinheiten führen', () => {
    const { api } = makeContext()
    const bestehend = [api.normalizeAssignment({ ...mandat(), id: 'a' })]
    const errors = api.validateAssignmentValues(
      mandat({ orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION' }),
      { assignments: bestehend, nodes: grundKnoten },
    )
    gleich(Object.keys(errors), [])
  })
})

describe('Hauptleitungsfunktion', () => {
  test('nennt das Mandat, das zurückgestuft würde', () => {
    const { api } = makeContext()
    const liste = [
      api.normalizeAssignment({ ...mandat(), id: 'a', primaryLeadership: true }),
      api.normalizeAssignment({ ...mandat(), id: 'b', orgUnitId: 'pm-sb', primaryLeadership: false }),
    ]
    assert.equal(api.primaryAssignmentFor(liste, 'p1')?.id, 'a')
    assert.equal(api.primaryAssignmentFor(liste, 'p1', 'a'), null)
    assert.equal(api.primaryAssignmentFor(liste, 'p2'), null)
  })

  test('das Speichern stuft zurück, löscht aber nichts', () => {
    const bestehend = [
      { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    ]
    const { api, gespeichert } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const result = api.saveAssignmentValues(
      mandat({ orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', primaryLeadership: true }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.demoted.id, 'a')
    const liste = gespeichert()
    assert.equal(liste.length, 2, 'Das bisherige Hauptmandat wurde gelöscht statt zurückgestuft.')
    assert.equal(liste.find((entry) => entry.id === 'a').primaryLeadership, false)
    assert.equal(liste.filter((entry) => entry.personId === 'p1' && entry.primaryLeadership).length, 1)
  })

  test('eine Hauptleitungsfunktion einer anderen Person bleibt unberührt', () => {
    const bestehend = [
      { id: 'a', personId: 'p2', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    ]
    const { api, gespeichert } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const result = api.saveAssignmentValues(
      mandat({ orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', primaryLeadership: true }),
    )
    assert.equal(result.ok, true)
    assert.equal(result.demoted, null)
    assert.equal(gespeichert().find((entry) => entry.id === 'a').primaryLeadership, true)
  })
})

describe('Speichern und Entfernen', () => {
  test('legt ein Mandat an und meldet die Änderung', () => {
    const { api, ereignisse, gespeichert } = makeContext({ assignments: [], nodes: grundKnoten })
    const result = api.saveAssignmentValues(mandat({ exerciseType: 'ACTING' }))
    assert.equal(result.ok, true)
    assert.equal(gespeichert().length, 1)
    assert.equal(gespeichert()[0].exerciseType, 'ACTING')
    assert.ok(ereignisse.includes('mw-demo-leadership-changed'), 'Das Änderungsereignis fehlt.')
  })

  test('bearbeitet ein bestehendes Mandat, ohne es zu duplizieren', () => {
    const bestehend = [
      { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    ]
    const { api, gespeichert } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const result = api.saveAssignmentValues(mandat({ exerciseType: 'DEPUTY', note: 'Vertretung' }), 'a')
    assert.equal(result.ok, true)
    assert.equal(gespeichert().length, 1)
    assert.equal(gespeichert()[0].id, 'a')
    assert.equal(gespeichert()[0].exerciseType, 'DEPUTY')
    assert.equal(gespeichert()[0].note, 'Vertretung')
  })

  test('speichert keine eingeschleusten Werte', () => {
    const { api, gespeichert } = makeContext({ assignments: [], nodes: grundKnoten })
    const result = api.saveAssignmentValues(mandat({ personId: 'boese', exerciseType: 'CHEF' }))
    assert.equal(result.ok, undefined)
    assert.equal(result.field, 'personId')
    gleich(gespeichert(), [], 'Trotz ungültiger Angaben wurde geschrieben.')
  })

  test('entfernt genau ein Mandat und lässt die übrigen bestehen', () => {
    const bestehend = [
      { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
      { id: 'b', personId: 'p1', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    ]
    const { api, gespeichert, ereignisse } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const result = api.removeAssignmentById('a')
    assert.equal(result.ok, true)
    gleich(gespeichert().map((entry) => entry.id), ['b'])
    // Es rückt nichts automatisch nach.
    assert.equal(gespeichert()[0].primaryLeadership, false)
    assert.ok(ereignisse.includes('mw-demo-leadership-changed'))
  })

  test('das Entfernen verändert die Mitgliedschaft nicht', () => {
    const bestehend = [
      { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    ]
    const { api, rohdaten } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const vorher = rohdaten.get('mw-demo-nodes')
    api.removeAssignmentById('a')
    assert.equal(rohdaten.get('mw-demo-nodes'), vorher, 'Die Knoten wurden beim Entfernen verändert.')
  })

  test('ein unbekanntes Mandat wird nicht entfernt', () => {
    const { api } = makeContext({ assignments: [], nodes: grundKnoten })
    const result = api.removeAssignmentById('gibt-es-nicht')
    assert.match(result.error, /nicht mehr vorhanden/)
  })
})

describe('Rollenrechte', () => {
  test('ein Leser kann über die Speicherfunktion nichts schreiben', () => {
    const { api, gespeichert } = makeContext({ rolle: 'viewer', assignments: [], nodes: grundKnoten })
    const result = api.saveAssignmentValues(mandat())
    assert.match(result.error, /darf Leitungsfunktionen nicht bearbeiten/)
    gleich(gespeichert(), [])
  })

  test('ein Leser kann über die Entfernenfunktion nichts löschen', () => {
    const bestehend = [
      { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    ]
    const { api, gespeichert } = makeContext({ rolle: 'viewer', assignments: bestehend, nodes: grundKnoten })
    const result = api.removeAssignmentById('a')
    assert.match(result.error, /darf Leitungsfunktionen nicht bearbeiten/)
    gleich(gespeichert().map((entry) => entry.id), ['a'])
  })

  test('ein Leser erhält keine Maske', () => {
    const { api } = makeContext({ rolle: 'viewer', assignments: [], nodes: grundKnoten })
    assert.equal(api.openLeadershipMask(null), false)
  })

  test('die Bearbeitungsrolle darf schreiben', () => {
    const { api } = makeContext({ rolle: 'editor', assignments: [], nodes: grundKnoten })
    assert.equal(api.saveAssignmentValues(mandat()).ok, true)
  })
})

describe('Auswirkungen beim Entfernen', () => {
  const bestehend = [
    { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'ACTING', validFrom: '2026-01-01', validTo: '2026-12-31', primaryLeadership: true, note: '' },
    { id: 'b', personId: 'p1', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
  ]

  test('nennt alle geforderten Angaben', () => {
    const { api } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const zeilen = api.assignmentImpact(api.loadAssignments().find((entry) => entry.id === 'a')).join(' | ')
    assert.match(zeilen, /Person: Lea Beispiel/)
    assert.match(zeilen, /Organisationseinheit: Personalmanagement/)
    assert.match(zeilen, /Leitungsfunktion: Abteilungsleitung/)
    assert.match(zeilen, /Ausübungsart: Kommissarisch/)
    assert.match(zeilen, /Gültigkeitszeitraum: 01\.01\.2026 – 31\.12\.2026/)
    assert.match(zeilen, /Hauptleitungsfunktion: ja/)
  })

  test('weist auf unveränderte Mitgliedschaft und verbleibende Mandate hin', () => {
    const { api } = makeContext({ assignments: bestehend, nodes: grundKnoten })
    const zeilen = api.assignmentImpact(api.loadAssignments().find((entry) => entry.id === 'a')).join(' | ')
    assert.match(zeilen, /Mitgliedschaft bleibt unverändert/)
    assert.match(zeilen, /Sachbearbeitung/, 'Die Mitgliedschaft der Person wird nicht genannt.')
    assert.match(zeilen, /Andere Leitungsmandate dieser Person bleiben bestehen \(1\)/)
    assert.match(zeilen, /rückt keine andere Leitungsfunktion automatisch/)
  })

  test('ohne weitere Mandate wird das ausdrücklich gesagt', () => {
    const { api } = makeContext({ assignments: [bestehend[1]], nodes: grundKnoten })
    const zeilen = api.assignmentImpact(api.loadAssignments()[0]).join(' | ')
    assert.match(zeilen, /kein weiteres Leitungsmandat/)
    // Ohne Hauptleitungsfunktion entfällt der Hinweis zum Nachrücken.
    assert.doesNotMatch(zeilen, /rückt keine andere Leitungsfunktion/)
  })
})
