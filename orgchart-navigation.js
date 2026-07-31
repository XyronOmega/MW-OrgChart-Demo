/**
 * Navigation, Zoom, einklappbare Ebenen, gespeicherte Ansichten und Live-Suche
 * für die öffentliche MW-OrgChart-Demo.
 *
 * Das Modul ergänzt den bestehenden, gepackten Demo-Kern ausschließlich über
 * DOM und LocalStorage. Es führt keine Netzwerkaufrufe aus.
 */
(() => {
  const NODE_KEY = 'mw-demo-nodes'
  const LEADERSHIP_KEY = 'mw-demo-leadership-assignments'
  const VIEW_KEY = 'mw-demo-orgchart-saved-views-v1'
  const MIN_QUERY_LENGTH = 3
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 2
  const SEARCH_LIMIT = 8

  const fallbackNodes = [
    { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen', subtitle: 'Unternehmen' },
    { id: 'prv', parent: 'mw', type: 'section', name: 'Personal, Recht und Verwaltung', subtitle: 'Sektion' },
    { id: 'pm', parent: 'prv', type: 'department', name: 'Personalmanagement', subtitle: 'Abteilung' },
    { id: 'pa', parent: 'prv', type: 'department', name: 'Personaladministration', subtitle: 'Abteilung' },
    { id: 'pe', parent: 'prv', type: 'department', name: 'Personalentwicklung', subtitle: 'Abteilung' },
    { id: 'pc', parent: 'prv', type: 'department', name: 'Personalcontrolling', subtitle: 'Abteilung' },
    { id: 'pm-hrbp', parent: 'pm', type: 'team', name: 'HR Business Partner', subtitle: 'Team' },
    { id: 'pm-sb', parent: 'pm', type: 'team', name: 'Sachbearbeitung', subtitle: 'Team' },
    { id: 'pa-pay', parent: 'pa', type: 'team', name: 'Entgeltabrechnung', subtitle: 'Team' },
    { id: 'pa-time', parent: 'pa', type: 'team', name: 'Zeitwirtschaft', subtitle: 'Team' },
    { id: 'pe-learning', parent: 'pe', type: 'team', name: 'Ausbildung & Weiterbildung', subtitle: 'Team' },
    { id: 'pe-onboarding', parent: 'pe', type: 'team', name: 'Onboarding', subtitle: 'Team' },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', name: 'BGSM', subtitle: 'Team' },
    { id: 'pc-control', parent: 'pc', type: 'team', name: 'HR-Controlling', subtitle: 'Team' },
    { id: 'p1', parent: 'pm-hrbp', type: 'person', name: 'Lea Beispiel', role: 'HR Business Partner', email: 'lea.beispiel@example.org', location: 'Zentrale' },
    { id: 'p2', parent: 'pm-hrbp', type: 'person', name: 'Noah Muster', role: 'HR Business Partner', email: 'noah.muster@example.org', location: 'Zentrale' },
    { id: 'p3', parent: 'pm-sb', type: 'person', name: 'Mila Demo', role: 'Sachbearbeitung', email: 'mila.demo@example.org', location: 'Servicecenter Nord' },
    { id: 'p4', parent: 'pa-pay', type: 'person', name: 'Elias Test', role: 'Entgeltabrechnung', email: 'elias.test@example.org', location: 'Zentrale' },
    { id: 'p5', parent: 'pa-time', type: 'person', name: 'Lina Probe', role: 'Zeitwirtschaft', email: 'lina.probe@example.org', location: 'Servicecenter Nord' },
    { id: 'p6', parent: 'pe-learning', type: 'person', name: 'Finn Beispiel', role: 'Personalentwicklung', email: 'finn.beispiel@example.org', location: 'Zentrale' },
    { id: 'p7', parent: 'pe-onboarding', type: 'person', name: 'Emma Muster', role: 'Onboarding', email: 'emma.muster@example.org', location: 'Zentrale' },
    { id: 'p8', parent: 'pc-bgsm', type: 'person', name: 'Luis Demo', role: 'BGSM', email: 'luis.demo@example.org', location: 'Technikstandort' },
    { id: 'p9', parent: 'pc-control', type: 'person', name: 'Sofia Test', role: 'HR-Controlling', email: 'sofia.test@example.org', location: 'Zentrale' },
  ]

  const typeLabels = {
    company: 'Unternehmen',
    management: 'Geschäftsführung',
    section: 'Sektion',
    department: 'Abteilung',
    team: 'Team',
    person: 'Person',
  }

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])

  const normalizeText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9@.+&/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const nodeMap = (nodes) => new Map(nodes.filter((node) => node?.id).map((node) => [String(node.id), node]))

  const childrenByParent = (nodes) => {
    const result = new Map()
    nodes.forEach((node) => {
      if (!node?.id || !node.parent) return
      const parent = String(node.parent)
      if (!result.has(parent)) result.set(parent, [])
      result.get(parent).push(String(node.id))
    })
    return result
  }

  const ancestorsOf = (nodes, id) => {
    const byId = nodeMap(nodes)
    const result = []
    const seen = new Set()
    let current = byId.get(String(id))
    while (current?.parent && !seen.has(String(current.parent))) {
      const parentId = String(current.parent)
      result.unshift(parentId)
      seen.add(parentId)
      current = byId.get(parentId)
    }
    return result
  }

  const descendantsOf = (nodes, id) => {
    const children = childrenByParent(nodes)
    const result = []
    const seen = new Set()
    const queue = [...(children.get(String(id)) || [])]
    while (queue.length) {
      const current = queue.shift()
      if (seen.has(current)) continue
      seen.add(current)
      result.push(current)
      queue.push(...(children.get(current) || []))
    }
    return result
  }

  const pathFor = (nodes, id) => {
    const byId = nodeMap(nodes)
    return [...ancestorsOf(nodes, id), String(id)]
      .map((nodeId) => byId.get(nodeId)?.name)
      .filter(Boolean)
  }

  const defaultExpandedIds = (nodes) => nodes
    .filter((node) => node && node.type !== 'person' && ['company', 'management'].includes(node.baseType || node.type))
    .map((node) => String(node.id))

  const levenshtein = (leftValue, rightValue) => {
    const left = normalizeText(leftValue)
    const right = normalizeText(rightValue)
    if (left === right) return 0
    if (!left.length) return right.length
    if (!right.length) return left.length
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const current = [leftIndex]
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
        current[rightIndex] = Math.min(
          previous[rightIndex] + 1,
          current[rightIndex - 1] + 1,
          substitution,
        )
      }
      previous.splice(0, previous.length, ...current)
    }
    return previous[right.length]
  }

  const scoreText = (queryValue, textValue) => {
    const query = normalizeText(queryValue)
    const text = normalizeText(textValue)
    if (!query || !text) return 0
    if (text === query) return 120
    if (text.startsWith(query)) return 110
    if (text.split(' ').some((word) => word.startsWith(query))) return 100
    const index = text.indexOf(query)
    if (index >= 0) return 88 - Math.min(index, 18)
    const queryWords = query.split(' ').filter(Boolean)
    const textWords = text.split(' ').filter(Boolean)
    const allowedDistance = query.length >= 7 ? 2 : 1
    const fuzzy = queryWords.some((queryWord) => textWords.some((textWord) => (
      Math.abs(queryWord.length - textWord.length) <= allowedDistance
      && levenshtein(queryWord, textWord) <= allowedDistance
    )))
    return fuzzy ? 54 : 0
  }

  const buildSearchEntries = (nodes, assignments = []) => {
    const leadershipByPerson = new Map()
    const leadershipByUnit = new Map()
    assignments.forEach((assignment) => {
      if (!assignment?.personId || !assignment?.orgUnitId) return
      const text = [assignment.leadershipRole, assignment.exerciseType === 'PERSONAL_UNION' ? 'Personalunion' : '', assignment.note].filter(Boolean).join(' ')
      if (!leadershipByPerson.has(String(assignment.personId))) leadershipByPerson.set(String(assignment.personId), [])
      leadershipByPerson.get(String(assignment.personId)).push(text)
      if (!leadershipByUnit.has(String(assignment.orgUnitId))) leadershipByUnit.set(String(assignment.orgUnitId), [])
      leadershipByUnit.get(String(assignment.orgUnitId)).push(text)
    })

    return nodes.filter((node) => node?.id && node?.name).map((node) => {
      const id = String(node.id)
      const person = node.type === 'person'
      const functions = Array.isArray(node.functions) ? node.functions : Array.isArray(node.badges) ? node.badges : []
      const fields = [
        { value: node.name, kind: person ? 'person' : 'unit', label: person ? 'Person' : (typeLabels[node.baseType || node.type] || node.subtitle || 'OrgEinheit'), boost: 28 },
        { value: node.role, kind: 'function', label: node.role || 'Funktion', boost: 12 },
        { value: functions.join(' '), kind: 'function', label: functions.join(', '), boost: 9 },
        { value: node.subtitle, kind: person ? 'function' : 'unit', label: node.subtitle, boost: 4 },
        { value: node.location, kind: 'location', label: node.location, boost: 2 },
        { value: node.email, kind: 'contact', label: node.email, boost: 1 },
        { value: (leadershipByPerson.get(id) || []).join(' '), kind: 'leadership', label: (leadershipByPerson.get(id) || []).join(', '), boost: 10 },
        { value: (leadershipByUnit.get(id) || []).join(' '), kind: 'leadership', label: (leadershipByUnit.get(id) || []).join(', '), boost: 8 },
      ].filter((field) => field.value)
      return {
        id,
        targetType: person ? 'person' : 'unit',
        name: node.name,
        role: node.role || '',
        subtitle: node.subtitle || typeLabels[node.baseType || node.type] || '',
        parent: node.parent ? String(node.parent) : null,
        path: pathFor(nodes, id),
        fields,
      }
    })
  }

  const searchEntries = (entries, queryValue, limit = SEARCH_LIMIT, category = 'all') => {
    const query = normalizeText(queryValue)
    if (query.length < MIN_QUERY_LENGTH) return []
    return entries.map((entry) => {
      const matches = entry.fields.map((field) => ({
        ...field,
        score: scoreText(query, field.value) + field.boost,
      })).filter((field) => field.score > field.boost)
      const filtered = category === 'all' ? matches : matches.filter((field) => (
        category === 'people' ? entry.targetType === 'person'
          : category === 'units' ? entry.targetType === 'unit'
            : field.kind === category
      ))
      const best = filtered.sort((left, right) => right.score - left.score)[0]
      return best ? { ...entry, score: best.score, matchKind: best.kind, matchLabel: best.label } : null
    }).filter(Boolean)
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'de'))
      .slice(0, limit)
  }

  const normalizeView = (value, nodes = []) => {
    const validIds = new Set(nodes.filter((node) => node?.id).map((node) => String(node.id)))
    const expandedNodeIds = Array.isArray(value?.expandedNodeIds)
      ? [...new Set(value.expandedNodeIds.map(String).filter((id) => !validIds.size || validIds.has(id)))]
      : defaultExpandedIds(nodes)
    return {
      id: String(value?.id || `view-${Date.now()}`),
      owner: String(value?.owner || 'viewer'),
      name: String(value?.name || 'Meine Ansicht').trim() || 'Meine Ansicht',
      expandedNodeIds,
      focusNodeId: value?.focusNodeId && (!validIds.size || validIds.has(String(value.focusNodeId))) ? String(value.focusNodeId) : null,
      zoom: clamp(Number(value?.zoom) || 1, MIN_ZOOM, MAX_ZOOM),
      scrollLeft: Math.max(0, Number(value?.scrollLeft) || 0),
      scrollTop: Math.max(0, Number(value?.scrollTop) || 0),
      createdAt: String(value?.createdAt || new Date().toISOString()),
      updatedAt: String(value?.updatedAt || new Date().toISOString()),
    }
  }

  const publicApi = {
    fallbackNodes: clone(fallbackNodes),
    normalizeText,
    ancestorsOf,
    descendantsOf,
    pathFor,
    defaultExpandedIds,
    levenshtein,
    scoreText,
    buildSearchEntries,
    searchEntries,
    normalizeView,
    clamp,
  }

  if (typeof window !== 'undefined') window.MWOrgchartNavigation = publicApi
  if (typeof document === 'undefined') return

  const readJson = (key, fallback) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null')
      return parsed ?? fallback
    } catch {
      return fallback
    }
  }

  const loadNodes = () => {
    const stored = readJson(NODE_KEY, null)
    if (!Array.isArray(stored) || !stored.length) return clone(fallbackNodes)
    const merged = new Map(fallbackNodes.map((node) => [String(node.id), { ...node }]))
    stored.forEach((node) => {
      if (node?.id) merged.set(String(node.id), { ...(merged.get(String(node.id)) || {}), ...node, id: String(node.id) })
    })
    return [...merged.values()]
  }

  const loadAssignments = () => {
    const fromLeadershipModule = window.MWLeadershipDemo?.loadAssignments?.()
    if (Array.isArray(fromLeadershipModule)) return fromLeadershipModule
    const stored = readJson(LEADERSHIP_KEY, [])
    return Array.isArray(stored) ? stored : []
  }

  const loadViewStore = () => {
    const stored = readJson(VIEW_KEY, {})
    return {
      views: Array.isArray(stored.views) ? stored.views : [],
      defaults: stored.defaults && typeof stored.defaults === 'object' ? stored.defaults : {},
    }
  }

  const saveViewStore = (store) => localStorage.setItem(VIEW_KEY, JSON.stringify(store))
  const currentOwner = () => document.getElementById('roleSelect')?.value || 'viewer'

  let activeTree = null
  let activeWrap = null
  let toolbar = null
  let searchInput = null
  let searchPanel = null
  let focusBar = null
  let viewSelect = null
  let zoomLabel = null
  let previousViewButton = null
  let initializedOwner = null
  let searchTimer = null
  let searchCategory = 'all'
  let activeSearchIndex = -1
  let preSearchSnapshot = null
  let preFocusSnapshot = null
  let pointerState = null
  let scheduled = false

  const state = {
    expanded: new Set(),
    zoom: 1,
    focusNodeId: null,
    selectedViewId: null,
  }

  const nodes = () => loadNodes()
  const byId = () => nodeMap(nodes())

  const snapshot = () => ({
    expandedNodeIds: [...state.expanded],
    focusNodeId: state.focusNodeId,
    zoom: state.zoom,
    scrollLeft: activeWrap?.scrollLeft || 0,
    scrollTop: activeWrap?.scrollTop || 0,
  })

  const applySnapshot = (value, restoreScroll = true) => {
    const normalized = normalizeView({ ...value, owner: currentOwner(), name: value?.name || 'Ansicht' }, nodes())
    state.expanded = new Set(normalized.expandedNodeIds)
    state.focusNodeId = normalized.focusNodeId
    setZoom(normalized.zoom, null, false)
    applyTreeState()
    updateFocusBar()
    window.requestAnimationFrame(() => {
      if (restoreScroll && activeWrap) {
        activeWrap.scrollLeft = normalized.scrollLeft
        activeWrap.scrollTop = normalized.scrollTop
      }
    })
  }

  const loadInitialState = () => {
    const owner = currentOwner()
    const store = loadViewStore()
    const defaultId = store.defaults[owner]
    const defaultView = store.views.find((view) => view.id === defaultId && view.owner === owner)
    if (defaultView) {
      state.selectedViewId = defaultView.id
      applySnapshot(defaultView)
    } else {
      state.expanded = new Set(defaultExpandedIds(nodes()))
      state.focusNodeId = null
      state.zoom = 1
      state.selectedViewId = null
      applyTreeState()
      updateFocusBar()
      window.requestAnimationFrame(() => fitChart(false))
    }
    initializedOwner = owner
    refreshSavedViewControls()
  }

  const directChildren = (id) => nodes().filter((node) => String(node.parent || '') === String(id))
  const organizationalChildren = (id) => directChildren(id).filter((node) => node.type !== 'person')
  const peopleChildren = (id) => directChildren(id).filter((node) => node.type === 'person')

  const findCard = (id) => activeTree?.querySelector(`.node[data-id="${CSS.escape(String(id))}"]`) || null
  const wrapperForCard = (card) => card?.closest('.tree-node-wrap') || card?.parentElement || null
  const childrenElement = (wrapper) => Array.from(wrapper?.children || []).find((element) => element.classList?.contains('children')) || null
  const holderForWrapper = (wrapper) => wrapper?.parentElement?.classList?.contains('child-wrap') ? wrapper.parentElement : wrapper

  const allowedByFocus = () => {
    if (!state.focusNodeId) return null
    const currentNodes = nodes()
    return new Set([
      ...ancestorsOf(currentNodes, state.focusNodeId),
      state.focusNodeId,
      ...descendantsOf(currentNodes, state.focusNodeId),
    ])
  }

  const decorateNodes = () => {
    if (!activeTree) return
    activeTree.querySelectorAll('.node[data-id]').forEach((card) => {
      if (card.dataset.type === 'person' || card.classList.contains('person')) return
      const wrapper = wrapperForCard(card)
      if (!wrapper || wrapper.querySelector(':scope > .org-node-controls')) return
      const id = card.dataset.id
      const childCount = directChildren(id).length
      const orgCount = organizationalChildren(id).length
      const personCount = peopleChildren(id).length
      const controls = document.createElement('div')
      controls.className = 'org-node-controls'
      controls.innerHTML = `
        ${childCount ? `<button type="button" class="org-node-control org-node-toggle" data-org-toggle="${escapeHtml(id)}" aria-expanded="false" title="Nächste Ebene öffnen oder schließen"><span aria-hidden="true">+</span><small>${childCount}</small></button>` : ''}
        <button type="button" class="org-node-control org-node-focus" data-org-focus="${escapeHtml(id)}" title="Diesen Organisationszweig fokussieren" aria-label="${escapeHtml(card.textContent?.trim() || id)} fokussieren">◎</button>`
      wrapper.insertBefore(controls, childrenElement(wrapper))
      const toggle = controls.querySelector('[data-org-toggle]')
      toggle?.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (state.expanded.has(id)) state.expanded.delete(id)
        else state.expanded.add(id)
        state.selectedViewId = null
        applyTreeState()
        updateSavedViewSelection()
      })
      controls.querySelector('[data-org-focus]')?.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        focusBranch(id)
      })
      controls.dataset.summary = `${orgCount} OrgEinheiten, ${personCount} Personen`
    })
  }

  const applyTreeState = () => {
    if (!activeTree) return
    decorateNodes()
    const allowed = allowedByFocus()
    activeTree.querySelectorAll('.node[data-id]').forEach((card) => {
      const id = card.dataset.id
      const wrapper = wrapperForCard(card)
      const holder = holderForWrapper(wrapper)
      if (allowed && holder) holder.classList.toggle('org-focus-hidden', !allowed.has(id))
      else holder?.classList.remove('org-focus-hidden')
      if (card.dataset.type === 'person' || card.classList.contains('person')) return
      const children = childrenElement(wrapper)
      const expanded = state.expanded.has(id)
      if (children) children.hidden = !expanded
      const toggle = wrapper?.querySelector(`:scope > .org-node-controls [data-org-toggle="${CSS.escape(id)}"]`)
      if (toggle) {
        toggle.setAttribute('aria-expanded', String(expanded))
        const symbol = toggle.querySelector('span')
        if (symbol) symbol.textContent = expanded ? '−' : '+'
        const count = toggle.querySelector('small')
        if (count) count.hidden = expanded
      }
    })
    window.requestAnimationFrame(() => updateZoomLayout())
  }

  const updateZoomLayout = () => {
    if (!activeTree) return
    if ('zoom' in activeTree.style) {
      activeTree.style.zoom = String(state.zoom)
      activeTree.style.transform = ''
      activeTree.style.transformOrigin = ''
    } else {
      activeTree.style.zoom = ''
      activeTree.style.transform = `scale(${state.zoom})`
      activeTree.style.transformOrigin = 'top left'
      activeTree.style.marginBottom = `${Math.max(0, activeTree.scrollHeight * (state.zoom - 1))}px`
      activeTree.style.marginRight = `${Math.max(0, activeTree.scrollWidth * (state.zoom - 1))}px`
    }
    if (zoomLabel) zoomLabel.textContent = `${Math.round(state.zoom * 100)} %`
  }

  function setZoom(nextValue, focalPoint = null, updateSelection = true) {
    if (!activeWrap || !activeTree) return
    const previous = state.zoom
    const next = clamp(Math.round(Number(nextValue) * 100) / 100, MIN_ZOOM, MAX_ZOOM)
    if (Math.abs(next - previous) < 0.001) return
    const rect = activeWrap.getBoundingClientRect()
    const point = focalPoint || { x: rect.left + activeWrap.clientWidth / 2, y: rect.top + activeWrap.clientHeight / 2 }
    const offsetX = point.x - rect.left
    const offsetY = point.y - rect.top
    const contentX = (activeWrap.scrollLeft + offsetX) / previous
    const contentY = (activeWrap.scrollTop + offsetY) / previous
    state.zoom = next
    updateZoomLayout()
    activeWrap.scrollLeft = Math.max(0, contentX * next - offsetX)
    activeWrap.scrollTop = Math.max(0, contentY * next - offsetY)
    if (updateSelection) {
      state.selectedViewId = null
      updateSavedViewSelection()
    }
  }

  const fitChart = (updateSelection = true) => {
    if (!activeWrap || !activeTree) return
    const previous = state.zoom || 1
    const rect = activeTree.getBoundingClientRect()
    const naturalWidth = Math.max(1, rect.width / previous)
    const naturalHeight = Math.max(1, rect.height / previous)
    const availableWidth = Math.max(200, activeWrap.clientWidth - 48)
    const availableHeight = Math.max(200, activeWrap.clientHeight - 48)
    const fitted = clamp(Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1.25), MIN_ZOOM, MAX_ZOOM)
    state.zoom = Math.round(fitted * 100) / 100
    updateZoomLayout()
    window.requestAnimationFrame(() => {
      activeWrap.scrollLeft = Math.max(0, (activeWrap.scrollWidth - activeWrap.clientWidth) / 2)
      activeWrap.scrollTop = 0
    })
    if (updateSelection) {
      state.selectedViewId = null
      updateSavedViewSelection()
    }
  }

  const resetToBase = () => {
    state.expanded = new Set(defaultExpandedIds(nodes()))
    state.focusNodeId = null
    state.selectedViewId = null
    preFocusSnapshot = null
    applyTreeState()
    updateFocusBar()
    window.requestAnimationFrame(() => fitChart())
  }

  const focusBranch = (id) => {
    if (!preFocusSnapshot) preFocusSnapshot = snapshot()
    state.focusNodeId = String(id)
    ancestorsOf(nodes(), id).forEach((ancestorId) => state.expanded.add(ancestorId))
    state.expanded.add(String(id))
    state.selectedViewId = null
    applyTreeState()
    updateFocusBar()
    updateSavedViewSelection()
    window.requestAnimationFrame(() => fitChart())
  }

  const clearFocus = () => {
    if (preFocusSnapshot) {
      const restore = preFocusSnapshot
      preFocusSnapshot = null
      applySnapshot(restore)
    } else {
      state.focusNodeId = null
      applyTreeState()
      updateFocusBar()
    }
  }

  const updateFocusBar = () => {
    if (!focusBar) return
    if (!state.focusNodeId) {
      focusBar.hidden = true
      focusBar.innerHTML = ''
      return
    }
    const path = pathFor(nodes(), state.focusNodeId)
    focusBar.hidden = false
    focusBar.innerHTML = `<span><strong>Fokus:</strong> ${escapeHtml(path.join(' › '))}</span><button type="button" class="btn btn-ghost btn-small" data-org-clear-focus>Gesamtansicht</button>`
    focusBar.querySelector('[data-org-clear-focus]')?.addEventListener('click', clearFocus)
  }

  const toggleFullscreen = async () => {
    if (!activeWrap) return
    try {
      if (document.fullscreenElement === activeWrap) await document.exitFullscreen()
      else if (activeWrap.requestFullscreen) await activeWrap.requestFullscreen()
      else activeWrap.classList.toggle('org-chart-pseudo-fullscreen')
    } catch {
      activeWrap.classList.toggle('org-chart-pseudo-fullscreen')
    }
  }

  const bindPanAndZoom = () => {
    if (!activeWrap || activeWrap.dataset.orgNavigationBound === 'true') return
    activeWrap.dataset.orgNavigationBound = 'true'
    activeWrap.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button,input,select,textarea,a,.node')) return
      pointerState = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: activeWrap.scrollLeft,
        top: activeWrap.scrollTop,
      }
      activeWrap.classList.add('org-chart-panning')
      activeWrap.setPointerCapture?.(event.pointerId)
    })
    activeWrap.addEventListener('pointermove', (event) => {
      if (!pointerState || pointerState.id !== event.pointerId) return
      activeWrap.scrollLeft = pointerState.left - (event.clientX - pointerState.x)
      activeWrap.scrollTop = pointerState.top - (event.clientY - pointerState.y)
    })
    const endPan = (event) => {
      if (!pointerState || pointerState.id !== event.pointerId) return
      pointerState = null
      activeWrap.classList.remove('org-chart-panning')
    }
    activeWrap.addEventListener('pointerup', endPan)
    activeWrap.addEventListener('pointercancel', endPan)
    activeWrap.addEventListener('wheel', (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoom(state.zoom + (event.deltaY < 0 ? 0.1 : -0.1), { x: event.clientX, y: event.clientY })
    }, { passive: false })
  }

  const visibleViews = () => {
    const owner = currentOwner()
    return loadViewStore().views
      .filter((view) => view.owner === owner)
      .sort((left, right) => left.name.localeCompare(right.name, 'de'))
  }

  const updateSavedViewSelection = () => {
    if (viewSelect) viewSelect.value = state.selectedViewId || ''
    const selected = Boolean(state.selectedViewId)
    toolbar?.querySelector('[data-org-default-view]')?.toggleAttribute('disabled', !selected)
    toolbar?.querySelector('[data-org-delete-view]')?.toggleAttribute('disabled', !selected)
  }

  const refreshSavedViewControls = () => {
    if (!viewSelect) return
    const store = loadViewStore()
    const owner = currentOwner()
    const defaultId = store.defaults[owner]
    const views = visibleViews()
    viewSelect.innerHTML = `<option value="">Meine Ansichten</option>${views.map((view) => `<option value="${escapeHtml(view.id)}">${view.id === defaultId ? '★ ' : ''}${escapeHtml(view.name)}</option>`).join('')}`
    updateSavedViewSelection()
  }

  const saveCurrentView = () => {
    const store = loadViewStore()
    const owner = currentOwner()
    const selected = store.views.find((view) => view.id === state.selectedViewId && view.owner === owner)
    const proposed = window.prompt('Name der Ansicht', selected?.name || 'Meine Organigramm-Ansicht')
    if (!proposed?.trim()) return
    const now = new Date().toISOString()
    const existingByName = store.views.find((view) => view.owner === owner && normalizeText(view.name) === normalizeText(proposed))
    const id = selected?.id || existingByName?.id || `view-${Date.now()}`
    const current = normalizeView({
      ...snapshot(),
      id,
      owner,
      name: proposed.trim(),
      createdAt: selected?.createdAt || existingByName?.createdAt || now,
      updatedAt: now,
    }, nodes())
    store.views = [...store.views.filter((view) => view.id !== id), current]
    saveViewStore(store)
    state.selectedViewId = id
    refreshSavedViewControls()
  }

  const loadSelectedView = () => {
    if (!viewSelect?.value) return
    const store = loadViewStore()
    const view = store.views.find((item) => item.id === viewSelect.value && item.owner === currentOwner())
    if (!view) return
    state.selectedViewId = view.id
    preFocusSnapshot = null
    preSearchSnapshot = null
    applySnapshot(view)
    updateSavedViewSelection()
  }

  const setDefaultView = () => {
    if (!state.selectedViewId) return
    const store = loadViewStore()
    store.defaults[currentOwner()] = state.selectedViewId
    saveViewStore(store)
    refreshSavedViewControls()
  }

  const deleteSelectedView = () => {
    if (!state.selectedViewId) return
    const store = loadViewStore()
    const view = store.views.find((item) => item.id === state.selectedViewId)
    if (!view || !window.confirm(`Gespeicherte Ansicht „${view.name}“ löschen?`)) return
    store.views = store.views.filter((item) => item.id !== state.selectedViewId)
    if (store.defaults[currentOwner()] === state.selectedViewId) delete store.defaults[currentOwner()]
    saveViewStore(store)
    state.selectedViewId = null
    refreshSavedViewControls()
  }

  const openPersonProfile = (id) => {
    const card = findCard(id)
    if (!card) return
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  }

  const revealSearchTarget = (id) => {
    if (!preSearchSnapshot) preSearchSnapshot = snapshot()
    const targetId = String(id)
    state.focusNodeId = null
    ancestorsOf(nodes(), targetId).forEach((ancestorId) => state.expanded.add(ancestorId))
    const target = byId().get(targetId)
    if (target?.type !== 'person') state.expanded.add(targetId)
    state.selectedViewId = null
    applyTreeState()
    updateFocusBar()
    updateSavedViewSelection()
    window.requestAnimationFrame(() => {
      const card = findCard(targetId)
      if (!card) return
      card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      card.classList.add('org-search-target')
      window.setTimeout(() => card.classList.remove('org-search-target'), 2200)
      if (previousViewButton) previousViewButton.hidden = false
    })
  }

  const restorePreviousSearchView = () => {
    if (!preSearchSnapshot) return
    const restore = preSearchSnapshot
    preSearchSnapshot = null
    applySnapshot(restore)
    if (previousViewButton) previousViewButton.hidden = true
  }

  const resultKindLabel = (entry) => ({
    person: 'Person', unit: entry.subtitle || 'OrgEinheit', leadership: 'Leitungsfunktion', function: 'Funktion', location: 'Standort', contact: 'Kontakt',
  })[entry.matchKind] || entry.subtitle || 'Treffer'

  const renderSearchResults = () => {
    if (!searchPanel || !searchInput) return
    const query = searchInput.value.trim()
    activeSearchIndex = -1
    if (normalizeText(query).length < MIN_QUERY_LENGTH) {
      searchPanel.hidden = false
      searchPanel.innerHTML = `<p class="org-search-hint">Ab drei Zeichen erscheinen passende Personen, OrgEinheiten und Funktionen.</p>`
      return
    }
    const entries = buildSearchEntries(nodes(), loadAssignments())
    const results = searchEntries(entries, query, SEARCH_LIMIT, searchCategory)
    const allCount = searchEntries(entries, query, Number.MAX_SAFE_INTEGER, searchCategory).length
    searchPanel.hidden = false
    searchPanel.innerHTML = `
      <div class="org-search-panel-head"><span><strong>${allCount}</strong> Treffer für „${escapeHtml(query)}“</span><button type="button" class="org-search-close" data-org-search-close aria-label="Suchergebnisse schließen">×</button></div>
      <div class="org-search-filters" role="group" aria-label="Suchergebnisse filtern">
        ${[['all','Alle'],['people','Personen'],['units','OrgEinheiten'],['leadership','Leitungen'],['function','Funktionen']].map(([value, label]) => `<button type="button" data-org-search-category="${value}" class="${searchCategory === value ? 'active' : ''}">${label}</button>`).join('')}
      </div>
      ${results.length ? `<div class="org-search-list" role="listbox">${results.map((entry, index) => `
        <article class="org-search-result" role="option" data-org-search-result="${index}" aria-selected="false">
          <button type="button" class="org-search-main" data-org-search-show="${escapeHtml(entry.id)}">
            <span class="org-search-kind">${escapeHtml(resultKindLabel(entry))}</span>
            <strong>${escapeHtml(entry.name)}</strong>
            <small>${escapeHtml(entry.role || entry.matchLabel || entry.subtitle || '')}</small>
            <em>${escapeHtml(entry.path.join(' › '))}</em>
          </button>
          ${entry.targetType === 'person' ? `<button type="button" class="org-search-profile" data-org-search-profile="${escapeHtml(entry.id)}">Profil öffnen</button>` : ''}
        </article>`).join('')}</div>` : '<p class="org-search-empty">Keine passenden Ergebnisse gefunden.</p>'}
      ${allCount > SEARCH_LIMIT ? `<p class="org-search-more">Es werden die besten ${SEARCH_LIMIT} Treffer angezeigt.</p>` : ''}`

    searchPanel.querySelector('[data-org-search-close]')?.addEventListener('click', () => { searchPanel.hidden = true })
    searchPanel.querySelectorAll('[data-org-search-category]').forEach((button) => button.addEventListener('click', () => {
      searchCategory = button.dataset.orgSearchCategory
      renderSearchResults()
    }))
    searchPanel.querySelectorAll('[data-org-search-show]').forEach((button) => button.addEventListener('click', () => revealSearchTarget(button.dataset.orgSearchShow)))
    searchPanel.querySelectorAll('[data-org-search-profile]').forEach((button) => button.addEventListener('click', () => openPersonProfile(button.dataset.orgSearchProfile)))
  }

  const moveSearchSelection = (direction) => {
    const items = [...(searchPanel?.querySelectorAll('[data-org-search-result]') || [])]
    if (!items.length) return
    activeSearchIndex = (activeSearchIndex + direction + items.length) % items.length
    items.forEach((item, index) => {
      const active = index === activeSearchIndex
      item.classList.toggle('active', active)
      item.setAttribute('aria-selected', String(active))
      if (active) item.scrollIntoView({ block: 'nearest' })
    })
  }

  const bindSearch = () => {
    if (!toolbar) return
    const candidate = toolbar.querySelector('input[type="search"], input[placeholder*="such" i]')
    if (!candidate) return
    searchInput = candidate
    searchInput.setAttribute('autocomplete', 'off')
    searchInput.setAttribute('aria-autocomplete', 'list')
    searchInput.setAttribute('aria-expanded', 'false')
    const baseSearchButton = [...toolbar.querySelectorAll('button')].find((button) => /^suchen$/i.test(button.textContent?.trim() || ''))
    if (baseSearchButton) baseSearchButton.hidden = true
    if (!searchPanel) {
      searchPanel = document.createElement('section')
      searchPanel.className = 'org-search-panel'
      searchPanel.id = 'org-search-results'
      searchPanel.hidden = true
      toolbar.after(searchPanel)
      searchInput.setAttribute('aria-controls', searchPanel.id)
    }
    if (searchInput.dataset.orgSearchBound === 'true') return
    searchInput.dataset.orgSearchBound = 'true'
    searchInput.addEventListener('input', () => {
      window.clearTimeout(searchTimer)
      searchInput.setAttribute('aria-expanded', 'true')
      searchTimer = window.setTimeout(renderSearchResults, 230)
    })
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) renderSearchResults()
    })
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault(); event.stopImmediatePropagation(); moveSearchSelection(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault(); event.stopImmediatePropagation(); moveSearchSelection(-1)
      } else if (event.key === 'Enter') {
        const selected = searchPanel?.querySelector(`[data-org-search-result="${activeSearchIndex}"] [data-org-search-show]`)
        if (selected) {
          event.preventDefault(); event.stopImmediatePropagation(); selected.click()
        }
      } else if (event.key === 'Escape') {
        searchPanel.hidden = true
        searchInput.setAttribute('aria-expanded', 'false')
      }
    }, true)
  }

  const ensureControls = () => {
    if (!activeWrap || !activeTree) return
    toolbar = activeWrap.previousElementSibling?.classList?.contains('toolbar')
      ? activeWrap.previousElementSibling
      : activeWrap.parentElement?.querySelector('.toolbar')
    if (!toolbar) return
    let controls = toolbar.querySelector('[data-org-navigation-controls]')
    if (!controls) {
      controls = document.createElement('div')
      controls.className = 'org-navigation-controls'
      controls.dataset.orgNavigationControls = 'true'
      controls.innerHTML = `
        <div class="org-zoom-controls" role="group" aria-label="Zoom und Ansicht">
          <button type="button" class="btn btn-ghost btn-small" data-org-zoom-out aria-label="Verkleinern">−</button>
          <span class="org-zoom-label" aria-live="polite">100 %</span>
          <button type="button" class="btn btn-ghost btn-small" data-org-zoom-in aria-label="Vergrößern">+</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-fit>Alles einpassen</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-base>Basisansicht</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-fullscreen>Vollbild</button>
        </div>
        <div class="org-view-controls" role="group" aria-label="Gespeicherte Ansichten">
          <select data-org-view-select aria-label="Gespeicherte Ansicht auswählen"><option value="">Meine Ansichten</option></select>
          <button type="button" class="btn btn-ghost btn-small" data-org-save-view>Ansicht speichern</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-default-view disabled>Als Start</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-delete-view disabled>Löschen</button>
          <button type="button" class="btn btn-ghost btn-small" data-org-previous-view hidden>Vorherige Ansicht</button>
        </div>`
      toolbar.append(controls)
      controls.querySelector('[data-org-zoom-out]').addEventListener('click', () => setZoom(state.zoom - 0.1))
      controls.querySelector('[data-org-zoom-in]').addEventListener('click', () => setZoom(state.zoom + 0.1))
      controls.querySelector('[data-org-fit]').addEventListener('click', () => fitChart())
      controls.querySelector('[data-org-base]').addEventListener('click', resetToBase)
      controls.querySelector('[data-org-fullscreen]').addEventListener('click', toggleFullscreen)
      controls.querySelector('[data-org-save-view]').addEventListener('click', saveCurrentView)
      controls.querySelector('[data-org-default-view]').addEventListener('click', setDefaultView)
      controls.querySelector('[data-org-delete-view]').addEventListener('click', deleteSelectedView)
      controls.querySelector('[data-org-previous-view]').addEventListener('click', restorePreviousSearchView)
      viewSelect = controls.querySelector('[data-org-view-select]')
      viewSelect.addEventListener('change', loadSelectedView)
      zoomLabel = controls.querySelector('.org-zoom-label')
      previousViewButton = controls.querySelector('[data-org-previous-view]')
    } else {
      viewSelect = controls.querySelector('[data-org-view-select]')
      zoomLabel = controls.querySelector('.org-zoom-label')
      previousViewButton = controls.querySelector('[data-org-previous-view]')
    }
    if (!focusBar) {
      focusBar = document.createElement('div')
      focusBar.className = 'org-focus-bar'
      focusBar.hidden = true
      activeWrap.before(focusBar)
    }
    bindSearch()
    refreshSavedViewControls()
    updateZoomLayout()
    updateFocusBar()
  }

  const enhanceChart = () => {
    const tree = document.querySelector('.chart-wrap .tree')
    if (!tree) {
      activeTree = null
      activeWrap = null
      toolbar = null
      searchPanel = null
      focusBar = null
      initializedOwner = null
      return
    }
    const wrap = tree.closest('.chart-wrap')
    const treeChanged = tree !== activeTree
    activeTree = tree
    activeWrap = wrap
    ensureControls()
    decorateNodes()
    bindPanAndZoom()
    if (treeChanged || initializedOwner !== currentOwner()) loadInitialState()
    else applyTreeState()
  }

  const start = () => {
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      localStorage.removeItem(VIEW_KEY)
      initializedOwner = null
      state.selectedViewId = null
      preSearchSnapshot = null
      preFocusSnapshot = null
    }, true)
    document.getElementById('switchRoleBtn')?.addEventListener('click', () => {
      initializedOwner = null
      state.selectedViewId = null
      preSearchSnapshot = null
      preFocusSnapshot = null
    }, true)
    new MutationObserver(() => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        enhanceChart()
      })
    }).observe(document.body, { childList: true, subtree: true })
    enhanceChart()
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
