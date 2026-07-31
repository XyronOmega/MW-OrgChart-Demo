/**
 * Verhindert rekursive MutationObserver-Aufrufe durch UI-Änderungen, die das
 * Navigationsmodul selbst erzeugt. Bereits laufende Observer der Basismodule
 * bleiben unverändert; der Filter gilt nur für danach erzeugte Observer.
 */
(() => {
  const NativeMutationObserver = window.MutationObserver
  if (!NativeMutationObserver || window.__mwOrgNavigationObserverFilter) return
  window.__mwOrgNavigationObserverFilter = true

  const internalSelector = [
    '[data-org-navigation-controls]',
    '.org-focus-bar',
    '.org-search-panel',
  ].join(',')

  window.MutationObserver = class MWFilteredMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      super((mutations, observer) => {
        const relevant = mutations.filter((mutation) => {
          const target = mutation.target?.nodeType === 1
            ? mutation.target
            : mutation.target?.parentElement
          return !target?.closest?.(internalSelector)
        })
        if (relevant.length) callback(relevant, observer)
      })
    }
  }

  window.MutationObserver.prototype = NativeMutationObserver.prototype

  if (!window.CSS) window.CSS = {}
  if (typeof window.CSS.escape !== 'function') {
    window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`)
  }
})()
