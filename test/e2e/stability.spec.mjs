/**
 * Browser- und Stabilitätstests der Demo.
 *
 * Bewusst ohne Test-Framework-Abhängigkeit: Der Node-Test-Runner steuert einen
 * Chromium über Playwright und misst dabei Beobachteraufrufe,
 * requestAnimationFrame-Aufrufe und die DOM-Knotenzahl.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const PORT = Number(process.env.MW_TEST_PORT || 4310)
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
  const launch = { }
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) launch.executablePath = '/opt/pw-browsers/chromium'
  browser = await chromium.launch(launch).catch(() => chromium.launch())
})

after(async () => {
  await browser?.close()
  server?.close()
})

/** Öffnet eine Seite mit Messsonde für Beobachter und requestAnimationFrame. */
const openPage = async (viewport = { width: 1440, height: 900 }) => {
  const page = await browser.newPage({ viewport })
  const errors = []
  const rejections = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => {
    const s = { cb: 0, raf: 0 }
    window.__s = s
    const Native = window.MutationObserver
    window.MutationObserver = class extends Native {
      constructor(callback) { super((records, observer) => { s.cb += 1; return callback(records, observer) }) }
    }
    const raf = window.requestAnimationFrame
    window.requestAnimationFrame = (fn) => { s.raf += 1; return raf(fn) }
    window.addEventListener('unhandledrejection', (event) => {
      window.__rejections = window.__rejections || []
      window.__rejections.push(String(event.reason))
    })
  })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  return { page, errors, rejections }
}

const login = async (page, role = 'admin') => {
  await page.selectOption('#roleSelect', role, { timeout: 8000 })
  await page.getByRole('button', { name: 'Demo starten' }).click({ timeout: 8000 })
  await page.waitForSelector('#nav button', { timeout: 8000 })
  await page.waitForTimeout(500)
}

const readStats = (page) => page.evaluate(() => ({
  ...window.__s,
  dom: document.getElementsByTagName('*').length,
  rejections: (window.__rejections || []).length,
}))

const skipIfNoBrowser = (t) => {
  if (!chromium || !browser) { t.skip('Playwright ist nicht verfügbar'); return true }
  return false
}

describe('Laufzeitstabilität', () => {
  test('1. Die Loginseite erscheint', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    assert.ok(await page.locator('#loginPage').isVisible())
    assert.equal(await page.locator('#roleSelect option').count(), 4)
    await page.close()
  })

  test('2./3. Login funktioniert und die Seite reagiert weiter', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    assert.ok(await page.locator('#app').isVisible())
    assert.ok(await page.evaluate(() => document.getElementsByTagName('*').length) > 100)
    await page.close()
  })

  test('4./5. Keine Console Errors und keine Unhandled Rejections', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, errors } = await openPage()
    await login(page)
    await page.waitForTimeout(1000)
    const stats = await readStats(page)
    assert.deepEqual(errors, [], 'Konsolenfehler: ' + errors.join(' | '))
    assert.equal(stats.rejections, 0)
    await page.close()
  })

  test('6. Navigation kann mehrfach gewechselt werden', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, errors } = await openPage()
    await login(page)
    const groups = await page.locator('[data-mw-main-group]:not([hidden])').count()
    assert.ok(groups >= 2, `zu wenige Hauptbereiche: ${groups}`)
    for (let round = 0; round < 3; round += 1) {
      const buttons = page.locator('[data-mw-main-group]:not([hidden])')
      for (let i = 0; i < await buttons.count(); i += 1) {
        await buttons.nth(i).click({ timeout: 5000 })
        await page.waitForTimeout(120)
      }
    }
    assert.deepEqual(errors, [])
    await page.close()
  })

  test('7./8. Nach drei Sekunden Leerlauf bleiben DOM und Renderzyklen stabil', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await page.waitForTimeout(800)
    const before = await readStats(page)
    await page.waitForTimeout(3000)
    const after = await readStats(page)
    assert.equal(after.dom, before.dom, `DOM-Knotenzahl wuchs von ${before.dom} auf ${after.dom}`)
    assert.ok(after.cb - before.cb < 20, `zu viele Beobachteraufrufe im Leerlauf: ${after.cb - before.cb}`)
    assert.ok(after.raf - before.raf < 20, `dauerhafte Renderzyklen: ${after.raf - before.raf}`)
    await page.close()
  })

  test('9. Leser sieht keine Administrationsbereiche', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    const labels = await page.$$eval('#nav button', (nodes) => nodes.filter((n) => !n.hidden).map((n) => n.textContent.trim()))
    assert.ok(!labels.includes('Benutzerverwaltung'), 'Leser darf keine Benutzerverwaltung sehen')
    assert.ok(!labels.some((l) => /Organisationstypen|Systemeinstellungen/.test(l)))
    await page.close()
  })

  test('10. Superadministration sieht alle Hauptbereiche', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'superadmin')
    const groups = await page.$$eval('[data-mw-main-group]', (nodes) => nodes.filter((n) => !n.hidden).length)
    assert.equal(groups, 4, `erwartet 4 Hauptbereiche, gefunden ${groups}`)
    await page.close()
  })

  test('11./12./13. Organigramm, Suche und Personenprofil', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, errors } = await openPage()
    await login(page)
    await page.waitForSelector('.node', { timeout: 8000 })
    assert.ok(await page.locator('.node').count() > 5)

    // Die Suche läuft über Live-Eingabe; die Schaltfläche ist bewusst ausgeblendet.
    const search = page.locator('#searchInput')
    if (await search.count()) {
      await search.fill('Lea')
      await search.press('Enter')
      await page.waitForTimeout(600)
      assert.ok(await page.locator('.node.highlight').count() > 0, 'Suche liefert keine Treffer')
    }

    await page.locator('.node.person').first().evaluate((el) => el.click())
    await page.waitForTimeout(400)
    assert.ok(await page.locator('#drawer').isVisible(), 'Personenprofil öffnet nicht')
    await page.locator('.drawer-close').first().evaluate((el) => el.click())
    await page.waitForTimeout(300)
    assert.ok(await page.locator('#drawer.hidden').count() > 0, 'Personenprofil schließt nicht')
    assert.deepEqual(errors, [])
    await page.close()
  })

  test('14./15./16. Mobile und Desktop blockieren nicht, Wechsel erzeugt keine Schleife', async (t) => {
    if (skipIfNoBrowser(t)) return
    for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 1920, height: 1080 }]) {
      const { page, errors } = await openPage(viewport)
      await login(page)
      const before = await readStats(page)
      await page.waitForTimeout(1500)
      const after = await readStats(page)
      assert.ok(after.raf - before.raf < 20, `Schleife bei ${viewport.width}px: ${after.raf - before.raf} rAF`)
      assert.deepEqual(errors, [], `Fehler bei ${viewport.width}px`)
      await page.close()
    }

    const { page } = await openPage({ width: 1440, height: 900 })
    await login(page)
    for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 412, height: 915 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(350)
    }
    const before = await readStats(page)
    await page.waitForTimeout(2000)
    const after = await readStats(page)
    assert.ok(after.raf - before.raf < 20, `Schleife nach Größenwechsel: ${after.raf - before.raf} rAF`)
    assert.equal(after.dom, before.dom)
    await page.close()
  })

  test('17./18. Leerer Speicher und vorhandene Demo-Daten', async (t) => {
    if (skipIfNoBrowser(t)) return
    const leer = await openPage()
    await login(leer.page)
    assert.deepEqual(leer.errors, [])
    await leer.page.close()

    const { page, errors } = await openPage()
    await login(page)
    await page.waitForTimeout(600)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    assert.ok(await page.evaluate(() => document.getElementsByTagName('*').length) > 50)
    assert.deepEqual(errors, [])
    await page.close()
  })

  test('19. Reset stellt einen stabilen Ausgangszustand her', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, errors } = await openPage()
    await login(page)
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Demo zurücksetzen' }).click()
    await page.waitForTimeout(900)
    const before = await readStats(page)
    await page.waitForTimeout(2000)
    const after = await readStats(page)
    assert.ok(after.raf - before.raf < 20, `Schleife nach Reset: ${after.raf - before.raf}`)
    assert.deepEqual(errors, [])
    await page.close()
  })
})
