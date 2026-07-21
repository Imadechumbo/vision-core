"""
§120b — replace forced-overlap fallback with conceptual fallback in positionBalloon
"""
path = 'frontend/assets/vision-core-bundle.js'
with open(path, 'rb') as f:
    raw = f.read()

OLD = (
    b"    // Fallback: elemento ocupa quase toda a viewport \xe2\x80\x94 usa posi\xc3\xa7\xc3\xa3o pedida sem garantia.\r\n"
    b"    if (!chosen) { chosen = calcPos(pos); }\r\n"
    b"\r\n"
    b"    balloon.style.transform = '';\r\n"
    b"    balloon.style.top  = chosen.t + 'px';\r\n"
    b"    balloon.style.left = chosen.l + 'px';\r\n"
    b"\r\n"
    b"    // Scroll suave para o elemento\r\n"
    b"    try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}\r\n"
    b"  }"
)

NEW = (
    b"    // Fallback: nenhuma candidata escapa do spotlight \xe2\x80\x94 elemento preenche o viewport.\r\n"
    b"    // Usa fallback conceitual (bal\xc3\xa3o centralizado, spotlight zerado) em vez de sobrep\xc3\xb4r.\r\n"
    b"    if (!chosen) {\r\n"
    b"      balloon.style.transform = '';\r\n"
    b"      balloon.style.top  = Math.max(80, vh / 2 - 120) + 'px';\r\n"
    b"      balloon.style.left = Math.max(16, vw / 2 - bw / 2) + 'px';\r\n"
    b"      spotlight.style.cssText = 'top:0;left:0;width:0;height:0;box-shadow:0 0 0 9999px rgba(0,0,0,0.55)';\r\n"
    b"      return;\r\n"
    b"    }\r\n"
    b"\r\n"
    b"    balloon.style.transform = '';\r\n"
    b"    balloon.style.top  = chosen.t + 'px';\r\n"
    b"    balloon.style.left = chosen.l + 'px';\r\n"
    b"\r\n"
    b"    // Scroll suave para o elemento\r\n"
    b"    try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}\r\n"
    b"  }"
)

assert OLD in raw, "OLD not found"
result = raw.replace(OLD, NEW, 1)
with open(path, 'wb') as f:
    f.write(result)
print("Written:", len(result), "bytes")
print("DONE")
