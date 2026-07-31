/** Pure Datenlogik der mobilen MW-OrgChart-Oberfläche. */
(() => {
  const MOBILE_MAX_WIDTH = 780
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
    { id: 'p1', parent: 'pm-hrbp', type: 'person', name: 'Lea Beispiel', firstName: 'Lea', lastName: 'Beispiel', role: 'HR Business Partner' },
    { id: 'p2', parent: 'pm-hrbp', type: 'person', name: 'Noah Muster', firstName: 'Noah', lastName: 'Muster', role: 'HR Business Partner' },
    { id: 'p3', parent: 'pm-sb', type: 'person', name: 'Mila Demo', firstName: 'Mila', lastName: 'Demo', role: 'Sachbearbeitung' },
    { id: 'p4', parent: 'pa-pay', type: 'person', name: 'Elias Test', firstName: 'Elias', lastName: 'Test', role: 'Entgeltabrechnung' },
    { id: 'p5', parent: 'pa-time', type: 'person', name: 'Lina Probe', firstName: 'Lina', lastName: 'Probe', role: 'Zeitwirtschaft' },
    { id: 'p6', parent: 'pe-learning', type: 'person', name: 'Finn Beispiel', firstName: 'Finn', lastName: 'Beispiel', role: 'Personalentwicklung' },
    { id: 'p7', parent: 'pe-onboarding', type: 'person', name: 'Emma Muster', firstName: 'Emma', lastName: 'Muster', role: 'Onboarding' },
    { id: 'p8', parent: 'pc-bgsm', type: 'person', name: 'Luis Demo', firstName: 'Luis', lastName: 'Demo', role: 'BGSM' },
    { id: 'p9', parent: 'pc-control', type: 'person', name: 'Sofia Test', firstName: 'Sofia', lastName: 'Test', role: 'HR-Controlling' },
  ]

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const isMobileWidth = (width) => Number(width) <= MOBILE_MAX_WIDTH
  const nodeMap = (nodes) => new Map(nodes.filter((node) => node?.id).map((node) => [String(node.id), node]))
  const rootNode = (nodes) => nodes.find((node) => node?.type !== 'person' && !node.parent)
    || nodes.find((node) => node?.type !== 'person')
    || null
  const directOrgChildren = (nodes, parentId) => nodes
    .filter((node) => node?.type !== 'person' && String(node.parent || '') === String(parentId))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'de'))
  const directPeople = (nodes, unitId) => nodes
    .filter((node) => node?.type === 'person' && String(node.parent || '') === String(unitId))

  const pathIds = (nodes, id) => {
    const byId = nodeMap(nodes)
    const result = []
    const seen = new Set()
    let current = byId.get(String(id))
    while (current && !seen.has(String(current.id))) {
      result.unshift(String(current.id))
      seen.add(String(current.id))
      current = current.parent ? byId.get(String(current.parent)) : null
    }
    return result
  }

  const descendantsOf = (nodes, id) => {
    const result = []
    const queue = [String(id)]
    const seen = new Set()
    while (queue.length) {
      const parentId = queue.shift()
      nodes.forEach((node) => {
        if (!node?.id || String(node.parent || '') !== parentId || seen.has(String(node.id))) return
        seen.add(String(node.id))
        result.push(node)
        if (node.type !== 'person') queue.push(String(node.id))
      })
    }
    return result
  }

  const dateValue = (value, fallback) => value ? new Date(`${value}T00:00:00`).getTime() : fallback
  const isAssignmentActive = (assignment, onDate = new Date()) => {
    const day = new Date(onDate)
    day.setHours(0, 0, 0, 0)
    const time = day.getTime()
    return dateValue(assignment?.validFrom, Number.NEGATIVE_INFINITY) <= time
      && dateValue(assignment?.validTo, Number.POSITIVE_INFINITY) >= time
  }

  const comparePeople = (left, right) => {
    const leftLast = String(left?.lastName || left?.name || '')
    const rightLast = String(right?.lastName || right?.name || '')
    return leftLast.localeCompare(rightLast, 'de', { sensitivity: 'base' })
      || String(left?.firstName || '').localeCompare(String(right?.firstName || ''), 'de', { sensitivity: 'base' })
  }

  const groupPeople = (nodes, groups, assignments, unitId, onDate = new Date()) => {
    const people = directPeople(nodes, unitId)
    const leaderIds = new Set(assignments
      .filter((assignment) => String(assignment?.orgUnitId || '') === String(unitId)
        && assignment?.personId
        && isAssignmentActive(assignment, onDate))
      .map((assignment) => String(assignment.personId)))
    const unitGroups = groups
      .filter((group) => String(group?.orgUnitId || '') === String(unitId) && group?.active !== false)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    const directGroup = unitGroups.find((group) => group.kind === 'DIRECT' || String(group.id || '').startsWith('direct:'))
      || { id: `direct:${unitId}`, orgUnitId: String(unitId), name: 'Direkt zugeordnet', kind: 'DIRECT', sortOrder: Number.MAX_SAFE_INTEGER }
    const normalizedGroups = unitGroups.some((group) => String(group.id) === String(directGroup.id))
      ? unitGroups
      : [...unitGroups, directGroup]
    const validIds = new Set(normalizedGroups.filter((group) => group.kind !== 'DIRECT').map((group) => String(group.id)))
    const byGroup = new Map(normalizedGroups.map((group) => [String(group.id), []]))

    people.filter((person) => !leaderIds.has(String(person.id))).forEach((person) => {
      const requested = String(person.subcategoryId || '')
      const target = validIds.has(requested) ? requested : String(directGroup.id)
      byGroup.get(target).push(person)
    })

    return {
      leaders: people.filter((person) => leaderIds.has(String(person.id))).sort(comparePeople),
      groups: normalizedGroups.map((group) => ({ ...group, people: (byGroup.get(String(group.id)) || []).sort(comparePeople) })),
    }
  }

  const buildBranchModel = ({ nodes, groups = [], assignments = [], unitId, onDate = new Date() }) => {
    const byId = nodeMap(nodes)
    const root = rootNode(nodes)
    const requested = byId.get(String(unitId))
    const current = requested?.type !== 'person' ? requested : root
    if (!current) return null
    const grouped = groupPeople(nodes, groups, assignments, current.id, onDate)
    const children = directOrgChildren(nodes, current.id).map((child) => ({
      ...child,
      peopleCount: descendantsOf(nodes, child.id).filter((node) => node.type === 'person').length,
      childCount: directOrgChildren(nodes, child.id).length,
    }))
    return {
      current,
      parentId: current.parent ? String(current.parent) : null,
      path: pathIds(nodes, current.id).map((pathId) => byId.get(pathId)).filter(Boolean),
      children,
      leaders: grouped.leaders,
      groups: grouped.groups,
      peopleCount: descendantsOf(nodes, current.id).filter((node) => node.type === 'person').length,
    }
  }

  const tableLabels = (headers = [], cellCount = 0) => Array.from({ length: cellCount }, (_, index) => headers[index] || `Spalte ${index + 1}`)

  globalThis.MWMobileUI = {
    MOBILE_MAX_WIDTH,
    fallbackNodes: clone(fallbackNodes),
    isMobileWidth,
    rootNode,
    directOrgChildren,
    directPeople,
    pathIds,
    descendantsOf,
    isAssignmentActive,
    groupPeople,
    buildBranchModel,
    tableLabels,
  }
})()
