import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../leadership-overlay.js', import.meta.url), 'utf8')

const makeContext = () => {
  const store = new Map()
  const document = {
    body: {},
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
  }
  const context = {
    window: { confirm: () => true },
    document,
    localStorage: {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    MutationObserver: class { observe() {} },
    requestAnimationFrame: (callback) => callback(),
    FormData: class {},
    Date,
    console,
    setTimeout,
    clearTimeout,
  }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.MWLeadershipDemo
}

const plain = (value) => JSON.parse(JSON.stringify(value))

test('liefert ein reichhaltiges Ausgangsmodell mit Personalunion', () => {
  const api = makeContext()
  assert.ok(api.defaultAssignments.length >= 10)
  assert.ok(api.defaultAssignments.some((entry) => entry.exerciseType === 'PERSONAL_UNION'))
  assert.ok(api.defaultAssignments.some((entry) => entry.primaryLeadership))
})

test('normalisiert unbekannte Ausübungsarten auf regulär', () => {
  const api = makeContext()
  const result = api.normalizeAssignment({
    id: 'x',
    personId: 'p1',
    orgUnitId: 'pm',
    leadershipRole: ' Leitung ',
    exerciseType: 'UNKNOWN',
  })
  assert.equal(result.leadershipRole, 'Leitung')
  assert.equal(result.exerciseType, 'REGULAR')
  assert.equal(result.validTo, null)
})

test('erkennt aktive, zukünftige und beendete Mandate', () => {
  const api = makeContext()
  const date = new Date('2026-07-31T12:00:00')
  assert.equal(api.isActive({ validFrom: '2026-01-01', validTo: null }, date), true)
  assert.equal(api.isActive({ validFrom: '2026-08-01', validTo: null }, date), false)
  assert.equal(api.isActive({ validFrom: '2025-01-01', validTo: '2026-07-30' }, date), false)
  assert.equal(api.isActive({ validFrom: '2026-07-31', validTo: '2026-07-31' }, date), true)
})

test('prüft überschneidende Zeiträume einschließlich Randtage', () => {
  const api = makeContext()
  assert.equal(api.rangesOverlap(
    { validFrom: '2026-01-01', validTo: '2026-06-30' },
    { validFrom: '2026-06-30', validTo: '2026-12-31' },
  ), true)
  assert.equal(api.rangesOverlap(
    { validFrom: '2026-01-01', validTo: '2026-06-29' },
    { validFrom: '2026-06-30', validTo: '2026-12-31' },
  ), false)
})

test('verlangt Person, OrgEinheit und Leitungsfunktion', () => {
  const api = makeContext()
  assert.match(api.validateAssignment({}, []), /Person/)
  assert.match(api.validateAssignment({ personId: 'p1' }, []), /OrgEinheit/)
  assert.match(api.validateAssignment({ personId: 'p1', orgUnitId: 'pm' }, []), /Leitungsfunktion/)
})

test('weist einen ungültigen Gültigkeitszeitraum zurück', () => {
  const api = makeContext()
  const error = api.validateAssignment({
    personId: 'p1',
    orgUnitId: 'pm',
    leadershipRole: 'Leitung',
    validFrom: '2026-08-02',
    validTo: '2026-08-01',
  }, [])
  assert.match(error, /Gültig-bis/)
})

test('verhindert doppelte überschneidende Leitungsmandate', () => {
  const api = makeContext()
  const existing = [{
    id: 'a',
    personId: 'p1',
    orgUnitId: 'pm',
    leadershipRole: 'Teamleitung',
    exerciseType: 'REGULAR',
    validFrom: '2026-01-01',
    validTo: null,
  }]
  const error = api.validateAssignment({
    id: 'b',
    personId: 'p1',
    orgUnitId: 'pm',
    leadershipRole: 'teamleitung',
    exerciseType: 'PERSONAL_UNION',
    validFrom: '2026-08-01',
    validTo: null,
  }, existing)
  assert.match(error, /überschneidender Zeitraum/)
})

test('erlaubt mehrere Leitungsfunktionen derselben Person in verschiedenen Einheiten', () => {
  const api = makeContext()
  const existing = [{
    id: 'a',
    personId: 'p1',
    orgUnitId: 'pm',
    leadershipRole: 'Abteilungsleitung',
    exerciseType: 'REGULAR',
    validFrom: '2026-01-01',
    validTo: null,
  }]
  const error = api.validateAssignment({
    id: 'b',
    personId: 'p1',
    orgUnitId: 'pm-sb',
    leadershipRole: 'Teamleitung',
    exerciseType: 'PERSONAL_UNION',
    validFrom: '2026-08-01',
    validTo: null,
  }, existing)
  assert.equal(error, null)
})

test('setzt beim Speichern genau eine Hauptleitungsfunktion je Person', () => {
  const api = makeContext()
  const existing = [
    { id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '', validTo: null, primaryLeadership: true },
    { id: 'b', personId: 'p2', orgUnitId: 'pa', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '', validTo: null, primaryLeadership: true },
  ]
  const result = api.upsertAssignment(existing, {
    id: 'c',
    personId: 'p1',
    orgUnitId: 'pm-sb',
    leadershipRole: 'Teamleitung',
    exerciseType: 'PERSONAL_UNION',
    validFrom: '',
    validTo: null,
    primaryLeadership: true,
  })
  assert.equal(result.find((entry) => entry.id === 'a').primaryLeadership, false)
  assert.equal(result.find((entry) => entry.id === 'b').primaryLeadership, true)
  assert.equal(result.find((entry) => entry.id === 'c').primaryLeadership, true)
})

test('ersetzt einen bestehenden Datensatz statt ihn zu duplizieren', () => {
  const api = makeContext()
  const existing = [{ id: 'a', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Leitung', exerciseType: 'REGULAR', validFrom: '', validTo: null, primaryLeadership: true }]
  const result = api.upsertAssignment(existing, { ...existing[0], leadershipRole: 'Abteilungsleitung' })
  assert.equal(result.length, 1)
  assert.equal(result[0].leadershipRole, 'Abteilungsleitung')
})

test('liefert personenzentrierte Ergebnisse mit Hauptfunktion zuerst', () => {
  const api = makeContext()
  const assignments = [
    { id: 'a', personId: 'p1', orgUnitId: 'team', leadershipRole: 'Teamleitung', validFrom: '2026-01-01', primaryLeadership: false },
    { id: 'b', personId: 'p1', orgUnitId: 'dept', leadershipRole: 'Abteilungsleitung', validFrom: '2026-02-01', primaryLeadership: true },
    { id: 'c', personId: 'p2', orgUnitId: 'other', leadershipRole: 'Leitung', validFrom: '2026-01-01', primaryLeadership: true },
  ]
  assert.deepEqual(plain(api.assignmentsForPerson(assignments, 'p1').map((entry) => entry.id)), ['b', 'a'])
})

test('liefert einheitenzentrierte Ergebnisse getrennt von der Mitgliedschaft', () => {
  const api = makeContext()
  const assignments = [
    { id: 'a', personId: 'p1', orgUnitId: 'team', leadershipRole: 'Teamleitung', primaryLeadership: false },
    { id: 'b', personId: 'p2', orgUnitId: 'team', leadershipRole: 'Stellvertretung', primaryLeadership: false },
    { id: 'c', personId: 'p3', orgUnitId: 'other', leadershipRole: 'Leitung', primaryLeadership: true },
  ]
  assert.deepEqual(plain(api.assignmentsForUnit(assignments, 'team').map((entry) => entry.id)), ['b', 'a'])
})
