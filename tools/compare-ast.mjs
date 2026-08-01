/**
 * Vergleicht zwei JavaScript-Dateien strukturell über ihren Syntaxbaum.
 *
 * Zweck: nachweisen, dass die lesbare `app.js` denselben Code enthält wie der
 * entpackte Block – unabhängig von Zeilenumbrüchen, Einrückung, Semikolons,
 * Schlusskommata und überflüssigen Klammern.
 *
 * Aufruf:
 *   node tools/compare-ast.mjs <entpackt.js> <app.js>
 *
 * Die zweite Datei darf den Code zusätzlich in eine umschließende Funktion
 * `(() => { … })()` legen; diese wird beim Vergleich abgezogen.
 *
 * Benötigt das global installierte TypeScript-Paket als Parser. Fehlt es,
 * endet das Skript mit Rückgabewert 3 und meldet das ausdrücklich.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let ts
for (const kandidat of ['typescript', '/opt/node22/lib/node_modules/typescript']) {
  try { ts = require(kandidat); break } catch { /* nächster Versuch */ }
}
if (!ts) {
  console.error('TypeScript als Parser nicht gefunden.')
  process.exit(3)
}

const [, , linksPfad, rechtsPfad] = process.argv
if (!linksPfad || !rechtsPfad) {
  console.error('Aufruf: node tools/compare-ast.mjs <entpackt.js> <app.js>')
  process.exit(2)
}

const parse = (pfad) => ts.createSourceFile(pfad, readFileSync(pfad, 'utf8'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

/** Entfernt reine Klammerungen, die Prettier verschiebt. */
const entklammern = (knoten) => {
  let aktuell = knoten
  while (aktuell && aktuell.kind === ts.SyntaxKind.ParenthesizedExpression) aktuell = aktuell.expression
  return aktuell
}

/**
 * Erzeugt eine kanonische Beschreibung eines Knotens: Art plus – bei Blättern –
 * der Wert. Positionen, Leerräume und Kommentare bleiben unberücksichtigt.
 */
const beschreiben = (knoten) => {
  const k = entklammern(knoten)
  if (!k) return 'leer'
  const art = ts.SyntaxKind[k.kind]
  const kinder = []
  ts.forEachChild(k, (kind) => { kinder.push(beschreiben(kind)) })
  if (!kinder.length) {
    // Blatt: Text mitnehmen, damit Bezeichner und Zeichenketten verglichen werden.
    const text = k.getText?.() ?? ''
    return `${art}(${text})`
  }
  return `${art}[${kinder.join(',')}]`
}

/** Liefert die Anweisungen einer Datei; eine umschließende Funktion wird abgezogen. */
const anweisungen = (datei) => {
  const oben = datei.statements
  if (oben.length === 1 && ts.isExpressionStatement(oben[0])) {
    const ausdruck = entklammern(oben[0].expression)
    if (ausdruck && ts.isCallExpression(ausdruck)) {
      const ziel = entklammern(ausdruck.expression)
      const istFunktion = ziel && (ts.isArrowFunction(ziel) || ts.isFunctionExpression(ziel))
      if (istFunktion && ziel.body && ts.isBlock(ziel.body)) {
        return { liste: ziel.body.statements, huelle: true }
      }
    }
  }
  return { liste: oben, huelle: false }
}

const links = anweisungen(parse(linksPfad))
const rechts = anweisungen(parse(rechtsPfad))

console.log(`${linksPfad}: ${links.liste.length} Anweisungen${links.huelle ? ' (in umschließender Funktion)' : ''}`)
console.log(`${rechtsPfad}: ${rechts.liste.length} Anweisungen${rechts.huelle ? ' (in umschließender Funktion)' : ''}`)

if (links.liste.length !== rechts.liste.length) {
  console.error(`ABWEICHUNG: unterschiedliche Anzahl von Anweisungen (${links.liste.length} zu ${rechts.liste.length}).`)
  process.exit(1)
}

let abweichungen = 0
for (let i = 0; i < links.liste.length; i += 1) {
  const a = beschreiben(links.liste[i])
  const b = beschreiben(rechts.liste[i])
  if (a === b) continue
  abweichungen += 1
  let j = 0
  while (j < Math.min(a.length, b.length) && a[j] === b[j]) j += 1
  console.error(`\nABWEICHUNG in Anweisung ${i + 1}:`)
  console.error('  links :', a.slice(Math.max(0, j - 80), j + 100))
  console.error('  rechts:', b.slice(Math.max(0, j - 80), j + 100))
}

if (abweichungen) {
  console.error(`\nERGEBNIS: ${abweichungen} strukturelle Abweichung(en).`)
  process.exit(1)
}
console.log('ERGEBNIS: Die Syntaxbäume sind strukturell identisch.')
