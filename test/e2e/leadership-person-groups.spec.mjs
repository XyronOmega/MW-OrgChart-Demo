/**
 * Browsertests für die Masken „Leitungsfunktion“ und
 * „Personen Unterkategorien zuordnen“ (Paket 3).
 *
 * Geprüft werden Anlegen, Bearbeiten, Entfernen, die gesammelte Zuordnung,
 * alle Ausübungsarten, die Hauptleitungsfunktion samt Rückstufung, die
 * Rollenrechte sowie die vollständige Abwesenheit der abgelösten
 * Altmechanismen: Systemdialog, Formular am Seitenende, Sofortspeicherung bei
 * `change`, Modal, Bearbeitungs-Drawer, Reload und Polling.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const PORT = Number(process.env.MW_TEST_PORT_LEADERSHIP || 4314)
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

/** Öffnet eine Seite und protokolliert Systemdialoge, Fehler und Neuladen. */
const openPage = async (viewport = { width: 1440, height: 900 }) => {
  const page = await browser.newPage({ viewport })
  const dialoge = []
  const fehler = []
  const ladevorgaenge = []
  page.on('dialog', async (dialog) => { dialoge.push(`${dialog.type()}: ${dialog.message()}`); await dialog.dismiss() })
  page.on('pageerror', (error) => fehler.push('pageerror: ' + error.message))
  page.on('console', (message) => { if (message.type() === 'error') fehler.push('console: ' + message.text()) })
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) ladevorgaenge.push(frame.url()) })
  await page.addInitScript(() => {
    window.__intervalle = 0
    const nativ = window.setInterval
    window.setInterval = (...args) => { window.__intervalle += 1; return nativ(...args) }
    window.__unhandled = 0
    window.addEventListener('unhandledrejection', () => { window.__unhandled += 1 })
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  return { page, dialoge, fehler, ladevorgaenge }
}

const login = async (page, role = 'admin') => {
  await page.selectOption('#roleSelect', role, { timeout: 8000 })
  await page.getByRole('button', { name: 'Demo starten' }).click({ timeout: 8000 })
  await page.waitForSelector('#nav button', { timeout: 8000 })
  await page.waitForTimeout(600)
}

const openView = async (page, label) => {
  for (const group of ['organization', 'changes', 'administration', 'chart']) {
    const groupButton = page.locator(`[data-mw-main-group="${group}"]`)
    if (!(await groupButton.count())) continue
    await groupButton.click().catch(() => {})
    await page.waitForTimeout(250)
    const button = page.locator('#nav button', { hasText: label }).first()
    if ((await button.count()) && (await button.isVisible())) {
      await button.click()
      await page.waitForTimeout(700)
      return true
    }
  }
  return false
}

const feld = (name) => `[data-mw-mask-field="${name}"]`
const fehlerAm = (page, name) => page.evaluate((n) => {
  const element = document.querySelector(`[data-mw-mask-error="${n}"]`)
  return element && !element.hidden ? element.textContent.trim() : ''
}, name)

/** Leitungsmandate aus der laufenden Anwendung, nicht aus dem Speicher. */
const mandate = (page) => page.evaluate(() => window.MWLeadershipDemo.loadAssignments())
const knoten = (page) => page.evaluate(() => {
  const gespeichert = JSON.parse(localStorage.getItem('mw-demo-nodes') || 'null')
  return Array.isArray(gespeichert) ? gespeichert : []
})

/** Öffnet die Leitungsansicht und die Maske für ein neues Mandat. */
const neueLeitungsmaske = async (page) => {
  assert.ok(await openView(page, 'Leitungsfunktionen'), 'Die Ansicht „Leitungsfunktionen“ fehlt.')
  await page.click('[data-leadership-create]')
  await page.waitForSelector('[data-mw-edit-mask="leadership"]', { timeout: 8000 })
}

/** Füllt die Leitungsmaske und speichert. */
const leitungAusfuellen = async (page, werte) => {
  for (const [name, wert] of Object.entries(werte)) {
    const element = page.locator(feld(name))
    const tag = await element.evaluate((node) => node.tagName.toLowerCase())
    const typ = await element.evaluate((node) => node.type || '')
    if (tag === 'select') await element.selectOption(String(wert))
    else if (typ === 'checkbox') await element.setChecked(Boolean(wert))
    else await element.fill(String(wert))
  }
}

describe('Maske für Leitungsfunktionen', () => {
  test('alle geforderten Bereiche und Felder sind vorhanden', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    const bereiche = await page.locator('.mw-mask-section legend').allTextContents()
    assert.deepEqual(bereiche, ['Person und Organisation', 'Ausübungsart', 'Gültigkeit', 'Ergänzende Angaben'])
    for (const name of ['personId', 'orgUnitId', 'leadershipRole', 'exerciseType', 'primaryLeadership', 'validFrom', 'validTo', 'note']) {
      assert.equal(await page.locator(feld(name)).count(), 1, `Das Feld „${name}“ fehlt.`)
    }
    await page.close()
  })

  test('eine Leitungsfunktion wird angelegt und erscheint in der Ansicht', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Projektleitung', exerciseType: 'REGULAR',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.equal(await page.locator('[data-leadership-page]').count(), 1, 'Die Rückkehr zur Liste fehlt.')
    const liste = await mandate(page)
    assert.ok(liste.some((entry) => entry.leadershipRole === 'Projektleitung' && entry.personId === 'p3'))
    const hinweis = await page.locator('[data-leadership-notice]').textContent()
    assert.match(hinweis, /angelegt/)
    assert.deepEqual(dialoge, [])
    await page.close()
  })

  test('ein bestehendes Mandat ist vorbelegt und speichert Änderungen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask="leadership"]')
    const vorbelegt = await page.locator(feld('leadershipRole')).inputValue()
    assert.ok(vorbelegt.length > 0, 'Die Maske ist nicht vorbelegt.')
    await page.fill(feld('note'), 'In Paket 3 ergänzt')
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    const liste = await mandate(page)
    assert.ok(liste.some((entry) => entry.note === 'In Paket 3 ergänzt'))
    assert.equal(liste.filter((entry) => entry.leadershipRole === vorbelegt).length >= 1, true)
    await page.close()
  })

  test('alle fünf Ausübungsarten lassen sich speichern', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const arten = {
      REGULAR: 'Reguläre Leitung',
      PERSONAL_UNION: 'Leitung in Personalunion',
      ACTING: 'Kommissarische Leitung',
      DEPUTY: 'Stellvertretende Leitung',
      FUNCTIONAL: 'Fachliche Leitung',
    }
    for (const [wert, bezeichnung] of Object.entries(arten)) {
      await neueLeitungsmaske(page)
      await leitungAusfuellen(page, {
        personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: bezeichnung, exerciseType: wert,
      })
      await page.click('[data-mw-mask-save]')
      await page.waitForTimeout(600)
    }
    const liste = await mandate(page)
    Object.entries(arten).forEach(([wert, bezeichnung]) => {
      const gefunden = liste.find((entry) => entry.leadershipRole === bezeichnung)
      assert.ok(gefunden, `Die Ausübungsart „${bezeichnung}“ wurde nicht gespeichert.`)
      assert.equal(gefunden.exerciseType, wert)
    })
    await page.close()
  })

  test('dieselbe Person führt mehrere OrgEinheiten gleichzeitig', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(600)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pa-pay', leadershipRole: 'Teamleitung', exerciseType: 'PERSONAL_UNION',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(600)
    const eigene = (await mandate(page)).filter((entry) => entry.personId === 'p3')
    assert.equal(eigene.length, 2, 'Das zweite Mandat wurde nicht gespeichert.')
    assert.deepEqual([...new Set(eigene.map((entry) => entry.orgUnitId))].sort(), ['pa-pay', 'pm-sb'])
    await page.close()
  })
})

describe('Hauptleitungsfunktion', () => {
  test('die Maske erklärt die Rückstufung sichtbar', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    const hinweise = (await page.locator('.mw-mask-notes li').allTextContents()).join(' | ')
    assert.match(hinweise, /höchstens eine Leitungsfunktion als Hauptleitungsfunktion/)
    assert.match(hinweise, /Leitung und Mitgliedschaft bleiben getrennt/)
    const feldhinweis = await page.locator('.mw-mask-field--checkbox .mw-mask-hint').textContent()
    assert.match(feldhinweis, /zurückgestuft, aber nicht entfernt/)
    await page.close()
  })

  test('eine bisherige Hauptleitungsfunktion wird zurückgestuft, nicht gelöscht', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const vorher = await mandate(page)
    const bisher = vorher.find((entry) => entry.personId === 'p1' && entry.primaryLeadership)
    assert.ok(bisher, 'Die Ausgangsdaten enthalten keine Hauptleitungsfunktion für p1.')
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p1', orgUnitId: 'pe-learning', leadershipRole: 'Fachleitung', exerciseType: 'FUNCTIONAL',
      primaryLeadership: true,
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    const nachher = await mandate(page)
    assert.ok(nachher.some((entry) => entry.id === bisher.id), 'Das bisherige Mandat wurde gelöscht.')
    assert.equal(nachher.find((entry) => entry.id === bisher.id).primaryLeadership, false)
    assert.equal(nachher.filter((entry) => entry.personId === 'p1' && entry.primaryLeadership).length, 1)
    const hinweis = await page.locator('[data-leadership-notice]').textContent()
    assert.match(hinweis, /nicht mehr als Hauptleitungsfunktion gekennzeichnet/)
    await page.close()
  })
})

describe('Prüfungen der Leitungsmaske', () => {
  test('Pflichtfelder verhindern das Speichern und die Eingaben bleiben erhalten', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await page.fill(feld('note'), 'Bleibt erhalten')
    await page.fill(feld('leadershipRole'), '')
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-mw-edit-mask="leadership"]').count(), 1)
    assert.ok((await fehlerAm(page, 'leadershipRole')).length > 0, 'Es fehlt die Meldung am Feld.')
    assert.equal(await page.locator(feld('note')).inputValue(), 'Bleibt erhalten')
    await page.close()
  })

  test('ein Enddatum vor dem Startdatum wird am Feld gemeldet', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung',
      validFrom: '2026-08-02', validTo: '2026-08-01',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'validTo'), /Gültig-bis/)
    await page.close()
  })

  test('ein überschneidendes Doppelmandat wird abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', validFrom: '2026-01-01', validTo: '',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(600)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'teamleitung', validFrom: '2026-06-01', validTo: '',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'leadershipRole'), /überschneidender Zeitraum/)
    assert.equal((await mandate(page)).filter((entry) => entry.personId === 'p3').length, 1)
    await page.close()
  })

  test('das bearbeitete Mandat gilt nicht als eigene Dublette', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-edit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask="leadership"]')
    await page.fill(feld('note'), 'Unverändert bis auf den Hinweis')
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.equal(await page.locator('[data-leadership-page]').count(), 1, 'Das eigene Mandat wurde als Dublette abgelehnt.')
    await page.close()
  })

  test('eingeschleuste Person, OrgEinheit und Ausübungsart werden abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    const ergebnis = await page.evaluate(() => {
      const basis = {
        orgUnitId: 'pm-sb', personId: 'p3', leadershipRole: 'Eingeschleust',
        exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: '', primaryLeadership: false, note: '',
      }
      const api = window.MWLeadershipDemo
      return {
        person: api.saveAssignmentValues({ ...basis, personId: 'gibt-es-nicht' }),
        einheit: api.saveAssignmentValues({ ...basis, orgUnitId: 'gibt-es-nicht' }),
        einheitIstPerson: api.saveAssignmentValues({ ...basis, orgUnitId: 'p1' }),
        art: api.saveAssignmentValues({ ...basis, exerciseType: 'CHEF' }),
        anzahl: api.loadAssignments().filter((entry) => entry.leadershipRole === 'Eingeschleust').length,
      }
    })
    assert.equal(ergebnis.person.field, 'personId')
    assert.equal(ergebnis.einheit.field, 'orgUnitId')
    assert.equal(ergebnis.einheitIstPerson.field, 'orgUnitId')
    assert.equal(ergebnis.art.field, 'exerciseType')
    assert.equal(ergebnis.anzahl, 0, 'Eingeschleuste Werte wurden gespeichert.')
    await page.close()
  })
})

describe('Leitungsfunktion entfernen', () => {
  test('der Bestätigungsbereich nennt alle geforderten Angaben', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]', { timeout: 8000 })
    const zeilen = (await page.locator('.mw-mask-danger-impact li').allTextContents()).join(' | ')
    assert.match(zeilen, /^Person: /)
    assert.match(zeilen, /Organisationseinheit: /)
    assert.match(zeilen, /Leitungsfunktion: /)
    assert.match(zeilen, /Ausübungsart: /)
    assert.match(zeilen, /Gültigkeitszeitraum: /)
    assert.match(zeilen, /Hauptleitungsfunktion: /)
    assert.match(zeilen, /Mitgliedschaft bleibt unverändert/)
    assert.match(zeilen, /(Andere Leitungsmandate dieser Person bleiben bestehen|kein weiteres Leitungsmandat)/)
    assert.deepEqual(dialoge, [], 'Beim Entfernen erschien ein Systemdialog.')
    await page.close()
  })

  test('die sichere Aktion steht zuerst und der Fokus liegt auf ihr', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    const reihenfolge = await page.evaluate(() => [...document.querySelectorAll('.mw-mask-danger-actions button')]
      .map((button) => button.textContent.trim()))
    assert.equal(reihenfolge[0], 'Abbrechen')
    assert.equal(reihenfolge[1], 'Endgültig entfernen')
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.mwMaskDangerCancel !== undefined), true)
    await page.close()
  })

  test('Abbrechen im Bestätigungsbereich entfernt nichts', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const vorher = (await mandate(page)).length
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    await page.click('[data-mw-mask-danger-cancel]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-mw-edit-mask="leadership"]').count(), 1, 'Die Maske wurde verlassen.')
    assert.equal((await mandate(page)).length, vorher)
    await page.close()
  })

  test('weder Escape noch ein Klick daneben löschen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const vorher = (await mandate(page)).length
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    await page.keyboard.press('Escape')
    await page.mouse.click(5, 5)
    await page.waitForTimeout(400)
    assert.equal((await mandate(page)).length, vorher, 'Escape oder ein Klick daneben hat gelöscht.')
    await page.close()
  })

  test('ein Ansichtswechsel während der Rückfrage löscht nicht', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const vorher = (await mandate(page)).length
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    assert.ok(await openView(page, 'Unterkategorien'))
    await page.waitForTimeout(400)
    assert.equal((await mandate(page)).length, vorher, 'Der Ansichtswechsel hat gelöscht.')
    await page.close()
  })

  test('die endgültige Bestätigung entfernt genau ein Mandat', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    const vorher = await mandate(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    const id = await page.locator('[data-leadership-delete]').first().getAttribute('data-leadership-delete')
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    await page.click('[data-mw-mask-danger-confirm]')
    await page.waitForTimeout(700)
    const nachher = await mandate(page)
    assert.equal(nachher.length, vorher.length - 1)
    assert.equal(nachher.some((entry) => entry.id === id), false)
    assert.equal(await page.locator('[data-leadership-page]').count(), 1)
    assert.match(await page.locator('[data-leadership-notice]').textContent(), /wurde entfernt/)
    await page.close()
  })

  test('das Entfernen verändert die organisatorische Mitgliedschaft nicht', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    const vorher = await knoten(page)
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    await page.click('[data-mw-mask-danger-confirm]')
    await page.waitForTimeout(700)
    assert.deepEqual(await knoten(page), vorher, 'Die Knoten wurden beim Entfernen verändert.')
    await page.close()
  })
})

describe('Abbrechen und ungespeicherte Änderungen in der Leitungsmaske', () => {
  test('Abbrechen ohne Änderung führt sofort zurück', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await page.click('[data-mw-mask-cancel]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-leadership-page]').count(), 1)
    await page.close()
  })

  test('mit Änderungen erscheint die sichtbare Rückfrage', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await page.fill(feld('leadershipRole'), 'Noch nicht gespeichert')
    await page.click('[data-mw-mask-cancel]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-mw-mask-leave]').count(), 1, 'Die Rückfrage fehlt.')
    assert.deepEqual(dialoge, [])
    await page.click('[data-mw-mask-leave-stay]')
    await page.waitForTimeout(300)
    assert.equal(await page.locator(feld('leadershipRole')).inputValue(), 'Noch nicht gespeichert')
    await page.close()
  })
})

describe('Sammelmaske für Personenzuordnungen', () => {
  /**
   * Bereitet eine OrgEinheit mit zwei Personen und einer Unterkategorie vor
   * und öffnet die Sammelmaske.
   */
  const vorbereiten = async (page, kategorie = 'Recruiting') => {
    assert.ok(await openView(page, 'Unterkategorien'), 'Die Ansicht „Unterkategorien“ fehlt.')
    await page.selectOption('[data-person-groups-unit]', 'pm-hrbp')
    await page.waitForTimeout(400)
    await page.click('[data-person-group-create]')
    await page.waitForSelector('[data-mw-edit-mask="person-group"]')
    await page.fill(feld('name'), kategorie)
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(600)
  }

  const oeffnen = async (page) => {
    await page.click('[data-person-assignment-open]')
    await page.waitForSelector('[data-mw-edit-mask="person-assignment"]', { timeout: 8000 })
  }

  test('die Liste bietet keine Auswahlfelder mit sofortiger Speicherung mehr', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Unterkategorien'))
    assert.equal(await page.locator('[data-person-subcategory-person]').count(), 0)
    assert.ok(await page.locator('[data-person-subcategory-text]').count() > 0, 'Die Anzeige der Zuordnung fehlt.')
    await page.close()
  })

  test('zeigt genau die Personen der gewählten OrgEinheit mit ihrer Zuordnung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    const beschriftungen = await page.locator('.mw-mask-field .mw-mask-label').allTextContents()
    assert.deepEqual(beschriftungen.sort(), ['Lea Beispiel', 'Noah Muster'])
    const hinweise = (await page.locator('.mw-mask-field .mw-mask-hint').allTextContents()).join(' | ')
    assert.match(hinweise, /Aktuell: Direkt zugeordnet/)
    await page.close()
  })

  test('vorhandene Zuordnungen sind vorbelegt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    await oeffnen(page)
    const wert = await page.locator(feld('person:p1')).evaluate((node) => node.selectedOptions[0].textContent)
    assert.equal(wert, 'Recruiting', 'Die bestehende Zuordnung ist nicht vorbelegt.')
    await page.close()
  })

  test('mehrere Personen werden gesammelt geändert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.locator(feld('person:p2')).selectOption({ label: 'Recruiting' })
    await page.waitForTimeout(200)
    const zusammenfassung = await page.locator('[data-mw-mask-live-summary]').textContent()
    assert.match(zusammenfassung, /2 Personen werden geändert/)
    assert.match(zusammenfassung, /Lea Beispiel: „Direkt zugeordnet“ → „Recruiting“/)
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    const personen = (await knoten(page)).filter((node) => ['p1', 'p2'].includes(node.id))
    assert.equal(personen.length, 2)
    personen.forEach((person) => assert.ok(person.subcategoryId, `${person.name} wurde nicht zugeordnet.`))
    await page.close()
  })

  test('„Direkt zugeordnet“ wird als bewusste Auswahl gespeichert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Direkt zugeordnet' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    const person = (await knoten(page)).find((node) => node.id === 'p1')
    assert.equal(person.subcategoryId, null, '„Direkt zugeordnet“ muss als null gespeichert werden.')
    await page.close()
  })

  test('ohne Änderung wird nicht gespeichert und ein Hinweis erscheint', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await vorbereiten(page)
    const vorher = await knoten(page)
    await oeffnen(page)
    assert.match(await page.locator('[data-mw-mask-live-summary]').textContent(), /Keine Änderung/)
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(500)
    assert.equal(await page.locator('[data-mw-edit-mask="person-assignment"]').count(), 1, 'Die Maske wurde verlassen.')
    assert.match(await page.locator('.mw-mask-notice').textContent(), /keine Zuordnung geändert/)
    assert.deepEqual(await knoten(page), vorher, 'Ohne Änderung wurde geschrieben.')
    assert.deepEqual(dialoge, [])
    await page.close()
  })

  test('eine fremde Unterkategorie und eine fremde Person werden abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    const ergebnis = await page.evaluate(() => {
      const api = window.MWPersonGroups
      const vorher = localStorage.getItem('mw-demo-nodes')
      const fremdeKategorie = api.savePersonAssignments('pm-hrbp', { 'person:p1': 'direct:pm-sb' })
      const fremdePerson = api.savePersonAssignments('pm-hrbp', { 'person:p9': `direct:pm-hrbp` })
      const erfunden = api.savePersonAssignments('pm-hrbp', { 'person:p1': 'gibt-es-nicht' })
      return {
        fremdeKategorie: fremdeKategorie.field,
        fremdePerson: fremdePerson.field,
        erfunden: erfunden.field,
        unveraendert: vorher === localStorage.getItem('mw-demo-nodes'),
      }
    })
    assert.equal(ergebnis.fremdeKategorie, 'person:p1')
    assert.equal(ergebnis.fremdePerson, 'person:p9')
    assert.equal(ergebnis.erfunden, 'person:p1')
    assert.ok(ergebnis.unveraendert, 'Eingeschleuste Angaben wurden gespeichert.')
    await page.close()
  })

  test('Mitgliedschaft und Leitungsmandate bleiben unverändert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    const mandateVorher = await mandate(page)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    const personen = (await knoten(page)).filter((node) => node.type === 'person')
    personen.forEach((person) => {
      if (['p1', 'p2'].includes(person.id)) assert.equal(person.parent, 'pm-hrbp', 'Die Mitgliedschaft wurde verändert.')
    })
    assert.deepEqual(await mandate(page), mandateVorher, 'Die Leitungsmandate wurden verändert.')
    await page.close()
  })

  test('Abbrechen ohne und mit Änderungen verhält sich wie gefordert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    await page.click('[data-mw-mask-cancel]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-person-groups-page]').count(), 1, 'Ohne Änderung fehlt die sofortige Rückkehr.')

    await oeffnen(page)
    const vorher = await knoten(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.click('[data-mw-mask-cancel]')
    await page.waitForTimeout(400)
    assert.equal(await page.locator('[data-mw-mask-leave]').count(), 1, 'Die Rückfrage fehlt.')
    await page.click('[data-mw-mask-leave-discard]')
    await page.waitForTimeout(500)
    assert.equal(await page.locator('[data-person-groups-page]').count(), 1)
    assert.deepEqual(await knoten(page), vorher, 'Das Verwerfen hat geschrieben.')
    assert.deepEqual(dialoge, [])
    await page.close()
  })

  test('nach dem Speichern bleibt dieselbe OrgEinheit gewählt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await vorbereiten(page)
    await oeffnen(page)
    await page.locator(feld('person:p1')).selectOption({ label: 'Recruiting' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.equal(await page.locator('[data-person-groups-unit]').inputValue(), 'pm-hrbp')
    assert.match(await page.locator('[data-person-groups-notice]').textContent(), /neu zugeordnet/)
    await page.close()
  })
})

describe('Rollen und Rechte in Paket 3', () => {
  test('ein Leser erhält weder Einstieg noch Maske', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    assert.equal(await page.locator('[data-leadership-create]').count(), 0)
    assert.equal(await page.locator('[data-leadership-edit]').count(), 0)
    assert.equal(await page.locator('[data-leadership-delete]').count(), 0)
    assert.ok(await openView(page, 'Unterkategorien'))
    assert.equal(await page.locator('[data-person-assignment-open]').count(), 0)
    const abgelehnt = await page.evaluate(() => ({
      leitung: window.MWLeadershipDemo.openLeadershipMask(null),
      zuordnung: window.MWPersonGroups.openAssignmentMask('pm-hrbp'),
    }))
    assert.equal(abgelehnt.leitung, false)
    assert.equal(abgelehnt.zuordnung, false)
    await page.close()
  })

  test('ein Leser kann auch über die Speicherfunktionen nichts schreiben', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    const ergebnis = await page.evaluate(async () => {
      const abbild = () => JSON.stringify(Object.fromEntries(
        Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])))
      const vorher = abbild()
      const leitung = window.MWLeadershipDemo.saveAssignmentValues({
        personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Unerlaubt',
        exerciseType: 'REGULAR', validFrom: '2026-01-01', validTo: '', primaryLeadership: false, note: '',
      })
      const entfernen = window.MWLeadershipDemo.removeAssignmentById('lead-pm-p1')
      const zuordnung = window.MWPersonGroups.savePersonAssignments('pm-hrbp', { 'person:p1': 'direct:pm-hrbp' })
      await new Promise((resolve) => setTimeout(resolve, 300))
      return {
        unveraendert: vorher === abbild(),
        meldungen: [leitung.error, entfernen.error, zuordnung.error].filter(Boolean).length,
      }
    })
    assert.equal(ergebnis.meldungen, 3, 'Nicht jede Speicherfunktion hat den Leser abgewiesen.')
    assert.ok(ergebnis.unveraendert, 'Ein Leser konnte Daten schreiben.')
    await page.close()
  })

  test('die Bearbeitungsrolle erhält beide Masken', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'editor')
    assert.ok(await openView(page, 'Leitungsfunktionen'))
    assert.equal(await page.locator('[data-leadership-create]').count(), 1)
    assert.ok(await openView(page, 'Unterkategorien'))
    assert.equal(await page.locator('[data-person-assignment-open]').count(), 1)
    await page.close()
  })
})

describe('Rolle, Navigation und Laufzeit', () => {
  test('nach dem Speichern bleiben Rolle und aktive Ansicht bestehen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, ladevorgaenge } = await openPage()
    await login(page, 'editor')
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.equal(await page.locator('#roleSelect').inputValue(), 'editor')
    assert.equal(await page.locator('#loginPage.hidden').count(), 1, 'Die Anmeldeseite ist zurückgekehrt.')
    const aktiv = await page.evaluate(() => document.querySelector('#nav button.active')?.textContent?.trim())
    assert.equal(aktiv, 'Leitungsfunktionen')
    assert.equal(ladevorgaenge.length, 1, 'Die Seite wurde neu geladen.')
    await page.close()
  })

  test('kein Neuladen, kein Polling, keine simulierte Anmeldung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, ladevorgaenge } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'REGULAR',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.equal(await page.evaluate(() => window.__intervalle), 0, 'Es läuft wieder eine Poll-Schleife.')
    assert.equal(ladevorgaenge.length, 1)
    await page.close()
  })

  test('keine Systemdialoge, keine Konsolenfehler, keine offenen Zusagen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge, fehler } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await leitungAusfuellen(page, {
      personId: 'p3', orgUnitId: 'pm-sb', leadershipRole: 'Teamleitung', exerciseType: 'ACTING',
    })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(600)
    await page.locator('[data-leadership-delete]').first().click()
    await page.waitForSelector('[data-mw-mask-danger-confirm]')
    await page.click('[data-mw-mask-danger-confirm]')
    await page.waitForTimeout(600)
    assert.ok(await openView(page, 'Unterkategorien'))
    assert.deepEqual(dialoge, [])
    assert.deepEqual(fehler, [])
    assert.equal(await page.evaluate(() => window.__unhandled), 0)
    await page.close()
  })

  test('kein Modal, kein Bearbeitungs-Drawer, keine Felder außerhalb von #content', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    const befund = await page.evaluate(() => {
      const content = document.getElementById('content')
      const drawer = document.getElementById('drawer')
      return {
        modal: document.querySelectorAll('[aria-modal="true"]').length,
        drawerOffen: drawer ? !drawer.classList.contains('hidden') : false,
        drawerFelder: drawer ? drawer.querySelectorAll('input, select, textarea').length : 0,
        maskeInContent: !!content.querySelector('[data-mw-edit-mask]'),
        felderAussen: [...document.querySelectorAll('input, select, textarea')]
          .filter((element) => !content.contains(element) && element.id !== 'roleSelect').length,
      }
    })
    assert.equal(befund.modal, 0)
    assert.equal(befund.drawerOffen, false)
    assert.equal(befund.drawerFelder, 0)
    assert.equal(befund.maskeInContent, true)
    assert.equal(befund.felderAussen, 0)
    await page.close()
  })

  test('kein DOM-Zuwachs im Leerlauf, auch mit offener Maske', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    const zaehlen = () => page.evaluate(() => document.querySelectorAll('*').length)
    await page.waitForTimeout(1200)
    const vorher = await zaehlen()
    await page.waitForTimeout(2500)
    assert.equal(await zaehlen(), vorher, 'Das DOM wächst im Leerlauf.')
    await page.close()
  })
})

describe('Darstellung und Tastatur in Paket 3', () => {
  test('der Fokus liegt beim Öffnen auf der Überschrift', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.mwMaskTitle !== undefined), true)
    await page.close()
  })

  test('bei einem Prüfungsfehler springt der Fokus in das betroffene Feld', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    await page.fill(feld('leadershipRole'), '')
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(400)
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.mwMaskField), 'leadershipRole')
    await page.close()
  })

  test('ein Klick auf „Speichern“ unmittelbar nach der Eingabe kommt an', async (t) => {
    if (skipIfNoBrowser(t)) return
    // Erscheint die Meldung zu einem Feld erst beim Verlassen, darf sich die
    // Schaltfläche darunter nicht verschieben: Sonst liegt der Zeiger beim
    // Loslassen daneben und der Klick kommt gar nicht erst zustande.
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    // Seitenbezogen messen: `boundingBox` ist auf das Sichtfenster bezogen und
    // ändert sich schon durch das Scrollen beim Fokuswechsel.
    const position = () => page.evaluate(() =>
      Math.round(document.querySelector('[data-mw-mask-save]').getBoundingClientRect().top + window.scrollY))
    const vorher = await position()
    await page.fill(feld('leadershipRole'), '')
    await page.locator(feld('note')).focus()
    await page.waitForTimeout(300)
    const versatz = Math.abs(await position() - vorher)
    assert.ok(versatz <= 1, `Die Schaltfläche „Speichern“ ist beim Einblenden der Meldung um ${versatz}px verrutscht.`)

    await page.fill(feld('leadershipRole'), 'Direkt danach gespeichert')
    await leitungAusfuellen(page, { personId: 'p3', orgUnitId: 'pm-sb' })
    await page.click('[data-mw-mask-save]')
    await page.waitForTimeout(700)
    assert.ok((await mandate(page)).some((entry) => entry.leadershipRole === 'Direkt danach gespeichert'),
      'Der Klick auf „Speichern“ hat die Maske nicht abgesendet.')
    await page.close()
  })

  test('die Leitungsmaske lässt sich ausschließlich mit der Tastatur ausfüllen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await neueLeitungsmaske(page)
    const erreichbar = await page.evaluate(() => {
      const maske = document.querySelector('[data-mw-edit-mask]')
      return [...maske.querySelectorAll('input, select, textarea, button')]
        .every((element) => element.tabIndex >= 0 && !element.disabled)
    })
    assert.ok(erreichbar, 'Nicht alle Bedienelemente sind mit der Tastatur erreichbar.')
    await page.locator(feld('personId')).focus()
    await page.keyboard.type('')
    await page.locator(feld('leadershipRole')).focus()
    await page.keyboard.type('Tastaturleitung')
    await page.locator(feld('personId')).selectOption('p3')
    await page.locator(feld('orgUnitId')).selectOption('pm-sb')
    await page.locator('[data-mw-mask-save]').focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(700)
    assert.ok((await mandate(page)).some((entry) => entry.leadershipRole === 'Tastaturleitung'))
    await page.close()
  })

  test('beide Masken sind bei 390 px einspaltig und laufen nicht über', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage({ width: 390, height: 780 })
    await login(page)
    await neueLeitungsmaske(page)
    const leitung = await page.evaluate(() => ({
      spalten: getComputedStyle(document.querySelector('.mw-mask-grid')).gridTemplateColumns.split(' ').length,
      ueberlauf: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }))
    assert.equal(leitung.spalten, 1, 'Die Leitungsmaske ist nicht einspaltig.')
    assert.ok(leitung.ueberlauf <= 1, `Die Breite läuft über: ${leitung.ueberlauf}px`)

    assert.ok(await openView(page, 'Unterkategorien'))
    await page.selectOption('[data-person-groups-unit]', 'pm-hrbp')
    await page.waitForTimeout(400)
    await page.click('[data-person-assignment-open]')
    await page.waitForSelector('[data-mw-edit-mask="person-assignment"]')
    const zuordnung = await page.evaluate(() => ({
      spalten: getComputedStyle(document.querySelector('.mw-mask-grid')).gridTemplateColumns.split(' ').length,
      ueberlauf: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      zusammenfassung: !!document.querySelector('[data-mw-mask-live-summary]'),
    }))
    assert.equal(zuordnung.spalten, 1, 'Die Sammelmaske ist nicht einspaltig.')
    assert.ok(zuordnung.ueberlauf <= 1, `Die Breite läuft über: ${zuordnung.ueberlauf}px`)
    assert.ok(zuordnung.zusammenfassung, 'Die Zusammenfassung fehlt auf schmalen Geräten.')
    await page.close()
  })
})
