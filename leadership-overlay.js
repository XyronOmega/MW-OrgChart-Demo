/**
 * Leitungsfunktionen und Personalunionen für die öffentliche Demo.
 *
 * Leitungsbeziehungen werden getrennt von der organisatorischen Zuordnung
 * gespeichert. Eine Person kann dadurch mehrere Einheiten gleichzeitig
 * regulär, kommissarisch, stellvertretend, fachlich oder in Personalunion
 * führen, ohne als reguläres Mitglied dieser Einheiten dupliziert zu werden.
 */
(() => {
  const ASSIGNMENT_KEY = 'mw-demo-leadership-assignments'
  const NODE_KEY = 'mw-demo-nodes'

  const exerciseTypeLabels = {
    REGULAR: 'Regulär',
    PERSONAL_UNION: 'In Personalunion',
    ACTING: 'Kommissarisch',
    DEPUTY: 'Stellvertretend',
    FUNCTIONAL: 'Fachlich',
  }

  const defaultNodes = [
    { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen' },
    { id: 'prv', parent: 'mw', type: 'section', name: 'Personal, Recht und Verwaltung' },
    { id: 'pm', parent: 'prv', type: 'department', name: 'Personalmanagement' },
    { id: 'pa', parent: 'prv', type: 'department', name: 'Personaladministration' },
    { id: 'pe', parent: 'prv', type: 'department', name: 'Personalentwicklung' },
    { id: 'pc', parent: 'prv', type: 'department', name: 'Personalcontrolling' },
    { id: 'pm-hrbp', parent: 'pm', type: 'team', name: 'HR Business Partner' },
    { id: 'pm-sb', parent: 'pm', type: 'team', name: 'Sachbearbeitung' },
    { id: 'pa-pay', parent: 'pa', type: 'team', name: 'Entgeltabrechnung' },
    { id: 'pa-time', parent: 'pa', type: 'team', name: 'Zeitwirtschaft' },
    { id: 'pe-learning', parent: 'pe', type: 'team', name: 'Ausbildung & Weiterbildung' },
    { id: 'pe-onboarding', parent: 'pe', type: 'team', name: 'Onboarding' },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', name: 'BGSM' },
    { id: 'pc-control', parent: 'pc', type: 'team', name: 'HR-Controlling' },
    { id: 'p1', parent: 'pm-hrbp', type: 'person', name: 'Lea Beispiel' },
    { id: 'p2', parent: 'pm-hrbp', type: 'person', name: 'Noah Muster' },
    { id: 'p3', parent: 'pm-sb', type: 'person', name: 'Mila Demo' },
    { id: 'p4', parent: 'pa-pay', type: 'person', name: 'Elias Test' },
    { id: 'p5', parent: 'pa-time', type: 'person', name: 'Lina Probe' },
    { id: 'p6', parent: 'pe-learning', type: 'person', name: 'Finn Beispiel' },
    { id: 'p7', parent: 'pe-onboarding', type: 'person', name: 'Emma Muster' },
    { id: 'p8', parent: 'pc-bgsm', type: 'person', name: 'Luis Demo' },
    { id: 'p9', parent: 'pc-control', type: 'person', name: 'Sofia Test' },
  ]

  const defaultAssignments = [
    { id: 'lead-prv-p1', personId: 'p1', orgUnitId: 'prv', leadershipRole: 'Sektionsleitung', exerciseType: 'ACTING', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: 'Kommissarische Wahrnehmung der Sektionsleitung.' },
    { id: 'lead-pm-p1', personId: 'p1', orgUnitId: 'pm', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pm-p2', personId: 'p2', orgUnitId: 'pm', leadershipRole: 'Stellvertretung', exerciseType: 'DEPUTY', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pa-p4', personId: 'p4', orgUnitId: 'pa', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pa-p5', personId: 'p5', orgUnitId: 'pa', leadershipRole: 'Stellvertretung', exerciseType: 'DEPUTY', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pe-p6', personId: 'p6', orgUnitId: 'pe', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pe-p7', personId: 'p7', orgUnitId: 'pe', leadershipRole: 'Stellvertretung', exerciseType: 'DEPUTY', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pc-p9', personId: 'p9', orgUnitId: 'pc', leadershipRole: 'Abteilungsleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pc-p8', personId: 'p8', orgUnitId: 'pc', leadershipRole: 'Stellvertretung', exerciseType: 'DEPUTY', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pm-hrbp-p2', personId: 'p2', orgUnitId: 'pm-hrbp', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pm-sb-p1', personId: 'p1', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-08-01', validTo: null, primaryLeadership: false, note: 'Zusätzliche Leitung des Teams neben der Abteilungsleitung.' },
    { id: 'lead-pa-pay-p4', personId: 'p4', orgUnitId: 'pa-pay', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pa-time-p5', personId: 'p5', orgUnitId: 'pa-time', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pe-learning-p6', personId: 'p6', orgUnitId: 'pe-learning', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: '' },
    { id: 'lead-pe-onboarding-p7', personId: 'p7', orgUnitId: 'pe-onboarding', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pc-bgsm-p8', personId: 'p8', orgUnitId: 'pc-bgsm', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: null, primaryLeadership: true, note: '' },
    { id: 'lead-pc-control-p9', personId: 'p9', orgUnitId: 'pc-control', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION', validFrom: '2026-01-01', validTo: null, primaryLeadership: false, note: 'Führung des Teams in Personalunion mit der Abteilungsleitung.' },
  ]

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null')
      return value ?? fallback
    } catch {
      return fallback
    }
  }

  const normalizeAssignment = (value, index = 0) => ({
    id: String(value?.id || `lead-${Date.now()}-${index}`),
    personId: String(value?.personId || ''),
    orgUnitId: String(value?.orgUnitId || ''),
    leadershipRole: String(value?.leadershipRole || '').trim(),
    exerciseType: exerciseTypeLabels[value?.exerciseType] ? value.exerciseType : 'REGULAR',
    validFrom: value?.validFrom ? String(value.validFrom) : '',
    validTo: value?.validTo ? String(value.validTo) : null,
    primaryLeadership: Boolean(value?.primaryLeadership),
    note: String(value?.note || '').trim(),
  })

  const loadAssignments = () => {
    const stored = readJson(ASSIGNMENT_KEY, null)
    if (!Array.isArray(stored)) return clone(defaultAssignments)
    return stored.map(normalizeAssignment).filter((entry) => entry.personId && entry.orgUnitId && entry.leadershipRole)
  }

  const saveAssignments = (assignments) => {
    localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments.map(normalizeAssignment)))
  }

  const loadNodes = () => {
    const stored = readJson(NODE_KEY, null)
    if (!Array.isArray(stored) || !stored.length) return clone(defaultNodes)
    const known = new Map(defaultNodes.map((node) => [node.id, node]))
    stored.forEach((node) => {
      if (node?.id) known.set(node.id, { ...known.get(node.id), ...node })
    })
    return [...known.values()]
  }

  const dateValue = (value, fallback) => value ? new Date(`${value}T00:00:00`).getTime() : fallback
  const isActive = (assignment, onDate = new Date()) => {
    const day = new Date(onDate)
    day.setHours(0, 0, 0, 0)
    const time = day.getTime()
    return dateValue(assignment.validFrom, Number.NEGATIVE_INFINITY) <= time
      && dateValue(assignment.validTo, Number.POSITIVE_INFINITY) >= time
  }

  const rangesOverlap = (left, right) => {
    const leftStart = dateValue(left.validFrom, Number.NEGATIVE_INFINITY)
    const leftEnd = dateValue(left.validTo, Number.POSITIVE_INFINITY)
    const rightStart = dateValue(right.validFrom, Number.NEGATIVE_INFINITY)
    const rightEnd = dateValue(right.validTo, Number.POSITIVE_INFINITY)
    return leftStart <= rightEnd && rightStart <= leftEnd
  }

  const validateAssignment = (candidateValue, assignments, editingId = null) => {
    const candidate = normalizeAssignment(candidateValue)
    if (!candidate.personId) return 'Bitte eine Person auswählen.'
    if (!candidate.orgUnitId) return 'Bitte eine OrgEinheit auswählen.'
    if (!candidate.leadershipRole) return 'Bitte eine Leitungsfunktion angeben.'
    if (candidate.validFrom && candidate.validTo && candidate.validTo < candidate.validFrom) {
      return 'Das Gültig-bis-Datum darf nicht vor dem Gültig-ab-Datum liegen.'
    }
    const duplicate = assignments
      .filter((entry) => entry.id !== editingId)
      .find((entry) => entry.personId === candidate.personId
        && entry.orgUnitId === candidate.orgUnitId
        && entry.leadershipRole.toLocaleLowerCase('de-DE') === candidate.leadershipRole.toLocaleLowerCase('de-DE')
        && rangesOverlap(entry, candidate))
    if (duplicate) return 'Für diese Person, OrgEinheit und Leitungsfunktion besteht bereits ein überschneidender Zeitraum.'
    return null
  }

  const upsertAssignment = (assignments, candidateValue) => {
    const candidate = normalizeAssignment(candidateValue)
    const next = assignments
      .filter((entry) => entry.id !== candidate.id)
      .map((entry) => candidate.primaryLeadership && entry.personId === candidate.personId
        ? { ...entry, primaryLeadership: false }
        : entry)
    return [...next, candidate]
  }

  const assignmentsForPerson = (assignments, personId) => assignments
    .filter((entry) => entry.personId === personId)
    .sort((a, b) => Number(b.primaryLeadership) - Number(a.primaryLeadership)
      || a.validFrom.localeCompare(b.validFrom)
      || a.leadershipRole.localeCompare(b.leadershipRole, 'de'))

  const assignmentsForUnit = (assignments, orgUnitId) => assignments
    .filter((entry) => entry.orgUnitId === orgUnitId)
    .sort((a, b) => Number(b.primaryLeadership) - Number(a.primaryLeadership)
      || a.leadershipRole.localeCompare(b.leadershipRole, 'de'))

  let assignments = loadAssignments()
  let currentLeadershipView = false
  let selectedPersonId = 'p1'
  let selectedUnitId = 'pm'
  let editingAssignmentId = null
  let lastOpenedPersonId = null

  const role = () => document.getElementById('roleSelect')?.value || 'viewer'
  const canEdit = () => ['editor', 'admin', 'superadmin'].includes(role())
  const nodes = () => loadNodes()
  const people = () => nodes().filter((node) => node.type === 'person').sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const units = () => nodes().filter((node) => node.type !== 'person').sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const nodeById = (id) => nodes().find((node) => node.id === id)
  const personName = (id) => nodeById(id)?.name || id
  const unitName = (id) => nodeById(id)?.name || id
  const directUnitName = (personId) => unitName(nodeById(personId)?.parent) || 'Nicht zugeordnet'

  const formatDate = (value) => {
    if (!value) return 'unbefristet'
    const [year, month, day] = value.split('-')
    return `${day}.${month}.${year}`
  }

  const statusFor = (assignment) => {
    const today = new Date()
    if (assignment.validFrom && dateValue(assignment.validFrom, 0) > today.getTime()) return `Beginnt am ${formatDate(assignment.validFrom)}`
    if (assignment.validTo && dateValue(assignment.validTo, 0) < today.getTime()) return `Beendet am ${formatDate(assignment.validTo)}`
    return assignment.validTo ? `Aktiv bis ${formatDate(assignment.validTo)}` : 'Aktiv'
  }

  const typeBadge = (assignment) => assignment.exerciseType === 'REGULAR'
    ? ''
    : `<span class="leadership-type-badge">${escapeHtml(exerciseTypeLabels[assignment.exerciseType])}</span>`

  const injectLeadership = () => {
    document.querySelectorAll('.node[data-id]').forEach((card) => {
      if (card.dataset.type === 'person') return
      const body = card.querySelector('.node-body')
      if (!body) return
      const unitAssignments = assignmentsForUnit(assignments, card.dataset.id).filter((entry) => isActive(entry))
      const signature = JSON.stringify(unitAssignments)
      const existing = body.querySelector('.demo-unit-leadership')
      if (existing?.dataset.leadershipSignature === signature) return
      existing?.remove()
      const summary = document.createElement('div')
      summary.className = `demo-unit-leadership${unitAssignments.length ? '' : ' demo-unit-leadership--empty'}`
      summary.dataset.leadershipSignature = signature
      summary.setAttribute('aria-label', 'Leitung der Organisationseinheit')
      summary.innerHTML = unitAssignments.length
        ? unitAssignments.map((entry) => `
          <div class="demo-unit-leader-row">
            <span class="demo-unit-leader-label">${escapeHtml(entry.leadershipRole)}</span>
            <span class="demo-unit-leader-value">
              <button type="button" class="demo-unit-leader-name" data-demo-leader-person="${escapeHtml(entry.personId)}" aria-label="Profil von ${escapeHtml(personName(entry.personId))} öffnen">${escapeHtml(personName(entry.personId))}</button>
              ${typeBadge(entry)}
            </span>
          </div>`).join('')
        : '<span class="demo-unit-leader-label">Leitung</span><span class="demo-unit-leadership-empty">Nicht hinterlegt</span>'
      body.append(summary)
    })
  }

  const openPerson = (personId) => {
    lastOpenedPersonId = personId
    const personCard = Array.from(document.querySelectorAll('.node[data-id]')).find((card) => card.dataset.id === personId)
    personCard?.click()
  }

  const injectPersonDrawer = () => {
    const drawer = document.getElementById('drawer')
    if (!drawer || drawer.classList.contains('hidden')) return
    const title = drawer.querySelector('h2, .drawer-title, [data-person-name]')?.textContent?.trim()
    const resolvedPersonId = lastOpenedPersonId || people().find((person) => person.name === title)?.id
    if (!resolvedPersonId) return
    const content = drawer.querySelector('.drawer-content') || drawer
    const personAssignments = assignmentsForPerson(assignments, resolvedPersonId)
    const signature = JSON.stringify(personAssignments)
    const existing = content.querySelector('[data-demo-leadership-profile]')
    if (existing?.dataset.leadershipSignature === signature && existing.dataset.demoLeadershipProfile === resolvedPersonId) return
    existing?.remove()
    const section = document.createElement('section')
    section.className = 'profile-section leadership-profile-section'
    section.dataset.demoLeadershipProfile = resolvedPersonId
    section.dataset.leadershipSignature = signature
    section.innerHTML = `
      <h3>Leitungsfunktionen</h3>
      <p class="leadership-profile-assignment"><strong>Organisatorische Zuordnung:</strong> ${escapeHtml(directUnitName(resolvedPersonId))}</p>
      ${personAssignments.length
        ? `<div class="leadership-profile-list">${personAssignments.map((entry) => `
          <article class="leadership-profile-item">
            <div><strong>${escapeHtml(unitName(entry.orgUnitId))}</strong><span>${escapeHtml(entry.leadershipRole)}</span></div>
            <div>${typeBadge(entry)}${entry.primaryLeadership ? '<span class="leadership-primary-badge">Hauptleitungsfunktion</span>' : ''}</div>
            <small>${escapeHtml(statusFor(entry))}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</small>
          </article>`).join('')}</div>`
        : '<p>Keine Leitungsfunktion hinterlegt.</p>'}
    `
    const hintSection = Array.from(content.querySelectorAll('.profile-section')).find((item) => /Hinweis/i.test(item.querySelector('h3')?.textContent || ''))
    if (hintSection) content.insertBefore(section, hintSection)
    else content.append(section)
  }

  const assignmentCard = (entry, perspective) => `
    <article class="leadership-assignment-card" data-leadership-assignment="${escapeHtml(entry.id)}">
      <div class="leadership-assignment-heading">
        <div>
          <span>${perspective === 'person' ? escapeHtml(unitName(entry.orgUnitId)) : escapeHtml(personName(entry.personId))}</span>
          <h3>${escapeHtml(entry.leadershipRole)}</h3>
        </div>
        <div>${typeBadge(entry)}${entry.primaryLeadership ? '<span class="leadership-primary-badge">Hauptfunktion</span>' : ''}</div>
      </div>
      <dl>
        ${perspective === 'person' ? `<dt>Org. Zuordnung der Person</dt><dd>${escapeHtml(directUnitName(entry.personId))}</dd>` : ''}
        <dt>Ausübungsart</dt><dd>${escapeHtml(exerciseTypeLabels[entry.exerciseType])}</dd>
        <dt>Gültigkeit</dt><dd>${escapeHtml(formatDate(entry.validFrom))} – ${escapeHtml(formatDate(entry.validTo))}</dd>
        <dt>Status</dt><dd>${escapeHtml(statusFor(entry))}</dd>
        ${entry.note ? `<dt>Hinweis</dt><dd>${escapeHtml(entry.note)}</dd>` : ''}
      </dl>
      ${canEdit() ? `<div class="leadership-card-actions"><button type="button" class="btn btn-ghost" data-leadership-edit="${escapeHtml(entry.id)}">Bearbeiten</button><button type="button" class="btn btn-ghost leadership-danger" data-leadership-delete="${escapeHtml(entry.id)}">Entfernen</button></div>` : ''}
    </article>`

  const renderForm = () => {
    const editing = assignments.find((entry) => entry.id === editingAssignmentId)
    const selectedPerson = editing?.personId || selectedPersonId || people()[0]?.id || ''
    const selectedUnit = editing?.orgUnitId || selectedUnitId || units()[0]?.id || ''
    return `
      <form class="leadership-form" data-leadership-form>
        <div class="leadership-form-heading"><span>${editing ? 'Leitungsfunktion bearbeiten' : 'Neue Leitungsfunktion'}</span><h3>Leitungsmandat</h3><p>Die organisatorische Zuordnung der Person bleibt dabei unverändert.</p></div>
        <input type="hidden" name="id" value="${escapeHtml(editing?.id || `lead-${Date.now()}`)}">
        <div class="leadership-form-grid">
          <label class="field"><span>Person *</span><select name="personId">${people().map((person) => `<option value="${escapeHtml(person.id)}" ${person.id === selectedPerson ? 'selected' : ''}>${escapeHtml(person.name)}</option>`).join('')}</select></label>
          <label class="field"><span>OrgEinheit *</span><select name="orgUnitId">${units().map((unit) => `<option value="${escapeHtml(unit.id)}" ${unit.id === selectedUnit ? 'selected' : ''}>${escapeHtml(unit.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Leitungsfunktion *</span><input name="leadershipRole" value="${escapeHtml(editing?.leadershipRole || 'Teamleitung')}" placeholder="z. B. Teamleitung"></label>
          <label class="field"><span>Ausübungsart</span><select name="exerciseType">${Object.entries(exerciseTypeLabels).map(([value, label]) => `<option value="${value}" ${editing?.exerciseType === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label>
          <label class="field"><span>Gültig ab</span><input type="date" name="validFrom" value="${escapeHtml(editing?.validFrom || '2026-08-01')}"></label>
          <label class="field"><span>Gültig bis</span><input type="date" name="validTo" value="${escapeHtml(editing?.validTo || '')}"></label>
          <label class="field leadership-wide"><span>Hinweis</span><input name="note" value="${escapeHtml(editing?.note || '')}" placeholder="Optionaler Hinweis"></label>
          <label class="leadership-checkbox leadership-wide"><input type="checkbox" name="primaryLeadership" ${editing?.primaryLeadership ? 'checked' : ''}><span>Als Hauptleitungsfunktion dieser Person kennzeichnen</span></label>
        </div>
        <p class="leadership-form-message" data-leadership-message>Änderungen bleiben lokal in diesem Browser.</p>
        <div class="leadership-form-actions"><button type="submit" class="btn btn-primary">${editing ? 'Änderung speichern' : 'Leitungsfunktion hinzufügen'}</button>${editing ? '<button type="button" class="btn btn-ghost" data-leadership-cancel>Abbrechen</button>' : ''}</div>
      </form>`
  }

  const renderLeadershipCenter = () => {
    const content = document.getElementById('content')
    if (!content) return
    currentLeadershipView = true
    const person = nodeById(selectedPersonId) || people()[0]
    const unit = nodeById(selectedUnitId) || units()[0]
    selectedPersonId = person?.id || ''
    selectedUnitId = unit?.id || ''
    document.querySelectorAll('#nav button').forEach((button) => {
      const active = button.dataset.leadershipView === 'center'
      button.classList.toggle('active', active)
      button.classList.toggle('is-active', active)
    })
    const personAssignments = assignmentsForPerson(assignments, selectedPersonId)
    const unitAssignments = assignmentsForUnit(assignments, selectedUnitId)
    content.innerHTML = `
      <section class="leadership-center" data-leadership-page>
        <header class="leadership-page-heading"><span>Personen und OrgEinheiten</span><h2>Leitungsfunktionen</h2><p>Mitgliedschaft und Leitung sind getrennte Beziehungen. Mehrere gleichzeitige Leitungsmandate und Personalunionen sind möglich.</p></header>
        <div class="leadership-perspectives">
          <section class="leadership-perspective">
            <label class="field"><span>Person auswählen</span><select data-leadership-person>${people().map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedPersonId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
            <div class="leadership-context"><span>Organisatorische Hauptzuordnung</span><strong>${escapeHtml(directUnitName(selectedPersonId))}</strong><p>Leitungsmandate erzeugen keine zusätzliche Mitgliedschaft.</p></div>
            <div class="leadership-card-list">${personAssignments.length ? personAssignments.map((entry) => assignmentCard(entry, 'person')).join('') : '<p class="leadership-empty">Keine Leitungsfunktion hinterlegt.</p>'}</div>
          </section>
          <section class="leadership-perspective">
            <label class="field"><span>OrgEinheit auswählen</span><select data-leadership-unit>${units().map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedUnitId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
            <div class="leadership-context"><span>Leitung und Stellvertretung</span><strong>${escapeHtml(unitName(selectedUnitId))}</strong><p>Dieselben Datensätze werden aus Sicht der OrgEinheit angezeigt.</p></div>
            <div class="leadership-card-list">${unitAssignments.length ? unitAssignments.map((entry) => assignmentCard(entry, 'unit')).join('') : '<p class="leadership-empty">Keine Leitung hinterlegt.</p>'}</div>
          </section>
        </div>
        ${canEdit() ? renderForm() : '<p class="leadership-readonly">Die aktive Rolle darf Leitungsfunktionen ansehen, aber nicht bearbeiten.</p>'}
      </section>`

    content.querySelector('[data-leadership-person]')?.addEventListener('change', (event) => {
      selectedPersonId = event.target.value
      editingAssignmentId = null
      renderLeadershipCenter()
    })
    content.querySelector('[data-leadership-unit]')?.addEventListener('change', (event) => {
      selectedUnitId = event.target.value
      editingAssignmentId = null
      renderLeadershipCenter()
    })
    content.querySelectorAll('[data-leadership-edit]').forEach((button) => button.addEventListener('click', () => {
      editingAssignmentId = button.dataset.leadershipEdit
      const entry = assignments.find((item) => item.id === editingAssignmentId)
      if (entry) {
        selectedPersonId = entry.personId
        selectedUnitId = entry.orgUnitId
      }
      renderLeadershipCenter()
    }))
    content.querySelectorAll('[data-leadership-delete]').forEach((button) => button.addEventListener('click', () => {
      const entry = assignments.find((item) => item.id === button.dataset.leadershipDelete)
      if (!entry) return
      if (!window.confirm(`Leitungsfunktion „${entry.leadershipRole}“ von ${personName(entry.personId)} entfernen?`)) return
      assignments = assignments.filter((item) => item.id !== entry.id)
      saveAssignments(assignments)
      editingAssignmentId = null
      injectLeadership()
      renderLeadershipCenter()
    }))

    const form = content.querySelector('[data-leadership-form]')
    form?.addEventListener('submit', (event) => {
      event.preventDefault()
      const data = Object.fromEntries(new FormData(form).entries())
      const candidate = normalizeAssignment({
        ...data,
        validTo: data.validTo || null,
        primaryLeadership: form.elements.primaryLeadership.checked,
      })
      const error = validateAssignment(candidate, assignments, editingAssignmentId)
      const message = form.querySelector('[data-leadership-message]')
      if (error) {
        message.textContent = error
        message.classList.add('is-error')
        return
      }
      assignments = upsertAssignment(assignments, candidate)
      saveAssignments(assignments)
      selectedPersonId = candidate.personId
      selectedUnitId = candidate.orgUnitId
      editingAssignmentId = null
      injectLeadership()
      renderLeadershipCenter()
    })
    content.querySelector('[data-leadership-cancel]')?.addEventListener('click', () => {
      editingAssignmentId = null
      renderLeadershipCenter()
    })
  }

  const ensureNavigation = () => {
    const nav = document.getElementById('nav')
    if (!nav) return
    let button = nav.querySelector('[data-leadership-view="center"]')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.dataset.leadershipView = 'center'
      button.textContent = 'Leitungsfunktionen'
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        renderLeadershipCenter()
      }, true)
      const peopleButton = Array.from(nav.querySelectorAll('button')).find((item) => /personen/i.test(item.textContent || ''))
      peopleButton?.after(button)
      if (!peopleButton) nav.append(button)
    }
    if (nav.dataset.leadershipBaseBound !== 'true') {
      nav.dataset.leadershipBaseBound = 'true'
      nav.addEventListener('click', (event) => {
        const target = event.target.closest('button')
        if (!target || target.dataset.leadershipView) return
        currentLeadershipView = false
        editingAssignmentId = null
      })
    }
  }

  document.addEventListener('click', (event) => {
    const personCard = event.target.closest?.('.node[data-type="person"][data-id]')
    if (personCard) lastOpenedPersonId = personCard.dataset.id
    const target = event.target.closest?.('[data-demo-leader-person]')
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    openPerson(target.dataset.demoLeaderPerson)
  }, true)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const target = event.target.closest?.('[data-demo-leader-person]')
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    openPerson(target.dataset.demoLeaderPerson)
  }, true)

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    localStorage.removeItem(ASSIGNMENT_KEY)
    assignments = loadAssignments()
    editingAssignmentId = null
  }, true)

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      ensureNavigation()
      injectLeadership()
      injectPersonDrawer()
      if (currentLeadershipView && !document.querySelector('[data-leadership-page]')) renderLeadershipCenter()
    })
  }

  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
  window.MWLeadershipDemo = {
    defaultAssignments: clone(defaultAssignments),
    exerciseTypeLabels: { ...exerciseTypeLabels },
    normalizeAssignment,
    isActive,
    rangesOverlap,
    validateAssignment,
    upsertAssignment,
    assignmentsForPerson,
    assignmentsForUnit,
    loadAssignments: () => clone(loadAssignments()),
  }
  scheduleEnhance()
})()
