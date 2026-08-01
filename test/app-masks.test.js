import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Fachliche Prüfungen der Masken für Personen und Organisationseinheiten.
 *
 * `app.js` erwartet beim Laden ein Dokument. Für die reinen Prüfungen genügt
 * eine minimale Attrappe; geprüft wird ausschließlich `window.MWAppValidation`.
 */

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '..', 'app.js'), 'utf8')

const api = (() => {
  const noop = () => {}
  const element = {
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    hidden: false,
    dataset: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop,
    setAttribute: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: noop,
    append: noop,
    focus: noop,
    click: noop,
  }
  const context = {
    document: {
      readyState: 'complete',
      getElementById: () => ({ ...element }),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      dispatchEvent: noop,
      createElement: () => ({ ...element }),
      body: { ...element },
    },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    CustomEvent: class { constructor(type) { this.type = type } },
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: noop,
    setTimeout: noop,
    console,
    Date,
    JSON,
    Intl,
  }
  context.window = context
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.MWAppValidation
})()

const einheiten = [
  { id: 'mw', parent: null, type: 'company', organizationTypeId: 'company', name: 'Münchner Wohnen' },
  { id: 'prv', parent: 'mw', type: 'section', organizationTypeId: 'section', name: 'Personal' },
  { id: 'pm', parent: 'prv', type: 'department', organizationTypeId: 'department', name: 'Personalmanagement' },
  { id: 'pa', parent: 'prv', type: 'department', organizationTypeId: 'department', name: 'Personaladministration' },
  { id: 'pm-hrbp', parent: 'pm', type: 'team', organizationTypeId: 'team', name: 'HR Business Partner' },
  { id: 'p1', parent: 'pm-hrbp', type: 'person', name: 'Lea Beispiel', email: 'lea@example.org' },
]

const typen = [
  { id: 'company', label: 'Unternehmen', baseType: 'company', active: true },
  { id: 'section', label: 'Sektion', baseType: 'section', active: true },
  { id: 'department', label: 'Abteilung', baseType: 'department', active: true },
  { id: 'team', label: 'Team', baseType: 'team', active: true },
]

const gruppen = [
  { id: 'direct:pm', orgUnitId: 'pm', kind: 'DIRECT', name: 'Direkt zugeordnet' },
  { id: 'g1', orgUnitId: 'pm', kind: 'CATEGORY', name: 'Recruiting' },
  { id: 'g2', orgUnitId: 'pa', kind: 'CATEGORY', name: 'Entgelt' },
]

const person = (overrides = {}) => ({
  id: 'p-neu',
  firstName: 'Mara',
  lastName: 'Neubauer',
  role: 'Sachbearbeitung',
  status: 'Aktiv',
  parent: 'pm',
  subcategoryId: '',
  email: '',
  phone: '',
  mobile: '',
  location: '',
  ...overrides,
})

const einheit = (overrides = {}) => ({
  id: 'unit-neu',
  organizationTypeId: 'team',
  parent: 'pm',
  name: 'Neues Team',
  shortName: '',
  isActive: true,
  description: '',
  email: '',
  phone: '',
  location: '',
  ...overrides,
})

/** Werte aus dem vm-Kontext haben eigene Prototypen; daher struktureller Vergleich. */
const assertSame = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

const pruefePerson = (values, editingId = null) =>
  api.validatePersonValues(values, { nodes: einheiten, groups: gruppen, editingId })

const pruefeEinheit = (values, editingId = null) =>
  api.validateUnitValues(values, { nodes: einheiten, types: typen, editingId })

describe('Personenmaske: Pflichtangaben', () => {
  test('gültige Angaben erzeugen keine Meldung', () => {
    assert.deepEqual(Object.keys(pruefePerson(person())), [])
  })

  test('Vorname ist erforderlich', () => {
    assert.match(pruefePerson(person({ firstName: '  ' })).firstName, /Vornamen/)
  })

  test('Nachname ist erforderlich', () => {
    assert.match(pruefePerson(person({ lastName: '' })).lastName, /Nachnamen/)
  })

  test('die Stellenbezeichnung ist erforderlich', () => {
    assert.match(pruefePerson(person({ role: '' })).role, /Stellenbezeichnung/)
  })

  test('ein unbekannter Beschäftigungsstatus wird abgelehnt', () => {
    assert.ok(pruefePerson(person({ status: 'Erfunden' })).status)
    assert.equal(pruefePerson(person({ status: 'Elternzeit' })).status, undefined)
  })
})

describe('Personenmaske: Kennung', () => {
  test('eine leere Kennung wird abgelehnt', () => {
    assert.ok(pruefePerson(person({ id: '' })).id)
  })

  test('eine bereits vergebene Kennung wird abgelehnt', () => {
    assert.match(pruefePerson(person({ id: 'p1' })).id, /bereits vergeben/)
  })

  test('beim Bearbeiten zählt die eigene Kennung nicht als Dublette', () => {
    assert.equal(pruefePerson(person({ id: 'p1' }), 'p1').id, undefined)
  })

  test('auch eine Kennung einer Organisationseinheit ist belegt', () => {
    assert.ok(pruefePerson(person({ id: 'pm' })).id)
  })
})

describe('Personenmaske: E-Mail', () => {
  test('eine leere E-Mail-Adresse ist zulässig', () => {
    assert.equal(pruefePerson(person({ email: '' })).email, undefined)
  })

  test('eine gültige Adresse wird angenommen', () => {
    assert.equal(pruefePerson(person({ email: 'mara.neubauer@example.org' })).email, undefined)
  })

  for (const ungueltig of ['ohne-at', 'zwei@@example.org', 'kein.punkt@example', '@example.org', 'a b@example.org']) {
    test(`„${ungueltig}“ wird abgelehnt`, () => {
      assert.match(pruefePerson(person({ email: ungueltig })).email, /gültige E-Mail/)
    })
  }

  test('eine bereits vergebene Adresse wird abgelehnt', () => {
    assert.match(pruefePerson(person({ email: 'LEA@example.org' })).email, /bereits einer anderen Person/)
  })

  test('beim Bearbeiten zählt die eigene Adresse nicht als Dublette', () => {
    assert.equal(pruefePerson(person({ id: 'p1', email: 'lea@example.org' }), 'p1').email, undefined)
  })
})

describe('Personenmaske: organisatorische Zuordnung', () => {
  test('die Organisationseinheit ist erforderlich', () => {
    assert.match(pruefePerson(person({ parent: '' })).parent, /Organisationseinheit/)
  })

  test('eine unbekannte Organisationseinheit wird abgelehnt', () => {
    assert.match(pruefePerson(person({ parent: 'gibtesnicht' })).parent, /besteht nicht/)
  })

  test('eine Person kann nicht als Organisationseinheit dienen', () => {
    assert.match(pruefePerson(person({ parent: 'p1' })).parent, /besteht nicht/)
  })

  test('keine Unterkategorie ist zulässig', () => {
    assert.equal(pruefePerson(person({ subcategoryId: '' })).subcategoryId, undefined)
  })

  test('eine Unterkategorie derselben Einheit ist zulässig', () => {
    assert.equal(pruefePerson(person({ parent: 'pm', subcategoryId: 'g1' })).subcategoryId, undefined)
  })

  test('eine Unterkategorie einer anderen Einheit wird abgelehnt', () => {
    assert.match(
      pruefePerson(person({ parent: 'pm', subcategoryId: 'g2' })).subcategoryId,
      /gehört nicht zur gewählten/,
    )
  })

  test('eine unbekannte Unterkategorie wird abgelehnt', () => {
    assert.match(pruefePerson(person({ subcategoryId: 'gibtesnicht' })).subcategoryId, /besteht nicht/)
  })
})

describe('OrgEinheitenmaske: Pflichtangaben und Typ', () => {
  test('gültige Angaben erzeugen keine Meldung', () => {
    assert.deepEqual(Object.keys(pruefeEinheit(einheit())), [])
  })

  test('die Bezeichnung ist erforderlich', () => {
    assert.match(pruefeEinheit(einheit({ name: '   ' })).name, /Bezeichnung/)
  })

  test('der Organisationstyp ist erforderlich', () => {
    assert.match(pruefeEinheit(einheit({ organizationTypeId: '' })).organizationTypeId, /auswählen/)
  })

  test('ein unbekannter Organisationstyp wird abgelehnt', () => {
    assert.match(pruefeEinheit(einheit({ organizationTypeId: 'phantasie' })).organizationTypeId, /besteht nicht/)
  })

  test('eine unzulässige Einordnung wird abgelehnt', () => {
    // Eine Sektion darf nicht unter einem Team liegen.
    const fehler = pruefeEinheit(einheit({ organizationTypeId: 'section', parent: 'pm-hrbp' }))
    assert.match(fehler.parent, /kann hier nicht eingeordnet werden/)
  })
})

describe('OrgEinheitenmaske: Hierarchie', () => {
  test('die übergeordnete Einheit ist erforderlich', () => {
    assert.match(pruefeEinheit(einheit({ parent: '' })).parent, /übergeordnete/)
  })

  test('die oberste Einheit darf ohne übergeordnete Einheit bleiben', () => {
    assert.equal(
      pruefeEinheit(einheit({ id: 'mw', organizationTypeId: 'company', parent: '', name: 'Münchner Wohnen' }), 'mw')
        .parent,
      undefined,
    )
  })

  test('eine unbekannte übergeordnete Einheit wird abgelehnt', () => {
    assert.match(pruefeEinheit(einheit({ parent: 'gibtesnicht' })).parent, /besteht nicht/)
  })

  test('eine Selbstzuordnung wird abgelehnt', () => {
    assert.match(
      pruefeEinheit(einheit({ id: 'pm', organizationTypeId: 'department', parent: 'pm' }), 'pm').parent,
      /nicht selbst übergeordnet/,
    )
  })

  test('ein Kreis in der Hierarchie wird abgelehnt', () => {
    // „Personal“ unter eine ihrer eigenen Untereinheiten hängen.
    assert.match(
      pruefeEinheit(einheit({ id: 'prv', organizationTypeId: 'section', parent: 'pm-hrbp' }), 'prv').parent,
      /Kreis in der Hierarchie|kann hier nicht eingeordnet/,
    )
  })

  test('ein tief liegender Nachfahre wird ebenfalls erkannt', () => {
    const nachfahren = api.descendantIds(einheiten, 'prv')
    assert.equal(nachfahren.has('pm'), true)
    assert.equal(nachfahren.has('pm-hrbp'), true)
    assert.equal(nachfahren.has('mw'), false)
  })
})

describe('OrgEinheitenmaske: Dubletten', () => {
  test('eine Dublette auf derselben Ebene wird abgelehnt', () => {
    assert.match(pruefeEinheit(einheit({ parent: 'prv', name: 'Personalmanagement' })).name, /bereits eine Einheit/)
  })

  test('Groß- und Kleinschreibung spielt keine Rolle', () => {
    assert.ok(pruefeEinheit(einheit({ parent: 'prv', name: '  personalmanagement ' })).name)
  })

  test('dieselbe Bezeichnung auf einer anderen Ebene ist zulässig', () => {
    assert.equal(pruefeEinheit(einheit({ parent: 'pm', name: 'Personalmanagement' })).name, undefined)
  })

  test('beim Bearbeiten zählt die eigene Bezeichnung nicht als Dublette', () => {
    assert.equal(
      pruefeEinheit(einheit({ id: 'pm', organizationTypeId: 'department', parent: 'prv', name: 'Personalmanagement' }), 'pm')
        .name,
      undefined,
    )
  })

  test('eine ungültige E-Mail-Adresse wird abgelehnt', () => {
    assert.match(pruefeEinheit(einheit({ email: 'kein-postfach' })).email, /gültige E-Mail/)
    assert.equal(pruefeEinheit(einheit({ email: 'team@example.org' })).email, undefined)
  })
})

describe('Auswirkungen einer Änderung', () => {
  const leitungen = [
    { id: 'l1', orgUnitId: 'pm', personId: 'p1', leadershipRole: 'Abteilungsleitung' },
    { id: 'l2', orgUnitId: 'pa', personId: 'p1', leadershipRole: 'Stellvertretung' },
  ]

  test('eine neue Einheit hat noch keine Auswirkungen', () => {
    const zeilen = api.unitImpact(einheiten, leitungen, null)
    assert.equal(zeilen.length, 1)
    assert.match(zeilen[0], /Neue Einheit/)
  })

  test('Untereinheiten, Personen und Leitungen werden benannt', () => {
    const zeilen = api.unitImpact(einheiten, leitungen, 'pm').join(' | ')
    assert.match(zeilen, /HR Business Partner/, 'Die Untereinheit fehlt.')
    assert.match(zeilen, /Abteilungsleitung/, 'Die Leitungszuordnung fehlt.')
    assert.match(zeilen, /1 weitere Person in untergeordneten Einheiten/, 'Mittelbar betroffene Personen fehlen.')
    // Unmittelbar zugeordnete Personen werden namentlich genannt.
    assert.match(api.unitImpact(einheiten, leitungen, 'pm-hrbp').join(' | '), /Lea Beispiel/)
  })

  test('eine Einheit ohne Untereinheiten wird als solche ausgewiesen', () => {
    const zeilen = api.unitImpact(einheiten, [], 'pa').join(' | ')
    assert.match(zeilen, /Keine untergeordneten Einheiten/)
    assert.match(zeilen, /Keine Leitungszuordnung/)
  })

  test('Leitung und Mitgliedschaft bleiben ausdrücklich getrennt', () => {
    assert.match(api.unitImpact(einheiten, leitungen, 'pm').join(' | '), /Leitung und Mitgliedschaft bleiben getrennt/)
  })
})

describe('Zerlegung des Namens', () => {
  test('vorhandene Felder haben Vorrang', () => {
    assertSame(api.splitName({ firstName: 'Lea', lastName: 'Beispiel', name: 'Falsch Falsch' }), {
      firstName: 'Lea',
      lastName: 'Beispiel',
    })
  })

  test('ein zusammengesetzter Name wird zerlegt', () => {
    assertSame(api.splitName({ name: 'Lea Beispiel' }), { firstName: 'Lea', lastName: 'Beispiel' })
  })

  test('Namenszusätze bleiben beim Nachnamen', () => {
    assertSame(api.splitName({ name: 'Anna von der Heide' }), {
      firstName: 'Anna',
      lastName: 'von der Heide',
    })
  })

  test('ein einzelner Name gilt als Nachname', () => {
    assertSame(api.splitName({ name: 'Cher' }), { firstName: '', lastName: 'Cher' })
  })

  test('ein leerer Name ergibt leere Felder', () => {
    assertSame(api.splitName({}), { firstName: '', lastName: '' })
  })
})
