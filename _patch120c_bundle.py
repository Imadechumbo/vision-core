"""
§120c — showStep: 80ms para todos, retry 200ms apenas quando inView===false
  (T2 paso 0 falhava com 200ms fixo porque o onEnter-click dispara animação CSS;
   T3 paso 0 precisa de retry porque SF page não abre instantaneamente)
"""
path = 'frontend/assets/vision-core-bundle.js'
with open(path, 'rb') as f:
    raw = f.read()

OLD = (
    b"    // \xc2\xa7118: onEnter \xe2\x80\x94 aciona navega\xc3\xa7\xc3\xa3o/reveal antes de medir getBoundingClientRect\r\n"
    b"    if (typeof step.onEnter === 'function') { try { step.onEnter(); } catch(e) {} }\r\n"
    b"    // \xc2\xa7120: passos com onEnter usam 200ms (renderiza\xc3\xa7\xc3\xa3o precisa assentar);\r\n"
    b"    // se o elemento ainda n\xc3\xa3o estiver em view na 1\xc2\xaa tentativa, retenta 1x com 150ms extra.\r\n"
    b"    var _delay = step.onEnter ? 200 : 80;\r\n"
    b"    setTimeout(function() {\r\n"
    b"      var el = getEl(step.target);\r\n"
    b"      var r  = el ? el.getBoundingClientRect() : null;\r\n"
    b"      var _vw = window.innerWidth, _vh = window.innerHeight;\r\n"
    b"      var inV = r && r.width > 0 && r.height > 0\r\n"
    b"                && r.top > -r.height && r.bottom < _vh + r.height\r\n"
    b"                && r.left > -r.width  && r.right  < _vw + r.width;\r\n"
    b"      if (!inV && el) {\r\n"
    b"        // Elemento existe mas ainda n\xc3\xa3o assentou \xe2\x80\x94 retenta uma vez\r\n"
    b"        setTimeout(function() { positionBalloon(getEl(step.target), step.pos); }, 150);\r\n"
    b"      } else {\r\n"
    b"        positionBalloon(el, step.pos);\r\n"
    b"      }\r\n"
    b"    }, _delay);\r\n"
    b"  }"
)

NEW = (
    b"    // \xc2\xa7118: onEnter \xe2\x80\x94 aciona navega\xc3\xa7\xc3\xa3o/reveal antes de medir getBoundingClientRect\r\n"
    b"    if (typeof step.onEnter === 'function') { try { step.onEnter(); } catch(e) {} }\r\n"
    b"    // \xc2\xa7120: 80ms base para todos (evita entrar no meio de transi\xc3\xa7\xc3\xb5es CSS do onEnter);\r\n"
    b"    // se o elemento ainda n\xc3\xa3o estiver em view, retenta 1x ap\xc3\xb3s 200ms extra\r\n"
    b"    // (cobre o caso de SF page que n\xc3\xa3o abre instantaneamente).\r\n"
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

assert OLD in raw, "OLD showStep block not found"
result = raw.replace(OLD, NEW, 1)
with open(path, 'wb') as f:
    f.write(result)
print("Written:", len(result), "bytes")
print("DONE")
