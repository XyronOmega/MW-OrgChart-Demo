/**
 * Kern der MW-OrgChart-Demo: Anmeldung, Navigation, Organigramm, Personen-,
 * Organisations-, Standort- und Funktionsverwaltung, Profil und Datenqualität.
 *
 * Herkunft dieser Datei
 * ---------------------
 * Bis einschließlich `c078b47` wurde dieser Quelltext als gzip-komprimierter,
 * base64-kodierter Block ausgeliefert und zur Laufzeit über
 * `DecompressionStream` entpackt und mit `new Function(code)()` ausgeführt.
 * Ein lesbarer Originalquelltext existierte in der Git-Historie nicht – die
 * Datei war bereits im ersten Commit (`5491534`) gepackt.
 *
 * Der Block wurde mit `tools/unpack-app.mjs` entpackt und mit Prettier
 * umbrochen. Verändert wurden ausschließlich Zeilenumbrüche und Einrückung;
 * Bezeichner, Reihenfolge, Zeichenketten und Logik sind unverändert. Das
 * Verfahren und die Prüfsummen stehen in `docs/app-source/ENTPACKEN.md`.
 *
 * Geltungsbereich
 * ---------------
 * Der Inhalt lief bisher im Funktionsrumpf von `new Function(code)()` und war
 * damit gegen den globalen Namensraum abgeschottet. Die umschließende
 * Funktion hier hält denselben Geltungsbereich aufrecht: Die einzige
 * beabsichtigte globale Schnittstelle ist `window.closeDrawer`, die weiter
 * unten unverändert gesetzt wird und vom `onclick` der Schließen-Schaltfläche
 * im Personenprofil benötigt wird.
 */
(() => {
  const el = (id) => document.getElementById(id);
  const roleSelect = el('roleSelect'),
    roleInfo = el('roleInfo'),
    loginBtn = el('loginBtn'),
    loginPage = el('loginPage'),
    app = el('app'),
    switchRoleBtn = el('switchRoleBtn'),
    resetBtn = el('resetBtn'),
    userName = el('userName'),
    userRole = el('userRole'),
    nav = el('nav'),
    content = el('content'),
    drawerBackdrop = el('drawerBackdrop'),
    drawer = el('drawer');
  const roles = {
    viewer: {
      label: 'Leser',
      name: 'Alex Beispiel',
      email: 'alex.beispiel@example.org',
      views: ['chart', 'profile'],
    },
    editor: {
      label: 'Bereichsredaktion',
      name: 'Mika Muster',
      email: 'mika.muster@example.org',
      views: ['chart', 'profile', 'people', 'units', 'quality'],
    },
    admin: {
      label: 'Administrator',
      name: 'Robin Demo',
      email: 'robin.demo@example.org',
      views: ['chart', 'profile', 'admin', 'locations', 'functions', 'styles', 'people', 'units', 'quality'],
    },
    superadmin: {
      label: 'Superadministrator',
      name: 'Sam Test',
      email: 'sam.test@example.org',
      views: ['chart', 'profile', 'admin', 'locations', 'functions', 'styles', 'people', 'units', 'quality'],
    },
  };
  const navItems = [
    ['chart', 'Organigramm'],
    ['profile', 'Mein Profil'],
    ['admin', 'Admin-Center'],
    ['locations', 'Standorte'],
    ['functions', 'Zusatzfunktionen'],
    ['styles', 'Kartenstile'],
    ['people', 'Personen'],
    ['units', 'Organisationseinheiten'],
    ['quality', 'Datenqualität'],
  ];
  const unitLabels = { company: 'Unternehmen', section: 'Sektion', department: 'Abteilung', team: 'Team' };
  const unitParentTypes = {
    section: ['company'],
    department: ['company', 'section'],
    team: ['company', 'section', 'department'],
  };
  const defaultLocations = [
    { id: 'loc1', name: 'Zentrale', address: 'Beispielstraße 10, München', active: true },
    { id: 'loc2', name: 'Servicecenter Nord', address: 'Musterweg 4, München', active: true },
    { id: 'loc3', name: 'Technikstandort', address: 'Demoplatz 8, München', active: true },
  ];
  const defaultFunctions = [
    { id: 'f1', name: 'Projektkoordination', category: 'project', icon: '◆' },
    { id: 'f2', name: 'Datenschutz', category: 'tech', icon: '▣' },
    { id: 'f3', name: 'Arbeitsschutz', category: 'safety', icon: '⚠' },
    { id: 'f4', name: 'Onboarding', category: 'people', icon: '●' },
    { id: 'f5', name: 'IT-Koordination', category: 'tech', icon: '⌘' },
    { id: 'f6', name: 'BEM', category: 'people', icon: '♥' },
  ];
  const defaultNodes = [
    {
      id: 'mw',
      parent: null,
      type: 'company',
      name: 'Münchner Wohnen',
      subtitle: 'Organisationsübersicht',
      accent: '#070042',
    },
    {
      id: 'prv',
      parent: 'mw',
      type: 'section',
      name: 'Personal, Recht und Verwaltung',
      subtitle: 'Sektion',
      accent: '#070042',
    },
    {
      id: 'pm',
      parent: 'prv',
      type: 'department',
      name: 'Personalmanagement',
      subtitle: 'Abteilung',
      accent: '#99e7ff',
    },
    {
      id: 'pa',
      parent: 'prv',
      type: 'department',
      name: 'Personaladministration',
      subtitle: 'Abteilung',
      accent: '#fda8ff',
    },
    {
      id: 'pe',
      parent: 'prv',
      type: 'department',
      name: 'Personalentwicklung',
      subtitle: 'Abteilung',
      accent: '#a8ffab',
    },
    {
      id: 'pc',
      parent: 'prv',
      type: 'department',
      name: 'Personalcontrolling',
      subtitle: 'Abteilung',
      accent: '#ff757b',
    },
    {
      id: 'pm-hrbp',
      parent: 'pm',
      type: 'team',
      name: 'HR Business Partner',
      subtitle: 'Team',
      accent: '#a8ffab',
    },
    { id: 'pm-sb', parent: 'pm', type: 'team', name: 'Sachbearbeitung', subtitle: 'Team', accent: '#a8ffab' },
    {
      id: 'pa-pay',
      parent: 'pa',
      type: 'team',
      name: 'Entgeltabrechnung',
      subtitle: 'Team',
      accent: '#fda8ff',
    },
    {
      id: 'pa-time',
      parent: 'pa',
      type: 'team',
      name: 'Zeitwirtschaft',
      subtitle: 'Team',
      accent: '#fda8ff',
    },
    {
      id: 'pe-learning',
      parent: 'pe',
      type: 'team',
      name: 'Ausbildung & Weiterbildung',
      subtitle: 'Team',
      accent: '#a8ffab',
    },
    {
      id: 'pe-onboarding',
      parent: 'pe',
      type: 'team',
      name: 'Onboarding',
      subtitle: 'Team',
      accent: '#a8ffab',
    },
    { id: 'pc-bgsm', parent: 'pc', type: 'team', name: 'BGSM', subtitle: 'Team', accent: '#99e7ff' },
    {
      id: 'pc-control',
      parent: 'pc',
      type: 'team',
      name: 'HR-Controlling',
      subtitle: 'Team',
      accent: '#ff757b',
    },
    {
      id: 'p1',
      parent: 'pm-hrbp',
      type: 'person',
      name: 'Lea Beispiel',
      role: 'HR Business Partner',
      email: 'lea.beispiel@example.org',
      phone: '089 100001',
      location: 'Zentrale',
      functions: ['Projektkoordination'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p2',
      parent: 'pm-hrbp',
      type: 'person',
      name: 'Noah Muster',
      role: 'HR Business Partner',
      email: 'noah.muster@example.org',
      phone: '089 100002',
      location: 'Zentrale',
      functions: ['Datenschutz'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p3',
      parent: 'pm-sb',
      type: 'person',
      name: 'Mila Demo',
      role: 'Sachbearbeitung',
      email: 'mila.demo@example.org',
      phone: '089 100003',
      location: 'Servicecenter Nord',
      functions: ['Onboarding'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p4',
      parent: 'pa-pay',
      type: 'person',
      name: 'Elias Test',
      role: 'Entgeltabrechnung',
      email: 'elias.test@example.org',
      phone: '089 100004',
      location: 'Zentrale',
      functions: ['BEM'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p5',
      parent: 'pa-time',
      type: 'person',
      name: 'Lina Probe',
      role: 'Zeitwirtschaft',
      email: 'lina.probe@example.org',
      phone: '089 100005',
      location: 'Servicecenter Nord',
      functions: [],
      status: 'Elternzeit',
      accent: '#ff757b',
    },
    {
      id: 'p6',
      parent: 'pe-learning',
      type: 'person',
      name: 'Finn Beispiel',
      role: 'Personalentwicklung',
      email: 'finn.beispiel@example.org',
      phone: '089 100006',
      location: 'Zentrale',
      functions: ['Projektkoordination'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p7',
      parent: 'pe-onboarding',
      type: 'person',
      name: 'Emma Muster',
      role: 'Onboarding',
      email: 'emma.muster@example.org',
      phone: '089 100007',
      location: 'Zentrale',
      functions: ['Onboarding'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p8',
      parent: 'pc-bgsm',
      type: 'person',
      name: 'Luis Demo',
      role: 'BGSM',
      email: 'luis.demo@example.org',
      phone: '089 100008',
      location: 'Technikstandort',
      functions: ['Arbeitsschutz', 'BEM'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
    {
      id: 'p9',
      parent: 'pc-control',
      type: 'person',
      name: 'Sofia Test',
      role: 'HR-Controlling',
      email: 'sofia.test@example.org',
      phone: '089 100009',
      location: 'Zentrale',
      functions: ['IT-Koordination'],
      status: 'Aktiv',
      accent: '#ff757b',
    },
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const load = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || clone(fallback);
    } catch {
      return clone(fallback);
    }
  };
  let state = {
    role: 'viewer',
    view: 'chart',
    editMode: false,
    query: '',
    selectedStyle: 'standard',
    nodes: load('mw-demo-nodes', defaultNodes),
    locations: load('mw-demo-locations', defaultLocations),
    functions: load('mw-demo-functions', defaultFunctions),
    profile: load('mw-demo-profile', {
      phone: '089 123456',
      mobile: '0170 1234567',
      location: 'Zentrale',
      about: 'Demo-Profil für die öffentliche Vorschau.',
    }),
  };
  let draggedId = null;
  const save = () => {
    localStorage.setItem('mw-demo-nodes', JSON.stringify(state.nodes));
    localStorage.setItem('mw-demo-locations', JSON.stringify(state.locations));
    localStorage.setItem('mw-demo-functions', JSON.stringify(state.functions));
    localStorage.setItem('mw-demo-profile', JSON.stringify(state.profile));
  };
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c],
    );
  const canEdit = () => state.role !== 'viewer';
  const isAdmin = () => state.role === 'admin' || state.role === 'superadmin';
  const viewHead = (title, text, actions = '') =>
    `<div class="view-head"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div><div class="actions">${actions}</div></div>`;
  const table = (headers, rows) =>
    `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Keine Einträge vorhanden.</td></tr>`}</tbody></table></div>`;
  function unitPath(id) {
    const parts = [],
      seen = new Set();
    let current = state.nodes.find((n) => n.id === id);
    while (current && !seen.has(current.id)) {
      parts.unshift(current.name);
      seen.add(current.id);
      current = current.parent ? state.nodes.find((n) => n.id === current.parent) : null;
    }
    return parts;
  }
  function unitOptions() {
    return state.nodes
      .filter((n) => n.type !== 'person')
      .sort((a, b) => unitPath(a.id).join(' / ').localeCompare(unitPath(b.id).join(' / '), 'de'));
  }
  function functionMeta(name) {
    return state.functions.find((f) => f.name === name) || { name, category: 'project', icon: '◆' };
  }
  function badgeHtml(name) {
    const f = functionMeta(name);
    return `<span class="badge ${esc(f.category)}"><span aria-hidden="true">${esc(f.icon)}</span>${esc(name)}</span>`;
  }

  // --- Bearbeitungsmasken -------------------------------------------------
  //
  // Erfassung und Bearbeitung laufen ausschließlich über `MWEditMask` als
  // eigener Seitenzustand in `#content`. Es gibt keine modalen Fenster, keine
  // Bearbeitungs-Drawer, keine Systemdialoge, kein Neuladen und kein Polling.
  // Nach dem Speichern wird nur die betroffene Ansicht neu aufgebaut; Rolle
  // und aktive Navigation bleiben unberührt.

  const ORGANIZATION_TYPE_KEY = 'mw-demo-organization-types';
  const PERSON_GROUP_KEY = 'mw-demo-person-groups-v1';
  const LEADERSHIP_KEY = 'mw-demo-leadership-assignments';

  /** Systemtypen, solange die Plattformverwaltung nichts anderes hinterlegt hat. */
  const defaultOrganizationTypes = [
    { id: 'company', label: 'Unternehmen', baseType: 'company', color: '#070042', active: true },
    { id: 'management', label: 'Geschäftsführung', baseType: 'management', color: '#fda8ff', active: true },
    { id: 'section', label: 'Sektion', baseType: 'section', color: '#ff757b', active: true },
    { id: 'department', label: 'Abteilung', baseType: 'department', color: '#99e7ff', active: true },
    { id: 'team', label: 'Team', baseType: 'team', color: '#a8ffab', active: true },
    { id: 'person', label: 'Person', baseType: 'person', color: '#f3f5f6', active: true },
  ];

  /** Welche Basisebene darf unter welcher liegen. */
  const unitParentBaseTypes = {
    company: ['company'],
    management: ['company'],
    section: ['company', 'management'],
    department: ['company', 'management', 'section'],
    team: ['company', 'management', 'section', 'department'],
  };

  const readJson = (key, fallback) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  };

  const organizationTypes = () => {
    const stored = readJson(ORGANIZATION_TYPE_KEY, null);
    const list = Array.isArray(stored) && stored.length ? stored : defaultOrganizationTypes;
    return list.filter((type) => type && type.baseType !== 'person');
  };

  const typeForNode = (node, types) =>
    types.find((type) => type.id === (node?.organizationTypeId || node?.type)) ||
    types.find((type) => type.baseType === node?.type) ||
    null;

  const baseTypeOf = (node, types) => typeForNode(node, types)?.baseType || node?.type || '';

  /** Alle Nachfahren einer Einheit – für Zyklusprüfung und Auswirkungen. */
  function descendantIds(nodes, rootId) {
    const result = new Set();
    const queue = [rootId];
    while (queue.length) {
      const current = queue.shift();
      nodes
        .filter((node) => String(node.parent || '') === String(current))
        .forEach((child) => {
          if (result.has(child.id)) return;
          result.add(child.id);
          queue.push(child.id);
        });
    }
    return result;
  }

  const personGroups = () => {
    const stored = readJson(PERSON_GROUP_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  /** Unterkategorien einer OrgEinheit, ohne den Systembereich „Direkt zugeordnet“. */
  const subcategoriesForUnit = (unitId) =>
    personGroups()
      .filter(
        (group) =>
          String(group?.orgUnitId || '') === String(unitId) &&
          group?.kind !== 'DIRECT' &&
          !String(group?.id || '').startsWith('direct:') &&
          group?.active !== false,
      )
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const leadershipAssignments = () => {
    const stored = readJson(LEADERSHIP_KEY, []);
    return Array.isArray(stored) ? stored : [];
  };

  const splitName = (person) => {
    const first = String(person?.firstName || '').trim();
    const last = String(person?.lastName || '').trim();
    if (first || last) return { firstName: first, lastName: last };
    const parts = String(person?.name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: '', lastName: parts[0] };
    const particles = new Set(['von', 'van', 'de', 'del', 'der', 'den', 'zu', 'zur', 'zum']);
    let start = parts.length - 1;
    while (start > 0 && particles.has(parts[start - 1].toLocaleLowerCase('de-DE'))) start -= 1;
    return { firstName: parts.slice(0, start).join(' '), lastName: parts.slice(start).join(' ') };
  };

  const PERSON_STATUS = ['Aktiv', 'Elternzeit', 'Langzeitabwesend', 'Sabbatical', 'Ruhestand', 'Inaktiv'];
  // Bewusst konservativ: genau ein @, davor und danach etwas, im Rest ein Punkt.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // --- Fachliche Prüfungen (rein, ohne DOM – dadurch testbar) --------------

  /**
   * Prüft die Angaben einer Person.
   * @returns {Object} Zuordnung Feldname → Meldung; leer, wenn alles stimmt.
   */
  function validatePersonValues(values, context) {
    const nodes = context?.nodes || [];
    const groups = context?.groups || [];
    const editingId = context?.editingId ? String(context.editingId) : null;
    const errors = {};
    const text = (key) => String(values?.[key] ?? '').trim();

    if (!text('firstName')) errors.firstName = 'Bitte den Vornamen angeben.';
    if (!text('lastName')) errors.lastName = 'Bitte den Nachnamen angeben.';
    if (!text('role')) errors.role = 'Bitte die Funktions- oder Stellenbezeichnung angeben.';

    const id = text('id');
    if (!id) errors.id = 'Die Kennung darf nicht leer sein.';
    else if (nodes.some((node) => String(node.id) === id && String(node.id) !== editingId))
      errors.id = 'Diese Kennung ist bereits vergeben.';

    const email = text('email');
    if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse angeben.';
    else if (
      email &&
      nodes.some(
        (node) =>
          node.type === 'person' &&
          String(node.id) !== editingId &&
          String(node.email || '').toLocaleLowerCase('de-DE') === email.toLocaleLowerCase('de-DE'),
      )
    )
      errors.email = 'Diese E-Mail-Adresse ist bereits einer anderen Person zugeordnet.';

    const parent = text('parent');
    if (!parent) errors.parent = 'Bitte die primäre Organisationseinheit auswählen.';
    else if (!nodes.some((node) => String(node.id) === parent && node.type !== 'person'))
      errors.parent = 'Diese Organisationseinheit besteht nicht.';

    const subcategory = text('subcategoryId');
    if (subcategory) {
      const group = groups.find((item) => String(item?.id) === subcategory);
      if (!group) errors.subcategoryId = 'Diese Unterkategorie besteht nicht.';
      else if (String(group.orgUnitId || '') !== parent)
        errors.subcategoryId = 'Die Unterkategorie gehört nicht zur gewählten Organisationseinheit.';
    }

    if (values?.status && !PERSON_STATUS.includes(String(values.status)))
      errors.status = 'Dieser Beschäftigungsstatus ist nicht vorgesehen.';

    return errors;
  }

  /**
   * Prüft die Angaben einer Organisationseinheit.
   * @returns {Object} Zuordnung Feldname → Meldung; leer, wenn alles stimmt.
   */
  function validateUnitValues(values, context) {
    const nodes = context?.nodes || [];
    const types = context?.types || [];
    const editingId = context?.editingId ? String(context.editingId) : null;
    const errors = {};
    const text = (key) => String(values?.[key] ?? '').trim();

    const typeId = text('organizationTypeId');
    const definition = types.find((type) => type.id === typeId);
    if (!typeId) errors.organizationTypeId = 'Bitte einen Organisationstyp auswählen.';
    else if (!definition) errors.organizationTypeId = 'Dieser Organisationstyp besteht nicht.';

    const name = text('name');
    if (!name) errors.name = 'Bitte eine Bezeichnung angeben.';

    const parent = text('parent');
    const current = editingId ? nodes.find((node) => String(node.id) === editingId) : null;
    const istWurzel = Boolean(current) && !current.parent;

    if (!parent) {
      // Genau eine Einheit darf ohne übergeordnete Einheit bestehen: die Wurzel.
      if (!istWurzel) errors.parent = 'Bitte die übergeordnete Organisationseinheit auswählen.';
    } else if (editingId && parent === editingId) {
      errors.parent = 'Eine Einheit kann sich nicht selbst übergeordnet sein.';
    } else if (!nodes.some((node) => String(node.id) === parent && node.type !== 'person')) {
      errors.parent = 'Diese übergeordnete Einheit besteht nicht.';
    } else if (editingId && descendantIds(nodes, editingId).has(parent)) {
      errors.parent = 'Diese Zuordnung erzeugt einen Kreis in der Hierarchie.';
    } else if (definition) {
      const parentNode = nodes.find((node) => String(node.id) === parent);
      const erlaubt = unitParentBaseTypes[definition.baseType] || [];
      const parentBase = baseTypeOf(parentNode, types);
      if (erlaubt.length && !erlaubt.includes(parentBase))
        errors.parent = `Eine Einheit vom Typ „${definition.label}“ kann hier nicht eingeordnet werden.`;
    }

    if (name && !errors.parent) {
      const dublette = nodes.some(
        (node) =>
          node.type !== 'person' &&
          String(node.id) !== editingId &&
          String(node.parent || '') === parent &&
          String(node.name || '')
            .trim()
            .toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'),
      );
      if (dublette) errors.name = 'Auf dieser Ebene besteht bereits eine Einheit mit dieser Bezeichnung.';
    }

    const email = text('email');
    if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse angeben.';

    return errors;
  }

  /** Auswirkungen einer Änderung an einer OrgEinheit, für den Bereich „Auswirkungen“. */
  function unitImpact(nodes, assignments, unitId) {
    if (!unitId) return ['Neue Einheit – es sind noch keine Untereinheiten oder Personen betroffen.'];
    const descendants = descendantIds(nodes, unitId);
    const subUnits = [...descendants]
      .map((id) => nodes.find((node) => String(node.id) === String(id)))
      .filter((node) => node && node.type !== 'person');
    const direkt = nodes.filter(
      (node) => node.type === 'person' && String(node.parent || '') === String(unitId),
    );
    const mittelbar = nodes.filter(
      (node) =>
        node.type === 'person' && descendants.has(node.id) && String(node.parent || '') !== String(unitId),
    );
    const leitungen = assignments.filter((entry) => String(entry?.orgUnitId || '') === String(unitId));
    return [
      subUnits.length
        ? `${subUnits.length} untergeordnete ${subUnits.length === 1 ? 'Einheit' : 'Einheiten'}: ${subUnits.map((node) => node.name).join(', ')}`
        : 'Keine untergeordneten Einheiten.',
      direkt.length
        ? `${direkt.length} unmittelbar zugeordnete ${direkt.length === 1 ? 'Person' : 'Personen'}: ${direkt.map((node) => node.name).join(', ')}`
        : 'Keine unmittelbar zugeordneten Personen.',
      mittelbar.length
        ? `${mittelbar.length} weitere ${mittelbar.length === 1 ? 'Person' : 'Personen'} in untergeordneten Einheiten.`
        : 'Keine Personen in untergeordneten Einheiten.',
      leitungen.length
        ? `${leitungen.length} ${leitungen.length === 1 ? 'Leitungszuordnung' : 'Leitungszuordnungen'}: ${leitungen.map((entry) => entry.leadershipRole).join(', ')}`
        : 'Keine Leitungszuordnung hinterlegt.',
      'Leitung und Mitgliedschaft bleiben getrennt: Eine Verschiebung ändert keine Leitungsmandate.',
    ];
  }

  const validationApi = {
    validatePersonValues,
    validateUnitValues,
    unitImpact,
    descendantIds,
    splitName,
    PERSON_STATUS,
    EMAIL_PATTERN,
    unitParentBaseTypes,
  };
  window.MWAppValidation = validationApi;

  // --- Speichern ----------------------------------------------------------

  /** Meldet den übrigen Modulen eine Datenänderung, ohne die Seite neu zu laden. */
  const announceNodesChanged = () =>
    document.dispatchEvent(new CustomEvent('mw-demo-nodes-changed', { bubbles: false }));

  /**
   * Schreibt eine Person. Die Rechteprüfung liegt hier und nicht nur in der
   * Darstellung.
   * @returns {Object|true} `{ error, field }` oder `true`
   */
  function savePersonValues(values, editingId) {
    if (!canEdit()) return { error: 'Die aktive Rolle darf keine Personen bearbeiten.' };
    const errors = validatePersonValues(values, {
      nodes: state.nodes,
      groups: personGroups(),
      editingId,
    });
    const firstField = Object.keys(errors)[0];
    if (firstField) return { error: errors[firstField], field: firstField };

    const firstName = String(values.firstName).trim();
    const lastName = String(values.lastName).trim();
    const next = {
      id: String(values.id).trim(),
      parent: String(values.parent).trim(),
      type: 'person',
      firstName,
      lastName,
      // `name` bleibt als Anzeigename erhalten; die LocalStorage-Struktur
      // ändert sich dadurch nicht, Vor- und Nachname kommen additiv hinzu.
      name: [firstName, lastName].filter(Boolean).join(' '),
      role: String(values.role).trim(),
      status: String(values.status || 'Aktiv'),
      email: String(values.email || '').trim(),
      phone: String(values.phone || '').trim(),
      mobile: String(values.mobile || '').trim(),
      location: String(values.location || '').trim(),
      subcategoryId: String(values.subcategoryId || '').trim() || null,
      functions: state.functions
        .map((item) => item.name)
        .filter((name) => values[`function:${name}`] === true),
      accent: '#ff757b',
    };
    const existing = state.nodes.find((node) => String(node.id) === String(editingId || next.id));
    if (existing) Object.assign(existing, next);
    else state.nodes.push(next);
    save();
    announceNodesChanged();
    return true;
  }

  /**
   * Schreibt eine Organisationseinheit.
   * @returns {Object|true} `{ error, field }` oder `true`
   */
  function saveUnitValues(values, editingId) {
    if (!canEdit()) return { error: 'Die aktive Rolle darf keine Organisationseinheiten bearbeiten.' };
    const types = organizationTypes();
    const errors = validateUnitValues(values, { nodes: state.nodes, types, editingId });
    const firstField = Object.keys(errors)[0];
    if (firstField) return { error: errors[firstField], field: firstField };

    const definition = types.find((type) => type.id === String(values.organizationTypeId));
    const next = {
      id: String(values.id).trim(),
      parent: String(values.parent || '').trim() || null,
      type: definition.baseType,
      organizationTypeId: definition.id,
      baseType: definition.baseType,
      name: String(values.name).trim(),
      subtitle: definition.label,
      shortName: String(values.shortName || '').trim(),
      location: String(values.location || '').trim(),
      email: String(values.email || '').trim(),
      phone: String(values.phone || '').trim(),
      description: String(values.description || '').trim(),
      isActive: values.isActive !== false,
      accent: definition.color,
    };
    const existing = state.nodes.find((node) => String(node.id) === String(editingId || next.id));
    if (existing) Object.assign(existing, next);
    else state.nodes.push(next);
    save();
    announceNodesChanged();
    return true;
  }

  // --- Sichtbarer Hinweis innerhalb der Seite ------------------------------

  /**
   * Ersetzt den früheren `alert` bei unzulässigen Verschiebungen. Der Hinweis
   * steht im Inhaltsbereich und verschwindet beim nächsten Aufbau der Ansicht.
   */
  let pendingViewNotice = null;
  function showViewNotice(text, tone = 'error') {
    pendingViewNotice = { text, tone };
    renderViewNotice();
  }
  function renderViewNotice() {
    if (!pendingViewNotice) return;
    const holder = content.querySelector('[data-view-notice]');
    if (!holder) return;
    holder.textContent = pendingViewNotice.text;
    holder.className = `view-notice view-notice--${pendingViewNotice.tone}`;
    holder.hidden = false;
    holder.setAttribute('role', 'status');
  }
  const viewNoticeHtml = () => '<p class="view-notice" data-view-notice hidden></p>';

  // --- Masken --------------------------------------------------------------

  const unitLabelFor = (node) => {
    const definition = typeForNode(node, organizationTypes());
    return definition?.label || unitLabels[node?.type] || node?.type || '';
  };

  const unitSelectOptions = (exclude = new Set()) =>
    unitOptions()
      .filter((unit) => !exclude.has(unit.id))
      .map((unit) => ({
        value: unit.id,
        label: `${unitPath(unit.id).join(' › ')} · ${unitLabelFor(unit)}`,
      }));

  /** Maske für eine Person. `personId` leer bedeutet Neuanlage. */
  function openPersonMask(personId) {
    if (!canEdit() || !window.MWEditMask) return false;
    const person = personId ? state.nodes.find((node) => String(node.id) === String(personId)) : null;
    if (personId && !person) return false;
    const parts = splitName(person);
    const parent = person?.parent || '';
    const zurueck = () => {
      state.view = 'people';
      renderPeople();
    };

    const werte = {
      id: person?.id || `p${Date.now()}`,
      firstName: parts.firstName,
      lastName: parts.lastName,
      role: person?.role || '',
      status: person?.status || 'Aktiv',
      parent,
      subcategoryId: person?.subcategoryId || '',
      email: person?.email || '',
      phone: person?.phone || '',
      mobile: person?.mobile || '',
      location: person?.location || '',
    };
    state.functions.forEach((item) => {
      werte[`function:${item.name}`] = (person?.functions || []).includes(item.name);
    });

    const subcategoryOptions = (unitId) => [
      { value: '', label: 'Direkt zugeordnet' },
      ...subcategoriesForUnit(unitId).map((group) => ({ value: group.id, label: group.name })),
    ];

    window.MWEditMask.open({
      id: 'person',
      eyebrow: 'Organisation · Personen',
      title: person ? `Person „${person.name}“ bearbeiten` : 'Neue Person anlegen',
      description: person
        ? 'Stammdaten, organisatorische Zuordnung, Kontakt und Zusatzfunktionen dieser Person.'
        : 'Stammdaten erfassen und die genaue Position im Organigramm festlegen.',
      breadcrumb: [
        { label: 'Organisation' },
        { label: 'Personen', onSelect: zurueck },
        { label: person ? person.name : 'Neue Person' },
      ],
      sections: [
        {
          title: 'Stammdaten',
          description: 'Name und Aufgabe der Person.',
          fields: [
            { name: 'firstName', label: 'Vorname', type: 'text', required: true, maxLength: 60 },
            { name: 'lastName', label: 'Nachname', type: 'text', required: true, maxLength: 60 },
            {
              name: 'role',
              label: 'Funktions- oder Stellenbezeichnung',
              type: 'text',
              required: true,
              maxLength: 80,
              wide: true,
              hint: 'Die Aufgabe der Person, nicht ihre Rolle in der Anwendung.',
            },
            {
              name: 'status',
              label: 'Beschäftigungsstatus',
              type: 'select',
              options: PERSON_STATUS.map((value) => ({ value, label: value })),
            },
            {
              name: 'id',
              label: 'Kennung',
              type: 'text',
              required: true,
              hint: 'Muss eindeutig sein. Wird für Verweise aus anderen Ansichten verwendet.',
            },
          ],
        },
        {
          title: 'Organisatorische Zuordnung',
          description:
            'Die Organisationseinheit bestimmt die Position im Organigramm. Eine Unterkategorie gliedert nur die Darstellung innerhalb dieser Einheit; sie ist keine eigene OrgEinheit und begründet keine Leitung.',
          fields: [
            {
              name: 'parent',
              label: 'Organisationseinheit',
              type: 'select',
              required: true,
              wide: true,
              options: [{ value: '', label: 'Bitte auswählen' }, ...unitSelectOptions()],
            },
            {
              name: 'subcategoryId',
              label: 'Unterkategorie',
              type: 'select',
              wide: true,
              options: subcategoryOptions(parent),
              hint: 'Nur Unterkategorien der gewählten Organisationseinheit sind zulässig.',
            },
          ],
        },
        {
          title: 'Kontakt',
          fields: [
            { name: 'email', label: 'E-Mail', type: 'email', maxLength: 120, autocomplete: 'email' },
            { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
            { name: 'mobile', label: 'Mobiltelefon', type: 'tel', maxLength: 40 },
            {
              name: 'location',
              label: 'Standort',
              type: 'select',
              options: [
                { value: '', label: 'Kein Standort' },
                ...state.locations
                  .filter((location) => location.active)
                  .map((location) => ({ value: location.name, label: location.name })),
              ],
            },
          ],
        },
        {
          title: 'Zusatzfunktionen',
          description:
            'Auswahl aus den in der Verwaltung gepflegten Zusatzfunktionen. Freie Eingaben sind nicht vorgesehen.',
          fields: state.functions.map((item) => ({
            name: `function:${item.name}`,
            label: `${item.icon} ${item.name}`,
            type: 'checkbox',
          })),
        },
      ],
      values: werte,
      validate: (values) =>
        validatePersonValues(values, {
          nodes: state.nodes,
          groups: personGroups(),
          editingId: person?.id || null,
        }),
      saveLabel: person ? 'Änderungen speichern' : 'Person anlegen',
      onSave: (values) => {
        const result = savePersonValues(values, person?.id || null);
        if (result !== true) return result;
        zurueck();
        return true;
      },
      onCancel: zurueck,
    });
    return true;
  }

  /** Maske für eine Organisationseinheit. `unitId` leer bedeutet Neuanlage. */
  function openUnitMask(unitId) {
    if (!canEdit() || !window.MWEditMask) return false;
    const unit = unitId ? state.nodes.find((node) => String(node.id) === String(unitId)) : null;
    if (unitId && !unit) return false;
    const types = organizationTypes();
    const definition = unit ? typeForNode(unit, types) : null;
    const gesperrt = unit ? descendantIds(state.nodes, unit.id) : new Set();
    if (unit) gesperrt.add(unit.id);
    const zurueck = () => {
      state.view = 'units';
      renderUnits();
    };

    window.MWEditMask.open({
      id: 'unit',
      eyebrow: 'Organisation · Organisationseinheiten',
      title: unit ? `Organisationseinheit „${unit.name}“ bearbeiten` : 'Neue Organisationseinheit anlegen',
      description: unit
        ? 'Einordnung, Stammdaten und Kontakt dieser Organisationseinheit.'
        : 'Zuerst Typ und Einordnung wählen, danach die Stammdaten erfassen.',
      breadcrumb: [
        { label: 'Organisation' },
        { label: 'Organisationseinheiten', onSelect: zurueck },
        { label: unit ? unit.name : 'Neue Einheit' },
      ],
      sections: [
        {
          title: 'Einordnung',
          description: 'Typ und Platzierung bestimmen, wo die Einheit im Organigramm erscheint.',
          fields: [
            {
              name: 'organizationTypeId',
              label: 'Organisationstyp',
              type: 'select',
              required: true,
              options: [
                { value: '', label: 'Bitte auswählen' },
                ...types
                  .filter((type) => type.active !== false || type.id === definition?.id)
                  .map((type) => ({ value: type.id, label: type.label })),
              ],
            },
            {
              name: 'parent',
              label: 'Übergeordnete Organisationseinheit',
              type: 'select',
              wide: true,
              options: [
                { value: '', label: unit && !unit.parent ? 'Keine – oberste Einheit' : 'Bitte auswählen' },
                ...unitSelectOptions(gesperrt),
              ],
              hint: 'Die eigene Einheit und ihre Untereinheiten stehen nicht zur Auswahl – das verhindert Kreise.',
            },
          ],
        },
        {
          title: 'Stammdaten',
          fields: [
            { name: 'name', label: 'Bezeichnung', type: 'text', required: true, maxLength: 120, wide: true },
            { name: 'shortName', label: 'Kurzbezeichnung', type: 'text', maxLength: 40 },
            {
              name: 'isActive',
              label: 'Aktiv (nicht archiviert)',
              type: 'checkbox',
            },
            {
              name: 'description',
              label: 'Beschreibung',
              type: 'textarea',
              rows: 3,
              maxLength: 400,
              wide: true,
            },
            {
              name: 'id',
              label: 'Kennung',
              type: 'text',
              required: true,
              hint: 'Muss eindeutig sein.',
            },
          ],
        },
        {
          title: 'Kontakt',
          fields: [
            { name: 'email', label: 'Funktionspostfach', type: 'email', maxLength: 120 },
            { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
            {
              name: 'location',
              label: 'Standort',
              type: 'select',
              options: [
                { value: '', label: 'Kein Standort' },
                ...state.locations
                  .filter((location) => location.active)
                  .map((location) => ({ value: location.name, label: location.name })),
              ],
            },
          ],
        },
        {
          title: 'Auswirkungen',
          description:
            'Betroffene Einträge, falls Einordnung oder Status geändert werden. Untereinheiten und Personen wandern mit.',
          notes: unitImpact(state.nodes, leadershipAssignments(), unit?.id || null),
        },
      ],
      values: {
        id: unit?.id || `unit${Date.now()}`,
        organizationTypeId: definition?.id || '',
        parent: unit?.parent || '',
        name: unit?.name || '',
        shortName: unit?.shortName || '',
        isActive: unit ? unit.isActive !== false : true,
        description: unit?.description || '',
        email: unit?.email || '',
        phone: unit?.phone || '',
        location: unit?.location || '',
      },
      validate: (values) =>
        validateUnitValues(values, { nodes: state.nodes, types, editingId: unit?.id || null }),
      saveLabel: unit ? 'Änderungen speichern' : 'Einheit anlegen',
      onSave: (values) => {
        const result = saveUnitValues(values, unit?.id || null);
        if (result !== true) return result;
        zurueck();
        return true;
      },
      onCancel: zurueck,
    });
    return true;
  }

  /** Maske für das eigene Profil. Jede Rolle darf ihr eigenes Profil pflegen. */
  function openProfileMask() {
    if (!window.MWEditMask) return false;
    const role = roles[state.role];
    const zurueck = () => {
      state.view = 'profile';
      renderProfile();
    };
    window.MWEditMask.open({
      id: 'profile',
      eyebrow: 'Mein Profil',
      title: 'Kontaktdaten bearbeiten',
      description: `Persönliche Angaben von ${role.name}. Die Änderungen bleiben lokal in diesem Browser.`,
      breadcrumb: [{ label: 'Mein Profil', onSelect: zurueck }, { label: 'Kontaktdaten bearbeiten' }],
      sections: [
        {
          title: 'Kontakt',
          fields: [
            { name: 'phone', label: 'Telefon', type: 'tel', maxLength: 40 },
            { name: 'mobile', label: 'Mobiltelefon', type: 'tel', maxLength: 40 },
            {
              name: 'location',
              label: 'Standort',
              type: 'select',
              options: state.locations
                .filter((location) => location.active)
                .map((location) => ({ value: location.name, label: location.name })),
            },
          ],
        },
        {
          title: 'Über mich',
          fields: [
            {
              name: 'about',
              label: 'Kurzbeschreibung',
              type: 'textarea',
              rows: 4,
              maxLength: 400,
              wide: true,
            },
          ],
        },
      ],
      values: {
        phone: state.profile.phone || '',
        mobile: state.profile.mobile || '',
        location: state.profile.location || '',
        about: state.profile.about || '',
      },
      saveLabel: 'Profil speichern',
      onSave: (values) => {
        state.profile = {
          phone: String(values.phone || '').trim(),
          mobile: String(values.mobile || '').trim(),
          location: String(values.location || ''),
          about: String(values.about || '').trim(),
        };
        save();
        zurueck();
        return true;
      },
      onCancel: zurueck,
    });
    return true;
  }

  function initLogin() {
    roleSelect.innerHTML = Object.entries(roles)
      .map(([key, role]) => `<option value="${key}">${esc(role.label)} – ${esc(role.name)}</option>`)
      .join('');
    roleSelect.value = state.role;
    updateRoleInfo();
  }
  function updateRoleInfo() {
    const role = roles[roleSelect.value];
    roleInfo.innerHTML = `<strong>${esc(role.label)}</strong><span>${esc(role.name)}</span><span>${esc(role.email)}</span><span>${role.views.length} freigeschaltete Ansichten</span>`;
  }
  roleSelect.addEventListener('change', updateRoleInfo);
  loginBtn.addEventListener('click', () => {
    state.role = roleSelect.value;
    loginPage.classList.add('hidden');
    app.classList.remove('hidden');
    state.view = 'chart';
    renderShell();
  });
  switchRoleBtn.addEventListener('click', () => {
    app.classList.add('hidden');
    loginPage.classList.remove('hidden');
    roleSelect.value = state.role;
    updateRoleInfo();
  });
  resetBtn.addEventListener('click', () => {
    if (!confirm('Alle lokalen Demo-Änderungen zurücksetzen?')) return;
    ['mw-demo-nodes', 'mw-demo-locations', 'mw-demo-functions', 'mw-demo-profile'].forEach((key) =>
      localStorage.removeItem(key),
    );
    state.nodes = clone(defaultNodes);
    state.locations = clone(defaultLocations);
    state.functions = clone(defaultFunctions);
    state.profile = {
      phone: '089 123456',
      mobile: '0170 1234567',
      location: 'Zentrale',
      about: 'Demo-Profil für die öffentliche Vorschau.',
    };
    state.editMode = false;
    // Eine offene Bearbeitungsmaske wird mit zurueckgesetzt.
    window.MWEditMask?.close();
    save();
    renderView();
  });
  function renderShell() {
    const role = roles[state.role];
    userName.textContent = role.name;
    userRole.textContent = `${role.label} · ${role.email}`;
    nav.innerHTML = navItems
      .filter(([id]) => role.views.includes(id))
      .map(
        ([id, label]) =>
          `<button data-view="${id}" class="${state.view === id ? 'active' : ''}">${esc(label)}</button>`,
      )
      .join('');
    nav.querySelectorAll('button').forEach(
      (button) =>
        (button.onclick = () => {
          state.view = button.dataset.view;
          pendingViewNotice = null;
          renderShell();
          closeDrawer();
        }),
    );
    renderView();
  }
  function renderView() {
    (
      ({
        chart: renderChart,
        profile: renderProfile,
        admin: renderAdmin,
        locations: renderLocations,
        functions: renderFunctions,
        styles: renderStyles,
        people: renderPeople,
        units: renderUnits,
        quality: renderQuality,
      })[state.view] || renderChart
    )();
  }
  function renderNode(node) {
    const children = state.nodes.filter((n) => n.parent === node.id),
      isPerson = node.type === 'person',
      functions = (node.functions || []).map(badgeHtml).join('');
    return `<div class="tree-node-wrap child-wrap"><button class="node ${isPerson ? 'person' : ''} ${node.type === 'company' ? 'company' : ''}" data-id="${esc(node.id)}" draggable="${state.editMode && node.type !== 'company'}" style="--node-accent:${esc(node.accent || '#070042')}"><div class="node-accent"></div><div class="node-body"><span class="node-type">${esc(node.subtitle || unitLabels[node.type] || node.type)}</span><strong class="node-name">${esc(node.name)}</strong>${node.role ? `<span class="node-role">${esc(node.role)}</span>` : ''}${functions ? `<div class="badges">${functions}</div>` : ''}${node.email ? `<span class="node-contact">${esc(node.email)} · ${esc(node.phone || '')}</span>` : ''}<span class="drag-hint">Ziehen und auf einer Einheit ablegen</span></div></button>${children.length ? `<div class="children">${children.map(renderNode).join('')}</div>` : ''}</div>`;
  }
  function renderChart() {
    const root = state.nodes.find((n) => n.parent === null);
    content.innerHTML =
      viewHead(
        'Organigramm',
        'Suchen, Profile öffnen und – abhängig von der Rolle – die Struktur lokal bearbeiten.',
        canEdit()
          ? `<button id="editModeBtn" class="btn ${state.editMode ? 'btn-secondary' : 'btn-ghost'}">${state.editMode ? 'Strukturmodus beenden' : 'Struktur bearbeiten'}</button>`
          : '',
      ) +
      viewNoticeHtml() +
      `<div class="toolbar"><input id="searchInput" placeholder="Name, Rolle, E-Mail oder Zusatzfunktion suchen" value="${esc(state.query)}"><button id="searchBtn" class="btn btn-primary">Suchen</button><button id="clearSearchBtn" class="btn btn-ghost">Zurücksetzen</button></div><p class="notice ${state.editMode ? 'success' : 'hidden'}">Strukturmodus aktiv: Karten per Drag-and-drop auf eine andere Organisationseinheit ziehen.</p><div class="chart-wrap ${state.editMode ? 'edit-mode' : ''}"><div class="tree">${root ? renderNode(root) : '<div class="empty">Keine Organisationsdaten vorhanden.</div>'}</div></div>`;
    renderViewNotice();
    const editBtn = el('editModeBtn'),
      searchInput = el('searchInput'),
      searchBtn = el('searchBtn'),
      clearBtn = el('clearSearchBtn');
    if (editBtn)
      editBtn.onclick = () => {
        state.editMode = !state.editMode;
        renderChart();
      };
    searchBtn.onclick = () => applySearch(searchInput.value);
    clearBtn.onclick = () => {
      state.query = '';
      renderChart();
    };
    searchInput.onkeydown = (event) => {
      if (event.key === 'Enter') applySearch(searchInput.value);
    };
    wireNodes();
    if (state.query) applySearch(state.query);
  }
  function wireNodes() {
    document.querySelectorAll('.node').forEach((nodeElement) => {
      const id = nodeElement.dataset.id,
        node = state.nodes.find((item) => item.id === id);
      nodeElement.onclick = () => {
        if (node?.type === 'person' && !state.editMode) openDrawer(node);
      };
      nodeElement.ondragstart = (event) => {
        draggedId = id;
        nodeElement.classList.add('dragging');
        event.dataTransfer.setData('text/plain', id);
      };
      nodeElement.ondragend = () => {
        draggedId = null;
        document
          .querySelectorAll('.node')
          .forEach((item) => item.classList.remove('dragging', 'drop-target'));
      };
      nodeElement.ondragover = (event) => {
        if (!state.editMode || node?.type === 'person') return;
        event.preventDefault();
        nodeElement.classList.add('drop-target');
      };
      nodeElement.ondragleave = () => nodeElement.classList.remove('drop-target');
      nodeElement.ondrop = (event) => {
        event.preventDefault();
        nodeElement.classList.remove('drop-target');
        const source = state.nodes.find(
          (item) => item.id === (draggedId || event.dataTransfer.getData('text/plain')),
        );
        if (!source || source.id === id || node?.type === 'person' || isDescendant(id, source.id)) {
          showViewNotice(
            source && source.id === id
              ? 'Eine Einheit kann nicht auf sich selbst abgelegt werden.'
              : node?.type === 'person'
                ? 'Personen können keine übergeordnete Einheit sein.'
                : 'Diese Verschiebung würde einen Kreis in der Hierarchie erzeugen.',
          );
          return;
        }
        source.parent = id;
        save();
        announceNodesChanged();
        renderChart();
      };
    });
  }
  function isDescendant(target, source) {
    let current = state.nodes.find((node) => node.id === target);
    while (current) {
      if (current.parent === source) return true;
      current = state.nodes.find((node) => node.id === current.parent);
    }
    return false;
  }
  function applySearch(value) {
    state.query = String(value || '')
      .trim()
      .toLowerCase();
    document.querySelectorAll('.node').forEach((element) => {
      const node = state.nodes.find((item) => item.id === element.dataset.id),
        hay = [node.name, node.role, node.email, ...(node.functions || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        match = !state.query || hay.includes(state.query);
      element.classList.toggle('highlight', !!state.query && match);
      element.classList.toggle('dim', !!state.query && !match);
    });
  }
  function openDrawer(person) {
    drawerBackdrop.classList.remove('hidden');
    drawer.classList.remove('hidden');
    drawer.innerHTML = `<div class="drawer-head"><strong>Personenprofil</strong><button class="drawer-close" onclick="closeDrawer()">Schließen</button></div><div class="drawer-body"><div class="avatar">${esc(
      person.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2),
    )}</div><h2>${esc(person.name)}</h2><p>${esc(person.role || '')}</p><div class="badges">${(person.functions || []).map(badgeHtml).join('')}</div><div class="detail-list"><div class="detail-row"><span>E-Mail</span><strong>${esc(person.email || '—')}</strong></div><div class="detail-row"><span>Telefon</span><strong>${esc(person.phone || '—')}</strong></div><div class="detail-row"><span>Standort</span><strong>${esc(person.location || '—')}</strong></div><div class="detail-row"><span>Organisation</span><strong>${esc((state.nodes.find((node) => node.id === person.parent) || {}).name || '—')}</strong></div><div class="detail-row"><span>Status</span><strong>${esc(person.status || 'Aktiv')}</strong></div></div></div>`;
  }
  function closeDrawer() {
    drawerBackdrop.classList.add('hidden');
    drawer.classList.add('hidden');
  }
  drawerBackdrop.onclick = closeDrawer;
  window.closeDrawer = closeDrawer;
  function renderProfile() {
    const role = roles[state.role];
    const zeile = (label, value) =>
      `<div class="detail-row"><span>${esc(label)}</span><strong>${esc(value || '—')}</strong></div>`;
    content.innerHTML =
      viewHead(
        'Mein Profil',
        'Persönliche Kontaktdaten in der Demo. Änderungen erfolgen in einer eigenen Maske.',
        '<button id="editProfile" class="btn btn-primary">Kontaktdaten bearbeiten</button>',
      ) +
      viewNoticeHtml() +
      `<div class="profile-layout"><section class="profile-card"><div class="avatar">${esc(
        role.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2),
      )}</div><h3>${esc(role.name)}</h3><p>${esc(role.label)}<br>${esc(role.email)}</p></section><section class="panel"><h3>Kontaktdaten</h3><div class="detail-list">${zeile('Telefon', state.profile.phone)}${zeile('Mobiltelefon', state.profile.mobile)}${zeile('Standort', state.profile.location)}${zeile('Über mich', state.profile.about)}</div></section></div>`;
    renderViewNotice();
    el('editProfile').onclick = () => openProfileMask();
  }
  function renderAdmin() {
    const people = state.nodes.filter((node) => node.type === 'person').length,
      units = state.nodes.length - people;
    content.innerHTML =
      viewHead('Admin-Center', 'Zentrale Übersicht für Rollen, Rechte und Systemzustand.') +
      `<div class="grid"><section class="panel"><div class="metric">${people}</div><div class="metric-label">aktive Personen</div></section><section class="panel"><div class="metric">${units}</div><div class="metric-label">Organisationseinheiten</div></section><section class="panel"><div class="metric">${state.functions.length}</div><div class="metric-label">Zusatzfunktionen</div></section><section class="panel"><div class="metric">${state.locations.length}</div><div class="metric-label">Standorte</div></section></div><h2 style="margin-top:24px;color:var(--dark)">Verwaltungsbereiche</h2><div class="grid">${[
        ['locations', 'Standorte', 'Gebäude und Arbeitsorte verwalten.', '#99e7ff'],
        ['functions', 'Zusatzfunktionen', 'Funktionskatalog und Kategorien pflegen.', '#a8ffab'],
        ['styles', 'Kartenstile', 'Darstellung der Organigrammkarten testen.', '#fda8ff'],
        ['people', 'Personen', 'Personen anlegen, bearbeiten und zuordnen.', '#ff757b'],
        ['units', 'Organisationseinheiten', 'Sektionen, Abteilungen und Teams verwalten.', '#99e7ff'],
        ['quality', 'Datenqualität', 'Fehlende und inkonsistente Daten finden.', '#a8ffab'],
      ]
        .map(
          (item) =>
            `<section class="panel feature-card" style="--accent:${item[3]}"><h3>${item[1]}</h3><p>${item[2]}</p><button class="btn btn-ghost btn-small" data-go="${item[0]}">Öffnen</button></section>`,
        )
        .join('')}</div>`;
    content.querySelectorAll('[data-go]').forEach(
      (button) =>
        (button.onclick = () => {
          state.view = button.dataset.go;
          renderShell();
        }),
    );
  }
  function renderLocations() {
    content.innerHTML =
      viewHead(
        'Standorte',
        'Arbeitsorte, Adressen und Status verwalten.',
        isAdmin() ? '<button id="addLocation" class="btn btn-primary">Standort hinzufügen</button>' : '',
      ) +
      table(
        ['Standort', 'Adresse', 'Status', 'Aktionen'],
        state.locations.map((location) => [
          esc(location.name),
          esc(location.address),
          `<span class="status ${location.active ? '' : 'warn'}">${location.active ? 'Aktiv' : 'Inaktiv'}</span>`,
          isAdmin()
            ? `<button class="btn btn-ghost btn-small" data-toggle-loc="${location.id}">${location.active ? 'Deaktivieren' : 'Aktivieren'}</button>`
            : 'Nur lesen',
        ]),
      );
    const add = el('addLocation');
    if (add)
      add.onclick = () => {
        const name = prompt('Name des Standorts');
        if (!name) return;
        state.locations.push({
          id: `loc${Date.now()}`,
          name,
          address: prompt('Adresse') || 'Keine Adresse',
          active: true,
        });
        save();
        renderLocations();
      };
    content.querySelectorAll('[data-toggle-loc]').forEach(
      (button) =>
        (button.onclick = () => {
          const location = state.locations.find((item) => item.id === button.dataset.toggleLoc);
          location.active = !location.active;
          save();
          renderLocations();
        }),
    );
  }
  function renderFunctions() {
    content.innerHTML =
      viewHead(
        'Zusatzfunktionen',
        'Funktions-Badges mit Kategorien und Symbolen verwalten.',
        isAdmin() ? '<button id="addFunction" class="btn btn-primary">Funktion hinzufügen</button>' : '',
      ) +
      table(
        ['Symbol', 'Bezeichnung', 'Kategorie', 'Verwendung'],
        state.functions.map((func) => [
          `<span class="badge ${func.category}">${esc(func.icon)}</span>`,
          esc(func.name),
          esc(func.category),
          `${state.nodes.filter((node) => (node.functions || []).includes(func.name)).length} Personen`,
        ]),
      );
    const add = el('addFunction');
    if (add)
      add.onclick = () => {
        const name = prompt('Name der Zusatzfunktion');
        if (!name) return;
        state.functions.push({
          id: `f${Date.now()}`,
          name,
          category: prompt('Kategorie: project, tech, safety oder people', 'project') || 'project',
          icon: '◆',
        });
        save();
        renderFunctions();
      };
  }
  function renderStyles() {
    const styles = [
      ['standard', 'Standard', '#070042', '#fff'],
      ['management', 'Leitung', '#99e7ff', '#f1fbfd'],
      ['team', 'Team', '#a8ffab', '#f2fff3'],
      ['assistant', 'Assistenz', '#fda8ff', '#fff2ff'],
      ['warning', 'Hinweis', '#ff757b', '#fff4f4'],
    ];
    content.innerHTML =
      viewHead('Kartenstile', 'Vordefinierte Darstellungen für verschiedene Organisationsebenen.') +
      `<div class="style-grid">${styles.map((style) => `<article class="style-card ${state.selectedStyle === style[0] ? 'selected-style' : ''}"><div class="style-preview" style="--accent:${style[2]}"></div><div class="style-card-body"><h3>${style[1]}</h3><p>Akzent ${style[2]} · Hintergrund ${style[3]}</p><button class="btn btn-ghost btn-small" data-style="${style[0]}">Als Demo-Stil wählen</button></div></article>`).join('')}</div>`;
    content.querySelectorAll('[data-style]').forEach(
      (button) =>
        (button.onclick = () => {
          state.selectedStyle = button.dataset.style;
          renderStyles();
        }),
    );
  }
  function renderPeople() {
    const people = state.nodes.filter((node) => node.type === 'person');
    const rows = people.map((person) => [
      esc(person.name),
      esc(person.role || ''),
      esc((state.nodes.find((node) => node.id === person.parent) || {}).name || ''),
      esc(person.location || ''),
      `<div class="actions"><button class="btn btn-ghost btn-small" data-profile="${esc(person.id)}">Profil</button>${canEdit() ? `<button class="btn btn-ghost btn-small" data-edit-person="${esc(person.id)}">Bearbeiten</button>` : ''}</div>`,
    ]);
    content.innerHTML =
      viewHead(
        'Personenverwaltung',
        'Personen mit Stammdaten, Kontakt, Standort, Funktionen und eindeutiger organisatorischer Platzierung pflegen.',
        canEdit() ? '<button id="addPerson" class="btn btn-primary">Person anlegen</button>' : '',
      ) +
      viewNoticeHtml() +
      table(['Name', 'Rolle', 'Organisation', 'Standort', 'Aktionen'], rows);
    renderViewNotice();
    const add = el('addPerson');
    if (add) add.onclick = () => openPersonMask(null);
    content
      .querySelectorAll('[data-profile]')
      .forEach(
        (button) =>
          (button.onclick = () => openDrawer(state.nodes.find((node) => node.id === button.dataset.profile))),
      );
    content
      .querySelectorAll('[data-edit-person]')
      .forEach((button) => (button.onclick = () => openPersonMask(button.dataset.editPerson)));
  }
  function renderUnits() {
    const units = state.nodes
      .filter((node) => node.type !== 'person')
      .map((unit) => [
        esc(unit.name),
        esc(unitLabelFor(unit)),
        esc((state.nodes.find((node) => node.id === unit.parent) || {}).name || '—'),
        state.nodes.filter((node) => node.parent === unit.id).length,
        canEdit()
          ? `<div class="actions"><button class="btn btn-ghost btn-small" data-edit-unit="${esc(unit.id)}">Bearbeiten</button></div>`
          : 'Nur lesen',
      ]);
    content.innerHTML =
      viewHead(
        'Organisationseinheiten',
        'Sektionen, Abteilungen und Teams mit eindeutiger Platzierung pflegen. Bezeichnung, Einordnung, Kontakt und Status werden in einer eigenen Maske bearbeitet.',
        canEdit() ? '<button id="addUnit" class="btn btn-primary">Organisationseinheit anlegen</button>' : '',
      ) +
      viewNoticeHtml() +
      table(['Bezeichnung', 'Ebene', 'Übergeordnet', 'Untergeordnete Einträge', 'Aktionen'], units);
    renderViewNotice();
    const add = el('addUnit');
    if (add) add.onclick = () => openUnitMask(null);
    content
      .querySelectorAll('[data-edit-unit]')
      .forEach((button) => (button.onclick = () => openUnitMask(button.dataset.editUnit)));
  }
  function renderQuality() {
    const people = state.nodes.filter((node) => node.type === 'person'),
      missingPhone = people.filter((person) => !person.phone).length,
      missingLocation = people.filter((person) => !person.location).length,
      withoutFunction = people.filter((person) => (person.functions || []).length === 0).length,
      orphans = state.nodes.filter(
        (node) => node.parent && !state.nodes.some((item) => item.id === node.parent),
      ).length,
      checks = [
        [
          'Pflichtfelder',
          'Name, Rolle und E-Mail sind bei allen Personen vorhanden.',
          people.every((person) => person.name && person.role && person.email) ? 100 : 82,
          'ok',
        ],
        [
          'Telefonnummern',
          missingPhone ? `${missingPhone} Personen ohne Telefonnummer.` : 'Alle Telefonnummern vorhanden.',
          missingPhone ? 75 : 100,
          missingPhone ? 'warn' : 'ok',
        ],
        [
          'Standortzuordnung',
          missingLocation
            ? `${missingLocation} Personen ohne Standort.`
            : 'Alle Personen einem Standort zugeordnet.',
          missingLocation ? 78 : 100,
          missingLocation ? 'warn' : 'ok',
        ],
        [
          'Zusatzfunktionen',
          `${withoutFunction} Personen besitzen aktuell keine Zusatzfunktion.`,
          withoutFunction ? 88 : 100,
          withoutFunction ? 'warn' : 'ok',
        ],
        [
          'Strukturintegrität',
          orphans ? `${orphans} verwaiste Einträge gefunden.` : 'Keine verwaisten Organisationseinträge.',
          orphans ? 45 : 100,
          orphans ? 'error' : 'ok',
        ],
      ];
    content.innerHTML =
      viewHead(
        'Datenqualitäts-Center',
        'Automatische Plausibilitätsprüfungen auf den aktuellen Demo-Daten.',
      ) +
      `<div class="grid" style="margin-bottom:18px"><section class="panel"><div class="metric">${Math.round(checks.reduce((sum, check) => sum + check[2], 0) / checks.length)}%</div><div class="metric-label">Gesamtqualität</div></section><section class="panel"><div class="metric">${people.length}</div><div class="metric-label">geprüfte Personen</div></section><section class="panel"><div class="metric">${checks.filter((check) => check[3] !== 'ok').length}</div><div class="metric-label">Hinweise</div></section></div><div class="quality-list">${checks.map((check) => `<article class="quality-item"><div><strong>${check[0]}</strong><p>${check[1]}</p></div><span class="quality-score ${check[3] === 'warn' ? 'warn' : check[3] === 'error' ? 'error' : ''}">${check[2]}%</span></article>`).join('')}</div>`;
  }
  initLogin();
})();
