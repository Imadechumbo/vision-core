(function () {
  "use strict";

  const state = { stage: "ready", selectedAgent: null, goldUnlocked: false };

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

  function setText(selector, text) {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function updateOrbit(stage, payload) {
    const orbit = document.getElementById("agentOrbit");
    const chip = document.getElementById("agentStageChip");
    const core = orbit ? orbit.querySelector(".orbit-core") : null;
    const allowedGold = hasGoldEvidence(payload);
    let nextStage = String(stage || state.stage || "ready").toLowerCase();

    if (nextStage === "gold" && !allowedGold) nextStage = "blocked";
    state.stage = nextStage;
    state.goldUnlocked = allowedGold;

    if (orbit) orbit.dataset.stage = nextStage;
    if (chip) chip.textContent = nextStage.toUpperCase();
    if (core) {
      const label = nextStage === "gold" ? "GOLD" : nextStage.toUpperCase();
      const sub = allowedGold ? "evidence verified" : nextStage === "blocked" ? "evidence missing" : "local agent";
      core.innerHTML = `<strong>${label}</strong><span>${sub}</span>`;
    }

    setText("#agentMetrics div:first-child strong", nextStage.toUpperCase());
    if (payload && Number.isFinite(Number(payload.score))) setText("#scoreBox", String(payload.score));
    if (payload && Number.isFinite(Number(payload.workers))) setText("#workersBox", String(payload.workers));
  }

  function selectAgent(button) {
    document.querySelectorAll(".agent-node.active").forEach((node) => node.classList.remove("active"));
    button.classList.add("active");
    state.selectedAgent = button.dataset.agent || button.textContent.trim();
    const detail = document.getElementById("agentDetail");
    if (detail) {
      detail.textContent = `${state.selectedAgent}: ${button.dataset.status || "AGUARDA"} · stage ${state.stage.toUpperCase()} · contratos protegidos pelo runtime owner.`;
    }
  }

  function bindAgentClicks() {
    document.querySelectorAll(".agent-node").forEach((button) => {
      button.addEventListener("click", () => selectAgent(button));
    });
  }

  window.VisionAgentLocal = Object.freeze({ updateOrbit, hasGoldEvidence });
  document.addEventListener("DOMContentLoaded", () => {
    bindAgentClicks();
    updateOrbit("ready", null);
  });
})();
