/**
 * Gemeinsames Rollenvokabular der Demo.
 *
 * Ausgangslage: Jedes Zusatzmodul brachte seine eigene Rollenauskunft mit.
 * `leadership-overlay.js` und `person-groups.js` prüften gegen eine fest
 * verdrahtete Liste, `changeset-demo.js` führte eigene Beschriftungen und
 * Rechte, `platform-admin.js` leitete das Superadministrationsrecht sogar aus
 * dem sichtbaren Text der Kopfzeile ab (`/superadmin/i`). Eine geänderte
 * Beschriftung hätte dort unbemerkt Rechte entzogen.
 *
 * Dieses Modul führt Bezeichnungen, Rollenkennungen und Rechte an einer Stelle
 * zusammen. Es ist bewusst zustandslos: Es hält keine Daten, sondern liest die
 * aktive Rolle weiterhin aus dem bestehenden Auswahlfeld `#roleSelect`. Die
 * Rechte entsprechen unverändert dem bisherigen Verhalten; geändert wird nur,
 * woher die Module ihre Auskunft beziehen.
 *
 * `app.js` bleibt unverändert. Weicht dessen Rollenliste künftig ab, meldet der
 * Test `test/roles.test.js` die Abweichung.
 */
(() => {
  const ROLE_ORDER = ['viewer', 'editor', 'admin', 'superadmin']

  const definitions = {
    viewer: {
      id: 'viewer',
      label: 'Leser',
      demoPerson: 'Alex Beispiel',
      permissions: ['view', 'preview'],
    },
    editor: {
      id: 'editor',
      label: 'Bereichsredaktion',
      demoPerson: 'Mika Muster',
      permissions: ['view', 'create', 'submit', 'preview'],
    },
    admin: {
      id: 'admin',
      label: 'Administrator',
      demoPerson: 'Robin Demo',
      permissions: ['view', 'create', 'submit', 'review', 'publish', 'withdraw', 'preview', 'users'],
    },
    superadmin: {
      id: 'superadmin',
      label: 'Superadministrator',
      demoPerson: 'Sam Test',
      permissions: ['view', 'create', 'submit', 'review', 'publish', 'withdraw', 'rollback', 'preview', 'users'],
    },
  }

  const labels = Object.fromEntries(ROLE_ORDER.map((id) => [id, definitions[id].label]))
  const demoPersons = Object.fromEntries(ROLE_ORDER.map((id) => [id, definitions[id].demoPerson]))
  const permissions = Object.fromEntries(ROLE_ORDER.map((id) => [id, [...definitions[id].permissions]]))

  /** Rollenkennung aus einer beliebigen Angabe (Kennung oder Beschriftung). */
  const normalize = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return null
    if (definitions[raw]) return raw
    const lower = raw.toLocaleLowerCase('de-DE')
    const byId = ROLE_ORDER.find((id) => id === lower)
    if (byId) return byId
    const byLabel = ROLE_ORDER.find((id) => labels[id].toLocaleLowerCase('de-DE') === lower)
    if (byLabel) return byLabel
    // Kopfzeilentext der Form „Superadministrator · sam.test@example.org“.
    const byPrefix = ROLE_ORDER
      .filter((id) => lower.startsWith(labels[id].toLocaleLowerCase('de-DE')))
      .sort((a, b) => labels[b].length - labels[a].length)[0]
    return byPrefix || null
  }

  /**
   * Aktive Rolle. Maßgeblich ist das Auswahlfeld der Anmeldung; nur wenn es
   * fehlt, wird ersatzweise die Kopfzeile ausgewertet. `viewer` ist der
   * geringstberechtigte Rückfall.
   */
  const currentRoleId = () => {
    if (typeof document === 'undefined') return 'viewer'
    const fromSelect = normalize(document.getElementById('roleSelect')?.value)
    if (fromSelect) return fromSelect
    const fromHeader = normalize(document.getElementById('userRole')?.textContent)
    return fromHeader || 'viewer'
  }

  const permissionsFor = (roleId) => permissions[normalize(roleId) || 'viewer'] || []
  const can = (permission, roleId) => permissionsFor(roleId ?? currentRoleId()).includes(permission)

  /**
   * Darf die Rolle Strukturdaten bearbeiten (Leitungsfunktionen,
   * Unterkategorien)? Entspricht der bisherigen Liste editor/admin/superadmin.
   */
  const canEditStructure = (roleId) => can('create', roleId)
  const isSuperadmin = (roleId) => (normalize(roleId ?? currentRoleId()) === 'superadmin')
  const label = (roleId) => labels[normalize(roleId) || 'viewer'] || String(roleId ?? '')
  const demoPerson = (roleId) => demoPersons[normalize(roleId) || 'viewer'] || String(roleId ?? '')

  const api = {
    ROLE_ORDER: [...ROLE_ORDER],
    labels: { ...labels },
    demoPersons: { ...demoPersons },
    permissions,
    normalize,
    currentRoleId,
    permissionsFor,
    can,
    canEditStructure,
    isSuperadmin,
    label,
    demoPerson,
  }

  if (typeof globalThis !== 'undefined') globalThis.MWRoles = api
})()
