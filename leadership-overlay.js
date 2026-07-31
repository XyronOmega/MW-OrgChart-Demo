(() => {
  const assignments = {
    prv: [
      { personId: 'p1', personName: 'Lea Beispiel', label: 'Kommissarische Leitung' },
    ],
    pm: [
      { personId: 'p1', personName: 'Lea Beispiel', label: 'Leitung' },
      { personId: 'p2', personName: 'Noah Muster', label: 'Stellvertretung' },
    ],
    pa: [
      { personId: 'p4', personName: 'Elias Test', label: 'Leitung' },
      { personId: 'p5', personName: 'Lina Probe', label: 'Stellvertretung' },
    ],
    pe: [
      { personId: 'p6', personName: 'Finn Beispiel', label: 'Leitung' },
      { personId: 'p7', personName: 'Emma Muster', label: 'Stellvertretung' },
    ],
    pc: [
      { personId: 'p9', personName: 'Sofia Test', label: 'Leitung' },
      { personId: 'p8', personName: 'Luis Demo', label: 'Stellvertretung' },
    ],
    'pm-hrbp': [{ personId: 'p2', personName: 'Noah Muster', label: 'Teamleitung' }],
    'pm-sb': [{ personId: 'p3', personName: 'Mila Demo', label: 'Teamleitung' }],
    'pa-pay': [{ personId: 'p4', personName: 'Elias Test', label: 'Teamleitung' }],
    'pa-time': [{ personId: 'p5', personName: 'Lina Probe', label: 'Teamleitung' }],
    'pe-learning': [{ personId: 'p6', personName: 'Finn Beispiel', label: 'Teamleitung' }],
    'pe-onboarding': [{ personId: 'p7', personName: 'Emma Muster', label: 'Teamleitung' }],
    'pc-bgsm': [{ personId: 'p8', personName: 'Luis Demo', label: 'Teamleitung' }],
    'pc-control': [{ personId: 'p9', personName: 'Sofia Test', label: 'Teamleitung' }],
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])

  const injectLeadership = () => {
    document.querySelectorAll('.node[data-id]').forEach((card) => {
      if (card.dataset.type === 'person') return
      const body = card.querySelector('.node-body')
      if (!body || body.querySelector('.demo-unit-leadership')) return
      const unitAssignments = assignments[card.dataset.id] || []
      const summary = document.createElement('div')
      summary.className = `demo-unit-leadership${unitAssignments.length ? '' : ' demo-unit-leadership--empty'}`
      summary.setAttribute('aria-label', 'Leitung der Organisationseinheit')
      summary.innerHTML = unitAssignments.length
        ? unitAssignments.map((entry) => `<div class="demo-unit-leader-row"><span class="demo-unit-leader-label">${escapeHtml(entry.label)}</span><span class="demo-unit-leader-name" role="button" tabindex="0" data-demo-leader-person="${escapeHtml(entry.personId)}" aria-label="Profil von ${escapeHtml(entry.personName)} öffnen">${escapeHtml(entry.personName)}</span></div>`).join('')
        : '<span class="demo-unit-leader-label">Leitung</span><span class="demo-unit-leadership-empty">Nicht hinterlegt</span>'
      body.append(summary)
    })
  }

  const openPerson = (personId) => {
    const personCard = Array.from(document.querySelectorAll('.node[data-id]')).find((card) => card.dataset.id === personId)
    personCard?.click()
  }

  document.addEventListener('click', (event) => {
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

  new MutationObserver(injectLeadership).observe(document.body, { childList: true, subtree: true })
  injectLeadership()
})()
