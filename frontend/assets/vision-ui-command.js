(function () {
  "use strict";

  const attachments = [];
  let chatMode = "conversation";

  function $(id) { return document.getElementById(id); }
  function api() { return window.VisionApi; }

  function getMissionText() {
    const input = $("missionText");
    return input ? input.value.trim() : "";
  }

  function getAttachments() {
    return attachments.map((file) => ({ name: file.name, size: file.size, type: file.type }));
  }

  function stamp() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function append(role, text, meta) {
    const stream = $("chatStream");
    if (!stream) return;
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role || "system"}`;
    bubble.textContent = String(text || "");
    const small = document.createElement("small");
    small.textContent = `${role || "system"} • ${stamp()}${meta ? ` • ${meta}` : ""}`;
    bubble.appendChild(small);
    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
  }

  function log(text) {
    const logs = $("logsBox");
    if (!logs) return;
    logs.textContent += `\n[${stamp()}] ${text}`;
    logs.scrollTop = logs.scrollHeight;
  }

  function clear() {
    const stream = $("chatStream");
    if (stream) stream.innerHTML = "";
  }

  function renderAttachments() {
    const list = $("attachmentList");
    if (!list) return;
    list.innerHTML = "";
    attachments.forEach((file) => {
      const chip = document.createElement("span");
      chip.className = "file-chip";
      chip.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
      list.appendChild(chip);
    });
  }

  async function sendChat() {
    const mission = getMissionText();
    if (!mission) {
      append("system", "Digite uma mensagem ou missão antes de enviar.");
      return;
    }

    append("user", mission, chatMode);
    log("Chat enviado ao copiloto.");

    try {
      const response = await api().post("/api/copilot", {
        message: mission,
        mode: chatMode,
        attachments: getAttachments(),
        source: "vision-core-v13.2-gold-clean-front"
      });
      const text = response.answer || response.message || response.output || JSON.stringify(response, null, 2);
      append("assistant", text, "backend");
    } catch (error) {
      append("assistant", `Fallback local honesto: não consegui acessar o copiloto agora. Posso estruturar a missão, mas execução real e PASS GOLD dependem do backend. Detalhe: ${error.message}`, "fallback");
      log(`Copiloto indisponível: ${error.message}`);
    }
  }

  async function refreshWorkers() {
    try {
      const data = await api().get("/api/workers/status");
      const workersBox = $("workersBox");
      if (workersBox) workersBox.textContent = JSON.stringify(data, null, 2);
      append("system", "Workers atualizados.");
    } catch (error) {
      append("system", `Falha ao consultar workers: ${error.message}`);
    }
  }

  async function githubStatus() {
    try {
      const data = await api().get("/api/github/status");
      append("system", `GitHub status:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      append("system", `Falha GitHub status: ${error.message}`);
    }
  }

  async function policyStatus() {
    try {
      const data = await api().get("/api/github/automerge-policy");
      append("system", `Política:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      append("system", `Falha política: ${error.message}`);
    }
  }

  async function diffPreview() {
    try {
      const data = await api().post("/api/diff/preview", { mission: getMissionText(), attachments: getAttachments() });
      append("system", `Preview diff:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      append("system", `Falha preview diff: ${error.message}`);
    }
  }

  async function downloadLogs() {
    try {
      const blob = await api().download("/api/logs/download");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vision-logs.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      append("system", "Download de logs iniciado.");
    } catch (error) {
      append("system", `Falha download logs: ${error.message}`);
    }
  }

  function bind() {
    append("system", "Vision Chat V13.2 pronto. Execução real pertence ao Runtime Owner.");

    $("sendChatBtn")?.addEventListener("click", sendChat);
    $("executeBtn")?.addEventListener("click", () => {
      if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.runMission === "function") {
        window.VisionRuntimeOwner.runMission();
      } else {
        append("system", "Runtime Owner indisponível.");
      }
    });
    $("attachBtn")?.addEventListener("click", () => $("fileInput")?.click());
    $("fileInput")?.addEventListener("change", (event) => {
      Array.from(event.target.files || []).forEach((file) => attachments.push(file));
      renderAttachments();
      append("system", `${attachments.length} arquivo(s) anexado(s) visualmente.`);
    });
    $("missionText")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChat();
      }
    });
    document.querySelectorAll("[data-chat-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        chatMode = button.dataset.chatMode;
        document.querySelectorAll("[data-chat-mode]").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        append("system", `Modo do chat: ${chatMode}`);
      });
    });
    $("githubPrBtn")?.addEventListener("click", () => append("system", "PR exige fluxo servidor autorizado e PASS GOLD real"));
    $("workerRefreshBtn")?.addEventListener("click", refreshWorkers);
    $("githubStatusBtn")?.addEventListener("click", githubStatus);
    $("policyBtn")?.addEventListener("click", policyStatus);
    $("diffBtn")?.addEventListener("click", diffPreview);
    $("downloadLogsBtn")?.addEventListener("click", downloadLogs);
    $("openAuthBtn")?.addEventListener("click", () => $("authModal")?.showModal());
    $("closeAuthBtn")?.addEventListener("click", () => $("authModal")?.close());
  }

  window.VisionChat = { getMissionText, append, clear, getAttachments };
  document.addEventListener("DOMContentLoaded", bind);
})();
