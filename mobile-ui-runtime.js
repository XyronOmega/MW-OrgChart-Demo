/** DOM-Erweiterungen für die mobile MW-OrgChart-Oberfläche. */
(() => {
  if (typeof document === 'undefined' || !globalThis.MWMobileUI) return

  const NODE_KEY = 'mw-demo-nodes'
  const GROUP_KEY = 'mw-demo-person-groups-v1'
  const LEADERSHIP_KEY = 'mw-demo-leadership-assignments'
  const MOBILE_UNIT_KEY = 'mw-demo-mobile-unit-v1'
  const MOBILE_MODE_KEY = 'mw-demo-mobile-chart-mode-v1'
  const api = globalThis.MWMobileUI

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])
  const nodeMap = (nodes) => new Map(nodes.filter((node) => node?.id).map((node) => [String(node.id), node]))
  const readJson = (storage, key, fallback) => {
    try {
      const parsed = JSON.parse(storage.getItem(key) || 'null')
      return parsed ?? fallback
    } catch {
      return fallback
    }
  }
  const writeJson = (storage, key, value) => {
    try { storage.setItem(key, JSON.stringify(value)) } catch { /* optional browser storage */ }
  }
  const setText = (element, value) => {
    if (element && element.textContent !== String(value ?? '')) element.textContent = String(value ?? '')
  }
  const initials = (name) => String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('de-DE') || '')
    .join('') || 'MW'

  const loadNodes = () => {
    const base = Array.isArray(window.MWOrgchartNavigation?.fallbackNodes)
      ? window.MWOrgchartNavigation.fallbackNodes
      : api.fallbackNodes
    const stored = readJson(localStorage, NODE_KEY, null)
    if (!Array.isArray(stored) || !stored.length) return clone(base)
    const merged = new Map(base.map((node) => [String(node.id), { ...node }]))
    stored.forEach((node) => {
      if (node?.id) merged.set(String(node.id), { ...(merged.get(String(node.id)) || {}), ...node, id: String(node.id) })
    })
    return [...merged.values()]
  }
  const loadGroups = () => {
    const stored = readJson(localStorage, GROUP_KEY, [])
    return Array.isArray(stored) ? stored : []
  }
  const loadAssignments = () => {
    const fromModule = window.MWLeadershipDemo?.loadAssignments?.()
    if (Array.isArray(fromModule)) return fromModule
    const stored = readJson(localStorage, LEADERSHIP_KEY, [])
    return Array.isArray(stored) ? stored : []
  }

  let mediaQuery = null
  let scheduled = false
  let currentUnitId = readJson(sessionStorage, MOBILE_UNIT_KEY, null)
  let chartMode = readJson(sessionStorage, MOBILE_MODE_KEY, 'branch') === 'canvas' ? 'canvas' : 'branch'

  const isMobile = () => mediaQuery?.matches ?? api.isMobileWidth(window.innerWidth)

  const setMobileState = () => {
    document.body.classList.toggle('mw-mobile-mode', isMobile())
    if (!isMobile()) {
      document.body.classList.remove('mw-mobile-search-open', 'mw-mobile-menu-open')
      document.querySelectorAll('.mw-mobile-branch-view').forEach((element) => { element.hidden = true })
    }
  }

  const ensureHeaderMenu = () => {
    const actions = document.querySelector('.header-actions')
    if (!actions) return
    const name = document.getElementById('userName')?.textContent || 'Benutzer'
    const chip = actions.querySelector('.user-chip')
    if (chip) {
      chip.dataset.mobileInitials = initials(name)
      chip.setAttribute('title', name)
    }

    let trigger = actions.querySelector('[data-mobile-menu-trigger]')
    if (!trigger) {
      trigger = document.createElement('button')
      trigger.type = 'button'
      trigger.className = 'mw-mobile-menu-trigger'
      trigger.dataset.mobileMenuTrigger = 'true'
      trigger.setAttribute('aria-label', 'Benutzermenü öffnen')
      trigger.setAttribute('aria-expanded', 'false')
      trigger.textContent = '⋯'
      actions.append(trigger)
      trigger.addEventListener('click', () => {
        const open = !document.body.classList.contains('mw-mobile-menu-open')
        document.body.classList.toggle('mw-mobile-menu-open', open)
        trigger.setAttribute('aria-expanded', String(open))
      })
    }

    let sheet = document.querySelector('[data-mobile-menu-sheet]')
    if (!sheet) {
      sheet = document.createElement('section')
      sheet.className = 'mw-mobile-menu-sheet'
      sheet.dataset.mobileMenuSheet = 'true'
      sheet.innerHTML = `
        <button type="button" class="mw-mobile-menu-backdrop" data-mobile-menu-close aria-label="Menü schließen"></button>
        <div class="mw-mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Benutzermenü">
          <div class="mw-mobile-menu-user"><span data-mobile-menu-initials>MW</span><div><strong data-mobile-menu-name>Benutzer</strong><small data-mobile-menu-role></small></div></div>
          <button type="button" data-mobile-action="role">Rolle wechseln</button>
          <button type="button" data-mobile-action="reset">Demo zurücksetzen</button>
          <button type="button" data-mobile-menu-close>Schließen</button>
        </div>`
      document.body.append(sheet)
      sheet.querySelectorAll('[data-mobile-menu-close]').forEach((button) => button.addEventListener('click', () => {
        document.body.classList.remove('mw-mobile-menu-open')
        trigger.setAttribute('aria-expanded', 'false')
      }))
      sheet.querySelector('[data-mobile-action="role"]')?.addEventListener('click', () => {
        document.body.classList.remove('mw-mobile-menu-open')
        document.getElementById('switchRoleBtn')?.click()
      })
      sheet.querySelector('[data-mobile-action="reset"]')?.addEventListener('click', () => {
        document.body.classList.remove('mw-mobile-menu-open')
        document.getElementById('resetBtn')?.click()
      })
    }
    setText(sheet.querySelector('[data-mobile-menu-name]'), name)
    setText(sheet.querySelector('[data-mobile-menu-role]'), document.getElementById('userRole')?.textContent || '')
    setText(sheet.querySelector('[data-mobile-menu-initials]'), initials(name))
  }

  const enhanceNavigation = () => {
    const labels = { chart: 'Chart', organization: 'Organisation', changes: 'Änderungen', administration: 'Mehr' }
    document.querySelectorAll('[data-mw-main-group]').forEach((button) => {
      button.dataset.mobileLabel = labels[button.dataset.mwMainGroup] || button.textContent.trim()
    })
  }

  const enhanceTables = () => {
    document.querySelectorAll('table').forEach((table) => {
      if (table.dataset.mobileTableEnhanced === 'true') return
      const headers = [...table.querySelectorAll('thead th')].map((header) => header.textContent.trim())
      table.querySelectorAll('tbody tr').forEach((row) => {
        const cells = [...row.children].filter((cell) => cell.matches('td,th'))
        api.tableLabels(headers, cells.length).forEach((label, index) => cells[index]?.setAttribute('data-mobile-label', label))
      })
      table.dataset.mobileTableEnhanced = 'true'
    })
  }

  const openPersonProfile = (personId) => {
    const escape = window.CSS?.escape || ((value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`))
    const card = document.querySelector(`.chart-wrap .node[data-id="${escape(String(personId))}"]`)
    card?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  }

  const groupMarkup = (group, open = false) => {
    if (!group.people?.length) return ''
    return `
      <details class="mw-mobile-person-group" ${open ? 'open' : ''}>
        <summary><span>${escapeHtml(group.name)}</span><b>${group.people.length}</b></summary>
        <div class="mw-mobile-people-list">${group.people.map((person) => `
          <button type="button" data-mobile-person="${escapeHtml(person.id)}">
            <span>${escapeHtml(initials(person.name))}</span>
            <div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role || 'Mitarbeitende Person')}</small></div>
            <i aria-hidden="true">›</i>
          </button>`).join('')}</div>
      </details>`
  }

  const renderBranchView = () => {
    const wrap = document.querySelector('.chart-wrap')
    const tree = wrap?.querySelector('.tree')
    if (!wrap || !tree || !isMobile()) return
    const nodes = loadNodes()
    const byId = nodeMap(nodes)
    const root = api.rootNode(nodes)
    if (!root) return
    if (!currentUnitId || !byId.has(String(currentUnitId)) || byId.get(String(currentUnitId))?.type === 'person') currentUnitId = root.id
    const assignments = loadAssignments()
    const model = api.buildBranchModel({ nodes, groups: loadGroups(), assignments, unitId: currentUnitId })
    if (!model) return
    currentUnitId = String(model.current.id)
    writeJson(sessionStorage, MOBILE_UNIT_KEY, currentUnitId)

    let view = wrap.querySelector('.mw-mobile-branch-view')
    if (!view) {
      view = document.createElement('section')
      view.className = 'mw-mobile-branch-view'
      wrap.prepend(view)
    }
    view.hidden = false
    wrap.classList.toggle('mw-mobile-show-canvas', chartMode === 'canvas')
    const signature = JSON.stringify({
      unitId: currentUnitId,
      chartMode,
      nodeCount: nodes.length,
      groups: model.groups.map((group) => [group.id, group.name, group.sortOrder, group.people?.map((person) => person.id)]),
      leaders: model.leaders.map((person) => person.id),
      children: model.children.map((child) => [child.id, child.name, child.peopleCount, child.childCount]),
    })
    if (view.dataset.mobileSignature === signature) return
    view.dataset.mobileSignature = signature
    const firstVisibleGroup = model.groups.findIndex((group) => group.people?.length)

    view.innerHTML = `
      <div class="mw-mobile-chart-switch" role="group" aria-label="Organigrammansicht">
        <button type="button" data-mobile-chart-mode="branch" class="${chartMode === 'branch' ? 'active' : ''}">Zweigansicht</button>
        <button type="button" data-mobile-chart-mode="canvas" class="${chartMode === 'canvas' ? 'active' : ''}">Gesamtansicht</button>
      </div>
      <button type="button" class="mw-mobile-search-trigger" data-mobile-search-trigger><span aria-hidden="true">⌕</span> Person oder OrgEinheit suchen</button>
      <nav class="mw-mobile-breadcrumb" aria-label="Organisationspfad">${model.path.map((node, index) => `
        <button type="button" data-mobile-unit="${escapeHtml(node.id)}" ${index === model.path.length - 1 ? 'aria-current="page"' : ''}>${escapeHtml(node.name)}</button>`).join('<span aria-hidden="true">›</span>')}</nav>
      <article class="mw-mobile-unit-card">
        <header>
          ${model.parentId ? `<button type="button" class="mw-mobile-back" data-mobile-unit="${escapeHtml(model.parentId)}" aria-label="Eine Ebene zurück">←</button>` : ''}
          <div><span>${escapeHtml(model.current.subtitle || model.current.type || 'OrgEinheit')}</span><h2>${escapeHtml(model.current.name)}</h2></div>
          <b>${model.peopleCount} Person${model.peopleCount === 1 ? '' : 'en'}</b>
        </header>
        ${model.leaders.length ? `<section class="mw-mobile-leadership"><h3>Leitung</h3>${model.leaders.map((person) => {
          const roles = assignments.filter((assignment) => String(assignment.personId) === String(person.id)
            && String(assignment.orgUnitId) === String(model.current.id)
            && api.isAssignmentActive(assignment)).map((assignment) => assignment.leadershipRole)
          return `<button type="button" data-mobile-person="${escapeHtml(person.id)}"><span>${escapeHtml(initials(person.name))}</span><div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml([...new Set(roles)].join(' · ') || 'Leitung')}</small></div><i aria-hidden="true">›</i></button>`
        }).join('')}</section>` : ''}
        ${model.groups.some((group) => group.people?.length) ? `<section class="mw-mobile-groups"><h3>Mitarbeitende</h3>${model.groups.map((group, index) => groupMarkup(group, index === firstVisibleGroup)).join('')}</section>` : ''}
      </article>
      <section class="mw-mobile-child-units">
        <header><h3>Untergeordnete OrgEinheiten</h3><span>${model.children.length}</span></header>
        ${model.children.length ? model.children.map((child) => `
          <button type="button" data-mobile-unit="${escapeHtml(child.id)}">
            <div><span>${escapeHtml(child.subtitle || child.type || 'OrgEinheit')}</span><strong>${escapeHtml(child.name)}</strong><small>${child.peopleCount} Personen${child.childCount ? ` · ${child.childCount} Untereinheiten` : ''}</small></div>
            <i aria-hidden="true">›</i>
          </button>`).join('') : '<p>Keine weiteren OrgEinheiten vorhanden.</p>'}
      </section>`

    view.querySelectorAll('[data-mobile-unit]').forEach((button) => button.addEventListener('click', () => {
      currentUnitId = button.dataset.mobileUnit
      chartMode = 'branch'
      writeJson(sessionStorage, MOBILE_MODE_KEY, chartMode)
      view.dataset.mobileSignature = ''
      renderBranchView()
      wrap.scrollIntoView({ block: 'start' })
    }))
    view.querySelectorAll('[data-mobile-person]').forEach((button) => button.addEventListener('click', () => openPersonProfile(button.dataset.mobilePerson)))
    view.querySelectorAll('[data-mobile-chart-mode]').forEach((button) => button.addEventListener('click', () => {
      chartMode = button.dataset.mobileChartMode === 'canvas' ? 'canvas' : 'branch'
      writeJson(sessionStorage, MOBILE_MODE_KEY, chartMode)
      view.dataset.mobileSignature = ''
      renderBranchView()
    }))
    view.querySelector('[data-mobile-search-trigger]')?.addEventListener('click', openMobileSearch)
  }

  const chartToolbar = () => {
    const wrap = document.querySelector('.chart-wrap')
    return wrap?.previousElementSibling?.classList?.contains('toolbar')
      ? wrap.previousElementSibling
      : wrap?.parentElement?.querySelector('.toolbar')
  }

  const ensureSearchClose = () => {
    const toolbar = chartToolbar()
    if (!toolbar || toolbar.querySelector('[data-mobile-search-close]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mw-mobile-search-close'
    button.dataset.mobileSearchClose = 'true'
    button.textContent = 'Schließen'
    button.addEventListener('click', closeMobileSearch)
    toolbar.append(button)
  }

  function openMobileSearch() {
    const toolbar = chartToolbar()
    const input = toolbar?.querySelector('input[type="search"], input[placeholder*="such" i]')
    if (!toolbar || !input) return
    ensureSearchClose()
    document.body.classList.add('mw-mobile-search-open')
    window.setTimeout(() => input.focus(), 20)
  }

  function closeMobileSearch() {
    document.body.classList.remove('mw-mobile-search-open')
  }

  const syncSearchSelection = (event) => {
    const button = event.target.closest('[data-org-search-show], [data-org-search-profile]')
    if (!button) return
    const id = button.dataset.orgSearchShow || button.dataset.orgSearchProfile
    const nodes = loadNodes()
    const target = nodeMap(nodes).get(String(id))
    if (target) currentUnitId = target.type === 'person' ? String(target.parent || api.rootNode(nodes)?.id) : String(target.id)
    writeJson(sessionStorage, MOBILE_UNIT_KEY, currentUnitId)
    closeMobileSearch()
    window.setTimeout(() => {
      document.querySelector('.mw-mobile-branch-view')?.setAttribute('data-mobile-signature', '')
      renderBranchView()
    }, 80)
  }

  const enhance = () => {
    setMobileState()
    ensureHeaderMenu()
    enhanceNavigation()
    enhanceTables()
    ensureSearchClose()
    renderBranchView()
  }

  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(() => {
      scheduled = false
      enhance()
    })
  }

  const start = () => {
    mediaQuery = window.matchMedia(`(max-width: ${api.MOBILE_MAX_WIDTH}px)`)
    mediaQuery.addEventListener?.('change', scheduleEnhance)
    document.addEventListener('click', syncSearchSelection, true)
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMobileSearch()
        document.body.classList.remove('mw-mobile-menu-open')
      }
    })
    ;['mw-demo-nodes-changed', 'mw-demo-person-groups-changed'].forEach((eventName) => window.addEventListener(eventName, scheduleEnhance))
    new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
    enhance()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
