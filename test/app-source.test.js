import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Absicherung des lesbaren Anwendungskerns.
 *
 * `app.js` wurde bis einschließlich `c078b47` als gzip-komprimierter,
 * base64-kodierter Block ausgeliefert und zur Laufzeit entpackt und
 * ausgeführt. Diese Tests halten den lesbaren Zustand fest und verhindern
 * einen Rückfall.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const source = readFileSync(join(root, 'app.js'), 'utf8')

/** Entfernt Kommentare, damit die Herkunftsbeschreibung nicht als Code zählt. */
const withoutComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const code = withoutComments(source)

describe('Keine Laufzeitdekodierung mehr', () => {
  for (const [name, muster] of [
    ['new Function', /\bnew\s+Function\s*\(/],
    ['eval', /(?<![\w.$])eval\s*\(/],
    ['atob', /(?<![\w.$])atob\s*\(/],
    ['btoa', /(?<![\w.$])btoa\s*\(/],
    ['DecompressionStream', /\bDecompressionStream\b/],
    ['gzip-Kennung im Base64-Block', /"H4sI[A-Za-z0-9+/=]{40,}/],
  ]) {
    test(`app.js verwendet kein ${name}`, () => {
      assert.equal(muster.test(code), false, `app.js enthält wieder ${name}.`)
    })
  }

  test('kein weiteres ausgeliefertes Skript dekodiert zur Laufzeit', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    const skripte = [...html.matchAll(/<script src="([^"?]+)/g)].map((match) => match[1])
    const auffaellig = skripte.filter((name) => {
      const inhalt = withoutComments(readFileSync(join(root, name), 'utf8'))
      return /\bnew\s+Function\s*\(/.test(inhalt)
        || /(?<![\w.$])eval\s*\(/.test(inhalt)
        || /\bDecompressionStream\b/.test(inhalt)
    })
    assert.deepEqual(auffaellig, [], 'Laufzeitdekodierung in: ' + auffaellig.join(', '))
  })
})

describe('Geltungsbereich bleibt gekapselt', () => {
  test('der Quelltext liegt vollständig in einer umschließenden Funktion', () => {
    // Zuvor lief der Code im Rumpf von new Function(code)() und war dadurch
    // gegen den globalen Namensraum abgeschottet. Die Kapselung muss bleiben.
    assert.match(source, /\(\(\)\s*=>\s*\{/, 'Die umschließende Funktion fehlt.')
    assert.match(source.trimEnd(), /\}\)\(\);?$/, 'Die umschließende Funktion wird nicht aufgerufen.')
  })

  test('es gibt nur die beabsichtigten globalen Schnittstellen', () => {
    // closeDrawer wird vom onclick der Schliessen-Schaltflaeche im
    // Personenprofil benoetigt. MWAppValidation stellt die reinen fachlichen
    // Pruefungen der Masken fuer die Einheitentests bereit.
    const globale = [...code.matchAll(/\bwindow\.([A-Za-z0-9_$]+)\s*=(?!=)/g)].map((match) => match[1])
    assert.deepEqual([...new Set(globale)].sort(), ['MWAppValidation', 'closeDrawer'],
      'Die globalen Schnittstellen von app.js haben sich verändert.')
  })

  test('Deklarationen der obersten Ebene sind eingerückt und damit gekapselt', () => {
    const amRand = code.split('\n').filter((zeile) => /^(const|let|var|function|class)\s/.test(zeile))
    assert.deepEqual(amRand, [], 'Deklarationen außerhalb der Kapselung: ' + amRand.join(' | '))
  })
})

describe('Der Anwendungskern ist vollständig', () => {
  const erwarteteFunktionen = [
    'initLogin', 'updateRoleInfo', 'renderShell', 'renderView', 'renderChart', 'renderNode',
    'wireNodes', 'applySearch', 'openDrawer', 'closeDrawer', 'badgeHtml', 'functionMeta',
    'renderProfile', 'renderPeople', 'renderUnits', 'unitOptions',
    'unitPath', 'isDescendant', 'renderLocations', 'renderFunctions', 'renderStyles',
    'renderAdmin', 'renderQuality',
    // Seit dem Maskenpaket 2: Erfassung und Bearbeitung laufen ueber MWEditMask.
    'openPersonMask', 'openUnitMask', 'openProfileMask',
    'validatePersonValues', 'validateUnitValues', 'unitImpact',
    'savePersonValues', 'saveUnitValues', 'showViewNotice', 'renderViewNotice', 'descendantIds',
  ]

  test('alle erwarteten Funktionen sind vorhanden', () => {
    const fehlend = erwarteteFunktionen.filter((name) => !new RegExp(`function\\s+${name}\\s*\\(`).test(code))
    assert.deepEqual(fehlend, [], 'Fehlende Funktionen: ' + fehlend.join(', '))
  })

  test('die abgeloesten Inline-Baukaesten sind verschwunden', () => {
    // Personen und Organisationseinheiten werden ausschliesslich ueber die
    // Maske erfasst; die frueheren Baukaesten in der Liste sind entfallen.
    const abgeloest = ['personBuilderHtml', 'wirePersonBuilder', 'unitBuilderHtml', 'wireUnitBuilder']
    const verblieben = abgeloest.filter((name) => new RegExp(`function\\s+${name}\\s*\\(`).test(code))
    assert.deepEqual(verblieben, [], 'Wieder vorhandene Inline-Baukaesten: ' + verblieben.join(', '))
    assert.ok(!/\bpersonDraft\b/.test(code), 'personDraft ist zurueckgekehrt.')
    assert.ok(!/\bunitDraft\b/.test(code), 'unitDraft ist zurueckgekehrt.')
  })

  test('Erfassung laeuft ueber die gemeinsame Maske', () => {
    assert.ok(code.includes('window.MWEditMask.open('), 'app.js oeffnet keine Bearbeitungsmaske.')
    assert.ok(!/document\.body\.(append|appendChild)/.test(code), 'app.js haengt wieder etwas an document.body.')
    assert.ok(!/aria-modal/.test(code), 'app.js erzeugt wieder ein modales Element.')
  })

  test('kein Reload, kein Polling, keine simulierte Anmeldung', () => {
    assert.ok(!/location\s*\.\s*reload\s*\(/.test(code), 'app.js laedt die Seite wieder neu.')
    assert.ok(!/setInterval\s*\(/.test(code), 'app.js verwendet wieder eine Poll-Schleife.')
    assert.ok(!/loginBtn\s*\.\s*click\s*\(/.test(code), 'app.js klickt wieder programmgesteuert auf die Anmeldung.')
  })

  test('app.js schreibt weiterhin genau dieselben Schlüssel', () => {
    // Die LocalStorage-Struktur bleibt unveraendert. Neue Felder an Personen
    // und Einheiten kommen additiv in `mw-demo-nodes` hinzu.
    const geschrieben = [...code.matchAll(/localStorage\.setItem\(\s*'([^']+)'/g)].map((match) => match[1])
    assert.deepEqual([...new Set(geschrieben)].sort(), [
      'mw-demo-functions', 'mw-demo-locations', 'mw-demo-nodes', 'mw-demo-profile',
    ], 'Die geschriebenen Speicherschlüssel von app.js haben sich verändert.')
  })

  test('zusätzlich gelesene Schlüssel sind benannt', () => {
    // Die Masken lesen Organisationstypen, Unterkategorien und Leitungen, um
    // gültige Auswahllisten und die Auswirkungen anzuzeigen. Geschrieben wird
    // dort nichts.
    // Nur echte Speicherzugriffe zaehlen; `mw-demo-nodes-changed` ist der Name
    // des Aenderungsereignisses, kein Schluessel.
    const schluessel = [
      ...[...code.matchAll(/(?:load|readJson)\(\s*'([^']+)'/g)].map((match) => match[1]),
      ...[...code.matchAll(/localStorage\.setItem\(\s*'([^']+)'/g)].map((match) => match[1]),
      ...[...code.matchAll(/_KEY = '([^']+)'/g)].map((match) => match[1]),
    ]
    assert.deepEqual([...new Set(schluessel)].sort(), [
      'mw-demo-functions',
      'mw-demo-leadership-assignments',
      'mw-demo-locations',
      'mw-demo-nodes',
      'mw-demo-organization-types',
      'mw-demo-person-groups-v1',
      'mw-demo-profile',
    ], 'Die von app.js verwendeten Speicherschlüssel haben sich verändert.')
  })

  test('die Ansichten der Navigation sind unverändert', () => {
    const body = /const navItems = \[(.*?)\n\s*\];/s.exec(code)?.[1]
    assert.ok(body, 'navItems wurden nicht gefunden.')
    const ids = [...body.matchAll(/\['([a-z]+)',/g)].map((match) => match[1])
    assert.deepEqual(ids, ['chart', 'profile', 'admin', 'locations', 'functions', 'styles', 'people', 'units', 'quality'])
  })

  test('der Kern startet weiterhin mit initLogin', () => {
    assert.match(source.trimEnd(), /initLogin\(\);\s*\}\)\(\);?$/,
      'Der Startaufruf am Ende von app.js fehlt oder wurde verschoben.')
  })
})

describe('Reproduzierbarkeit der Formatierung', () => {
  /**
   * Die Datei ist reine Prettier-Ausgabe des entpackten Blocks. Ist die
   * Formatierung stabil, lässt sich der Schritt jederzeit nachvollziehen und
   * es wurde nichts von Hand hineingeschrieben.
   */
  test('Prettier verändert die Datei nicht mehr', (t) => {
    let ergebnis
    try {
      ergebnis = execFileSync('npx', [
        '--no-install', 'prettier', '--no-config',
        '--print-width', '110', '--single-quote', '--semi', '--arrow-parens', 'always',
        '--check', 'app.js',
      ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (fehler) {
      const text = `${fehler.stdout || ''}${fehler.stderr || ''}`
      if (/not found|could not determine|ENOENT|npm error/i.test(text) && !/Code style issues/i.test(text)) {
        t.skip('Prettier ist nicht verfügbar')
        return
      }
      assert.fail('Die Formatierung von app.js weicht von der dokumentierten Prettier-Ausgabe ab:\n' + text)
    }
    assert.match(String(ergebnis), /All matched files use Prettier code style/)
  })
})
