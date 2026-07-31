/**
 * Barrierefreiheit für Bedienelemente, die `app.js` erzeugt.
 *
 * `app.js` liegt als gepackter Block vor und wird in diesem Schritt bewusst
 * nicht entpackt. Die folgenden Ergänzungen setzen deshalb ausschließlich am
 * DOM an, das `app.js` erzeugt:
 *
 *   1. Personenprofil (`#drawer`) als Dialog: `role`, `aria-modal`, Fokus beim
 *      Öffnen in den Dialog, Fokusfalle, Rückgabe des Fokus beim Schließen,
 *      Schließen mit Escape.
 *   2. Fehlende Formularbeschriftungen: Felder ohne zugänglichen Namen
 *      erhalten einen aus ihrem Platzhalter abgeleiteten `aria-label`.
 *   3. Eindeutige Überschriftenstruktur: Anmeldebereich und Anwendung tragen je
 *      eine `h1`. Da immer nur einer der beiden Bereiche aktiv ist, wird der
 *      jeweils inaktive Bereich zusätzlich zur CSS-Klasse `hidden` mit dem
 *      `hidden`-Attribut aus dem Dokument genommen.
 *
 * Rückkopplungen: Beobachtet werden ausschließlich `class`-Attribute;
 * geschrieben werden ausschließlich andere Attribute (`hidden`, `role`,
 * `aria-modal`, `tabindex`, `aria-label`). Ein Schreibvorgang kann den eigenen
 * Beobachter daher nicht auslösen. Zusätzlich schreibt `setAttribute` nur bei
 * tatsächlicher Wertänderung – dieselbe Regel wie in `navigation-shell.js`.
 */
(() => {
  if (typeof document === 'undefined') return

  const FOCUSABLE = 'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

  /** Schreibt ein Attribut nur, wenn sich der Wert tatsächlich ändert. */
  const setAttr = (element, name, value) => {
    if (!element) return
    if (value === null || value === false) {
      if (element.hasAttribute(name)) element.removeAttribute(name)
      return
    }
    const next = String(value)
    if (element.getAttribute(name) !== next) element.setAttribute(name, next)
  }

  const isOpen = (element) => !!element && !element.classList.contains('hidden')

  // --- 1. Personenprofil als Dialog ----------------------------------------

  const drawerAccessibility = () => {
    const drawer = document.getElementById('drawer')
    if (!drawer) return

    let openState = false
    let lastTrigger = null

    // Der Auslöser wird laufend mitgeschrieben, damit der Fokus auch dann
    // zurückgegeben werden kann, wenn `app.js` ihn beim Öffnen bereits verliert.
    document.addEventListener('focusin', (event) => {
      if (openState) return
      if (drawer.contains(event.target)) return
      lastTrigger = event.target
    }, true)
    document.addEventListener('pointerdown', (event) => {
      if (openState) return
      const candidate = event.target instanceof Element ? event.target.closest('button, a[href], [tabindex]') : null
      if (candidate && !drawer.contains(candidate)) lastTrigger = candidate
    }, true)

    const focusable = () => Array.from(drawer.querySelectorAll(FOCUSABLE))
      .filter((element) => element.offsetParent !== null || element.getClientRects().length > 0)

    const closeDrawer = () => {
      if (typeof window.closeDrawer === 'function') { window.closeDrawer(); return true }
      const closeButton = drawer.querySelector('.drawer-close')
      if (closeButton) { closeButton.click(); return true }
      const backdrop = document.getElementById('drawerBackdrop')
      if (backdrop) { backdrop.click(); return true }
      return false
    }

    const handleOpened = () => {
      setAttr(drawer, 'role', 'dialog')
      setAttr(drawer, 'aria-modal', 'true')
      setAttr(drawer, 'tabindex', '-1')
      // Der Dialog selbst erhält den Fokus: Screenreader lesen dadurch
      // Bezeichnung und Inhalt, die Schließen-Schaltfläche folgt im Tab-Lauf.
      if (!drawer.contains(document.activeElement)) drawer.focus({ preventScroll: true })
    }

    const handleClosed = () => {
      setAttr(drawer, 'aria-modal', null)
      if (!drawer.contains(document.activeElement) && document.activeElement !== document.body) return
      const target = lastTrigger
      if (target && target.isConnected && typeof target.focus === 'function') {
        target.focus({ preventScroll: true })
        if (document.activeElement === target) return
      }
      // Rückfall: Der Auslöser existiert nicht mehr oder ist nicht mehr
      // fokussierbar (etwa eine inzwischen eingeklappte Organigramm-Karte).
      // Der Fokus bleibt dann im Inhaltsbereich statt am Seitenanfang.
      const content = document.getElementById('content')
      if (!content) return
      setAttr(content, 'tabindex', '-1')
      content.focus({ preventScroll: true })
    }

    const sync = () => {
      const open = isOpen(drawer)
      if (open === openState) {
        if (open) handleOpened()
        return
      }
      openState = open
      if (open) handleOpened()
      else handleClosed()
    }

    document.addEventListener('keydown', (event) => {
      if (!openState) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeDrawer()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) { event.preventDefault(); drawer.focus({ preventScroll: true }); return }
      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement
      if (!drawer.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return }
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
    }, true)

    // Nur `class` wird beobachtet, geschrieben werden ausschließlich
    // ARIA-Attribute und `tabindex` – keine Rückkopplung möglich.
    new MutationObserver(sync).observe(drawer, { attributes: true, attributeFilter: ['class'] })
    sync()
  }

  // --- 2. Fehlende Formularbeschriftungen ----------------------------------

  const hasAccessibleName = (field) => {
    if (field.getAttribute('aria-label')?.trim()) return true
    if (field.getAttribute('aria-labelledby')?.trim()) return true
    if (field.labels && field.labels.length) return true
    if (field.title?.trim()) return true
    return false
  }

  const labelFields = () => {
    document.querySelectorAll('input, select, textarea').forEach((field) => {
      if (field.type === 'hidden') return
      if (hasAccessibleName(field)) return
      const derived = field.getAttribute('placeholder')?.trim()
        || field.closest('label')?.textContent?.trim()
        || null
      if (derived) setAttr(field, 'aria-label', derived)
    })
  }

  // --- 3. Genau eine h1 je Seitenzustand -----------------------------------

  const pageSections = () => ['loginPage', 'app'].map((id) => document.getElementById(id)).filter(Boolean)

  const syncSectionVisibility = () => {
    pageSections().forEach((section) => {
      setAttr(section, 'hidden', section.classList.contains('hidden') ? '' : null)
    })
  }

  const observeSections = () => {
    const observer = new MutationObserver(syncSectionVisibility)
    // Beobachtet wird `class`, geschrieben wird `hidden` – getrennte Attribute.
    pageSections().forEach((section) => observer.observe(section, { attributes: true, attributeFilter: ['class'] }))
    syncSectionVisibility()
  }

  // --- Einbindung ----------------------------------------------------------

  const start = () => {
    drawerAccessibility()
    observeSections()
    if (window.MWUiLifecycle) window.MWUiLifecycle.watch(labelFields)
    else labelFields()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
