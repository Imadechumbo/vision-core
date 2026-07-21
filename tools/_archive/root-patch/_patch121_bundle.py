"""
§121 — patch vision-core-bundle.js
  1. Insere scroll listener vars/funções depois de getEl
  2. Reescreve positionBalloon: skipScroll param, data-arrow, --vc-arrow-x/y, _chosenCand
  3. Atualiza showStep: _addScrollListener + _scrollTgt/_scrollHint
  4. Atualiza closeTutorial: _removeScrollListener + remove data-arrow
"""
path = 'frontend/assets/vision-core-bundle.js'
with open(path, 'rb') as f:
    raw = f.read()

# ─── 1. Inserir scroll vars/funções após getEl ───────────────────────────────
OLD_GETEL = (
    b"  function getEl(sel) { try { return document.querySelector(sel); } catch(e) { return null; } }\r\n"
    b"\r\n"
    b"  function positionBalloon(targetEl, pos) {"
)
NEW_GETEL = (
    b"  function getEl(sel) { try { return document.querySelector(sel); } catch(e) { return null; } }\r\n"
    b"\r\n"
    b"  // \xc2\xa7121: scroll tracking \xe2\x80\x94 reposiciona bal\xc3\xa3o quando usu\xc3\xa1rio rola manualmente\r\n"
    b"  var _scrollTgt = null, _scrollHint = null, _scrollRafId = null, _scrollDebTimer = null, _scrollListenerOn = false;\r\n"
    b"  function _onScroll() {\r\n"
    b"    if (_scrollRafId) return;\r\n"
    b"    _scrollRafId = requestAnimationFrame(function() {\r\n"
    b"      _scrollRafId = null;\r\n"
    b"      if (!_scrollTgt || !overlay || overlay.style.display === 'none') return;\r\n"
    b"      var _sb = document.getElementById('vcTutorialBalloon');\r\n"
    b"      if (_sb) _sb.style.transition = 'none';\r\n"
    b"      positionBalloon(_scrollTgt, _scrollHint, true); // skipScroll=true\r\n"
    b"      clearTimeout(_scrollDebTimer);\r\n"
    b"      _scrollDebTimer = setTimeout(function() { if (_sb) _sb.style.transition = ''; }, 150);\r\n"
    b"    });\r\n"
    b"  }\r\n"
    b"  function _addScrollListener() {\r\n"
    b"    if (!_scrollListenerOn) { window.addEventListener('scroll', _onScroll, true); _scrollListenerOn = true; }\r\n"
    b"  }\r\n"
    b"  function _removeScrollListener() {\r\n"
    b"    window.removeEventListener('scroll', _onScroll, true);\r\n"
    b"    _scrollListenerOn = false;\r\n"
    b"    if (_scrollRafId) { cancelAnimationFrame(_scrollRafId); _scrollRafId = null; }\r\n"
    b"    clearTimeout(_scrollDebTimer); _scrollDebTimer = null;\r\n"
    b"    _scrollTgt = null; _scrollHint = null;\r\n"
    b"  }\r\n"
    b"\r\n"
    b"  function positionBalloon(targetEl, pos, skipScroll) {"
)
assert OLD_GETEL in raw, "OLD_GETEL not found"
result = raw.replace(OLD_GETEL, NEW_GETEL, 1)
print("Step 1 (scroll listener vars): OK")

# ─── 2. Reescrever corpo de positionBalloon ──────────────────────────────────
# Substituição dentro de positionBalloon:
# a) Adicionar balloon.removeAttribute('data-arrow') no !inView
# b) Trackear _cand no loop
# c) Adicionar balloon.removeAttribute('data-arrow') no !chosen
# d) Após balloon.style.left = ..., adicionar data-arrow + arrow offsets
# e) Adicionar if (!skipScroll) antes do scrollIntoView

S = b"\xc2\xa7"

# a) !inView path: adicionar removeAttribute('data-arrow')
OLD_INVIEW = (
    b"    if (!inView) {\r\n"
    b"      // " + S + b"120: passo conceitual \xe2\x80\x94 bal\xc3\xa3o centralizado; overlay escurece uniformemente\r\n"
    b"      // (spotlight a 0x0 mas com box-shadow, sem apagar o efeito visual).\r\n"
    b"      balloon.style.transform = '';\r\n"
)
NEW_INVIEW = (
    b"    if (!inView) {\r\n"
    b"      // " + S + b"120: passo conceitual \xe2\x80\x94 bal\xc3\xa3o centralizado; overlay escurece uniformemente\r\n"
    b"      // (spotlight a 0x0 mas com box-shadow, sem apagar o efeito visual).\r\n"
    b"      balloon.removeAttribute('data-arrow'); // " + S + b"121: sem seta em passo conceitual\r\n"
    b"      balloon.style.transform = '';\r\n"
)
assert OLD_INVIEW in result, "OLD_INVIEW not found"
result = result.replace(OLD_INVIEW, NEW_INVIEW, 1)
print("Step 2a (!inView removeAttribute): OK")

# b+c) Loop + !chosen: trackear _cand e adicionar removeAttribute no fallback
OLD_LOOP = (
    b"    var chosen = null;\r\n"
    b"    for (var ci = 0; ci < order.length; ci++) {\r\n"
    b"      var p = calcPos(order[ci]);\r\n"
    b"      if (!overlaps(p.t, p.l)) { chosen = p; break; }\r\n"
    b"    }\r\n"
    b"\r\n"
    b"    // Fallback: nenhuma candidata escapa do spotlight \xe2\x80\x94 elemento preenche o viewport.\r\n"
    b"    // Usa fallback conceitual (bal\xc3\xa3o centralizado, spotlight zerado) em vez de sobrep\xc3\xb4r.\r\n"
    b"    if (!chosen) {\r\n"
    b"      balloon.style.transform = '';\r\n"
    b"      balloon.style.top  = Math.max(80, vh / 2 - 120) + 'px';\r\n"
    b"      balloon.style.left = Math.max(16, vw / 2 - bw / 2) + 'px';\r\n"
    b"      spotlight.style.cssText = 'top:0;left:0;width:0;height:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.55)';\r\n"
    b"      return;\r\n"
    b"    }\r\n"
)
NEW_LOOP = (
    b"    var chosen = null;\r\n"
    b"    var _cand = pos; // " + S + b"121: candidata escolhida \xe2\x80\x94 define data-arrow\r\n"
    b"    for (var ci = 0; ci < order.length; ci++) {\r\n"
    b"      var p = calcPos(order[ci]);\r\n"
    b"      if (!overlaps(p.t, p.l)) { chosen = p; _cand = order[ci]; break; }\r\n"
    b"    }\r\n"
    b"\r\n"
    b"    // Fallback: nenhuma candidata escapa do spotlight \xe2\x80\x94 elemento preenche o viewport.\r\n"
    b"    // Usa fallback conceitual (bal\xc3\xa3o centralizado, spotlight zerado) em vez de sobrep\xc3\xb4r.\r\n"
    b"    if (!chosen) {\r\n"
    b"      balloon.removeAttribute('data-arrow'); // " + S + b"121: sem seta no fallback\r\n"
    b"      balloon.style.transform = '';\r\n"
    b"      balloon.style.top  = Math.max(80, vh / 2 - 120) + 'px';\r\n"
    b"      balloon.style.left = Math.max(16, vw / 2 - bw / 2) + 'px';\r\n"
    b"      spotlight.style.cssText = 'top:0;left:0;width:0;height:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.55)';\r\n"
    b"      return;\r\n"
    b"    }\r\n"
)
assert OLD_LOOP in result, "OLD_LOOP not found"
result = result.replace(OLD_LOOP, NEW_LOOP, 1)
print("Step 2b+c (loop _cand + fallback removeAttribute): OK")

# d+e) Após chosen.l, adicionar data-arrow; adicionar skipScroll guard
OLD_END = (
    b"    balloon.style.transform = '';\r\n"
    b"    balloon.style.top  = chosen.t + 'px';\r\n"
    b"    balloon.style.left = chosen.l + 'px';\r\n"
    b"\r\n"
    b"    // Scroll suave para o elemento\r\n"
    b"    try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}\r\n"
    b"  }"
)
NEW_END = (
    b"    balloon.style.transform = '';\r\n"
    b"    balloon.style.top  = chosen.t + 'px';\r\n"
    b"    balloon.style.left = chosen.l + 'px';\r\n"
    b"\r\n"
    b"    // " + S + b"121: seta direcional \xe2\x80\x94 aponta do bal\xc3\xa3o para o elemento iluminado\r\n"
    b"    var _arrowDir = { bottom: 'up', top: 'down', right: 'left', left: 'right' };\r\n"
    b"    balloon.setAttribute('data-arrow', _arrowDir[_cand] || 'up');\r\n"
    b"    // Alinha ponta ao centro do elemento-alvo (clamped dentro do bal\xc3\xa3o)\r\n"
    b"    var _ax = Math.round(rect.left + rect.width  / 2 - chosen.l - 9);\r\n"
    b"    var _ay = Math.round(rect.top  + rect.height / 2 - chosen.t - 9);\r\n"
    b"    balloon.style.setProperty('--vc-arrow-x', Math.max(12, Math.min(_ax, bw - 30)) + 'px');\r\n"
    b"    balloon.style.setProperty('--vc-arrow-y', Math.max(12, Math.min(_ay, bh - 30)) + 'px');\r\n"
    b"\r\n"
    b"    // Scroll suave para o elemento (omitido quando chamado pelo scroll handler)\r\n"
    b"    if (!skipScroll) {\r\n"
    b"      try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}\r\n"
    b"    }\r\n"
    b"  }"
)
assert OLD_END in result, "OLD_END not found"
result = result.replace(OLD_END, NEW_END, 1)
print("Step 2d+e (data-arrow + skipScroll): OK")

# ─── 3. Atualizar showStep: _addScrollListener + _scrollTgt/_scrollHint ──────
OLD_SS = (
    b"    setTimeout(function() {\r\n"
    b"      var el = getEl(step.target);\r\n"
    b"      var r  = el ? el.getBoundingClientRect() : null;\r\n"
    b"      var _vw = window.innerWidth, _vh = window.innerHeight;\r\n"
    b"      var inV = r && r.width > 0 && r.height > 0\r\n"
    b"                && r.top > -r.height && r.bottom < _vh + r.height\r\n"
    b"                && r.left > -r.width  && r.right  < _vw + r.width;\r\n"
    b"      if (!inV && el) {\r\n"
    b"        // Elemento existe mas ainda n\xc3\xa3o est\xc3\xa1 em view \xe2\x80\x94 retenta uma vez\r\n"
    b"        setTimeout(function() { positionBalloon(getEl(step.target), step.pos); }, 200);\r\n"
    b"      } else {\r\n"
    b"        positionBalloon(el, step.pos);\r\n"
    b"      }\r\n"
    b"    }, 80);\r\n"
    b"  }"
)
NEW_SS = (
    b"    _addScrollListener(); // " + S + b"121: garante listener ativo durante qualquer passo\r\n"
    b"    setTimeout(function() {\r\n"
    b"      var el = getEl(step.target);\r\n"
    b"      var r  = el ? el.getBoundingClientRect() : null;\r\n"
    b"      var _vw = window.innerWidth, _vh = window.innerHeight;\r\n"
    b"      var inV = r && r.width > 0 && r.height > 0\r\n"
    b"                && r.top > -r.height && r.bottom < _vh + r.height\r\n"
    b"                && r.left > -r.width  && r.right  < _vw + r.width;\r\n"
    b"      if (!inV && el) {\r\n"
    b"        // Elemento existe mas ainda n\xc3\xa3o est\xc3\xa1 em view \xe2\x80\x94 retenta uma vez\r\n"
    b"        setTimeout(function() {\r\n"
    b"          var el2 = getEl(step.target);\r\n"
    b"          _scrollTgt = el2; _scrollHint = step.pos; // " + S + b"121\r\n"
    b"          positionBalloon(el2, step.pos);\r\n"
    b"        }, 200);\r\n"
    b"      } else {\r\n"
    b"        _scrollTgt = el; _scrollHint = step.pos; // " + S + b"121\r\n"
    b"        positionBalloon(el, step.pos);\r\n"
    b"      }\r\n"
    b"    }, 80);\r\n"
    b"  }"
)
assert OLD_SS in result, "OLD_SS not found"
result = result.replace(OLD_SS, NEW_SS, 1)
print("Step 3 (showStep _addScrollListener + _scrollTgt): OK")

# ─── 4. Atualizar closeTutorial ───────────────────────────────────────────────
OLD_CLOSE = (
    b"  function closeTutorial() {\r\n"
    b"    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }\r\n"
    b"    _setMascot('idle');\r\n"
)
NEW_CLOSE = (
    b"  function closeTutorial() {\r\n"
    b"    _removeScrollListener(); // " + S + b"121: para de acompanhar scroll ao fechar\r\n"
    b"    var _cb = document.getElementById('vcTutorialBalloon');\r\n"
    b"    if (_cb) _cb.removeAttribute('data-arrow'); // " + S + b"121: remove seta ao fechar\r\n"
    b"    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }\r\n"
    b"    _setMascot('idle');\r\n"
)
assert OLD_CLOSE in result, "OLD_CLOSE not found"
result = result.replace(OLD_CLOSE, NEW_CLOSE, 1)
print("Step 4 (closeTutorial _removeScrollListener): OK")

with open(path, 'wb') as f:
    f.write(result)
print("Written:", len(result), "bytes")
print("DONE")
