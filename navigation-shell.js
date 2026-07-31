/**
 * Zweistufige, rollenabhängige Navigation für die MW-OrgChart-Demo.
 *
 * Die bestehenden Ansichtsbuttons werden nicht kopiert oder neu implementiert,
 * sondern in vier fachliche Hauptbereiche einsortiert. Dadurch bleiben alle
 * vorhandenen Click-Handler, Rechteprüfungen und Ansichtslogiken erhalten.
 */
(() => {
  const ACTIVE_GROUP_KEY = 'mw-demo-active-main-navigation-v1'
  const LAST_VIEW_KEY = 'mw-demo-last-subview-by-group-v1'

  const groupDefinitions = [
    { id: 'chart', label: 'Organigramm' },
    { id: 'organization', label: 'Organisation' },
    { id: 'changes', label: 'Änderungen' },
    { id: 'administration', label: 'Administration' },
  ]

  const normalizeLabel = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const descriptorValue = (descriptor, key) => normalizeLabel(descriptor?.dataset?.[key])

  const classifyDescriptor = (descriptor = {}) => {
    const label = normalizeLabel(descriptor.text || descriptor.label)
    const dataView = descriptorValue(descriptor, 'view')
    const changesetView = descriptorValue(descriptor, 'csView')
    const platformView = descriptorValue(descriptor, 'platformView')
    const leadershipView = descriptorValue(descriptor, 'leadershipView')
    const groupsView = descriptorValue(descriptor, 'personGroupsView')

    if (platformView) return 'administration'
    if (changesetView === 'users') return 'administration'
    if (changesetView) return 'changes'
    if (leadershipView || groupsView) return 'organization'

    if (/^(chart|orgchart|organigramm|overview|home|start)$/.test(dataView)) return 'chart'
    if (/^(people|persons|person|units|unit|orgunits|positions|structure)$/.test(dataView)) return 'organization'
    if (/^(changes|changesets|preview|planned|review|approvals)$/.test(dataView)) return 'changes'
    if (/^(users|roles|permissions|styles|types|settings|admin|system)$/.test(dataView)) return 'administration'

    if (/organigramm|organisationsubersicht|strukturansicht|startseite/.test(label)) return 'chart'
    if (/anderung|vorschau|geplant|freigabe|prufung|veroffentlich/.test(label)) return 'changes'
    if (/benutzer|rolle|berechtigung|organisationstyp|darstellung|system|administration|einstellung|konfiguration|design/.test(label)) return 'administration'
    if (/person|orgeinheit|organisationseinheit|unterkategor|leitung|position|stabsstelle|assistenz/.test(label)) return 'organization'

    return 'organization'
  }

  const descriptorKey = (descriptor = {}) => {
    const dataset = descriptor.dataset || {}
    const candidates = [
      dataset.view,
      dataset.csView,
      dataset.platformView,
      dataset.leadershipView,
      dataset.personGroupsView,
    ].filter(Boolean)
    return candidates.length ? candidates.join(':') : normalizeLabel(descriptor.text || descriptor.label)
  }

  const availableGroupIds = (descriptors = []) => groupDefinitions
    .map((group) => group.id)
    .filter((groupId) => descriptors.some((descriptor) => descriptor.visible !== false && classifyDescriptor(descriptor) === groupId))

  const resolveActiveGroup = (descriptors = [], preferredGroup = null) => {
    const active = descriptors.find((descriptor) => descriptor.visible !== false && descriptor.active)
    if (active) return classifyDescriptor(active)
    const available = availableGroupIds(descriptors)
    if (preferredGroup && available.includes(preferredGroup)) return preferredGroup
    return available[0] || 'chart'
  }

  const publicApi = {
    groupDefinitions: groupDefinitions.map((group) => ({ ...group })),
    normalizeLabel,
    classifyDescriptor,
    descriptorKey,
    availableGroupIds,
    resolveActiveGroup,
  }

  if (typeof globalThis !== 'undefined') globalThis.MWNavigationShell = publicApi
  if (typeof document === 'undefined') return

  let activeGroup = null
  let scheduled = false
  let rebuilding = false
  let suppressClickRebuild = false
  let observedNav = null
  let navObserver = null
  let lastSignature = ''

  // Schutz gegen unkontrollierte Renderschleifen: Zu viele Durchläufe in Folge
  // deuten auf eine Rückkopplung hin. Dann wird die Beobachtung beendet, statt
  // den Haupt-Thread zu blockieren.
  const REBUILD_BUDGET = 30
  let rebuildsInWindow = 0
  let budgetTimer = null
  let loopReported = false

  const readJson = (key, fallback) => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || 'null')
      return parsed ?? fallback
    } catch {
      return fallback
    }
  }

  const writeJson = (key, value) => {
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* optional browser storage */ }
  }

  /**
   * Schreibende Helfer, die nur bei tatsächlicher Änderung schreiben.
   *
   * Notwendig, weil Browser auch bei wertgleichen Schreibvorgängen einen
   * MutationRecord erzeugen: `classList.add` eines bereits vorhandenen Tokens
   * und `element.hidden = true` bei bereits gesetztem `hidden` melden eine
   * Änderung. Genau daraus entstand die frühere Endlosschleife.
   */
  const setClass = (element, token, shouldHave) => {
    if (element.classList.contains(token) === shouldHave) return false
    element.classList.toggle(token, shouldHave)
    return true
  }

  const setHidden = (element, shouldHide) => {
    if (element.hidden === shouldHide) return false
    element.hidden = shouldHide
    return true
  }

  const setAttr = (element, name, value) => {
    if (element.getAttribute(name) === value) return false
    element.setAttribute(name, value)
    return true
  }

  const setTabIndex = (element, value) => {
    if (element.tabIndex === value) return false
    element.tabIndex = value
    return true
  }

  const buttonDescriptor = (button) => ({
    text: button.textContent || '',
    dataset: { ...button.dataset },
    active: button.classList.contains('active') || button.classList.contains('is-active'),
    visible: !button.hidden,
  })

  const buttonKey = (button) => descriptorKey(buttonDescriptor(button))
  const groupForButton = (button) => classifyDescriptor(buttonDescriptor(button))
  const actualButtons = (nav) => [...nav.querySelectorAll('button')]
    .filter((button) => !button.dataset.mwMainGroup)

  const ensureShell = (nav) => {
    setClass(nav, 'mw-navigation-shell', true)

    let main = nav.querySelector(':scope > .mw-main-navigation')
    if (!main) {
      main = document.createElement('div')
      main.className = 'mw-main-navigation'
      main.setAttribute('role', 'tablist')
      main.setAttribute('aria-label', 'Hauptbereiche')
      nav.prepend(main)
    }

    let sub = nav.querySelector(':scope > .mw-sub-navigation')
    if (!sub) {
      sub = document.createElement('div')
      sub.className = 'mw-sub-navigation'
      sub.setAttribute('aria-label', 'Bereichsnavigation')
      nav.append(sub)
    }

    groupDefinitions.forEach((group) => {
      let mainButton = main.querySelector(`[data-mw-main-group="${group.id}"]`)
      if (!mainButton) {
        mainButton = document.createElement('button')
        mainButton.type = 'button'
        mainButton.dataset.mwMainGroup = group.id
        mainButton.setAttribute('role', 'tab')
        mainButton.setAttribute('aria-controls', `mw-subnav-${group.id}`)
        mainButton.innerHTML = `<span>${group.label}</span>`
        main.append(mainButton)
      }

      let panel = sub.querySelector(`[data-mw-subnav-group="${group.id}"]`)
      if (!panel) {
        panel = document.createElement('div')
        panel.className = 'mw-sub-navigation-panel'
        panel.id = `mw-subnav-${group.id}`
        panel.dataset.mwSubnavGroup = group.id
        panel.setAttribute('role', 'tablist')
        panel.setAttribute('aria-label', group.label)
        sub.append(panel)
      }
    })

    return { main, sub }
  }

  const updateActivePresentation = (nav, descriptors) => {
    const { main, sub } = ensureShell(nav)
    const available = new Set(availableGroupIds(descriptors))
    const preferred = readJson(ACTIVE_GROUP_KEY, null)
    activeGroup = resolveActiveGroup(descriptors, activeGroup || preferred)

    main.querySelectorAll('[data-mw-main-group]').forEach((button) => {
      const groupId = button.dataset.mwMainGroup
      const isAvailable = available.has(groupId)
      const isActive = isAvailable && groupId === activeGroup
      setHidden(button, !isAvailable)
      setClass(button, 'active', isActive)
      setClass(button, 'is-active', isActive)
      setAttr(button, 'aria-selected', String(isActive))
      setTabIndex(button, isActive ? 0 : -1)
    })

    sub.querySelectorAll('[data-mw-subnav-group]').forEach((panel) => {
      setHidden(panel, !(panel.dataset.mwSubnavGroup === activeGroup && available.has(activeGroup)))
    })

    writeJson(ACTIVE_GROUP_KEY, activeGroup)
  }

  /** Kennzeichnet den Sollzustand. Bei gleicher Signatur ist nichts zu tun. */
  const signatureFor = (nav) => {
    const buttons = actualButtons(nav)
    return [
      activeGroup,
      buttons.map((button) => `${buttonKey(button)}|${groupForButton(button)}|${button.hidden ? 0 : 1}`).join(','),
    ].join('#')
  }

  const rebuild = () => {
    const nav = document.getElementById('nav')
    if (!nav || rebuilding) return
    if (navObserver) navObserver.disconnect()
    rebuilding = true
    try {
      const { sub } = ensureShell(nav)
      const buttons = actualButtons(nav)

      buttons.forEach((button) => {
        const groupId = groupForButton(button)
        const panel = sub.querySelector(`[data-mw-subnav-group="${groupId}"]`)
        if (panel && button.parentElement !== panel) panel.append(button)
        setClass(button, 'mw-sub-navigation-item', true)
        setAttr(button, 'role', 'tab')
      })

      updateActivePresentation(nav, buttons.map(buttonDescriptor))
      lastSignature = signatureFor(nav)
    } finally {
      rebuilding = false
      // Erst nach Abschluss aller eigenen Schreibvorgänge wieder beobachten,
      // damit eigene Änderungen keinen weiteren Durchlauf auslösen.
      if (navObserver && observedNav === nav) navObserver.observe(nav, { childList: true })
    }
  }

  const scheduleRebuild = () => {
    if (scheduled) return
    rebuildsInWindow += 1
    if (rebuildsInWindow > REBUILD_BUDGET) {
      if (!loopReported) {
        loopReported = true
        navObserver?.disconnect()
        console.warn('[navigation-shell] Zu viele Aktualisierungen in Folge – Beobachtung gestoppt.')
      }
      return
    }
    if (!budgetTimer) {
      budgetTimer = setTimeout(() => { rebuildsInWindow = 0; budgetTimer = null }, 1000)
    }
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      const nav = document.getElementById('nav')
      // Identische Anforderungen werden zusammengeführt.
      if (nav && signatureFor(nav) === lastSignature && nav.querySelector(':scope > .mw-main-navigation')) return
      rebuild()
    })
  }

  const visibleButtonForGroup = (nav, groupId) => {
    const lastViews = readJson(LAST_VIEW_KEY, {})
    const buttons = actualButtons(nav).filter((button) => !button.hidden && groupForButton(button) === groupId)
    return buttons.find((button) => buttonKey(button) === lastViews[groupId]) || buttons[0] || null
  }

  const bindNav = (nav) => {
    if (nav.dataset.mwNavigationShellBound === 'true') return
    nav.dataset.mwNavigationShellBound = 'true'

    nav.addEventListener('click', (event) => {
      const button = event.target.closest('button')
      if (!button || !nav.contains(button)) return

      if (button.dataset.mwMainGroup) {
        event.preventDefault()
        if (suppressClickRebuild) return
        const groupId = button.dataset.mwMainGroup
        activeGroup = groupId
        writeJson(ACTIVE_GROUP_KEY, groupId)
        updateActivePresentation(nav, actualButtons(nav).map(buttonDescriptor))
        lastSignature = signatureFor(nav)
        // Schutz gegen rekursive Klickketten: Der programmgesteuerte Klick auf
        // die Unteransicht darf diesen Zweig nicht erneut auslösen.
        const target = visibleButtonForGroup(nav, groupId)
        if (target) {
          suppressClickRebuild = true
          try { target.click() } finally { suppressClickRebuild = false }
        }
        return
      }

      const groupId = groupForButton(button)
      activeGroup = groupId
      const lastViews = readJson(LAST_VIEW_KEY, {})
      lastViews[groupId] = buttonKey(button)
      writeJson(LAST_VIEW_KEY, lastViews)
      writeJson(ACTIVE_GROUP_KEY, groupId)
      scheduleRebuild()
    }, true)
  }

  /**
   * Beobachtet ausschließlich das Hinzufügen und Entfernen von Buttons in #nav.
   * Bewusst ohne `subtree` und ohne `attributes`: Die Attribute `class` und
   * `hidden` schreibt dieses Modul selbst.
   */
  const observeNav = () => {
    const nav = document.getElementById('nav')
    if (!nav) return
    bindNav(nav)
    if (observedNav === nav && navObserver) return
    navObserver?.disconnect()
    observedNav = nav
    navObserver = new MutationObserver(scheduleRebuild)
    navObserver.observe(nav, { childList: true })
  }

  const start = () => {
    observeNav()
    rebuild()
    // Gezielte Ereignisse statt eines globalen Beobachters auf document.body.
    ;['mw-demo-navigation-changed', 'mw-demo-role-changed', 'mw-demo-view-changed'].forEach((name) => {
      document.addEventListener(name, () => { observeNav(); scheduleRebuild() })
    })
    // Nach dem Anmelden ersetzt app.js die Navigation vollständig.
    document.getElementById('loginBtn')?.addEventListener('click', () => setTimeout(() => { observeNav(); scheduleRebuild() }, 0))
    document.getElementById('switchRoleBtn')?.addEventListener('click', () => setTimeout(() => { observeNav(); scheduleRebuild() }, 0))
    document.getElementById('resetBtn')?.addEventListener('click', () => setTimeout(() => { observeNav(); scheduleRebuild() }, 0))
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
