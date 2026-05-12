(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function appendLog(channel, message, tone) {
    const box = $("logsBox");
    const line = document.createElement("div");
    line.className = "log" + (tone ? " " + tone : "");
    line.innerHTML = `<b>${channel}</b> ${message}`;
    if (box) {
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    }
    if (typeof window.showLog === "function") window.showLog(channel, message, tone);
  }

  function appendCopilot(message, role) {
    const feed = $("v236CopilotFeed") || $("copilotFeed") || $("logsBox");
    if (!feed) return;
    const item = document.createElement("div");
    item.className = "v236-copilot-msg " + (role || "bot");
    item.textContent = message;
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
  }

  function getPrompt() {
    const fields = [$("missionPrompt"), $("prompt"), $("missionInput"), $("v236CopilotInput")];
    const found = fields.find((field) => field && typeof field.value === "string" && field.value.trim());
    return found ? found.value.trim() : "";
  }

  function bindCopilot() {
    const btn = $("v236CopilotBtn") || $("copilotBtn");
    const input = $("v236CopilotInput") || $("copilotInput");
    if (!btn || btn.dataset.v131Bound === "true") return;
    btn.dataset.v131Bound = "true";
    btn.addEventListener("click", () => {
      const text = input && input.value ? input.value.trim() : getPrompt();
      appendCopilot(text ? `Copiloto recebeu contexto: ${text}` : "Copiloto pronto. Descreva a missão para o runtime owner.", "bot");
    });
  }

  function bindAttachments() {
    const btn = $("v236FileBtn") || $("fileBtn") || $("attachBtn");
    if (!btn || btn.dataset.v131Bound === "true") return;
    btn.dataset.v131Bound = "true";
    btn.addEventListener("click", () => {
      appendLog("ANEXOS", "Anexos permanecem no contexto visual; envio real é responsabilidade do runtime owner.", "cyan");
    });
  }

  function exposeUiCommand() {
    window.VisionUiCommand = Object.freeze({
      version: "13.1",
      getPrompt,
      appendLog,
      appendCopilot,
      ownsNetworkRuntime: false
    });
  }

  function boot() {
    exposeUiCommand();
    bindCopilot();
    bindAttachments();
    appendLog("UI", "V13.1 command UI ativo sem ownership de runtime.", "cyan");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
