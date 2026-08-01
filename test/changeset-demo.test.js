import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

/**
 * Lädt changeset-demo.js in einer minimalen Browser-Attrappe und prüft die
 * reine Logik über die exportierte Testschnittstelle. Es werden weder ein
 * echtes DOM noch Netzwerkzugriffe benötigt.
 */

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '..', 'changeset-demo.js'), 'utf8')

const loadModule = (role = 'admin') => {
  const store = new Map()
  const noop = () => {}
  const element = { value: role, addEventListener: noop, classList: { add: noop, remove: noop }, querySelectorAll: () => [], querySelector: () => null, appendChild: noop, dataset: {}, children: [] }
  const sandbox = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    document: {
      readyState: 'complete',
      getElementById: (id) => (id === 'roleSelect' ? element : null),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      createElement: () => ({ dataset: {}, addEventListener: noop, classList: { add: noop, remove: noop } }),
    },
    MutationObserver: class { observe() {} disconnect() {} },
    console,
  }
  sandbox.window = sandbox
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox)
  return { api: sandbox.window.MWChangesetDemo, store, setRole: (next) => { element.value = next } }
}

/** Werte aus dem vm-Kontext haben eigene Prototypen; daher struktureller Vergleich. */
const assertSame = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

let mod
beforeEach(() => { mod = loadModule() })

const changeSet = (overrides = {}) => ({
  id: 'cs', title: 'Paket', status: 'DRAFT', validFrom: '2026-09-01',
  createdBy: 'editor', submittedBy: null, reviewedBy: null, publishedBy: null, scheduledAt: null,
  ...overrides,
})

describe('Rollen und Rechte', () => {
  test('Leser dürfen nur ansehen und die Vorschau nutzen', () => {
    assertSame(mod.api.rolePermissions.viewer, ['view', 'preview'])
  })

  test('Bereichsredaktion darf anlegen und einreichen, aber nicht prüfen', () => {
    const permissions = mod.api.rolePermissions.editor
    assert.ok(permissions.includes('submit'))
    assert.ok(!permissions.includes('review'))
    assert.ok(!permissions.includes('publish'))
  })

  test('Administration darf prüfen und veröffentlichen, aber nicht zurückrollen', () => {
    const permissions = mod.api.rolePermissions.admin
    assert.ok(permissions.includes('review'))
    assert.ok(permissions.includes('publish'))
    assert.ok(!permissions.includes('rollback'))
  })

  test('Superadministration darf zusätzlich zurückrollen', () => {
    assert.ok(mod.api.rolePermissions.superadmin.includes('rollback'))
  })

  test('nur Administration und Superadministration verwalten Benutzer', () => {
    assert.ok(mod.api.rolePermissions.admin.includes('users'))
    assert.ok(!mod.api.rolePermissions.editor.includes('users'))
  })
})

describe('Workflow-Aktionen', () => {
  test('die verfassende Rolle darf einen Entwurf einreichen', () => {
    assertSame(mod.api.availableActions(changeSet(), 'editor'), ['submit'])
  })

  test('fremde Entwürfe lassen sich nicht einreichen', () => {
    assertSame(mod.api.availableActions(changeSet({ createdBy: 'admin' }), 'editor'), [])
  })

  test('eingereichte Pakete bieten Freigabe und Ablehnung', () => {
    const pending = changeSet({ status: 'PENDING_REVIEW', submittedBy: 'editor' })
    assertSame(mod.api.availableActions(pending, 'admin'), ['approve', 'reject'])
  })

  test('freigegebene Pakete lassen sich veröffentlichen und zurückziehen', () => {
    const actions = mod.api.availableActions(changeSet({ status: 'APPROVED' }), 'admin')
    assert.ok(actions.includes('publish'))
    assert.ok(actions.includes('withdraw'))
  })

  test('terminierte Pakete lassen sich zurückziehen', () => {
    assertSame(mod.api.availableActions(changeSet({ status: 'SCHEDULED' }), 'admin'), ['withdraw'])
  })

  test('nur die Superadministration kann veröffentlichte Pakete zurückrollen', () => {
    const published = changeSet({ status: 'PUBLISHED' })
    assertSame(mod.api.availableActions(published, 'superadmin'), ['rollback'])
    assertSame(mod.api.availableActions(published, 'admin'), [])
  })

  test('abgelehnte Pakete bieten keine Aktion', () => {
    assertSame(mod.api.availableActions(changeSet({ status: 'REJECTED' }), 'superadmin'), [])
  })

  test('jede Aktion hat einen Zielstatus', () => {
    assert.equal(mod.api.statusAfter.submit, 'PENDING_REVIEW')
    assert.equal(mod.api.statusAfter.approve, 'APPROVED')
    assert.equal(mod.api.statusAfter.reject, 'REJECTED')
    assert.equal(mod.api.statusAfter.publish, 'PUBLISHED')
    assert.equal(mod.api.statusAfter.rollback, 'ROLLED_BACK')
  })
})

describe('Vier-Augen-Prinzip', () => {
  test('die einreichende Rolle darf nicht selbst freigeben', () => {
    const own = changeSet({ status: 'PENDING_REVIEW', submittedBy: 'admin' })
    assertSame(mod.api.availableActions(own, 'admin'), [])
  })

  test('fremde Pakete darf dieselbe Rolle freigeben', () => {
    const foreign = changeSet({ status: 'PENDING_REVIEW', submittedBy: 'editor' })
    assertSame(mod.api.availableActions(foreign, 'admin'), ['approve', 'reject'])
  })

  test('die Sperre wird im Klartext begründet', () => {
    const own = changeSet({ status: 'PENDING_REVIEW', submittedBy: 'admin' })
    assert.match(mod.api.reviewBlockReason(own, 'admin'), /Vier-Augen-Prinzip/)
  })

  test('fehlendes Prüfrecht wird gesondert begründet', () => {
    const foreign = changeSet({ status: 'PENDING_REVIEW', submittedBy: 'admin' })
    assert.match(mod.api.reviewBlockReason(foreign, 'editor'), /kein Prüfrecht/)
  })

  test('außerhalb der Prüfung gibt es keine Sperre', () => {
    assert.equal(mod.api.reviewBlockReason(changeSet(), 'admin'), null)
  })
})

describe('Vorschau des geplanten Stands', () => {
  const nodes = () => [
    { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen' },
    { id: 'prv', parent: 'mw', type: 'section', name: 'Personal, Recht und Verwaltung' },
    { id: 'pc', parent: 'prv', type: 'department', name: 'Personalcontrolling' },
    { id: 'pe', parent: 'prv', type: 'department', name: 'Personalentwicklung' },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', name: 'BGSM' },
  ]

  test('nur freigegebene und terminierte Pakete zählen', () => {
    const planned = mod.api.plannedChangeSets(mod.api.defaultChangeSets)
    assertSame(planned.map((entry) => entry.id), ['cs2', 'cs6'])
  })

  test('neue Einheiten werden angelegt', () => {
    const result = mod.api.applyItems(nodes(), mod.api.items.cs2)
    assert.equal(result.find((node) => node.id === 'digital')?.name, 'Digitalisierung')
    assert.equal(result.length, 8)
  })

  test('vorhandene Felder werden geändert, übrige bleiben erhalten', () => {
    const result = mod.api.applyItems(nodes(), mod.api.items.cs4)
    const updated = result.find((node) => node.id === 'pc')
    assert.equal(updated.name, 'Personalcontrolling und Reporting')
    assert.equal(updated.parent, 'prv')
  })

  test('Verlagerungen ändern die übergeordnete Einheit', () => {
    const result = mod.api.applyItems(nodes(), mod.api.items.cs6)
    assert.equal(result.find((node) => node.id === 'pc-bgsm').parent, 'pe')
  })

  test('gelöschte Einheiten nehmen verwaiste Nachfolger mit', () => {
    const result = mod.api.applyItems(nodes(), [{ entityId: 'pc', operation: 'DELETE' }])
    assertSame(result.map((node) => node.id), ['mw', 'prv', 'pe'])
  })

  test('die Eingabeliste bleibt unverändert', () => {
    const original = nodes()
    mod.api.applyItems(original, mod.api.items.cs4)
    assert.equal(original.find((node) => node.id === 'pc').name, 'Personalcontrolling')
  })

  test('alle geplanten Pakete werden nacheinander angewendet', () => {
    const planned = mod.api.buildPlanned(nodes(), mod.api.defaultChangeSets)
    assert.ok(planned.some((node) => node.id === 'digital'))
    assert.equal(planned.find((node) => node.id === 'pc-bgsm').parent, 'pe')
  })

  test('ohne geplante Pakete bleibt der Stand unverändert', () => {
    const planned = mod.api.buildPlanned(nodes(), [changeSet({ status: 'DRAFT' })])
    assert.equal(planned.length, 5)
  })
})

describe('Vergleich', () => {
  const current = [{ id: 'a', parent: null, name: 'Alpha' }, { id: 'b', parent: 'a', name: 'Beta' }]

  test('neue Einträge werden erkannt', () => {
    const planned = [...current, { id: 'c', parent: 'a', name: 'Gamma' }]
    const [entry] = mod.api.diff(current, planned)
    assert.equal(entry.operation, 'CREATE')
    assert.equal(entry.id, 'c')
  })

  test('entfernte Einträge werden erkannt', () => {
    const [entry] = mod.api.diff(current, [current[0]])
    assert.equal(entry.operation, 'DELETE')
    assert.equal(entry.id, 'b')
  })

  test('geänderte Felder werden mit Vorher und Nachher ausgewiesen', () => {
    const planned = current.map((node) => (node.id === 'b' ? { ...node, name: 'Beta neu' } : node))
    const [entry] = mod.api.diff(current, planned)
    assert.equal(entry.operation, 'UPDATE')
    assertSame(entry.fields, [{ field: 'name', before: 'Beta', after: 'Beta neu' }])
  })

  test('identische Stände ergeben keine Unterschiede', () => {
    assertSame(mod.api.diff(current, current), [])
  })

  test('fehlende Werte erscheinen als Gedankenstrich', () => {
    const planned = [{ id: 'a', parent: null, name: 'Alpha', location: 'Zentrale' }, current[1]]
    const [entry] = mod.api.diff(current, planned)
    assertSame(entry.fields, [{ field: 'location', before: '—', after: 'Zentrale' }])
  })

  test('Unterschiede werden nach Art sortiert', () => {
    const planned = [{ ...current[0], name: 'Alpha neu' }, { id: 'c', parent: 'a', name: 'Gamma' }]
    assertSame(mod.api.diff(current, planned).map((entry) => entry.operation), ['CREATE', 'UPDATE', 'DELETE'])
  })
})

describe('Beispieldaten', () => {
  test('decken mehrere Workflow-Status ab', () => {
    const statuses = new Set(mod.api.defaultChangeSets.map((entry) => entry.status))
    ;['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED'].forEach((status) => {
      assert.ok(statuses.has(status), `Status fehlt: ${status}`)
    })
  })

  test('enthalten zu jedem Paket Positionen', () => {
    mod.api.defaultChangeSets.forEach((entry) => {
      assert.ok((mod.api.items[entry.id] || []).length > 0, `Positionen fehlen: ${entry.id}`)
    })
  })

  test('verweisen ausschließlich auf Beispieladressen', () => {
    const text = JSON.stringify(mod.api.defaultChangeSets) + JSON.stringify(mod.api.items)
    assert.ok(!/@(?!example\.)/.test(text), 'Es dürfen nur example-Adressen vorkommen.')
  })
})

describe('Abgleich mit der Basis-Demo', () => {
  /**
   * app.js liefert die Ausgangsknoten der Demo. Der Test stellt sicher, dass
   * die Rückfallliste im Zusatzmodul dieselben Knoten kennt – sonst zeigte die
   * Vorschau beim ersten Besuch einen falschen Ausgangsstand.
   *
   * Seit app.js als lesbarer Quelltext geführt wird, entfällt das Entpacken.
   */
  test('die Rückfallknoten stimmen mit app.js überein', () => {
    const source = readFileSync(join(here, '..', 'app.js'), 'utf8')
    const body = /const defaultNodes = \[(.*?)\n\s*\];/s.exec(source)?.[1]
    assert.ok(body, 'defaultNodes wurden in app.js nicht gefunden.')

    const appIds = [...body.matchAll(/id: '([^']+)'/g)].map((match) => match[1]).sort()
    const fallbackIds = mod.api.fallbackNodes.map((node) => node.id).sort()
    assertSame(fallbackIds, appIds, 'Rückfallknoten und app.js sind auseinandergelaufen.')
  })

  test('die Positionen verweisen auf vorhandene Knoten', () => {
    const known = new Set(mod.api.fallbackNodes.map((node) => node.id))
    const created = new Set()
    Object.values(mod.api.items).flat().forEach((item) => { if (item.operation === 'CREATE') created.add(item.entityId) })
    Object.values(mod.api.items).flat().forEach((item) => {
      if (item.operation === 'CREATE') return
      assert.ok(known.has(item.entityId) || created.has(item.entityId), `Unbekannter Knoten: ${item.entityId}`)
    })
  })
})
