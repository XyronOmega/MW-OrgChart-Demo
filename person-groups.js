/**
 * Kompakte Personendarstellung und frei sortierbare Unterkategorien je OrgEinheit.
 *
 * Personen bleiben ihrer OrgEinheit zugeordnet. Eine aktive Leitungsfunktion
 * in genau dieser OrgEinheit verschiebt die Person automatisch in den
 * Leitungsbereich der OrgEinheit; alle übrigen Personen erscheinen nach
 * Unterkategorie gruppiert und nach Nachname sortiert innerhalb derselben Karte.
 */
(() => {
  const NODE_KEY = 'mw-demo-nodes'
  const GROUP_KEY = 'mw-demo-person-groups-v1'
  const LEADERSHIP_KEY = 'mw-demo-leadership-assignments'
  const DIRECT_PREFIX = 'direct:'

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
    { id: 'p1', parent: 'pm-hrbp', type: 'person', name: 'Lea Beispiel', firstName: 'Lea', lastName: 'Beispiel', role: 'HR Business Partner', email: 'lea.beispiel@example.org', location: 'Zentrale' },
    { id: 'p2', parent: 'pm-hrbp', type: 'person', name: 'Noah Muster', firstName: 'Noah', lastName: 'Muster', role: 'HR Business Partner', email: 'noah.muster@example.org', location: 'Zentrale' },
    { id: 'p3', parent: 'pm-sb', type: 'person', name: 'Mila Demo', firstName: 'Mila', lastName: 'Demo', role: 'Sachbearbeitung', email: 'mila.demo@example.org', location: 'Servicecenter Nord' },
    { id: 'p4', parent: 'pa-pay', type: 'person', name: 'Elias Test', firstName: 'Elias', lastName: 'Test', role: 'Entgeltabrechnung', email: 'elias.test@example.org', location: 'Zentrale' },
    { id: 'p5', parent: 'pa-time', type: 'person', name: 'Lina Probe', firstName: 'Lina', lastName: 'Probe', role: 'Zeitwirtschaft', email: 'lina.probe@example.org', location: 'Servicecenter Nord' },
    { id: 'p6', parent: 'pe-learning', type: 'person', name: 'Finn Beispiel', firstName: 'Finn', lastName: 'Beispiel', role: 'Personalentwicklung', email: 'finn.beispiel@example.org', location: 'Zentrale' },
    { id: 'p7', parent: 'pe-onboarding', type: 'person', name: 'Emma Muster', firstName: 'Emma', lastName: 'Muster', role: 'Onboarding', email: 'emma.muster@example.org', location: 'Zentrale' },
    { id: 'p8', parent: 'pc-bgsm', type: 'person', name: 'Luis Demo', firstName: 'Luis', lastName: 'Demo', role: 'BGSM', email: 'luis.demo@example.org', location: 'Technikstandort' },
    { id: 'p9', parent: 'pc-control', type: 'person', name: 'Sofia Test', firstName: 'Sofia', lastName: 'Test', role: 'HR-Controlling', email: 'sofia.test@example.org', location: 'Zentrale' },
  ]

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])
  const normalizeText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLocaleLowerCase('de-DE')
    .trim()

  const directId = (orgUnitId) => `${DIRECT_PREFIX}${orgUnitId}`
  const isDirectGroup = (group) => group?.kind === 'DIRECT' || String(group?.id || '').startsWith(DIRECT_PREFIX)

  const normalizeGroup = (value, index = 0) => ({
    id: String(value?.id || `group-${Date.now()}-${index}`),
    orgUnitId: String(value?.orgUnitId || ''),
    name: String(value?.name || (isDirectGroup(value) ? 'Direkt zugeordnet' : 'Neue Unterkategorie')).trim() || 'Neue Unterkategorie',
    kind: isDirectGroup(value) ? 'DIRECT' : 'CATEGORY',
    sortOrder: Number.isFinite(Number(value?.sortOrder)) ? Number(value.sortOrder) : (index + 1) * 10,
    active: value?.active !== false,
  })

  const ensureDirectGroup = (groups, orgUnitId) => {
    const normalized = groups.map(normalizeGroup).filter((group) => group.orgUnitId)
    if (normalized.some((group) => group.orgUnitId === orgUnitId && isDirectGroup(group))) return normalized
    const maxOrder = normalized
      .filter((group) => group.orgUnitId === orgUnitId)
      .reduce((maximum, group) => Math.max(maximum, group.sortOrder), 0)
    return [...normalized, normalizeGroup({
      id: directId(orgUnitId),
      orgUnitId,
      name: 'Direkt zugeordnet',
      kind: 'DIRECT',
      sortOrder: maxOrder + 10,
      active: true,
    })]
  }

  const groupsForUnit = (groups, orgUnitId) => ensureDirectGroup(groups, orgUnitId)
    .filter((group) => group.orgUnitId === orgUnitId && group.active !== false)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'de'))

  const reorderGroups = (groups, orgUnitId, orderedIds) => {
    const ensured = ensureDirectGroup(groups, orgUnitId)
    const unitGroups = groupsForUnit(ensured, orgUnitId)
    const validIds = new Set(unitGroups.map((group) => group.id))
    const order = [...orderedIds.map(String).filter((id) => validIds.has(id))]
    unitGroups.forEach((group) => { if (!order.includes(group.id)) order.push(group.id) })
    const orderMap = new Map(order.map((id, index) => [id, (index + 1) * 10]))
    return ensured.map((group) => group.orgUnitId === orgUnitId
      ? { ...group, sortOrder: orderMap.get(group.id) ?? group.sortOrder }
      : group)
  }

  const surnameParts = (person) => {
    const explicitLast = String(person?.lastName || '').trim()
    const explicitFirst = String(person?.firstName || '').trim()
    if (explicitLast) return { lastName: explicitLast, firstName: explicitFirst || String(person?.name || '').trim() }
    const parts = String(person?.name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return { lastName: '', firstName: '' }
    if (parts.length === 1) return { lastName: parts[0], firstName: '' }
    let start = parts.length - 1
    const particles = new Set(['von', 'van', 'de', 'del', 'der', 'den', 'zu', 'zur', 'zum'])
    while (start > 0 && particles.has(parts[start - 1].toLocaleLowerCase('de-DE'))) start -= 1
    return {
      lastName: parts.slice(start).join(' '),
      firstName: parts.slice(0, start).join(' '),
    }
  }

  const comparePeopleBySurname = (left, right) => {
    const leftParts = surnameParts(left)
    const rightParts = surnameParts(right)
    return leftParts.lastName.localeCompare(rightParts.lastName, 'de', { sensitivity: 'base' })
      || leftParts.firstName.localeCompare(rightParts.firstName, 'de', { sensitivity: 'base' })
      || String(left?.name || '').localeCompare(String(right?.name || ''), 'de', { sensitivity: 'base' })
  }

  const dateValue = (value, fallback) => value ? new Date(`${value}T00:00:00`).getTime() : fallback
  const isAssignmentActive = (assignment, onDate = new Date()) => {
    const day = new Date(onDate)
    day.setHours(0, 0, 0, 0)
    const time = day.getTime()
    return dateValue(assignment?.validFrom, Number.NEGATIVE_INFINITY) <= time
      && dateValue(assignment?.validTo, Number.POSITIVE_INFINITY) >= time
  }

  const activeLeaderIdsForUnit = (assignments, orgUnitId, onDate = new Date()) => new Set(
    assignments
      .filter((assignment) => String(assignment?.orgUnitId || '') === String(orgUnitId)
        && assignment?.personId
        && isAssignmentActive(assignment, onDate))
      .map((assignment) => String(assignment.personId)),
  )

  const groupPeopleForUnit = (nodes, groups, assignments, orgUnitId, onDate = new Date()) => {
    const unitPeople = nodes.filter((node) => node?.type === 'person' && String(node.parent || '') === String(orgUnitId))
    const leaderIds = activeLeaderIdsForUnit(assignments, orgUnitId, onDate)
    const visiblePeople = unitPeople.filter((person) => !leaderIds.has(String(person.id)))
    const orderedGroups = groupsForUnit(groups, orgUnitId)
    const validCategoryIds = new Set(orderedGroups.filter((group) => !isDirectGroup(group)).map((group) => group.id))
    const byGroup = new Map(orderedGroups.map((group) => [group.id, []]))
    const direct = orderedGroups.find(isDirectGroup)

    visiblePeople.forEach((person) => {
      const requested = String(person.subcategoryId || '')
      const targetId = validCategoryIds.has(requested) ? requested : direct.id
      byGroup.get(targetId).push(person)
    })

    return {
      leaders: unitPeople.filter((person) => leaderIds.has(String(person.id))).sort(comparePeopleBySurname),
      memberCount: visiblePeople.length,
      groups: orderedGroups.map((group) => ({
        ...group,
        people: (byGroup.get(group.id) || []).sort(comparePeopleBySurname),
      })),
    }
  }

  const removeCategoryAndReassign = (groups, nodes, categoryId) => {
    const category = groups.map(normalizeGroup).find((group) => group.id === categoryId)
    if (!category || isDirectGroup(category)) return { groups, nodes }
    return {
      groups: groups.filter((group) => group.id !== categoryId),
      nodes: nodes.map((node) => node?.type === 'person'
        && String(node.parent || '') === category.orgUnitId
        && String(node.subcategoryId || '') === categoryId
        ? { ...node, subcategoryId: null }
        : node),
    }
  }

  const resolvePersonTarget = (nodes, personId) => {
    const person = nodes.find((node) => String(node?.id || '') === String(personId) && node.type === 'person')
    return person?.parent ? String(person.parent) : null
  }

  const publicApi = {
    fallbackNodes: clone(fallbackNodes),
    normalizeText,
    normalizeGroup,
    ensureDirectGroup,
    groupsForUnit,
    reorderGroups,
    surnameParts,
    comparePeopleBySurname,
    isAssignmentActive,
    activeLeaderIdsForUnit,
    groupPeopleForUnit,
    removeCategoryAndReassign,
    resolvePersonTarget,
    directId,
    isDirectGroup,
  }

  if (typeof window !== 'undefined') window.MWPersonGroups = publicApi
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
    const base = Array.isArray(window.MWOrgchartNavigation?.fallbackNodes)
      ? window.MWOrgchartNavigation.fallbackNodes
      : fallbackNodes
    if (!Array.isArray(stored) || !stored.length) return clone(base)
    const merged = new Map(base.map((node) => [String(node.id), { ...node }]))
    stored.forEach((node) => {
      if (node?.id) merged.set(String(node.id), { ...(merged.get(String(node.id)) || {}), ...node, id: String(node.id) })
    })
    return [...merged.values()]
  }

  const saveNodes = (nodes) => {
    localStorage.setItem(NODE_KEY, JSON.stringify(nodes))
    window.dispatchEvent(new CustomEvent('mw-demo-nodes-changed'))
  }

  const loadGroups = () => {
    const stored = readJson(GROUP_KEY, [])
    return Array.isArray(stored) ? stored.map(normalizeGroup).filter((group) => group.orgUnitId) : []
  }

  const saveGroups = (groups) => {
    localStorage.setItem(GROUP_KEY, JSON.stringify(groups.map(normalizeGroup)))
    window.dispatchEvent(new CustomEvent('mw-demo-person-groups-changed'))
  }

  const loadAssignments = () => {
    const fromLeadership = window.MWLeadershipDemo?.loadAssignments?.()
    if (Array.isArray(fromLeadership)) return fromLeadership
    const stored = readJson(LEADERSHIP_KEY, [])
    return Array.isArray(stored) ? stored : []
  }

  const role = () => document.getElementById('roleSelect')?.value || 'viewer'
  const canEdit = () => ['editor', 'admin', 'superadmin'].includes(role())
  const units = () => loadNodes().filter((node) => node.type !== 'person' && node.isActive !== false)
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
  const peopleForUnit = (unitId) => loadNodes().filter((node) => node.type === 'person' && String(node.parent || '') === String(unitId))
    .sort(comparePeopleBySurname)
  const unitName = (unitId) => loadNodes().find((node) => String(node.id) === String(unitId))?.name || unitId

  let selectedUnitId = null
  let currentGroupsView = false
  let draggedGroupId = null
  let scheduled = false
  let highlightedPersonId = null

  const currentUnitId = () => {
    const available = units()
    if (selectedUnitId && available.some((unit) => String(unit.id) === String(selectedUnitId))) return selectedUnitId
    const withPeople = available.find((unit) => peopleForUnit(unit.id).length)
    selectedUnitId = String(withPeople?.id || available[0]?.id || '')
    return selectedUnitId
  }

  const createCategory = (orgUnitId, name) => {
    const cleanName = String(name || '').trim()
    if (!cleanName) return 'Bitte einen Namen für die Unterkategorie eingeben.'
    let groups = ensureDirectGroup(loadGroups(), orgUnitId)
    const duplicate = groups.some((group) => group.orgUnitId === orgUnitId
      && !isDirectGroup(group)
      && normalizeText(group.name) === normalizeText(cleanName))
    if (duplicate) return 'Diese Unterkategorie besteht in der OrgEinheit bereits.'
    const unitGroups = groupsForUnit(groups, orgUnitId)
    const directIndex = unitGroups.findIndex(isDirectGroup)
    const insertIndex = directIndex >= 0 ? directIndex : unitGroups.length
    const category = normalizeGroup({
      id: `group-${orgUnitId}-${Date.now()}`,
      orgUnitId,
      name: cleanName,
      kind: 'CATEGORY',
      sortOrder: (insertIndex + 1) * 10,
    })
    const order = unitGroups.map((group) => group.id)
    order.splice(insertIndex, 0, category.id)
    groups = reorderGroups([...groups, category], orgUnitId, order)
    saveGroups(groups)
    return null
  }

  const assignPerson = (personId, subcategoryId) => {
    const nodes = loadNodes()
    const next = nodes.map((node) => String(node.id) === String(personId) && node.type === 'person'
      ? { ...node, subcategoryId: subcategoryId && !String(subcategoryId).startsWith(DIRECT_PREFIX) ? String(subcategoryId) : null }
      : node)
    saveNodes(next)
  }

  const renameCategory = (categoryId, name) => {
    const clean = String(name || '').trim()
    if (!clean) return
    const groups = loadGroups().map((group) => group.id === categoryId && !isDirectGroup(group) ? { ...group, name: clean } : group)
    saveGroups(groups)
  }

  const moveGroup = (orgUnitId, groupId, direction) => {
    const groups = ensureDirectGroup(loadGroups(), orgUnitId)
    const ordered = groupsForUnit(groups, orgUnitId).map((group) => group.id)
    const index = ordered.indexOf(groupId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    saveGroups(reorderGroups(groups, orgUnitId, ordered))
  }

  const persistDropOrder = (orgUnitId, draggedId, targetId) => {
    const groups = ensureDirectGroup(loadGroups(), orgUnitId)
    const ordered = groupsForUnit(groups, orgUnitId).map((group) => group.id)
    const from = ordered.indexOf(draggedId)
    const to = ordered.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    ordered.splice(from, 1)
    ordered.splice(to, 0, draggedId)
    saveGroups(reorderGroups(groups, orgUnitId, ordered))
  }

  const renderGroupRows = (orgUnitId) => {
    const groups = groupsForUnit(loadGroups(), orgUnitId)
    return groups.map((group, index) => `
      <article class="mw-person-group-row ${isDirectGroup(group) ? 'is-direct' : ''}" draggable="${canEdit() ? 'true' : 'false'}" data-person-group-row="${escapeHtml(group.id)}">
        <span class="mw-person-group-drag" aria-hidden="true">☰</span>
        <div class="mw-person-group-row-main">
          ${isDirectGroup(group)
            ? `<strong>Direkt zugeordnet</strong><small>Personen ohne Unterkategorie</small>`
            : `<label><span>Unterkategorie</span><input value="${escapeHtml(group.name)}" data-person-group-name="${escapeHtml(group.id)}" ${canEdit() ? '' : 'disabled'}></label>`}
        </div>
        <div class="mw-person-group-row-actions">
          <button type="button" class="btn btn-ghost btn-small" data-person-group-up="${escapeHtml(group.id)}" ${!canEdit() || index === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button>
          <button type="button" class="btn btn-ghost btn-small" data-person-group-down="${escapeHtml(group.id)}" ${!canEdit() || index === groups.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button>
          ${isDirectGroup(group) ? '' : `<button type="button" class="btn btn-danger btn-small" data-person-group-delete="${escapeHtml(group.id)}" ${canEdit() ? '' : 'disabled'}>Löschen</button>`}
        </div>
      </article>`).join('')
  }

  const renderPeopleAssignments = (orgUnitId) => {
    const people = peopleForUnit(orgUnitId)
    const groups = groupsForUnit(loadGroups(), orgUnitId)
    const assignments = loadAssignments()
    const leaderIds = activeLeaderIdsForUnit(assignments, orgUnitId)
    if (!people.length) return '<p class="mw-person-groups-empty">Dieser OrgEinheit sind derzeit keine Personen direkt zugeordnet.</p>'
    return people.map((person) => {
      const category = groups.find((group) => group.id === person.subcategoryId && !isDirectGroup(group))
      const selected = category?.id || directId(orgUnitId)
      const leader = leaderIds.has(String(person.id))
      return `
        <article class="mw-person-assignment-row">
          <div><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.role || 'Mitarbeitende Person')}</span>${leader ? '<em>Leitungsfunktion – wird nicht in der Mitarbeitendenliste angezeigt</em>' : ''}</div>
          <label><span>Interne Zuordnung</span><select data-person-subcategory-person="${escapeHtml(person.id)}" ${canEdit() ? '' : 'disabled'}>
            ${groups.map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === selected ? 'selected' : ''}>${escapeHtml(group.name)}</option>`).join('')}
          </select></label>
        </article>`
    }).join('')
  }

  const renderGroupsCenter = () => {
    currentGroupsView = true
    const content = document.getElementById('content')
    const nav = document.getElementById('nav')
    if (!content || !nav) return
    const orgUnitId = currentUnitId()
    nav.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.personGroupsView === 'center'))
    content.innerHTML = `
      <section class="mw-person-groups-page" data-person-groups-page>
        <header class="mw-person-groups-heading">
          <span>Interne Gliederung der OrgEinheit</span>
          <h2>Unterkategorien und Mitarbeitende</h2>
          <p>Unterkategorien erzeugen weder eigene OrgEinheiten noch Leitungsfunktionen. Ihre Reihenfolge wird je OrgEinheit manuell festgelegt; Personen innerhalb einer Kategorie werden automatisch nach Nachname sortiert.</p>
        </header>
        <label class="field mw-person-groups-unit-select"><span>OrgEinheit auswählen</span><select data-person-groups-unit>
          ${units().map((unit) => `<option value="${escapeHtml(unit.id)}" ${String(unit.id) === String(orgUnitId) ? 'selected' : ''}>${escapeHtml(unit.name)}</option>`).join('')}
        </select></label>
        <div class="mw-person-groups-layout">
          <section class="mw-person-groups-panel">
            <div class="mw-person-groups-panel-head"><div><span>Darstellung im Kästchen</span><h3>${escapeHtml(unitName(orgUnitId))}</h3></div><strong>${groupsForUnit(loadGroups(), orgUnitId).length} Bereiche</strong></div>
            <p>Die Reihenfolge kann per Drag-and-drop oder mit den Pfeiltasten verändert werden. „Direkt zugeordnet“ ist ein Systembereich und kann ebenfalls frei positioniert werden.</p>
            <div class="mw-person-group-list" data-person-group-list>${renderGroupRows(orgUnitId)}</div>
            ${canEdit() ? `<form class="mw-person-group-add" data-person-group-add><label class="field"><span>Neue Unterkategorie</span><input name="name" placeholder="z. B. Recruiting" autocomplete="off"></label><button type="submit" class="btn btn-primary">Hinzufügen</button><p data-person-group-message></p></form>` : '<p class="mw-person-groups-readonly">Die aktive Rolle darf die Struktur ansehen, aber nicht bearbeiten.</p>'}
          </section>
          <section class="mw-person-groups-panel">
            <div class="mw-person-groups-panel-head"><div><span>Personenzuordnung</span><h3>Mitarbeitende</h3></div><strong>${peopleForUnit(orgUnitId).length} Personen</strong></div>
            <p>Eine aktive Leitungsfunktion in dieser OrgEinheit hat Vorrang. Die Person bleibt zugeordnet, erscheint im Organigramm aber ausschließlich als Leitung.</p>
            <div class="mw-person-assignment-list">${renderPeopleAssignments(orgUnitId)}</div>
          </section>
        </div>
      </section>`

    content.querySelector('[data-person-groups-unit]')?.addEventListener('change', (event) => {
      selectedUnitId = event.target.value
      renderGroupsCenter()
    })

    content.querySelector('[data-person-group-add]')?.addEventListener('submit', (event) => {
      event.preventDefault()
      const form = event.currentTarget
      const message = form.querySelector('[data-person-group-message]')
      const error = createCategory(orgUnitId, new FormData(form).get('name'))
      if (error) {
        message.textContent = error
        message.classList.add('is-error')
        return
      }
      renderGroupsCenter()
      enhanceChart()
    })

    content.querySelectorAll('[data-person-group-name]').forEach((input) => input.addEventListener('change', () => {
      renameCategory(input.dataset.personGroupName, input.value)
      renderGroupsCenter()
      enhanceChart()
    }))
    content.querySelectorAll('[data-person-group-up]').forEach((button) => button.addEventListener('click', () => {
      moveGroup(orgUnitId, button.dataset.personGroupUp, -1)
      renderGroupsCenter()
      enhanceChart()
    }))
    content.querySelectorAll('[data-person-group-down]').forEach((button) => button.addEventListener('click', () => {
      moveGroup(orgUnitId, button.dataset.personGroupDown, 1)
      renderGroupsCenter()
      enhanceChart()
    }))
    content.querySelectorAll('[data-person-group-delete]').forEach((button) => button.addEventListener('click', () => {
      const groups = loadGroups()
      const category = groups.find((group) => group.id === button.dataset.personGroupDelete)
      if (!category || !window.confirm(`Unterkategorie „${category.name}“ löschen? Zugeordnete Personen wechseln zu „Direkt zugeordnet“.`)) return
      const result = removeCategoryAndReassign(groups, loadNodes(), category.id)
      saveGroups(result.groups)
      saveNodes(result.nodes)
      renderGroupsCenter()
      enhanceChart()
    }))
    content.querySelectorAll('[data-person-subcategory-person]').forEach((select) => select.addEventListener('change', () => {
      assignPerson(select.dataset.personSubcategoryPerson, select.value)
      renderGroupsCenter()
      enhanceChart()
    }))

    content.querySelectorAll('[data-person-group-row]').forEach((row) => {
      row.addEventListener('dragstart', () => { draggedGroupId = row.dataset.personGroupRow; row.classList.add('is-dragging') })
      row.addEventListener('dragend', () => { draggedGroupId = null; row.classList.remove('is-dragging') })
      row.addEventListener('dragover', (event) => { if (canEdit()) { event.preventDefault(); row.classList.add('is-drop-target') } })
      row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'))
      row.addEventListener('drop', (event) => {
        event.preventDefault()
        row.classList.remove('is-drop-target')
        if (!draggedGroupId) return
        persistDropOrder(orgUnitId, draggedGroupId, row.dataset.personGroupRow)
        renderGroupsCenter()
        enhanceChart()
      })
    })
  }

  const ensureNavigation = () => {
    const nav = document.getElementById('nav')
    if (!nav) return
    let button = nav.querySelector('[data-person-groups-view="center"]')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.dataset.personGroupsView = 'center'
      button.textContent = 'Unterkategorien'
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        renderGroupsCenter()
      }, true)
      const leadershipButton = nav.querySelector('[data-leadership-view="center"]')
      const peopleButton = Array.from(nav.querySelectorAll('button')).find((item) => /personen/i.test(item.textContent || ''))
      ;(leadershipButton || peopleButton)?.after(button)
      if (!leadershipButton && !peopleButton) nav.append(button)
    }
    if (nav.dataset.personGroupsBaseBound !== 'true') {
      nav.dataset.personGroupsBaseBound = 'true'
      nav.addEventListener('click', (event) => {
        const target = event.target.closest('button')
        if (!target || target.dataset.personGroupsView) return
        currentGroupsView = false
      })
    }
  }

  const cardForUnit = (unitId) => document.querySelector(`.node[data-id="${CSS.escape(String(unitId))}"]`)
  const holderForPersonCard = (card) => {
    const wrapper = card?.closest('.tree-node-wrap') || card?.parentElement
    return wrapper?.parentElement?.classList?.contains('child-wrap') ? wrapper.parentElement : wrapper
  }

  const renderOverviewMarkup = (result) => {
    const nonEmpty = result.groups.filter((group) => group.people.length)
    if (!result.memberCount) return '<div class="mw-person-group-empty">Keine weiteren Mitarbeitenden</div>'
    return nonEmpty.map((group) => `
      <section class="mw-person-group-section" data-person-group-section="${escapeHtml(group.id)}">
        <strong>${escapeHtml(group.name)}</strong>
        <span>${group.people.length} ${group.people.length === 1 ? 'Person' : 'Personen'}</span>
        <div class="mw-person-group-names">${group.people.map((person) => `<span role="button" tabindex="0" data-compact-person="${escapeHtml(person.id)}">${escapeHtml(person.name)}</span>`).join('')}</div>
      </section>`).join('')
  }

  const enhanceUnitCard = (card, nodes, groups, assignments) => {
    if (!card || card.dataset.type === 'person' || card.classList.contains('person')) return
    const unitId = String(card.dataset.id || '')
    if (!unitId) return
    const result = groupPeopleForUnit(nodes, groups, assignments, unitId)
    const body = card.querySelector('.node-body')
    if (!body) return
    const signature = JSON.stringify({
      groups: result.groups.map((group) => [group.id, group.name, group.sortOrder, group.people.map((person) => person.id)]),
      leaders: result.leaders.map((person) => person.id),
    })
    let overview = body.querySelector(':scope > .mw-person-group-overview')
    if (!result.memberCount && !nodes.some((node) => node.type === 'person' && String(node.parent || '') === unitId)) {
      overview?.remove()
      card.classList.remove('mw-people-compact-card')
      return
    }
    card.classList.add('mw-people-compact-card')
    if (!overview) {
      overview = document.createElement('div')
      overview.className = 'mw-person-group-overview'
      body.append(overview)
    }
    if (overview.dataset.signature !== signature) {
      overview.dataset.signature = signature
      overview.innerHTML = `<div class="mw-person-group-overview-head"><strong>Mitarbeitende</strong><span>${result.memberCount}</span></div>${renderOverviewMarkup(result)}`
    }
  }

  const compactPersonCards = (nodes) => {
    const personIds = new Set(nodes.filter((node) => node.type === 'person').map((node) => String(node.id)))
    document.querySelectorAll('.node[data-id]').forEach((card) => {
      const id = String(card.dataset.id || '')
      if (!personIds.has(id) && card.dataset.type !== 'person' && !card.classList.contains('person')) return
      holderForPersonCard(card)?.classList.add('mw-compact-person-holder')
    })
    document.querySelectorAll('.tree-node-wrap > .children').forEach((children) => {
      const holders = [...children.children].filter((child) => child.classList?.contains('child-wrap'))
      const visibleOrganizational = holders.some((holder) => !holder.classList.contains('mw-compact-person-holder'))
      children.classList.toggle('mw-person-only-children', holders.length > 0 && !visibleOrganizational)
    })
  }

  const adjustNavigationControls = (nodes) => {
    document.querySelectorAll('.node[data-id]').forEach((card) => {
      if (card.dataset.type === 'person' || card.classList.contains('person')) return
      const id = String(card.dataset.id || '')
      const orgCount = nodes.filter((node) => node.type !== 'person' && String(node.parent || '') === id).length
      const personCount = nodes.filter((node) => node.type === 'person' && String(node.parent || '') === id).length
      const wrapper = card.closest('.tree-node-wrap') || card.parentElement
      const controls = wrapper?.querySelector(':scope > .org-node-controls')
      const toggle = controls?.querySelector('[data-org-toggle]')
      if (toggle) {
        toggle.hidden = orgCount === 0
        const count = toggle.querySelector('small')
        if (count) count.textContent = String(orgCount)
      }
      if (controls) controls.dataset.summary = `${orgCount} OrgEinheiten, ${personCount} Personen kompakt`
    })
  }

  const bindCompactPeople = () => {
    document.querySelectorAll('[data-compact-person]').forEach((button) => {
      if (button.dataset.compactBound === 'true') return
      button.dataset.compactBound = 'true'
      const open = (event) => {
        event.preventDefault()
        event.stopPropagation()
        const personId = button.dataset.compactPerson
        const personCard = document.querySelector(`.node.person[data-id="${CSS.escape(personId)}"], .node[data-type="person"][data-id="${CSS.escape(personId)}"]`)
        personCard?.click()
      }
      button.addEventListener('click', open)
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') open(event)
      })
    })
  }

  const highlightCompactPerson = (personId) => {
    document.querySelectorAll('[data-compact-person].is-highlighted').forEach((button) => button.classList.remove('is-highlighted'))
    const button = document.querySelector(`[data-compact-person="${CSS.escape(String(personId))}"]`)
    if (!button) return
    button.classList.add('is-highlighted')
    button.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    window.setTimeout(() => button.classList.remove('is-highlighted'), 2600)
  }

  const patchSearchTargets = () => {
    document.querySelectorAll('[data-org-search-show]').forEach((button) => {
      if (button.dataset.personGroupSearchPatched === 'true') return
      const personId = button.dataset.orgSearchShow
      const unitId = resolvePersonTarget(loadNodes(), personId)
      if (!unitId) return
      button.dataset.personGroupSearchPatched = 'true'
      button.dataset.personGroupPersonId = personId
      button.addEventListener('click', () => {
        highlightedPersonId = personId
        button.dataset.orgSearchShow = unitId
        window.setTimeout(() => highlightCompactPerson(personId), 350)
      }, true)
    })
  }

  const enhanceChart = () => {
    ensureNavigation()
    const tree = document.querySelector('.tree')
    if (!tree) {
      if (currentGroupsView && !document.querySelector('[data-person-groups-page]')) renderGroupsCenter()
      return
    }
    const nodes = loadNodes()
    const groups = loadGroups()
    const assignments = loadAssignments()
    tree.querySelectorAll('.node[data-id]').forEach((card) => enhanceUnitCard(card, nodes, groups, assignments))
    compactPersonCards(nodes)
    adjustNavigationControls(nodes)
    bindCompactPeople()
    patchSearchTargets()
    if (highlightedPersonId) highlightCompactPerson(highlightedPersonId)
    if (currentGroupsView && !document.querySelector('[data-person-groups-page]')) renderGroupsCenter()
  }

  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      enhanceChart()
    })
  }

  document.addEventListener('click', (event) => {
    const reset = event.target.closest('#resetBtn')
    if (reset) localStorage.removeItem(GROUP_KEY)
  }, true)
  window.addEventListener('mw-demo-nodes-changed', scheduleEnhance)
  window.addEventListener('mw-demo-person-groups-changed', scheduleEnhance)
  window.addEventListener('storage', scheduleEnhance)
  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance)
  else scheduleEnhance()
})()
