(() => {
  const STORAGE_KEY = 'mw-demo-organization-type-colors'
  const defaults = {
    company: '#070042',
    management: '#fda8ff',
    section: '#ff757b',
    department: '#99e7ff',
    team: '#a8ffab',
    person: '#f3f5f6',
  }
  const labels = {
    company: 'Unternehmen',
    management: 'Geschäftsführung',
    section: 'Sektion',
    department: 'Abteilung',
    team: 'Team',
    person: 'Person',
  }
  const order = ['company', 'management', 'section', 'department', 'team', 'person']
  const hexPattern = /^#[0-9a-f]{6}$/i

  const load = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return Object.fromEntries(order.map((type) => [type, typeof stored[type] === 'string' && hexPattern.test(stored[type]) ? stored[type].toLowerCase() : defaults[type]]))
    } catch {
      return { ...defaults }
    }
  }
  const save = (colors) => localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  const rgb = (hex) => ({
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  })
  const textColor = (hex) => {
    const { red, green, blue } = rgb(hex)
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < 0.52 ? '#ffffff' : '#070042'
  }
  const mixDark = (hex, amount) => {
    const source = rgb(hex)
    const target = rgb('#070042')
    const channel = (from, to) => Math.round(from * (1 - amount) + to * amount).toString(16).padStart(2, '0')
    return `#${channel(source.red, target.red)}${channel(source.green, target.green)}${channel(source.blue, target.blue)}`
  }

  let colors = load()

  const applyColors = () => {
    document.querySelectorAll('.node[data-type]').forEach((card) => {
      const type = card.dataset.type
      const color = colors[type]
      if (!color) return
      card.style.setProperty('background-color', color, 'important')
      card.style.setProperty('color', textColor(color), 'important')
      card.style.setProperty('border-color', mixDark(color, 0.24), 'important')
      const accent = card.querySelector('.node-accent, .accent, [class*="accent"]')
      accent?.style.setProperty('background-color', mixDark(color, 0.12), 'important')
    })
  }

  const counts = () => Object.fromEntries(order.map((type) => [type, document.querySelectorAll(`.node[data-type="${type}"]`).length]))

  const previewMarkup = (type, color, count) => `
    <article class="demo-type-color-card">
      <div class="demo-type-color-card-head">
        <div><span class="eyebrow">Organisationstyp</span><h3>${labels[type]}</h3></div>
        <span class="demo-type-color-count">${count} Karte${count === 1 ? '' : 'n'}</span>
      </div>
      <div class="demo-type-color-preview" style="background:${color};color:${textColor(color)};border-color:${mixDark(color, 0.24)}">
        <i style="background:${mixDark(color, 0.12)}"></i>
        <div><small>${labels[type]}</small><strong>${type === 'person' ? 'Beispielperson' : `Beispiel ${labels[type]}`}</strong><span>${type === 'person' ? 'Aufgabe / Stellenbezeichnung' : 'Organisationskachel'}</span></div>
      </div>
      <label class="demo-type-color-picker"><span>Farbe für ${labels[type]}</span><div><input type="color" value="${color}" data-type-color="${type}"><code>${color.toUpperCase()}</code></div></label>
      <button type="button" class="btn btn-ghost" data-type-reset="${type}">Typ zurücksetzen</button>
    </article>`

  const renderAdmin = () => {
    const content = document.getElementById('content')
    if (!content) return
    const typeCounts = counts()
    content.innerHTML = `
      <section class="demo-type-color-admin" data-type-color-admin>
        <header class="demo-type-color-heading"><span class="eyebrow">Organigramm-Design</span><h2>Organisationstypen</h2><p>Jeder Typ besitzt eine zentrale Farbe. Änderungen gelten sofort für alle bestehenden und neu angelegten Karten dieses Typs.</p></header>
        <div class="demo-type-color-grid">${order.map((type) => previewMarkup(type, colors[type], typeCounts[type])).join('')}</div>
        <p class="demo-type-color-message" data-type-color-message>Änderungen werden nur in diesem Browser gespeichert.</p>
        <div class="demo-type-color-actions"><button type="button" class="btn btn-ghost" data-reset-all-type-colors>Alle MW-Farben wiederherstellen</button></div>
      </section>`

    content.querySelectorAll('[data-type-color]').forEach((input) => input.addEventListener('input', () => {
      const type = input.dataset.typeColor
      const value = input.value.toLowerCase()
      colors = { ...colors, [type]: value }
      save(colors)
      renderAdmin()
      applyColors()
      const message = document.querySelector('[data-type-color-message]')
      if (message) message.textContent = `${labels[type]} wurde auf ${value.toUpperCase()} geändert.`
    }))
    content.querySelectorAll('[data-type-reset]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.typeReset
      colors = { ...colors, [type]: defaults[type] }
      save(colors)
      renderAdmin()
      applyColors()
    }))
    content.querySelector('[data-reset-all-type-colors]')?.addEventListener('click', () => {
      colors = { ...defaults }
      save(colors)
      renderAdmin()
      applyColors()
    })
  }

  const isTypeColorButton = (button) => /kartenstile|darstellung|organisationstypen/i.test(button.textContent || '')
  const enhanceNavigation = () => {
    document.querySelectorAll('#nav button').forEach((button) => {
      if (!isTypeColorButton(button) || button.dataset.typeColorNavigation === 'true') return
      button.dataset.typeColorNavigation = 'true'
      if ((button.textContent || '').trim() !== 'Organisationstypen') button.textContent = 'Organisationstypen'
      button.addEventListener('click', () => window.setTimeout(renderAdmin, 40), true)
    })
  }

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY)
    colors = { ...defaults }
  }, true)

  let observerScheduled = false
  const observer = new MutationObserver(() => {
    if (observerScheduled) return
    observerScheduled = true
    window.requestAnimationFrame(() => {
      observerScheduled = false
      enhanceNavigation()
      applyColors()
      const activeTypeButton = Array.from(document.querySelectorAll('#nav button')).find((button) => isTypeColorButton(button) && (button.classList.contains('active') || button.classList.contains('is-active') || button.getAttribute('aria-current') === 'page'))
      if (activeTypeButton && !document.querySelector('[data-type-color-admin]')) window.setTimeout(renderAdmin, 20)
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })

  enhanceNavigation()
  applyColors()
})()