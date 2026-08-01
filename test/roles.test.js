import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(join(here, '..', name), 'utf8')

/** Werte aus dem vm-Kontext haben eigene Prototypen; daher struktureller Vergleich. */
const assertSame = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

/** Lädt roles.js in einem eigenen Kontext, optional mit einem Ersatz-Dokument. */
const loadRoles = (document = undefined) => {
  const context = { console, Object, String, Array }
  context.globalThis = context
  if (document) context.document = document
  vm.createContext(context)
  vm.runInContext(read('roles.js'), context)
  return context.globalThis.MWRoles
}

/** Minimales Dokument mit den beiden Elementen, die die Rolle anzeigen. */
const fakeDocument = ({ select = null, header = null } = {}) => ({
  getElementById(id) {
    if (id === 'roleSelect') return select === null ? null : { value: select }
    if (id === 'userRole') return header === null ? null : { textContent: header }
    return null
  },
})

describe('Rollenvokabular', () => {
  test('kennt die vier Rollen der Demo in fester Reihenfolge', () => {
    assertSame(loadRoles().ROLE_ORDER, ['viewer', 'editor', 'admin', 'superadmin'])
  })

  test('führt genau eine Beschriftung je Rolle', () => {
    assertSame(loadRoles().labels, {
      viewer: 'Leser',
      editor: 'Bereichsredaktion',
      admin: 'Administrator',
      superadmin: 'Superadministrator',
    })
  })

  test('führt genau einen Demo-Namen je Rolle', () => {
    assertSame(loadRoles().demoPersons, {
      viewer: 'Alex Beispiel',
      editor: 'Mika Muster',
      admin: 'Robin Demo',
      superadmin: 'Sam Test',
    })
  })
})

describe('Auflösung einer Rollenangabe', () => {
  test('erkennt die Kennung unverändert', () => {
    const api = loadRoles()
    assert.equal(api.normalize('editor'), 'editor')
    assert.equal(api.normalize('SUPERADMIN'), 'superadmin')
  })

  test('erkennt die deutsche Beschriftung', () => {
    const api = loadRoles()
    assert.equal(api.normalize('Leser'), 'viewer')
    assert.equal(api.normalize('Bereichsredaktion'), 'editor')
    assert.equal(api.normalize('Superadministrator'), 'superadmin')
  })

  test('erkennt den Kopfzeilentext mit angehängter E-Mail-Adresse', () => {
    const api = loadRoles()
    assert.equal(api.normalize('Superadministrator · sam.test@example.org'), 'superadmin')
    assert.equal(api.normalize('Administrator · robin.demo@example.org'), 'admin')
  })

  test('unterscheidet Administrator und Superadministrator zuverlässig', () => {
    const api = loadRoles()
    // Die längere Beschriftung gewinnt – sonst würde „Superadministrator“
    // niemals als solcher erkannt.
    assert.equal(api.normalize('Superadministrator'), 'superadmin')
    assert.notEqual(api.normalize('Superadministrator'), 'admin')
  })

  test('gibt bei unbekannter Angabe nichts zurück', () => {
    const api = loadRoles()
    assert.equal(api.normalize('Praktikum'), null)
    assert.equal(api.normalize(''), null)
    assert.equal(api.normalize(undefined), null)
  })
})

describe('Aktive Rolle', () => {
  test('liest die Rolle aus dem Auswahlfeld der Anmeldung', () => {
    const api = loadRoles(fakeDocument({ select: 'admin', header: 'Leser · alex@example.org' }))
    assert.equal(api.currentRoleId(), 'admin')
  })

  test('weicht auf die Kopfzeile aus, wenn das Auswahlfeld fehlt', () => {
    const api = loadRoles(fakeDocument({ select: null, header: 'Superadministrator · sam.test@example.org' }))
    assert.equal(api.currentRoleId(), 'superadmin')
  })

  test('fällt auf die geringstberechtigte Rolle zurück', () => {
    assert.equal(loadRoles(fakeDocument({})).currentRoleId(), 'viewer')
    assert.equal(loadRoles().currentRoleId(), 'viewer')
  })
})

describe('Rechte', () => {
  /**
   * Vor dieser Zusammenführung prüften `leadership-overlay.js` und
   * `person-groups.js` gegen die feste Liste editor/admin/superadmin. Das
   * Verhalten darf sich nicht geändert haben.
   */
  test('das Bearbeitungsrecht entspricht der bisherigen Rollenliste', () => {
    const api = loadRoles()
    const bisher = ['editor', 'admin', 'superadmin']
    api.ROLE_ORDER.forEach((role) => {
      assert.equal(api.canEditStructure(role), bisher.includes(role), `Rolle ${role}`)
    })
  })

  test('Leser dürfen ausschließlich ansehen und die Vorschau nutzen', () => {
    const api = loadRoles()
    assertSame(api.permissionsFor('viewer'), ['view', 'preview'])
    assert.equal(api.can('create', 'viewer'), false)
    assert.equal(api.can('submit', 'viewer'), false)
    assert.equal(api.can('publish', 'viewer'), false)
    assert.equal(api.can('users', 'viewer'), false)
  })

  test('nur die Superadministration darf zurückrollen', () => {
    const api = loadRoles()
    assert.equal(api.can('rollback', 'superadmin'), true)
    assert.equal(api.can('rollback', 'admin'), false)
  })

  test('erkennt die Superadministration an der Kennung, nicht am Text', () => {
    const api = loadRoles()
    assert.equal(api.isSuperadmin('superadmin'), true)
    assert.equal(api.isSuperadmin('admin'), false)
    // Der zuvor in platform-admin.js verwendete Ausdruck /superadmin/i hätte
    // bei einer geänderten Beschriftung stillschweigend Rechte entzogen.
    assert.equal(api.isSuperadmin('Superadministrator'), true)
  })

  test('unbekannte Rollen erhalten keine Rechte über den Leser hinaus', () => {
    const api = loadRoles()
    assertSame(api.permissionsFor('unbekannt'), ['view', 'preview'])
    assert.equal(api.canEditStructure('unbekannt'), false)
  })
})

/** Minimale Browser-Attrappe, wie sie changeset-demo.js beim Laden erwartet. */
const changesetContext = () => {
  const noop = () => {}
  const context = {
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    document: {
      readyState: 'complete',
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      createElement: () => ({ dataset: {}, addEventListener: noop, classList: { add: noop, remove: noop } }),
    },
    MutationObserver: class { observe() {} disconnect() {} },
    console,
  }
  context.window = context
  context.globalThis = context
  vm.createContext(context)
  return context
}

describe('Abgleich mit den übrigen Modulen', () => {
  test('changeset-demo.js verwendet dieselben Rechte', () => {
    const api = loadRoles()
    const context = changesetContext()
    vm.runInContext(read('changeset-demo.js'), context)
    assertSame(context.window.MWChangesetDemo.rolePermissions, api.permissions)
  })

  test('changeset-demo.js übernimmt die Rechte aus roles.js, wenn es geladen ist', () => {
    const context = changesetContext()
    vm.runInContext(read('roles.js'), context)
    vm.runInContext(read('changeset-demo.js'), context)
    assert.equal(context.window.MWChangesetDemo.rolePermissions, context.globalThis.MWRoles.permissions)
  })

  /**
   * app.js führt die Rollendefinition der Demo. Der Test stellt sicher, dass
   * Kennungen, Beschriftungen und Demo-Namen nicht auseinanderlaufen.
   *
   * Seit app.js als lesbarer Quelltext geführt wird, entfällt das Entpacken.
   */
  test('die Rollenbezeichnungen stimmen mit app.js überein', () => {
    const body = /const roles = \{(.*?)\n\s*\};\s*\n\s*const navItems/s.exec(read('app.js'))?.[1]
    assert.ok(body, 'Die Rollendefinition wurde in app.js nicht gefunden.')

    const gefunden = {}
    const namen = {}
    for (const match of body.matchAll(/(\w+):\s*\{\s*label:\s*'([^']+)',\s*name:\s*'([^']+)'/g)) {
      gefunden[match[1]] = match[2]
      namen[match[1]] = match[3]
    }
    const api = loadRoles()
    assertSame(Object.keys(gefunden).sort(), [...api.ROLE_ORDER].sort(), 'Rollenkennungen sind auseinandergelaufen.')
    assertSame(gefunden, api.labels, 'Rollenbeschriftungen sind auseinandergelaufen.')
    assertSame(namen, api.demoPersons, 'Demo-Namen sind auseinandergelaufen.')
  })
})
