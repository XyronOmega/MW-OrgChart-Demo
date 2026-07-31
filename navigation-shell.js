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
  let observedNav = null
  let navObserver = null

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
    nav.classList.add('mw-navigation-shell')

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
      button.hidden = !isAvailable
      button.classList.toggle('active', isActive)
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-selected', String(isActive))
      button.tabIndex = isActive ? 0 : -1
    })

    sub.querySelectorAll('[data-mw-subnav-group]').forEach((panel) => {
      const show = panel.dataset.mwSubnavGroup === activeGroup && available.has(activeGroup)
      panel.hidden = !show
    })

    writeJson(ACTIVE_GROUP_KEY, activeGroup)
  }

  const rebuild = () => {
    const nav = document.getElementById('nav')
    if (!nav || rebuilding) return
    rebuilding = true
    try {
      const { sub } = ensureShell(nav)
      const buttons = actualButtons(nav)

      buttons.forEach((button) => {
        const groupId = groupForButton(button)
        const panel = sub.querySelector(`[data-mw-subnav-group="${groupId}"]`)
        if (panel && button.parentElement !== panel) panel.append(button)
        button.classList.add('mw-sub-navigation-item')
        button.setAttribute('role', 'tab')
      })

      const descriptors = buttons.map(buttonDescriptor)
      updateActivePresentation(nav, descriptors)
    } finally {
      rebuilding = false
    }
  }

  const scheduleRebuild = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
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
        const groupId = button.dataset.mwMainGroup
        activeGroup = groupId
        writeJson(ACTIVE_GROUP_KEY, groupId)
        updateActivePresentation(nav, actualButtons(nav).map(buttonDescriptor))
        visibleButtonForGroup(nav, groupId)?.click()
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

  const observeNav = () => {
    const nav = document.getElementById('nav')
    if (!nav) return
    bindNav(nav)
    if (observedNav === nav && navObserver) return
    navObserver?.disconnect()
    observedNav = nav
    navObserver = new MutationObserver(scheduleRebuild)
    navObserver.observe(nav, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    })
  }

  const start = () => {
    observeNav()
    rebuild()
    new MutationObserver(() => {
      observeNav()
      scheduleRebuild()
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
