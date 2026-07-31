/**
 * Änderungspakete, Vier-Augen-Prinzip, Vorschau und Benutzerverwaltung.
 *
 * Eigenständiges Zusatzmodul im Stil der übrigen Erweiterungen dieser Demo:
 * Es liest und schreibt ausschließlich den LocalStorage, stellt keinerlei
 * Netzwerkanfragen und ergänzt Navigation und Inhalt über das DOM.
 */
(() => {
  const CHANGESET_KEY = 'mw-demo-changesets'
  const EVENT_KEY = 'mw-demo-changeset-events'
  const USER_KEY = 'mw-demo-users'
  const NODE_KEY = 'mw-demo-nodes'

  // --- Rollen und Rechte ---------------------------------------------------

  /*
   * Rollen, Beschriftungen und Rechte stammen aus dem gemeinsamen Vokabular
   * (roles.js). Die hier stehenden Werte sind nur noch der Rückfall, falls das
   * Modul nicht geladen ist; sie stimmen mit ihm überein.
   */
  const fallbackPermissions = {
    viewer: ['view', 'preview'],
    editor: ['view', 'create', 'submit', 'preview'],
    admin: ['view', 'create', 'submit', 'review', 'publish', 'withdraw', 'preview', 'users'],
    superadmin: ['view', 'create', 'submit', 'review', 'publish', 'withdraw', 'rollback', 'preview', 'users'],
  }
  const rolePermissions = globalThis.MWRoles?.permissions || fallbackPermissions
  const roleLabels = globalThis.MWRoles?.labels
    || { viewer: 'Leser', editor: 'Bereichsredaktion', admin: 'Administrator', superadmin: 'Superadministrator' }
  const roleNames = globalThis.MWRoles?.demoPersons
    || { viewer: 'Alex Beispiel', editor: 'Mika Muster', admin: 'Robin Demo', superadmin: 'Sam Test' }

  const currentRole = () => globalThis.MWRoles?.currentRoleId()
    || document.getElementById('roleSelect')?.value
    || 'viewer'
  const can = (permission) => (rolePermissions[currentRole()] || []).includes(permission)

  // --- Statusmodell --------------------------------------------------------

  const statusLabels = {
    DRAFT: 'Entwurf', PENDING_REVIEW: 'Zur Prüfung', APPROVED: 'Freigegeben', SCHEDULED: 'Terminiert',
    PUBLISHED: 'Veröffentlicht', REJECTED: 'Abgelehnt', WITHDRAWN: 'Zurückgezogen', ROLLED_BACK: 'Rückgängig gemacht',
  }
  const operationLabels = { CREATE: 'Neu angelegt', UPDATE: 'Geändert', DELETE: 'Entfernt' }
  const actionLabels = {
    submit: 'Zur Prüfung einreichen', approve: 'Freigeben', reject: 'Ablehnen',
    publish: 'Jetzt veröffentlichen', withdraw: 'Zurückziehen', rollback: 'Rückgängig machen',
  }
  const statusAfter = {
    submit: 'PENDING_REVIEW', approve: 'APPROVED', reject: 'REJECTED',
    publish: 'PUBLISHED', withdraw: 'WITHDRAWN', rollback: 'ROLLED_BACK',
  }
  /** Diese Status fließen in den geplanten Stand ein. */
  const PLANNED = ['APPROVED', 'SCHEDULED']

  // --- Ausgangsdaten, vollständig erfunden ---------------------------------

  const defaultChangeSets = [
    { id: 'cs1', title: 'Zusammenlegung Sachbearbeitung', description: 'Bündelung der Sachbearbeitung unter einer gemeinsamen Teamleitung.', status: 'PUBLISHED', validFrom: '2026-06-01', createdBy: 'editor', submittedBy: 'editor', reviewedBy: 'admin', publishedBy: 'admin', scheduledAt: null },
    { id: 'cs2', title: 'Neue Abteilung Digitalisierung', description: 'Gründung der Abteilung Digitalisierung mit zwei Teams.', status: 'APPROVED', validFrom: '2026-09-01', createdBy: 'editor', submittedBy: 'editor', reviewedBy: 'superadmin', publishedBy: null, scheduledAt: null },
    { id: 'cs3', title: 'Anpassung Stellenbezeichnungen', description: 'Vereinheitlichung der Stellenbezeichnungen im Personalmanagement.', status: 'PENDING_REVIEW', validFrom: '2026-10-01', createdBy: 'editor', submittedBy: 'editor', reviewedBy: null, publishedBy: null, scheduledAt: null },
    { id: 'cs4', title: 'Umbenennung Personalcontrolling', description: 'Umbenennung der Abteilung Personalcontrolling.', status: 'DRAFT', validFrom: '2026-11-01', createdBy: 'editor', submittedBy: null, reviewedBy: null, publishedBy: null, scheduledAt: null },
    { id: 'cs5', title: 'Standortzuordnung Außenstelle', description: 'Aktualisierung der Standortangaben.', status: 'REJECTED', validFrom: '2026-08-15', createdBy: 'editor', submittedBy: 'editor', reviewedBy: 'admin', publishedBy: null, scheduledAt: null },
    { id: 'cs6', title: 'Verlagerung BGSM', description: 'Das Gesundheitsmanagement wechselt in die Personalentwicklung.', status: 'SCHEDULED', validFrom: '2026-12-01', createdBy: 'editor', submittedBy: 'editor', reviewedBy: 'admin', publishedBy: null, scheduledAt: '2026-11-30T23:00' },
  ]

  const items = {
    cs1: [{ id: 'i1', entityId: 'pm-sb', type: 'Organisationseinheit', operation: 'UPDATE', before: { name: 'Sachbearbeitung Personal' }, after: { name: 'Sachbearbeitung' } }],
    cs2: [
      { id: 'i2', entityId: 'digital', type: 'Organisationseinheit', operation: 'CREATE', before: null, after: { id: 'digital', parent: 'prv', type: 'department', name: 'Digitalisierung', subtitle: 'Abteilung', accent: '#99e7ff' } },
      { id: 'i3', entityId: 'digital-strategie', type: 'Organisationseinheit', operation: 'CREATE', before: null, after: { id: 'digital-strategie', parent: 'digital', type: 'team', name: 'Strategie und Planung', subtitle: 'Team', accent: '#a8ffab' } },
      { id: 'i4', entityId: 'digital-betrieb', type: 'Organisationseinheit', operation: 'CREATE', before: null, after: { id: 'digital-betrieb', parent: 'digital', type: 'team', name: 'Betrieb und Support', subtitle: 'Team', accent: '#a8ffab' } },
    ],
    cs3: [{ id: 'i5', entityId: 'p1', type: 'Person', operation: 'UPDATE', before: { role: 'HR Business Partner' }, after: { role: 'HR Business Partner (Senior)' } }],
    cs4: [{ id: 'i6', entityId: 'pc', type: 'Organisationseinheit', operation: 'UPDATE', before: { name: 'Personalcontrolling' }, after: { name: 'Personalcontrolling und Reporting' } }],
    cs5: [{ id: 'i7', entityId: 'p3', type: 'Person', operation: 'UPDATE', before: { location: 'Servicecenter Nord' }, after: { location: 'Außenstelle Nord' } }],
    cs6: [{ id: 'i8', entityId: 'pc-bgsm', type: 'Organisationseinheit', operation: 'UPDATE', before: { parent: 'pc' }, after: { parent: 'pe' } }],
  }

  const defaultEvents = {
    cs1: [
      { id: 1, from: null, to: 'DRAFT', comment: null, at: '2026-05-01T08:00', actor: 'Mika Muster' },
      { id: 2, from: 'DRAFT', to: 'PENDING_REVIEW', comment: 'Bitte um Freigabe bis Monatsende.', at: '2026-05-10T10:00', actor: 'Mika Muster' },
      { id: 3, from: 'PENDING_REVIEW', to: 'APPROVED', comment: 'Geprüft und freigegeben.', at: '2026-05-12T14:00', actor: 'Robin Demo' },
      { id: 4, from: 'APPROVED', to: 'PUBLISHED', comment: null, at: '2026-05-31T08:00', actor: 'Robin Demo' },
    ],
    cs2: [
      { id: 5, from: null, to: 'DRAFT', comment: null, at: '2026-07-01T08:00', actor: 'Mika Muster' },
      { id: 6, from: 'DRAFT', to: 'PENDING_REVIEW', comment: 'Konzept ist abgestimmt.', at: '2026-07-05T09:00', actor: 'Mika Muster' },
      { id: 7, from: 'PENDING_REVIEW', to: 'APPROVED', comment: 'Freigegeben.', at: '2026-07-08T11:30', actor: 'Sam Test' },
    ],
    cs3: [
      { id: 8, from: null, to: 'DRAFT', comment: null, at: '2026-07-15T10:00', actor: 'Mika Muster' },
      { id: 9, from: 'DRAFT', to: 'PENDING_REVIEW', comment: null, at: '2026-07-20T14:00', actor: 'Mika Muster' },
    ],
    cs4: [{ id: 10, from: null, to: 'DRAFT', comment: null, at: '2026-07-25T09:00', actor: 'Mika Muster' }],
    cs5: [
      { id: 11, from: null, to: 'DRAFT', comment: null, at: '2026-07-08T08:00', actor: 'Mika Muster' },
      { id: 12, from: 'DRAFT', to: 'PENDING_REVIEW', comment: null, at: '2026-07-10T08:00', actor: 'Mika Muster' },
      { id: 13, from: 'PENDING_REVIEW', to: 'REJECTED', comment: 'Bitte zuerst Rücksprache halten.', at: '2026-07-12T10:00', actor: 'Robin Demo' },
    ],
    cs6: [
      { id: 14, from: null, to: 'DRAFT', comment: null, at: '2026-07-16T08:00', actor: 'Mika Muster' },
      { id: 15, from: 'DRAFT', to: 'PENDING_REVIEW', comment: null, at: '2026-07-18T09:00', actor: 'Mika Muster' },
      { id: 16, from: 'PENDING_REVIEW', to: 'APPROVED', comment: 'Freigegeben.', at: '2026-07-22T09:30', actor: 'Robin Demo' },
      { id: 17, from: 'APPROVED', to: 'SCHEDULED', comment: 'Veröffentlichung terminiert.', at: '2026-07-22T09:35', actor: 'Robin Demo' },
    ],
  }

  const defaultUsers = [
    { id: 'viewer', name: 'Alex Beispiel', email: 'alex.beispiel@example.org', role: 'viewer', status: 'ACTIVE' },
    { id: 'editor', name: 'Mika Muster', email: 'mika.muster@example.org', role: 'editor', status: 'ACTIVE' },
    { id: 'admin', name: 'Robin Demo', email: 'robin.demo@example.org', role: 'admin', status: 'ACTIVE' },
    { id: 'superadmin', name: 'Sam Test', email: 'sam.test@example.org', role: 'superadmin', status: 'ACTIVE' },
    { id: 'ext1', name: 'Kim Extern', email: 'kim.extern@example.org', role: 'viewer', status: 'LOCKED' },
    { id: 'ext2', name: 'Toni Ehemalig', email: 'toni.ehemalig@example.org', role: 'editor', status: 'DISABLED' },
  ]
  const statusLabelsUser = { ACTIVE: 'Aktiv', LOCKED: 'Gesperrt', DISABLED: 'Deaktiviert' }

  /**
   * Ausgangsknoten der Basis-Demo. Sie werden nur benötigt, solange noch
   * nichts gespeichert wurde: app.js legt mw-demo-nodes erst beim ersten
   * Speichern an. Ein Test hält diese Liste mit app.js deckungsgleich.
   */
  const fallbackNodes = [
    { id:'mw', parent:null, type:'company', name:'Münchner Wohnen', subtitle:'Organisationsübersicht' },
    { id:'prv', parent:'mw', type:'section', name:'Personal, Recht und Verwaltung', subtitle:'Sektion' },
    { id:'pm', parent:'prv', type:'department', name:'Personalmanagement', subtitle:'Abteilung' },
    { id:'pa', parent:'prv', type:'department', name:'Personaladministration', subtitle:'Abteilung' },
    { id:'pe', parent:'prv', type:'department', name:'Personalentwicklung', subtitle:'Abteilung' },
    { id:'pc', parent:'prv', type:'department', name:'Personalcontrolling', subtitle:'Abteilung' },
    { id:'pm-hrbp', parent:'pm', type:'team', name:'HR Business Partner', subtitle:'Team' },
    { id:'pm-sb', parent:'pm', type:'team', name:'Sachbearbeitung', subtitle:'Team' },
    { id:'pa-pay', parent:'pa', type:'team', name:'Entgeltabrechnung', subtitle:'Team' },
    { id:'pa-time', parent:'pa', type:'team', name:'Zeitwirtschaft', subtitle:'Team' },
    { id:'pe-learning', parent:'pe', type:'team', name:'Ausbildung & Weiterbildung', subtitle:'Team' },
    { id:'pe-onboarding', parent:'pe', type:'team', name:'Onboarding', subtitle:'Team' },
    { id:'pc-bgsm', parent:'pc', type:'team', name:'BGSM', subtitle:'Team' },
    { id:'pc-control', parent:'pc', type:'team', name:'HR-Controlling', subtitle:'Team' },
    { id:'p1', parent:'pm-hrbp', type:'person', name:'Lea Beispiel', role:'HR Business Partner', email:'lea.beispiel@example.org', phone:'089 100001', location:'Zentrale', status:'Aktiv' },
    { id:'p2', parent:'pm-hrbp', type:'person', name:'Noah Muster', role:'HR Business Partner', email:'noah.muster@example.org', phone:'089 100002', location:'Zentrale', status:'Aktiv' },
    { id:'p3', parent:'pm-sb', type:'person', name:'Mila Demo', role:'Sachbearbeitung', email:'mila.demo@example.org', phone:'089 100003', location:'Servicecenter Nord', status:'Aktiv' },
    { id:'p4', parent:'pa-pay', type:'person', name:'Elias Test', role:'Entgeltabrechnung', email:'elias.test@example.org', phone:'089 100004', location:'Zentrale', status:'Aktiv' },
    { id:'p5', parent:'pa-time', type:'person', name:'Lina Probe', role:'Zeitwirtschaft', email:'lina.probe@example.org', phone:'089 100005', location:'Servicecenter Nord', status:'Elternzeit' },
    { id:'p6', parent:'pe-learning', type:'person', name:'Finn Beispiel', role:'Personalentwicklung', email:'finn.beispiel@example.org', phone:'089 100006', location:'Zentrale', status:'Aktiv' },
    { id:'p7', parent:'pe-onboarding', type:'person', name:'Emma Muster', role:'Onboarding', email:'emma.muster@example.org', phone:'089 100007', location:'Zentrale', status:'Aktiv' },
    { id:'p8', parent:'pc-bgsm', type:'person', name:'Luis Demo', role:'BGSM', email:'luis.demo@example.org', phone:'089 100008', location:'Technikstandort', status:'Aktiv' },
    { id:'p9', parent:'pc-control', type:'person', name:'Sofia Test', role:'HR-Controlling', email:'sofia.test@example.org', phone:'089 100009', location:'Zentrale', status:'Aktiv' },
  ]

  // --- Speicher ------------------------------------------------------------

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : clone(fallback)
    } catch {
      return clone(fallback)
    }
  }
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

  const loadChangeSets = () => read(CHANGESET_KEY, defaultChangeSets)
  const loadEvents = () => read(EVENT_KEY, defaultEvents)
  const loadUsers = () => read(USER_KEY, defaultUsers)

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]))
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString('de-DE') : '—')
  const formatDateTime = (value) => (value ? new Date(value).toLocaleString('de-DE') : '—')

  // --- Workflow-Regeln -----------------------------------------------------

  /**
   * Erlaubte Aktionen. Das Vier-Augen-Prinzip steckt hier: Wer eingereicht
   * hat, darf weder freigeben noch ablehnen – unabhängig von der Rolle.
   */
  function availableActions(changeSet, role) {
    const permissions = rolePermissions[role] || []
    const actions = []
    if (changeSet.status === 'DRAFT' && changeSet.createdBy === role && permissions.includes('submit')) actions.push('submit')
    if (changeSet.status === 'PENDING_REVIEW' && changeSet.submittedBy !== role && permissions.includes('review')) actions.push('approve', 'reject')
    if (changeSet.status === 'APPROVED' && permissions.includes('publish')) actions.push('publish')
    if ((changeSet.status === 'APPROVED' || changeSet.status === 'SCHEDULED') && permissions.includes('withdraw')) actions.push('withdraw')
    if (changeSet.status === 'PUBLISHED' && permissions.includes('rollback')) actions.push('rollback')
    return actions
  }

  function reviewBlockReason(changeSet, role) {
    if (changeSet.status !== 'PENDING_REVIEW') return null
    if (changeSet.submittedBy === role) return 'Vier-Augen-Prinzip: Eingereichte Pakete können nicht selbst freigegeben werden.'
    if (!(rolePermissions[role] || []).includes('review')) return 'Die aktuelle Rolle besitzt kein Prüfrecht.'
    return null
  }

  function applyAction(id, action, comment) {
    const changeSets = loadChangeSets()
    const target = changeSets.find((changeSet) => changeSet.id === id)
    if (!target) return null
    const role = currentRole()
    const from = target.status
    target.status = statusAfter[action]
    if (action === 'submit') target.submittedBy = role
    if (action === 'approve' || action === 'reject') target.reviewedBy = role
    if (action === 'publish') target.publishedBy = role
    write(CHANGESET_KEY, changeSets)

    const events = loadEvents()
    const all = Object.values(events).flat()
    const nextId = all.length ? Math.max(...all.map((event) => event.id)) + 1 : 1
    events[id] = [...(events[id] || []), { id: nextId, from, to: target.status, comment: (comment || '').trim() || null, at: new Date().toISOString(), actor: roleNames[role] || role }]
    write(EVENT_KEY, events)
    return target
  }

  // --- Vorschau und Vergleich ---------------------------------------------

  const plannedChangeSets = (changeSets) => changeSets.filter((changeSet) => PLANNED.includes(changeSet.status)).sort((a, b) => a.validFrom.localeCompare(b.validFrom))

  /** Wendet Positionen an. Die Eingabe bleibt unverändert. */
  function applyItems(nodes, positions) {
    const byId = new Map(nodes.map((node) => [node.id, { ...node }]))
    positions.forEach((item) => {
      if (item.operation === 'DELETE') { byId.delete(item.entityId); return }
      if (item.operation === 'CREATE') { if (item.after) byId.set(item.entityId, { ...item.after }); return }
      const existing = byId.get(item.entityId)
      if (existing && item.after) byId.set(item.entityId, { ...existing, ...item.after })
    })
    // Knoten ohne vorhandene übergeordnete Einheit verwerfen, sonst wäre der Baum nicht darstellbar.
    let changed = true
    while (changed) {
      changed = false
      Array.from(byId.values()).forEach((node) => {
        if (node.parent && !byId.has(node.parent)) { byId.delete(node.id); changed = true }
      })
    }
    return Array.from(byId.values())
  }

  function buildPlanned(nodes, changeSets) {
    return plannedChangeSets(changeSets).reduce((current, changeSet) => applyItems(current, items[changeSet.id] || []), nodes)
  }

  const COMPARED = ['name', 'role', 'subtitle', 'parent', 'email', 'phone', 'location', 'status']
  const fieldLabels = { name: 'Bezeichnung', role: 'Stellenbezeichnung', subtitle: 'Untertitel', parent: 'Übergeordnete Einheit', email: 'E-Mail', phone: 'Telefon', location: 'Standort', status: 'Status' }
  const shown = (value) => (value === undefined || value === null || value === '' ? '—' : String(value))

  function diff(current, planned) {
    const currentById = new Map(current.map((node) => [node.id, node]))
    const plannedById = new Map(planned.map((node) => [node.id, node]))
    const entries = []
    planned.forEach((node) => {
      const before = currentById.get(node.id)
      if (!before) { entries.push({ id: node.id, name: node.name, operation: 'CREATE', fields: [] }); return }
      const fields = COMPARED.filter((field) => shown(before[field]) !== shown(node[field])).map((field) => ({ field, before: shown(before[field]), after: shown(node[field]) }))
      if (fields.length) entries.push({ id: node.id, name: node.name, operation: 'UPDATE', fields })
    })
    current.forEach((node) => { if (!plannedById.has(node.id)) entries.push({ id: node.id, name: node.name, operation: 'DELETE', fields: [] }) })
    const order = { CREATE: 0, UPDATE: 1, DELETE: 2 }
    return entries.sort((a, b) => order[a.operation] - order[b.operation] || a.name.localeCompare(b.name, 'de'))
  }

  // --- Oberfläche ----------------------------------------------------------

  let selectedId = null
  let notice = ''

  const content = () => document.getElementById('content')
  const statusBadge = (status) => `<span class="cs-status cs-status--${status.toLowerCase()}">${esc(statusLabels[status] || status)}</span>`

  function renderList() {
    selectedId = null
    const changeSets = loadChangeSets()
    const rows = changeSets.map((changeSet) => `
      <button type="button" class="cs-card" data-open="${esc(changeSet.id)}">
        <span class="cs-card__head"><strong>${esc(changeSet.title)}</strong>${statusBadge(changeSet.status)}</span>
        <span class="cs-card__meta">Gültig ab ${esc(formatDate(changeSet.validFrom))} · ${(items[changeSet.id] || []).length} Änderung(en)${changeSet.scheduledAt ? ` · Termin ${esc(formatDate(changeSet.scheduledAt))}` : ''}</span>
        <span class="cs-card__text">${esc(changeSet.description || '')}</span>
      </button>`).join('')

    content().innerHTML = `
      <div class="view-head"><div><h2>Änderungspakete</h2><p>Änderungen am Organigramm werden gebündelt, geprüft und erst nach Freigabe veröffentlicht.</p></div><div class="actions">${can('create') ? '<button id="csNew" class="btn btn-primary">Neues Paket anlegen</button>' : ''}</div></div>
      ${notice ? `<p class="notice success">${esc(notice)}</p>` : ''}
      <div class="cs-list">${rows}</div>`
    notice = ''

    content().querySelectorAll('[data-open]').forEach((button) => { button.onclick = () => renderDetail(button.dataset.open) })
    const create = document.getElementById('csNew')
    if (create) create.onclick = () => {
      const title = prompt('Titel des neuen Änderungspakets')
      if (!title || !title.trim()) return
      const changeSets = loadChangeSets()
      const id = `cs-${Date.now()}`
      changeSets.push({ id, title: title.trim(), description: 'Lokal angelegtes Demo-Paket.', status: 'DRAFT', validFrom: new Date().toISOString().slice(0, 10), createdBy: currentRole(), submittedBy: null, reviewedBy: null, publishedBy: null, scheduledAt: null })
      write(CHANGESET_KEY, changeSets)
      const events = loadEvents()
      events[id] = [{ id: Date.now(), from: null, to: 'DRAFT', comment: null, at: new Date().toISOString(), actor: roleNames[currentRole()] }]
      write(EVENT_KEY, events)
      notice = 'Änderungspaket als Entwurf angelegt.'
      renderList()
    }
  }

  function renderDetail(id) {
    selectedId = id
    const changeSet = loadChangeSets().find((entry) => entry.id === id)
    if (!changeSet) return renderList()
    const role = currentRole()
    const actions = availableActions(changeSet, role)
    const blocked = reviewBlockReason(changeSet, role)
    const positions = items[id] || []
    const events = loadEvents()[id] || []

    content().innerHTML = `
      <button type="button" class="btn btn-ghost" id="csBack">← Zurück zur Übersicht</button>
      <div class="view-head"><div><h2>${esc(changeSet.title)}</h2><p>${esc(changeSet.description || '')}</p></div><div class="actions">${statusBadge(changeSet.status)}</div></div>
      <p class="cs-meta">Gültig ab ${esc(formatDate(changeSet.validFrom))}${changeSet.scheduledAt ? ` · Termin ${esc(formatDateTime(changeSet.scheduledAt))}` : ''}</p>
      ${blocked ? `<p class="notice">${esc(blocked)}</p>` : ''}
      ${notice ? `<p class="notice success">${esc(notice)}</p>` : ''}
      ${actions.length ? `<section class="panel cs-actions">
        <label class="field"><span>Kommentar ${actions.includes('reject') ? '(bei Ablehnung erforderlich)' : '(optional)'}</span><textarea id="csComment" rows="2" placeholder="Begründung oder Hinweis"></textarea></label>
        <div class="actions">${actions.map((action) => `<button type="button" class="btn btn-primary" data-action="${esc(action)}">${esc(actionLabels[action])}</button>`).join('')}</div>
      </section>` : ''}
      <h3 class="cs-subhead">Änderungen (${positions.length})</h3>
      <div class="cs-items">${positions.map((item) => `
        <article class="cs-item cs-item--${item.operation.toLowerCase()}">
          <header><strong>${esc(operationLabels[item.operation])}</strong><span>${esc(item.type)}</span><code>${esc(item.entityId)}</code></header>
          <div class="cs-item__states">
            <div><span class="cs-label">Vorher</span>${item.before ? Object.entries(item.before).map(([key, value]) => `<p>${esc(key)}: ${esc(value)}</p>`).join('') : '<p>Nicht vorhanden</p>'}</div>
            <div><span class="cs-label">Nachher</span>${item.after ? Object.entries(item.after).map(([key, value]) => `<p>${esc(key)}: ${esc(value)}</p>`).join('') : '<p>Entfernt</p>'}</div>
          </div>
        </article>`).join('')}</div>
      <h3 class="cs-subhead">Verlauf (${events.length})</h3>
      <ol class="cs-timeline">${events.map((event) => `
        <li><div class="cs-timeline__head">${event.from ? `${statusBadge(event.from)}<span aria-hidden="true">→</span>` : ''}${statusBadge(event.to)}<span>${esc(formatDateTime(event.at))}</span><strong>${esc(event.actor)}</strong></div>${event.comment ? `<p>${esc(event.comment)}</p>` : ''}</li>`).join('')}</ol>`

    document.getElementById('csBack').onclick = () => renderList()
    content().querySelectorAll('[data-action]').forEach((button) => {
      button.onclick = () => {
        const action = button.dataset.action
        const comment = document.getElementById('csComment')?.value || ''
        if (action === 'reject' && !comment.trim()) { notice = ''; alert('Eine Ablehnung erfordert eine Begründung.'); return }
        applyAction(id, action, comment)
        notice = `${actionLabels[action]}: ausgeführt.`
        renderDetail(id)
      }
    })
  }

  function renderPreview() {
    selectedId = null
    const nodes = read(NODE_KEY, fallbackNodes)
    const changeSets = loadChangeSets()
    const planned = buildPlanned(nodes, changeSets)
    const differences = diff(nodes, planned)
    const sources = plannedChangeSets(changeSets)
    const counts = {
      CREATE: differences.filter((entry) => entry.operation === 'CREATE').length,
      UPDATE: differences.filter((entry) => entry.operation === 'UPDATE').length,
      DELETE: differences.filter((entry) => entry.operation === 'DELETE').length,
    }

    content().innerHTML = `
      <div class="view-head"><div><h2>Aktueller und geplanter Stand</h2><p>Der geplante Stand berücksichtigt alle freigegebenen und terminierten Änderungspakete. Die gespeicherten Daten bleiben unverändert.</p></div></div>
      <div class="grid cs-stats">
        <section class="panel"><div class="metric">${nodes.length}</div><div class="metric-label">Einträge aktuell</div></section>
        <section class="panel"><div class="metric">${planned.length}</div><div class="metric-label">Einträge geplant</div></section>
        <section class="panel"><div class="metric">${differences.length}</div><div class="metric-label">${counts.CREATE} neu · ${counts.UPDATE} geändert · ${counts.DELETE} entfernt</div></section>
        <section class="panel"><div class="metric">${sources.length}</div><div class="metric-label">berücksichtigte Pakete</div></section>
      </div>
      <h3 class="cs-subhead">Zugrunde liegende Änderungspakete</h3>
      <ul class="cs-sources">${sources.length ? sources.map((changeSet) => `<li><strong>${esc(changeSet.title)}</strong>${statusBadge(changeSet.status)}<small>gültig ab ${esc(formatDate(changeSet.validFrom))}</small></li>`).join('') : '<li>Derzeit ist kein Paket freigegeben oder terminiert.</li>'}</ul>
      <h3 class="cs-subhead">Gegenüberstellung</h3>
      <div class="cs-diff">${differences.length ? differences.map((entry) => `
        <article class="cs-diff__entry cs-diff__entry--${entry.operation.toLowerCase()}">
          <header><strong>${esc(entry.name)}</strong><span>${esc(operationLabels[entry.operation])}</span><code>${esc(entry.id)}</code></header>
          ${entry.fields.length ? `<table><thead><tr><th>Feld</th><th>Aktuell</th><th>Geplant</th></tr></thead><tbody>${entry.fields.map((change) => `<tr><th scope="row">${esc(fieldLabels[change.field] || change.field)}</th><td>${esc(change.before)}</td><td>${esc(change.after)}</td></tr>`).join('')}</tbody></table>` : ''}
        </article>`).join('') : '<p>Aktueller und geplanter Stand sind identisch.</p>'}</div>`
  }

  function renderUsers() {
    selectedId = null
    const users = loadUsers()
    content().innerHTML = `
      <div class="view-head"><div><h2>Benutzerverwaltung</h2><p>Kontostatus und Rolle der Demo-Benutzer. Änderungen bleiben lokal in diesem Browser.</p></div></div>
      ${notice ? `<p class="notice success">${esc(notice)}</p>` : ''}
      <div class="cs-users">${users.map((user) => `
        <article class="cs-user cs-user--${user.status.toLowerCase()}">
          <div class="cs-user__head"><strong>${esc(user.name)}</strong><span class="cs-status cs-status--user-${user.status.toLowerCase()}">${esc(statusLabelsUser[user.status])}</span></div>
          <span class="cs-user__meta">${esc(user.email)}</span>
          <label class="field"><span>Rolle</span><select data-role-for="${esc(user.id)}">${Object.entries(roleLabels).map(([key, label]) => `<option value="${esc(key)}" ${user.role === key ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
          <div class="actions">
            <button type="button" class="btn btn-ghost btn-small" data-user="${esc(user.id)}" data-status="ACTIVE" ${user.status === 'ACTIVE' ? 'disabled' : ''}>Aktivieren</button>
            <button type="button" class="btn btn-ghost btn-small" data-user="${esc(user.id)}" data-status="LOCKED" ${user.status === 'LOCKED' ? 'disabled' : ''}>Sperren</button>
            <button type="button" class="btn btn-ghost btn-small" data-user="${esc(user.id)}" data-status="DISABLED" ${user.status === 'DISABLED' ? 'disabled' : ''}>Deaktivieren</button>
          </div>
        </article>`).join('')}</div>`

    content().querySelectorAll('[data-user]').forEach((button) => {
      button.onclick = () => {
        const next = loadUsers().map((user) => (user.id === button.dataset.user ? { ...user, status: button.dataset.status } : user))
        write(USER_KEY, next)
        notice = `Kontostatus geändert: ${statusLabelsUser[button.dataset.status]}.`
        renderUsers()
      }
    })
    content().querySelectorAll('[data-role-for]').forEach((select) => {
      select.onchange = () => {
        const next = loadUsers().map((user) => (user.id === select.dataset.roleFor ? { ...user, role: select.value } : user))
        write(USER_KEY, next)
        notice = `Rolle geändert: ${roleLabels[select.value]}.`
        renderUsers()
      }
    })
  }

  // --- Einbindung in Navigation und Reset ----------------------------------

  const views = [
    { id: 'changesets', label: 'Änderungspakete', permission: 'view', render: renderList },
    { id: 'preview', label: 'Vorschau', permission: 'preview', render: renderPreview },
    { id: 'users', label: 'Benutzerverwaltung', permission: 'users', render: renderUsers },
  ]

  let activeView = null

  function activate(view) {
    activeView = view.id
    document.querySelectorAll('#nav button').forEach((button) => button.classList.remove('active'))
    document.querySelector(`#nav button[data-cs-view="${view.id}"]`)?.classList.add('active')
    view.render()
  }

  function injectNav() {
    const nav = document.getElementById('nav')
    if (!nav || !nav.children.length) return
    views.forEach((view) => {
      if (!can(view.permission)) {
        nav.querySelector(`button[data-cs-view="${view.id}"]`)?.remove()
        return
      }
      if (nav.querySelector(`button[data-cs-view="${view.id}"]`)) return
      const button = document.createElement('button')
      button.dataset.csView = view.id
      button.textContent = view.label
      button.addEventListener('click', () => activate(view))
      nav.appendChild(button)
    })
    // Ein Klick auf eine Ansicht der Basis-Demo beendet die Zusatzansicht.
    nav.querySelectorAll('button[data-view]').forEach((button) => {
      if (button.dataset.csBound) return
      button.dataset.csBound = 'true'
      button.addEventListener('click', () => { activeView = null; selectedId = null }, true)
    })
  }

  const observer = new MutationObserver(() => injectNav())
  const start = () => {
    const nav = document.getElementById('nav')
    if (nav) observer.observe(nav, { childList: true })
    injectNav()
    document.getElementById('loginBtn')?.addEventListener('click', () => window.setTimeout(injectNav, 0))
    document.getElementById('resetBtn')?.addEventListener('click', () => {
      // Der Reset der Basis-Demo räumt auch die Daten dieses Moduls ab.
      window.setTimeout(() => {
        [CHANGESET_KEY, EVENT_KEY, USER_KEY].forEach((key) => localStorage.removeItem(key))
        activeView = null
        selectedId = null
        injectNav()
      }, 0)
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()

  // Für die automatisierten Tests, ohne Einfluss auf die Oberfläche.
  window.MWChangesetDemo = { fallbackNodes, availableActions, reviewBlockReason, applyItems, buildPlanned, diff, plannedChangeSets, defaultChangeSets, items, rolePermissions, statusAfter }
})()
