"""Move GET /api/spec/summary before GET /api/spec/:id to fix Express route ordering."""
import subprocess

f = 'C:/Users/imadechumbo/Desktop/vision-core/backend/server.js'
content = open(f, encoding='utf-8').read()

ANCHOR = "app.get('/api/spec/:id', (req, res) => {"

SUMMARY_START = "/* ─────────────────────────────────────────────────────────────────────\n   GET /api/spec/summary"
SUMMARY_END   = "});\n\n/* SAFE 404"

# Find and extract the summary block
idx_start = content.find(SUMMARY_START)
idx_end   = content.find(SUMMARY_END)
if idx_start == -1:
    print("ERROR: summary block start not found")
    # Debug
    for phrase in ["GET /api/spec/summary", "spec/summary", "SF-SEC"]:
        idx = content.find(phrase)
        print(f"  '{phrase}' at index {idx}")
    exit(1)
if idx_end == -1:
    print("ERROR: SAFE 404 not found")
    exit(1)

summary_block = content[idx_start:idx_end]
print(f"Found summary block: {len(summary_block)} chars, starts with: {repr(summary_block[:60])}")

# Remove the summary block (and any trailing whitespace before SAFE 404)
content2 = content[:idx_start].rstrip('\n') + '\n\n' + content[idx_end:]
if SUMMARY_START in content2:
    print("ERROR: removal failed")
    exit(1)
print("Removed summary block from old position")

# Insert before /api/spec/:id
anchor_idx = content2.find(ANCHOR)
if anchor_idx == -1:
    print("ERROR: anchor /api/spec/:id not found")
    exit(1)

insert_text = summary_block.rstrip('\n') + '\n\n'
content3 = content2[:anchor_idx] + insert_text + content2[anchor_idx:]
print(f"Inserted summary block before spec/:id (at char {anchor_idx})")

# Verify route order
idx_summary_new = content3.find("app.get('/api/spec/summary'")
idx_byid_new    = content3.find("app.get('/api/spec/:id'")
print(f"New route order: spec/summary at {idx_summary_new}, spec/:id at {idx_byid_new}")
assert idx_summary_new < idx_byid_new, "ERROR: route order wrong!"
print("Route order OK: spec/summary < spec/:id")

open(f, 'w', encoding='utf-8').write(content3)
print(f"Written {len(content3)} chars")

r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
if r.returncode == 0:
    print("SYNTAX OK")
else:
    print("SYNTAX ERROR:", r.stderr[:300])
    exit(1)
