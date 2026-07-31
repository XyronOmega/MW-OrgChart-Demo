(() => {
  const STORAGE_KEY = 'mw-demo-nodes'
  const TYPE_KEY = 'mw-demo-organization-types'
  const RETURN_ROLE_KEY = 'mw-demo-editor-role'
  const RETURN_VIEW_KEY = 'mw-demo-editor-view'

  const builtInTypes = [
    { id: 'company', label: 'Unternehmen', baseType: 'company', color: '#070042', active: true, system: true, sortOrder: 0 },
    { id: 'management', label: 'Geschäftsführung', baseType: 'management', color: '#fda8ff', active: true, system: true, sortOrder: 1 },
    { id: 'section', label: 'Sektion', baseType: 'section', color: '#ff757b', active: true, system: true, sortOrder: 2 },
    { id: 'department', label: 'Abteilung', baseType: 'department', color: '#99e7ff', active: true, system: true, sortOrder: 3 },
    { id: 'team', label: 'Team', baseType: 'team', color: '#a8ffab', active: true, system: true, sortOrder: 4 },
  ]

  const baseLabels = {
    company: 'Unternehmensebene',
    management: 'Geschäftsführungsebene',
    section: 'Sektions- / Bereichsebene',
    department: 'Abteilungs- / Direktionsebene',
    team: 'Team- / Gruppenebene',
  }

  const parentTypes = {
    company: ['company'],
    management: ['company'],
    section: ['company', 'management'],
    department: ['company', 'management', 'section'],
    team: ['company', 'management', 'section', 'department'],
  }

  const fallbackNodes = [
    { id: 'mw', parent: null, type: 'company', organizationTypeId: 'company', baseType: 'company', name: 'Münchner Wohnen', subtitle: 'Unternehmen', accent: '#070042' },
    { id: 'prv', parent: 'mw', type: 'section', organizationTypeId: 'section', baseType: 'section', name: 'Personal, Recht und Verwaltung', subtitle: 'Sektion', accent: '#ff757b' },
    { id: 'pm', parent: 'prv', type: 'department', organizationTypeId: 'department', baseType: 'department', name: 'Personalmanagement', subtitle: 'Abteilung', accent: '#99e7ff' },
    { id: 'pa', parent: 'prv', type: 'department', organizationTypeId: 'department', baseType: 'department', name: 'Personaladministration', subtitle: 'Abteilung', accent: '#99e7ff' },
    { id: 'pe', parent: 'prv', type: 'department', organizationTypeId: 'department', baseType: 'department', name: 'Personalentwicklung', subtitle: 'Abteilung', accent: '#99e7ff' },
    { id: 'pc', parent: 'prv', type: 'department', organizationTypeId: 'department', baseType: 'department', name: 'Personalcontrolling', subtitle: 'Abteilung', accent: '#99e7ff' },
    { id: 'pm-hrbp', parent: 'pm', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'HR Business Partner', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pm-sb', parent: 'pm', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'Sachbearbeitung', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pa-pay', parent: 'pa', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'Entgeltabrechnung', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pa-time', parent: 'pa', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'Zeitwirtschaft', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pe-learning', parent: 'pe', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'Ausbildung & Weiterbildung', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pe-onboarding', parent: 'pe', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'Onboarding', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'BGSM', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pc-control', parent: 'pc', type: 'team', organizationTypeId: 'team', baseType: 'team', name: 'HR-Controlling', subtitle: 'Team', accent: '#a8ffab' },
  ]

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
  const clone = (value) => JSON.parse(JSON.stringify(value))
  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null')
      return value ?? fallback
    } catch {
      return fallback
    }
  }

  const loadNodes = () => {
    const stored = readJson(STORAGE_KEY, null)
    return Array.isArray(stored) ? stored : clone(fallbackNodes)
  }
  const saveNodes = (nodes) => localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))

  const loadTypes = () => {
    const platformTypes = window.MWOrgPlatform?.loadTypes?.()
    if (Array.isArray(platformTypes)) return platformTypes.filter((definition) => definition.baseType !== 'person')
    const stored = readJson(TYPE_KEY, [])
    const custom = Array.isArray(stored) ? stored.filter((definition) => definition && definition.baseType !== 'person') : []
    const byId = new Map(custom.map((definition) => [definition.id, definition]))
    return [...builtInTypes.map((definition) => ({ ...definition, ...(byId.get(definition.id) || {}) })), ...custom.filter((definition) => !builtInTypes.some((builtIn) => builtIn.id === definition.id))]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, 'de'))
  }

  const typeForNode = (node, definitions) => definitions.find((definition) => definition.id === (node.organizationTypeId || node.type))
    || definitions.find((definition) => definition.id === node.type)
    || { id: node.organizationTypeId || node.type, label: node.subtitle || node.type, baseType: node.baseType || node.type, color: node.accent || '#99e7ff', active: true }
  const baseTypeOf = (node, definitions) => typeForNode(node, definitions).baseType

  const pathFor = (nodes, id) => {
    const path = []
    const seen = new Set()
    let current = nodes.find((node) => node.id === id)
    while (current && !seen.has(current.id)) {
      path.unshift(current.name)
      seen.add(current.id)
      current = current.parent ? nodes.find((node) => node.id === current.parent) : null
    }
    return path
  }

  const descendantsOf = (nodes, id) => {
    const result = new Set()
    const queue = [id]
    while (queue.length) {
      const parentId = queue.shift()
      nodes.filter((node) => node.parent === parentId).forEach((child) => {
        if (!result.has(child.id)) {
          result.add(child.id)
          queue.push(child.id)
        }
      })
    }
    return result
  }

  const rememberReturn = () => {
    const roleSelect = document.getElementById('roleSelect')
    if (roleSelect?.value) sessionStorage.setItem(RETURN_ROLE_KEY, roleSelect.value)
    sessionStorage.setItem(RETURN_VIEW_KEY, 'units')
  }

  const returnAfterReload = () => {
    const role = sessionStorage.getItem(RETURN_ROLE_KEY)
    const view = sessionStorage.getItem(RETURN_VIEW_KEY)
    if (!role || view !== 'units') return
    let attempts = 0
    const loginTimer = window.setInterval(() => {
      attempts += 1
      const roleSelect = document.getElementById('roleSelect')
      const loginButton = document.getElementById('loginBtn')
      if (roleSelect?.options.length && loginButton) {
        window.clearInterval(loginTimer)
        roleSelect.value = role
        roleSelect.dispatchEvent(new Event('change', { bubbles: true }))
        loginButton.click()
        let navAttempts = 0
        const navTimer = window.setInterval(() => {
          navAttempts += 1
          const unitsButton = document.querySelector('#nav [data-view="units"]')
          if (unitsButton) {
            window.clearInterval(navTimer)
            unitsButton.click()
            sessionStorage.removeItem(RETURN_ROLE_KEY)
            sessionStorage.removeItem(RETURN_VIEW_KEY)
          } else if (navAttempts > 80) window.clearInterval(navTimer)
        }, 50)
      } else if (attempts > 80) window.clearInterval(loginTimer)
    }, 50)
  }

  const closeEditor = () => document.querySelector('.demo-unit-editor-backdrop')?.remove()

  const openEditor = (unitId = null) => {
    closeEditor()
    const nodes = loadNodes()
    const definitions = loadTypes()
    const current = unitId ? nodes.find((node) => node.id === unitId) : null
    const currentDefinition = current ? typeForNode(current, definitions) : null
    const draft = current
      ? { ...current, organizationTypeId: currentDefinition.id, baseType: currentDefinition.baseType }
      : { id: `unit-${Date.now()}`, parent: '', type: '', organizationTypeId: '', baseType: '', name: '', subtitle: '', accent: '#99e7ff', shortName: '', location: '', email: '', phone: '', description: '', isActive: true }
    const isRootCompany = Boolean(current && currentDefinition.baseType === 'company' && !current.parent)
    const excludedIds = current ? descendantsOf(nodes, current.id) : new Set()
    const selectableDefinitions = definitions.filter((definition) => definition.active !== false || definition.id === draft.organizationTypeId)

    const backdrop = document.createElement('div')
    backdrop.className = 'demo-unit-editor-backdrop'
    backdrop.innerHTML = `
      <section class="demo-unit-editor" role="dialog" aria-modal="true" aria-labelledby="demo-unit-editor-title">
        <div class="demo-unit-editor-head">
          <div><span>${current ? 'Organisationseinheit bearbeiten' : 'Neue Organisationseinheit'}</span><h2 id="demo-unit-editor-title">${escapeHtml(current?.name || 'Einheit anlegen')}</h2></div>
          <button type="button" class="btn btn-ghost btn-small" data-editor-close>Schließen</button>
        </div>
        <div class="demo-unit-editor-grid">
          <label class="field"><span>Organisationstyp *</span><select data-editor-type ${isRootCompany ? 'disabled' : ''}>
            <option value="">Typ auswählen</option>
            ${(isRootCompany && currentDefinition ? [currentDefinition] : selectableDefinitions).map((definition) => `<option value="${escapeHtml(definition.id)}" ${draft.organizationTypeId === definition.id ? 'selected' : ''}>${escapeHtml(definition.label)} · ${escapeHtml(baseLabels[definition.baseType] || definition.baseType)}</option>`).join('')}
          </select></label>
          <label class="field"><span>Übergeordnete Einheit *</span><select data-editor-parent></select></label>
          <div class="demo-unit-editor-placement demo-unit-editor-wide"><strong>Vorgesehene Platzierung</strong><span data-editor-placement></span></div>
          <label class="field"><span>Name *</span><input data-editor-name value="${escapeHtml(draft.name)}"></label>
          <label class="field"><span>Kurzbezeichnung</span><input data-editor-short value="${escapeHtml(draft.shortName || '')}"></label>
          <label class="field"><span>Standort</span><input data-editor-location value="${escapeHtml(draft.location || '')}"></label>
          <label class="field"><span>Funktionspostfach</span><input type="email" data-editor-email value="${escapeHtml(draft.email || '')}"></label>
          <label class="field"><span>Telefon</span><input data-editor-phone value="${escapeHtml(draft.phone || '')}"></label>
          <label class="field"><span>Status</span><select data-editor-status ${isRootCompany ? 'disabled' : ''}><option value="active" ${draft.isActive === false ? '' : 'selected'}>Aktiv</option><option value="inactive" ${draft.isActive === false ? 'selected' : ''}>Archiviert</option></select></label>
          <label class="field demo-unit-editor-wide"><span>Beschreibung</span><textarea rows="4" data-editor-description>${escapeHtml(draft.description || '')}</textarea></label>
        </div>
        <p class="demo-unit-editor-message" data-editor-message></p>
        <div class="actions"><button type="button" class="btn btn-primary" data-editor-save>${current ? 'Änderungen speichern' : 'Einheit anlegen'}</button><button type="button" class="btn btn-ghost" data-editor-cancel>Abbrechen</button></div>
      </section>`

    document.body.append(backdrop)
    const typeField = backdrop.querySelector('[data-editor-type]')
    const parentField = backdrop.querySelector('[data-editor-parent]')
    const nameField = backdrop.querySelector('[data-editor-name]')
    const placement = backdrop.querySelector('[data-editor-placement]')
    const message = backdrop.querySelector('[data-editor-message]')

    const refreshParents = () => {
      const definition = definitions.find((item) => item.id === typeField.value)
      draft.organizationTypeId = definition?.id || ''
      draft.baseType = definition?.baseType || ''
      const allowed = parentTypes[draft.baseType] || []
      const candidates = nodes
        .filter((node) => node.type !== 'person' && node.id !== draft.id && node.isActive !== false && !excludedIds.has(node.id) && allowed.includes(baseTypeOf(node, definitions)))
        .sort((a, b) => pathFor(nodes, a.id).join(' / ').localeCompare(pathFor(nodes, b.id).join(' / '), 'de'))

      if (!candidates.some((node) => node.id === draft.parent)) draft.parent = ''
      parentField.disabled = !definition || isRootCompany
      parentField.innerHTML = `<option value="">${definition ? 'Platzierung auswählen' : 'Zuerst Typ auswählen'}</option>` + candidates.map((node) => {
        const nodeDefinition = typeForNode(node, definitions)
        return `<option value="${escapeHtml(node.id)}" ${node.id === draft.parent ? 'selected' : ''}>${escapeHtml(pathFor(nodes, node.id).join(' › '))} · ${escapeHtml(nodeDefinition.label)}</option>`
      }).join('')

      if (isRootCompany) placement.textContent = 'Oberste Unternehmenswurzel'
      else if (!definition) placement.textContent = 'Zuerst den Organisationstyp auswählen.'
      else if (!draft.parent) placement.textContent = draft.baseType === 'company'
        ? 'Auswählen, unter welchem Unternehmen das weitere Unternehmen geführt wird.'
        : `Auswählen, unter welcher Einheit „${definition.label}“ geführt wird.`
      else placement.textContent = [...pathFor(nodes, draft.parent), nameField.value.trim() || `Neue Einheit: ${definition.label}`].join(' › ')
    }

    typeField.addEventListener('change', refreshParents)
    parentField.addEventListener('change', () => { draft.parent = parentField.value; refreshParents() })
    nameField.addEventListener('input', refreshParents)
    backdrop.querySelector('[data-editor-close]').addEventListener('click', closeEditor)
    backdrop.querySelector('[data-editor-cancel]').addEventListener('click', closeEditor)
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeEditor() })

    backdrop.querySelector('[data-editor-save]').addEventListener('click', () => {
      const definition = definitions.find((item) => item.id === typeField.value)
      const name = nameField.value.trim()
      const parent = isRootCompany ? null : parentField.value || null
      if (!definition) { message.textContent = 'Bitte den Organisationstyp auswählen.'; return }
      if (!name) { message.textContent = 'Bitte einen Namen eingeben.'; return }
      if (!isRootCompany && !parent) { message.textContent = 'Bitte die übergeordnete Einheit auswählen.'; return }
      if (nodes.some((node) => node.id !== draft.id && node.parent === parent && node.name.trim().toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
        message.textContent = 'Auf dieser Ebene existiert bereits eine Einheit mit diesem Namen.'
        return
      }

      const next = {
        ...draft,
        type: definition.id,
        organizationTypeId: definition.id,
        baseType: definition.baseType,
        parent,
        name,
        subtitle: definition.label,
        accent: definition.color,
        shortName: backdrop.querySelector('[data-editor-short]').value.trim(),
        location: backdrop.querySelector('[data-editor-location]').value.trim(),
        email: backdrop.querySelector('[data-editor-email]').value.trim(),
        phone: backdrop.querySelector('[data-editor-phone]').value.trim(),
        description: backdrop.querySelector('[data-editor-description]').value.trim(),
        isActive: isRootCompany ? true : backdrop.querySelector('[data-editor-status]').value === 'active',
      }
      saveNodes(current ? nodes.map((node) => node.id === current.id ? next : node) : [...nodes, next])
      rememberReturn()
      window.location.reload()
    })

    refreshParents()
    nameField.focus()
  }

  const enhanceUnitsView = () => {
    const addButton = document.getElementById('addUnit')
    if (addButton && addButton.dataset.extendedUnitEditor !== 'true') {
      addButton.dataset.extendedUnitEditor = 'true'
      if (addButton.textContent !== 'Organisationseinheit anlegen') addButton.textContent = 'Organisationseinheit anlegen'
      addButton.onclick = (event) => { event.preventDefault(); event.stopPropagation(); openEditor() }
    }

    const nodes = loadNodes().filter((node) => node.type !== 'person')
    document.querySelectorAll('#content table tbody tr').forEach((row) => {
      if (row.dataset.extendedUnitEditor === 'true') return
      const name = row.querySelector('td')?.textContent?.trim()
      const unit = nodes.find((node) => node.name === name)
      const actionCell = row.querySelector('td:last-child')
      if (!unit || !actionCell) return
      row.dataset.extendedUnitEditor = 'true'
      const editButton = document.createElement('button')
      editButton.type = 'button'
      editButton.className = 'btn btn-ghost btn-small demo-unit-edit-button'
      editButton.textContent = 'Vollständig bearbeiten'
      editButton.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openEditor(unit.id) })
      actionCell.append(editButton)
    })
  }

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => { scheduled = false; enhanceUnitsView() })
  }
  // Zentraler Lebenszyklus statt eines eigenen Beobachters auf document.body.
  if (window.MWUiLifecycle) window.MWUiLifecycle.watch(scheduleEnhance)
  else new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
  scheduleEnhance()
  returnAfterReload()
})()
