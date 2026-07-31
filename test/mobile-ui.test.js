import test from 'node:test'
import assert from 'node:assert/strict'

await import('../mobile-ui-core.js')
const api = globalThis.MWMobileUI

const nodes = [
  { id: 'root', parent: null, type: 'company', name: 'Unternehmen' },
  { id: 'section', parent: 'root', type: 'section', name: 'Sektion' },
  { id: 'department', parent: 'section', type: 'department', name: 'Abteilung' },
  { id: 'team-b', parent: 'department', type: 'team', name: 'Team B' },
  { id: 'team-a', parent: 'department', type: 'team', name: 'Team A' },
  { id: 'p1', parent: 'department', type: 'person', name: 'Anna Müller', firstName: 'Anna', lastName: 'Müller', subcategoryId: 'g2' },
  { id: 'p2', parent: 'department', type: 'person', name: 'Berta Adler', firstName: 'Berta', lastName: 'Adler', subcategoryId: 'g1' },
  { id: 'p3', parent: 'department', type: 'person', name: 'Clara Zander', firstName: 'Clara', lastName: 'Zander' },
  { id: 'p4', parent: 'team-a', type: 'person', name: 'David Test', firstName: 'David', lastName: 'Test' },
]

const groups = [
  { id: 'g2', orgUnitId: 'department', name: 'Zweite Kategorie', kind: 'CATEGORY', sortOrder: 20 },
  { id: 'direct:department', orgUnitId: 'department', name: 'Direkt zugeordnet', kind: 'DIRECT', sortOrder: 30 },
  { id: 'g1', orgUnitId: 'department', name: 'Erste Kategorie', kind: 'CATEGORY', sortOrder: 10 },
]

const assignments = [
  { personId: 'p2', orgUnitId: 'department', leadershipRole: 'Abteilungsleitung', validFrom: '2026-01-01', validTo: null },
  { personId: 'p1', orgUnitId: 'team-a', leadershipRole: 'Teamleitung', validFrom: '2026-01-01', validTo: null },
]

test('definiert die mobile Grenze bei 780 Pixeln', () => {
  assert.equal(api.MOBILE_MAX_WIDTH, 780)
  assert.equal(api.isMobileWidth(780), true)
  assert.equal(api.isMobileWidth(781), false)
})

test('findet den obersten Organisationsknoten', () => {
  assert.equal(api.rootNode(nodes).id, 'root')
})

test('direkte Untereinheiten enthalten keine Personen und sind alphabetisch sortiert', () => {
  assert.deepEqual(api.directOrgChildren(nodes, 'department').map((node) => node.id), ['team-a', 'team-b'])
})

test('direkte Personen bleiben auf die ausgewählte OrgEinheit begrenzt', () => {
  assert.deepEqual(api.directPeople(nodes, 'department').map((node) => node.id), ['p1', 'p2', 'p3'])
})

test('Organisationspfad reicht vom Unternehmen bis zur aktuellen Einheit', () => {
  assert.deepEqual(api.pathIds(nodes, 'department'), ['root', 'section', 'department'])
})

test('Nachfolger enthalten Untereinheiten und Personen', () => {
  assert.deepEqual(new Set(api.descendantsOf(nodes, 'department').map((node) => node.id)), new Set(['team-a', 'team-b', 'p1', 'p2', 'p3', 'p4']))
})

test('aktive Leitungsfunktion gilt nur innerhalb des Gültigkeitszeitraums', () => {
  assert.equal(api.isAssignmentActive(assignments[0], new Date('2026-07-01')), true)
  assert.equal(api.isAssignmentActive({ ...assignments[0], validFrom: '2027-01-01' }, new Date('2026-07-01')), false)
})

test('Leitung derselben OrgEinheit wird aus den Mitarbeitendengruppen entfernt', () => {
  const result = api.groupPeople(nodes, groups, assignments, 'department', new Date('2026-07-01'))
  assert.deepEqual(result.leaders.map((person) => person.id), ['p2'])
  assert.equal(result.groups.flatMap((group) => group.people).some((person) => person.id === 'p2'), false)
})

test('Leitung in einer anderen OrgEinheit verändert die Mitarbeitendenanzeige nicht', () => {
  const result = api.groupPeople(nodes, groups, assignments, 'department', new Date('2026-07-01'))
  assert.equal(result.groups.flatMap((group) => group.people).some((person) => person.id === 'p1'), true)
})

test('Unterkategorien behalten die manuelle Reihenfolge', () => {
  const result = api.groupPeople(nodes, groups, assignments, 'department', new Date('2026-07-01'))
  assert.deepEqual(result.groups.map((group) => group.id), ['g1', 'g2', 'direct:department'])
})

test('Personen ohne gültige Kategorie landen unter Direkt zugeordnet', () => {
  const result = api.groupPeople(nodes, groups, assignments, 'department', new Date('2026-07-01'))
  const direct = result.groups.find((group) => group.kind === 'DIRECT')
  assert.deepEqual(direct.people.map((person) => person.id), ['p3'])
})

test('mobiles Zweigmodell liefert Pfad, Kinder, Leitung und Gesamtpersonenzahl', () => {
  const model = api.buildBranchModel({ nodes, groups, assignments, unitId: 'department', onDate: new Date('2026-07-01') })
  assert.deepEqual(model.path.map((node) => node.id), ['root', 'section', 'department'])
  assert.deepEqual(model.children.map((node) => node.id), ['team-a', 'team-b'])
  assert.deepEqual(model.leaders.map((person) => person.id), ['p2'])
  assert.equal(model.peopleCount, 4)
})

test('Tabellenzellen erhalten verständliche Ersatzbeschriftungen', () => {
  assert.deepEqual(api.tableLabels(['Name', 'Status'], 3), ['Name', 'Status', 'Spalte 3'])
})
