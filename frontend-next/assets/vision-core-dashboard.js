/**
 * FRONT-NEW-0 — Vision Core Dashboard Runtime
 * DOM-only. No fetch. No eval. No external deps. No execution logic.
 */
(function () {
  'use strict';

  const S = window.VISION_CORE_FINAL_STATE;

  const BLOCKED_MSG =
    'Ação bloqueada: controlled closure ativo. Decisão humana final requerida.';

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(msg) {
    const toast = document.getElementById('status-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('toast--visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('toast--visible');
    }, 4000);
  }

  // ── Badge helper ──────────────────────────────────────────────────────────

  function badge(label, cls) {
    var el = document.createElement('span');
    el.className = 'badge badge--' + cls;
    el.textContent = label;
    return el;
  }

  function text(tag, content, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    el.textContent = content;
    return el;
  }

  // ── Final State Cards ─────────────────────────────────────────────────────

  function renderFinalState() {
    var container = document.getElementById('final-state');
    if (!container) return;

    var cards = [
      { label: 'Main Commit',          value: S.main_commit,          cls: 'cyan'   },
      { label: 'Syntax Check',         value: S.syntax_check,         cls: 'green'  },
      { label: 'FINAL-CLOSURE-0 Tests',value: S.final_closure_tests,  cls: 'green'  },
      { label: 'RTE-3 Tests',          value: S.rte3_tests,           cls: 'green'  },
      { label: 'Working Tree',         value: 'clean',                cls: 'green'  },
      { label: 'Project State',        value: S.project_state,        cls: 'violet' },
    ];

    cards.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'stat-card';
      card.appendChild(text('div', c.label, 'stat-card__label'));
      card.appendChild(badge(c.value, c.cls));
      container.appendChild(card);
    });
  }

  // ── Authority Panel ───────────────────────────────────────────────────────

  function renderAuthorityPanel() {
    var container = document.getElementById('authority-panel');
    if (!container) return;

    var rows = [
      { label: 'PASS GOLD REAL',         value: 'NOT CLAIMED',    cls: 'amber'  },
      { label: 'Stable Promotion',        value: 'BLOCKED',        cls: 'red'    },
      { label: 'Release',                 value: 'BLOCKED',        cls: 'red'    },
      { label: 'Deploy',                  value: 'BLOCKED',        cls: 'red'    },
      { label: 'Tag',                     value: 'BLOCKED',        cls: 'red'    },
      { label: 'Production Touched',      value: 'FALSE',          cls: 'green'  },
      { label: 'Final Human Decision',    value: 'REQUIRED',       cls: 'amber'  },
    ];

    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'authority-row';
      row.appendChild(text('span', r.label, 'authority-row__label'));
      row.appendChild(badge(r.value, r.cls));
      container.appendChild(row);
    });
  }

  // ── RTE Chain ─────────────────────────────────────────────────────────────

  function renderRteChain() {
    var container = document.getElementById('rte-chain');
    if (!container) return;

    var items = [
      { id: 'RTE-0', label: 'Local Runtime Truth Execution',              status: 'COMPLETE',  cls: 'green' },
      { id: 'RTE-1', label: 'Local Smoke Flow Execution Evidence',         status: 'COMPLETE',  cls: 'green' },
      { id: 'RTE-2', label: 'Local Rollback / Recovery Readiness Evidence',status: 'COMPLETE',  cls: 'green' },
      { id: 'RTE-3', label: 'PASS GOLD REAL Final Authority Review',       status: 'COMPLETE',  cls: 'green' },
      { id: 'RTE-4', label: '',                                            status: 'FORBIDDEN', cls: 'red'   },
    ];

    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'rte-row';
      var id = text('span', item.id, 'rte-row__id');
      var lbl = text('span', item.label, 'rte-row__label');
      row.appendChild(id);
      row.appendChild(lbl);
      row.appendChild(badge(item.status, item.cls));
      container.appendChild(row);
    });
  }

  // ── Closure Panel ─────────────────────────────────────────────────────────

  function renderClosurePanel() {
    var container = document.getElementById('closure-panel');
    if (!container) return;

    var rows = [
      { label: 'FINAL-CLOSURE-0',             value: 'COMPLETE',      cls: 'green' },
      { label: 'FINAL-CLOSURE-1',             value: 'NOT REQUIRED',  cls: 'violet'},
      { label: 'No Next Automated Gate',      value: 'CONFIRMED',     cls: 'green' },
      { label: 'Controlled Closure',          value: 'COMPLETE',      cls: 'green' },
      { label: 'Final Human Decision',        value: 'REQUIRED',      cls: 'amber' },
    ];

    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'authority-row';
      row.appendChild(text('span', r.label, 'authority-row__label'));
      row.appendChild(badge(r.value, r.cls));
      container.appendChild(row);
    });
  }

  // ── Blocked Panel ─────────────────────────────────────────────────────────

  function renderBlockedPanel() {
    var container = document.getElementById('blocked-panel');
    if (!container) return;

    var rows = [
      { label: 'V471',                         value: 'BLOCKED', cls: 'red'   },
      { label: 'RTA-10',                       value: 'NOT CREATED', cls: 'green'},
      { label: 'UNIFY-1',                      value: 'NOT CREATED', cls: 'green'},
      { label: 'RC-0',                         value: 'NOT CREATED', cls: 'green'},
      { label: 'Runtime Execution by Module',  value: 'FALSE',   cls: 'green' },
      { label: 'Smoke Execution by Module',    value: 'FALSE',   cls: 'green' },
      { label: 'Rollback Execution by Module', value: 'FALSE',   cls: 'green' },
      { label: 'Recovery Execution by Module', value: 'FALSE',   cls: 'green' },
      { label: 'Production',                   value: 'UNTOUCHED', cls: 'green'},
    ];

    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'authority-row';
      row.appendChild(text('span', r.label, 'authority-row__label'));
      row.appendChild(badge(r.value, r.cls));
      container.appendChild(row);
    });
  }

  // ── Agent Orbit ───────────────────────────────────────────────────────────

  function renderAgentOrbit() {
    var container = document.getElementById('agent-orbit');
    if (!container) return;

    var agents = [
      { name: 'PI Harness',   status: 'Complete',              cls: 'green',  angle:   0 },
      { name: 'Hermes',       status: 'Complete',              cls: 'green',  angle:  36 },
      { name: 'OpenClaw',     status: 'Complete',              cls: 'green',  angle:  72 },
      { name: 'Scanner',      status: 'Complete',              cls: 'green',  angle: 108 },
      { name: 'Patch Engine', status: 'Complete',              cls: 'green',  angle: 144 },
      { name: 'Aegis',        status: 'Complete',              cls: 'green',  angle: 180 },
      { name: 'Go Core',      status: 'Review-ready',          cls: 'cyan',   angle: 216 },
      { name: 'PASS GOLD',    status: 'Not claimed',           cls: 'amber',  angle: 252 },
      { name: 'Archivist',    status: 'Complete',              cls: 'green',  angle: 288 },
      { name: 'GitHub Agent', status: 'Safe / PR only',        cls: 'cyan',   angle: 324 },
    ];

    var orbitWrap = document.createElement('div');
    orbitWrap.className = 'orbit-wrap';

    // Center node
    var center = document.createElement('div');
    center.className = 'orbit-center';
    center.innerHTML =
      '<div class="orbit-center__status">READY</div>' +
      '<div class="orbit-center__name">VISION CORE</div>' +
      '<div class="orbit-center__sub">Controlled Closure</div>';
    orbitWrap.appendChild(center);

    // Orbit ring
    var ring = document.createElement('div');
    ring.className = 'orbit-ring';

    agents.forEach(function (a) {
      var rad = (a.angle - 90) * (Math.PI / 180);
      var r = 46; // % radius
      var x = 50 + r * Math.cos(rad);
      var y = 50 + r * Math.sin(rad);

      var node = document.createElement('div');
      node.className = 'orbit-node orbit-node--' + a.cls;
      node.style.left = x.toFixed(2) + '%';
      node.style.top  = y.toFixed(2) + '%';

      var nodeName = document.createElement('div');
      nodeName.className = 'orbit-node__name';
      nodeName.textContent = a.name;

      var nodeStatus = document.createElement('div');
      nodeStatus.className = 'orbit-node__status';
      nodeStatus.textContent = a.status;

      node.appendChild(nodeName);
      node.appendChild(nodeStatus);
      ring.appendChild(node);
    });

    orbitWrap.appendChild(ring);
    container.appendChild(orbitWrap);
  }

  // ── Metrics Panel ─────────────────────────────────────────────────────────

  function renderMetrics() {
    var container = document.getElementById('metrics-panel');
    if (!container) return;

    var metrics = [
      { name: 'OpenClaw',      pct: 100, cls: 'green'  },
      { name: 'Hermes RCA',    pct: 100, cls: 'green'  },
      { name: 'Scanner',       pct: 100, cls: 'green'  },
      { name: 'Aegis',         pct: 100, cls: 'green'  },
      { name: 'PatchEngine',   pct: 100, cls: 'green'  },
      { name: 'Go Core',       pct:  95, cls: 'cyan'   },
      { name: 'PASS GOLD',     pct:   0, cls: 'amber'  },
      { name: 'Final Closure', pct: 100, cls: 'violet' },
    ];

    var heading = document.createElement('h3');
    heading.className = 'panel-heading';
    heading.textContent = 'Agent Metrics';
    container.appendChild(heading);

    metrics.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'metric-row';

      var label = document.createElement('span');
      label.className = 'metric-row__label';
      label.textContent = m.name;

      var track = document.createElement('div');
      track.className = 'metric-track';

      var fill = document.createElement('div');
      fill.className = 'metric-fill metric-fill--' + m.cls;
      fill.style.width = m.pct + '%';

      var pct = document.createElement('span');
      pct.className = 'metric-row__pct';
      pct.textContent = m.pct + '%';

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(pct);
      container.appendChild(row);
    });
  }

  // ── Sidebar active state ──────────────────────────────────────────────────

  function initSidebar() {
    var items = document.querySelectorAll('.sidebar__item');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        items.forEach(function (i) { i.classList.remove('sidebar__item--active'); });
        item.classList.add('sidebar__item--active');
      });
    });
  }

  // ── Nav tabs ──────────────────────────────────────────────────────────────

  function initNavTabs() {
    var tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('nav-tab--active'); });
        tab.classList.add('nav-tab--active');
      });
    });
  }

  // ── Blocked action buttons ────────────────────────────────────────────────

  function initBlockedButtons() {
    var btns = document.querySelectorAll('[data-blocked]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        showToast(BLOCKED_MSG);
      });
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  function boot() {
    renderFinalState();
    renderAuthorityPanel();
    renderRteChain();
    renderClosurePanel();
    renderBlockedPanel();
    renderAgentOrbit();
    renderMetrics();
    initSidebar();
    initNavTabs();
    initBlockedButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
