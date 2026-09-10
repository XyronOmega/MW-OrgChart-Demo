/**
 * Browsertests zum Reparaturpaket „Leser-Rechte und Barrierefreiheit“.
 *
 * Geprüft werden im echten Browser:
 *   - Leser sehen in „Leitungsfunktionen“ und „Unterkategorien“ keine
 *     Bearbeitungselemente und können nichts speichern
 *   - Personenprofil als Dialog: role, aria-modal, Fokus, Escape
 *   - Formularbeschriftungen
 *   - genau eine h1 je Seitenzustand
 *   - Zeigerziele von mindestens 44 x 44 CSS-Pixeln
 *
 * Wie in stability.spec.mjs ohne Test-Framework; ohne Playwright überspringt
 * sich die Datei selbst.
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const PORT = Number(process.env.MW_TEST_PORT_A11Y || 4311)
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

const openPage = async (viewport = { width: 1440, height: 900 }) => {
  const page = await browser.newPage({ viewport })
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  return page
}

const login = async (page, role = 'admin') => {
  await page.selectOption('#roleSelect', role, { timeout: 8000 })
  await page.getByRole('button', { name: 'Demo starten' }).click({ timeout: 8000 })
  await page.waitForSelector('#nav button', { timeout: 8000 })
  await page.waitForTimeout(600)
}

/** Wechselt über die zweistufige Navigation in eine Unteransicht. */
const openView = async (page, label) => {
  for (const group of ['organization', 'changes', 'administration', 'chart']) {
    const groupButton = page.locator(`[data-mw-main-group="${group}"]`)
    if (!(await groupButton.count())) continue
    await groupButton.click().catch(() => {})
    await page.waitForTimeout(250)
    const button = page.locator('#nav button', { hasText: label }).first()
    if ((await button.count()) && (await button.isVisible())) {
      await button.click()
      await page.waitForTimeout(600)
      return true
    }
  }
  return false
}

describe('Leser-Rechte', () => {
  for (const view of ['Leitungsfunktionen', 'Unterkategorien']) {
    test(`Leser sehen in „${view}“ keine Bearbeitungselemente`, async (t) => {
      if (skipIfNoBrowser(t)) return
      const page = await openPage()
      await login(page, 'viewer')
      assert.ok(await openView(page, view), `Die Ansicht „${view}“ war nicht erreichbar.`)

      const befund = await page.evaluate(() => {
        const content = document.getElementById('content')
        const sichtbar = (element) => element.offsetParent !== null || element.getClientRects().length > 0
        const felder = [...content.querySelectorAll('input, textarea')].filter(sichtbar)
        const schaltflaechen = [...content.querySelectorAll('button')].filter(sichtbar)
        const auswahl = [...content.querySelectorAll('select')].filter(sichtbar)
        return {
          eingabefelder: felder.length,
          deaktivierte: [...content.querySelectorAll('[disabled]')].filter(sichtbar).length,
          bearbeiten: schaltflaechen.filter((b) => /speichern|hinzufügen|löschen|entfernen|anlegen|bearbeiten|nach oben|nach unten/i
            .test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)).length,
          ziehbar: content.querySelectorAll('[draggable="true"]').length,
          auswahlfelder: auswahl.map((s) => Object.keys(s.dataset)[0] || 'ohne'),
          hinweis: !!content.querySelector('.leadership-readonly, .mw-person-groups-readonly'),
        }
      })

      assert.equal(befund.eingabefelder, 0, 'Leser dürfen keine Eingabefelder sehen.')
      assert.equal(befund.bearbeiten, 0, 'Leser dürfen keine Bearbeitungsschaltflächen sehen.')
      assert.equal(befund.ziehbar, 0, 'Leser dürfen keine ziehbaren Zeilen sehen.')
      assert.equal(befund.deaktivierte, 0, 'Statt deaktivierter Bedienelemente wird eine Lesedarstellung erwartet.')
      assert.ok(befund.hinweis, 'Der Hinweis auf die Nur-Lese-Ansicht fehlt.')
      // Verbleibende Auswahlfelder wechseln ausschließlich die Betrachtungsperspektive.
      befund.auswahlfelder.forEach((name) => {
        assert.match(name, /^(leadershipPerson|leadershipUnit|personGroupsUnit)$/, `Unerwartetes Auswahlfeld: ${name}`)
      })
      await page.close()
    })
  }

  test('Leser können in keiner der beiden Ansichten Daten speichern', async (t) => {
    if (skipIfNoBrowser(t)) return
    for (const view of ['Leitungsfunktionen', 'Unterkategorien']) {
      const page = await openPage()
      await login(page, 'viewer')
      assert.ok(await openView(page, view))
      const ergebnis = await page.evaluate(async () => {
        const abbild = () => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])))
        const vorher = abbild()
        // Jedes verbliebene Auswahlfeld wird verändert.
        document.querySelectorAll('#content select:not([disabled])').forEach((select) => {
          const andere = [...select.options].find((option) => !option.selected)
          if (andere) { select.value = andere.value; select.dispatchEvent(new Event('change', { bubbles: true })) }
        })
        await new Promise((resolve) => setTimeout(resolve, 600))
        return { unveraendert: vorher === abbild() }
      })
      assert.ok(ergebnis.unveraendert, `„${view}“: Ein Leser hat Daten geschrieben.`)
      await page.close()
    }
  })

  test('die Rechteprüfung liegt auch hinter der Darstellung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page, 'viewer')
    assert.ok(await openView(page, 'Unterkategorien'))
    // Die Schreibfunktion selbst prüft das Recht. Seit Paket 3 laufen
    // Personenzuordnungen über eine Sammelmaske; geprüft wird deshalb der
    // unmittelbare Aufruf, nicht mehr ein nachgerüstetes Auswahlfeld.
    const ergebnis = await page.evaluate(async () => {
      const schluessel = 'mw-demo-nodes'
      const vorher = localStorage.getItem(schluessel)
      const person = document.querySelector('[data-person-subcategory-text]')
      const personId = person?.dataset.personSubcategoryText || 'p1'
      const einheit = document.querySelector('[data-person-groups-unit]')?.value || 'pm'
      const antwort = window.MWPersonGroups?.savePersonAssignments?.(einheit, {
        [`person:${personId}`]: `direct:${einheit}`,
      })
      const maske = window.MWPersonGroups?.openAssignmentMask?.(einheit)
      await new Promise((resolve) => setTimeout(resolve, 400))
      return {
        unveraendert: vorher === localStorage.getItem(schluessel),
        abgelehnt: Boolean(antwort?.error),
        keineMaske: maske === false,
      }
    })
    assert.ok(ergebnis.abgelehnt, 'Die Speicherfunktion hat den Leser nicht abgewiesen.')
    assert.ok(ergebnis.keineMaske, 'Ein Leser konnte die Sammelmaske öffnen.')
    assert.ok(ergebnis.unveraendert, 'Der unmittelbare Aufruf der Speicherfunktion konnte schreiben.')
    await page.close()
  })

  test('die Bearbeitungsrolle behält alle Bedienelemente', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page, 'editor')
    assert.ok(await openView(page, 'Unterkategorien'))
    // Seit der Umstellung auf feste Bearbeitungsmasken ersetzt der Einstieg in
    // die Maske das frühere Formular am Seitenende.
    const befund = await page.evaluate(() => ({
      maskeAnlegen: !!document.querySelector('[data-person-group-create]'),
      ziehbar: document.querySelectorAll('[draggable="true"]').length,
      // Seit Paket 3 ersetzt die Sammelmaske die Auswahlfelder je Person.
      zuordnung: !!document.querySelector('[data-person-assignment-open]'),
      einzelfelder: document.querySelectorAll('[data-person-subcategory-person]').length,
    }))
    assert.ok(befund.maskeAnlegen, 'Der Bearbeitungsrolle fehlt der Einstieg in die Maske für neue Unterkategorien.')
    assert.ok(befund.ziehbar > 0, 'Der Bearbeitungsrolle fehlen die ziehbaren Zeilen.')
    assert.ok(befund.zuordnung, 'Der Bearbeitungsrolle fehlt der Einstieg in die Sammelmaske für Zuordnungen.')
    assert.equal(befund.einzelfelder, 0, 'Die Auswahlfelder mit sofortiger Speicherung sind zurückgekehrt.')
    await page.close()
  })

  test('die Superadministration erhält ihre Ansichten weiterhin', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page, 'superadmin')
    assert.ok(await openView(page, 'Organisationstypen'), 'Die Ansicht „Organisationstypen“ fehlt.')
    const nurAdmin = await openPage()
    await login(nurAdmin, 'admin')
    assert.equal(await openView(nurAdmin, 'Organisationstypen'), false, 'Ein Administrator sieht die Superadministration.')
    await page.close()
    await nurAdmin.close()
  })
})

describe('Personenprofil als Dialog', () => {
  /** Öffnet das Profil über einen sichtbaren Auslöser auf einer Karte. */
  const openProfile = async (page) => {
    await page.waitForSelector('.demo-unit-leader-name', { timeout: 10000 })
    const trigger = page.locator('.demo-unit-leader-name').first()
    await trigger.click()
    await page.waitForTimeout(600)
  }

  test('trägt role="dialog" und aria-modal="true", solange es offen ist', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    const geschlossen = await page.evaluate(() => {
      const drawer = document.getElementById('drawer')
      return { role: drawer.getAttribute('role'), ariaModal: drawer.getAttribute('aria-modal'), ariaLabel: drawer.getAttribute('aria-label') }
    })
    assert.equal(geschlossen.role, 'dialog')
    assert.equal(geschlossen.ariaModal, null, 'Ein geschlossener Dialog darf nicht als modal ausgezeichnet sein.')
    assert.equal(geschlossen.ariaLabel, 'Personenprofil')

    await openProfile(page)
    const offen = await page.evaluate(() => {
      const drawer = document.getElementById('drawer')
      return { offen: !drawer.classList.contains('hidden'), role: drawer.getAttribute('role'), ariaModal: drawer.getAttribute('aria-modal') }
    })
    assert.ok(offen.offen, 'Das Personenprofil hat sich nicht geöffnet.')
    assert.equal(offen.role, 'dialog')
    assert.equal(offen.ariaModal, 'true')
    await page.close()
  })

  test('der Fokus wandert beim Öffnen in den Dialog', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await openProfile(page)
    assert.ok(await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)),
      'Der Fokus ist außerhalb des Dialogs geblieben.')
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('drawer-close')),
      'Die Schließen-Schaltfläche ist nicht per Tabulator erreichbar.')
    await page.close()
  })

  test('der Tabulator bleibt im Dialog gefangen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await openProfile(page)
    for (let schritt = 0; schritt < 6; schritt += 1) {
      await page.keyboard.press('Tab')
      assert.ok(await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)),
        `Der Fokus hat den Dialog nach ${schritt + 1} Tabulatorschritten verlassen.`)
    }
    await page.keyboard.press('Shift+Tab')
    assert.ok(await page.evaluate(() => document.getElementById('drawer').contains(document.activeElement)),
      'Der Fokus hat den Dialog rückwärts verlassen.')
    await page.close()
  })

  test('Escape schließt das Personenprofil', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await openProfile(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const nachher = await page.evaluate(() => {
      const drawer = document.getElementById('drawer')
      return { geschlossen: drawer.classList.contains('hidden'), ariaModal: drawer.getAttribute('aria-modal') }
    })
    assert.ok(nachher.geschlossen, 'Escape hat das Personenprofil nicht geschlossen.')
    assert.equal(nachher.ariaModal, null, 'aria-modal wurde nach dem Schließen nicht entfernt.')
    await page.close()
  })

  test('der Fokus kehrt zum Auslöser zurück', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await page.waitForSelector('.demo-unit-leader-name', { timeout: 10000 })
    await page.evaluate(() => { document.querySelector('.demo-unit-leader-name').dataset.testAusloeser = '1' })
    await page.locator('[data-test-ausloeser="1"]').click()
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    assert.ok(await page.evaluate(() => document.activeElement?.dataset?.testAusloeser === '1'),
      'Der Fokus ist nicht zum auslösenden Bedienelement zurückgekehrt.')
    await page.close()
  })

  test('das Schließen über den Hintergrund bleibt erhalten', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await openProfile(page)
    await page.evaluate(() => document.getElementById('drawerBackdrop').click())
    await page.waitForTimeout(400)
    assert.ok(await page.evaluate(() => document.getElementById('drawer').classList.contains('hidden')))
    await page.close()
  })
})

describe('Formularbeschriftungen und Überschriften', () => {
  test('jedes sichtbare Formularfeld hat einen zugänglichen Namen', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    const ohneNamen = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea')]
      .filter((field) => field.type !== 'hidden' && field.offsetParent !== null)
      .filter((field) => !field.labels?.length && !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby'))
      .map((field) => `${field.tagName.toLowerCase()}#${field.id || '(ohne id)'}`))
    assert.deepEqual(ohneNamen, [], 'Felder ohne zugänglichen Namen: ' + ohneNamen.join(', '))
    await page.close()
  })

  test('das Suchfeld trägt eine eigene Beschriftung', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    const name = await page.evaluate(() => document.getElementById('searchInput')?.getAttribute('aria-label'))
    assert.ok(name && name.length > 3, 'Das Suchfeld hat keine Beschriftung.')
    await page.close()
  })

  test('je Seitenzustand ist genau eine h1 zugänglich', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    const zaehlen = () => page.evaluate(() => {
      const zugaenglich = (element) => {
        let knoten = element
        while (knoten) {
          if (knoten.hasAttribute?.('hidden') || knoten.getAttribute?.('aria-hidden') === 'true') return false
          knoten = knoten.parentElement
        }
        return true
      }
      return {
        zugaenglich: [...document.querySelectorAll('h1')].filter(zugaenglich).length,
        loginVerborgen: document.getElementById('loginPage').hasAttribute('hidden'),
        appVerborgen: document.getElementById('app').hasAttribute('hidden'),
      }
    })
    await page.waitForTimeout(300)
    const vorher = await zaehlen()
    assert.equal(vorher.zugaenglich, 1, 'Im Loginzustand ist nicht genau eine h1 zugänglich.')
    assert.equal(vorher.appVerborgen, true, 'Der Anwendungsbereich ist im Loginzustand nicht verborgen.')

    await login(page)
    const nachher = await zaehlen()
    assert.equal(nachher.zugaenglich, 1, 'Im angemeldeten Zustand ist nicht genau eine h1 zugänglich.')
    assert.equal(nachher.loginVerborgen, true, 'Der Anmeldebereich ist nach der Anmeldung nicht verborgen.')
    assert.equal(nachher.appVerborgen, false)
    await page.close()
  })
})

describe('Zeigerziele', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    test(`bei ${viewport.width} px ist jedes Ziel mindestens 44 x 44 CSS-Pixel groß`, async (t) => {
      if (skipIfNoBrowser(t)) return
      const page = await openPage(viewport)
      await login(page)
      const klein = await page.evaluate(() => {
        /*
         * Gemessen wird in CSS-Pixeln (offsetWidth/offsetHeight). Das
         * Organigramm skaliert seinen Inhalt über `zoom`; die gerenderte Größe
         * hängt daher vom gewählten Zoom ab, nicht von der Zielgröße im
         * Stylesheet. Erweiterte Trefferflächen über ::after werden mitgezählt.
         */
        return [...document.querySelectorAll('button, a[href], select, input')]
          .filter((element) => element.offsetParent !== null)
          .filter((element) => {
            const nach = getComputedStyle(element, '::after')
            const treffer = nach.content !== 'none' && nach.position === 'absolute'
            const breite = treffer ? Math.max(element.offsetWidth, parseFloat(nach.width) || 0) : element.offsetWidth
            const hoehe = treffer ? Math.max(element.offsetHeight, parseFloat(nach.height) || 0) : element.offsetHeight
            return breite > 0 && (breite < 43.5 || hoehe < 43.5)
          })
          .map((element) => `${element.tagName.toLowerCase()}.${(element.className || '?').toString().trim().replace(/\s+/g, '.')} ${Math.round(element.offsetWidth)}x${Math.round(element.offsetHeight)}`)
      })
      assert.deepEqual([...new Set(klein)], [], 'Zu kleine Zeigerziele: ' + [...new Set(klein)].join(' | '))
      await page.close()
    })
  }

  test('die Breite läuft in keiner Darstellung über', async (t) => {
    if (skipIfNoBrowser(t)) return
    for (const width of [360, 390, 768, 1024, 1440, 1920]) {
      const page = await openPage({ width, height: 900 })
      await login(page)
      const ueberlauf = await page.evaluate(() => {
        const doc = document.documentElement
        return { ueber: doc.scrollWidth > doc.clientWidth + 2, scroll: doc.scrollWidth, client: doc.clientWidth }
      })
      assert.equal(ueberlauf.ueber, false, `Bei ${width} px läuft die Seite über (${ueberlauf.scroll} > ${ueberlauf.client}).`)
      await page.close()
    }
  })
})

describe('Keine Rückkopplung durch die Ergänzungen', () => {
  test('die Anwendung bleibt nach dem Login im Leerlauf ruhig', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    const fehler = []
    page.on('pageerror', (error) => fehler.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') fehler.push(message.text()) })
    await login(page)
    const vorher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    await page.waitForTimeout(3000)
    const nachher = await page.evaluate(() => ({ ...window.MWUiLifecycle.stats(), dom: document.getElementsByTagName('*').length }))
    assert.equal(nachher.runs, vorher.runs, 'Im Leerlauf wurden weitere Aktualisierungen ausgelöst.')
    assert.equal(nachher.dom, vorher.dom, 'Im Leerlauf ist der DOM gewachsen.')
    assert.deepEqual(fehler, [], 'Konsolenfehler: ' + fehler.join(' | '))
    await page.close()
  })

  test('wiederholtes Öffnen und Schließen des Profils erzeugt keinen Zuwachs', async (t) => {
    if (skipIfNoBrowser(t)) return
    const page = await openPage()
    await login(page)
    await page.waitForSelector('.demo-unit-leader-name', { timeout: 10000 })
    const zyklus = async () => {
      await page.locator('.demo-unit-leader-name').first().click()
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      return page.evaluate(() => document.getElementsByTagName('*').length)
    }
    // Der erste Aufruf füllt das Profil; app.js belässt den Inhalt im Dokument.
    // Gemessen wird deshalb ab dem zweiten Zyklus.
    await zyklus()
    const nachErstemZyklus = await zyklus()
    for (let runde = 0; runde < 3; runde += 1) {
      const jetzt = await zyklus()
      assert.equal(jetzt, nachErstemZyklus, `DOM-Knoten nach Zyklus ${runde + 3}: ${jetzt} statt ${nachErstemZyklus}.`)
    }
    await page.close()
  })
})
