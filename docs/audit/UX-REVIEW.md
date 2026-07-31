# UX-Bewertung

Bewertet wurde der **korrigierte** Stand (PR #7). Der veröffentlichte Stand ist nicht bedienbar und daher nicht bewertbar.

---

## 1. Erster Eindruck als neuer Nutzer

Die Loginseite ist gut: Der Zweck ist klar benannt („Öffentliche Demo · Nur erfundene Beispieldaten"), die Rollenauswahl erklärt sich selbst, die Schaltfläche „Demo starten" ist eindeutig.

**Danach bricht die Führung ab.** Nach dem Login erscheint das Organigramm — aber der sichtbare Bereich zeigt nur die Unternehmenskarte und eine Sektion. Die Personenkarten sind gemessen **vorhanden, aber außerhalb des Sichtbereichs** (F-13). Ein neuer Nutzer sieht ein fast leeres Raster und weiß nicht, wohin er scrollen soll.

Es fehlt die Antwort auf die erste Frage jedes Nutzers: **„Wo bin ich in dieser Organisation?"**

---

## 2. Nutzerreise Leser

| Frage | Bewertung | Begründung |
|---|---|---|
| Versteht man sofort, was das System zeigt? | teilweise | Titel ja, Inhalt erst nach Scrollen |
| Ist klar, wo das Organigramm beginnt? | **nein** | Einstiegspunkt nicht markiert |
| Findet man eine Person schnell? | ja | Suchfeld ist prominent |
| Findet man eine OrgEinheit schnell? | ja | dieselbe Suche |
| Ist die Hierarchie verständlich? | ja | klassischer Baum, klare Linien |
| Leitung und Mitarbeitende getrennt? | **ja, sehr gut** | Karte zeigt „Sektionsleitung" separat |
| Zugehörigkeit einer Person erkennbar? | ja | im Profil unter „Organisation" |
| Unterkategorien verständlich? | **nein** | Begriff wird nirgends erklärt |
| Unterschied Unterkategorie / OrgEinheit klar? | **nein** | erschließt sich nur aus der Darstellung |
| „Direkt zugeordnet" verständlich? | **nein** | Systembegriff ohne Erläuterung |
| Sieht ein Leser Bearbeitungsfunktionen? | **ja, fehlerhaft** | siehe F-03 |
| Profile verständlich? | ja | klare Gliederung |
| Kontaktdaten auffindbar? | ja | im Profil |
| Suche tolerant gegenüber Tippfehlern? | **nein** | reiner Teilstringvergleich |
| Rückweg nach der Suche klar? | teilweise | „Zurücksetzen" vorhanden, aber unauffällig |
| Organisationspfad erkennbar? | **nein** | keine Brotkrumennavigation |
| Mobile Bedienung verständlich? | **nein** | siehe Abschnitt 6 |
| Bei vielen Personen nutzbar? | eingeschränkt | siehe F-10 |

**Wichtigste Empfehlungen für Leser:**
1. Persönliche Startseite oder Einstieg auf der eigenen OrgEinheit.
2. Brotkrumennavigation mit dem Organisationspfad.
3. Kurzer Erklärtext für „Unterkategorie" und „Direkt zugeordnet" — ein Hilfesymbol genügt.
4. Fehlertolerante Suche.

---

## 3. Nutzerreise Redaktion

**Stärke:** Die Bearbeitungswege sind fachlich richtig getrennt — Personen, OrgEinheiten, Leitungsfunktionen und Unterkategorien haben eigene Ansichten.

**Schwäche:** Es gibt **mehrere Wege zum selben Ziel**, ohne dass erkennbar wäre, welcher der zentrale ist:

| Aufgabe | Weg A | Weg B |
|---|---|---|
| Person einer Einheit zuordnen | Organigramm → Struktur bearbeiten → ziehen | Personen → bearbeiten |
| OrgEinheit verschieben | Organigramm → Struktur bearbeiten | Organisationseinheiten |
| Leitung zuordnen | Leitungsfunktionen | teilweise im Profil |

Das ist für Gelegenheitsnutzer verwirrend. **Empfehlung:** Eine Ansicht je Aufgabe als führend kennzeichnen, die übrigen Wege als Verknüpfung dorthin ausführen.

| Kriterium | Bewertung |
|---|---|
| Klar, wo etwas bearbeitet wird? | teilweise |
| Doppelte Bearbeitungswege? | **ja** |
| Information mehrfach pflegen? | nein |
| Klar, was sofort veröffentlicht wird? | **nein** — direkte Bearbeitung und Änderungspakete stehen unverbunden nebeneinander |
| Klar, was nur geplant ist? | teilweise — nur in der Vorschau |
| Unbeabsichtigtes Überschreiben möglich? | **ja** — kein Sperr- oder Konfliktmechanismus |
| Bestätigung bei kritischen Aktionen? | teilweise — „Demo zurücksetzen" fragt nach, Löschen nicht durchgängig |
| Fehler einfach korrigierbar? | **nein** — kein Rückgängig |
| Formulare verständlich? | ja |
| Pflichtfelder erkennbar? | teilweise (`*` im Einheiteneditor) |
| Validierungsfehler verständlich? | teilweise — teils `alert()` |
| Eingaben bleiben bei Fehler erhalten? | ja |

**Größte konzeptionelle Lücke:** Direkte Bearbeitung und Änderungspakete sind zwei getrennte Welten. Ein Redakteur kann eine OrgEinheit direkt umbenennen — am Freigabeprozess vorbei. Damit ist der Vier-Augen-Workflow umgehbar und faktisch optional.

---

## 4. Nutzerreise Prüfung und Freigabe

| Anforderung | Status |
|---|---|
| Welche Änderungen warten auf Prüfung? | **vorhanden** (Statusfilter) |
| Wer hat die Änderung erstellt? | vorhanden |
| Alter und neuer Zustand? | **vorhanden**, Feld für Feld |
| Betroffene Personen/Einheiten? | vorhanden |
| Ab wann gültig? | vorhanden |
| Konflikte mit anderen Änderungen? | **fehlt** |
| Teilweise Freigabe? | **fehlt** |
| Zurückweisung? | vorhanden, mit Begründungspflicht |
| Begründung hinterlegbar? | vorhanden |
| Geplanter Stand verständlich? | **vorhanden**, gut gelöst |
| Vergleich vorher/nachher? | **vorhanden** |
| Wer hat wann entschieden? | vorhanden (Verlauf) |
| Historie? | vorhanden je Paket |
| Freigabe rückgängig? | teilweise — Status wird gesetzt, keine Gegenbuchung |

**Das ist der stärkste Teil der Anwendung.** Der Freigabeprozess ist durchdacht, das Vier-Augen-Prinzip greift nachweislich, und die Gegenüberstellung Vorher/Nachher ist verständlich. Es fehlen im Wesentlichen Konfliktprüfung und Teilfreigabe.

---

## 5. UI-Bewertung

| Kriterium | Bewertung |
|---|---|
| Wirkt es wie **eine** Anwendung? | überwiegend ja — Farben und Typografie sind konsistent |
| Module optisch unterschiedlich? | leicht — Änderungspakete nutzen andere Abstände als die Tabellenansichten |
| Zu viele Rahmen? | **ja** — Karte in Panel in Tabelle mit je eigenem Rahmen |
| Zu viele Schaltflächen? | **ja** — im Organigramm 12 Bedienelemente in zwei Leisten |
| Primär/sekundär unterscheidbar? | ja |
| Gefährliche Aktionen eindeutig? | **nein** — „Löschen" sieht aus wie „Zurücksetzen" |
| Tabellen zu breit? | ja, ab 1024 px abwärts |
| Formulare zu lang? | nein |
| Zu viele gleichwertige Informationen? | ja, auf den Organigrammkarten |
| Skalierbar für 1.200 Personen? | **nein**, siehe F-10 |
| Auf Touch nutzbar? | **nein**, 50 Ziele unter 44 px |
| Desktop-Arbeitsbereich effizient? | teilweise |

**Priorisierte UI-Verbesserungen:**

1. **Hoch** — Werkzeugleiste des Organigramms auf 4–5 sichtbare Aktionen reduzieren, Rest in ein Überlaufmenü.
2. **Hoch** — Gefährliche Aktionen visuell abheben (Randfarbe, Bestätigung).
3. **Hoch** — Touch-Ziele auf 44 px anheben.
4. **Mittel** — Rahmenverschachtelung auflösen; eine Ebene je Inhaltsblock.
5. **Mittel** — Informationsdichte der Karten reduzieren; Detail erst im Profil.
6. **Niedrig** — Abstände zwischen den Modulen vereinheitlichen.

---

## 6. Mobile Bewertung

**Die mobile Version ist keine mobile Bedienung.** Gemessen: bei 390 px und bei 1920 px identische DOM-Struktur (582 Knoten). Es wird derselbe Desktop-Inhalt skaliert.

Konkret fehlen: kompakte App-Leiste, mobile Hauptnavigation, fokussierte Zweigansicht, Organisationspfad, für Touch dimensionierte Ziele.

Positiv: kein horizontaler Überlauf bei 360, 390 und 412 px — das Layout bricht nicht.

**Empfehlung:** `mobile-ui-runtime.js` auf den zentralen Lebenszyklus umstellen und wieder einbinden (F-09). Die Voraussetzung dafür — keine globalen Body-Beobachter mehr — ist mit PR #7 erfüllt.

---

## 7. Zusammenfassung

**Was gut ist:** Der Freigabeprozess, die fachliche Trennung von Leitung und Mitgliedschaft, die konsistente Farb- und Schriftwelt, die Verständlichkeit der Formulare.

**Was fehlt:** Orientierung. Es gibt keinen Einstiegspunkt, keinen Pfad, keine Erklärung der Fachbegriffe. Das System setzt voraus, dass der Nutzer die Organisation bereits kennt — genau das, wofür ein Organigramm eigentlich da ist.

**Was stört:** Die Doppelung der Bearbeitungswege und die Umgehbarkeit des Freigabeprozesses. Beides untergräbt das ansonsten saubere Redaktionskonzept.
