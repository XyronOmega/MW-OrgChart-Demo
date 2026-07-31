import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../person-groups.js', import.meta.url), 'utf8')
const api = () => {
  const context = { window: {}, Date, console }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.MWPersonGroups
}
const plain = (value) => JSON.parse(JSON.stringify(value))

test('legt den Systembereich Direkt zugeordnet automatisch an', () => {
  const lib = api()
  const result = lib.ensureDirectGroup([], 'pm')
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'direct:pm')
  assert.equal(result[0].kind, 'DIRECT')
})

test('Unterkategorien folgen der manuell gespeicherten Reihenfolge', () => {
  const lib = api()
  const groups = [
    { id: 'a', orgUnitId: 'pm', name: 'Sachbearbeitung', sortOrder: 10 },
    { id: 'b', orgUnitId: 'pm', name: 'HR Business Partner', sortOrder: 20 },
  ]
  const reordered = lib.reorderGroups(groups, 'pm', ['b', 'direct:pm', 'a'])
  assert.deepEqual(plain(lib.groupsForUnit(reordered, 'pm').map((group) => group.id)), ['b', 'direct:pm', 'a'])
})

test('explizite Nachnamen werden vor dem Vornamen sortiert', () => {
  const lib = api()
  const people = [
    { name: 'Anna Müller', firstName: 'Anna', lastName: 'Müller' },
    { name: 'Bernd Meier', firstName: 'Bernd', lastName: 'Meier' },
    { name: 'Clara Müller', firstName: 'Clara', lastName: 'Müller' },
  ].sort(lib.comparePeopleBySurname)
  assert.deepEqual(plain(people.map((person) => person.name)), ['Bernd Meier', 'Anna Müller', 'Clara Müller'])
})

test('Namenspartikel werden als Teil des Nachnamens erkannt', () => {
  const lib = api()
  assert.deepEqual(plain(lib.surnameParts({ name: 'Daniel von Schamann' })), {
    lastName: 'von Schamann',
    firstName: 'Daniel',
  })
})

test('Umlaute werden deutsch und ohne Groß-/Kleinschreibungszwang sortiert', () => {
  const lib = api()
  const people = [{ name: 'Zoe Zander' }, { name: 'Anna Ächter' }, { name: 'Berta Oehm' }]
    .sort(lib.comparePeopleBySurname)
  assert.deepEqual(plain(people.map((person) => person.name)), ['Anna Ächter', 'Berta Oehm', 'Zoe Zander'])
})

test('aktive Leitungsfunktion in derselben OrgEinheit entfernt die Person aus Mitarbeitenden', () => {
  const lib = api()
  const nodes = [
    { id: 'pm', type: 'department', name: 'Personalmanagement' },
    { id: 'p1', parent: 'pm', type: 'person', name: 'Lea Beispiel' },
    { id: 'p2', parent: 'pm', type: 'person', name: 'Noah Muster' },
  ]
  const assignments = [{ personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Leitung', validFrom: '2026-01-01', validTo: null }]
  const result = lib.groupPeopleForUnit(nodes, [], assignments, 'pm', new Date('2026-07-31T12:00:00'))
  assert.deepEqual(plain(result.leaders.map((person) => person.id)), ['p1'])
  assert.deepEqual(plain(result.groups.flatMap((group) => group.people.map((person) => person.id))), ['p2'])
})

test('Leitungsfunktion in anderer OrgEinheit verändert die Mitarbeitendenanzeige nicht', () => {
  const lib = api()
  const nodes = [{ id: 'p1', parent: 'pm', type: 'person', name: 'Lea Beispiel' }]
  const assignments = [{ personId: 'p1', orgUnitId: 'pa', leadershipRole: 'Leitung', validFrom: '2026-01-01' }]
  const result = lib.groupPeopleForUnit(nodes, [], assignments, 'pm', new Date('2026-07-31T12:00:00'))
  assert.equal(result.leaders.length, 0)
  assert.deepEqual(plain(result.groups.flatMap((group) => group.people.map((person) => person.id))), ['p1'])
})

test('zukünftige Leitungsfunktion blendet die Person noch nicht aus', () => {
  const lib = api()
  const nodes = [{ id: 'p1', parent: 'pm', type: 'person', name: 'Lea Beispiel' }]
  const assignments = [{ personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Leitung', validFrom: '2026-08-01' }]
  const result = lib.groupPeopleForUnit(nodes, [], assignments, 'pm', new Date('2026-07-31T12:00:00'))
  assert.equal(result.memberCount, 1)
})

test('Personen werden ihrer Unterkategorie oder Direkt zugeordnet zugeteilt', () => {
  const lib = api()
  const nodes = [
    { id: 'p1', parent: 'pm', type: 'person', name: 'Anna Alpha', subcategoryId: 'hrbp' },
    { id: 'p2', parent: 'pm', type: 'person', name: 'Berta Beta' },
    { id: 'p3', parent: 'pm', type: 'person', name: 'Clara Gamma', subcategoryId: 'nicht-mehr-vorhanden' },
  ]
  const groups = [{ id: 'hrbp', orgUnitId: 'pm', name: 'HR Business Partner', sortOrder: 10 }]
  const result = lib.groupPeopleForUnit(nodes, groups, [], 'pm')
  const map = Object.fromEntries(result.groups.map((group) => [group.id, group.people.map((person) => person.id)]))
  assert.deepEqual(plain(map.hrbp), ['p1'])
  assert.deepEqual(plain(map['direct:pm']), ['p2', 'p3'])
})

test('Personen innerhalb einer Unterkategorie werden nach Nachname sortiert', () => {
  const lib = api()
  const nodes = [
    { id: 'p1', parent: 'pm', type: 'person', name: 'Anna Zander', subcategoryId: 'group' },
    { id: 'p2', parent: 'pm', type: 'person', name: 'Berta Adler', subcategoryId: 'group' },
  ]
  const result = lib.groupPeopleForUnit(nodes, [{ id: 'group', orgUnitId: 'pm', name: 'Fachbereich', sortOrder: 10 }], [], 'pm')
  assert.deepEqual(plain(result.groups[0].people.map((person) => person.id)), ['p2', 'p1'])
})

test('Löschen einer Kategorie verschiebt betroffene Personen zu Direkt zugeordnet', () => {
  const lib = api()
  const result = lib.removeCategoryAndReassign(
    [{ id: 'hrbp', orgUnitId: 'pm', name: 'HRBP', sortOrder: 10 }],
    [{ id: 'p1', parent: 'pm', type: 'person', subcategoryId: 'hrbp' }],
    'hrbp',
  )
  assert.equal(result.groups.length, 0)
  assert.equal(result.nodes[0].subcategoryId, null)
})

test('Systembereich Direkt zugeordnet kann nicht gelöscht werden', () => {
  const lib = api()
  const groups = [{ id: 'direct:pm', orgUnitId: 'pm', name: 'Direkt zugeordnet', kind: 'DIRECT', sortOrder: 10 }]
  const nodes = [{ id: 'p1', parent: 'pm', type: 'person' }]
  const result = lib.removeCategoryAndReassign(groups, nodes, 'direct:pm')
  assert.equal(result.groups.length, 1)
  assert.equal(result.nodes.length, 1)
})

test('Suchziel einer kompakten Person ist ihre OrgEinheit', () => {
  const lib = api()
  const nodes = [{ id: 'p1', parent: 'pm', type: 'person', name: 'Lea Beispiel' }]
  assert.equal(lib.resolvePersonTarget(nodes, 'p1'), 'pm')
  assert.equal(lib.resolvePersonTarget(nodes, 'unbekannt'), null)
})
