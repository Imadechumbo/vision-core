"""
Fix: spec/summary handler is not properly closed.
The route block was inserted without its closing });
causing all subsequent routes to be nested inside the callback.

Fix:
1. Find the spec/summary return sendOk block and add }); after it
2. Remove the orphan }); that's between architect/interpret and SAFE 404
"""
import subprocess

f = 'C:/Users/imadechumbo/Desktop/vision-core/backend/server.js'
content = open(f, encoding='utf-8').read()

# The spec/summary handler ends with:
#   return sendOk(res, {
#     modules,
#     total_specs:   modules.reduce((s, m) => s + m.count, 0),
#     total_modules: modules.length,
#     time: now()
#   });
# We need to add }); after the last }); to close the route handler

# Step 1: Add }); after the summary handler's return sendOk
# The exact text to find (the end of the spec/summary handler's body)
SUMMARY_INNER_END = "  return sendOk(res, {\n    modules,\n    total_specs:   modules.reduce((s, m) => s + m.count, 0),\n    total_modules: modules.length,\n    time: now()\n  });\n"

if SUMMARY_INNER_END not in content:
    # Try with \r\n
    SUMMARY_INNER_END = SUMMARY_INNER_END.replace('\n', '\r\n')
    if SUMMARY_INNER_END not in content:
        print("ERROR: summary inner end not found")
        # Show what's around the sendOk call
        idx = content.find('total_modules: modules.length')
        if idx > 0:
            print(repr(content[idx-10:idx+80]))
        exit(1)

# Add }); after the summary body
SUMMARY_INNER_END_PLUS = SUMMARY_INNER_END + '});\n'
content2 = content.replace(SUMMARY_INNER_END, SUMMARY_INNER_END_PLUS, 1)
print("Added }); to close spec/summary handler")

# Step 2: Remove the orphan }); between architect/interpret and SAFE 404
# After fix in step 1, the orphan }); is now EXTRA
# The orphan appears as: });\n\n});\n\n/* SAFE 404
ORPHAN = '});\n\n});\n\n/* SAFE 404'
if ORPHAN not in content2:
    ORPHAN = '});\r\n\r\n});\r\n\r\n/* SAFE 404'
    if ORPHAN not in content2:
        print("ERROR: orphan pattern not found")
        idx = content2.find('/* SAFE 404')
        print(repr(content2[idx-50:idx]))
        exit(1)

FIX_ORPHAN = '});\n\n/* SAFE 404'
content3 = content2.replace(ORPHAN, FIX_ORPHAN, 1)
print("Removed orphan }); near SAFE 404")

open(f, 'w', encoding='utf-8').write(content3)
print(f"Written {len(content3)} chars")

r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
if r.returncode == 0:
    print("SYNTAX OK")
    # Verify route order
    idx_summary = content3.find("app.get('/api/spec/summary'")
    idx_byid    = content3.find("app.get('/api/spec/:id'")
    idx_arch    = content3.find("app.post('/api/architect/interpret'")
    print(f"Route positions: spec/summary={idx_summary}, spec/:id={idx_byid}, architect/interpret={idx_arch}")
    assert idx_summary < idx_byid, "spec/summary should be before spec/:id"
    assert idx_byid < idx_arch,    "spec/:id should be before architect"
    print("All route positions correct")
else:
    print("SYNTAX ERROR:", r.stderr[:300])
    exit(1)
