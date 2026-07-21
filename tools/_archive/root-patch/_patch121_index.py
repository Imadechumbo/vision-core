"""
§121 — patch frontend/index.html
"""
path = 'frontend/index.html'
with open(path, 'rb') as f:
    raw = f.read()

# ── 1. Remove §95 position:relative!important ──
# b'\xc2\xa7' = UTF-8 for §
OLD_95 = b"/* " + b"\xc2\xa7" + b"95 MASCOTE TOP-RIGHT */\r\n.vc-tutorial-balloon{position:relative!important}\r\n"
NEW_95 = b"/* " + b"\xc2\xa7" + b"95 MASCOTE TOP-RIGHT \xe2\x80\x94 position:relative removida em " + b"\xc2\xa7" + b"121: position:fixed j\xc3\xa1 cria containing block para filhos absolute. */\r\n"

assert OLD_95 in raw, "OLD_95 not found: " + repr(raw[3040:3120])
result = raw.replace(OLD_95, NEW_95, 1)
print("Step 1 (remove position:relative!important): OK")

# ── 2. Adiciona CSS de seta depois de .vc-tutorial-balloon{position:fixed...} ──
ANCHOR = (
    b".vc-tutorial-balloon{position:fixed;z-index:100001;background:#000000;"
    b"border:1.5px solid #6366f1;border-radius:14px;padding:22px 24px 16px;"
    b"max-width:340px;min-width:260px;box-shadow:0 8px 40px rgba(99,102,241,.35);"
    b"transition:all .3s cubic-bezier(.4,0,.2,1)}\r\n"
)
assert ANCHOR in result, "ANCHOR not found"

# §121 arrow CSS
S = b"\xc2\xa7"  # § in UTF-8
ARROW_CSS = (
    b"/* " + S + b"121 SETA DIRECIONAL DO BAL\xc3\x83O */\r\n"
    b".vc-tutorial-balloon[data-arrow]::before,"
    b".vc-tutorial-balloon[data-arrow]::after"
    b"{content:'';position:absolute;width:0;height:0;pointer-events:none}\r\n"
    # UP arrow (balloon below target)
    b".vc-tutorial-balloon[data-arrow=\"up\"]::before"
    b"{border-left:9px solid transparent;border-right:9px solid transparent;"
    b"border-bottom:9px solid #6366f1;top:-9px;left:var(--vc-arrow-x,20px)}\r\n"
    b".vc-tutorial-balloon[data-arrow=\"up\"]::after"
    b"{border-left:7px solid transparent;border-right:7px solid transparent;"
    b"border-bottom:7px solid #000000;top:-6px;left:calc(var(--vc-arrow-x,20px) + 2px)}\r\n"
    # DOWN arrow (balloon above target)
    b".vc-tutorial-balloon[data-arrow=\"down\"]::before"
    b"{border-left:9px solid transparent;border-right:9px solid transparent;"
    b"border-top:9px solid #6366f1;bottom:-9px;left:var(--vc-arrow-x,20px)}\r\n"
    b".vc-tutorial-balloon[data-arrow=\"down\"]::after"
    b"{border-left:7px solid transparent;border-right:7px solid transparent;"
    b"border-top:7px solid #000000;bottom:-6px;left:calc(var(--vc-arrow-x,20px) + 2px)}\r\n"
    # LEFT arrow (balloon right of target)
    b".vc-tutorial-balloon[data-arrow=\"left\"]::before"
    b"{border-top:9px solid transparent;border-bottom:9px solid transparent;"
    b"border-right:9px solid #6366f1;left:-9px;top:var(--vc-arrow-y,28px)}\r\n"
    b".vc-tutorial-balloon[data-arrow=\"left\"]::after"
    b"{border-top:7px solid transparent;border-bottom:7px solid transparent;"
    b"border-right:7px solid #000000;left:-6px;top:calc(var(--vc-arrow-y,28px) + 2px)}\r\n"
    # RIGHT arrow (balloon left of target)
    b".vc-tutorial-balloon[data-arrow=\"right\"]::before"
    b"{border-top:9px solid transparent;border-bottom:9px solid transparent;"
    b"border-left:9px solid #6366f1;right:-9px;left:auto;top:var(--vc-arrow-y,28px)}\r\n"
    b".vc-tutorial-balloon[data-arrow=\"right\"]::after"
    b"{border-top:7px solid transparent;border-bottom:7px solid transparent;"
    b"border-left:7px solid #000000;right:-6px;left:auto;top:calc(var(--vc-arrow-y,28px) + 2px)}\r\n"
)

result = result.replace(ANCHOR, ANCHOR + ARROW_CSS, 1)
print("Step 2 (add arrow CSS):", "OK" if ARROW_CSS in result else "FAILED")

with open(path, 'wb') as f:
    f.write(result)
print("Written:", len(result), "bytes")
print("DONE")
