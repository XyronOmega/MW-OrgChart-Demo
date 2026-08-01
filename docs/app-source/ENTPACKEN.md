# app.js lesbar herstellen

## Ausgangslage

Bis einschließlich `c078b47` bestand `app.js` aus einem einzigen gzip-komprimierten,
base64-kodierten Block. Er wurde im Browser über `DecompressionStream` entpackt und mit
`new Function(code)()` ausgeführt:

```js
(async () => {
  const b = "H4sIAOlHa2oC/70…";
  const bytes = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const code = await new Response(stream).text();
  new Function(code)();
})().catch(…);
```

**Ein lesbarer Originalquelltext existiert nicht.** Geprüft wurden alle Commits, alle
Branches (`main`, `gh-pages`, `audit/expert-live-review`, `claude/changeset-demo`,
`fix/runtime-stability-audit`, `fix/roles-and-accessibility`, `refactor/page-based-edit-masks`)
und die frühere Fassung `9d7af90`. `app.js` wurde bereits im ersten Commit `5491534`
gepackt eingecheckt und war seither bytegleich.

## Verfahren

```bash
# 1. Gepackte Fassung aus der Historie holen
git show c078b47:app.js > /tmp/app.packed.js

# 2. Reproduzierbar entpacken
node tools/unpack-app.mjs /tmp/app.packed.js /tmp/app.raw.js

# 3. Umbrechen (nur Zeilenumbrüche und Einrückung)
npx prettier --no-config --print-width 110 --single-quote --semi --arrow-parens always --write app.js

# 4. Strukturgleichheit nachweisen
node tools/compare-ast.mjs /tmp/app.raw.js app.js
```

Schritt 4 vergleicht die Syntaxbäume beider Fassungen. Klammerungen, Semikolons,
Schlusskommata, Leerräume und Kommentare bleiben dabei unberücksichtigt; alles andere
muss übereinstimmen.

## Prüfsummen (SHA-256)

| Gegenstand | Prüfsumme |
|---|---|
| gepackte `app.js` in `c078b47` | `2daaa6c486400e51a40f35f34d95a43380488390827a85cf853a032f4665598c` |
| entpackter Rohquelltext (34 064 Zeichen, 75 Zeilen) | `0a12140d53dcf28836c8f560cee532bac7da843f9ec08bcc2c70a4a6d1dbde63` |
| lesbare `app.js` in diesem Branch | `ec9c6da7279d23bb4c26bf1aeccd79d909d1c675e750b5aa6cce4b9efd4deb99` |

## Umschließende Funktion

Der Code lief im Rumpf von `new Function(code)()` und war damit gegen den globalen
Namensraum abgeschottet: `const`, `let` und `function` der obersten Ebene waren lokal.
Als gewöhnliches Skript wären sie global geworden.

Die lesbare Fassung hält den Geltungsbereich deshalb mit `(() => { … })()` aufrecht.
Der Quelltext verwendet weder `this` noch `arguments`, kein `var`, kein `'use strict'`
und kein `return` auf oberster Ebene – die Kapselung ist damit gleichwertig.

Die einzige beabsichtigte globale Schnittstelle ist `window.closeDrawer`. Sie wird vom
`onclick` der Schließen-Schaltfläche im Personenprofil benötigt und unverändert gesetzt.
`test/app-source.test.js` hält diesen Zustand fest.

## Änderung der Ausführungsreihenfolge

Die Entpackung war asynchron. Dadurch lief der Anwendungskern bisher **nach** allen
übrigen Skripten, obwohl sein `<script>`-Element an dritter Stelle steht. Ohne
Entpackung läuft er an der Stelle, an der er eingebunden ist.

| | bisher | jetzt |
|---|---|---|
| Reihenfolge | MWUiLifecycle → MWRoles → MWLeadershipDemo → MWChangesetDemo → MWPersonGroups → MWNavigationShell → **closeDrawer** | MWUiLifecycle → MWRoles → **closeDrawer** → MWLeadershipDemo → MWChangesetDemo → MWPersonGroups → MWNavigationShell |
| Aktualisierungsläufe nach dem Login | 3 | 5 |
| DOM-Knoten nach dem Login | 588 | 588 |
| Zuwachs nach 3 s Leerlauf | 0 | 0 |

Die Reihenfolge der `<script>`-Elemente in `index.html` ist unverändert. Der
Anwendungskern erzeugt weder einen `MutationObserver` noch verwendet er `CSS.escape`;
seine Stellung gegenüber `orgchart-navigation-bootstrap.js`, das `window.MutationObserver`
ersetzt, ist deshalb ohne Wirkung.

Soll die bisherige Reihenfolge exakt erhalten bleiben, genügt es, das
`<script src="app.js">`-Element in `index.html` ans Ende der Liste zu verschieben.

## Rollback

```bash
# Nur app.js und den Versionsparameter zurücknehmen
git checkout c078b47 -- app.js
sed -i 's/app.js?v=readable-1/app.js?v=stable-2/' index.html
git checkout c078b47 -- test/roles.test.js test/changeset-demo.test.js
git rm -f test/app-source.test.js

# Oder den gesamten Pull Request zurücknehmen
git revert -m 1 <Merge-Commit>
```

Die gepackte Fassung bleibt über `git show c078b47:app.js` dauerhaft verfügbar.
