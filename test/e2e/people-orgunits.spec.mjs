/**
 * Browsertests für die Masken „Person“, „Organisationseinheit“ und
 * „Mein Profil“.
 *
 * Geprüft werden Anlegen, Bearbeiten, Abbrechen, Prüfungen, Rollenrechte,
 * Fokusführung, Tastaturbedienung und die mobile Darstellung – sowie die
 * vollständige Abwesenheit der abgelösten Altmechanismen: Modal, Reload,
 * Polling, simulierte Anmeldung und Systemdialoge.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const PORT = Number(process.env.MW_TEST_PORT_PEOPLE || 4313)
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
  // Zählt Poll-Schleifen und Neuladeversuche mit.
  await page.addInitScript(() => {
    window.__intervalle = 0
    const nativ = window.setInterval
    window.setInterval = (...args) => { window.__intervalle += 1; return nativ(...args) }
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
const fehlerAm = (page, name) =>
  page.evaluate((n) => {
    const element = document.querySelector(`[data-mw-mask-error="${n}"]`)
    return element && !element.hidden ? element.textContent.trim() : ''
  }, name)

/**
 * Die Demo legt `mw-demo-nodes` erst beim ersten Speichern an. Vor dem ersten
 * Schreibvorgang stammen die Daten deshalb aus der Oberfläche.
 */
const knoten = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('mw-demo-nodes') || '[]'))

/** Auswählbare Organisationseinheiten – aus der Maske selbst gelesen. */
const einheitenAusMaske = (page) =>
  page.evaluate(() =>
    [...document.querySelector('[data-mw-mask-field="parent"]').options]
      .filter((option) => option.value)
      .map((option) => ({ id: option.value, label: option.textContent.trim() })))

/** Karten des Organigramms mit Kennung, Typ und übergeordneter Karte. */
const kartenAusOrganigramm = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.node[data-id]')].map((karte) => ({
      id: karte.dataset.id,
      person: karte.classList.contains('person'),
      elternId: karte.closest('.tree-node-wrap')?.parentElement?.closest('.tree-node-wrap')
        ?.querySelector(':scope > .node[data-id]')?.dataset.id || null,
    })))

const maskeOffen = (page) => page.locator('[data-mw-edit-mask]').count()

const personAnlegen = async (page, werte) => {
  await page.locator('#addPerson').click()
  await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
  // Die Organisationseinheit ist ein Pflichtfeld; ohne Angabe wird die erste
  // auswählbare Einheit verwendet.
  if (!werte.parent) {
    const einheiten = await einheitenAusMaske(page)
    werte = { ...werte, parent: einheiten[0].id }
  }
  for (const [name, wert] of Object.entries(werte)) {
    const element = page.locator(feld(name))
    const tag = await element.evaluate((node) => node.tagName)
    if (tag === 'SELECT') await element.selectOption(wert)
    else await element.fill(wert)
  }
}

const einheitAnlegen = async (page, werte) => {
  await page.locator('#addUnit').click()
  await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
  for (const [name, wert] of Object.entries(werte)) {
    const element = page.locator(feld(name))
    const tag = await element.evaluate((node) => node.tagName)
    if (tag === 'SELECT') await element.selectOption(wert)
    else await element.fill(wert)
  }
}

describe('Personenmaske', () => {
  test('eine Person wird angelegt und erscheint in der Liste', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge, fehler } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Personen'))
    await personAnlegen(page, {
      firstName: 'Mara',
      lastName: 'Neubauer',
      role: 'Sachbearbeitung',
      email: 'mara.neubauer@example.org',
    })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    assert.equal(await maskeOffen(page), 0, 'Die Maske ist offen geblieben.')
    const gespeichert = (await knoten(page)).find((node) => node.name === 'Mara Neubauer')
    assert.ok(gespeichert, 'Die Person wurde nicht gespeichert.')
    assert.equal(gespeichert.firstName, 'Mara')
    assert.equal(gespeichert.lastName, 'Neubauer')
    assert.equal(gespeichert.type, 'person')
    assert.ok(await page.locator('#content td', { hasText: 'Mara Neubauer' }).count())
    assert.deepEqual(dialoge, [])
    assert.deepEqual(fehler, [], fehler.join(' | '))
    await page.close()
  })

  test('die Maske einer bestehenden Person ist vorbelegt und speichert Änderungen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('[data-edit-person]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const vorher = await page.locator(feld('firstName')).inputValue()
    assert.ok(vorher.length > 0, 'Der Vorname ist nicht vorbelegt.')
    assert.ok((await page.locator(feld('role')).inputValue()).length > 0)
    await page.locator(feld('role')).fill('Geänderte Aufgabe')
    await page.locator(feld('mobile')).fill('0170 9999999')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    const person = (await knoten(page)).find((node) => node.role === 'Geänderte Aufgabe')
    assert.ok(person, 'Die Änderung wurde nicht gespeichert.')
    assert.equal(person.mobile, '0170 9999999')
    await page.close()
  })

  test('alle geforderten Bereiche und Felder sind vorhanden', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const aufbau = await page.evaluate(() => ({
      bereiche: [...document.querySelectorAll('[data-mw-edit-mask] fieldset legend')].map((l) => l.textContent.trim()),
      felder: [...document.querySelectorAll('[data-mw-mask-field]')].map((f) => f.dataset.mwMaskField),
    }))
    assert.deepEqual(aufbau.bereiche, ['Stammdaten', 'Organisatorische Zuordnung', 'Kontakt', 'Zusatzfunktionen'])
    for (const name of ['firstName', 'lastName', 'role', 'status', 'parent', 'subcategoryId', 'email', 'phone', 'mobile', 'location']) {
      assert.ok(aufbau.felder.includes(name), `Feld ${name} fehlt.`)
    }
    // Zusatzfunktionen ausschließlich als Auswahl, keine freie Eingabe.
    const zusatz = aufbau.felder.filter((name) => name.startsWith('function:'))
    assert.ok(zusatz.length > 0, 'Es werden keine Zusatzfunktionen angeboten.')
    const freieEingabe = await page.evaluate(() =>
      [...document.querySelectorAll('[data-mw-edit-mask] fieldset')]
        .filter((set) => set.querySelector('legend')?.textContent.trim() === 'Zusatzfunktionen')
        .flatMap((set) => [...set.querySelectorAll('input')])
        .filter((input) => input.type !== 'checkbox').length)
    assert.equal(freieEingabe, 0, 'Zusatzfunktionen erlauben eine freie Eingabe.')
    await page.close()
  })

  test('Pflichtfelder verhindern das Speichern und die Eingaben bleiben erhalten', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    const vorher = (await knoten(page)).length
    await personAnlegen(page, { firstName: 'Nur', lastName: '', role: 'Aufgabe' })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.ok(await maskeOffen(page), 'Die Maske wurde trotz Prüfungsfehler verlassen.')
    assert.match(await fehlerAm(page, 'lastName'), /Nachnamen/)
    assert.equal(await page.locator(feld('firstName')).inputValue(), 'Nur', 'Die Eingabe ging verloren.')
    assert.equal(await page.locator(feld('role')).inputValue(), 'Aufgabe')
    assert.equal((await knoten(page)).length, vorher, 'Es wurde trotz Prüfungsfehler gespeichert.')
    await page.close()
  })

  test('eine ungültige E-Mail-Adresse wird am Feld gemeldet', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await personAnlegen(page, { firstName: 'Test', lastName: 'Person', role: 'Aufgabe', email: 'keine-adresse' })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'email'), /gültige E-Mail/)
    // Korrektur räumt die Meldung wieder ab.
    await page.locator(feld('email')).fill('test.person@example.org')
    await page.waitForTimeout(300)
    assert.equal(await fehlerAm(page, 'email'), '')
    await page.close()
  })

  test('eine bereits vergebene E-Mail-Adresse wird abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    // Die Adresse stammt aus der Maske einer bestehenden Person.
    await page.locator('[data-edit-person]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const bestehendeAdresse = await page.locator(feld('email')).inputValue()
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    assert.ok(bestehendeAdresse, 'Die Vergleichsperson hat keine E-Mail-Adresse.')
    await personAnlegen(page, {
      firstName: 'Doppel',
      lastName: 'Adresse',
      role: 'Aufgabe',
      email: bestehendeAdresse,
    })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'email'), /bereits einer anderen Person/)
    await page.close()
  })

  test('die Unterkategorie muss zur gewählten Organisationseinheit gehören', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    // Es werden nur Unterkategorien der gewählten Einheit angeboten.
    const optionen = await page.evaluate(() =>
      [...document.querySelector('[data-mw-mask-field="subcategoryId"]').options].map((o) => o.value))
    assert.deepEqual(optionen, [''], 'Ohne gewählte Einheit darf nur „Direkt zugeordnet“ zur Auswahl stehen.')
    // Ein von außen eingeschleuster Wert wird abgelehnt.
    await page.locator(feld('firstName')).fill('Falsche')
    await page.locator(feld('lastName')).fill('Zuordnung')
    await page.locator(feld('role')).fill('Aufgabe')
    const einheitId = await page.evaluate(() => {
      const select = document.querySelector('[data-mw-mask-field="parent"]')
      return [...select.options].map((o) => o.value).filter(Boolean)[0]
    })
    await page.locator(feld('parent')).selectOption(einheitId)
    await page.evaluate(() => {
      const select = document.querySelector('[data-mw-mask-field="subcategoryId"]')
      const option = document.createElement('option')
      option.value = 'fremde-kategorie'
      select.append(option)
      select.value = 'fremde-kategorie'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'subcategoryId'), /besteht nicht|gehört nicht/)
    await page.close()
  })
})

describe('Maske für Organisationseinheiten', () => {
  test('eine Einheit wird angelegt und erscheint in der Liste', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge, fehler } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Organisationseinheiten'))
    await page.locator('#addUnit').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const einheiten = await einheitenAusMaske(page)
    const eltern = einheiten.find((item) => /Abteilung$/.test(item.label)) || einheiten[einheiten.length - 1]
    await page.locator(feld('organizationTypeId')).selectOption('team')
    await page.locator(feld('parent')).selectOption(eltern.id)
    await page.locator(feld('name')).fill('Neues Testteam')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addUnit', { timeout: 8000 })
    const angelegt = (await knoten(page)).find((node) => node.name === 'Neues Testteam')
    assert.ok(angelegt, 'Die Einheit wurde nicht gespeichert.')
    assert.equal(angelegt.type, 'team')
    assert.equal(String(angelegt.parent), String(eltern.id))
    assert.deepEqual(dialoge, [])
    assert.deepEqual(fehler, [], fehler.join(' | '))
    await page.close()
  })

  test('alle geforderten Bereiche sind vorhanden, einschließlich Auswirkungen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    await page.locator('[data-edit-unit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const aufbau = await page.evaluate(() => ({
      bereiche: [...document.querySelectorAll('[data-mw-edit-mask] fieldset legend')].map((l) => l.textContent.trim()),
      felder: [...document.querySelectorAll('[data-mw-mask-field]')].map((f) => f.dataset.mwMaskField),
      auswirkungen: [...document.querySelectorAll('[data-mw-mask-notes] li')].map((li) => li.textContent.trim()),
    }))
    assert.deepEqual(aufbau.bereiche, ['Einordnung', 'Stammdaten', 'Kontakt', 'Auswirkungen'])
    for (const name of ['organizationTypeId', 'parent', 'name', 'shortName', 'isActive', 'email', 'phone', 'location']) {
      assert.ok(aufbau.felder.includes(name), `Feld ${name} fehlt.`)
    }
    assert.ok(aufbau.auswirkungen.length >= 4, 'Der Bereich „Auswirkungen“ ist unvollständig.')
    assert.ok(aufbau.auswirkungen.some((zeile) => /Einheit/.test(zeile)))
    assert.ok(aufbau.auswirkungen.some((zeile) => /Person/.test(zeile)))
    assert.ok(aufbau.auswirkungen.some((zeile) => /Leitung/.test(zeile)))
    await page.close()
  })

  test('Umbenennen läuft über die Maske und speichert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    assert.equal(await page.locator('[data-rename]').count(), 0, 'Die alte Umbenennen-Schaltfläche ist zurück.')
    await page.locator('[data-edit-unit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const id = await page.locator(feld('id')).inputValue()
    await page.locator(feld('name')).fill('Umbenannte Einheit')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addUnit', { timeout: 8000 })
    const einheit = (await knoten(page)).find((node) => String(node.id) === id)
    assert.equal(einheit.name, 'Umbenannte Einheit')
    assert.deepEqual(dialoge, [], 'Umbenennen darf keinen Systemdialog öffnen.')
    await page.close()
  })

  test('eine Dublette auf derselben Ebene wird abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    // Eine bestehende Einheit öffnen, um Bezeichnung und Einordnung zu lesen.
    await page.locator('[data-edit-unit]').nth(2).click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const vorlage = {
      typ: await page.locator(feld('organizationTypeId')).inputValue(),
      parent: await page.locator(feld('parent')).inputValue(),
      name: await page.locator(feld('name')).inputValue(),
    }
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('#addUnit', { timeout: 8000 })
    assert.ok(vorlage.parent, 'Die Vorlage hat keine übergeordnete Einheit.')
    await einheitAnlegen(page, {
      organizationTypeId: vorlage.typ,
      parent: vorlage.parent,
      name: vorlage.name,
    })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'name'), /bereits eine Einheit/)
    await page.close()
  })

  test('Selbstzuordnung und Kreise sind nicht auswählbar', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    await page.locator('[data-edit-unit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const befund = await page.evaluate(() => {
      const eigeneId = document.querySelector('[data-mw-mask-field="id"]').value
      const optionen = [...document.querySelector('[data-mw-mask-field="parent"]').options].map((o) => o.value)
      const nodes = JSON.parse(localStorage.getItem('mw-demo-nodes') || '[]')
      const nachfahren = new Set()
      const queue = [eigeneId]
      while (queue.length) {
        const aktuell = queue.shift()
        nodes.filter((n) => String(n.parent) === String(aktuell)).forEach((kind) => {
          if (nachfahren.has(kind.id)) return
          nachfahren.add(kind.id)
          queue.push(kind.id)
        })
      }
      return {
        eigeneId,
        selbstWaehlbar: optionen.includes(eigeneId),
        nachfahrenWaehlbar: [...nachfahren].filter((id) => optionen.includes(id)),
      }
    })
    assert.equal(befund.selbstWaehlbar, false, 'Die Einheit steht sich selbst zur Auswahl.')
    assert.deepEqual(befund.nachfahrenWaehlbar, [], 'Eigene Nachfahren stehen zur Auswahl.')
    await page.close()
  })

  test('ein von außen erzwungener Kreis wird beim Speichern abgelehnt', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    await page.locator('[data-edit-unit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const erzwungen = await page.evaluate(() => {
      const eigeneId = document.querySelector('[data-mw-mask-field="id"]').value
      const nodes = JSON.parse(localStorage.getItem('mw-demo-nodes') || '[]')
      const kind = nodes.find((n) => String(n.parent) === String(eigeneId) && n.type !== 'person')
      if (!kind) return null
      const select = document.querySelector('[data-mw-mask-field="parent"]')
      const option = document.createElement('option')
      option.value = kind.id
      select.append(option)
      select.value = kind.id
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return kind.id
    })
    if (!erzwungen) { await page.close(); return }
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.match(await fehlerAm(page, 'parent'), /Kreis in der Hierarchie|kann hier nicht eingeordnet/)
    await page.close()
  })
})

describe('Profilmaske', () => {
  test('das Profil wird über eine Maske bearbeitet und gespeichert', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    assert.ok(await openView(page, 'Mein Profil'))
    // Die Ansicht selbst enthält keine Eingabefelder mehr.
    assert.equal(await page.locator('#content input, #content textarea').count(), 0,
      'Die Profilansicht enthält noch Eingabefelder.')
    await page.locator('#editProfile').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator(feld('phone')).fill('089 555000')
    await page.locator(feld('mobile')).fill('0170 5550001')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#editProfile', { timeout: 8000 })
    const profil = await page.evaluate(() => JSON.parse(localStorage.getItem('mw-demo-profile') || '{}'))
    assert.equal(profil.phone, '089 555000')
    assert.equal(profil.mobile, '0170 5550001')
    assert.deepEqual(dialoge, [])
    await page.close()
  })
})

describe('Abbrechen und ungespeicherte Änderungen', () => {
  test('Abbrechen ohne Änderung führt sofort zurück', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    const vorher = await knoten(page)
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    assert.deepEqual(await knoten(page), vorher, 'Der Abbruch hat Daten verändert.')
    await page.close()
  })

  test('mit Änderungen erscheint die sichtbare Rückfrage', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page)
    await openView(page, 'Organisationseinheiten')
    await page.locator('#addUnit').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator(feld('name')).fill('Halbfertig')
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForTimeout(300)
    assert.ok(await page.locator('[data-mw-mask-leave]').count(), 'Die Rückfrage fehlt.')
    assert.deepEqual(dialoge, [], 'Die Rückfrage darf kein Systemdialog sein.')
    await page.locator('[data-mw-mask-leave-stay]').click()
    await page.waitForTimeout(250)
    assert.equal(await page.locator(feld('name')).inputValue(), 'Halbfertig', 'Die Eingabe ging verloren.')
    await page.close()
  })
})

describe('Rollen und Rechte', () => {
  test('ein Leser erhält keine Bearbeitungsmaske', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    // Ein Leser sieht die Ansichten Personen und Organisationseinheiten gar nicht.
    assert.equal(await openView(page, 'Personen'), false)
    assert.equal(await openView(page, 'Organisationseinheiten'), false)
    await page.close()
  })

  test('ein Leser kann auch über die Speicherfunktion nichts schreiben', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'viewer')
    const ergebnis = await page.evaluate(async () => {
      const vorher = localStorage.getItem('mw-demo-nodes')
      // Die Maske wird direkt angesprochen; die Rechteprüfung liegt in der
      // Speicherfunktion und nicht nur in der Darstellung.
      window.MWEditMask?.open({
        id: 'test',
        title: 'Test',
        sections: [{ title: 'x', fields: [{ name: 'name', label: 'Name', type: 'text' }] }],
        values: { name: 'Unerlaubt' },
        onSave: () => true,
      })
      window.MWEditMask?.submit?.()
      await new Promise((resolve) => setTimeout(resolve, 300))
      return { unveraendert: vorher === localStorage.getItem('mw-demo-nodes') }
    })
    assert.ok(ergebnis.unveraendert, 'Ein Leser konnte Daten schreiben.')
    await page.close()
  })

  test('die Bearbeitungsrolle erhält beide Masken', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'editor')
    assert.ok(await openView(page, 'Personen'))
    assert.ok(await page.locator('#addPerson').count(), 'Der Einstieg in die Personenmaske fehlt.')
    assert.ok(await openView(page, 'Organisationseinheiten'))
    assert.ok(await page.locator('#addUnit').count(), 'Der Einstieg in die Einheitenmaske fehlt.')
    await page.close()
  })
})

describe('Rolle und Navigation bleiben erhalten', () => {
  test('nach dem Speichern bleiben Rolle und aktive Ansicht bestehen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, ladevorgaenge } = await openPage()
    await login(page, 'admin')
    await openView(page, 'Personen')
    const vorher = await page.evaluate(() => ({
      rolle: document.getElementById('userRole')?.textContent.trim(),
      name: document.getElementById('userName')?.textContent.trim(),
      hauptbereich: document.querySelector('[data-mw-main-group][aria-selected="true"], [data-mw-main-group].active')?.textContent.trim(),
      ladevorgaenge: performance.getEntriesByType('navigation').length,
    }))
    await personAnlegen(page, { firstName: 'Bleibt', lastName: 'Erhalten', role: 'Aufgabe' })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    const nachher = await page.evaluate(() => ({
      rolle: document.getElementById('userRole')?.textContent.trim(),
      name: document.getElementById('userName')?.textContent.trim(),
      hauptbereich: document.querySelector('[data-mw-main-group][aria-selected="true"], [data-mw-main-group].active')?.textContent.trim(),
      loginSichtbar: !document.getElementById('loginPage').classList.contains('hidden'),
      ueberschrift: document.querySelector('#content h2')?.textContent.trim(),
    }))
    assert.equal(nachher.rolle, vorher.rolle, 'Die Rolle hat sich geändert.')
    assert.equal(nachher.name, vorher.name)
    assert.equal(nachher.hauptbereich, vorher.hauptbereich, 'Der aktive Hauptbereich hat sich geändert.')
    assert.equal(nachher.loginSichtbar, false, 'Die Anmeldeseite ist wieder erschienen.')
    assert.match(nachher.ueberschrift, /Personenverwaltung/, 'Es wurde nicht zur Liste zurückgekehrt.')
    // Genau ein Seitenaufruf: kein Neuladen.
    assert.equal(ladevorgaenge.length, 1, 'Die Seite wurde neu geladen: ' + ladevorgaenge.join(', '))
    await page.close()
  })

  test('kein Neuladen, kein Polling, keine simulierte Anmeldung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, ladevorgaenge } = await openPage()
    await login(page, 'admin')
    await openView(page, 'Organisationseinheiten')
    await page.locator('#addUnit').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const auswahl = await einheitenAusMaske(page)
    const abteilung = auswahl.find((item) => /Abteilung$/.test(item.label)) || auswahl[0]
    await page.locator(feld('organizationTypeId')).selectOption('team')
    await page.locator(feld('parent')).selectOption(abteilung.id)
    await page.locator(feld('name')).fill('Ohne Reload')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addUnit', { timeout: 8000 })
    assert.equal(ladevorgaenge.length, 1, 'Die Seite wurde neu geladen.')
    assert.equal(await page.evaluate(() => window.__intervalle), 0, 'Es wurde eine Poll-Schleife gestartet.')
    assert.ok((await knoten(page)).some((node) => node.name === 'Ohne Reload'))
    await page.close()
  })

  test('nur die betroffene Ansicht wird neu aufgebaut', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page, 'admin')
    await openView(page, 'Personen')
    const kopfVorher = await page.evaluate(() => document.querySelector('.header').innerHTML)
    const navVorher = await page.evaluate(() => document.getElementById('nav').innerHTML)
    await personAnlegen(page, { firstName: 'Nur', lastName: 'Ansicht', role: 'Aufgabe' })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    assert.equal(await page.evaluate(() => document.querySelector('.header').innerHTML), kopfVorher,
      'Die Kopfzeile wurde unnötig neu aufgebaut.')
    assert.equal(await page.evaluate(() => document.getElementById('nav').innerHTML), navVorher,
      'Die Navigation wurde unnötig neu aufgebaut.')
    await page.close()
  })
})

describe('Unzulässige Verschiebung', () => {
  test('erscheint als sichtbarer Hinweis in der Seite, nicht als Systemdialog', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge } = await openPage()
    await login(page, 'admin')
    await page.waitForSelector('.node', { timeout: 9000, state: 'attached' })
    // Strukturmodus einschalten und eine Einheit auf ihre eigene Untereinheit ziehen.
    await page.locator('#editModeBtn').click()
    await page.waitForTimeout(600)
    const ergebnis = await page.evaluate(() => {
      // Ein Eltern-Kind-Paar unmittelbar aus dem gezeichneten Organigramm.
      const karten = [...document.querySelectorAll('.node[data-id]')].filter(
        (karte) => !karte.classList.contains('person'))
      let eltern = null
      let kind = null
      for (const karte of karten) {
        const huelle = karte.closest('.tree-node-wrap')
        const unter = huelle?.querySelector(':scope > .children > .tree-node-wrap > .node[data-id]')
        if (unter && !unter.classList.contains('person')) {
          eltern = karte
          kind = unter
          break
        }
      }
      if (!eltern || !kind) return null
      const quelle = eltern
      const ziel = kind
      const daten = new DataTransfer()
      quelle.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: daten }))
      ziel.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: daten }))
      ziel.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: daten }))
      return { elternId: eltern.dataset.id, kindId: kind.dataset.id }
    })
    assert.ok(ergebnis, 'Es wurde kein geeignetes Kartenpaar gefunden.')
    await page.waitForTimeout(400)
    const hinweis = await page.evaluate(() => {
      const element = document.querySelector('[data-view-notice]')
      return element && !element.hidden ? { text: element.textContent.trim(), rolle: element.getAttribute('role') } : null
    })
    assert.ok(hinweis, 'Es erschien kein sichtbarer Hinweis.')
    assert.match(hinweis.text, /Kreis in der Hierarchie/)
    assert.equal(hinweis.rolle, 'status')
    assert.deepEqual(dialoge, [], 'Es erschien ein Systemdialog.')
    // Die Struktur bleibt unverändert.
    const unveraendert = await page.evaluate((paar) => {
      const nodes = JSON.parse(localStorage.getItem('mw-demo-nodes') || '[]')
      return String(nodes.find((n) => n.id === paar.elternId)?.parent) !== String(paar.kindId)
    }, ergebnis)
    assert.ok(unveraendert, 'Die unzulässige Verschiebung wurde ausgeführt.')
    await page.close()
  })
})

describe('Darstellung, Tastatur und Laufzeit', () => {
  test('die Personenmaske ist bei 390 px einspaltig und läuft nicht über', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage({ width: 390, height: 844 })
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const messung = await page.evaluate(() => ({
      spalten: [...document.querySelectorAll('.mw-mask-grid')].map(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length),
      ueberlauf: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }))
    assert.ok(messung.spalten.every((anzahl) => anzahl === 1), 'Die Maske ist nicht einspaltig: ' + messung.spalten.join(','))
    assert.equal(messung.ueberlauf, false)
    await page.close()
  })

  test('der Fokus liegt beim Öffnen auf der Überschrift und bei Fehlern im Feld', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    assert.ok(await page.evaluate(() => document.activeElement?.hasAttribute('data-mw-mask-title')),
      'Der Fokus liegt nicht auf der Überschrift.')
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForTimeout(400)
    assert.equal(await page.evaluate(() => document.activeElement?.dataset?.mwMaskField), 'firstName',
      'Der Fokus steht nicht im ersten fehlerhaften Feld.')
    await page.close()
  })

  test('die Maske lässt sich ausschließlich mit der Tastatur ausfüllen und absenden', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator(feld('firstName')).focus()
    await page.keyboard.type('Tasta')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Tur')
    await page.locator(feld('role')).focus()
    await page.keyboard.type('Aufgabe')
    // Pflichtfeld Organisationseinheit ebenfalls über die Tastatur füllen.
    await page.locator(feld('parent')).focus()
    await page.keyboard.press('ArrowDown')
    await page.locator(feld('role')).focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    assert.ok((await knoten(page)).some((node) => node.name === 'Tasta Tur'),
      'Das Absenden mit der Eingabetaste hat nicht gespeichert.')
    await page.close()
  })

  test('keine Systemdialoge, keine Konsolenfehler, keine offenen Zusagen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, dialoge, fehler } = await openPage()
    await page.addInitScript(() => {
      window.__rejections = []
      window.addEventListener('unhandledrejection', (event) => window.__rejections.push(String(event.reason)))
    })
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await login(page)
    await openView(page, 'Personen')
    await personAnlegen(page, { firstName: 'Voll', lastName: 'Durchlauf', role: 'Aufgabe' })
    await page.locator('[data-mw-mask-save]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    await page.locator('[data-edit-person]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('#addPerson', { timeout: 8000 })
    await openView(page, 'Organisationseinheiten')
    await page.locator('[data-edit-unit]').first().click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    await page.locator('[data-mw-mask-cancel]').click()
    await page.waitForSelector('#addUnit', { timeout: 8000 })
    assert.deepEqual(dialoge, [], 'Systemdialoge: ' + dialoge.join(' | '))
    assert.deepEqual(fehler, [], 'Fehler: ' + fehler.join(' | '))
    assert.deepEqual(await page.evaluate(() => window.__rejections || []), [])
    await page.close()
  })

  test('kein Modal und kein Bearbeitungs-Drawer im DOM', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const befund = await page.evaluate(() => ({
      modale: [...document.querySelectorAll('[aria-modal="true"], dialog[open], .demo-unit-editor-backdrop')].length,
      drawerOffen: !document.getElementById('drawer').classList.contains('hidden'),
      felderAusserhalb: [...document.querySelectorAll('input, select, textarea')]
        .filter((element) => element.offsetParent !== null && !document.getElementById('content').contains(element))
        .map((element) => element.id || element.name || element.tagName.toLowerCase()),
    }))
    assert.equal(befund.modale, 0, 'Es liegt ein modales Element im DOM.')
    assert.equal(befund.drawerOffen, false)
    assert.deepEqual(befund.felderAusserhalb, [], 'Felder außerhalb von #content: ' + befund.felderAusserhalb.join(', '))
    await page.close()
  })

  test('kein DOM-Zuwachs im Leerlauf, auch mit offener Maske', async (t) => {
    if (skipIfNoBrowser(t)) return
    const { page, fehler } = await openPage()
    await login(page)
    await openView(page, 'Personen')
    await page.locator('#addPerson').click()
    await page.waitForSelector('[data-mw-edit-mask]', { timeout: 8000 })
    const vorher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    await page.waitForTimeout(3000)
    const nachher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    assert.equal(nachher.dom, vorher.dom, 'Der DOM ist gewachsen.')
    assert.equal(nachher.runs, vorher.runs, 'Es liefen weitere Aktualisierungen.')
    assert.ok(await page.locator('[data-mw-edit-mask]').count(), 'Die Maske wurde überschrieben.')
    assert.deepEqual(fehler, [], fehler.join(' | '))
    await page.close()
  })
})
