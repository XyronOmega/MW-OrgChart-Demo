/**
 * Entpackt einen gepackten `app.js`-Block reproduzierbar.
 *
 * Die ausgelieferte `app.js` bestand bis einschließlich `c078b47` aus einem
 * gzip-komprimierten, base64-kodierten Block, der zur Laufzeit über
 * `DecompressionStream` entpackt und mit `new Function(code)()` ausgeführt
 * wurde. Dieses Skript stellt denselben Quelltext ohne Browser her.
 *
 * Aufruf:
 *   node tools/unpack-app.mjs <gepackte-datei> [ziel]
 *
 * Ohne Zielangabe wird der Quelltext nach stdout geschrieben. Das Ergebnis ist
 * bei gleicher Eingabe bytegleich; die Prüfsumme steht in
 * docs/app-source/ENTPACKEN.md.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const [, , input, output] = process.argv
if (!input) {
  console.error('Aufruf: node tools/unpack-app.mjs <gepackte-datei> [ziel]')
  process.exit(2)
}

const packed = readFileSync(input, 'utf8')
const base64 = /const b\s*=\s*"([A-Za-z0-9+/=]+)"/.exec(packed)?.[1]
if (!base64) {
  console.error('In der Eingabe wurde kein gepackter Block gefunden.')
  process.exit(1)
}

const source = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8')
const digest = createHash('sha256').update(source, 'utf8').digest('hex')

if (output) {
  writeFileSync(output, source, 'utf8')
  console.error(`Entpackt nach ${output}`)
} else {
  process.stdout.write(source)
}
console.error(`Zeichen: ${source.length}`)
console.error(`SHA-256 des entpackten Quelltextes: ${digest}`)
