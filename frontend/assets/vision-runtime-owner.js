(function () {
  "use strict";

  const RUN_PATH = "/api/run-live";
  const STREAM_PATH = "/api/run-live-stream";
  const STAGES = ["Scanner", "Hermes", "PatchEngine", "Aegis", "Done"];
  let source = null;
  let activeMission = null;

  const $ = (id) => document.getElementById(id);

  function apiBase() {
    const configured = window.API || window.API_BASE_URL || window.RUNTIME_CONFIG?.API_BASE_URL || window.__VISION_API__ || "";
    return String(configured).replace(/\/$/, "");
  }

  function withBase(path) {
    const base = apiBase();
    return base ? base + path : path;
  }

  function promptText() {
    if (window.VisionUiCommand && typeof window.VisionUiCommand.getPrompt === "function") {
      const fromUi = window.VisionUiCommand.getPrompt();
      if (fromUi) return fromUi;
    }
    const fields = [$("missionPrompt"), $("prompt"), $("missionInput")];
    const found = fields.find((field) => field && typeof field.value === "string" && field.value.trim());
    return found ? found.value.trim() : "";
  }

  function log(channel, message, tone) {
    if (window.VisionUiCommand && typeof window.VisionUiCommand.appendLog === "function") {
      window.VisionUiCommand.appendLog(channel, message, tone);
      return;
    }
    const box = $("logsBox");
    if (!box) return;
    const line = document.createElement("div");
    line.className = "log" + (tone ? " " + tone : "");
    line.innerHTML = `<b>${channel}</b> ${message}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function setRuntime(status) {
    const monitor = $("runtimeMonitor");
    const label = $("runtimeText");
    if (monitor) monitor.className = status || "stable";
    if (label) label.textContent = status === "running" ? "LIVE" : status === "blocked" ? "BLOCKED" : "READY";
  }

  function paint(stage, state) {
    if (typeof window.v236SetPipelineStage === "function") window.v236SetPipelineStage(stage, state);
  }

  function closeStream() {
    if (source) {
      source.close();
      source = null;
    }
  }

  function handleStreamEvent(eventName, payload) {
    if (eventName === "open") {
      log("SSE", "stream aberto para missão " + (payload.mission_id || activeMission || "pendente"), "cyan");
      setRuntime("running");
      return;
    }
    if (eventName === "step") {
      const stage = payload.stage || payload.step || "Scanner";
      log(stage, payload.message || payload.detail || "etapa recebida", "cyan");
      paint(stage, payload.status || "running");
      return;
    }
    if (eventName === "gate") {
      const allowed = payload.allowed === true || payload.status === "passed";
      log("GATE", allowed ? "gate validado" : "gate bloqueado sem evidência real", allowed ? "green" : "yellow");
      paint(payload.stage || "Aegis", allowed ? "done" : "fail");
      return;
    }
    if (eventName === "done") {
      log("DONE", payload.message || "missão concluída pelo backend", "green");
      paint("Done", "done");
      setRuntime("stable");
      closeStream();
    }
  }

  function openStream(missionId) {
    closeStream();
    activeMission = missionId;
    const url = withBase(STREAM_PATH + "?mission_id=" + encodeURIComponent(missionId));
    source = new EventSource(url);
    ["open", "step", "gate", "done"].forEach((eventName) => {
      source.addEventListener(eventName, (event) => {
        let payload = {};
        try { payload = JSON.parse(event.data || "{}"); } catch (_) { payload = { message: event.data || "" }; }
        handleStreamEvent(eventName, payload);
      });
    });
    source.onerror = () => {
      log("SSE", "stream encerrado ou indisponível; aguardando nova execução", "yellow");
      setRuntime("stable");
      closeStream();
    };
  }

  async function startMission() {
    const mission = promptText();
    if (!mission) {
      log("MISSION", "Descreva uma missão antes de executar.", "yellow");
      return;
    }
    closeStream();
    setRuntime("running");
    paint("Scanner", "running");
    log("LIVE", "enviando missão ao runtime owner V13.1", "cyan");
    const response = await fetch(withBase(RUN_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mission, source: "vision-runtime-owner-v13.1" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      setRuntime("blocked");
      paint("Aegis", "fail");
      log("LIVE", data.message || data.error || "backend bloqueou a missão", "red");
      return;
    }
    const missionId = data.mission_id || data.missionId || data.id;
    if (!missionId) {
      setRuntime("stable");
      log("LIVE", "backend aceitou sem mission_id; stream não aberto", "yellow");
      return;
    }
    log("LIVE", "mission_id: " + missionId, "green");
    openStream(missionId);
  }

  function boot() {
    window.VisionRuntimeOwner = Object.freeze({ version: "13.1", startMission, openStream, closeStream });
    const execute = $("executeBtn");
    if (execute && execute.dataset.v131OwnerBound !== "true") {
      execute.dataset.v131OwnerBound = "true";
      execute.addEventListener("click", (event) => {
        event.preventDefault();
        startMission().catch((err) => {
          setRuntime("blocked");
          log("LIVE", String(err && err.message ? err.message : err), "red");
        });
      });
    }
    log("OWNER", "V13.1 runtime owner único ativo.", "green");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
