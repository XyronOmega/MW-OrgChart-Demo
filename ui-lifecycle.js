/**
 * Zentraler UI-Lebenszyklus der Demo.
 *
 * Hintergrund: Mehrere Module beobachteten zuvor unabhängig voneinander
 * `document.body` mit `{childList, subtree}` und schrieben in ihren
 * Aktualisierungen selbst in den Inhaltsbereich. Jede dieser Schreiboperationen
 * löste die Beobachter aller anderen Module aus – eine gegenseitige
 * Rückkopplung, die den Haupt-Thread dauerhaft beschäftigte.
 *
 * Dieses Modul ersetzt die Einzelbeobachter durch:
 *   - genau einen Beobachter auf eng begrenzten Containern
 *   - eine ruhige Phase, während der die Module selbst schreiben
 *   - ein Verwerfen der dabei entstandenen Mutationen (takeRecords)
 *   - ein Budget gegen unkontrollierte Wiederholungen
 *
 * Die Module behalten ihre eigene Aktualisierungslogik; registriert wird nur,
 * wann sie ausgeführt wird.
 */
(() => {
  if (typeof document === 'undefined') return

  const watchers = []
  let observer = null
  let quiet = false
  let pending = false
  let runs = 0
  let budgetTimer = null
  let stopped = false

  const debug = (() => {
    try { return new URLSearchParams(location.search).has('mwdebug') } catch { return false }
  })()

  const stats = { runs: 0, observerCallbacks: 0, suppressed: 0 }
  const BUDGET = 40

  const runWatchers = () => {
    runs += 1
    stats.runs += 1
    if (runs > BUDGET) {
      if (!stopped) {
        stopped = true
        observer?.disconnect()
        console.warn('[ui-lifecycle] Zu viele Aktualisierungen in Folge – Beobachtung gestoppt.')
      }
      return
    }
    if (!budgetTimer) budgetTimer = setTimeout(() => { runs = 0; budgetTimer = null }, 1000)

    // Ruhige Phase: Schreibvorgänge der Module dürfen keinen weiteren Lauf auslösen.
    quiet = true
    watchers.forEach((watcher) => {
      try { watcher() } catch (error) { console.error('[ui-lifecycle]', error) }
    })
    // Die Module planen ihre Arbeit selbst über requestAnimationFrame. Dieser
    // Aufruf wird nach ihnen ausgeführt und schließt die ruhige Phase.
    requestAnimationFrame(() => {
      observer?.takeRecords()
      quiet = false
      pending = false
      if (debug) console.info('[ui-lifecycle] Lauf abgeschlossen', { ...stats, domNodes: document.getElementsByTagName('*').length })
    })
  }

  const trigger = () => {
    if (pending || stopped) return
    pending = true
    runWatchers()
  }

  const targets = () => ['content', 'drawer', 'nav']
    .map((id) => document.getElementById(id))
    .filter(Boolean)

  const startObserving = () => {
    if (observer || stopped) return
    observer = new MutationObserver(() => {
      stats.observerCallbacks += 1
      if (quiet) { stats.suppressed += 1; return }
      trigger()
    })
    // Bewusst ohne `subtree` und ohne `attributes`: Beobachtet wird nur der
    // Austausch der unmittelbaren Kinder dieser Container.
    targets().forEach((element) => observer.observe(element, { childList: true }))
  }

  const api = {
    /** Registriert eine Aktualisierung. Sie wird sofort und danach bei Inhaltswechseln ausgeführt. */
    watch(callback) {
      if (typeof callback !== 'function') return
      watchers.push(callback)
      startObserving()
      trigger()
    },
    /** Führt eine Schreiboperation aus, ohne die Beobachter auszulösen. */
    silently(callback) {
      const previous = quiet
      quiet = true
      try { return callback() } finally {
        observer?.takeRecords()
        quiet = previous
      }
    },
    /** Fordert eine Aktualisierung an, etwa nach einer Datenänderung. */
    refresh() { trigger() },
    stats: () => ({ ...stats }),
  }

  window.MWUiLifecycle = api

  // Gezielte Ereignisse statt globaler DOM-Beobachtung.
  ;['mw-demo-view-changed', 'mw-demo-role-changed', 'mw-demo-nodes-changed',
    'mw-demo-person-groups-changed', 'mw-demo-leadership-changed', 'mw-demo-content-rendered']
    .forEach((name) => document.addEventListener(name, () => api.refresh()))

  const bindShellButtons = () => {
    ;['loginBtn', 'switchRoleBtn', 'resetBtn'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', () => setTimeout(() => { startObserving(); api.refresh() }, 0))
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { startObserving(); bindShellButtons() })
  else { startObserving(); bindShellButtons() }
})()
