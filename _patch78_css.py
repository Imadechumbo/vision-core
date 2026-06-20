css_block = """

/* ═══════════════════════════════════════════════════════════
   §78 — SF SPEC LIBRARY
   ═══════════════════════════════════════════════════════════ */

/* ── Header ── */
.vc-sf-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  background: #020c1a;
}

.vc-sf-header-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .1em;
  color: #94a3b8;
  flex: 1;
  text-align: center;
}

.vc-sf-search {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  padding: 5px 10px;
  width: 220px;
  outline: none;
  transition: border-color .15s;
}
.vc-sf-search:focus { border-color: #334155; }
.vc-sf-search::placeholder { color: #475569; }

/* ── Body: sidebar + main ── */
.vc-sf-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Sidebar ── */
.vc-sf-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #1e293b;
  overflow-y: auto;
  padding: 12px 0;
  background: #020c1a;
  display: flex;
  flex-direction: column;
}

.vc-sf-sidebar-section-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .12em;
  color: #334155;
  padding: 0 14px 6px;
}

.vc-sf-sidebar-loading {
  font-size: 11px;
  color: #475569;
  padding: 8px 14px;
}

.vc-sf-module-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: none;
  border: none;
  padding: 6px 14px;
  cursor: pointer;
  text-align: left;
  border-left: 2px solid transparent;
  transition: background .1s, border-color .1s;
}
.vc-sf-module-item:hover { background: #0f172a; }
.vc-sf-module-item.active {
  border-left-color: #334155;
  background: #0f172a;
}

.vc-sf-module-item-id {
  font-size: 10px;
  font-family: monospace;
  color: #475569;
  min-width: 48px;
}
.vc-sf-module-item.active .vc-sf-module-item-id { color: #64748b; }

.vc-sf-module-item-name {
  font-size: 11px;
  color: #94a3b8;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vc-sf-module-item.active .vc-sf-module-item-name { color: #cbd5e1; }

.vc-sf-module-item-count {
  font-size: 10px;
  color: #334155;
  font-family: monospace;
}

.vc-sf-filter-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 14px;
}

.vc-sf-filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  padding: 3px 0;
  user-select: none;
}
.vc-sf-filter-item:hover { color: #94a3b8; }
.vc-sf-filter-item input { accent-color: #475569; cursor: pointer; }

.vc-sf-sidebar-footer {
  margin-top: auto;
  padding: 12px 14px 4px;
  font-size: 10px;
  color: #334155;
  border-top: 1px solid #1e293b;
}

/* ── Main area ── */
.vc-sf-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.vc-sf-main-empty {
  color: #334155;
  font-size: 12px;
  padding: 24px 0;
}

/* ── Module header ── */
.vc-sf-module-header {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.vc-sf-module-header-id {
  font-family: monospace;
  font-size: 11px;
  color: #475569;
}

.vc-sf-module-header-name {
  font-weight: 500;
  color: #cbd5e1;
}

.vc-sf-module-header-count {
  font-size: 10px;
  color: #334155;
  margin-left: auto;
  font-family: monospace;
}

/* ── Spec cards ── */
.vc-sf-spec-card {
  background: #0a1628;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 8px;
  transition: border-color .15s;
}
.vc-sf-spec-card:hover { border-color: #334155; }

.vc-sf-spec-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.vc-sf-spec-id {
  font-family: monospace;
  font-size: 10px;
  color: #475569;
}

.vc-sf-spec-title {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.4;
  margin-bottom: 5px;
}

.vc-sf-spec-pass {
  font-size: 11px;
  color: #22c55e;
  margin-top: 3px;
  opacity: .85;
}

.vc-sf-spec-fail {
  font-size: 11px;
  color: #f87171;
  margin-top: 2px;
  opacity: .85;
}

.vc-sf-spec-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #1e293b;
}

/* ── Buttons ── */
.vc-sf-lib-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background .1s, color .1s;
  letter-spacing: .03em;
}
.vc-sf-lib-btn:hover {
  background: #334155;
  color: #e2e8f0;
}

.vc-sf-lib-btn.secondary {
  background: transparent;
  border-color: #1e293b;
  color: #64748b;
}
.vc-sf-lib-btn.secondary:hover {
  background: #0f172a;
  color: #94a3b8;
  border-color: #334155;
}

/* ── Bottom module actions ── */
.vc-sf-main-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #1e293b;
}

/* ── §78 — unified agent badge row ── */
.v298-bubble-assistant {
  display: flex;
  flex-direction: column;
}

/* ── §78 — translate="no" em elementos técnicos ── */
.vc-sf-header-title,
.vc-sf-module-item-id,
.vc-sf-spec-id,
#vcSfLibFooter,
.vc-sf-sidebar-section-label {
  translate: no;
}

/* ── §78 — scrollbar sutil na sidebar e main ── */
.vc-sf-sidebar::-webkit-scrollbar,
.vc-sf-main::-webkit-scrollbar { width: 4px; }
.vc-sf-sidebar::-webkit-scrollbar-track,
.vc-sf-main::-webkit-scrollbar-track { background: transparent; }
.vc-sf-sidebar::-webkit-scrollbar-thumb,
.vc-sf-main::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 2px;
}

/* ── §78 — responsivo: sidebar colapsa em tela estreita ── */
@media (max-width: 640px) {
  .vc-sf-body { flex-direction: column; }
  .vc-sf-sidebar {
    width: 100%;
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid #1e293b;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 8px;
  }
  .vc-sf-module-item { width: auto; flex-shrink: 0; }
  .vc-sf-filter-group { flex-direction: row; flex-wrap: wrap; }
  .vc-sf-sidebar-footer { display: none; }
}
"""

f = 'C:/Users/imadechumbo/Desktop/vision-core/frontend/assets/vision-core-bundle.css'
with open(f, 'a', encoding='utf-8') as fh:
    fh.write(css_block)
print('OK')
