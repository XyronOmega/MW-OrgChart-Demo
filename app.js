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
  let draggedId = null,
    unitDraft = null,
    personDraft = null;
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
    unitDraft = null;
    personDraft = null;
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
          unitDraft = null;
          personDraft = null;
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
      `<div class="toolbar"><input id="searchInput" placeholder="Name, Rolle, E-Mail oder Zusatzfunktion suchen" value="${esc(state.query)}"><button id="searchBtn" class="btn btn-primary">Suchen</button><button id="clearSearchBtn" class="btn btn-ghost">Zurücksetzen</button></div><p class="notice ${state.editMode ? 'success' : 'hidden'}">Strukturmodus aktiv: Karten per Drag-and-drop auf eine andere Organisationseinheit ziehen.</p><div class="chart-wrap ${state.editMode ? 'edit-mode' : ''}"><div class="tree">${root ? renderNode(root) : '<div class="empty">Keine Organisationsdaten vorhanden.</div>'}</div></div>`;
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
        if (!source || source.id === id || node?.type === 'person' || isDescendant(id, source.id))
          return alert('Diese Verschiebung ist nicht möglich.');
        source.parent = id;
        save();
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
    content.innerHTML =
      viewHead('Mein Profil', 'Persönliche Kontaktdaten in der Demo bearbeiten.') +
      `<div class="profile-layout"><section class="profile-card"><div class="avatar">${esc(
        role.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2),
      )}</div><h3>${esc(role.name)}</h3><p>${esc(role.label)}<br>${esc(role.email)}</p></section><section class="panel"><h3>Kontaktdaten</h3><div class="form-grid"><label class="field"><span>Telefon</span><input id="profPhone" value="${esc(state.profile.phone)}"></label><label class="field"><span>Mobil</span><input id="profMobile" value="${esc(state.profile.mobile)}"></label><label class="field full"><span>Standort</span><select id="profLocation">${state.locations.map((location) => `<option ${location.name === state.profile.location ? 'selected' : ''}>${esc(location.name)}</option>`).join('')}</select></label><label class="field full"><span>Über mich</span><textarea id="profAbout">${esc(state.profile.about)}</textarea></label></div><button id="saveProfile" class="btn btn-primary">Profil lokal speichern</button><p id="profileMsg" class="notice hidden"></p></section></div>`;
    el('saveProfile').onclick = () => {
      state.profile = {
        phone: el('profPhone').value,
        mobile: el('profMobile').value,
        location: el('profLocation').value,
        about: el('profAbout').value,
      };
      save();
      el('profileMsg').textContent = 'Profil wurde lokal gespeichert.';
      el('profileMsg').classList.remove('hidden');
    };
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
      `<div class="actions"><button class="btn btn-ghost btn-small" data-profile="${person.id}">Profil</button>${canEdit() ? `<button class="btn btn-ghost btn-small" data-edit-person="${person.id}">Bearbeiten</button>` : ''}</div>`,
    ]);
    const builder = personDraft ? personBuilderHtml() : '';
    content.innerHTML =
      viewHead(
        'Personenverwaltung',
        'Personen mit Stammdaten, Kontakt, Standort, Funktionen und eindeutiger organisatorischer Platzierung pflegen.',
        canEdit() ? '<button id="addPerson" class="btn btn-primary">Person anlegen</button>' : '',
      ) +
      builder +
      table(['Name', 'Rolle', 'Organisation', 'Standort', 'Aktionen'], rows);
    const add = el('addPerson');
    if (add)
      add.onclick = () => {
        personDraft = {
          id: `p${Date.now()}`,
          name: '',
          role: '',
          parent: '',
          email: '',
          phone: '',
          location: '',
          status: 'Aktiv',
          functions: [],
        };
        renderPeople();
      };
    wirePersonBuilder();
    content
      .querySelectorAll('[data-profile]')
      .forEach(
        (button) =>
          (button.onclick = () => openDrawer(state.nodes.find((node) => node.id === button.dataset.profile))),
      );
    content.querySelectorAll('[data-edit-person]').forEach(
      (button) =>
        (button.onclick = () => {
          const person = state.nodes.find((node) => node.id === button.dataset.editPerson);
          personDraft = clone(person);
          renderPeople();
        }),
    );
  }
  function personBuilderHtml() {
    const options = unitOptions();
    return `<section class="builder"><h3>${state.nodes.some((node) => node.id === personDraft.id) ? 'Person bearbeiten' : 'Neue Person'}</h3><p>Stammdaten erfassen und die genaue Position im Organigramm auswählen.</p><div class="placement ${personDraft.parent ? 'complete' : ''}"><strong>Vorgesehene Platzierung</strong><span id="personPlacement"></span></div><div class="builder-section"><h4>Person und Zuordnung</h4><div class="builder-grid"><label class="field"><span>Name *</span><input id="personName" value="${esc(personDraft.name)}"></label><label class="field"><span>Aufgabe / Stellenbezeichnung *</span><input id="personRole" value="${esc(personDraft.role)}"></label><label class="field builder-wide"><span>Primäre Organisationseinheit *</span><select id="personParent"><option value="">Bitte auswählen</option>${options.map((unit) => `<option value="${unit.id}" ${unit.id === personDraft.parent ? 'selected' : ''}>${esc(unitPath(unit.id).join(' › '))} · ${esc(unitLabels[unit.type])}</option>`).join('')}</select><small>Diese Auswahl bestimmt, an welcher Stelle die Person im Organigramm erscheint.</small></label><label class="field"><span>Beschäftigungsstatus</span><select id="personStatus">${['Aktiv', 'Elternzeit', 'Langzeitabwesend', 'Sabbatical', 'Ruhestand', 'Inaktiv'].map((status) => `<option ${status === personDraft.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label class="field"><span>Standort</span><select id="personLocation"><option value="">Bitte auswählen</option>${state.locations
      .filter((location) => location.active)
      .map(
        (location) =>
          `<option ${location.name === personDraft.location ? 'selected' : ''}>${esc(location.name)}</option>`,
      )
      .join(
        '',
      )}</select></label></div></div><div class="builder-section"><h4>Kontakt</h4><div class="builder-grid"><label class="field"><span>E-Mail *</span><input id="personEmail" type="email" value="${esc(personDraft.email)}"></label><label class="field"><span>Telefon</span><input id="personPhone" value="${esc(personDraft.phone || '')}"></label></div></div><div class="builder-section"><h4>Zusatzfunktionen</h4><div class="checkbox-grid">${state.functions.map((func) => `<label class="check"><input type="checkbox" data-person-function="${esc(func.name)}" ${(personDraft.functions || []).includes(func.name) ? 'checked' : ''}><span>${badgeHtml(func.name)}</span></label>`).join('')}</div></div><p id="personFormMessage" class="notice hidden"></p><div class="actions"><button id="savePerson" class="btn btn-primary">${state.nodes.some((node) => node.id === personDraft.id) ? 'Änderungen speichern' : 'Person anlegen'}</button><button id="cancelPerson" class="btn btn-ghost">Abbrechen</button></div></section>`;
  }
  function wirePersonBuilder() {
    if (!personDraft) return;
    const fields = {
      name: el('personName'),
      role: el('personRole'),
      parent: el('personParent'),
      status: el('personStatus'),
      location: el('personLocation'),
      email: el('personEmail'),
      phone: el('personPhone'),
      placement: el('personPlacement'),
      message: el('personFormMessage'),
    };
    const sync = () => {
      personDraft.name = fields.name.value;
      personDraft.role = fields.role.value;
      personDraft.parent = fields.parent.value;
      personDraft.status = fields.status.value;
      personDraft.location = fields.location.value;
      personDraft.email = fields.email.value;
      personDraft.phone = fields.phone.value;
      personDraft.functions = [...document.querySelectorAll('[data-person-function]:checked')].map(
        (input) => input.dataset.personFunction,
      );
      fields.placement.textContent = personDraft.parent
        ? [...unitPath(personDraft.parent), personDraft.name.trim() || 'Neue Person'].join(' › ')
        : 'Bitte die primäre Organisationseinheit auswählen.';
    };
    Object.values(fields)
      .filter((field) => field && ['INPUT', 'SELECT'].includes(field.tagName))
      .forEach((field) => {
        field.oninput = sync;
        field.onchange = sync;
      });
    document.querySelectorAll('[data-person-function]').forEach((input) => (input.onchange = sync));
    sync();
    el('cancelPerson').onclick = () => {
      personDraft = null;
      renderPeople();
    };
    el('savePerson').onclick = () => {
      sync();
      const message = (text) => {
        fields.message.textContent = text;
        fields.message.className = 'notice error';
      };
      if (!personDraft.name.trim()) return message('Bitte einen Namen eingeben.');
      if (!personDraft.role.trim()) return message('Bitte eine Aufgabe oder Stellenbezeichnung eingeben.');
      if (!personDraft.parent) return message('Bitte die primäre Organisationseinheit auswählen.');
      if (!personDraft.email.trim()) return message('Bitte eine E-Mail-Adresse eingeben.');
      if (
        state.nodes.some(
          (node) =>
            node.type === 'person' &&
            node.id !== personDraft.id &&
            String(node.email || '').toLowerCase() === personDraft.email.trim().toLowerCase(),
        )
      )
        return message('Diese E-Mail-Adresse ist bereits einer anderen Person zugeordnet.');
      const existing = state.nodes.find((node) => node.id === personDraft.id);
      const next = {
        ...personDraft,
        name: personDraft.name.trim(),
        role: personDraft.role.trim(),
        email: personDraft.email.trim(),
        phone: personDraft.phone.trim(),
        accent: '#ff757b',
        type: 'person',
      };
      if (existing) Object.assign(existing, next);
      else state.nodes.push(next);
      personDraft = null;
      save();
      renderPeople();
    };
  }
  function unitParentOptions(type) {
    return state.nodes
      .filter((node) => node.type !== 'person' && unitParentTypes[type]?.includes(node.type))
      .sort((a, b) => unitPath(a.id).join(' / ').localeCompare(unitPath(b.id).join(' / '), 'de'));
  }
  function renderUnits() {
    const units = state.nodes
      .filter((node) => node.type !== 'person')
      .map((unit) => [
        esc(unit.name),
        esc(unitLabels[unit.type] || unit.subtitle || unit.type),
        esc((state.nodes.find((node) => node.id === unit.parent) || {}).name || '—'),
        state.nodes.filter((node) => node.parent === unit.id).length,
        canEdit()
          ? `<button class="btn btn-ghost btn-small" data-rename="${unit.id}">Umbenennen</button>`
          : 'Nur lesen',
      ]);
    const builder = unitDraft ? unitBuilderHtml() : '';
    content.innerHTML =
      viewHead(
        'Organisationseinheiten',
        'Sektionen, Abteilungen und Teams mit eindeutiger Platzierung pflegen.',
        canEdit() ? '<button id="addUnit" class="btn btn-primary">Organisationseinheit anlegen</button>' : '',
      ) +
      builder +
      table(['Bezeichnung', 'Ebene', 'Übergeordnet', 'Untergeordnete Einträge', 'Aktionen'], units);
    const add = el('addUnit');
    if (add)
      add.onclick = () => {
        unitDraft = { type: '', parent: '', name: '' };
        renderUnits();
      };
    wireUnitBuilder();
    content.querySelectorAll('[data-rename]').forEach(
      (button) =>
        (button.onclick = () => {
          const unit = state.nodes.find((node) => node.id === button.dataset.rename),
            next = prompt('Neue Bezeichnung', unit.name);
          if (next) {
            unit.name = next;
            save();
            renderUnits();
          }
        }),
    );
  }
  function unitBuilderHtml() {
    return `<section class="builder"><h3>Neue Organisationseinheit</h3><p>Zuerst die Ebene und anschließend die genaue Platzierung im Organigramm auswählen.</p><div class="builder-grid"><label class="field"><span>Typ *</span><select id="unitType"><option value="">Typ auswählen</option><option value="section" ${unitDraft.type === 'section' ? 'selected' : ''}>Sektion</option><option value="department" ${unitDraft.type === 'department' ? 'selected' : ''}>Abteilung</option><option value="team" ${unitDraft.type === 'team' ? 'selected' : ''}>Team</option></select></label><label class="field"><span>Übergeordnete Einheit *</span><select id="unitParent" ${unitDraft.type ? '' : 'disabled'}></select></label><div class="placement builder-wide"><strong>Vorgesehene Platzierung</strong><span id="unitPlacement"></span></div><label class="field builder-wide"><span>Name *</span><input id="unitName" value="${esc(unitDraft.name)}" placeholder="Bezeichnung der neuen Einheit"></label></div><p id="unitFormMessage" class="notice hidden"></p><div class="actions"><button id="saveUnit" class="btn btn-primary">Einheit anlegen</button><button id="cancelUnit" class="btn btn-ghost">Abbrechen</button></div></section>`;
  }
  function wireUnitBuilder() {
    if (!unitDraft) return;
    const type = el('unitType'),
      parent = el('unitParent'),
      name = el('unitName'),
      placement = el('unitPlacement'),
      message = el('unitFormMessage');
    const refresh = () => {
      unitDraft.type = type.value;
      unitDraft.name = name.value;
      const parents = unitParentOptions(unitDraft.type);
      if (!parents.some((item) => item.id === unitDraft.parent)) unitDraft.parent = '';
      parent.disabled = !unitDraft.type;
      parent.innerHTML =
        `<option value="">${unitDraft.type ? 'Platzierung auswählen' : 'Zuerst Typ auswählen'}</option>` +
        parents
          .map(
            (item) =>
              `<option value="${item.id}" ${item.id === unitDraft.parent ? 'selected' : ''}>${esc(unitPath(item.id).join(' › '))} · ${esc(unitLabels[item.type])}</option>`,
          )
          .join('');
      placement.textContent = !unitDraft.type
        ? 'Zuerst den Typ der neuen Einheit auswählen.'
        : !unitDraft.parent
          ? `Anschließend auswählen, unter welcher Einheit die ${unitLabels[unitDraft.type]} angelegt wird.`
          : [
              ...unitPath(unitDraft.parent),
              unitDraft.name.trim() || `Neue ${unitLabels[unitDraft.type]}`,
            ].join(' › ');
    };
    type.onchange = refresh;
    parent.onchange = () => {
      unitDraft.parent = parent.value;
      refresh();
    };
    name.oninput = refresh;
    refresh();
    el('cancelUnit').onclick = () => {
      unitDraft = null;
      renderUnits();
    };
    el('saveUnit').onclick = () => {
      const show = (text) => {
        message.textContent = text;
        message.className = 'notice error';
      };
      if (!unitDraft.type) return show('Bitte zuerst den Typ auswählen.');
      if (!unitDraft.parent) return show('Bitte die übergeordnete Einheit auswählen.');
      if (!unitDraft.name.trim()) return show('Bitte einen Namen eingeben.');
      state.nodes.push({
        id: `unit${Date.now()}`,
        parent: unitDraft.parent,
        type: unitDraft.type,
        name: unitDraft.name.trim(),
        subtitle: unitLabels[unitDraft.type],
        accent:
          unitDraft.type === 'section' ? '#070042' : unitDraft.type === 'department' ? '#99e7ff' : '#a8ffab',
      });
      unitDraft = null;
      save();
      renderUnits();
    };
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
