cd C:\Users\imadechumbo\Desktop\vision-core

@'
const fs = require("fs");

const file = "backend/server.js";
let src = fs.readFileSync(file, "utf8");

const oldCatch = `  } catch (err) {
    const { createHash } = require('crypto');
    const fallbackReceipt = ['evr', 'catch', 'none', 'blocked', 'promotion-blocked',
      String(err.message.length), Date.now()].join('_').replace(/[^a-zA-Z0-9._-]+/g, '-');
    return res.status(200).json({
      ok: false, pass_gold: false, promotion_allowed: false,
      error_type: 'go_runtime_failure', message: err.message, time: now(),
      evidence_receipt: fallbackReceipt,
      steps: [],
    });
  }`;

const newCatch = `  } catch (err) {
    return res.status(200).json({
      ok: false,
      status: 'FAIL',
      pass_gold: false,
      promotion_allowed: false,
      deploy_allowed: false,
      backend_stub: true,
      backendStub: true,
      backendHasMissionId: false,
      backendHasEvidenceReceipt: false,
      mission_id: null,
      evidence_receipt: null,
      gates: {},
      failed_gates: ['go_runtime_failure'],
      strict_pass_gold_reason: 'go_runtime_failure',
      error_type: 'go_runtime_failure',
      message: err.message,
      error: err.message,
      steps: [],
      time: now()
    });
  }`;

if (!src.includes(oldCatch)) {
  console.error("PATCH FAIL: bloco catch antigo não encontrado em backend/server.js");
  process.exit(2);
}

src = src.replace(oldCatch, newCatch);

src = src.replace(
  `  if (result.pass_gold) {
    saveMarkdown('incidents', result.mission_id || makeId('mission'), {`,
  `  if (
    result.pass_gold === true &&
    result.promotion_allowed === true &&
    result.backend_stub === false &&
    result.backendHasEvidenceReceipt === true &&
    result.evidence_receipt
  ) {
    saveMarkdown('incidents', result.mission_id || makeId('mission'), {`
);

src = src.replace(
  `  return res.json(Object.assign({ time: now(), stream: '/api/run-live-stream' }, result));`,
  `  return res.status(200).json({
    time: now(),
    stream: '/api/run-live-stream',
    ...result,
    pass_gold: result.pass_gold === true,
    promotion_allowed:
      result.promotion_allowed === true &&
      result.pass_gold === true &&
      result.backend_stub === false &&
      result.backendHasEvidenceReceipt === true,
    deploy_allowed: false,
    backend_stub: result.backend_stub !== false,
    backendStub: result.backendStub !== false,
    backendHasMissionId: result.backendHasMissionId === true,
    backendHasEvidenceReceipt: result.backendHasEvidenceReceipt === true,
    mission_id: result.backendHasMissionId === true ? result.mission_id : null,
    evidence_receipt: result.backendHasEvidenceReceipt === true ? result.evidence_receipt : null,
    strict_pass_gold_reason: result.strict_pass_gold_reason || 'pass_gold_false'
  });`
);

fs.writeFileSync(file, src, "utf8");

console.log("PATCH OK: backend/server.js não fabrica mais fallbackReceipt/evidence_receipt fake.");
'@ | Set-Content tools\remove-server-fake-evidence.cjs -Encoding UTF8

node tools\remove-server-fake-evidence.cjs
Remove-Item tools\remove-server-fake-evidence.cjs