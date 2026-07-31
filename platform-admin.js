(() => {
  const TYPE_KEY = 'mw-demo-organization-types'
  const LEGACY_COLOR_KEY = 'mw-demo-organization-type-colors'
  const SETTINGS_KEY = 'mw-demo-system-settings'
  const NODE_KEY = 'mw-demo-nodes'

  const builtInTypes = [
    { id: 'company', label: 'Unternehmen', baseType: 'company', color: '#070042', system: true, active: true, sortOrder: 0 },
    { id: 'management', label: 'Geschäftsführung', baseType: 'management', color: '#fda8ff', system: true, active: true, sortOrder: 1 },
    { id: 'section', label: 'Sektion', baseType: 'section', color: '#ff757b', system: true, active: true, sortOrder: 2 },
    { id: 'department', label: 'Abteilung', baseType: 'department', color: '#99e7ff', system: true, active: true, sortOrder: 3 },
    { id: 'team', label: 'Team', baseType: 'team', color: '#a8ffab', system: true, active: true, sortOrder: 4 },
    { id: 'person', label: 'Person', baseType: 'person', color: '#f3f5f6', system: true, active: true, sortOrder: 5 },
  ]

  const defaultSettings = {
    tenantName: 'Münchner Wohnen',
    applicationName: 'MW OrgChart',
    tagline: 'Interaktives Organigramm · öffentliche Demo',
    logoUrl: '',
    backgroundImageUrl: '',
    backgroundColor: '#f3f5f6',
    primaryColor: '#070042',
    accentColor: '#99e7ff',
    cardShape: 'square',
    surfaceShape: 'soft',
    showColorbar: true,
  }

  const baseLabels = {
    company: 'Unternehmensebene',
    management: 'Geschäftsführungsebene',
    section: 'Sektions- / Bereichsebene',
    department: 'Abteilungs- / Direktionsebene',
    team: 'Team- / Gruppenebene',
    person: 'Person',
  }

  const hexPattern = /^#[0-9a-f]{6}$/i
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
  const slugify = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'organisationstyp'

  const readJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null')
      return value ?? fallback
    } catch {
      return fallback
    }
  }

  const loadNodes = () => {
    const value = readJson(NODE_KEY, [])
    return Array.isArray(value) ? value : []
  }

  const normalizeType = (value, fallback, index) => {
    if (!value || typeof value !== 'object') return { ...fallback }
    const baseType = ['company', 'management', 'section', 'department', 'team', 'person'].includes(value.baseType) ? value.baseType : fallback.baseType
    return {
      id: fallback.id,
      label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : fallback.label,
      baseType,
      color: typeof value.color === 'string' && hexPattern.test(value.color) ? value.color.toLowerCase() : fallback.color,
      system: Boolean(fallback.system),
      active: value.active !== false,
      sortOrder: Number.isFinite(value.sortOrder) ? value.sortOrder : (fallback.sortOrder ?? index),
    }
  }

  const loadTypes = () => {
    const stored = readJson(TYPE_KEY, [])
    const legacyColors = readJson(LEGACY_COLOR_KEY, {})
    const storedList = Array.isArray(stored) ? stored : []
    const storedById = new Map(storedList.filter((value) => value && typeof value.id === 'string').map((value) => [value.id, value]))
    const builtIns = builtInTypes.map((fallback, index) => normalizeType({ ...storedById.get(fallback.id), color: storedById.get(fallback.id)?.color ?? legacyColors[fallback.id] }, fallback, index))
    const builtInIds = new Set(builtIns.map((definition) => definition.id))
    const custom = storedList
      .filter((value) => value && typeof value.id === 'string' && !builtInIds.has(value.id))
      .map((value, index) => {
        const baseType = ['company', 'management', 'section', 'department', 'team'].includes(value.baseType) ? value.baseType : null
        const label = typeof value.label === 'string' ? value.label.trim() : ''
        if (!baseType || !label) return null
        return normalizeType(value, {
          id: slugify(value.id || label),
          label,
          baseType,
          color: builtInTypes.find((definition) => definition.id === baseType)?.color || '#99e7ff',
          system: false,
          active: true,
          sortOrder: 100 + index,
        }, 100 + index)
      })
      .filter(Boolean)
    const unique = new Map()
    ;[...builtIns, ...custom].forEach((definition) => { if (!unique.has(definition.id)) unique.set(definition.id, definition) })
    return [...unique.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'de'))
  }

  const saveTypes = (definitions) => {
    localStorage.setItem(TYPE_KEY, JSON.stringify(definitions))
    localStorage.setItem(LEGACY_COLOR_KEY, JSON.stringify(Object.fromEntries(definitions.filter((definition) => definition.system).map((definition) => [definition.id, definition.color]))))
  }

  const loadSettings = () => {
    const stored = readJson(SETTINGS_KEY, {})
    const text = (key) => typeof stored[key] === 'string' ? stored[key].trim() : defaultSettings[key]
    const color = (key) => hexPattern.test(text(key)) ? text(key).toLowerCase() : defaultSettings[key]
    const shape = (key) => ['square', 'soft', 'rounded'].includes(stored[key]) ? stored[key] : defaultSettings[key]
    return {
      tenantName: text('tenantName') || defaultSettings.tenantName,
      applicationName: text('applicationName') || defaultSettings.applicationName,
      tagline: text('tagline') || defaultSettings.tagline,
      logoUrl: text('logoUrl'),
      backgroundImageUrl: text('backgroundImageUrl'),
      backgroundColor: color('backgroundColor'),
      primaryColor: color('primaryColor'),
      accentColor: color('accentColor'),
      cardShape: shape('cardShape'),
      surfaceShape: shape('surfaceShape'),
      showColorbar: typeof stored.showColorbar === 'boolean' ? stored.showColorbar : defaultSettings.showColorbar,
    }
  }

  const saveSettings = (settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  const radius = (shape) => shape === 'rounded' ? '22px' : shape === 'soft' ? '10px' : '0px'
  const rgb = (hex) => ({ red: parseInt(hex.slice(1, 3), 16), green: parseInt(hex.slice(3, 5), 16), blue: parseInt(hex.slice(5, 7), 16) })
  const textColor = (hex) => { const { red, green, blue } = rgb(hex); return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < .52 ? '#ffffff' : '#070042' }
  const mixDark = (hex, amount) => {
    const source = rgb(hex)
    const target = rgb('#070042')
    const channel = (from, to) => Math.round(from * (1 - amount) + to * amount).toString(16).padStart(2, '0')
    return `#${channel(source.red, target.red)}${channel(source.green, target.green)}${channel(source.blue, target.blue)}`
  }

  let definitions = loadTypes()
  let settings = loadSettings()
  let currentPlatformView = null

  /*
   * Zuvor wurde das Superadministrationsrecht aus dem sichtbaren Text der
   * Kopfzeile abgeleitet (`/superadmin/i`). Eine geänderte Beschriftung hätte
   * dort unbemerkt Rechte entzogen. Maßgeblich ist jetzt – wie in allen übrigen
   * Modulen – die Rollenkennung aus dem gemeinsamen Vokabular (roles.js).
   */
  const isSuperadmin = () => (globalThis.MWRoles
    ? globalThis.MWRoles.isSuperadmin()
    : /superadmin/i.test(document.getElementById('userRole')?.textContent || ''))
  const definitionFor = (typeId) => definitions.find((definition) => definition.id === typeId) || definitions.find((definition) => definition.id === 'person')
  const countFor = (typeId) => loadNodes().filter((node) => (node.organizationTypeId || node.type) === typeId).length

  const applySettings = () => {
    const root = document.documentElement
    root.style.setProperty('--platform-primary', settings.primaryColor)
    root.style.setProperty('--platform-accent', settings.accentColor)
    root.style.setProperty('--platform-background', settings.backgroundColor)
    root.style.setProperty('--platform-card-radius', radius(settings.cardShape))
    root.style.setProperty('--platform-surface-radius', radius(settings.surfaceShape))
    root.style.setProperty('--platform-background-image', settings.backgroundImageUrl ? `url("${settings.backgroundImageUrl.replace(/"/g, '%22')}")` : 'none')

    const updateText = (selector, value) => {
      const element = document.querySelector(selector)
      if (element && element.textContent !== value) element.textContent = value
    }
    updateText('.header .header-eyebrow', settings.tenantName)
    updateText('.header h1', settings.applicationName)
    updateText('.header h1 + p', settings.tagline)
    updateText('.login-inner .eyebrow', `${settings.tenantName} · Demo`)
    updateText('.login-inner h1', settings.applicationName)
    updateText('.login-inner h1 + p', settings.tagline)
    document.title = `${settings.applicationName} – Live-Demo`

    const placeLogo = (containerSelector, className) => {
      const container = document.querySelector(containerSelector)
      if (!container) return
      let image = container.querySelector(`img.${className}`)
      if (!settings.logoUrl) { image?.remove(); return }
      if (!image) {
        image = document.createElement('img')
        image.className = className
        image.alt = `Logo ${settings.tenantName}`
        container.prepend(image)
      }
      if (image.src !== settings.logoUrl) image.src = settings.logoUrl
    }
    placeLogo('.header > div:first-child', 'platform-header-logo')
    placeLogo('.login-inner', 'platform-login-logo')
    document.querySelectorAll('.colorbar').forEach((element) => { element.hidden = !settings.showColorbar })
  }

  const applyTypeColors = () => {
    document.querySelectorAll('.node[data-type], .org-node[data-node-type]').forEach((card) => {
      const typeId = card.dataset.type || card.dataset.organizationType || card.dataset.nodeType
      const definition = definitionFor(typeId)
      if (!definition) return
      const color = definition.color
      card.style.setProperty('background-color', color, 'important')
      card.style.setProperty('color', textColor(color), 'important')
      card.style.setProperty('border-color', mixDark(color, .24), 'important')
      card.style.setProperty('border-radius', radius(settings.cardShape), 'important')
      const accent = card.querySelector('.node-accent, .accent, .org-node__accent, [class*="accent"]')
      accent?.style.setProperty('background-color', mixDark(color, .12), 'important')
    })
  }

  const setActivePlatformButton = (view) => {
    document.querySelectorAll('#nav button').forEach((button) => {
      const active = button.dataset.platformView === view
      button.classList.toggle('active', active)
      button.classList.toggle('is-active', active)
    })
  }

  const typeCardMarkup = (definition) => {
    const count = countFor(definition.id)
    return `
      <article class="platform-type-card${definition.active ? '' : ' is-inactive'}" data-type-id="${escapeHtml(definition.id)}">
        <div class="platform-card-heading"><div><span>${definition.system ? 'Systemtyp' : 'Eigener Typ'}</span><h3>${escapeHtml(definition.label)}</h3></div><b>${count} Karte${count === 1 ? '' : 'n'}</b></div>
        <div class="platform-type-preview" style="background:${definition.color};color:${textColor(definition.color)};border-color:${mixDark(definition.color, .24)}"><i style="background:${mixDark(definition.color, .12)}"></i><small>${escapeHtml(definition.label)}</small><strong>Beispiel ${escapeHtml(definition.label)}</strong><span>${escapeHtml(baseLabels[definition.baseType])}</span></div>
        <label class="field"><span>Bezeichnung</span><input data-type-label value="${escapeHtml(definition.label)}"></label>
        <label class="field"><span>Technische Basisebene</span><input value="${escapeHtml(baseLabels[definition.baseType])}" disabled></label>
        <label class="platform-color-field"><span>Standardfarbe</span><div><input type="color" data-type-color value="${definition.color}"><code>${definition.color.toUpperCase()}</code></div></label>
        ${definition.baseType !== 'person' ? `<label class="platform-toggle"><span>Bei neuen Einheiten auswählbar</span><input type="checkbox" data-type-active ${definition.active ? 'checked' : ''}></label>` : ''}
        <div class="platform-card-actions"><button type="button" class="btn btn-ghost" data-type-reset>Zurücksetzen</button>${definition.system ? '' : `<button type="button" class="btn btn-ghost platform-danger" data-type-delete ${count ? 'disabled' : ''}>Löschen</button>`}</div>
      </article>`
  }

  const renderTypes = () => {
    const content = document.getElementById('content')
    if (!content) return
    currentPlatformView = 'types'
    setActivePlatformButton('types')
    content.innerHTML = `
      <section class="platform-admin" data-platform-page="types">
        <header class="platform-page-heading"><span>Systemkonfiguration</span><h2>Organisationstypen</h2><p>Eigene Bezeichnungen wie Bereich, Direktion, Region oder Niederlassung werden einer stabilen technischen Hierarchieebene zugeordnet.</p></header>
        <section class="platform-create-card">
          <div><span>Neuer Typ</span><h3>Organisationstyp anlegen</h3><p>Die Basisebene bestimmt die zulässige Platzierung im Organigramm.</p></div>
          <div class="platform-create-grid">
            <label class="field"><span>Name *</span><input data-new-type-label placeholder="z. B. Direktion"></label>
            <label class="field"><span>Technische Basisebene</span><select data-new-type-base>${['company', 'management', 'section', 'department', 'team'].map((type) => `<option value="${type}">${baseLabels[type]}</option>`).join('')}</select></label>
            <label class="platform-color-field"><span>Standardfarbe</span><div><input type="color" data-new-type-color value="#99e7ff"><code>#99E7FF</code></div></label>
            <button type="button" class="btn btn-primary" data-create-type>Typ anlegen</button>
          </div>
        </section>
        <div class="platform-type-grid">${definitions.map(typeCardMarkup).join('')}</div>
        <p class="platform-message" data-platform-message>Änderungen bleiben lokal in diesem Browser.</p>
      </section>`

    const message = content.querySelector('[data-platform-message]')
    const showMessage = (text, error = false) => { message.textContent = text; message.classList.toggle('is-error', error) }

    content.querySelector('[data-create-type]').addEventListener('click', () => {
      const label = content.querySelector('[data-new-type-label]').value.trim()
      const baseType = content.querySelector('[data-new-type-base]').value
      const color = content.querySelector('[data-new-type-color]').value.toLowerCase()
      if (!label) { showMessage('Bitte einen Namen für den neuen Organisationstyp eingeben.', true); return }
      const baseId = slugify(label)
      let id = baseId
      let counter = 2
      while (definitions.some((definition) => definition.id === id)) { id = `${baseId}-${counter}`; counter += 1 }
      definitions = [...definitions, { id, label, baseType, color, system: false, active: true, sortOrder: Math.max(...definitions.map((definition) => definition.sortOrder), 0) + 1 }]
      saveTypes(definitions)
      renderTypes()
    })

    content.querySelectorAll('[data-type-id]').forEach((card) => {
      const id = card.dataset.typeId
      const definition = definitions.find((item) => item.id === id)
      if (!definition) return
      card.querySelector('[data-type-label]').addEventListener('change', (event) => {
        const label = event.target.value.trim()
        if (!label) { renderTypes(); return }
        definition.label = label
        saveTypes(definitions)
        renderTypes()
      })
      card.querySelector('[data-type-color]').addEventListener('input', (event) => {
        definition.color = event.target.value.toLowerCase()
        saveTypes(definitions)
        applyTypeColors()
        renderTypes()
      })
      card.querySelector('[data-type-active]')?.addEventListener('change', (event) => {
        definition.active = event.target.checked
        saveTypes(definitions)
        renderTypes()
      })
      card.querySelector('[data-type-reset]').addEventListener('click', () => {
        const fallback = builtInTypes.find((item) => item.id === definition.id) || builtInTypes.find((item) => item.id === definition.baseType)
        definition.color = fallback.color
        if (definition.system) { definition.label = fallback.label; definition.active = true }
        saveTypes(definitions)
        applyTypeColors()
        renderTypes()
      })
      card.querySelector('[data-type-delete]')?.addEventListener('click', () => {
        if (countFor(definition.id)) { showMessage('Dieser Typ wird noch verwendet und kann nicht gelöscht werden.', true); return }
        definitions = definitions.filter((item) => item.id !== definition.id)
        saveTypes(definitions)
        renderTypes()
      })
    })
  }

  const renderSystem = () => {
    const content = document.getElementById('content')
    if (!content) return
    currentPlatformView = 'system'
    setActivePlatformButton('system')
    content.innerHTML = `
      <section class="platform-admin" data-platform-page="system">
        <header class="platform-page-heading"><span>Superadministration</span><h2>System</h2><p>Branding und Formensprache werden zentral für die jeweilige Organisation festgelegt.</p></header>
        <div class="platform-system-layout">
          <form class="platform-system-form">
            <section><span>Mandant</span><h3>Name und Anwendung</h3><div class="platform-form-grid">
              <label class="field"><span>Unternehmen / Organisation</span><input name="tenantName" value="${escapeHtml(settings.tenantName)}" required></label>
              <label class="field"><span>Name der Anwendung</span><input name="applicationName" value="${escapeHtml(settings.applicationName)}" required></label>
              <label class="field platform-wide"><span>Unterzeile</span><input name="tagline" value="${escapeHtml(settings.tagline)}"></label>
            </div></section>
            <section><span>Branding</span><h3>Logo, Hintergrund und Farben</h3><div class="platform-form-grid">
              <label class="field platform-wide"><span>Logo-URL</span><input type="url" name="logoUrl" value="${escapeHtml(settings.logoUrl)}" placeholder="https://…/logo.svg"></label>
              <label class="field platform-wide"><span>Hintergrundbild-URL</span><input type="url" name="backgroundImageUrl" value="${escapeHtml(settings.backgroundImageUrl)}" placeholder="https://…/hintergrund.jpg"></label>
              ${['backgroundColor', 'primaryColor', 'accentColor'].map((key) => `<label class="platform-color-field"><span>${key === 'backgroundColor' ? 'Hintergrundfarbe' : key === 'primaryColor' ? 'Primärfarbe' : 'Akzentfarbe'}</span><div><input type="color" name="${key}" value="${settings[key]}"><code>${settings[key].toUpperCase()}</code></div></label>`).join('')}
              <label class="platform-toggle"><span>Mehrfarbige Markenleiste anzeigen</span><input type="checkbox" name="showColorbar" ${settings.showColorbar ? 'checked' : ''}></label>
            </div></section>
            <section><span>Formensprache</span><h3>Karten und Oberflächen</h3><div class="platform-form-grid">
              <label class="field"><span>Organigramm-Karten</span><select name="cardShape">${[['square','Eckig'],['soft','Leicht gerundet'],['rounded','Stark gerundet']].map(([value,label]) => `<option value="${value}" ${settings.cardShape === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
              <label class="field"><span>Flächen und Dialoge</span><select name="surfaceShape">${[['square','Eckig'],['soft','Leicht gerundet'],['rounded','Stark gerundet']].map(([value,label]) => `<option value="${value}" ${settings.surfaceShape === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
            </div></section>
            <p class="platform-message" data-platform-message>Änderungen bleiben lokal in diesem Browser.</p>
            <div class="platform-system-actions"><button type="submit" class="btn btn-primary">Systemeinstellungen speichern</button><button type="button" class="btn btn-ghost" data-reset-settings>MW-Ausgangskonfiguration</button></div>
          </form>
          <aside class="platform-system-preview"><span>Live-Vorschau</span><div data-system-preview></div><p><strong>Produktbasis</strong><br>In einer späteren Mehrmandanten-Version erhält jede Organisation eine eigene Konfiguration.</p></aside>
        </div>
      </section>`

    const form = content.querySelector('.platform-system-form')
    const preview = content.querySelector('[data-system-preview]')
    const values = () => Object.fromEntries(new FormData(form).entries())
    const currentDraft = () => {
      const value = values()
      return { ...settings, ...value, showColorbar: form.elements.showColorbar.checked }
    }
    const updatePreview = () => {
      const draft = currentDraft()
      preview.style.backgroundColor = draft.backgroundColor
      preview.style.backgroundImage = draft.backgroundImageUrl ? `linear-gradient(rgba(255,255,255,.84),rgba(255,255,255,.84)),url("${draft.backgroundImageUrl.replace(/"/g, '%22')}")` : 'none'
      preview.innerHTML = `<header style="border-left-color:${draft.primaryColor};border-radius:${radius(draft.surfaceShape)}">${draft.logoUrl ? `<img src="${escapeHtml(draft.logoUrl)}" alt="Logo-Vorschau">` : ''}<div><small>${escapeHtml(draft.tenantName)}</small><strong>${escapeHtml(draft.applicationName)}</strong><span>${escapeHtml(draft.tagline)}</span></div></header><article style="border-color:${draft.primaryColor};border-radius:${radius(draft.cardShape)}"><i style="background:${draft.accentColor}"></i><small>Organisationseinheit</small><strong>Beispielbereich</strong><span>Vorschau der Formensprache</span></article>`
    }
    form.addEventListener('input', updatePreview)
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      settings = currentDraft()
      saveSettings(settings)
      applySettings()
      applyTypeColors()
      renderSystem()
    })
    content.querySelector('[data-reset-settings]').addEventListener('click', () => {
      settings = { ...defaultSettings }
      saveSettings(settings)
      applySettings()
      applyTypeColors()
      renderSystem()
    })
    updatePreview()
  }

  const ensureNavigation = () => {
    const nav = document.getElementById('nav')
    if (!nav) return
    const superadmin = isSuperadmin()
    const legacyStyleButton = Array.from(nav.querySelectorAll('button')).find((button) => button.dataset.view === 'styles' || /kartenstile|darstellung|organisationstypen/i.test(button.textContent || ''))
    if (legacyStyleButton) {
      if (!superadmin) {
        legacyStyleButton.hidden = true
      } else {
        legacyStyleButton.hidden = false
        legacyStyleButton.dataset.platformView = 'types'
        if ((legacyStyleButton.textContent || '').trim() !== 'Organisationstypen') legacyStyleButton.textContent = 'Organisationstypen'
        if (legacyStyleButton.dataset.platformBound !== 'true') {
          legacyStyleButton.dataset.platformBound = 'true'
          legacyStyleButton.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); renderTypes() }, true)
        }
      }
    }

    let systemButton = nav.querySelector('[data-platform-view="system"]')
    if (!superadmin) { systemButton?.remove(); return }
    if (!systemButton) {
      systemButton = document.createElement('button')
      systemButton.type = 'button'
      systemButton.dataset.platformView = 'system'
      systemButton.textContent = 'System'
      systemButton.addEventListener('click', renderSystem)
      nav.append(systemButton)
    }

    if (nav.dataset.platformBaseBound !== 'true') {
      nav.dataset.platformBaseBound = 'true'
      nav.addEventListener('click', (event) => {
        const button = event.target.closest('button')
        if (!button || button.dataset.platformView) return
        currentPlatformView = null
        nav.querySelectorAll('[data-platform-view]').forEach((item) => { item.classList.remove('active', 'is-active') })
      })
    }
  }

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    localStorage.removeItem(TYPE_KEY)
    localStorage.removeItem(LEGACY_COLOR_KEY)
    localStorage.removeItem(SETTINGS_KEY)
    definitions = loadTypes()
    settings = loadSettings()
  }, true)

  let scheduled = false
  const scheduleEnhance = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      ensureNavigation()
      applySettings()
      applyTypeColors()
      if (currentPlatformView === 'types' && !document.querySelector('[data-platform-page="types"]')) renderTypes()
      if (currentPlatformView === 'system' && !document.querySelector('[data-platform-page="system"]')) renderSystem()
    })
  }

  // Zentraler Lebenszyklus statt eines eigenen Beobachters auf document.body.
  if (window.MWUiLifecycle) window.MWUiLifecycle.watch(scheduleEnhance)
  else new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true })
  window.MWOrgPlatform = { loadTypes: () => loadTypes(), loadSettings: () => loadSettings(), baseLabels }
  scheduleEnhance()
})()
