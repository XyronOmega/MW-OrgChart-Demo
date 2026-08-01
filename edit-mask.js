/**
 * Gemeinsame Bearbeitungsmaske im Hauptinhaltsbereich.
 *
 * Verbindliche UX-Vorgabe: Erfassung und Bearbeitung finden ausschließlich in
 * festen Masken innerhalb von `#content` statt. Modale Fenster, schwebende
 * Formulare, Bearbeitungs-Drawer sowie `window.alert`, `window.prompt` und
 * `window.confirm` sind dafür nicht mehr zulässig.
 *
 * Dieses Modul stellt den Rahmen bereit, den alle künftigen Masken verwenden:
 *
 *   1. eindeutiger Seitentitel
 *   2. Brotkrumennavigation und Zurück-Schaltfläche
 *   3. ausgewiesener Bearbeitungs- beziehungsweise Lesemodus
 *   4. logisch gruppierte Formularbereiche (fieldset/legend)
 *   5. sichtbar gekennzeichnete Pflichtfelder
 *   6. Prüfung während der Eingabe
 *   7. Fehlermeldungen unmittelbar am betroffenen Feld
 *   8. Aktionsleiste mit Abbrechen und Speichern
 *   9. Schutz vor versehentlichem Verlassen bei ungespeicherten Änderungen
 *  10. Fokus auf die Überschrift beziehungsweise das erste fehlerhafte Feld
 *  11. vollständige Tastaturbedienung
 *  12. einspaltige Darstellung auf schmalen Geräten (siehe edit-mask.css)
 *  13. Wiederherstellung des Ausgangszustands nach Abbruch
 *  14. kein Speichern bei ungültigen Angaben
 *  15. Schreibzugriffe erfolgen ausschließlich über `onSave` des aufrufenden
 *      Moduls – die Maske schreibt selbst nichts und umgeht damit weder
 *      Rechteprüfung noch Freigabeprozess.
 *
 * Bestätigungen für kritische Aktionen werden als sichtbarer Bereich innerhalb
 * der Maske dargestellt, nicht als Systemdialog.
 *
 * Öffentliche Schnittstelle: `window.MWEditMask`
 *   open(config)   Maske anzeigen
 *   close()        Maske schließen (ohne Prüfung – für den Aufrufer nach save)
 *   requestLeave(fn) Verlassen anfordern; bei Änderungen erscheint die Rückfrage
 *   isOpen()       Ist gerade eine Maske aktiv?
 *   isDirty()      Gibt es ungespeicherte Änderungen?
 *   values()       Aktuelle Feldwerte
 *   Reine Hilfsfunktionen für Tests: validateValues, isChanged, fieldId
 */
(() => {
  const REQUIRED_MESSAGE = 'Dieses Feld ist ein Pflichtfeld.'

  // --- Reine Funktionen (ohne DOM, damit sie testbar bleiben) --------------

  const normalizeValue = (field, raw) => {
    if (field.type === 'checkbox') return Boolean(raw)
    return raw === undefined || raw === null ? '' : String(raw)
  }

  const allFields = (sections = []) => sections.flatMap((section) => section.fields || [])

  const fieldId = (maskId, name) => `mw-mask-${maskId}-${name}`

  /**
   * Prüft Pflichtfelder und ruft anschließend die fachliche Prüfung des
   * aufrufenden Moduls auf. Ergebnis ist eine Zuordnung Feldname → Meldung.
   */
  const validateValues = (sections, values, validate) => {
    const errors = {}
    allFields(sections).forEach((field) => {
      if (!field.required) return
      const value = values[field.name]
      const empty = field.type === 'checkbox' ? value !== true : String(value ?? '').trim() === ''
      if (empty) errors[field.name] = field.requiredMessage || REQUIRED_MESSAGE
    })
    if (typeof validate === 'function') {
      const extra = validate(values, errors) || {}
      Object.keys(extra).forEach((name) => {
        if (extra[name]) errors[name] = extra[name]
      })
    }
    return errors
  }

  /** Gibt es Abweichungen gegenüber dem Ausgangszustand? */
  const isChanged = (initial, current) => JSON.stringify(initial ?? null) !== JSON.stringify(current ?? null)

  const pureApi = { validateValues, isChanged, fieldId, normalizeValue, allFields, REQUIRED_MESSAGE }
  if (typeof globalThis !== 'undefined') globalThis.MWEditMaskCore = pureApi
  if (typeof document === 'undefined') {
    if (typeof globalThis !== 'undefined') globalThis.MWEditMask = { ...pureApi, isOpen: () => false, isDirty: () => false }
    return
  }

  // --- Zustand -------------------------------------------------------------

  let active = null // { config, initial, values, errors, showAllErrors, pendingLeave, danger }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

  const content = () => document.getElementById('content')

  const currentValues = () => (active ? { ...active.values } : {})

  const isDirty = () => Boolean(active) && isChanged(active.initial, active.values)

  // --- Aufbau --------------------------------------------------------------

  const fieldMarkup = (config, field) => {
    const id = fieldId(config.id, field.name)
    const value = active.values[field.name]
    const error = active.errors[field.name]
    const describedBy = [error ? `${id}-error` : null, field.hint ? `${id}-hint` : null].filter(Boolean).join(' ')
    const shared = `id="${id}" name="${escapeHtml(field.name)}" data-mw-mask-field="${escapeHtml(field.name)}"`
      + `${field.required ? ' required aria-required="true"' : ''}`
      + `${error ? ' aria-invalid="true"' : ''}`
      + `${describedBy ? ` aria-describedby="${describedBy}"` : ''}`
      + `${field.autocomplete ? ` autocomplete="${escapeHtml(field.autocomplete)}"` : ' autocomplete="off"'}`
      + `${field.maxLength ? ` maxlength="${Number(field.maxLength)}"` : ''}`

    let control
    if (config.readOnly) {
      const shown = field.type === 'checkbox'
        ? (value ? 'Ja' : 'Nein')
        : (field.type === 'select'
          ? (field.options || []).find((option) => String(option.value) === String(value))?.label ?? String(value ?? '')
          : String(value ?? ''))
      control = `<p class="mw-mask-readonly-value" data-mw-mask-readonly="${escapeHtml(field.name)}">${escapeHtml(shown) || '—'}</p>`
    } else if (field.type === 'textarea') {
      control = `<textarea ${shared} rows="${Number(field.rows || 4)}"${field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : ''}>${escapeHtml(value)}</textarea>`
    } else if (field.type === 'select') {
      control = `<select ${shared}>${(field.options || []).map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`
    } else if (field.type === 'checkbox') {
      control = `<input type="checkbox" ${shared} ${value ? 'checked' : ''}>`
    } else {
      control = `<input type="${escapeHtml(field.type || 'text')}" ${shared} value="${escapeHtml(value)}"${field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : ''}>`
    }

    const label = `<span class="mw-mask-label">${escapeHtml(field.label)}${field.required ? ' <b aria-hidden="true">*</b>' : ''}</span>`
    const hint = field.hint ? `<small class="mw-mask-hint" id="${id}-hint">${escapeHtml(field.hint)}</small>` : ''
    // Die Fehlermeldung steht unmittelbar beim Feld und wird über
    // aria-describedby mit ihm verknüpft.
    const errorMarkup = `<p class="mw-mask-error" id="${id}-error" data-mw-mask-error="${escapeHtml(field.name)}" ${error ? '' : 'hidden'}>${escapeHtml(error || '')}</p>`

    if (field.type === 'checkbox' && !config.readOnly) {
      return `<div class="mw-mask-field mw-mask-field--checkbox${error ? ' is-invalid' : ''}"><label for="${id}">${control}${label}</label>${hint}${errorMarkup}</div>`
    }
    return `<div class="mw-mask-field${field.wide ? ' mw-mask-field--wide' : ''}${error ? ' is-invalid' : ''}"><label for="${id}">${label}</label>${control}${hint}${errorMarkup}</div>`
  }

  const sectionMarkup = (config, section, index) => `
    <fieldset class="mw-mask-section" data-mw-mask-section="${index}">
      <legend>${escapeHtml(section.title)}</legend>
      ${section.description ? `<p class="mw-mask-section-description">${escapeHtml(section.description)}</p>` : ''}
      <div class="mw-mask-grid">${(section.fields || []).map((field) => fieldMarkup(config, field)).join('')}</div>
    </fieldset>`

  const breadcrumbMarkup = (config) => {
    const trail = config.breadcrumb || []
    if (!trail.length) return ''
    return `<nav class="mw-mask-breadcrumb" aria-label="Brotkrumennavigation"><ol>${trail.map((step, index) => {
      const last = index === trail.length - 1
      if (last) return `<li><span aria-current="page">${escapeHtml(step.label)}</span></li>`
      return `<li><button type="button" class="mw-mask-breadcrumb-step" data-mw-mask-breadcrumb="${index}">${escapeHtml(step.label)}</button></li>`
    }).join('')}</ol></nav>`
  }

  const errorSummaryMarkup = () => {
    const names = Object.keys(active.errors)
    if (!active.showAllErrors || !names.length) return ''
    const fields = allFields(active.config.sections)
    return `<div class="mw-mask-summary" role="alert" tabindex="-1" data-mw-mask-summary>
      <strong>${names.length === 1 ? 'Eine Angabe ist noch unvollständig.' : `${names.length} Angaben sind noch unvollständig.`}</strong>
      <ul>${names.map((name) => {
        const field = fields.find((item) => item.name === name)
        return `<li><button type="button" data-mw-mask-jump="${escapeHtml(name)}">${escapeHtml(field?.label || name)}: ${escapeHtml(active.errors[name])}</button></li>`
      }).join('')}</ul>
    </div>`
  }

  /** Sichtbarer Bestätigungsbereich statt window.confirm. */
  const dangerMarkup = (config) => {
    const danger = config.danger
    if (!danger || config.readOnly) return ''
    if (active.danger !== 'open') {
      return `<section class="mw-mask-danger" data-mw-mask-danger-zone>
        <h3>${escapeHtml(danger.title || 'Kritische Aktion')}</h3>
        <p>${escapeHtml(danger.description || '')}</p>
        <button type="button" class="btn btn-ghost mw-mask-danger-open" data-mw-mask-danger-open>${escapeHtml(danger.label || 'Löschen')}</button>
      </section>`
    }
    const impact = danger.impact || []
    return `<section class="mw-mask-danger is-open" data-mw-mask-danger-zone>
      <h3 data-mw-mask-danger-question tabindex="-1">${escapeHtml(danger.question || 'Wirklich endgültig ausführen?')}</h3>
      ${impact.length
        ? `<div class="mw-mask-danger-impact"><strong>Auswirkungen</strong><ul>${impact.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul></div>`
        : ''}
      ${danger.note ? `<p class="mw-mask-danger-note">${escapeHtml(danger.note)}</p>` : ''}
      <div class="mw-mask-danger-actions">
        <button type="button" class="btn btn-primary" data-mw-mask-danger-cancel>Abbrechen</button>
        <button type="button" class="btn btn-danger mw-mask-danger-confirm" data-mw-mask-danger-confirm>${escapeHtml(danger.confirmLabel || 'Endgültig löschen')}</button>
      </div>
    </section>`
  }

  /** Sichtbare Rückfrage beim Verlassen mit ungespeicherten Änderungen. */
  const leaveMarkup = () => {
    if (!active.pendingLeave) return ''
    return `<section class="mw-mask-leave" role="alertdialog" aria-labelledby="mw-mask-leave-title" data-mw-mask-leave>
      <h3 id="mw-mask-leave-title" tabindex="-1">Ungespeicherte Änderungen verwerfen?</h3>
      <p>In dieser Maske gibt es Änderungen, die noch nicht gespeichert wurden. Beim Verlassen gehen sie verloren.</p>
      <div class="mw-mask-leave-actions">
        <button type="button" class="btn btn-primary" data-mw-mask-leave-stay>Weiter bearbeiten</button>
        <button type="button" class="btn btn-ghost" data-mw-mask-leave-discard>Änderungen verwerfen und verlassen</button>
      </div>
    </section>`
  }

  const render = ({ focus = null } = {}) => {
    const target = content()
    if (!target || !active) return
    const config = active.config
    const requiredHint = allFields(config.sections).some((field) => field.required)
      ? '<p class="mw-mask-required-hint">Mit <b aria-hidden="true">*</b> gekennzeichnete Felder sind Pflichtfelder.</p>'
      : ''

    target.innerHTML = `
      <section class="mw-mask" data-mw-edit-mask="${escapeHtml(config.id)}" data-mw-mask-mode="${config.readOnly ? 'read' : 'edit'}">
        ${breadcrumbMarkup(config)}
        <header class="mw-mask-head">
          <div>
            ${config.eyebrow ? `<span class="eyebrow">${escapeHtml(config.eyebrow)}</span>` : ''}
            <h2 tabindex="-1" data-mw-mask-title>${escapeHtml(config.title)}</h2>
            ${config.description ? `<p>${escapeHtml(config.description)}</p>` : ''}
          </div>
          <p class="mw-mask-mode" data-mw-mask-mode-badge>${config.readOnly ? 'Leseansicht' : 'Bearbeitungsmodus'}</p>
        </header>
        ${leaveMarkup()}
        ${errorSummaryMarkup()}
        ${config.notice ? `<p class="mw-mask-notice">${escapeHtml(config.notice)}</p>` : ''}
        <form class="mw-mask-form" data-mw-mask-form novalidate>
          ${requiredHint}
          ${(config.sections || []).map((section, index) => sectionMarkup(config, section, index)).join('')}
          <div class="mw-mask-actions" data-mw-mask-actions>
            ${config.readOnly
              ? `<button type="button" class="btn btn-ghost" data-mw-mask-cancel>${escapeHtml(config.cancelLabel || 'Zurück')}</button>`
              : `<button type="submit" class="btn btn-primary" data-mw-mask-save>${escapeHtml(config.saveLabel || 'Speichern')}</button>
                 <button type="button" class="btn btn-ghost" data-mw-mask-cancel>${escapeHtml(config.cancelLabel || 'Abbrechen')}</button>`}
            <span class="mw-mask-dirty" data-mw-mask-dirty ${isDirty() ? '' : 'hidden'}>Ungespeicherte Änderungen</span>
          </div>
        </form>
        ${dangerMarkup(config)}
      </section>`

    wire(target)
    applyFocus(focus)
  }

  const applyFocus = (focus) => {
    const root = content()?.querySelector('[data-mw-edit-mask]')
    if (!root) return
    if (focus === 'leave') { root.querySelector('[data-mw-mask-leave-stay]')?.focus(); return }
    if (focus === 'danger') { root.querySelector('[data-mw-mask-danger-cancel]')?.focus(); return }
    if (focus === 'summary') {
      const first = Object.keys(active.errors)[0]
      const field = first ? root.querySelector(`[data-mw-mask-field="${CSS.escape(first)}"]`) : null
      if (field) { field.focus(); return }
      root.querySelector('[data-mw-mask-summary]')?.focus()
      return
    }
    if (typeof focus === 'string' && focus.startsWith('field:')) {
      root.querySelector(`[data-mw-mask-field="${CSS.escape(focus.slice(6))}"]`)?.focus()
      return
    }
    if (focus === 'title' || focus === null) root.querySelector('[data-mw-mask-title]')?.focus()
  }

  const readField = (element, field) => (field.type === 'checkbox' ? element.checked : element.value)

  const setError = (name, message) => {
    if (message) active.errors[name] = message
    else delete active.errors[name]
    const root = content()?.querySelector('[data-mw-edit-mask]')
    const holder = root?.querySelector(`[data-mw-mask-error="${CSS.escape(name)}"]`)
    const control = root?.querySelector(`[data-mw-mask-field="${CSS.escape(name)}"]`)
    if (holder) {
      holder.textContent = message || ''
      holder.hidden = !message
    }
    if (control) {
      if (message) control.setAttribute('aria-invalid', 'true')
      else control.removeAttribute('aria-invalid')
      control.closest('.mw-mask-field')?.classList.toggle('is-invalid', Boolean(message))
    }
  }

  /** Prüft ein einzelnes Feld – während der Eingabe, nicht erst beim Speichern. */
  const validateField = (name) => {
    const errors = validateValues(active.config.sections, active.values, active.config.validate)
    setError(name, errors[name] || null)
    return !errors[name]
  }

  const updateDirtyMarker = () => {
    const marker = content()?.querySelector('[data-mw-mask-dirty]')
    if (marker) marker.hidden = !isDirty()
  }

  const wire = (target) => {
    const root = target.querySelector('[data-mw-edit-mask]')
    if (!root) return
    const fields = allFields(active.config.sections)

    root.querySelectorAll('[data-mw-mask-field]').forEach((element) => {
      const field = fields.find((item) => item.name === element.dataset.mwMaskField)
      if (!field) return
      const sync = () => {
        active.values[field.name] = normalizeValue(field, readField(element, field))
        updateDirtyMarker()
      }
      element.addEventListener('input', () => {
        sync()
        // Eine bereits angezeigte Meldung verschwindet, sobald sie behoben ist.
        if (active.errors[field.name]) validateField(field.name)
      })
      element.addEventListener('change', () => { sync(); validateField(field.name) })
      element.addEventListener('blur', () => { sync(); validateField(field.name) })
    })

    root.querySelector('[data-mw-mask-form]')?.addEventListener('submit', (event) => {
      event.preventDefault()
      submit()
    })
    root.querySelector('[data-mw-mask-cancel]')?.addEventListener('click', () => cancel())
    root.querySelectorAll('[data-mw-mask-breadcrumb]').forEach((button) => button.addEventListener('click', () => {
      const step = active.config.breadcrumb?.[Number(button.dataset.mwMaskBreadcrumb)]
      requestLeave(() => (typeof step?.onSelect === 'function' ? step.onSelect() : cancelImmediately()))
    }))
    root.querySelectorAll('[data-mw-mask-jump]').forEach((button) => button.addEventListener('click', () => {
      applyFocus(`field:${button.dataset.mwMaskJump}`)
    }))

    root.querySelector('[data-mw-mask-danger-open]')?.addEventListener('click', () => {
      active.danger = 'open'
      render({ focus: 'danger' })
    })
    root.querySelector('[data-mw-mask-danger-cancel]')?.addEventListener('click', () => {
      active.danger = null
      render({ focus: 'title' })
    })
    root.querySelector('[data-mw-mask-danger-confirm]')?.addEventListener('click', () => {
      const danger = active.config.danger
      active.danger = null
      // Vor der endgültigen Aktion entfällt der Schutz vor dem Verlassen:
      // Die Maske wird bewusst geschlossen.
      active.initial = { ...active.values }
      danger?.onConfirm?.()
    })

    root.querySelector('[data-mw-mask-leave-stay]')?.addEventListener('click', () => {
      active.pendingLeave = null
      render({ focus: 'title' })
    })
    root.querySelector('[data-mw-mask-leave-discard]')?.addEventListener('click', () => {
      const pending = active.pendingLeave
      active.pendingLeave = null
      active.initial = { ...active.values } // gilt ab jetzt als nicht mehr geändert
      if (typeof pending === 'function') pending()
      else cancelImmediately()
    })
  }

  // --- Abläufe -------------------------------------------------------------

  const submit = () => {
    if (!active || active.config.readOnly) return
    active.errors = validateValues(active.config.sections, active.values, active.config.validate)
    active.showAllErrors = Object.keys(active.errors).length > 0
    if (active.showAllErrors) {
      // Keine Speicherung bei ungültigen Angaben; die Eingaben bleiben erhalten.
      render({ focus: 'summary' })
      return
    }
    const result = active.config.onSave?.({ ...active.values })
    // `onSave` darf die Maske selbst verlassen und die Ausgangsansicht wieder
    // aufbauen – der Referenzfall tut genau das. Danach gibt es keinen
    // Maskenzustand mehr, den wir nachführen könnten.
    if (!active) return
    if (result && result.error) {
      active.errors = result.field ? { [result.field]: result.error } : {}
      active.showAllErrors = true
      active.config.notice = result.field ? active.config.notice : result.error
      render({ focus: result.field ? `field:${result.field}` : 'summary' })
      return
    }
    // Erfolgreich gespeichert: Der Aufrufer entscheidet, wohin es weitergeht.
    active.initial = { ...active.values }
    active.showAllErrors = false
  }

  const cancelImmediately = () => {
    const onCancel = active?.config.onCancel
    close()
    if (typeof onCancel === 'function') onCancel()
  }

  const cancel = () => requestLeave(cancelImmediately)

  /**
   * Fordert das Verlassen der Maske an. Bei ungespeicherten Änderungen wird
   * die Rückfrage als sichtbarer Bereich eingeblendet; „Weiter bearbeiten“ ist
   * die sichere Vorbelegung.
   */
  const requestLeave = (proceed) => {
    if (!active) { if (typeof proceed === 'function') proceed(); return true }
    if (!isDirty()) { if (typeof proceed === 'function') proceed(); return true }
    active.pendingLeave = typeof proceed === 'function' ? proceed : cancelImmediately
    render({ focus: 'leave' })
    return false
  }

  const close = () => {
    active = null
  }

  const open = (config) => {
    if (!config || !config.id) throw new Error('[edit-mask] Eine Maske benötigt eine id.')
    const values = {}
    allFields(config.sections).forEach((field) => {
      values[field.name] = normalizeValue(field, config.values?.[field.name])
    })
    active = {
      config: { ...config },
      initial: { ...values },
      values,
      errors: {},
      showAllErrors: false,
      pendingLeave: null,
      danger: null,
    }
    render({ focus: 'title' })
    return true
  }

  // --- Schutz vor versehentlichem Verlassen --------------------------------

  // Navigationsklicks werden abgefangen, solange Änderungen offen sind. Der
  // Klick wird nachgeholt, sobald der Nutzer sich für das Verwerfen entscheidet.
  document.addEventListener('click', (event) => {
    if (!active || !isDirty() || active.pendingLeave) return
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    if (target.closest('[data-mw-edit-mask]')) return
    const trigger = target.closest('#nav button, #switchRoleBtn, #resetBtn, [data-mw-main-group]')
    if (!trigger) return
    event.preventDefault()
    event.stopImmediatePropagation()
    requestLeave(() => {
      // Nach dem Verwerfen wird der ursprüngliche Klick wiederholt.
      close()
      trigger.click()
    })
  }, true)

  // Browser-seitiges Verlassen (Tab schließen, neu laden) lässt sich nur über
  // beforeunload absichern; dafür gibt es keine seiteneigene Entsprechung.
  window.addEventListener('beforeunload', (event) => {
    if (!isDirty()) return
    event.preventDefault()
    event.returnValue = ''
  })

  window.MWEditMask = {
    ...pureApi,
    open,
    close,
    cancel,
    requestLeave,
    submit,
    isOpen: () => Boolean(active) && Boolean(content()?.querySelector('[data-mw-edit-mask]')),
    isDirty,
    values: currentValues,
    config: () => (active ? { ...active.config } : null),
    errors: () => (active ? { ...active.errors } : {}),
  }
})()
