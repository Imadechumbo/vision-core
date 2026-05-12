(function () {
  "use strict";

  const runtime = {
    running: false,
    currentMissionId: null,
    lastPayload: null,
    eventSource: null
  };

  function byId(id) { return document.getElementById(id); }

  function log(line) {
    const box = byId("logsBox");
    if (!box) return;
    const stamp = new Date().toISOString();
    box.textContent += `\n[${stamp}] ${line}`;
    box.scrollTop = box.scrollHeight;
  }

  function setRuntimeStatus(status) {
    const text = String(status || "READY").toUpperCase();
    const node = byId("runtimeText");
    if (node) node.textContent = text;
  }

  function evidenceReceiptIsValid(value) {
    if (typeof value === "string") return value.trim().length >= 8;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return false;
  }

  function hasGoldEvidence(payload) {
    return Boolean(
      payload &&
      payload.pass_gold === true &&
      payload.promotion_allowed === true &&
      evidenceReceiptIsValid(payload.evidence_receipt)
    );
  }

  function valueOrFallback(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function normalizeMissionPayload(payload) {
    const finalState = payload && (payload.final_state || payload.state || payload.status || payload.stage);
    const receipt = payload && (payload.evidence_receipt || payload.evidenceReceipt || payload.receipt);
    const goldAllowed = hasGoldEvidence({
      ...(payload || {}),
      evidence_receipt: receipt
    });

    return {
      mission_id: valueOrFallback(
        payload && (payload.mission_id || payload.missionId || payload.id),
        runtime.currentMissionId || "—"
      ),
      project: valueOrFallback(payload && (payload.project || payload.repo || payload.repository), "not provided"),
      mode: valueOrFallback(payload && (payload.mode || payload.run_mode), byId("runMode") ? byId("runMode").value : "safe"),
      final_state: valueOrFallback(finalState, goldAllowed ? "completed" : "blocked"),
      pass_gold: goldAllowed ? "true" : "false",
      promotion_allowed: goldAllowed ? "true" : "false",
      evidence_receipt: valueOrFallback(receipt, "missing"),
      root_cause: valueOrFallback(payload && (payload.root_cause || payload.rootCause), "not provided"),
      changed_files: valueOrFallback(payload && (payload.changed_files || payload.changedFiles || payload.files), "not provided"),
      logs_available: valueOrFallback(payload && (payload.logs_available || payload.logsAvailable || payload.logs_url || payload.logsUrl), "logsBox"),
      blocked_reason: goldAllowed ? "none" : valueOrFallback(
        payload && (payload.blocked_reason || payload.blockedReason || payload.reason || payload.error),
        "INCOMPLETE / BLOCKED — evidence missing"
      ),
      goldAllowed
    };
  }

  function renderMissionReport(payload) {
    const report = byId("missionReport");
    if (!report) return;

    const normalized = normalizeMissionPayload(payload || {});
    report.replaceChildren();

    const status = document.createElement("p");
    status.className = normalized.goldAllowed ? "gold-ok" : "blocked";
    status.textContent = normalized.goldAllowed
      ? "PASS GOLD VERIFIED — evidence receipt accepted"
      : "INCOMPLETE / BLOCKED — evidence missing";

    const dl = document.createElement("dl");
    const rows = [
      ["Mission ID", normalized.mission_id],
      ["Projeto", normalized.project],
      ["Modo", normalized.mode],
      ["Estado final observado", normalized.final_state],
      ["PASS GOLD", normalized.pass_gold],
      ["Promotion Allowed", normalized.promotion_allowed],
      ["Evidence Receipt", normalized.evidence_receipt],
      ["Root Cause", normalized.root_cause],
      ["Arquivos alterados", normalized.changed_files],
      ["Logs disponíveis", normalized.logs_available],
      ["Motivo do bloqueio", normalized.blocked_reason]
    ];

    rows.forEach(([label, value]) => {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      item.append(dt, dd);
      dl.appendChild(item);
    });

    report.append(status, dl);

    if (window.VisionAgentLocal) {
      window.VisionAgentLocal.updateOrbit(normalized.goldAllowed ? "gold" : "blocked", {
        ...(payload || {}),
        evidence_receipt: normalized.evidence_receipt,
        pass_gold: normalized.goldAllowed,
        promotion_allowed: normalized.goldAllowed
      });
    }
  }

  function closeMissionStream() {
    if (runtime.eventSource) {
      runtime.eventSource.close();
      runtime.eventSource = null;
    }
  }

  function openMissionStream(missionId) {
    if (!missionId) throw new Error("mission_id obrigatório para SSE");
    if (!window.VisionAPI || typeof EventSource === "undefined") return;

    closeMissionStream();

    const streamUrl = window.VisionAPI.apiUrl(`/api/run-live-stream?mission_id=${encodeURIComponent(missionId)}`);
    runtime.eventSource = new EventSource(streamUrl);

    runtime.eventSource.addEventListener("open", () => {
      log(`SSE aberto para mission_id real: ${missionId}`);
      if (window.VisionAgentLocal) {
        window.VisionAgentLocal.updateOrbit("running", { mission_id: missionId });
      }
    });

    runtime.eventSource.addEventListener("message", (event) => {
      log(`stream: ${event.data}`);
      try {
        const payload = JSON.parse(event.data);
        runtime.lastPayload = payload;

        if (payload.stage && window.VisionAgentLocal) {
          window.VisionAgentLocal.updateOrbit(payload.stage, payload);
        }

        if (payload.final || payload.done || payload.status === "completed" || payload.status === "blocked") {
          renderMissionReport({ ...payload, mission_id: payload.mission_id || missionId });
          setRuntimeStatus(hasGoldEvidence(payload) ? "GOLD" : "BLOCKED");
        }
      } catch (_) {
        if (window.VisionUICommand) window.VisionUICommand.appendMessage("system", event.data);
      }
    });

    ["open", "step", "gate", "done"].forEach((eventName) => {
      runtime.eventSource.addEventListener(eventName, (event) => {
        let payload = {};
        try { payload = JSON.parse(event.data || "{}"); }
        catch (_) { payload = { message: event.data || "" }; }

        runtime.lastPayload = payload;

        if (window.VisionAgentLocal) {
          window.VisionAgentLocal.updateOrbit(eventName === "done" ? "done" : eventName, {
            ...payload,
            mission_id: payload.mission_id || missionId
          });
        }

        log(`${eventName}: ${JSON.stringify(payload)}`);

        if (eventName === "done") {
          renderMissionReport({ ...payload, mission_id: payload.mission_id || missionId });
          setRuntimeStatus(hasGoldEvidence(payload) ? "GOLD" : "BLOCKED");
          closeMissionStream();
        }
      });
    });

    runtime.eventSource.addEventListener("error", () => {
      log("stream unavailable or closed");
      closeMissionStream();
      if (runtime.running) {
        setRuntimeStatus("BLOCKED");
      }
    });
  }

  async function executeMission() {
    if (runtime.running) return;

    const missionText = byId("missionText");
    const runMode = byId("runMode");
    const mission = missionText ? missionText.value.trim() : "";
    const mode = runMode ? runMode.value : "safe";

    if (!mission) {
      if (window.VisionUICommand) {
        window.VisionUICommand.appendMessage("system", "Descreva uma missão antes de executar.");
      }
      return;
    }

    runtime.running = true;
    runtime.currentMissionId = null;
    runtime.lastPayload = null;

    setRuntimeStatus("RUNNING");

    if (window.VisionAgentLocal) {
      window.VisionAgentLocal.updateOrbit("running", { mission_id: "pending", mode });
    }

    if (window.VisionUICommand) {
      window.VisionUICommand.appendMessage(
        "system",
        `Executando missão em modo ${mode.toUpperCase()}. Aguardando mission_id real do backend.`
      );
    }

    log("mission submitted; waiting for backend mission_id");

    try {
      const payload = await window.VisionAPI.requestJson("/api/run-live", {
        method: "POST",
        body: JSON.stringify({
          mission,
          mode,
          dry_run: mode === "dry-run",
          source: "vision-core-v13.2-gold-clean-front"
        })
      });

      runtime.lastPayload = payload;

      const missionId = payload && (payload.mission_id || payload.missionId || payload.id);
      if (!missionId) {
        throw new Error("Backend não retornou mission_id real.");
      }

      runtime.currentMissionId = missionId;

      log(`mission_id confirmado pelo backend: ${missionId}`);

      if (window.VisionUICommand) {
        window.VisionUICommand.appendMessage("system", `mission_id real confirmado: ${missionId}`);
      }

      if (window.VisionAgentLocal) {
        window.VisionAgentLocal.updateOrbit("running", { ...payload, mission_id: missionId, mode });
      }

      renderMissionReport({ ...payload, mission_id: missionId, mode });
      openMissionStream(missionId);
      setRuntimeStatus(hasGoldEvidence(payload) ? "GOLD" : "RUNNING");
    } catch (error) {
      const payload = error && error.data ? error.data : { error: error && error.message ? error.message : "unknown_error" };

      renderMissionReport({
        ...payload,
        mission_id: runtime.currentMissionId || "—",
        mode,
        blocked_reason: valueOrFallback(payload.error, "INCOMPLETE / BLOCKED — evidence missing")
      });

      setRuntimeStatus("BLOCKED");

      if (window.VisionAgentLocal) {
        window.VisionAgentLocal.updateOrbit("blocked", {
          ...payload,
          mission_id: runtime.currentMissionId || "—",
          mode
        });
      }

      log(`mission blocked: ${valueOrFallback(payload.error, error && error.message ? error.message : "unknown_error")}`);
    } finally {
      runtime.running = false;
    }
  }

  function bindRuntimeOwner() {
    const executeBtn = byId("executeBtn");
    if (executeBtn) executeBtn.addEventListener("click", executeMission);
    renderMissionReport({});
  }

  window.VisionRuntimeOwner = Object.freeze({
    executeMission,
    runMission: executeMission,
    renderMissionReport,
    hasGoldEvidence,
    closeMissionStream,
    status: function () {
      return {
        running: runtime.running,
        mission_id: runtime.currentMissionId,
        sse_open: Boolean(runtime.eventSource)
      };
    }
  });

  document.addEventListener("DOMContentLoaded", bindRuntimeOwner);
})();