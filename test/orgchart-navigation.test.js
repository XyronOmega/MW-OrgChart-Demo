import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../orgchart-navigation.js', import.meta.url), 'utf8')

const makeApi = () => {
  const context = { window: {}, console, Date }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.MWOrgchartNavigation
}

const nodes = [
  { id: 'root', parent: null, type: 'company', name: 'Unternehmen' },
  { id: 'gf', parent: 'root', type: 'management', name: 'Geschäftsführung' },
  { id: 'section', parent: 'gf', type: 'section', name: 'Personal und Recht' },
  { id: 'department', parent: 'section', type: 'department', name: 'Personalmanagement' },
  { id: 'team', parent: 'department', type: 'team', name: 'Sachbearbeitung' },
  { id: 'person', parent: 'team', type: 'person', name: 'Mila Demo', role: 'Sachbearbeitung' },
]

const plain = (value) => JSON.parse(JSON.stringify(value))

test('normalisiert Umlaute, ß und Mehrfachleerzeichen', () => {
  const api = makeApi()
  assert.equal(api.normalizeText('  Müller-Straße  '), 'muller-strasse')
})

test('ermittelt den vollständigen Vorfahrenpfad', () => {
  const api = makeApi()
  assert.deepEqual(plain(api.ancestorsOf(nodes, 'person')), ['root', 'gf', 'section', 'department', 'team'])
})

test('ermittelt alle Nachfolger in hierarchischer Reihenfolge', () => {
  const api = makeApi()
  assert.deepEqual(plain(api.descendantsOf(nodes, 'section')), ['department', 'team', 'person'])
})

test('liefert einen lesbaren Organisationspfad', () => {
  const api = makeApi()
  assert.deepEqual(plain(api.pathFor(nodes, 'person')), ['Unternehmen', 'Geschäftsführung', 'Personal und Recht', 'Personalmanagement', 'Sachbearbeitung', 'Mila Demo'])
})

test('startet kompakt mit Unternehmen und Geschäftsführung', () => {
  const api = makeApi()
  assert.deepEqual(plain(api.defaultExpandedIds(nodes)), ['root', 'gf'])
})

test('bewertet exakten Treffer höher als enthaltenes Teilwort', () => {
  const api = makeApi()
  assert.ok(api.scoreText('mila', 'Mila') > api.scoreText('mila', 'Team Mila Nord'))
})

test('findet Teilbegriffe ab drei Zeichen', () => {
  const api = makeApi()
  const entries = api.buildSearchEntries(nodes, [])
  const result = api.searchEntries(entries, 'Mil')
  assert.equal(result[0].id, 'person')
})

test('startet unter drei Zeichen noch keine Suche', () => {
  const api = makeApi()
  const entries = api.buildSearchEntries(nodes, [])
  assert.deepEqual(plain(api.searchEntries(entries, 'Mi')), [])
})

test('findet OrgEinheiten über Teilwortsuche', () => {
  const api = makeApi()
  const entries = api.buildSearchEntries(nodes, [])
  const result = api.searchEntries(entries, 'Pers')
  assert.ok(result.some((entry) => entry.id === 'section'))
  assert.ok(result.some((entry) => entry.id === 'department'))
})

test('findet Personen über ihre Funktion', () => {
  const api = makeApi()
  const entries = api.buildSearchEntries(nodes, [])
  const result = api.searchEntries(entries, 'Sach')
  assert.ok(result.some((entry) => entry.id === 'person' && entry.matchKind === 'function'))
})

test('findet Leitungsfunktionen und Personalunionen', () => {
  const api = makeApi()
  const assignments = [{ personId: 'person', orgUnitId: 'team', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', note: '' }]
  const entries = api.buildSearchEntries(nodes, assignments)
  assert.ok(api.searchEntries(entries, 'Teamleit').some((entry) => entry.id === 'person'))
  assert.ok(api.searchEntries(entries, 'Personalunion').some((entry) => entry.id === 'team'))
})

test('filtert Suchergebnisse nach Personen', () => {
  const api = makeApi()
  const entries = api.buildSearchEntries(nodes, [])
  const result = api.searchEntries(entries, 'Pers', 8, 'people')
  assert.ok(result.every((entry) => entry.targetType === 'person'))
})

test('erkennt einfache Tippfehler', () => {
  const api = makeApi()
  assert.ok(api.scoreText('Milla', 'Mila') > 0)
})

test('begrenzt Zoomwerte einer gespeicherten Ansicht', () => {
  const api = makeApi()
  assert.equal(api.normalizeView({ zoom: 7 }, nodes).zoom, 2)
  assert.equal(api.normalizeView({ zoom: 0.02 }, nodes).zoom, 0.25)
})

test('entfernt unbekannte Knoten aus gespeicherten Ansichten', () => {
  const api = makeApi()
  const view = api.normalizeView({ expandedNodeIds: ['root', 'unknown'], focusNodeId: 'unknown' }, nodes)
  assert.deepEqual(plain(view.expandedNodeIds), ['root'])
  assert.equal(view.focusNodeId, null)
})

test('Levenshtein-Distanz behandelt Einfügen und Ersetzen', () => {
  const api = makeApi()
  assert.equal(api.levenshtein('Mila', 'Milla'), 1)
  assert.equal(api.levenshtein('Mila', 'Mina'), 1)
})
