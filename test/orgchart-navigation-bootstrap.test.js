import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../orgchart-navigation-bootstrap.js', import.meta.url), 'utf8')

const makeContext = () => {
  class NativeMutationObserver {
    constructor(callback) { this.callback = callback }
    observe() {}
    emit(mutations) { this.callback(mutations, this) }
  }
  const window = { MutationObserver: NativeMutationObserver }
  const context = { window }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  return { window, NativeMutationObserver }
}

const target = (internal = false) => ({
  nodeType: 1,
  closest: () => internal ? {} : null,
})

test('filtert interne Navigationsmutationen', () => {
  const { window } = makeContext()
  let calls = 0
  const observer = new window.MutationObserver(() => { calls += 1 })
  observer.emit([{ target: target(true) }])
  assert.equal(calls, 0)
})

test('reicht Änderungen des Organigramms weiter', () => {
  const { window } = makeContext()
  let received = []
  const observer = new window.MutationObserver((mutations) => { received = mutations })
  const external = { target: target(false) }
  observer.emit([{ target: target(true) }, external])
  assert.equal(received.length, 1)
  assert.equal(received[0], external)
})

test('ergänzt CSS.escape als Rückfall', () => {
  const { window } = makeContext()
  assert.equal(window.CSS.escape('a.b'), 'a\\.b')
})

test('installiert den Filter nur einmal', () => {
  const { window } = makeContext()
  const filtered = window.MutationObserver
  const context = { window }
  context.globalThis = context
  vm.createContext(context)
  vm.runInContext(source, context)
  assert.equal(window.MutationObserver, filtered)
})
