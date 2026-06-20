import re

content = open('C:/Users/imadechumbo/Desktop/vision-core/frontend/assets/vision-core-bundle.js', encoding='utf-8').read()

NEW_FUNC = """  function initSpecLibraryPage() {
    var sfPage  = document.getElementById('vcSoftwareFactoryPage');
    if (!sfPage) return;

    var _activeModuleId  = null;
    var _allSpecs        = [];   // specs do módulo ativo
    var _activeFilter    = 'all';
    var _searchQuery     = '';

    // ── Back button ──
    var backBtn = document.getElementById('vcSfBackBtn');
    if (backBtn) backBtn.addEventListener('click', showMainCockpitPage);

    // ── Open SF page buttons (header + sidebar nav) ──
    document.querySelectorAll('[data-open-sf-page]').forEach(function(btn) {
      btn.addEventListener('click', showSoftwareFactoryPage);
    });

    // ── Search ──
    var searchEl = document.getElementById('vcSfSearch');
    if (searchEl) {
      searchEl.addEventListener('input', function() {
        _searchQuery = searchEl.value.trim().toLowerCase();
        _renderSpecCards();
      });
    }

    // ── Filters ──
    document.querySelectorAll('input[name="sf-type-filter"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        _activeFilter = radio.value;
        _renderSpecCards();
      });
    });

    // ── Load sidebar on page open ──
    var _sidebarLoaded = false;
    var _origShowSF = window.showSoftwareFactoryPage;
    window.showSoftwareFactoryPage = function() {
      if (_origShowSF) _origShowSF();
      if (!_sidebarLoaded) { _loadSidebar(); _sidebarLoaded = true; }
    };

    // ── Load sidebar via GET /api/spec/summary ──
    function _loadSidebar() {
      fetch(BACKEND_URL + '/api/spec/summary')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.ok || !data.modules) return;
          var list   = document.getElementById('vcSfModuleList');
          var footer = document.getElementById('vcSfLibFooter');
          if (footer) footer.textContent = data.total_specs + ' specs · ' + data.total_modules + ' módulos';
          if (!list)  return;

          list.innerHTML = data.modules.map(function(m) {
            return '<button class="vc-sf-module-item" data-module-id="' + m.id + '" type="button">' +
              '<span class="vc-sf-module-item-id">' + m.id + '</span>' +
              '<span class="vc-sf-module-item-name">' + m.name + '</span>' +
              '<span class="vc-sf-module-item-count">' + m.count + '</span>' +
            '</button>';
          }).join('');

          list.querySelectorAll('.vc-sf-module-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
              list.querySelectorAll('.vc-sf-module-item').forEach(function(b) {
                b.classList.remove('active');
              });
              btn.classList.add('active');
              _loadModule(btn.dataset.moduleId);
            });
          });
        })
        .catch(function(err) {
          var list = document.getElementById('vcSfModuleList');
          if (list) list.innerHTML = '<div style="color:#f87171;font-size:12px;padding:8px">Erro ao carregar módulos.</div>';
        });
    }

    // ── Load specs de um módulo ──
    function _loadModule(moduleId) {
      _activeModuleId = moduleId;
      var container = document.getElementById('vcSfSpecsContainer');
      var empty     = document.getElementById('vcSfMainEmpty');
      var header    = document.getElementById('vcSfModuleHeader');
      var cards     = document.getElementById('vcSfSpecCards');

      if (container) container.style.display = 'none';
      if (empty)     empty.style.display     = '';
      if (header)    header.textContent      = 'Carregando ' + moduleId + '...';

      fetch(BACKEND_URL + '/api/spec?module=' + moduleId)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          _allSpecs = data.specs || [];
          if (empty)     empty.style.display     = 'none';
          if (container) container.style.display = '';
          if (header) {
            var mod = _allSpecs[0];
            header.innerHTML =
              '<span class="vc-sf-module-header-id">' + moduleId + '</span> — ' +
              '<span class="vc-sf-module-header-name">' + (mod ? mod.module_name || moduleId : moduleId) + '</span>' +
              '<span class="vc-sf-module-header-count">' + _allSpecs.length + ' specs</span>';
          }
          _renderSpecCards();
        })
        .catch(function() {
          if (empty) { empty.style.display = ''; empty.textContent = 'Erro ao carregar specs de ' + moduleId; }
        });
    }

    // ── Renderizar cards com filtro + search ──
    function _renderSpecCards() {
      var cards = document.getElementById('vcSfSpecCards');
      if (!cards) return;

      var TYPE_COLOR = {
        'HAPPY PATH':       '#22c55e',
        'EDGE':             '#f59e0b',
        'SECURITY':         '#f87171',
        'SECURITY CRÍTICO': '#ef4444',
      };

      var filtered = _allSpecs.filter(function(s) {
        if (_activeFilter !== 'all' && s.type !== _activeFilter) return false;
        if (_searchQuery) {
          var hay = ((s.id || '') + ' ' + (s.title || '') + ' ' + (s.pass_criteria || '') + ' ' + (s.tags || []).join(' ')).toLowerCase();
          if (!hay.includes(_searchQuery)) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        cards.innerHTML = '<div style="color:#64748b;font-size:12px;padding:16px">Nenhuma spec encontrada.</div>';
        return;
      }

      cards.innerHTML = filtered.map(function(s) {
        var color  = (s.type && TYPE_COLOR[s.type]) || '#64748b';
        var badge  = s.type
          ? '<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;white-space:nowrap">' + s.type + '</span>'
          : '';
        var tags = Array.isArray(s.tags) && s.tags.length
          ? '<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">' +
              s.tags.map(function(t) {
                return '<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:#1e293b;color:#64748b;border:1px solid #1e293b">' + t + '</span>';
              }).join('') +
            '</div>'
          : '';
        var specJson = JSON.stringify(s, null, 2);

        return '<div class="vc-sf-spec-card" data-spec-id="' + (s.id || '') + '">' +
          '<div class="vc-sf-spec-card-head">' +
            '<span class="vc-sf-spec-id">' + (s.id || '?') + '</span>' + badge +
          '</div>' +
          '<div class="vc-sf-spec-title">' + (s.title || '') + '</div>' +
          (s.pass_criteria ? '<div class="vc-sf-spec-pass">✓ ' + s.pass_criteria + '</div>' : '') +
          (s.fail_criteria ? '<div class="vc-sf-spec-fail">✗ ' + s.fail_criteria + '</div>' : '') +
          tags +
          '<div class="vc-sf-spec-actions">' +
            '<button class="vc-sf-lib-btn secondary vc-sf-copy-spec" data-spec-json="' + _esc(specJson) + '" type="button">⍘ copiar</button>' +
            '<button class="vc-sf-lib-btn vc-sf-send-spec" data-spec-id="' + (s.id || '') + '" data-spec-title="' + _esc(s.title || '') + '" data-spec-pass="' + _esc(s.pass_criteria || '') + '" data-spec-tags="' + _esc((s.tags || []).join(', ')) + '" type="button">→ chat</button>' +
          '</div>' +
        '</div>';
      }).join('');

      // ── Bind copy buttons ──
      cards.querySelectorAll('.vc-sf-copy-spec').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var json = btn.dataset.specJson;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(json).then(function() {
              btn.textContent = '✓ copiado';
              setTimeout(function() { btn.textContent = '⍘ copiar'; }, 1800);
            });
          }
        });
      });

      // ── Bind → chat buttons ──
      cards.querySelectorAll('.vc-sf-send-spec').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id    = btn.dataset.specId;
          var title = btn.dataset.specTitle;
          var pass  = btn.dataset.specPass;
          var tags  = btn.dataset.specTags;
          var text  = '[SPEC ' + id + '] ' + title + '\\nPASS: ' + pass + '\\nTags: ' + tags + '\\n\\nCom base nessa spec, ';
          showMainCockpitPage();
          setTimeout(function() {
            var inp = document.getElementById('v298ChatInput');
            if (inp) { inp.value = text; inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          }, 120);
        });
      });
    }

    // ── Copy módulo inteiro ──
    var copyModBtn = document.getElementById('vcSfCopyModule');
    if (copyModBtn) {
      copyModBtn.addEventListener('click', function() {
        if (!_allSpecs.length) return;
        var text = JSON.stringify({ module: _activeModuleId, specs: _allSpecs }, null, 2);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function() {
            copyModBtn.textContent = '✓ copiado';
            setTimeout(function() { copyModBtn.textContent = '⍘ copiar módulo'; }, 2000);
          });
        }
      });
    }

    // ── Enviar módulo ao chat ──
    var sendModBtn = document.getElementById('vcSfSendModule');
    if (sendModBtn) {
      sendModBtn.addEventListener('click', function() {
        if (!_allSpecs.length) return;
        var ids  = _allSpecs.map(function(s) { return s.id; }).join(', ');
        var text = '[MÓDULO ' + _activeModuleId + '] ' + _allSpecs.length + ' specs: ' + ids + '\\n\\nCom base neste módulo, ';
        showMainCockpitPage();
        setTimeout(function() {
          var inp = document.getElementById('v298ChatInput');
          if (inp) { inp.value = text; inp.focus(); }
        }, 120);
      });
    }
  }"""

start_marker = '  function initSoftwareFactoryPage() {'
end_anchor   = '  /* ── Auth modal wiring ───────────────────────────────────────── */'

i_start = content.find(start_marker)
i_end   = content.find(end_anchor)
if i_start == -1 or i_end == -1:
    print('ERROR markers not found', i_start, i_end)
    exit(1)

old_block = content[i_start:i_end]
print('Old block lines:', old_block.count('\n'))

result = content[:i_start] + NEW_FUNC + '\n\n  ' + content[i_end:]
open('C:/Users/imadechumbo/Desktop/vision-core/frontend/assets/vision-core-bundle.js', 'w', encoding='utf-8').write(result)
print('OK — wrote', len(result), 'chars')
