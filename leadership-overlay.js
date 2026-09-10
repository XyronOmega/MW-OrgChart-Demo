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

  /**
   * Schreibt Leitungsmandate. Die Rechteprüfung liegt hier und nicht nur in
   * der Darstellung: Auch ein nachträglich aktiviertes Bedienelement kann
   * ohne Bearbeitungsrecht nichts speichern.
   */
  const saveAssignments = (assignments) => {
    if (!canEdit()) {
      console.warn('[leadership] Die aktive Rolle darf Leitungsfunktionen nicht ändern.')
      return false
    }
    localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments.map(normalizeAssignment)))
    return true
  }

  /**
   * Eindeutiges Änderungsereignis für Leitungsmandate. Die übrigen Module
   * hängen sich hier ein, statt die Seite neu zu laden oder zu pollen.
   */
  const announceLeadershipChanged = () => {
    window.dispatchEvent(new CustomEvent('mw-demo-leadership-changed'))
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

  /**
   * Fachliche Prüfung eines Leitungsmandats, Meldung je Feld.
   *
   * Geprüft wird gegen die Rohwerte: `normalizeAssignment` würde eine
   * unbekannte Ausübungsart stillschweigend auf `REGULAR` setzen. Ein von außen
   * eingeschleuster Wert soll aber abgelehnt und nicht ersetzt werden.
   *
   * `context.nodes` ist optional. Fehlt es, entfallen die Prüfungen auf
   * Existenz und Typ von Person und OrgEinheit – die Speicherfunktion reicht
   * die Knoten immer mit.
   *
   * @returns {Object} Zuordnung Feldname → Meldung (leer, wenn alles stimmt)
   */
  const validateAssignmentValues = (values, context = {}) => {
    const { assignments = [], nodes = null, editingId = null } = context
    const errors = {}
    const candidate = normalizeAssignment(values)
    const rawType = String(values?.exerciseType ?? '')

    if (!candidate.personId) errors.personId = 'Bitte eine Person auswählen.'
    else if (nodes) {
      const person = nodes.find((node) => String(node?.id) === candidate.personId)
      if (!person) errors.personId = 'Die gewählte Person ist nicht vorhanden.'
      else if (person.type !== 'person') errors.personId = 'Der gewählte Eintrag ist keine Person.'
    }

    if (!candidate.orgUnitId) errors.orgUnitId = 'Bitte eine OrgEinheit auswählen.'
    else if (nodes) {
      const unit = nodes.find((node) => String(node?.id) === candidate.orgUnitId)
      if (!unit) errors.orgUnitId = 'Die gewählte OrgEinheit ist nicht vorhanden.'
      else if (unit.type === 'person') errors.orgUnitId = 'Eine Person ist keine OrgEinheit.'
    }

    if (!candidate.leadershipRole) errors.leadershipRole = 'Bitte eine Leitungsfunktion angeben.'
    if (rawType && !exerciseTypeLabels[rawType]) errors.exerciseType = 'Die gewählte Ausübungsart ist unbekannt.'

    if (candidate.validFrom && candidate.validTo && candidate.validTo < candidate.validFrom) {
      errors.validTo = 'Das Gültig-bis-Datum darf nicht vor dem Gültig-ab-Datum liegen.'
    }

    // Ein bestehendes Mandat darf beim Bearbeiten nicht als eigene Dublette
    // gelten: `editingId` wird aus dem Vergleich genommen.
    const duplicate = assignments
      .filter((entry) => entry.id !== (editingId ?? candidate.id))
      .find((entry) => entry.personId === candidate.personId
        && entry.orgUnitId === candidate.orgUnitId
        && String(entry.leadershipRole || '').toLocaleLowerCase('de-DE')
          === candidate.leadershipRole.toLocaleLowerCase('de-DE')
        && rangesOverlap(entry, candidate))
    if (duplicate && !errors.leadershipRole) {
      errors.leadershipRole = 'Für diese Person, OrgEinheit und Leitungsfunktion besteht bereits ein überschneidender Zeitraum.'
    }
    return errors
  }

  /** Erste Meldung der Prüfung – bisherige Schnittstelle, unverändert im Verhalten. */
  const validateAssignment = (candidateValue, assignments, editingId = null, context = {}) => {
    const errors = validateAssignmentValues(candidateValue, { ...context, assignments, editingId })
    const first = Object.keys(errors)[0]
    return first ? errors[first] : null
  }

  /**
   * Das Mandat, das beim Setzen einer neuen Hauptleitungsfunktion seine
   * Kennzeichnung verliert. Es wird nicht gelöscht – `upsertAssignment` setzt
   * lediglich `primaryLeadership` auf `false`.
   */
  const primaryAssignmentFor = (assignments, personId, exceptId = null) => assignments
    .find((entry) => entry.personId === String(personId ?? '')
      && entry.primaryLeadership
      && entry.id !== exceptId) || null

  /** Weitere Leitungsmandate derselben Person, ohne das genannte. */
  const otherAssignmentsOf = (assignments, personId, exceptId = null) => assignments
    .filter((entry) => entry.personId === String(personId ?? '') && entry.id !== exceptId)

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
  let lastOpenedPersonId = null

  // Rollenauskunft aus dem gemeinsamen Vokabular (roles.js). Der Rückfall
  // entspricht dem bisherigen Verhalten, falls das Modul nicht geladen ist.
  const role = () => globalThis.MWRoles?.currentRoleId()
    || document.getElementById('roleSelect')?.value
    || 'viewer'
  const canEdit = () => (globalThis.MWRoles
    ? globalThis.MWRoles.canEditStructure()
    : ['editor', 'admin', 'superadmin'].includes(role()))
  const roleLabel = () => globalThis.MWRoles?.label(role()) || role()
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

  // --- Speichern und Entfernen ---------------------------------------------

  /**
   * Schreibt ein Leitungsmandat. Die Rechteprüfung liegt hier und nicht nur in
   * der Darstellung; die fachliche Prüfung läuft gegen die Rohwerte, damit
   * eingeschleuste Angaben abgelehnt statt stillschweigend ersetzt werden.
   *
   * @returns {Object} `{ ok, demoted }` oder `{ error, field }`
   */
  const saveAssignmentValues = (values, editingId = null) => {
    if (!canEdit()) return { error: 'Die aktive Rolle darf Leitungsfunktionen nicht bearbeiten.' }
    const list = loadAssignments()
    const errors = validateAssignmentValues(values, { assignments: list, nodes: nodes(), editingId })
    const field = Object.keys(errors)[0]
    if (field) return { error: errors[field], field }

    const candidate = normalizeAssignment({
      ...values,
      id: editingId || values.id || `lead-${Date.now()}`,
      validTo: values.validTo || null,
    })
    // Wird eine neue Hauptleitungsfunktion gesetzt, verliert das bisherige
    // Hauptmandat derselben Person nur die Kennzeichnung. Gelöscht wird nichts.
    const demoted = candidate.primaryLeadership
      ? primaryAssignmentFor(list, candidate.personId, candidate.id)
      : null
    assignments = upsertAssignment(list, candidate)
    if (!saveAssignments(assignments)) {
      assignments = loadAssignments()
      return { error: 'Die aktive Rolle darf Leitungsfunktionen nicht bearbeiten.' }
    }
    announceLeadershipChanged()
    return { ok: true, demoted, saved: candidate }
  }

  /**
   * Entfernt genau ein Leitungsmandat. Mitgliedschaft und übrige Mandate
   * bleiben unberührt; es wird auch keine andere Funktion nachrücken.
   */
  const removeAssignmentById = (assignmentId) => {
    if (!canEdit()) return { error: 'Die aktive Rolle darf Leitungsfunktionen nicht bearbeiten.' }
    const list = loadAssignments()
    const entry = list.find((item) => item.id === String(assignmentId))
    if (!entry) return { error: 'Diese Leitungsfunktion ist nicht mehr vorhanden.' }
    assignments = list.filter((item) => item.id !== entry.id)
    if (!saveAssignments(assignments)) {
      assignments = loadAssignments()
      return { error: 'Die aktive Rolle darf Leitungsfunktionen nicht bearbeiten.' }
    }
    announceLeadershipChanged()
    return { ok: true, removed: entry }
  }

  /** Auswirkungen des Entfernens – Grundlage des sichtbaren Bestätigungsbereichs. */
  const assignmentImpact = (entry) => {
    const others = otherAssignmentsOf(assignments, entry.personId, entry.id)
    const lines = [
      `Person: ${personName(entry.personId)}`,
      `Organisationseinheit: ${unitName(entry.orgUnitId)}`,
      `Leitungsfunktion: ${entry.leadershipRole}`,
      `Ausübungsart: ${exerciseTypeLabels[entry.exerciseType]}`,
      `Gültigkeitszeitraum: ${formatDate(entry.validFrom)} – ${formatDate(entry.validTo)}`,
      `Hauptleitungsfunktion: ${entry.primaryLeadership ? 'ja' : 'nein'}`,
      `Die organisatorische Mitgliedschaft bleibt unverändert: ${personName(entry.personId)} bleibt „${directUnitName(entry.personId)}“ zugeordnet.`,
      others.length
        ? `Andere Leitungsmandate dieser Person bleiben bestehen (${others.length}): ${others.map((item) => `${item.leadershipRole} in ${unitName(item.orgUnitId)}`).join(', ')}.`
        : 'Diese Person hat kein weiteres Leitungsmandat; es bleibt keines zurück.',
    ]
    if (entry.primaryLeadership) {
      lines.push('Es rückt keine andere Leitungsfunktion automatisch als Hauptleitungsfunktion nach. Die Person hat danach keine gekennzeichnete Hauptleitungsfunktion.')
    }
    return lines
  }

  // --- Sichtbarer Hinweis innerhalb der Ansicht ----------------------------

  let pendingNotice = null
  const showLeadershipNotice = (text, tone = 'info') => {
    pendingNotice = { text, tone }
  }
  const renderLeadershipNotice = () => {
    const holder = document.querySelector('[data-leadership-notice]')
    if (!holder) return
    if (!pendingNotice) { holder.hidden = true; holder.textContent = ''; return }
    holder.textContent = pendingNotice.text
    holder.className = `leadership-notice leadership-notice--${pendingNotice.tone}`
    holder.hidden = false
    holder.setAttribute('role', 'status')
    pendingNotice = null
  }

  // --- Maske ----------------------------------------------------------------

  const todayIso = () => new Date().toISOString().slice(0, 10)

  /**
   * Feste Bearbeitungsmaske für ein Leitungsmandat im Hauptinhaltsbereich.
   *
   * Ersetzt das frühere Formular am Seitenende und `window.confirm` beim
   * Entfernen. Das Entfernen läuft über den sichtbaren Bestätigungsbereich der
   * Maske; `dangerOpen` blendet ihn direkt ein, wenn der Einstieg ausdrücklich
   * darauf zielt.
   */
  const openLeadershipMask = (assignmentId, { dangerOpen = false } = {}) => {
    if (!canEdit() || !window.MWEditMask) return false
    assignments = loadAssignments()
    const entry = assignmentId ? assignments.find((item) => item.id === String(assignmentId)) : null
    if (assignmentId && !entry) return false

    const zurueck = () => {
      renderLeadershipCenter()
      injectLeadership()
    }
    const personList = people()
    const unitList = units()
    const basePersonId = entry?.personId || selectedPersonId || personList[0]?.id || ''
    const current = primaryAssignmentFor(assignments, basePersonId, entry?.id || null)

    window.MWEditMask.open({
      id: 'leadership',
      eyebrow: 'Organisation · Leitungsfunktionen',
      title: entry
        ? `Leitungsfunktion „${entry.leadershipRole}“ bearbeiten`
        : 'Neue Leitungsfunktion anlegen',
      description: entry
        ? 'Person, Organisationseinheit, Ausübungsart und Gültigkeit dieses Leitungsmandats.'
        : 'Ein Leitungsmandat verbindet eine Person mit einer Organisationseinheit. Die organisatorische Zuordnung der Person bleibt davon unberührt.',
      breadcrumb: [
        { label: 'Organisation' },
        { label: 'Leitungsfunktionen', onSelect: zurueck },
        { label: entry ? entry.leadershipRole : 'Neue Leitungsfunktion' },
      ],
      sections: [
        {
          title: 'Person und Organisation',
          description: 'Wer führt welche Organisationseinheit, und in welcher Funktion?',
          fields: [
            {
              name: 'personId',
              label: 'Person',
              type: 'select',
              required: true,
              options: [
                { value: '', label: 'Bitte auswählen' },
                ...personList.map((person) => ({ value: person.id, label: person.name })),
              ],
              hint: 'Nur Personen stehen zur Auswahl. Die Mitgliedschaft der Person ändert sich dadurch nicht.',
            },
            {
              name: 'orgUnitId',
              label: 'Organisationseinheit',
              type: 'select',
              required: true,
              options: [
                { value: '', label: 'Bitte auswählen' },
                ...unitList.map((unit) => ({ value: unit.id, label: unit.name })),
              ],
              hint: 'Unterkategorien stehen nicht zur Auswahl: Sie sind keine OrgEinheiten und besitzen keine eigene Leitung.',
            },
            {
              name: 'leadershipRole',
              label: 'Leitungsfunktion',
              type: 'text',
              required: true,
              maxLength: 80,
              wide: true,
              placeholder: 'z. B. Teamleitung',
            },
          ],
        },
        {
          title: 'Ausübungsart',
          description: 'Wie wird die Leitungsfunktion wahrgenommen?',
          notes: [
            'Je Person ist höchstens eine Leitungsfunktion als Hauptleitungsfunktion gekennzeichnet.',
            current
              ? `Aktuell gekennzeichnet für ${personName(basePersonId)}: „${current.leadershipRole}“ in ${unitName(current.orgUnitId)}. Beim Aktivieren des Kennzeichens verliert dieser Eintrag nur die Kennzeichnung – er bleibt bestehen und wird nicht gelöscht.`
              : `Für ${personName(basePersonId) || 'die gewählte Person'} ist derzeit keine Hauptleitungsfunktion gekennzeichnet.`,
            'Leitung und Mitgliedschaft bleiben getrennt: Ein Leitungsmandat erzeugt keine zusätzliche organisatorische Zuordnung.',
          ],
          fields: [
            {
              name: 'exerciseType',
              label: 'Ausübungsart',
              type: 'select',
              required: true,
              options: Object.entries(exerciseTypeLabels).map(([value, label]) => ({ value, label })),
            },
            {
              name: 'primaryLeadership',
              label: 'Als Hauptleitungsfunktion dieser Person kennzeichnen',
              type: 'checkbox',
              hint: 'Eine bisherige Hauptleitungsfunktion derselben Person wird dabei zurückgestuft, aber nicht entfernt.',
            },
          ],
        },
        {
          title: 'Gültigkeit',
          description: 'Ohne Enddatum gilt das Mandat unbefristet.',
          fields: [
            { name: 'validFrom', label: 'Gültig ab', type: 'date' },
            {
              name: 'validTo',
              label: 'Gültig bis',
              type: 'date',
              hint: 'Darf nicht vor dem Gültig-ab-Datum liegen. Leer bedeutet unbefristet.',
            },
          ],
        },
        {
          title: 'Ergänzende Angaben',
          fields: [
            {
              name: 'note',
              label: 'Hinweis',
              type: 'textarea',
              rows: 3,
              maxLength: 300,
              wide: true,
              placeholder: 'z. B. Vertretungsregelung oder Grund der kommissarischen Wahrnehmung',
            },
          ],
        },
      ],
      values: {
        personId: entry?.personId || basePersonId,
        orgUnitId: entry?.orgUnitId || selectedUnitId || unitList[0]?.id || '',
        leadershipRole: entry?.leadershipRole || '',
        exerciseType: entry?.exerciseType || 'REGULAR',
        primaryLeadership: Boolean(entry?.primaryLeadership),
        validFrom: entry?.validFrom || todayIso(),
        validTo: entry?.validTo || '',
        note: entry?.note || '',
      },
      validate: (values) => validateAssignmentValues(values, {
        assignments: loadAssignments(),
        nodes: nodes(),
        editingId: entry?.id || null,
      }),
      saveLabel: entry ? 'Änderungen speichern' : 'Leitungsfunktion anlegen',
      onSave: (values) => {
        const result = saveAssignmentValues(values, entry?.id || null)
        if (result.error) return { error: result.error, field: result.field }
        selectedPersonId = result.saved.personId
        selectedUnitId = result.saved.orgUnitId
        const zurueckgestuft = result.demoted
          ? ` Die bisherige Hauptleitungsfunktion „${result.demoted.leadershipRole}“ in ${unitName(result.demoted.orgUnitId)} ist weiterhin vorhanden, aber nicht mehr als Hauptleitungsfunktion gekennzeichnet.`
          : ''
        showLeadershipNotice(
          `${entry ? 'Leitungsfunktion gespeichert' : 'Leitungsfunktion angelegt'}: „${result.saved.leadershipRole}“ für ${personName(result.saved.personId)} in ${unitName(result.saved.orgUnitId)}.${zurueckgestuft}`,
          'ok',
        )
        window.MWEditMask.close()
        zurueck()
        return true
      },
      onCancel: zurueck,
      dangerOpen: Boolean(entry) && dangerOpen,
      danger: entry
        ? {
          title: 'Leitungsfunktion entfernen',
          description: 'Entfernt ausschließlich dieses Leitungsmandat. Die organisatorische Zuordnung der Person bleibt bestehen.',
          label: 'Leitungsfunktion entfernen',
          question: `Leitungsfunktion „${entry.leadershipRole}“ von ${personName(entry.personId)} endgültig entfernen?`,
          impact: assignmentImpact(entry),
          note: 'Die Änderung bleibt lokal in diesem Browser.',
          confirmLabel: 'Endgültig entfernen',
          onConfirm: () => {
            const result = removeAssignmentById(entry.id)
            showLeadershipNotice(
              result.error
                ? result.error
                : `Leitungsfunktion „${entry.leadershipRole}“ von ${personName(entry.personId)} wurde entfernt. Die organisatorische Zuordnung ist unverändert.`,
              result.error ? 'error' : 'ok',
            )
            window.MWEditMask.close()
            zurueck()
          },
        }
        : null,
    })
    return true
  }

  const renderLeadershipCenter = () => {
    const content = document.getElementById('content')
    if (!content) return
    currentLeadershipView = true
    // Die Liste ersetzt eine eventuell offene Maske; deren Zustand wird verworfen.
    window.MWEditMask?.close()
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
        <header class="leadership-page-heading"><span>Personen und OrgEinheiten</span><h2>Leitungsfunktionen</h2><p>Mitgliedschaft und Leitung sind getrennte Beziehungen. Mehrere gleichzeitige Leitungsmandate und Personalunionen sind möglich.</p>${canEdit() ? '' : `<p class="leadership-readonly-badge" data-leadership-readonly>Nur-Lese-Ansicht für die Rolle „${escapeHtml(roleLabel())}“. Die beiden Auswahlfelder wechseln nur die Betrachtungsperspektive und ändern keine Daten.</p>`}</header>
        <p class="leadership-notice" data-leadership-notice hidden></p>
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
        ${canEdit()
          ? '<div class="leadership-add-bar"><button type="button" class="btn btn-primary" data-leadership-create>Leitungsfunktion anlegen</button><small>Anlegen, Bearbeiten und Entfernen erfolgen in einer eigenen Maske im Hauptbereich.</small></div>'
          : `<p class="leadership-readonly">Die Rolle „${escapeHtml(roleLabel())}“ darf Leitungsfunktionen ansehen, aber nicht bearbeiten. Es werden deshalb keine Eingabefelder für Leitungsmandate angeboten.</p>`}
      </section>`

    renderLeadershipNotice()

    content.querySelector('[data-leadership-person]')?.addEventListener('change', (event) => {
      selectedPersonId = event.target.value
      renderLeadershipCenter()
    })
    content.querySelector('[data-leadership-unit]')?.addEventListener('change', (event) => {
      selectedUnitId = event.target.value
      renderLeadershipCenter()
    })
    content.querySelector('[data-leadership-create]')?.addEventListener('click', () => openLeadershipMask(null))
    content.querySelectorAll('[data-leadership-edit]').forEach((button) => button.addEventListener('click', () => {
      openLeadershipMask(button.dataset.leadershipEdit)
    }))
    content.querySelectorAll('[data-leadership-delete]').forEach((button) => button.addEventListener('click', () => {
      openLeadershipMask(button.dataset.leadershipDelete, { dangerOpen: true })
    }))
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
  }, true)

  /** Ist gerade eine Bearbeitungsmaske im Hauptbereich sichtbar? */
  const maskIsOpen = () => Boolean(window.MWEditMask?.isOpen())

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      ensureNavigation()
      injectLeadership()
      injectPersonDrawer()
      // Eine offene Maske ist ein eigener Seitenzustand und darf nicht durch
      // den Wiederaufbau der Liste ersetzt werden.
      if (currentLeadershipView && !maskIsOpen() && !document.querySelector('[data-leadership-page]')) {
        renderLeadershipCenter()
      }
    })
  }

  // Zentraler Lebenszyklus statt eines eigenen Beobachters auf document.body.
  if (window.MWUiLifecycle) window.MWUiLifecycle.watch(scheduleEnhance)
  else new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
  // Änderungen an Personen oder OrgEinheiten wirken sich auf die Darstellung
  // der Leitungsmandate aus; die Ansicht wird gezielt nachgeführt.
  window.addEventListener('mw-demo-nodes-changed', scheduleEnhance)
  document.addEventListener('mw-demo-nodes-changed', scheduleEnhance)
  window.addEventListener('mw-demo-leadership-changed', scheduleEnhance)

  window.MWLeadershipDemo = {
    defaultAssignments: clone(defaultAssignments),
    exerciseTypeLabels: { ...exerciseTypeLabels },
    normalizeAssignment,
    isActive,
    rangesOverlap,
    validateAssignment,
    validateAssignmentValues,
    primaryAssignmentFor,
    otherAssignmentsOf,
    upsertAssignment,
    assignmentsForPerson,
    assignmentsForUnit,
    assignmentImpact,
    loadAssignments: () => clone(loadAssignments()),
    // Schreibende Funktionen tragen die Rechteprüfung selbst.
    saveAssignmentValues,
    removeAssignmentById,
    openLeadershipMask,
  }
  scheduleEnhance()
})()
