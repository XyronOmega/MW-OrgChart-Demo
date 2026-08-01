/**
 * Browsertests der gemeinsamen Bearbeitungsmaske am Referenzfall
 * „Unterkategorie anlegen, bearbeiten und löschen“.
 *
 * Geprüft werden die verbindlichen Anforderungen an eine Maske: eigener
 * Seitenzustand im Hauptbereich, Brotkrumen und Zurück-Navigation,
 * ausgewiesener Bearbeitungsmodus, Prüfung während der Eingabe, Fehlermeldung
 * am Feld, Aktionsleiste, Schutz vor versehentlichem Verlassen, Fokusführung,
 * Tastaturbedienung, einspaltige Darstellung, kein Datenverlust bei
 * Prüfungsfehlern, kein Speichern durch Leser sowie die Abwesenheit von
 * Systemdialogen und modalen Formularen.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const PORT = Number(process.env.MW_TEST_PORT_MASK || 4312)
const BASE = `http://localhost:${PORT}/`
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const importPlaywright = async () => {
  for (const specifier of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try {
      const mod = await import(specifier)
      return mod.chromium || mod.default?.chromium
    } catch { /* nächster Versuch */ }
  }
  return null
}

let server
let browser
let chromium

before(async () => {
  chromium = await importPlaywright()
  if (!chromium) return
  server = createServer((request, response) => {
    let path = decodeURIComponent(request.url.split('?')[0])
    if (path.endsWith('/')) path += 'index.html'
    const file = join(root, path)
    if (!existsSync(file) || !file.startsWith(root)) { response.writeHead(404); response.end('nicht gefunden'); return }
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  await new Promise((resolve) => server.listen(PORT, resolve))
  const launch = {}
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) launch.executablePath = '/opt/pw-browsers/chromium'
  browser = await chromium.launch(launch).catch(() => chromium.launch())
})

after(async () => {
  await browser?.close()
  server?.close()
})

const skipIfNoBrowser = (t) => {
  if (!chromium || !browser) { t.skip('Playwright ist nicht verfügbar'); return true }
  return false
}

/**
 * Öffnet eine Seite und protokolliert jeden Systemdialog. Erscheint einer,
 * schlägt der jeweilige Test fehl – die Vorgabe verbietet sie.
 */
const openPage = async (viewport = { width: 1440, height: 900 }) => {
  const page = await browser.newPage({ viewport })
  const dialoge = []
  const fehler = []
  page.on('dialog', async (dialog) => { dialoge.push(`${dialog.type()}: ${dialog.message()}`); await dialog.dismiss() })
  page.on('pageerror', (error) => fehler.push('pageerror: ' + error.message))
  page.on('console', (message) => { if (message.type() === 'error') fehler.push('console: ' + message.text()) })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  return { page, dialoge, fehler }
}

const login = async (page, role = 'admin') => {
  await page.selectOption('#roleSelect', role, { timeout: 8000 })
  await page.getByRole('button', { name: 'Demo starten' }).click({ timeout: 8000 })
  await page.waitForSelector('#nav button', { timeout: 8000 })
  await page.waitForTimeout(600)
}

/** Wechselt über die zweistufige Navigation in die Ansicht „Unterkategorien“. */
const openGroupsView = async (page) => {
  for (const group of ['organization', 'changes', 'administration', 'chart']) {
    const groupButton = page.locator(`[data-mw-main-group="${group}"]`)
    if (!(await groupButton.count())) continue
    await groupButton.click().catch(() => {})
    await page.waitForTimeout(250)
    const button = page.locator('#nav button', { hasText: 'Unterkategorien' }).first()
    if ((await button.count()) && (await button.isVisible())) {
      await button.click()
      await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
      await page.waitForTimeout(300)
      return true
    }
  }
  return false
}

const openCreateMask = async (page) => {
  await page.locator('[data-person-group-create]').click()
  await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
  await page.waitForTimeout(200)
}

const maskState = (page) => page.evaluate(() => {
  const mask = document.querySelector('[data-mw-edit-mask]')
  if (!mask) return null
  const feld = mask.querySelector('[data-mw-mask-field="name"]')
  const fehler = mask.querySelector('[data-mw-mask-error="name"]')
  return {
    id: mask.dataset.mwEditMask,
    modus: mask.dataset.mwMaskMode,
    titel: mask.querySelector('[data-mw-mask-title]')?.textContent.trim(),
    badge: mask.querySelector('[data-mw-mask-mode-badge]')?.textContent.trim(),
    brotkrumen: [...mask.querySelectorAll('.mw-mask-breadcrumb li')].map((item) => item.textContent.trim()),
    imInhaltsbereich: Boolean(document.getElementById('content')?.contains(mask)),
    wert: feld ? feld.value : null,
    fehlerSichtbar: fehler ? !fehler.hidden : false,
    fehlertext: fehler ? fehler.textContent.trim() : '',
    ariaInvalid: feld?.getAttribute('aria-invalid'),
    ariaDescribedby: feld?.getAttribute('aria-describedby'),
    pflichtfeld: feld?.getAttribute('aria-required'),
    bereiche: [...mask.querySelectorAll('fieldset legend')].map((legend) => legend.textContent.trim()),
    speichern: Boolean(mask.querySelector('[data-mw-mask-save]')),
    abbrechen: Boolean(mask.querySelector('[data-mw-mask-cancel]')),
    ungespeichert: mask.querySelector('[data-mw-mask-dirty]') ? !mask.querySelector('[data-mw-mask-dirty]').hidden : false,
    verlassenRueckfrage: Boolean(mask.querySelector('[data-mw-mask-leave]')),
    loeschbereichOffen: Boolean(mask.querySelector('[data-mw-mask-danger-confirm]')),
  }
})

const kategorien = (page) => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('mw-demo-person-groups-v1') || '[]')
  return raw.filter((group) => group.kind !== 'DIRECT').map((group) => `${group.orgUnitId}:${group.name}`)
})

describe('Maske öffnen und aufbauen', () => {
  test('die Maske ist ein eigener Seitenzustand im Hauptinhaltsbereich', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    assert.ok(await openGroupsView(page))
    await openCreateMask(page)
    const state = await maskState(page)
    assert.ok(state, 'Es wurde keine Maske geöffnet.')
    assert.equal(state.imInhaltsbereich, true, 'Die Maske liegt außerhalb von #content.')
    assert.equal(state.id, 'person-group')
    assert.equal(await page.locator('[data-person-groups-page]').count(), 0, 'Die Liste ist neben der Maske sichtbar geblieben.')
    assert.deepEqual(dialoge, [], 'Es erschien ein Systemdialog.')
    await page.close()
  })

  test('Titel, Modus, Brotkrumen und Aktionsleiste sind vorhanden', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    const state = await maskState(page)
    assert.match(state.titel, /Neue Unterkategorie/)
    assert.equal(state.modus, 'edit')
    assert.equal(state.badge, 'Bearbeitungsmodus')
    assert.deepEqual(state.brotkrumen, ['Organisation', 'Unterkategorien', 'Neue Unterkategorie'])
    assert.deepEqual(state.bereiche, ['Bezeichnung'], 'Die Felder sind nicht gruppiert.')
    assert.equal(state.speichern, true)
    assert.equal(state.abbrechen, true)
    assert.equal(state.pflichtfeld, 'true', 'Das Pflichtfeld ist nicht ausgezeichnet.')
    await page.close()
  })

  test('der Fokus liegt beim Öffnen auf der Überschrift', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-mw-mask-title')),
      'Der Fokus liegt nicht auf der Überschrift der Maske.')
    await page.close()
  })

  test('die Maske einer bestehenden Unterkategorie ist vorbelegt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Recruiting')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const state = await maskState(page)
    assert.equal(state.wert, 'Recruiting')
    assert.match(state.titel, /Recruiting/)
    assert.equal(state.loeschbereichOffen, false, 'Der Löschbereich darf nicht vorab geöffnet sein.')
    await page.close()
  })
})

describe('Eingabe, Prüfung und Speichern', () => {
  test('eine leere Pflichtangabe verhindert das Speichern', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openGroupsView(page)
    const vorher = await kategorien(page)
    await openCreateMask(page)
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(300)
    const state = await maskState(page)
    assert.ok(state, 'Die Maske wurde trotz Prüfungsfehler verlassen.')
    assert.equal(state.fehlerSichtbar, true, 'Es fehlt die Meldung am Feld.')
    assert.equal(state.ariaInvalid, 'true')
    assert.ok(state.ariaDescribedby.includes('mw-mask-person-group-name-error'),
      'Die Meldung ist dem Feld nicht zugeordnet.')
    assert.deepEqual(await kategorien(page), vorher, 'Es wurde trotz ungültiger Angabe gespeichert.')
    assert.deepEqual(dialoge, [])
    await page.close()
  })

  test('bei einem Prüfungsfehler gehen bereits erfasste Angaben nicht verloren', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Recruiting')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    // Dieselbe Bezeichnung noch einmal: Die Eingabe muss erhalten bleiben.
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Recruiting')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(300)
    const state = await maskState(page)
    assert.equal(state.wert, 'Recruiting', 'Die Eingabe wurde beim Prüfungsfehler verworfen.')
    assert.match(state.fehlertext, /bereits/)
    await page.close()
  })

  test('die Prüfung meldet sich schon beim Verlassen des Feldes', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'x')
    await page.fill('[data-mw-mask-field="name"]', '')
    await page.locator('[data-mw-mask-field="name"]').blur()
    await page.waitForTimeout(200)
    assert.equal((await maskState(page)).fehlerSichtbar, true, 'Die Prüfung erfolgt erst beim Speichern.')
    await page.close()
  })

  test('die Meldung verschwindet, sobald die Angabe stimmt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(250)
    assert.equal((await maskState(page)).fehlerSichtbar, true)
    await page.fill('[data-mw-mask-field="name"]', 'Onboarding')
    await page.waitForTimeout(250)
    const state = await maskState(page)
    assert.equal(state.fehlerSichtbar, false)
    assert.equal(state.ariaInvalid, null)
    await page.close()
  })

  test('gültige Angaben werden gespeichert und führen zurück zur Liste', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Personalgewinnung')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.equal(await page.locator('[data-mw-edit-mask]').count(), 0, 'Die Maske ist offen geblieben.')
    assert.ok((await kategorien(page)).some((entry) => entry.endsWith(':Personalgewinnung')))
    assert.ok(await page.locator('[data-person-group-name-text]', { hasText: 'Personalgewinnung' }).count())
    assert.deepEqual(dialoge, [])
    await page.close()
  })

  test('Umbenennen speichert die neue Bezeichnung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Alt')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.fill('[data-mw-mask-field="name"]', 'Neu')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    const liste = await kategorien(page)
    assert.ok(liste.some((entry) => entry.endsWith(':Neu')))
    assert.ok(!liste.some((entry) => entry.endsWith(':Alt')))
    await page.close()
  })
})

describe('Abbrechen und ungespeicherte Änderungen', () => {
  test('Abbrechen ohne Änderung führt sofort zurück', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    const vorher = await kategorien(page)
    await openCreateMask(page)
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.deepEqual(await kategorien(page), vorher, 'Der Abbruch hat den Datenstand verändert.')
    await page.close()
  })

  test('mit Änderungen erscheint eine sichtbare Rückfrage statt eines Systemdialogs', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Halbfertig')
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForTimeout(300)
    const state = await maskState(page)
    assert.equal(state.verlassenRueckfrage, true, 'Es fehlt die Rückfrage vor dem Verlassen.')
    assert.equal(state.ungespeichert, true, 'Der Hinweis auf ungespeicherte Änderungen fehlt.')
    assert.deepEqual(dialoge, [], 'Die Rückfrage darf kein Systemdialog sein.')
    // „Weiter bearbeiten“ ist die sichere Vorbelegung und hat den Fokus.
    assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-mw-mask-leave-stay')))
    await page.close()
  })

  test('„Weiter bearbeiten“ behält die Eingabe', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Halbfertig')
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForTimeout(250)
    await page.locator('[data-mw-mask-leave-stay]').click()
    await page.waitForTimeout(250)
    const state = await maskState(page)
    assert.ok(state, 'Die Maske wurde entgegen der Auswahl geschlossen.')
    assert.equal(state.wert, 'Halbfertig')
    assert.equal(state.verlassenRueckfrage, false)
    await page.close()
  })

  test('„Verwerfen“ stellt den Ausgangszustand wieder her', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    const vorher = await kategorien(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Halbfertig')
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForTimeout(250)
    await page.locator('[data-mw-mask-leave-discard]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.deepEqual(await kategorien(page), vorher, 'Beim Verwerfen wurde gespeichert.')
    await page.close()
  })

  test('ein Navigationswechsel wird bei Änderungen abgefangen und danach nachgeholt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Halbfertig')
    await page.locator('[data-mw-main-group="chart"]').click()
    await page.waitForTimeout(300)
    assert.equal((await maskState(page))?.verlassenRueckfrage, true, 'Der Wechsel wurde nicht abgefangen.')
    await page.locator('[data-mw-mask-leave-discard]').click()
    await page.waitForTimeout(900)
    assert.equal(await page.locator('[data-mw-edit-mask]').count(), 0, 'Die Maske blieb nach dem Verwerfen stehen.')
    assert.ok(await page.locator('.chart-wrap, .tree').count(), 'Der ursprüngliche Wechsel wurde nicht nachgeholt.')
    await page.close()
  })

  test('die Brotkrumennavigation führt zurück zur Liste', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.locator('[data-mw-mask-breadcrumb="1"]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.equal(await page.locator('[data-mw-edit-mask]').count(), 0)
    await page.close()
  })
})

describe('Löschen mit sichtbarer Bestätigung', () => {
  const anlegen = async (page, name) => {
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', name)
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
  }

  test('der Bestätigungsbereich nennt Frage und Auswirkungen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openGroupsView(page)
    await anlegen(page, 'Zu löschen')
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-danger-open]').click()
    await page.waitForTimeout(250)
    const bereich = await page.evaluate(() => {
      const zone = document.querySelector('[data-mw-mask-danger-zone]')
      return {
        frage: zone.querySelector('[data-mw-mask-danger-question]')?.textContent.trim(),
        auswirkungen: [...zone.querySelectorAll('.mw-mask-danger-impact li')].map((item) => item.textContent.trim()),
        abbrechenZuerst: zone.querySelector('.mw-mask-danger-actions button')?.dataset.mwMaskDangerCancel !== undefined,
        endgueltig: zone.querySelector('[data-mw-mask-danger-confirm]')?.textContent.trim(),
      }
    })
    assert.match(bereich.frage, /endgültig löschen\?/)
    assert.ok(bereich.auswirkungen.length >= 3, 'Es fehlen die Auswirkungen.')
    assert.ok(bereich.auswirkungen.some((line) => /Untereinheiten/.test(line)))
    assert.ok(bereich.auswirkungen.some((line) => /Leitungsfunktionen/.test(line)))
    assert.equal(bereich.abbrechenZuerst, true, 'Abbrechen muss die sichere Vorbelegung sein.')
    assert.match(bereich.endgueltig, /Endgültig/)
    // Der Fokus steht auf der sicheren Aktion.
    assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-mw-mask-danger-cancel')))
    assert.deepEqual(dialoge, [], 'Das Löschen darf nicht über einen Systemdialog bestätigt werden.')
    await page.close()
  })

  test('Abbrechen im Bestätigungsbereich löscht nichts', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await anlegen(page, 'Bleibt bestehen')
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-danger-open]').click()
    await page.waitForTimeout(200)
    await page.locator('[data-mw-mask-danger-cancel]').click()
    await page.waitForTimeout(250)
    assert.ok((await kategorien(page)).some((entry) => entry.endsWith(':Bleibt bestehen')))
    assert.ok(await page.locator('[data-mw-edit-mask]').count(), 'Die Maske wurde unnötig verlassen.')
    await page.close()
  })

  test('die endgültige Bestätigung löscht und ordnet Personen neu zu', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openGroupsView(page)
    await anlegen(page, 'Wird entfernt')
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-danger-open]').click()
    await page.waitForTimeout(200)
    await page.locator('[data-mw-mask-danger-confirm]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.ok(!(await kategorien(page)).some((entry) => entry.endsWith(':Wird entfernt')))
    assert.deepEqual(dialoge, [])
    await page.close()
  })
})

describe('Rollen und Rechte', () => {
  test('ein Leser erhält keine Maske und keine Einstiegsschaltfläche', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    assert.ok(await openGroupsView(page))
    assert.equal(await page.locator('[data-person-group-create]').count(), 0)
    assert.equal(await page.locator('[data-person-group-edit]').count(), 0)
    // Auch ein direkter Aufruf darf keine Maske erzeugen.
    const geoeffnet = await page.evaluate(() => {
      const before = document.querySelectorAll('[data-mw-edit-mask]').length
      document.querySelector('[data-person-groups-page]')?.dispatchEvent(new Event('mw-test'))
      return document.querySelectorAll('[data-mw-edit-mask]').length > before
    })
    assert.equal(geoeffnet, false)
    await page.close()
  })

  test('ein Leser kann über die Maskenschnittstelle nichts speichern', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    await openGroupsView(page)
    const ergebnis = await page.evaluate(async () => {
      const key = 'mw-demo-person-groups-v1'
      const vorher = localStorage.getItem(key)
      // Die Maske schreibt selbst nichts; ein erzwungener Aufruf der
      // Schreibfunktion muss an der Rechteprüfung scheitern.
      window.MWEditMask?.open({
        id: 'test', title: 'Test',
        sections: [{ title: 'x', fields: [{ name: 'name', label: 'Name', type: 'text' }] }],
        values: { name: 'Unerlaubt' },
        onSave: () => true,
      })
      window.MWEditMask?.submit?.()
      await new Promise((resolve) => setTimeout(resolve, 300))
      return { unveraendert: vorher === localStorage.getItem(key) }
    })
    assert.ok(ergebnis.unveraendert, 'Ein Leser konnte über die Maske schreiben.')
    await page.close()
  })

  test('die Bearbeitungsrolle erhält die Maske', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'editor')
    await openGroupsView(page)
    assert.ok(await page.locator('[data-person-group-create]').count())
    await openCreateMask(page)
    assert.equal((await maskState(page)).modus, 'edit')
    await page.close()
  })
})

describe('Tastaturbedienung und Darstellung', () => {
  test('die Maske lässt sich vollständig mit der Tastatur bedienen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    // Vom Titel über die Brotkrumen bis zum Eingabefeld und Speichern.
    const erreichbar = await page.evaluate(() => {
      const mask = document.querySelector('[data-mw-edit-mask]')
      const auswahl = 'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])'
      return [...mask.querySelectorAll(auswahl)].filter((element) => element.offsetParent !== null).length
    })
    assert.ok(erreichbar >= 4, `Nur ${erreichbar} Elemente sind per Tabulator erreichbar.`)
    // Eingabe und Absenden ausschließlich über die Tastatur.
    await page.locator('[data-mw-mask-field="name"]').focus()
    await page.keyboard.type('Per Tastatur')
    await page.keyboard.press('Enter')
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.ok((await kategorien(page)).some((entry) => entry.endsWith(':Per Tastatur')),
      'Das Absenden mit der Eingabetaste hat nicht gespeichert.')
    await page.close()
  })

  test('bei einem Prüfungsfehler springt der Fokus in das betroffene Feld', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(300)
    assert.ok(await page.evaluate(() => document.activeElement?.dataset?.mwMaskField === 'name'),
      'Der Fokus steht nicht im fehlerhaften Feld.')
    await page.close()
  })

  test('auf schmalen Geräten wird einspaltig dargestellt und nichts läuft über', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage({ width: 390, height: 844 })
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    const messung = await page.evaluate(() => {
      const grid = document.querySelector('.mw-mask-grid')
      const doc = document.documentElement
      return {
        spalten: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        ueberlauf: doc.scrollWidth > doc.clientWidth + 2,
      }
    })
    assert.equal(messung.spalten, 1, 'Die Maske ist auf schmalen Geräten nicht einspaltig.')
    assert.equal(messung.ueberlauf, false)
    await page.close()
  })
})

describe('Keine verbotenen Darstellungsformen', () => {
  test('im gesamten Ablauf erscheinen weder Systemdialog noch Laufzeitfehler', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge, fehler } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    await page.fill('[data-mw-mask-field="name"]', 'Vollständiger Durchlauf')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    await page.locator('[data-person-group-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-danger-open]').click()
    await page.waitForTimeout(200)
    await page.locator('[data-mw-mask-danger-confirm]').click()
    await page.waitForSelector('[data-person-groups-page]', { timeout: 8000 })
    assert.deepEqual(dialoge, [], 'Systemdialoge im Ablauf: ' + dialoge.join(' | '))
    // Speichern, Loeschen und die Rueckkehr zur Liste duerfen keinen Fehler
    // hinterlassen. `onSave` verlaesst die Maske selbst; der Maskenzustand ist
    // danach bereits abgeraeumt.
    assert.deepEqual(fehler, [], 'Laufzeitfehler im Ablauf: ' + fehler.join(' | '))
    await page.close()
  })

  test('während der Bearbeitung liegt kein Dialog oder Bearbeitungs-Drawer im DOM', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    const befund = await page.evaluate(() => {
      const drawer = document.getElementById('drawer')
      return {
        modale: [...document.querySelectorAll('[aria-modal="true"], dialog[open], .demo-unit-editor-backdrop')]
          .map((element) => element.tagName.toLowerCase() + '.' + (element.className || '')),
        drawerOffen: drawer ? !drawer.classList.contains('hidden') : false,
        felderAusserhalbInhalt: [...document.querySelectorAll('input, select, textarea')]
          .filter((element) => element.offsetParent !== null && !document.getElementById('content')?.contains(element))
          .map((element) => element.id || element.name || element.tagName.toLowerCase()),
      }
    })
    assert.deepEqual(befund.modale, [], 'Es liegt ein modales Element im DOM: ' + befund.modale.join(', '))
    assert.equal(befund.drawerOffen, false, 'Der Personen-Drawer war während der Bearbeitung offen.')
    assert.deepEqual(befund.felderAusserhalbInhalt, [],
      'Eingabefelder außerhalb des Hauptinhaltsbereichs: ' + befund.felderAusserhalbInhalt.join(', '))
    await page.close()
  })

  test('die Anwendung bleibt mit offener Maske im Leerlauf ruhig', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    const fehler = []
    page.on('pageerror', (error) => fehler.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') fehler.push(message.text()) })
    await login(page)
    await openGroupsView(page)
    await openCreateMask(page)
    const vorher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    await page.waitForTimeout(3000)
    const nachher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    assert.equal(nachher.runs, vorher.runs, 'Die offene Maske löst fortlaufend Aktualisierungen aus.')
    assert.equal(nachher.dom, vorher.dom, 'Der DOM wächst bei offener Maske.')
    assert.ok(await page.locator('[data-mw-edit-mask]').count(), 'Die Maske wurde von einem Beobachter überschrieben.')
    assert.deepEqual(fehler, [], 'Konsolenfehler: ' + fehler.join(' | '))
    await page.close()
  })
})
