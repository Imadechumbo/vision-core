(function () {
  "use strict";

  let running = false;
  let currentEventSource = null;
  let currentMissionId = null;

  function $(id) { return document.getElementById(id); }
  function api() { return window.VisionApi; }
  function chat() { return window.VisionChat; }
  function agent() { return window.VisionAgentLocal; }

  function log(message, payload) {
    const text = payload ? `${message} ${JSON.stringify(payload)}` : message;
    const logs = $("logsBox");
    if (logs) {
      logs.textContent += `\n[${new Date().toISOString()}] ${text}`;
      logs.scrollTop = logs.scrollHeight;
    }
    if (chat() && typeof chat().append === "function") chat().append("system", text);
  }

  function publish(stage, status, payload) {
    if (agent() && typeof agent().setStage === "function") agent().setStage(stage, status, payload || {});
  }

  function setRuntime(status) {
    if (agent() && typeof agent().setRuntime === "function") agent().setRuntime(status);
    const runtimeText = $("runtimeText");
    if (runtimeText) runtimeText.textContent = status;
  }

  function hasRealGold(payload) {
    return Boolean(payload && payload.pass_gold === true && payload.promotion_allowed === true && payload.evidence_receipt);
  }

  function parseEvent(event) {
    try { return JSON.parse(event.data || "{}"); } catch (_) { return { raw: event.data || "" }; }
  }

  function releaseLock(finalStatus) {
    running = false;
    if (currentEventSource) {
      currentEventSource.close();
      currentEventSource = null;
    }
    if (finalStatus) setRuntime(finalStatus);
  }

  function renderReport(payload) {
    const report = $("missionReport");
    if (!report) return;
    const gold = hasRealGold(payload);
    report.innerHTML = `<strong>Status:</strong> ${gold ? "GOLD" : "BLOCKED"}<br><strong>Mission ID:</strong> ${currentMissionId || "—"}<br><strong>Evidence receipt:</strong> ${payload && payload.evidence_receipt ? payload.evidence_receipt : "ausente"}<pre>${JSON.stringify(payload || {}, null, 2)}</pre>`;
    const score = $("scoreBox");
    if (score) score.textContent = gold ? "GOLD — backend evidence receipt válido" : "BLOCKED — sem evidência real";
  }

  function eventUrl(missionId) {
    return api().apiUrl(`/api/run-live-stream?mission_id=${encodeURIComponent(missionId)}`);
  }

  function openStream(missionId) {
    if (!missionId) throw new Error("mission_id obrigatório para SSE");
    if (currentEventSource) currentEventSource.close();

    currentEventSource = new EventSource(eventUrl(missionId));
    currentEventSource.addEventListener("open", () => {
      publish("sse:open", "running", { mission_id: missionId });
      log("SSE aberto", { mission_id: missionId });
    });
    currentEventSource.addEventListener("step", (event) => {
      const payload = parseEvent(event);
      publish("sse:step", "running", payload);
      log("SSE step", payload);
    });
    currentEventSource.addEventListener("gate", (event) => {
      const payload = parseEvent(event);
      publish("sse:gate", payload.pass ? "pass" : "blocked", payload);
      log("SSE gate", payload);
    });
    currentEventSource.addEventListener("done", (event) => {
      const payload = parseEvent(event);
      const gold = hasRealGold(payload);
      publish("sse:done", gold ? "pass" : "blocked", payload);
      renderReport(payload);
      log("SSE done", payload);
      releaseLock(gold ? "DONE" : "BLOCKED");
    });
    currentEventSource.addEventListener("fail", (event) => {
      const payload = parseEvent(event);
      publish("mission:error", "fail", payload);
      renderReport(payload);
      log("SSE fail", payload);
      releaseLock("BLOCKED");
    });
    currentEventSource.onerror = () => {
      const payload = { ok: false, status: "STREAM_ERROR", pass_gold: false, promotion_allowed: false };
      publish("mission:error", "fail", payload);
      renderReport(payload);
      log("SSE error", payload);
      releaseLock("BLOCKED");
    };
  }

  async function runMission() {
    if (running) {
      log("Execução bloqueada: já existe missão em andamento.");
      return;
    }

    const mission = (chat() && chat().getMissionText ? chat().getMissionText() : ($("missionText")?.value || "")).trim();
    if (!mission) {
      log("Execução bloqueada: missão vazia.");
      return;
    }

    const runModeSelect = document.getElementById("runMode");
    const mode = runModeSelect ? runModeSelect.value : "dry-run";
    const payload = {
      mission,
      project_id: "vision-core",
      mode,
      dry_run: mode === "dry-run",
      source: "vision-core-v13.2-gold-clean-front"
    };

    running = true;
    currentMissionId = null;
    setRuntime("RUNNING");
    publish("mission:start", "running", { mode, dry_run: payload.dry_run });
    log("Missão enviada ao Runtime Owner", { mode, dry_run: payload.dry_run });

    try {
      const response = await api().post("/api/run-live", payload);
      const missionId = response && (response.mission_id || response.id);
      if (!missionId || typeof missionId !== "string") {
        throw new Error("Backend não retornou mission_id real.");
      }
      currentMissionId = missionId;
      log("mission_id confirmado", { mission_id: missionId });
      openStream(missionId);
    } catch (error) {
      const blocked = { ok: false, status: "BLOCKED", reason: error.message, pass_gold: false, promotion_allowed: false };
      publish("mission:blocked", "blocked", blocked);
      renderReport(blocked);
      log("Missão bloqueada", blocked);
      releaseLock("BLOCKED");
    }
  }

  function stopMission() {
    const stopped = { ok: false, status: "STOPPED", pass_gold: false, promotion_allowed: false };
    publish("mission:error", "blocked", stopped);
    renderReport(stopped);
    log("Missão interrompida pelo operador.");
    releaseLock("BLOCKED");
  }

  function status() {
    return { running, mission_id: currentMissionId, sse_open: Boolean(currentEventSource) };
  }

  window.VisionRuntimeOwner = { runMission, stopMission, status };
})();
