(() => {
  const STORAGE_KEY = 'mw-demo-nodes'
  const RETURN_ROLE_KEY = 'mw-demo-editor-role'
  const RETURN_VIEW_KEY = 'mw-demo-editor-view'

  const labels = {
    company: 'Unternehmen',
    management: 'Geschäftsführung',
    section: 'Sektion',
    department: 'Abteilung',
    team: 'Team',
  }

  const parentTypes = {
    company: ['company'],
    management: ['company'],
    section: ['company', 'management'],
    department: ['company', 'management', 'section'],
    team: ['company', 'management', 'section', 'department'],
  }

  const fallbackNodes = [
    { id: 'mw', parent: null, type: 'company', name: 'Münchner Wohnen', subtitle: 'Unternehmen', accent: '#070042' },
    { id: 'prv', parent: 'mw', type: 'section', name: 'Personal, Recht und Verwaltung', subtitle: 'Sektion', accent: '#070042' },
    { id: 'pm', parent: 'prv', type: 'department', name: 'Personalmanagement', subtitle: 'Abteilung', accent: '#99e7ff' },
    { id: 'pa', parent: 'prv', type: 'department', name: 'Personaladministration', subtitle: 'Abteilung', accent: '#fda8ff' },
    { id: 'pe', parent: 'prv', type: 'department', name: 'Personalentwicklung', subtitle: 'Abteilung', accent: '#a8ffab' },
    { id: 'pc', parent: 'prv', type: 'department', name: 'Personalcontrolling', subtitle: 'Abteilung', accent: '#ff757b' },
    { id: 'pm-hrbp', parent: 'pm', type: 'team', name: 'HR Business Partner', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pm-sb', parent: 'pm', type: 'team', name: 'Sachbearbeitung', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pa-pay', parent: 'pa', type: 'team', name: 'Entgeltabrechnung', subtitle: 'Team', accent: '#fda8ff' },
    { id: 'pa-time', parent: 'pa', type: 'team', name: 'Zeitwirtschaft', subtitle: 'Team', accent: '#fda8ff' },
    { id: 'pe-learning', parent: 'pe', type: 'team', name: 'Ausbildung & Weiterbildung', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pe-onboarding', parent: 'pe', type: 'team', name: 'Onboarding', subtitle: 'Team', accent: '#a8ffab' },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', name: 'BGSM', subtitle: 'Team', accent: '#99e7ff' },
    { id: 'pc-control', parent: 'pc', type: 'team', name: 'HR-Controlling', subtitle: 'Team', accent: '#ff757b' },
  ]

  const clone = (value) => JSON.parse(JSON.stringify(value))
  const loadNodes = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      return Array.isArray(stored) ? stored : clone(fallbackNodes)
    } catch {
      return clone(fallbackNodes)
    }
  }

  const saveNodes = (nodes) => localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))

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

  const accentFor = (type) => ({
    company: '#070042',
    management: '#99e7ff',
    section: '#070042',
    department: '#99e7ff',
    team: '#a8ffab',
  })[type] || '#99e7ff'

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
          } else if (navAttempts > 80) {
            window.clearInterval(navTimer)
          }
        }, 50)
      } else if (attempts > 80) {
        window.clearInterval(loginTimer)
      }
    }, 50)
  }

  const closeEditor = () => document.querySelector('.demo-unit-editor-backdrop')?.remove()

  const openEditor = (unitId = null) => {
    closeEditor()
    const nodes = loadNodes()
    const current = unitId ? nodes.find((node) => node.id === unitId) : null
    const draft = current
      ? { ...current }
      : { id: `unit-${Date.now()}`, parent: '', type: '', name: '', subtitle: '', accent: '#99e7ff', shortName: '', location: '', email: '', phone: '', description: '', isActive: true }
    const isRootCompany = Boolean(current && current.type === 'company' && !current.parent)
    const excludedIds = current ? descendantsOf(nodes, current.id) : new Set()

    const backdrop = document.createElement('div')
    backdrop.className = 'demo-unit-editor-backdrop'
    backdrop.innerHTML = `
      <section class="demo-unit-editor" role="dialog" aria-modal="true" aria-labelledby="demo-unit-editor-title">
        <div class="demo-unit-editor-head">
          <div><span>${current ? 'Organisationseinheit bearbeiten' : 'Neue Organisationseinheit'}</span><h2 id="demo-unit-editor-title">${current?.name || 'Einheit anlegen'}</h2></div>
          <button type="button" class="btn btn-ghost btn-small" data-editor-close>Schließen</button>
        </div>
        <div class="demo-unit-editor-grid">
          <label class="field"><span>Typ *</span><select data-editor-type ${isRootCompany ? 'disabled' : ''}>
            <option value="">Typ auswählen</option>
            ${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${draft.type === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select></label>
          <label class="field"><span>Übergeordnete Einheit *</span><select data-editor-parent></select></label>
          <div class="demo-unit-editor-placement demo-unit-editor-wide"><strong>Vorgesehene Platzierung</strong><span data-editor-placement></span></div>
          <label class="field"><span>Name *</span><input data-editor-name value="${String(draft.name || '').replace(/"/g, '&quot;')}"></label>
          <label class="field"><span>Kurzbezeichnung</span><input data-editor-short value="${String(draft.shortName || '').replace(/"/g, '&quot;')}"></label>
          <label class="field"><span>Standort</span><input data-editor-location value="${String(draft.location || '').replace(/"/g, '&quot;')}"></label>
          <label class="field"><span>Funktionspostfach</span><input type="email" data-editor-email value="${String(draft.email || '').replace(/"/g, '&quot;')}"></label>
          <label class="field"><span>Telefon</span><input data-editor-phone value="${String(draft.phone || '').replace(/"/g, '&quot;')}"></label>
          <label class="field"><span>Status</span><select data-editor-status ${isRootCompany ? 'disabled' : ''}><option value="active" ${draft.isActive === false ? '' : 'selected'}>Aktiv</option><option value="inactive" ${draft.isActive === false ? 'selected' : ''}>Archiviert</option></select></label>
          <label class="field demo-unit-editor-wide"><span>Beschreibung</span><textarea rows="4" data-editor-description>${draft.description || ''}</textarea></label>
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
      draft.type = typeField.value
      const allowed = parentTypes[draft.type] || []
      const candidates = nodes
        .filter((node) => node.type !== 'person' && node.id !== draft.id && node.isActive !== false && !excludedIds.has(node.id) && allowed.includes(node.type))
        .sort((a, b) => pathFor(nodes, a.id).join(' / ').localeCompare(pathFor(nodes, b.id).join(' / '), 'de'))

      if (!candidates.some((node) => node.id === draft.parent)) draft.parent = ''
      parentField.disabled = !draft.type || isRootCompany
      parentField.innerHTML = `<option value="">${draft.type ? 'Platzierung auswählen' : 'Zuerst Typ auswählen'}</option>` + candidates.map((node) => `<option value="${node.id}" ${node.id === draft.parent ? 'selected' : ''}>${pathFor(nodes, node.id).join(' › ')} · ${labels[node.type] || node.subtitle || node.type}</option>`).join('')

      if (isRootCompany) {
        placement.textContent = 'Oberste Unternehmenswurzel'
      } else if (!draft.type) {
        placement.textContent = 'Zuerst den Typ auswählen.'
      } else if (!draft.parent) {
        placement.textContent = draft.type === 'company'
          ? 'Auswählen, unter welchem Unternehmen das weitere Unternehmen geführt wird.'
          : `Auswählen, unter welcher Einheit die ${labels[draft.type]} geführt wird.`
      } else {
        placement.textContent = [...pathFor(nodes, draft.parent), nameField.value.trim() || `Neue ${labels[draft.type]}`].join(' › ')
      }
    }

    typeField.addEventListener('change', refreshParents)
    parentField.addEventListener('change', () => { draft.parent = parentField.value; refreshParents() })
    nameField.addEventListener('input', refreshParents)
    backdrop.querySelector('[data-editor-close]').addEventListener('click', closeEditor)
    backdrop.querySelector('[data-editor-cancel]').addEventListener('click', closeEditor)
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeEditor() })

    backdrop.querySelector('[data-editor-save]').addEventListener('click', () => {
      const type = typeField.value
      const name = nameField.value.trim()
      const parent = isRootCompany ? null : parentField.value || null
      if (!type) { message.textContent = 'Bitte den Typ auswählen.'; return }
      if (!name) { message.textContent = 'Bitte einen Namen eingeben.'; return }
      if (!isRootCompany && !parent) { message.textContent = 'Bitte die übergeordnete Einheit auswählen.'; return }
      if (nodes.some((node) => node.id !== draft.id && node.parent === parent && node.name.trim().toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
        message.textContent = 'Auf dieser Ebene existiert bereits eine Einheit mit diesem Namen.'
        return
      }

      const next = {
        ...draft,
        type,
        parent,
        name,
        subtitle: labels[type],
        accent: draft.accent || accentFor(type),
        shortName: backdrop.querySelector('[data-editor-short]').value.trim(),
        location: backdrop.querySelector('[data-editor-location]').value.trim(),
        email: backdrop.querySelector('[data-editor-email]').value.trim(),
        phone: backdrop.querySelector('[data-editor-phone]').value.trim(),
        description: backdrop.querySelector('[data-editor-description]').value.trim(),
        isActive: isRootCompany ? true : backdrop.querySelector('[data-editor-status]').value === 'active',
      }

      const nextNodes = current
        ? nodes.map((node) => node.id === current.id ? next : node)
        : [...nodes, next]
      saveNodes(nextNodes)
      rememberReturn()
      window.location.reload()
    })

    refreshParents()
    nameField.focus()
  }

  const enhanceUnitsView = () => {
    const addButton = document.getElementById('addUnit')
    if (!addButton || addButton.dataset.extendedUnitEditor === 'true') return
    addButton.dataset.extendedUnitEditor = 'true'
    addButton.textContent = 'Organisationseinheit anlegen'
    addButton.onclick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      openEditor()
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
      editButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        openEditor(unit.id)
      })
      actionCell.append(editButton)
    })
  }

  new MutationObserver(enhanceUnitsView).observe(document.body, { childList: true, subtree: true })
  enhanceUnitsView()
  returnAfterReload()
})()
