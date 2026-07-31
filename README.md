# MW OrgChart – Live-Demo

Öffentliche, anonymisierte Vorschau des MW OrgChart.

- ausschließlich Beispieldaten
- keine Verbindung zum produktiven Backend
- keine PostgreSQL-Datenbank
- keine vertraulichen Beschäftigtendaten
- Änderungen werden nur lokal im Browser gespeichert

Die Live-Demo wird unter <https://xyronomega.github.io/MW-OrgChart-Demo/> veröffentlicht.

## Funktionen

Organigramm mit Suche und Drag-and-drop, Personenprofile, eigenes Profil,
Admin-Center, Standorte, Zusatzfunktionen, Organisationstypen, Personen- und
Einheitenpflege sowie Datenqualität.

Ergänzt um:

- **Änderungspakete** mit den Status Entwurf, Zur Prüfung, Freigegeben,
  Terminiert, Veröffentlicht und Abgelehnt
- **Vier-Augen-Prinzip**: Wer ein Paket einreicht, kann es weder freigeben
  noch ablehnen
- **Vorschau** des geplanten Organigrammstands und Gegenüberstellung mit dem
  aktuellen Stand
- **Benutzerverwaltung** mit den Kontostatus Aktiv, Gesperrt und Deaktiviert

## Aufbau

Statische Dateien ohne Build-Schritt. `index.html` lädt `app.js` und die
Zusatzmodule; jedes Modul ist eigenständig und spricht nur den LocalStorage an.

| Datei | Inhalt |
|---|---|
| `app.js` | Grundgerüst: Rollen, Organigramm, Profile, Verwaltungsansichten |
| `platform-admin.js` | Organisationstypen und Systemeinstellungen |
| `organization-unit-editor.js` | Anlegen und Pflegen von Organisationseinheiten |
| `leadership-overlay.js` | Leitungszuordnungen im Organigramm |
| `changeset-demo.js` | Änderungspakete, Vorschau, Benutzerverwaltung |

## Entwicklung

```bash
npm run check   # Syntaxprüfung aller Skripte
npm test        # Tests der Workflow- und Vorschaulogik
```

Die Tests benötigen keine Abhängigkeiten; sie laufen mit dem Test-Runner von
Node. Lokal genügt ein einfacher Dateiserver, zum Beispiel
`python3 -m http.server`.

## Veröffentlichung

`main` ist die Quelle. Der Workflow `publish-demo.yml` kopiert den Stand nach
jedem Push unverändert nach `gh-pages`, von wo GitHub Pages ausliefert. Die
Adresse bleibt dadurch unverändert. Alle Verweise in `index.html` sind relativ,
deshalb funktioniert der Projektpfad `/MW-OrgChart-Demo/` ohne weitere
Konfiguration.
