(function () {
  "use strict";

  function appendMessage(role, message) {
    const stream = document.getElementById("chatStream");
    if (!stream) return;
    const article = document.createElement("article");
    article.className = `chat-message ${role || "assistant"}`;
    const speaker = document.createElement("span");
    speaker.className = "speaker";
    speaker.textContent = String(role || "VISION").toUpperCase();
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    article.append(speaker, paragraph);
    stream.appendChild(article);
    stream.scrollTop = stream.scrollHeight;
  }

  function bindUi() {
    const missionText = document.getElementById("missionText");
    const sendChatBtn = document.getElementById("sendChatBtn");
    const attachBtn = document.getElementById("attachBtn");
    const fileInput = document.getElementById("fileInput");
    const openAuthBtn = document.getElementById("openAuthBtn");
    const closeAuthBtn = document.getElementById("closeAuthBtn");
    const authModal = document.getElementById("authModal");

    if (sendChatBtn && missionText) {
      sendChatBtn.addEventListener("click", () => {
        const text = missionText.value.trim();
        if (!text) return;
        appendMessage("user", text);
        appendMessage("assistant", "Mensagem recebida. Para alterar o projeto, use EXECUTAR MISSÃO e aguarde o relatório final com evidência.");
      });
    }

    if (attachBtn && fileInput) attachBtn.addEventListener("click", () => fileInput.click());
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const count = fileInput.files ? fileInput.files.length : 0;
        appendMessage("system", `${count} arquivo(s) anexado(s) à missão local.`);
      });
    }
    if (openAuthBtn && authModal) openAuthBtn.addEventListener("click", () => { authModal.hidden = false; });
    if (closeAuthBtn && authModal) closeAuthBtn.addEventListener("click", () => { authModal.hidden = true; });
  }

  window.VisionUICommand = Object.freeze({ appendMessage });
  document.addEventListener("DOMContentLoaded", bindUi);
})();
