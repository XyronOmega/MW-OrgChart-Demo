import test from 'node:test'
import assert from 'node:assert/strict'

await import('../navigation-shell.js')
const api = globalThis.MWNavigationShell

const descriptor = (text, dataset = {}, options = {}) => ({ text, dataset, ...options })

test('stellt genau vier Hauptbereiche bereit', () => {
  assert.deepEqual(api.groupDefinitions.map((group) => group.id), ['chart', 'organization', 'changes', 'administration'])
})

test('ordnet Organigramm-Ansichten dem Hauptbereich Organigramm zu', () => {
  assert.equal(api.classifyDescriptor(descriptor('Organigramm', { view: 'chart' })), 'chart')
  assert.equal(api.classifyDescriptor(descriptor('Organisationsübersicht')), 'chart')
})

test('ordnet Stammdaten und Leitungsfunktionen der Organisation zu', () => {
  assert.equal(api.classifyDescriptor(descriptor('Personen', { view: 'people' })), 'organization')
  assert.equal(api.classifyDescriptor(descriptor('Leitungsfunktionen', { leadershipView: 'center' })), 'organization')
  assert.equal(api.classifyDescriptor(descriptor('Unterkategorien', { personGroupsView: 'center' })), 'organization')
})

test('ordnet Änderungspakete und Vorschau den Änderungen zu', () => {
  assert.equal(api.classifyDescriptor(descriptor('Änderungspakete', { csView: 'changesets' })), 'changes')
  assert.equal(api.classifyDescriptor(descriptor('Vorschau', { csView: 'preview' })), 'changes')
})

test('ordnet Benutzerverwaltung trotz Changeset-Modul der Administration zu', () => {
  assert.equal(api.classifyDescriptor(descriptor('Benutzerverwaltung', { csView: 'users' })), 'administration')
})

test('ordnet Plattformansichten immer der Administration zu', () => {
  assert.equal(api.classifyDescriptor(descriptor('Organisationstypen', { platformView: 'types' })), 'administration')
  assert.equal(api.classifyDescriptor(descriptor('Darstellung', { platformView: 'settings' })), 'administration')
})

test('erkennt Verwaltungsbegriffe auch ohne Datensatzkennung', () => {
  assert.equal(api.classifyDescriptor(descriptor('Rollen und Berechtigungen')), 'administration')
  assert.equal(api.classifyDescriptor(descriptor('Systemkonfiguration')), 'administration')
})

test('unbekannte fachliche Ansichten fallen sicher in Organisation', () => {
  assert.equal(api.classifyDescriptor(descriptor('Standorte')), 'organization')
})

test('ermittelt verfügbare Bereiche in fester Hauptreihenfolge', () => {
  const result = api.availableGroupIds([
    descriptor('Benutzer', { csView: 'users' }),
    descriptor('Personen', { view: 'people' }),
    descriptor('Organigramm', { view: 'chart' }),
  ])
  assert.deepEqual(result, ['chart', 'organization', 'administration'])
})

test('aktive Unteransicht bestimmt den aktiven Hauptbereich', () => {
  const result = api.resolveActiveGroup([
    descriptor('Organigramm', { view: 'chart' }),
    descriptor('Unterkategorien', { personGroupsView: 'center' }, { active: true }),
  ], 'chart')
  assert.equal(result, 'organization')
})

test('bevorzugter Bereich wird nur verwendet, wenn er verfügbar ist', () => {
  const descriptors = [descriptor('Organigramm', { view: 'chart' }), descriptor('Personen', { view: 'people' })]
  assert.equal(api.resolveActiveGroup(descriptors, 'organization'), 'organization')
  assert.equal(api.resolveActiveGroup(descriptors, 'administration'), 'chart')
})

test('Datensatzkennung erzeugt einen stabilen Unteransichtsschlüssel', () => {
  assert.equal(api.descriptorKey(descriptor('Beliebiger Text', { csView: 'preview' })), 'preview')
  assert.equal(api.descriptorKey(descriptor('Leitungsfunktionen')), 'leitungsfunktionen')
})
