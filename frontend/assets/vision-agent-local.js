(function () {
  "use strict";

  const agents = [
    { id: "openclaw", name: "OpenClaw", role: "Scanner inicial", contract: "mission:start" },
    { id: "scanner", name: "Scanner", role: "Auditoria e evidências", contract: "sse:step" },
    { id: "hermes", name: "Hermes", role: "Raciocínio e síntese", contract: "sse:step" },
    { id: "patchengine", name: "PatchEngine", role: "Preparação de patch", contract: "sse:gate" },
    { id: "aegis", name: "Aegis", role: "Segurança e política", contract: "sse:gate" },
    { id: "passgold", name: "PASS GOLD", role: "Validação com evidence receipt", contract: "sse:done" },
    { id: "githubpr", name: "PR GitHub", role: "Fluxo servidor autorizado", contract: "promotion gate" }
  ];

  const state = {
    runtime: "READY",
    selected: "openclaw",
    agents: new Map(agents.map((agent) => [agent.id, { ...agent, status: "idle", evidence: "Sem evento." }])),
    metrics: {},
    contracts: {}
  };

  function $(id) { return document.getElementById(id); }

  function safeText(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "string") return value;
    try { return JSON.stringify(value, null, 2); } catch (_) { return String(value); }
  }

  function hasEvidence(payload) {
    return Boolean(payload && payload.pass_gold === true && payload.promotion_allowed === true && payload.evidence_receipt);
  }

  function scoreText(payload) {
    if (hasEvidence(payload)) return "GOLD — evidence receipt validado pelo backend";
    if (payload && (payload.pass_gold === false || payload.promotion_allowed === false)) return "BLOCKED — sem evidência real suficiente";
    return "Aguardando evidência real";
  }

  function updateRuntimeText() {
    const runtimeText = $("runtimeText");
    if (runtimeText) runtimeText.textContent = state.runtime;
  }

  function renderDetails(agent) {
    const metrics = $("agentMetrics");
    if (metrics) {
      metrics.innerHTML = `<strong>${agent.name}</strong><br>Função: ${agent.role}<br>Estado: ${agent.status}<br>Última evidência/evento:<br><pre>${safeText(agent.evidence)}</pre>`;
    }
    const contracts = $("agentContracts");
    if (contracts) {
      contracts.innerHTML = `<strong>Contrato:</strong> ${agent.contract}<br><strong>Gates recebidos:</strong><pre>${safeText(state.contracts)}</pre>`;
    }
  }

  function renderOrbit() {
    const orbit = $("agentOrbit");
    if (!orbit) return;
    orbit.innerHTML = "";

    const ring = document.createElement("div");
    ring.className = "orbit-ring";
    orbit.appendChild(ring);

    const center = document.createElement("div");
    center.className = "orbit-center";
    center.textContent = state.runtime;
    orbit.appendChild(center);

    const radius = 128;
    agents.forEach((agent, index) => {
      const current = state.agents.get(agent.id);
      const angle = (Math.PI * 2 * index / agents.length) - Math.PI / 2;
      const node = document.createElement("button");
      node.type = "button";
      node.className = `agent-node${state.selected === agent.id ? " active" : ""}`;
      node.dataset.status = current.status;
      node.style.left = `calc(50% + ${Math.cos(angle) * radius}px - 2.625rem)`;
      node.style.top = `calc(50% + ${Math.sin(angle) * radius}px - 1.8rem)`;
      node.innerHTML = `${current.name}<small>${current.status}</small>`;
      node.addEventListener("click", () => {
        state.selected = agent.id;
        renderOrbit();
        renderDetails(state.agents.get(agent.id));
      });
      orbit.appendChild(node);
    });

    renderDetails(state.agents.get(state.selected));
  }

  function setRuntime(status) {
    const normalized = String(status || "READY").toUpperCase();
    state.runtime = normalized;
    updateRuntimeText();
    renderOrbit();
  }

  function mapStageToAgent(stage) {
    const text = String(stage || "").toLowerCase();
    if (text.includes("gate") || text.includes("policy")) return "aegis";
    if (text.includes("patch") || text.includes("diff")) return "patchengine";
    if (text.includes("hermes") || text.includes("copilot")) return "hermes";
    if (text.includes("gold") || text.includes("done")) return "passgold";
    if (text.includes("github") || text.includes("pr")) return "githubpr";
    if (text.includes("scan") || text.includes("evidence")) return "scanner";
    return "openclaw";
  }

  function setStage(stage, status, payload) {
    const eventName = String(stage || "event");
    const agentId = mapStageToAgent(eventName);
    const agent = state.agents.get(agentId);
    const normalizedStatus = String(status || "running").toLowerCase();

    if (eventName === "mission:start") setRuntime("RUNNING");
    if (eventName === "sse:open") setRuntime("RUNNING");
    if (eventName === "mission:blocked") setRuntime("BLOCKED");
    if (eventName === "mission:error") setRuntime("BLOCKED");
    if (eventName === "sse:done") setRuntime(hasEvidence(payload) ? "GOLD" : "BLOCKED");

    agent.status = normalizedStatus;
    agent.evidence = payload || eventName;
    state.selected = agentId;

    const score = $("scoreBox");
    if (score) score.textContent = scoreText(payload);

    if (eventName === "sse:gate") setContracts(payload || {});
    if (payload && payload.metrics) setMetrics(payload.metrics);

    renderOrbit();
  }

  function setMetrics(data) {
    state.metrics = data || {};
    const selected = state.agents.get(state.selected);
    if (selected) renderDetails(selected);
  }

  function setContracts(data) {
    state.contracts = data || {};
    const selected = state.agents.get(state.selected);
    if (selected) renderDetails(selected);
  }

  function reset() {
    state.runtime = "READY";
    state.selected = "openclaw";
    agents.forEach((agent) => state.agents.set(agent.id, { ...agent, status: "idle", evidence: "Sem evento." }));
    state.metrics = {};
    state.contracts = {};
    const score = $("scoreBox");
    if (score) score.textContent = "Aguardando evidência";
    updateRuntimeText();
    renderOrbit();
  }

  window.VisionAgentLocal = { setStage, setRuntime, setMetrics, setContracts, reset };
  document.addEventListener("DOMContentLoaded", reset);
})();
